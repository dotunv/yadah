import { drawDesk, drawDeskLife } from './desk'
import { PLACES, isFar } from '../engine/places'
import { FAR_GROUND, drawFarLife, drawFarProps, drawLearnedShelf, pondOf } from './far'
import { doorsOf } from './house'
import { clamp, ease, rngOf } from './scene'
import type { World } from './World'

/**
 * The places themselves. Each is a different arrangement of the same dark,
 * lit by the same lamp: floor, props, and the small lives that belong to it.
 */

const col = (l: number, c: number, h: number, a = 1) => `oklch(${l} ${c} ${h} / ${a})`
const angleLerp = (a: number, b: number, t: number) => (a + ((((b - a) % 360) + 540) % 360 - 180) * t + 360) % 360

/** The colour of the floor here: the air you have made, tinted by the place. */
export function ground(w: World) {
  if (isFar(w.place)) {
    const g = FAR_GROUND[w.place]
    return { hue: g.h, chroma: g.c + w.atm.chroma * 0.15, l: g.l }
  }
  const hall = w.place === 'hall'
  const near = w.place as 'hall' | 'archive' | 'garden' | 'shore'
  return {
    hue: hall ? w.atm.hue : near === 'archive' ? angleLerp(w.atm.hue, 52, 0.8) : angleLerp(w.atm.hue, PLACES[near].hue, 0.62),
    chroma: { hall: 0.04, archive: 0.05, garden: 0.1, shore: 0.08 }[near] + w.atm.chroma * 0.6,
    l: { hall: 0.58, archive: 0.5, garden: 0.46, shore: 0.5 }[near],
  }
}

// ───────────────────────────── floor props (lit by the lamp) ─────────────────────────────

export function drawProps(w: World, ctx: CanvasRenderingContext2D) {
  const g = ground(w)
  if (isFar(w.place)) return drawFarProps(w, ctx, w.place)
  switch (w.place) {
    case 'hall':
      hearth(w, ctx)
      return drawDesk(w, ctx)
    case 'archive':
      return archive(w, ctx, g.hue)
    case 'garden':
      return garden(w, ctx)
    case 'shore':
      return shore(w, ctx, g.hue)
  }
}

function hearth(w: World, ctx: CanvasRenderingContext2D) {
  const x = w.w * 0.5
  const y = w.h * 0.64
  const R = Math.min(w.w, w.h) * 0.085
  const r = rngOf(9)
  ctx.fillStyle = col(0.3, 0.05, 40, 0.75)
  ctx.beginPath()
  ctx.ellipse(x, y, R * 1.05, R * 0.62, 0, 0, 6.3)
  ctx.fill()
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.283
    ctx.fillStyle = col(0.42 + r() * 0.14, 0.04 + r() * 0.04, 40 + r() * 30, 0.95)
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * R * 1.12, y + Math.sin(a) * R * 0.68, R * 0.17, R * 0.12, a, 0, 6.3)
    ctx.fill()
  }
}

function archive(w: World, ctx: CanvasRenderingContext2D, hue: number) {
  const { w: W, h: H } = w
  const r = rngOf(21)
  // boards
  ctx.strokeStyle = col(0.2, 0.02, hue, 0.22)
  ctx.lineWidth = 1
  for (let y = H * 0.22; y < H; y += 38) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y + (r() - 0.5) * 3)
    ctx.stroke()
  }
  // a patch of window light on the floor
  ctx.save()
  ctx.globalAlpha = 0.14
  ctx.fillStyle = col(0.85, 0.05, 80)
  ctx.beginPath()
  ctx.moveTo(W * 0.1, H * 0.3)
  ctx.lineTo(W * 0.34, H * 0.28)
  ctx.lineTo(W * 0.5, H * 0.78)
  ctx.lineTo(W * 0.2, H * 0.84)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // the shelves along the back wall
  ctx.fillStyle = col(0.26, 0.06, hue)
  ctx.fillRect(0, 0, W, H * 0.31)
  for (let row = 0; row < 2; row++) {
    const y = row * H * 0.1 + H * 0.012
    ctx.fillStyle = col(0.11, 0.01, hue)
    ctx.fillRect(0, y + H * 0.088, W, 4)
    let x = 4
    while (x < W) {
      const bw = 5 + r() * 12
      const bh = H * (0.045 + r() * 0.04)
      ctx.fillStyle = col(0.34 + r() * 0.22, 0.07 + r() * 0.1, hue + (r() - 0.5) * 140, 0.97)
      ctx.fillRect(x, y + H * 0.088 - bh, bw, bh)
      x += bw + 1
    }
  }
  // the third shelf is yours: a book for everything you have been told
  ctx.fillStyle = col(0.11, 0.01, hue)
  ctx.fillRect(0, H * 0.3, W, 4)
  drawLearnedShelf(w, ctx)
  // a long table and what is left on it
  const tx = W * 0.5
  const ty = H * 0.62
  ctx.fillStyle = col(0.4, 0.08, hue - 10)
  ctx.beginPath()
  ctx.roundRect(tx - W * 0.17, ty - H * 0.05, W * 0.34, H * 0.1, 6)
  ctx.fill()
  ctx.fillStyle = col(0.7, 0.01, hue, 0.8)
  for (let i = 0; i < 7; i++) {
    ctx.save()
    ctx.translate(tx - W * 0.14 + i * W * 0.045 + r() * 8, ty + (r() - 0.5) * H * 0.04)
    ctx.rotate((r() - 0.5) * 0.9)
    ctx.fillRect(-9, -6, 18, 12)
    ctx.restore()
  }
}

