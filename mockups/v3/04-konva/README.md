# 04-konva — The Three Little Pigs · Konva Scene-Graph edition

One of 8 identical-story builds in `v3/`. Same game, different renderer: here
**every doodle is a live scene-graph node**. The kid's crayon strokes become
real `Konva.Line` nodes in a mini maker stage, then get replayed as the hero
`Konva.Group` on the big `Konva.Stage` — which walks, rides, slips, wears
props as hats, and squeezes through the brick-house door. Hover any prop and
a `Konva.Label` name chip pops out of the graph: everything is a node, and
nodes do everything.

## What it demos

- **Two Konva.Stage instances.** The world stage is a real side-scroller:
  `worldLayer` holds one `cam` group (`x = -camX`) that carries the whole
  journey in world coordinates — `scenesG` (one section group per accepted
  turn), `buildG` (the house under construction, riding the frontier),
  `propsG`, `actorsG` (wolf, hero, pig followers), `fxW` (world-space puffs
  and wind) — plus a screen-space `fxLayer` for name chips and stage shakes.
  The maker stage is a second `Konva.Stage` with a ruled-paper layer and a
  stroke layer.
- **A forward-moving journey, not a repaint.** Every accepted turn calls
  `addSection(scene_seed)` — `WORLD.render` sketches the *next* stretch one
  stage-width past the frontier (`worldW += W`), the hero eases forward into
  it, and the camera pans the whole world left. The camera chases the hero's
  *rendered* `heroG.x` (not the destination), so the hero can never slide
  off-frame mid-walk; stretches far behind are culled (`sections.length ≤ 3`)
  to keep the node budget flat.
- **Beat 0, real:** kid draws on the maker stage via pointer strokes
  (6 crayon swatches, clear, tap-a-dot counts). "Surprise me" programmatically
  draws a blob monster through the same stroke pipeline. Done → strokes are
  normalized, replayed as hero `Konva.Line`s (feet pinned to y=0), and the
  dominant crayon color becomes the hero's description sent to the LLM.
- **Real LLM loop:** every typed word → `../shared/llm.js` → `/api/chat`
  (the API key stays server-side in `v3/server.py` — the page only ever sees
  the proxy). Each turn calls `llm.waitForHeadroom(4)` first; calls are
  strictly sequential, and a word typed mid-animation queues. The reply's
  `scene_seed` becomes the next world section (biome/palette/seeded hills and
  scenery props all change). `props[]` physically spawn through
  `PROPS.build(kind, seed)` in world coordinates — normal props drop from
  above and settle with a bounce, fliers swoop in and bob, heavies park
  overhead then thud — and hover-reveal their names.
- **Slapstick on real nodes:** rideable props (unicorn, horse, fish…) slide
  under the hero and gallop a step; silly props (banana peel, slime, or
  *anything* the GM marks `success:false`) skid underfoot → dizzy-star slip
  and a dust-off; heavy props (anvil, fridge, toaster…) bonk from the sky and
  squash the hero; snacks fly into the hero's mouth; a sock literally
  re-parents (`moveTo`) into the hero group as a traveling hat; pig props
  become `actorLayer` followers that trail the hero. Silly words that spawn
  nothing make the hero trip on thin air.
- **House arc:** material props (straw/sticks/bricks/…house) scoot to the
  build plot — which sits ~80% into the newest stretch so the hero walks
  *toward* it — and raise the build tier straw → stick → brick. Wolf pressure
  climbs on wolf-y narrative/obstacles; past ~92% he huffs and PUFFS — wind
  puffs streak across the world FX group, the whole stage shoves sideways,
  weak houses scatter their child nodes and rebuild one tier weaker, the
  brick house shakes but never budges, and the wolf needs a breather.
- **Goal bar:** the story's `goal_progress` animates smoothly and is
  mostly-monotonic — floored at distance walked (each accepted turn is one
  world section genuinely traveled, so word 8 ≈ 92%, word 9 ≈ arrival);
  the only dips are explicit fail beats when the huff wrecks a weak house.
- **Did you mean…?:** the LLM's `did_you_mean` first, else a local
  Levenshtein guess against the story vocabulary; the chip is clickable.
- **Watch it play:** auto-paints a surprise hero, then types a scripted word
  list (8 core + 8 closer beats) through the **real** model — every beat is
  a genuine `/api/chat` call with the latency chip updating, and the show
  ends on the win overlay. A Stop button halts mid-turn, mid-LLM-wait, or
  mid-animation via epoch cancellation and hands inputs back.
  `window.watchItPlay()` / `window.stopWatch()` are exposed for the v3
  dashboard, and `#watch` in the URL auto-starts the show.
- **Resilience:** if `/api/chat` hiccups, `shared/llm.js` falls back to its
  offline mini-GM — the page labels it **"demo mode · offline narrator"** —
  then recovers on the next turn (observed live during verification).

## Run

```bash
cd mockups && python3 v3/server.py     # then open
http://localhost:8001/v3/04-konva/
```

## Engine

**Konva 9.3.16** — Konva — konvajs.org — MIT license, vendored at
`vendor/konva.min.js`. The scene graph itself is the demo: pointer hit-tests
walk ancestors via `getAttr('prop')`, gags tween node attrs
(`Konva.Tween`), the idle "boil" re-jitters every hero stroke's points inside
a `Konva.Animation` frame hook, and even the fog of a gag is just more nodes.

## Observed /api/chat latency

Measured during this build's own "Watch it play" verification run
(`glm-4-7-flash` via the local proxy, `reasoning_effort:"none"`):

- **Final verification run (9 real turns → win overlay):** 2254, 2468, 2478,
  2219, 2111, 2333, 2045, 1984, 2098 ms — **avg ≈ 2.2 s, range 2.0–2.5 s**
- Earlier runs in this build: 11–12 turns, avg ≈ 2.3–3.0 s, range 1.9–4.5 s
  (a 4.4 s outlier appeared once; `/api/stats` windows mix other variants'
  traffic, so in-page `window.__lat` is the honest source).
- One mid-run call failed server-side → the offline mini-GM answered instead
  (chip showed "demo mode · offline narrator"); the next call was back on GLM.

**Typical: ~2–3 s per turn.** Each turn's wait hides behind the typing
animation and the prop-spawn tween, so the stage never sits still.

## How the real version scales

Konva's node model is already the product shape: props, actors and effects
are independently addressable, so a real game would ship prop *libraries*
(with gag metadata attached at build time), layer-aware accessibility
(every node already carries `name`/`kind`), and dirty-rect rendering plus
layer caching (`layer.cache()`) for dense scenes — the engine has both built
in. Node pooling would replace the current destroy/rebuild churn, and the
per-frame "boil" would batch via `batchDraw`. Story-side: stream the
narrative tokens for instant feedback while `scene_seed` resolves, pre-warm
the endpoint between turns, and cache frequent beats — the world is fully
deterministic per seed, so storing just the word list makes any session
replayable. The maker stage generalizes to sticker-books or shape-recognition
("draw a door — anywhere") without new infrastructure: it's all nodes.
