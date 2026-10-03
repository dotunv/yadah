export interface Piece {
  kicker: string
  title: string
  /** Shown alone, set huge, for people who skip text. `*word*` is emphasised. */
  statement: string
  lede: string
  base: string[]
  extended: string[]
  notes: { n: string; text: string }[]
  /** Rough reading time in seconds for the whole thing at its current depth. */
}

export const TEXTS: Record<string, Piece> = {
  letters: {
    kicker: 'Letters to a Stranger',
    title: 'Every interface is a letter to someone who does not exist.',
    statement: 'Attention is the one thing you *cannot* get back.',
    lede: 'The designer imagines a person — their patience, their eyes, their hurry — and writes everything else for them.',
    base: [
      'You are not that person. Nobody is. The “average user” is a statistical convenience; no one has ever met them. Yet the button is sized for them, the paragraph is cut to their imagined patience, and the menu is ordered by their imagined priorities.',
      'So the room fits no one in particular. It is fine for everyone, which is another way of saying it is made for no one.',
    ],
    extended: [
      'The alternative was always too expensive: a different room for every visitor. But rooms made of pixels cost almost nothing to rebuild. The expensive part was never the building. It was knowing who had walked in.',
      'And you tell us, constantly. You tell us by what you open and what you leave, by how long you stay with a picture and how quickly you scroll past a paragraph, by whether your hand reaches for the mouse or stays on the keys. None of it is hidden. It is simply never read.',
    ],
    notes: [
      { n: '01', text: 'Hick’s law: the time to decide grows with the number of choices. A room that offers fewer, better-placed choices is not simpler. It is kinder.' },
      { n: '02', text: 'Fitts’s law: the time to reach a target depends on its distance and its size. The things you reach for most should be nearer, and larger.' },
      { n: '03', text: 'Nothing here is sent anywhere. What this page learns about you lives in your browser, and only there.' },
    ],
  },
  slowness: {
    kicker: 'On Slowness',
    title: 'Slow is not the opposite of fast. It is the opposite of skimming.',
    statement: 'Some things only open to *slow* hands.',
    lede: 'A fast interface is easy to build. A patient one has to be listened into existence.',
    base: [
      'We measure interfaces in milliseconds as though every person were in a hurry, all the time. But watch someone move through a place they love: a bookshop, a garden, a record store. They stop. They go back. They touch things without buying them. Nothing about it is efficient, and nothing about it is wasted.',
      'Speed is a property of the system. Pace is a property of the person. When the two disagree, one of them should give way, and it should not always be the person.',
    ],
    extended: [
      'An animation that delights on the first visit becomes a toll on the fiftieth. A transition that feels luxurious to one person feels like waiting to another. The honest response is not to choose between them, but to notice which person is in the room.',
      'Quiet is also a design. Fewer things moving is not an absence of motion design; it is motion design that has learned when to stop.',
    ],
    notes: [
      { n: '01', text: 'In this room, the speed of everything that moves in the background follows the speed of your pointer. Move slowly for a while and the air slows with you.' },
      { n: '02', text: 'If you close things before they have finished opening, transitions get shorter. The interface takes the hint.' },
      { n: '03', text: 'Operating systems already offer a “reduce motion” setting. It is honoured here, from the first moment.' },
    ],
  },
  margins: {
    kicker: 'Margins',
    title: 'What this page is watching, and what it is not.',
    statement: 'It watches *how* you move. Never *who* you are.',
    lede: 'Everything it notices is about behavior, not identity. And all of it stays where you are.',
    base: [
      'It notices what you open, how long you stay, what you come back to, what you walk past. It notices whether you reach for the mouse or the keyboard, whether you move quickly or slowly, whether you wander or follow the obvious path.',
      'It does not know your name, your location, your device, or anything about you that you did not show by moving. There is no account. There is no server. Nothing leaves this browser tab.',
    ],
    extended: [
      'The rules it follows are simple and written down: spending a long time on something visual makes it a little more visual; skipping text makes it a little less textual; returning to something brings it closer. There is no model you cannot read, and no reason it changes that you cannot name.',
      'If you would like to see the workings, press the backtick key (`) at any time. Every number, every rule, every change is listed there, as it happens.',
    ],
    notes: [
      { n: '01', text: 'Stored in IndexedDB, mirrored to localStorage. Clear your site data and it forgets you completely.' },
      { n: '02', text: 'Seven numbers describe you here: looking, reading, wandering, pace, keys, returning, motion. Each runs from 0 to 1, and starts at ½.' },
      { n: '03', text: 'Once it has seen enough, it will tell you what it thinks. You can disagree. Behave differently and it will change its mind.' },
    ],
  },
}
