import { useEffect, useRef } from 'react'
import { trail } from '../engine/tracker'
import { useCanvas } from '../hooks'
import { useStore } from '../store'

/* Canvas pieces. Each reads the interface state per frame for hue and pace, so
   they too are tuned to the person. They report that they were touched, never
   what the pointer did. */

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pace = () => {
  const { ui } = useStore.getState()
  return ui.motion.quiet ? 0.45 : ui.motion.ambient
}
const hue = () => useStore.getState().ui.hue
const chroma = () => useStore.getState().ui.chroma
const inside = (k: 'click' | 'drag' | 'move' | 'key') => useStore.getState().inside(k)
const onPointer = (k: 'move' | 'click' | 'drag') => inside(k)

/* ── Tide: a flow field you can stir ──────────────────────────────── */
export function Tide() {
  const parts = useRef<{ x: number; y: number; a: number }[]>([])
  const ref = useCanvas(
    (c, w, h, t, dt, p) => {
      const H = hue()
      const C = chroma()
      c.fillStyle = `oklch(0.12 0.012 ${H} / 0.07)`
      c.fillRect(0, 0, w, h)
      const sp = pace()
      c.lineWidth = 1.1
      for (const q of parts.current) {
        let ang = Math.sin(q.x * 0.0042 + t * 0.21 * sp) * 2.2 + Math.cos(q.y * 0.0051 - t * 0.17 * sp) * 2.2 + Math.sin((q.x + q.y) * 0.002 + t * 0.1) * 1.5
        if (p.inside) {
          const dx = q.x - p.x
          const dy = q.y - p.y
          const d = Math.hypot(dx, dy)
          if (d < 220) ang += (1 - d / 220) * (p.down ? -6 : 3.2) * Math.sign(dx || 1)
        }
        const v = (50 + 90 * sp) * dt
        const nx = q.x + Math.cos(ang) * v
        const ny = q.y + Math.sin(ang) * v
        c.strokeStyle = `oklch(${0.72 + 0.2 * ((q.a * 7) % 1)} ${0.04 + C * 0.22} ${H + q.a * 70} / 0.8)`
        c.beginPath()
        c.moveTo(q.x, q.y)
        c.lineTo(nx, ny)
        c.stroke()
        q.x = nx
        q.y = ny
        if (q.x < 0 || q.x > w || q.y < 0 || q.y > h || Math.random() < 0.0015) {
          q.x = rnd(0, w)
          q.y = rnd(0, h)
        }
      }
    },
    [],
    {
      onPointer,
      init: (w, h) => {
        parts.current = Array.from({ length: Math.min(1100, Math.round((w * h) / 1400)) }, () => ({ x: rnd(0, w), y: rnd(0, h), a: Math.random() }))
      },
    },
  )
  return <canvas ref={ref} />
}

/* ── Ember: slow light that follows, and blooms when touched ──────── */
interface Blob { x: number; y: number; vx: number; vy: number; r: number; o: number; life: number }
export function Ember() {
  const blobs = useRef<Blob[]>([])
  const ref = useCanvas(
    (c, w, h, t, dt, p) => {
      const H = hue()
      const C = chroma()
      c.globalCompositeOperation = 'source-over'
      c.fillStyle = `oklch(0.1 0.012 ${H})`
      c.fillRect(0, 0, w, h)
      c.globalCompositeOperation = 'lighter'
      const sp = pace()
      const tx = p.inside ? p.x : w / 2 + Math.cos(t * 0.15 * sp) * w * 0.2
      const ty = p.inside ? p.y : h / 2 + Math.sin(t * 0.12 * sp) * h * 0.2
      for (let i = blobs.current.length - 1; i >= 0; i--) {
        const b = blobs.current[i]
        const dx = tx - b.x
        const dy = ty - b.y
        b.vx += dx * 0.06 * dt * sp + Math.sin(t * 0.3 + i) * 3 * dt
        b.vy += dy * 0.06 * dt * sp + Math.cos(t * 0.27 + i) * 3 * dt
        b.vx *= 0.985
        b.vy *= 0.985
        b.x += b.vx * dt * 30
        b.y += b.vy * dt * 30
        b.life -= dt * 0.02
        const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        const a = Math.max(0, Math.min(1, b.life)) * b.o
        g.addColorStop(0, `oklch(0.72 ${0.05 + C * 0.2} ${H + (i % 5) * 18} / ${a})`)
        g.addColorStop(1, `oklch(0.3 ${C * 0.1} ${H} / 0)`)
        c.fillStyle = g
        c.beginPath()
        c.arc(b.x, b.y, b.r, 0, 6.283)
        c.fill()
        if (b.life <= 0 && blobs.current.length > 14) blobs.current.splice(i, 1)
      }
      if (blobs.current.length < 26 && Math.random() < 0.05) {
        blobs.current.push({ x: rnd(0, w), y: rnd(0, h), vx: 0, vy: 0, r: rnd(60, 190), o: rnd(0.12, 0.3), life: 1 })
      }
      if (p.down && Math.random() < 0.5) {
        blobs.current.push({ x: p.x, y: p.y, vx: rnd(-4, 4), vy: rnd(-4, 4), r: rnd(40, 120), o: 0.4, life: 1 })
      }
    },
    [],
    {
      onPointer,
      init: (w, h) => {
        blobs.current = Array.from({ length: 16 }, () => ({ x: rnd(0, w), y: rnd(0, h), vx: 0, vy: 0, r: rnd(60, 190), o: rnd(0.12, 0.3), life: 1 }))
      },
    },
  )
  return <canvas ref={ref} />
}

