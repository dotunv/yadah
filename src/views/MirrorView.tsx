import { useEffect } from 'react'
import { describeChanges } from '../engine/adapt'
import { insightsOf, TRAIT_LABEL } from '../engine/insights'
import { TRAITS } from '../engine/types'
import { useStore } from '../store'
import type { ViewProps } from './types'

/** What the page believes about you, said plainly. Also where you can wipe it. */
export function MirrorView({ probe }: ViewProps) {
  const profile = useStore((s) => s.profile)
  const ui = useStore((s) => s.ui)
  const forget = useStore((s) => s.forget)
  const begin = useStore((s) => s.beginReveal)
  useEffect(() => {
    probe.current = () => 1
  }, [probe])

  const changes = describeChanges(ui)
  return (
    <div className="read mirror" data-mode="neutral" tabIndex={0}>
      <div className="read-inner" style={{ gridTemplateColumns: '1fr' }}>
        <article>
          <span className="kicker mono">Mirror</span>
          <h1>This is what I think I know.</h1>
          <p className="lede">Seven numbers. Each starts at one half and moves when you do.</p>
          <dl>
            {TRAITS.map((k) => (
              <div className="row" key={k}>
                <dt className="mono">{TRAIT_LABEL[k]}</dt>
                <dd style={{ margin: 0 }} className="bar">
                  <i style={{ left: `${profile.traits[k] * 100}%`, transition: 'left 1s var(--ease)' }} />
                </dd>
                <dd className="mono" style={{ margin: 0, textAlign: 'right' }}>{profile.traits[k].toFixed(2)}</dd>
              </div>
            ))}
          </dl>
          <div className="prose" style={{ maxWidth: '46rem' }}>
            <p style={{ color: 'var(--ink)' }}>{insightsOf(profile, 4).map((i) => i.text).join(' ')}</p>
            {changes.length > 0 ? (
              <>
                <p className="mono" style={{ color: 'var(--ink-3)', marginTop: '2rem' }}>so, right now:</p>
                <ul style={{ margin: 0 }}>
                  {changes.map((c) => (
                    <li key={c} style={{ margin: '0 0 .4rem', display: 'block' }}>{c}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Nothing is different yet. I am still watching.</p>
            )}
            <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
              Press the backtick key ( ` ) to see every rule and every change as it happens.
            </p>
          </div>
          <div className="btns">
            <button className="btn" data-cursor="button" onClick={() => begin(true)}>Hear it again</button>
            <button className="btn danger" data-cursor="button" onClick={() => void forget()}>Forget me</button>
          </div>
        </article>
      </div>
    </div>
  )
}
