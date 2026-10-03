import { createProfile } from './model'
import type { Profile, Traits } from './types'

/**
 * Seed profiles for demos and tests. They are ordinary Profiles — the same
 * shape the model produces — so everything downstream treats them as real.
 */

export interface Persona {
  id: string
  label: string
  blurb: string
  traits: Traits
  opens: Record<string, number>
}

export const PERSONAS: Persona[] = [
  {
    id: 'looker',
    label: 'The Looker',
    blurb: 'Lingers on visuals, skips text, circles back.',
    traits: { visual_interest: 0.92, reading_interest: 0.12, exploration_level: 0.55, interaction_speed: 0.55, keyboard_preference: 0.15, repeat_interest: 0.78, animation_preference: 0.85 },
    opens: { tide: 4, ember: 3, lattice: 1, letters: 1 },
  },
  {
    id: 'reader',
    label: 'The Reader',
    blurb: 'Reads to the end. Slow. Quiet.',
    traits: { visual_interest: 0.2, reading_interest: 0.93, exploration_level: 0.3, interaction_speed: 0.25, keyboard_preference: 0.45, repeat_interest: 0.5, animation_preference: 0.25 },
    opens: { letters: 3, slowness: 3, margins: 2, tide: 1 },
  },
  {
    id: 'wanderer',
    label: 'The Wanderer',
    blurb: 'Jumps between unrelated things. Finds the hidden.',
    traits: { visual_interest: 0.6, reading_interest: 0.45, exploration_level: 0.96, interaction_speed: 0.8, keyboard_preference: 0.3, repeat_interest: 0.3, animation_preference: 0.7 },
    opens: { tide: 1, margins: 1, lattice: 1, slowness: 1, ember: 1, instrument: 1, letters: 1 },
  },
  {
    id: 'keyboardist',
    label: 'The Keyboardist',
    blurb: 'Never touches the mouse.',
    traits: { visual_interest: 0.5, reading_interest: 0.65, exploration_level: 0.45, interaction_speed: 0.7, keyboard_preference: 0.97, repeat_interest: 0.55, animation_preference: 0.4 },
    opens: { letters: 2, instrument: 3, lattice: 1, slowness: 1 },
  },
]

export function seedProfile(persona: Persona, now = Date.now()): Profile {
  const p = createProfile(now)
  p.sessions = 1
  p.evidence = 22
  p.traits = { ...persona.traits }
  p.activeMs = 240_000
  p.lastSessionMs = 240_000
  for (const [id, opens] of Object.entries(persona.opens)) {
    p.objects[id] = { opens, dwellMs: opens * 9000, seen: opens + 1, lastOpened: now, maxDepth: 3, skips: 0, reads: 0 }
  }
  p.kindDwell = {
    visual: persona.traits.visual_interest * 60000,
    reading: persona.traits.reading_interest * 60000,
    interactive: 30000,
  }
  p.inputs = { key: Math.round(persona.traits.keyboard_preference * 60), click: 30, hover: 30, drag: 10, wheel: 10 }
  p.favorite = Object.entries(persona.opens).sort((a, b) => b[1] - a[1])[0][0]
  return p
}
