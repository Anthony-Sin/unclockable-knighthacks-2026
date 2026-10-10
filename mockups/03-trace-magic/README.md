# 03 — Trace & Spell

**Modality:** pointer tracing (mouse or touch) — handwriting practice woven into
the story.

Kids trace chunky dashed letter guides on a sheet of "handwriting paper." Each
finished letter fills in with ink; each finished word is "read" by a simulated
AI moment and pushes the story forward: `map` → `key` → `sun`. Finishing all
three earns Pip a letter-gem.

## What it demos

- Letter guides rendered as SVG paths, traced with Pointer Events (one code
  path for mouse, touch, and stylus).
- Hit-testing by sampling points along each path (`getPointAtLength`); coverage
  reveals a masked "ink fill" of the letter plus a progress bar.
- Stroke-order start dots with direction arrows (the letter `k` uses two
  numbered strokes).
- Gentle correction: drift too far off the letter and the card wiggles with an
  encouraging toast — progress is never erased.
- The fake AI beat: sparkle sweep + "Reading your writing…" → a recognition
  chip pops (`"map" — nice letters!`), then a story-beat card with a little
  SVG scene lands in "The story so far."
- Payoff: letter-gem celebration, confetti, and a "Trace again" reset.
- An "erase & retry" button restarts the current letter.
- A "Watch Pip trace it" button runs the whole demo hands-free: a virtual
  pencil follows each guide path at kid pace (wobble included), covering the
  same sample points a finger would — letters complete, the AI moment, story
  beats, and the finale all fire on their own. It toggles to "Stop the demo"
  and stopping mid-letter hands control straight back to manual tracing.

## Run it

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000/03-trace-magic/
```

Everything is relative-path static files — no build step, no backend.

## How the real version works

In the real game, the traced ink isn't just hit-tested — the child's actual
stroke is captured as point data (or rendered to an image) and sent to a
handwriting-recognition engine — the same class of tech behind Google
Handwriting Input, MyScript's iink SDK, or Apple Pencil's Scribble. The model
reads *what* was written (e.g. it can tell a shaky-but-legible "a" from a
different letter), and a kid-tuned scoring layer judges *how* it was written:
stroke order, direction, closure, and proportion rather than pixel-perfect
shape. That lets the game respond the way a patient teacher would — accepting
wobbly attempts, spotting specific mix-ups like b/d reversals, and coaching
the next try ("start at the top!"). In this mockup, coverage of the guide
stands in for recognition and the response chip is hardcoded.
