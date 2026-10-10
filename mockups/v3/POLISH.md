# v3 POLISH — playability + motion contract (applies to ALL variants)

The base SPEC.md stands. This addendum defines how every v3 variant must
*feel*: like `variants/v1-roughjs` — a journey that moves FORWARD, with a
grounded hero and wired animation, not a static stage that repaints.

Read `../variants/v1-roughjs/app.js` + `world.js` for the reference feel:
one long crayon panorama the camera pans across; the hero visibly walks,
rides, slips and splats; props are things that happen TO the hero.

## 1. Forward travel (not a static stage)
- Each accepted turn = the hero TRAVELS to the next beat: hero walks/runs
  forward and the world pans/scrolls into the freshly-seeded scene
  (`scene_seed` = the next stretch of the journey: new biome/palette/props).
- The re-render must be a visible transition (walk-off, pan, or wipe
  revealing the new section) — never an instant repaint while the hero
  stands still. The old scene may slide away; the new one slides/grows in.

## 2. Grounded hero + physics
- Hero feet sit ON the ground line at all times (except during a deliberate
  hop/slip arc).
- Minimum physics step: gravity + ground clamp for jumps, slips, bounces.
  Fallen/dropped props fall to the ground and settle (one small bounce),
  fliers bob, heavy props thud. No floating, no teleporting, no skipping
  through the ground or skipping the travel segment.

## 3. Wired animations
- Walk/bob cycle while traveling. RIDE animation when a mountable prop
  appears (hero visibly mounts it). SLIP/spin + splat + stars on silly
  props, then dust-off recover. Wolf huff visibly shakes/pushes the world.
  Props enter with motion (spring pop, drop, slide) — never appear frozen.
- Animations must be short (<~1.2s each) and may not block input forever;
  queue turns if the kid types during a transition.

## 4. Items that DO things
- Every typed word spawns the real thing via the prop library, with a
  generic labeled doodle fallback for unknown kinds (draw a blob/crate
  tagged with the word — never silently skip).
- Props interact: ride mounts, slip causes the gag, obstacles block until
  resolved. At least spawn + one reaction must animate.

## 5. Watch-it-play (must actually work end-to-end)
- Auto-draws a hero, then TYPES the scripted words visibly one at a time,
  plays the WHOLE journey through the REAL LLM (live latency chip each
  call), goal climbs to the payoff, end overlay shows.
- Stop button halts cleanly mid-animation/mid-wait.
- `window.watchItPlay` + `window.stopWatch` MUST be exported (the v3
  dashboard calls them). Keep a `#watchBtn`/`[data-watch]` button too.
- Honest labels: mode chip shows the REAL source — "live LLM" only when
  `_meta.source` is remote/local; "demo mode" ONLY when offline. The
  latency chip shows ms only for real calls (never fake "GLM answered"
  text on offline beats).

## 6. Fully procedural
- No hardcoded narrative, obstacles, or story path beyond the SPEC's
  verbatim goal + scripted demo WORD LIST. All story content from the LLM
  (offline mini-GM only as labeled last resort).

## 7. State display
- goal_progress bar displays smoothly and monotonic-ish — it may dip only
  slightly on explicit fail beats (never teleport 40%→2%); animate the
  fill, don't snap.
- Wolf-pressure meter escalates as turns pass / on huff beats.
- did_you_mean chip and choices row functional.

## 8. Robustness (the "fully working" bar)
- Zero console/page errors on load AND through a full watch run.
- Hero is VISIBLE and present once the story starts (a real element on
  stage, not only inside the maker overlay).
- Maker overlay fully hides on Done; end overlay hidden until win.
- Unknown/edge inputs (empty, 40+ chars, emoji, rapid double-submit)
  handled gracefully.
- Sequential LLM calls only; `llm.waitForHeadroom()` before heavy ops.

## Verification bar (run this yourself before reporting done)
Headless chromium against `http://localhost:8001/v3/<folder>/`:
1. Page + every asset 200; `node --check` clean; zero console errors.
2. A real watch run for ~60-90s must show: narrative text changing each
   turn, mode = live LLM with real latency ms (NOT demo mode on a healthy
   proxy), goal% climbing, hero element present on stage, >=2 prop spawns
   observed, end overlay reached OR goal >=0.9 by the 8th word.
3. Screenshot evidence of the world view (not just the maker overlay).