/* ── Lattice: a grid of dots on springs ───────────────────────────── */
interface Dot { hx: number; hy: number; x: number; y: number; vx: number; vy: number }
export function Lattice() {
  const dots = useRef<Dot[]>([])
  const cols = useRef(0)
  const waves = useRef<{ x: number; y: number; r: number }[]>([])
  const was = useRef(false)
  const ref = useCanvas(
    (c, w, h, _t, dt, p) => {
      const H = hue()
      const C = chroma()
      c.fillStyle = `oklch(0.12 0.01 ${H})`
      c.fillRect(0, 0, w, h)
      if (p.down && !was.current) waves.current.push({ x: p.x, y: p.y, r: 0 })
      was.current = p.down
      for (const wv of waves.current) wv.r += 420 * dt
      waves.current = waves.current.filter((wv) => wv.r < Math.max(w, h))
      const D = dots.current
      for (const d of D) {
        d.vx += (d.hx - d.x) * 28 * dt
        d.vy += (d.hy - d.y) * 28 * dt
        if (p.inside) {
          const dx = d.x - p.x
          const dy = d.y - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < 140) {
            const f = (1 - dist / 140) * 1400 * dt
            d.vx += (dx / (dist + 1)) * f
            d.vy += (dy / (dist + 1)) * f
          }
        }
        for (const wv of waves.current) {
          const dist = Math.hypot(d.x - wv.x, d.y - wv.y)
          if (Math.abs(dist - wv.r) < 30) {
            const f = (1 - Math.abs(dist - wv.r) / 30) * 900 * dt
            d.vx += ((d.x - wv.x) / (dist + 1)) * f
            d.vy += ((d.y - wv.y) / (dist + 1)) * f
          }
        }
        d.vx *= 0.9
        d.vy *= 0.9
        d.x += d.vx * dt
        d.y += d.vy * dt
      }
      c.lineWidth = 1
      const n = cols.current
      for (let i = 0; i < D.length; i++) {
        const d = D[i]
        const disp = Math.hypot(d.x - d.hx, d.y - d.hy)
        const k = Math.min(1, disp / 40)
        if (i % n < n - 1) {
          const e = D[i + 1]
          c.strokeStyle = `oklch(0.7 ${0.02 + C * 0.14} ${H} / ${0.04 + k * 0.4})`
          c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(e.x, e.y); c.stroke()
        }
        if (i + n < D.length) {
          const e = D[i + n]
          c.strokeStyle = `oklch(0.7 ${0.02 + C * 0.14} ${H} / ${0.04 + k * 0.4})`
          c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(e.x, e.y); c.stroke()
        }
        c.fillStyle = `oklch(${0.6 + k * 0.3} ${0.02 + C * 0.2 * k} ${H + k * 60} / ${0.55 + k * 0.45})`
        c.beginPath()
        c.arc(d.x, d.y, 1.6 + k * 3.2, 0, 6.283)
        c.fill()
      }
    },
    [],
    {
      onPointer,
      init: (w, h) => {
        const gap = Math.max(26, Math.min(40, w / 26))
        const nx = Math.floor(w / gap)
        const ny = Math.floor(h / gap)
        cols.current = nx
        const ox = (w - (nx - 1) * gap) / 2
        const oy = (h - (ny - 1) * gap) / 2
        dots.current = Array.from({ length: nx * ny }, (_, i) => {
          const hx = ox + (i % nx) * gap
          const hy = oy + Math.floor(i / nx) * gap
          return { hx, hy, x: hx, y: hy, vx: 0, vy: 0 }
        })
      },
    },
  )
  return <canvas ref={ref} />
}

/* ── Instrument: play with the keyboard (or the bars) ─────────────── */
const KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k']
const FREQ = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]

