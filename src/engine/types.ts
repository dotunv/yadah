/**
 * The vocabulary of Yadah's inner life.
 *
 *   behavior → observation → interpretation → memory → relationship → world
 *
 * Nothing in /engine imports React or touches the DOM (tracker.ts aside).
 */

export const ENTITY_IDS = ['listener', 'wanderer', 'mirror', 'archivist', 'stranger', 'witness', 'seed', 'vigil'] as const
export type EntityId = (typeof ENTITY_IDS)[number]

export const HYP_IDS = ['stillness', 'pursuit', 'return', 'offpath', 'patience', 'hands', 'endure'] as const
export type HypId = (typeof HYP_IDS)[number]

/** What the world remembers about one entity's relationship with this person. */
export interface Memory {
  /** 0..1 — how close they have become. */
  bond: number
  dwellMs: number
  touches: number
  completions: number
  firstMet: number
  lastTouched: number
  /** Seconds spent chasing it. */
  chased: number
  /** 0..1 — how wary it is of you (strangers especially). */
  wary: number
  /** 0..1 — the seed's growth. */
  growth: number
  /** Visits in a row without being touched. */
  neglect: number
  touchedThisVisit: boolean
  /** It left, and will not come back. Only "forget me" undoes this. */
  gone: boolean
}

/** A place where the lamp lingered. Memory made physical. */
export interface Mark {
  x: number
  y: number
  visit: number
  /** 0..1 — how long the lamp stayed. */
  w: number
  /** The entity nearest when it happened, if any. */
  e: EntityId | null
  /** 1 when fresh. Marks nobody returns to go dark, and then are gone. */
  life: number
  dead?: boolean
}

export type MisreadKind = 'afraid' | 'tired' | 'vanity' | 'looking' | 'light' | 'strain'

/** Something Yadah said about *why* you did something. Confident, fluent, possibly wrong. */
export interface Misread {
  kind: MisreadKind
  entity: EntityId | null
  /** Said at the time, about "it". */
  text: string
  /** Said later, naming the thing. */
  claim: string
  at: number
  visit: number
  corrected: boolean
}

export type HypStatus = 'unformed' | 'forming' | 'held' | 'revised'

/** A guess Yadah is making about this person. It can be wrong. */
export interface Hyp {
  support: number
  contra: number
  status: HypStatus
  /** Times the hypothesis was held and then abandoned. */
  revisions: number
  lastRevisedAt: number
}

export interface Revision {
  hyp: HypId
  at: number
  visit: number
}

export interface Profile {
  version: 2
  createdAt: number
  updatedAt: number
  visits: number
  entities: Record<EntityId, Memory>
  hyps: Record<HypId, Hyp>
  marks: Mark[]
  revisions: Revision[]
  misreads: Misread[]
  /** 0 (slow, careful) .. 1 (quick) — an exponential average of lamp pace. */
  pace: number
  inputs: { key: number; click: number; move: number }
  activeMs: number
  lastVisitAt: number
  revealed: boolean
  revealedAt?: number
}

/** Volatile, per-visit state. Never persisted. */
export interface Session {
  startedAt: number
  touched: EntityId[]
  probes: number
  activeMs: number
}

export type Obs =
  | { t: 'dwell'; id: EntityId; ms: number; still: number }
  | { t: 'touch'; id: EntityId; rank: number; via: 'pointer' | 'key' }
  | { t: 'chase'; id: EntityId; ms: number }
  | { t: 'slip'; id: EntityId }
  | { t: 'complete'; id: EntityId }
  /** How long both hands were held, and whether it was held to the end. */
  | { t: 'hold'; id: EntityId; ms: number; done: boolean }
  | { t: 'leave'; id: EntityId; ms: number }
  | { t: 'mark'; mark: Omit<Mark, 'visit' | 'life' | 'dead'> }
  | { t: 'renew'; index: number }
  | { t: 'prune' }
  | { t: 'misread'; misread: Omit<Misread, 'visit' | 'corrected'> }
  | { t: 'correct'; index: number; hyp: HypId }
  | { t: 'input'; kind: 'key' | 'click' | 'move' }
  | { t: 'pace'; speed: number }
  | { t: 'active'; ms: number }
  | { t: 'probe'; hyp: HypId; engaged: boolean }

/** A notable thing that happened inside Yadah's understanding. */
export type Interp =
  | { type: 'held'; hyp: HypId }
  | { type: 'revised'; hyp: HypId }
  | { type: 'unformed'; hyp: HypId }
  | { type: 'gone'; id: EntityId }

export interface Change {
  key: string
  from: number
  to: number
  why: string
}
