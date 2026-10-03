import { DEF } from '../engine/entities'
import { FAR, type FarId } from '../engine/knowledge'
import { OPPOSITE, PLACES, isFar, unlocked, type Dir, type PlaceId } from '../engine/places'
import { SITES } from '../engine/sites'
import { pondOf } from './far'
import { deskOf } from './desk'
import { stageOf } from '../engine/places'
import type { EntityId } from '../engine/types'
import { clamp, ease, lerp, type Ent } from './scene'
import type { World } from './World'

/**
 * The house: which place you are in, its doors, the things that walk through
 * them, and the dark you pass through between one place and the next.
 */

export interface Door {
  dir: Dir
  to: PlaceId
  x: number
  y: number
  /** Half-length of the opening along its wall. */
  span: number
  /** 0..1 — how much the door has appeared. New doors fade in. */
  appear: number
}

const MOBILE = new Set<EntityId>(['listener', 'wanderer', 'mirror', 'archivist', 'stranger', 'witness'])

export const presentOf = (w: World): Ent[] => w.ents.filter((e) => e.place === w.place && !(w.brain.profile.entities[e.id].gone && e.appear < 0.02))

export function doorsOf(w: World): Door[] {
  const open = unlocked(w.brain.profile)
  const out: Door[] = []
  for (const [dir, to] of Object.entries(PLACES[w.place].doors) as [Dir, PlaceId][]) {
    if (!open.includes(to)) continue
    const horiz = dir === 'left' || dir === 'right'
    out.push({
      dir,
      to,
      x: dir === 'left' ? 0 : dir === 'right' ? w.w : w.w * 0.5,
      y: dir === 'up' ? 0 : dir === 'down' ? w.h : horiz ? w.h * 0.5 : 0,
      span: horiz ? w.h * 0.15 : w.w * 0.1,
      appear: w.doorAppear[`${w.place}:${dir}`] ?? 1,
    })
  }
  return out
}

/** The middle of a door, on the wall. */
export const doorPoint = (w: World, dir: Dir): [number, number] => [
  dir === 'left' ? 0 : dir === 'right' ? w.w : w.w * 0.5,
  dir === 'up' ? 0 : dir === 'down' ? w.h : w.h * 0.5,
]

/** The point just inside a door. */
export const insideDoor = (w: World, dir: Dir): [number, number] => {
  const m = Math.min(w.w, w.h) * 0.2
  return [dir === 'left' ? m : dir === 'right' ? w.w - m : w.w * 0.5, dir === 'up' ? m : dir === 'down' ? w.h - m : w.h * 0.5]
}

/** Walk (or cross the dark) to the next place. */
export function travel(w: World, dir: Dir) {
  if (w.transition || w.portal || w.deskOpen || w.phase !== 'world' || w.asleep) return
  const to = PLACES[w.place].doors[dir]
  if (!to || !unlocked(w.brain.profile).includes(to)) return
  if (w.enc && !w.ride) w.enc.leaving = true
  w.transition = { t: 0, to, dir, swapped: false, via: undefined }
  w.sound.whoosh()
}

export function dirToward(from: PlaceId, to: PlaceId): Dir | null {
  for (const [dir, p] of Object.entries(PLACES[from].doors) as [Dir, PlaceId][]) if (p === to) return dir
  return null
}

/** Is a point in the pond at the bottom of the garden? */
export function inPond(w: World, x: number, y: number) {
  const p = pondOf(w)
  return ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 < 1
}

/** Into the water, and out somewhere else: any of the seven far places, favouring ones you have not seen. */
export function dive(w: World, to?: FarId) {
  if (w.transition || w.phase !== 'world' || w.asleep || w.enc || w.portal) return
  if (!to) {
    // the pond opens onto a real website, favouring ones you have not been to
    const seen = (id: string) => w.brain.profile.chapters.includes(`site:${id}`)
    const pool = SITES.filter((s) => s.id !== w.lastSite).flatMap((s) => (seen(s.id) ? [s] : [s, s, s]))
    const site = pool[Math.floor(w.rand() * pool.length)]
    w.lastSite = site.id
    w.portal = { site, t: 0, told: false }
    w.sound.whoosh()
    w.sound.pluck('listener', 3, 0.06)
    return
  }
  w.lastFar = to
  w.transition = { t: 0, to, dir: 'up', swapped: false, via: 'pond' }
  w.sound.whoosh()
  w.sound.pluck('listener', 3, 0.06)
}

