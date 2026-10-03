import { DEF } from '../engine/entities'
import { clamp, ease, lerp, rngOf, type Ent } from './scene'
import type { World } from './World'

/**
 * Everything is cut paper and ink in a dark room, lit by a lamp you carry.
 * Shadows fall away from the lamp. Colour is not a theme: it is a pigment
 * the room has taken from the things you spent time with.
 */

const col = (l: number, c: number, h: number, a = 1) => `oklch(${l} ${c} ${h} / ${a})`
const SERIF = '"Alegreya", "Iowan Old Style", Georgia, serif'
const GROTESK = '"Bricolage Grotesque Variable", "Helvetica Neue", system-ui, sans-serif'

interface Gfx {
  ctx: CanvasRenderingContext2D
  dark: HTMLCanvasElement
  dctx: CanvasRenderingContext2D
  tex: CanvasPattern | null
  key: string
}
const cache = new WeakMap<World, Gfx>()

function gfx(w: World): Gfx {
  const key = `${w.canvas.width}x${w.canvas.height}`
  let g = cache.get(w)
  if (!g || g.key !== key) {
    const ctx = w.canvas.getContext('2d')!
    const dark = document.createElement('canvas')
    dark.width = w.canvas.width
    dark.height = w.canvas.height
    const dctx = dark.getContext('2d')!
    // a paper texture: fine grain and a scatter of fibres, generated once
    const t = document.createElement('canvas')
    t.width = t.height = 256
    const tc = t.getContext('2d')!
    const img = tc.createImageData(256, 256)
    const r = rngOf(42)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 70
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    tc.putImageData(img, 0, 0)
    tc.strokeStyle = 'rgba(255,255,255,.07)'
    for (let i = 0; i < 90; i++) {
      tc.beginPath()
      const x = r() * 256
      const y = r() * 256
      tc.moveTo(x, y)
      tc.quadraticCurveTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30, x + (r() - 0.5) * 40, y + (r() - 0.5) * 40)
      tc.stroke()
    }
    g = { ctx, dark, dctx, tex: ctx.createPattern(t, 'repeat'), key }
    cache.set(w, g)
  }
  return g
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur)
      cur = w
    } else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

export function render(w: World) {
  const g = gfx(w)
  const { ctx } = g
  const { w: W, h: H, dpr } = w
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  const hue = w.atm.hue
  const chroma = w.atm.chroma

  // ── the floor ────────────────────────────────────────────────────────
  ctx.fillStyle = col(0.44, 0.012 + chroma * 0.55, hue)
  ctx.fillRect(0, 0, W, H)
  if (g.tex) {
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = 0.55
    ctx.fillStyle = g.tex
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  drawWordmark(w, ctx)
  drawMarks(w, ctx)
  drawTrails(w, ctx)
  drawEncounterFloor(w, ctx)

  // ── the things ───────────────────────────────────────────────────────
  const sorted = [...w.ents].sort((a, b) => a.y - b.y)
  for (const e of sorted) drawEntity(w, ctx, e)

  // ── the dark ─────────────────────────────────────────────────────────
  drawDarkness(w, g)
  ctx.drawImage(g.dark, 0, 0, W, H)

  // ── things that are seen regardless of light ─────────────────────────
  drawAir(w, ctx)
  drawSpecks(w, ctx)
  drawBeacon(w, ctx)
  drawGhost(w, ctx)
  drawWhispers(w, ctx)
  drawReveal(w, ctx)
  drawShock(w, ctx)
  drawLamp(w, ctx)
}

// ───────────────────────────── the floor ─────────────────────────────

function drawWordmark(w: World, ctx: CanvasRenderingContext2D) {
  const { w: W, h: H } = w
  const size = Math.min(W * 0.21, H * 0.5)
  const letters = 'yadah'.split('')
  ctx.save()
  ctx.font = `800 ${size}px ${GROTESK}`
  ctx.textBaseline = 'alphabetic'
  const widths = letters.map((c) => ctx.measureText(c).width)
  const gap = size * 0.015
  const total = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1)
  let x = W * 0.5 - total / 2
  const base = H * 0.6
  const r = rngOf(77)
  letters.forEach((c, i) => {
    const jit = (r() - 0.5) * 0.07
    const dy = (r() - 0.5) * size * 0.05 + Math.sin(w.t * 0.25 * w.motion + i) * 1.5 * w.motion
    w.letters[i] = { x: x + widths[i] / 2, y: base - size * 0.28 }
    // each letter fills in as Yadah takes you in, and flares when it notes something
    const lit = clamp(w.letterPulse[i] * 0.9 + clamp(w.know * 5.5 - i) * 0.35)
    ctx.save()
    ctx.translate(x + widths[i] / 2, base + dy)
    ctx.rotate(jit)
    // pressed into the paper: a light edge and a dark body
    ctx.fillStyle = col(0.46, 0.01 + w.atm.chroma * 0.5, w.atm.hue, 0.5)
    ctx.fillText(c, -widths[i] / 2 + 1.5, 1.5)
    ctx.fillStyle = col(0.3 + 0.38 * lit, 0.01 + w.atm.chroma * 0.5 + 0.03 * lit, lit > 0.05 ? 78 : w.atm.hue, 0.7 + 0.2 * lit)
    ctx.fillText(c, -widths[i] / 2, 0)
    ctx.restore()
    x += widths[i] + gap
  })
  ctx.restore()
}

