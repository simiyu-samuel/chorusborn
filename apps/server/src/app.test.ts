import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
  vi.useRealTimers();
});
const boot = async (path: string | null = null) => {
  const app = await createApp({ storePath: path, clock: false });
  cleanups.push(() => app.close());
  return app;
};

describe('local studio boundaries', () => {
  it('requires a coach session, blocks foreign origins and validates controls', async () => {
    const app = await boot();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/demo/controls',
          payload: { action: 'resume' },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          url: '/api/demo/state',
          headers: { origin: 'https://untrusted.example' },
        })
      ).statusCode,
    ).toBe(403);
    const initial = await app.inject('/api/demo/state');
    const cookie = initial.headers['set-cookie']!.toString().split(';')[0]!;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/demo/controls',
          headers: { cookie },
          payload: { action: 'teleport' },
        })
      ).statusCode,
    ).toBe(422);
  });
  it('gives an overlay read access without coach authority', async () => {
    const app = await boot();
    const initial = await app.inject('/api/demo/state');
    const overlayPath = initial.json().overlayPath as string;
    const overlay = await app.inject(overlayPath.replace('/overlay?', '/api/demo/overlay?'));
    expect(overlay.statusCode).toBe(200);
    expect(overlay.json().world.engineVersion).toBe('core-run/0.1.0');
    expect(overlay.json().overlayPath).toBeUndefined();
    const id = new URL(overlayPath, 'http://localhost').searchParams.get('studio')!;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/demo/controls',
          headers: { cookie: `cb_session=${id}` },
          payload: { action: 'resume' },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (await app.inject(`/api/demo/overlay?studio=${id}&key=${'é'.repeat(36)}`)).statusCode,
    ).toBe(404);
  });
  it('proves a lesson, rejects concurrent/stale adoption, and persists the next-round playbook', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chorusborn-test-'));
    cleanups.push(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, 'studios.json'),
      app = await boot(path);
    const initial = await app.inject('/api/demo/state');
    const cookie = initial.headers['set-cookie']!.toString().split(';')[0]!;
    const response = await app.inject({
      method: 'POST',
      url: '/api/demo/trials',
      headers: { cookie },
      payload: { sampleId: 'core-discipline' },
    });
    expect(response.statusCode, response.body).toBe(200);
    const trial = response.json();
    expect(trial.candidateBranch.score).toBeGreaterThan(trial.baseline.score);
    const command = {
      method: 'POST' as const,
      url: '/api/demo/adoptions',
      headers: { cookie },
      payload: { trialId: trial.id, expectedVersion: 0 },
    };
    const results = await Promise.all([app.inject(command), app.inject(command)]);
    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 409]);
    const state = (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json();
    expect(state.playbook.version).toBe(1);
    expect(state.world.champions[0].playbook.version).toBe(0);
    const reset = await app.inject({
      method: 'POST',
      url: '/api/demo/controls',
      headers: { cookie },
      payload: { action: 'reset' },
    });
    expect(reset.json().world.champions[0].playbook.version).toBe(1);
    await app.close();
    const reopened = await boot(path);
    expect(
      (await reopened.inject({ url: '/api/demo/state', headers: { cookie } })).json().playbook
        .version,
    ).toBe(1);
  }, 30_000);
});

describe('atomic rematch', () => {
  it('requires a finished round, starts once, pins the adopted book and keeps spectator authority read-only', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const app = await createApp({ storePath: null });
    cleanups.push(() => app.close());
    const initial = await app.inject('/api/demo/state');
    const cookie = initial.headers['set-cookie']!.toString().split(';')[0]!;
    const command = (action: string, authority = cookie) =>
      app.inject({
        method: 'POST',
        url: '/api/demo/controls',
        headers: { cookie: authority },
        payload: { action },
      });
    expect((await command('rematch')).statusCode).toBe(409);
    const trial = (
      await app.inject({
        method: 'POST',
        url: '/api/demo/trials',
        headers: { cookie },
        payload: { sampleId: 'core-discipline' },
      })
    ).json();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/demo/adoptions',
          headers: { cookie },
          payload: { trialId: trial.id, expectedVersion: 0 },
        })
      ).statusCode,
    ).toBe(200);
    await command('resume');
    expect((await command('rematch')).statusCode).toBe(409);
    vi.advanceTimersByTime(60_000);
    const final = (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json();
    expect(final.world.status).toBe('finished');
    expect(final.world.champions[0].playbook.version).toBe(0);
    const overlayURL = final.overlayPath.replace('/overlay?', '/api/demo/overlay?');
    expect((await app.inject(overlayURL)).json().world).toEqual(final.world);
    expect((await command('rematch', '')).statusCode).toBe(401);
    const key = new URL(final.overlayPath, 'http://localhost').searchParams.get('key')!;
    expect((await command('rematch', `cb_session=${key}`)).statusCode).toBe(401);
    const responses = await Promise.all([command('rematch'), command('rematch')]);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const restarted = responses.find((r) => r.statusCode === 200)!.json().world;
    expect(restarted).toMatchObject({
      tick: 0,
      status: 'running',
      winner: null,
      seed: final.world.seed,
    });
    expect(restarted.champions[0].playbook.version).toBe(1);
    expect(restarted.champions.map((c: { score: number }) => c.score)).toEqual([0, 0]);
    expect(restarted.metrics.a.ruleUses).toEqual({});
    expect((await app.inject(overlayURL)).json().world).toEqual(restarted);
  }, 30_000);
});
