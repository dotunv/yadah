import { HYP, confidence } from './hypotheses'
import { heldBeliefs } from './interpret'
import type { EntityId, HypId, Memory, Profile } from './types'

/**
 * What things say. Short, lowercase, never explanatory. Lines are chosen by
 * the state of the relationship, not by a counter.
 */

interface Lines {
  first: string
  again: string
  bonded: string
  done: string
  extra?: Record<string, string>
}

const V: Record<EntityId, Lines> = {
  listener: {
    first: 'it was already listening.',
    again: 'still listening.',
    bonded: 'it knows what you sound like when you hold still.',
    done: 'you stayed. it noticed.',
  },
  wanderer: {
    first: 'it doesn’t stay anywhere.',
    again: 'you followed it again.',
    bonded: 'it comes to find you now.',
    done: 'it let you keep up.',
  },
  mirror: {
    first: 'it only knows what you show it.',
    again: 'same hand. different light.',
    bonded: 'it has started to lead.',
    done: 'it kept the shape of you.',
  },
  archivist: {
    first: 'it keeps what you leave behind.',
    again: 'it has more of you now.',
    bonded: 'it remembers where you lingered.',
    done: 'nothing here is forgotten.',
    extra: { empty: 'there is nothing to keep yet.' },
  },
  stranger: {
    first: 'it doesn’t trust you yet.',
    again: 'it remembers being followed.',
    bonded: 'it let you come close.',
    done: 'it stayed.',
    extra: { slip: 'it turned away.', left: 'it left.' },
  },
  witness: {
    first: 'it has been watching.',
    again: 'it saw you leave.',
    bonded: 'it saw you before you saw it.',
    done: 'it showed you yourself.',
  },
  seed: {
    first: 'it becomes what you feed it.',
    again: 'it has changed since you were here.',
    bonded: 'it grew toward you.',
    done: 'it grew.',
  },
}

export const say = (id: EntityId, m: Memory, kind: 'touch' | 'done' | 'slip' | 'left' | 'empty'): string => {
  const v = V[id]
  if (kind === 'done') return v.done
  if (kind === 'slip' || kind === 'left' || kind === 'empty') return v.extra?.[kind] ?? v.again
  if (m.touches <= 1) return v.first
  if (id === 'stranger' && m.chased > 6 && m.bond < 0.4) return v.again
  return m.bond > 0.5 ? v.bonded : v.again
}

export const welcome = (): string[] => ['welcome back.', 'I remember how you explored.']
export const firstVisit = 'I don’t know you yet.'
export const released = 'this is how I remember you.'

export const doubt = (h: HypId) => HYP[h].doubt

/** The reveal: what Yadah noticed, in order, ending where it will begin. */
export function revealLines(p: Profile): string[] {
  const out = ['I’ve been watching how you move.']
  for (const b of heldBeliefs(p).slice(0, 3)) {
    out.push(b.positive ? HYP[b.hyp].claim : HYP[b.hyp].opposite)
  }
  const last = p.revisions[p.revisions.length - 1]
  if (last) out.push(`I was wrong once. ${HYP[last.hyp].doubt}`)
  out.push('I think I know where to begin.')
  return out
}

/** One line for the debug view: how sure it is. */
export const sure = (h: { support: number; contra: number }) => `${Math.round(confidence(h) * 100)}%`
