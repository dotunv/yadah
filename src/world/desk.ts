import { board } from '../board'
const col = (l: number, c: number, h: number, a = 1) => `oklch(${l} ${c} ${h} / ${a})`
import type { World } from './World'

/** The desk in the hall, where the board is. */
export const deskOf = (w: World) => {
  const m = Math.min(w.w, w.h)
  return { x: w.w * 0.2, y: w.h * 0.7, rx: m * 0.17, ry: m * 0.095 }
}

export function drawDesk(w: World, ctx: CanvasRenderingContext2D) {
  const d = deskOf(w)
  ctx.save()
  // the table, seen from above: warm wood, a little darker than the notes on it
  ctx.fillStyle = col(0.26, 0.045, 58, 0.92)
  ctx.beginPath()
  ctx.roundRect(d.x - d.rx, d.y - d.ry, d.rx * 2, d.ry * 2, 10)
  ctx.fill()
  ctx.strokeStyle = col(0.48, 0.055, 62, 0.5)
  ctx.lineWidth = 2
  ctx.stroke()
  // the notes that are on it — paper, so the lightest thing in the room
  const n = Math.min(board.visible().length, 16)
  for (let i = 0; i < n; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453
    const r1 = a - Math.floor(a)
    const b = Math.sin(i * 78.233) * 12345.678
    const r2 = b - Math.floor(b)
    // each slip takes the ink of the hand that wrote it
    const hue = [25, 55, 85, 110, 145, 175, 205, 240, 275, 305, 335, 190][board.visible()[i].hand % 12]
    ctx.save()
    ctx.translate(d.x + (r1 - 0.5) * (d.rx * 1.6), d.y + (r2 - 0.5) * (d.ry * 1.3))
    ctx.rotate((r1 - 0.5) * 0.9)
    ctx.fillStyle = col(0.92, 0.045, hue, 0.96)
    ctx.fillRect(-14, -10, 28, 20)
    ctx.fillStyle = col(0.42, 0.04, hue, 0.45)
    ctx.fillRect(-10, -4, 18, 1.5)
    ctx.fillRect(-10, 1, 12, 1.5)
    ctx.restore()
  }
  ctx.restore()
}

export function drawDeskLife(w: World, ctx: CanvasRenderingContext2D) {
  const d = deskOf(w)
  const near = w.deskDwell / 1.2
  const a = 0.08 + 0.12 * Math.sin(w.t * 1.3) * w.motion + near * 0.4
  const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.rx * 1.5)
  g.addColorStop(0, col(0.88, 0.12, 75, Math.max(0, a)))
  g.addColorStop(1, col(0.7, 0.08, 70, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(d.x, d.y, d.rx * 1.5, 0, 6.3)
  ctx.fill()
}