/** Send something to another place, walking out through a door if you can see it go. */
export function relocate(w: World, e: Ent, to: PlaceId) {
  if (e.place === to) return
  const m = w.brain.profile.entities[e.id]
  if (m.gone) return
  const from = e.place
  if (from === w.place) {
    // you can see it go. It leaves by the door toward where it is headed (through the hall if need be).
    const dir = dirToward(from, to) ?? dirToward(from, 'hall')
    if (dir) {
      e.leaving = { to: dirToward(from, to) ? to : 'hall', dir }
      return
    }
  }
  e.place = to
  e.visit = null
  if (to === w.place) {
    // it arrives where you are: through the door that leads back to where it was
    const dir = dirToward(to, from) ?? (Object.keys(PLACES[to].doors)[0] as Dir)
    const [x, y] = insideDoor(w, dir)
    const edge = dir === 'left' ? 0 : dir === 'right' ? w.w : null
    e.x = edge ?? x
    e.y = dir === 'up' ? 0 : dir === 'down' ? w.h : y
    e.vx = e.vy = 0
    e.appear = 1
    e.appearAt = w.t - 3
    e.pop = 0.15
    if (e.id === 'wanderer') w.sound.pluck('wanderer', 2, 0.04)
  } else if (e.id === 'wanderer') {
    w.offstage.push(`the wanderer went to ${PLACES[to].name}.`)
    if (w.offstage.length > 8) w.offstage.shift()
  }
}

/** The part of the sim that is about the house, not the room. */
export function updateHouse(w: World, dt: number) {
  const L = w.lamp
  const prof = w.brain.profile

  // ── passing through the dark between two places ───────────────────
  const tr = w.transition
  if (tr) {
    tr.t += dt
    w.curtainWater = tr.via === 'pond'
    w.curtain = tr.t < 0.55 ? ease(tr.t / 0.55) : tr.t < 0.65 ? 1 : 1 - ease(clamp((tr.t - 0.65) / 0.8))
    if (tr.t >= 0.55 && !tr.swapped) {
      tr.swapped = true
      swap(w, tr.to, tr.dir)
    }
    if (tr.t >= 1.5) w.transition = null
  } else if (w.portal) {
    // the water rises over the room and stays while the window is open
    w.portal.t += dt
    w.curtainWater = true
    w.curtain = lerp(w.curtain, 0.88, 1 - Math.exp(-dt * 3.2))
    if (w.portal.t > 0.9 && !w.portal.told) {
      w.portal.told = true
      w.openPortal(w.portal.site)
    }
  } else w.curtain = lerp(w.curtain, 0, 1 - Math.exp(-dt * 4))

  // ── the desk ──────────────────────────────────────────────────────
  if (w.place === 'hall' && w.phase === 'world' && !w.transition && !w.portal && !w.asleep && L.moved && !w.enc && !w.tug && !w.ride && !w.deskOpen) {
    const d = deskOf(w)
    const on = Math.abs(L.x - d.x) < d.rx && Math.abs(L.y - d.y) < d.ry && L.speed < 150
    w.deskDwell = on ? w.deskDwell + dt : Math.max(0, w.deskDwell - dt * 1.5)
    if (w.deskDwell > 1.2) {
      w.deskDwell = 0
      w.openDesk()
    }
  } else if (!w.deskOpen) w.deskDwell = Math.max(0, w.deskDwell - dt)

  // ── the pond ──────────────────────────────────────────────────────
  if (w.place === 'garden' && w.phase === 'world' && !w.transition && !w.portal && !w.asleep && L.moved && !w.enc && !w.tug && !w.ride) {
    const p = pondOf(w)
    const d = Math.hypot((L.x - p.x) / p.rx, (L.y - p.y) / p.ry)
    if (d < 2 && !w.hinted.has('pond')) {
      w.hinted.add('pond')
      w.say('it is deeper than it looks.', w.w * 0.5, w.h * 0.9, { dur: 5, size: 22 })
    }
    const on = d < 1 && L.speed < 150
    w.pondDwell = on ? w.pondDwell + dt : Math.max(0, w.pondDwell - dt * 1.5)
    if (w.pondDwell > 1.4) {
      w.pondDwell = 0
      dive(w)
    }
  } else w.pondDwell = Math.max(0, w.pondDwell - dt)

  // ── doors ─────────────────────────────────────────────────────────
  if (!w.doorArmed) {
    const near = doorsOf(w).some((d) => Math.hypot(L.x - d.x, L.y - d.y) < Math.min(w.w, w.h) * 0.26)
    if (!near && !w.transition) w.doorArmed = true
  }
  if (w.doorArmed && w.phase === 'world' && !w.transition && !w.asleep && L.moved && !w.enc && !w.tug && !w.ride) {
    for (const d of doorsOf(w)) {
      const dist = Math.hypot(L.x - d.x, L.y - d.y)
      const key = `${w.place}:${d.dir}`
      const on = dist < Math.min(w.w, w.h) * 0.16 && L.speed < 160
      w.doorDwell[key] = on ? (w.doorDwell[key] ?? 0) + dt : Math.max(0, (w.doorDwell[key] ?? 0) - dt * 2)
      if ((w.doorDwell[key] ?? 0) > 0.9) {
        w.doorDwell[key] = 0
        travel(w, d.dir)
        break
      }
    }
  }
  for (const k of Object.keys(w.doorAppear)) w.doorAppear[k] = Math.min(1, w.doorAppear[k] + dt * 0.4)

  // ── doors that were not there ─────────────────────────────────────
  w.discoverAt -= dt
  if (w.discoverAt <= 0) {
    w.discoverAt = 1
    const fresh = unlocked(prof).filter((p) => !prof.discovered.includes(p))
    if (fresh.length) {
      for (const p of fresh) {
        w.brain.observe({ t: 'discover', place: p })
        for (const [dir, to] of Object.entries(PLACES[w.place].doors) as [Dir, PlaceId][]) if (to === p) w.doorAppear[`${w.place}:${dir}`] = 0
        w.diary(`a door opened to ${PLACES[p].name}.`)
      }
      w.say(w.place === 'hall' ? 'a door that wasn’t there.' : 'somewhere, a door has opened.', w.w * 0.5 - 100, w.h * 0.82, { dur: 6, size: 26 })
      w.sound.pluck('seed', 2, 0.08)
    }
  }

  // ── things arriving after you ─────────────────────────────────────
  w.arrivals = w.arrivals.filter((a) => {
    if (w.t < a.at) return true
    const e = w.byId[a.id]
    if (e && !prof.entities[a.id].gone && e.place !== w.place) {
      const from = e.place
      relocate(w, e, w.place)
      if (from !== w.place && w.t - w.lastFollow > 10) {
        w.lastFollow = w.t
        w.whisperAt(e, 'it followed you.', 0.6)
      }
    }
    return false
  })

  // ── what has come to know you comes home ──────────────────────────
  const intent = w.brain.intent()
  for (const e of w.ents) {
    const want = intent.entities[e.id].place
    if (e.id === 'wanderer' || e.leaving || w.transition || e.homePlace === want) continue
    e.homePlace = want
    relocate(w, e, want)
    if (want === 'hall') w.diary(`${DEF[e.id].name} came to live in the hall.`)
  }

  // ── the wanderer has its own life ─────────────────────────────────
  const wd = w.byId.wanderer
  if (wd && !w.enc && w.phase === 'world' && !wd.leaving && w.t > w.hopAt) {
    w.hopAt = w.t + 50 + w.rand() * 70
    const open = unlocked(prof)
    const options = wd.place === 'hall' ? open.filter((p) => p !== 'hall') : ['hall' as PlaceId]
    if (options.length && !w.ride && !w.tug) relocate(w, wd, options[Math.floor(w.rand() * options.length)])
  }

  // ── time in one place ─────────────────────────────────────────────
  if (w.phase === 'world' && L.moved) {
    w.stayMs += dt * 1000
    if (w.stayMs >= 150000) {
      w.stayMs = 0
      w.brain.observe({ t: 'stay', ms: 150000 })
    }
  }
}

