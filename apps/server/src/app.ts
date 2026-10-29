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
  reorderRequestSchema,
  controlSchema,
  trialRequestSchema,
  intakeControlSchema,
  rivalInviteSchema,
  rivalChallengeSchema,
  rivalControlSchema,
  proposalControlSchema,
  type StudioState,
  type Compilation,
  type ChatProposal,
  type Trial,
  type World,
  type CombatStudy,
} from '@chorusborn/contracts';
import {
  addLesson,
  createPlaybook,
  createWorld,
  createRivalWorld,
  snapshot,
  step,
  hash,
  ENGINE_VERSION,
} from '@chorusborn/sim';
import { Rivalries, RivalFailure } from './rivalry.js';
import { LocalStore, type StoredStudio } from './store.js';
import { TwitchOAuth, TwitchFailure } from './twitch.js';
import { ChatStore } from './chat-store.js';
import { TwitchIntake } from './intake.js';
import { PROMPT_HASH, CompileFailure, type LessonCompiler } from './compiler.js';
import type { SocketFactory } from './eventsub.js';

type Studio = StoredStudio & {
  touchedAt: number;
  world: World;
  trial: Trial | null;
  busy: boolean;
  adopting: boolean;
  clients: Set<WebSocket>;
};
export type AppCheckpoint = {
  version: 1;
  engine: typeof ENGINE_VERSION;
  studios: StoredStudio[];
  arenas: { id: string; world: World; trial: Trial | null; touchedAt?: number }[];
  chat: ReturnType<ChatStore['checkpoint']>;
  rivalry: ReturnType<Rivalries['checkpoint']>;
};
type AppOptions = {
  storePath?: string | null;
  clock?: boolean;
  logger?: boolean;
  twitch?: TwitchOAuth;
  chatStorePath?: string | null;
  socketFactory?: SocketFactory;
  compiler?: LessonCompiler;
  publicOrigin?: string;
  initialCheckpoint?: AppCheckpoint;
  publish?: (id: string, coach: unknown, overlay: unknown) => void;
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
// Spectators need visible authors and execution, not private proposal/identity joins.
const overlayWorld = (world: World): World => ({
  ...world,
  champions: world.champions.map((champion) => ({
    ...champion,
    playbook: {
      ...champion.playbook,
      rules: champion.playbook.rules.map(({ source: _source, ...rule }) => rule),
    },
  })) as World['champions'],
});
const trustedOrigin = (value: string | undefined, configuredWebOrigin?: string) => {
  if (!value) return true; // Non-browser local tools are allowed; browser mutations still require JSON.
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      [
        '3001',
        '5173',
        ...(configuredWebOrigin ? [new URL(configuredWebOrigin).port] : []),
      ].includes(url.port)
    );
  } catch {
    return false;
  }
};

