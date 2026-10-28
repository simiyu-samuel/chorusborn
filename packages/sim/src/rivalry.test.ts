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
