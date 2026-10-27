import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { TwitchOAuth } from './twitch.js';
import {
  MockEventSocket,
  chatNotification,
  subscriptionResponse,
} from '../../../tests/support/twitch-fixtures.js';
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
async function boot(chatStorePath: string | null = null) {
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).endsWith('/token'))
      return Response.json({
        access_token: 'intake-test-access',
        refresh_token: 'intake-test-refresh',
      });
    if (String(url).endsWith('/validate'))
      return Response.json({
        client_id: 'intake-test-client',
        user_id: '123456',
        login: 'developersimiyu',
        scopes: ['user:read:chat'],
        expires_in: 3600,
      });
    if (String(url).endsWith('/revoke')) return new Response(null, { status: 200 });
    if (String(url) === 'https://api.twitch.tv/helix/eventsub/subscriptions')
      return subscriptionResponse(String(init?.body));
    throw new Error('Unexpected fixture provider request.');
  });
  const twitch = new TwitchOAuth(
    {
      clientId: 'intake-test-client',
      clientSecret: 'intake-test-secret',
      channel: 'developersimiyu',
      redirectUri: 'http://localhost:3001/auth/twitch/callback',
      webOrigin: 'http://localhost:5173',
    },
    { fetch: fetcher },
  );
  const sockets: MockEventSocket[] = [];
  const app = await createApp({
    storePath: null,
    chatStorePath,
    clock: false,
    twitch,
    socketFactory: (url) => {
      const socket = new MockEventSocket(url);
      sockets.push(socket);
      queueMicrotask(() => socket.welcome());
      return socket;
    },
  });
  cleanups.push(() => app.close());
  const state = async (cookie: string) =>
    (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json();
  const authorize = async () => {
    const initial = await app.inject('/api/demo/state');
    const cookie = initial.headers['set-cookie']!.toString().split(';')[0]!;
    const start = await app.inject({ url: '/auth/twitch/start', headers: { cookie } });
    const nonce = new URL(start.headers.location!).searchParams.get('state')!;
    const callback = await app.inject({
      url: `/auth/twitch/callback?state=${nonce}&code=test-code`,
      headers: { cookie },
    });
    expect(callback.headers.location).toContain('twitch=connected');
    await vi.waitFor(async () => expect((await state(cookie)).intake.status).toBe('live'));
    return cookie;
  };
  return { app, sockets, fetcher, authorize, state };
}

describe('real intake boundaries with a fixture transport', () => {
  it('subscribes to chat/deletion events with the verified broadcaster token and deduplicates proposals', async () => {
    const { app, sockets, fetcher, authorize, state } = await boot();
    const cookie = await authorize();
    const requests = fetcher.mock.calls.filter(([url]) => String(url).endsWith('/subscriptions'));
    expect(requests).toHaveLength(4);
    for (const [, init] of requests) {
      const body = JSON.parse(String(init!.body));
      expect(body.condition).toEqual({ broadcaster_user_id: '123456', user_id: '123456' });
      expect(body.transport).toEqual({ method: 'websocket', session_id: 'fixture-session' });
      expect(init!.headers).toMatchObject({
        Authorization: 'Bearer intake-test-access',
        'Client-Id': 'intake-test-client',
      });
    }
    const packet = chatNotification();
    sockets[0]!.emit(packet);
    sockets[0]!.emit(packet);
    await vi.waitFor(async () => expect((await state(cookie)).intake.proposals).toHaveLength(1));
    expect((await state(cookie)).connected).toBe(true);
    const overlayPath = (await state(cookie)).overlayPath as string;
    const overlay = await app.inject(overlayPath.replace('/overlay?', '/api/demo/overlay?'));
    expect(overlay.json().intake).toBeUndefined();
    expect(overlay.body).not.toContain('Viewer One');
    expect(
      (await app.inject({ method: 'POST', url: '/__test__/event', payload: {} })).statusCode,
    ).toBe(404);
  });
  it('shares one socket per verified reader, hides queues without OAuth, and disconnects the final reader', async () => {
    const { app, sockets, authorize, state } = await boot();
    const one = await authorize(),
      two = await authorize();
    expect(sockets).toHaveLength(1);
    sockets[0]!.emit(chatNotification());
    await vi.waitFor(async () => expect((await state(two)).intake.proposals).toHaveLength(1));
    await app.inject({
      method: 'POST',
      url: '/api/twitch/disconnect',
      headers: { cookie: one },
      payload: {},
    });
    expect((await state(one)).intake.proposals).toEqual([]);
    expect(sockets[0]!.closed).toBe(false);
    await app.inject({
      method: 'POST',
      url: '/api/twitch/disconnect',
      headers: { cookie: two },
      payload: {},
    });
    expect(sockets[0]!.closed).toBe(true);
    expect((await state(two)).intake.proposals).toEqual([]);
  });
  it('requires verified OAuth for controls and rejects nonexistent proposal IDs', async () => {
    const { app, authorize, state } = await boot();
    const local = await app.inject('/api/demo/state'),
      localCookie = local.headers['set-cookie']!.toString().split(';')[0]!;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/twitch/intake',
          payload: { action: 'pause' },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/twitch/intake',
          headers: { cookie: localCookie },
          payload: { action: 'pause' },
        })
      ).statusCode,
    ).toBe(403);
    const cookie = await authorize();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/twitch/proposals/another-channel-proposal',
          headers: { cookie },
          payload: { action: 'reject' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/twitch/intake',
          headers: { cookie },
          payload: { action: 'teleport' },
        })
      ).statusCode,
    ).toBe(422);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/twitch/intake',
          headers: { cookie, origin: 'https://other.example' },
          payload: { action: 'pause' },
        })
      ).statusCode,
    ).toBe(403);
    await app.inject({
      method: 'POST',
      url: '/api/twitch/intake',
      headers: { cookie },
      payload: { action: 'pause' },
    });
    expect((await state(cookie)).intake.paused).toBe(true);
  });
  it('restores the durable queue after restart only after a new verified connection', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'chorus-intake-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, 'chat.json'),
      first = await boot(path),
      cookie = await first.authorize();
    const packet = chatNotification();
    first.sockets[0]!.emit(packet);
    await vi.waitFor(async () =>
      expect((await first.state(cookie)).intake.proposals).toHaveLength(1),
    );
    await first.app.close();
    const second = await boot(path);
    const publicState = (await second.app.inject('/api/demo/state')).json();
    expect(publicState.intake.proposals).toEqual([]);
    const nextCookie = await second.authorize();
    second.sockets[0]!.emit(packet);
    await vi.waitFor(async () =>
      expect((await second.state(nextCookie)).intake.lastOutcome).toBe('duplicate'),
    );
    expect((await second.state(nextCookie)).intake.proposals).toHaveLength(1);
  });
});
