# 06-zdog — The Three Little Pigs · Zdog Diorama edition

The same v3 game — draw a hero, type a word, a **real LLM game master**
re-renders the world — but the world is a **toy diorama on a lazy susan**.

## What it demos

- **A spinning wooden puck as the stage.** A fat Zdog `Cylinder` is the
  platform; every `scene_seed` from the LLM re-grows its grass skin, pebble
  rim, winding dotted path and biome scatter (meadow trees & flowers,
  forest pines, rain puddles + falling drops, a river with reeds and a
  boat, cave boulders & torches, village cottages, storm clouds +
  lightning). Palettes (`warm|cool|dusk|night`) repaint both the puck and
  the CSS sky behind it.
- **Forward travel, lazy-susan style.** A diorama can't pan, so the puck
  *is* the wipe: every accepted turn spins the susan a stretch forward
  (~110°) while the standee walks in place and glides ahead along the
  front. Old scenery shrinks away as it sweeps past, the swap happens at
  peak spin speed, and the freshly-seeded biome pops up around the ring
  ahead of the hero — every beat reads as the NEXT stretch of the journey.
- **Typed words drop in as chunky 3D props.** ~45 seeded models built from
  Zdog primitives — `Box` houses, `Cone` roofs, `Hemisphere` haystacks and
  rocks, fat-stroke `Shape` balls for bodies — that fall from above the
  table, settle on the disc with a little bounce, and keep riding the
  turntable. Unknown words become a mystery **doodad with a paper name
  tag** that follows the prop and hides on the back hemisphere — never
  silently skipped. `action: "react"` props do an excited hop.
- **The kid-drawn hero is a paper standee.** Beat-0 crayon strokes become
  fat Zdog `Shape` paths glued onto a rounded card on a popsicle stick.
  It drops in with a bounce, **swivels to face the camera**
  (counter-rotated against the orbit) with feet clamped to the disc,
  walk-bobs through every travel beat, mounts rideables, and on silly
  beats does a full **spin-splat**: a whole turn on its stick, a
  squash-and-stretch splat, orbiting dizzy stars, then two dust-off hops.
- **The wolf lurks at the table's edge** and slides closer as the
  pressure meter fills; his huff *rattles the whole diorama* (a decaying
  camera shake) **and blows the little models** — props get shoved and
  wobble, the standee leans in the gust. Reach `goal_progress` 1.0 →
  brick-house payoff overlay.
- **"Watch it play"** types the scripted word list through the **real**
  LLM (live latency chip per call, Stop button, `window.watchItPlay` /
  `window.stopWatch` for the dashboard). Offline → labeled "demo mode".
  Typing mid-transition queues the word instead of dropping it.
- `?watch=1` URL param auto-starts the show (handy for embedding/tests).

## How to run

```bash
cd mockups && python3 v3/server.py     # serves http://localhost:8001
# open http://localhost:8001/v3/06-zdog/
```

Everything is static files + the shared `/api/chat` proxy; the API key
stays server-side. `llm.waitForHeadroom(4)` is awaited before every turn
and calls are strictly sequential.

## Engine

**Zdog v1.1.3** by David DeSandro / Metafizzy — <https://zzz.dog> (MIT,
vendored at `vendor/zdog.dist.min.js`). A round pseudo-3D engine: flat
shapes are rotated in 3D space and painter-sorted onto a 2D canvas. No
lights, no meshes — the chunky shading is painted per-face, which is why
it looks like a wooden toy set. `dragRotate` is enabled: you can grab the
diorama and peek around it (tilt is clamped so you can't flip the table).

## Observed `/api/chat` latency

Measured during real `?watch=1` runs (glm-4-7-flash via TensorMux,
10 Oct 2026, ~9.5 GB free RAM):

| run | per-turn ms |
|---|---|
| watch-it-play #1 (7 turns) | 2131, 2194, 2214, 2230, 2310, 2477, 2708 |
| watch-it-play #2 (7 turns) | 2197, 2241, 2338, 2460, 3412, 3590, 7187 |
| polish run #3 (7 turns) | 2191, 2914, 2505, 2325, 2261, 2169 + 1 offline hiccup |
| polish run #4 (8 turns) | 2238, 1989, 2410, 2292, 1874, 2053, 2426, 3060 |
| polish run #5 (8 turns → goal 1.0) | 2266, 2364, 2190, 2113, 2223, 2942, 3084, 2370 |
| trivial curl ping | 663 |

**Typical: ~1.9–3.1 s per story beat** (occasional 3.5–7 s stragglers);
the latency chip shows each one live, and a rare proxy hiccup falls back
to the canned mini-GM labeled "demo mode" before recovering next turn.
Offline fallback answers in ~0 ms.

## How the real version scales

The renderer is deliberately toy-sized: a couple of hundred `Shape`s on a
single canvas, zero GPU work, and the only per-frame math is painter-sort
+ transform — it would happily run on a classroom Chromebook for years of
beads-on-a-string turns. Where it scales is *content*: prop builders are
pure `kind → seeded model` functions, so the shipped catalog (45 kinds)
can grow to hundreds without touching the loop; `scene_seed` can carry
more biome params (weather, time-of-day, crowd props) since rebuilding is
just re-running seeded builders; and the LLM contract already streams
emergent obstacles/choices, so the real product's work is prompt design
and a bigger prop library — not engine throughput. For heavier scenes the
natural next steps are object pooling per prop kind, culling props on the
back hemisphere, and swapping canvas for the `SvgRenderer` when you need
crisp print-quality stills of a kid's finished diorama.
