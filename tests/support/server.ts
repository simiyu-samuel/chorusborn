// Browser-test harness only. Never loaded by the production or development server.
// All OAuth provider responses below are fixtures; no Twitch request is made.
import { createApp } from '../../apps/server/src/app.js';
import { TwitchOAuth } from '../../apps/server/src/twitch.js';
import { MockEventSocket, chatNotification, subscriptionResponse } from './twitch-fixtures.js';
import type { ChatEventType } from '@chorusborn/contracts';
const sockets: MockEventSocket[] = [];

const oauth = new TwitchOAuth(
  {
    clientId: 'browser-test-client',
    clientSecret: 'browser-test-secret',
    redirectUri: 'http://localhost:3001/auth/twitch/callback',
    webOrigin: 'http://localhost:5173',
    channel: 'developersimiyu',
  },
  {
    fetch: async (input, init) => {
      const url = String(input);
      if (url === 'https://id.twitch.tv/oauth2/token') {
        const body = new URLSearchParams(init?.body as URLSearchParams);
        if (body.get('code') !== 'browser-test-code') return Response.json({}, { status: 400 });
        return Response.json({
          access_token: 'browser-test-access',
          refresh_token: 'browser-test-refresh',
        });
      }
      if (url === 'https://id.twitch.tv/oauth2/validate')
        return Response.json({
          client_id: 'browser-test-client',
          user_id: '123456',
          login: 'developersimiyu',
          scopes: ['user:read:chat'],
          expires_in: 3600,
        });
      if (url === 'https://id.twitch.tv/oauth2/revoke') return new Response(null, { status: 200 });
      if (url === 'https://api.twitch.tv/helix/eventsub/subscriptions')
        return subscriptionResponse(String(init?.body));
      throw new Error('Unexpected browser-test provider request.');
    },
  },
);
const app = await createApp({
  storePath: null,
  twitch: oauth,
  socketFactory: (url) => {
    const socket = new MockEventSocket(url);
    sockets.push(socket);
    queueMicrotask(() => socket.welcome());
    return socket;
  },
});
// Test-process-only ingress. No equivalent route or runtime toggle exists in the app.
app.post<{ Body: { type?: ChatEventType; event?: Record<string, unknown>; duplicate?: boolean } }>(
  '/__test__/event',
  async (request) => {
    const socket = sockets.findLast((candidate) => !candidate.closed);
    if (!socket) throw new Error('Connect the fixture channel first.');
    const packet = chatNotification(request.body.type, request.body.event);
    socket.emit(packet);
    if (request.body.duplicate) socket.emit(packet);
    return { accepted: true };
  },
);
await app.listen({ host: '127.0.0.1', port: 3001 });
console.log('Browser tests: isolated in-memory studios and MOCK Twitch provider.');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void app.close();
  });