export async function createApp(options: AppOptions = {}) {
  if (options.publicOrigin && new URL(options.publicOrigin).origin !== options.publicOrigin)
    throw new Error('Configure an exact public origin.');
  if (
    options.initialCheckpoint &&
    (options.initialCheckpoint.version !== 1 || options.initialCheckpoint.engine !== ENGINE_VERSION)
  )
    throw new Error('Incompatible arena checkpoint; explicit migration is required.');
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
  if (options.initialCheckpoint) store.records = structuredClone(options.initialCheckpoint.studios);
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
  if (options.initialCheckpoint) chatStore.restore(options.initialCheckpoint.chat);
  let intake: TwitchIntake;
  const studios = new Map<string, Studio>();
  const twitch = options.twitch ?? new TwitchOAuth(null);
  const workers = new Set<Worker>();
  const authorityEpoch = new Map<string, number>();
  let authorityChanged = () => {};
  const unwatchAuthority = twitch.onChange((owner) => {
    if (twitch.publicState(owner).status !== 'authenticated')
      authorityEpoch.set(owner, (authorityEpoch.get(owner) ?? 0) + 1);
    authorityChanged();
  });
  const hydrate = (record: StoredStudio): Studio => ({
    ...record,
    touchedAt: Date.now(),
    world: createWorld(record.playbook),
    trial: null,
    busy: false,
    adopting: false,
    clients: new Set(),
  });
  for (const record of store.records) {
    const studio = hydrate(record);
    if (studio.channel) studio.world.champions[0].name = studio.channel.login;
    const saved = options.initialCheckpoint?.arenas.find((arena) => arena.id === studio.id);
    if (saved) {
      studio.touchedAt = saved.touchedAt ?? Date.now();
      studio.world = structuredClone(saved.world);
      if (studio.world.status === 'running') studio.world.status = 'paused';
      studio.trial = structuredClone(saved.trial);
    }
    studios.set(record.token, studio);
  }
  const byId = (id: string) => [...studios.values()].find((studio) => studio.id === id);
  const rivalry = new Rivalries((owner) => {
    const studio = byId(owner),
      identity = twitch.publicState(owner);
    return studio?.channel &&
      identity.status === 'authenticated' &&
      identity.channel?.id === studio.channel.id
      ? { studioId: studio.id, channel: identity.channel, playbook: studio.playbook }
      : null;
  });
  if (options.initialCheckpoint) rivalry.restore(options.initialCheckpoint.rivalry);
  const worldFor = (studio: Studio) => rivalry.current(studio.id)?.world ?? studio.world;
  const trainingWorld = (studio: Studio) => {
    const world = createWorld(studio.playbook, studio.world.seed);
    if (studio.channel) world.champions[0].name = studio.channel.login;
    return world;
  };
  const toState = (studio: Studio): StudioState => {
    const {
      baseline: _baseline,
      candidateBranch: _candidate,
      ...trial
    } = studio.trial ?? ({} as Trial);
    const chat = intake.view(studio.id);
    return {
      mode: rivalry.current(studio.id) ? 'rivalry' : 'local-fixture',
      championName: studio.channel?.login ?? 'Mica',
      selfActor: rivalry.view(studio.id).match?.self ?? 'a',
      rivalry: rivalry.view(studio.id),
      connected: chat.status === 'live',
      twitch: { ...twitch.publicState(studio.id), chat: chat.status },
      intake: chat,
      compiler: {
        configured: !!options.compiler,
        model: options.compiler?.model ?? null,
        remainingCalls: options.compiler?.remainingCalls ?? 0,
      },
      world: rivalry.current(studio.id) ? overlayWorld(worldFor(studio)) : studio.world,
      playbook: studio.playbook,
      samples: SAMPLE_LESSONS,
      latestTrial: studio.trial ? trial : null,
      overlayPath: `/overlay?studio=${studio.id}&key=${studio.overlayKey}`,
    };
  };
  const publish = (studio: Studio) => {
    if (studio.trial?.source) {
      const source = intake
        .view(studio.id)
        .proposals.find((item) => item.id === studio.trial!.source!.proposalId);
      if (
        !source ||
        source.status !== 'compiled' ||
        source.compilation?.id !== studio.trial.source.compilationId
      )
        studio.trial = null;
    }
    options.publish?.(
      studio.id,
      { type: 'state', state: toState(studio) },
      {
        type: 'overlay',
        world: overlayWorld(worldFor(studio)),
        mode: rivalry.current(studio.id) ? 'rivalry' : 'local-fixture',
      },
    );
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
            ? {
                type: 'overlay',
                world: overlayWorld(worldFor(studio)),
                mode: rivalry.current(studio.id) ? 'rivalry' : 'local-fixture',
              }
            : { type: 'state', state: toState(studio) },
        ),
      );
    }
  };
  const publishAll = () => {
    for (const studio of studios.values()) publish(studio);
  };
  authorityChanged = () => {
    rivalry.syncAuthority();
    if (intake) publishAll();
  };
  let bindings: Promise<void> = Promise.resolve();
  const bindChannel = (studio: Studio): Promise<Studio> => {
    const operation = bindings.then(async () => {
      const identity = twitch.publicState(studio.id);
      if (identity.status !== 'authenticated' || !identity.channel)
        throw new TwitchFailure('reconnect');
      const historicalChannels = studio.playbook.rules.flatMap((rule) =>
        rule.source ? [rule.source.channelId] : [],
      );
      if (
        historicalChannels.some((id) => id !== identity.channel!.id) ||
        studio.adopting ||
        (studio.channel && studio.channel.id !== identity.channel.id)
      )
        throw new TwitchFailure('wrong-channel');
      const legacyOwner = (candidate: Studio) =>
        !candidate.channel &&
        candidate.playbook.rules.some((rule) => rule.source?.channelId === identity.channel!.id) &&
        candidate.playbook.rules.every(
          (rule) => !rule.source || rule.source.channelId === identity.channel!.id,
        );
      const canonical =
        [...studios.values()].find((s) => s.channel?.id === identity.channel!.id) ??
        (legacyOwner(studio) ? studio : [...studios.values()].find(legacyOwner)) ??
        studio;
      if (canonical.adopting) throw new TwitchFailure('unavailable');
      const channel = identity.channel;
      await store.put({
        id: canonical.id,
        token: canonical.token,
        overlayKey: canonical.overlayKey,
        playbook: canonical.playbook,
        channel,
      });
      // Persist channel ownership before moving the verified OAuth session/cookie.
      canonical.channel = channel;
      twitch.moveOwner(studio.id, canonical.id);
      if (
        !rivalry.current(canonical.id) &&
        canonical.world.status === 'paused' &&
        canonical.world.tick === 0
      )
        canonical.world.champions[0].name = channel.login;
      return canonical;
    });
    bindings = operation.then(
      () => {},
      () => {},
    );
    return operation;
  };
  const ownerStudio = (cookie: string | undefined) => {
    const studio = studios.get(cookies(cookie).cb_session ?? '');
    if (studio) studio.touchedAt = Date.now();
    return studio;
  };
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
    const accepted = options.publicOrigin
      ? request.headers.host === new URL(options.publicOrigin).host &&
        (!request.headers.origin || request.headers.origin === options.publicOrigin)
      : !!host &&
        ['localhost', '127.0.0.1'].includes(host) &&
        trustedOrigin(request.headers.origin, twitch.config?.webOrigin);
    if (!accepted)
      return reply.code(403).send({ message: 'This studio accepts its configured origin only.' });
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
  app.get('/health/live', async () => ({
    status: 'ok',
    mode: options.publicOrigin ? 'vercel-authority' : 'local-fixture',
  }));
  app.get('/health/ready', async () => ({
    status: 'ok',
    twitch: twitch.config ? 'oauth-and-eventsub-configured' : 'not-configured',
    compiler: options.compiler ? 'groq-configured' : 'not-configured',
    persistence: options.publicOrigin
      ? 'encrypted-redis-checkpoint'
      : options.storePath === null
        ? 'memory'
        : 'local-file',
  }));
  app.get('/api/demo/state', async (request, reply) => {
    let studio = ownerStudio(request.headers.cookie);
    if (!studio) {
      if (options.publicOrigin) {
        // Only disposable, unverified demos expire. Verified channel books are retained.
        for (const [token, guest] of studios)
          if (!guest.channel && Date.now() - guest.touchedAt > 20 * 60_000) studios.delete(token);
        store.records = store.records.filter((record) => studios.has(record.token));
      }
      if (studios.size >= (options.publicOrigin ? 50 : 20))
        return reply.code(429).send({
          message: 'Studio capacity reached. Try again later or contact the host.',
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
      `cb_session=${studio.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${options.publicOrigin ? '; Secure' : ''}`,
    );
    return toState(studio);
  });
  app.get('/auth/twitch/start', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio)
      return reply.code(401).send({ message: 'Open the studio before connecting Twitch.' });
    if (!twitch.config)
      return reply.code(503).send({
        message: 'Add Twitch client credentials to the local .env and restart the server.',
      });
    if (
      (options.publicOrigin
        ? request.headers.host !== new URL(options.publicOrigin).host
        : request.headers.host?.split(':')[0] !== 'localhost') ||
      request.headers['sec-fetch-site'] === 'cross-site'
    )
      return reply.code(403).send({ message: 'Start Twitch sign-in from this studio.' });
    return reply.redirect(twitch.begin(studio.id));
  });
  app.get<{ Querystring: { state?: string; code?: string; error?: string } }>(
    '/auth/twitch/callback',
    async (request, reply) => {
      const studio = ownerStudio(request.headers.cookie);
      if (
        !studio ||
        !twitch.config ||
        (options.publicOrigin
          ? request.headers.host !== new URL(options.publicOrigin).host
          : request.headers.host?.split(':')[0] !== 'localhost')
      )
        return reply.code(400).send({
          message: 'This sign-in has no matching studio. Reopen the studio and connect again.',
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
      let completed = false;
      try {
        const expectedChannelId =
          studio.channel?.id ??
          studio.playbook.rules.find((rule) => rule.source)?.source?.channelId;
        await twitch.complete(pending, code, expectedChannelId);
        completed = true;
        const canonical = await bindChannel(studio);
        reply.header(
          'Set-Cookie',
          `cb_session=${canonical.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${options.publicOrigin ? '; Secure' : ''}`,
        );
        publishAll();
        return finish('connected');
      } catch (error) {
        if (completed && twitch.publicState(studio.id).status === 'authenticated')
          await twitch.disconnect(studio.id);
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
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    const { revoked } = await twitch.disconnect(studio.id);
    publish(studio);
    return { state: toState(studio), revoked };
  });
  app.post('/api/twitch/intake', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
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
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
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
  const eligibleProposal = (studio: Studio, proposalId: string): ChatProposal | undefined => {
    const proposal = intake.view(studio.id).proposals.find((item) => item.id === proposalId);
    return proposal?.status === 'compiled' &&
      proposal.author &&
      proposal.text &&
      proposal.compilation?.status === 'complete' &&
      proposal.compilation.result?.outcome === 'candidate' &&
      proposal.compilation.baseVersion === studio.playbook.version &&
      proposal.compilation.baseHash === hash(studio.playbook)
      ? proposal
      : undefined;
  };
  app.post<{ Params: { id: string } }>(
    '/api/twitch/proposals/:id/compile',
    async (request, reply) => {
      const studio = ownerStudio(request.headers.cookie);
      if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
      const queue = intake.view(studio.id);
      if (!queue.channelId)
        return reply.code(403).send({ message: 'Connect and verify Twitch first.' });
      if (JSON.stringify(request.body) !== '{}')
        return reply.code(422).send({ message: 'Compile accepts an empty JSON object.' });
      const proposal = queue.proposals.find((item) => item.id === request.params.id);
      if (!proposal?.text || !proposal.author || ['rejected', 'removed'].includes(proposal.status))
        return reply.code(404).send({ message: 'This lesson is unavailable in your channel.' });
      if (studio.playbook.rules.some((rule) => rule.source?.proposalId === proposal.id))
        return reply.code(409).send({ message: 'This source lesson is already in your playbook.' });
      if (eligibleProposal(studio, proposal.id)) return toState(studio);
      const compiler = options.compiler;
      if (!compiler)
        return reply
          .code(503)
          .send({ message: 'Add GROQ_API_KEY to the server .env and restart.' });
      if (!compiler.remainingCalls)
        return reply
          .code(429)
          .send({ message: 'Local model call budget reached. Review usage before restarting.' });
      const epoch = authorityEpoch.get(studio.id) ?? 0;
      const compilation: Compilation = {
        id: randomUUID(),
        status: 'running',
        baseVersion: studio.playbook.version,
        baseHash: hash(studio.playbook),
        model: compiler.model,
        promptHash: PROMPT_HASH,
        createdAt: new Date().toISOString(),
        result: null,
        error: null,
        inputTokens: 0,
        outputTokens: 0,
      };
      if (!(await chatStore.beginCompile(queue.channelId, proposal.id, compilation)))
        return reply.code(409).send({
          message: 'Compilation is running or this lesson reached its three-attempt limit.',
        });
      publish(studio);
      try {
        const output = await compiler.compile(proposal.text);
        compilation.status = 'complete';
        compilation.result = output.result;
        compilation.inputTokens = output.inputTokens;
        compilation.outputTokens = output.outputTokens;
      } catch (error) {
        compilation.status = 'failed';
        compilation.error =
          error instanceof CompileFailure
            ? error.message
            : 'Compilation failed. No tactic was published.';
      }
      // A request begun under old authority cannot publish after disconnect/reconnect.
      if (
        intake.view(studio.id).channelId !== queue.channelId ||
        (authorityEpoch.get(studio.id) ?? 0) !== epoch
      ) {
        compilation.status = 'failed';
        compilation.result = null;
        compilation.error = 'Twitch connection changed during compilation. Retry after verifying.';
      }
      await chatStore.finishCompile(queue.channelId, proposal.id, compilation);
      for (const owner of studios.values()) publish(owner);
      return toState(studio);
    },
  );
  app.get<{ Querystring: { studio?: string; key?: string } }>(
    '/api/demo/overlay',
    async (request, reply) => {
      const studio = overlayStudio(request.query.studio ?? '', request.query.key ?? '');
      if (!studio) return reply.code(404).send({ message: 'Overlay link is unavailable.' });
      return {
        world: overlayWorld(worldFor(studio)),
        mode: rivalry.current(studio.id) ? 'rivalry' : 'local-fixture',
      };
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
  let combatStudyJob: Promise<CombatStudy> | null = null;
  app.get('/api/demo/combat-study', async (_request, reply) => {
    if (!combatStudyJob) {
      if (workers.size >= 2)
        return reply.code(429).send({ message: 'Replay workers are busy. Try again shortly.' });
      combatStudyJob = new Promise<CombatStudy>((resolve, reject) => {
        let received = false;
        const worker = new Worker(new URL('./combat-worker.ts', import.meta.url), {
          execArgv: [],
          resourceLimits: { maxOldGenerationSizeMb: 128 },
        });
        workers.add(worker);
        const timeout = setTimeout(() => {
          void worker.terminate();
          reject(new Error('Combat study timed out.'));
        }, 20_000);
        worker.once('message', (result: CombatStudy) => {
          received = true;
          resolve(result);
        });
        worker.once('error', reject);
        worker.once('exit', () => {
          workers.delete(worker);
          clearTimeout(timeout);
          if (!received) reject(new Error('Combat study worker stopped.'));
        });
      }).catch((error) => {
        combatStudyJob = null;
        throw error;
      });
    }
    try {
      return await combatStudyJob;
    } catch {
      return reply.code(503).send({ message: 'Combat study is unavailable. Try again.' });
    }
  });
  app.post('/api/rivalry/challenges', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    const parsed = rivalInviteSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(422).send({ message: 'Enter the other streamer’s Twitch username.' });
    try {
      rivalry.invite(studio.id, parsed.data.opponentLogin);
    } catch (error) {
      if (error instanceof RivalFailure)
        return reply.code(error.status).send({ message: error.message });
      throw error;
    }
    publishAll();
    return toState(studio);
  });
  app.post<{ Params: { id: string } }>('/api/rivalry/challenges/:id', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    const parsed = rivalChallengeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ message: 'Unknown challenge action.' });
    try {
      rivalry.respond(studio.id, request.params.id, parsed.data.action);
      for (const owner of rivalry.current(studio.id)?.owners ?? []) {
        const participant = byId(owner);
        if (participant?.world.status === 'running') participant.world.status = 'paused';
      }
    } catch (error) {
      if (error instanceof RivalFailure)
        return reply.code(error.status).send({ message: error.message });
      throw error;
    }
    publishAll();
    return toState(studio);
  });
  app.post('/api/rivalry/controls', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    const parsed = rivalControlSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ message: 'Unknown rivalry control.' });
    if (rivalry.current(studio.id)?.id !== parsed.data.matchId)
      return reply
        .code(409)
        .send({ message: 'This match changed. Refresh before controlling it.' });
    try {
      rivalry.control(studio.id, parsed.data.action);
    } catch (error) {
      if (error instanceof RivalFailure)
        return reply.code(error.status).send({ message: error.message });
      throw error;
    }
    publishAll();
    return toState(studio);
  });
  app.post('/api/demo/controls', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    if (rivalry.current(studio.id))
      return reply
        .code(409)
        .send({ message: 'Use the two-streamer match controls during a rivalry.' });
    const parsed = controlSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ message: 'Unknown arena control.' });
    if (parsed.data.action === 'rematch') {
      if (studio.world.status !== 'finished')
        return reply.code(409).send({ message: 'Finish this round before starting a rematch.' });
      // Reset and start in one synchronous operation; concurrent duplicate clicks cannot
      // reset a running round. The latest adopted playbook is pinned by createWorld.
      studio.world = trainingWorld(studio);
      studio.world.status = 'running';
    } else if (parsed.data.action === 'reset') studio.world = trainingWorld(studio);
    else if (studio.world.status !== 'finished')
      studio.world.status = parsed.data.action === 'pause' ? 'paused' : 'running';
    publish(studio);
    return toState(studio);
  });
  app.post('/api/demo/playbook/order', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    const parsed = reorderRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ message: 'Invalid playbook order.' });
    if (studio.adopting || studio.busy || parsed.data.expectedVersion !== studio.playbook.version)
      return reply
        .code(409)
        .send({ message: 'The book changed or a review is running. Refresh and try again.' });
    const { ruleIds } = parsed.data;
    const byRule = new Map(studio.playbook.rules.map((r) => [r.id, r]));
    if (
      ruleIds.length !== byRule.size ||
      new Set(ruleIds).size !== ruleIds.length ||
      ruleIds.some((id) => !byRule.has(id))
    )
      return reply.code(422).send({ message: 'Include every current rule exactly once.' });
    if (ruleIds.every((id, i) => studio.playbook.rules[i]?.id === id)) return toState(studio);
    studio.adopting = true;
    try {
      const playbook = {
        version: studio.playbook.version + 1,
        rules: ruleIds.map((id) => structuredClone(byRule.get(id)!)),
      };
      await store.put({
        id: studio.id,
        token: studio.token,
        overlayKey: studio.overlayKey,
        ...(studio.channel ? { channel: studio.channel } : {}),
        playbook,
      });
      studio.playbook = playbook;
      studio.trial = null;
      rivalry.adopted(studio.id);
      publishAll();
      return toState(studio);
    } finally {
      studio.adopting = false;
    }
  });
  app.post('/api/demo/trials', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    const parsed = trialRequestSchema.safeParse(request.body);
    const sample =
      parsed.success && 'sampleId' in parsed.data
        ? SAMPLE_LESSONS.find(
            (item) => item.id === ('sampleId' in parsed.data ? parsed.data.sampleId : ''),
          )
        : undefined;
    const proposal =
      parsed.success && 'proposalId' in parsed.data
        ? eligibleProposal(studio, parsed.data.proposalId)
        : undefined;
    const candidate = sample?.candidate ?? proposal?.compilation?.result?.candidate;
    if (!candidate)
      return reply.code(422).send({
        message: 'Select a sample or compile an eligible lesson against the current playbook.',
      });
    const attribution = proposal
      ? {
          author: proposal.author!.name,
          source: {
            proposalId: proposal.id,
            channelId: proposal.channelId,
            authorId: proposal.author!.id,
            compilationId: proposal.compilation!.id,
          },
        }
      : undefined;
    if (studio.busy || workers.size >= 2)
      return reply.code(429).send({ message: 'A trial is already running. Please wait.' });
    if (studio.playbook.rules.length + candidate.rules.length > 24)
      return reply.code(422).send({ message: 'Playbook limit reached.' });
    const scenario = parsed.success ? parsed.data.scenario : 'carrier';
    let opening = trainingWorld(studio);
    if (scenario === 'neutral') {
      const match = rivalry.current(studio.id);
      const self = match?.owners[0] === studio.id ? 'a' : 'b';
      const rival = match?.world.champions.find((c) => c.id !== self);
      opening = createRivalWorld(
        [
          { name: studio.channel?.login ?? 'Mica', playbook: studio.playbook },
          {
            name: rival?.name ?? 'Baseline opponent',
            playbook: rival?.playbook ?? createPlaybook(),
          },
        ],
        studio.world.seed,
        'a',
      );
      // A rival's private proposal joins are not replay evidence for this coach.
      opening = overlayWorld(opening);
      opening.champions[0].playbook = structuredClone(studio.playbook);
    }
    const source = snapshot(opening);
    studio.busy = true;
    try {
      const result = await new Promise<Pick<Trial, 'baseline' | 'candidateBranch' | 'paired'>>(
        (resolve, reject) => {
          const worker = new Worker(new URL('./trial-worker.ts', import.meta.url), {
            workerData: { source, candidate, attribution, paired: scenario === 'neutral' },
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
      if (
        proposal &&
        eligibleProposal(studio, proposal.id)?.compilation?.id !== attribution?.source.compilationId
      )
        return reply.code(409).send({
          message: 'The source lesson or playbook changed during replay. Compile and prove again.',
        });
      studio.trial = {
        id: randomUUID(),
        sampleId: sample?.id ?? null,
        ...(attribution ? { author: attribution.author, source: attribution.source } : {}),
        candidate,
        baseVersion: source.state.champions[0].playbook.version,
        scenario,
        opponent: {
          name: source.state.champions[1].name,
          version: source.state.champions[1].playbook.version,
          hash: hash(source.state.champions[1].playbook),
        },
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
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
    if (studio.trial?.id !== request.params.id)
      return reply.code(404).send({ message: 'This trial is no longer in the local session.' });
    return studio.trial;
  });
  app.post('/api/demo/adoptions', async (request, reply) => {
    const studio = ownerStudio(request.headers.cookie);
    if (!studio) return reply.code(401).send({ message: 'Open your studio first.' });
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
    if (
      trial.source &&
      eligibleProposal(studio, trial.source.proposalId)?.compilation?.id !==
        trial.source.compilationId
    )
      return reply
        .code(409)
        .send({ message: 'The source lesson was removed, rejected, recompiled, or disconnected.' });
    studio.adopting = true;
    try {
      const playbook = addLesson(
        studio.playbook,
        trial.candidate,
        trial.source ? { author: trial.author!, source: trial.source } : undefined,
      );
      const persist = async () =>
        store.put({
          id: studio.id,
          token: studio.token,
          overlayKey: studio.overlayKey,
          ...(studio.channel ? { channel: studio.channel } : {}),
          playbook,
        });
      if (trial.source) {
        try {
          await chatStore.withCompiledSource(
            trial.source.channelId,
            trial.source.proposalId,
            trial.source.compilationId,
            async () => {
              if (!eligibleProposal(studio, trial.source!.proposalId))
                throw new Error('Source changed.');
              await persist();
            },
          );
        } catch {
          return reply
            .code(409)
            .send({ message: 'The source changed or adoption could not be saved. Try again.' });
        }
      } else await persist();
      studio.playbook = playbook;
      rivalry.adopted(studio.id);
      trial.adopted = true;
      publishAll();
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
            if (!rivalry.current(studio.id) && studio.world.status === 'running') {
              studio.world = step(studio.world);
              if (studio.world.tick % 2 === 0 || studio.world.status === 'finished')
                publish(studio);
            }
          for (const owner of rivalry.tick()) {
            const studio = byId(owner);
            if (studio) publish(studio);
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
    unwatchAuthority();
    await intake.close();
    twitch.close();
    for (const studio of studios.values()) for (const client of studio.clients) client.close();
    await Promise.all([...workers].map((worker) => worker.terminate()));
  });
  return Object.assign(app, {
    checkpoint: (): AppCheckpoint =>
      structuredClone({
        version: 1,
        engine: ENGINE_VERSION,
        studios: store.records,
        arenas: [...studios.values()].map(({ id, world, trial, touchedAt }) => ({
          id,
          world,
          trial,
          touchedAt,
        })),
        chat: chatStore.checkpoint(),
        rivalry: rivalry.checkpoint(),
      }),
  });
}
