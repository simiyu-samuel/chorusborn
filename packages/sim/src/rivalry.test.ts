import { describe, expect, it } from 'vitest';
import { SAMPLE_LESSONS } from '@chorusborn/contracts';
import {
  createRivalWorld,
  createPlaybook,
  addLesson,
  hash,
  step,
  snapshot,
  restore,
} from './index.js';

describe('neutral two-community simulation', () => {
  it('pins independent books, has equal opening distances and records side B rule execution', () => {
    const a = createPlaybook(),
      b = addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate, { author: 'Rival viewer' });
    const world = createRivalWorld([
      { name: 'streamer_one', playbook: a },
      { name: 'streamer_two', playbook: b },
    ]);
    expect(world.core.carrier).toBeNull();
    expect(world.decoys).toEqual([]);
    expect(world.champions.map((c) => Math.abs(c.x - world.core.x))).toEqual([13500, 13500]);
    expect(world.champions.map((c) => c.name)).toEqual(['streamer_one', 'streamer_two']);
    b.version = 99;
    b.rules[0]!.author = 'Edited later';
    expect(world.champions[1].playbook.version).toBe(1);
    world.core.carrier = 'b';
    world.core.x = world.champions[1].x = 22500;
    world.status = 'running';
    let next = world;
    for (let i = 0; i < 4; i++) next = step(next);
    expect(
      next.decisions.find((d) => d.actorId === 'b' && d.author === 'Rival viewer' && d.executed),
    ).toBeDefined();
    expect(next.metrics.b.ruleUses[b.rules[0]!.id]).toBeGreaterThan(0);
    expect(hash(restore(snapshot(next)))).toBe(hash(next));
  });
  it('uses the serialized neutral core spawn after both capture and idle reset', () => {
    const source = createRivalWorld([
      { name: 'one', playbook: createPlaybook() },
      { name: 'two', playbook: createPlaybook() },
    ]);
    source.status = 'running';
    source.core.carrier = 'b';
    const captured = step(source);
    expect(captured.champions[1].score).toBe(1);
    expect(captured.core).toMatchObject({ x: 16000, y: 9500, carrier: null });
    const idle = structuredClone(source);
    idle.core = { x: 1000, y: 1000, carrier: null, unheldSince: 0 };
    idle.tick = 199;
    expect(step(idle).core).toMatchObject({ x: 16000, y: 9500, carrier: null });
    const broken = snapshot(source);
    delete (broken.state.arena as Partial<typeof broken.state.arena>).coreSpawn;
    broken.hash = hash(broken.state);
    expect(() => restore(broken)).toThrow('Incomplete');
  });
});

