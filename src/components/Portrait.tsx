import { motion } from 'framer-motion'
import { TRAIT_LABEL } from '../engine/insights'
import { TRAITS, type Traits } from '../engine/types'

/**
 * The profile drawn as a shape rather than reported as numbers: one spoke per
 * trait, its length the trait's value. A portrait, not a chart.
 */
export function Portrait({ traits, lit, draw = true }: { traits: Traits; lit: string[]; draw?: boolean }) {
  const n = TRAITS.length
  const pt = (i: number, r: number) => {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180)
    return [Math.cos(a) * r, Math.sin(a) * r] as const
  }
  const R = (v: number) => 26 + v * 100
  const pts = TRAITS.map((k, i) => pt(i, R(traits[k])))
  // smooth closed curve through the tips
  const path = pts
    .map((p, i) => {
      const p0 = pts[(i - 1 + n) % n]
      const p1 = p
      const p2 = pts[(i + 1) % n]
      const p3 = pts[(i + 2) % n]
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
      return `${i === 0 ? `M ${p1[0]} ${p1[1]} ` : ''}C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`
    })
    .join(' ')

  return (
    <div className="portrait">
      <svg viewBox="-170 -170 340 340" aria-hidden>
        <defs>
          <radialGradient id="pg" r="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.04" />
          </radialGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <motion.circle
            key={f}
            r={R(f) }
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={f === 0.5 ? 0.22 : 0.08}
            strokeDasharray={f === 0.5 ? '2 5' : undefined}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: f * 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          />
        ))}
        {TRAITS.map((k, i) => {
          const [x, y] = pt(i, 128)
          const [lx, ly] = pt(i, 148)
          const on = lit.includes(k)
          return (
            <g key={k}>
              <motion.line x1={0} y1={0} x2={x} y2={y} stroke="var(--ink)" strokeOpacity={on ? 0.5 : 0.1} animate={{ strokeOpacity: on ? 0.5 : 0.1 }} />
              <text x={lx} y={ly + 3} className={on ? 'lit' : ''}>{TRAIT_LABEL[k]}</text>
            </g>
          )
        })}
        <motion.path
          d={path}
          fill="url(#pg)"
          stroke="var(--accent)"
          strokeWidth={1.4}
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={draw ? { pathLength: 1, fillOpacity: 1 } : { pathLength: 0, fillOpacity: 0 }}
          transition={{ duration: 3.2, delay: 0.4, ease: [0.3, 0.6, 0.2, 1] }}
        />
        {TRAITS.map((k, i) => {
          const [x, y] = pts[i]
          const on = lit.includes(k)
          return (
            <motion.circle
              key={k}
              cx={x}
              cy={y}
              fill="var(--accent)"
              initial={{ r: 0 }}
              animate={{ r: draw ? (on ? 5.5 : 3) : 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 12, delay: draw ? 1 + i * 0.12 : 0 }}
            />
          )
        })}
      </svg>
    </div>
  )
}
