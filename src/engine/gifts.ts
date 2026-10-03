import type { EntityId } from './types'

/** What each presence gives you, once, when it has come to know you. */
export const GIFTS: Record<EntityId, { name: string; line: string }> = {
  listener: { name: 'a shell', line: 'it hums, if you hold it close.' },
  wanderer: { name: 'a feather', line: 'it found this on the shore.' },
  mirror: { name: 'a shard of glass', line: 'you are in it, a little.' },
  archivist: { name: 'a folded slip', line: 'unwritten. it was never blank before.' },
  stranger: { name: 'a smooth stone', line: 'warm. it was in its hand.' },
  witness: { name: 'a glass eye', line: 'it looked through this once.' },
  seed: { name: 'a pod', line: 'it will open when you are not looking.' },
  vigil: { name: 'a small stone', line: 'heavy. yours.' },
}