function drawMarks(w: World, ctx: CanvasRenderingContext2D) {
  const marks = w.brain.profile.marks
  const enc = w.enc?.id === 'archivist'
  marks.forEach((m, i) => {
    const r = rngOf(i * 97 + 13)
    const def = m.e ? DEF[m.e] : null
    const bond = m.e ? w.brain.profile.entities[m.e].bond : 0
    const x = m.x * w.w
    const y = m.y * w.h
    const life = m.life ?? 1
    const size = 3 + 9 * m.w
    // a mark nobody returned to loses its colour, then goes black, then is gone
    const dying = m.dead ? clamp(1 - w.t / 15) : 1
    const tint = (def ? 0.02 + 0.1 * bond : 0.01) * (0.2 + 0.8 * life)
    ctx.fillStyle = m.dead
      ? col(0.05, 0.005, w.atm.hue, 0.7 * dying)
      : col(0.2 - 0.06 * (1 - life), tint, def ? def.hue : w.atm.hue, (0.18 + 0.5 * m.w * life) * (enc ? 1.4 : 1))
    for (let k = 0; k < 6; k++) {
      ctx.beginPath()
      ctx.ellipse(x + (r() - 0.5) * size * 1.6, y + (r() - 0.5) * size * 1.6, size * (0.3 + r() * 0.5) * (m.dead ? 0.7 + 0.3 * dying : 1), size * (0.25 + r() * 0.4), r() * 3, 0, 6.3)
      ctx.fill()
    }
  })
  // where something used to live
  for (const e of w.ents) {
    if (!w.brain.profile.entities[e.id].gone) continue
    ctx.fillStyle = col(0.06, 0.005, w.atm.hue, 0.5)
    ctx.beginPath()
    ctx.ellipse(e.hx, e.hy, e.r * 1.1, e.r * 0.9, 0.3, 0, 6.3)
    ctx.fill()
  }
}

