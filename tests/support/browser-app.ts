// Browser-test harness only. Never loaded by the production or development server.
// All OAuth provider responses below are fixtures; no Twitch request is made.
import { randomUUID } from 'node:crypto';
import { createApp } from '../../apps/server/src/app.js';
import { TwitchOAuth } from '../../apps/server/src/twitch.js';
import { MockEventSocket, chatNotification, subscriptionResponse } from './twitch-fixtures.js';
import { SAMPLE_LESSONS, type ChatEventType } from '@chorusborn/contracts';

// Each browser scenario owns a new complete mock provider and game runtime.
export async function createBrowserTestApp() {
  const sockets: MockEventSocket[] = [];
  const sessions = new Map<string, MockEventSocket>();
  const channelSockets = new Map<string, MockEventSocket>();

  const oauth = new TwitchOAuth(
    {
      clientId: 'browser-test-client',
      clientSecret: 'browser-test-secret',
      redirectUri: 'http://localhost:3101/auth/twitch/callback',
      webOrigin: 'http://localhost:5273',
      channel: 'developersimiyu',
    },
    {
      fetch: async (input, init) => {
        const url = String(input);
        if (url === 'https://id.twitch.tv/oauth2/token') {
          const body = new URLSearchParams(init?.body as URLSearchParams);
          if (
            !['browser-test-code', 'browser-rival-code', 'browser-rival-host-code'].includes(
              body.get('code') ?? '',
            )
          )
            return Response.json({}, { status: 400 });
          return Response.json({
            access_token:
              body.get('code') === 'browser-rival-code'
                ? 'browser-rival-access'
                : body.get('code') === 'browser-rival-host-code'
                  ? 'browser-rival-host-access'
                  : 'browser-test-access',
            refresh_token: 'browser-test-refresh',
          });
        }
        if (url === 'https://id.twitch.tv/oauth2/validate') {
          const rival =
            (init?.headers as Record<string, string>)?.Authorization ===
            'OAuth browser-rival-access';
          const host =
            (init?.headers as Record<string, string>)?.Authorization ===
            'OAuth browser-rival-host-access';
          return Response.json({
            client_id: 'browser-test-client',
            user_id: rival ? '654321' : host ? '112233' : '123456',
            login: rival ? 'fixture_guest' : host ? 'fixture_host' : 'developersimiyu',
            scopes: ['user:read:chat'],
            expires_in: 3600,
          });
        }
        if (url === 'https://id.twitch.tv/oauth2/revoke')
          return new Response(null, { status: 200 });
        if (url === 'https://api.twitch.tv/helix/eventsub/subscriptions') {
          const body = JSON.parse(String(init?.body));
          channelSockets.set(
            body.condition.broadcaster_user_id,
            sessions.get(body.transport.session_id)!,
          );
          return subscriptionResponse(String(init?.body));
        }
        throw new Error('Unexpected browser-test provider request.');
      },
    },
  );
  const app = await createApp({
    storePath: null,
    compiler: {
      model: 'fixture/compiler',
      remainingCalls: 20,
      async compile() {
        return {
          result: {
            outcome: 'candidate',
            explanation: 'MOCK compiler result for browser flow.',
            candidate: SAMPLE_LESSONS[0]!.candidate,
          },
          inputTokens: 0,
          outputTokens: 0,
        };
      },
    },
    twitch: oauth,
    socketFactory: (url) => {
      const socket = new MockEventSocket(url);
      sockets.push(socket);
      const session = `fixture-session-${sockets.length}`;
      sessions.set(session, socket);
      queueMicrotask(() => socket.welcome(session));
      return socket;
    },
  });
  // Mirror the provider's idle traffic. Without this, long UI/graphics checks
  // incorrectly turn a healthy mock connection into a real watchdog timeout.
  // Unit transport tests retain explicit/manual timeouts; only this harness sends it.
  const keepalive = setInterval(() => {
    for (const socket of sockets)
      if (!socket.closed)
        socket.emit({
          metadata: {
            message_id: randomUUID(),
            message_type: 'session_keepalive',
            message_timestamp: new Date().toISOString(),
          },
          payload: {},
        });
  }, 5000);
  keepalive.unref();
  app.addHook('onClose', async () => {
    clearInterval(keepalive);
  });

  // Test-process-only ingress. No equivalent route or runtime toggle exists in the app.
  app.post<{
    Body: {
      type?: ChatEventType;
      event?: Record<string, unknown>;
      duplicate?: boolean;
      channelId?: string;
    };
  }>('/__test__/event', async (request) => {
    const channelId = request.body.channelId ?? '123456';
    const socket = channelSockets.get(channelId);
    if (!socket || socket.closed) throw new Error('Connect the fixture channel first.');
    const packet = chatNotification(request.body.type, {
      broadcaster_user_id: channelId,
      ...request.body.event,
    });
    packet.payload.subscription!.condition = { broadcaster_user_id: channelId, user_id: channelId };
    socket.emit(packet);
    if (request.body.duplicate) socket.emit(packet);
    return { accepted: true };
  });
  return app;
}
