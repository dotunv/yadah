import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { insightsOf } from '../engine/insights'
import { useStore } from '../store'
import { Portrait } from './Portrait'

const Words = ({ text, delay = 0, step = 0.07 }: { text: string; delay?: number; step?: number }) => (
  <>
    {text.split(' ').map((w, i) => (
      <motion.span
        key={i}
        style={{ display: 'inline-block', marginRight: '0.28em' }}
        initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, delay: delay + i * step, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {w}
      </motion.span>
    ))}
  </>
)

/**
 * The reveal. Says what it learned, one sentence at a time, while the profile
 * is drawn as a shape. Pressing "Enter your version" opens an iris from the
 * button; underneath it, the room is already rearranging itself.
 */
export function Reveal() {
  const profile = useStore((s) => s.profile)
  const replay = useStore((s) => s.replay)
  const phase = useStore((s) => s.phase)
  const rm = useStore((s) => s.reducedMotion)
  const enterVersion = useStore((s) => s.enterVersion)
  const finish = useStore((s) => s.finishTransform)
  const beginClose = () => useStore.setState({ phase: 'explore' })

  // Freeze what we say at the moment the reveal begins.
  const insights = useMemo(() => insightsOf(profile, 3), []) // eslint-disable-line react-hooks/exhaustive-deps
  const traits = useMemo(() => ({ ...profile.traits }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const gap = rm ? 0.8 : 2.3
  const [step, setStep] = useState(0)
  const total = insights.length + 2 // insights, "so…", button
  useEffect(() => {
    if (step >= total) return
    const id = window.setTimeout(() => setStep((s) => s + 1), (step === 0 ? 2.6 : gap) * 1000)
    return () => clearTimeout(id)
  }, [step, total, gap])

  const lit = step >= 1 && step <= insights.length ? insights[step - 1].traits : step > insights.length ? insights.flatMap((i) => i.traits) : []
  const btn = useRef<HTMLButtonElement>(null)
  const [origin, setOrigin] = useState<[number, number] | null>(null)
  const r = useMotionValue(0)
  const mask = useTransform(r, (v) => {
    const [x, y] = origin ?? [innerWidth / 2, innerHeight / 2]
    return `radial-gradient(circle at ${x}px ${y}px, transparent ${v}px, #000 ${v + 1.5}px)`
  })
  const transforming = phase === 'transform'

  const enter = () => {
    if (transforming) return
    const b = btn.current!.getBoundingClientRect()
    const o: [number, number] = [b.left + b.width / 2, b.top + b.height / 2]
    setOrigin(o)
    enterVersion()
    const far = Math.hypot(Math.max(o[0], innerWidth - o[0]), Math.max(o[1], innerHeight - o[1])) + 40
    animate(r, far, { duration: rm ? 0.6 : 2.6, delay: rm ? 0 : 0.5, ease: [0.65, 0, 0.25, 1], onComplete: finish })
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !transforming) beginClose()
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [transforming])

  return (
    <>
      <motion.div
        className="reveal"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6 } }}
        transition={{ duration: 1.2 }}
      >
        <motion.div className="copy" animate={{ opacity: transforming ? 0 : 1, y: transforming ? -20 : 0 }} transition={{ duration: 0.5 }}>
          <h2>
            <Words text={replay ? 'Here is what I think I know.' : 'I think I understand how you explore.'} delay={0.6} step={0.09} />
          </h2>
          {insights.slice(0, step).map((ins, i) => (
            <motion.p
              key={i}
              className={`insight ${step - 1 === i ? 'lit' : ''}`}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {ins.text}
            </motion.p>
          ))}
          {step > insights.length && (
            <motion.p className="so" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1 }}>
              <Words text={replay ? 'And that is what the interface is built around.' : 'So I’ve changed the interface for you.'} step={0.06} />
            </motion.p>
          )}
          {step >= total && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}>
              <button ref={btn} className="enter" onClick={enter} data-cursor="button" autoFocus>
                {replay ? 'Back to the room' : 'Enter your version'}
                <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor"><path d="M0 5h20M16 1l4 4-4 4" /></svg>
              </button>
              {!replay && (
                <button className="notnow mono" onClick={beginClose} data-cursor="button">
                  not yet
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
        <Portrait traits={traits} lit={lit} draw />
      </motion.div>
      {transforming && origin && !rm && (
        <>
          {[0, 0.18].map((d) => (
            <motion.div
              key={d}
              className="iris"
              style={{ left: origin[0], top: origin[1], width: 20, height: 20, marginLeft: -10, marginTop: -10, borderRadius: '50%', border: '1px solid var(--accent)', inset: 'auto' }}
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 140, opacity: 0 }}
              transition={{ duration: 2.4, delay: 0.5 + d, ease: [0.2, 0.6, 0.2, 1] }}
            />
          ))}
        </>
      )}
    </>
  )
}