function drawTrails(w: World, ctx: CanvasRenderingContext2D) {
  const e = w.byId.wanderer
  if (e.trail.length < 2) return
  const life = w.enc?.id === 'wanderer' ? 14 : 7
  ctx.lineCap = 'round'
  for (let i = 1; i < e.trail.length; i++) {
    const a = e.trail[i - 1]
    const b = e.trail[i]
    const age = 1 - (w.t - b.t) / life
    if (age <= 0) continue
    ctx.strokeStyle = col(0.2, 0.02 + 0.1 * w.brain.profile.entities.wanderer.bond, DEF.wanderer.hue, 0.5 * age * e.appear)
    ctx.lineWidth = 1 + 3 * age
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

function drawEncounterFloor(w: World, ctx: CanvasRenderingContext2D) {
  const enc = w.enc
  if (!enc) return
  if (enc.id === 'mirror') {
    // your path and its reflection, inked into the floor
    const h = w.lamp.history.filter((p) => w.t - p.t < 8)
    ctx.lineCap = 'round'
    for (let i = 1; i < h.length; i++) {
      const age = 1 - (w.t - h[i].t) / 8
      for (const flip of [false, true]) {
        const a = flip ? { x: w.w - h[i - 1].x, y: w.h - h[i - 1].y } : h[i - 1]
        const b = flip ? { x: w.w - h[i].x, y: w.h - h[i].y } : h[i]
        ctx.strokeStyle = col(0.18, 0.03 + 0.08 * w.brain.profile.entities.mirror.bond, DEF.mirror.hue, 0.55 * age)
        ctx.lineWidth = 1 + 2.5 * age
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }
}

// ───────────────────────────── entities ─────────────────────────────

function drawEntity(w: World, ctx: CanvasRenderingContext2D, e: Ent) {
  if (e.appear <= 0.01) return
  const mem = w.brain.profile.entities[e.id]
  const L = w.lamp
  const R = e.r * e.scale * (0.55 + 0.45 * ease(e.appear)) * (1 + 0.022 * Math.sin(e.phase) * (w.motion > 0.1 ? 1 : 0) + e.pop)
  const paper = col(0.8, 0.012 + 0.006 * e.awake, w.atm.hue)
  const paperLo = col(0.62, 0.012, w.atm.hue)
  const ink = col(0.15, 0.01, w.atm.hue)
  const acc = col(0.72, 0.012 + 0.17 * mem.bond, e.def.hue)
  const accSoft = col(0.72, 0.012 + 0.17 * mem.bond, e.def.hue, 0.5)

  // a shadow that falls away from the lamp
  const dx = e.x - L.x
  const dy = e.y - L.y
  const d = Math.hypot(dx, dy) || 1
  const len = clamp(2400 / (d + 160) + R * 0.08, 5, 24)

  ctx.save()
  ctx.globalAlpha = ease(e.appear)
  ctx.translate(e.x, e.y)
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = len * 1.2
  ctx.shadowOffsetX = (dx / d) * len
  ctx.shadowOffsetY = (dy / d) * len
  const ux = -dx / d
  const uy = -dy / d
  const lit = (r: number) => {
    const g = ctx.createRadialGradient(ux * r * 0.38, uy * r * 0.38, r * 0.05, 0, 0, r * 1.15)
    g.addColorStop(0, col(0.95, 0.008, w.atm.hue))
    g.addColorStop(0.55, paper)
    g.addColorStop(1, paperLo)
    return g
  }
  const noShadow = () => {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }
  const enc = w.enc?.id === e.id ? w.enc : null

  switch (e.id) {
    case 'listener': {
      ctx.fillStyle = lit(R)
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, 6.3)
      ctx.fill()
      noShadow()
      const lean = Math.min(R * 0.12, 8) * e.open
      ctx.strokeStyle = ink
      for (let k = 0; k < 4; k++) {
        const rr = R * (0.26 + 0.2 * k) * (1 + 0.03 * Math.sin(w.t * 0.9 + k) * (w.motion > 0.1 ? 1 : 0))
        ctx.globalAlpha = ease(e.appear) * (0.45 - k * 0.07)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(ux * lean * (k / 3), uy * lean * (k / 3), rr, 0, 6.3)
        ctx.stroke()
      }
      ctx.globalAlpha = ease(e.appear)
      ctx.fillStyle = acc
      ctx.globalAlpha = ease(e.appear) * (0.15 + 0.85 * e.open)
      ctx.beginPath()
      ctx.arc(ux * lean, uy * lean, R * 0.14, 0, 6.3)
      ctx.fill()
      if (enc) {
        // stillness made visible: rings that only spread while you hold still
        ctx.globalAlpha = 1
        ctx.lineWidth = 1.4
        for (let k = 0; k < 4; k++) {
          const ph = ((w.t * 0.35 + k / 4) % 1) * enc.p
          ctx.strokeStyle = col(0.82, 0.04 + 0.1 * mem.bond, e.def.hue, (1 - ph) * 0.8 * enc.p)
          ctx.beginPath()
          ctx.arc(0, 0, R * (1.1 + ph * 2.2), 0, 6.3)
          ctx.stroke()
        }
      }
      break
    }
    case 'wanderer': {
      ctx.rotate(e.heading)
      ctx.fillStyle = lit(R * 1.4)
      ctx.beginPath()
      ctx.moveTo(R * 1.5, 0)
      ctx.bezierCurveTo(R * 0.8, -R * 0.95, -R * 0.9, -R * 0.8, -R * 1.2, 0)
      ctx.bezierCurveTo(-R * 0.9, R * 0.8, R * 0.8, R * 0.95, R * 1.5, 0)
      ctx.fill()
      noShadow()
      ctx.fillStyle = acc
      ctx.beginPath()
      ctx.arc(R * 0.25, 0, R * 0.32, 0, 6.3)
      ctx.fill()
      ctx.strokeStyle = ink
      ctx.globalAlpha = 0.5 * ease(e.appear)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-R * 1.1, 0)
      ctx.lineTo(R * 1.4, 0)
      ctx.stroke()
      break
    }
    case 'mirror': {
      const g = ctx.createRadialGradient(-dx / d * R * 0.4, -dy / d * R * 0.4, R * 0.1, 0, 0, R * 1.2)
      g.addColorStop(0, col(0.95, 0.005, w.atm.hue))
      g.addColorStop(0.6, col(0.7, 0.01, w.atm.hue))
      g.addColorStop(1, col(0.42, 0.01, w.atm.hue))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(0, 0, R, R * 1.18, 0.2, 0, 6.3)
      ctx.fill()
      noShadow()
      ctx.strokeStyle = ink
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.7 * ease(e.appear)
      ctx.stroke()
      // it holds a small copy of your light
      const rx = clamp(-(L.x - e.x) * 0.28, -R * 0.6, R * 0.6)
      const ry = clamp(-(L.y - e.y) * 0.28, -R * 0.7, R * 0.7)
      const glow = ctx.createRadialGradient(rx, ry, 0, rx, ry, R * 0.5)
      glow.addColorStop(0, col(0.97, 0.06, 78, 0.95))
      glow.addColorStop(1, col(0.8, 0.04, 78, 0))
      ctx.globalAlpha = ease(e.appear)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(rx, ry, R * 0.5, 0, 6.3)
      ctx.fill()
      break
    }
    case 'archivist': {
      const n = 3 + Math.min(4, Math.floor(w.brain.profile.marks.length / 18))
      for (let k = 0; k < n; k++) {
        const a = (k - n / 2) * 0.12 + Math.sin(w.t * 5 + k) * 0.04 * e.rustle
        ctx.save()
        ctx.rotate(a)
        ctx.translate(k * 2 - n, -k * 2)
        ctx.fillStyle = k === n - 1 ? lit(R) : paperLo
        ctx.beginPath()
        ctx.roundRect(-R * 0.8, -R * 0.55, R * 1.6, R * 1.1, 2)
        ctx.fill()
        if (k === n - 1) {
          noShadow()
          ctx.strokeStyle = ink
          ctx.globalAlpha = 0.4 * ease(e.appear)
          ctx.lineWidth = 1
          for (let l = 0; l < 4; l++) {
            ctx.beginPath()
            ctx.moveTo(-R * 0.6, -R * 0.3 + l * R * 0.2)
            ctx.lineTo(R * (0.6 - (l % 2) * 0.35), -R * 0.3 + l * R * 0.2)
            ctx.stroke()
          }
          ctx.globalAlpha = ease(e.appear)
          ctx.fillStyle = acc
          ctx.beginPath()
          ctx.arc(R * 0.5, R * 0.3, R * 0.1, 0, 6.3)
          ctx.fill()
        }
        ctx.restore()
      }
      break
    }
    case 'stranger': {
      const calm = 1 - mem.wary
      const pts = 30
      ctx.beginPath()
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * 6.2832
        const nz = Math.sin(a * 3 + w.t * (0.5 + mem.wary * 2.4)) * 0.1 + Math.sin(a * 5 - w.t * (0.9 + mem.wary * 3)) * 0.07 * (0.5 + mem.wary)
        const rr = R * (0.88 + nz + e.fleeing * 0.05)
        const x = Math.cos(a) * rr
        const y = Math.sin(a) * rr * 1.08
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = col(0.11, 0.01, w.atm.hue)
      ctx.fill()
      noShadow()
      ctx.strokeStyle = col(0.5 + calm * 0.25, 0.012 + 0.16 * mem.bond * calm, e.def.hue, 0.3 + 0.5 * calm)
      ctx.lineWidth = 1.3
      ctx.stroke()
      break
    }
    case 'witness': {
      const open = 1 - e.blink * 0.92
      ctx.fillStyle = lit(R * 1.2)
      ctx.beginPath()
      ctx.moveTo(-R * 1.25, 0)
      ctx.quadraticCurveTo(0, -R * 1.1 * open, R * 1.25, 0)
      ctx.quadraticCurveTo(0, R * 1.1 * open, -R * 1.25, 0)
      ctx.fill()
      noShadow()
      ctx.save()
      ctx.clip()
      const ix = e.gaze.x * R * 0.55
      const iy = e.gaze.y * R * 0.3
      ctx.fillStyle = acc
      ctx.beginPath()
      ctx.arc(ix, iy, R * 0.5, 0, 6.3)
      ctx.fill()
      ctx.fillStyle = ink
      const dil = 0.22 + 0.1 * clamp(w.lamp.stillFor / 3)
      ctx.beginPath()
      ctx.arc(ix, iy, R * dil, 0, 6.3)
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = ink
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(-R * 1.25, 0)
      ctx.quadraticCurveTo(0, -R * 1.1 * open, R * 1.25, 0)
      ctx.quadraticCurveTo(0, R * 1.1 * open, -R * 1.25, 0)
      ctx.stroke()
      break
    }
    case 'seed': {
      const feed = enc ? ((enc.data.feed as number) ?? 0) : 0
      const growth = clamp(mem.growth + feed * 0.07)
      const dormant = mem.neglect >= 3 && mem.growth < 0.1 && feed < 0.5
      const n = 5 + Math.floor(growth * 7)
      const openness = 0.3 + 0.7 * growth
      const len = R * (0.7 + growth * 0.8)
      for (let k = 0; k < n; k++) {
        const a = (k / (n - 1) - 0.5) * 6.2832 * openness * (n - 1) / n - 1.5708 + Math.sin(w.t * 0.5 + k) * 0.05 * w.motion
        ctx.save()
        ctx.rotate(a)
        ctx.fillStyle = dormant ? col(0.34, 0.005, w.atm.hue) : k % 2 ? paperLo : lit(R)
        ctx.beginPath()
        // a petal: narrow at the root, full toward the tip
        const wd = R * (0.22 + growth * 0.14)
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(len * 0.25, -wd * 1.1, len * 0.8, -wd * 1.5, len, 0)
        ctx.bezierCurveTo(len * 0.8, wd * 1.5, len * 0.25, wd * 1.1, 0, 0)
        ctx.fill()
        noShadow()
        ctx.strokeStyle = ink
        ctx.globalAlpha = 0.3 * ease(e.appear)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(len * 0.1, 0)
        ctx.lineTo(len * 0.85, 0)
        ctx.stroke()
        ctx.globalAlpha = ease(e.appear)
        ctx.restore()
      }
      ctx.fillStyle = dormant ? col(0.3, 0.005, w.atm.hue) : acc
      ctx.beginPath()
      ctx.arc(0, 0, R * (0.16 + 0.1 * growth), 0, 6.3)
      ctx.fill()
      break
    }
  }
  noShadow()
  // signs of life, even when nobody is looking
  if (e.id === 'listener' && !enc) {
    for (let k = 0; k < 2; k++) {
      const ph = ((w.t * 0.14 + k * 0.5 + e.phase * 0.05) % 1)
      ctx.strokeStyle = col(0.8, 0.03 + 0.1 * mem.bond, e.def.hue, (1 - ph) * 0.28 * ease(e.appear))
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(0, 0, R * (1.05 + ph * 1.6), 0, 6.3)
      ctx.stroke()
    }
  }
  // a quiet invitation: something you haven't met breathes a ring when you come near
  if (mem.touches === 0 && e.prox > 0.25 && !enc && e.appear > 0.9) {
    const br = 0.5 + 0.5 * Math.sin(w.t * 2.2 + e.phase)
    ctx.setLineDash([3, 6])
    ctx.strokeStyle = col(0.9, 0.04, 80, (0.15 + 0.3 * br) * e.prox)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(0, 0, R * 1.5 + 6 + 4 * br, 0, 6.3)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // a faint ring when something is tempting you, so that the world is not all hidden
  void accSoft
  ctx.restore()

  // focus ring for keyboard users
  if (w.focus === e.id) {
    ctx.save()
    ctx.strokeStyle = col(0.9, 0.05, 80, 0.9)
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 5])
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.r * e.scale * 1.6 + 8, 0, 6.3)
    ctx.stroke()
    ctx.restore()
  }
}

