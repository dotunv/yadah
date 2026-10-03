import { createProfile, createSession, step, readyToReveal } from '../src/engine/model'
import { deriveInterface } from '../src/engine/adapt'
import { insightsOf } from '../src/engine/insights'
import type { Signal } from '../src/engine/types'

type Script = Signal[]
const open = (id: string): Signal => ({ t: 'open', id, via: 'pointer' })
const close = (id: string, dwellMs: number, read = 0, depth = 2): Signal => ({ t: 'close', id, dwellMs, read, depth })

const scenarios: Record<string, Script> = {
  looker: [open('tide'), close('tide', 18000, 0, 8), open('letters'), close('letters', 1500, 0.05), open('ember'), close('ember', 15000, 0, 6), open('letters'), close('letters', 1200, 0.05), open('tide'), close('tide', 20000, 0, 7), open('slowness'), close('slowness', 1800, 0.1)],
  reader: [open('letters'), close('letters', 30000, 0.9), open('slowness'), close('slowness', 26000, 0.85), open('margins'), close('margins', 22000, 0.8), open('letters'), close('letters', 15000, 0.8), open('tide'), close('tide', 2000, 0)],
  wanderer: [open('tide'), close('tide', 5000), open('margins'), close('margins', 4000, 0.3), open('instrument'), close('instrument', 6000, 0, 4), open('letters'), close('letters', 4000, 0.3), open('ember'), close('ember', 5000), open('slowness'), close('slowness', 4000, 0.3), { t: 'discover', id: 'trace' }],
  keyboardist: [...Array(25).fill({ t: 'input', kind: 'key' } as Signal), open('letters'), close('letters', 14000, 0.7), open('instrument'), close('instrument', 12000, 0, 8), open('lattice'), close('lattice', 9000, 0, 3)],
}

for (const [name, script] of Object.entries(scenarios)) {
  let p = createProfile(0)
  let s = createSession(0)
  const log: string[] = []
  for (const sig of script) {
    const r = step(p, s, sig, 0)
    p = r.profile
    s = r.session
    if (readyToReveal(p, s) && !log.includes('ready')) log.push('ready')
  }
  const ui = deriveInterface({ ...p, revealed: true })
  console.log(`\n== ${name} (evidence ${p.evidence.toFixed(1)}, ready: ${log.includes('ready')})`)
  console.log(Object.entries(p.traits).map(([k, v]) => `${k}=${v.toFixed(2)}`).join('  '))
  console.log('mode:', ui.mode, 'textDepth:', ui.textDepth, 'spatial:', ui.spatial, 'kb hints:', ui.keyboard.hints, 'quiet:', ui.motion.quiet, 'ambient:', ui.motion.ambient.toFixed(2))
  console.log(insightsOf(p).map((i) => '  · ' + i.text).join('\n'))
}
