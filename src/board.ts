/**
 * The desk in the hall: a board shared between whoever is here, with no server of ours and no database.
 *
 * It lives in the people at the desk. Opening it joins a room over WebRTC (Trystero finds the other
 * visitors through public Nostr relays, which only introduce peers and keep nothing). Notes pass
 * directly between browsers and are merged by id. Each browser keeps its own copy, so a note outlasts
 * the moment it was written as long as someone who saw it comes back.
 *
 * Taking a note down for everyone: each note carries a lock (the SHA-256 of a random key that only its
 * author's browser keeps). Taking it down sends the key. Every browser that gets it checks it against the
 * note's lock, drops the note, and remembers the key so a stale copy cannot bring the note back. Nobody
 * else can do this to your note, and you cannot do it to theirs.
 */
import { joinRoom, selfId } from 'trystero/nostr'

type Room = ReturnType<typeof joinRoom>

export type Note = {
  id: string
  t: number
  text: string
  /** Which of the small hands wrote it (0–11), picked at random per device. */
  hand: number
  /** SHA-256 (hex) of the key that can take this note down for everyone. */
  lock: string
}

/** A key that takes a note down. Only valid if it hashes to that note's lock. */
export type Gone = { id: string; key: string; t: number }

type Packet = { notes: Note[]; gone: Gone[] }

const KEY = 'yadah:board'
const HIDDEN = 'yadah:board:hidden'
const HAND = 'yadah:board:hand'
const MINE = 'yadah:board:mine'
const GONE = 'yadah:board:gone'
export const MAX_LEN = 140
const MAX_NOTES = 80
const LIFE = 1000 * 60 * 60 * 24 * 30
const HEX = /^[0-9a-f]{64}$/

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

const sha = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const randomKey = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')

const clean = (n: unknown): Note | null => {
  if (!n || typeof n !== 'object') return null
  const o = n as Record<string, unknown>
  if (typeof o.id !== 'string' || o.id.length > 40 || typeof o.text !== 'string' || typeof o.t !== 'number') return null
  const text = o.text.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
  if (!text) return null
  const now = Date.now()
  if (!isFinite(o.t) || o.t > now + 60_000 || now - o.t > LIFE) return null
  const hand = typeof o.hand === 'number' ? Math.abs(Math.floor(o.hand)) % 12 : 0
  // notes from before locks existed have none: they can only be hidden for yourself
  const lock = typeof o.lock === 'string' && HEX.test(o.lock) ? o.lock : ''
  return { id: o.id, t: o.t, text, hand, lock }
}

const cleanGone = (g: unknown): Gone | null => {
  if (!g || typeof g !== 'object') return null
  const o = g as Record<string, unknown>
  if (typeof o.id !== 'string' || o.id.length > 40 || typeof o.key !== 'string' || o.key.length > 64) return null
  const t = typeof o.t === 'number' && isFinite(o.t) ? o.t : Date.now()
  return { id: o.id, key: o.key, t }
}

class Board {
  notes: Note[] = read<unknown[]>(KEY, []).map(clean).filter((n): n is Note => !!n)
  hidden = new Set<string>(read<string[]>(HIDDEN, []))
  /** Keys for the notes this browser wrote, by note id. */
  private mine: Record<string, string> = read<Record<string, string>>(MINE, {})
  /** Keys that took notes down, kept so a stale copy cannot bring one back. */
  private gone: Gone[] = read<unknown[]>(GONE, []).map(cleanGone).filter((g): g is Gone => !!g && Date.now() - g.t < LIFE)
  peers = 0
  open = false
  private room: Room | null = null
  private send: ((p: Packet, to?: string) => void) | null = null
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

  constructor() {
    // apply what we already know was taken down
    void this.apply([], this.gone)
  }

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

  /** Did this browser write the note, and so can take it down for everyone? */
  isMine(id: string) {
    return id in this.mine
  }

  private save() {
    write(KEY, this.notes)
    write(GONE, this.gone)
    write(MINE, this.mine)
  }

  /** Merge notes and take-downs that arrived (or were already stored). Take-downs are checked against locks. */
  private async apply(notes: unknown[], gone: unknown[]) {
    const incomingGone = gone.map(cleanGone).filter((g): g is Gone => !!g)
    const knownKeys = new Set(this.gone.map((g) => g.id + g.key))
    const pool = [...this.gone, ...incomingGone.filter((g) => !knownKeys.has(g.id + g.key))]
    const cleaned = notes.map(clean).filter((n): n is Note => !!n)
    const have = new Set(this.notes.map((n) => n.id))
    const all = [...this.notes, ...cleaned.filter((n) => !have.has(n.id))]
    let changed = cleaned.some((n) => !have.has(n.id))
    const valid: Gone[] = []
    const survivors: Note[] = []
    const removed = new Set<string>()
    for (const n of all) {
      let down = false
      if (n.lock) {
        for (const g of pool) {
          if (g.id === n.id && (await sha(g.key)) === n.lock) {
            down = true
            if (!valid.some((v) => v.id === g.id)) valid.push(g)
            break
          }
        }
      }
      if (down) {
        removed.add(n.id)
        changed = true
      } else survivors.push(n)
    }
    // keep take-downs we could not check yet (their note has not reached us), until the note arrives or they expire
    const pending = pool.filter((g) => !valid.some((v) => v.id === g.id) && !all.some((n) => n.id === g.id) && Date.now() - g.t < LIFE)
    const nextGone = [...valid, ...pending].slice(0, 400)
    if (nextGone.length !== this.gone.length) changed = true
    this.gone = nextGone
    this.notes = survivors.sort((a, b) => b.t - a.t).slice(0, MAX_NOTES)
    removed.forEach((id) => delete this.mine[id])
    if (changed) {
      this.save()
      this.emit()
    }
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
    const board = room.makeAction<Packet>('board')
    this.send = (p, to) => void board.send(p, to ? { target: to } : undefined).catch(() => undefined)
    board.onMessage = (data) => {
      if (!data || typeof data !== 'object') return
      const d = data as Partial<Packet>
      void this.apply(Array.isArray(d.notes) ? d.notes.slice(0, MAX_NOTES) : [], Array.isArray(d.gone) ? d.gone.slice(0, 400) : [])
    }
    const count = () => {
      this.peers = Object.keys(room.getPeers()).length
      this.emit()
    }
    room.onPeerJoin = (peer) => {
      // tell the newcomer what we have and what has been taken down; they do the same for us
      this.send?.({ notes: this.notes, gone: this.gone }, peer)
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

  /** Pin a note. Resolves false if it is empty, or too soon after the last one. */
  async pin(text: string): Promise<boolean> {
    const now = Date.now()
    const clipped = text.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
    if (!clipped || now - this.lastPin < 15_000) return false
    this.lastPin = now
    const key = randomKey()
    const note: Note = { id: `${selfId.slice(0, 8)}${now.toString(36)}`, t: now, text: clipped, hand: this.hand, lock: await sha(key) }
    this.mine[note.id] = key
    await this.apply([note], [])
    this.send?.({ notes: [note], gone: [] })
    return true
  }

  /** Take a note off your own wall. It is only hidden for you; others keep it. */
  hide(id: string) {
    this.hidden.add(id)
    write(HIDDEN, [...this.hidden])
    this.emit()
  }

  /** Take down a note you wrote, for everyone who has it or will be sent it. */
  async takeDown(id: string) {
    const key = this.mine[id]
    if (!key) return
    const g: Gone = { id, key, t: Date.now() }
    await this.apply([], [g])
    this.send?.({ notes: [], gone: [g] })
  }
}

export const board = new Board()
