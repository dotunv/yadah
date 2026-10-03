import type { Brain } from '../brain'
import { DEF, ENTITIES } from '../engine/entities'
import { HYP, HYPS, confidence } from '../engine/hypotheses'
import { revealLines, say, doubt, welcome, firstVisit, released } from '../engine/voice'
import type { EntityId, HypId, Obs } from '../engine/types'
import { render } from './draw'
import { clamp, ease, lerp, rngOf, type Ent, type Enc, type Lamp, type Speck, type Whisper } from './scene'

export type Phase = 'world' | 'reveal' | 'release'

export interface WorldHooks {
  whisper?: (text: string) => void
  phase?: (p: Phase) => void
  /** Reveal text is finished and the person can choose to begin. */
  awaiting?: (v: boolean) => void
  beacon?: (v: boolean) => void
}

const ENC_LEN: Record<EntityId, number> = { listener: 6, wanderer: 8, mirror: 3500, archivist: 3, stranger: 7, witness: 12, seed: 4 }

/**
 * The room. A continuous simulation that never stops: things breathe, drift,
 * notice the lamp, and remember. It reads relationship intent from the Brain
 * and reports what the lamp does as observations.
 */
export class World {
  w = 0
  h = 0
  dpr = 1
  t = 0
  ents: Ent[] = []
  byId = {} as Record<EntityId, Ent>
  lamp: Lamp = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, speed: 0, px: 0, py: 0, down: false, moved: false, lastMoveAt: 0, stillFor: 0, history: [] }
  whispers: Whisper[] = []
  specks: Speck[] = []
  enc: Enc | null = null
  dim = 0
  phase: Phase = 'world'
  atm = { hue: 175, chroma: 0.008, lamp: 1, pace: 1 }
  motion = 1
  reduced = false
  focus: EntityId | null = null

  // reveal
  revealT = 0
  revealLines: string[] = []
  releaseT = 0
  awaiting = false

  // beacon (the held breath)
  beacon = { vis: 0, dwell: 0, on: false }
  private beaconCooldown = 0

  // memory made visible
  private markAcc = 0
  private lastTouch: { x: number; y: number } | null = null
  private meet: { x: number; y: number; until: number } | null = null
  private lastProbe = -30
  private rand: () => number
  private raf = 0
  private last = 0
  private welcomeDone = false
  readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, readonly brain: Brain, private hooks: WorldHooks = {}) {
    this.canvas = canvas
    this.rand = rngOf(1009 * (brain.profile.visits + 1))
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    this.motion = this.reduced ? 0.4 : 1
    this.resize()
    const i = brain.intent()
    this.atm = { hue: i.hue, chroma: i.chroma, lamp: i.lamp, pace: i.pace }
    this.spawn()
    this.bind()
    // Where the lamp rests until someone moves it.
    this.lamp.x = this.lamp.tx = this.w * 0.5
    this.lamp.y = this.lamp.ty = this.h * 0.84
    this.t = 0
    this.greet()
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  // ───────────────────────────── setup ─────────────────────────────
  private spawn() {
    const i = this.brain.intent()
    const returning = this.brain.returning
    ENTITIES.forEach((def, n) => {
      const it = i.entities[def.id]
      const hx = it.home[0] * this.w
      const hy = it.home[1] * this.h
      const start = returning ? [i.hearth[0] * this.w, i.hearth[1] * this.h] : [hx, hy]
      const e: Ent = {
        id: def.id, def, x: start[0], y: start[1], vx: 0, vy: 0, hx, hy,
        r: 0, scale: 1, awake: 0, phase: this.rand() * 6.28,
        appearAt: (returning ? 3.2 : 0.8) + n * (returning ? 0.45 : 0.55), appear: 0, pop: 0,
        tx: hx, ty: hy, nextTarget: 0, trail: [], gaze: { x: 0, y: 0 }, blink: 0, nextBlink: 2 + this.rand() * 4,
        open: 0, fleeing: 0, trusting: 0, drift: 0, rustle: 0, heading: 0,
        near: { on: false, since: 0, acc: 0, still: 0, touched: false },
        chaseAcc: 0, tempt: null,
      }
      this.ents.push(e)
      this.byId[def.id] = e
    })
    this.layout()
  }

  private greet() {
    if (this.welcomeDone) return
    this.welcomeDone = true
    if (this.brain.returning) {
      const [a, b] = welcome()
      this.say(a, this.w * 0.09, this.h * 0.4, { t0: 1.2, dur: 6, size: 54 })
      this.say(b, this.w * 0.09, this.h * 0.4 + 56, { t0: 3.6, dur: 7, size: 30 })
    } else {
      this.say(firstVisit, this.w * 0.09, this.h * 0.4, { t0: 3, dur: 7, size: 34 })
    }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.w = r.width
    this.h = r.height
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    const s = Math.min(this.w, this.h)
    for (const e of this.ents) e.r = s * e.def.size
    ;(this as { onResize?: () => void }).onResize?.()
  }

  private layout() {
    const s = Math.min(this.w, this.h)
    for (const e of this.ents) e.r = s * e.def.size
  }

  // ───────────────────────────── input ─────────────────────────────
  private cleanup: (() => void)[] = []
  private bind() {
    const c = this.canvas
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      this.lamp.tx = e.clientX - r.left
      this.lamp.ty = e.clientY - r.top
      if (!this.lamp.moved) {
        this.lamp.moved = true
        this.lamp.x = this.lamp.tx
        this.lamp.y = this.lamp.ty
        if (this.brain.returning) this.meet = { x: this.lamp.tx, y: this.lamp.ty, until: this.t + 9 }
      }
      this.lamp.lastMoveAt = this.t
      this.focus = null
    }
    const onDown = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      this.lamp.tx = e.clientX - r.left
      this.lamp.ty = e.clientY - r.top
      this.lamp.down = true
      if (e.pointerType !== 'mouse') {
        this.lamp.x = this.lamp.tx
        this.lamp.y = this.lamp.ty
        this.lamp.moved = true
      }
      this.press('pointer')
    }
    const onUp = () => (this.lamp.down = false)
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.debug')) return
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      if (arrows[e.key]) {
        e.preventDefault()
        const hands = this.brain.profile.hyps.hands
        const step = hands.status === 'held' ? 120 : 80
        this.lamp.moved = true
        this.lamp.tx = clamp(this.lamp.tx + arrows[e.key][0] * step, 10, this.w - 10)
        this.lamp.ty = clamp(this.lamp.ty + arrows[e.key][1] * step, 10, this.h - 10)
        this.lamp.lastMoveAt = this.t
        this.focus = null
        return
      }
      if (e.key === 'Enter' || (e.key === ' ' && !this.enc)) {
        if ((e.target as HTMLElement)?.tagName === 'BUTTON') return
        e.preventDefault()
        this.press('key')
      }
      if (e.key === ' ' && this.enc?.id === 'seed') {
        this.lamp.down = true
      }
      if (e.key === 'Escape') this.escape()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') this.lamp.down = false
    }
    const onResize = () => this.resize()
    c.addEventListener('pointermove', onMove, { passive: true })
    c.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('resize', onResize)
    this.cleanup.push(() => {
      c.removeEventListener('pointermove', onMove)
      c.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
    })
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.cleanup.forEach((f) => f())
  }

  /** A touch: with the pointer, or Enter beside something. */
  press(via: 'pointer' | 'key') {
    if (this.phase !== 'world') return
    if (this.beacon.on && Math.hypot(this.lamp.x - this.w * 0.5, this.lamp.y - this.h * 0.9) < 90) {
      this.startReveal()
      return
    }
    if (this.enc && !this.enc.leaving) {
      const e = this.byId[this.enc.id]
      if (this.enc.id !== 'seed' && this.enc.id !== 'wanderer' && Math.hypot(this.lamp.x - e.x, this.lamp.y - e.y) > e.r * e.scale * 3.4 + 120) this.leave()
      return
    }
    // nearest thing within reach of the lamp
    let best: Ent | null = null
    let bd = Infinity
    for (const e of this.ents) {
      if (e.appear < 0.6) continue
      const d = Math.hypot(this.lamp.x - e.x, this.lamp.y - e.y)
      const reach = e.r * e.scale * 1.7 + 38
      if (d < reach && d < bd) {
        best = e
        bd = d
      }
    }
    if (best) this.touch(best, via)
  }

  /** From the accessible controls. */
  touchEntity(id: EntityId) {
    const e = this.byId[id]
    this.lamp.tx = this.lamp.x = e.x
    this.lamp.ty = this.lamp.y = e.y + e.r * 0.2
    this.lamp.moved = true
    this.touch(e, 'key')
  }

  focusEntity(id: EntityId | null) {
    this.focus = id
    if (id) {
      const e = this.byId[id]
      this.lamp.tx = e.x
      this.lamp.ty = e.y + e.r * 0.4
      this.lamp.moved = true
      this.lamp.lastMoveAt = this.t
    }
  }

  private escape() {
    if (this.phase === 'reveal') this.cancelReveal()
    else if (this.enc) this.leave()
  }

  // ───────────────────────────── encounters ─────────────────────────────
  private rankOf(e: Ent): number {
    // The first choice of a visit has no "obvious next step", so it counts for nothing either way.
    if (!this.lastTouch) return 1
    const from = this.lastTouch
    const d = (a: Ent) => Math.hypot(a.x - from.x, a.y - from.y)
    return this.ents.filter((o) => o !== e && o.appear > 0.5 && d(o) < d(e)).length
  }

  private touch(e: Ent, via: 'pointer' | 'key') {
    const m = this.brain.profile.entities[e.id]
    const rank = this.rankOf(e)
    e.near.touched = true
    if (e.tempt && !e.tempt.done) e.tempt.engaged += 2
    if (e.id === 'stranger' && m.wary > 0.45 && !(e.tempt && !e.tempt.done)) {
      // it does not let itself be caught
      this.obs({ t: 'slip', id: 'stranger' })
      this.obs({ t: 'touch', id: 'stranger', rank, via })
      const ax = e.x - this.lamp.x
      const ay = e.y - this.lamp.y
      const d = Math.hypot(ax, ay) || 1
      e.vx += (ax / d) * 520
      e.vy += (ay / d) * 520
      e.fleeing = 2.4
      this.whisperAt(e, say('stranger', m, 'slip'))
      return
    }
    this.obs({ t: 'touch', id: e.id, rank, via })
    this.lastTouch = { x: e.x, y: e.y }
    e.pop = 0.28
    const mem = this.brain.profile.entities[e.id]
    if (e.id === 'archivist' && this.brain.profile.marks.length === 0) {
      this.whisperAt(e, say('archivist', mem, 'empty'))
      return
    }
    this.enc = { id: e.id, t: 0, p: 0, data: {}, leaving: false, done: false, leaveAt: 0 }
    if (e.id === 'witness') this.enc.data.replay = this.lamp.history.slice()
    if (e.id === 'mirror') this.enc.data.len = 0
    this.whisperAt(e, say(e.id, mem, 'touch'), 0.4)
    if (mem.touches <= 1) this.say(DEF[e.id].name, e.x - e.r * e.scale * 0.6, e.y + e.r * e.scale * 2.4, { t0: this.t + 0.6, dur: 4, size: 24, tint: DEF[e.id].hue })
  }

  private leave() {
    if (!this.enc) return
    this.enc.leaving = true
    this.enc.leaveAt = this.t
  }

  private updateEnc(dt: number) {
    const enc = this.enc
    if (!enc) {
      this.dim = lerp(this.dim, 0, 1 - Math.exp(-dt * 1.5))
      return
    }
    const e = this.byId[enc.id]
    const L = this.lamp
    enc.t += dt
    this.dim = lerp(this.dim, enc.leaving ? 0 : 1, 1 - Math.exp(-dt * 1.8))
    const dist = Math.hypot(L.x - e.x, L.y - e.y)
    const len = ENC_LEN[enc.id]
    const d = enc.data as Record<string, number>
    if (!enc.leaving && !enc.done) {
      switch (enc.id) {
        case 'listener':
          d.still = L.speed < 45 ? (d.still ?? 0) + dt : Math.max(0, (d.still ?? 0) - dt * 2)
          enc.p = d.still / len
          break
        case 'wanderer':
          d.f = dist < 120 ? (d.f ?? 0) + dt : Math.max(0, (d.f ?? 0) - dt * 0.4)
          enc.p = d.f / len
          break
        case 'mirror':
          d.len = (d.len ?? 0) + L.speed * dt
          enc.p = d.len / len
          break
        case 'archivist': {
          const marks = this.brain.profile.marks
          const read = (d.read ?? 0) as number
          let got = read
          const seen = (enc.data.seen as Record<number, boolean>) ?? (enc.data.seen = {})
          marks.forEach((m, i) => {
            if (!seen[i] && Math.hypot(m.x * this.w - L.x, m.y * this.h - L.y) < 46) {
              seen[i] = true
              got++
              const ago = this.brain.profile.visits - m.visit
              this.say(ago <= 0 ? 'you stayed here, just now.' : ago === 1 ? 'you stayed here, last time.' : 'you stayed here, once.', m.x * this.w + 14, m.y * this.h - 10, { t0: this.t, dur: 3.4, size: 20 })
            }
          })
          d.read = got
          enc.p = got / len
          break
        }
        case 'stranger':
          if (dist < 125 && enc.t > 1) {
            this.obs({ t: 'leave', id: 'stranger', ms: 900 })
            this.obs({ t: 'chase', id: 'stranger', ms: 2500 })
            this.whisperAt(e, say('stranger', this.brain.profile.entities.stranger, 'left'))
            e.fleeing = 3
            enc.leaving = true
            enc.leaveAt = this.t
          } else {
            d.t = dist > 170 && L.speed < 50 ? (d.t ?? 0) + dt : Math.max(0, (d.t ?? 0) - dt)
            enc.p = d.t / len
          }
          break
        case 'witness':
          enc.p = enc.t / len
          break
        case 'seed':
          d.feed = L.down ? (d.feed ?? 0) + dt : d.feed ?? 0
          enc.p = d.feed / len
          break
      }
      if (enc.p >= 1) {
        enc.p = 1
        enc.done = true
        enc.leaveAt = this.t + 3
        this.obs({ t: 'complete', id: enc.id })
        this.whisperAt(e, say(enc.id, this.brain.profile.entities[enc.id], 'done'))
      }
    }
    if (enc.done && !enc.leaving && this.t >= enc.leaveAt) this.leave()
    if (enc.leaving && this.t - enc.leaveAt > 1.8) {
      this.enc = null
      this.lastTouch = { x: e.x, y: e.y }
    }
  }

  // ───────────────────────────── observations & voice ─────────────────────────────
  private obs(o: Obs) {
    const events = this.brain.observe(o)
    for (const ev of events) {
      if (ev.type === 'revised') {
        const probed = HYP[ev.hyp].probe?.entity
        const e = probed ? this.byId[probed] : null
        const text = doubt(ev.hyp)
        if (e) this.say(text, clamp(e.x - 60, 20, this.w - 380), clamp(e.y - e.r * 2.4, 40, this.h - 40), { t0: this.t + 0.4, dur: 7, size: 26 })
        else this.say(text, this.w * 0.09, this.h * 0.86, { t0: this.t + 0.4, dur: 7, size: 26 })
      }
    }
  }

  say(text: string, x: number, y: number, o: { t0?: number; dur?: number; size?: number; tint?: number; align?: 'left' | 'center' } = {}) {
    const w: Whisper = {
      text, x, y, t0: o.t0 ?? this.t, dur: o.dur ?? 5.5, size: o.size ?? 22,
      rot: (this.rand() - 0.5) * 0.04, align: o.align ?? 'left', tint: o.tint ?? -1,
    }
    this.whispers.push(w)
    // Announce to assistive tech when it becomes visible.
    window.setTimeout(() => this.hooks.whisper?.(text), Math.max(0, (w.t0 - this.t) * 1000))
  }

  private whisperAt(e: Ent, text: string, delay = 0) {
    const size = 22
    const approx = text.length * size * 0.42
    const x = clamp(e.x - approx / 2, 16, this.w - approx - 16)
    const y = e.y - e.r * e.scale * 1.7 - 18
    this.say(text, x, clamp(y, 44, this.h - 30), { t0: this.t + delay, dur: 5.2, size, tint: e.def.hue })
  }

  // ───────────────────────────── the reveal ─────────────────────────────
  startReveal() {
    if (this.phase !== 'world') return
    if (this.enc) this.enc.leaving = true
    this.phase = 'reveal'
    this.revealT = 0
    this.revealLines = revealLines(this.brain.profile)
    this.awaiting = false
    this.hooks.phase?.('reveal')
    this.hooks.awaiting?.(false)
  }

  cancelReveal() {
    if (this.phase !== 'reveal') return
    this.phase = 'world'
    this.beaconCooldown = this.t + 45
    this.hooks.phase?.('world')
    this.hooks.awaiting?.(false)
  }

  /** "Begin": the room finally rearranges itself around what it learned. */
  release() {
    if (this.phase !== 'reveal') return
    this.brain.reveal()
    this.phase = 'release'
    this.releaseT = 0
    this.hooks.phase?.('release')
    this.hooks.awaiting?.(false)
    this.awaiting = false
    this.say(released, this.w * 0.09, this.h * 0.88, { t0: this.t + 4.6, dur: 7, size: 28 })
  }

  // ───────────────────────────── frame ─────────────────────────────
  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    if (document.hidden) return
    this.t += dt
    this.update(dt)
    render(this)
  }

  /** Per-frame fade of everything the reveal does to the room. */
  get hush() {
    if (this.phase === 'reveal') return ease(clamp(this.revealT / 2.2))
    if (this.phase === 'release') return 1 - ease(clamp(this.releaseT / 2.5))
    return 0
  }

  private update(dt: number) {
    const L = this.lamp
    const intent = this.brain.intent()

    // the air
    const k = 1 - Math.exp(-dt * 0.45)
    const dh = ((intent.hue - this.atm.hue + 540) % 360) - 180
    this.atm.hue = (this.atm.hue + dh * k + 360) % 360
    this.atm.chroma = lerp(this.atm.chroma, intent.chroma, k)
    this.atm.lamp = lerp(this.atm.lamp, intent.lamp, k)
    this.atm.pace = lerp(this.atm.pace, intent.pace, k)
    this.motion = (this.reduced ? 0.4 : 1) * lerp(1, 0.04, this.hush)

    // the lamp: a small light you carry
    const lk = 1 - Math.exp(-dt * 14)
    const ox = L.x
    const oy = L.y
    L.x += (L.tx - L.x) * lk
    L.y += (L.ty - L.y) * lk
    if (!L.moved) {
      L.tx = this.w * 0.5 + Math.sin(this.t * 0.5) * 18
      L.ty = this.h * 0.84 + Math.cos(this.t * 0.4) * 8
    }
    const vx = (L.x - ox) / Math.max(dt, 1e-3)
    const vy = (L.y - oy) / Math.max(dt, 1e-3)
    L.vx = lerp(L.vx, vx, 1 - Math.exp(-dt * 8))
    L.vy = lerp(L.vy, vy, 1 - Math.exp(-dt * 8))
    L.speed = Math.hypot(L.vx, L.vy)
    L.px = L.x + L.vx * 0.35
    L.py = L.y + L.vy * 0.35
    L.stillFor = L.speed < 30 ? L.stillFor + dt : 0
    if (L.moved) {
      const hist = L.history
      if (!hist.length || this.t - hist[hist.length - 1].t > 0.08) hist.push({ x: L.x, y: L.y, t: this.t })
      while (hist.length && this.t - hist[0].t > 12) hist.shift()
    }

    // entities
    this.ents.forEach((e, n) => this.updateEnt(e, n, dt, intent))
    this.separate()
    this.track(dt)
    this.probes(dt)
    this.updateEnc(dt)
    this.marking(dt)
    this.updateBeacon(dt)

    // specks fly to the archivist
    for (const s of this.specks) {
      const a = this.byId[s.to]
      const p = clamp((this.t - s.t0) / 1.4)
      s.x = lerp(s.x, a.x, p * p * 0.18 + 0.02)
      s.y = lerp(s.y, a.y, p * p * 0.18 + 0.02)
      if (p >= 1) a.rustle = 1
    }
    this.specks = this.specks.filter((s) => this.t - s.t0 < 1.4)
    this.whispers = this.whispers.filter((w) => this.t < w.t0 + w.dur + 0.5)

    // reveal / release timelines
    if (this.phase === 'reveal') {
      this.revealT += dt
      const n = this.revealLines.length
      const done = 2.2 + n * 3.4 + 1.2
      const waiting = this.revealT > done
      if (waiting !== this.awaiting) {
        this.awaiting = waiting
        this.hooks.awaiting?.(waiting)
      }
    } else if (this.phase === 'release') {
      this.releaseT += dt
      if (this.releaseT > 5) {
        this.phase = 'world'
        this.hooks.phase?.('world')
      }
    }
  }

  private updateEnt(e: Ent, n: number, dt: number, intent: ReturnType<Brain['intent']>) {
    const L = this.lamp
    const it = intent.entities[e.id]
    const m = this.brain.profile.entities[e.id]
    const mo = this.motion * this.atm.pace

    e.appear = clamp((this.t - e.appearAt) / 2.2)
    e.phase += dt * (0.7 + e.awake * 0.6) * mo
    e.pop = lerp(e.pop, 0, 1 - Math.exp(-dt * 3))
    e.awake = lerp(e.awake, it.awake, 1 - Math.exp(-dt * 0.6))
    const sc = this.enc?.id === e.id ? (e.id === 'wanderer' ? 2 : 2.5) : 1
    e.scale = lerp(e.scale, it.scale * sc, 1 - Math.exp(-dt * (this.enc?.id === e.id ? 2.4 : 1.2)))
    e.rustle = lerp(e.rustle, 0, 1 - Math.exp(-dt * 1.5))

    // where it wants to live — eased toward the relationship, staggered during the release
    const delay = this.phase === 'release' ? n * 0.22 + (1 - m.bond) * 0.5 : 0
    const hk = this.phase === 'release' && this.releaseT < delay ? 0 : 1 - Math.exp(-dt * (this.phase === 'release' ? 0.9 : 0.5))
    let thx = it.home[0] * this.w
    let thy = it.home[1] * this.h
    // an ignored thing slowly turns away
    if (!m.touchedThisVisit && m.bond < 0.3 && this.t > 40) e.drift = Math.min(1, e.drift + dt / 160)
    else e.drift = Math.max(0, e.drift - dt / 25)
    if (e.drift > 0) {
      const dx = thx - this.w / 2
      const dy = thy - this.h / 2
      const dd = Math.hypot(dx, dy) || 1
      thx += (dx / dd) * 40 * e.drift
      thy += (dy / dd) * 30 * e.drift
    }
    // arriving person: what is close to you comes to meet you
    if (this.meet && this.t < this.meet.until && m.bond > 0.25) {
      const f = ease(clamp((this.meet.until - this.t) / 9)) * m.bond * 0.8
      const a = (n / ENTITIES.length) * 6.28
      thx = lerp(thx, this.meet.x + Math.cos(a) * 130, f)
      thy = lerp(thy, this.meet.y + Math.sin(a) * 100, f)
    }
    e.hx += (thx - e.hx) * hk
    e.hy += (thy - e.hy) * hk

    const inEnc = this.enc?.id === e.id
    const cx = this.w * 0.5
    const cy = this.h * 0.46
    const sw = (a: number) => Math.sin(e.phase * a)
    let tx = e.hx + sw(0.7) * 5 * mo
    let ty = e.hy + Math.cos(e.phase * 0.55) * 4 * mo
    let k = 5
    let damp = 3.2
    const toL = Math.hypot(L.px - e.x, L.py - e.y)
    // some moods are inattentive. Not everything reacts every time.
    const att = 0.5 + 0.5 * Math.sin(this.t * 0.09 + n * 1.7)

    switch (e.id) {
      case 'listener': {
        const calm = L.speed < 60 && toL < e.r * 4.5 + 120
        e.open = lerp(e.open, inEnc ? this.enc!.p : calm ? 0.7 * (0.4 + att) : 0, 1 - Math.exp(-dt * (calm ? 0.7 : 1.6)))
        if (inEnc) {
          tx = cx
          ty = cy
        }
        break
      }
      case 'wanderer': {
        damp = 0.9
        k = 0.7
        if (e.tempt && !e.tempt.done) {
          const a = this.t * 0.8
          tx = L.x + Math.cos(a) * 190
          ty = L.y + Math.sin(a) * 140
          k = 1.6
        } else {
          if (this.t > e.nextTarget) {
            const spanX = this.w * (inEnc ? 0.42 : 0.28)
            const spanY = this.h * (inEnc ? 0.34 : 0.22)
            const bx = m.bond > 0.5 && att > 0.5 && this.rand() < 0.5 ? L.x : e.hx
            const by = m.bond > 0.5 && att > 0.5 && this.rand() < 0.5 ? L.y : e.hy
            e.tx = clamp(bx + (this.rand() - 0.5) * 2 * spanX, this.w * 0.07, this.w * 0.93)
            e.ty = clamp(by + (this.rand() - 0.5) * 2 * spanY, this.h * 0.12, this.h * 0.88)
            e.nextTarget = this.t + 4 + this.rand() * 5
          }
          tx = e.tx
          ty = e.ty
        }
        const sp = Math.hypot(e.vx, e.vy)
        const maxv = 110 * mo
        if (sp > maxv) {
          e.vx *= maxv / sp
          e.vy *= maxv / sp
        }
        if (sp > 8) e.heading = Math.atan2(e.vy, e.vx)
        if (this.t % 0.12 < dt) {
          e.trail.push({ x: e.x, y: e.y, t: this.t })
        }
        break
      }
      case 'mirror': {
        const rx = this.w - L.x
        const ry = this.h - L.y
        tx = e.hx + clamp((rx - e.hx) * 0.1, -50, 50) * mo
        ty = e.hy + clamp((ry - e.hy) * 0.1, -40, 40) * mo
        k = 3
        if (inEnc) {
          tx = cx
          ty = cy
        }
        break
      }
      case 'archivist':
        if (inEnc) {
          tx = cx
          ty = cy
        }
        break
      case 'stranger': {
        k = 3
        damp = 2.2
        const dx = e.x - L.px
        const dy = e.y - L.py
        const d = Math.hypot(dx, dy) || 1
        const wary = m.wary
        if (e.tempt && !e.tempt.done) {
          tx = L.x + (dx / d) * 215
          ty = L.y + (dy / d) * 215
          tx = clamp(tx, 40, this.w - 40)
          ty = clamp(ty, 40, this.h - 40)
        } else if (inEnc) {
          tx = clamp(L.x + 230, 80, this.w - 80)
          ty = clamp(L.y - 20, 80, this.h - 80)
          k = 1.2
        } else if (wary < 0.3 && L.stillFor > 2.5 && toL < 420) {
          // it has decided you are not a threat
          e.trusting = Math.min(1, e.trusting + dt * 0.4)
          tx = L.x + (dx / d) * (200 - 60 * e.trusting)
          ty = L.y + (dy / d) * (200 - 60 * e.trusting)
          k = 0.9
        } else if (d < (330 + 140 * wary) * (0.5 + 0.5 * att + 0.3) && L.moved) {
          e.trusting = 0
          e.fleeing = Math.max(e.fleeing, 0.6)
          const side = Math.sin(e.phase * 0.3) > 0 ? 1 : -1
          tx = e.x + (dx / d) * 260 + (-dy / d) * 90 * side
          ty = e.y + (dy / d) * 260 + (dx / d) * 90 * side
          // cornered things slip along the wall
          tx = clamp(tx, 30, this.w - 30)
          ty = clamp(ty, 30, this.h - 30)
          k = 2 + 4 * wary
        } else {
          e.trusting = Math.max(0, e.trusting - dt * 0.2)
        }
        e.fleeing = Math.max(0, e.fleeing - dt)
        break
      }
      case 'witness': {
        const lag = 1 - Math.exp(-dt * (inEnc ? 4 : 1.1))
        const gx = (L.px - e.x) / 400
        const gy = (L.py - e.y) / 400
        e.gaze.x += (clamp(gx, -1, 1) - e.gaze.x) * lag
        e.gaze.y += (clamp(gy, -1, 1) - e.gaze.y) * lag
        e.nextBlink -= dt
        if (e.nextBlink < 0) {
          e.blink = 1
          e.nextBlink = 2.5 + this.rand() * 5
        }
        e.blink = Math.max(0, e.blink - dt * 7)
        if (inEnc) {
          tx = cx
          ty = cy
        }
        break
      }
      case 'seed':
        if (inEnc) {
          tx = cx
          ty = cy
        }
        break
    }

    if (e.appear < 1) {
      // arriving
      k *= 0.6
    }
    e.vx += (tx - e.x) * k * dt
    e.vy += (ty - e.y) * k * dt
    const dm = Math.exp(-damp * dt)
    e.vx *= dm
    e.vy *= dm
    e.x += e.vx * dt
    e.y += e.vy * dt
    const pad = e.r * e.scale
    e.x = clamp(e.x, pad * 0.6, this.w - pad * 0.6)
    e.y = clamp(e.y, pad * 0.6, this.h - pad * 0.6)
    while (e.trail.length && this.t - e.trail[0].t > (inEnc ? 14 : 7)) e.trail.shift()
  }

  private separate() {
    for (let i = 0; i < this.ents.length; i++) {
      for (let j = i + 1; j < this.ents.length; j++) {
        const a = this.ents[i]
        const b = this.ents[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 1
        const min = (a.r * a.scale + b.r * b.scale) * 1.15
        if (d < min) {
          const f = (min - d) * 0.05
          a.x -= (dx / d) * f
          a.y -= (dy / d) * f
          b.x += (dx / d) * f
          b.y += (dy / d) * f
        }
      }
    }
  }

  // ───────────────────────────── watching the lamp ─────────────────────────────
  private track(dt: number) {
    const L = this.lamp
    if (this.phase !== 'world') return
    for (const e of this.ents) {
      const d = Math.hypot(L.x - e.x, L.y - e.y)
      const near = e.appear > 0.8 && L.moved && d < e.r * e.scale * 2.2 + 70 && !this.enc
      const n = e.near
      if (near) {
        if (!n.on) {
          n.on = true
          n.since = this.t
          n.acc = 0
          n.still = 0
          n.touched = false
        }
        n.acc += dt
        if (L.speed < 60) n.still += dt
        if (n.acc >= 1.8) this.flushDwell(e)
        if (e.tempt && !e.tempt.done) e.tempt.engaged += dt
      } else if (n.on) {
        const total = this.t - n.since
        if (n.acc >= 0.6) this.flushDwell(e)
        if (total > 0.35 && total < 1.4 && !n.touched) this.obs({ t: 'leave', id: e.id, ms: total * 1000 })
        n.on = false
      }
      // chasing something that moves, or flees
      const moving = Math.hypot(e.vx, e.vy) > 35 || e.fleeing > 0
      const toward = (e.x - L.x) * L.vx + (e.y - L.y) * L.vy > 0
      if (moving && L.speed > 140 && d < 320 && toward && !this.enc) {
        e.chaseAcc += dt
        if (e.chaseAcc >= 1.5) {
          this.obs({ t: 'chase', id: e.id, ms: e.chaseAcc * 1000 })
          e.chaseAcc = 0
        }
      } else e.chaseAcc = Math.max(0, e.chaseAcc - dt * 0.5)
    }
  }

  private flushDwell(e: Ent) {
    const n = e.near
    if (n.acc <= 0) return
    this.obs({ t: 'dwell', id: e.id, ms: n.acc * 1000, still: n.still / n.acc })
    n.acc = 0
    n.still = 0
  }

  private marking(dt: number) {
    const L = this.lamp
    if (this.phase !== 'world' || this.enc || !L.moved) {
      this.markAcc = 0
      return
    }
    if (L.speed < 25) this.markAcc += dt
    else this.markAcc = Math.min(this.markAcc, 0.5) * 0
    if (this.markAcc > 1.6) {
      let near: EntityId | null = null
      let bd = 230
      for (const e of this.ents) {
        const d = Math.hypot(e.x - L.x, e.y - L.y)
        if (d < bd) {
          bd = d
          near = e.id
        }
      }
      this.obs({ t: 'mark', mark: { x: L.x / this.w, y: L.y / this.h, w: clamp(this.markAcc / 6, 0.2, 1), e: near } })
      this.specks.push({ x: L.x, y: L.y, to: 'archivist', t0: this.t })
      this.markAcc = -3
    }
  }

  // ───────────────────────────── yadah tests a guess ─────────────────────────────
  private probes(dt: number) {
    for (const e of this.ents) {
      const tp = e.tempt
      if (!tp || tp.done) continue
      if (this.t > tp.until || this.phase !== 'world') {
        tp.done = true
        const engaged = tp.engaged >= 1.5
        this.obs({ t: 'probe', hyp: tp.hyp, engaged })
      }
    }
    if (this.phase !== 'world' || this.enc || this.t - this.lastProbe < 42 || this.t < 30) return
    if (this.brain.session.probes >= 3 || this.t - this.lamp.lastMoveAt > 5 || !this.lamp.moved) return
    void dt
    let pick: HypId | null = null
    let bestScore = Infinity
    for (const h of HYPS) {
      if (!h.probe) continue
      const s = this.brain.profile.hyps[h.id]
      if (s.status === 'unformed') continue
      const c = confidence(s)
      if (c < 0.58 || c > 0.92) continue
      const score = Math.abs(c - 0.75)
      if (score < bestScore) {
        bestScore = score
        pick = h.id
      }
    }
    if (!pick) return
    const e = this.byId[HYP[pick].probe!.entity]
    this.lastProbe = this.t
    e.tempt = { hyp: pick, start: this.t, until: this.t + 13, engaged: 0, done: false }
  }

  private updateBeacon(dt: number) {
    const ready = this.brain.ready() && this.phase === 'world' && this.t > this.beaconCooldown && !this.enc
    this.beacon.on = ready
    this.beacon.vis = lerp(this.beacon.vis, ready ? 1 : 0, 1 - Math.exp(-dt * 0.9))
    if (ready !== this.beaconWas) {
      this.beaconWas = ready
      this.hooks.beacon?.(ready)
    }
    if (ready) {
      const d = Math.hypot(this.lamp.x - this.w * 0.5, this.lamp.y - this.h * 0.9)
      this.beacon.dwell = d < 80 && this.lamp.speed < 80 ? this.beacon.dwell + dt : Math.max(0, this.beacon.dwell - dt)
      if (this.beacon.dwell > 1.4) {
        this.beacon.dwell = 0
        this.startReveal()
      }
    }
  }
  private beaconWas = false
}
