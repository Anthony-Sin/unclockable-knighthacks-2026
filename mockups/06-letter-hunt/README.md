# 06 — Letter Hunt (camera "AR" scavenger hunt)

A front-end mockup of the camera modality for **Pip & the Storywood**: kids get a
letter of the day (**B**) and hunt real-world objects that start with it.

## What it demos

- A fullscreen-ish **viewfinder** (corner brackets, scan grid, sweeping scan
  line) over either a **live `getUserMedia` camera feed** or a hand-drawn
  inline-SVG **practice room**.
- A simulated vision-AI loop: sticker-style bounding boxes pop up naming what
  was "spotted" — hits (`book`, `ball`, `bottle`, `banana`, `bear` — "starts
  with B!") fill one of **3 sticker slots** with sparkle bursts; misses
  (`cup — that's C`, `plant — that's P`, `sock — that's S`, `lamp — that's L`)
  wobble gently and say "keep looking!".
- The detection loop **runs automatically** — no live input needed to reach the
  payoff — plus a **Scan now** button for on-demand bursts and a
  **Pause/Resume** toggle.
- **Payoff:** find 3 B-things → a letter-gem is earned ("You found the B's!")
  and the story advances.
- **Fallback:** "Use the practice room instead" is offered right on the title
  card and works everywhere; camera denial also swaps to it automatically. In
  the practice room the fake detections land on the actual drawn objects.
- Camera tracks are stopped (`track.stop()`) on mode swap, back-to-start, and
  page unload — nothing lingers.

## Run it

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000/06-letter-hunt/
```

Serving from `localhost` is what lets the browser grant camera permission.
Without a camera (or on `file://`), just pick **"Use the practice room
instead"** — the whole demo, including the payoff, runs hands-free.

## How the real version would work

In the real game, each camera frame would go through an actual **object-detection
model** — e.g. **Detectron2** (github.com/facebookresearch/detectron2), the same
Meta detection stack used in their Animated Drawings project, or the kind of
on-device vision AI inside **Google Lens**. The model returns real bounding
boxes plus class labels for whatever the camera sees; the game then checks each
label's first letter against the letter of the day, so "book/ball/bottle"
count and "cup/plant" get a gentle "keep looking!". This mockup fakes that
pipeline: labels come from a hardcoded list on a timer, and in the practice
room they're anchored to where the SVG objects are drawn so the "AI" appears to
really see the room — exactly what Detectron2-style detections would provide
for real.
