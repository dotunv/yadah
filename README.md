# Yadah

A dark room with seven presences in it, and a small light you carry.

Yadah doesn't know you when you arrive. It watches how you move, forms guesses about you,
tests them, sometimes finds out it was wrong, and remembers. When you come back, the room is
different because of what happened between you. It is not personalisation. It is recognition.

Everything stays in the browser (IndexedDB, mirrored to localStorage). No server, no network, no AI:
Yadah's understanding is a short list of readable rules.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run sim        # watch the engine form, test and revise its guesses, headlessly
```

## Seeing it quickly

Press the backtick key (`` ` ``) to open Yadah's mind. Under **try someone else**, pick a person
(The Still One, The Chaser, The Returner, The Drifter, The Keyboardist). It seeds a relationship and
starts the reveal. Press **begin** and watch the room rearrange. Reload for the welcome back.

Or explore for a few minutes. When Yadah has something to say, a small light appears at the bottom of
the room. Hold the lamp over it.

## The story

*Yadah* is Hebrew for "to know", and for giving thanks with open hands. Yadah is a room that has been alone,
trying to learn what it is to know someone. The eight presences are parts of Yadah, its ways of knowing:
listening, following, mirroring, keeping, fearing, watching, growing, enduring. Nothing explains this up front.

- **Fragments.** Each time you finish an encounter, that part of Yadah tells you something of where it came from
  (four per presence, one per completion, in order). Taken together they say that someone was here before you,
  that the room was left waiting, and that it frightened them. The stranger is who left.
- **Chapters.** Each is written on the floor once: *I arrival*, *II return*, *III recognition*, *IV doubt* (when it
  was wrong about you), *V absence* (after a long time away), *VI home*.
- **An ending.** Back at least three times and close to five presences, a light appears again. Yadah finishes
  the word: *"yadah. it means to know. I didn't know that when I began."* It says what happened between you
  (even the stranger stayed, or one of us left and I understand why), the word on the floor lights fully, and from
  then on it says *welcome home*.
- **Forgetting is an ending too.** *forget me* plays a farewell (*"I won't remember you."*) and then actually does it.
  Nothing is written on the way out.

## The idea

```
  YOU → behavior → observation → interpretation → memory → relationship → world → YOU AGAIN
```

| Layer | Where | What it is |
| --- | --- | --- |
| behavior | `src/world/World.ts` | A lamp (your cursor, or arrow keys). It lingers, chases, approaches, holds still. |
| observation | `src/engine/types.ts` (`Obs`) | "dwelt near the witness, 4s, mostly still". Facts, not statistics. |
| interpretation | `src/engine/hypotheses.ts`, `interpret.ts` | Six guesses about you, each a plain sentence with evidence for and against. |
| memory | `src/engine/memory.ts`, `storage.ts` | Bonds per entity, marks where the lamp lingered, revisions. Persisted. |
| relationship | `src/engine/relationship.ts` | Memory becomes *intent*: where things want to live, how awake, what colour the air has. |
| world | `src/world/` | A simulation that never stops. Things breathe, drift, notice, avoid, return. |

`src/engine/` has no React and no canvas. Change how Yadah understands people there; change how
the room looks and behaves in `src/world/`. Neither needs the other rewritten.

## A house, not a room

