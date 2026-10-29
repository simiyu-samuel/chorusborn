import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import staticFiles from '@fastify/static';
import { fileURLToPath } from 'node:url';
import type { WebSocket } from 'ws';
import { readCloudConfig, type CloudConfig } from './config.js';
import { Bus, Rpc, redisClient, type CloudRequest } from './bus.js';
import type { StudioState } from '@chorusborn/contracts';

export async function createGateway(config: CloudConfig) {
  const bus = new Bus(config);
  await bus.connect();
  const rpc = new Rpc(bus);
  await rpc.connect();
  const subscriber = redisClient(config);
  await subscriber.connect();
  const channels = new Map<string, Set<WebSocket>>();
  const streamed = new WeakSet<WebSocket>();
  const app = Fastify({ bodyLimit: 8192, logger: false });
  const requestHeaders = (headers: Record<string, string | string[] | undefined>) => {
    const forwarded: Record<string, string> = { host: new URL(config.origin).host };
    for (const name of ['cookie', 'origin', 'content-type', 'sec-fetch-site']) {
      const value = headers[name];
      if (typeof value === 'string') forwarded[name] = value;
    }
    return forwarded;
  };
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Referrer-Policy', 'no-referrer').header('X-Content-Type-Options', 'nosniff');
    if (/^\/(api|auth|health|ws)\//.test(request.url)) {
      reply.header('Cache-Control', 'no-store');
      if (
        request.headers.host !== new URL(config.origin).host ||
        (request.headers.origin && request.headers.origin !== config.origin)
      )
        return reply.code(403).send({ message: 'Use the configured studio origin.' });
    }
  });
  await app.register(websocket);
  subscriber.on('close', () => {
    for (const sockets of channels.values())
      for (const socket of sockets) socket.close(1012, 'Stream reconnecting.');
  });
  subscriber.on('message', (channel, sealed) => {
    const sockets = channels.get(channel);
    if (!sockets) return;
    let payload: string;
    try {
      payload = JSON.stringify(bus.vault.open(sealed, 'stream'));
    } catch {
      return;
    }
    for (const socket of sockets) {
      if (socket.readyState !== 1) continue;
      if (socket.bufferedAmount > 1_000_000) socket.close(1013, 'Reconnect for fresh state.');
      else {
        socket.send(payload);
        streamed.add(socket);
      }
    }
  });
  app.get<{ Querystring: { studio?: string; key?: string } }>(
    '/ws/demo',
    { websocket: true },
    (socket, request) => {
      // Install listeners before asynchronous authorization, so frames never become commands.
      socket.on('message', () => socket.close(1008, 'This stream is read-only.'));
      socket.on('error', () => {});
      let channel: string | undefined;
      const lifetime = setTimeout(
        () => socket.close(1012, 'Reconnect to refresh the stream.'),
        240_000,
      );
      socket.on('close', () => {
        clearTimeout(lifetime);
        if (!channel) return;
        const set = channels.get(channel);
        set?.delete(socket);
        if (!set?.size) {
          channels.delete(channel);
          void subscriber.unsubscribe(channel).catch(() => {});
        }
      });
      void (async () => {
        const overlay = request.query.studio !== undefined;
        if (
          !overlay &&
          !/(?:^|;\s*)cb_session=[a-f0-9-]{36}(?:;|$)/.test(request.headers.cookie ?? '')
        )
          throw new Error('Open the studio first.');
        const path = overlay
          ? `/api/demo/overlay?${new URLSearchParams({ studio: request.query.studio ?? '', key: request.query.key ?? '' })}`
          : '/api/demo/state';
        const initial = await rpc.request({
          method: 'GET',
          path,
          headers: requestHeaders(request.headers),
        });
        if (initial.status !== 200) throw new Error('Stream access denied.');
        const value = JSON.parse(initial.body) as StudioState;
        const id = overlay
          ? request.query.studio!
          : new URL(value.overlayPath, config.origin).searchParams.get('studio')!;
        if (socket.readyState !== 1) return;
        channel = bus.key(`stream:${id}:${overlay ? 'overlay' : 'coach'}`);
        let set = channels.get(channel);
        if (!set) {
          set = new Set();
          channels.set(channel, set);
        }
        set.add(socket);
        await subscriber.subscribe(channel);
        if (socket.readyState === 1 && !streamed.has(socket))
          socket.send(
            JSON.stringify(
              overlay ? { type: 'overlay', ...value } : { type: 'state', state: value },
            ),
          );
      })().catch(() => socket.close(1008, 'Open or reconnect your studio.'));
    },
  );
  for (const prefix of ['/api/*', '/auth/*', '/health/*'])
    app.all(prefix, async (request, reply) => {
      try {
        const input: Omit<CloudRequest, 'id' | 'expires'> = {
          method: request.method,
          path: request.url,
          headers: requestHeaders(request.headers),
        };
        if (request.body !== undefined) input.payload = JSON.stringify(request.body);
        const result = await rpc.request(input);
        for (const [name, value] of Object.entries(result.headers)) reply.header(name, value);
        return reply.code(result.status).send(result.body);
      } catch {
        return reply.code(503).send({
          message:
            'The game server is starting or reconnecting. Wait, then check the studio before repeating an action.',
        });
      }
    });
  await app.register(staticFiles, {
    root: fileURLToPath(new URL('../../../web/dist', import.meta.url)),
  });
  app.setNotFoundHandler((request, reply) =>
    request.method === 'GET' && !/^\/(api|auth|ws|health)\//.test(request.url)
      ? reply.sendFile('index.html')
      : reply.code(404).send({ message: 'Not found.' }),
  );
  app.addHook('onClose', async () => {
    for (const set of channels.values()) for (const socket of set) socket.close();
    subscriber.disconnect();
    rpc.close();
    bus.close();
  });
  return app;
}
if (process.env.CHORUSBORN_GATEWAY_ENTRY === '1') {
  const app = await createGateway(readCloudConfig(process.env));
  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 80) });
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => void app.close());
}
