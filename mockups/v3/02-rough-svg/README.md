# The Three Little Pigs — Sketch-DOM Pigs (v3 · 02-rough-svg)

One of eight engine builds of the same LLM-driven game (see `../SPEC.md`).
The kid draws a hero on the maker canvas — their strokes are replayed as
**rough SVG paths inside the live DOM** — then types words that a real
game-master LLM turns into narrative + a fresh `scene_seed`. The whole world
is hand-sketched SVG nodes (sky / terrain / build / props / fx layers), so
every prop is a `<g>` you can poke: hover a prop to see its name, silly words
spawn real slapstick props, and the wolf-pressure meter tracks the huffs.

The world is a **growing panorama**, v1-roughjs style: every accepted turn
sketches a new 960-wide stretch of Storywood to the right (`scenebit` groups
inside the shared layers), the hero waddles into it with a walk cycle, and a
`#camG` camera group pans to follow — the old stretch scrolls off, never a
static repaint. Props fall in with gravity + one bounce, fliers swoop,
mounts carry the hero, banana peels slip-spin-splat, materials hop over to
the house plot, and the wolf's huff shakes the whole SVG world. Typing
during an animation queues the word; Stop freezes the show mid-frame.
`window.watchItPlay` / `window.stopWatch` are exported for the v3 dashboard.

## Run it

```bash
cd mockups
python3 v3/server.py            # http://localhost:8001
# open http://localhost:8001/v3/02-rough-svg/
```

The LLM goes through `../shared/llm.js` → `/api/chat` (TensorMux
`glm-4-7-flash`, `reasoning_effort: "none"`); the key stays server-side. If the
model can't be reached the shared client falls back to a canned mini-GM and
the page labels itself **demo mode**. `?mode=local` targets a local ollama.

## The engine

[rough.js](https://github.com/rough-stuff/rough) rendering to SVG DOM
(`rough.svg()`), vendored at `vendor/rough.js`. No image assets — the scene
is re-grown procedurally from `scene_seed` every turn (biome, palette, seed,
prop list), so no two journeys look alike.

## Latency

Measured through `/api/chat` on this machine during a live watch run:
**~1.9–4.6s** per game-master turn, ~2.4s typical (see `/api/stats` on the
v3 server for a running log). Occasional proxy blips fall back to the
canned mini-GM and the chip honestly flips to **demo mode** for that beat.

## How the real version scales

Same contract, more plumbing: stream the narrative token-by-token, cache
`scene_seed` renders per biome, pre-warm a second GM call behind the
did-you-mean chip, and swap the vendored renderer for a worker so SVG churn
never blocks the input. The DOM-native prop layer already supports
per-prop hit-testing, so richer interactions (tap the wolf, feed the pig)
drop in without changing the story contract.
