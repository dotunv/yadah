import { animate, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CATALOG } from '../engine/catalog'
import type { ObjectMeta } from '../engine/types'
import { useViewport } from '../hooks'
import { useStore } from '../store'
import { ART } from './GlyphArt'

/**
 * The room. A world that is exactly the window at first, and grows beyond it
 * as the person turns out to be an explorer. Objects are placed from
 * InterfaceState alone — nothing here reads the behavioral profile.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const DEPTH: Record<string, number> = { visual: 1, reading: 0.45, interactive: 0.75 }

export function Field() {
  const ui = useStore((s) => s.ui)
  const phase = useStore((s) => s.phase)
  const openId = useStore((s) => s.open?.id ?? null)
  const profile = useStore((s) => s.profile)
  const { w: vw, h: vh } = useViewport()

  const spread = ui.spatial ? ui.spread : 1
  const W = vw * spread
  const H = vh * spread
  const maxX = (W - vw) / 2
  const maxY = (H - vh) / 2

  // ── camera ───────────────────────────────────────────────────────
  const camX = useMotionValue(0)
  const camY = useMotionValue(0)
  const sx = useSpring(camX, { stiffness: 90, damping: 22, mass: 0.8 })
  const sy = useSpring(camY, { stiffness: 90, damping: 22, mass: 0.8 })
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const px = useSpring(mx, { stiffness: 60, damping: 18 })
  const py = useSpring(my, { stiffness: 60, damping: 18 })
  const worldX = useTransform(sx, (v) => -maxX - v)
  const worldY = useTransform(sy, (v) => -maxY - v)
  const dragging = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  useEffect(() => {
    camX.set(clamp(camX.get(), -maxX, maxX))
    camY.set(clamp(camY.get(), -maxY, maxY))
  }, [maxX, maxY, camX, camY])

  // Pointer parallax + proximity (for hidden nodes)
  const pointer = useRef({ x: -9999, y: -9999 })
  const [near, setNear] = useState<Record<string, number>>({})
  useEffect(() => {
    const on = (e: PointerEvent) => {
      mx.set((e.clientX / innerWidth - 0.5) * 2)
      my.set((e.clientY / innerHeight - 0.5) * 2)
      pointer.current = { x: e.clientX, y: e.clientY }
    }
    addEventListener('pointermove', on, { passive: true })
    return () => removeEventListener('pointermove', on)
  }, [mx, my])

  const base = Math.min(vw, vh)
  const size0 = clamp(base * 0.125, 64, 132)

  const items = useMemo(() => {
    const cx = 0.5
    const cy = 0.5
    return CATALOG.map((o) => {
      let x = o.at[0]
      let y = o.at[1]
      if (!o.hidden) {
        const pull = (ui.kindPull[o.kind] ?? 0) + (ui.surfaced[o.id] ?? 0) * 0.35
        x = cx + (x - cx) * (1 - pull)
        y = cy + (y - cy) * (1 - pull)
      }
      // keep inside the world
      x = clamp(x, 0.07, 0.93)
      y = clamp(y, 0.15, 0.88)
      const sz = size0 * (o.hidden ? 0.7 : ui.scale[o.kind]) * (1 + (ui.surfaced[o.id] ?? 0) * 0.22)
      return { o, x: x * W, y: y * H, size: sz }
    })
  }, [ui, W, H, size0])

  // Hidden nodes: proximity reveal. Polled lightly while the room is idle.
  useEffect(() => {
    if (!ui.hiddenVisible && !profile.revealed) return
    const id = window.setInterval(() => {
      const wx = worldX.get()
      const wy = worldY.get()
      const next: Record<string, number> = {}
      for (const it of items) {
        if (!it.o.hidden) continue
        const dx = it.x + wx - pointer.current.x
        const dy = it.y + wy - pointer.current.y
        const d = Math.hypot(dx, dy)
        const k = clamp(1 - d / 230, 0, 1)
        next[it.o.id] = k
        if (k > 0.55 && it.o.id !== 'mirror') useStore.getState().discover(it.o.id)
      }
      setNear((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }, 120)
    return () => clearInterval(id)
  }, [items, ui.hiddenVisible, profile.revealed, worldX, worldY])

  // ── pan: drag, wheel, arrows ─────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (!ui.spatial || (e.target as HTMLElement).closest('.glyph')) return
    dragging.current = { x: e.clientX, y: e.clientY, cx: camX.get(), cy: camY.get() }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragging.current
    if (!d) return
    camX.set(clamp(d.cx - (e.clientX - d.x), -maxX, maxX))
    camY.set(clamp(d.cy - (e.clientY - d.y), -maxY, maxY))
  }
  const onPointerUp = () => (dragging.current = null)
  const onWheel = (e: React.WheelEvent) => {
    if (!ui.spatial || openId) return
    camX.set(clamp(camX.get() + e.deltaX + (e.shiftKey ? e.deltaY : 0), -maxX, maxX))
    camY.set(clamp(camY.get() + (e.shiftKey ? 0 : e.deltaY), -maxY, maxY))
  }

  const focusCamera = useCallback(
    (x: number, y: number) => {
      if (!ui.spatial) return
      animate(camX, clamp(x - W / 2, -maxX, maxX), { duration: 0.9, ease: [0.7, 0, 0.2, 1] })
      animate(camY, clamp(y - H / 2, -maxY, maxY), { duration: 0.9, ease: [0.7, 0, 0.2, 1] })
    },
    [ui.spatial, W, H, maxX, maxY, camX, camY],
  )

  const visibleIds = useMemo(
    () => items.filter((i) => !i.o.hidden || (i.o.id === 'mirror' ? profile.revealed : ui.hiddenVisible)).map((i) => i.o.id),
    [items, ui.hiddenVisible, profile.revealed],
  )

  // Keyboard: spatial arrow navigation between things, number keys when learned.
  useEffect(() => {
    if (phase !== 'explore' || openId) return
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      if (el && /input|textarea/i.test(el.tagName)) return
      if (/^[1-7]$/.test(e.key) && ui.keyboard.numberKeys) {
        const t = CATALOG.find((o) => !o.hidden && o.order === Number(e.key))
        document.querySelector<HTMLElement>(`[data-glyph="${t?.id}"]`)?.click()
        return
      }
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
      if (!dir) return
      e.preventDefault()
      const cur = items.find((i) => i.o.id === el?.dataset.glyph)
      const from = cur ?? { x: W / 2, y: H / 2 }
      let best: (typeof items)[number] | undefined
      let bestScore = Infinity
      for (const it of items) {
        if (it === cur || !visibleIds.includes(it.o.id)) continue
        const dx = it.x - from.x
        const dy = it.y - from.y
        const along = dx * dir[0] + dy * dir[1]
        if (along <= 4) continue
        const across = Math.abs(dx * dir[1] - dy * dir[0])
        const score = along + across * 1.6
        if (score < bestScore) {
          bestScore = score
          best = it
        }
      }
      if (best) {
        document.querySelector<HTMLElement>(`[data-glyph="${best.o.id}"]`)?.focus()
        focusCamera(best.x, best.y)
      } else if (!cur) {
        const first = items.find((i) => visibleIds.includes(i.o.id))
        if (first) document.querySelector<HTMLElement>(`[data-glyph="${first.o.id}"]`)?.focus()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [phase, openId, items, visibleIds, ui.keyboard.numberKeys, W, H, focusCamera])

  const enterDur = phase === 'transform' ? 1 : 0

  return (
    <div
      className="field"
      data-spatial={ui.spatial}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      data-cursor={ui.spatial ? 'drag' : undefined}
    >
      <motion.div className="world" style={{ width: W, height: H, x: worldX, y: worldY }}>
        {ui.spatial && <Threads items={items} W={W} H={H} />}
        {items.map((it, i) => (
          <Glyph
            key={it.o.id}
            index={i}
            meta={it.o}
            x={it.x}
            y={it.y}
            size={it.size}
            hiddenOpacity={it.o.hidden ? (it.o.id === 'mirror' ? (profile.revealed ? 0.4 + (near.mirror ?? 0) * 0.6 : 0) : ui.hiddenVisible ? 0.1 + (near[it.o.id] ?? 0) * 0.9 : 0) : 1}
            px={px}
            py={py}
            enterDur={enterDur}
            dimmed={!!openId}
          />
        ))}
      </motion.div>
      {ui.spatial && !openId && (
        <Compass items={items} W={W} H={H} vw={vw} vh={vh} sx={sx} sy={sy} maxX={maxX} maxY={maxY} visible={visibleIds} onJump={focusCamera} />
      )}
    </div>
  )
}

/** Where you have been this visit, drawn as faint threads between things. */
function Threads({ items, W, H }: { items: { o: ObjectMeta; x: number; y: number }[]; W: number; H: number }) {
  const ids = useStore((s) => s.session.openedIds)
  const pos = Object.fromEntries(items.map((i) => [i.o.id, i]))
  const segs: [string, string][] = []
  for (let i = 1; i < ids.length; i++) if (ids[i] !== ids[i - 1]) segs.push([ids[i - 1], ids[i]])
  return (
    <svg className="threads" width={W} height={H} aria-hidden>
      {segs.map(([a, b], i) => (
        <motion.line
          key={`${a}-${b}-${i}`}
          x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y}
          stroke="var(--accent)" strokeOpacity={0.28} strokeDasharray="2 6"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}
        />
      ))}
    </svg>
  )
}

