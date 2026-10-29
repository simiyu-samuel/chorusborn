import { randomUUID } from 'node:crypto';
import type { HTTPMethods } from 'fastify';
import { createApp, type AppCheckpoint } from '../app.js';
import { GroqCompiler, CompileFailure, type LessonCompiler } from '../compiler.js';
import { TwitchOAuth, readTwitchConfig } from '../twitch.js';
import type { SocketFactory } from '../eventsub.js';
import { Bus, redisClient, type CloudRequest, type CloudResponse } from './bus.js';

type GameApp = Awaited<ReturnType<typeof createApp>> & { checkpoint(): AppCheckpoint };
type Checkpoint = { version: 1; app: AppCheckpoint; twitch: ReturnType<TwitchOAuth['checkpoint']> };
export async function startAuthority(
  bus: Bus,
  env: NodeJS.ProcessEnv = {},
  options: {
    clock?: boolean;
    compiler?: LessonCompiler;
    twitch?: TwitchOAuth;
    socketFactory?: SocketFactory;
  } = {},
) {
  const token = randomUUID();
  if (!(await bus.acquire(token))) throw new Error('Another game authority owns the lease.');
  let stopped = false,
    busy = false,
    dirty = false;
  let app: GameApp | undefined;
  let checkpointing = Promise.resolve();
  const reader = redisClient(bus.config, 12_000);
  let fatal: Error | undefined;
  const fail = (error: unknown) => {
    fatal ??= error instanceof Error ? error : new Error('Authority unavailable.');
    stopped = true;
    reader.disconnect();
    if (app) void app.close();
  };
  const heartbeat = setInterval(() => {
    void bus
      .renew(token)
      .then((ok) => {
        if (!ok) fail(new Error('Authority lease lost.'));
      })
      .catch(fail);
  }, 4000);
  const snapshot = (): Checkpoint => ({
    version: 1,
    app: app!.checkpoint(),
    twitch: twitch.checkpoint(),
  });
  const twitch =
    options.twitch ??
    new TwitchOAuth(
      readTwitchConfig({
        ...env,
        WEB_ORIGIN: bus.config.origin,
        TWITCH_REDIRECT_URI: `${bus.config.origin}/auth/twitch/callback`,
      }),
    );
  const nativeCompiler =
    options.compiler ??
    (env.GROQ_API_KEY ? new GroqCompiler(env.GROQ_API_KEY, fetch, 1_000_000) : undefined);
  // Reserve budget durably BEFORE an external call. A crash cannot refund a paid request.
  let spent = 0;
  const compiler: LessonCompiler | undefined = nativeCompiler
    ? {
        model: nativeCompiler.model,
        get remainingCalls() {
          return Math.max(0, 20 - spent);
        },
        async compile(text) {
          const reserved = Number(
            await bus.redis.eval(
              `
        if redis.call('GET',KEYS[1]) ~= ARGV[1] then return -1 end
        local used=tonumber(redis.call('GET',KEYS[2]) or '0');
        if used >= 20 then return -1 end return redis.call('INCR',KEYS[2])`,
              2,
              bus.key('lease'),
              bus.key('compiler-calls'),
              token,
            ),
          );
          if (reserved < 0)
            throw new CompileFailure(
              'Cloud compiler budget or authority unavailable. Review usage before retrying.',
            );
          spent = reserved;
          // Persist the running proposal/attempt before any external provider side effect.
          await bus.save(token, snapshot());
          return nativeCompiler.compile(text);
        },
      }
    : undefined;
  try {
    spent = Number((await bus.redis.get(bus.key('compiler-calls'))) ?? 0);
    const saved = await bus.checkpoint<Checkpoint>();
    if (saved && saved.version !== 1) throw new Error('Incompatible cloud checkpoint.');
    if (saved) await twitch.restore(saved.twitch);
    app = (await createApp({
      storePath: null,
      chatStorePath: null,
      twitch,
      compiler,
      clock: options.clock,
      socketFactory: options.socketFactory,
      publicOrigin: bus.config.origin,
      initialCheckpoint: saved?.app,
      publish: (id, coach, overlay) => {
        dirty = true;
        void bus.publish(token, id, 'coach', coach).catch(fail);
        void bus.publish(token, id, 'overlay', overlay).catch(fail);
      },
    })) as GameApp;
    await app.ready();
    await reader.connect();
    // Persist recovery's paused state and interrupted-compilation markers before serving.
    await bus.save(token, snapshot());
  } catch (error) {
    clearInterval(heartbeat);
    reader.disconnect();
    await app?.close();
    await bus.release(token).catch(() => {});
    throw error;
  }
  const checkpointTimer = setInterval(() => {
    if (busy || !dirty || stopped) return;
    dirty = false;
    checkpointing = checkpointing.then(() => bus.save(token, snapshot())).catch(fail);
  }, 1000);
  const respond = async (id: string, response: CloudResponse) => {
    await bus.save(token, snapshot(), { id, value: response });
    dirty = false;
  };
  const process = async (sealed: string) => {
    const request = bus.vault.open<CloudRequest>(sealed, 'request');
    if (!/^[a-f0-9-]{36}$/.test(request.id) || !Number.isFinite(request.expires)) return;
    busy = true;
    try {
      await checkpointing;
      if (stopped) return;
      const claimed = await bus.claim(token, request.id);
      if (claimed < 0) throw new Error('Authority lease lost.');
      if (claimed === 0) {
        const old = await bus.redis.get(bus.key(`reply:${request.id}`));
        if (old) {
          // Re-publishing an already committed response has no application side effect.
          await respond(request.id, bus.vault.open<CloudResponse>(old, 'reply'));
        } else
          await respond(request.id, {
            status: 409,
            headers: {},
            body: JSON.stringify({
              message:
                'Previous attempt was interrupted. Check the studio before repeating the action.',
            }),
          });
        return;
      }
      if (request.expires < Date.now()) {
        await respond(request.id, {
          status: 408,
          headers: {},
          body: JSON.stringify({ message: 'Command expired without execution.' }),
        });
        return;
      }
      if (
        !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ||
        !/^\/(api\/|auth\/|health\/)/.test(request.path) ||
        request.path.length > 4096 ||
        (request.payload?.length ?? 0) > 8192
      ) {
        await respond(request.id, {
          status: 400,
          headers: {},
          body: JSON.stringify({ message: 'Invalid gateway request.' }),
        });
        return;
      }
      const result = await app!.inject({
        method: request.method as HTTPMethods,
        url: request.path,
        headers: request.headers,
        payload: request.payload,
      });
      const headers: CloudResponse['headers'] = {};
      for (const name of [
        'content-type',
        'set-cookie',
        'location',
        'cache-control',
        'referrer-policy',
        'x-content-type-options',
      ]) {
        const value = result.headers[name];
        if (value !== undefined) headers[name] = value as string | string[];
      }
      await respond(request.id, { status: result.statusCode, headers, body: result.body });
    } finally {
      busy = false;
    }
  };
  const run = (async () => {
    try {
      while (!stopped) {
        const item = await reader.blpop(bus.key('requests'), 5);
        if (item) await process(item[1]);
      }
    } catch (error) {
      if (!stopped) fail(error);
    }
  })();
  return {
    token,
    app: app!,
    async stop() {
      if (stopped && fatal) {
        clearInterval(heartbeat);
        clearInterval(checkpointTimer);
        await run;
        throw fatal;
      }
      stopped = true;
      reader.disconnect();
      clearInterval(checkpointTimer);
      await run;
      await checkpointing;
      // Preserve final state before close clears OAuth tokens. Restore always pauses it.
      await bus.save(token, snapshot());
      clearInterval(heartbeat);
      await app!.close();
      await bus.release(token);
    },
    async done() {
      await run;
      if (fatal) throw fatal;
    },
  };
}
