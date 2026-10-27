import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import staticFiles from '@fastify/static';
import { Worker } from 'node:worker_threads';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { WebSocket } from 'ws';
import {
  SAMPLE_LESSONS,
  adoptRequestSchema,
  controlSchema,
  trialRequestSchema,
  intakeControlSchema,
  proposalControlSchema,
  type StudioState,
  type Trial,
  type World,
} from '@chorusborn/contracts';
import { addLesson, createPlaybook, createWorld, snapshot, step } from '@chorusborn/sim';
import { LocalStore, type StoredStudio } from './store.js';
import { TwitchOAuth, TwitchFailure } from './twitch.js';
import { ChatStore } from './chat-store.js';
import { TwitchIntake } from './intake.js';
import type { SocketFactory } from './eventsub.js';

type Studio = StoredStudio & {
  world: World;
  trial: Trial | null;
  busy: boolean;
  adopting: boolean;
  clients: Set<WebSocket>;
};
type AppOptions = {
  storePath?: string | null;
  clock?: boolean;
  logger?: boolean;
  twitch?: TwitchOAuth;
  chatStorePath?: string | null;
  socketFactory?: SocketFactory;
};
const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const cookies = (value: string | undefined) =>
  Object.fromEntries(
    (value ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter((part) => part.length === 2),
  );
const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
const trustedOrigin = (value: string | undefined) => {
  if (!value) return true; // Non-browser local tools are allowed; browser mutations still require JSON.
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      ['3001', '5173'].includes(url.port)
    );
  } catch {
    return false;
  }
};

