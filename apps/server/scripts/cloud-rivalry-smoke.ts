// Explicit real Redis / mocked providers integration. No production namespace or provider calls.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { Bus } from '../src/cloud/bus.js';
import { startAuthority } from '../src/cloud/authority.js';
import { createGateway } from '../src/cloud/gateway.js';
import { TwitchOAuth } from '../src/twitch.js';
import { SAMPLE_LESSONS } from '@chorusborn/contracts';
import {
  MockEventSocket,
  chatNotification,
  subscriptionResponse,
} from '../../../tests/support/twitch-fixtures.js';
const env = parseEnv(readFileSync('.env.vercel.local', 'utf8'));
const config = {
  redisUrl: env.REDIS_URL!,
  key: randomBytes(32).toString('hex'),
  namespace: `chorusborn:rival-smoke:${randomUUID()}:`,
  origin: 'https://smoke.example',
};
const bus = new Bus(config);
await bus.connect();
const provider = () => {
  const sessions = new Map<string, MockEventSocket>(),
    channels = new Map<string, MockEventSocket>();
  const twitch = new TwitchOAuth(
    {
      clientId: 'smoke',
      clientSecret: 'fixture-only',
      webOrigin: config.origin,
      redirectUri: `${config.origin}/auth/twitch/callback`,
      channel: 'streamer_one',
    },
    {
      fetch: async (input, init) => {
        const url = String(input);
        if (url.endsWith('/token')) {
          const code = new URLSearchParams(String(init?.body)).get('code');
          return Response.json({
            access_token: `access-${code}`,
            refresh_token: `refresh-${code}`,
          });
        }
        if (url.endsWith('/validate')) {
          const two =
            (init?.headers as Record<string, string>).Authorization === 'OAuth access-two';
          return Response.json({
            client_id: 'smoke',
            user_id: two ? '222' : '111',
            login: two ? 'streamer_two' : 'streamer_one',
            scopes: ['user:read:chat'],
            expires_in: 3600,
          });
        }
        if (url.endsWith('/subscriptions')) {
          const body = JSON.parse(String(init?.body));
          channels.set(
            body.condition.broadcaster_user_id,
            sessions.get(body.transport.session_id)!,
          );
          return subscriptionResponse(String(init?.body));
        }
        if (url.endsWith('/revoke')) return new Response(null, { status: 200 });
        throw new Error('Unexpected fixture provider endpoint');
      },
    },
  );
  return {
    twitch,
    channels,
    socketFactory: (url: string) => {
      const socket = new MockEventSocket(url),
        id = randomUUID();
      sessions.set(id, socket);
      queueMicrotask(() => socket.welcome(id));
      return socket;
    },
    compiler: {
      model: 'mock/cloud',
      remainingCalls: 20,
      compile: async () => ({
        result: {
          outcome: 'candidate' as const,
          explanation: 'Fixture compilation',
          candidate: SAMPLE_LESSONS[0]!.candidate,
        },
        inputTokens: 0,
        outputTokens: 0,
      }),
    },
  };
};
let fixture = provider(),
  authority = await startAuthority(bus, {}, fixture);
const a = await createGateway(config),
  b = await createGateway(config);
const headers = (cookie: string) => ({
  host: 'smoke.example',
  origin: config.origin,
  cookie,
  'content-type': 'application/json',
});
const state = async (cookie: string) =>
  (await a.inject({ url: '/api/demo/state', headers: headers(cookie) })).json();