function garden(w: World, ctx: CanvasRenderingContext2D) {
  const { w: W, h: H } = w
  const r = rngOf(33)
  // a path of flat stones from the door toward the middle
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const x = W * (0.04 + t * 0.62)
    const y = H * (0.5 + Math.sin(t * 3.4) * 0.12)
    ctx.fillStyle = col(0.58 + r() * 0.08, 0.04, 90, 0.9)
    ctx.beginPath()
    ctx.ellipse(x, y, 26 + r() * 10, 15 + r() * 6, (r() - 0.5) * 0.6, 0, 6.3)
    ctx.fill()
  }
  // plants, deepest first
  const plants = Array.from({ length: 26 }, () => ({ x: r() * W, y: H * (0.18 + r() * 0.78), s: 0.6 + r() * 0.9, p: r() * 6.28 }))
  plants.sort((a, b) => a.y - b.y)
  for (const p of plants) {
    // keep the path and the middle clear
    const dx = p.x - W * 0.45
    const dy = p.y - H * 0.5
    if (Math.hypot(dx, dy) < Math.min(W, H) * 0.14) continue
    const sway = Math.sin(w.t * 0.6 * w.motion + p.p) * 6 * p.s + w.gust * w.gustDir * 26 * p.s
    const hgt = 70 * p.s
    ctx.strokeStyle = col(0.42, 0.11, 140, 0.95)
    ctx.lineWidth = 2.2 * p.s
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.quadraticCurveTo(p.x + sway * 0.4, p.y - hgt * 0.5, p.x + sway, p.y - hgt)
    ctx.stroke()
    for (let k = 1; k <= 4; k++) {
      const f = k / 5
      const lx = p.x + sway * f * f
      const ly = p.y - hgt * f
      ctx.fillStyle = col(0.42 + 0.16 * f, 0.15, 125 + k * 12 + p.p * 6, 0.95)
      ctx.beginPath()
      ctx.ellipse(lx + (k % 2 ? 11 : -11) * p.s, ly, 12 * p.s, 5 * p.s, (k % 2 ? -0.5 : 0.5) + sway * 0.02, 0, 6.3)
      ctx.fill()
    }
  }
  // the pond, with a sky in it
  const pd = pondOf(w)
  ctx.fillStyle = col(0.3, 0.07, 150)
  ctx.beginPath()
  ctx.ellipse(pd.x, pd.y, pd.rx * 1.12, pd.ry * 1.18, 0, 0, 6.3)
  ctx.fill()
  const wg = ctx.createLinearGradient(0, pd.y - pd.ry, 0, pd.y + pd.ry)
  wg.addColorStop(0, col(0.62, 0.12, 215))
  wg.addColorStop(1, col(0.36, 0.1, 250))
  ctx.fillStyle = wg
  ctx.beginPath()
  ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 6.3)
  ctx.fill()
  ctx.strokeStyle = col(0.92, 0.04, 215, 0.4)
  ctx.lineWidth = 1.4
  for (let k = 0; k < 3; k++) {
    const ph = (w.t * 0.25 * w.motion + k / 3) % 1
    ctx.globalAlpha = 1 - ph
    ctx.beginPath()
    ctx.ellipse(pd.x + Math.sin(k * 2) * pd.rx * 0.3, pd.y + Math.cos(k * 3) * pd.ry * 0.2, pd.rx * 0.2 + ph * pd.rx * 0.5, pd.ry * 0.2 + ph * pd.ry * 0.5, 0, 0, 6.3)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = col(0.46, 0.14, 142)
  for (let k = 0; k < 6; k++) {
    const a = k * 2.1 + 0.6
    ctx.beginPath()
    ctx.ellipse(pd.x + Math.cos(a) * pd.rx * (0.3 + 0.35 * ((k * 7) % 3) / 3), pd.y + Math.sin(a) * pd.ry * 0.55, 15, 8, a, 0, 6.3)
    ctx.fill()
  }
  ctx.fillStyle = col(0.9, 0.1, 350)
  ctx.beginPath()
  ctx.arc(pd.x - pd.rx * 0.35, pd.y + pd.ry * 0.12, 5, 0, 6.3)
  ctx.fill()
  // a low fence along the far side
  ctx.strokeStyle = col(0.38, 0.07, 60, 0.95)
  ctx.lineWidth = 3
  for (let y = H * 0.12; y < H * 0.92; y += 46) {
    ctx.beginPath()
    ctx.moveTo(W * 0.955, y)
    ctx.lineTo(W * 0.955, y - 38)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(W * 0.955, H * 0.1)
  ctx.lineTo(W * 0.955, H * 0.92)
  ctx.stroke()
}

function shore(w: World, ctx: CanvasRenderingContext2D, hue: number) {
  const { w: W, h: H } = w
  const r = rngOf(45)
  const horizon = H * 0.34
  const sea = H * 0.68
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  // dusk: indigo overhead, rose where the sky meets the water
  sky.addColorStop(0, col(0.3, 0.1, 275))
  sky.addColorStop(0.7, col(0.5, 0.13, 335))
  sky.addColorStop(1, col(0.74, 0.12, 40))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, horizon)
  // water
  const water = ctx.createLinearGradient(0, horizon, 0, sea)
  water.addColorStop(0, col(0.5, 0.11, 25))
  water.addColorStop(0.35, col(0.4, 0.1, 275))
  water.addColorStop(1, col(0.48, 0.09, hue))
  ctx.fillStyle = water
  ctx.fillRect(0, horizon, W, sea - horizon)
  ctx.lineWidth = 1.2
  for (let i = 0; i < 16; i++) {
    const y = horizon + ((i + 0.5) / 16) * (sea - horizon)
    const amp = 1.5 + (i / 16) * 4
    ctx.strokeStyle = col(0.62, 0.03, hue, 0.08 + (i / 16) * 0.12)
    ctx.beginPath()
    for (let x = 0; x <= W; x += 14) {
      const yy = y + Math.sin(x * 0.02 + w.t * (0.5 + i * 0.05) * w.motion + i * 1.7) * amp
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  // sand, and a line of foam where the water ends
  ctx.fillStyle = col(0.66, 0.07, 70)
  ctx.fillRect(0, sea, W, H - sea)
  ctx.strokeStyle = col(0.92, 0.01, hue, 0.35)
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = 0; x <= W; x += 10) {
    const yy = sea + Math.sin(x * 0.03 + w.t * 0.8 * w.motion) * 4 + Math.sin(x * 0.011 - w.t * 0.3) * 6
    if (x === 0) ctx.moveTo(x, yy)
    else ctx.lineTo(x, yy)
  }
  ctx.stroke()
  // marks in the sand
  ctx.fillStyle = col(0.5, 0.06, 55, 0.5)
  for (let i = 0; i < 60; i++) {
    ctx.beginPath()
    ctx.ellipse(r() * W, sea + 20 + r() * (H - sea - 20), 3 + r() * 9, 1.5 + r() * 2.5, 0, 0, 6.3)
    ctx.fill()
  }
}

// ───────────────────────────── things that glow, after the dark ─────────────────────────────

export function drawLife(w: World, ctx: CanvasRenderingContext2D) {
  const { w: W, h: H } = w
  if (isFar(w.place)) return drawFarLife(w, ctx, w.place)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  if (w.place === 'hall') {
    drawDeskLife(w, ctx)
    // the hearth keeps a little of what it has been given
    const x = W * 0.5
    const y = H * 0.64
    const a = 0.05 + 0.35 * w.know + 0.1 * Math.sin(w.t * 1.7) * w.motion
    const R = Math.min(W, H) * 0.16
    const g = ctx.createRadialGradient(x, y, 0, x, y, R)
    g.addColorStop(0, col(0.85, 0.12, 60, a))
    g.addColorStop(1, col(0.7, 0.08, 50, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R, 0, 6.3)
    ctx.fill()
  }
  if (w.place === 'archive') {
    // light through a window you cannot see, with the dust in it
    const g = ctx.createLinearGradient(W * 0.1, 0, W * 0.5, H)
    g.addColorStop(0, col(0.9, 0.05, 80, 0.12))
    g.addColorStop(1, col(0.9, 0.05, 80, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(W * 0.08, 0)
    ctx.lineTo(W * 0.3, 0)
    ctx.lineTo(W * 0.55, H)
    ctx.lineTo(W * 0.2, H)
    ctx.closePath()
    ctx.fill()
  }
  if (w.place === 'garden') {
    // the water answers the lamp: a slow spiral, brighter the nearer you stand
    const pd = pondOf(w)
    const near = clamp(1 - Math.hypot((w.lamp.x - pd.x) / pd.rx, (w.lamp.y - pd.y) / pd.ry) / 2.2)
    const dw = clamp(w.pondDwell / 1.4)
    ctx.strokeStyle = col(0.95, 0.12, 200, 0.12 + 0.6 * near + 0.3 * dw)
    ctx.lineWidth = 1.6
    ctx.beginPath()
    for (let a = 0; a < 12.5; a += 0.2) {
      const q = a / 12.5
      const x = pd.x + Math.cos(a + w.t * 0.8 * w.motion) * pd.rx * 0.9 * q
      const y = pd.y + Math.sin(a + w.t * 0.8 * w.motion) * pd.ry * 0.9 * q
      if (a === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    // fireflies: slow, warm, and not interested in you
    const r = rngOf(7)
    for (let i = 0; i < 18; i++) {
      const bx = r() * W
      const by = H * (0.2 + r() * 0.7)
      const ph = r() * 6.28
      const x = bx + Math.sin(w.t * 0.25 * w.motion + ph) * 60
      const y = by + Math.cos(w.t * 0.3 * w.motion + ph * 2) * 40
      const blink = Math.max(0, Math.sin(w.t * 0.9 + ph * 3))
      const a = blink * blink * 0.9
      if (a < 0.03) continue
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26)
      g.addColorStop(0, col(0.92, 0.12, 105, a))
      g.addColorStop(1, col(0.8, 0.1, 105, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, 26, 0, 6.3)
      ctx.fill()
    }
  }
  if (w.place === 'shore') {
    // stars, and the moon's road across the water
    const r = rngOf(3)
    for (let i = 0; i < 70; i++) {
      const x = r() * W
      const y = r() * H * 0.32
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(w.t * (0.4 + r()) + i))
      ctx.fillStyle = col(0.95, 0.02, 230, 0.55 * tw)
      ctx.beginPath()
      ctx.arc(x, y, 0.6 + r() * 1.1, 0, 6.3)
      ctx.fill()
    }
    const mx = W * 0.64
    ctx.fillStyle = col(0.97, 0.02, 90, 0.85)
    ctx.beginPath()
    ctx.arc(mx, H * 0.14, Math.min(W, H) * 0.035, 0, 6.3)
    ctx.fill()
    for (let i = 0; i < 24; i++) {
      const y = H * 0.34 + (i / 24) * H * 0.33
      const x = mx + Math.sin(w.t * 0.7 + i) * (4 + i * 1.4)
      ctx.fillStyle = col(0.95, 0.02, 90, 0.2 * (1 - i / 30))
      ctx.fillRect(x - (6 + i), y, 12 + i * 2, 2)
    }
  }
  ctx.restore()
}

// ───────────────────────────── doors ─────────────────────────────

export function drawDoors(w: World, ctx: CanvasRenderingContext2D) {
  const L = w.lamp
  for (const d of doorsOf(w)) {
    const horiz = d.dir === 'left' || d.dir === 'right'
    const dist = Math.hypot(L.x - d.x, L.y - d.y)
    const pull = clamp(1 - dist / (Math.min(w.w, w.h) * 0.45))
    const hue = PLACES[d.to].hue
    const dwell = clamp((w.doorDwell[`${w.place}:${d.dir}`] ?? 0) / 0.9)
    const a = ease(d.appear) * (0.22 + 0.7 * pull + 0.4 * dwell + 0.9 * (w.doorFlash[d.dir] ?? 0)) * (w.asleep ? 0.3 : 1)
    const depth = 46 + 70 * pull
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    let g: CanvasGradient
    if (horiz) {
      const x0 = d.x
      const x1 = d.dir === 'left' ? depth : d.x - depth
      g = ctx.createLinearGradient(x0, 0, x1, 0)
    } else {
      g = ctx.createLinearGradient(0, d.y, 0, d.dir === 'up' ? depth : d.y - depth)
    }
    g.addColorStop(0, col(0.82, 0.12, hue, a))
    g.addColorStop(1, col(0.7, 0.08, hue, 0))
    ctx.fillStyle = g
    if (horiz) ctx.fillRect(d.dir === 'left' ? 0 : d.x - depth, d.y - d.span, depth, d.span * 2)
    else ctx.fillRect(d.x - d.span, d.dir === 'up' ? 0 : d.y - depth, d.span * 2, depth)
    // the frame
    ctx.strokeStyle = col(0.9, 0.06, hue, ease(d.appear) * (0.25 + 0.6 * pull))
    ctx.lineWidth = 1.5
    ctx.beginPath()
    if (horiz) {
      const x = d.dir === 'left' ? 3 : d.x - 3
      ctx.moveTo(x, d.y - d.span)
      ctx.lineTo(x, d.y + d.span)
    } else {
      const y = d.dir === 'up' ? 3 : d.y - 3
      ctx.moveTo(d.x - d.span, y)
      ctx.lineTo(d.x + d.span, y)
    }
    ctx.stroke()
    ctx.restore()
  }
}
