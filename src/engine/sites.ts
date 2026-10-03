/** Real places on the web that are worth stepping into. The pond opens one of these. */
export interface Site {
  id: string
  name: string
  url: string
  /** One line on what you will find, in the house's voice. */
  line: string
}

export const SITES: Site[] = [
  { id: 'radio-garden', name: 'Radio Garden', url: 'https://radio.garden', line: 'turn a small globe and listen to live radio from wherever you land.' },
  { id: 'neal-fun', name: 'Neal.fun', url: 'https://neal.fun', line: 'a great many small, strange, beautiful things to click through.' },
  { id: 'evolution-of-trust', name: 'The Evolution of Trust', url: 'https://ncase.me/trust/', line: 'an essay you play, about why people cooperate at all.' },
  { id: 'pointer-pointer', name: 'Pointer Pointer', url: 'https://pointerpointer.com', line: 'put your cursor anywhere. someone, somewhere, is pointing at it.' },
  { id: 'windowswap', name: 'WindowSwap', url: 'https://www.windowswap.com', line: 'strangers’ windows, from all over the world. you only look.' },
  { id: 'zoomquilt', name: 'Zoomquilt', url: 'https://zoomquilt.org', line: 'one painting that goes on falling inward, forever.' },
  { id: 'earth-nullschool', name: 'Earth', url: 'https://earth.nullschool.net', line: 'the wind, the sea and the weather of the whole planet, right now.' },
  { id: 'poolside-fm', name: 'Poolside FM', url: 'https://www.poolside.fm', line: 'a sunset by a pool, with a radio. it does not end.' },
  { id: 'nasa-eyes', name: 'NASA Eyes', url: 'https://eyes.nasa.gov', line: 'the solar system as it really is, and where the spacecraft are.' },
  { id: 'useless-web', name: 'The Useless Web', url: 'https://theuselessweb.com', line: 'one button. it takes you to some odd corner you would not have found.' },
]

export const SITE_BY_ID: Record<string, Site> = Object.fromEntries(SITES.map((s) => [s.id, s]))
