# Pip & the Painty Road — v3 · 10-van-paintbox

**Wave 3 · the world draws itself as you walk.** The Three Little Pigs story,
same plumbing as `07-vanilla` (real sequential LLM turns through
`../shared/llm.js`, headroom checks, `_meta` latency chip, hero maker, HUD,
choices, did-you-mean, coach lines, watch-it-play + stop, one-deep input
queue, epoch guards) — but the stage is a single endless painted road.

## The twist

- **One continuous world.** No `worldA`/`worldB`, no torn-paper wipe. One
  `worldCv` repaints every rAF at camera `S.cam`; the camera just keeps
  easing forward forever.
- **The draw-on frontier IS the transition.** A wobbly wet paint edge rides
  ~250px ahead of the hero. Ridges stroke themselves on via a `setLineDash`
  reveal, clouds pop in blob-by-blob, trees grow trunk-then-canopy, flowers
  pop petal-by-petal, and the trail's stitched dashes paint forward a beat
  behind the edge. A little dipped paintbrush rides the seam.
- **Pencil ghosts.** Past the frontier the un-drawn country waits as ~15%
  alpha dashed-pencil silhouettes, so kids can see what's about to be
  painted.
- **Biome morphing.** `WORLD.ahead(scene_seed)` drops a palette/biome "stop"
  just past the wet edge; palettes and feature weights cross-blend along
  world-x, so the world melts from meadow into forest/river/storm/dusk
  without any cut.
- **Props scribble in.** Every spawned prop renders to an offscreen sprite +
  silhouette mask; ~0.6s of randomized crayon zigzag strokes pile on and are
  clipped by the mask, then the prop settles with an `easeOutBack` bounce.
- **Word ribbons.** Every submitted word (player-typed or watch-play)
  brushes a colored swash across the sky while the letters reveal under it
  like handwriting, nib riding the tip — the prop pops in only after the
  ribbon lands.

## Contract API (`world.js`)

`frame(ctx, cam, time)` · `ahead(sceneSeed)` · `groundAt(worldX)` ·
`drawBuild(ctx, stage, x, y, r, opts)` · `camStart(w)` · `resize(w,h)` ·
`reset(wx0)` · `paintAhead(wx)` · `probe()`.

## Latency (measured on this machine)

Headless run: three live LLM turns (remote GLM endpoint) answered in
~0.7–1.2s each; full watch-play journey to the brick house completes in
under ~2min including walk/paint pacing.

## Verify

```
cd .. && python3 server.py 8001 &          # serves the v3 tree
open http://localhost:8001/v3/10-van-paintbox/
```
