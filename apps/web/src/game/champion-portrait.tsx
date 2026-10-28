import type { ActorId } from '@chorusborn/contracts';
import { FighterGlyph } from './fighter-glyph.js';
import type { FighterPose } from './combat-motion.js';
const stance: FighterPose = {
  lift: 0,
  lean: 0,
  spin: 0,
  flip: 0,
  leftArm: -0.5,
  rightArm: -1.1,
  leftElbow: -1.3,
  rightElbow: -1.2,
  leftLeg: 0.2,
  rightLeg: -0.3,
  leftKnee: 0.2,
  rightKnee: 0.4,
  recoil: 0,
  collapse: 0,
  move: 'Guard stance',
};
export function ChampionPortrait({
  color = '#b7a0fb',
  team = 'a',
}: {
  color?: string;
  team?: ActorId;
}) {
  return (
    <svg className="portrait" viewBox="0 0 160 170" aria-hidden="true">
      <circle cx="80" cy="77" r="61" fill={color} opacity=".08" />
      <ellipse cx="80" cy="158" rx="40" ry="7" fill="#000" opacity=".2" />
      <g transform={`translate(80 162) scale(${team === 'a' ? 0.88 : -0.88} .88)`}>
        <FighterGlyph pose={stance} team={team} />
      </g>
    </svg>
  );
}
