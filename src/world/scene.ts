import type { EntityDef } from '../engine/entities'
import type { Dir, PlaceId } from '../engine/places'
import type { EntityId, HypId } from '../engine/types'

export interface Trail {
  x: number
  y: number
  t: number
}

export interface Ent {
  id: EntityId
  def: EntityDef
  x: number
  y: number
  vx: number
  vy: number
  /** Where it currently wants to live, eased toward the relationship's intent. */
  hx: number
  hy: number
  r: number
  scale: number
  awake: number
  phase: number
  appearAt: number
  appear: number
  /** Brief swell when touched. */
  pop: number
  /** Things that move: where they are headed. */
  tx: number
  ty: number
  nextTarget: number
  trail: Trail[]
  gaze: { x: number; y: number }
  blink: number
  nextBlink: number
  open: number
  /** 0..1 — how near the lamp is. Things wake as you approach. */
  prox: number
  fleeing: number
  trusting: number
  /** Slow outward drift when it has been ignored this visit. */
  drift: number
  rustle: number
  heading: number
  /** Which place it is in right now. Not always the one it lives in. */
  place: PlaceId
  /** Where it is meant to live now. When this changes it moves house. */
  homePlace: PlaceId
  /** Walking out through a door. */
  leaving: null | { to: PlaceId; dir: Dir }
  /** Where it has chosen to stand while visiting a place that is not its own. */
  visit: null | { x: number; y: number }
  // observation accumulators
  near: { on: boolean; since: number; acc: number; still: number; touched: boolean }
  chaseAcc: number
  tempt: null | { hyp: HypId; start: number; until: number; engaged: number; done: boolean }
}

export interface Whisper {
  text: string
  x: number
  y: number
  t0: number
  dur: number
  size: number
  rot: number
  align: 'left' | 'center'
  tint: number
}

/** A chapter heading, written on the floor. */
export interface Title {
  text: string
  roman: string
  t0: number
  dur: number
}

export interface Speck {
  x: number
  y: number
  /** Flies to an entity (the archivist) or into one letter of the floor wordmark. */
  to: EntityId | 'word'
  letter: number
  t0: number
}

/** A mote of dust in the air, lit only where the lamp reaches. */
export interface Mote {
  x: number
  y: number
  z: number
  ph: number
}

export interface Lamp {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  speed: number
  /** Where it is probably going. */
  px: number
  py: number
  down: boolean
  moved: boolean
  lastMoveAt: number
  stillFor: number
  history: { x: number; y: number; t: number }[]
}

export interface Enc {
  id: EntityId
  t: number
  p: number
  data: Record<string, number | boolean | object | undefined | { x: number; y: number; t: number }[]>
  leaving: boolean
  done: boolean
  leaveAt: number
}

export const rngOf = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
