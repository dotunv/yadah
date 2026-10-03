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
  // correct it by id: two more misreads push the list past its cap and shift it
  const afraid = p.misreads.find((m) => m.kind === 'afraid')!.id
  ;({ profile: p, session: s } = step(p, s, { t: 'misread', misread: { kind: 'tired', entity: 'listener', text: 'you were tired.', claim: 'You were tired.', at: 2 } }, 0))
  ;({ profile: p, session: s } = step(p, s, { t: 'misread', misread: { kind: 'light', entity: null, text: 'the light.', claim: 'The light.', at: 3 } }, 0))
  ;({ profile: p, session: s } = step(p, s, { t: 'correct', id: afraid, hyp: 'return' }, 0))
  console.log('\n== misreading\n corrected:', p.misreads.map((m) => `${m.kind}:${m.corrected}`).join(' '), ' return support:', p.hyps.return.support)
  console.log(' reveal says:', revealLines({ ...p, hyps: { ...p.hyps, stillness: { ...p.hyps.stillness, support: 9, contra: 0 }, patience: { ...p.hyps.patience, support: 9, contra: 0 } } }).join(' / '))
}

// The story: fragments unlock one per completion, chapters are told once, the ending has to be earned.
{
  const { chapterFor, endingReady, endingLines, fragment } = await import('../src/engine/story')
  let p = beginVisit(createProfile(0), 0)
  let s = createSession(0)
  const told: string[] = []
  const open = (away = 0) => {
    const c = chapterFor(p, away)
    if (c) {
      told.push(c.roman + ' ' + c.title)
      ;({ profile: p } = step(p, s, { t: 'chapter', chapter: c.id }, 0))
    }
  }
  open()
  p = beginVisit(p, 1)
  open()
  p = { ...p, revealed: true }
  p = beginVisit(p, 2)
  open()
  p = beginVisit(p, 3)
  open(9)
  console.log('\n== chapters over visits\n', told.join(' → '))
  console.log(' listener fragments:', [1, 2, 3, 4, 5].map((n) => fragment('listener', n) ?? '(none left)').join(' | '))
  const ids = ['listener', 'wanderer', 'mirror', 'archivist', 'seed'] as const
  for (const id of ids) p.entities[id] = { ...p.entities[id], bond: 0.6, touches: 3 }
  s = { ...s, touched: ['listener'] }
  p = beginVisit(p, 4)
  console.log(' ending ready (visit', p.visits + ', 5 close):', endingReady(p, s))
  console.log(' ending says:', endingLines(p).join(' / '))
}

// Marks and misreads are named by id, not position: both lists get trimmed and
// reordered while the world still holds references into them.
{
  let p = beginVisit(createProfile(0), 0)
  let s = createSession(0)
  for (let i = 0; i < 3; i++) ({ profile: p, session: s } = step(p, s, { t: 'mark', mark: { x: 0.2 + i * 0.01, y: 0.3, w: 0.5, e: null } }, 0))
  const target = p.marks[1]
  // age one mark to death and let prune() drop it, shifting every later index
  p.marks = p.marks.map((m, i) => (i === 0 ? { ...m, life: 0, dead: true } : m))
  ;({ profile: p, session: s } = step(p, s, { t: 'prune' }, 0))
  const still = p.marks.find((m) => m.id === target.id)
  const at0 = p.marks[0] === target
  ;({ profile: p, session: s } = step(p, s, { t: 'renew', id: target.id }, 0))
  const renewed = p.marks.find((m) => m.id === target.id)!
  console.log('\n== marks keep their identity\n the mark targeted before prune:', at0 ? 'was index 0 (a different mark)' : 'kept its position')
  console.log(' still findable by id:', !!still, '· life after renew:', renewed.life.toFixed(2), '(renewed, not the one at index 0)')
}

// A misreading you contradict is the one you actually contradicted, even if more
// were said afterwards and the list has shifted under it.
{
  let p = beginVisit(createProfile(0), 0)
  let s = createSession(0)
  for (let i = 0; i < 12; i++) ({ profile: p, session: s } = step(p, s, { t: 'misread', misread: { kind: 'afraid', entity: 'stranger', text: `old${i}`, claim: `old${i}`, at: i } }, 0))
  const target = p.misreads[11]
  for (let i = 0; i < 3; i++) ({ profile: p, session: s } = step(p, s, { t: 'misread', misread: { kind: 'tired', entity: 'listener', text: `new${i}`, claim: `new${i}`, at: 100 + i } }, 0))
  const stillThere = p.misreads.some((m) => m.id === target.id)
  ;({ profile: p, session: s } = step(p, s, { t: 'correct', id: target.id, hyp: 'return' }, 0))
  const correctedRight = p.misreads.find((m) => m.id === target.id)?.corrected === true
  const wrongOnes = p.misreads.filter((m) => m.text.startsWith('new') && m.corrected).length
  console.log('\n== a correction lands on the right line\n targeted:', target.text, '· survived the shift:', stillThere)
  console.log(' corrected the right one:', correctedRight, '· wrongly corrected:', wrongOnes)
}

// A mark's weight is how long the lamp stayed, so it has to vary.
{
  const weight = (dwell: number) => Math.min(1, Math.max(0.2, dwell / 8))
  console.log('\n== mark weight tracks dwell\n 2s ->', weight(2).toFixed(2), '· 5s ->', weight(5).toFixed(2), '· 20s ->', weight(20).toFixed(2))
}
