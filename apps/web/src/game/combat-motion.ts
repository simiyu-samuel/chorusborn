import type { ActorId, CombatStudy, StrikeEvent } from '@chorusborn/contracts';
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
  const pose: FighterPose = {
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
