import { useEffect, useRef } from 'react'
import { useStore } from '../store'

interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; layer: number }

/**
 * The room's weather. A slow particle field whose speed, density and colour
 * are read from the interface state every frame — so when the profile
 * changes, the air changes with it.
 */
export function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = 0
    let h = 0
    let parts: P[] = []
    const mouse = { x: -999, y: -999, vx: 0, vy: 0 }
    // smoothed copies, so palette/speed glide instead of jump
    const cur = { hue: 215, chroma: 0.18, speed: 1, count: 70 }

    const make = (n: number): P[] =>
      Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0,
        r: 0.6 + Math.random() * 1.8, a: 0.15 + Math.random() * 0.5, layer: Math.random(),
      }))

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      w = innerWidth
      h = innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      parts = make(260)
    }
    resize()
    addEventListener('resize', resize)
    const onMove = (e: PointerEvent) => {
      mouse.vx = e.clientX - mouse.x
      mouse.vy = e.clientY - mouse.y
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    addEventListener('pointermove', onMove, { passive: true })

    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { ui, open } = useStore.getState()
      const k = 1 - Math.exp(-dt * 1.6)
      const dHue = ((ui.hue - cur.hue + 540) % 360) - 180
      cur.hue = (cur.hue + dHue * k + 360) % 360
      cur.chroma += (ui.chroma - cur.chroma) * k
      cur.speed += (ui.motion.ambient - cur.speed) * k
      const targetCount = ui.motion.quiet ? 40 : 90 + 120 * ui.chroma
      cur.count += (targetCount - cur.count) * k

      ctx.clearRect(0, 0, w, h)
      // soft aurora behind everything
      const g = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.75)
      g.addColorStop(0, `oklch(0.26 ${0.02 + cur.chroma * 0.11} ${cur.hue} / ${0.55})`)
      g.addColorStop(1, `oklch(0.12 0.01 ${cur.hue} / 0)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      const n = Math.min(parts.length, Math.floor(cur.count))
      const sp = cur.speed * (open ? 0.4 : 1)
      for (let i = 0; i < n; i++) {
        const p = parts[i]
        // curl-ish drift
        const ang = Math.sin(p.x * 0.004 + now * 0.00011 * sp) * 2 + Math.cos(p.y * 0.005 - now * 0.00009 * sp) * 2
        p.vx += Math.cos(ang) * 6 * sp * dt * (0.5 + p.layer)
        p.vy += Math.sin(ang) * 6 * sp * dt * (0.5 + p.layer)
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < 22000) {
          const f = (1 - d2 / 22000) * 60 * dt
          p.vx += (dx / (Math.sqrt(d2) + 1)) * f + mouse.vx * 0.01
          p.vy += (dy / (Math.sqrt(d2) + 1)) * f + mouse.vy * 0.01
        }
        p.vx *= 0.97
        p.vy *= 0.97
        p.x += p.vx * dt * 20 * sp
        p.y += p.vy * dt * 20 * sp
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (0.7 + cur.chroma * 0.8), 0, 6.283)
        ctx.fillStyle = `oklch(${0.7 + p.layer * 0.2} ${0.02 + cur.chroma * 0.16} ${cur.hue + p.layer * 40} / ${p.a * (0.5 + cur.chroma * 0.5)})`
        ctx.fill()
      }
      mouse.vx *= 0.8
      mouse.vy *= 0.8
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={ref} className="ambient" aria-hidden />
}
