import { describe, expect, it } from 'vitest';
import { createWorld, hash } from '@chorusborn/sim';
import {
  coreContested,
  actorPosition,
  canInterpolate,
  eventKey,
  newSoundEvents,
  recentEvents,
  visibleLesson,
  roundResult,
  roundPressure,
  isNewRoundResult,
} from './presentation.js';

describe('read-only game presentation', () => {
  it('labels only an equal, living, unheld claim as contested without changing state', () => {
    const world = createWorld();
    world.core = { x: 16000, y: 9500, carrier: null, unheldSince: 0 };
    world.champions[0].x = 15500;
    world.champions[1].x = 16500;
    world.champions[1].y = 9500;
    const before = hash(world);
    expect(coreContested(world)).toBe(true);
    expect(hash(world)).toBe(before);
    world.champions[1].x = 16250;
    expect(coreContested(world)).toBe(false);
    world.champions[1].x = 16500;
    world.champions[1].health = 0;
    expect(coreContested(world)).toBe(false);
    world.champions[1].health = 100;
    world.core.carrier = 'a';
    expect(coreContested(world)).toBe(false);
  });
  it('interpolates only between received positions, clamps progress and preserves authoritative input', () => {
    const world = createWorld(),
      before = structuredClone(world.champions[0]),
      after = { ...before, x: before.x + 1000 };
    const original = hash(world);
    expect(actorPosition(before, after, 0.5).x).toBe((before.x + 500) / 1000);
    expect(actorPosition(before, after, -3).x).toBe(before.x / 1000);
    expect(actorPosition(before, after, 3).x).toBe(after.x / 1000);
    expect(hash(world)).toBe(original);
  });
  it('snaps seeks, packet gaps, changed worlds, respawns and capture resets instead of inventing travel', () => {
    const before = createWorld(),
      after = structuredClone(before);
    after.tick = 2;
    after.champions[0].x += 1000;
    expect(canInterpolate(before, after)).toBe(true);
    for (const change of [
      (w: typeof after) => {
        w.tick = 0;
      },
      (w: typeof after) => {
        w.tick = 12;
      },
      (w: typeof after) => {
        w.seed++;
      },
      (w: typeof after) => {
        w.champions[0].health = 0;
      },
      (w: typeof after) => {
        w.champions[0].score++;
      },
      (w: typeof after) => {
        w.champions[0].x += 5000;
      },
      (w: typeof after) => {
        w.champions[0].respawnAt = 40;
      },
    ]) {
      const copy = structuredClone(after);
      change(copy);
      expect(canInterpolate(before, copy)).toBe(false);
    }
  });
  it('never sounds old events on mount, duplicate packets, backward seeks, gaps or paused state', () => {
    const before = createWorld(),
      next = structuredClone(before);
    before.tick = 8;
    next.tick = 10;
    next.status = 'running';
    next.events = [
      { tick: 2, type: 'pickup', actorId: 'a', text: 'Old pickup' },
      { tick: 10, type: 'capture', actorId: 'a', text: 'Capture' },
    ];
    expect(newSoundEvents(null, next)).toEqual([]);
    expect(newSoundEvents(before, next).map(eventKey)).toEqual(['10:a:capture']);
    expect(newSoundEvents(next, next)).toEqual([]);
    expect(newSoundEvents(next, before)).toEqual([]);
    expect(newSoundEvents({ ...before, tick: 1 }, next)).toEqual([]);
    expect(newSoundEvents(before, { ...next, status: 'paused' })).toEqual([]);
  });
  it('can credit either community from actual execution while keeping the fixture default on side A', () => {
    const world = createWorld();
    world.tick = 12;
    world.decisions = [
      {
        tick: 12,
        actorId: 'b',
        ruleId: 'peer-rule',
        label: 'Return',
        author: 'Other community',
        goal: 'return_home',
        executed: true,
        abilityExecuted: false,
      },
    ];
    expect(visibleLesson(world)).toBeUndefined();
    expect(visibleLesson(world, 'both')?.author).toBe('Other community');
    world.decisions[0]!.executed = false;
    expect(visibleLesson(world, 'both')).toBeUndefined();
  });
  it('bounds effects to real event ticks and credits only actual executed viewer rules', () => {
    const world = createWorld();
    world.tick = 30;
    world.events = [
      { tick: 0, type: 'capture', actorId: 'a', text: 'Old' },
      { tick: 29, type: 'shield', actorId: 'b', text: 'Current' },
      { tick: 31, type: 'pickup', actorId: 'a', text: 'Future' },
    ];
    expect(recentEvents(world)).toHaveLength(1);
    world.decisions = [
      {
        tick: 30,
        actorId: 'a',
        ruleId: 'r',
        label: 'Return',
        author: 'Viewer',
        goal: 'return_home',
        executed: false,
        abilityExecuted: false,
      },
    ];
    expect(visibleLesson(world)).toBeUndefined();
    world.decisions[0]!.abilityExecuted = true;
    expect(visibleLesson(world)?.author).toBe('Viewer');
    world.tick = 80;
    expect(visibleLesson(world)).toBeUndefined();
  });
});