export async function createApp(options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger
      ? { serializers: { req: (req) => ({ method: req.method, url: req.url?.split('?')[0] }) } }
      : false,
    bodyLimit: 8192,
  });
  const store = new LocalStore(
    options.storePath === undefined ? `${projectRoot}.local/studios.json` : options.storePath,
  );
  await store.load();
  const chatStore = new ChatStore(
    options.chatStorePath !== undefined
      ? options.chatStorePath
      : options.storePath === null
        ? null
        : options.storePath
          ? `${dirname(options.storePath)}/chat.json`
          : `${projectRoot}.local/chat.json`,
  );
  await chatStore.load();
  let intake: TwitchIntake;
  const studios = new Map<string, Studio>();
  const twitch = options.twitch ?? new TwitchOAuth(null);
  const workers = new Set<Worker>();
  const hydrate = (record: StoredStudio): Studio => ({
    ...record,
    world: createWorld(record.playbook),
    trial: null,
    busy: false,
    adopting: false,
    clients: new Set(),
  });
  for (const record of store.records) studios.set(record.token, hydrate(record));
  const toState = (studio: Studio): StudioState => {
    const {
      baseline: _baseline,
      candidateBranch: _candidate,
      ...trial
    } = studio.trial ?? ({} as Trial);
    const chat = intake.view(studio.id);
    return {
      mode: 'local-fixture',
      connected: chat.status === 'live',
      twitch: { ...twitch.publicState(studio.id), chat: chat.status },
      intake: chat,
      world: studio.world,
      playbook: studio.playbook,
      samples: SAMPLE_LESSONS,
      latestTrial: studio.trial ? trial : null,
      overlayPath: `/overlay?studio=${studio.id}&key=${studio.overlayKey}`,
    };
  };
  const publish = (studio: Studio) => {
    for (const client of studio.clients) {
      if (client.readyState !== 1) continue;
      if (client.bufferedAmount > 1_000_000) {
        client.close(1013, 'Consumer too slow; reconnect for fresh state.');
        continue;
      }
      const readOnly = (client as WebSocket & { readOnly?: boolean }).readOnly;
      client.send(
        JSON.stringify(
          readOnly
            ? { type: 'overlay', world: studio.world }
            : { type: 'state', state: toState(studio) },
        ),
      );
    }
  };
  const ownerStudio = (cookie: string | undefined) => studios.get(cookies(cookie).cb_session ?? '');
  const overlayStudio = (id: string, key: string) =>
    [...studios.values()].find((studio) => studio.id === id && safeEqual(studio.overlayKey, key));
  intake = new TwitchIntake(
    twitch,
    chatStore,
    (owner) => {
      const studio = [...studios.values()].find((candidate) => candidate.id === owner);
      if (studio) publish(studio);
    },
    options.socketFactory,
  );
  for (const owner of twitch.owners()) intake.sync(owner);

  app.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host?.split(':')[0];
    if (
      !host ||
      !['localhost', '127.0.0.1'].includes(host) ||
      !trustedOrigin(request.headers.origin)
    )
      return reply.code(403).send({ message: 'This fixture lab accepts loopback requests only.' });
    reply.header('X-Content-Type-Options', 'nosniff').header('Referrer-Policy', 'no-referrer');
    if (request.url.startsWith('/api/') || request.url.startsWith('/auth/'))
      reply.header('Cache-Control', 'no-store');
    if (
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
      !request.headers['content-type']?.startsWith('application/json')
    )
      return reply.code(415).send({ message: 'JSON requests are required.' });
  });
  await app.register(websocket);
  app.get('/health/live', async () => ({ status: 'ok', mode: 'local-fixture' }));
  app.get('/health/ready', async () => ({
    status: 'ok',
    twitch: twitch.config ? 'oauth-and-eventsub-configured' : 'not-configured',
    compiler: 'fixture-only',
    persistence: options.storePath === null ? 'memory' : 'local-file',
  }));
  app.get('/api/demo/state', async (request, reply) => {
    let studio = ownerStudio(request.headers.cookie);
    if (!studio) {
      if (studios.size >= 20)
        return reply.code(429).send({
          message:
            'Local studio capacity reached. Restart with a fresh local store to clear sessions.',
        });
      const record: StoredStudio = {
        id: randomUUID(),
        token: randomUUID(),
        overlayKey: randomUUID(),
        playbook: createPlaybook(),
      };
      await store.put(record);
      studio = hydrate(record);
      studios.set(record.token, studio);
    }
    // Lax permits Twitch's top-level GET callback; mutation origin/JSON checks remain enforced.
    reply.header(
      'Set-Cookie',
      `cb_session=${studio.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    );
    return toState(studio);
  });
  app.get('/auth/twitch/start', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio)
      return reply
        .code(401)
        .send({ message: 'Open the studio on localhost before connecting Twitch.' });
    if (!twitch.config)
      return reply.code(503).send({
        message: 'Add Twitch client credentials to the local .env and restart the server.',
      });
    if (
      request.headers.host?.split(':')[0] !== 'localhost' ||
      request.headers['sec-fetch-site'] === 'cross-site'
    )
      return reply.code(403).send({ message: 'Start Twitch sign-in from your localhost studio.' });
    return reply.redirect(twitch.begin(studio.id));
  });
  app.get<{ Querystring: { state?: string; code?: string; error?: string } }>(
    '/auth/twitch/callback',
    async (request, reply) => {
      const studio = ownerStudio(request.headers.cookie);
      if (!studio || !twitch.config || request.headers.host?.split(':')[0] !== 'localhost')
        return reply.code(400).send({
          message:
            'This sign-in has no matching localhost studio. Reopen the studio and connect again.',
        });
      const pending = twitch.consume(studio.id, request.query.state);
      if (!pending)
        return reply.code(400).send({
          message:
            'Sign-in state is invalid, expired, or already used. Connect again from the studio.',
        });
      const finish = (result: string) =>
        reply.redirect(`${twitch.config!.webOrigin}/?twitch=${result}`);
      if (request.query.error) return finish('denied');
      const code = request.query.code;
      if (typeof code !== 'string' || !code.length || code.length > 2048) return finish('failed');
      try {
        await twitch.complete(pending, code);
        publish(studio);
        return finish('connected');
      } catch (error) {
        return finish(
          error instanceof TwitchFailure && error.reason === 'wrong-channel'
            ? 'wrong-channel'
            : 'failed',
        );
      }
    },
  );
  app.post('/api/twitch/disconnect', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your local studio first.' });
    const { revoked } = await twitch.disconnect(studio.id);
    publish(studio);
    return { state: toState(studio), revoked };
  });
  app.post('/api/twitch/intake', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your local studio first.' });
    if (twitch.publicState(studio.id).status !== 'authenticated')
      return reply
        .code(403)
        .send({ message: 'Connect and verify Twitch before managing its lesson queue.' });
    const parsed = intakeControlSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ message: 'Unknown intake control.' });
    await intake.control(studio.id, parsed.data.action);
    return toState(studio);
  });
  app.post<{ Params: { id: string } }>('/api/twitch/proposals/:id', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your local studio first.' });
    if (twitch.publicState(studio.id).status !== 'authenticated')
      return reply
        .code(403)
        .send({ message: 'Connect and verify Twitch before managing its lesson queue.' });
    if (!proposalControlSchema.safeParse(request.body).success)
      return reply.code(422).send({ message: 'Unknown proposal control.' });
    if (!(await intake.reject(studio.id, request.params.id)))
      return reply.code(404).send({ message: 'This proposal is unavailable in your channel.' });
    return toState(studio);
  });
  app.get<{ Querystring: { studio?: string; key?: string } }>(
    '/api/demo/overlay',
    async (request, reply) => {
      const studio = overlayStudio(request.query.studio ?? '', request.query.key ?? '');
      if (!studio) return reply.code(404).send({ message: 'Overlay link is unavailable.' });
      return { mode: 'local-fixture', world: studio.world };
    },
  );
  app.get<{ Querystring: { studio?: string; key?: string } }>(
    '/ws/demo',
    { websocket: true },
    (socket, request) => {
      const readOnly = request.query.studio !== undefined;
      const studio = readOnly
        ? overlayStudio(request.query.studio ?? '', request.query.key ?? '')
        : ownerStudio(request.headers.cookie);
      if (!studio) {
        socket.close(1008, 'Open a studio first.');
        return;
      }
      (socket as WebSocket & { readOnly?: boolean }).readOnly = readOnly;
      studio.clients.add(socket);
      socket.on('error', () => studio.clients.delete(socket));
      socket.on('close', () => studio.clients.delete(socket));
      socket.on('message', () => socket.close(1008, 'This stream is read-only.'));
      publish(studio);
    },
  );
  app.post('/api/demo/controls', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your local studio first.' });
    const parsed = controlSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ message: 'Unknown arena control.' });
    if (parsed.data.action === 'reset')
      studio.world = createWorld(studio.playbook, studio.world.seed);
    else if (studio.world.status !== 'finished')
      studio.world.status = parsed.data.action === 'pause' ? 'paused' : 'running';
    publish(studio);
    return toState(studio);
  });
  app.post('/api/demo/trials', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your local studio first.' });
    const parsed = trialRequestSchema.safeParse(request.body);
    const sample = parsed.success
      ? SAMPLE_LESSONS.find((item) => item.id === parsed.data.sampleId)
      : undefined;
    if (!sample)
      return reply.code(422).send({
        message: 'Select a supported sample lesson. A live language compiler is not connected.',
      });
    if (studio.busy || workers.size >= 2)
      return reply.code(429).send({ message: 'A trial is already running. Please wait.' });
    if (studio.playbook.rules.length + sample.candidate.rules.length > 24)
      return reply.code(422).send({ message: 'Playbook limit reached.' });
    const source = snapshot(createWorld(studio.playbook, studio.world.seed));
    studio.busy = true;
    try {
      const result = await new Promise<Pick<Trial, 'baseline' | 'candidateBranch'>>(
        (resolve, reject) => {
          const worker = new Worker(new URL('./trial-worker.ts', import.meta.url), {
            workerData: { source, candidate: sample.candidate },
            // Node 24 strips our erasable TypeScript directly. Do not inherit a
            // dev watcher/loader or test-runner flags inside the simulation worker.
            execArgv: [],
            resourceLimits: { maxOldGenerationSizeMb: 128 },
          });
          workers.add(worker);
          const timeout = setTimeout(() => {
            void worker.terminate();
            reject(new Error('Trial exceeded its time limit.'));
          }, 20_000);
          worker.once('message', resolve);
          worker.once('error', reject);
          worker.once('exit', (code) => {
            workers.delete(worker);
            clearTimeout(timeout);
            if (code !== 0) reject(new Error('Trial worker stopped.'));
          });
        },
      );
      studio.trial = {
        id: randomUUID(),
        sampleId: sample.id,
        candidate: sample.candidate,
        baseVersion: source.state.champions[0].playbook.version,
        sourceHash: source.hash,
        sourceTick: source.state.tick,
        seed: source.state.seed,
        createdAt: new Date().toISOString(),
        adopted: false,
        ...result,
      };
      publish(studio);
      return studio.trial;
    } finally {
      studio.busy = false;
    }
  });
  app.get<{ Params: { id: string } }>('/api/demo/trials/:id', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your local studio first.' });
    if (studio.trial?.id !== request.params.id)
      return reply.code(404).send({ message: 'This trial is no longer in the local session.' });
    return studio.trial;
  });
  app.post('/api/demo/adoptions', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your local studio first.' });
    const parsed = adoptRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ message: 'Invalid adoption request.' });
    const trial = studio.trial;
    if (
      studio.adopting ||
      !trial ||
      trial.id !== parsed.data.trialId ||
      trial.adopted ||
      parsed.data.expectedVersion !== studio.playbook.version ||
      trial.baseVersion !== studio.playbook.version
    )
      return reply.code(409).send({
        message:
          'This evidence is stale or already adopted. Run a new trial against the current playbook.',
      });
    studio.adopting = true;
    try {
      const playbook = addLesson(studio.playbook, trial.candidate);
      await store.put({
        id: studio.id,
        token: studio.token,
        overlayKey: studio.overlayKey,
        playbook,
      });
      studio.playbook = playbook;
      trial.adopted = true;
      publish(studio);
      return toState(studio);
    } finally {
      studio.adopting = false;
    }
  });

  const webRoot = `${projectRoot}apps/web/dist`;
  if (existsSync(webRoot)) {
    await app.register(staticFiles, { root: webRoot });
    app.setNotFoundHandler((request, reply) => {
      if (
        request.method !== 'GET' ||
        request.url.startsWith('/api/') ||
        request.url.startsWith('/auth/') ||
        request.url.startsWith('/ws/')
      )
        return reply.code(404).send({ message: 'Not found.' });
      return reply.sendFile('index.html');
    });
  }
  const clock =
    options.clock === false
      ? null
      : setInterval(() => {
          for (const studio of studios.values())
            if (studio.world.status === 'running') {
              studio.world = step(studio.world);
              if (studio.world.tick % 2 === 0 || studio.world.status === 'finished')
                publish(studio);
            }
        }, 50);
  clock?.unref();
  const tokenChecks = setInterval(() => {
    for (const studio of studios.values()) {
      void twitch.validateDue(studio.id).then(() => publish(studio));
    }
  }, 60_000);
  tokenChecks.unref();
  app.addHook('onClose', async () => {
    if (clock) clearInterval(clock);
    clearInterval(tokenChecks);
    await intake.close();
    twitch.close();
    for (const studio of studios.values()) for (const client of studio.clients) client.close();
    await Promise.all([...workers].map((worker) => worker.terminate()));
  });
  return app;
}
