import { DEF } from './entities'
import type { HypId, Obs, Profile, Session } from './types'

/**
 * Yadah's guesses about you. Each is a plain sentence plus the evidence that
 * moves it. Evidence is signed: support makes it more likely, contra less.
 *
 * Some guesses can be tested: Yadah sets something in your path and watches
 * whether you take it. That is how it finds out it was wrong.
 */

export interface Evidence {
  support?: number
  contra?: number
}

export interface HypDef {
  id: HypId
  /** Said when held. Second person, present tense. */
  claim: string
  /** Said when the opposite is clearly true. */
  opposite: string
  /** Said when a held guess turns out wrong. */
  doubt: string
  probe?: { entity: 'wanderer' | 'stranger' | 'seed'; expects: 'engage' | 'ignore' }
  weigh: (o: Obs, p: Profile, s: Session) => Evidence
}

const cap = (v: number, hi: number) => Math.min(hi, Math.max(0, v))

export const HYPS: HypDef[] = [
  {
    id: 'stillness',
    claim: 'You prefer stillness.',
    opposite: 'You are drawn to whatever moves.',
    doubt: 'I thought you preferred stillness.',
    probe: { entity: 'wanderer', expects: 'ignore' },
    weigh: (o) => {
      if (o.t === 'dwell') {
        const d = DEF[o.id]
        if (d.still && o.still >= 0.6) return { support: cap(o.ms / 5000, 1) }
        if (d.moves && o.still < 0.5) return { contra: cap(o.ms / 6000, 0.8) }
      }
      if (o.t === 'complete' && DEF[o.id].still) return { support: 1 }
      if (o.t === 'pace') return o.speed < 0.35 ? { support: 0.15 } : o.speed > 0.7 ? { contra: 0.15 } : {}
      return {}
    },
  },
  {
    id: 'pursuit',
    claim: 'You follow what moves.',
    opposite: 'You let things go.',
    doubt: 'I thought you would follow it.',
    probe: { entity: 'wanderer', expects: 'engage' },
    weigh: (o) => {
      if (o.t === 'chase') return { support: cap(o.ms / 4000, 1.2) }
      if (o.t === 'slip') return { support: 0.6 }
      if (o.t === 'complete' && o.id === 'wanderer') return { support: 1 }
      return {}
    },
  },
  {
    id: 'return',
    claim: 'You return to things.',
    opposite: 'You rarely look back.',
    doubt: 'I thought you would come back to it.',
    weigh: (o, p, s) => {
      if (o.t !== 'touch') return {}
      const again = s.touched.includes(o.id) || p.entities[o.id].touches > 1
      return again ? { support: 1 } : { contra: 0.35 }
    },
  },
  {
    id: 'offpath',
    claim: 'You don’t follow the obvious path.',
    opposite: 'You go to what is nearest.',
    doubt: 'I thought you would go somewhere else.',
    probe: { entity: 'seed', expects: 'ignore' },
    weigh: (o) => {
      if (o.t !== 'touch') return {}
      if (o.rank >= 2) return { support: 1 }
      if (o.rank === 0) return { contra: 0.6 }
      return {}
    },
  },
  {
    id: 'patience',
    claim: 'You stay when something doesn’t explain itself.',
    opposite: 'You leave before things explain themselves.',
    doubt: 'I thought you would stay.',
    probe: { entity: 'stranger', expects: 'engage' },
    weigh: (o) => {
      if (o.t === 'dwell' && DEF[o.id].opaque && o.ms >= 1500) return { support: cap(o.ms / 6000, 1) }
      if (o.t === 'leave' && DEF[o.id].opaque) return { contra: 0.8 }
      if (o.t === 'complete' && DEF[o.id].opaque) return { support: 1.2 }
      return {}
    },
  },
  {
    id: 'hands',
    claim: 'Your hands stay on the keys.',
    opposite: 'You reach for the pointer.',
    doubt: 'I thought you preferred the keys.',
    weigh: (o) => {
      if (o.t === 'input') return o.kind === 'key' ? { support: 0.3 } : o.kind === 'click' ? { contra: 0.12 } : {}
      if (o.t === 'touch') return o.via === 'key' ? { support: 0.6 } : { contra: 0.2 }
      return {}
    },
  },
]

export const HYP = Object.fromEntries(HYPS.map((h) => [h.id, h])) as Record<HypId, HypDef>

/** Probability the guess is right, with a gentle prior toward "don't know". */
export const confidence = (h: { support: number; contra: number }) => (h.support + 1) / (h.support + h.contra + 2)
export const evidenceCount = (h: { support: number; contra: number }) => h.support + h.contra
