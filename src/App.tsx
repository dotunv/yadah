import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Brain } from './brain'
import { MAX_LEN, board } from './board'
import type { Site } from './engine/sites'
import { Debug } from './Debug'
import { ENTITIES } from './engine/entities'
import { PLACES, unlocked, type Dir, type PlaceId } from './engine/places'
import { World, type Phase } from './world/World'

const brain = new Brain()
let loading: Promise<void> | null = null
const load = () => (loading ??= brain.load())

/** Mount point only. The room is a canvas; its life is in world/ and engine/. */
export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [world, setWorld] = useState<World | null>(null)
  const [phase, setPhase] = useState<Phase>('world')
  const [awaiting, setAwaiting] = useState(false)
  const [beacon, setBeacon] = useState(false)
  const [live, setLive] = useState('')
  const [debug, setDebug] = useState(false)
  const [site, setSite] = useState<Site | null>(null)
  const [desk, setDesk] = useState(false)
  const [draft, setDraft] = useState('')
  const [pinned, setPinned] = useState(false)
  const [place, setPlace] = useState<PlaceId>('hall')
  const [corner, setCorner] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('yadah:sound') === 'off'
    } catch {
      return false
    }
  })

  useEffect(() => {
    let w: World | null = null
    let dead = false
    void (async () => {
      await load()
      await Promise.all([
        document.fonts.load('italic 24px Alegreya'),
        document.fonts.load('italic 500 24px Alegreya'),
        document.fonts.load('800 100px "Bricolage Grotesque Variable"'),
      ]).catch(() => undefined)
      if (dead || !canvas.current) return
      w = new World(canvas.current, brain, { whisper: setLive, phase: setPhase, awaiting: setAwaiting, beacon: setBeacon, place: setPlace, portal: setSite, desk: setDesk })
      setWorld(w)
      ;(window as unknown as { yadah: unknown }).yadah = { world: w, brain }
    })()
    return () => {
      dead = true
      w?.destroy()
    }
  }, [])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === '`') setDebug((d) => !d)
      if (e.key === 'Enter' && awaiting && world) {
        e.preventDefault()
        world.release()
      }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [awaiting, world])

  // the quiet controls only show themselves when you go looking for them
  useEffect(() => {
    const on = (e: PointerEvent) => setCorner(e.clientX > innerWidth - 300 && e.clientY > innerHeight - 110)
    addEventListener('pointermove', on, { passive: true })
    return () => removeEventListener('pointermove', on)
  }, [])

  // the board only joins the others while the desk is open
  useEffect(() => {
    if (desk) board.join()
    else board.leave()
  }, [desk])
  useSyncExternalStore(board.subscribe, board.snapshot)

  useEffect(() => {
    if (site) document.querySelector<HTMLElement>('.portal a')?.focus()
  }, [site])

  useEffect(() => {
    if (!site && !desk) return
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (site) world?.closePortal()
      if (desk) world?.closeDesk()
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [site, desk, world])

  useSyncExternalStore(
    (cb) => brain.subscribe(cb),
    () => brain.profile.updatedAt,
  )

  return (
    <div className="room" data-phase={phase}>
      <canvas ref={canvas} className="world" aria-label="A dark room with seven presences in it. Move the light, or use the arrow keys. Press Enter on the pond or the table to open them." />
      <div className="grain" aria-hidden />

      <nav className="sr" aria-label="Presences in the room">
        {ENTITIES.filter((e) => !brain.profile.entities[e.id].gone).map((e) => (
          <button key={e.id} onFocus={() => world?.focusEntity(e.id)} onBlur={() => world?.focusEntity(null)} onClick={() => world?.touchEntity(e.id)}>
            {e.name}
          </button>
        ))}
        {(Object.entries(PLACES[place].doors) as [Dir, PlaceId][])
          .filter(([, to]) => unlocked(brain.profile).includes(to))
          .map(([dir, to]) => (
            <button key={dir} onClick={() => world?.go(dir)}>
              Go to {PLACES[to].name}
            </button>
          ))}
        {place === 'garden' && <button onClick={() => world?.dive()}>Look into the pond</button>}
        {place === 'hall' && <button onClick={() => world?.openDesk()}>Go to the desk</button>}
        {beacon && <button onClick={() => world?.startReveal()}>Yadah has something to tell you</button>}
      </nav>
      <div className="sr" aria-live="polite">
        {live}
      </div>

      {awaiting && (
        <div className="choose">
          <button className="begin" onClick={() => world?.release()} autoFocus>
            begin
          </button>
          <button className="notyet" onClick={() => world?.cancelReveal()}>
            not yet
          </button>
        </div>
      )}

      <div className={`forget${corner ? ' near' : ''}`}>
        {confirm ? (
          <>
            <span>forget everything I know about you?</span>
            <button
              onClick={() => {
                setConfirm(false)
                void (world ? world.farewell() : Promise.resolve()).then(() => brain.forget())
              }}
            >
              yes
            </button>
            <button onClick={() => setConfirm(false)}>no</button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                const next = !muted
                setMuted(next)
                world?.sound.setMuted(next)
              }}
              aria-pressed={!muted}
            >
              {muted ? 'sound off' : 'sound on'}
            </button>
            <button onClick={() => setConfirm(true)}>forget me</button>
          </>
        )}
      </div>

      {site && (
        <div className="portal" role="dialog" aria-label={`A window onto ${site.name}`}>
          <p className="portal-kicker">the water shows you</p>
          <h2>{site.name}</h2>
          <p className="portal-line">{site.line}</p>
          <p className="portal-host">{new URL(site.url).host}</p>
          <div className="portal-acts">
            <a
              className="begin"
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                brain.observe({ t: 'chapter', chapter: `site:${site.id}` })
                brain.observe({ t: 'diary', text: `you went through the pond, to ${site.name}.` })
              }}
            >
              step through ↗
            </a>
            <button className="notyet" onClick={() => world?.closePortal()}>
              stay here
            </button>
          </div>
        </div>
      )}

      {desk && (
        <div className="desk" role="dialog" aria-label="The board on the desk">
          <header>
            <h2>the desk</h2>
            <p>
              {board.peers > 0 ? `${board.peers} ${board.peers === 1 ? 'other is' : 'others are'} here with you.` : 'no one else is here right now.'} what is pinned passes hand to
              hand between whoever visits. there is no server, so it lives in the people who have seen it.
            </p>
          </header>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void board.pin(draft).then((ok) => {
                if (!ok) return
                setDraft('')
                setPinned(true)
                setTimeout(() => setPinned(false), 1800)
              })
            }}
          >
            <input id="desk-note" autoFocus value={draft} onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))} placeholder="leave a line" maxLength={MAX_LEN} aria-label="A note to pin" />
            <button type="submit" disabled={!draft.trim()}>
              {pinned ? 'pinned' : 'pin it'}
            </button>
          </form>
          <ul className="slips">
            {board.visible().map((n) => (
              <li key={n.id} data-hand={n.hand}>
                <span>{n.text}</span>
                {board.isMine(n.id) ? (
                  <button className="down" onClick={() => void board.takeDown(n.id)} aria-label="Take this note down for everyone" title="take down for everyone">
                    take down
                  </button>
                ) : (
                  <button onClick={() => board.hide(n.id)} aria-label="Hide this note for me" title="hide for me">
                    ×
                  </button>
                )}
              </li>
            ))}
            {!board.visible().length && <li className="empty">nothing pinned yet. be the first.</li>}
          </ul>
          <button className="notyet leave" onClick={() => world?.closeDesk()}>
            step away
          </button>
        </div>
      )}

      {debug && <Debug brain={brain} world={world} />}
    </div>
  )
}
