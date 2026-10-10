# Fill the Tale — Monster Maker edition (v2 · DiceBear)

One of seven "Fill the Tale" mockups for **Pip & the Storywood** (KnightHacks 2026).
A kids' literacy game: the child **builds a monster hero**, then types words into
story blanks — and every word *literally spawns something* in a paper-craft
sticker diorama. Sensible words move the story forward. Silly words spawn the
real silly thing — and the monster pays for it.

**This variant's engine: [DiceBear](https://github.com/dicebear/dicebear)** —
the procedural avatar generator (MIT). The hero and every support character are
generated monsters, not drawn assets.

## Run it

Serve the `mockups/` root (one level up) and open this folder:

```
cd ../..                     # the mockups/ directory
python3 -m http.server 8000
# → http://localhost:8000/variants/v2-dicebear/
```

No build step. Plain HTML/CSS/JS + ES modules, works offline.

## How the DiceBear seeding works

- `@dicebear/core` + `@dicebear/bottts` are **vendored** under `vendor/dicebear/`
  (MIT licenses kept in each folder). An `<script type="importmap">` in
  `index.html` maps the bare package names to the local ESM files.
- `createAvatar(bottts, { seed, ...options })` → deterministic SVG.
  **Same seed = same monster, always.** DiceBear hashes the seed into an
  xorshift PRNG (`core/lib/utils/prng.js`), then draws every pick — face shape,
  eyes, mouth, antenna "top", ear "sides", texture — from that stream.
- **The kid's name IS the seed.** Typing "Maya" builds `seed: "monster-maya"` →
  Maya's monster is identical on every visit and every machine. The monster's
  name also becomes the hero's name in the story sentences.
- **Option chips constrain the stream.** The maker's Body / Eyes / Headgear /
  Mouth chips pass single-value arrays (`eyes: ['happy']`, `top: ['horns']`,
  `baseColor: ['ff6b57']`) — DiceBear still PRNG-picks whatever the kid didn't
  pin down (face, sides, texture), so chips *steer* the generator rather than
  replacing it. Clicking a chip again un-pins it.
- **"Surprise me!"** rolls a name from a silly list — which still seeds
  deterministically, so "Waffles" is always the same Waffles.
- **Support characters are seeded too:** `"pal-duck"`, `"pal-unicorn"`,
  `"pal-firefly"` force friendly eyes/mouth/colors and get a hand-drawn
  accessory (beak, horn, glow). Any other animal word (`"pal-whale"`…) grows a
  seed-colored buddy with a float ring. Even the shruggy "doesn't get it" pal
  (`"pal-huh"`) is generated. The letter-gem's letter is seed-derived as well.
- Avatars are injected as inline `<svg>` so CSS keyframes can squash, spin,
  splat and ride them.

## The game

- **Beat 0 — Monster maker:** name-seed hatching, option chips, surprise roll.
  The kid's own monster walks every beat of the chapter.
- **Beat 1 · blocked path:** type `bridge`, `log`, `vine`, `ladder`,
  `trampoline`… → that prop spawns on the boulder and the hero crosses
  (arcs, swings, bounces, hops depending on the word).
- **Beat 2 · rainstorm:** `umbrella`/`raincoat`/`mushroom` is held overhead
  while the hero waddles through animated rain. `paper bag`/`toast`/`sponge`
  → soggy gag: the prop literally droops into mush.
- **Beat 3 · the river:** `boat`/`raft`/`canoe` spawn floaters; animal words
  (`duck`, `unicorn`, `fish`, `turtle`, `dragon`, or any creature) spawn a
  **generated monster pal** that the hero visibly mounts and rides across.
  `toaster`/`fridge`/`anvil`/`piano` → sinker gag with a big splash.
- **Beat 4 · dark cave:** a darkness overlay covers the scene; `lantern`,
  `torch`, `flashlight` or a `firefly` pal punches a real screen-blend
  spotlight through it that follows the hero. `ice cube`/`soggy match` →
  fizzle gag.
- **Beat 5 · home:** `door`/`key`/`cookie jar`/`gift`/`treasure chest` →
  payoff animation, the cottage door opens, the hero shrinks inside,
  letter-gem + recap card of every word chosen (plus a "bonus giggles"
  row listing the silly words that were survived).
- **Word logic:** per-beat `sensible` / `silly` tables plus global stink/spook
  gags that work anywhere. Close-miss a sensible word ("bridg") → a
  **"Did you mean 'bridge'?"** chip (edit-distance ≤2) that fills it in.
  Gibberish → gentle "is that a word?" wobble. A *real* word that isn't in the
  table spawns a confused generated pal who shrugs and wanders off — even a
  wrong guess always spawns something.
- **Watch it play:** hands-free demo — types the name "Ziggy", picks chips,
  then plays the whole chapter at kid-typing cadence: a misspelling →
  did-you-mean tap, a `paper bag` soggy fail, a `toaster` splash fail, a
  `unicorn` pal ride, `firefly`, `cookie jar`, ending. Button becomes
  **"Stop the show"** mid-run and hands control back.

## How the real version would work

The monster's seed + picked options would live on the kid's profile, so their
same hero follows them home — DiceBear also renders PNG data-URIs for sticker
print-outs. The hardcoded reaction tables would become a child-safe word
classifier (dictionary + small model for *sensible / silly / unknown*, with
moderation before a word can land on the page), the did-you-mean would use a
real phonetic+edit-distance speller, and the blank would accept speech input
for pre-readers. The part that's already genuinely real in this mockup: every
hero and every pal is procedurally generated — no two kids' stories star the
same cast.

## Credits

- [DiceBear](https://github.com/dicebear/dicebear) by Florian Körner — MIT
  (see `vendor/dicebear/*/LICENSE`). Style: **Bottts** by Pablo Stanley.
- Fonts: Fredoka, Patrick Hand, Nunito via Google Fonts.