// ───────────────────────────── the dark ─────────────────────────────

function hole(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (r < 1 || a <= 0) return
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(0,0,0,${a})`)
  g.addColorStop(0.35, `rgba(0,0,0,${a * 0.78})`)
  g.addColorStop(0.7, `rgba(0,0,0,${a * 0.3})`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = g
  c.beginPath()
  c.arc(x, y, r, 0, 6.3)
  c.fill()
}

function drawDarkness(w: World, g: Gfx) {
  const c = g.dctx
  const { w: W, h: H, dpr } = w
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.globalCompositeOperation = 'source-over'
  c.clearRect(0, 0, W, H)
  c.fillStyle = col(0.075, 0.006 + w.atm.chroma * 0.4, w.atm.hue, clamp(0.74 + 0.18 * w.dim + 0.08 * w.hush + 0.1 * w.night + (w.asleep ? 0.06 : 0)))
  c.fillRect(0, 0, W, H)
  c.globalCompositeOperation = 'destination-out'

  const base = (190 + Math.min(W, H) * 0.19) * w.atm.lamp
  const bell = w.phase === 'release' ? Math.sin(Math.PI * clamp(w.releaseT / 3)) : 0
  const lit = ease(clamp(w.ignite)) * (w.ignite < 1 ? 0.82 + 0.18 * Math.sin(w.t * 31) * Math.sin(w.t * 17) : 1)
  const R = base * (1 - 0.22 * w.dim - 0.55 * w.hush - 0.25 * w.night) * (1 + 3.2 * bell) * lit
  hole(c, w.lamp.x, w.lamp.y, R, 1)

  for (const e of w.ents) {
    const r = e.r * e.scale
    let a = (0.3 + 0.55 * e.awake) * e.appear
    let rad = r * (2.3 + 1.2 * e.awake)
    if (e.tempt && !e.tempt.done) {
      a = Math.max(a, 0.55)
      rad = r * 3.2
    }
    if (w.enc?.id === e.id) {
      a = 0.95
      rad = r * 3.2
    }
    hole(c, e.x, e.y, rad, a * (1 - 0.7 * w.hush))
  }
  if (w.enc?.id === 'archivist') {
    for (const m of w.brain.profile.marks) hole(c, m.x * W, m.y * H, 34, 0.55)
  }
  w.letters.forEach((p, i) => {
    const a = w.letterPulse[i] * 0.55 + w.know * 0.18
    if (a > 0.02) hole(c, p.x, p.y, Math.min(W, H) * 0.2, a)
  })
  if (w.beacon.vis > 0.01) hole(c, W * 0.5, H * 0.9, 110, 0.85 * w.beacon.vis)
  c.globalCompositeOperation = 'source-over'
}

// ───────────────────────────── light that is always seen ─────────────────────────────

/** Dust in the lamp, and the faint aura of anything that is awake. */
function drawAir(w: World, ctx: CanvasRenderingContext2D) {
  const L = w.lamp
  const R = (190 + Math.min(w.w, w.h) * 0.19) * w.atm.lamp * ease(clamp(w.ignite)) * (1 - 0.55 * w.hush)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const e of w.ents) {
    if (e.appear < 0.2) continue
    const mem = w.brain.profile.entities[e.id]
    const a = (0.05 + 0.22 * e.awake) * e.appear * (1 - 0.7 * w.hush)
    const r = e.r * e.scale * (2.2 + 0.4 * Math.sin(e.phase))
    const g = ctx.createRadialGradient(e.x, e.y, e.r * e.scale * 0.6, e.x, e.y, r)
    g.addColorStop(0, col(0.8, 0.012 + 0.16 * mem.bond, e.def.hue, a))
    g.addColorStop(1, col(0.6, 0.01, e.def.hue, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(e.x, e.y, r, 0, 6.3)
    ctx.fill()
    // arriving: a ring leaves it, once
    const ta = w.t - e.appearAt
    if (ta > 0 && ta < 2.6) {
      const q = ta / 2.6
      ctx.strokeStyle = col(0.9, 0.05, e.def.hue, (1 - q) * 0.5)
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r * e.scale * (1.2 + q * 3.2), 0, 6.3)
      ctx.stroke()
    }
  }
  for (const m of w.motes) {
    const d = Math.hypot(m.x - L.x, m.y - L.y)
    let a = clamp(1 - d / (R * 0.95)) * 0.5
    // dust also catches the glow of the things that are awake
    for (const e of w.ents) {
      const de = Math.hypot(m.x - e.x, m.y - e.y)
      const ra = e.r * e.scale * 3.2
      if (de < ra) a = Math.max(a, (1 - de / ra) * 0.3 * e.awake)
    }
    if (a < 0.03) continue
    ctx.fillStyle = col(0.9, 0.04, 80, a * m.z)
    ctx.beginPath()
    ctx.arc(m.x, m.y, 0.6 + m.z * 1.1, 0, 6.3)
    ctx.fill()
  }
  ctx.restore()
}

function drawSpecks(w: World, ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const s of w.specks) {
    const age = clamp((w.t - s.t0) / 1.6)
    const word = s.to === 'word'
    ctx.fillStyle = col(0.92, 0.07, 78, (word ? 0.95 : 0.7) * (1 - age * 0.3))
    ctx.beginPath()
    ctx.arc(s.x, s.y, word ? 3 : 2.2, 0, 6.3)
    ctx.fill()
    if (word) {
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 18)
      g.addColorStop(0, col(0.9, 0.07, 78, 0.35))
      g.addColorStop(1, col(0.9, 0.07, 78, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(s.x, s.y, 18, 0, 6.3)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawBeacon(w: World, ctx: CanvasRenderingContext2D) {
  const v = w.beacon.vis
  if (v < 0.02) return
  const x = w.w * 0.5
  const y = w.h * 0.9
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const p = w.beacon.dwell / 1.4
  for (let k = 0; k < 3; k++) {
    const ph = ((w.t * 0.28 + k / 3) % 1)
    ctx.strokeStyle = col(0.88, 0.07, 78, (1 - ph) * 0.55 * v)
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.arc(x, y, 10 + ph * 46, 0, 6.3)
    ctx.stroke()
  }
  ctx.fillStyle = col(0.95, 0.06, 80, 0.9 * v)
  ctx.beginPath()
  ctx.arc(x, y, 4 + 3 * Math.sin(w.t * 1.3) * 0.5 + 6 * p, 0, 6.3)
  ctx.fill()
  ctx.restore()
}

/** The witness replays you: a ghost of your own light. */
function drawGhost(w: World, ctx: CanvasRenderingContext2D) {
  const enc = w.enc
  if (!enc || enc.id !== 'witness') return
  const rep = (enc.data.replay as { x: number; y: number; t: number }[]) ?? []
  if (rep.length < 4) return
  const t0 = rep[0].t
  const span = Math.max(1, rep[rep.length - 1].t - t0)
  const head = t0 + (enc.t / 12) * span
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  let last: { x: number; y: number } | null = null
  for (const p of rep) {
    if (p.t > head) break
    const age = 1 - (head - p.t) / span
    if (last) {
      ctx.strokeStyle = col(0.85, 0.05, DEF.witness.hue, 0.5 * age * age)
      ctx.lineWidth = 1 + 2 * age
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    last = p
  }
  if (last) {
    const gl = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 70)
    gl.addColorStop(0, col(0.92, 0.07, DEF.witness.hue, 0.7))
    gl.addColorStop(1, col(0.8, 0.05, DEF.witness.hue, 0))
    ctx.fillStyle = gl
    ctx.beginPath()
    ctx.arc(last.x, last.y, 70, 0, 6.3)
    ctx.fill()
  }
  ctx.restore()
}

function drawWhispers(w: World, ctx: CanvasRenderingContext2D) {
  for (const s of w.whispers) {
    const inn = clamp((w.t - s.t0) / 0.9)
    const out = clamp((s.t0 + s.dur - w.t) / 1.6)
    const a = Math.min(inn, out) * (1 - 0.6 * w.hush)
    if (a <= 0.01) continue
    ctx.save()
    ctx.globalAlpha = a
    ctx.font = `italic 400 ${s.size}px ${SERIF}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = s.tint >= 0 ? col(0.9, 0.05, s.tint) : col(0.92, 0.012, w.atm.hue)
    ctx.shadowColor = 'rgba(0,0,0,.8)'
    ctx.shadowBlur = 14
    ctx.translate(s.x, s.y + (1 - inn) * 8)
    ctx.rotate(s.rot)
    const lines = wrap(ctx, s.text, w.w * 0.82 - s.x * 0.2)
    lines.forEach((l, i) => ctx.fillText(l, 0, i * s.size * 1.25))
    ctx.restore()
  }
}

