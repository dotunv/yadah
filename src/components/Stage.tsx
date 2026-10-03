import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { META } from '../engine/catalog'
import { useStore, type OpenState } from '../store'
import { Ember, Instrument, Lattice, Tide, Trace } from '../views/ArtViews'
import { MirrorView } from '../views/MirrorView'
import { ReadView } from '../views/ReadView'

const CAPTION: Record<string, string> = {
  tide: 'Move through it. Press and hold to turn it against itself.',
  ember: 'It follows you, slowly. Press to feed it.',
  lattice: 'Push the grid. Press to send out a wave.',
  instrument: 'Play with the keys a s d f g h j k — or press the bars.',
  trace: 'Everything your pointer has done since you arrived.',
}
const ART = { tide: Tide, ember: Ember, lattice: Lattice, instrument: Instrument, trace: Trace } as const

/**
 * An opened thing. It grows out of the glyph you pressed as a circle, and
 * closes back into it. Visual and interactive pieces go edge-to-edge for
 * people who look; they sit framed for everyone else.
 */
export function Stage({ open }: { open: OpenState }) {
  const ui = useStore((s) => s.ui)
  const closeObject = useStore((s) => s.closeObject)
  const meta = META[open.id]
  const probe = useRef<() => number>(() => 1)
  const [ox, oy] = open.origin
  const ds = ui.motion.duration

  const close = () => closeObject(probe.current())
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const immersive = ui.mode === 'immersive'
  const Art = (ART as Record<string, () => React.JSX.Element>)[open.id]

  return (
    <motion.div
      className="stage"
      initial={{ clipPath: `circle(0px at ${ox}px ${oy}px)` }}
      animate={{ clipPath: `circle(150vmax at ${ox}px ${oy}px)` }}
      exit={{ clipPath: `circle(0px at ${ox}px ${oy}px)`, transition: { duration: 0.7 * ds, ease: [0.7, 0, 0.2, 1] } }}
      transition={{ duration: 1.05 * ds, ease: [0.7, 0, 0.2, 1] }}
      role="dialog"
      aria-label={meta.title}
    >
      <div className="stage-title mono">
        <b>{meta.hidden ? '··' : String(meta.order).padStart(2, '0')}</b>
        <i style={{ fontFamily: 'var(--serif)', textTransform: 'none', letterSpacing: 0 }}>{meta.title}</i>
      </div>
      <button className="stage-close mono" onClick={close} data-cursor="button" aria-label="Close (Escape)" autoFocus={open.via === 'key'}>
        esc
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 5l14 14M19 5L5 19" /></svg>
      </button>

      {meta.kind === 'reading' && open.id !== 'mirror' && <ReadView id={open.id} probe={probe} />}
      {open.id === 'mirror' && <MirrorView id="mirror" probe={probe} />}
      {Art && (
        <>
          <div className="view-art" data-framed={!immersive}>
            <Art />
          </div>
          <div className={`view-caption mono ${immersive ? 'faint' : ''}`}>
            <p>{CAPTION[open.id]}</p>
          </div>
        </>
      )}
    </motion.div>
  )
}
