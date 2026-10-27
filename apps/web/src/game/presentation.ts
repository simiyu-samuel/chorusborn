import type { ActorId, Champion, GameEvent, World } from '@chorusborn/contracts';

/** Presentation may interpolate observations, never predict a route or mutate a World. */
export function canInterpolate(previous: World, next: World) {
  return (
    previous.seed === next.seed &&
    previous.arena.id === next.arena.id &&
    next.tick > previous.tick &&
    next.tick - previous.tick <= 4 &&
    next.champions.every((actor, i) => {
      const before = previous.champions[i]!;
      return (
        actor.health > 0 &&
        before.health > 0 &&
        actor.score === before.score &&
        actor.respawnAt === before.respawnAt &&
        Math.abs(actor.x - before.x) + Math.abs(actor.y - before.y) <= 2000
      );
    })
  );
}
export function actorPosition(previous: Champion, next: Champion, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return {
    x: (previous.x + (next.x - previous.x) * t) / 1000,
    z: (previous.y + (next.y - previous.y) * t) / 1000,
  };
}
export function recentEvents(world: World, duration = 20): GameEvent[] {
  return world.events.filter(
    (event) => event.tick <= world.tick && world.tick - event.tick < duration,
  );
}
/** Only consecutive received updates can trigger sound. Mounts, seeks and gaps are silent. */
export function newSoundEvents(previous: World | null, next: World): GameEvent[] {
  if (
    !previous ||
    previous.seed !== next.seed ||
    previous.arena.id !== next.arena.id ||
    next.tick <= previous.tick ||
    next.tick - previous.tick > 4 ||
    next.status !== 'running'
  )
    return [];
  return next.events.filter((event) => event.tick > previous.tick && event.tick <= next.tick);
}
export function eventKey(event: GameEvent) {
  return `${event.tick}:${event.actorId}:${event.type}`;
}
export function visibleLesson(world: World) {
  return world.decisions.findLast(
    (decision) =>
      decision.actorId === 'a' &&
      decision.ruleId &&
      (decision.executed || decision.abilityExecuted) &&
      decision.tick <= world.tick &&
      world.tick - decision.tick <= 40,
  );
}
export function intentCue(world: World, actorId: ActorId) {
  const actor = world.champions.find((item) => item.id === actorId)!;
  if (actor.health <= 0) return 'Respawning';
  if (world.core.carrier === actorId) return 'Carrying core';
  return actor.intent === 'Ready' ? 'Ready to run' : actor.intent;
}
