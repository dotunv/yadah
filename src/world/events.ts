import { PLACES, stageOf, type PlaceId } from '../engine/places'
import { OPPOSITE } from '../engine/places'
import type { EntityId } from '../engine/types'
import { dirToward, doorPoint, doorsOf, insideDoor, relocate, travel } from './house'
import { clamp } from './scene'
import type { World } from './World'

/**
 * Things that happen without being asked. They arrive on a loose clock, never
 * while you are in the middle of something, and never twice in a row.
 * Most are small. Some change where you are.
 */

export interface Ghost {
  x: number
  y: number
  vx: number
  t0: number
  noted: boolean
}

interface EventDef {
  id: string
  weight: number
  can: (w: World) => boolean
  run: (w: World) => void
}

const present = (w: World, id: EntityId) => w.byId[id].place === w.place && w.byId[id].appear > 0.6

const EVENTS: EventDef[] = [
  {
    // a draught: the dust leans, the plants sway, and a door is a little more open than it was
    id: 'draft',
    weight: 3,
    can: () => true,
    run: (w) => {
      w.gust = 1
      w.gustDir = w.rand() < 0.5 ? -1 : 1
      w.flicker = 1
      w.sound.whoosh()
      for (const d of doorsOf(w)) w.doorFlash[d.dir] = 1
    },
  },
  {
    // the lamp goes out; what is awake can be seen by its own light
    id: 'blackout',
    weight: 1.2,
    can: (w) => w.t > 50,
    run: (w) => {
      w.lampOut = { t: 0, dur: 5.5 }
      w.sound.thud()
    },
  },
  {
    // the wanderer takes the lamp, and you go where it goes
    id: 'tug',
    weight: 1.6,
    can: (w) => present(w, 'wanderer') && w.brain.profile.entities.wanderer.bond >= 0.12 && w.t > 40,
    run: (w) => {
      const doors = doorsOf(w)
      const door = doors.length && w.rand() < 0.7 ? doors[Math.floor(w.rand() * doors.length)].dir : null
      w.tug = { t: 0, dur: 6, by: 'wanderer', door }
      w.whisperAt(w.byId.wanderer, 'it took the light.', 0.1)
      w.sound.pluck('wanderer', 2, 0.08)
      w.diary('the wanderer took your light, once.')
    },
  },
  {
    // someone crosses the room who is not any of them
    id: 'ghost',
    weight: 1,
    can: (w) => w.brain.profile.visits >= 2 && !w.ghost && w.t > 40,
    run: (w) => {
      const dir = w.rand() < 0.5 ? 1 : -1
      w.ghost = { x: dir > 0 ? -30 : w.w + 30, y: w.h * (0.35 + w.rand() * 0.35), vx: 52 * dir, t0: w.t, noted: false }
      w.sound.pluck('vigil', 1, 0.06)
    },
  },
  {
    // the stranger passes through on its own errand
    id: 'visit',
    weight: 1,
    can: (w) => {
      const e = w.byId.stranger
      const m = w.brain.profile.entities.stranger
      return !m.gone && e.place !== w.place && !e.leaving && Object.keys(PLACES[w.place].doors).length >= 1 && w.t > 45
    },
    run: (w) => {
      const e = w.byId.stranger
      const here = PLACES[w.place]
      const dirs = Object.keys(here.doors) as (keyof typeof here.doors)[]
      const from = dirs[0]!
      const [x, y] = insideDoor(w, from)
      e.place = w.place
      e.visit = null
      e.x = from === 'left' ? 0 : from === 'right' ? w.w : x
      e.y = from === 'up' ? 0 : from === 'down' ? w.h : y
      e.vx = e.vy = 0
      e.appear = 1
      e.appearAt = w.t - 3
      // it leaves by the far wall
      const out = OPPOSITE[from]
      e.leaving = { to: w.brain.intent().entities.stranger.place, dir: out }
      w.say('it was only passing.', clamp(w.w * 0.5 - 90, 20, w.w - 300), w.h * 0.84, { t0: w.t + 4, dur: 5, size: 22 })
    },
  },
  {
    // the listener calls, and everything else turns toward it
    id: 'call',
    weight: 2,
    can: (w) => present(w, 'listener'),
    run: (w) => {
      const l = w.byId.listener
      l.pop = 0.4
      w.sound.pluck('listener', 2, 0.12)
      setTimeout(() => w.sound.pluck('listener', 3, 0.07), 600)
      for (const e of w.present) if (e.id === 'witness') e.nextBlink = 0.2
    },
  },
]

