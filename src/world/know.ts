import { FACT_BY_ID, FACTS, FAR, REACTIONS, factsOf, progressOf, unrecalled, type Fact, type FarId } from '../engine/knowledge'
import { isFar } from '../engine/places'
import { factPos, souvenirPos } from './far'
import { clamp } from './scene'
import type { World } from './World'

/**
 * Learning, and knowing. To learn something you rest the lamp on it. To *know*
 * it you have to give it back when Yadah asks, in the archive, where the
 * books are kept. Both leave something in the house.
 */

export interface Card {
  fact: string
  t0: number
  dur: number
}

export interface Quiz {
  fact: string
  options: { text: string; x: number; y: number; right: boolean }[]
  acc: Record<string, number>
  t0: number
  done: boolean
  doneAt: number
  picked?: string
}

const NOTE_ROOT: Record<FarId, number> = { japan: 261.63, ethiopia: 220, peru: 196, iceland: 246.94, india: 293.66, aotearoa: 220, morocco: 233.08 }

export function learnFact(w: World, f: Fact) {
  const prof = w.brain.profile
  const first = !prof.learned.includes(f.id)
  w.card = { fact: f.id, t0: w.t, dur: 13 }
  const root = NOTE_ROOT[f.place]
  const [x] = factPos(w, f)
  if (!first) {
    w.sound.play(root * 2, 0.06, 1.6)
    return
  }
  w.brain.observe({ t: 'learn', fact: f.id })
  w.sound.play(root, 0.1, 2.6)
  setTimeout(() => w.sound.play(root * 1.5, 0.08, 2.6), 160)
  setTimeout(() => w.sound.play(root * 2, 0.07, 3), 320)
  w.pop = 0.4
  // Yadah is learning it too
  const n = prof.learned.length
  w.say(REACTIONS[n % REACTIONS.length], clamp(x - 90, 20, w.w - 360), clamp(w.h * 0.66, 40, w.h - 40), { t0: w.t + 6.5, dur: 6, size: 24 })
  const p = progressOf(f.place, w.brain.profile.learned, w.brain.profile.recalled)
  if (p.learned === 1) w.diary(`you began to learn about ${FAR[f.place].name}.`)
  if (p.learned >= p.of) {
    w.say(`you have all five of ${FAR[f.place].name}. it is on the ledge in the hall.`, w.w * 0.09, w.h * 0.8, { t0: w.t + 11, dur: 8, size: 26 })
    w.sound.chime('listener')
    w.diary(`you came to know ${FAR[f.place].name}, a little.`)
  }
}

export function updateKnowledge(w: World, dt: number) {
  if (w.card && w.t > w.card.t0 + w.card.dur) w.card = null
  const L = w.lamp
  const live = w.phase === 'world' && !w.transition && !w.asleep

  // far places: the five small lights
  if (isFar(w.place) && live && L.moved) {
    for (const f of factsOf(w.place)) {
      const [x, y] = factPos(w, f)
      const on = Math.hypot(L.x - x, L.y - y) < 34 && L.speed < 140 && w.t > (w.factCool[f.id] ?? 0)
      w.factAcc[f.id] = on ? (w.factAcc[f.id] ?? 0) + dt : Math.max(0, (w.factAcc[f.id] ?? 0) - dt * 2)
      if ((w.factAcc[f.id] ?? 0) > 1.1) {
        w.factAcc[f.id] = 0
        w.factCool[f.id] = w.t + 4
        learnFact(w, f)
      }
    }
  }

  // the archive asks whether you kept what you were told
  if (w.place === 'archive' && live && !w.enc) {
    if (!w.quiz) maybeQuiz(w)
    else tickQuiz(w, dt)
  } else if (w.quiz && !w.quiz.done) {
    w.quiz = null
  }

  // a souvenir you stop beside says what it is
  if (w.place === 'hall' && live && L.stillFor > 1.2) {
    const prof = w.brain.profile
    Object.keys(FAR).forEach((id, i) => {
      const fid = id as FarId
      const [x, y] = souvenirPos(w, i)
      if (Math.hypot(L.x - x, L.y - y) < 40 && w.t - (w.souvenirTold[fid] ?? -99) > 25) {
        w.souvenirTold[fid] = w.t
        const p = progressOf(fid, prof.learned, prof.recalled)
        const line = p.learned >= p.of ? `${FAR[fid].name}. ${p.known >= p.of ? 'all five known.' : `all five learned, ${p.known} given back.`}` : `${FAR[fid].name}. ${p.learned} of ${p.of} so far.`
        w.say(line, clamp(x - 80, 20, w.w - 300), y - 60, { dur: 5, size: 21 })
      }
    })
  }
}

function maybeQuiz(w: World) {
  const prof = w.brain.profile
  const pool = unrecalled(prof.learned, prof.recalled)
  if (!pool.length || w.t - w.lastQuiz < 45 || w.t < 18 || !w.lamp.moved) return
  const f = FACT_BY_ID[pool[Math.floor(w.rand() * Math.min(3, pool.length))]]
  const texts = [f.a, ...f.d].sort(() => w.rand() - 0.5)
  const spots: [number, number][] = [
    [0.28, 0.78],
    [0.5, 0.84],
    [0.72, 0.78],
  ]
  w.quiz = {
    fact: f.id,
    options: texts.map((text, i) => ({ text, x: spots[i][0] * w.w, y: spots[i][1] * w.h, right: text === f.a })),
    acc: {},
    t0: w.t,
    done: false,
    doneAt: 0,
  }
  w.sound.pluck('archivist', 2, 0.08)
}

function tickQuiz(w: World, dt: number) {
  const q = w.quiz!
  const L = w.lamp
  if (q.done) {
    if (w.t > q.doneAt + 3) {
      w.quiz = null
      w.lastQuiz = w.t
    }
    return
  }
  for (const o of q.options) {
    const on = Math.hypot(L.x - o.x, L.y - o.y) < 40 && L.speed < 140
    q.acc[o.text] = on ? (q.acc[o.text] ?? 0) + dt : Math.max(0, (q.acc[o.text] ?? 0) - dt * 2)
    if ((q.acc[o.text] ?? 0) > 1.3) {
      answer(w, o.text)
      return
    }
  }
  if (w.t - q.t0 > 40) {
    q.done = true
    q.doneAt = w.t
    w.say('another time.', w.w * 0.5 - 60, w.h * 0.5, { dur: 4, size: 24 })
  }
}

function answer(w: World, text: string) {
  const q = w.quiz!
  const f = FACT_BY_ID[q.fact]
  const ok = text === f.a
  q.done = true
  q.doneAt = w.t
  q.picked = text
  w.brain.observe({ t: 'recall', fact: f.id, ok })
  if (ok) {
    w.sound.chime('archivist')
    w.say(`yes. you know it now.`, w.w * 0.5 - 100, w.h * 0.55, { dur: 5, size: 28 })
    const known = w.brain.profile.recalled.length
    if (known === 1) w.diary('you gave something back, and it stayed.')
  } else {
    w.sound.play(130.81, 0.1, 1.6)
    w.say(`not quite. it was “${f.a}”. you will have it next time.`, w.w * 0.5 - 220, w.h * 0.55, { dur: 7, size: 24 })
  }
}

export const KNOWLEDGE_TOTAL = FACTS.length
