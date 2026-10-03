import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { META } from '../engine/catalog'
import { useRevealReady, useStore } from '../store'

/** Returning visitors are greeted by what the page remembers. */
export function Welcome() {
  const phase = useStore((s) => s.phase)
  const fav = useStore((s) => s.profile.favorite)
  const revealed = useStore((s) => s.profile.revealed)
  const finish = useStore((s) => s.finishWelcome)
  const rm = useStore((s) => s.reducedMotion)

  useEffect(() => {
    if (phase !== 'welcome') return
    const id = window.setTimeout(finish, rm ? 1800 : 5200)
    const skip = () => finish()
    const t = window.setTimeout(() => {
      addEventListener('keydown', skip, { once: true })
      addEventListener('pointerdown', skip, { once: true })
    }, 900)
    return () => {
      clearTimeout(id)
      clearTimeout(t)
      removeEventListener('keydown', skip)
      removeEventListener('pointerdown', skip)
    }
  }, [phase, finish, rm])

  return (
    <AnimatePresence>
      {phase === 'welcome' && (
        <motion.div
          className="welcome"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.2, ease: 'easeInOut' } }}
        >
          <div>
            <motion.h2 initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}>
              Welcome back.
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6, delay: 1.5 }}>
              I remember how you explored.
            </motion.p>
            <motion.div className="sub mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: 2.8 }}>
              {fav ? `you stayed longest with ${META[fav]?.title.toLowerCase()}` : ''}
              {fav && revealed ? ' · ' : ''}
              {revealed ? 'rebuilding the room around you' : 'picking up where you left off'}
            </motion.div>
          </div>
          <div className="skip mono">press any key</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A quiet note for first-timers; goes away the moment they act. */
export function FirstHint() {
  const phase = useStore((s) => s.phase)
  const returning = useStore((s) => s.returning)
  const opens = useStore((s) => s.session.opens)
  const evidence = useStore((s) => s.profile.evidence)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), 1800)
    return () => clearTimeout(id)
  }, [])
  const visible = show && phase === 'explore' && !returning && opens === 0 && evidence < 1
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="hint mono" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
          <em>I don’t know you yet.</em>
          Go anywhere. There is no menu.
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Appears once there is something honest to say. Never forces it. */
export function Beacon() {
  const ready = useRevealReady()
  const open = useStore((s) => s.open)
  const begin = useStore((s) => s.beginReveal)
  const show = ready && !open
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          className="beacon"
          data-cursor="button"
          onClick={() => begin(false)}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 1.4, delay: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <span className="orb" aria-hidden>
            <motion.i animate={{ scale: [1, 2.4], opacity: [0.8, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }} />
            <b />
          </span>
          <span className="serif">I think I understand you.</span>
          <span className="mono">listen</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/** After the transformation: say, briefly, what is different. */
export function ChangeToast() {
  const phase = useStore((s) => s.phase)
  const changes = useStore((s) => s.changes)
  const open = useStore((s) => s.open)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (phase !== 'explore' || !changes.length) return
    setOn(true)
    const id = window.setTimeout(() => setOn(false), 11000)
    return () => clearTimeout(id)
  }, [phase, changes])
  return (
    <AnimatePresence>
      {on && !open && (
        <motion.div className="toast mono" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
          <span className="serif">This is your version.</span>
          <ul>
            {changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <span>press ` any time to see how it works</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
