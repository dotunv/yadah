import { ENTITIES } from './entities'
import { beginVisit, createProfile } from './memory'
import { statusOf } from './interpret'
import { ENTITY_IDS, HYP_IDS, type EntityId, type HypId, type Profile } from './types'

/**
 * Seed relationships for demos. They are ordinary profiles, the same shape
 * the world produces, so everything downstream treats them as real history.
 */

export interface Persona {
  id: string
  label: string
  blurb: string
  bonds: Partial<Record<EntityId, number>>
  wary?: number
  hyps: Partial<Record<HypId, [number, number]>>
  chased?: number
  keys?: number
}

export const PERSONAS: Persona[] = [
  {
    id: 'still',
    label: 'The Still One',
    blurb: 'Stays near quiet things. Waits for the strangers to come.',
    bonds: { listener: 0.85, witness: 0.65, stranger: 0.4, seed: 0.3, archivist: 0.2 },
    wary: 0.2,
    hyps: { stillness: [8, 1], patience: [7, 1], return: [3, 1], offpath: [1, 2] },
  },
  {
    id: 'chaser',
    label: 'The Chaser',
    blurb: 'Follows whatever moves. Scares the stranger off.',
    bonds: { wanderer: 0.9, mirror: 0.45, stranger: 0.15, seed: 0.1 },
    wary: 0.85,
    chased: 56,
    hyps: { pursuit: [9, 1], stillness: [1, 6], patience: [1, 4], offpath: [3, 2] },
  },
  {
    id: 'returner',
    label: 'The Returner',
    blurb: 'Goes back to the same few things, again and again.',
    bonds: { archivist: 0.85, seed: 0.7, listener: 0.5, mirror: 0.2 },
    hyps: { return: [10, 0], patience: [4, 1], offpath: [1, 3], stillness: [3, 1] },
  },
  {
    id: 'drifter',
    label: 'The Drifter',
    blurb: 'Never takes the nearest thing. Never comes back.',
    bonds: { mirror: 0.4, seed: 0.35, witness: 0.35, wanderer: 0.3, stranger: 0.3, listener: 0.3, archivist: 0.3 },
    hyps: { offpath: [9, 0], return: [0, 5], pursuit: [3, 2] },
  },
  {
    id: 'keys',
    label: 'The Keyboardist',
    blurb: 'Never reaches for the pointer.',
    bonds: { listener: 0.5, archivist: 0.6, seed: 0.5, witness: 0.4 },
    hyps: { hands: [10, 0], return: [4, 1], patience: [3, 1] },
    keys: 80,
  },
]

export function seedProfile(persona: Persona, now = Date.now()): Profile {
  let p = createProfile(now - 86_400_000 * 2)
  p = beginVisit(p, now - 86_400_000 * 2)
  p = beginVisit(p, now - 86_400_000)
  p = beginVisit(p, now)
  p.activeMs = 300_000
  for (const id of ENTITY_IDS) {
    const bond = persona.bonds[id] ?? 0
    const m = p.entities[id]
    m.bond = bond
    m.touches = bond > 0 ? Math.round(1 + bond * 6) : 0
    m.completions = bond > 0.4 ? 1 : 0
    m.dwellMs = bond * 60000
    m.firstMet = bond > 0 ? now - 86_400_000 : 0
    m.lastTouched = bond > 0 ? now - 3_600_000 : 0
    m.touchedThisVisit = false
    m.neglect = bond === 0 ? 2 : 0
    if (id === 'stranger') m.wary = persona.wary ?? 0.5
    if (id === 'stranger' || id === 'wanderer') m.chased = persona.chased ?? 0
    if (id === 'seed') m.growth = 0.2 + bond * 0.7
  }
  for (const id of HYP_IDS) {
    const [s, c] = persona.hyps[id] ?? [0, 0]
    const h = p.hyps[id]
    h.support = s
    h.contra = c
    h.status = 'unformed'
    h.status = statusOf(h)
  }
  // the places the lamp lingered, clustered where the bonds are
  const rnd = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const r = rnd(7919)
  for (const def of ENTITIES) {
    const n = Math.round((persona.bonds[def.id] ?? 0) * 14)
    for (let i = 0; i < n; i++) {
      const visit = 1 + Math.floor(r() * 2)
      p.marks.push({
        x: Math.min(0.96, Math.max(0.04, def.base[0] + (r() - 0.5) * 0.18)),
        y: Math.min(0.94, Math.max(0.06, def.base[1] + (r() - 0.5) * 0.2)),
        visit,
        w: 0.3 + r() * 0.7,
        e: def.id,
        // older marks have already faded a little
        life: visit === 1 ? 0.25 + r() * 0.5 : 0.6 + r() * 0.4,
      })
    }
  }
  p.inputs = { key: persona.keys ?? 6, click: persona.keys ? 3 : 60, move: 200 }
  p.pace = persona.id === 'still' ? 0.2 : persona.id === 'chaser' ? 0.8 : 0.5
  p.revealed = false
  return p
}
