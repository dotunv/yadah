/**
 * The desk in the hall: a board shared between whoever is here, with no server of ours and no database.
 *
 * It lives in the people at the desk. Opening it joins a room over WebRTC (Trystero finds the other
 * visitors through public Nostr relays, which only introduce peers and keep nothing). Notes pass
 * directly between browsers and are merged by id. Each browser keeps its own copy, so a note outlasts
 * the moment it was written as long as someone who saw it comes back.
 */
import { joinRoom, selfId } from 'trystero/nostr'

type Room = ReturnType<typeof joinRoom>

export type Note = {
  id: string
  t: number
  text: string
  /** Which of the small hands wrote it (0–11), picked at random per device. */
  hand: number
}

const KEY = 'yadah:board'
const HIDDEN = 'yadah:board:hidden'
const HAND = 'yadah:board:hand'
export const MAX_LEN = 140
const MAX_NOTES = 80
const LIFE = 1000 * 60 * 60 * 24 * 30

const read = <T>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : d
  } catch {
    return d
  }
}
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* private mode: the board lives for this visit only */
  }
}

const clean = (n: unknown): Note | null => {
  if (!n || typeof n !== 'object') return null
  const o = n as Record<string, unknown>
  if (typeof o.id !== 'string' || o.id.length > 40 || typeof o.text !== 'string' || typeof o.t !== 'number') return null
  const text = o.text.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
  if (!text) return null
  const now = Date.now()
  if (!isFinite(o.t) || o.t > now + 60_000 || now - o.t > LIFE) return null
  const hand = typeof o.hand === 'number' ? Math.abs(Math.floor(o.hand)) % 12 : 0
  return { id: o.id, t: o.t, text, hand }
}

class Board {
  notes: Note[] = read<unknown[]>(KEY, []).map(clean).filter((n): n is Note => !!n)
  hidden = new Set<string>(read<string[]>(HIDDEN, []))
  peers = 0
  open = false
  private room: Room | null = null
  private send: ((n: Note[], to?: string) => void) | null = null
  private subs = new Set<() => void>()
  private lastPin = 0
  private version = 0
  hand = (() => {
    const h = read<number>(HAND, -1)
    if (h >= 0) return h
    const n = Math.floor(Math.random() * 12)
    write(HAND, n)
    return n
  })()

  subscribe = (cb: () => void) => {
    this.subs.add(cb)
    return () => void this.subs.delete(cb)
  }
  snapshot = () => this.version
  private emit() {
    this.version++
    this.subs.forEach((s) => s())
  }

  visible() {
    return this.notes.filter((n) => !this.hidden.has(n.id)).sort((a, b) => b.t - a.t)
  }

  private merge(incoming: Note[]) {
    const have = new Set(this.notes.map((n) => n.id))
    let added = false
    for (const n of incoming) {
      const c = clean(n)
      if (c && !have.has(c.id)) {
        this.notes.push(c)
        have.add(c.id)
        added = true
      }
    }
    if (!added) return
    this.notes.sort((a, b) => b.t - a.t)
    this.notes = this.notes.slice(0, MAX_NOTES)
    write(KEY, this.notes)
    this.emit()
  }

  /** Step up to the desk: find whoever else is here. */
  join() {
    if (this.open) return
    this.open = true
    try {
      // ?relay=wss://… points the board at a relay of your own instead of the public ones
      const own = new URLSearchParams(location.search).get('relay')
      this.room = joinRoom(own ? { appId: 'yadah-house-v1', relayConfig: { urls: [own], redundancy: 1 } } : { appId: 'yadah-house-v1' }, 'desk')
    } catch {
      this.room = null
      this.emit()
      return
    }
    const room = this.room
    const notes = room.makeAction<Note[]>('notes')
    this.send = (n, to) => void notes.send(n, to ? { target: to } : undefined).catch(() => undefined)
    notes.onMessage = (data) => {
      if (Array.isArray(data)) this.merge(data.slice(0, MAX_NOTES))
    }
    const count = () => {
      this.peers = Object.keys(room.getPeers()).length
      this.emit()
    }
    room.onPeerJoin = (peer) => {
      // tell the newcomer what we have; they tell us what they have
      this.send?.(this.notes, peer)
      count()
    }
    room.onPeerLeave = count
    this.emit()
  }

  /** Step away: leave the room, keep the notes. */
  leave() {
    if (!this.open) return
    this.open = false
    void this.room?.leave()
    this.room = null
    this.send = null
    this.peers = 0
    this.emit()
  }

  /** Pin a note. Returns false if it is empty, or too soon after the last one. */
  pin(text: string): boolean {
    const now = Date.now()
    const clipped = text.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
    if (!clipped || now - this.lastPin < 15_000) return false
    this.lastPin = now
    const note: Note = { id: `${selfId.slice(0, 8)}${now.toString(36)}`, t: now, text: clipped, hand: this.hand }
    this.merge([note])
    this.send?.([note])
    return true
  }

  /** Take a note off your own wall. It is only hidden for you; others keep it. */
  hide(id: string) {
    this.hidden.add(id)
    write(HIDDEN, [...this.hidden])
    this.emit()
  }
}

export const board = new Board()