function swap(w: World, to: PlaceId, dir: Dir) {
  const prof = w.brain.profile
  const from = w.place
  // whoever is close to you and in the room will come after you (but not into the water)
  for (const e of w.ents) {
    if (isFar(to) || isFar(from) || e.place !== from || !MOBILE.has(e.id)) continue
    const m = prof.entities[e.id]
    if (!m.gone && m.bond >= 0.4 && stageOf(prof, e.id) >= 1 && !e.leaving) w.arrivals.push({ id: e.id, at: w.t + 2.2 + w.rand() * 4 })
  }
  w.place = to
  w.stayMs = 0
  w.tension = 0
  w.specks = []
  w.whispers = w.whispers.filter((s) => s.t0 > w.t - 0.1 && s.dur > 12)
  const arrive = OPPOSITE[dir]
  let [ix, iy] = insideDoor(w, arrive)
  if (isFar(to)) {
    ix = w.w * 0.5
    iy = w.h * 0.46
  } else if (to === 'garden' && isFar(from)) {
    const p = pondOf(w)
    ix = p.x
    iy = p.y - p.ry - 56
  }
  w.lamp.x = w.lamp.tx = ix
  w.lamp.y = w.lamp.ty = iy
  w.lamp.vx = w.lamp.vy = 0
  w.lamp.history = []
  w.lampHold = { x: w.ptr.x, y: w.ptr.y }
  w.doorArmed = false
  w.doorDwell = {}
  for (const e of w.ents) {
    e.near.on = false
    e.near.acc = 0
    if (e.place === to) {
      e.visit = null
      e.appearAt = w.t + 0.4 + w.rand() * 0.8
      e.appear = 0
      e.trail = []
    }
  }
  const first = !prof.chapters.includes(`place:${to}`)
  if (isFar(to) && !prof.chapters.includes('wonder')) {
    w.brain.observe({ t: 'chapter', chapter: 'wonder' })
    w.titles.push({ text: 'wonder', roman: 'VII', t0: w.t + 0.6, dur: 6 })
  }
  w.brain.observe({ t: 'travel', to, first })
  if (first) {
    w.brain.observe({ t: 'chapter', chapter: `place:${to}` })
    w.titles.push({ text: isFar(to) ? FAR[to].name : PLACES[to].name.replace('the ', ''), roman: '', t0: w.t + (isFar(to) ? 3.2 : 1.2), dur: 5 })
    w.say(PLACES[to].epigraph, w.w * 0.09, w.h * 0.36, { t0: w.t + (isFar(to) ? 4.4 : 2.4), dur: 7, size: 30 })
    w.diary(isFar(to) ? `you went through the pond, to ${FAR[to].name}.` : `you went to ${PLACES[to].name} for the first time.`)
  }
  w.sound.setPlace(to)
}
