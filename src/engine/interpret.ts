import { HYPS, confidence, evidenceCount } from './hypotheses'
import { ENTITY_IDS, HYP_IDS, type Hyp, type Interp, type Obs, type Profile, type Session } from './types'

/**
 * Observation → interpretation. Pure and deterministic.
 *
 * Two things happen to every observation: it changes the relationship with
 * one entity (memory), and it counts for or against some of Yadah's guesses
 * (interpretation). A guess that was held and is then contradicted is not
 * quietly lowered; it is recorded as a revision. Yadah was wrong.
 */

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const MAX_MARKS = 160

export const statusOf = (h: Hyp): Hyp['status'] => {
  const n = evidenceCount(h)
  const c = confidence(h)
  if (n < 2.5) return h.status === 'revised' ? 'revised' : 'unformed'
  if (c >= 0.68 && n >= 4) return 'held'
  // a held guess is let go only when clearly contradicted, not at the first doubt
  if (h.status === 'held') return c < 0.45 ? 'revised' : 'held'
  if (h.status === 'revised' && c < 0.6) return 'revised'
  return 'forming'
}

export interface StepResult {
  profile: Profile
  session: Session
  events: Interp[]
}

export function step(prev: Profile, sess: Session, o: Obs, now = Date.now()): StepResult {
  const p: Profile = {
    ...prev,
    updatedAt: now,
    entities: { ...prev.entities },
    hyps: { ...prev.hyps },
    inputs: { ...prev.inputs },
    marks: prev.marks,
    revisions: prev.revisions,
    misreads: prev.misreads ?? [],
  }
  let session = sess
  let goneNow = false

  // ── 1. The relationship ──────────────────────────────────────────────
  if ('id' in o) {
    const m = { ...p.entities[o.id] }
    switch (o.t) {
      case 'dwell':
        m.dwellMs += o.ms
        m.bond += (1 - m.bond) * 0.014 * Math.min(o.ms / 1000, 4) * (0.5 + 0.5 * o.still)
        // staying close and quiet calms a wary thing
        m.wary = clamp(m.wary - (o.ms / 14000) * o.still)
        break
      case 'touch':
        if (!m.firstMet) m.firstMet = now
        m.bond += (1 - m.bond) * (m.touches > 0 ? 0.1 : 0.07)
        m.touches++
        m.lastTouched = now
        m.touchedThisVisit = true
        if (!session.touched.includes(o.id)) session = { ...session, touched: [...session.touched, o.id] }
        break
      case 'complete':
        m.completions++
        m.bond += (1 - m.bond) * 0.18
        if (o.id === 'seed') m.growth = clamp(m.growth + 0.18)
        break
      case 'chase':
        m.chased += o.ms / 1000
        m.wary = clamp(m.wary + o.ms / 9000)
        break
      case 'slip':
        m.wary = clamp(m.wary + 0.12)
        break
    }
    // chase a wary thing for long enough and it leaves for good
    if (o.id === 'stranger' && !m.gone && m.chased >= 60 && m.wary > 0.85 && (o.t === 'chase' || o.t === 'slip')) {
      m.gone = true
      goneNow = true
    }
    p.entities[o.id] = m
  }

  switch (o.t) {
    case 'mark': {
      const marks = [...p.marks, { ...o.mark, visit: p.visits, life: 1 }]
      if (marks.length > MAX_MARKS) {
        // forget the faintest of the old ones first
        let drop = 0
        let worst = Infinity
        for (let i = 0; i < marks.length - 12; i++) {
          const score = marks[i].w + (marks[i].life ?? 1) * 0.6 + (marks[i].dead ? -5 : 0)
          if (score < worst) {
            worst = score
            drop = i
          }
        }
        marks.splice(drop, 1)
      }
      p.marks = marks
      break
    }
    case 'renew':
      if (p.marks[o.index]) {
        const marks = [...p.marks]
        marks[o.index] = { ...marks[o.index], life: Math.min(1, (marks[o.index].life ?? 1) + 0.5), dead: false, visit: p.visits }
        p.marks = marks
      }
      break
    case 'prune':
      p.marks = p.marks.filter((m) => !m.dead)
      break
    case 'misread':
      p.misreads = [...p.misreads.slice(-11), { ...o.misread, visit: p.visits, corrected: false }]
      break
    case 'correct':
      if (p.misreads[o.index]) {
        const list = [...p.misreads]
        list[o.index] = { ...list[o.index], corrected: true }
        p.misreads = list
      }
      break
    case 'input':
      p.inputs[o.kind]++
      break
    case 'pace':
      p.pace += (o.speed - p.pace) * 0.22
      break
    case 'active':
      p.activeMs += o.ms
      session = { ...session, activeMs: session.activeMs + o.ms }
      break
    case 'probe':
      session = { ...session, probes: session.probes + 1 }
      break
  }

  // ── 2. The guesses ───────────────────────────────────────────────────
  const events: Interp[] = []
  for (const def of HYPS) {
    // evidence is weighed against what was true *before* this observation
    let ev = def.weigh(o, prev, sess)
    if (o.t === 'correct' && o.hyp === def.id) ev = { support: 1.5 }
    if (o.t === 'probe' && o.hyp === def.id) {
      const expected = def.probe!.expects === 'engage'
      ev = o.engaged === expected ? { support: 2.5 } : { contra: 2.5 }
    }
    if (!ev.support && !ev.contra) continue
    const h = { ...p.hyps[def.id] }
    h.support += ev.support ?? 0
    h.contra += ev.contra ?? 0
    const before = h.status
    h.status = statusOf(h)
    if (before === 'held' && h.status === 'revised') {
      h.revisions++
      h.lastRevisedAt = now
      p.revisions = [...p.revisions, { hyp: def.id, at: now, visit: p.visits }]
      events.push({ type: 'revised', hyp: def.id })
    } else if (before !== 'held' && h.status === 'held') {
      events.push({ type: 'held', hyp: def.id })
    }
    p.hyps[def.id] = h
  }
  if (goneNow) events.push({ type: 'gone', id: 'stranger' })
  return { profile: p, session, events }
}

/** The guesses Yadah currently stands behind, strongest first. */
export function heldBeliefs(p: Profile): { hyp: (typeof HYP_IDS)[number]; positive: boolean; strength: number }[] {
  const out: { hyp: (typeof HYP_IDS)[number]; positive: boolean; strength: number }[] = []
  for (const id of HYP_IDS) {
    const h = p.hyps[id]
    const n = evidenceCount(h)
    const c = confidence(h)
    if (n >= 4 && c >= 0.68) out.push({ hyp: id, positive: true, strength: c * Math.min(1, n / 8) })
    else if (n >= 5 && c <= 0.3) out.push({ hyp: id, positive: false, strength: (1 - c) * Math.min(1, n / 8) * 0.8 })
  }
  return out.sort((a, b) => b.strength - a.strength)
}

/** Enough has happened that Yadah has something to say, and has earned the right. */
export function readyToSpeak(p: Profile, s: Session): boolean {
  if (p.revealed) return false
  const met = ENTITY_IDS.filter((id) => p.entities[id].touches > 0).length
  const touches = ENTITY_IDS.reduce((n, id) => n + p.entities[id].touches, 0)
  return heldBeliefs(p).length >= 2 && met >= 3 && touches >= 4 && p.activeMs >= 40000 && s.touched.length >= 1
}
