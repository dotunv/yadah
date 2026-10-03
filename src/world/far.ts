import { FACTS, FACT_BY_ID, FAR, FAR_IDS, TAG_LABEL, factsOf, progressOf, type Fact, type FarId } from '../engine/knowledge'
import { isFar } from '../engine/places'
import { clamp, ease, rngOf } from './scene'
import type { World } from './World'

/**
 * The seven far places, reached through the pond. Each is a different
 * arrangement of the same idea: a place that has things to tell you, marked by
 * small lights. Rest the lamp on one and it tells you.
 */

const col = (l: number, c: number, h: number, a = 1) => `oklch(${l} ${c} ${h} / ${a})`
const SERIF = '"Alegreya", "Iowan Old Style", Georgia, serif'
const GROTESK = '"Bricolage Grotesque Variable", "Helvetica Neue", system-ui, sans-serif'

// ───────────────────────────── where things are ─────────────────────────────

const SLOTS: [number, number][] = [
  [0.2, 0.44],
  [0.4, 0.68],
  [0.62, 0.42],
  [0.8, 0.64],
  [0.5, 0.54],
]

/** Where one of a place's five lights hangs. Each place arranges them differently. */
export function factPos(w: World, f: Fact): [number, number] {
  const k = factsOf(f.place).findIndex((x) => x.id === f.id)
  const pi = FAR_IDS.indexOf(f.place)
  const [sx, sy] = SLOTS[(k + pi) % 5]
  const r = rngOf(pi * 31 + k * 7 + 3)
  return [(sx + (r() - 0.5) * 0.07) * w.w, (sy + (r() - 0.5) * 0.07) * w.h]
}

/** The pond at the bottom of the garden. */
export const pondOf = (w: World) => ({ x: w.w * 0.7, y: w.h * 0.72, rx: Math.min(w.w * 0.1, 150), ry: Math.min(w.h * 0.075, 80) })

// ───────────────────────────── the floors ─────────────────────────────

export const FAR_GROUND: Record<FarId, { l: number; c: number; h: number }> = {
  japan: { l: 0.78, c: 0.04, h: 50 },
  ethiopia: { l: 0.66, c: 0.1, h: 70 },
  peru: { l: 0.56, c: 0.09, h: 125 },
  iceland: { l: 0.36, c: 0.04, h: 230 },
  india: { l: 0.64, c: 0.09, h: 48 },
  aotearoa: { l: 0.54, c: 0.1, h: 150 },
  morocco: { l: 0.66, c: 0.1, h: 40 },
}

