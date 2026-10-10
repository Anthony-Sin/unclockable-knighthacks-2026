# Puddlejump — `13-van-puddle`

> **Wave 3 · hop the puddles home** — a PAINTED marsh/river world where
> the hero travels **by hopping tuft to tuft, stone to stone**, built on
> the 07-vanilla plumbing (real LLM turns via `../shared/llm.js`, crayon
> maker → type-a-word → watch-it-play loop).

## The twist

The backdrop is a **continuous painted marsh** in the Emberwood
"transitions" style (`bonfire-backgrounds/emberwood-transitions/app.js`):
soft blue-teal sky, drizzle-grey cloud blobs with a few short animated
falling drizzle strokes, a winding river band that periodically crosses
the trail, cattails / reeds / lilypads, three filled parallax
marsh-green bands, and a palette that **morphs along world-x** — each
`WORLD.ahead(ss)` pushes the next zone's colors just past the right
edge, so the marsh blends marsh → meadow → dusk as the camera travels.
No pan, no torn-paper wipe, one `worldCv` re-painted every rAF.

**Puddles on the trail at stable world-x intervals** — sky-reflection
tint, animated shimmer rings, and stepping targets (tufts/stones)
between them, all derived from world-x so they never drift.

**Playstyle — HOP travel:** every accepted turn the hero covers ground
in a *multi-hop stride* (`heroStride`): visible parabolic arcs sized to
hop distance, squash on each landing, tiny dust puffs on dirt — and a
real **splash with expanding water rings + droplet arcs** when a landing
hits water (`WORLD.isWaterAt`). Landings jiggle nearby props. The hero
never crosses the pig house: travel is capped at the door world-x and
the win run stops on the doorstep.

**Props splash in:** spawns pop out of a nearby puddle (`puddleNear`
rise, `p.wet`) or drop from a drizzle cloud — either way they land with
rings + droplet arcs, then settle into a bob. Props standing in water
float slightly with a lazy marsh tilt. Rideables still trot in, fliers
still hover.

**Build meter:** material words (straw / sticks / bricks) splash in,
then slurp up into a house-build meter in the HUD — a full meter
upgrades the crayon pig house on the trail ahead one stage
(plot → straw → sticks → brick) with a twinkle shower. The wolf's
huff-and-puff still blows a weak house back a stage, so the meter is
honest stakes, not decoration — and the win forces the brick stage for
the payoff.

## World API (PAINTED.md contract)

`WORLD.frame(ctx, cam, t)` · `WORLD.ahead(ss)` · `WORLD.resetZones()` ·
`WORLD.groundAt(wx)` (trail wander — hero feet sample it every frame) ·
`WORLD.camStart()` · `WORLD.drawBuild(ctx, stage, sx, gy, r, opts)` ·
plus marsh helpers `puddleNear / inPuddle / isWaterAt / stepAfter /
riverAtTrail / trailY / LEN / START_WX / aheadPal`. The house plot sits
at `START_WX + round(W·1.35)`; the camera eases toward
`heroWX − 0.30·W` as the only animated world state.

## Verification (headless chromium, real LLM at :8001)

- ≥3 real LLM turns incl. material words: `cam` 13 → 1077 world-px,
  `heroWX` 260 → 1324 (door = `houseWX − 46`), `hops` 0 → 14,
  `splashes` → 23, `jiggles` → 11, goal 0 → 1 → payoff overlay.
- Multi-hop stride seen live (`heroJ` arcs, `hops` counter climbing),
  `inPuddle:true` landings splash, props `wet` and bobbing.
- Meter proof: two material spawns → `buildFill` .5 → 0,
  `buildStage` 0 → 1 (the wolf then honestly blew it back to 0 —
  huff & puff works).
- `watchItPlay` runs a real typed LLM demo; `stopWatch` mid-run froze
  state (`demo:false`, `busy:false`), restored inputs
  (`goBtn`/`blank` enabled, stop hidden), and a manual word played on.
- `node --check` clean on all JS; index + every asset HTTP 200;
  **zero console errors, zero 404s**.
- Measured LLM latency (remote story-brain, this run): "straw" 2.1s ·
  "hop the puddle" 2.3s · "brick house" 2.6s — all labelled
  `live LLM · remote · answered in X.Xs`; ~5–6s wall per turn including
  hop travel + gags.
- Screenshots: `/tmp/shot-13-{maker,world,splash,meter,meter2,house,end,stop}.png`.
