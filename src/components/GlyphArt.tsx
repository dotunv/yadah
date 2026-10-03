import type { ReactElement } from 'react'

/** Small abstract marks, one per object. Stroke = currentColor; fills use --accent. */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke' as const }

export const ART: Record<string, () => ReactElement> = {
  tide: () => (
    <g {...S}>
      {[18, 30, 42].map((r, i) => (
        <path key={r} d={`M ${50 - r} 58 Q ${50 - r / 2} ${38 - i * 4} 50 58 T ${50 + r} 58`} opacity={1 - i * 0.2} />
      ))}
      <circle cx="50" cy="36" r="7" fill="var(--accent)" stroke="none" opacity=".9" />
    </g>
  ),
  ember: () => (
    <g>
      <circle cx="50" cy="50" r="34" fill="var(--accent)" opacity=".16" />
      <circle cx="50" cy="50" r="22" fill="var(--accent)" opacity=".35" />
      <circle cx="50" cy="50" r="9" fill="var(--accent)" />
    </g>
  ),
  letters: () => (
    <g {...S}>
      {[28, 38, 48, 58, 68].map((y, i) => (
        <path key={y} d={`M 26 ${y} H ${i === 4 ? 52 : 74}`} />
      ))}
    </g>
  ),
  slowness: () => (
    <g {...S}>
      <path d="M 28 30 V 70" strokeWidth={3} />
      <path d="M 40 36 H 72 M 40 48 H 72 M 40 60 H 62" />
    </g>
  ),
  margins: () => (
    <g {...S}>
      <path d="M 32 24 V 76" />
      <path d="M 44 34 H 72 M 44 46 H 72 M 44 58 H 66" />
      <circle cx="22" cy="40" r="2" fill="var(--accent)" stroke="none" />
    </g>
  ),
  lattice: () => (
    <g fill="currentColor">
      {[0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => <circle key={`${i}${j}`} cx={28 + i * 22} cy={28 + j * 22} r={i === 1 && j === 1 ? 5 : 2.4} fill={i === 1 && j === 1 ? 'var(--accent)' : 'currentColor'} />))}
    </g>
  ),
  instrument: () => (
    <g fill="currentColor">
      {[8, 20, 14, 28, 18].map((h, i) => (
        <rect key={i} x={26 + i * 11} y={62 - h} width="4" height={h + 10} rx="2" opacity={i === 3 ? 1 : 0.7} fill={i === 3 ? 'var(--accent)' : 'currentColor'} />
      ))}
    </g>
  ),
  trace: () => (
    <g {...S}>
      <path d="M 14 62 C 30 20, 44 80, 58 40 S 80 30, 88 52" stroke="var(--accent)" strokeWidth={1.6} />
      <circle cx="88" cy="52" r="3" fill="var(--accent)" stroke="none" />
    </g>
  ),
  mirror: () => (
    <g {...S}>
      <ellipse cx="50" cy="50" rx="34" ry="20" />
      <circle cx="50" cy="50" r="9" fill="var(--accent)" stroke="none" />
    </g>
  ),
}
