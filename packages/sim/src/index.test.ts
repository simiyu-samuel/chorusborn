import { describe, expect, it } from 'vitest';
import { SAMPLE_LESSONS, type Snapshot, type World } from '@chorusborn/contracts';
import {
  addLesson,
  createPlaybook,
  createWorld,
  hash,
  restore,
  runBranch,
  snapshot,
  step,
} from './index.js';

const advance = (source: World, count: number) => {
  let world = structuredClone(source);
  world.status = 'running';
  for (let i = 0; i < count; i++) world = step(world);
  return world;
};

describe('authoritative Core Run', () => {
  it('reproduces identical state across 100 recorded seeds', () => {
    for (let seed = 0; seed < 100; seed++)
      expect(hash(advance(createWorld(undefined, seed), 24))).toBe(
        hash(advance(createWorld(undefined, seed), 24)),
      );
  });
  it('restores a complete checkpoint without changing subsequent results', () => {
    const world = createWorld(addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate));
    const checkpoint = snapshot(advance(world, 79));
    expect(hash(advance(restore(checkpoint), 121))).toBe(hash(advance(world, 200)));
  });
  it('rejects modified, incomplete and incompatible snapshots', () => {
    const source = snapshot(createWorld());
    const modified = structuredClone(source);
    modified.state.champions[0].health = 5;
    expect(() => restore(modified)).toThrow('integrity');
    const incomplete = structuredClone(source);
    delete (incomplete.state.champions[0] as Partial<(typeof incomplete.state.champions)[0]>)
      .shieldReadyAt;
    incomplete.hash = hash(incomplete.state);
    expect(() => restore(incomplete)).toThrow('shieldReadyAt');
    expect(() => restore({ ...source, codecVersion: 2 } as unknown as Snapshot)).toThrow('version');
  });
  it('branches one policy while preserving the source and reactive opponent', () => {
    const source = snapshot(createWorld());
    const before = hash(source);
    const next = addLesson(source.state.champions[0].playbook, SAMPLE_LESSONS[0]!.candidate);
    const baseline = runBranch(source),
      candidate = runBranch(source, next);
    expect(hash(source)).toBe(before);
    expect(candidate.score).toBeGreaterThan(baseline.score);
    expect(candidate.ruleUses).toBeGreaterThan(0);
    expect(candidate.finalHash).toBe(runBranch(source, next).finalHash);
    expect(candidate.frames[0]!.champions[1].playbook).toEqual(
      baseline.frames[0]!.champions[1].playbook,
    );
  });
  it('leaves the pinned round immutable when adopting a new playbook', () => {
    const base = createPlaybook(),
      world = createWorld(base);
    const next = addLesson(base, SAMPLE_LESSONS[0]!.candidate);
    expect(next.version).toBe(1);
    expect(base.rules).toHaveLength(0);
    expect(world.champions[0].playbook.version).toBe(0);
  });
  it('does not move while paused or after the final whistle', () => {
    const paused = createWorld();
    expect(step(paused)).toEqual(paused);
    const final = advance(paused, 1200);
    expect(final.status).toBe('finished');
    expect(step(final)).toEqual(final);
  });
  it('resolves simultaneous lethal damage before allowing a capture', () => {
    const world = createWorld();
    world.status = 'running';
    world.champions[0].x = 2500;
    world.champions[0].y = 9500;
    world.champions[1].x = 3500;
    world.champions[1].y = 9500;
    world.champions[0].health = 20;
    world.champions[1].health = 20;
    const next = step(world);
    expect(next.champions.map((actor) => actor.health)).toEqual([0, 0]);
    expect(next.champions[0].score).toBe(0);
    expect(next.core.carrier).toBeNull();
  });
  it('never walks through walls or beyond arena bounds', () => {
    const branch = runBranch(
      snapshot(createWorld(addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate))),
    );
    for (const frame of branch.frames)
      for (const actor of frame.champions) {
        expect(actor.x).toBeGreaterThanOrEqual(0);
        expect(actor.x).toBeLessThan(frame.arena.width * 1000);
        expect(actor.y).toBeGreaterThanOrEqual(0);
        expect(actor.y).toBeLessThan(frame.arena.height * 1000);
        expect(
          frame.arena.walls.some(
            (p) => p.x === Math.floor(actor.x / 1000) && p.y === Math.floor(actor.y / 1000),
          ),
        ).toBe(false);
      }
  });
});
