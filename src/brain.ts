import { heldBeliefs, readyToSpeak, step } from './engine/interpret'
import { beginVisit, createProfile, createSession } from './engine/memory'
import { seedProfile, type Persona } from './engine/personas'
import { relate, type WorldIntent } from './engine/relationship'
import { forgetProfile, loadProfile, saveProfile, saveProfileSync } from './engine/storage'
import { startTracker } from './engine/tracker'
import type { Interp, Obs, Profile, Session } from './engine/types'

export interface LogEntry {
  at: number
  obs: Obs
  events: Interp[]
}

/**
 * The layer that holds Yadah's mind: profile, session, and the current
 * understanding of the person. The world feeds it observations and asks it
 * what the room should be like. It has no opinion about pixels.
 */
export class Brain {
  profile: Profile = createProfile()
  session: Session = createSession()
  returning = false
  /** 0..1 — how fully the relationship is expressed. Rises at the reveal. */
  expression = 0.35
  log: LogEntry[] = []
  private cache?: { key: string; intent: WorldIntent }
  private listeners = new Set<() => void>()
  private saveTimer?: number
  private stopTracker?: () => void
  private lastNotify = 0

  async load() {
    const saved = await loadProfile()
    this.returning =
      !!saved && (saved.activeMs >= 5000 || saved.marks.length > 0 || Object.values(saved.entities).some((m) => m.touches > 0))
    this.profile = beginVisit(saved ?? createProfile())
    this.session = createSession()
    this.expression = this.profile.revealed ? 1 : 0.35
    this.save()
    this.stopTracker = startTracker((o) => this.observe(o)).stop
    const flush = () => {
      saveProfileSync(this.profile)
      void saveProfile(this.profile)
    }
    document.addEventListener('visibilitychange', () => document.hidden && flush())
    window.addEventListener('pagehide', flush)
  }

  observe(o: Obs): Interp[] {
    const r = step(this.profile, this.session, o)
    this.profile = r.profile
    this.session = r.session
    this.log = [{ at: Date.now(), obs: o, events: r.events }, ...this.log].slice(0, 80)
    this.save()
    this.notify()
    return r.events
  }

  intent(): WorldIntent {
    const key = `${this.profile.updatedAt}:${this.expression}`
    if (this.cache?.key !== key) this.cache = { key, intent: relate(this.profile, this.expression) }
    return this.cache.intent
  }

  ready() {
    return readyToSpeak(this.profile, this.session)
  }

  beliefs() {
    return heldBeliefs(this.profile)
  }

  reveal() {
    this.profile = { ...this.profile, revealed: true, revealedAt: Date.now() }
    this.expression = 1
    this.save()
    this.notify()
  }

  seed(p: Persona) {
    this.profile = beginVisit(seedProfile(p))
    this.profile.visits = 3
    this.session = createSession()
    this.expression = 0.35
    this.save()
    this.notify()
  }

  async forget() {
    window.clearTimeout(this.saveTimer)
    this.stopTracker?.()
    await forgetProfile()
    location.reload()
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    const now = performance.now()
    if (now - this.lastNotify < 400) return
    this.lastNotify = now
    this.listeners.forEach((l) => l())
  }

  private save() {
    window.clearTimeout(this.saveTimer)
    this.saveTimer = window.setTimeout(() => void saveProfile(this.profile), 700)
  }
}