describe('rivalry fairness', () => {
  const carrier = addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate);
  const collector = (ability: 'none' | 'shield', route: 'direct' | 'balanced' = 'direct') =>
    addLesson(carrier, {
      contractVersion: '1',
      summary: 'Contest the available core.',
      rules: [
        {
          label: 'Contest the core',
          when: { all: [{ fact: 'core.available', op: 'eq', value: true }] },
          intent: { goal: 'collect_core', route, ability },
        },
      ],
    });
  const duel = (a: typeof carrier, b: typeof carrier, seed = 42, opening: 'a' | 'b' = 'a') => {
    const world = createRivalWorld(
      [
        { name: 'one', playbook: a },
        { name: 'two', playbook: b },
      ],
      seed,
      opening,
    );
    world.status = 'running';
    return world;
  };
  it('does not award an exact tie by actor ID or storage order; nearest living claimant wins', () => {
    const world = duel(carrier, carrier);
    world.champions[0].x = 15500;
    world.champions[1].x = 16500;
    expect(step(world).core.carrier).toBeNull();
    world.champions.reverse();
    expect(step(world).core.carrier).toBeNull();
    world.champions.reverse();
    world.champions[1].x = 16250;
    expect(step(world).core.carrier).toBe('b');
    world.champions[1].health = 0;
    world.champions[1].respawnAt = 100;
    expect(step(world).core.carrier).toBe('a');
  });
  it('breaks identical-book stalls and gives equal aggregate outcomes across opposite initiatives', () => {
    for (const seed of [0, 1, 2, 42]) {
      let first = duel(carrier, carrier, seed, 'a');
      let second = duel(carrier, carrier, seed, 'b');
      const pickups: string[] = [];
      while (first.status === 'running') {
        first = step(first);
        pickups.push(
          ...first.events
            .filter((e) => e.tick === first.tick && e.type === 'initiative')
            .map((e) => e.actorId),
        );
      }
      while (second.status === 'running') second = step(second);
      expect(first.champions.map((c) => c.score)).toEqual([3, 2]);
      expect(second.champions.map((c) => c.score)).toEqual([2, 3]);
      expect(first.metrics.a).toEqual(second.metrics.b);
      expect(first.metrics.b).toEqual(second.metrics.a);
      expect(first.metrics.a.possessionTicks).toBeGreaterThan(0);
      expect(first.metrics.b.possessionTicks).toBeGreaterThan(0);
      expect(pickups).toEqual(['a', 'b', 'a', 'b', 'a']);
    }
  });
  it('requires ten uninterrupted contest ticks, then passes initiative; pauses do not advance it', () => {
    let world = duel(carrier, carrier, 42, 'b');
    world.champions[0].x = 15500;
    world.champions[1].x = 16500;
    world.tick = 1; // First update is not a decision tick.
    world = step(world);
    expect(world.contest.since).toBe(2);
    const paused = { ...world, status: 'paused' as const };
    expect(step(paused)).toEqual(paused);
    while (world.tick < 11) world = step(world);
    expect(world.core.carrier).toBeNull();
    world = step(world);
    expect(world.core.carrier).toBe('b');
    expect(world.contest.initiative).toBe('a');
    expect(world.contest.since).toBeNull();
    expect(world.events.some((e) => e.type === 'initiative' && e.actorId === 'b')).toBe(true);
    const broken = duel(carrier, carrier);
    broken.champions[0].x = 15500;
    broken.champions[1].x = 16500;
    const pending = step(broken);
    pending.champions[1].x = 25000;
    const won = step(pending);
    expect(won.core.carrier).toBe('a');
    expect(won.contest.since).toBeNull();
    expect(won.contest.initiative).toBe('a'); // Unique claims do not consume initiative.
    const resetting = duel(carrier, carrier);
    resetting.tick = 199;
    resetting.contest.since = 195;
    resetting.core = { x: 14000, y: 9500, carrier: null, unheldSince: 0 };
    resetting.champions[0].x = 13500;
    resetting.champions[1].x = 14500;
    const reset = step(resetting);
    expect(reset.core).toMatchObject({ x: 16000, y: 9500, carrier: null });
    expect(reset.contest.since).toBeNull();
  });
  it('restores a contested checkpoint exactly and rejects the previous pickup ruleset', () => {
    let uninterrupted = duel(carrier, carrier);
    while (uninterrupted.tick < 52) uninterrupted = step(uninterrupted);
    expect(uninterrupted.core.carrier).toBeNull();
    const checkpoint = snapshot(uninterrupted);
    let resumed = restore(checkpoint);
    for (let i = 0; i < 200; i++) {
      uninterrupted = step(uninterrupted);
      resumed = step(resumed);
    }
    expect(hash(resumed)).toBe(hash(uninterrupted));
    const missing = snapshot(resumed);
    delete (missing.state as Partial<typeof missing.state>).contest;
    missing.hash = hash(missing.state);
    expect(() => restore(missing)).toThrow('Incomplete');

    const old = structuredClone(checkpoint);
    old.state.engineVersion = 'core-run/0.3.0' as typeof old.state.engineVersion;
    old.hash = hash(old.state);
    expect(() => restore(old)).toThrow('version');
  });
  it('mirrors complete trajectories when different books swap sides, including route and shield choices', () => {
    const view = (world: ReturnType<typeof duel>, index: 0 | 1, mirror: boolean) => {
      const { id, name: _name, x, home, ...champion } = world.champions[index];
      const reflect = (x: number) => (mirror ? world.arena.width * 1000 - x : x);
      return {
        ...champion,
        x: reflect(x),
        home: { ...home, x: reflect(home.x) },
        metrics: world.metrics[id],
        contest: {
          ...world.contest,
          opening: world.contest.opening === id ? 'self' : 'enemy',
          initiative: world.contest.initiative === id ? 'self' : 'enemy',
        },
        core: {
          ...world.core,
          x: reflect(world.core.x),
          carrier:
            world.core.carrier === null ? null : world.core.carrier === id ? 'self' : 'enemy',
        },
      };
    };
    for (const seed of [0, 1, 2, 42]) {
      let left = duel(collector('none', 'balanced'), carrier, seed);
      let right = duel(carrier, collector('none', 'balanced'), seed, 'b');
      while (left.status === 'running') {
        left = step(left);
        right = step(right);
        expect(view(left, 0, false)).toEqual(view(right, 1, true));
        expect(view(left, 1, false)).toEqual(view(right, 0, true));
      }
      expect(right.status).toBe('finished');
    }
    let left = duel(collector('shield'), carrier);
    let right = duel(carrier, collector('shield'), 42, 'b');
    while (left.status === 'running') {
      left = step(left);
      right = step(right);
      expect(view(left, 0, false)).toEqual(view(right, 1, true));
      expect(view(left, 1, false)).toEqual(view(right, 0, true));
    }
    expect(left.champions[0].score).toBeGreaterThan(left.champions[1].score);
    expect(right.champions.map((c) => c.score)).toEqual(
      left.champions.map((c) => c.score).reverse(),
    );
  });
});