export function drawFarProps(w: World, ctx: CanvasRenderingContext2D, id: FarId) {
  const { w: W, h: H } = w
  const r = rngOf(FAR_IDS.indexOf(id) * 101 + 5)
  switch (id) {
    case 'japan': {
      // peach and pale blue sky, a low sun, Fuji
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.4)
      sky.addColorStop(0, col(0.86, 0.05, 230))
      sky.addColorStop(1, col(0.9, 0.08, 40))
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H * 0.4)
      ctx.fillStyle = col(0.62, 0.2, 28, 0.9)
      ctx.beginPath()
      ctx.arc(W * 0.74, H * 0.2, Math.min(W, H) * 0.06, 0, 6.3)
      ctx.fill()
      ctx.fillStyle = col(0.55, 0.06, 255)
      ctx.beginPath()
      ctx.moveTo(W * 0.18, H * 0.4)
      ctx.lineTo(W * 0.42, H * 0.12)
      ctx.lineTo(W * 0.66, H * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = col(0.97, 0.01, 230)
      ctx.beginPath()
      ctx.moveTo(W * 0.42 - W * 0.05, H * 0.2)
      ctx.lineTo(W * 0.42, H * 0.12)
      ctx.lineTo(W * 0.42 + W * 0.05, H * 0.2)
      ctx.lineTo(W * 0.42 + W * 0.02, H * 0.185)
      ctx.lineTo(W * 0.42, H * 0.2)
      ctx.lineTo(W * 0.42 - W * 0.02, H * 0.185)
      ctx.closePath()
      ctx.fill()
      // raked sand: rings around two stones
      ctx.strokeStyle = col(0.6, 0.03, 50, 0.45)
      ctx.lineWidth = 1.2
      for (const [cx, cy] of [[0.3, 0.68], [0.72, 0.58]] as const) {
        for (let k = 1; k < 8; k++) {
          ctx.beginPath()
          ctx.ellipse(W * cx, H * cy, 40 + k * 22, 16 + k * 9, 0, 0, 6.3)
          ctx.stroke()
        }
        ctx.fillStyle = col(0.42, 0.02, 250)
        ctx.beginPath()
        ctx.ellipse(W * cx, H * cy, 34, 22, 0.2, 0, 6.3)
        ctx.fill()
      }
      // a torii
      const tx = W * 0.5
      const ty = H * 0.55
      ctx.fillStyle = col(0.5, 0.22, 28)
      ctx.fillRect(tx - 86, ty - 118, 14, 118)
      ctx.fillRect(tx + 72, ty - 118, 14, 118)
      ctx.fillRect(tx - 112, ty - 128, 224, 16)
      ctx.fillRect(tx - 96, ty - 98, 192, 10)
      break
    }
    case 'ethiopia': {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.34)
      sky.addColorStop(0, col(0.82, 0.08, 230))
      sky.addColorStop(1, col(0.92, 0.1, 80))
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H * 0.34)
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = col(0.5 + i * 0.07, 0.1, 55 + i * 12)
        ctx.beginPath()
        ctx.moveTo(0, H * (0.34 + i * 0.02))
        for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H * (0.28 + i * 0.04) + Math.sin(x * 0.006 + i * 2) * 26)
        ctx.lineTo(W, H * 0.42)
        ctx.lineTo(0, H * 0.42)
        ctx.closePath()
        ctx.fill()
      }
      // rows of coffee
      ctx.fillStyle = col(0.38, 0.12, 140)
      for (let row = 0; row < 5; row++) {
        for (let k = 0; k < 14; k++) {
          const x = (k + 0.5) * (W / 14)
          const y = H * (0.5 + row * 0.1)
          if (Math.abs(x - W * 0.5) < W * 0.2 && row > 0 && row < 4) continue
          ctx.beginPath()
          ctx.ellipse(x, y, 22, 11, 0, 0, 6.3)
          ctx.fill()
        }
      }
      // a church cut down into the rock: a square pit, with the cross left standing in it
      const cx = W * 0.5
      const cy = H * 0.64
      const s = Math.min(W, H) * 0.2
      ctx.fillStyle = col(0.3, 0.07, 45)
      ctx.fillRect(cx - s, cy - s * 0.7, s * 2, s * 1.4)
      ctx.fillStyle = col(0.66, 0.09, 65)
      const a = s * 0.32
      ctx.fillRect(cx - a / 2, cy - s * 0.55, a, s * 1.1)
      ctx.fillRect(cx - s * 0.55, cy - a / 2, s * 1.1, a)
      ctx.strokeStyle = col(0.3, 0.07, 45, 0.7)
      ctx.lineWidth = 2
      ctx.strokeRect(cx - s * 0.55, cy - a / 2, s * 1.1, a)
      break
    }
    case 'peru': {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.3)
      sky.addColorStop(0, col(0.78, 0.06, 235))
      sky.addColorStop(1, col(0.9, 0.05, 90))
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H * 0.3)
      ctx.fillStyle = col(0.46, 0.06, 260)
      ctx.beginPath()
      ctx.moveTo(0, H * 0.3)
      ctx.lineTo(W * 0.14, H * 0.1)
      ctx.lineTo(W * 0.3, H * 0.26)
      ctx.lineTo(W * 0.5, H * 0.06)
      ctx.lineTo(W * 0.72, H * 0.27)
      ctx.lineTo(W * 0.86, H * 0.12)
      ctx.lineTo(W, H * 0.3)
      ctx.closePath()
      ctx.fill()
      // terraces
      for (let i = 0; i < 7; i++) {
        const y = H * (0.3 + i * 0.1)
        ctx.fillStyle = col(0.44 + (i % 2) * 0.1, 0.13, i % 2 ? 130 : 105)
        ctx.fillRect(0, y, W, H * 0.1)
        ctx.fillStyle = col(0.34, 0.03, 60)
        ctx.fillRect(0, y + H * 0.1 - 6, W, 6)
        for (let k = 0; k < 40; k++) {
          ctx.fillStyle = col(0.3, 0.02, 60, 0.7)
          ctx.fillRect((k + (i % 2) * 0.5) * (W / 40), y + H * 0.1 - 6, W / 40 - 2, 6)
        }
      }
      // a trapezoid doorway in dry stone
      const dx = W * 0.5
      const dy = H * 0.6
      ctx.fillStyle = col(0.2, 0.02, 60)
      ctx.beginPath()
      ctx.moveTo(dx - 38, dy)
      ctx.lineTo(dx + 38, dy)
      ctx.lineTo(dx + 26, dy - 84)
      ctx.lineTo(dx - 26, dy - 84)
      ctx.closePath()
      ctx.fill()
      // khipu: cords with knots, hanging from the top
      for (let i = 0; i < 9; i++) {
        const x = W * 0.84 + i * 9
        ctx.strokeStyle = col(0.7, 0.14, [28, 60, 150, 330][i % 4], 0.9)
        ctx.lineWidth = 1.6
        const len = 70 + (i % 3) * 30
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + Math.sin(w.t * 0.8 + i) * 2, len)
        ctx.stroke()
        for (let k = 1; k < 4; k++) {
          ctx.fillStyle = ctx.strokeStyle
          ctx.beginPath()
          ctx.arc(x, (len * k) / 4, 2.6, 0, 6.3)
          ctx.fill()
        }
      }
      break
    }
    case 'iceland': {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.4)
      sky.addColorStop(0, col(0.2, 0.08, 270))
      sky.addColorStop(1, col(0.36, 0.1, 210))
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H * 0.4)
      // ice mountains
      ctx.fillStyle = col(0.7, 0.08, 215)
      ctx.beginPath()
      ctx.moveTo(0, H * 0.4)
      ctx.lineTo(W * 0.15, H * 0.2)
      ctx.lineTo(W * 0.3, H * 0.36)
      ctx.lineTo(W * 0.52, H * 0.15)
      ctx.lineTo(W * 0.76, H * 0.38)
      ctx.lineTo(W * 0.9, H * 0.24)
      ctx.lineTo(W, H * 0.4)
      ctx.closePath()
      ctx.fill()
      // black basalt, moss, and a rift
      ctx.fillStyle = col(0.3, 0.02, 250)
      for (let i = 0; i < 40; i++) {
        ctx.beginPath()
        ctx.ellipse(r() * W, H * (0.42 + r() * 0.56), 20 + r() * 50, 10 + r() * 22, r(), 0, 6.3)
        ctx.fill()
      }
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = col(0.5, 0.15, 130, 0.65)
        ctx.beginPath()
        ctx.ellipse(r() * W, H * (0.45 + r() * 0.5), 14 + r() * 28, 7 + r() * 12, r(), 0, 6.3)
        ctx.fill()
      }
      ctx.strokeStyle = col(0.1, 0.04, 260)
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(W * 0.46, H * 0.42)
      ctx.lineTo(W * 0.5, H * 0.58)
      ctx.lineTo(W * 0.44, H * 0.72)
      ctx.lineTo(W * 0.5, H)
      ctx.stroke()
      break
    }
    case 'india': {
      // sandstone courtyard, a stepwell of squares going down, rangoli beside it
      for (let i = 0; i < 9; i++) {
        const s = Math.min(W, H) * (0.44 - i * 0.042)
        ctx.fillStyle = col(0.64 - i * 0.045, 0.1 - i * 0.004, i > 6 ? 205 : 48)
        ctx.fillRect(W * 0.5 - s, H * 0.5 - s * 0.62, s * 2, s * 1.24)
        ctx.strokeStyle = col(0.36, 0.06, 40, 0.5)
        ctx.lineWidth = 1.5
        ctx.strokeRect(W * 0.5 - s, H * 0.5 - s * 0.62, s * 2, s * 1.24)
      }
      // rangoli at the corners
      for (const [cx, cy] of [[0.14, 0.7], [0.86, 0.3]] as const) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * 6.283
          ctx.fillStyle = col(0.72, 0.2, [330, 40, 180, 100][k % 4])
          ctx.beginPath()
          ctx.ellipse(W * cx + Math.cos(a) * 36, H * cy + Math.sin(a) * 36, 13, 6, a, 0, 6.3)
          ctx.fill()
        }
        ctx.fillStyle = col(0.8, 0.18, 55)
        ctx.beginPath()
        ctx.arc(W * cx, H * cy, 12, 0, 6.3)
        ctx.fill()
      }
      // garland of marigolds along the top
      for (let k = 0; k < 40; k++) {
        const x = (k / 39) * W
        const y = 20 + Math.sin((k / 39) * Math.PI * 4) * 16
        ctx.fillStyle = col(0.74, 0.18, k % 3 ? 62 : 38)
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, 6.3)
        ctx.fill()
      }
      break
    }
    case 'aotearoa': {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.4)
      sky.addColorStop(0, col(0.8, 0.07, 215))
      sky.addColorStop(1, col(0.94, 0.04, 180))
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H * 0.4)
      ctx.fillStyle = col(0.5, 0.09, 215)
      ctx.beginPath()
      ctx.moveTo(0, H * 0.4)
      ctx.lineTo(W * 0.2, H * 0.18)
      ctx.lineTo(W * 0.38, H * 0.34)
      ctx.lineTo(W * 0.6, H * 0.14)
      ctx.lineTo(W * 0.82, H * 0.36)
      ctx.lineTo(W, H * 0.24)
      ctx.lineTo(W, H * 0.4)
      ctx.closePath()
      ctx.fill()
      // koru: unfurling fern spirals
      ctx.lineCap = 'round'
      for (let i = 0; i < 12; i++) {
        const cx = W * (0.08 + r() * 0.84)
        const cy = H * (0.5 + r() * 0.45)
        const s = 16 + r() * 34
        ctx.strokeStyle = col(0.3 + r() * 0.12, 0.13, 150 + r() * 20, 0.9)
        ctx.lineWidth = 3 + s * 0.06
        ctx.beginPath()
        for (let a = 0; a < 11; a += 0.3) {
          const rr = s * (1 - a / 12)
          const x = cx + Math.cos(a) * rr
          const y = cy + Math.sin(a) * rr
          if (a === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx + s, cy)
        ctx.quadraticCurveTo(cx + s * 1.3, cy + s * 1.6, cx + s * 0.4, cy + s * 2.4)
        ctx.stroke()
      }
      break
    }
    case 'morocco': {
      // a zellige floor: stars made of two turned squares, in cobalt, white and terracotta
      const cell = Math.max(46, Math.min(W, H) / 11)
      for (let y = H * 0.18; y < H + cell; y += cell) {
        for (let x = 0; x < W + cell; x += cell) {
          const i = Math.round(x / cell) + Math.round(y / cell)
          ctx.fillStyle = i % 2 ? col(0.4, 0.14, 255) : col(0.5, 0.14, 215)
          ctx.fillRect(x, y, cell, cell)
          ctx.save()
          ctx.translate(x + cell / 2, y + cell / 2)
          ctx.rotate(Math.PI / 4)
          ctx.fillStyle = col(0.93, 0.02, 90)
          ctx.fillRect(-cell * 0.3, -cell * 0.3, cell * 0.6, cell * 0.6)
          ctx.fillStyle = i % 2 ? col(0.5, 0.17, 35) : col(0.58, 0.14, 150)
          ctx.fillRect(-cell * 0.16, -cell * 0.16, cell * 0.32, cell * 0.32)
          ctx.restore()
        }
      }
      // a horseshoe arch in the wall
      ctx.fillStyle = col(0.62, 0.1, 45)
      ctx.fillRect(0, 0, W, H * 0.18)
      const ax = W * 0.5
      ctx.fillStyle = col(0.2, 0.08, 255)
      ctx.beginPath()
      ctx.arc(ax, H * 0.1, H * 0.065, Math.PI * 0.85, Math.PI * 2.15)
      ctx.lineTo(ax + H * 0.05, H * 0.18)
      ctx.lineTo(ax - H * 0.05, H * 0.18)
      ctx.closePath()
      ctx.fill()
      break
    }
  }
}

