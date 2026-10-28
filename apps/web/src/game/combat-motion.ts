import type { ActorId, CombatStudy, StrikeEvent, World } from '@chorusborn/contracts';
export type FighterPose = {
  lift: number;
  lean: number;
  spin: number;
  flip: number;
  leftArm: number;
  rightArm: number;
  leftElbow: number;
  rightElbow: number;
  leftLeg: number;
  rightLeg: number;
  leftKnee: number;
  rightKnee: number;
  recoil: number;
  collapse: number;
  move: string;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const x = clamp(n);
  return x * x * (3 - 2 * x);
};
export function studyStrike(
  study: CombatStudy,
  actor: ActorId,
  tick: number,
): StrikeEvent | undefined {
  return study.strikes
    .filter((e) => e.actorId === actor && tick >= e.tick - 8 && tick <= e.tick + 10)
    .sort((a, b) => Math.abs(a.tick - tick) - Math.abs(b.tick - tick))[0];
}
/** Choreography samples known replay contacts, including windup before a recorded hit.
 * These poses never determine health, invulnerability, hit range or horizontal position. */
export function fighterPose(
  study: CombatStudy,
  actor: ActorId,
  tick: number,
  reduced = false,
): FighterPose {
  const frame = study.frames[Math.max(0, Math.min(study.frames.length - 1, Math.floor(tick)))]!;
  const unit = frame.champions.find((c) => c.id === actor)!;
  const pose = guardPose();
  if (unit.health <= 0) {
    pose.collapse = reduced ? 0.65 : 1;
    pose.move = 'Tagged out · respawning';
    return pose;
  }
  const incoming = study.strikes.findLast(
    (e) => e.targetId === actor && tick >= e.tick && tick - e.tick < 8,
  );
  if (incoming) {
    pose.recoil = (1 - (tick - incoming.tick) / 8) * 0.35;
  }
  const strike = studyStrike(study, actor, tick);
  if (strike && !reduced) {
    const q = clamp((tick - strike.tick + 8) / 18),
      attack = Math.sin(Math.PI * clamp((q - 0.12) / 0.7));
    const variation = (Math.floor(strike.tick / 20) + (actor === 'b' ? 1 : 0)) % 3;
    pose.move =
      variation === 0 ? 'Aerial kick' : variation === 1 ? 'Spinning strike' : 'Somersault strike';
    pose.lift = Math.sin(Math.PI * clamp((q - 0.08) / 0.82)) * (actor === 'a' ? 0.9 : 0.6);
    pose.lean = -0.18 * attack;
    pose.leftArm = -1.3 + 0.5 * attack;
    pose.rightArm = -1.7;
    pose.leftElbow = -1;
    pose.rightElbow = -0.35;
    pose.rightLeg = -1.9 * attack;
    pose.rightKnee = 0.25 + 0.6 * (1 - attack);
    pose.leftLeg = 0.7 * attack;
    pose.leftKnee = 1.2 * attack;
    if (variation === 1) pose.spin = Math.PI * 2 * smooth((q - 0.1) / 0.35);
    if (variation === 2) {
      pose.flip = -Math.PI * 2 * smooth((q - 0.1) / 0.7);
      pose.leftKnee = 1.8 * attack;
    }
  } else if (strike) pose.move = 'Tag contact';
  else if (unit.shieldUntil > tick) {
    pose.move = 'Shield guard';
    pose.leftArm = -1.4;
    pose.rightArm = -1.5;
  }
  return pose;
}

function guardPose(): FighterPose {
  return {
    lift: 0,
    lean: 0,
    spin: 0,
    flip: 0,
    leftArm: -0.6,
    rightArm: -0.9,
    leftElbow: -1.35,
    rightElbow: -1.1,
    leftLeg: 0.16,
    rightLeg: -0.22,
    leftKnee: 0.25,
    rightKnee: 0.4,
    recoil: 0,
    collapse: 0,
    move: 'Guard stance',
  };
}

