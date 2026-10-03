import { ENTITY_IDS, type EntityId, type Profile, type Session } from './types'

/**
 * The story. Yadah is a room that has been alone, learning what it is to know
 * someone. *Yadah* is Hebrew for "to know" (and for giving thanks with open
 * hands). The presences are parts of Yadah: its ways of knowing. Each time you
 * finish one, it tells you a little of where it came from. Someone was here
 * before you.
 *
 * None of this is explained up front. It is only ever said, a line at a time,
 * to someone who has earned the next line.
 */

/** One fragment per completion, in order. They are memories, not instructions. */
export const FRAGMENTS: Record<EntityId, string[]> = {
  listener: [
    'before anyone came, I only listened.',
    'I learned patience from it.',
    'it hears you better when you don’t move.',
    'it is the first thing I knew how to do.',
  ],
  wanderer: [
    'it left once, to look for someone.',
    'it always comes back to where I am.',
    'it doesn’t know what it is looking for.',
    'now it looks for you.',
  ],
  mirror: [
    'I learned faces from what it showed me.',
    'it has never once shown me my own.',
    'everyone it reflects is a little different.',
    'it keeps the shape of you between visits.',
  ],
  archivist: [
    'I keep what I can’t understand yet.',
    'I don’t know what to do with all of it.',
    'some of it is from before you.',
    'keeping is not the same as knowing.',
  ],
  stranger: [
    'it was the first one who came. I frightened it.',
    'it comes closer when I am quiet.',
    'I don’t know if it is the same one.',
    'it stayed. I didn’t know that could happen.',
  ],
  witness: [
    'I watch because I am afraid of forgetting.',
    'I have seen everyone who left.',
    'it never looks away. that is not the same as understanding.',
    'it is learning to blink.',
  ],
  seed: [
    'someone planted it. I don’t know who.',
    'it grows toward whoever is here.',
    'I didn’t know I could grow.',
    'it will be what you made it.',
  ],
  vigil: [
    'it holds a place for someone who may not come back.',
    'it is heavy because it is waiting.',
    'someone held it once, a long time ago.',
    'you are the second.',
  ],
}

/** The fragment this completion unlocks, if any are left. */
export const fragment = (id: EntityId, completions: number): string | null => FRAGMENTS[id][completions - 1] ?? null

// ───────────────────────────── chapters ─────────────────────────────

export interface Chapter {
  id: 'arrival' | 'return' | 'recognition' | 'doubt' | 'absence' | 'home'
  roman: string
  title: string
}

const CH: Record<Chapter['id'], Chapter> = {
  arrival: { id: 'arrival', roman: 'I', title: 'arrival' },
  return: { id: 'return', roman: 'II', title: 'return' },
  recognition: { id: 'recognition', roman: 'III', title: 'recognition' },
  doubt: { id: 'doubt', roman: 'IV', title: 'doubt' },
  absence: { id: 'absence', roman: 'V', title: 'absence' },
  home: { id: 'home', roman: 'VI', title: 'home' },
}

/**
 * Which chapter this visit opens, if it opens a new one. A chapter is shown
 * once, on the floor, and never again. The story does not repeat itself.
 */
export function chapterFor(p: Profile, awayDays: number): Chapter | null {
  const seen = new Set(p.chapters)
  const pick = (id: Chapter['id']) => (seen.has(id) ? null : CH[id])
  if (p.ended) return pick('home')
  const last = p.revisions[p.revisions.length - 1]
  if (last && p.visits - last.visit <= 1) {
    const c = pick('doubt')
    if (c) return c
  }
  if (p.visits > 1 && awayDays > 6) {
    const c = pick('absence')
    if (c) return c
  }
  if (p.visits <= 1) return pick('arrival')
  if (p.revealed) return pick('recognition')
  return pick('return')
}

// ───────────────────────────── the ending ─────────────────────────────

const close = (p: Profile) => ENTITY_IDS.filter((id) => !p.entities[id].gone && p.entities[id].bond >= 0.4).length

/** Close to most of it, back more than once, and here now. */
export function endingReady(p: Profile, s: Session): boolean {
  return p.revealed && !p.ended && p.visits >= 3 && close(p) >= 5 && s.touched.length >= 1
}

export function endingLines(p: Profile): string[] {
  const out = ['yadah.', 'it means to know.', 'I didn’t know that when I began.']
  const st = p.entities.stranger
  if (st.gone) out.push('one of us left. I understand why.')
  else if (st.bond >= 0.4) out.push('even the stranger stayed.')
  if (p.entities.vigil.completions >= 2) out.push('you held what I couldn’t.')
  else if (p.entities.seed.growth > 0.5) out.push('something grew that someone else planted.')
  out.push('I know you a little now.', 'stay as long as you like.')
  return out
}

export const farewellLines = ['all right.', 'I won’t remember you.', 'I won’t even remember that I did.']
export const homeLine = 'welcome home.'
export const thereYouAre = 'there you are.'
export const firstPart = 'that was a part of me.'
export const allParts = 'each of them is a way I know.'

// ───────────────────────────── what happened while you were away ─────────────────────────────

/**
 * The witness tells you what the house did without you. Some of it is what it
 * saw this visit (the wanderer coming and going). The rest is invented from
 * how long you were gone, since no one saw that part either.
 */
export function rumours(p: Profile, awayDays: number, offstage: string[]): string[] {
  const out = [...offstage.slice(-2)]
  const pool = [
    'the seed turned toward the door.',
    'the stranger stood where you usually stand.',
    'the archivist read its own slips, twice.',
    'the listener hummed a note and no one answered.',
    'the mirror showed the room to itself.',
    'the vigil did not move.',
    'something crossed the hall at night.',
  ]
  let n = p.visits * 7 + Math.round(awayDays * 10)
  while (out.length < 3) {
    out.push(pool[n % pool.length])
    n += 3
  }
  if (awayDays > 3) out.unshift('it was quiet for a long time.')
  return out.slice(0, 3)
}