export function updateEvents(w: World, dt: number) {
  // fading effects
  w.gust = Math.max(0, w.gust - dt * 0.5)
  w.flicker = Math.max(0, w.flicker - dt * 0.9)
  for (const k of Object.keys(w.doorFlash)) w.doorFlash[k] = Math.max(0, w.doorFlash[k] - dt * 0.25)

  // the lamp, going out
  if (w.lampOut) {
    w.lampOut.t += dt
    const t = w.lampOut.t
    w.blackout = t < 0.5 ? t / 0.5 : t > w.lampOut.dur - 1 ? Math.max(0, w.lampOut.dur - t) : 1
    if (t > w.lampOut.dur) {
      w.lampOut = null
      w.blackout = 0
      w.say('you can see them better without it.', w.w * 0.5 - 150, w.h * 0.86, { dur: 5, size: 24 })
      w.diary('the light went out for a while. you waited.')
    }
  }

  // someone crossing
  if (w.ghost) {
    const g = w.ghost
    g.x += g.vx * dt
    const dl = Math.hypot(g.x - w.lamp.x, g.y - w.lamp.y)
    if (dl < 150) g.vx *= Math.exp(-dt * 1.5)
    else g.vx = Math.sign(g.vx || 1) * Math.max(Math.abs(g.vx), 52)
    if (dl < 160 && !g.noted) {
      g.noted = true
      if (!w.brain.profile.chapters.includes('ghost')) {
        w.brain.observe({ t: 'chapter', chapter: 'ghost' })
        w.say('someone was here before you.', w.w * 0.5 - 130, w.h * 0.2, { dur: 6, size: 26 })
        w.diary('someone crossed the room, and did not stop.')
      }
    }
    if (g.x < -60 || g.x > w.w + 60) w.ghost = null
  }

  // the wanderer has the lamp
  if (w.tug) {
    const tg = w.tug
    tg.t += dt
    const e = w.byId[tg.by]
    if (e.place !== w.place || w.enc) w.tug = null
    else if (tg.t > tg.dur || (tg.door && Math.hypot(e.x - doorPoint(w, tg.door)[0], e.y - doorPoint(w, tg.door)[1]) < 110)) {
      const door = tg.door
      w.tug = null
      if (door) {
        w.arrivals.push({ id: 'wanderer', at: w.t + 2.5 })
        travel(w, door)
      }
    }
  }

  // the next thing that will happen
  if (w.phase !== 'world' || w.enc || w.asleep || w.transition || w.ride || w.tug || w.lampOut || !w.lamp.moved) return
  if (w.t < w.nextEventAt) return
  const options = EVENTS.filter((e) => e.can(w) && e.id !== w.lastEvent)
  const gift = giftEvent(w)
  const pool = gift ? [...options, gift] : options
  w.nextEventAt = w.t + 38 + w.rand() * 50
  if (!pool.length) return
  const total = pool.reduce((n, e) => n + e.weight, 0)
  let pick = w.rand() * total
  for (const e of pool) {
    pick -= e.weight
    if (pick <= 0) {
      w.lastEvent = e.id
      e.run(w)
      return
    }
  }
}

/** Something that has come to know you well enough to leave you a thing. */
function giftEvent(w: World): EventDef | null {
  const prof = w.brain.profile
  const giver = w.present.find((e) => stageOf(prof, e.id) >= 2 && e.id !== 'vigil' && !prof.gifts.some((g) => g.from === e.id) && !prof.entities[e.id].gone)
  if (!giver) return null
  return { id: 'gift', weight: 5, can: () => true, run: (ww) => ww.giveGift(giver.id) }
}

/** Run one on purpose (the debug panel, and tests). */
export function fire(w: World, id: string) {
  const ev = EVENTS.find((x) => x.id === id) ?? (id === 'gift' ? giftEvent(w) : null)
  if (ev) {
    w.lastEvent = ev.id
    ev.run(w)
  }
}

export const EVENT_IDS = [...EVENTS.map((e) => e.id), 'gift']

/** Where a ghost is, for the renderer. */
export const ghostOf = (w: World) => w.ghost

/** The part of the lamp that is not yours: pulled along by a wanderer, or led on a tour. */
export function controlLamp(w: World): boolean {
  if (w.tug || w.ride) {
    const e = w.byId[w.tug ? w.tug.by : 'wanderer']
    w.lamp.tx = e.x
    w.lamp.ty = e.y
    w.lamp.moved = true
    return true
  }
  return false
}

export const placeOfPlace = (p: PlaceId) => PLACES[p]
export { dirToward, relocate }
