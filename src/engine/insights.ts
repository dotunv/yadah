import { NEUTRAL_TRAITS } from './model'
import type { Profile } from './types'

export interface Insight {
  text: string
  /** How strongly the data supports it, 0..1. */
  strength: number
  /** Which traits it speaks to, for the portrait to light up. */
  traits: string[]
}

/** Turn a profile into at most `n` honest sentences, strongest first. */
export function insightsOf(p: Profile, n = 3): Insight[] {
  const t = p.traits
  const dev = (v: number) => Math.abs(v - NEUTRAL_TRAITS.visual_interest) * 2
  const c: Insight[] = []

  const look = t.visual_interest - t.reading_interest
  if (look > 0.14) c.push({ text: 'You spend more time looking than reading.', strength: look, traits: ['visual_interest', 'reading_interest'] })
  else if (look < -0.14) c.push({ text: 'You would rather read than look. Words earn your time.', strength: -look, traits: ['visual_interest', 'reading_interest'] })

  if (t.exploration_level > 0.6) c.push({ text: 'You rarely follow the obvious path.', strength: dev(t.exploration_level), traits: ['exploration_level'] })
  else if (t.exploration_level < 0.4) c.push({ text: 'You follow one thread to its end before starting another.', strength: dev(t.exploration_level), traits: ['exploration_level'] })

  if (t.repeat_interest > 0.6) c.push({ text: 'You revisit the things you find interesting.', strength: dev(t.repeat_interest), traits: ['repeat_interest'] })
  else if (t.repeat_interest < 0.38) c.push({ text: 'You rarely look back. Once seen, you move on.', strength: dev(t.repeat_interest) * 0.8, traits: ['repeat_interest'] })

  if (t.keyboard_preference > 0.62) c.push({ text: 'Your hands stay on the keyboard.', strength: dev(t.keyboard_preference), traits: ['keyboard_preference'] })

  if (t.interaction_speed < 0.38) c.push({ text: 'You move slowly, and on purpose.', strength: dev(t.interaction_speed), traits: ['interaction_speed'] })
  else if (t.interaction_speed > 0.62) c.push({ text: 'You move quickly. You know what you are looking for.', strength: dev(t.interaction_speed), traits: ['interaction_speed'] })

  if (t.animation_preference < 0.36) c.push({ text: 'You would rather the interface stayed quiet.', strength: dev(t.animation_preference), traits: ['animation_preference'] })
  else if (t.animation_preference > 0.66) c.push({ text: 'You enjoy it when things move.', strength: dev(t.animation_preference), traits: ['animation_preference'] })

  c.sort((a, b) => b.strength - a.strength)
  const out = c.slice(0, n)
  if (out.length === 0) out.push({ text: 'You are hard to read. I am still learning.', strength: 0, traits: [] })
  return out
}

export const TRAIT_LABEL: Record<string, string> = {
  visual_interest: 'looking',
  reading_interest: 'reading',
  exploration_level: 'wandering',
  interaction_speed: 'pace',
  keyboard_preference: 'keys',
  repeat_interest: 'returning',
  animation_preference: 'motion',
}
