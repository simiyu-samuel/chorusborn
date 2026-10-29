// Explicit opt-in real-store check. Uses a new namespace and no Twitch/model credentials.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { Bus, Rpc } from '../src/cloud/bus.js';
import { startAuthority } from '../src/cloud/authority.js';
import { createGateway } from '../src/cloud/gateway.js';
const env = parseEnv(readFileSync('.env.vercel.local', 'utf8'));
const config = {
  redisUrl: env.REDIS_URL!,
  key: randomBytes(32).toString('hex'),
  namespace: `chorusborn:smoke:${randomUUID()}:`,
  origin: 'https://smoke.example',
};
const bus = new Bus(config);
await bus.connect();
const rpcA = new Rpc(bus),
  rpcB = new Rpc(bus);
await rpcA.connect();
await rpcB.connect();
let authority: Awaited<ReturnType<typeof startAuthority>> | undefined;
let gateways: Awaited<ReturnType<typeof createGateway>>[] = [];
try {
  authority = await startAuthority(bus);
  gateways = await Promise.all([createGateway(config), createGateway(config)]);
  const [a, b] = gateways;
  const first = await a!.inject({ url: '/api/demo/state', headers: { host: 'smoke.example' } });
  assert.equal(first.statusCode, 200);
  const cookie = String(first.headers['set-cookie']).split(';')[0]!;
  const headers = {
    host: 'smoke.example',
    cookie,
    origin: config.origin,
    'content-type': 'application/json',
  };
  const get = async () => (await b!.inject({ url: '/api/demo/state', headers })).json();
  assert.equal((await get()).overlayPath, first.json().overlayPath);
  assert.equal(
    (
      await b!.inject({
        method: 'POST',
        url: '/api/demo/controls',
        headers: { host: 'smoke.example', 'content-type': 'application/json' },
        payload: { action: 'reset' },
      })
    ).statusCode,
    401,
  );
  const trial = await rpcA.request({
    method: 'POST',
    path: '/api/demo/trials',
    headers,
    payload: JSON.stringify({ sampleId: 'core-discipline' }),
  });
  assert.equal(trial.status, 200);
  const trialId = JSON.parse(trial.body).id;
  const adoption = {
    method: 'POST',
    path: '/api/demo/adoptions',
    headers,
    payload: JSON.stringify({ trialId, expectedVersion: 0 }),
  };
  const id = randomUUID();
  const adopted = await rpcA.request(adoption, id);
  assert.equal(adopted.status, 200);
  const duplicate = await rpcB.request(adoption, id);
  assert.deepEqual(duplicate, adopted);
  assert.equal((await get()).playbook.version, 1);
  await rpcA.request({
    method: 'POST',
    path: '/api/demo/controls',
    headers,
    payload: JSON.stringify({ action: 'reset' }),
  });
  await rpcA.request({
    method: 'POST',
    path: '/api/demo/controls',
    headers,
    payload: JSON.stringify({ action: 'resume' }),
  });
  await delay(300);
  const before = await get();
  assert.ok(before.world.tick > 0);
  const overlayUrl = new URL(before.overlayPath, config.origin);
  const overlay = await b!.inject({
    url: `/api/demo/overlay${overlayUrl.search}`,
    headers: { host: 'smoke.example' },
  });
  assert.equal(overlay.statusCode, 200);
  assert.equal('intake' in overlay.json(), false);
  await authority.stop();
  authority = undefined;
  authority = await startAuthority(bus);
  const restored = await get();
  assert.equal(restored.world.status, 'paused');
  assert.ok(restored.world.tick >= before.world.tick);
  assert.equal(restored.playbook.version, 1);
  assert.equal(restored.world.champions[0].playbook.version, 1);
  const token = authority.token;
  await bus.redis.set(bus.key('lease'), 'replacement', 'PX', 15000);
  await assert.rejects(() => bus.save(token, { bad: 'stale writer' }));
  await bus.release(token);
  assert.equal(await bus.redis.get(bus.key('lease')), 'replacement');
  await delay(4300);
  await assert.rejects(() => authority!.done());
  await authority.stop().catch(() => {});
  authority = undefined;
  console.log(
    'PASS: two independent gateways, spectator denial, proof/adoption, duplicate receipt, paused checkpoint recovery and fenced stale writer.',
  );
} finally {
  await Promise.all(gateways.map((g) => g.close()));
  rpcA.close();
  rpcB.close();
  await authority?.stop().catch(() => {});
  const keys = await bus.redis.keys(`${config.namespace}*`);
  if (keys.length) await bus.redis.del(...keys);
  bus.close();
}