export function Instrument() {
  const audio = useRef<AudioContext | null>(null)
  const bars = useRef<number[]>(KEYS.map(() => 0))
  const ripples = useRef<{ x: number; y: number; r: number; i: number }[]>([])
  const size = useRef({ w: 0, h: 0 })

  const play = (i: number) => {
    try {
      const ctx = (audio.current ||= new AudioContext())
      if (ctx.state === 'suspended') void ctx.resume()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = FREQ[i]
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6)
      o.connect(g).connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 1.7)
    } catch {
      /* audio unavailable: the visuals still play */
    }
    bars.current[i] = 1
    const { w, h } = size.current
    ripples.current.push({ x: ((i + 0.5) / KEYS.length) * w, y: h * 0.72, r: 0, i })
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0) {
        play(i)
        inside('key')
      }
    }
    addEventListener('keydown', down)
    return () => {
      removeEventListener('keydown', down)
      void audio.current?.close()
    }
  }, [])

  const wasDown = useRef(false)
  const ref = useCanvas(
    (c, w, h, _t, dt, p) => {
      size.current = { w, h }
      const H = hue()
      const C = chroma()
      c.fillStyle = `oklch(0.115 0.012 ${H} / 0.22)`
      c.fillRect(0, 0, w, h)
      if (p.down && !wasDown.current && p.inside) play(Math.max(0, Math.min(KEYS.length - 1, Math.floor(p.nx * KEYS.length))))
      wasDown.current = p.down
      const bw = w / KEYS.length
      for (let i = 0; i < KEYS.length; i++) {
        bars.current[i] = Math.max(0, bars.current[i] - dt * 0.7)
        const v = bars.current[i]
        const bh = h * 0.12 + h * 0.5 * v
        c.fillStyle = `oklch(${0.45 + v * 0.4} ${0.02 + C * 0.2 * (0.3 + v)} ${H + i * 14} / ${0.5 + v * 0.5})`
        c.fillRect(i * bw + bw * 0.3, h * 0.72 - bh, bw * 0.4, bh)
        c.fillStyle = `oklch(0.6 0.01 ${H})`
        c.font = '12px "IBM Plex Mono", monospace'
        c.textAlign = 'center'
        c.fillText(KEYS[i], i * bw + bw / 2, h * 0.72 + 30)
      }
      for (const r of ripples.current) r.r += 260 * dt
      ripples.current = ripples.current.filter((r) => r.r < Math.max(w, h) * 0.6)
      for (const r of ripples.current) {
        c.strokeStyle = `oklch(0.8 ${0.04 + C * 0.2} ${H + r.i * 14} / ${Math.max(0, 0.6 - r.r / (Math.max(w, h) * 0.6))})`
        c.beginPath()
        c.arc(r.x, r.y, r.r, 0, 6.283)
        c.stroke()
      }
    },
    [],
    { onPointer },
  )
  return <canvas ref={ref} />
}

/* ── Trace: the path your pointer has taken ───────────────────────── */
export function Trace() {
  const ref = useCanvas((c, w, h, t) => {
    const H = hue()
    const C = chroma()
    c.fillStyle = `oklch(0.11 0.012 ${H})`
    c.fillRect(0, 0, w, h)
    if (trail.length < 8) {
      c.fillStyle = `oklch(0.6 0.01 ${H})`
      c.font = 'italic 20px "Fraunces Variable", serif'
      c.textAlign = 'center'
      c.fillText('Nothing yet. Move around, and I will draw where you have been.', w / 2, h / 2)
      return
    }
    c.lineCap = 'round'
    const n = trail.length
    for (let i = 1; i < n; i++) {
      const a = trail[i - 1]
      const b = trail[i]
      if (b.t - a.t > 400) continue
      const age = i / n
      const sp = Math.min(1, b.v / 1600)
      c.strokeStyle = `oklch(${0.5 + sp * 0.4} ${0.03 + C * 0.22} ${H + sp * 90} / ${0.12 + age * 0.7})`
      c.lineWidth = 0.6 + (1 - sp) * 2.4 * age
      c.beginPath()
      c.moveTo(a.x * w, a.y * h)
      c.lineTo(b.x * w, b.y * h)
      c.stroke()
    }
    // pauses glow
    for (let i = 1; i < n; i += 3) {
      const b = trail[i]
      if (b.v < 60) {
        c.fillStyle = `oklch(0.8 ${0.05 + C * 0.2} ${H} / ${0.15 + 0.1 * Math.sin(t * 2 + i)})`
        c.beginPath()
        c.arc(b.x * w, b.y * h, 3 + (60 - b.v) * 0.12, 0, 6.283)
        c.fill()
      }
    }
  }, [])
  return <canvas ref={ref} />
}
