import { useId } from 'react';
import type { Champion, World } from '@chorusborn/contracts';

const project = (x: number, y: number, height = 0) => ({
  x: 440 + (x - y) * 19,
  y: 68 + (x + y) * 10 - height,
});
const points = (items: { x: number; y: number }[]) => items.map((p) => `${p.x},${p.y}`).join(' ');
const tile = (x: number, y: number, height = 0) => [
  project(x, y, height),
  project(x + 1, y, height),
  project(x + 1, y + 1, height),
  project(x, y + 1, height),
];

function ChampionGlyph({ color }: { color: string }) {
  return (
    <>
      <ellipse cx="60" cy="104" rx="32" ry="8" fill="#000" opacity=".25" />
      <path d="M29 74 39 96 60 104 81 96 91 74 60 64Z" fill={color} opacity=".55" />
      <path d="m32 44 10-18 18-7 18 7 10 18-5 37-23 12-23-12Z" fill={color} />
      <path d="M39 45Q60 34 81 45L79 68Q60 81 41 68Z" fill="#252539" />
      <path d="M48 55h4m16 0h4" stroke="#f8f7ff" strokeWidth="5" strokeLinecap="round" />
      <path d="M56 68h8" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="m32 44-7-12m63 12 7-12" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <path d="m47 89-6 13m32-13 6 13" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <path d="m54 25 6-10 6 10-6 9Z" fill="#e4dbff" />
    </>
  );
}

export function ChampionPortrait({ color = '#b7a0fb' }: { color?: string }) {
  return (
    <svg className="portrait" viewBox="0 0 120 120" aria-hidden="true">
      <ChampionGlyph color={color} />
    </svg>
  );
}

function ChampionSprite({ actor, world }: { actor: Champion; world: World }) {
  const p = project(actor.x / 1000, actor.y / 1000);
  const color = actor.id === 'a' ? '#b9a4ff' : '#f3b878';
  const carrying = world.core.carrier === actor.id;
  return (
    <g
      className="champion-sprite"
      style={{ transform: `translate(${p.x}px, ${p.y}px)`, opacity: actor.health > 0 ? 1 : 0.25 }}
    >
      <ellipse cx="0" cy="3" rx="23" ry="10" fill={color} opacity=".15" />
      <ellipse cx="0" cy="3" rx="17" ry="7" fill="#000" opacity=".45" />
      {actor.shieldUntil > world.tick ? (
        <ellipse
          cx="0"
          cy="-24"
          rx="35"
          ry="43"
          fill="#8ae1f4"
          fillOpacity=".12"
          stroke="#8ae1f4"
          strokeWidth="2"
        />
      ) : null}
      <g transform="translate(-30 -57) scale(.5)">
        <ChampionGlyph color={color} />
      </g>
      <rect x="-22" y="-64" width="44" height="4" rx="2" fill="#11141c" />
      <rect x="-22" y="-64" width={(44 * actor.health) / 100} height="4" rx="2" fill={color} />
      <text
        x="0"
        y="-73"
        textAnchor="middle"
        fill="#f2f2f8"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2"
      >
        {actor.name.toUpperCase()}
      </text>
      {carrying ? (
        <g transform="translate(25 -53)">
          <path d="m0-12 8 12-8 12-8-12Z" fill="#c5f57c" stroke="#e6ffb5" strokeWidth="1.5" />
          <path d="M0-12V12M-8 0H8" stroke="#598331" strokeWidth="1" />
        </g>
      ) : null}
    </g>
  );
}

