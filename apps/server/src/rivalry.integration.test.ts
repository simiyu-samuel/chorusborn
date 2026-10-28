import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.js';
import { TwitchOAuth } from './twitch.js';
import { SAMPLE_LESSONS } from '@chorusborn/contracts';
import {
  MockEventSocket,
  chatNotification,
  subscriptionResponse,
} from '../../../tests/support/twitch-fixtures.js';
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
const identities = {
  one: { id: '111', login: 'streamer_one' },
  two: { id: '222', login: 'streamer_two' },
  third: { id: '333', login: 'outsider' },
};
async function boot(storePath: string | null = null) {
  const sockets = new Map<string, MockEventSocket>(),
    sessions = new Map<string, MockEventSocket>();
  const oauth = new TwitchOAuth(
    {
      clientId: 'rival-test',
      clientSecret: 'rival-test-secret',
      redirectUri: 'http://localhost:3001/auth/twitch/callback',
      webOrigin: 'http://localhost:5173',
      channel: 'streamer_one',
    },
    {
      fetch: async (input, init) => {
        const url = String(input);
        if (url.endsWith('/token')) {
          const role = new URLSearchParams(init?.body as URLSearchParams).get('code');
          return Response.json({
            access_token: `access-${role}`,
            refresh_token: `refresh-${role}`,
          });
        }
        if (url.endsWith('/validate')) {
          const role = (init?.headers as Record<string, string>).Authorization!.split(
            'access-',
          )[1] as keyof typeof identities;
          const who = identities[role];
          return Response.json({
            client_id: 'rival-test',
            user_id: who.id,
            login: who.login,
            scopes: ['user:read:chat'],
            expires_in: 3600,
          });
        }
        if (url.endsWith('/subscriptions')) {
          const body = JSON.parse(String(init?.body));
          sockets.set(body.condition.broadcaster_user_id, sessions.get(body.transport.session_id)!);
          return subscriptionResponse(String(init?.body));
        }
        if (url.endsWith('/revoke')) return new Response(null, { status: 200 });
        throw new Error('Unexpected test provider endpoint');
      },
    },
  );
  const app = await createApp({
    storePath,
    clock: false,
    twitch: oauth,
    compiler: {
      model: 'mock/rival',
      remainingCalls: 20,
      compile: async () => ({
        result: {
          outcome: 'candidate',
          explanation: 'Mock supported rule',
          candidate: SAMPLE_LESSONS[0]!.candidate,
        },
        inputTokens: 0,
        outputTokens: 0,
      }),
    },
    socketFactory: (url) => {
      const socket = new MockEventSocket(url),
        session = `session-${sessions.size}`;
      sessions.set(session, socket);
      queueMicrotask(() => socket.welcome(session));
      return socket;
    },
  });
  cleanups.push(() => app.close());
  const fresh = async () =>
    (await app.inject('/api/demo/state')).headers['set-cookie']!.toString().split(';')[0]!;
  const state = async (cookie: string) =>
    (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json();
  const post = async (cookie: string, url: string, payload: Record<string, unknown>) => {
    if (cookie && url === '/api/rivalry/controls' && !('matchId' in payload))
      payload = { ...payload, matchId: (await state(cookie)).rivalry.match?.id };
    return app.inject({ method: 'POST', url, headers: { cookie }, payload });
  };
  const login = async (role: keyof typeof identities, cookie?: string) => {
    cookie ??= await fresh();
    const start = await app.inject({ url: '/auth/twitch/start', headers: { cookie } });
    const nonce = new URL(start.headers.location!).searchParams.get('state')!;
    const done = await app.inject({
      url: `/auth/twitch/callback?state=${nonce}&code=${role}`,
      headers: { cookie },
    });
    return {
      response: done,
      cookie: done.headers['set-cookie']?.toString().split(';')[0] ?? cookie,
    };
  };
  const teach = async (cookie: string, role: keyof typeof identities, name: string) => {
    await vi.waitFor(async () => expect((await state(cookie)).intake.status).toBe('live'));
    const packet = chatNotification(undefined, {
      broadcaster_user_id: identities[role].id,
      chatter_user_id: role === 'one' ? '555' : '666',
      chatter_user_name: name,
      message: { text: `!teach When carrying the core take a cautious route home.` },
    });
    packet.payload.subscription!.condition = {
      broadcaster_user_id: identities[role].id,
      user_id: identities[role].id,
    };
    sockets.get(identities[role].id)!.emit(packet);
    await vi.waitFor(async () => expect((await state(cookie)).intake.proposals).toHaveLength(1));
    return (await state(cookie)).intake.proposals[0].id as string;
  };
  const adopt = async (cookie: string, proposalId: string) => {
    expect((await post(cookie, `/api/twitch/proposals/${proposalId}/compile`, {})).statusCode).toBe(
      200,
    );
    const trial = await post(cookie, '/api/demo/trials', { proposalId });
    expect(trial.statusCode).toBe(200);
    expect(
      (
        await post(cookie, '/api/demo/adoptions', {
          trialId: trial.json().id,
          expectedVersion: (await state(cookie)).playbook.version,
        })
      ).statusCode,
    ).toBe(200);
  };
  return { app, sockets, fresh, state, post, login, teach, adopt };
}
describe('two-channel authority and teaching', () => {
  it('isolates both queues/adoptions, accepts only the invited owner, shares one world and redacts peer source joins', async () => {
    const { app, fresh, login, state, post, teach, adopt } = await boot();
    const one = (await login('one')).cookie,
      two = (await login('two')).cookie,
      outsider = (await login('third')).cookie;
    expect((await state(one)).world.champions[0].name).toBe('streamer_one');
    expect((await state(two)).championName).toBe('streamer_two');
    const lessonA = await teach(one, 'one', 'A viewer'),
      lessonB = await teach(two, 'two', 'B viewer');
    expect((await state(one)).intake.proposals.map((p: { id: string }) => p.id)).toEqual([lessonA]);
    expect((await state(two)).intake.proposals.map((p: { id: string }) => p.id)).toEqual([lessonB]);
    expect((await post(one, `/api/twitch/proposals/${lessonB}/compile`, {})).statusCode).toBe(404);
    expect(
      (await post(two, `/api/twitch/proposals/${lessonA}`, { action: 'reject' })).statusCode,
    ).toBe(404);
    await adopt(one, lessonA);
    await adopt(two, lessonB);
    expect(
      (await post(await fresh(), '/api/rivalry/challenges', { opponentLogin: 'streamer_two' }))
        .statusCode,
    ).toBe(403);
    expect(
      (await post(one, '/api/rivalry/challenges', { opponentLogin: 'streamer_two', actorId: 'b' }))
        .statusCode,
    ).toBe(422);
    expect(
      (await post(one, '/api/rivalry/challenges', { opponentLogin: 'streamer_two' })).statusCode,
    ).toBe(200);
    const challenge = (await state(two)).rivalry.incoming[0].id;
    expect(
      (await post(outsider, `/api/rivalry/challenges/${challenge}`, { action: 'accept' }))
        .statusCode,
    ).toBe(403);
    expect(
      (await post(two, `/api/rivalry/challenges/${challenge}`, { action: 'accept' })).statusCode,
    ).toBe(200);
    expect(
      (await post(two, `/api/rivalry/challenges/${challenge}`, { action: 'accept' })).statusCode,
    ).toBe(404);
    const a = await state(one),
      b = await state(two);
    expect(
      (
        await post(one, '/api/rivalry/controls', {
          action: 'ready',
          matchId: '00000000-0000-4000-8000-000000000001',
        })
      ).statusCode,
    ).toBe(409);
    expect(a.world).toEqual(b.world);
    expect(b.selfActor).toBe('b');
    expect(a.world.champions.map((c: { name: string }) => c.name)).toEqual([
      'streamer_one',
      'streamer_two',
    ]);
    expect(
      a.world.champions.map((c: { playbook: { version: number } }) => c.playbook.version),
    ).toEqual([1, 1]);
    expect(a.world.champions[1].playbook.rules[0].author).toBe('B viewer');
    expect(a.world.champions[1].playbook.rules[0].source).toBeUndefined();
    expect(b.playbook.rules[0].source.channelId).toBe('222');
    expect((await post(one, '/api/demo/controls', { action: 'reset' })).statusCode).toBe(409);
    await post(one, '/api/rivalry/controls', { action: 'ready' });
    expect((await state(two)).world.status).toBe('paused');
    await post(two, '/api/rivalry/controls', { action: 'ready' });
    expect((await state(one)).world.status).toBe('running');
    const overlay = await app.inject(a.overlayPath.replace('/overlay?', '/api/demo/overlay?'));
    expect(overlay.json().mode).toBe('rivalry');
    expect(overlay.json().intake).toBeUndefined();
    expect(overlay.body).not.toContain(lessonB);
    expect(overlay.body).not.toContain('refresh-');
    expect((await post('', '/api/rivalry/controls', { action: 'pause' })).statusCode).toBe(401);
    await post(two, '/api/twitch/disconnect', {});
    expect((await state(one)).world.status).toBe('paused');
    expect((await state(one)).rivalry.match.verified).toEqual([true, false]);
    expect((await post(one, '/api/rivalry/controls', { action: 'ready' })).statusCode).toBe(409);
  }, 30_000);
  it('persists channel ownership, reclaims its canonical book and rejects account switching into another champion', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chorusborn-rival-'));
    cleanups.push(() => rm(directory, { recursive: true, force: true }));
    const file = join(directory, 'studios.json');
    const first = await boot(file),
      one = (await first.login('one')).cookie;
    const lesson = await first.teach(one, 'one', 'Owner viewer');
    await first.adopt(one, lesson);
    const returning = await first.login('one');
    expect(returning.cookie).toBe(one);
    expect((await first.state(returning.cookie)).playbook.version).toBe(1);
    const wrong = await first.login('two', one);
    expect(wrong.response.headers.location).toContain('wrong-channel');
    expect((await first.state(one)).championName).toBe('streamer_one');
    expect((await first.state(one)).twitch.channel.login).toBe('streamer_one');
    await first.app.close();
    const legacy = JSON.parse(await readFile(file, 'utf8'));
    for (const row of legacy) delete row.channel;
    await writeFile(file, JSON.stringify(legacy));
    const migration = await boot(file);
    expect((await migration.login('two', one)).response.headers.location).toContain(
      'wrong-channel',
    );
    await migration.app.close();
    const second = await boot(file),
      recovered = await second.login('one');
    expect((await second.state(recovered.cookie)).playbook.version).toBe(1);
    expect((await second.state(recovered.cookie)).twitch.channel.login).toBe('streamer_one');
    expect((await second.state(recovered.cookie)).rivalry.match).toBeNull();
  }, 30_000);
});
