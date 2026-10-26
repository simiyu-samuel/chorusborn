// Browser-test harness only. Never loaded by the production or development server.
// All OAuth provider responses below are fixtures; no Twitch request is made.
import { createApp } from '../../apps/server/src/app.js';
import { TwitchOAuth } from '../../apps/server/src/twitch.js';

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
      throw new Error('Unexpected browser-test provider request.');
    },
  },
);
const app = await createApp({ storePath: null, twitch: oauth });
await app.listen({ host: '127.0.0.1', port: 3001 });
console.log('Browser tests: isolated in-memory studios and MOCK Twitch provider.');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void app.close();
  });
