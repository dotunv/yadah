/**
 * Shared vocabulary of the behavioral engine.
 * Nothing in /engine imports React, the DOM-bound UI, or the store.
 */

export const TRAITS = [
  'visual_interest',
  'reading_interest',
  'exploration_level',
  'interaction_speed',
  'keyboard_preference',
  'repeat_interest',
  'animation_preference',
] as const

export type TraitKey = (typeof TRAITS)[number]
export type Traits = Record<TraitKey, number>

export type Kind = 'visual' | 'reading' | 'interactive'

export interface ObjectStat {
  opens: number
  dwellMs: number
  seen: number
  lastOpened: number
  maxDepth: number
  skips: number
  reads: number
}

export interface InputCounts {
  key: number
  click: number
  hover: number
  drag: number
  wheel: number
}

/** The persisted behavioral profile. */
export interface Profile {
  version: 1
  createdAt: number
  updatedAt: number
  sessions: number
  traits: Traits
  /** Monotonic measure of how much behavior has been observed. */
  evidence: number
  objects: Record<string, ObjectStat>
  kindDwell: Record<Kind, number>
  inputs: InputCounts
  activeMs: number
  lastSessionMs: number
  /** Id of the object the user spent the longest with, ever. */
  favorite?: string
  revealed: boolean
  revealedAt?: number
}

/** Volatile, per-visit state. Never persisted. */
export interface Session {
  startedAt: number
  opens: number
  openedIds: string[]
  prevId: string | null
  activeMs: number
  ignoredTicks: Record<Kind, number>
  discovered: string[]
}

export type Signal =
  | { t: 'seen'; id: string }
  | { t: 'hover'; id: string; ms: number }
  | { t: 'open'; id: string; via: 'pointer' | 'key' }
  | { t: 'close'; id: string; dwellMs: number; depth: number; read: number }
  | { t: 'inside'; id: string; kind: 'click' | 'drag' | 'key' | 'move' }
  | { t: 'input'; kind: keyof InputCounts }
  | { t: 'pointer'; avgSpeed: number; pauseRatio: number; turns: number }
  | { t: 'active'; ms: number }
  | { t: 'discover'; id: string }

export interface Nudge {
  trait: TraitKey
  /** Value in [0,1] the trait is pulled toward. */
  target: number
  /** Relative strength of the pull, usually 0..1. */
  weight: number
}

export interface Delta {
  trait: TraitKey
  from: number
  to: number
  rule: string
}

export interface ObjectMeta {
  id: string
  title: string
  kind: Kind
  /** The "obvious path": the order the site suggests. */
  order: number
  hidden: boolean
  /** Normalised position in the neutral world, 0..1. */
  at: [number, number]
}

/** Everything the visual layer needs; produced from a Profile by adapt.ts. */
export interface InterfaceState {
  /** 0..1 — how much of the learned profile is currently expressed. */
  applied: number
  confidence: number
  mode: 'neutral' | 'immersive' | 'editorial'
  dominant: Kind | null
  scale: Record<Kind, number>
  chroma: number
  hue: number
  /** -1 summary only, 0 neutral, 1 extended, 2 dense with marginalia. */
  textDepth: -1 | 0 | 1 | 2
  type: { size: number; leading: number; measure: number; columns: 1 | 2 }
  spatial: boolean
  spread: number
  hiddenVisible: boolean
  keyboard: { hints: boolean; numberKeys: boolean; ring: number }
  motion: { duration: number; ambient: number; parallax: number; trails: boolean; quiet: boolean }
  /** Objects pulled toward the centre because the user keeps coming back. */
  surfaced: Record<string, number>
  /** Pull of each kind toward/away from centre (+ = toward). */
  kindPull: Record<Kind, number>
}
