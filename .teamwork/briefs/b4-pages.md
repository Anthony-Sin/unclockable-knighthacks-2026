# Brief: b4-pages — Page/tracker wave 4 (NO browser)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Your files (exclusive — fix freely)
- `index.html`, `lineup.html`, `gallery.html`
- `shared/{hands,face,glove,track-worker}.js`, `test/qe-static.mjs`
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot), npc.js,
  lineup-mockups/ + iso-mockups/ (audit)

## Do — new angles (tracker clock, watchdog, worker-death races done)
1. **New double-grace logic** (just landed in hands.js/face.js): the
   `spawnP` promise is now raced TWICE — audit: stop() during grace-2,
   adopt landing between the two races, `_initLocal` vs late 'ready'
   ordering, spawnP 'fail' inside race-2, promise rejection handling of
   the un-awaited spawnP between races. Prove each path in Node with
   mocked Worker/sleep if possible.
2. **track-worker protocol fuzz**: malformed postMessage (missing type,
   garbage landmarks array, NaN bitmap-less frames), init with bogus
   vendorUrl/preferCpu, second init message — worker must not poison its
   landmarker or loop-error.
3. **Boot-partial-failure matrix** (static audit): for each page, list
   every top-level await + import — simulate each module failing alone
   (index: three/mitt/audio; lineup: three/proto; gallery: three) — page
   must still wire its settings/UI or fail visibly, never half-dead.
4. **DOM-state adversarial**: storage-seeded DOM writes (names, prefs)
   with `<script>`-ish strings, emoji/RTL/zero-width — innerHTML sinks vs
   textContent sinks; no injection, no layout break at 320px.
5. **Resize/DPR cascade**: rapid resize×50 + dpr change mid-boot — canvas
   buffers, mitt coords, HUD collision checks stay consistent.

## Report
`.teamwork/reports/b4-pages.md`. Extend `test/qe-static.mjs` with durable
checks for anything you fix. `npm test` + `npm run qe:static` at end.
