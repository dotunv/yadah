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

## Seven presences

They are not UI. They have behavior, and Yadah learns which ones you form relationships with.

- **The listener** is almost still. It opens when you hold still near it.
- **The wanderer** never stays. Follow it, or let it come to you.
- **The mirror** only knows what you show it.
- **The archivist** keeps the places where you lingered, and shows them to you.
- **The stranger** avoids you. It stays only for someone who doesn't chase it.
- **The witness** watches, then replays your last twelve seconds of light.
- **The seed** becomes what you feed it, and stays that way.

## Guesses, and being wrong

Yadah holds six guesses: *you prefer stillness, you follow what moves, you return to things, you
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

## Accessibility and privacy

- Keyboard: arrows move the lamp, Tab visits each presence, Enter touches. Focus is drawn in the room.
- Spoken lines are mirrored to a live region. Reduced-motion is honoured from the first frame.
- **forget me** (bottom right) erases everything. Nothing ever leaves the browser.

## Stack

Vite, React, TypeScript, Canvas 2D. Fonts: Bricolage Grotesque and Alegreya, self-hosted via Fontsource.
No animation library: the room is a simulation.
