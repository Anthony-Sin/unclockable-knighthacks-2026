# "Fill the Tale" — Variant Spec (v2)

All 7 variants implement the SAME game loop, each with a DIFFERENT
procedural-art engine, DIFFERENT background world, and DIFFERENT props /
support characters. Read `../CONVENTIONS.md` for the shared art direction.

## The game
A reading-comprehension + spelling journey: the kid builds their own hero,
then types words into story sentences — and **the sentence literally changes
the world**. Type "unicorn" → a unicorn appears and the hero rides it. Type
"banana peel" → the hero slips on a real banana peel. Goal: get the hero
through the world to the end of the chapter.

## Required beats (flavor names may differ per variant, mechanics may not)
0. **Make your hero** — the kid CREATES the character (never pre-made for
   the real path): a small maker step appropriate to the variant's engine —
   draw it, pick features/colors, or paint it. Also provide "surprise me"
   so it's hands-free-demoable.
1. "Pip needs to get through the forest! But the path is blocked —
    Pip needs a ___ to cross." → sensible word (bridge, log, boat, vine...)
    spawns that prop and the hero crosses. Silly word → comedic fail gag.
2. "It started to rain! The hero grabs a ___." → umbrella/hat/leaf appears;
    silly (paper bag, toast) → soggy gag.
3. "A wide river! The hero rides the ___ across." → boat/duck/fish/unicorn
    appears as a rideable prop/support character; the hero visibly mounts
    and rides it across the water. Silly (toaster, fridge) → splash gag.
4. "The cave is dark! The hero lights a ___." → lantern/torch/firefly
    glows and lights the cave. Silly → fizzle gag.
5. "Home! The hero opens the ___." → door/key/cookie jar → home payoff +
    letter-gem + recap of every word the kid chose.

## Word logic
- Hardcoded reaction table per beat: `sensible` words → prop spawns +
  success animation + story advances; `silly` words → a REAL spawned prop
  doing the gag (the banana peel must literally appear underfoot — that's
  the point), hero slips/spins/splats/dizzy-stars, then recovers; advance
  with the funny version canon or offer retry.
- Gibberish/empty → gentle "is that a word?" wobble, no advancement.
- Spelling support: close-miss a sensible word ("bridg") → "did you mean
  bridge?" chip that accepts it (simple edit-distance check is fine).

## Universal rules
- index.html entry; vanilla JS + your engine via CDN (vendored/local even
  better); no build step; relative paths; runs under
  `python3 -m http.server 8000` from `mockups/` → URL is
  `http://localhost:8000/variants/<your-folder>/`
- HANDS-FREE: "Watch it play" button — auto-fills the hero, types a
  scripted mix (sensible words + ≥1 silly fail) at kid-typing cadence, and
  plays the whole chapter. Stoppable.
- Scene must be visibly DIFFERENT per variant (art engine + palette
  accents + prop style + at least one unique support character).
- No emojis in UI. Real kid copy. Warm-paper family look per CONVENTIONS.
- README.md: what it demos, how to run, the engine citation (repo URL),
  how the procedural generation works, and how the real version works.
- Work ONLY inside your folder. It may contain partial files from a killed
  earlier run — feel free to delete/overwrite them entirely.
- Leave no running processes. Verify: node --check on JS, page serves 200.
