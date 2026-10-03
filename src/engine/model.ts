import { CATALOG, META } from './catalog'
import {
  TRAITS,
  type Delta,
  type Kind,
  type Nudge,
  type ObjectStat,
  type Profile,
  type Session,
  type Signal,
  type Traits,
} from './types'

/**
 * The behavioral model: deterministic, table-driven, no randomness, no AI.
 *
 *   Signal ──► rules ──► nudges ──► profile.traits
 *
 * Every rule has an id and a human-readable description, so any change in a
 * trait can be traced to the sentence that caused it (see the debug panel).
 */

export const NEUTRAL_TRAITS: Traits = {
  visual_interest: 0.5,
  reading_interest: 0.5,
  exploration_level: 0.5,
  interaction_speed: 0.5,
  keyboard_preference: 0.5,
  repeat_interest: 0.5,
  animation_preference: 0.5,
}

const EMPTY_STAT = (): ObjectStat => ({
  opens: 0,
  dwellMs: 0,
  seen: 0,
  lastOpened: 0,
  maxDepth: 0,
  skips: 0,
  reads: 0,
})

export function createProfile(now = Date.now()): Profile {
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    sessions: 0,
    traits: { ...NEUTRAL_TRAITS },
    evidence: 0,
    objects: {},
    kindDwell: { visual: 0, reading: 0, interactive: 0 },
    inputs: { key: 0, click: 0, hover: 0, drag: 0, wheel: 0 },
    activeMs: 0,
    lastSessionMs: 0,
    revealed: false,
  }
}

