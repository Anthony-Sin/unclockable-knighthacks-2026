# The Three Little Pigs — PixiJS WebGL edition

**"Every crayon doodle becomes a GPU sprite."** This build runs the shared
v3 story game inside **PixiJS v8** (WebGL). It now plays like a journey,
not a slideshow: each accepted turn bakes the LLM-written `scene_seed` onto
the **right end of a world strip** (`world.js` + rough.js → `PIXI.Texture`),
then the whole strip **pans left into the new page** while your hero walks —
you always travel *forward* into the next stretch. Pages and their props are
culled once they scroll off the left edge, so the trip is endless.

The hero the kid draws on the crayon canvas becomes a sprite with real
gravity (`lift`/`vy` in the ticker — feet on the ground except deliberate
hops and slips). It walks with a bob, rides unicorns (the mount pins under
the hero while the strip moves), wears hats, slips on banana peels with a
spin + orbiting dizzy stars + recovery, and gets bonked by falling anvils.
Props spawn on the incoming page in world coordinates and spring/pop in;
slip & silly props slide under the hero's feet, materials fly to the house
plot, worn props join the hero's own container. Unknown words render as a
labeled `doodle` blob — nothing ever silently disappears. When the wolf
huffs and puffs, the whole world container shakes and squashes, the hero
gets shoved back, puff-cloud sprites fly, and a weak straw/stick house
scatters into straw-bit particles — all on the GPU, no per-frame CPU drawing.

## Run

```
cd mockups && python3 v3/server.py     # if not already running
# open http://localhost:8001/v3/08-pixi/
```

Draw a hero (or "Surprise me"), then type short words — `gather straw`,
`unicorn`, `banana peel`, `brick house`. Words typed while a scene is still
traveling get queued (one slot) instead of being swallowed; empty input gets
a coach nudge; long input is trimmed to 28 chars; unknown spellings offer a
"did you mean". The narrative types out a character at a time, and the goal
bar eases toward the LLM's `goal_progress` without big backward jumps.

**Watch it play** scribbles a hero live, then types a scripted word list
(`gather straw → hide inside`) through the **real** LLM — a live chip shows
each `/api/chat` round-trip, and a **Stop the show** button can bail out
mid-typewriter, mid-call, or mid-pan (`window.watchItPlay` /
`window.stopWatch`; `#watch` in the URL auto-starts it for harnesses). If
the story brain is unreachable the shared client falls back to the canned
mini-GM and the chip honestly labels itself **demo mode**. Reaching the
brick house plays a star-shower finish and the end overlay. If WebGL is
unavailable, a friendly card replaces the stage (and no longer flashes on
load — `[hidden]` wins over `.gpuoff`'s `display:flex`).

## Engine

- **PixiJS v8** — MIT, https://pixijs.com (vendored `vendor/pixi.min.js`)
- **rough.js** — hand-drawn look (vendored `vendor/rough.js`)
- LLM via `../shared/llm.js` → `POST /api/chat` (TensorMux `glm-4-7-flash`)

## Measured latency

Real "watch it play" runs through `POST /api/chat` on this machine
(remote GLM, headless Chromium + SwiftShader WebGL): **1.9–5.0 s per call**,
typical ~2.4–3 s — the HUD chip prints each one (e.g. "GLM answered in
2.4s"). A full 7-word journey runs ~55 s end to end including typing and
travel; the win overlay appeared on runs where the game master pushed
`goal_progress` to 1. The offline fallback answers instantly when the model
is unreachable.

## How the real version scales

The mockup bakes textures eagerly per prop and appends a baked page per
turn — plenty for a storybook. At production scale you'd keep a
`PIXI.Texture` atlas per prop def × seed (props are seeded, so identical
words share GPU memory), reuse a `PIXI.RenderTexture` pool for scene pages
instead of re-rasterizing on the 2D canvas, and keep the single shared
spring ticker already present. For the LLM side, the proxy already
serializes calls (one narrative turn at a time), reports per-call latency,
and `waitForHeadroom` gates the scripted demo; scaling to many kids means
pooling those calls server-side and streaming narrative deltas while
sprites animate, so the ~2 s feels instant.