/** A small map of the world, so a bigger-than-window page is never disorienting. */
function Compass({ items, W, H, vw, vh, sx, sy, maxX, maxY, visible, onJump }: {
  items: { o: ObjectMeta; x: number; y: number }[]
  W: number; H: number; vw: number; vh: number
  sx: ReturnType<typeof useSpring>; sy: ReturnType<typeof useSpring>
  maxX: number; maxY: number; visible: string[]
  onJump: (x: number, y: number) => void
}) {
  const bw = 116
  const bh = Math.round((bw * H) / W)
  const left = useTransform(sx, (v) => ((v + maxX) / W) * bw)
  const top = useTransform(sy, (v) => ((v + maxY) / H) * bh)
  return (
    <motion.div
      className="compass"
      data-cursor="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5, duration: 1.2 }}
      style={{ width: bw, height: bh }}
      onPointerDown={(e) => {
        e.stopPropagation()
        const r = e.currentTarget.getBoundingClientRect()
        onJump(((e.clientX - r.left) / bw) * W, ((e.clientY - r.top) / bh) * H)
      }}
      aria-hidden
    >
      {items.filter((i) => visible.includes(i.o.id)).map((i) => (
        <i key={i.o.id} style={{ left: (i.x / W) * bw, top: (i.y / H) * bh, opacity: i.o.hidden ? 0.45 : 1 }} data-k={i.o.kind} />
      ))}
      <motion.b style={{ left, top, width: (vw / W) * bw, height: (vh / H) * bh }} />
    </motion.div>
  )
}

