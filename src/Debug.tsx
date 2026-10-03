import { ENTITIES } from './engine/entities'
import { HYPS, confidence } from './engine/hypotheses'
import { PERSONAS } from './engine/personas'
import { relate } from './engine/relationship'
import type { Brain } from './brain'
import type { World } from './world/World'

/** Yadah's mind, in the open. Toggle with the backtick key. */
export function Debug({ brain, world }: { brain: Brain; world: World | null }) {
  const p = brain.profile
  const intent = relate(p, brain.expression)
  const fmt = (o: (typeof brain.log)[number]['obs']) => {
    const id = 'id' in o ? ` ${o.id}` : ''
    const x = o.t === 'dwell' ? ` ${(o.ms / 1000).toFixed(1)}s still=${o.still.toFixed(2)}` : o.t === 'touch' ? ` rank=${o.rank} ${o.via}` : o.t === 'chase' ? ` ${(o.ms / 1000).toFixed(1)}s` : o.t === 'probe' ? ` ${o.hyp} engaged=${o.engaged}` : o.t === 'input' ? ` ${o.kind}` : o.t === 'pace' ? ` ${o.speed.toFixed(2)}` : o.t === 'mark' ? ` (${o.mark.x.toFixed(2)},${o.mark.y.toFixed(2)})` : ''
    return `${o.t}${id}${x}`
  }
  return (
    <aside className="debug">
      <h4>what I believe about you</h4>
      {HYPS.map((h) => {
        const s = p.hyps[h.id]
        const c = confidence(s)
        return (
          <div className="hyp" key={h.id}>
            <div className="row">
              <span>{h.id}</span>
              <span className={`st ${s.status}`}>{s.status}</span>
              <span>{Math.round(c * 100)}%</span>
            </div>
            <div className="bar"><i style={{ width: `${c * 100}%` }} /></div>
            <small>+{s.support.toFixed(1)} / −{s.contra.toFixed(1)} · {s.status === 'held' ? h.claim : s.status === 'revised' ? h.doubt : '…'}</small>
          </div>
        )
      })}
      <h4>relationships</h4>
      {ENTITIES.map((e) => {
        const m = p.entities[e.id]
        return (
          <div className="tr" key={e.id}>
            <span>{e.id}</span>
            <span className="bar"><i style={{ width: `${m.bond * 100}%` }} /></span>
            <span>{m.bond.toFixed(2)}</span>
            <small>touched {m.touches} · neglect {m.neglect}{e.id === 'stranger' ? ` · wary ${m.wary.toFixed(2)}` : ''}{e.id === 'seed' ? ` · growth ${m.growth.toFixed(2)}` : ''}</small>
          </div>
        )
      })}
      <h4>memory</h4>
      <div>visits {p.visits} · marks {p.marks.length} · revisions {p.revisions.length} · revealed {String(p.revealed)}</div>
      <div>pace {p.pace.toFixed(2)} · keys {p.inputs.key} clicks {p.inputs.click} · active {(p.activeMs / 1000).toFixed(0)}s</div>
      <div>air: hue {Math.round(intent.hue)} chroma {intent.chroma.toFixed(3)} · expression {brain.expression}</div>
      <div>ready to speak: {String(brain.ready())}</div>
      <h4>try someone else</h4>
      <div className="pbtns">
        {PERSONAS.map((x) => (
          <button key={x.id} title={x.blurb} onClick={() => { brain.seed(x); world?.startReveal() }}>{x.label}</button>
        ))}
      </div>
      <div className="pbtns" style={{ marginTop: 8 }}>
        <button onClick={() => world?.startReveal()}>reveal now</button>
        <button onClick={() => void brain.forget()}>forget everything</button>
      </div>
      <h4>just now</h4>
      {brain.log.slice(0, 18).map((e, i) => (
        <div className="ev" key={e.at + '-' + i}>
          {fmt(e.obs)}
          {e.events.map((x, j) => <div key={j} className="evt">{x.type} {x.hyp}</div>)}
        </div>
      ))}
    </aside>
  )
}
