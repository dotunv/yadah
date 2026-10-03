import type { Obs } from './types'

/**
 * DOM events → low-level observations: how the pointer paces itself, whether
 * hands are on keys or the pointer, and how long the person is actually here.
 * It knows nothing about entities; the world turns the lamp's behavior into
 * relationships.
 */

export interface Tracker {
  stop: () => void
}

const smooth = (v: number, lo: number, hi: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)))

export function startTracker(emit: (o: Obs) => void): Tracker {
  let lastActive = performance.now()
  let activeAcc = 0
  let lx = 0
  let ly = 0
  let lt = 0
  let have = false
  let dist = 0
  let movingMs = 0
  let idleMs = 0
  let windowStart = performance.now()
  let moveAt = 0

  const flushPace = () => {
    const total = movingMs + idleMs
    if (movingMs > 400 && total > 0) {
      const avg = (dist / movingMs) * 1000
      const s = smooth(Math.log(Math.max(avg, 1)), Math.log(150), Math.log(1800))
      emit({ t: 'pace', speed: Math.min(1, Math.max(0, s * (1 - 0.45 * (idleMs / total)))) })
    }
    dist = movingMs = idleMs = 0
    windowStart = performance.now()
  }

  const onMove = (e: PointerEvent) => {
    const now = performance.now()
    lastActive = now
    if (now - moveAt > 1200) {
      moveAt = now
      emit({ t: 'input', kind: 'move' })
    }
    if (!have) {
      lx = e.clientX
      ly = e.clientY
      lt = now
      have = true
      return
    }
    const dt = now - lt
    if (dt < 40) return
    const d = Math.hypot(e.clientX - lx, e.clientY - ly)
    if (dt > 250) idleMs += dt
    else {
      movingMs += dt
      dist += d
    }
    lx = e.clientX
    ly = e.clientY
    lt = now
    if (now - windowStart > 5000) flushPace()
  }
  const onDown = () => {
    lastActive = performance.now()
    emit({ t: 'input', kind: 'click' })
  }
  const MODS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', '`'])
  const onKey = (e: KeyboardEvent) => {
    lastActive = performance.now()
    if (MODS.has(e.key) || e.repeat) return
    emit({ t: 'input', kind: 'key' })
  }
  const tick = window.setInterval(() => {
    if (document.hidden) return
    if (performance.now() - lastActive < 4000) activeAcc += 1000
    if (activeAcc >= 5000) {
      emit({ t: 'active', ms: activeAcc })
      activeAcc = 0
    }
  }, 1000)
  const onHide = () => {
    if (activeAcc > 0) emit({ t: 'active', ms: activeAcc })
    activeAcc = 0
    flushPace()
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onHide)
  return {
    stop() {
      clearInterval(tick)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    },
  }
}
