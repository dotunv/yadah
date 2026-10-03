import { create } from 'zustand'
import { deriveInterface, describeChanges as describe } from './engine/adapt'
import { META } from './engine/catalog'
import { confidenceOf, createProfile, createSession, readyToReveal, step } from './engine/model'
import type { Persona } from './engine/personas'
import { seedProfile } from './engine/personas'
import { forgetProfile, loadProfile, saveProfile, saveProfileSync } from './engine/storage'
import { startTracker } from './engine/tracker'
import type { Delta, InterfaceState, Profile, Session, Signal } from './engine/types'

/**
 *   tracker ─► observe(signal) ─► model.step ─► profile ─► adapt ─► ui
 *
 * The store is the only place those layers meet.
 */

export type Phase = 'boot' | 'welcome' | 'explore' | 'reveal' | 'transform'

export interface LogEntry {
  at: number
  signal: Signal
  deltas: Delta[]
}

export interface OpenState {
  id: string
  origin: [number, number]
  at: number
  depth: number
  via: 'pointer' | 'key'
}

interface Store {
  phase: Phase
  profile: Profile
  session: Session
  ui: InterfaceState
  returning: boolean
  replay: boolean
  open: OpenState | null
  log: LogEntry[]
  debug: boolean
  reducedMotion: boolean
  found: string[]
  changes: string[]

  init: () => Promise<void>
  observe: (s: Signal) => void
  openObject: (id: string, origin: [number, number], via?: 'pointer' | 'key') => void
  closeObject: (read: number) => void
  inside: (kind: 'click' | 'drag' | 'key' | 'move') => void
  discover: (id: string) => void
  finishWelcome: () => void
  beginReveal: (replay?: boolean) => void
  enterVersion: () => void
  finishTransform: () => void
  toggleDebug: () => void
  seed: (p: Persona) => void
  forget: () => Promise<void>
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

let booted = false
let saveTimer: number | undefined
const scheduleSave = (get: () => Store) => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => void saveProfile(get().profile), 700)
}

const initialProfile = createProfile()

export const useStore = create<Store>((set, get) => ({
  phase: 'boot',
  profile: initialProfile,
  session: createSession(),
  ui: deriveInterface(initialProfile),
  returning: false,
  replay: false,
  open: null,
  log: [],
  debug: false,
  reducedMotion: false,
  found: [],
  changes: [],

  async init() {
    if (booted) return
    booted = true
    const rm = reducedMotion()
    const saved = await loadProfile()
    const profile = saved ?? createProfile()
    const returning = !!saved && saved.evidence > 1
    profile.sessions += 1
    const session = createSession()
    set({
      profile,
      session,
      returning,
      reducedMotion: rm,
      ui: deriveInterface(profile, undefined, rm),
      phase: returning ? 'welcome' : 'explore',
    })

    startTracker((s) => get().observe(s))
    const flush = () => {
      const p = get().profile
      saveProfileSync({ ...p, lastSessionMs: get().session.activeMs })
      void saveProfile({ ...p, lastSessionMs: get().session.activeMs })
    }
    document.addEventListener('visibilitychange', () => document.hidden && flush())
    window.addEventListener('pagehide', flush)
    scheduleSave(get)
  },

  observe(signal) {
    const { profile, session, open } = get()
    const r = step(profile, session, signal)
    const entry: LogEntry = { at: Date.now(), signal, deltas: r.deltas }
    const log = [entry, ...get().log].slice(0, 60)
    const patch: Partial<Store> = { profile: r.profile, session: r.session, log }
    // While you are looking at something, the room does not rearrange itself.
    if (!open) patch.ui = deriveInterface(r.profile, undefined, get().reducedMotion)
    set(patch)
    scheduleSave(get)
  },

  openObject(id, origin, via = 'pointer') {
    if (get().open || !META[id]) return
    set({ open: { id, origin, at: performance.now(), depth: 0, via } })
    get().observe({ t: 'open', id, via })
  },

  closeObject(read) {
    const o = get().open
    if (!o) return
    const dwellMs = performance.now() - o.at
    set({ open: null })
    get().observe({ t: 'close', id: o.id, dwellMs, depth: o.depth, read })
    // Now that attention is back on the room, let it settle into what it learned.
    set({ ui: deriveInterface(get().profile, undefined, get().reducedMotion) })
  },

  inside(kind) {
    const o = get().open
    if (!o) return
    set({ open: { ...o, depth: o.depth + 1 } })
    get().observe({ t: 'inside', id: o.id, kind })
  },

  discover(id) {
    if (get().session.discovered.includes(id)) return
    set({ found: [...get().found, id] })
    get().observe({ t: 'discover', id })
  },

  finishWelcome() {
    if (get().phase === 'welcome') set({ phase: 'explore' })
  },

  beginReveal(replay = false) {
    set({ phase: 'reveal', replay, open: null })
  },

  enterVersion() {
    const { replay, profile, reducedMotion: rm } = get()
    if (replay) {
      set({ phase: 'transform' })
      return
    }
    const p: Profile = { ...profile, revealed: true, revealedAt: Date.now() }
    const ui = deriveInterface(p, 1, rm)
    set({ profile: p, ui, phase: 'transform', changes: describe(ui) })
    void saveProfile(p)
  },

  finishTransform() {
    set({ phase: 'explore' })
  },

  toggleDebug() {
    set({ debug: !get().debug })
  },

  seed(persona) {
    const p = seedProfile(persona)
    set({
      profile: p,
      session: createSession(),
      ui: deriveInterface(p, undefined, get().reducedMotion),
      log: [],
      phase: 'explore',
      open: null,
    })
    void saveProfile(p)
  },

  async forget() {
    await forgetProfile()
    window.clearTimeout(saveTimer)
    // A clean slate: reload so nothing in memory survives.
    location.reload()
  },
}))



/** Convenience selectors. */
export const useRevealReady = () =>
  useStore((s) => readyToReveal(s.profile, s.session) && s.phase === 'explore')
export const useConfidence = () => useStore((s) => confidenceOf(s.profile))
