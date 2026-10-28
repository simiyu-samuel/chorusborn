import { describe, expect, it } from 'vitest';
import { createCombatStudy, createWorld, hash, restore, snapshot, step } from './index.js';
import type { Snapshot } from '@chorusborn/contracts';

describe('recorded combat', () => {
  it('records only legal contacts, exact shield contribution and simultaneous damage', () => {
    const before = createWorld();
    before.status = 'running';
    before.champions[0].x = 14500;
    before.champions[1].x = 15500;
    before.champions[0].y = before.champions[1].y = 9500;
    before.champions[1].shieldUntil = 30;
    const sourceHash = hash(before),
      after = step(before);
    const strikes = after.events.filter((e) => e.type === 'strike');
    expect(strikes).toMatchObject([
      {
        actorId: 'a',
        targetId: 'b',
        tick: 1,
        damage: 10,
        shielded: true,
        from: { x: 14500, y: 9500 },
        to: { x: 15500, y: 9500 },
      },
      { actorId: 'b', targetId: 'a', tick: 1, damage: 20, shielded: false },
    ]);
    expect(after.champions.map((c) => c.health)).toEqual([80, 90]);
    expect(step(after).events.filter((e) => e.type === 'strike')).toEqual(strikes);
    expect(hash(before)).toBe(sourceHash);
    const distant = structuredClone(before);
    distant.champions[1].x = 25500;
    expect(step(distant).events.some((e) => e.type === 'strike')).toBe(false);
  });
  it('replays every study frame from the complete source and includes shield, defeat and respawn', () => {
    const study = createCombatStudy();
    expect(study.frames).toHaveLength(241);
    expect(study.sourceHash).toBe(hash(study.frames[0]));
    let state = study.frames[0]!;
    for (const expected of study.frames.slice(1)) {
      state = step(state);
      expect(hash(state)).toBe(hash(expected));
    }
    expect(hash(state)).toBe(study.finalHash);
    expect(createCombatStudy().finalHash).toBe(study.finalHash);
    expect(study.strikes.some((e) => e.shielded)).toBe(true);
    expect(study.frames.some((w) => w.events.some((e) => e.type === 'defeat'))).toBe(true);
    expect(
      study.frames.some(
        (w, i) =>
          i > 0 &&
          w.champions.some(
            (c, j) =>
              study.frames[i - 1]!.champions[j]!.health === 0 &&
              c.health > 0 &&
              c.x === c.home.x &&
              c.y === c.home.y,
          ),
      ),
    ).toBe(true);
    for (const hit of study.strikes) {
      const at = study.frames[hit.tick]!;
      expect(at.events).toContainEqual(hit);
      expect(Math.abs(hit.from.x - hit.to.x) + Math.abs(hit.from.y - hit.to.y)).toBeLessThanOrEqual(
        1000,
      );
    }
  });
  it('rejects checkpoints from the earlier event-trace engine version', () => {
    const source = snapshot(createWorld());
    const old = structuredClone(source) as unknown as Snapshot & {
      state: { engineVersion: string };
    };
    (old.state as { engineVersion: string }).engineVersion = 'core-run/0.1.0';
    expect(() => restore(old as Snapshot)).toThrow('version');
  });
});
