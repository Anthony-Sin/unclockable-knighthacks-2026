# Fill the Tale — Pixel Woods edition

**Variant 07 · engine: seeded pixel art, drawn entirely from code**

A kids' reading-comprehension typing game for *Pip & the Storywood*
(KnightHacks 2026). The kid paints their own hero on a real 12×12 pixel
grid, then types words into five story blanks — and **the sentence literally
changes the world**. "bridge" builds a bridge over the ditch. "banana peel"
spawns a real banana peel underfoot, the hero slips, lands flat, and
**pixel-explodes into its own cells** before reassembling under a halo of
blinking dizzy stars. That's the signature gag.

## Run it

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000/variants/v7-pixelmon/
```

No build step. Plain HTML + CSS + vanilla JS. Everything is `<canvas>` —
`image-rendering: pixelated` keeps every block chunky. No image assets,
no emoji in the UI.

## Beat 0: the hero maker

A real **12×12 pixel painter**: click/drag cells, 6-color palette, eraser,
and a **mirror-symmetry toggle** (paint one half, the other half mirrors —
the classic space-invader trick, but now it's the kid's *tool*). The hero
pops onto the stage and bobs while you draw.

"**Surprise me!**" grows a symmetric monster from the name field —
name → FNV-1a hash → mulberry32 PRNG → mirrored 6×12 cell grid + palette +
eye/horn/fang stamps. Same name, same monster, every time, on any machine.
The surprise lands *in the painter*, so kids can edit it afterward.
A hand-painted hero still gets a seed — the painting's own cell signature
seeds the world, so the world is literally grown from the drawing.

## The chapter (5 areas, 5 palettes)

| Beat | Area | Sentence | Sensible words spawn | Silly words spawn |
|------|------|----------|----------------------|-------------------|
| 1 | Green Woods | "…needs a ___ to cross" | bridge, log, vine, stepping stones, boat (rides the ditch!) | banana peel, soap, ice → slip + **explode** + dizzy stars |
| 2 | Grey Drizzle | "…grabs a ___" | umbrella, hat, giant leaf, poncho — worn overhead, rain stops hitting the hero | paper bag, toast → soggy droop |
| 3 | Blue River | "…rides the ___ across" | boat, raft, duck, swan, fish, whale, turtle, **UNICORN** — hero visibly mounts, it trots across (2-frame legs!) | anvil, toaster, fridge → both go glug-glug under |
| 4 | Purple Cave | "…lights a ___" | lantern, torch, candle, glow worm, fallen star, **firefly** (the support character itself flares up) — light radius blooms out of the dark | pickle, wet sock, cheese → spark… fizzle… still dark |
| 5 | Golden Home | "…opens the ___" | door, key (flies in), cookie jar (lid pops, cookie burst) | monster/dragon/ghost → door cracks, two glowing eyes, scare-explode |

Support character: a **pixel firefly** hovers ahead of the hero, blinks the
way to the next area, and stays visible through the cave dark.

After a silly gag the kid picks *Keep the silly word!* (it stays in the
recap, flagged silly) or *Try another word*.

## The reaction table (hardcoded, per spec)

- **sensible** → prop spawns (pop-in) + payoff animation + story advances.
- **silly** → the prop REALLY spawns and does the gag, then keep/retry.
- **gibberish/empty** → "is that a word?" wobble, no advancement.
- **close miss** ("bridg") → a *Did you mean "bridge"?* chip that accepts it
  (prefix match or edit-distance ≤ 2 against the beat's sensible list).
- **unknown real words** → a kind "the tale doesn't know that one" nudge.

Ending: letter-gem (hero's initial), "Chapter written!", a recap of every
sentence with the chosen word underlined (silly ones flagged), confetti,
and a victory spin.

## "Watch it play"

Fully hands-free: the demo **auto-paints a monster cell-by-cell** (seeded by
a name), starts the story, types a scripted word list at kid cadence —
`banana peel` (a guaranteed silly fail, kept for the recap), `umbrella`,
`unicorn`, `lantern`, `cookie jar` — through to the ending. The button
becomes **Stop the show** mid-run and is always clickable.

## How the seeded generation works

`pixelpal.js` implements everything in ~0 dependencies:

1. `name → FNV-1a 32-bit hash` — the seed. Stable across browsers.
2. `seed → mulberry32 PRNG` — deterministic roll streams.
3. **Monster:** random 6×12 half-grid (row-tuned density) mirrored onto the
   right side — `mask[y][11-x] = mask[y][x]` — plus rolled palette, eye
   style, pupils, antenna, cheeks, fangs, belly.
4. **Scenes:** one stream per area (`seed ^ areaSalt`) grows banded skies,
   twinkling stars (own phase/speed each), drifting run-length pixel clouds
   with parallax, clamped-random-walk hill ridges, trees, flowers, the gap
   ditch, the river, cave crystals, and the little home.
5. **Props:** all ~35 sprites are functions that emit chunky 1px-aligned
   rects — the unicorn's legs even take a `trot` flag for its 2-frame gallop.

**Determinism:** the monster, scene layout, and palette are pure functions
of the seed; only cosmetic animation jitter (confetti, static) is unseeded.
The seed hex shows under the stage (`seed #a1b2c3d4`).

### Engine citation (per spec)

- **Robohash** — github.com/e1ven/Robohash — the ancestor of "text in,
  creature out": it hashes strings into unique robot/monster pictures.
  Ours is the same contract, hand-rolled in JS, plus a real painter so the
  kid can go from generated to handmade.

## How the real version would work

A production build would swap the hardcoded table for a child-safe leveled
dictionary + a "sillyness score", keep the painter grid as the kid's avatar
asset (tiny JSON — 144 cells, syncs trivially), and use the same seeded
pipeline server-side so a child's hero and world follow their profile to
any device. The seeded architecture is already the right shape:
deterministic avatars, zero assets, zero network.
