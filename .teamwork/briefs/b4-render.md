# Brief: b4-render — Render/asset wave 4

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Server: `http://127.0.0.1:8791` (running — don't touch). Browser rules:
`.teamwork/qe/.chromium.lock`, load1<10, MemAvail>2.5GB, one Chromium,
nice it, NO Vulkan (SwiftShader only).

## Your files (exclusive — fix freely)
- `shared/boxing/{fx,scene,entrance}.js`, `shared/boxing/mitts/`
- `assetManifest.json`, `test/qe-runner.mjs` (small harness tweaks OK)
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot), npc.js (b4-e2e),
  lineup-mockups/ + iso-mockups/ (audit only)

## Do — new angles
1. **renderer.info leak counters**: over reset-spam ×30 + win/lose ×10,
   `info.memory.geometries/textures` and `info.programs.length` must be
   flat — scene-child counting (done last wave) misses GPU-resident leaks.
2. **Canvas state corruption**: force mitt.draw() to throw mid-path (bad
   lm/pos injected) — hx save/restore balance must hold; globalAlpha,
   transform, dash state must not leak into the next frame's cues.
3. **Canvas resize/DPR mid-frame**: hc.width change between clearRect and
   mitt.draw — landmark px mapping must stay proportional, never NaN.
4. **entrance.js**: sign values outside the enum, sign flip every frame,
   entrance during orientationchange — pose/avatar must never desync or
   leave a frozen limb.
5. **fx under pressure**: burst/stain/hitStop while gc pressure high and
   dt spikes — pool exhaustion must recycle oldest, never grow unbounded.

## Report
`.teamwork/reports/b4-render.md` + `.teamwork/qe/b4-render-*.json`
artifacts. Run `npm test` at the end.
