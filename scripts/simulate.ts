import { step, heldBeliefs, readyToSpeak } from '../src/engine/interpret'
import { beginVisit, createProfile, createSession } from '../src/engine/memory'
import { relate } from '../src/engine/relationship'
import { revealLines } from '../src/engine/voice'
import type { EntityId, Obs } from '../src/engine/types'

/** Headless walk-throughs of Yadah's understanding. `npm run sim` */

const touch = (id: EntityId, rank = 1, via: 'pointer' | 'key' = 'pointer'): Obs => ({ t: 'touch', id, rank, via })
const dwell = (id: EntityId, ms: number, still: number): Obs => ({ t: 'dwell', id, ms, still })

const scenes: Record<string, Obs[]> = {
  stillOne: [
    touch('listener', 0), dwell('listener', 6000, 1), { t: 'complete', id: 'listener' },
    touch('witness', 2), dwell('witness', 5000, 0.9), { t: 'complete', id: 'witness' },
    touch('listener', 1), dwell('listener', 4000, 0.9),
    touch('stranger', 3), dwell('stranger', 5000, 0.8), { t: 'complete', id: 'stranger' },
    { t: 'active', ms: 45000 },
  ],
  chaser: [
    touch('wanderer', 0), { t: 'chase', id: 'wanderer', ms: 5000 }, { t: 'chase', id: 'wanderer', ms: 5000 }, { t: 'complete', id: 'wanderer' },
    touch('stranger', 1), { t: 'slip', id: 'stranger' }, { t: 'chase', id: 'stranger', ms: 4000 },
    touch('wanderer', 1), { t: 'chase', id: 'wanderer', ms: 5000 },
    touch('mirror', 2), dwell('mirror', 4000, 0.2), { t: 'active', ms: 45000 },
  ],
}

for (const [name, obs] of Object.entries(scenes)) {
  let p = beginVisit(createProfile(0), 0)
  let s = createSession(0)
  const heard: string[] = []
  for (const o of obs) {
    const r = step(p, s, o, 0)
    p = r.profile
    s = r.session
    for (const e of r.events) heard.push(`${e.type}:${'hyp' in e ? e.hyp : e.id}`)
  }
  console.log(`\n== ${name}  ready:${readyToSpeak(p, s)}  events: ${heard.join(' ') || '–'}`)
  console.log(' bonds', Object.entries(p.entities).map(([k, m]) => `${k}=${m.bond.toFixed(2)}`).join(' '))
  console.log(' believes', heldBeliefs(p).map((b) => `${b.positive ? '' : 'not '}${b.hyp}(${b.strength.toFixed(2)})`).join(' '))
  const w = relate(p, 1)
  console.log(' world hue', Math.round(w.hue), 'chroma', w.chroma.toFixed(3), 'closeness', w.closeness.toFixed(2))
  console.log(revealLines(p).map((l) => '  “' + l + '”').join('\n'))
}

// A held belief that gets contradicted is a revision, not a rounding error.
let p = beginVisit(createProfile(0), 0)
let s = createSession(0)
for (let i = 0; i < 6; i++) ({ profile: p, session: s } = step(p, s, dwell('listener', 6000, 1), 0))
console.log('\n== revision\n stillness after quiet:', p.hyps.stillness.status)
for (let i = 0; i < 5; i++) {
  const r = step(p, s, { t: 'probe', hyp: 'stillness', engaged: true }, 0)
  p = r.profile
  s = r.session
  if (r.events.length) console.log(' event:', JSON.stringify(r.events))
}
console.log(' stillness after being tested:', p.hyps.stillness.status, 'revisions:', p.hyps.stillness.revisions)

// Nothing is kept up for you: marks nobody returns to go dark, then are lost.
{
  let p = beginVisit(createProfile(0), 0)
  let s = createSession(0)
  for (let i = 0; i < 4; i++) ({ profile: p, session: s } = step(p, s, { t: 'mark', mark: { x: 0.3, y: 0.3, w: 0.8, e: null } }, 0))
  const lives: string[] = []
  for (let v = 0; v < 6; v++) {
    p = beginVisit(p, (v + 1) * 86_400_000)
    lives.push(`${p.marks.filter((m) => !m.dead).length}/${p.marks.length}`)
  }
  console.log('\n== decay (alive/total marks, one visit a day)\n', lives.join('  '))
  ;({ profile: p } = step(p, s, { t: 'prune' }, 0))
  console.log(' after the dead are cleared:', p.marks.length)
}

// Chase a wary thing for long enough and it is gone for good.
{
  let p = beginVisit(createProfile(0), 0)
  let s = createSession(0)
  const heard: string[] = []
  for (let i = 0; i < 20 && !p.entities.stranger.gone; i++) {
    const r = step(p, s, { t: 'chase', id: 'stranger', ms: 6000 }, 0)
    p = r.profile
    s = r.session
    for (const e of r.events) heard.push(e.type)
  }
  console.log('\n== loss\n stranger gone:', p.entities.stranger.gone, heard.join(','), 'chased', p.entities.stranger.chased.toFixed(0), 's')
  p = beginVisit(p, 1)
  console.log(' next visit, still gone:', p.entities.stranger.gone)
}

// A misreading that can be corrected becomes evidence, and goes into the reveal.
{
  let p = beginVisit(createProfile(0), 0)
  let s = createSession(0)
  ;({ profile: p, session: s } = step(p, s, { t: 'misread', misread: { kind: 'looking', entity: 'witness', text: 'you were looking for something.', claim: 'You were looking for something.', at: 0 } }, 0))
  ;({ profile: p, session: s } = step(p, s, { t: 'misread', misread: { kind: 'afraid', entity: 'stranger', text: 'you were afraid of it.', claim: 'You were afraid of the stranger.', at: 1 } }, 0))
  ;({ profile: p, session: s } = step(p, s, { t: 'correct', index: 1, hyp: 'return' }, 0))
  console.log('\n== misreading\n corrected:', p.misreads.map((m) => `${m.kind}:${m.corrected}`).join(' '), ' return support:', p.hyps.return.support)
  console.log(' reveal says:', revealLines({ ...p, hyps: { ...p.hyps, stillness: { ...p.hyps.stillness, support: 9, contra: 0 }, patience: { ...p.hyps.patience, support: 9, contra: 0 } } }).join(' / '))
}
