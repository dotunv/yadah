import { useEffect, useRef, useState } from 'react'

export function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return v
}

export interface Pointer {
  x: number
  y: number
  nx: number
  ny: number
  down: boolean
  inside: boolean
  moved: number
}

type Draw = (c: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number, p: Pointer) => void

/**
 * Sizes a canvas to its box (DPR aware), tracks the pointer inside it, and
 * runs a rAF loop. `draw` gets seconds + delta seconds.
 */
export function useCanvas(draw: Draw, deps: unknown[] = [], opts: { onPointer?: (k: 'move' | 'click' | 'drag') => void; init?: (w: number, h: number) => void } = {}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const p: Pointer = { x: 0, y: 0, nx: 0.5, ny: 0.5, down: false, inside: false, moved: 0 }
    let w = 0
    let h = 0
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      optsRef.current.init?.(w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let lastReport = 0
    let downAt: [number, number] | null = null
    let dragged = false
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      p.x = e.clientX - r.left
      p.y = e.clientY - r.top
      p.nx = p.x / r.width
      p.ny = p.y / r.height
    }
    const move = (e: PointerEvent) => {
      local(e)
      p.inside = true
      p.moved = performance.now()
      const n = performance.now()
      if (n - lastReport > 1500) {
        lastReport = n
        optsRef.current.onPointer?.('move')
      }
      if (downAt && !dragged && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) {
        dragged = true
        optsRef.current.onPointer?.('drag')
      }
    }
    const down = (e: PointerEvent) => {
      local(e)
      p.down = true
      downAt = [e.clientX, e.clientY]
      dragged = false
    }
    const up = () => {
      if (p.down && !dragged) optsRef.current.onPointer?.('click')
      p.down = false
      downAt = null
    }
    const leave = () => (p.inside = false)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    canvas.addEventListener('pointerleave', leave)

    let raf = 0
    let last = performance.now()
    const t0 = last
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!document.hidden) drawRef.current(ctx, w, h, (now - t0) / 1000, dt, p)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointerleave', leave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
