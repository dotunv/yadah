import type { EntityId } from './types'

export interface EntityDef {
  id: EntityId
  name: string
  /** Pigment this entity gives the world as you grow close to it. */
  hue: number
  /** Where it lives before it knows you, normalised to the room. */
  base: [number, number]
  /** Body radius as a fraction of the room's short side. */
  size: number
  /** Does not explain itself. Patience is measured against these. */
  opaque: boolean
  /** Holds still. Stillness is measured against these. */
  still: boolean
  /** Keeps moving on its own. */
  moves: boolean
}

export const ENTITIES: EntityDef[] = [
  { id: 'listener', name: 'the listener', hue: 205, base: [0.2, 0.62], size: 0.085, opaque: false, still: true, moves: false },
  { id: 'wanderer', name: 'the wanderer', hue: 70, base: [0.52, 0.3], size: 0.045, opaque: false, still: false, moves: true },
  { id: 'mirror', name: 'the mirror', hue: 235, base: [0.8, 0.56], size: 0.075, opaque: false, still: false, moves: false },
  { id: 'archivist', name: 'the archivist', hue: 28, base: [0.17, 0.22], size: 0.07, opaque: false, still: true, moves: false },
  { id: 'stranger', name: 'the stranger', hue: 295, base: [0.86, 0.18], size: 0.065, opaque: true, still: false, moves: true },
  { id: 'witness', name: 'the witness', hue: 150, base: [0.6, 0.8], size: 0.07, opaque: true, still: true, moves: false },
  { id: 'seed', name: 'the seed', hue: 8, base: [0.37, 0.86], size: 0.055, opaque: true, still: true, moves: false },
]

export const DEF = Object.fromEntries(ENTITIES.map((e) => [e.id, e])) as Record<EntityId, EntityDef>
