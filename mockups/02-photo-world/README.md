# 02 — Snap-a-World

**Modality:** webcam photo capture (inspired by Google DeepMind's Genie — a
picture of a drawing becomes a playable world).

## What it demos

1. **Hero** — "Take a picture of your drawing — it becomes the story!"
2. **Camera stage** — a live `getUserMedia` feed in a viewfinder frame with
   corner brackets and a chunky shutter button. If the camera is denied,
   missing, or the kid just doesn't want to use it, a picker offers three
   built-in paper doodles (dragon, house, sun) drawn as inline SVGs — the demo
   never dead-ends. The first doodle is pre-selected so the whole thing runs
   with a single tap, and a small **"Watch it work"** button next to the
   viewfinder runs the full snap → scan → payoff sequence automatically on a
   random sample doodle — handy for a completely hands-free presenter demo.
3. **Simulated AI moment** — a scanline sweeps the snapped picture while step
   toasts run ("Cutting out your drawing…", "Reading the colors…",
   "Building the world…") and fake detection chips pop over regions
   ("dragon!", "grass!").
4. **Payoff** — the photo becomes the backdrop of an animated Storywood scene:
   Pip the monster bobs in front, clouds drift, the sun spins, and pointer
   movement parallaxes the layers. A real (non-AI) touch: the canvas samples
   the photo's dominant sky/ground colors and tints the scene's sky wash and
   hills to match, so the world genuinely looks generated from the picture.
   The world is named from the "detected" subject ("Welcome to Dragon
   Valley!"), the story caption advances, and a letter-gem reward pops in.
5. **Reset** — "Snap another world" goes back to the camera. A footnote chip
   names the real tech: *"In the real game, a world model like Google
   DeepMind's Genie turns your photo into a playable level."*

For real webcam snaps, the "detected" world is picked from the photo's
dominant hue (greens → Dragon Valley, blues → Bubble Bay, warm → Sunny
Meadows, colorless → Pebble Peaks). For the doodle picker, each drawing has a
fixed world. Color sampling itself is genuine canvas math — only the
understanding is faked.

## How to run

Serve the `mockups/` root (camera APIs need a localhost or https context):

```sh
cd mockups/
python3 -m http.server 8000
# open http://localhost:8000/02-photo-world/
```

Allow camera access for the full path, or deny it to see the doodle-picker
fallback. All paths are relative; there is no build step.

## How the real version works

In the shipped game, the snapped photo would be handed to a world model like
**Google DeepMind's Genie** (deepmind.google/research/publications/60474) —
a generative model that turns a single image into a playable environment.
A vision model labels what's in the picture ("dragon", "house", "tree"),
segments the subject from the paper, and the world model expands it into a
navigable level with consistent physics and lighting. The kid's drawing
becomes terrain and characters; Pip's path, gem placements, and story beats
are laid over it — so a photo of a crayon dragon on the kitchen table really
does become the next page of the bedtime story. This mockup fakes the magic:
the labels, names, and chips are hardcoded, but the photo-as-backdrop and the
color-derived scenery are real, which sells the illusion.
