# 03-paperjs — The Three Little Pigs · Paper.js Vector-Morph edition

One of 8 identical-story builds in `v3/`. Same game, different renderer: this one
draws **everything** — sky, hills, wolf, pigs, props, the hero — as live
`paper.Path` / `paper.Group` vector objects inside a Paper.js PaperScope. The
signature trick: things **morph** instead of swapping. The pig house is one pair
of paths whose segment points *and both bezier handles* lerp between straw →
stick → brick specs, so a bulgy haystack visibly melts into a crisp brick
strongbox. The wolf's huff-and-puff is sinusoidal chest/cheek scaling plus wind
streaks that travel via `dashOffset`. Your kid-scribbled hero's raw strokes get
`path.simplify()`-ed into a smooth puppet with pivot-jointed legs.

## What it demos

- **Beat 0, real:** the kid draws a hero on a second Paper.js scope (or hits
  "Surprise me" for an auto-drawn blob monster). Strokes are exported as raw
  segments and rebuilt as a walking vector puppet.
- **Real LLM loop:** every typed word goes through `../shared/llm.js` →
  `/api/chat` (key stays server-side). The reply's `scene_seed` grows a fresh
  terrain **section** (seeded hills, biomes: meadow/forest/river/cave/
  village/rain/storm, palettes incl. dusk & night with stars) parked offstage
  right — then the old stretch slides away while the new one pans in and the
  hero marches through it: every turn is a visible forward journey, never an
  instant repaint. `props[]` then drop in with gravity + a bounce, and gags
  play out: rideable props are ridden (three trotting hops), slippery ones
  drop the hero flat, snacks get eaten, unknown words become labeled doodle
  props.
- **Honest chips:** the mode badge reads `live LLM · remote GLM` (or
  `· local model`) only when `gm._meta.source` says a real call happened; the
  latency chip only quotes `gm._meta.ms` for those calls — offline turns say
  "offline narrator" instead. The freshest storyteller line also mirrors into
  the big `#narrative` strip above the log, and the goal bar eases toward a
  per-turn floor so progress is smooth and mostly monotonic (a comedic-fail
  beat can dip it ~6%).
- **Wolf pressure:** obstacle text mentioning the wolf pumps the huff-o-meter;
  at full he trots in, puffs three breaths, and straw/stick houses flatten —
  then the pigs rebuild *stronger*. Brick survives, and the wolf spins off
  dizzy.
- **Did you mean…?:** the LLM's `did_you_mean`, else a local edit-distance
  guess against the story vocab.
- **Watch it play:** auto-draws a hero and types a scripted word list through
  the *real* model — never canned — with the latency chip on every call and a
  Stop button. `window.watchItPlay()` / `window.stopWatch()` are exposed for
  the v3 dashboard, and `#watch` in the URL auto-starts it.
- **Guardrail honored:** `llm.waitForHeadroom(4)` runs before the demo batch;
  calls are strictly sequential. If the model is unreachable the shared client
  falls back to the offline mini-GM and the "demo mode" badge shows.

## Run

```
cd mockups && python3 v3/server.py     # then open
http://localhost:8001/v3/03-paperjs/
```

## Engine

**Paper.js v0.12.18** — "The Swiss Army Knife of Vector Graphics Scripting",
paperjs.org, MIT license (Jürg Lehni & Jonathan Puckey). Vendored at
`vendor/paper-full.js`. Three `PaperScope`s are used: the world stage, the
hero-drawing pad, and the header squiggle — each owns its own project/view so
scenes, maker, and chrome animate independently on `view.onFrame`.

Gotcha worth noting: this Paper.js build defaults `applyMatrix: true`, which
*bakes* group transforms (position/rotation/scaling) into child segment
coordinates — and it permanently collapsed animated puppets (spring-pop
animations shrank every path to a point). `world.js` sets
`W.settings.applyMatrix = false` so transforms stay as live item matrices —
that's what makes ride/slip/walk animation safe.

## Observed /api/chat latency

Measured during this build's own verification (model `glm-4-7-flash` via the
local proxy, `reasoning_effort:"none"`):

- Direct `/api/chat` probes: **723 ms, 831 ms, 2269 ms, 2623 ms**
- In-page "Watch it play" runs: every call `remote`, chip showed
  **"GLM answered in 1.9–3.4 s"** — a full 7–8 word journey runs in ~60–70 s
  including typing and gags
- `/api/stats` history across sessions: ~1.7–3.7 s

**Typical: ~0.7–3.7 s per turn, around ~2 s most calls.** First calls after an
idle stretch trend slower (cold upstream). The game hides the wait behind the
prop-spawn gag animations, so turns still feel snappy.

## How the real version scales

The morph kit generalizes: any object built from fixed-topology paths (same
segment count, matching order) can tween between hand-authored specs, so a real
product would ship libraries of morphable props — houses, vehicles, costumes,
whole background sets — keyed by the LLM's prop kinds. Paper.js scopes are
cheap, so more canvases (sticker book, drag-and-drop prop shelf, per-pig
close-ups) slot in without a framework. On the model side, latency is the
binding constraint: the real version would stream the narrative token-by-token
for instant feedback while the heavier `scene_seed` resolves, pre-warm the
endpoint between turns, and cache common beats so replays are instant.
Procedural scenes are already deterministic per seed, so a session can be
replayable/shareable by storing only the word list — the world regrows itself.
