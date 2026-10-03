# Yadah

An experimental website that learns how you move through it, remembers, and
rebuilds its own interface around what it learned.

**First visit** — it doesn't know you. **As you explore** — it watches how.
**Later** — it tells you what it thinks, and you *Enter your version*.
**Return** — *"Welcome back. I remember how you explored."* The room is already different.

Everything stays in the browser (IndexedDB, mirrored to localStorage). No server, no network calls, no AI — the model is a table of readable rules.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run sim        # run the behavioral model headlessly on scripted sessions
```

## See it in 30 seconds

Press the backtick key (`` ` ``) for the debug panel. Under **try someone else**, pick a persona
(Looker, Reader, Wanderer, Keyboardist): it seeds a realistic profile and starts the reveal.
Press **Enter your version**, then open *Letters to a Stranger* — the same piece of writing
appears as one huge sentence for the Looker and as a dense two-column essay with margin notes for the Reader.
Reload to get the welcome-back.

Or just explore for a minute. A quiet beacon appears at the bottom when there is enough to say.

## Architecture

```
 Interaction tracking      src/engine/tracker.ts   DOM events → Signals (pointer pace, keys, wheel, activity)
        ↓                  src/store.ts            object-level signals: open / close / dwell / depth / hover
 Behavior model            src/engine/model.ts     Signal → rules → nudges → traits. Pure, deterministic.
        ↓
 User profile              src/engine/types.ts     7 traits in [0,1] + per-object stats + inputs; persisted by storage.ts
        ↓
 Interface state           src/engine/adapt.ts     Profile → InterfaceState (layout, type, motion, keyboard, colour)
        ↓
 Visual / motion system    src/components, views  reads InterfaceState only; never touches traits
```

`src/engine/` has no React and no DOM-bound UI. Changing how the interface responds to behavior
means editing `adapt.ts`; changing how behavior is interpreted means editing `model.ts`. Neither requires touching a component.

### The traits

`visual_interest`, `reading_interest`, `exploration_level`, `interaction_speed`,
`keyboard_preference`, `repeat_interest`, `animation_preference`. All start at 0.5.
Each rule in `model.ts` carries an `id` and its plain-language sentence; the debug panel shows
every trait change next to the rule that caused it. Learning is fast when little is known and
calmer as evidence accumulates.

### What changes in the interface

| Learned                 | Interface                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| high `visual_interest`  | visual objects grow and glow; they open edge-to-edge; colour saturates                      |
| high `reading_interest` | writing is given room: longer text, denser type, two columns, margin notes; warm palette    |
| low `reading_interest`  | text is cut to one huge sentence                                                            |
| high `exploration`      | the world grows beyond the window (drag / wheel / arrows, with a map); hidden objects appear near the edges; threads trace where you have been |
| `keyboard_preference`   | shortcut numbers shown, number keys open things, thicker focus rings                        |
| low `animation_pref`    | shorter, quieter transitions; stiller air; no cursor trail (reduced-motion is honoured from the first frame) |
| slow `interaction_speed`| ambient motion slows to your pace                                                           |
| high `repeat_interest`  | things you return to move toward the centre, grow a halo and a visit count                  |

Adaptation is capped at ~40% before the reveal and expressed in full after *Enter your version*.
While something is open, the room does not rearrange itself.

### Privacy

Nothing leaves the browser. *Margins* says so, *Mirror* (hidden until the reveal) shows the profile in plain language and has **Forget me**.

## Stack

Vite · React 19 · TypeScript · Framer Motion · Zustand · Canvas 2D. Fonts: Fraunces, IBM Plex Mono (self-hosted via Fontsource).
