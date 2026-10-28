import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SAMPLE_LESSONS, type StudioState, type Trial } from '@chorusborn/contracts';
import { createApp } from './app.js';
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  while (cleanup.length) await cleanup.pop()!();
});
const boot = async (path: string | null = null) => {
  const app = await createApp({ storePath: path, clock: false });
  cleanup.push(() => app.close());
  const initial = await app.inject('/api/demo/state');
  const cookie = initial.headers['set-cookie']!.toString().split(';')[0]!;
  const post = (url: string, payload: Record<string, unknown>, authority = cookie) =>
    app.inject({ method: 'POST', url, payload, headers: { cookie: authority } });
  const state = async () =>
    (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json<StudioState>();
  const prove = async (sample: number, scenario: 'carrier' | 'neutral' = 'carrier') => {
    const r = await post('/api/demo/trials', { sampleId: SAMPLE_LESSONS[sample]!.id, scenario });
    expect(r.statusCode).toBe(200);
    return r.json<Trial>();
  };
  const adopt = async (sample: number) => {
    const trial = await prove(sample);
    const r = await post('/api/demo/adoptions', {
      trialId: trial.id,
      expectedVersion: trial.baseVersion,
    });
    expect(r.statusCode).toBe(200);
    return r.json<StudioState>();
  };
  return { app, cookie, post, state, prove, adopt };
};
describe('reviewed strategy controls', () => {
  it('validates complete owner-only orders, saves a new version once, pins the round, and persists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'chorusborn-order-'));
    cleanup.push(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, 'studios.json');
    const t = await boot(path);
    const first = await t.adopt(2);
    await t.post('/api/demo/controls', { action: 'reset' });
    const second = await t.adopt(0);
    const ids = second.playbook.rules.map((r) => r.id),
      reverse = [...ids].reverse();
    expect(
      (await t.post('/api/demo/playbook/order', { expectedVersion: 2, ruleIds: reverse }, ''))
        .statusCode,
    ).toBe(401);
    for (const ruleIds of [[ids[0], ids[0]], [ids[0]], ['unknown', ids[1]], []])
      expect(
        (await t.post('/api/demo/playbook/order', { expectedVersion: 2, ruleIds })).statusCode,
      ).toBe(422);
    const attempts = await Promise.all([
      t.post('/api/demo/playbook/order', { expectedVersion: 2, ruleIds: reverse }),
      t.post('/api/demo/playbook/order', { expectedVersion: 2, ruleIds: reverse }),
    ]);
    expect(attempts.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const saved = await t.state();
    expect(saved.playbook).toEqual({ version: 3, rules: [...second.playbook.rules].reverse() });
    expect(saved.world.champions[0].playbook).toEqual(first.playbook);
    expect(saved.latestTrial).toBeNull();
    expect(
      (
        await t.post('/api/demo/playbook/order', { expectedVersion: 3, ruleIds: reverse })
      ).json<StudioState>().playbook.version,
    ).toBe(3);
    const reopened = await createApp({ storePath: path, clock: false });
    cleanup.push(() => reopened.close());
    expect(
      (
        await reopened.inject({ url: '/api/demo/state', headers: { cookie: t.cookie } })
      ).json<StudioState>().playbook,
    ).toEqual(saved.playbook);
  });
  it('proves neutral retrieval from both initiatives without changing the studio or permitting stale adoption', async () => {
    const t = await boot();
    const before = await t.state();
    const trial = await t.prove(0, 'neutral');
    expect(trial.scenario).toBe('neutral');
    expect(trial.opponent).toMatchObject({ name: 'Baseline opponent', version: 0 });
    expect(trial.baseline.frames[0]!.core.carrier).toBeNull();
    expect(trial.baseline.frames[0]!.contest.opening).toBe('a');
    expect(trial.candidateBranch.frames[0]!.champions[1]).toEqual(
      trial.baseline.frames[0]!.champions[1],
    );
    expect(trial.paired?.sourceHash).not.toBe(trial.sourceHash);
    expect(trial.paired?.baseline.finalHash).not.toBe(trial.baseline.finalHash);
    expect(trial.candidateBranch.score + trial.paired!.candidateBranch.score).toBeGreaterThan(0);
    expect((await t.state()).world).toEqual(before.world);
    const again = await t.prove(0, 'neutral');
    expect(again.candidateBranch.finalHash).toBe(trial.candidateBranch.finalHash);
    expect(again.paired).toEqual(trial.paired);
    const adopted = await t.post('/api/demo/adoptions', { trialId: again.id, expectedVersion: 0 });
    expect(adopted.statusCode).toBe(200);
    expect(
      (await t.post('/api/demo/adoptions', { trialId: again.id, expectedVersion: 0 })).statusCode,
    ).toBe(409);
  });
});