export function createSession(now = Date.now()): Session {
  return {
    startedAt: now,
    opens: 0,
    openedIds: [],
    prevId: null,
    activeMs: 0,
    ignoredTicks: { visual: 0, reading: 0, interactive: 0 },
    discovered: [],
  }
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const smooth = (v: number, lo: number, hi: number) => clamp((v - lo) / (hi - lo))

export interface RuleContext {
  profile: Profile
  session: Session
  signal: Signal
  /** Stats of the object the signal refers to *before* this signal was applied. */
  before?: ObjectStat
}

export interface Rule {
  id: string
  /** The plain-language rule, as written in the brief. */
  says: string
  on: Signal['t']
  run: (c: RuleContext) => Nudge[]
}

const kindOf = (id: string): Kind | undefined => META[id]?.kind

export const RULES: Rule[] = [
  {
    id: 'dwell-visual',
    says: 'Lingers on something visual → visual_interest up. Leaves it at once → down.',
    on: 'close',
    run: ({ signal }) => {
      if (signal.t !== 'close' || kindOf(signal.id) !== 'visual') return []
      const s = signal.dwellMs / 1000
      if (s >= 4) return [{ trait: 'visual_interest', target: 1, weight: 0.5 + 0.5 * smooth(s, 4, 22) }]
      if (s < 2) return [{ trait: 'visual_interest', target: 0.25, weight: 0.35 }]
      return []
    },
  },
  {
    id: 'skip-text',
    says: 'Opens text and leaves without reading → reading_interest down.',
    on: 'close',
    run: ({ signal }) => {
      if (signal.t !== 'close' || kindOf(signal.id) !== 'reading') return []
      if (signal.read < 0.2 && signal.dwellMs < 6000) return [{ trait: 'reading_interest', target: 0, weight: 0.9 }]
      return []
    },
  },
  {
    id: 'read-text',
    says: 'Reads to the end (or close to it) → reading_interest up.',
    on: 'close',
    run: ({ signal }) => {
      if (signal.t !== 'close' || kindOf(signal.id) !== 'reading') return []
      if (signal.read >= 0.6) {
        return [
          { trait: 'reading_interest', target: 1, weight: 0.6 + 0.4 * signal.read },
          { trait: 'visual_interest', target: 0.3, weight: 0.12 },
        ]
      }
      return []
    },
  },
  {
    id: 'looks-not-reads',
    says: 'Time spent looking outweighs time spent reading → nudge visual up, reading down (and vice versa).',
    on: 'close',
    run: ({ profile }) => {
      const { visual, reading } = profile.kindDwell
      const total = visual + reading
      if (total < 12000) return []
      const share = visual / total
      return [
        { trait: 'visual_interest', target: share, weight: 0.25 },
        { trait: 'reading_interest', target: 1 - share, weight: 0.25 },
      ]
    },
  },
  {
    id: 'engaged-play',
    says: 'Plays with interactive things for a long time → animation_preference up.',
    on: 'close',
    run: ({ signal }) => {
      if (signal.t !== 'close' || kindOf(signal.id) === 'reading') return []
      if (signal.depth >= 6) return [{ trait: 'animation_preference', target: 1, weight: 0.4 }]
      return []
    },
  },
  {
    id: 'impatient-close',
    says: 'Closes a view before its transition has finished → animation_preference down.',
    on: 'close',
    run: ({ signal }) => {
      if (signal.t !== 'close') return []
      if (signal.dwellMs < 1400) return [{ trait: 'animation_preference', target: 0, weight: 0.55 }]
      return []
    },
  },
  {
    id: 'revisit',
    says: 'Returns to something already opened → repeat_interest up.',
    on: 'open',
    run: ({ signal, before }) => {
      if (signal.t !== 'open') return []
      if (before && before.opens >= 1) return [{ trait: 'repeat_interest', target: 1, weight: 0.7 }]
      return [{ trait: 'repeat_interest', target: 0, weight: 0.18 }]
    },
  },
  {
    id: 'wander',
    says: 'Jumps between unrelated things, off the suggested order → exploration_level up.',
    on: 'open',
    run: ({ signal, session }) => {
      if (signal.t !== 'open' || !session.prevId || session.prevId === signal.id) return []
      const a = META[session.prevId]
      const b = META[signal.id]
      if (!a || !b) return []
      const step = Math.abs(a.order - b.order)
      if (a.kind !== b.kind && step > 1) return [{ trait: 'exploration_level', target: 1, weight: 0.8 }]
      if (step > 1) return [{ trait: 'exploration_level', target: 0.55, weight: 0.25 }]
      if (a.kind !== b.kind) return [{ trait: 'exploration_level', target: 0.6, weight: 0.3 }]
      return [{ trait: 'exploration_level', target: 0.05, weight: 0.45 }]
    },
  },
  {
    id: 'fresh-ground',
    says: 'Opens something new → mild exploration_level up. Only ever reopens old things → down.',
    on: 'open',
    run: ({ signal, before }) => {
      if (signal.t !== 'open') return []
      return before && before.opens > 0
        ? [{ trait: 'exploration_level', target: 0.2, weight: 0.2 }]
        : [{ trait: 'exploration_level', target: 0.65, weight: 0.12 }]
    },
  },
  {
    id: 'discovery',
    says: 'Finds something that was hidden → exploration_level way up.',
    on: 'discover',
    run: () => [{ trait: 'exploration_level', target: 1, weight: 1 }],
  },
  {
    id: 'ignored-kind',
    says: 'Opens many things but never a whole kind of thing → that interest goes down.',
    on: 'open',
    run: ({ session }) => {
      if (session.opens < 4) return []
      const out: Nudge[] = []
      const opened = new Set(session.openedIds.map(kindOf))
      if (opened.size < 2) return []
      if (!opened.has('visual')) out.push({ trait: 'visual_interest', target: 0.1, weight: 0.4 })
      if (!opened.has('reading')) out.push({ trait: 'reading_interest', target: 0.1, weight: 0.4 })
      return out
    },
  },
  {
    id: 'keys',
    says: 'Navigates with the keyboard → keyboard_preference up.',
    on: 'input',
    run: ({ signal }) =>
      signal.t === 'input' && signal.kind === 'key' ? [{ trait: 'keyboard_preference', target: 1, weight: 0.4 }] : [],
  },
  {
    id: 'pointing',
    says: 'Clicks, drags, scrolls with a pointer → keyboard_preference down.',
    on: 'input',
    run: ({ signal }) =>
      signal.t === 'input' && (signal.kind === 'click' || signal.kind === 'drag' || signal.kind === 'wheel')
        ? [{ trait: 'keyboard_preference', target: 0, weight: 0.12 }]
        : [],
  },
  {
    id: 'pace',
    says: 'Pointer travels slowly, with long pauses → interaction_speed down. Fast and restless → up.',
    on: 'pointer',
    run: ({ signal }) => {
      if (signal.t !== 'pointer') return []
      const s = smooth(Math.log(Math.max(signal.avgSpeed, 1)), Math.log(150), Math.log(1800))
      const target = clamp(s * (1 - 0.45 * signal.pauseRatio))
      return [{ trait: 'interaction_speed', target, weight: 0.55 }]
    },
  },
  {
    id: 'restless',
    says: 'Lots of sudden direction changes while moving fast → animation_preference down (prefers calm).',
    on: 'pointer',
    run: ({ signal }) => {
      if (signal.t !== 'pointer') return []
      if (signal.turns > 40 && signal.avgSpeed > 900) return [{ trait: 'animation_preference', target: 0.2, weight: 0.2 }]
      return []
    },
  },
]

const RULES_BY_SIGNAL = RULES.reduce<Record<string, Rule[]>>((acc, r) => {
  ;(acc[r.on] ||= []).push(r)
  return acc
}, {})

/** How quickly a nudge moves a trait. Fast when we know little, calmer later. */
export function learningRate(evidence: number, weight: number): number {
  const base = 0.34 / Math.sqrt(1 + evidence * 0.12)
  return clamp(base * weight, 0.004, 0.32)
}

/** How much evidence a signal contributes. */
function evidenceOf(s: Signal): number {
  switch (s.t) {
    case 'open':
      return 1
    case 'close':
      return Math.min(s.dwellMs / 15000, 1.5)
    case 'discover':
      return 1.5
    case 'pointer':
      return 0.15
    case 'active':
      return s.ms / 30000
    case 'input':
      return 0.04
    case 'inside':
      return 0.05
    default:
      return 0
  }
}

export interface StepResult {
  profile: Profile
  session: Session
  deltas: Delta[]
}

/**
 * Pure transition. Takes the previous profile + session and one signal,
 * returns new copies and the list of trait changes that happened.
 */
export function step(prev: Profile, prevSession: Session, signal: Signal, now = Date.now()): StepResult {
  const profile: Profile = {
    ...prev,
    traits: { ...prev.traits },
    objects: { ...prev.objects },
    kindDwell: { ...prev.kindDwell },
    inputs: { ...prev.inputs },
    updatedAt: now,
  }
  const session: Session = {
    ...prevSession,
    openedIds: prevSession.openedIds,
    discovered: prevSession.discovered,
    ignoredTicks: { ...prevSession.ignoredTicks },
  }

  // ── 1. Record the raw observation ────────────────────────────────────
  const id = 'id' in signal ? signal.id : undefined
  const before = id ? prev.objects[id] : undefined
  const stat = id ? { ...(before ?? EMPTY_STAT()) } : undefined

  switch (signal.t) {
    case 'seen':
      if (stat) stat.seen++
      break
    case 'open':
      if (stat) {
        stat.opens++
        stat.lastOpened = now
      }
      break
    case 'close': {
      if (stat) {
        stat.dwellMs += signal.dwellMs
        stat.maxDepth = Math.max(stat.maxDepth, signal.depth)
        if (kindOf(signal.id) === 'reading') {
          if (signal.read >= 0.6) stat.reads++
          else if (signal.read < 0.2 && signal.dwellMs < 6000) stat.skips++
        }
      }
      const k = kindOf(signal.id)
      if (k) profile.kindDwell[k] += signal.dwellMs
      break
    }
    case 'input':
      profile.inputs[signal.kind]++
      break
    case 'active':
      profile.activeMs += signal.ms
      session.activeMs += signal.ms
      break
  }
  if (id && stat) profile.objects[id] = stat

  // ── 2. Run the rules (they see the session *before* this signal) ─────────────────────────────────────────────────
  const deltas: Delta[] = []
  const rules = RULES_BY_SIGNAL[signal.t] ?? []
  const evidence = profile.evidence
  for (const rule of rules) {
    const nudges = rule.run({ profile, session, signal, before })
    for (const n of nudges) {
      const from = profile.traits[n.trait]
      const to = clamp(from + (n.target - from) * learningRate(evidence, n.weight))
      if (Math.abs(to - from) < 1e-5) continue
      profile.traits[n.trait] = to
      deltas.push({ trait: n.trait, from, to, rule: rule.id })
    }
  }

  // ── 3. Advance session state after rules have seen the old one ───────
  if (signal.t === 'open') {
    session.opens++
    session.openedIds = [...session.openedIds, signal.id]
    session.prevId = signal.id
  }
  if (signal.t === 'discover' && !session.discovered.includes(signal.id)) {
    session.discovered = [...session.discovered, signal.id]
  }

  profile.evidence += evidenceOf(signal)

  // The object the user has spent the longest with, ever.
  let best: string | undefined
  let bestMs = 0
  for (const o of CATALOG) {
    const ms = profile.objects[o.id]?.dwellMs ?? 0
    if (ms > bestMs) {
      bestMs = ms
      best = o.id
    }
  }
  if (best) profile.favorite = best

  return { profile, session, deltas }
}

export const confidenceOf = (p: Profile) => 1 - Math.exp(-p.evidence / 10)

/** Enough observed behavior to say something honest about it. */
export function readyToReveal(p: Profile, s: Session): boolean {
  const distinct = new Set(s.openedIds).size
  return p.evidence >= 7 && s.opens >= 3 && distinct >= 3 && !p.revealed
}

export { TRAITS }
