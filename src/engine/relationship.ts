import { ENTITIES } from './entities'
import { PLACES, guestSlot, placeOf, type PlaceId } from './places'
import { ENTITY_IDS, type EntityId, type Profile } from './types'

/**
 * Memory → relationship → world.
 *
 * This is the only place that decides what the room is like for this person.
 * It returns *intent* — where things want to be, how awake they are, what the
 * air has become — never pixels. The world makes of it what it can.
 */

export interface EntityIntent {
  gone: boolean
  /** Where it lives now: its own room, or the hall once it has come to know you. */
  place: PlaceId
  home: [number, number]
  awake: number
  scale: number
}

export interface WorldIntent {
  entities: Record<EntityId, EntityIntent>
  hue: number
  chroma: number
  /** Multiplier on the lamp's reach. */
  lamp: number
  /** Multiplier on how fast the room moves; slow people get a slow room. */
  pace: number
  /** Where the room gathers around the person. */
  hearth: [number, number]
  /** 0..1 — how fully the relationship is expressed right now. */
  expression: number
  /** How much has been built between you, 0..1. */
  closeness: number
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

export function relate(p: Profile, expression: number): WorldIntent {
  const hearth: [number, number] = [0.5, 0.58]
  const entities = {} as Record<EntityId, EntityIntent>
  let total = 0
  let vx = 0
  let vy = 0

  // things that have come home to the hall take places around the hearth
  const guests = ENTITIES.filter((d) => placeOf(p, d.id) === 'hall' && !PLACES.hall.homes[d.id]).map((d) => d.id)

  for (const def of ENTITIES) {
    const m = p.entities[def.id]
    total += m.gone ? 0 : m.bond
    const place = placeOf(p, def.id)
    let [x, y] = PLACES[place].homes[def.id] ?? guestSlot(guests.indexOf(def.id), guests.length)

    if (place === 'hall' && m.bond > 0.12) {
      // Close things in the hall come closer, and keep a place near you.
      const pull = clamp(m.bond * 0.5 * expression, 0, 0.5)
      x += (hearth[0] - x) * pull
      y += (hearth[1] - y) * pull
    }
    if (m.neglect >= 1 && m.bond < 0.22) {
      // What you walked past drifts toward the edges.
      const push = 0.1 * Math.min(m.neglect, 3) * expression
      x = 0.5 + (x - 0.5) * (1 + push)
      y = 0.5 + (y - 0.5) * (1 + push)
    }
    if (def.id === 'stranger') {
      // It keeps its distance in proportion to how wary it is.
      const away = 0.18 * m.wary * expression
      x = 0.5 + (x - 0.5) * (1 + away)
      y = 0.5 + (y - 0.5) * (1 + away)
    }
    entities[def.id] = {
      gone: m.gone,
      place,
      home: [clamp(x, 0.07, 0.93), clamp(y, 0.1, 0.9)],
      awake: clamp(m.bond * 1.5 * (0.4 + 0.6 * expression)),
      scale: 1 + 0.42 * m.bond * expression,
    }
    const a = (def.hue * Math.PI) / 180
    const w = m.bond + Math.min(0.2, m.touches * 0.02)
    vx += Math.cos(a) * w
    vy += Math.sin(a) * w
  }

  const mass = Math.hypot(vx, vy)
  const marks = Math.min(1, p.marks.length / 80)
  const colour = (1 - Math.exp(-(total * 0.9 + marks * 0.4))) * expression
  return {
    entities,
    hue: mass > 0.01 ? ((Math.atan2(vy, vx) * 180) / Math.PI + 360) % 360 : 175,
    chroma: 0.008 + 0.12 * colour,
    lamp: 1 + 0.35 * clamp(total / 3) * expression,
    pace: clamp(0.55 + 0.9 * p.pace, 0.45, 1.45),
    hearth,
    expression,
    closeness: clamp(total / ENTITY_IDS.length / 0.7),
  }
}
