import { useId } from 'react';
export function ChampionPortrait({
  color = '#b7a0fb',
  team = 'a',
}: {
  color?: string;
  team?: 'a' | 'b';
}) {
  const id = useId().replaceAll(':', ''),
    mica = team === 'a';
  return (
    <svg className="portrait" viewBox="0 0 160 170" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={mica ? '#624582' : '#9d6935'} />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff1ce" />
          <stop offset="1" stopColor="#d9c8a2" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="155" rx="53" ry="9" fill="#000" opacity=".2" />
      {mica ? (
        <path d="m82 98 57 27-21 5 18 16-47-12Z" fill="#934b7b" />
      ) : (
        <path d="m35 80-18 39 19 21 43 2 45-9 17-31-20-28Z" fill="#997345" />
      )}
      <path
        d="M47 102Q35 125 44 145L64 147 79 134 98 147 122 142Q131 116 112 101Z"
        fill={`url(#${id}-body)`}
        stroke={mica ? '#473452' : '#79552f'}
        strokeWidth="3"
      />
      <path d="M62 111Q80 100 101 111L96 136 68 136Z" fill="#e3d0a4" />
      {mica ? (
        <>
          <path
            d="M40 66 20 10 49 22 65 53 96 48 125 16 139 10 123 73Z"
            fill={`url(#${id}-body)`}
            stroke="#594273"
            strokeWidth="3"
          />
          <path d="m38 45-9-26 18 12 10 20m48-2 23-25-13 34" fill="#d3c0ec" />
        </>
      ) : (
        <>
          <path
            d="m29 77-10-30 27 4 17 16 33-4 25-23 22 5-12 34Z"
            fill="#e6bf78"
            stroke="#8d672e"
            strokeWidth="3"
          />
          <path d="m30 79 13-34 35-14 36 11 19 40Z" fill={`url(#${id}-body)`} />
        </>
      )}
      <path
        d="M40 63Q78 35 121 62L131 85Q126 114 83 123 43 116 29 90Z"
        fill={`url(#${id}-body)`}
        stroke={mica ? '#58416a' : '#906736'}
        strokeWidth="3"
      />
      <path
        d="M49 67 69 72 81 60 94 72 115 67 121 94Q103 114 82 115 58 110 40 94Z"
        fill={`url(#${id}-face)`}
      />
      <ellipse cx="59" cy="88" rx="10" ry="14" fill="#2b2133" />
      <ellipse cx="104" cy="88" rx="10" ry="14" fill="#2b2133" />
      <ellipse cx="61" cy="91" rx="6" ry="9" fill={mica ? '#795294' : '#9c6328'} />
      <ellipse cx="102" cy="91" rx="6" ry="9" fill={mica ? '#795294' : '#9c6328'} />
      <circle cx="56" cy="83" r="3.3" fill="#fff" />
      <circle cx="101" cy="83" r="3.3" fill="#fff" />
      {!mica ? (
        <path d="m47 72 25 6m20 0 25-6" stroke="#8d612d" strokeWidth="6" strokeLinecap="round" />
      ) : null}
      <path
        d="m77 99 5 3 5-3m-12 8q8 7 16-1"
        fill="none"
        stroke="#69434b"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="m81 50 5 7-5 7-5-7Z" fill={mica ? '#e5c2fa' : '#f5dd92'} />
      <path
        d="m41 114-14 14 9 13 16-8m67-21 15 15-8 13-15-8"
        fill={color}
        stroke={mica ? '#58416a' : '#906736'}
        strokeWidth="3"
      />
      <path
        d="m46 144-7 10 23 1 5-9m29-1 6 10 22-3-8-10"
        fill={mica ? '#8f6caf' : '#b58b4c'}
        stroke={mica ? '#58416a' : '#906736'}
        strokeWidth="3"
      />
      {mica ? <path d="m47 116 32 9 37-13-5 13-30 10-32-10Z" fill="#92486f" /> : null}
    </svg>
  );
}