/** Things in each place that glow or move on their own, drawn after the dark. */
export function drawFarLife(w: World, ctx: CanvasRenderingContext2D, id: FarId) {
  const { w: W, h: H } = w
  ctx.save()
  switch (id) {
    case 'japan': {
      // cherry petals, falling slowly and sideways
      for (let i = 0; i < 46; i++) {
        const r = rngOf(i * 17 + 1)
        const x = (r() * W + w.t * (14 + r() * 18) * w.motion + Math.sin(w.t * 0.7 + i) * 30) % (W + 40)
        const y = ((r() * H + w.t * (22 + r() * 26) * w.motion) % (H + 20)) - 10
        ctx.fillStyle = col(0.9, 0.09, 350, 0.85)
        ctx.save()
        ctx.translate(x - 20, y)
        ctx.rotate(w.t * (0.4 + r()) + i)
        ctx.beginPath()
        ctx.ellipse(0, 0, 5, 2.6, 0, 0, 6.3)
        ctx.fill()
        ctx.restore()
      }
      break
    }
    case 'ethiopia': {
      // heat shimmer and a few slow-turning pale suns
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, Math.min(W, H) * 0.5)
      g.addColorStop(0, col(0.95, 0.1, 80, 0.35))
      g.addColorStop(1, col(0.9, 0.08, 70, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      break
    }
    case 'peru': {
      // mist rolling through the terraces
      for (let k = 0; k < 4; k++) {
        const x = ((w.t * 12 * w.motion + k * W * 0.34) % (W * 1.4)) - W * 0.2
        const y = H * (0.34 + k * 0.17)
        const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.26)
        g.addColorStop(0, col(0.97, 0.01, 230, 0.4))
        g.addColorStop(1, col(0.97, 0.01, 230, 0))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      }
      break
    }
    case 'iceland': {
      // the aurora, in slow ribbons
      ctx.globalCompositeOperation = 'lighter'
      for (let b = 0; b < 4; b++) {
        ctx.beginPath()
        for (let x = 0; x <= W; x += 12) {
          const y = H * (0.12 + b * 0.05) + Math.sin(x * 0.006 + w.t * (0.25 + b * 0.07) * w.motion + b) * 42 + Math.sin(x * 0.015 - w.t * 0.4) * 10
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const g = ctx.createLinearGradient(0, 0, 0, H * 0.3)
        g.addColorStop(0, col(0.7, 0.16, 150 + b * 24, 0))
        g.addColorStop(1, col(0.7, 0.16, 150 + b * 24, 0.2 - b * 0.03))
        ctx.lineTo(W, 0)
        ctx.lineTo(0, 0)
        ctx.closePath()
        ctx.fillStyle = g
        ctx.fill()
      }
      // steam from the rift
      for (let k = 0; k < 8; k++) {
        const ph = (w.t * 0.18 + k / 8) % 1
        const x = W * 0.48 + Math.sin(ph * 6 + k) * 20
        const y = H * 0.6 - ph * H * 0.35
        const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + ph * 60)
        g.addColorStop(0, col(0.97, 0.01, 230, 0.35 * (1 - ph)))
        g.addColorStop(1, col(0.97, 0.01, 230, 0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, 40 + ph * 60, 0, 6.3)
        ctx.fill()
      }
      break
    }
    case 'india': {
      // diyas along the edges, each with its small flame
      ctx.globalCompositeOperation = 'lighter'
      for (let k = 0; k < 22; k++) {
        const t = k / 21
        const x = W * (0.04 + 0.92 * t)
        for (const y of [H * 0.94, H * 0.3 + Math.sin(k) * 4 + (k % 2) * 0]) {
          if (y < H * 0.5 && (k % 3)) continue
          const fl = 0.7 + 0.3 * Math.sin(w.t * 7 + k * 2.3)
          const g = ctx.createRadialGradient(x, y, 0, x, y, 34)
          g.addColorStop(0, col(0.92, 0.16, 62, 0.7 * fl))
          g.addColorStop(1, col(0.8, 0.14, 50, 0))
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(x, y, 34, 0, 6.3)
          ctx.fill()
        }
      }
      break
    }
    case 'aotearoa': {
      // the long white cloud
      const x = ((w.t * 9 * w.motion) % (W * 1.6)) - W * 0.3
      ctx.globalAlpha = 0.85
      ctx.fillStyle = col(0.98, 0.01, 200)
      ctx.beginPath()
      ctx.ellipse(x, H * 0.1, W * 0.22, H * 0.025, 0, 0, 6.3)
      ctx.ellipse(x - W * 0.06, H * 0.12, W * 0.14, H * 0.02, 0, 0, 6.3)
      ctx.ellipse(x + W * 0.08, H * 0.085, W * 0.12, H * 0.018, 0, 0, 6.3)
      ctx.fill()
      break
    }
    case 'morocco': {
      // lanterns, hanging and glowing
      ctx.globalCompositeOperation = 'lighter'
      for (let k = 0; k < 5; k++) {
        const x = W * (0.12 + k * 0.19)
        const y = H * 0.16 + Math.sin(w.t * 0.9 + k) * 4
        const fl = 0.75 + 0.25 * Math.sin(w.t * 5 + k * 3)
        const g = ctx.createRadialGradient(x, y, 0, x, y, 80)
        g.addColorStop(0, col(0.9, 0.17, 55, 0.65 * fl))
        g.addColorStop(1, col(0.8, 0.14, 45, 0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, 80, 0, 6.3)
        ctx.fill()
      }
      break
    }
  }
  ctx.restore()
}

// ───────────────────────────── the lights you can learn from ─────────────────────────────

export function drawKnowledge(w: World, ctx: CanvasRenderingContext2D) {
  const prof = w.brain.profile
  if (isFar(w.place)) {
    const hue = FAR[w.place].hue
    for (const f of factsOf(w.place)) {
      const [x, y] = factPos(w, f)
      const got = prof.learned.includes(f.id)
      const known = prof.recalled.includes(f.id)
      const near = clamp(1 - Math.hypot(w.lamp.x - x, w.lamp.y - y) / 150)
      const dwell = clamp((w.factAcc[f.id] ?? 0) / 1.1)
      const pulse = 0.5 + 0.5 * Math.sin(w.t * 2 + x)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const R = (got ? 18 : 26) + 10 * near + 10 * dwell
      const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.2)
      g.addColorStop(0, col(0.95, 0.12, hue + 20, (got ? 0.25 : 0.55) + 0.3 * near))
      g.addColorStop(1, col(0.8, 0.1, hue, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, R * 2.2, 0, 6.3)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = got ? col(0.98, 0.03, hue, 0.9) : col(0.98, 0.1, hue + 20, 0.9)
      ctx.beginPath()
      ctx.arc(x, y, got ? 5 : 7 + 2 * pulse, 0, 6.3)
      ctx.fill()
      // a ring for what has been told; gold for what can be given back
      ctx.strokeStyle = known ? col(0.9, 0.17, 85, 0.95) : col(0.98, 0.04, hue, got ? 0.55 : 0.0)
      ctx.lineWidth = known ? 2.4 : 1.4
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, 6.3)
      ctx.stroke()
      if (dwell > 0) {
        ctx.strokeStyle = col(0.98, 0.1, hue + 20, 0.9)
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + dwell * 6.283)
        ctx.stroke()
      }
      if (near > 0.45) {
        ctx.fillStyle = col(0.98, 0.02, hue, 0.85 * near)
        ctx.font = `700 11px ${GROTESK}`
        ctx.textAlign = 'center'
        ;(ctx as unknown as { letterSpacing: string }).letterSpacing = '0.25em'
        ctx.fillText(TAG_LABEL[f.tag].toUpperCase(), x, y - 30)
      }
      ctx.restore()
    }
  }
  drawCard(w, ctx)
  drawQuiz(w, ctx)
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const out: string[] = []
  let cur = ''
  for (const word of words) {
    const t = cur ? `${cur} ${word}` : word
    if (ctx.measureText(t).width > maxW && cur) {
      out.push(cur)
      cur = word
    } else cur = t
  }
  if (cur) out.push(cur)
  return out
}