export function Arena({ world, label = 'Core Run arena' }: { world: World; label?: string }) {
  const prefix = useId().replaceAll(':', '');
  const outline = [project(0, 0), project(32, 0), project(32, 18), project(0, 18)];
  const depth = outline.map((p) => ({ ...p, y: p.y + 20 }));
  const hazardActive = (world.tick + (world.seed % 120)) % 120 < 60;
  return (
    <svg
      className="arena-svg"
      viewBox="0 0 1200 660"
      role="img"
      aria-label={`${label}. Mica ${world.champions[0].score}, Rook ${world.champions[1].score}. ${world.status}.`}
    >
      <defs>
        <pattern id={`${prefix}-grid`} width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M1 0H0V1" fill="none" stroke="#39403e" strokeWidth=".035" />
        </pattern>
        <radialGradient id={`${prefix}-glow`}>
          <stop stopColor="#9dbd81" stopOpacity=".2" />
          <stop offset="1" stopColor="#0d1417" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="600" cy="360" rx="510" ry="290" fill={`url(#${prefix}-glow)`} />
      <polygon points={points(depth)} fill="#0b0e12" stroke="#293331" strokeWidth="2" />
      <polygon points={points(outline)} fill="#202b29" stroke="#465b48" strokeWidth="1.5" />
      <g transform="matrix(19 10 -19 10 440 68)">
        <rect width="32" height="18" fill={`url(#${prefix}-grid)`} />
        <path
          d="M2 9H30M16 1V17"
          stroke="#54684c"
          strokeWidth=".07"
          strokeDasharray=".2 .3"
          opacity=".4"
        />
        <rect
          x="1"
          y="7"
          width="3"
          height="5"
          rx=".25"
          fill="#9075dc"
          fillOpacity=".14"
          stroke="#ae97ef"
          strokeWidth=".07"
        />
        <rect
          x="28"
          y="7"
          width="3"
          height="5"
          rx=".25"
          fill="#d59c58"
          fillOpacity=".14"
          stroke="#d1a16b"
          strokeWidth=".07"
        />
        {world.arena.hazards.map((p) => (
          <g key={`${p.x}-${p.y}`}>
            <rect
              x={p.x + 0.1}
              y={p.y + 0.1}
              width=".8"
              height=".8"
              rx=".08"
              fill={hazardActive ? '#bd744c' : '#655442'}
              opacity={hazardActive ? 0.65 : 0.35}
            />
            <path
              d={`m${p.x + 0.25} ${p.y + 0.3} .5 .4m-.5 0 .5-.4`}
              stroke="#e1ad76"
              strokeWidth=".06"
              opacity=".65"
            />
          </g>
        ))}
        <circle cx="16.5" cy="9.5" r="2" fill="none" stroke="#627458" strokeWidth=".06" />
        <circle
          cx="16.5"
          cy="9.5"
          r="1.7"
          fill="none"
          stroke="#627458"
          strokeWidth=".04"
          strokeDasharray=".1 .25"
        />
      </g>
      {world.arena.walls
        .toSorted((a, b) => a.x + a.y - b.x - b.y)
        .map((p) => {
          const top = tile(p.x, p.y, 23),
            bottom = tile(p.x, p.y);
          return (
            <g key={`${p.x}-${p.y}`}>
              <polygon
                points={points([top[1]!, top[2]!, bottom[2]!, bottom[1]!])}
                fill="#26332f"
                stroke="#425246"
                strokeWidth=".5"
              />
              <polygon
                points={points([top[2]!, top[3]!, bottom[3]!, bottom[2]!])}
                fill="#35413a"
                stroke="#425246"
                strokeWidth=".5"
              />
              <polygon points={points(top)} fill="#4a5849" stroke="#6c7c5e" strokeWidth=".8" />
            </g>
          );
        })}
      {world.decoys.map((p, i) => {
        const at = project(p.x / 1000, p.y / 1000);
        return (
          <g
            key={`${p.owner}-${p.expiresAt}-${i}`}
            transform={`translate(${at.x} ${at.y})`}
            opacity=".55"
          >
            <ellipse rx="19" ry="9" fill="none" stroke="#e6ae72" strokeDasharray="3 3" />
            <path
              d="m0-36 14 15-14 15-14-15Z"
              fill="#cda16a"
              fillOpacity=".2"
              stroke="#e6ae72"
              strokeDasharray="3 3"
            />
            <text y="22" textAnchor="middle" fill="#cba674" fontSize="9" letterSpacing="1.5">
              DECOY
            </text>
          </g>
        );
      })}
      {world.core.carrier === null
        ? (() => {
            const p = project(world.core.x / 1000, world.core.y / 1000);
            return (
              <g transform={`translate(${p.x} ${p.y})`}>
                <ellipse rx="17" ry="8" fill="#b8ec79" fillOpacity=".15" />
                <path
                  d="m0-31 10 15-10 15-10-15Z"
                  fill="#c4f07f"
                  stroke="#edffd0"
                  strokeWidth="1.5"
                />
              </g>
            );
          })()
        : null}
      {world.champions
        .toSorted((a, b) => a.x + a.y - b.x - b.y)
        .map((actor) => (
          <ChampionSprite key={actor.id} actor={actor} world={world} />
        ))}
      <text x="110" y="600" fill="#627265" fontSize="10" letterSpacing="2.5">
        CARRIER DILEMMA / SEED {world.seed}
      </text>
      <text x="1090" y="600" textAnchor="end" fill="#627265" fontSize="10" letterSpacing="2.5">
        FIRST TO 3 CAPTURES
      </text>
    </svg>
  );
}
