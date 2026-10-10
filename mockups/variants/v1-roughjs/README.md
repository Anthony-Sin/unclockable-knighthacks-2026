# Fill the Tale — Crayon Woods edition (Variant V1 · rough.js)

One of seven engine variants of the same combined game mockup:
**Draw-Your-Hero × Type-the-Tale**. The kid first *draws the hero* on a mini
crayon canvas — that doodle is cropped out and becomes the actual character who
walks, rides, slips, and splats through a hand-sketched world. A big story
sentence has a blank in it; whatever the kid types is drawn by rough.js as a
real prop in the scene. Sensible words (bridge, umbrella, boat…) move the story
forward. Silly words (banana peel, toaster, paper bag…) spawn a real gag prop,
knock the hero over with stars a-spinning — and the funny version becomes
official story canon. Five lines = one chapter = one letter-gem.

A sketchy little **bird** follows the hero through the whole chapter and chirps
encouragement, protests at silly answers, and celebrates every line.

## The journey

The world is one long crayon panorama the camera pans across:

1. **Forest** — the path is blocked by a creek; the hero needs something to
   cross.
2. **Rainy patch** — rain starts; the hero grabs something to stay dry.
3. **River** — wide water; the hero visibly mounts whatever they typed and
   rides it across (yes, a unicorn works — so does a duck).
4. **Cave** — a dark overlay covers the cave; a light word (lantern, torch,
   firefly) cuts a soft light-hole that follows the hero through.
5. **Home** — the cottage door; the hero opens whatever they typed and earns a
   letter-gem plus a recap of all five chosen words (silly ones get a "splat!"
   tag).

## The engine: rough.js

Every piece of artwork is rendered by
[rough.js](https://github.com/rough-stuff/rough) — a tiny library that draws
shapes as sketchy, hand-hatched strokes, like a kid pressing too hard on a
crayon. The library is vendored at `vendor/rough.js` (no network needed). No
images, no SVG art assets; everything is seeded rough calls:

- **`rough.canvas()`** paints the one-shot world (`worldCv`): hatched sky,
  scribbled sun, wobbly hills, a stitched walking path, blobby trees and
  flowers, the blocked creek, the rainy patch (with animated CSS raindrops),
  the river, the cave mouth, and the home cottage.
- **The hero is the kid's drawing** — the maker canvas (`makerCv`) captures
  chunky-brush strokes in six crayon colors; on "Done" the drawing is
  bounding-box cropped into `heroCv` and placed in the world, where CSS
  animations walk/hop/slip/soak/splash it around. "Surprise me" auto-paints a
  replayable blob monster for hands-free demos.
- **`rough.canvas()`** draws every **word prop**: each entry in the reaction
  table maps to a hand-coded prop function (plank bridge, umbrella, paper bag,
  rowboat, unicorn, lantern, cookie jar, banana peel, toaster, fridge…). Typed
  words literally become crayon drawings in the world.
- The **bird sidekick** is a small rough sketch on `birdCv` that flies after
  the hero and perches during prompts.
- The **cave darkness** is a canvas overlay; when a light word lands, a radial
  gradient is destination-out-cut around the hero each frame so the hero's own
  doodle is what glows.
- **`rough.svg()`** draws the wobbly crayon underline under the typing blank.

## How the procedural generation works

A **mulberry32** PRNG seeded per page load drives all layout randomness —
sun rays, cloud count, hill peaks, tree/flower placement, prop wobble — and
every rough call gets `seed: rng-derived` so the same seed redraws the
identical sketch on resize. Prop canvases are generated on demand per typed
word, sized to the prop, and positioned on the walking path via stored
ground-relative offsets (`dyg`), so resizing the stage keeps props planted.
Rideable props (boat, duck, unicorn…) spawn in `rideLayer`; the hero is
lifted onto them (CSS `top` tween) and the whole rig translates across the
river. Silly props are real spawned props too — the banana peel literally
appears underfoot before the slip.

## Reaction table (hardcoded per beat)

- **Forest:** bridge, log, plank, vine, boat → cross the creek · banana peel,
  slime, toaster, fridge, rock → real prop + slip/splat/bonk gag, then
  advance (the fridge accidentally works).
- **Rain:** umbrella, hat, leaf/leaf-hat, newspaper → stay dry · paper bag,
  toast, sponge, sock → soggy prop lands on the hero's head, drips, then
  advance.
- **River:** boat, raft, duck, fish, **unicorn** → mount + ride across ·
  toaster, fridge, rock → spawn, sink like stones, then the hero
  doggy-paddles across — canon!
- **Cave:** lantern, torch, firefly, candle → light-hole through the dark ·
  wet match, pickle, paper bag → one sad spark, fizzle gag, then the hero
  tip-toes through the dark anyway (and may bump into things).
- **Home:** door, doorknob, key, cookie jar → opens the cottage →
  letter-gem + recap · wall → bonk.

**Word logic:** empty / too-short / vowel-less / malformed input → a gentle
"is that a word?" wobble, no advancement. Trailing plurals are forgiven.
Close-misses on sensible words (edit distance, e.g. `bridg`) → a "Did you
mean bridge?" chip that accepts it. Unknown-but-wordy words → wildcard
scribble prop + bonk gag, so no typed word is wasted.

## Hands-free demo

"Watch it play" auto-paints a blob-monster hero, starts the story, and types
a scripted mix at kid cadence — `bridge` → `paper bag` (silly, on purpose) →
`unicorn` → `torch` → `cookie jar` — including at least one comedic fail, a
ride, and the full ending. A **stop** button appears during the demo and
hands control back to the typing box.

## Files

- `index.html` — stage/world viewport, maker + end overlays, sentence card
- `style.css` — warm-paper kid UI + all gag animation keyframes
- `app.js` — seeded world/prop renderers, maker + crop, reaction table,
  beat engine, bird AI, demo mode
- `vendor/rough.js` — vendored rough.js (github.com/rough-stuff/rough)
- `README.md` — this file

## Run it

Serve the `mockups/` root and open the variant:

    cd /home/ANT/unclockable-knighthacks-2026/mockups
    python3 -m http.server 8000
    # → http://localhost:8000/variants/v1-roughjs/

## How the real version would work

The seeded-scene and prop-rendering pipeline is production-shaped: per-session
seeds give every kid a unique-but-stable storybook; the maker would upload
the hero crop (with moderation) to a per-kid profile; prop functions would be
generated/selected by an asset service instead of the hardcoded table; and the
reaction table would become a kid-safe word classifier (dictionary + on-device
model) labeling words helpful / silly / not-a-word, with an adaptive tutor
adjusting sentence difficulty. The contract stays identical:
`word → spawned prop + gag`, only the lookup gets smarter.
