import { RULES } from '../engine/model'
import { PERSONAS } from '../engine/personas'
import { TRAITS } from '../engine/types'
import { useStore } from '../store'

/** The whole model, in the open. Toggle with the backtick key. */
export function Debug() {
  const { profile, session, ui, log, seed, forget, beginReveal } = useStore()
  const sig = (s: (typeof log)[number]['signal']) => {
    const id = 'id' in s ? ` ${s.id}` : ''
    const extra = s.t === 'close' ? ` ${(s.dwellMs / 1000).toFixed(1)}s read=${s.read.toFixed(2)} depth=${s.depth}` : s.t === 'input' ? ` ${s.kind}` : s.t === 'pointer' ? ` ${Math.round(s.avgSpeed)}px/s pause=${s.pauseRatio.toFixed(2)}` : s.t === 'inside' ? ` ${s.kind}` : ''
    return `${s.t}${id}${extra}`
  }
  return (
    <aside className="debug" data-cursor="button">
      <h4>traits</h4>
      {TRAITS.map((k) => (
        <div className="tr" key={k}>
          <span>{k}</span>
          <span className="meter"><i style={{ width: `${profile.traits[k] * 100}%` }} /></span>
          <span>{profile.traits[k].toFixed(2)}</span>
        </div>
      ))}
      <h4>state</h4>
      <div>evidence {profile.evidence.toFixed(1)} · confidence {ui.confidence.toFixed(2)} · applied {ui.applied.toFixed(2)}</div>
      <div>sessions {profile.sessions} · opens this visit {session.opens} · revealed {String(profile.revealed)}</div>
      <div>inputs {Object.entries(profile.inputs).map(([k, v]) => `${k}:${v}`).join(' ')}</div>
      <div>dwell(s) {Object.entries(profile.kindDwell).map(([k, v]) => `${k}:${(v / 1000).toFixed(0)}`).join(' ')}</div>
      <details>
        <summary>interface state</summary>
        <pre>{JSON.stringify({ mode: ui.mode, dominant: ui.dominant, scale: ui.scale, textDepth: ui.textDepth, spatial: ui.spatial, spread: ui.spread, hiddenVisible: ui.hiddenVisible, keyboard: ui.keyboard, motion: ui.motion, surfaced: ui.surfaced, hue: Math.round(ui.hue), chroma: +ui.chroma.toFixed(2) }, null, 1)}</pre>
      </details>
      <h4>try someone else</h4>
      <div className="pbtns">
        {PERSONAS.map((p) => (
          <button key={p.id} title={p.blurb} onClick={() => { seed(p); setTimeout(() => beginReveal(false), 300) }}>{p.label}</button>
        ))}
      </div>
      <div className="pbtns" style={{ marginTop: 8 }}>
        <button onClick={() => beginReveal(true)}>replay reveal</button>
        <button onClick={() => void forget()}>forget everything</button>
      </div>
      <h4>recent</h4>
      {log.slice(0, 22).map((e, i) => (
        <div className="ev" key={e.at + '-' + i}>
          {sig(e.signal)}
          {e.deltas.map((d, j) => (
            <div key={j} className={d.to > d.from ? 'up' : 'down'}>
              {'  '}{d.trait} {d.from.toFixed(3)} → {d.to.toFixed(3)} <span>({d.rule})</span>
            </div>
          ))}
        </div>
      ))}
      <h4>the rules</h4>
      {RULES.map((r) => (
        <div key={r.id} style={{ marginBottom: 6 }}><span style={{ color: 'var(--accent)' }}>{r.id}</span> — {r.says}</div>
      ))}
    </aside>
  )
}
