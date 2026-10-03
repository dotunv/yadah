import { VISIBLE } from './catalog'
import { confidenceOf } from './model'
import type { InterfaceState, Kind, Profile } from './types'

/**
 * Profile ──► InterfaceState.
 *
 * Pure and UI-agnostic. Components read the resulting state; they never read
 * traits directly. Changing how the interface responds to behavior means
 * editing this file only.
 */

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** How strongly the interface expresses what it has learned. */
export function appliedOf(profile: Profile): number {
  const c = confidenceOf(profile)
  // Before the reveal the changes are deliberately subtle (at most ~0.4).
  // After "Enter your version" the profile is expressed in full.
  return profile.revealed ? 1 : clamp(0.1 + 0.3 * c, 0, 0.4) * (profile.evidence < 1.5 ? profile.evidence / 1.5 : 1)
}

export function deriveInterface(profile: Profile, applied = appliedOf(profile), reducedMotion = false): InterfaceState {
  const t = profile.traits
  // Signed deviation from neutral, already scaled by how much we express: [-1, 1]
  const d = (k: keyof typeof t) => (t[k] - 0.5) * 2 * applied

  const dv = d('visual_interest')
  const dr = d('reading_interest')
  const de = d('exploration_level')
  const ds = d('interaction_speed')
  const dk = d('keyboard_preference')
  const dp = d('repeat_interest')
  const da = d('animation_preference')

  // Which kind of thing does this person lean toward?
  let dominant: Kind | null = null
  let mode: InterfaceState['mode'] = 'neutral'
  if (dv > 0.28 && dv >= dr) {
    dominant = 'visual'
    mode = 'immersive'
  } else if (dr > 0.28 && dr > dv) {
    dominant = 'reading'
    mode = 'editorial'
  }

  const scale: Record<Kind, number> = {
    visual: 1 + 0.8 * dv,
    reading: 1 + 0.5 * dr,
    interactive: 1 + 0.15 * (dv + dr + de) / 3,
  }
  // The thing you skip shrinks, a little.
  if (dv < 0) scale.visual = 1 + 0.35 * dv
  if (dr < 0) scale.reading = 1 + 0.35 * dr

  const kindPull: Record<Kind, number> = {
    visual: clamp(0.3 * dv, -0.2, 0.3),
    reading: clamp(0.3 * dr, -0.2, 0.3),
    interactive: 0,
  }

  // Colour: looking people get saturation; reading people get warm paper tones.
  const chroma = clamp(0.18 + 0.7 * Math.max(0, dv) + 0.25 * Math.max(0, de) - 0.1 * Math.max(0, dr), 0.1, 1)
  const hueVec = [
    { h: 318, w: 0.4 + Math.max(0, dv) * 2 }, // looking → magenta/violet
    { h: 38, w: 0.4 + Math.max(0, dr) * 2 }, // reading → amber
    { h: 172, w: 0.4 + Math.max(0, de) * 2 }, // exploring → teal
    { h: 215, w: 0.8 }, // neutral → cool grey-blue
  ]
  let x = 0
  let y = 0
  for (const { h, w } of hueVec) {
    x += Math.cos((h * Math.PI) / 180) * w
    y += Math.sin((h * Math.PI) / 180) * w
  }
  const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360

  const textDepth: InterfaceState['textDepth'] = dr > 0.5 ? 2 : dr > 0.2 ? 1 : dr < -0.3 ? -1 : 0
  const dense = Math.max(0, dr)
  const type = {
    size: lerp(18, 16.5, dense),
    leading: lerp(1.68, 1.5, dense),
    measure: Math.round(lerp(58, 74, dense)),
    columns: (textDepth === 2 ? 2 : 1) as 1 | 2,
  }

  const spatial = de > 0.22
  const spread = spatial ? 1 + 0.45 * clamp(de, 0, 1) : 1

  const quiet = reducedMotion || da < -0.35
  const motion = {
    // Transitions: shorter and quieter if animation is unwanted, a bit richer if enjoyed.
    duration: quiet ? 0.45 : clamp(1 + 0.25 * da - 0.18 * ds, 0.5, 1.3),
    // Ambient drift: slows when the person is slow, stills when they dislike motion.
    ambient: quiet ? 0.25 : clamp(1 + 0.7 * ds + 0.2 * da, 0.25, 1.6),
    parallax: quiet ? 0 : clamp(0.5 + 0.7 * da, 0.1, 1.2),
    trails: !quiet && da > 0.25,
    quiet,
  }

  const surfaced: Record<string, number> = {}
  for (const o of VISIBLE) {
    const opens = profile.objects[o.id]?.opens ?? 0
    if (opens >= 2) {
      const strength = clamp((opens - 1) / 3) * clamp(0.35 + 0.9 * Math.max(0, dp) + 0.4 * applied)
      if (strength > 0.05) surfaced[o.id] = strength
    }
  }

  return {
    applied,
    confidence: confidenceOf(profile),
    mode,
    dominant,
    scale,
    chroma,
    hue,
    textDepth,
    type,
    spatial,
    spread,
    hiddenVisible: de > 0.18,
    keyboard: { hints: dk > 0.3, numberKeys: dk > 0.18, ring: 1 + 2.2 * Math.max(0, dk) },
    motion,
    surfaced,
    kindPull,
  }
}

/** Plain-language list of what is different about this interface right now. */
export function describeChanges(ui: InterfaceState): string[] {
  const out: string[] = []
  if (ui.mode === 'immersive') out.push('Images are larger, and open edge to edge.')
  if (ui.mode === 'editorial') out.push('Writing is given room, set denser, with margin notes.')
  if (ui.textDepth === -1) out.push('Text is cut down to a single line.')
  if (ui.spatial) out.push('The page is bigger than the window. Drag, or use the arrows, to move through it.')
  if (ui.hiddenVisible) out.push('Hidden things appear near the edges.')
  if (Object.keys(ui.surfaced).length) out.push('What you keep returning to has moved closer.')
  if (ui.keyboard.hints) out.push('Keyboard shortcuts are shown and numbered.')
  if (ui.motion.quiet) out.push('Motion is shorter and quieter.')
  else if (ui.motion.ambient < 0.7) out.push('Ambient motion has slowed to your pace.')
  return out
}
