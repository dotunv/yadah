import { FAR, FAR_IDS, type FarId } from './knowledge'
import { ENTITY_IDS, type EntityId, type Profile } from './types'

/**
 * The house. Yadah is not one room. It is a hall with three more places off
 * it, and the presences live in different ones. What you grow close to comes
 * home to the hall; what you ignore stays where it was. Doors appear when
 * you have earned them, not before.
 */

export const NEAR_IDS = ['hall', 'archive', 'garden', 'shore'] as const
export const PLACE_IDS = [...NEAR_IDS, ...FAR_IDS] as const
export type PlaceId = (typeof PLACE_IDS)[number]
export type Dir = 'left' | 'right' | 'up' | 'down'

export const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' }

export interface PlaceDef {
  id: PlaceId
  name: string
  /** The colour of the place before you have changed it. */
  hue: number
  /** Doors out, by wall. */
  doors: Partial<Record<Dir, PlaceId>>
  /** What it says the first time you arrive, and no other time. */
  epigraph: string
  /** Where its own presences live, normalised. */
  homes: Partial<Record<EntityId, [number, number]>>
}

const NEAR: Record<(typeof NEAR_IDS)[number], PlaceDef> = {
  hall: {
    id: 'hall',
    name: 'the hall',
    hue: 175,
    doors: { left: 'archive', right: 'garden', up: 'shore' },
    epigraph: 'where it keeps what it has learned.',
    homes: { listener: [0.2, 0.64], mirror: [0.81, 0.56], wanderer: [0.5, 0.3] },
  },
  archive: {
    id: 'archive',
    name: 'the archive',
    hue: 48,
    doors: { right: 'hall' },
    epigraph: 'it keeps what it can’t understand yet.',
    homes: { archivist: [0.3, 0.42], witness: [0.72, 0.62] },
  },
  garden: {
    id: 'garden',
    name: 'the garden',
    hue: 140,
    doors: { left: 'hall' },
    epigraph: 'someone planted this.',
    homes: { seed: [0.42, 0.7], stranger: [0.8, 0.3] },
  },
  shore: {
    id: 'shore',
    name: 'the shore',
    hue: 228,
    doors: { down: 'hall' },
    epigraph: 'it holds a place for someone.',
    homes: { vigil: [0.5, 0.64] },
  },
}

/** The far places: reached only through the pond, and left by the door at the bottom. */
const FARS = Object.fromEntries(
  FAR_IDS.map((id) => [id, { id, name: FAR[id].name.toLowerCase(), hue: FAR[id].hue, doors: { down: 'garden' }, epigraph: FAR[id].epigraph, homes: {} } as PlaceDef]),
) as Record<FarId, PlaceDef>

export const PLACES: Record<PlaceId, PlaceDef> = { ...NEAR, ...FARS }

export const isFar = (p: PlaceId): p is FarId => (FAR_IDS as readonly string[]).includes(p)

/** Where each presence lives until it comes to know you. */
export const NATIVE = Object.fromEntries(
  ENTITY_IDS.map((id) => [id, PLACE_IDS.find((p) => PLACES[p].homes[id]) as PlaceId]),
) as Record<EntityId, PlaceId>

/** The ones that can leave their room for yours. The seed and the vigil cannot be carried. */
const MOBILE = new Set<EntityId>(['listener', 'wanderer', 'mirror', 'archivist', 'stranger', 'witness'])

/** Close enough to come home. */
export function placeOf(p: Profile, id: EntityId): PlaceId {
  const m = p.entities[id]
  if (m.gone) return NATIVE[id]
  return MOBILE.has(id) && m.bond >= 0.55 && m.completions >= 1 ? 'hall' : NATIVE[id]
}

export const stageOf = (p: Profile, id: EntityId) => Math.min(3, p.entities[id].completions)

const totalCompletions = (p: Profile) => ENTITY_IDS.reduce((n, id) => n + p.entities[id].completions, 0)

/** Which places have been opened to this person. */
export function unlocked(p: Profile): PlaceId[] {
  const out: PlaceId[] = ['hall', 'archive']
  const c = totalCompletions(p)
  if (c >= 1 || p.activeMs >= 100_000) out.push('garden')
  if (c >= 2 || p.ended || (p.visits >= 2 && c >= 1)) out.push('shore')
  return out
}

/** Slots around the hearth for things that have come home. */
export const guestSlot = (i: number, n: number): [number, number] => {
  const a = Math.PI * (0.12 + (0.76 * (n <= 1 ? 0.5 : i / (n - 1))))
  return [0.5 + 0.3 * Math.cos(a), 0.6 + 0.2 * Math.sin(a)]
}
