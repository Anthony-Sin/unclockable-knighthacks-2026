# 12-van-lantern — **Lantern Trail**

Wave 3 painted-world variant of `07-vanilla` (see `../PAINTED.md`).
Same game (The Three Little Pigs), same maker → type-a-word → watch-it-play
flow, same real `../shared/llm.js` story-brain. Zero libraries.

## The world — painted dusk, alive under the camera

`world.js` is a continuous **dusk world** rendered live every rAF at camera
`cam` (Emberwood "Lanternward" port):

- deep teal-purple sky gradient with ~early twinkling stars and a warm sun
  setting low on the horizon
- 3 parallax ridge bands (depths .30 / .58 / 1.0) as filled silhouette
  polygons over `periodic()` noise ridge lines — no sketch outlines on terrain
- pine / round-canopy tree silhouettes, undergrowth strokes, drifting
  dark-dusk cloud puffs, optional low mist
- **lantern posts every 360 world-x**: post + lamp house + radial-gradient
  halo + a warm light pool squashed onto the trail (emberwood `lanterns()`),
  with a two-sine flicker
- **~40 fireflies** world-anchored (depth .9), sine-wander positions and
  time-pulsed alpha with tiny radial glows

`WORLD.ahead(sceneSeed)` never wipes: palette words map into the **dusk
family** (warm→ember, dusk→violet, cool→teal, night→night) and biome words
map to mood params (tree density, pine ratio, mist, lantern density, stars).
Both cross-blend along world-x via `smoothstep((worldX − blendStart)/BLEND)`,
so the light color and mood literally shift up the road as the hero travels.
`WORLD.groundAt(wx)` is the painted trail line (±9 px of rise/fall) — hero,
props, wolf and lantern posts all sample it. World space is infinite ahead;
geometry seed stays fixed (707) so only *light* morphs.

API: `frame(ctx, cam, time)` · `ahead(ss)` · `groundAt(wx)` ·
`drawBuild(ctx, stage, x, y, r, opts)` (crayon house, unchanged from 07) ·
`camStart()` · `resize(W,H)` · `reset(ss)` · `info()`.

## The twist — **name it to light it**

- **Spawn**: a team of ~6 fireflies spirals in from ahead-right hauling each
  crayon prop on a glowing sling, sets it down on the trail, and scatters.
  The prop arrives **DIM** — a ~35%-alpha shadow over a faint ember pool,
  captioned only `name it!`.
- **Play**: type the shadow's name → it **lights**: full color + a warm glow
  ring + a 5-sparkle burst, and *then* its gag plays (peel slips, mount
  trots over, materials build, wolf peeks…). Naming works even while a prop
  is still on the sling — it lights the moment it lands.
- **Tap a shadow** → the fireflies whisper its name (coach hint) and the
  shadow flickers brighter for a moment.
- **Near-misses** (typo within lev ≤ 2 of a shadow's word) pop `did_you_mean`
  and break the streak. The HUD counts **"lit ×N"** — shadows lit in a row.
  The recap card reports total lit + best streak; the win overlay **glows**.

Words still drive the story: naming a shadow is also your story word for
that turn, so every typed word both lights the world and asks the LLM
"what next?".

## Plumbing (unchanged from contract)

`../shared/llm.js` only, sequential turns, `waitForHeadroom`, `_meta` latency
chips (`live LLM · remote · answered in Ns` vs `demo mode · canned narrator`),
one-deep input queue, epoch guards, `watchItPlay`/`stopWatch`, Stop button,
goal→payoff end overlay. Pan/worldB/torn-paper wipe removed — ONE world
canvas + ONE play canvas; `cam` eases toward `heroWX − 0.30·W` and only
moves forward.

## Measured

- Serve: `python3 ../server.py` → `http://localhost:8001/v3/12-van-lantern/`
- Live LLM (remote): 2.0–3.0 s/turn measured headless (chromium + swiftshader);
  a direct `/api/chat` ping answered in ~0.7 s
- `node --check` clean on app.js / world.js / props.js / sketch.js
- Verified headless (chromium + swiftshader): firefly carry-in, dim→lit
  naming, streak chip, tap hint, cam advancing, goal climb, win glow.
  Zero console errors.
