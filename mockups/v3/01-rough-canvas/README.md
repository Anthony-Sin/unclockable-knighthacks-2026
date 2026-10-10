# The Three Little Pigs — Rough Canvas (v3 · 01-rough-canvas · FLAGSHIP)

One of eight engine builds of the same LLM-driven game (see `../SPEC.md`).
The kid crayons a hero on the maker canvas — strokes replay as wobbly
`rough.js` curves, then get cropped into a live sprite — and types words
that a **real** game-master LLM turns into narrative + a fresh
`scene_seed`. Each accepted turn is forward travel: two stacked
`<canvas>` scenes double-buffer (`#sceneA` / `#sceneB`), the old world
slides off left while the new section pans in from the right with the
ink edge riding the seam, and the hero visibly walks — bob, dust puffs,
pig pals trotting behind — deeper into the story. Loose props sweep
past with parallax so the strip reads as one long journey toward the
brick house.

Everything else is a real DOM doodle too, and props are things that
happen *to* the hero. The typed word itself always becomes a prop (the
GM may not echo it into `props[]`, so the kid's word resolves through
the same alias table — "unicorn" really does spawn a unicorn and get
ridden). Rides and pals slide in from the right, the wolf slides in
from the left, weather drizzles down, and heavy/slippery things drop
from the sky with a bounce-and-settle thud — nothing freeze-appears.
Rideables go under the hero in `#rideLayer` (he hops aboard and trots),
slippery/silly props trigger the slip-spin-splat with dizzy stars
whether or not the beat scored, hats sit on his head (`#headprop`),
lights glow in his hand (`#heldprop` + warm `#glowDot` in dark scenes),
and unknown words become labeled doodle props rather than dying. Two
pig pals waddle behind, the wolf meter counts five huffs to a full
**HUFF AND PUFF** that shakes the stage, shoves the hero and loose
props, and literally tips straw and stick houses over — brick doesn't
budge — and the win page recaps every word with the silly ones marked
"oops".

## Run it

```bash
cd mockups
python3 v3/server.py            # http://localhost:8001
# open http://localhost:8001/v3/01-rough-canvas/
```

The LLM goes through `../shared/llm.js` → `/api/chat` (TensorMux
`glm-4-7-flash`, `reasoning_effort: "none"`); the key stays server-side.
If the model can't be reached, the shared client falls back to a canned
mini-GM and the page labels itself **demo mode** (dashed red latency
chip). `?mode=local` targets a local ollama. `#watch` deep-links straight
into the hands-free demo; the v3 dashboard drives it via
`window.watchItPlay()` / `window.stopWatch()`.

## The engine

[rough.js](https://roughjs.com) rendering to 2D canvas (`rough.canvas()`),
vendored at `vendor/rough.js`. No image assets — the world is re-grown
procedurally from `scene_seed` each turn (`world.js`: biome painters +
palettes), props come from a ~70-kind seeded sketch catalog (`props.js`)
with an alias resolver, so any word the LLM emits draws *something* —
unknown words get a labeled doodle prop instead of dying.

## Latency

Measured through `/api/chat` on this machine during real "watch it play"
runs: **~2.1–2.5s per game-master turn** (full-run samples: 2106–2486ms
over 9 turns; other runs saw 2.8s and one 5.1s cold call). Each turn =
one non-streamed JSON reply; the per-call latency chip ("story-brain
answered in 2.3s") reports `_meta.ms` live — demo-mode fallback turns
say "canned narrator" instead of faking a number.

## How the real version scales

Same contract, more plumbing: stream `narrative` token-by-token into the
typewriter, cache `scene_seed` renders per biome+palette (the wipe makes
cache hits feel free), pre-warm a second GM call behind the
did-you-mean chip, and move prop painting into an OffscreenCanvas worker
so huff-and-puff bursts never block the input row. The DOM prop layer
already supports richer verbs (drag the straw to the house, tap the wolf
to scare him off) without touching the story contract.
