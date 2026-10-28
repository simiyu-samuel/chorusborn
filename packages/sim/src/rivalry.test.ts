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
  const duel = (a: typeof carrier, b: typeof carrier, seed = 42) => {
    const world = createRivalWorld(
      [
        { name: 'one', playbook: a },
        { name: 'two', playbook: b },
      ],
      seed,
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
  it('gives identical books identical outcomes without free possession, across layout seeds', () => {
    for (const seed of [0, 1, 2, 42]) {
      let world = duel(carrier, carrier, seed);
      while (world.status === 'running') world = step(world);
      expect(world.winner).toBe('draw');
      expect(world.champions.map((c) => c.score)).toEqual([0, 0]);
      expect(world.metrics.a).toEqual(world.metrics.b);
      expect(world.metrics.a.possessionTicks).toBe(0);
    }
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
    const old = structuredClone(checkpoint);
    old.state.engineVersion = 'core-run/0.2.0' as typeof old.state.engineVersion;
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
      let right = duel(carrier, collector('none', 'balanced'), seed);
      while (left.status === 'running') {
        left = step(left);
        right = step(right);
        expect(view(left, 0, false)).toEqual(view(right, 1, true));
        expect(view(left, 1, false)).toEqual(view(right, 0, true));
      }
      expect(right.status).toBe('finished');
    }
    let left = duel(collector('shield'), carrier);
    let right = duel(carrier, collector('shield'));
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
