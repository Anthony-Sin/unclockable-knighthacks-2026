# Breezefield — `11-van-breeze`

> **Wave 3 · a windy meadow that listens** — a PAINTED world where
> everything is alive with wind, built on the 07-vanilla plumbing
> (real LLM turns via `../shared/llm.js`, crayon maker → type-a-word →
> watch-it-play loop).

## The twist

The backdrop is a **continuous painted meadow** in the Emberwood
"Highland Path" style (`bonfire-backgrounds/emberwood-transitions/app.js`):
periodic-noise ridge lines as filled bands at 3 parallax depths
(.34 / .62 / 1.0), a looping `LEN = 3840` world (`wrap`/`visibleX`),
and a palette that **blends along world-x** — each `WORLD.ahead(ss)`
pushes a morph boundary just past the right edge, so the terrain
literally morphs into the next biome as the camera travels. No pan,
no wipe, one world canvas re-painted every rAF.

**Everything is alive with wind:**

- clouds drift continuously on a time-offset path (not camera-fixed),
- grass blades lean with traveling sine gust waves (`leanAt(wx, t)`),
- flower heads nod, stems bend, tree canopies sway,
- ~20 ambient drifters (petals / dandelion fluff / leaves) sail across
  the sky on wind paths and wrap at the edges,
- wind has a slowly-varying direction + strength; village chimney smoke
  slants with it.

**Spawn style:** props *drift in on the wind* — rideables glide in on a
leaf parachute or tumbleweed-roll in along the ground, mid-weight props
roll, light props parachute, and heavies the wind can't carry just drop
in with a thud. Everything settles with a bounce; light props keep
bobbing on the breeze after landing. Building materials get *hauled off
to the house plot* by the wind.

**Playstyle — GUST play:** typing `blow` / `gust` / `wind` / `whoosh`
(or the **Gust!** button next to Go) fires a real gust across the stage:
props get a physical shove scaled by `mass` (feather 0.16 < straw 0.42 <
anvil 1.7 — the anvil barely scoots, that's the joke), light props
slide + tumble with friction, petals burst, grass flattens then
recovers, and the hero braces into the wind. The wolf's huff is a real
gust too — it *physically scatters* props. The gust word still goes to
the LLM, so the story reacts to your wind.

## World API (PAINTED.md contract)

`WORLD.frame(ctx, cam, t)` · `WORLD.ahead(ss)` · `WORLD.reset(ss)` ·
`WORLD.groundAt(wx)` (±6 px trail wander — hero & props sample it every
frame) · `WORLD.camStart()` · `WORLD.blow(power, dir)` ·
`WORLD.wind() → {dir, str, gust}` · `WORLD.drawBuild(...)` (crayon pig
house, unchanged). The brick-house plot sits at fixed world-x 3160 — the
payoff reveals itself on the horizon as the hero travels.

## Verification (headless chromium, real LLM at :8001)

- 3+ real LLM turns: `cam` advances (~340 world px/turn), the meadow
  morphs ahead into the next biome, props drift in, goal climbs to the
  payoff + overlay.
- Typed `blow` fires a real gust: a feather-mass prop's world-x visibly
  changes; the wolf huff scatters props; hero stays planted on
  `groundAt`.
- `node --check` clean on all JS, every asset HTTP 200, zero console
  errors, zero 404s.
- Measured LLM latency (run 2026-…, remote story-brain): "gather straw"
  2.0s · "blow" 3.1s · "walk the path" 2.1s · "run to the brick house"
  2.2s — all labelled `live LLM · remote · answered in X.Xs`.
- Gust physics measured: feather +402 world-px, straw pile +352,
  anvil +3 (mass 0.16 / 0.42 / 1.7); wolf huff scattered props ~330px.
  Camera travelled `-7 → 2833` world-px; payoff overlay at goal 0.9.