/** A capture resets both actors, so earlier contact choreography no longer applies. */
export function matchStrike(world: World, actor: ActorId): StrikeEvent | undefined {
  const reset =
    world.events.findLast((e) => e.type === 'capture' && e.tick <= world.tick)?.tick ?? -1;
  return world.events.findLast(
    (e): e is StrikeEvent =>
      e.type === 'strike' &&
      e.actorId === actor &&
      e.tick > reset &&
      e.tick <= world.tick &&
      world.tick - e.tick < 12,
  );
}

/** Reactive live/replay presentation. Only contacts already present in this World
 * may trigger an attack; no future-frame lookahead, extra damage or invulnerability. */
export function liveFighterPose(
  world: World,
  actor: ActorId,
  presentationTick = world.tick,
  moving = 0,
  reduced = false,
): FighterPose {
  const unit = world.champions.find((c) => c.id === actor)!;
  // Between packets, advance at most the next publication interval. Paused and
  // finished frames (including arbitrary replay seeks) are sampled exactly.
  const tick =
    world.status === 'running'
      ? Math.max(world.tick, Math.min(world.tick + 2, presentationTick))
      : world.tick;
  const pose = guardPose();
  if (unit.health <= 0) {
    pose.collapse = reduced ? 0.65 : 1;
    pose.move = 'Tagged out · respawning';
    return pose;
  }
  if (world.status === 'finished' && world.winner === actor) {
    pose.leftArm = -2.8;
    pose.rightArm = -2.8;
    pose.leftElbow = pose.rightElbow = -0.2;
    pose.move = 'Round winner';
    return pose;
  }
  const reset =
    world.events.findLast((e) => e.type === 'capture' && e.tick <= world.tick)?.tick ?? -1;
  const hitAge = tick - unit.lastDamageAt;
  if (unit.lastDamageAt > reset && hitAge >= 0 && hitAge < 8) pose.recoil = (1 - hitAge / 8) * 0.35;
  const strike = matchStrike(world, actor);
  if (strike) {
    pose.move = reduced
      ? 'Tag contact'
      : ['Aerial kick', 'Spinning strike', 'Somersault recovery'][
          (Math.floor(strike.tick / 20) + (actor === 'b' ? 1 : 0)) % 3
        ]!;
    if (reduced) return pose;
    const progress = clamp((tick - strike.tick) / 12),
      recovery = 1 - smooth(progress),
      variation = (Math.floor(strike.tick / 20) + (actor === 'b' ? 1 : 0)) % 3;
    pose.lift = Math.sin(Math.PI * progress) * 0.75;
    pose.rightLeg = -1.85 * recovery;
    pose.rightKnee = 0.25 + Math.sin(Math.PI * progress) * 0.6;
    pose.leftLeg = 0.55 * recovery;
    pose.leftKnee = 1.1 * recovery;
    pose.rightArm = -1.6;
    pose.leftArm = -1.1;
    pose.rightElbow = -0.4;
    pose.lean = -0.15 * recovery;
    if (variation === 1) pose.spin = Math.PI * 2 * smooth(progress);
    if (variation === 2) {
      pose.flip = -Math.PI * 2 * smooth(progress);
      pose.leftKnee = 1.7 * Math.sin(Math.PI * progress);
    }
    return pose;
  }
  if (world.core.carrier === actor) {
    pose.leftArm = pose.rightArm = -1.1;
    pose.leftElbow = pose.rightElbow = -0.5;
    pose.move = 'Carrying core';
  } else if (unit.shieldUntil > tick) {
    pose.leftArm = pose.rightArm = -1.4;
    pose.move = 'Shield guard';
  } else if (moving > 0.05) pose.move = 'Running';
  if (!reduced && moving > 0.05) {
    const stride = Math.sin(tick * 0.7) * Math.min(1, moving);
    pose.leftLeg = stride * 0.75;
    pose.rightLeg = -stride * 0.75;
    pose.leftKnee = 0.25 + Math.max(0, -stride) * 0.8;
    pose.rightKnee = 0.25 + Math.max(0, stride) * 0.8;
    pose.lean = 0.15;
    pose.lift = Math.abs(stride) * 0.06;
    if (world.core.carrier !== actor && unit.shieldUntil <= tick) {
      pose.leftArm = -0.4 - stride * 0.7;
      pose.rightArm = -0.4 + stride * 0.7;
    }
  }
  return pose;
}