function drawReveal(w: World, ctx: CanvasRenderingContext2D) {
  if (w.phase !== 'reveal' || !w.revealLines.length) return
  const size = clamp(w.w * 0.034, 22, 46)
  const x = w.w * (w.w < 640 ? 0.07 : 0.09)
  let y = w.h * 0.3
  ctx.save()
  ctx.font = `italic 400 ${size}px ${SERIF}`
  ctx.shadowColor = 'rgba(0,0,0,.85)'
  ctx.shadowBlur = 18
  w.revealLines.forEach((line, i) => {
    const start = 2.2 + i * 3.4
    const inn = ease(clamp((w.revealT - start) / 1.6))
    const latest = w.revealT < start + 3.4 || i === w.revealLines.length - 1
    ctx.globalAlpha = inn * (latest ? 1 : 0.5)
    ctx.fillStyle = col(0.93, 0.015, w.atm.hue)
    const lines = wrap(ctx, line, w.w * 0.82 - x)
    lines.forEach((l, k) => ctx.fillText(l, x, y + (1 - inn) * 10 + k * size * 1.25))
    y += lines.length * size * 1.25 + size * 0.7
  })
  ctx.restore()
}

function drawShock(w: World, ctx: CanvasRenderingContext2D) {
  if (w.phase !== 'release') return
  const p = clamp(w.releaseT / 2.8)
  if (p >= 1) return
  const [x, y] = [w.w * 0.5, w.h * 0.5]
  const R = ease(p) * Math.hypot(w.w, w.h) * 0.7
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const d of [0, 0.12, 0.26]) {
    const q = clamp(p - d)
    if (q <= 0) continue
    ctx.strokeStyle = col(0.9, 0.07, w.atm.hue, (1 - q) * 0.6)
    ctx.lineWidth = 2.5 * (1 - q) + 0.5
    ctx.beginPath()
    ctx.arc(x, y, ease(q) * Math.hypot(w.w, w.h) * 0.7, 0, 6.3)
    ctx.stroke()
  }
  void R
  ctx.restore()
}

function drawLamp(w: World, ctx: CanvasRenderingContext2D) {
  const L = w.lamp
  const k = 1 - 0.7 * w.hush
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const r = 60 + Math.min(40, L.speed * 0.05)
  const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, r)
  g.addColorStop(0, col(0.95, 0.07, 78, 0.5 * k))
  g.addColorStop(1, col(0.8, 0.05, 78, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(L.x, L.y, r, 0, 6.3)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = col(0.98, 0.03, 85, 0.95 * k)
  ctx.beginPath()
  ctx.arc(L.x, L.y, L.down ? 5.5 : 3.5, 0, 6.3)
  ctx.fill()
  ctx.restore()
  void lerp
}
