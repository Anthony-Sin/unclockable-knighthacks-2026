# PAINTED — the vanilla-world variant contract

Six siblings of `07-vanilla`. Same game (Three Little Pigs), same LLM loop,
same maker → type-a-word → watch-it-play flow. What changes: **the backdrop
becomes a continuous painted world** (Emberwood "Highland Path" style —
`mockups/bonfire-backgrounds/emberwood-transitions/app.js`) instead of a
crayon repaint behind a torn-paper wipe, and each variant gets one distinct
spawn/playstyle twist.

## The look — painted world, crayon characters

**PAINTED (soft, layered, fills — Highland Path):**
- sky gradient + sun + soft elliptical cloud puffs
- 3 parallax ridge/hill bands (far .34, mid .62, near 1.0) — filled
  polygons along `periodic()` noise ridge lines, NOT sketchy outlines
- clustered painted trees (pine triangles / round canopy blobs), rocks,
  undergrowth strokes, flowers
- a thick winding dashed trail the hero walks on
- palette **cross-blends along world-x** toward the next biome

**CRAYON (SK sketch helpers — keep exactly as in 07-vanilla):**
- the kid-drawn hero, ALL gameplay props (unicorn, banana peel, anvil,
  houses, wolf, doodad fallbacks), the growing pig house, fx puffs,
  captions. Animals and houses keep the hand-drawn sticker look — that's
  the converged style: painted world + sticker actors.

## The transition — travel morphs, never wipes

Highland Path rule: *the only animated state is camera travel; every object
has a stable world coordinate.*

- Continuous world space, e.g. `WORLD_LEN = 3840` px wrapping
  (`wrap(x)` / `visibleX(worldX,cam,depth)` from emberwood).
- `WORLD.frame(ctx, cam, time)` renders the painted world at camera `cam`
  **every rAF** — hills, clouds, trees are live functions of world-x, so
  the camera sliding forward IS the transition.
- When a new `scene_seed` arrives, call `WORLD.ahead(ss)`: the world
  *ahead* takes the new palette/biome. Blend factor =
  `smoothstep((worldX - blendStart) / BLEND)` so terrain literally morphs
  into the next biome as the hero travels — no cut, no slide-in canvas.
- Hero worldX advances a fixed stride per accepted turn; `cam` eases
  toward `heroWorldX - screenAnchor`. Remove the worldA/worldB
  torn-paper pan entirely (keep ONE world canvas + play canvas).
- The user's complaint was the old background "can't be drawn" / feels
  static. Painted layers fix that: everything is alive under the camera.

## World API (world.js must export)

```js
window.WORLD = {
  frame(ctx, cam, time),          // painted world at camera, call every rAF
  ahead(sceneSeed),               // morph the road ahead toward this biome/palette
  groundAt(worldX),               // painted ground line Y at a world x
  drawBuild(ctx, stage, x, y, r), // crayon pig house — port from 07 unchanged
  camStart(),                     // initial cam so hero sits left-third
};
```

`groundAt` may vary ±6px along the trail (gentle rise/fall) — hero and
props must sample it each frame so feet stay planted on the painted path.

## Unchanged plumbing (copy from 07-vanilla, fix only what's needed)

- `../shared/llm.js` — the ONLY LLM path; sequential calls,
  `waitForHeadroom`, `_meta` latency.
- Beat-0 hero maker, HUD (goal + wolf meters), narrative card, choices,
  `did_you_mean`, coach lines, end overlay, Stop button.
- `props.js` + `sketch.js` — resolveKind, doodad fallback, SK strokes.
  Unknown words still spawn a labeled doodle.
- Honest labels: `live LLM` + real ms vs `demo mode · offline narrator`.
- `window.watchItPlay` / `window.stopWatch` exports; `#watch` hash.
- Input queue (one-deep), epoch guards, `node --check` clean, all assets
  relative + HTTP 200 at `http://localhost:8001/v3/<dir>/`.
- Zero console errors, zero 404s. README.md with the twist documented and
  a measured-latency line.

## The six twists

| dir | name | world | spawn | playstyle twist |
|---|---|---|---|---|
| `09-van-meadow`  | Meadowpath   | painted meadow (baseline) | prop strokes draw themselves on | tappable props — click one, it reacts (bonk/hop/puff) |
| `10-van-paintbox`| Painty Road  | world **draws itself on** stroke-by-stroke just ahead | crayon scribble-in | word paints a label ribbon, then prop pops |
| `11-van-breeze`  | Breezefield  | painted windy meadow, everything sways/drifts | props drift in on wind | gusts: "blow"/button shoves light props; wolf puffs scatter them |
| `12-van-lantern` | Lantern Trail| painted dusk, light pools, fireflies | fireflies carry prop in, it lights up | shadow-guess: prop arrives dim; naming it lights it + streak bonus |
| `13-van-puddle`  | Puddlejump   | painted marsh/river, drizzle, cattails | splash-in with rings | hero hops tuft-to-tuft; materials visibly fill a house-build meter |
| `14-van-highland`| Highland Trek| faithful Highland Path: peaks, snowline, rocks | props tumble/roll downhill to hero | rolling props: round ones roll, heavy ones thud; catch/collect for build |

Each variant: same HUD/maker/cards chrome — the page title, eyebrow chip,
and accent color should make the twist obvious. Keep it playful, no emojis.

## Verification bar (headless chromium, real LLM at :8001)

- 3+ real turns or a watch run: forward travel visible (cam advances),
  world morphs into next biome WITHOUT a wipe, prop spawns per variant
  style, hero grounded on `groundAt`, goal climbs to payoff, end overlay.
- Stop mid-run freezes + restores inputs. Watch-play completes a run.
- `node --check` on every .js; every asset 200; zero console/page errors.
- Screenshots proving: maker, painted world w/ hero, mid-travel morph,
  variant's signature moment (gust/splash/light/draw-on/roll), end.
