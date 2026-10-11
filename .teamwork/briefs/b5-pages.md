# Brief: b5-pages — Page/tracker wave 5 (NO browser)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Your files (exclusive — fix freely)
- `index.html`, `lineup.html`, `gallery.html`
- `shared/{hands,face,glove,track-worker}.js`, `test/qe-static.mjs`
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot), npc.js,
  mockup dirs

## Do — new angles (double-grace/protocol fuzz/partial-boot/storage-XSS/
resize done)
1. **grace-3 verdict-wait** (just landed — verify): the `bootMs*3`
   dead-man cap — prove create() resolves on silent-dead workers, pump
   arms, no inline builds before the cap, late-'ready' still adopts
   post-inline. Extend the Node probes in qe-static if holes remain.
2. **glove.js deep audit**: the glove-math module is barely touched —
   freeze/proxy/NaN inputs, every exported fn's domain, edge shapes.
3. **gallery.html**: the least-tested page — storage-corrupt gallery
   state, missing assets in manifest, rapid open/close cycles,
   keyboard nav, empty-vs-corrupt career stats rendering.
4. **Rapid create/stop cycles**: Hands.create→stop×20 interleaved with
   'ready' emissions at every lifecycle point — no zombie workers, no
   resurrected landmarkers, stats consistent (probe-able in Node).
5. **CSS/media-query correctness**: prefers-reduced-motion,
   prefers-contrast, forced-colors — any animation that must degrade;
   focus-visible states on all interactive elements (audit, fix CSS).

## Report
`.teamwork/reports/b5-pages.md`. Extend `qe-static.mjs` durably.
`npm test` + `npm run qe:static` green at end.
