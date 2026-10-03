import { useEffect, useRef, useState } from 'react'
import { TEXTS } from '../content/texts'
import { useStore } from '../store'
import type { ViewProps } from './types'

const emph = (s: string) =>
  s.split(/\*(.+?)\*/g).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))

/**
 * Reading view. How much it says, and how densely, is decided by InterfaceState:
 *   textDepth -1 → one huge sentence
 *    0 → short, airy        1 → longer        2 → dense, two columns, marginalia
 */
export function ReadView({ id, probe }: ViewProps) {
  const ui = useStore((s) => s.ui)
  const piece = TEXTS[id]
  const ref = useRef<HTMLDivElement>(null)
  const start = useRef(performance.now())
  const maxScroll = useRef(0)
  const [expanded, setExpanded] = useState(false)

  const depth = ui.textDepth
  const paras = [...piece.base, ...(depth >= 1 || expanded ? piece.extended : [])]
  const words = depth === -1 ? 9 : (piece.lede + paras.join(' ') + (depth === 2 ? piece.notes.map((n) => n.text).join(' ') : '')).split(/\s+/).length

  useEffect(() => {
    probe.current = () => {
      const el = ref.current
      const scrollable = el ? el.scrollHeight - el.clientHeight : 0
      const scrolled = scrollable > 40 ? maxScroll.current / scrollable : 1
      // Comfortable reading speed ≈ 4 words a second when skimming-to-reading.
      const expected = Math.max(3000, (words / 4) * 1000)
      const timeFrac = (performance.now() - start.current) / expected
      return Math.max(0, Math.min(1, scrolled, timeFrac))
    }
  }, [probe, words])

  const onScroll = () => {
    const el = ref.current!
    maxScroll.current = Math.max(maxScroll.current, el.scrollTop)
    useStore.getState().inside('move')
  }

  if (depth === -1 && !expanded) {
    return (
      <div className="read" data-depth={-1} ref={ref} tabIndex={0}>
        <div style={{ textAlign: 'left' }}>
          <span className="kicker mono">{piece.kicker}</span>
          <div className="statement">{emph(piece.statement)}</div>
          <button className="more mono" onClick={() => { setExpanded(true); useStore.getState().inside('click') }} data-cursor="button">
            there is more — show it
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="read" ref={ref} onScroll={onScroll} data-mode={ui.mode} data-depth={depth} tabIndex={0}>
      <div className="read-inner">
        <article>
          <span className="kicker mono">{piece.kicker}</span>
          <h1>{piece.title}</h1>
          <p className="lede">{piece.lede}</p>
          <div className="prose" data-cols={depth === 2 ? 2 : 1}>
            {paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </article>
        {(depth === 2 || ui.mode === 'editorial') && (
          <aside>
            {piece.notes.map((n) => (
              <div key={n.n}>
                <b>{n.n}</b>
                {n.text}
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  )
}
