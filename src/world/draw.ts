import { DEF } from '../engine/entities'
import { clamp, ease, lerp, rngOf, type Ent } from './scene'
import type { World } from './World'
import { drawDoors, drawLife, drawProps, ground } from './places'

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

  // ── the floor ────────────────────────────────────────────────────────
  const gr = ground(w)
  ctx.fillStyle = col(gr.l, gr.chroma, gr.hue)
  ctx.fillRect(0, 0, W, H)
  // the floor is not one flat colour: lighter and warmer toward the middle, cooler at the walls
  const wash = ctx.createRadialGradient(W * 0.5, H * 0.58, 0, W * 0.5, H * 0.58, Math.max(W, H) * 0.7)
  wash.addColorStop(0, col(gr.l + 0.12, gr.chroma * 0.9, gr.hue + 28, 0.55))
  wash.addColorStop(0.6, col(gr.l, gr.chroma, gr.hue, 0))
  wash.addColorStop(1, col(gr.l - 0.1, gr.chroma * 1.15, gr.hue - 24, 0.5))
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, W, H)
  if (g.tex) {
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = 0.55
    ctx.fillStyle = g.tex
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  if (w.place === 'hall') drawWordmark(w, ctx)
  drawProps(w, ctx)
  drawMarks(w, ctx)
  drawTrails(w, ctx)
  drawEncounterFloor(w, ctx)

  // ── the things ───────────────────────────────────────────────────────
  const sorted = [...w.present].sort((a, b) => a.y - b.y)
  for (const e of sorted) drawEntity(w, ctx, e)

  // ── the dark ─────────────────────────────────────────────────────────
  drawDarkness(w, g)
  ctx.drawImage(g.dark, 0, 0, W, H)

  // ── things that are seen regardless of light ─────────────────────────
  drawLife(w, ctx)
  drawDoors(w, ctx)
  drawAir(w, ctx)
  drawSpecks(w, ctx)
  drawBeacon(w, ctx)
  drawGhost(w, ctx)
  drawVigil(w, ctx)
  drawTug(w, ctx)
  drawGhost2(w, ctx)
  drawGifts(w, ctx)
  drawDepth(w, ctx)
  drawWhispers(w, ctx)
  drawTitles(w, ctx)
  drawReveal(w, ctx)
  drawShock(w, ctx)
  drawLamp(w, ctx)
  if (w.curtain > 0.01) {
    ctx.fillStyle = `rgba(4,5,5,${w.curtain})`
    ctx.fillRect(0, 0, W, H)
  }
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
    const lit = clamp(w.letterPulse[i] * 0.9 + clamp(w.know * 5.5 - i) * (w.brain.profile.ended ? 0.85 : 0.35))
    ctx.save()
    ctx.translate(x + widths[i] / 2, base + dy)
    ctx.rotate(jit)
    // pressed into the paper: a light edge and a dark body
    ctx.fillStyle = col(0.7, 0.05 + w.atm.chroma * 0.5, w.atm.hue, 0.5)
    ctx.fillText(c, -widths[i] / 2 + 1.5, 1.5)
    ctx.fillStyle = col(0.36 + 0.4 * lit, 0.09 + w.atm.chroma * 0.6 + 0.05 * lit, lit > 0.05 ? 78 : w.atm.hue, 0.7 + 0.2 * lit)
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
    if ((m.place ?? 'hall') !== w.place) return
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
  for (const e of w.ents.filter((q) => q.place === w.place)) {
    if (!w.brain.profile.entities[e.id].gone) continue
    ctx.fillStyle = col(0.06, 0.005, w.atm.hue, 0.5)
    ctx.beginPath()
    ctx.ellipse(e.hx, e.hy, e.r * 1.1, e.r * 0.9, 0.3, 0, 6.3)
    ctx.fill()
  }
}

