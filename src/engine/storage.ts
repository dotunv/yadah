import type { Profile } from './types'

/**
 * Local-only persistence. IndexedDB is primary; localStorage is both a
 * fallback and a synchronous mirror (IndexedDB writes can be dropped when a
 * tab is closing). On load the newest copy wins. Nothing leaves the browser.
 */

const DB = 'yadah'
const STORE = 'kv'
const KEY = 'profile'
const LS_KEY = 'yadah:v2'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no idb'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(): Promise<Profile | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(KEY)
    r.onsuccess = () => resolve(r.result as Profile | undefined)
    r.onerror = () => reject(r.error)
  })
}

async function idbPut(p: Profile): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(p, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbClear(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function lsGet(): Profile | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Profile) : undefined
  } catch {
    return undefined
  }
}

const valid = (p: unknown): p is Profile =>
  !!p && typeof p === 'object' && (p as Profile).version === 2 && typeof (p as Profile).entities === 'object'

export async function loadProfile(): Promise<Profile | undefined> {
  const [a, b] = await Promise.all([idbGet().catch(() => undefined), Promise.resolve(lsGet())])
  const found = [a, b].filter(valid)
  if (!found.length) return undefined
  return found.sort((x, y) => y.updatedAt - x.updatedAt)[0]
}

/** Synchronous mirror — safe to call from pagehide. */
export function saveProfileSync(p: Profile) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable: the experience still works, it just won't remember */
  }
}

export async function saveProfile(p: Profile) {
  saveProfileSync(p)
  try {
    await idbPut(p)
  } catch {
    /* fall back to localStorage only */
  }
}

export async function forgetProfile() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
  try {
    await idbClear()
  } catch {
    /* ignore */
  }
}
