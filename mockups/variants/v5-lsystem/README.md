# Fill the Tale — Garden Glade edition (v5 · L-systems)

A reading-comprehension + spelling mock-up where the world **grows itself**.
Pip, a sprout-creature the player grows from a seed, wanders a procedurally
grown garden. Every typed word literally *sprouts into a real prop*:
`bridge` grows a woven branch-bridge across the gap, `umbrella` grows a
giant leaf-canopy, `firefly` hatches a swarm that lights the hollow-log
cave. Silly words spawn gag props — `banana` peels Pip onto his behind,
`weed` tangles him in thorns — then the story limps onward anyway so the
silly word becomes canon in the recap.

## Run it

From the mockups root:

```bash
cd /home/ANT/unclockable-knighthacks-2026/mockups
python3 -m http.server 8000
```

Open <http://localhost:8000/variants/v5-lsystem/>.

Vanilla HTML/CSS/JS only — `index.html` + `style.css` + `lsystem.js` +
`app.js`. No build step, no framework, relative paths.

## The demo loop

1. **Beat 0 — hero maker.** Pick a seed color, sprout top, and face (or hit
   *Surprise me*). The seed drops into a pot and a sprout grown by the
   `sprout` grammar uncurles — then pops out as your hero, Pip.
2. **Five story lines** with typed-word blanks:
   - *path is broken* → `bridge` / `vine` / `beanstalk` / `log` / `stone` …
   - *it started to drizzle* → `umbrella` / `mushroom` / `flower` …
   - *a wide pond* → `boat` / `lily pad` / `duck` / `unicorn` …
   - *hollow log is dark* → `firefly` / `lantern` / `torch` …
   - *home at last* → `door` / `key` / `cookie jar` …
3. **Silly words** (`banana`, `toaster`, `bee`, `mud`, `ghost`, `weed` …)
   stamp into the sentence, spawn a real gag prop, play a comedic fail,
   then a scrappy fallback prop carries Pip onward — the silly word stays
   canon in the final recap.
4. **Gibberish / empty** input wobbles “Is that a word?” and does not
   advance. **Close spellings** (`bridg`…) offer a “did you mean?” chip.
5. **Finale**: Pip reaches the grown home-tree, earns the “G” letter-gem,
   and the page recaps every line exactly as the kid wrote it.
6. **Watch it play** auto-grows a hero and types the whole chapter at kid
   cadence (including a spelling fix and a fail); **Stop demo** halts it.

Bitsy the ladybug rides along as the support character — she perches on
grown stems, points the pennant at the next objective, and does a little
scared wiggle whenever a gag goes off.

## The L-system engine (`lsystem.js`)

Reference implementation followed: **The Coding Train, Coding Challenge
#16 “Fractal Trees — L-System”**
(<https://github.com/CodingTrain/Coding-Challenges/tree/main/016_LSystem>),
in the tradition of Prusinkiewicz & Lindenmayer’s *The Algorithmic Beauty
of Plants*.

Pipeline, all hand-rolled:

1. `expand(axiom, rules, iterations, rand)` — parallel string rewriting.
   A symbol maps to weighted *stochastic* productions, chosen per-symbol
   by a seeded Mulberry32 RNG, so one seed reproduces the same garden.
2. `interpret()` — a turtle walks the rewritten string and emits draw ops
   (`seg` branches, `leaf`, `bloom`, `cap`, `big`, `thorn`) in growth
   order. Extended alphabet: `M` = mushroom cap, `U` = big leaf / lily
   pad, `T` = thorn.
3. `makePlant()` / `paintPlant()` — bakes the ops into one `<canvas>` per
   plant and reveals them branch-by-branch over `growMs`, so every prop
   visibly *grows* out of the dirt.

Example grammar (the `tree` spec): axiom `X`, 4–5 iterations,
`X → F[+X][-X]FX` (weighted variants), `F → FF`, angle ≈ 21–35°, step
shrinks 0.55–0.75 per segment, leaf tips appear from depth ≥ 2. Every
species — `bridgehalf`, `logbridge`, `post`, `hangvine`, `stalk`,
`leafumbrella`, `shroombrella`, `lilypad`, `glowshroom`, `torch`, `weed`,
`hometree`, `party`, `sprout`, etc. — is just another spec: axiom +
stochastic rules + iteration count + turtle parameters.

## How the mock uses it

- `buildWorld()` seeds the RNG and scatters ~30 plants across a 2900px
  scrolling world in five zones (glade, drizzle patch, pond, hollow log,
  home garden), staggered so the garden visibly grows in.
- Word reactions call `addPlant(species, x, y, …)` at story-anchored
  spots — bridge halves weave from both lips of the gap, a `hangvine`
  grows *downward* from a leaning `post`, the `stalk` grows then tips
  89° to become a bridge.
- Pip’s flights (`flyPip`) are rAF paths synced to the grown props:
  vine-swing, lily-pad raft drift, duck ride, goldfish leap.
- “Grow a new garden” reseeds the RNG and replants everything — same
  grammar, different garden.

## In the real game

The front end would stay exactly this — a fixed story script drives a
deterministic L-system world. What changes in production: the word tables
become a real lexicon + spelling corrector, prop selection uses authored
grammar bindings per vocabulary word, session/progress state persists,
and audio swaps the WebAudio beeps for real foley. The garden itself is
already genuinely procedural: seed → grammar → turtle → canvas, live.
