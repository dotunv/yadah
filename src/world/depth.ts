import { PLACES, stageOf, unlocked, type PlaceId } from '../engine/places'
import { rumours } from '../engine/story'
import type { EntityId } from '../engine/types'
import { dirToward, relocate, travel } from './house'
import { clamp, type Ent, type Enc } from './scene'
import type { World } from './World'

/**
 * Knowing something better means being able to do more with it. Each
 * presence has a second way of meeting you, which it only offers once you
 * have finished the first.
 */

export const INTRO: Partial<Record<EntityId, string>> = {
  listener: 'call to it. hold, and move the light up and down.',
  wanderer: 'hold on.',
  mirror: 'look closely.',
  archivist: 'read what it wrote.',
  witness: 'listen.',
}

const NOTES = [110, 123.47, 146.83, 164.81, 196, 220, 246.94, 293.66, 329.63, 392]

/** Which second form, if any, this meeting takes. */
export function startMode(w: World, enc: Enc, e: Ent) {
  const prof = w.brain.profile
  const stage = stageOf(prof, e.id)
  if (stage < 2) return
  const d = enc.data as Record<string, unknown>
  switch (e.id) {
    case 'listener':
      d.mode = 'call'
      d.answered = 0
      d.rings = []
      break
    case 'wanderer':
      startRide(w, enc)
      break
    case 'mirror':
      if (prof.prevPath.length > 8) d.mode = 'past'
      break
    case 'archivist':
      if (prof.diary.length > 1) {
        d.mode = 'diary'
        const entries = prof.diary.slice(-7)
        d.slips = entries.map((en, i) => {
          const a = (i / entries.length) * 6.283 - 1.2
          return { x: w.w * 0.5 + Math.cos(a) * Math.min(w.w, w.h) * 0.27, y: w.h * 0.46 + Math.sin(a) * Math.min(w.w, w.h) * 0.2, text: `visit ${en.visit}: ${en.text}`, read: false }
        })
        d.read = 0
      }
      break
    case 'witness':
      d.mode = 'rumours'
      d.lines = rumours(prof, w.brain.away, w.offstage)
      d.told = 0
      d.next = 1.8
      break
  }
  const intro = INTRO[e.id]
  if (intro && (d.mode !== undefined || d.ride)) w.say(intro, clamp(e.x - 100, 20, w.w - 360), clamp(w.h * 0.84, 40, w.h - 30), { t0: w.t + 1.4, dur: 5, size: 22 })
}

/** Returns true when it has taken over this frame's progress. */
export function updateMode(w: World, enc: Enc, e: Ent, dt: number): boolean {
  const d = enc.data as Record<string, any>
  const L = w.lamp
  if (e.id === 'wanderer' && d.ride) {
    rideStep(w, enc, dt)
    return true
  }
  switch (d.mode) {
    case 'call': {
      // call and answer: the pitch is how high you hold the light
      const k = Math.max(0, Math.min(NOTES.length - 1, Math.floor((1 - L.y / w.h) * NOTES.length)))
      const freq = NOTES[k]
      if (L.down) {
        if (!d.calling) {
          d.calling = true
          d.callT = 0
          w.sound.holdStart(freq)
        }
        d.callT += dt
        d.freq = freq
        w.sound.holdSet(freq)
      } else if (d.calling) {
        d.calling = false
        w.sound.holdStop()
        if (d.callT > 0.5) {
          const f = d.freq as number
          const ans = d.answered as number
          setTimeout(() => {
            w.sound.play(f * 1.5, 0.12, 2.4)
            w.sound.play(f * (ans % 2 ? 2 : 1.25), 0.07, 2.8)
          }, 700)
          d.rings.push(w.t + 0.7)
          d.answered = ans + 1
        }
      }
      enc.p = (d.answered as number) / 5
      return true
    }
    case 'past': {
      d.t = (d.t ?? 0) + dt
      enc.p = d.t / 16
      return true
    }
    case 'diary': {
      for (const s of d.slips as { x: number; y: number; text: string; read: boolean }[]) {
        if (!s.read && Math.hypot(L.x - s.x, L.y - s.y) < 48) {
          s.read = true
          d.read++
          w.say(s.text, clamp(s.x - 40, 20, w.w - 520), clamp(s.y + 36, 40, w.h - 30), { t0: w.t, dur: 7, size: 21 })
          w.sound.play(NOTES[(d.read as number) % NOTES.length] * 2, 0.05, 1.5)
        }
      }
      enc.p = Math.min(1, (d.read as number) / Math.min(3, (d.slips as unknown[]).length))
      return true
    }
    case 'rumours': {
      d.t = (d.t ?? 0) + dt
      const lines = d.lines as string[]
      if (d.t > d.next && d.told < lines.length) {
        w.whisperAt(e, lines[d.told])
        d.told++
        d.next = d.t + 4
      }
      enc.p = d.told >= lines.length ? Math.min(1, (d.t - (d.next - 4)) / 3) : (d.told / lines.length) * 0.9
      return true
    }
  }
  return false
}

// ───────────────────────────── the wanderer's tour ─────────────────────────────

function route(w: World): PlaceId[] {
  const open = unlocked(w.brain.profile).filter((p) => p !== 'hall')
  const out: PlaceId[] = []
  if (w.place !== 'hall') out.push('hall')
  for (const p of open) {
    if (p === w.place) continue
    out.push(p, 'hall')
  }
  return out
}

function startRide(w: World, enc: Enc) {
  const r = route(w)
  if (!r.length) return
  ;(enc.data as Record<string, unknown>).ride = true
  w.ride = { stops: r, i: 0, t: 0, phase: 'go' }
  w.tug = null
}

function rideStep(w: World, enc: Enc, dt: number) {
  const ride = w.ride
  if (!ride) return
  const wd = w.byId.wanderer
  enc.p = Math.min(0.99, ride.i / ride.stops.length)
  if (w.transition) return
  const target = ride.stops[ride.i]
  if (w.place !== target) {
    // go to the next place, with it
    const dir = dirToward(w.place, target)
    if (dir) {
      w.arrivals.push({ id: 'wanderer', at: w.t + 1.4 })
      wd.place = w.place
      travel(w, dir)
    } else ride.i++
    ride.t = 0
    return
  }
  ride.t += dt
  if (ride.t === dt) w.say(PLACES[target].epigraph, w.w * 0.09, w.h * 0.36, { t0: w.t + 1.6, dur: 5, size: 28 })
  if (ride.t > 6.5) {
    ride.i++
    ride.t = 0
    if (ride.i >= ride.stops.length) {
      w.ride = null
      enc.p = 1
    }
  }
  void relocate
}
