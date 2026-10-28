import { describe, expect, it } from 'vitest';
import { createCombatStudy, hash } from '@chorusborn/sim';
import { fighterPose, liveFighterPose } from './combat-motion.js';

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

describe('confirmed match choreography', () => {
  it('requires an already observed strike, rejects future events and never changes game state', () => {
    const study = createCombatStudy();
    const beforeContact = structuredClone(study.frames[19]!);
    beforeContact.events.push(study.strikes[0]!);
    expect(liveFighterPose(beforeContact, 'a').move).toBe('Guard stance');
    const contact = study.frames[24]!,
      original = hash(contact);
    const p = liveFighterPose(contact, 'a');
    expect(p.move).toBe('Spinning strike');
    expect(p.lift).toBeGreaterThan(0.5);
    expect(liveFighterPose(contact, 'a')).toEqual(p);
    expect(hash(contact)).toBe(original);
  });
  it('samples paused poses exactly, bounds packet extrapolation and suppresses acrobatics for reduced motion', () => {
    const source = createCombatStudy().frames[24]!;
    expect(liveFighterPose(source, 'a', 100)).toEqual(liveFighterPose(source, 'a', 26));
    const paused = { ...source, status: 'paused' as const };
    expect(liveFighterPose(paused, 'a', 100)).toEqual(liveFighterPose(paused, 'a', 24));
    expect(liveFighterPose(paused, 'a').spin).toBeGreaterThan(0);
    const reduced = liveFighterPose(source, 'a', 24, 1, true);
    expect([reduced.lift, reduced.spin, reduced.flip]).toEqual([0, 0, 0]);
    expect(reduced.move).toBe('Tag contact');
    expect(liveFighterPose(createCombatStudy().frames[0]!, 'a').move).toBe('Guard stance');
  });
  it('clears pre-reset attack and recoil poses after a capture without treating hazards as attacks', () => {
    const world = createCombatStudy().frames[24]!;
    world.events.push({ tick: 24, type: 'capture', actorId: 'a', text: 'Capture reset' });
    world.champions.forEach((actor) => {
      actor.health = 100;
      actor.shieldUntil = world.tick;
    });
    expect(liveFighterPose(world, 'a').move).toBe('Guard stance');
    expect(liveFighterPose(world, 'a').recoil).toBe(0);
    world.tick = 26;
    world.champions[0].lastDamageAt = 26;
    const hazardReaction = liveFighterPose(world, 'a');
    expect(hazardReaction.recoil).toBeGreaterThan(0);
    expect(hazardReaction.move).toBe('Guard stance');
  });
  it('keeps carrying, shields, damage, defeat and victory tied to the supplied world', () => {
    const world = createCombatStudy().frames[35]!;
    world.events = [];
    world.champions[0].lastDamageAt = world.tick;
    const damaged = liveFighterPose(world, 'a');
    expect(damaged.recoil).toBeGreaterThan(0);
    expect(damaged.move).toBe('Guard stance');
    world.champions[1].shieldUntil = world.tick + 10;
    expect(liveFighterPose(world, 'b').move).toBe('Shield guard');
    world.core.carrier = 'a';
    expect(liveFighterPose(world, 'a', world.tick, 1).move).toBe('Carrying core');
    world.champions[0].health = 0;
    expect(liveFighterPose(world, 'a').collapse).toBe(1);
    world.champions[0].health = 100;
    world.status = 'finished';
    world.winner = 'a';
    expect(liveFighterPose(world, 'a').move).toBe('Round winner');
    expect(liveFighterPose(world, 'b').move).not.toBe('Round winner');
  });
});
