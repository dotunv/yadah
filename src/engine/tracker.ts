import type { Signal } from './types'

/**
 * DOM events ──► Signals. Knows nothing about the model or the visuals.
 * Components report object-level facts through the returned API; global
 * input (pointer, keys, wheel, activity) is sampled here.
 */

export interface TrailPoint {
  x: number
  y: number
  t: number
  v: number
}

export const trail: TrailPoint[] = []
const TRAIL_MAX = 900

export interface Tracker {
  stop: () => void
}

export function startTracker(emit: (s: Signal) => void): Tracker {
  let lastActive = performance.now()
  let activeAcc = 0

  // ── pointer sampling ────────────────────────────────────────────────
  let lx = 0
  let ly = 0
  let lt = 0
  let lAngle = 0
  let have = false
  let dist = 0
  let movingMs = 0
  let idleMs = 0
  let turns = 0
  let windowStart = performance.now()
  let down = false
  let dragged = false
  let downX = 0
  let downY = 0

  const flushPointer = () => {
    const total = movingMs + idleMs
    if (movingMs > 400 && total > 0) {
      emit({ t: 'pointer', avgSpeed: (dist / movingMs) * 1000, pauseRatio: idleMs / total, turns })
    }
    dist = movingMs = idleMs = turns = 0
    windowStart = performance.now()
  }

  const onMove = (e: PointerEvent) => {
    const now = performance.now()
    lastActive = now
    if (!have) {
      lx = e.clientX
      ly = e.clientY
      lt = now
      have = true
      return
    }
    const dt = now - lt
    if (dt < 40) return
    const dx = e.clientX - lx
    const dy = e.clientY - ly
    const d = Math.hypot(dx, dy)
    const v = (d / dt) * 1000
    if (dt > 250) idleMs += dt
    else {
      movingMs += dt
      dist += d
      if (d > 4) {
        const a = Math.atan2(dy, dx)
        let da = Math.abs(a - lAngle)
        if (da > Math.PI) da = 2 * Math.PI - da
        if (da > 1.2) turns++
        lAngle = a
      }
    }
    trail.push({ x: e.clientX / innerWidth, y: e.clientY / innerHeight, t: Date.now(), v })
    if (trail.length > TRAIL_MAX) trail.splice(0, trail.length - TRAIL_MAX)
    lx = e.clientX
    ly = e.clientY
    lt = now
    if (down && !dragged && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) {
      dragged = true
      emit({ t: 'input', kind: 'drag' })
    }
    if (now - windowStart > 5000) flushPointer()
  }

  const onDown = (e: PointerEvent) => {
    lastActive = performance.now()
    down = true
    dragged = false
    downX = e.clientX
    downY = e.clientY
  }
  const onUp = () => {
    down = false
    if (!dragged) emit({ t: 'input', kind: 'click' })
  }

  const MODS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'])
  const onKey = (e: KeyboardEvent) => {
    lastActive = performance.now()
    if (MODS.has(e.key) || e.repeat) return
    if (e.key === '`' || e.key === 'Escape') return // dismissing and debugging are not navigation style
    emit({ t: 'input', kind: 'key' })
  }
  const onWheel = () => {
    lastActive = performance.now()
    wheelThrottle()
  }
  let wheelAt = 0
  const wheelThrottle = () => {
    const n = performance.now()
    if (n - wheelAt > 600) {
      wheelAt = n
      emit({ t: 'input', kind: 'wheel' })
    }
  }

  // ── active time ─────────────────────────────────────────────────────
  const tick = window.setInterval(() => {
    if (document.hidden) return
    const now = performance.now()
    if (now - lastActive < 4000) activeAcc += 1000
    if (activeAcc >= 5000) {
      emit({ t: 'active', ms: activeAcc })
      activeAcc = 0
    }
  }, 1000)

  const onHide = () => {
    if (activeAcc > 0) emit({ t: 'active', ms: activeAcc })
    activeAcc = 0
    flushPointer()
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  window.addEventListener('keydown', onKey)
  window.addEventListener('wheel', onWheel, { passive: true })
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onHide)

  return {
    stop() {
      clearInterval(tick)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    },
  }
}
