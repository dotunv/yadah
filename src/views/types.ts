import type { MutableRefObject } from 'react'

export interface ViewProps {
  id: string
  /** Views that are read set this so the stage can report how much was read on close. */
  probe: MutableRefObject<() => number>
}
