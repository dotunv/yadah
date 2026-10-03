import type { World } from './World'

/** The pond at the bottom of the garden. */
export const pondOf = (w: World) => ({ x: w.w * 0.7, y: w.h * 0.72, rx: Math.min(w.w * 0.1, 150), ry: Math.min(w.h * 0.075, 80) })
