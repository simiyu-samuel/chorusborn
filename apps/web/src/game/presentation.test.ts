import { describe, expect, it } from 'vitest';
import { createWorld, hash } from '@chorusborn/sim';
import {
  actorPosition,
  canInterpolate,
  eventKey,
  newSoundEvents,
  recentEvents,
  visibleLesson,
} from './presentation.js';

describe('read-only game presentation', () => {
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