describe('round presentation', () => {
  it('uses the authoritative winner and cumulative metrics, including records no longer in the short ledger', () => {
    const world = createWorld();
    world.status = 'finished';
    world.winner = 'b';
    world.tick = 1200;
    world.champions[1].score = 2;
    world.metrics.a = {
      damageTaken: 310,
      distance: 29000,
      possessionTicks: 147,
      ruleUses: { olderRule: 25, recentRule: 3 },
    };
    const before = hash(world),
      result = roundResult(world)!;
    expect(result.winner?.name).toBe('Rook');
    expect(result.reason).toBe('Time called');
    expect(result.seconds).toBe(60);
    expect(result.rows[0]).toMatchObject({ possession: '7.3', damage: 310, lessonUses: 28 });
    expect(hash(world)).toBe(before);
    world.winner = 'draw';
    world.champions[1].score = 0;
    expect(roundResult(world)).toMatchObject({ winner: null, title: 'Round drawn' });
    world.winner = 'a';
    world.champions[0].score = 3;
    world.tick = 540;
    expect(roundResult(world)?.reason).toBe('Three captures');
    world.status = 'paused';
    expect(roundResult(world)).toBeNull();
    world.status = 'finished';
    world.winner = null;
    expect(roundResult(world)).toBeNull();
  });
  it('shows match pressure only in running rounds and never invents an extra tiebreaker', () => {
    const world = createWorld();
    world.champions[0].score = 2;
    expect(roundPressure(world)).toBeNull();
    world.status = 'running';
    expect(roundPressure(world)).toBe('Match point · Mica');
    world.champions[1].score = 2;
    expect(roundPressure(world)).toBe('Both on match point');
    world.champions.forEach((c) => (c.score = 0));
    world.tick = 1000;
    expect(roundPressure(world)).toBe('Final 10 seconds');
  });
  it('sounds a new result once, never on mount, duplicate, replay seek or reconnect gap', () => {
    const previous = createWorld();
    previous.tick = 1198;
    previous.status = 'running';
    const final = structuredClone(previous);
    final.tick = 1200;
    final.status = 'finished';
    final.winner = 'draw';
    expect(isNewRoundResult(previous, final)).toBe(true);
    expect(isNewRoundResult(null, final)).toBe(false);
    expect(isNewRoundResult(final, final)).toBe(false);
    expect(isNewRoundResult({ ...previous, status: 'paused' }, final)).toBe(false);
    expect(isNewRoundResult({ ...previous, tick: 1100 }, final)).toBe(false);
    expect(isNewRoundResult({ ...previous, seed: 43 }, final)).toBe(false);
  });
});
