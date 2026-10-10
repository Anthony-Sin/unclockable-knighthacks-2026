# Variant 3 — Fill the Tale · Living Forest edition

**Engine:** [p5.js](https://p5js.org/) v1.11.13 via jsDelivr CDN
(repo: [github.com/processing/p5.js](https://github.com/processing/p5.js)).
The whole world is generative art drawn live by the sketch — no images,
no sprites.

A Make-Your-Hero × Type-the-Tale demo for kids: design a squishy blob hero,
then type words into five story sentences. Whatever you type **literally
happens** in the forest — type `bridge` and a plank bridge grows across the
creek; type `banana peel` and Pip slips on a real banana peel.

## The chapter (5 beats, one journey)

0. **Make your hero** — chunky DOM controls (6 body colors, a
   Squish-o-meter slider, 3 eye styles, 5 headgear options) re-dress a blob
   that is already wobbling on stage. "Surprise me!" randomizes everything.
1. **Forest clearing** — *"Pip needs a ___ to cross."* A creek notches the
   perlin hill. `bridge`/`log`/`plank` span it, `boat`/`raft` float across
   the water, `vine`/`rope` swing Pip over, `stepping stones` hop.
2. **Drizzly field** — *"The hero grabs a ___."* Rain streaks fall.
   `umbrella`/`leaf umbrella`/`newspaper` hover overhead,
   `mushroom hat`/`hood` perch on Pip's head.
3. **Riverbank** — *"The hero rides the ___ across."* A wobbly river band:
   `boat`/`raft`/`canoe`/`log` float Pip over, and two **support characters**
   are rideable — a **blob duck** that ferries Pip with wake rings and a
   QUACK, and a **unicorn** that crosses trailing sparkles.
4. **Cave mouth** — *"The hero lights a ___."* The scene dims.
   `lantern`/`torch`/`candle`/`flashlight`/`match`/`sparkler` bloom a warm
   glow; `firefly jar` releases the third support character — **a firefly
   swarm that orbits Pip** and follows it home.
5. **Home meadow** — *"The hero opens the ___."* Sunset palette, a cottage
   with a smoking chimney. `door`/`key`/`gate`/`window`/`cookie jar` open
   it — the door swings, warm light spills, confetti pops → letter-gem +
   full word recap.

Every transition **crossfades**: sky gradients alpha-blend, hill colors
lerp, and each scene's terrain morphs between two noise fields while the
features (creek, river, cave, cottage) fade in and out.

## What's procedural (all of it)

- **Rolling hills** — three parallax layers traced from 2-D `noise()` every
  frame; the second noise input is time, so terrain *breathes* forever.
  Each of the five journey areas gets its own noise offsets.
- **The creek / river / rain** — the gap is a notch carved into the front
  hill's noise curve with pooled water; the river is a noise-edged band;
  rain is 80 recycled streaks.
- **Your blob hero** — its outline is a circle deformed by 3-D
  `noise(cos, sin, t)`. The Squish-o-meter literally sets how far noise
  pushes the outline; color/eyes/headgear assemble procedurally on top.
- **Everything else** — drifting blob clouds, swaying trees, flowers,
  fireflies, petals — positions and colors rolled from a seeded RNG
  (`mulberry32`), shown as `forest #NNNNN`. "Grow a new forest" re-rolls.

## Word reactions (hardcoded table)

- **Sensible** per-beat lists spawn real props + a rigged animation
  (cross / grab / ride / light / open) and advance the story.
- **Silly** words (banana peel, slime, paper bag, toast, toaster, fridge,
  soggy match…) trigger the beat's gag rig with the prop really spawning:
  `tumble` = skid + roll downhill + SPLAT + dizzy stars, `soggy` = droop
  flat in the rain, `splash` = GLUG into the river, `fizzle` = spark-PFFFT
  in the dark, `startle` = faint on the doorstep. Then Pip dusts off and
  the kid retries.
- **Gibberish** → a gentle *"is that a word?"* wobble, no advancement.
- **Close-miss spelling** (`bridg`) → a **"did you mean bridge?"** chip
  (edit-distance ≤ 2 against the beat's word list) that accepts the fix.

**Hands-free:** "Watch it play" auto-makes a hero, then types six words —
including a soggy `paper bag` fail — to complete the chapter. While it
runs the button becomes **"Stop the show"** and halts cleanly.

## Run it

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000/variants/v3-p5-perlin/
# add #demo to the URL to auto-start the show
```

Plain HTML + CSS + vanilla JS. No build step; the only external dependency
is the p5.js CDN (plus Google Fonts). If p5 can't load, the stage shows a
friendly "forest is asleep" fallback.

## How the real version would work

The shipped game keeps this generative stage and swaps the hardcoded word
tables for a kid-safe lexicon: on-device word embeddings (or a curated
dictionary API) classify real-word-vs-nonsense, a sentiment tag routes
silly words to gag rigs, and phonics/levenshtein scoring powers the
"did you mean…?" chip. The reaction rigs are honest about the pipeline —
position, rotation, and squash-over-time driven by the sketch — which maps
directly onto a real skeletal animator or a full p5/matter.js physics body.