/** What you have just been told, set large, with what kind of thing it is. */
function drawCard(w: World, ctx: CanvasRenderingContext2D) {
  const c = w.card
  if (!c) return
  const f = FACT_BY_ID[c.fact]
  const inn = ease(clamp((w.t - c.t0) / 0.9))
  const out = ease(clamp((c.t0 + c.dur - w.t) / 1.6))
  const a = Math.min(inn, out)
  if (a <= 0.01) return
  const hue = FAR[f.place].hue
  const size = clamp(w.w * 0.028, 20, 34)
  const x = w.w * (w.w < 640 ? 0.07 : 0.09)
  const maxW = Math.min(w.w * 0.62, 700)
  ctx.save()
  ctx.globalAlpha = a
  // a quiet panel behind it, so it can be read over anything
  ctx.font = `italic 400 ${size}px ${SERIF}`
  const lines = wrapLines(ctx, f.text, maxW)
  const h = lines.length * size * 1.3 + 54
  const y0 = w.h * 0.25
  ctx.fillStyle = col(0.16, 0.05, hue, 0.62)
  ctx.beginPath()
  ctx.roundRect(x - 22, y0 - 20, maxW + 44, h + 24, 14)
  ctx.fill()
  ctx.fillStyle = col(0.9, 0.12, hue)
  ctx.font = `700 12px ${GROTESK}`
  ;(ctx as unknown as { letterSpacing: string }).letterSpacing = '0.3em'
  ctx.fillText(`${FAR[f.place].name.toUpperCase()}  ·  ${TAG_LABEL[f.tag].toUpperCase()}`, x, y0 + 8)
  ;(ctx as unknown as { letterSpacing: string }).letterSpacing = '0em'
  ctx.fillStyle = col(0.97, 0.02, hue)
  ctx.font = `italic 400 ${size}px ${SERIF}`
  lines.forEach((l, i) => ctx.fillText(l, x, y0 + 46 + i * size * 1.3))
  ctx.restore()
}