function Glyph({
  index, meta, x, y, size, hiddenOpacity, px, py, enterDur, dimmed,
}: {
  index: number
  meta: ObjectMeta
  x: number
  y: number
  size: number
  hiddenOpacity: number
  px: ReturnType<typeof useSpring>
  py: ReturnType<typeof useSpring>
  enterDur: number
  dimmed: boolean
}) {
  const ui = useStore((s) => s.ui)
  const visits = useStore((s) => s.profile.objects[meta.id]?.opens ?? 0)
  const ref = useRef<HTMLButtonElement>(null)
  const hoverAt = useRef(0)
  const surfaced = ui.surfaced[meta.id] ?? 0
  const art = ART[meta.id]()
  const depth = DEPTH[meta.kind] * ui.motion.parallax * 16
  const ox = useTransform(px, (v) => v * -depth)
  const oy = useTransform(py, (v) => v * -depth)

  // Seen once per session, as the glyph first appears.
  useEffect(() => {
    if (!meta.hidden) useStore.getState().observe({ t: 'seen', id: meta.id })
  }, [meta.id, meta.hidden])

  const hidden = meta.hidden && hiddenOpacity <= 0
  const ds = ui.motion.duration
  const transform = enterDur
    ? { type: 'spring' as const, stiffness: 46, damping: 13, mass: 1.1, delay: 0.5 + index * 0.09 }
    : { type: 'spring' as const, stiffness: 90 / ds, damping: 18, mass: 1 }

  const open = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    useStore.getState().openObject(meta.id, [r.left + r.width / 2, r.top + r.height / 2], e.detail === 0 ? 'key' : 'pointer')
  }

  return (
    <motion.div
      style={{ position: 'absolute', left: 0, top: 0, x: ox, y: oy }}
    >
      <motion.button
        ref={ref}
        data-glyph={meta.id}
        data-hidden={meta.hidden}
        data-cursor={meta.kind}
        className="glyph"
        aria-label={`${meta.title} — ${meta.kind}`}
        tabIndex={hidden ? -1 : 0}
        initial={{ x: x - size / 2, y: y - size / 2, scale: 0.15, opacity: 0 }}
        animate={{
          x: x - size / 2,
          y: y - size / 2,
          width: size,
          height: size,
          scale: 1,
          opacity: hidden ? 0 : dimmed ? 0 : hiddenOpacity,
        }}
        transition={{
          ...transform,
          opacity: { duration: 0.6 * ds, delay: meta.hidden ? 0 : 0.2 + index * 0.1 },
        }}
        style={{ pointerEvents: hidden || dimmed ? 'none' : 'auto', ['--focus-w' as string]: `${ui.keyboard.ring}px` }}
        onClick={open}
        onPointerEnter={() => {
          hoverAt.current = performance.now()
        }}
        onPointerLeave={() => {
          const ms = performance.now() - hoverAt.current
          if (hoverAt.current && ms > 120) {
            useStore.getState().observe({ t: 'hover', id: meta.id, ms })
            useStore.getState().observe({ t: 'input', kind: 'hover' })
          }
          hoverAt.current = 0
        }}
        whileTap={{ scale: 0.94 }}
      >
        {surfaced > 0.05 && (
          <motion.span
            className="halo"
            animate={{ scale: [1, 1.12, 1], opacity: [0.2 + surfaced * 0.4, 0.55 + surfaced * 0.3, 0.2 + surfaced * 0.4] }}
            transition={{ duration: 4 / Math.max(0.3, ui.motion.ambient), repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span className="art" style={{ color: 'var(--ink)', opacity: meta.hidden ? 1 : 0.92, filter: meta.kind === 'visual' && ui.chroma > 0.4 ? `drop-shadow(0 0 ${Math.round(ui.chroma * 22)}px var(--accent))` : undefined }}>
          <svg viewBox="0 0 100 100" aria-hidden>
            {art}
          </svg>
        </span>
        {visits >= 2 && <span className="visits mono">×{visits}</span>}
        {ui.keyboard.hints && !meta.hidden && <span className="key mono">{meta.order}</span>}
        <span className="label mono">
          <b>{meta.hidden ? '··' : String(meta.order).padStart(2, '0')}</b>
          <span className="t">{meta.title}</span>
        </span>
      </motion.button>
    </motion.div>
  )
}
