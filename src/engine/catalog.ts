import type { ObjectMeta } from './types'

/**
 * Content-free metadata about the things on the page. The behavioral model
 * only needs to know what kind of thing was touched, and where it sits in the
 * "obvious" order — never what it says.
 */
export const CATALOG: ObjectMeta[] = [
  { id: 'tide', title: 'Tide', kind: 'visual', order: 1, hidden: false, at: [0.2, 0.3] },
  { id: 'letters', title: 'Letters to a Stranger', kind: 'reading', order: 2, hidden: false, at: [0.42, 0.18] },
  { id: 'lattice', title: 'Lattice', kind: 'interactive', order: 3, hidden: false, at: [0.7, 0.28] },
  { id: 'ember', title: 'Ember', kind: 'visual', order: 4, hidden: false, at: [0.82, 0.58] },
  { id: 'slowness', title: 'On Slowness', kind: 'reading', order: 5, hidden: false, at: [0.58, 0.74] },
  { id: 'instrument', title: 'Instrument', kind: 'interactive', order: 6, hidden: false, at: [0.3, 0.7] },
  { id: 'margins', title: 'Margins', kind: 'reading', order: 7, hidden: false, at: [0.12, 0.52] },
  // Hidden: revealed by exploration, not by the page.
  { id: 'trace', title: 'Trace', kind: 'visual', order: 8, hidden: true, at: [0.93, 0.12] },
  { id: 'mirror', title: 'Mirror', kind: 'reading', order: 9, hidden: true, at: [0.05, 0.9] },
]

export const META: Record<string, ObjectMeta> = Object.fromEntries(CATALOG.map((o) => [o.id, o]))
export const VISIBLE = CATALOG.filter((o) => !o.hidden)
