# Mockup 01 — Draw Your Hero

**Modality:** draw with mouse or touch (inspired by Meta's *Animated Drawings*).

A kid sketches a character on a paper-like canvas with crayon-texture strokes,
hits **"Done drawing!"**, and a simulated AI sequence scans the page — sparkles,
a light beam, and friendly step toasts ("Finding the arms…", "Finding the
legs…", "Waking them up…") — while joint dots and limb bones pin themselves onto
the drawing. Then the payoff: the kid's drawing pops into a Storywood scene next
to Pip and does a squash-and-stretch happy dance. The kid types the friend's
name, the story caption updates, and a letter-gem is earned (the gem shows the
first letter of the friend's name).

**Hands-free demo:** a kid-style friend doodle paints itself onto the canvas the
moment the page opens, so the whole flow — scan, skeleton, dance payoff — runs
with zero drawing. A **"Load a different friend"** chip cycles three more
pre-drawn doodles (all drawn programmatically with the same crayon engine,
proportioned so the hardcoded skeleton lands on them), and **"Watch the
magic"** auto-plays the full sequence. The drawing tools stay fully functional —
the doodle is just a starting point kids can erase, undo, or scribble over.

## Run it

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000/01-draw-hero/
```

Plain HTML + CSS + vanilla JS. No build step, no dependencies beyond Google
Fonts. Works with mouse, touch, or pen via Pointer Events.

## What it demos

- Crayon-feel drawing canvas: 8 chunky colors, 3 brush sizes, eraser, undo,
  clear — all pointer-event driven.
- The "magic moment" pattern: making AI processing visible and fun for kids
  instead of a silent spinner.
- Story continuity payoff: your creation joins the world, earns a letter-gem,
  and nudges emergent literacy (typing the name → its initial becomes the gem).

## How the real version would work

In the shipped game this runs the same pipeline as Meta's **Animated Drawings**
project ([github.com/facebookresearch/AnimatedDrawings](https://github.com/facebookresearch/AnimatedDrawings),
live demo at [sketch.metademolab.com](https://sketch.metademolab.com)): the
drawing is cut out from its background, a lightweight pose model predicts
humanoid joints — shoulders, elbows, wrists, hips, knees, ankles — the detected
skeleton is pinned to the artwork, and preset skeletal animations (idle bounce,
happy dance, walk) drive the sprite in the story. A sibling approach, Google's
**Monster Mash** ([github.com/google/monster-mash](https://github.com/google/monster-mash),
[MonsterMash.zone](https://monstermash.zone)), instead inflates the sketch into
a 3D model that can be posed and animated from any angle. Here, the joint
positions, toasts, and timing are all hardcoded — only the drawing itself is
real.