/** Yadah asking whether you kept it. Three lights; rest the lamp on the one you think is right. */
function drawQuiz(w: World, ctx: CanvasRenderingContext2D) {
  const q = w.quiz
  if (!q) return
  const f = FACT_BY_ID[q.fact]
  const hue = FAR[f.place].hue
  const inn = ease(clamp((w.t - q.t0) / 0.9))
  const out = q.done ? ease(clamp((q.doneAt + 1.6 - w.t) / 1.6)) : 1
  const a = Math.min(inn, out)
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a
  const size = clamp(w.w * 0.026, 20, 32)
  ctx.font = `italic 400 ${size}px ${SERIF}`
  const maxW = Math.min(w.w * 0.7, 760)
  const lines = wrapLines(ctx, f.q, maxW)
  const x = w.w * 0.5 - maxW / 2
  const y0 = w.h * 0.3
  ctx.fillStyle = col(0.15, 0.05, hue, 0.66)
  ctx.beginPath()
  ctx.roundRect(x - 22, y0 - 40, maxW + 44, lines.length * size * 1.3 + 56, 14)
  ctx.fill()
  ctx.fillStyle = col(0.9, 0.12, 85)
  ctx.font = `700 12px ${GROTESK}`
  ;(ctx as unknown as { letterSpacing: string }).letterSpacing = '0.3em'
  ctx.fillText('DO YOU KNOW IT?', x, y0 - 14)
  ;(ctx as unknown as { letterSpacing: string }).letterSpacing = '0em'
  ctx.fillStyle = col(0.97, 0.02, hue)
  ctx.font = `italic 400 ${size}px ${SERIF}`
  lines.forEach((l, i) => ctx.fillText(l, x, y0 + 14 + i * size * 1.3))
  for (const o of q.options) {
    const near = clamp(1 - Math.hypot(w.lamp.x - o.x, w.lamp.y - o.y) / 150)
    const dwell = clamp((q.acc[o.text] ?? 0) / 1.3)
    const chosen = q.done && q.picked === o.text
    const right = q.done && o.right
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 70)
    g.addColorStop(0, col(0.95, 0.12, right ? 140 : chosen ? 25 : hue, 0.3 + 0.4 * near + (right ? 0.4 : 0)))
    g.addColorStop(1, col(0.8, 0.1, hue, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(o.x, o.y, 70, 0, 6.3)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = col(0.97, 0.06, hue, 0.95)
    ctx.beginPath()
    ctx.arc(o.x, o.y, 8, 0, 6.3)
    ctx.fill()
    if (dwell > 0 && !q.done) {
      ctx.strokeStyle = col(0.98, 0.1, 85, 0.9)
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.arc(o.x, o.y, 16, -Math.PI / 2, -Math.PI / 2 + dwell * 6.283)
      ctx.stroke()
    }
    ctx.font = `italic 400 ${Math.round(size * 0.82)}px ${SERIF}`
    ctx.textAlign = 'center'
    ctx.fillStyle = col(0.98, 0.03, hue)
    ctx.shadowColor = 'rgba(0,0,0,.6)'
    ctx.shadowBlur = 10
    ctx.fillText(o.text, o.x, o.y + 38)
    ctx.shadowBlur = 0
    ctx.textAlign = 'left'
  }
  ctx.restore()
}

// ───────────────────────────── knowledge made visible in the house ─────────────────────────────

/** The archive's third shelf: one slim book for every thing you have learned. */
export function drawLearnedShelf(w: World, ctx: CanvasRenderingContext2D) {
  const { w: W, h: H } = w
  const prof = w.brain.profile
  const y = H * 0.22
  const slot = Math.min(W / (FACTS.length + 8), 24)
  const gap = slot * 0.9
  const totalW = FACTS.length * slot + (FAR_IDS.length - 1) * gap
  let x = (W - totalW) / 2
  ctx.save()
  for (const id of FAR_IDS) {
    for (const f of factsOf(id)) {
      const got = prof.learned.includes(f.id)
      const known = prof.recalled.includes(f.id)
      const hue = FAR[id].hue
      if (got) {
        ctx.fillStyle = col(0.62, 0.17, hue)
        ctx.fillRect(x, y, slot - 3, H * 0.075)
        ctx.fillStyle = known ? col(0.86, 0.17, 85) : col(0.4, 0.1, hue)
        ctx.fillRect(x, y, slot - 3, 5)
      } else {
        ctx.strokeStyle = col(0.4, 0.04, hue, 0.6)
        ctx.lineWidth = 1
        ctx.strokeRect(x + 0.5, y + H * 0.02, slot - 4, H * 0.055)
      }
      x += slot
    }
    x += gap
  }
  ctx.restore()
}

/** Where souvenir i sits along the hall's far wall. */
export const souvenirPos = (w: World, i: number): [number, number] => [w.w * (0.2 + (0.6 * i) / 6), w.h * 0.9]

/** One small thing from each place you have finished, set on a ledge in the hall. */
export function drawSouvenirs(w: World, ctx: CanvasRenderingContext2D) {
  const prof = w.brain.profile
  FAR_IDS.forEach((id, i) => {
    const [x, y] = souvenirPos(w, i)
    const p = progressOf(id, prof.learned, prof.recalled)
    const done = p.learned >= p.of
    const hue = FAR[id].hue
    ctx.save()
    // an empty place on the ledge
    ctx.strokeStyle = col(0.9, 0.05, hue, done ? 0 : 0.28 + 0.1 * (p.learned / p.of))
    ctx.setLineDash([2, 5])
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x, y, 15, 0, 6.3)
    ctx.stroke()
    ctx.setLineDash([])
    if (p.learned > 0 && !done) {
      ctx.strokeStyle = col(0.9, 0.12, hue, 0.8)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + (p.learned / p.of) * 6.283)
      ctx.stroke()
    }
    if (done) {
      const near = clamp(1 - Math.hypot(w.lamp.x - x, w.lamp.y - y) / 150)
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40)
      g.addColorStop(0, col(0.9, 0.15, hue, 0.35 + 0.4 * near + (p.known >= p.of ? 0.25 : 0)))
      g.addColorStop(1, col(0.8, 0.1, hue, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, 40, 0, 6.3)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = col(0.88, 0.15, hue)
      ctx.strokeStyle = col(0.25, 0.05, hue, 0.8)
      ctx.lineWidth = 1.2
      ctx.beginPath()
      switch (id) {
        case 'japan': // a folded paper crane, reduced to a diamond and a wing
          ctx.moveTo(x - 11, y)
          ctx.lineTo(x, y - 9)
          ctx.lineTo(x + 11, y)
          ctx.lineTo(x, y + 8)
          ctx.closePath()
          break
        case 'ethiopia': // a coffee bean
          ctx.ellipse(x, y, 7, 10, 0.5, 0, 6.3)
          break
        case 'peru': // a knotted cord
          ctx.arc(x, y, 6, 0, 6.3)
          break
        case 'iceland': // a black pebble
          ctx.ellipse(x, y, 10, 7, 0.2, 0, 6.3)
          break
        case 'india': // a lamp
          ctx.ellipse(x, y + 2, 11, 5, 0, 0, 3.15)
          ctx.closePath()
          break
        case 'aotearoa': // a koru
          ctx.arc(x, y, 8, 0, 5)
          break
        case 'morocco': // a tile
          ctx.rect(x - 8, y - 8, 16, 16)
          break
      }
      ctx.fill()
      ctx.stroke()
      if (p.known >= p.of) {
        ctx.strokeStyle = col(0.9, 0.17, 85, 0.9)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 17, 0, 6.3)
        ctx.stroke()
      }
    }
    ctx.restore()
  })
}
