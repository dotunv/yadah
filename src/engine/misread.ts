import { DEF } from './entities'
import type { EntityId, HypId, MisreadKind } from './types'

/**
 * Yadah names why you did what you did, fluently, and is sometimes wrong.
 * It sees *that* you left, *that* you stopped. It does not see why. These
 * lines are what it makes up. Some can be corrected by what you do next;
 * most stand uncorrected, like a stranger's confident guess.
 */

export interface MisreadDef {
  kind: MisreadKind
  /** What it says in the moment, about the thing. */
  line: (e: EntityId | null) => string
  /** What it later says to you, directly. */
  claim: (e: EntityId | null) => string
  /** If what you do next contradicts it. */
  correction?: { hyp: HypId; within: number; by: 'return' | 'fast'; says: string }
}

const name = (e: EntityId | null) => (e ? DEF[e].name : 'something')

export const MISREADS: Record<MisreadKind, MisreadDef> = {
  afraid: {
    kind: 'afraid',
    line: () => 'you were afraid of it.',
    claim: (e) => `You were afraid of ${name(e)}.`,
    correction: { hyp: 'return', within: 25, by: 'return', says: 'no. you came back.' },
  },
  tired: {
    kind: 'tired',
    line: () => 'you were tired.',
    claim: () => 'You were tired.',
    correction: { hyp: 'pursuit', within: 10, by: 'fast', says: 'not tired. I see.' },
  },
  vanity: {
    kind: 'vanity',
    line: () => 'you like to watch yourself move.',
    claim: () => 'You like to watch yourself move.',
  },
  looking: {
    kind: 'looking',
    line: () => 'you were looking for something.',
    claim: () => 'You were looking for something.',
  },
  light: {
    kind: 'light',
    line: () => 'you stopped because of the light.',
    claim: () => 'You stopped because of the light.',
  },
}

/** Which misreading, if any, a given moment invites. */
export function misreadFor(trigger: 'leave' | 'complete' | 'mark', id: EntityId | null): MisreadKind | null {
  if (trigger === 'leave') return 'afraid'
  if (trigger === 'mark') return 'light'
  if (id === 'listener') return 'tired'
  if (id === 'mirror') return 'vanity'
  if (id === 'witness') return 'looking'
  return null
}
