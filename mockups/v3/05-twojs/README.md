# The Three Little Pigs — Springy Scribble (v3 · 05-twojs)

One of eight engine builds of the same LLM-driven game (see `../SPEC.md`).
The kid draws a hero, types words, and a real game-master LLM answers with
narrative + a fresh `scene_seed`. The differentiator here: everything on
stage is a `two.Path`/`two.Group` stroked 2–3 times with jittered copies plus
a live "boil" wobble — the whole world looks like it's being re-drawn every
frame.

## Run it

```bash
cd mockups
python3 v3/server.py            # http://localhost:8001
# open http://localhost:8001/v3/05-twojs/
```

The LLM goes through `../shared/llm.js` → `/api/chat` (TensorMux
`glm-4-7-flash`, `reasoning_effort: "none"`); the key stays server-side.
The chip in the dock reads the engine honestly: **live LLM** when the
answer came from a real remote/local call (with real clock time), **demo
mode** only when the canned mini-GM answered. `?mode=local` targets a local
ollama.

## The engine

[Two.js](https://two.js.org) v0.8.24 (MIT), vendored at `vendor/two.min.js`.
All spring physics are hand-rolled on top of `two.bind('update')`.

**Forward travel.** The panorama is a `panoG` group holding two reusable
scene slots; each new `scene_seed` is drawn into the off-screen slot on the
right, then the whole strip glides left while the hero walks. Gameplay props
ride their own `propsG` layer with slight drag for parallax.

**Grounded motion.** The kid-drawn hero (replayed stroke-by-stroke as
Two.js paths, marked `data-hero`) bobs when walking, hops with a gravity
arc on success beats, slips/spins/splats on slippery props, and mounts
rideables. Props pop in on springs, drop to the ground with a settle
bounce, floaty ones bob, heavy ones thud. The wolf's huff squash-and-
stretches the ENTIRE world group. Unknown words draw a labeled doodle
crate (`Two.Text` tag) instead of being dropped silently.

**Watch it play.** `watchItPlay()` types a scripted word list visibly,
calls the real LLM sequentially, shows a **stop** button, and resets
cleanly for re-runs; `stopWatch()` cancels at any point. The goal bar is
a smoothed, monotonic-ish logical value — small dips only on failure
beats — so it always climbs to the payoff.

## Latency

Measured through `/api/chat` on this machine: **~0.7s** for a minimal prompt,
~2–3.5s typical for a full game-master turn (`/api/stats` on the v3 server
keeps a running log). Offline answers are labeled "offline narrator" with
no fake clock time.

## How the real version scales

Two.js renders to SVG here; the same scene graph can flip to its canvas or
WebGL renderer for dense prop counts. The boil wobble is capped to ~60
visible paths — production would pool Path objects and quantize the wobble
updates. Story-side: stream narrative tokens, and pre-fetch the next GM
turn while the spring animations play so latency hides behind the bounce.