const post = async (cookie: string, path: string, payload: unknown) => {
  const response = await b.inject({
    method: 'POST',
    url: path,
    headers: headers(cookie),
    payload: JSON.stringify(payload),
  });
  assert.equal(response.statusCode, 200);
  return response.json();
};
const login = async (role: string) => {
  const fresh = await a.inject({ url: '/api/demo/state', headers: { host: 'smoke.example' } }),
    cookie = String(fresh.headers['set-cookie']).split(';')[0]!;
  const start = await b.inject({ url: '/auth/twitch/start', headers: headers(cookie) });
  const nonce = new URL(start.headers.location!).searchParams.get('state');
  const done = await a.inject({
    url: `/auth/twitch/callback?state=${nonce}&code=${role}`,
    headers: headers(cookie),
  });
  assert.equal(done.statusCode, 302);
  assert.match(String(done.headers.location), /twitch=connected/);
  return String(done.headers['set-cookie']).split(';')[0]!;
};
try {
  const one = await login('one'),
    two = await login('two');
  for (const [cookie, id] of [
    [one, '111'],
    [two, '222'],
  ] as const) {
    const packet = chatNotification(undefined, { broadcaster_user_id: id });
    packet.payload.subscription!.condition = { broadcaster_user_id: id, user_id: id };
    for (let i = 0; i < 20 && !fixture.channels.get(id!); i++) await delay(50);
    for (let i = 0; i < 30 && (await state(cookie)).intake.status !== 'live'; i++) await delay(50);
    assert.equal((await state(cookie)).intake.status, 'live');
    fixture.channels.get(id!)!.emit(packet);
    let proposals = (await state(cookie!)).intake.proposals;
    for (let i = 0; i < 20 && !proposals.length; i++) {
      await delay(50);
      proposals = (await state(cookie!)).intake.proposals;
    }
    assert.equal(proposals.length, 1);
    await post(cookie!, `/api/twitch/proposals/${proposals[0].id}/compile`, {});
    const trial = await post(cookie!, '/api/demo/trials', { proposalId: proposals[0].id });
    await post(cookie!, '/api/demo/adoptions', { trialId: trial.id, expectedVersion: 0 });
  }
  const invitation = await post(one, '/api/rivalry/challenges', { opponentLogin: 'streamer_two' });
  const challenge = invitation.rivalry.outgoing.id;
  await post(two, `/api/rivalry/challenges/${challenge}`, { action: 'accept' });
  const matchId = (await state(one)).rivalry.match.id;
  await post(one, '/api/rivalry/controls', { action: 'ready', matchId });
  await post(two, '/api/rivalry/controls', { action: 'ready', matchId });
  await delay(600);
  const before = await state(one);
  assert.equal(before.world.status, 'running');
  assert.equal((await state(two)).rivalry.match.id, matchId);
  // Real Redis stream path, authenticated coach and independently keyed spectator.
  const messages: unknown[] = [];
  let closed = '';
  const socket = await b.injectWS(
    '/ws/demo',
    { headers: headers(one) },
    { onInit: (ws) => ws.on('message', (data) => messages.push(JSON.parse(String(data)))) },
  );
  for (let i = 0; i < 200 && !messages.length && !closed; i++) await delay(50);
  assert.ok(messages.length, `No stream packet; close=${closed || 'still open'}`);
  socket.close();
  await authority.stop();
  fixture = provider();
  authority = await startAuthority(bus, {}, fixture);
  const recovered = await state(one),
    peer = await state(two);
  assert.equal(recovered.world.status, 'paused');
  assert.equal(peer.world.status, 'paused');
  assert.equal(recovered.rivalry.match.id, matchId);
  assert.deepEqual(recovered.rivalry.match.verified, [true, true]);
  assert.equal(recovered.playbook.version, 1);
  assert.equal(peer.playbook.version, 1);
  assert.equal(recovered.intake.proposals.length, 1);
  assert.equal(peer.intake.proposals.length, 1);
  assert.deepEqual(
    recovered.world.champions.map((c: { name: string }) => c.name),
    ['streamer_one', 'streamer_two'],
  );
  assert.equal(recovered.world.tick, peer.world.tick);
  assert.ok(recovered.world.tick >= before.world.tick);
  console.log(
    'PASS: two mocked Twitch accounts through separate cloud gateways; independent chat/compile/proof/adoption; shared rivalry; authenticated Redis WebSocket stream; encrypted session/queue/book/match recovery paused and revalidated.',
  );
} finally {
  await Promise.all([a.close(), b.close()]);
  await authority.stop().catch(() => {});
  const keys = await bus.redis.keys(`${config.namespace}*`);
  if (keys.length) await bus.redis.del(...keys);
  bus.close();
}
