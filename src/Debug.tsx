import { ENTITIES } from './engine/entities'
import { HYPS, confidence } from './engine/hypotheses'
import { PERSONAS } from './engine/personas'
import { relate } from './engine/relationship'
import type { Brain } from './brain'
import { FAR_IDS } from './engine/knowledge'
import { EVENT_IDS } from './world/events'
import { KNOWLEDGE_TOTAL } from './world/know'
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
      <h4>what I have said about why you did things</h4>
      {p.misreads.length === 0 && <small>nothing yet</small>}
      {p.misreads.slice(-6).reverse().map((m, i) => (
        <div className="ev" key={m.at + '-' + i}>
          “{m.text}” <span className={m.corrected ? 'st held' : ''}>{m.corrected ? 'corrected by you' : 'uncorrected'}</span>
        </div>
      ))}
      <h4>story</h4>
      <div>chapters told: {p.chapters.join(', ') || 'none'} · ended {String(p.ended)} · ending ready {String(brain.endingReady())}</div>
      <h4>time</h4>
      <div>
        hour {brain.hour().toFixed(1)}{brain.hourOverride !== null ? ' (pretend)' : ''} · night {brain.night().toFixed(2)}{world?.asleep ? ' · asleep' : ''} · days away {brain.away.toFixed(1)}
      </div>
      <div>marks {p.marks.filter((m) => !m.dead).length} alive · {p.marks.filter((m) => m.dead).length} gone dark{p.entities.stranger.gone ? ' · the stranger has left for good' : ''}</div>
      <div className="pbtns" style={{ marginTop: 6 }}>
        <button onClick={() => { brain.hourOverride = 3 }}>pretend 3am</button>
        <button onClick={() => { brain.hourOverride = 22 }}>pretend 10pm</button>
        <button onClick={() => { brain.hourOverride = 12 }}>pretend noon</button>
        <button onClick={() => { brain.hourOverride = null }}>real time</button>
      </div>
      <div className="pbtns" style={{ marginTop: 6 }}>
        <button onClick={() => void brain.timeTravel(2)}>come back in 2 days</button>
        <button onClick={() => void brain.timeTravel(9)}>come back in 9 days</button>
      </div>
      <h4>knowledge</h4>
      <div>learned {p.learned.length} of {KNOWLEDGE_TOTAL} · given back {p.recalled.length}</div>
      <div className="pbtns" style={{ marginTop: 6 }}>
        {FAR_IDS.map((id) => (
          <button key={id} onClick={() => world?.dive(id)}>{id}</button>
        ))}
      </div>
      <h4>make something happen</h4>
      <div className="pbtns">
        {EVENT_IDS.map((id) => (
          <button key={id} onClick={() => world?.fire(id)}>{id}</button>
        ))}
      </div>
      <h4>try someone else</h4>
      <div className="pbtns">
        {PERSONAS.map((x) => (
          <button key={x.id} title={x.blurb} onClick={() => { brain.seed(x); world?.startReveal() }}>{x.label}</button>
        ))}
      </div>
      <div className="pbtns" style={{ marginTop: 8 }}>
        <button onClick={() => world?.startReveal()}>reveal now</button>
        <button onClick={() => world?.playEnding()}>play the ending</button>
        <button onClick={() => void brain.forget()}>forget everything</button>
      </div>
      <h4>just now</h4>
      {brain.log.slice(0, 18).map((e, i) => (
        <div className="ev" key={e.at + '-' + i}>
          {fmt(e.obs)}
          {e.events.map((x, j) => <div key={j} className="evt">{x.type} {'hyp' in x ? x.hyp : x.id}</div>)}
        </div>
      ))}
    </aside>
  )
}
