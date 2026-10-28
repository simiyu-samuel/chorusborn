import { describe, expect, it } from 'vitest';
import { createCombatStudy, hash } from '@chorusborn/sim';
import { fighterPose } from './combat-motion.js';

describe('replay choreography', () => {
  it('samples repeatable acrobatic poses without changing authoritative frames or contacts', () => {
    const study = createCombatStudy(),
      before = hash(study);
    const leap = study.strikes.find((e) => e.actorId === 'a' && Math.floor(e.tick / 20) % 3 === 0)!;
    const p = fighterPose(study, 'a', leap.tick - 2);
    expect(p.lift).toBeGreaterThan(0.5);
    expect(p.move).toBe('Aerial kick');
    expect(fighterPose(study, 'a', leap.tick - 2)).toEqual(p);
    expect(hash(study)).toBe(before);
  });
  it('shows reduced-motion poses without spins/flips/leaps and never predicts health', () => {
    const study = createCombatStudy(),
      hit = study.strikes[0]!;
    const before = study.frames[hit.tick - 1]!.champions.find((c) => c.id === hit.targetId)!.health;
    const at = study.frames[hit.tick]!.champions.find((c) => c.id === hit.targetId)!.health;
    expect(before - at).toBe(hit.damage);
    for (let tick = 0; tick <= 240; tick++) {
      const p = fighterPose(study, 'a', tick, true);
      expect([p.lift, p.spin, p.flip]).toEqual([0, 0, 0]);
      expect(
        Object.values(p)
          .filter((v) => typeof v === 'number')
          .every(Number.isFinite),
      ).toBe(true);
    }
  });
});
