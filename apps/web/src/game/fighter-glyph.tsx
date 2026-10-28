import type { ActorId } from '@chorusborn/contracts';
import type { FighterPose } from './combat-motion.js';

/** Original articulated SVG companion to the 3D rig, with the same sampled pose. */
export function FighterGlyph({ pose: p, team }: { pose: FighterPose; team: ActorId }) {
  const color = team === 'a' ? '#b49ae9' : '#edb65e',
    dark = team === 'a' ? '#473a61' : '#5d452a';
  const point = (angle: number, length: number) => [
    Math.sin(-angle) * length,
    Math.cos(angle) * length,
  ];
  const limb = (x: number, y: number, upper: number, lower: number) => {
    const a = point(upper, 27),
      b = point(upper + lower, 27);
    return `${x},${y} ${x + a[0]!},${y + a[1]!} ${x + a[0]! + b[0]!},${y + a[1]! + b[1]!}`;
  };
  return (
    <g transform={`translate(0 ${-p.lift * 52})`} strokeLinecap="round" strokeLinejoin="round">
      <g
        transform={`translate(0 -59) rotate(${p.collapse * 80 + ((p.flip + p.lean + p.recoil) * 180) / Math.PI}) scale(${Math.cos(p.spin)} 1) translate(0 59)`}
      >
        {team === 'a' ? (
          <path d="m-6-111-20 40 15-9 12-29" fill="#a35382" />
        ) : (
          <path d="m-13-113-10 39 27-5 7-27Z" fill="#997445" />
        )}
        <path d="M0-113V-59" stroke={dark} strokeWidth="14" />
        <path d="M0-105V-88" stroke={color} strokeWidth="6" />
        <g fill="none" stroke={color} strokeWidth="9">
          <polyline points={limb(-6, -107, p.leftArm, p.leftElbow)} />
          <polyline points={limb(6, -107, p.rightArm, p.rightElbow)} />
          <polyline points={limb(-6, -59, p.leftLeg, p.leftKnee)} />
          <polyline points={limb(6, -59, p.rightLeg, p.rightKnee)} />
        </g>
        <circle cy="-139" r="20" fill={dark} />
        {team === 'a' ? (
          <path d="m-10-153-1-22 12 16 9-15 1 22" fill={color} />
        ) : (
          <path d="m-17-141-11-15 15 4m30 11 11-15-15 4" fill="#eed49c" />
        )}
        <ellipse cy="-137" rx="14" ry="11" fill="#f1e6c9" />
        <path d="M-6-139v2m12-2v2" stroke="#252236" strokeWidth="3" />
      </g>
    </g>
  );
}
