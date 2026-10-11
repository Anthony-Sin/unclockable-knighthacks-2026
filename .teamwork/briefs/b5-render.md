# Brief: b5-render — Render/asset wave 5

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Server `http://127.0.0.1:8791` running — don't touch. Browser rules:
`.chromium.lock`, load1<10, MemAvail>2.5GB, one Chromium, nice, NO Vulkan.

## Your files (exclusive — fix freely)
- `shared/boxing/{fx,scene,entrance}.js`, `shared/boxing/mitts/`
- `assetManifest.json`, `test/qe-runner.mjs` (small tweaks OK)
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot — crowd
  renderers + hitFx ink-burst live there; report bugs, don't fix),
  npc.js (b5-e2e), mockup dirs (audit only)

## Do — new angles
1. **cornerHold freeze frame**: during corner hold the scene keeps
   rendering but fight dt=0 — confetti/sweat/stains must not drift
   weirdly, the crowd renderers must keep animating (they're wall-clock),
   and no sprite may be born during the freeze that survives past it.
2. **hitFx ink-burst** (new overlay code): under rapid back-to-back hits
   the burst alpha/radius math must stay finite, reset cleanly between
   bursts (no ink ghost accumulation), and survive heavy=true|false
   alternation. Report-only if in boxing.html.
3. **Mitt draw under context pressure**: force the 2D context through
   font-load misses (new comic text?), extreme canvas sizes (0×0,
   4096×4096), and ctx.filter unsupported — mitt must draw or no-op.
4. **Shadow-map cadence**: `shadowMap.needsUpdate` every 2nd/3rd frame —
   under dt spikes, skipped frames, and weakGpu flips the shadow must
   never freeze permanently or re-render every frame.
5. **entrance.js**: camera track under NaN time, entrance while player
   steps far out of frame, sign poses during cornerHold.

## Report
`.teamwork/reports/b5-render.md` + `.teamwork/qe/b5-render-*.json`.
`npm test` green at end.