Yadah is a hall with three more places off it: the **archive** (shelves, a window of light, a long table),
the **garden** (fireflies, a fence, someone's plants) and the **shore** (stars, a moon's road, the vigil at the
water's edge). You cross between them by holding the lamp at a door. Doors appear when you have earned them
("a door that wasn't there"), and each place says one thing, once, the first time you arrive.

The presences live in different places. The ones you become close to come to live in the hall, and follow you
through doors. The wanderer goes where it likes, and the witness remembers where. What the wanderer did while you
weren't looking is something it can tell you later.

## Things that happen on their own

Every minute or so, never while you are in the middle of something:
a draught that opens the doors a little; the lamp going out, so that the presences' own light shows;
the wanderer taking your lamp and leading you, sometimes through a door; someone crossing the room who is none of
them (and leaving footprints); the stranger passing through on its own errand; the listener calling; and
gifts left for you by something that has come to know you.

## Knowing more

Each presence has a second way of meeting you, offered only after you have finished the first.
- **The listener** answers when you call: hold, and hold the light higher or lower for pitch.
- **The wanderer** takes you on a tour of the whole house.
- **The mirror** shows you the path your lamp took *last* visit.
- **The archivist** lays out its diary of what has happened between you, in its own words, including the times it
  guessed wrong. You read it by holding the lamp over each slip.
- **The witness** tells you what the house did while you were away.
- **Gifts** (a shell, a feather, a shard, a stone…) are given once, at the second completion, and stay on the
  hearth in the hall. They say what they are when you stop beside them.

## The pond, and the desk

- **The pond.** In the garden, rest the lamp on the pond and the water rises over the room and shows you a real website, picked at random from a short list I chose and checked (Radio Garden, Neal.fun, The Evolution of Trust, Pointer Pointer, WindowSwap, Zoomquilt, Earth, Poolside FM, NASA Eyes, The Useless Web). "Step through" opens it in a new tab; "stay here" lets the water go. Sites you have not been to come up more often. The list is `src/engine/sites.ts`.
- **The desk.** In the hall, rest the lamp on the table to open the board. It is shared between whoever is at the desk at the same time, with no server of ours and no database: your browser joins a small room over WebRTC (found through public Nostr relays, which only introduce peers and store nothing), and notes pass straight between browsers and are merged by id. Each browser keeps its own copy for 30 days, so notes survive as long as people who saw them come back. Nothing connects until you open the desk. Notes are 140 characters, rate-limited, shown as plain text, you can hide any note for yourself, and you can take down a note you wrote for everyone (each note carries a lock, the hash of a key only its author's browser keeps; taking it down sends the key, every browser checks it and drops the note, and remembers the key so a stale copy cannot bring it back). Nobody can take down someone else's note, and a browser that never hears the take-down keeps its copy. Add `?relay=wss://your-relay` to use a relay of your own.

**Keyboard.** Arrow keys move the lamp and Enter presses, so Enter on the pond or the table opens them. Screen-reader and Tab users get buttons for "Look into the pond" (garden) and "Go to the desk" (hall). Inside the desk, focus lands in the note field, Enter pins, and Escape steps away; in the pond's window, focus lands on "step through" and Escape closes it.

## Eight presences

They are not UI. They have behavior, and Yadah learns which ones you form relationships with.

- **The listener** is almost still. It opens when you hold still near it.
- **The wanderer** never stays. Follow it, or let it come to you.
- **The mirror** only knows what you show it.
- **The archivist** keeps the places where you lingered, and shows them to you.
- **The stranger** avoids you. It stays only for someone who doesn't chase it.
- **The witness** watches, then replays your last twelve seconds of light.
- **The seed** becomes what you feed it, and stays that way.
- **The vigil** is a stack of heavy stones. Near it, the lamp grows sluggish. It asks for something that costs
  you: both hands held apart for twenty seconds, `Z` and `/` together (or two fingers a hand apart on a phone).
  It waits until you start, and begins to forget if you let go. A cord of light runs from each hand to the stones
  and the room gathers into one low sound. If you can't use both hands, one held for twice as long also works,
  and it says so. Each time you carry it to the end it gains a stone; stay away and they fall. Holding on is a
  guess Yadah makes about you (*"you hold on when it costs you"*).

## Guesses, and being wrong

Yadah holds seven guesses: *you prefer stillness, you follow what moves, you return to things, you
don't follow the obvious path, you stay when something doesn't explain itself, your hands stay on the keys.*

A guess needs evidence before it is held. Held guesses are tested: Yadah puts something tempting in
your path and watches whether you take it. If a held guess is contradicted it is not quietly lowered.
It is recorded as a revision, and Yadah says so ("I thought you preferred stillness."). Old evidence
is held a little more loosely at the start of every visit, so it can change its mind.

## Memory, made physical

There is no statistics view. History shows up as things in the room:

- **Bonds** pull things toward the hearth and wake them up. What you walk past drifts to the edges.
- **Marks** are ink stains where the lamp lingered. They persist across visits.
- **Pigment**: the room starts monochrome. Colour enters from the things you grew close to, so each
  person ends up in a different atmosphere (not a theme).
- **Meeting**: when you return, the things you are close to come to where you arrive.
- **Seed growth** and **stranger wariness** carry over between visits.

## The reveal

When Yadah has held at least two guesses, met three things and earned the right, it signals with a
slow light. The room goes quiet. It says what it noticed, one line at a time, ends with
*"I think I know where to begin"*, and waits. **begin** releases the room: everything moves to
where the relationship says it belongs, and the air takes on the colour of what you chose.
Before the reveal the relationship is only partly expressed; after it, fully.

## The first minute

A first visit has to feel alive and has to teach itself without a menu:

- The lamp ignites, and the seven presences arrive one at a time, each leaving a ring.
- Everything has its own life while you do nothing: the listener sends out rings, the witness looks
  around and blinks, the archivist rustles, the stranger circles you from a distance, dust drifts.
- Things wake as the lamp nears, and the first time you come close to one it says what it wants
  ("hold still beside it", "don't chase it", "it is looking at you", then "touch it").
- You can watch yourself being learned. Each time Yadah registers something, a mote of light leaves
  the lamp and flies into a letter of the *yadah* on the floor. The letters fill in as it takes you in.
- Sound: every presence owns one note of a quiet chord, and it only sings as you grow close to it.
  The room literally sounds like your history. Sound starts on your first touch and can be turned off.

## Being wrong, decay, and hours

- **Confident misreading.** Yadah sees *that* you left something, or stopped, or finished. It does not see
  why, and it says why anyway: *"you were afraid of it."*, *"you were tired."*, *"you were looking for
  something."* Some can be corrected by what you do next (come back, and it says *"no. you came back."* and counts
  it as evidence). Most stand. One of them can end up in the reveal as a line it is sure about and cannot check.
- **Decay without upkeep.** Nothing is maintained for you. Marks you do not return to lose their colour,
  go black and are lost, faster the longer you are away. A neglected seed closes into a husk. If you chase the
  stranger long enough it leaves for good, and only *forget me* brings it back. Lingering on a mark renews it.
- **Hours.** Yadah is not locked, but it keeps the clock. In the evening it is half awake. In the small hours
  it is asleep: nothing responds, and the way in is patience. Hold the lamp still over the word for a few seconds
  and it wakes. After a long absence it says it is out of practice. Everything stays local: the only input is
  your own clock.

Try them from the debug panel: *pretend 3am*, *come back in 9 days*, or open the page with `?hour=3`.

## Accessibility and privacy

- Keyboard: arrows move the lamp, Tab visits each presence, Enter touches. Focus is drawn in the room.
- Spoken lines are mirrored to a live region. Reduced-motion is honoured from the first frame.
- **forget me** (bottom right) erases everything. Nothing ever leaves the browser.

## Stack

Vite, React, TypeScript, Canvas 2D. Fonts: Bricolage Grotesque and Alegreya, self-hosted via Fontsource.
No animation library: the room is a simulation.
