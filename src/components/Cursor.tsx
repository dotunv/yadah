import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useStore } from '../store'

const WORD: Record<string, string> = { visual: 'look', reading: 'read', interactive: 'touch', button: '', drag: 'drag' }

/**
 * A cursor that says what the thing under it wants from you. Hidden on touch
 * and when the keyboard is in use. Leaves a trail only for people who have
 * shown they enjoy motion.
 */
export function Cursor() {
  const trails = useStore((s) => s.ui.motion.trails)
  const quiet = useStore((s) => s.ui.motion.quiet)
  const [kind, setKind] = useState<string | undefined>()
  const [on, setOn] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const stiff = quiet ? 900 : 380
  const sx = useSpring(x, { stiffness: stiff, damping: quiet ? 60 : 32, mass: 0.5 })
  const sy = useSpring(y, { stiffness: stiff, damping: quiet ? 60 : 32, mass: 0.5 })

  useEffect(() => {
    const fine = matchMedia('(pointer: fine)').matches
    if (!fine) return
    document.body.classList.add('fine-pointer')
    setOn(true)
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      document.body.classList.remove('kbd')
    }
    const over = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.('[data-cursor], button, a') as HTMLElement | null
      setKind(el ? (el.dataset.cursor ?? 'button') : undefined)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow') || e.key === 'Tab') document.body.classList.add('kbd')
    }
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerover', over, { passive: true })
    addEventListener('keydown', key)
    return () => {
      document.body.classList.remove('fine-pointer')
      removeEventListener('pointermove', move)
      removeEventListener('pointerover', over)
      removeEventListener('keydown', key)
    }
  }, [x, y])

  if (!on) return null
  return (
    <>
      {trails && <Tails x={sx} y={sy} />}
      <motion.div className="cursor" data-k={kind} style={{ x: sx, y: sy }}>
        <div className="ring" />
        <div className="word mono">{kind ? WORD[kind] : ''}</div>
      </motion.div>
      <motion.div className="cursor" style={{ x, y }}>
        <div className="dot" />
      </motion.div>
    </>
  )
}

function Tails({ x, y }: { x: ReturnType<typeof useSpring>; y: ReturnType<typeof useSpring> }) {
  const a = useSpring(x, { stiffness: 140, damping: 20 })
  const b = useSpring(a, { stiffness: 120, damping: 20 })
  const c = useSpring(b, { stiffness: 100, damping: 20 })
  const ay = useSpring(y, { stiffness: 140, damping: 20 })
  const by = useSpring(ay, { stiffness: 120, damping: 20 })
  const cy = useSpring(by, { stiffness: 100, damping: 20 })
  return (
    <>
      {[[a, ay, 7, 0.5], [b, by, 5, 0.32], [c, cy, 3.5, 0.18]].map(([px, py, s, o], i) => (
        <motion.div key={i} className="cursor" style={{ x: px as never, y: py as never }}>
          <div className="tail" style={{ width: s as number, height: s as number, opacity: o as number }} />
        </motion.div>
      ))}
    </>
  )
}
