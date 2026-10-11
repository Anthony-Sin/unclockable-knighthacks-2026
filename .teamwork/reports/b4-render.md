# b4-render — Render layer wave 4 (GPU-leak counters + canvas-state integrity)

Worker: **b4-render**. Boundary: `shared/boxing/{fx,scene,entrance}.js`,
`shared/boxing/assetManifest.json`, `shared/boxing/mitts/*`, small harness-only
fixes in `test/qe-runner.mjs`. `boxing.html`/`game.js`/`npc.js`/`qe-e2e.mjs`/
`boxing-page.mjs` read-only. Server :8791 left untouched.

Method: full re-read of owned files + consumers (`game.js`, `npc.js`,
`boxing.html`, `protoBoxer.js`), node-level adversarial probes on the real
modules (vendored `three.module.js` r170 + stub canvas ctx with
throw-at-every-op fault injection), live puppeteer probe on the :8791 server
(serialized on `.teamwork/qe/.chromium.lock`, niced, SwiftShader-only,
resource-gated), `npm test` + `qe:static` + `test:e2e` wall.

## Findings — fixed in boundary

| sev | file:line | evidence | fix | verification |
|---|---|---|---|---|
| P3 | `shared/boxing/scene.js:278` (in `dispose`) | **InstancedMesh GL buffers never freed.** r170's `WebGLGeometries.update` registers `onInstancedMeshDispose` per instanced mesh; the ONLY path that calls `attributes.remove(instanceMatrix)`/`(instanceColor)` is the mesh's own `dispose()` event (`three.module.js:18175`). Our traverse disposed `geometry`+`material` but never called `o.dispose()` → each `buildScene()`+`dispose()` cycle leaked 4 GPU buffers (crowd 150×16+150×3 floats, confetti 90×16+90×3) until context loss. Invisible in `info.memory.geometries` (that counter only tracks BufferGeometry), so the drift shows up as VRAM, not the counter — real leak, wrong instrument. | `if (o.isInstancedMesh) o.dispose();` inside the traverse before geometry disposal. | node probe (real THREE): `dispose()` fires the `dispose` event on both instanced meshes (crowd+confetti); geometry dispose count = 30 unique geos, materials/maps freed. |
| P4 | `shared/boxing/scene.js:266` | **`dispose()` not idempotent.** `BufferGeometry.dispose()` dispatches `'dispose'` unconditionally — a second call decrements `info.memory.geometries` a second time → counter drifts **negative** (qe-e2e's `J: dispose() is idempotent` asserts this on npc; same contract applies to the world). | `disposed` latch — second+ call is a no-op. | probe: `w.dispose(); w.dispose(); w.dispose()` → geometry-dispose count frozen at 30, instanced disposes at 2. |
| P3 | `shared/boxing/mitts/classic.js:122-135,186-256` | **save/restore imbalance on mid-path throw.** The mitt pushes 3–5 nested `ctx.save()` frames per draw (arm fallback, main transform, shadow pass, cuff). Any throw inside — a missing `ctx.roundRect` (Blink<99/Safari<16), a hostile/stub ctx, an OOM inside `ellipse` — unwound with saves still on the stack → `globalAlpha`/`transform`/`lineCap` leaked over every later overlay cue on the shared `#hands` canvas until something restored by luck. | `try/finally` around **every** save scope: arm-anchored block, shadow pass, main transform body, cuff pass. `roundRect` → `ctx.rect` fallback when absent. | stub-ctx probe, fault injected at **every one** of 124 (lm path) / 134 (arm path) ctx calls: save/restore depth identical after every throw; `globalAlpha`/transform/`getLineDash`/`globalCompositeOperation` all pristine vs a fresh ctx; the *next* draw inks 3k+ px. |
| P3 | `shared/boxing/mitts/classic.js:155-168` | **Rescale overflow → NaN path geometry → blank mitt (A7).** `lmOk` accepts every finite joint, but `|x|~1e305` px joints overflow `(P[i]−cx)·k` to `Infinity`/`NaN` in the scratch cloud — canvas silently no-ops every path call → the glove disappears for the frame. Anchor-only check (first revision) missed a single hot mid-joint. | Whole-cloud finite scan after the rescale; on poison, refill `SCR_P` from the `FIST` cloud and mark `tracked=false` so `pos.ang` applies. | node probe: `lm[10].x=1e305` px → 130 finite ctx calls, 0 NaN; `|x|*400` overflow, ring-joint overflow, NaN joint, all-`1e308` cloud — all draw clean. |
| P3 | `shared/boxing/mitts/classic.js:95-96` | **Absurd-but-finite origin still poisons blobPalm.** `pos={x:1e308,y:-1e308}` passes the `isFinite` entry guard; the FIST-cloud anchor `pos.x + FIST[i]*size` stays finite, but `blobPalm`'s centroid `Σ/6` overflows to `Infinity` → `(p−cx)*k = -Infinity` → 78 non-finite `moveTo`/`quadraticCurveTo` args per draw (measured on the stub ctx) — the mitt blanks and the path is junk anyway. | Clamp local `px/py` to ±1e6 at entry (caller object untouched): a glove centered past ±1e6 px is off every screen, so the clamp is lossless; every downstream centroid/translate now stays finite. `pos.ang`/`pos.size` still read from `pos`. | stub ctx: `posHuge`, `posHugeArm` cases → 0 NaN args, full draw; regression battery (degenerate size/cap/dim/reach/squash/bogus arm/kind) all clean. |
| P4 | `shared/boxing/mitts/index.js:12` | `loadMitt(id)` interpolated `id` straight into `import(\`./${id}.js\`)` — an off-rack id (`'../../etc/x'`) traversed out of `mitts/`. | Whitelist: `if (!MITT_IDS.includes(id)) id = pickId()`. | node: `loadMitt('../../server')` → `classic`, `loadMitt('nope')` → `classic`, `loadMitt()`/`loadMitt('classic')`/`loadAllMitts()` unchanged. |
| P4 (harness) | `test/qe-runner.mjs:51-57,139` | `--gpu` armed Vulkan flags (`--use-angle=vulkan --enable-features=Vulkan …`). On this box Vulkan makes WebGL2 unavailable outright — a run with `--gpu` produces a broken page, not a faster one. Wave rules: SwiftShader only. | `--gpu` now warns + stays on SwiftShader; `gpuRequested` recorded in the JSON artifact so a forced-vulkan run can't masquerade as GPU-verified. | `node --check` clean; the flag is still accepted (CLI compat). |

## Wave-angle coverage

| required angle | what I did | result |
|---|---|---|
| GPU leak counters — reset ×30 + win/lose ×10 | Live probe on :8791 (`?notrack=1`): sampled `ren.info.memory.{geometries,textures}` + `info.programs.length` + scene children, then `game.reset()` ×30, then `fight._ko('npc'/'player')` → verdict → `game.reset()` ×10 alternating | **baseline geo 80 / tex 2 / prog 7 / kids 107 → reset×30: geo 148 / tex 2 / prog 7 / kids 107 → cycles×10: geo 149 / prog 8 / kids 107.** The growth is **first-render registration, not a leak** — proven three ways: ① `scene.children` stayed **107 flat** the whole run (no objects added — the geos were already in the scene, just unrendered); ② per-reset zoom (`b4-render-leakzoom.json`): `reset()` ×8 → geo deltas `[−2,0,0,0,0,0,0,0]` (countdown glyphs disposed on #1, then dead flat), KO+reset ×4 → `[+1geo/+1prog,0,0,0]` (confetti first-upload once); ③ node build+render+dispose cycles return counters to 0 every cycle. `?notrack` boots straight to `countdown`, so the player avatar (~68 geos) first uploads on the first `reset→intro` — in the slow (1fps) zoom run even that upload hadn't happened (geo 78). VERDICT in artifact: "first-render registration, then flat — NOT a leak". |
| canvas save/restore on mid-path throw | fault injection at every ctx op index (stub ctx) + live probe on a real 2d ctx with `stroke` poisoned mid-draw → asserts throw propagates, alpha/transform/dash/composite restored, next draw unaffected | node 31/31; live: `{"threw":true,"alpha":true,"transform":true,"dash":true,"comp":true,"ink":8218}` |
| resize/DPR mid-frame | `hc.width/height` only mutate in `resize()` (synchronous rAF-safe) — the interleave can't occur in-page; verified the owned half: `mitt.draw` at any dims keeps proportional landmark→px mapping, finite transforms, clean ctx | live probe: 800×600→390×844 mid-"frame" → `{"ink":5240,"finite":true,"alpha":true}` |
| entrance: bad signs, flips, orientation | `entrance.js` is a pure mapper — 1000 sign flips + garbage inputs all land in the enum; orientation is computed per-frame by the caller (game.js — verified recomputes `entryU`/`pose` from `introU`+`sign` every step, no cached limb state). No in-boundary defect. | node+live: 0 non-enum returns over 1.5k torture calls |
| fx pool: GC pressure, dt spikes | node hammer: 400 cycles of `burst({n:500})` (>POOL_N), `n:Infinity`, NaN args, `stain(life:NaN)`, `update(1e9)` spikes + `update(NaN)`; live `makeFx` soak on a real scene graph | children frozen at 96 (72+24), 0 NaN transforms, everything drains on huge dt, `dispose()` empties the scene — live `{"kids":96,"bad":0,"vis":0,"afterDispose":0}` |
| `scene.dispose()` contract | live: fresh `buildScene` → `ren.render` → `dispose()`×2 on the real renderer | geo counter 149→159→149 — **all** scene geometries released, instanced dispose event fired ×2, idempotent second call |

## Gates

- `npm test` — **115 passed / 0 failed** (after all edits).
- `npm run qe:static` — **CLEAN**, 20 module blocks across 4 pages.
- `node --experimental-default-type=module --check` — clean on all edited files.
- `npm run test:e2e` — `boxing-page.mjs` **14/14 PASS**; `qe-e2e.mjs`
  **83/90** — every render-layer check green (incl. `G: reset spam ×20`,
  `E/F: glove dropout`, `J: dispose idempotent`, `N: same-tick reset+skipIntro`).
  The 7 fails are outside my slice: `L: boxing:ko` stat-shape normalization ×4
  (fight/storage domain), `N: bout resolves` timeouts ×2 + `P: 404` ×1 —
  consistent with concurrent mid-edit churn on `boxing.html`/`npc.js` by other
  workers during that run (served HTML was observed transiently broken —
  `ReferenceError: buildScene is not defined` — while clean on disk 90 s
  later). Re-run recommended after the pages/fight slices settle.
- Live probe — `.teamwork/qe/b4-render-live.json` — **13/16 PASS**; the 3
  "fails" are the raw counter-flatness asserts, explained in the wave-angle
  table above (first-render registration: avatar +68 on first `intro`, KO
  confetti +1 geo/+1 prog on first `ko` — then flat; steady-state per-reset
  delta = 0, node-proven).
- Per-reset zoom — `.teamwork/qe/b4-render-leakzoom.json` — **completed**:
  `reset()` ×8 → geo deltas `[-2,0,0,0,0,0,0,0]` (−2 = countdown glyph
  disposal on #1; then dead flat), KO+reset ×4 → geo `[+1,0,0,0]` /
  prog `[+1,0,0,0]` (confetti first-upload once, then flat across all later
  cycles). VERDICT in artifact: "first-render registration, then flat —
  NOT a leak".
- One earlier probe run reached the page during a ~90 s mid-edit window of
  `boxing.html` (b4-pages' dynamic-import rewrite in flight) and caught
  `ReferenceError: buildScene is not defined` from the transient half-written
  file — served file verified coherent on disk 90 s later; not a product bug.
- Node probes — `.teamwork/qe/b4-render-node.json` — **45/45 PASS**.

## Assumptions recorded

- `scene.dispose()`/`fx.dispose()` stay teardown-only APIs — nothing calls
  them on `game.reset()` (world is built once, page lifetime = app lifetime).
  The InstancedMesh fix matters for future rebuilds/tests and the e2e
  dispose-idempotence contract.
- The `--gpu` flag is kept accepted-but-neutralized rather than removed —
  outside callers may pass it; the JSON records `gpuRequested` so intent
  isn't lost.
- `hc.width`/`hc.height` mid-`drawOverlay` mutation is impossible in-page
  (single-threaded; `resize()` is the only writer) — verified the owned
  surface (`mitt.draw` dims-independence) instead of editing read-only
  `boxing.html`.
- `loadMitt` whitelist uses `MITT_IDS` — new rack entries must register
  there anyway, so no caller changes needed.

## Out-of-boundary findings (report-only)

| sev | file:line | evidence | routed to |
|---|---|---|---|
| P4 | `test/qe-e2e.mjs` (L checks) | `boxing:ko` storage accepts primitive `5`/`"x"`/`{n:"a"}` verbatim — recorded stat isn't normalized to `{n,sum}` before write. | fight/storage owner |
| P4 | `shared/boxing/npc.js:121` | `impl.dispose()` protoBoxer path: `o.material?.dispose?.()` skips **material arrays** (`o.material` array has no `.dispose`) — if a rig ever ships multi-material meshes, those materials leak. No instanced meshes in protoBoxer today → no live leak observed. | npc owner |

## Unfinished

- Nothing in-boundary remains open. Only cross-wave hygiene: a settled-tree
  `npm run test:e2e` re-run is worthwhile once co-tenant workers finish
  editing `boxing.html`/`npc.js`/`game.js` (previous run caught transient
  mid-edit failures outside my boundary).
