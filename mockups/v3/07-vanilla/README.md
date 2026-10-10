# 07-vanilla — the ZERO-DEPENDENCY baseline

**"The Three Little Pigs" — no engine, no vendor file, no library at all.**
This is the control group every other Wave-3 variant is measured against:
one `<canvas>`, one hand-rolled scribbler (~200 lines), and the same real
LLM game master as everyone else.

## What it demos

- **Hand-rolled sketch rendering.** `sketch.js` is the whole "engine":
  a seeded `mulberry32` PRNG plus stroke helpers that draw every line as
  **2–3 slightly-offset quadratic-curve passes** (each pass re-jitters the
  points and reconnects them through midpoints) — the crayon-wobble look,
  with zero library code. Squiggle-hatch fills are clipped jittered
  diagonals. Same seed → same wobble, every frame.
- **Seeded procedural world.** `world.js` turns the LLM's `scene_seed`
  `{biome, seed, palette, props[]}` into a backdrop (sky, sun/moon, hills,
  grass, dashed walking path + biome scatter for meadow/forest/river/
  village/storm/rain/dusk/cave/snow). It renders into an offscreen canvas
  and is revealed with a **torn-paper scroll pan** — the new stretch of
  world slides in from the right behind a jagged `clip-path` edge while
  the old stretch (and its loose props) slides away left. The hero
  visibly walks to each new beat during the pan; the world never
  repaints in place.
- **Labeled prop library.** `props.js` hand-draws ~45 kinds (the three
  houses, material piles, wolf, pig, unicorn, dragon, banana peel,
  toaster, fridge, slime…) and a **generic question-blob doodle** that
  hand-letters whatever word the LLM emits — so *any* word still makes
  sense on stage. Every prop gets a hand-lettered caption.
- **Beat 0 hero maker.** Kid scribbles on a crayon pad; each stroke is
  replayed through the same wobbler, cropped, and becomes the hero that
  walks/rides/slips/spins through the story. "Surprise me" paints a
  parametric blob-monster stroke-by-stroke.
- **Live play layer.** A second canvas redraws at 60fps with grounded
  physics — the hero's feet stay on the path except during hops/slips
  (gravity + landing squash + dust), ride props trot in and the hero
  mount-hops on, banana peels skid/spin/splat/dust-off, heavy props drop,
  bounce once and thud the whole stage, fliers hover, worn gear follows
  the hero's head. The wolf creeps in with the meter and huffs
  puff-clouds that shake all three layers at weak houses.
- **Forward travel every turn.** Each accepted word moves the goal
  bar monotonically-ish (success ≥ +0.03, fails dip ≤ 0.05), sets the
  hero's furthest destination so far, pans the new scene in, and the
  hero walks/runs to it — never teleports. Words typed while busy are
  queued (one-deep) so nothing is swallowed mid-transition. Reaching
  ~90% of the trail runs the hero to the brick house and pops the
  payoff overlay.
- **Real LLM loop** through `../shared/llm.js` → `/api/chat` (key stays
  server-side): typed word → narrative + obstacles + `scene_seed` +
  physical prop spawns + `did_you_mean` (plus a local edit-distance guess
  when null) + goal/wolf meters + choices. Silly words slapstick-fail and
  recover; kid-safe throughout.
- **"Watch it play"** types a scripted word list through the **real** LLM
  with a live latency chip and a visible Stop button (`window.watchItPlay`
  / `window.stopWatch` exposed for the v3 dashboard). The latency chip is
  honest per call: `live LLM · remote/local` for real answers with real
  timings, `demo mode · canned narrator` only when the offline fallback
  narrated (with `ms: 0`, never faked). Test hooks `window.__test(kind,
  xFrac)` and `window.__probe()` exist for headless verification.

## Run it

```bash
cd mockups && python3 v3/server.py
# open http://localhost:8001/v3/07-vanilla/
```

`llm.waitForHeadroom(4)` gates the scripted demo run; LLM calls are
always sequential (one busy-turn at a time).

## Engine

**None — that is the point.** The only scripts are `sketch.js`,
`props.js`, `world.js`, `app.js` (all hand-rolled, this folder) plus the
shared `../shared/llm.js` client. No `vendor/` directory exists at all;
the wobbler stands in for Rough.js-style sketching with plain Canvas 2D.

## Observed `/api/chat` latency

Measured live during a real "Watch it play" run (TensorMux
`glm-4-7-flash`, `reasoning_effort: "none"`):

**~2.0–3.5 s per turn, typical ≈ 2.4–2.6 s** (calls observed:
2.0, 2.3, 2.5, 2.6, 2.9, 3.5 s). World re-render + prop spawn adds only a
few ms on top — the network round-trip is the whole wait.

## `?mode=local` — zero-dep fallback paths

- **Local model:** open `…/07-vanilla/?mode=local` and the page builds
  `new StoryLLM({mode:'local'})`, so `/api/chat?mode=local` forwards to a
  local ollama (`LOCAL_BASE`, default `http://localhost:11434`, model
  `LOCAL_MODEL` default `qwen2.5:3b`) instead of the remote TensorMux
  model. Handy when the hackathon wifi dies.
- **Total offline:** if neither remote nor local answers, the shared
  client's canned mini-GM fills in and the page labels it
  **"demo mode"** on the latency chip — the demo can never hard-fail.
  Since this variant ships zero vendor files, there is literally nothing
  else that can break.

## How the real version scales

The mockup keeps one canvas at ~60fps re-sketching a few hundred strokes —
trivial for any laptop. The real game would: (1) pre-rasterize each prop
doodle to a small offscreen bitmap per seed instead of re-stroking per
frame (props then cost `drawImage` only), (2) keep the seeded wobbler —
determinism means server + client render identical scenes from the same
`scene_seed`, so the adaptive tutor can diff/checkpoint worlds by seed
alone, (3) stream the LLM turn while pre-rendering the wipe, hiding most
of the ~2.5 s behind the reveal animation, and (4) reuse this same
contract to swap renderers — which is exactly what the other seven v3
folders prove.
