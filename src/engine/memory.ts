import { ENTITY_IDS, HYP_IDS, type EntityId, type Hyp, type HypId, type Memory, type Profile, type Session } from './types'

const blankMemory = (): Memory => ({
  bond: 0,
  dwellMs: 0,
  touches: 0,
  completions: 0,
  firstMet: 0,
  lastTouched: 0,
  chased: 0,
  wary: 0.55,
  growth: 0.1,
  neglect: 0,
  touchedThisVisit: false,
  gone: false,
})

const blankHyp = (): Hyp => ({ support: 0, contra: 0, status: 'unformed', revisions: 0, lastRevisedAt: 0 })

export function createProfile(now = Date.now()): Profile {
  return {
    version: 2,
    createdAt: now,
    updatedAt: now,
    visits: 0,
    entities: Object.fromEntries(ENTITY_IDS.map((id) => [id, blankMemory()])) as Record<EntityId, Memory>,
    hyps: Object.fromEntries(HYP_IDS.map((id) => [id, blankHyp()])) as Record<HypId, Hyp>,
    marks: [],
    revisions: [],
    misreads: [],
    chapters: [],
    ended: false,
    discovered: ['hall', 'archive'],
    gifts: [],
    diary: [],
    path: [],
    prevPath: [],
    pace: 0.5,
    inputs: { key: 0, click: 0, move: 0 },
    activeMs: 0,
    lastVisitAt: now,
    revealed: false,
  }
}

export function createSession(now = Date.now()): Session {
  return { startedAt: now, touched: [], probes: 0, activeMs: 0 }
}

/**
 * Begin a new visit. Time passes in the world: what you ignored drifts a
 * little further away, what you left behind is still there, and Yadah holds
 * its old guesses a little less tightly, so it can change its mind.
 */
/**
 * Profiles saved before something existed still load: anything missing is
 * filled in as if it had always been there but never touched.
 */
export function migrate(p: Profile): Profile {
  const entities = { ...p.entities }
  for (const id of ENTITY_IDS) entities[id] = { ...blankMemory(), ...entities[id] }
  const hyps = { ...p.hyps }
  for (const id of HYP_IDS) hyps[id] = { ...blankHyp(), ...hyps[id] }
  return {
    ...p,
    entities,
    hyps,
    // Marks and misreads saved before they had ids get one here, so a profile
    // written by an older build keeps its history and its pending corrections.
    marks: (p.marks ?? []).map((mk, i) => ({ ...mk, id: mk.id ?? `old${i}`, life: mk.life ?? 1 })),
    misreads: (p.misreads ?? []).map((mr, i) => ({ ...mr, id: mr.id ?? `old${i}` })),
    chapters: p.chapters ?? [],
    ended: !!p.ended,
    discovered: p.discovered ?? ['hall', 'archive'],
    gifts: p.gifts ?? [],
    diary: p.diary ?? [],
    path: p.path ?? [],
    prevPath: p.prevPath ?? [],
  }
}

/** Days since the previous visit, for how out of practice Yadah is. */
export const daysAway = (p: Profile, now = Date.now()) => Math.max(0, (now - p.lastVisitAt) / 86_400_000)

/**
 * Begin a new visit. Time passes in the world, and nothing is kept up for you:
 * what you ignored drifts further away, marks you did not come back to go dark
 * and are lost, a neglected seed closes. Yadah also holds its old guesses a
 * little more loosely, so it can change its mind.
 */
export function beginVisit(raw: Profile, now = Date.now()): Profile {
  const prev = migrate(raw)
  const away = daysAway(prev, now)
  const p: Profile = {
    ...prev,
    visits: prev.visits + 1,
    lastVisitAt: now,
    entities: { ...prev.entities },
    hyps: { ...prev.hyps },
    misreads: prev.misreads ?? [],
    // what the lamp did last time is what the mirror remembers
    prevPath: prev.path.length > 8 ? prev.path : prev.prevPath,
    path: [],
  }
  if (prev.visits > 0) {
    for (const id of ENTITY_IDS) {
      const m = { ...prev.entities[id] }
      m.gone = !!m.gone
      m.neglect = m.touchedThisVisit ? 0 : m.neglect + 1
      if (m.neglect > 0) m.bond *= 0.94
      m.wary = m.wary + (0.55 - m.wary) * 0.25
      // a seed you were close to keeps growing while you are gone; one you left shrinks
      m.growth = m.neglect > 0 ? Math.max(0.03, m.growth - 0.04 - Math.min(0.06, away * 0.01)) : Math.min(1, m.growth + (id === 'seed' ? Math.min(0.2, away * 0.04) * m.bond : 0))
      m.touchedThisVisit = false
      p.entities[id] = m
    }
    for (const id of HYP_IDS) {
      const h = prev.hyps[id]
      p.hyps[id] = { ...h, support: h.support * 0.85, contra: h.contra * 0.85 }
    }
    // marks fade with every visit that does not return to them, and faster with time away
    const fade = 0.25 + Math.min(0.45, away * 0.05)
    p.marks = prev.marks.map((mk) => {
      const life = (mk.life ?? 1) - fade
      return life <= 0 ? { ...mk, life: 0, dead: true } : { ...mk, life, dead: false }
    })
  }
  return p
}
