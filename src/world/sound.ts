import type { EntityId } from '../engine/types'

/**
 * The room's sound is its memory. Each presence owns one note of a quiet
 * chord. The note is barely there until you grow close to it, so the room
 * literally sounds like your history. Nothing here is a sample: it is a few
 * sine voices through a lowpass and a short generated reverb.
 */

const NOTE: Record<EntityId, number> = {
  listener: 110,
  wanderer: 130.81,
  mirror: 146.83,
  archivist: 164.81,
  stranger: 196,
  witness: 220,
  seed: 261.63,
  vigil: 82.41,
}

export class Sound {
  private ctx?: AudioContext
  private master?: GainNode
  private tone?: BiquadFilterNode
  private voices = {} as Record<EntityId, { g: GainNode; a: OscillatorNode; b: OscillatorNode }>
  private swell = 0
  private pad?: GainNode
  private tension = 0
  muted = false

  constructor() {
    try {
      this.muted = localStorage.getItem('yadah:sound') === 'off'
    } catch {
      /* no storage: default to sound */
    }
  }

  get started() {
    return !!this.ctx
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AC()
      this.ctx = ctx
      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : 0.5
      const comp = ctx.createDynamicsCompressor()
      master.connect(comp).connect(ctx.destination)
      this.master = master

      const tone = ctx.createBiquadFilter()
      tone.type = 'lowpass'
      tone.frequency.value = 700
      tone.Q.value = 0.4
      this.tone = tone

      // a small generated room: decaying noise
      const len = ctx.sampleRate * 2.6
      const buf = ctx.createBuffer(2, len, ctx.sampleRate)
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
      }
      const verb = ctx.createConvolver()
      verb.buffer = buf
      const wet = ctx.createGain()
      wet.gain.value = 0.5
      tone.connect(master)
      tone.connect(verb)
      verb.connect(wet).connect(master)

      for (const id of Object.keys(NOTE) as EntityId[]) {
        const g = ctx.createGain()
        g.gain.value = 0
        const a = ctx.createOscillator()
        const b = ctx.createOscillator()
        a.type = 'sine'
        b.type = 'triangle'
        a.frequency.value = NOTE[id]
        b.frequency.value = NOTE[id] * 1.004
        const bg = ctx.createGain()
        bg.gain.value = 0.25
        a.connect(g)
        b.connect(bg).connect(g)
        g.connect(tone)
        a.start()
        b.start()
        this.voices[id] = { g, a, b }
      }
      // the room itself: a low fifth that is always there
      const pad = ctx.createGain()
      pad.gain.value = 0
      for (const f of [55, 82.4]) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f
        o.connect(pad)
        o.start()
      }
      pad.connect(tone)
      this.pad = pad
      pad.gain.setTargetAtTime(this.muted ? 0 : 0.05, ctx.currentTime, 2.5)
    } catch {
      /* no audio: the room is silent and nothing else changes */
    }
  }

  setMuted(v: boolean) {
    this.muted = v
    try {
      localStorage.setItem('yadah:sound', v ? 'off' : 'on')
    } catch {
      /* ignore */
    }
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(v ? 0 : 0.5, this.ctx.currentTime, 0.2)
  }

  /** Called every frame. Closer and more-bonded things sing louder. */
  update(prox: Record<EntityId, number>, bond: Record<EntityId, number>, speed: number, hush: number, sleep = 0) {
    const ctx = this.ctx
    if (!ctx || this.muted) return
    const t = ctx.currentTime
    for (const id of Object.keys(this.voices) as EntityId[]) {
      const v = this.voices[id]
      const target = (0.002 + bond[id] * 0.05 + prox[id] * 0.03 * (0.4 + 0.6 * (1 - hush))) * (1 + this.swell * 3) * (1 - 0.8 * sleep)
      v.g.gain.setTargetAtTime(target, t, 0.35)
    }
    this.tone?.frequency.setTargetAtTime((380 + Math.min(1, speed / 900) * 900 + this.swell * 1400) * (1 - 0.5 * sleep) * (1 - 0.5 * this.tension), t, 0.3)
    this.swell *= 0.985
  }

  /** While something heavy is being held, the room gathers into one low sound. 0..1. */
  setTension(p: number) {
    const ctx = this.ctx
    if (!ctx || this.muted || !this.pad) return
    this.tension = p
    this.pad.gain.setTargetAtTime(0.05 + 0.2 * p, ctx.currentTime, 0.4)
  }

  /** A soft pluck of one presence's note. */
  pluck(id: EntityId, octave = 2, vel = 0.12) {
    this.note(NOTE[id] * octave, vel, 1.8)
  }

  chime(id: EntityId) {
    const f = NOTE[id]
    ;[2, 3, 4].forEach((m, i) => setTimeout(() => this.note(f * m, 0.08, 2.4), i * 140))
  }

  thud() {
    const ctx = this.ctx
    if (!ctx || this.muted || !this.tone) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(130, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.25)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    o.connect(g).connect(this.tone)
    o.start()
    o.stop(ctx.currentTime + 0.4)
  }

  /** The release: everything rises together. */
  release() {
    this.swell = 1
    ;[0, 1, 2, 3].forEach((i) => setTimeout(() => this.note(110 * [2, 3, 4, 6][i], 0.09, 3.4), i * 220))
  }

  private note(freq: number, vel: number, dur: number) {
    const ctx = this.ctx
    if (!ctx || this.muted || !this.tone) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(vel, ctx.currentTime + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g).connect(this.tone)
    o.start()
    o.stop(ctx.currentTime + dur + 0.1)
  }

  destroy() {
    void this.ctx?.close()
  }
}
