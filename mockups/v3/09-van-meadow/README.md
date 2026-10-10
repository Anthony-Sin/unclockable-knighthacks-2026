# 09-van-meadow — Meadowpath

The **painted-world baseline** of the PAINTED wave (`v3/PAINTED.md`). Same
Three Little Pigs game, same LLM loop, same maker → type-a-word →
watch-it-play flow as `07-vanilla` — but the backdrop is one continuous
painted meadow instead of a crayon repaint behind a torn-paper wipe.

## The world

Techniques ported from `mockups/bonfire-backgrounds/emberwood-transitions`
(Highland Path): the only animated state is camera travel; every object
has a stable world coordinate on a wrapping 6144-px ring.

- `WORLD.frame(ctx, cam, t)` repaints the whole world every rAF: per-strip
  sky gradients, sun/moon + glow, soft ellipse clouds at .16 parallax,
  three ridge bands at .34/.62/1.0 along `periodic()` noise lines, painted
  round trees + pines, flowers/undergrowth, and the thick dashed winding
  trail the hero walks on (`WORLD.groundAt` IS that trail line).
- `WORLD.ahead(sceneSeed)` pushes a biome marker at `cam + .45·W`; terrain
  blends into the new palette over ~780 px of world-x via smoothstep —
  warm/cool/dusk/night (07's palettes adapted to paint) plus light biome
  flavor (tree density, pine ratio, rain, fireflies, stars, low sun).
- No torn paper, no worldB: hero advances a fixed STRIDE per accepted
  turn, `cam` eases toward `heroX − .3·W`. Painted terrain has no sketchy
  outlines; props/hero/house keep the SK crayon look.

## The twists (this variant)

- **Draw-on spawn:** every prop rasterizes once, then five wobbly crayon
  scribble bands reveal it stroke-by-stroke (~0.6 s, zigzag direction)
  with a crayon-tip dot at the leading edge — then a settle bounce.
- **Tappable props:** pointer hit-test with generous kid-sized targets;
  a tap does bonk squash + hop + dust puff + name-caption pop, and the
  `✦ pokes` chip in the HUD counts taps.

## Verified

Headless chromium (SwiftShader) against the real TensorMux LLM at :8001 —
see the task report for turn-by-turn numbers. Measured LLM latency:
~2–6 s per beat (remote `glm-4-7-flash`); cam advances ~343 px/turn
(STRIDE), goal climbs to the win overlay, zero console errors.
