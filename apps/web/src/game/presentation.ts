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

// Presentation of the pinned core-run/0.1.0 rules; the server determines the result.
export function roundResult(world: World) {
  if (world.status !== 'finished' || world.winner === null) return null;
  const winner =
    world.winner === 'draw' ? null : world.champions.find((c) => c.id === world.winner)!;
  return {
    winner,
    title: winner ? `${winner.name} wins the round` : 'Round drawn',
    reason: world.champions.some((c) => c.score >= 3)
      ? 'Three captures'
      : world.tick >= 1200
        ? 'Time called'
        : 'Round complete',
    seconds: Math.floor(world.tick / 20),
    rows: world.champions.map((actor) => ({
      id: actor.id,
      name: actor.name,
      score: actor.score,
      possession: (world.metrics[actor.id].possessionTicks / 20).toFixed(1),
      damage: world.metrics[actor.id].damageTaken,
      lessonUses: Object.values(world.metrics[actor.id].ruleUses).reduce(
        (sum, count) => sum + count,
        0,
      ),
    })),
  };
}
export function roundPressure(world: World) {
  if (world.status !== 'running') return null;
  const onPoint = world.champions.filter((c) => c.score === 2);
  if (onPoint.length === 2) return 'Both on match point';
  if (onPoint.length === 1) return `Match point · ${onPoint[0]!.name}`;
  return world.tick >= 1000 ? 'Final 10 seconds' : null;
}
export function isNewRoundResult(previous: World | null, next: World) {
  return (
    !!previous &&
    previous.status === 'running' &&
    next.status === 'finished' &&
    next.winner !== null &&
    previous.seed === next.seed &&
    previous.arena.id === next.arena.id &&
    next.tick > previous.tick &&
    next.tick - previous.tick <= 4
  );
}
