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
export function beginVisit(prev: Profile, now = Date.now()): Profile {
  const p: Profile = {
    ...prev,
    visits: prev.visits + 1,
    lastVisitAt: now,
    entities: { ...prev.entities },
    hyps: { ...prev.hyps },
  }
  if (prev.visits > 0) {
    for (const id of ENTITY_IDS) {
      const m = { ...prev.entities[id] }
      m.neglect = m.touchedThisVisit ? 0 : m.neglect + 1
      if (m.neglect > 0) m.bond *= 0.94
      m.wary = m.wary + (0.55 - m.wary) * 0.25
      m.growth = Math.max(0.05, m.growth - (m.neglect > 0 ? 0.04 : 0))
      m.touchedThisVisit = false
      p.entities[id] = m
    }
    for (const id of HYP_IDS) {
      const h = prev.hyps[id]
      p.hyps[id] = { ...h, support: h.support * 0.85, contra: h.contra * 0.85 }
    }
  }
  return p
}
