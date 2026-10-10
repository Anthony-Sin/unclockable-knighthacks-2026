# Mockup Conventions — "Pip & the Storywood"

All 7 mockups demo the same fictional product: a kids' literacy game where
**Pip**, a kid-drawn monster, travels through **Storywood** collecting
**letter-gems** to finish a bedtime story. Each mockup demos ONE input
modality. Everything is front-end only and hardcoded — no backend, no real AI.

## Tech rules
- Plain HTML + CSS + vanilla JS. NO build step, NO bundler, NO framework install.
- Entry point must be `index.html` inside your assigned folder.
- Must work when served via `python3 -m http.server` from the `mockups/` root
  (use relative paths; camera/mic features get localhost permissions this way,
  but ALWAYS provide a manual fallback path in case permission is denied).
- Everything must persist as static files — nothing may depend on a running
  process, external API, or AI service. Fake/AI steps are hardcoded.
- You MAY use Google Fonts via CDN link (with system font fallbacks).
  No other external runtime dependencies.

## Look & feel (IMPORTANT — avoid generic "AI slop" aesthetics)
- Warm paper-like background (e.g. `#FFF8EC` / `#FDF3E3`), NOT purple gradients,
  NOT glassmorphism, NOT dark neon.
- Playful modern kids' UI: chunky rounded corners (border-radius 16-28px),
  thick outlines (2-3px, often near-black `#2B2118` or deep brown), solid
  saturated accent colors (coral `#FF6B57`, sun yellow `#FFC53D`, leaf green
  `#4FB06D`, sky `#5DA9E9`, berry `#B565D8` used sparingly).
- Hand-drawn/round type: headings 'Fredoka' or 'Baloo 2'; handwriting accents
  'Patrick Hand' or 'Caveat'. Readable body font for kid text.
- Sticker/doodle energy: slight rotations (-3deg..3deg) on cards, dashed
  outlines, squiggly SVG underlines, sticker-style white borders with shadow.
- Micro-motion: springy `cubic-bezier(.34,1.56,.64,1)` pops, gentle bobbing
  animations, confetti/sparkle on success. Keep it snappy (<400ms).
- No emojis in the UI. Draw things with SVG/CSS instead.
- All copy must be real, short, kid-friendly English — no lorem ipsum,
  no placeholder text.

## Structure of every mockup
1. A hero/title moment (product name + modality name).
2. The interactive input demo (the star of the mockup).
3. A hardcoded "it worked!" payoff where the story advances — e.g. the drawn
   character joins Pip, a letter-gem is earned, the next story line appears.
4. A small `README.md` in your folder: what it demos, how to run, and one
   paragraph on how the real version would work.

## Boundaries
- Work ONLY inside your assigned `mockups/NN-name/` folder. Do not touch
  sibling folders, `index.html`, `README.md`, or `CONVENTIONS.md` at the
  `mockups/` root.
