import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { Ambient } from './components/Ambient'
import { Cursor } from './components/Cursor'
import { Debug } from './components/Debug'
import { Field } from './components/Field'
import { Beacon, ChangeToast, FirstHint, Welcome } from './components/Overlays'
import { Reveal } from './components/Reveal'
import { Stage } from './components/Stage'
import { useStore } from './store'

export default function App() {
  const init = useStore((s) => s.init)
  const phase = useStore((s) => s.phase)
  const open = useStore((s) => s.open)
  const ui = useStore((s) => s.ui)
  const debug = useStore((s) => s.debug)
  const toggleDebug = useStore((s) => s.toggleDebug)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === '`' && toggleDebug()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [toggleDebug])

  // InterfaceState → CSS. Components never compute these.
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--hue', String(Math.round(ui.hue)))
    r.setProperty('--chroma', ui.chroma.toFixed(3))
    r.setProperty('--dur', String(ui.motion.duration))
    r.setProperty('--type-size', `${ui.type.size}px`)
    r.setProperty('--type-leading', String(ui.type.leading))
    r.setProperty('--type-measure', `${ui.type.measure}ch`)
  }, [ui])

  return (
    <div className="app" data-phase={phase} data-mode={ui.mode}>
      <Ambient />
      {phase !== 'boot' && <Field />}
      <AnimatePresence>{open && <Stage key={open.id} open={open} />}</AnimatePresence>
      <Beacon />
      <FirstHint />
      <ChangeToast />
      <AnimatePresence>{(phase === 'reveal' || phase === 'transform') && <Reveal key="reveal" />}</AnimatePresence>
      <Welcome />
      {debug && <Debug />}
      <Cursor />
      <div className="grain" aria-hidden />
    </div>
  )
}