function drawTrails(w: World, ctx: CanvasRenderingContext2D) {
  const e = w.byId.wanderer
  if (e.place !== w.place || e.trail.length < 2) return
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
  // everything has its own colour from the start; closeness makes it deeper
  const paper = col(0.86, 0.035 + 0.05 * e.awake, e.def.hue)
  const paperLo = col(0.68, 0.06, e.def.hue)
  const ink = col(0.2, 0.05, e.def.hue)
  const acc = col(0.72, 0.1 + 0.16 * mem.bond, e.def.hue)
  const accSoft = col(0.72, 0.1 + 0.16 * mem.bond, e.def.hue, 0.5)

  // a shadow that falls away from the lamp
  const dx = e.x - L.x
  const dy = e.y - L.y
  const d = Math.hypot(dx, dy) || 1
  const len = clamp(2400 / (d + 160) + R * 0.08, 5, 24) * (e.id === 'vigil' ? 1.5 : 1)

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
      ctx.fillStyle = col(0.2, 0.09, 295)
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
    case 'vigil': {
      // stones: one more for every time you have carried it to the end; they fall if you stay away
      const n = clamp(2 + mem.completions - Math.floor(mem.neglect / 2), 1, 7)
      const toppled = mem.neglect >= 4
      const p = enc ? enc.p : 0
      const r2 = rngOf(5)
      for (let i = 0; i < n; i++) {
        const wd = R * (1.55 - i * 0.14)
        const ht = R * 0.46
        const y = R * 0.8 - i * ht * 0.92
        const lean = (r2() - 0.5) * 0.12 * (i + 1) + Math.sin(w.t * 0.4 + i) * 0.004 * w.motion
        ctx.save()
        if (toppled) ctx.translate((r2() - 0.5) * R * 2.2, R * 0.55 + (r2() - 0.5) * R * 0.5)
        else ctx.translate(lean * R * 2, y)
        ctx.rotate(toppled ? (r2() - 0.5) * 2.4 : lean)
        const g = ctx.createRadialGradient(ux * wd * 0.3, uy * ht * 0.4 - ht * 0.2, 2, 0, 0, wd * 0.7)
        g.addColorStop(0, col(0.46, 0.01, w.atm.hue))
        g.addColorStop(0.7, col(0.24, 0.01, w.atm.hue))
        g.addColorStop(1, col(0.14, 0.01, w.atm.hue))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(0, 0, wd * 0.5, ht * 0.5, 0, 0, 6.3)
        ctx.fill()
        ctx.restore()
      }
      noShadow()
      if (!toppled) {
        // heat between the stones, rising with how long you have held
        for (let i = 1; i < n; i++) {
          const y = R * 0.8 - i * R * 0.46 * 0.92 + R * 0.23
          ctx.strokeStyle = col(0.82, 0.02 + 0.17 * Math.max(mem.bond, p), 80, (0.12 + 0.8 * p) * ease(e.appear))
          ctx.lineWidth = 1.5 + 2 * p
          ctx.beginPath()
          ctx.moveTo(-R * (0.55 - i * 0.05), y)
          ctx.lineTo(R * (0.55 - i * 0.05), y)
          ctx.stroke()
        }
      }
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
  // dusk, not black: the dark is a deep tone of the place, and thin enough to see the room through
  c.fillStyle = col(0.17, 0.06 + w.atm.chroma * 0.5, ground(w).hue, clamp(0.4 + 0.2 * w.dim + 0.1 * w.hush + 0.12 * w.night + (w.asleep ? 0.08 : 0) + 0.1 * w.tension))
  c.fillRect(0, 0, W, H)
  c.globalCompositeOperation = 'destination-out'

  const base = (190 + Math.min(W, H) * 0.19) * w.atm.lamp
  const bell = w.phase === 'release' ? Math.sin(Math.PI * clamp(w.releaseT / 3)) : 0
  const lit = ease(clamp(w.ignite)) * (w.ignite < 1 ? 0.82 + 0.18 * Math.sin(w.t * 31) * Math.sin(w.t * 17) : 1) * (1 - 0.55 * w.flicker * Math.abs(Math.sin(w.t * 23))) * (1 - 0.98 * w.blackout)
  const R = base * (1 - 0.22 * w.dim - 0.55 * w.hush - 0.25 * w.night) * (1 + 3.2 * bell) * lit
  hole(c, w.lamp.x, w.lamp.y, R, 1)

  for (const e of w.present) {
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
    hole(c, e.x, e.y, rad * (1 + 0.8 * w.blackout), Math.min(1, a * (1 + 1.4 * w.blackout)) * (1 - 0.7 * w.hush))
  }
  if (w.enc?.id === 'archivist') {
    for (const m of w.brain.profile.marks) hole(c, m.x * W, m.y * H, 34, 0.55)
  }
  w.letters.forEach((p, i) => {
    const a = w.letterPulse[i] * 0.55 + w.know * (w.brain.profile.ended ? 0.45 : 0.18)
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
  for (const e of w.present) {
    if (e.appear < 0.2) continue
    const mem = w.brain.profile.entities[e.id]
    const a = (0.05 + 0.22 * e.awake) * e.appear * (1 - 0.7 * w.hush) * (1 + 2.2 * w.blackout)
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
    for (const e of w.present) {
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

/** The two hands it asks for, and the cord of light between them while you hold. */
function drawVigil(w: World, ctx: CanvasRenderingContext2D) {
  const enc = w.enc
  if (!enc || enc.id !== 'vigil') return
  const e = w.byId.vigil
  const p = enc.p
  const d = enc.data as Record<string, number>
  const both = d.both === 1
  const y = w.h - Math.max(54, w.h * 0.08)
  const caps = [
    { x: Math.max(54, w.w * 0.06), label: 'z', on: w.held.left || [...w.touches.values()].some((x) => x < w.w * 0.45) },
    { x: w.w - Math.max(54, w.w * 0.06), label: '/', on: w.held.right || [...w.touches.values()].some((x) => x > w.w * 0.55) },
  ]
  const fade = (enc.leaving ? clamp(1 - (w.t - enc.leaveAt) / 1.2) : 1) * ease(clamp(enc.t / 0.8))
  ctx.save()
  ctx.globalAlpha = fade
  // cord: each hand to the stones
  ctx.lineCap = 'round'
  for (const c of caps) {
    const glow = (c.on ? 0.25 : 0) + 0.75 * p
    ctx.strokeStyle = col(0.9, 0.08 * glow, 85, 0.12 + 0.8 * glow)
    ctx.lineWidth = 1 + 3 * glow
    ctx.setLineDash(c.on ? [] : [2, 8])
    ctx.beginPath()
    ctx.moveTo(c.x, y)
    ctx.quadraticCurveTo((c.x + e.x) / 2, y - (y - e.y) * 0.1, e.x, e.y + e.r * e.scale * 0.9)
    ctx.stroke()
  }
  ctx.setLineDash([])
  // a column of light climbs from the stones as you hold
  if (p > 0.02) {
    const h = (e.y - e.r * e.scale) * ease(p)
    const g = ctx.createLinearGradient(0, e.y - e.r * e.scale, 0, e.y - e.r * e.scale - h)
    g.addColorStop(0, col(0.92, 0.1, 85, 0.5 * p))
    g.addColorStop(1, col(0.92, 0.1, 85, 0))
    ctx.fillStyle = g
    ctx.fillRect(e.x - 2 - 6 * p, e.y - e.r * e.scale - h, 4 + 12 * p, h)
  }
  // the two places to hold
  for (const c of caps) {
    ctx.fillStyle = c.on ? col(0.9, 0.1, 85, 0.95) : col(0.2, 0.01, w.atm.hue, 0.85)
    ctx.strokeStyle = col(0.85, 0.05, 85, c.on ? 1 : 0.55)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    if (w.coarse) ctx.arc(c.x, y, 30, 0, 6.3)
    else ctx.roundRect(c.x - 24, y - 24, 48, 48, 9)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = c.on ? col(0.15, 0.02, 85) : col(0.85, 0.05, 85, 0.9)
    ctx.font = `700 22px "Bricolage Grotesque Variable", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(w.coarse ? '●' : c.label, c.x, y + 1)
  }
  if (both && p > 0.02) {
    ctx.globalCompositeOperation = 'lighter'
    const gl = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * e.scale * (2 + 2 * p))
    gl.addColorStop(0, col(0.9, 0.1, 85, 0.35 * p))
    gl.addColorStop(1, col(0.9, 0.1, 85, 0))
    ctx.fillStyle = gl
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.r * e.scale * (2 + 2 * p), 0, 6.3)
    ctx.fill()
  }
  ctx.restore()
}

/** The cord between your lamp and whatever has taken it. */
function drawTug(w: World, ctx: CanvasRenderingContext2D) {
  if (!w.tug) return
  const e = w.byId[w.tug.by]
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = col(0.9, 0.08, DEF.wanderer.hue, 0.5)
  ctx.lineWidth = 1.6
  ctx.setLineDash([3, 6])
  ctx.lineDashOffset = -w.t * 40
  ctx.beginPath()
  ctx.moveTo(w.lamp.x, w.lamp.y)
  ctx.quadraticCurveTo((w.lamp.x + e.x) / 2 + Math.sin(w.t * 3) * 14, (w.lamp.y + e.y) / 2 + Math.cos(w.t * 2.4) * 14, e.x, e.y)
  ctx.stroke()
  ctx.restore()
}

/** Someone crossing who is not any of them: a small warm light, and where it has been. */
function drawGhost2(w: World, ctx: CanvasRenderingContext2D) {
  const g = w.ghost
  if (!g) return
  const a = clamp(Math.min((w.t - g.t0) / 2, 1)) * 0.8
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, 90)
  grad.addColorStop(0, col(0.88, 0.07, 62, 0.4 * a))
  grad.addColorStop(1, col(0.8, 0.05, 62, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(g.x, g.y, 90, 0, 6.3)
  ctx.fill()
  ctx.fillStyle = col(0.95, 0.04, 70, a)
  ctx.beginPath()
  ctx.arc(g.x, g.y, 3, 0, 6.3)
  ctx.fill()
  // footfalls
  for (let i = 1; i < 9; i++) {
    const fx = g.x - Math.sign(g.vx || 1) * i * 34
    ctx.fillStyle = col(0.8, 0.04, 62, a * (1 - i / 9) * 0.35)
    ctx.beginPath()
    ctx.ellipse(fx, g.y + (i % 2 ? 12 : -12) + 18, 4, 7, 0, 0, 6.3)
    ctx.fill()
  }
  ctx.restore()
}

/** Where gift number i lies on the hearth ring. */
export function giftPos(w: World, i: number, n: number): [number, number] {
  const x = w.w * 0.5
  const y = w.h * 0.64
  const R = Math.min(w.w, w.h) * 0.085
  const a = Math.PI * (0.05 + (0.9 * (i + 0.5)) / Math.max(n, 4)) + Math.PI
  return [x + Math.cos(a) * R * 1.5, y + Math.sin(a) * R * 0.95 - 4]
}

/** What you have been given, lying on the hearth ring in the hall. */
function drawGifts(w: World, ctx: CanvasRenderingContext2D) {
  if (w.place !== 'hall') return
  const gifts = w.brain.profile.gifts
  if (!gifts.length) return
  const x = w.w * 0.5
  const y = w.h * 0.64
  const R = Math.min(w.w, w.h) * 0.085
  ctx.save()
  gifts.forEach((g, i) => {
    const a = Math.PI * (0.05 + (0.9 * (i + 0.5)) / Math.max(gifts.length, 4)) + Math.PI
    const gx = x + Math.cos(a) * R * 1.5
    const gy = y + Math.sin(a) * R * 0.95 - 4 + Math.sin(w.t * 0.8 + i) * 1.5 * w.motion
    const hue = DEF[g.from].hue
    const near = clamp(1 - Math.hypot(w.lamp.x - gx, w.lamp.y - gy) / 160)
    ctx.globalCompositeOperation = 'lighter'
    const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, 26 + 20 * near)
    gl.addColorStop(0, col(0.85, 0.12, hue, 0.25 + 0.4 * near))
    gl.addColorStop(1, col(0.7, 0.08, hue, 0))
    ctx.fillStyle = gl
    ctx.beginPath()
    ctx.arc(gx, gy, 26 + 20 * near, 0, 6.3)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = col(0.86, 0.04 + 0.1 * near, hue)
    ctx.strokeStyle = col(0.2, 0.01, hue, 0.8)
    ctx.lineWidth = 1
    ctx.beginPath()
    switch (g.from) {
      case 'listener':
        ctx.arc(gx, gy, 7, 0, 6.3)
        break
      case 'wanderer':
        ctx.ellipse(gx, gy, 3, 11, 0.6, 0, 6.3)
        break
      case 'mirror':
        ctx.moveTo(gx - 7, gy + 6)
        ctx.lineTo(gx + 2, gy - 9)
        ctx.lineTo(gx + 8, gy + 5)
        ctx.closePath()
        break
      case 'archivist':
        ctx.rect(gx - 8, gy - 5, 16, 11)
        break
      case 'witness':
        ctx.arc(gx, gy, 6, 0, 6.3)
        break
      default:
        ctx.ellipse(gx, gy, 8, 5.5, 0.3, 0, 6.3)
    }
    ctx.fill()
    ctx.stroke()
  })
  ctx.restore()
}

/** The second forms: the call, last visit's path, the diary's slips. Seen regardless of light. */
function drawDepth(w: World, ctx: CanvasRenderingContext2D) {
  const enc = w.enc
  if (!enc) return
  const d = enc.data as Record<string, any>
  const e = w.byId[enc.id]
  const fade = enc.leaving ? clamp(1 - (w.t - enc.leaveAt) / 1.2) : 1
  ctx.save()
  ctx.globalAlpha = fade
  ctx.globalCompositeOperation = 'lighter'
  if (d.mode === 'call') {
    // rings from the listener each time it answers; and one from your lamp while you call
    for (const t0 of d.rings as number[]) {
      const age = w.t - t0
      if (age < 0 || age > 3.2) continue
      for (let k = 0; k < 3; k++) {
        const q = clamp(age / 3.2 - k * 0.08)
        ctx.strokeStyle = col(0.9, 0.08, DEF.listener.hue, (1 - q) * 0.7)
        ctx.lineWidth = 2 * (1 - q) + 0.5
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r * e.scale * (1 + q * 4), 0, 6.3)
        ctx.stroke()
      }
    }
    if (d.calling) {
      const q = (w.t * 1.4) % 1
      ctx.strokeStyle = col(0.92, 0.09, 85, (1 - q) * 0.7)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(w.lamp.x, w.lamp.y, 10 + q * 70, 0, 6.3)
      ctx.stroke()
    }
  }
  if (d.mode === 'past') {
    const pts = w.brain.profile.prevPath
    const n = Math.floor(pts.length / 2)
    const head = Math.min(n - 1, Math.floor(clamp(((d.t as number) ?? 0) / 16) * n))
    ctx.lineCap = 'round'
    for (let i = 1; i <= head; i++) {
      const age = 1 - (head - i) / n
      ctx.strokeStyle = col(0.88, 0.07, DEF.mirror.hue, 0.6 * age * age)
      ctx.lineWidth = 1 + 2.2 * age
      ctx.beginPath()
      ctx.moveTo(pts[(i - 1) * 2] * w.w, pts[(i - 1) * 2 + 1] * w.h)
      ctx.lineTo(pts[i * 2] * w.w, pts[i * 2 + 1] * w.h)
      ctx.stroke()
    }
    const hx = pts[head * 2] * w.w
    const hy = pts[head * 2 + 1] * w.h
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 80)
    g.addColorStop(0, col(0.95, 0.06, DEF.mirror.hue, 0.7))
    g.addColorStop(1, col(0.8, 0.04, DEF.mirror.hue, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(hx, hy, 80, 0, 6.3)
    ctx.fill()
  }
  if (d.mode === 'diary') {
    for (const s of d.slips as { x: number; y: number; read: boolean }[]) {
      const near = clamp(1 - Math.hypot(w.lamp.x - s.x, w.lamp.y - s.y) / 120)
      const gl = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 40 + 20 * near)
      gl.addColorStop(0, col(0.88, 0.1, DEF.archivist.hue, (s.read ? 0.12 : 0.3) + 0.3 * near))
      gl.addColorStop(1, col(0.7, 0.06, DEF.archivist.hue, 0))
      ctx.fillStyle = gl
      ctx.beginPath()
      ctx.arc(s.x, s.y, 40 + 20 * near, 0, 6.3)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = col(s.read ? 0.55 : 0.88, 0.01, w.atm.hue, 0.95)
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(Math.sin(s.x) * 0.3)
      ctx.fillRect(-14, -9, 28, 18)
      ctx.strokeStyle = col(0.2, 0.01, w.atm.hue, 0.5)
      ctx.beginPath()
      ctx.moveTo(-9, -3)
      ctx.lineTo(9, -3)
      ctx.moveTo(-9, 3)
      ctx.lineTo(4, 3)
      ctx.stroke()
      ctx.restore()
      ctx.globalCompositeOperation = 'lighter'
    }
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

/** A chapter heading, written across the floor, shown once. */
function drawTitles(w: World, ctx: CanvasRenderingContext2D) {
  for (const t of w.titles) {
    const inn = ease(clamp((w.t - t.t0) / 1.8))
    const out = ease(clamp((t.t0 + t.dur - w.t) / 2.4))
    const a = Math.min(inn, out)
    if (a <= 0.01) continue
    const size = clamp(Math.min(w.w * 0.075, w.h * 0.13), 38, 120)
    ctx.save()
    ctx.globalAlpha = a * 0.9
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ;(ctx as unknown as { letterSpacing: string }).letterSpacing = `${(0.34 - 0.12 * inn).toFixed(2)}em`
    ctx.shadowColor = 'rgba(0,0,0,.7)'
    ctx.shadowBlur = 24
    ctx.fillStyle = col(0.9, 0.02, w.atm.hue)
    ctx.font = `700 ${size}px ${GROTESK}`
    ctx.fillText(t.text.toUpperCase(), w.w / 2, w.h * 0.16)
    ctx.font = `italic 400 ${Math.round(size * 0.34)}px ${SERIF}`
    ctx.fillStyle = col(0.7, 0.03, 80)
    ctx.fillText(t.roman, w.w / 2, w.h * 0.16 - size * 0.82)
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
    const start = w.pace.start + i * w.pace.gap
    const inn = ease(clamp((w.revealT - start) / 1.6))
    const latest = w.revealT < start + w.pace.gap || i === w.revealLines.length - 1
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
  const k = (1 - 0.7 * w.hush) * (1 - 0.95 * w.blackout) * (1 - 0.5 * w.flicker * Math.abs(Math.sin(w.t * 23)))
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
