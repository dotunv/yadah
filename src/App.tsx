import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Brain } from './brain'
import { Debug } from './Debug'
import { ENTITIES } from './engine/entities'
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
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    let w: World | null = null
    let dead = false
    void (async () => {
      await load()
      await Promise.all([
        document.fonts.load('italic 24px Alegreya'),
        document.fonts.load('800 100px "Bricolage Grotesque Variable"'),
      ]).catch(() => undefined)
      if (dead || !canvas.current) return
      w = new World(canvas.current, brain, { whisper: setLive, phase: setPhase, awaiting: setAwaiting, beacon: setBeacon })
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

  useSyncExternalStore(
    (cb) => brain.subscribe(cb),
    () => brain.profile.updatedAt,
  )

  return (
    <div className="room" data-phase={phase}>
      <canvas ref={canvas} className="world" aria-label="A dark room with seven presences in it. Move the light, or use the arrow keys." />
      <div className="grain" aria-hidden />

      <nav className="sr" aria-label="Presences in the room">
        {ENTITIES.map((e) => (
          <button key={e.id} onFocus={() => world?.focusEntity(e.id)} onBlur={() => world?.focusEntity(null)} onClick={() => world?.touchEntity(e.id)}>
            {e.name}
          </button>
        ))}
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

      <div className="forget">
        {confirm ? (
          <>
            <span>forget everything I know about you?</span>
            <button onClick={() => void brain.forget()}>yes</button>
            <button onClick={() => setConfirm(false)}>no</button>
          </>
        ) : (
          <button onClick={() => setConfirm(true)}>forget me</button>
        )}
      </div>

      {debug && <Debug brain={brain} world={world} />}
    </div>
  )
}
