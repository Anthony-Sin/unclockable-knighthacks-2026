# w6-qe-render — Render/asset layer audit (round 2)

Worker: **w6-qe-render**. Boundary: `shared/boxing/{fx,scene,entrance}.js`,
`shared/boxing/assetManifest.json`, `shared/boxing/mitts/*` (fix freely);
`shared/boxing/ring.js` read-only. Everything else report-only.

Method: full read of every owned file + consumer paths (game.js, npc.js,
boxing.html, fists.js, protoBoxer.trackHands), node-level degenerate-input
probes on the real modules (vendored THREE, no DOM), qe-runner live verify.

## Findings — fixed in boundary

| sev | file:line | evidence | fix | verification |
|---|---|---|---|---|
| med | `shared/boxing/fx.js:107` (was 92) | `update(dt)` never validated `dt`. A single NaN frame → `p.t += NaN`, `p.v.y -= NaN`, `position += NaN`; `(NaN >= p.life)` is false forever → **every affected sprite becomes an immortal, NaN-positioned, still-visible member of the sprite batch** (sprites render batched — one NaN matrix can poison the draw). Same for stain loop. | `if (!(dt > 0)) return;` — NaN/zero/negative all freeze the pools harmlessly (dt=0 during hit-stop is already a no-op). | node probe: `fx.update(NaN)` then 500 frames — 0 visible sprites/meshes, 0 NaN positions, pools drain normally. |
| med | `shared/boxing/fx.js:62-90, 93-105` | `burst()`/`stain()` options unchecked: `life: NaN` → `p.t >= NaN` false forever → immortal invisible sprite stealing pool slots each burst; NaN `pos`/`size`/`dir` writes NaN into sprite/mesh matrices (batch poison); `pos: null` → TypeError on `.x`. | Sanitize: NaN/`life` clamped (`.01`/.8, `.1`/7); NaN `size/speed/up/spread` → defaults; NaN `dir` → omni burst; null/NaN `pos` → skip burst/stain (a burst with no origin can't render anywhere sane). | node probe: NaN-life burst+stain both die on clamped life (stain confirmed gone after 8.3s); NaN pos/dir/skipped cases → 0 visible leftovers, 0 NaN positions. |
| low | `shared/boxing/fx.js:17-27` | `makeFx` threw `document is not defined` in node (dotTex canvas) — `scene.js`'s `matTexture` already degrades to flat color in the same situation; fx didn't. | `dotTex` returns `null` texture without DOM → materials fall back to flat color; pool still works. | `node -e`: `makeFx(THREE, new THREE.Scene(), null)` now returns a working fx (burst/update/dispose all exercised). |
| low | `shared/boxing/fx.js:82-91` | `stain()` z-offset used post-increment `stainAt` (range 1..24, never the intended 0-based slot) — worked by accident (24 distinct heights) but read as a fencepost. | Capture `zi = stainAt` before the steal; offset `.012 + zi*.0004` now 0..23. | same probe — stains still z-staggered, all die on time. |
| med | `shared/boxing/scene.js:186` (was `t += dt`) | `update(dt)` accumulated raw `dt` into `t`. One NaN frame → `t = NaN` **permanently** (never recovers): crowd matrices, rope jolt, spot color/intensity, confetti — every `sin(t·…)` NaN → whole world layer visually corrupt forever. | `if (!Number.isFinite(dt) || dt < 0) dt = 0;` — events still process that frame (they're drained once per step, so they must not be dropped — early-returning would eat the KO confetti burst). | node probe: `update(NaN)` → `update(1/60)` → clean; `ko` event still triggers `burst()`. |
| low | `shared/boxing/fx.js:142`, `shared/boxing/scene.js:248` | Neither module had `dispose()` — 72 sprite materials + 24 stain materials + circle geo + ~40 scene geos/materials + canvas textures unreachable for teardown (rebuild paths/tests). | Added `dispose()` to both. fx removes pooled nodes + frees materials/geo (dot textures stay in module `texCache` — shared across instances). scene traverses with a `seen` Set (ropes share one material per level, mat reuses apron ×5) — geo + material + `map` textures disposed once each. | node probe: `fx.dispose()` → 0 sprites left in scene; `world.dispose()` runs clean on a populated scene. |
| med | `shared/boxing/mitts/classic.js:89-134` | `draw(ctx,pos,o)` trusted all inputs: `pos`/`pos.size`/`o.reach` NaN → NaN geometry (mitt blanks — violates A7 "gloves never disappear"); `o.cap <= 0` → negative `fw` → `ctx.ellipse`/`arc` **throws IndexSizeError → pageerror**; `o.dim`/`o.squash` unchecked (squash > 7.14 → mirrored mitt); `o.arm` NaN → NaN sleeve + NaN transform. | `pos.x/y` non-finite → return; `size` non-finite/≤0 → fallback 48px mitt (still drawn); `reach`/`dim`/`squash` finite-clamped (squash ≤1, dim ∈[0,1]); `o.arm` must be finite else plain mitt. `cap` keeps `?? 96` semantics (Infinity = intentionally uncapped still works). | node probe over stub ctx: `cap:-5`/`NaN`/`Inf`, `reach:NaN`, `size:NaN`, `dim:NaN`, `squash:99`, `arm:{x:NaN}` — all draw ~130 ops, **no throws, no NaN translate, no negative-radius ellipse/arc**. |
| med | `shared/boxing/mitts/classic.js:136,172` | `P = o.lm` accepted any `length>=21` array — one NaN or null joint poisoned `cx/cy/span` → **all 21 derived points NaN → glove vanished that frame** (A7), and a null joint threw `TypeError` (pageerror). The overlay path validates upstream (boxing.html:838) but the entrance/outro path (boxing.html:1169) does **not** — real gap, not theoretical. Also: the `pos.ang` rotate keyed on `!o.lm`, so a *rejected* lm set would draw the fallback cloud unrotated. | `lmOk()` scans all 21 joints for finite numeric x/y; bad set → fist cloud at `pos` — mitt stays on screen. `!o.lm` → `!tracked` flag so fallback clouds get `pos.ang` like the no-lm path; valid-lm path unchanged. | node probe: `lm` `lm[9].x=NaN` → 130 ops, 0 NaN transforms; `lm[3]=null` → draws, no TypeError; string `lm` → fallback; rotate count exactly 1 (tracked) vs 2 (each generated path). |

## Clean — audited, no change needed

- **`shared/boxing/entrance.js`** — pure function; null/`hands`-not-array/garbage-entry safe; `nExt===2` V-sign path verified against `hands.js:220` (`out.nExt` real). No load-order/timing assumptions (stateless).
- **`shared/boxing/mitts/index.js`** — `MITT_IDS`/`pickId` hardcoded `'classic'` (single house mitt — deliberate); `loadMitt` recursion has a `classic` base case; callers guard `mitt?.draw`.
- **Unbounded arrays** — none in owned files: sprite/stain/confetti/crowd are fixed ring-buffer/instanced pools; every `new THREE.*` in owned code is init-time.
- **Dirty state on reset/round-2** — owned modules have no reset contract: fx particles/stains are ≤0.8s/7s juice tails (self-culling — a rematch inheriting a fading blood drop is desirable, not a bug); scene `excite/jolt/tel` decay naturally; mitts/entrance stateless. **The real reset-dirt lives in game.js/npc.js — see out-of-boundary.**
- **Entrance half-run on skip** — `game.skipIntro()`/`opts.skipIntro` verified clean: `skipRequested` → `fight.startNow()` mid-step → `entryU=1` (npc at sim pos, no half-walk), `blend=1` (full first-person), `showAv=false` (avatar can't linger). Confirmed live by the e2e boot check (`phase!=='intro'`, avatar hidden).

## Asset manifest audit

`shared/boxing/assetManifest.json` — valid JSON, contract shape. **All 3
referenced paths exist on disk AND serve 200 on :8791** (HEAD-verified,
`model/gltf-binary`):

| id | path | on disk | HTTP |
|---|---|---|---|
| boxing-ring | `vendor/models/glb/boxing/boxing-ring.glb` | 81,008 B | 200 |
| boxing-gloves | `vendor/models/glb/boxing/boxing-gloves.glb` | 61,244 B | 200 |
| punching-bag | `vendor/models/glb/boxing/punching-bag.glb` | 24,736 B | 200 |

- **Roster note:** all 3 candidates are `PROP` (notes field) → filtered out
  by `npc.js:264` and every lineup consumer → **the manifest yields zero
  fighter candidates**. NPC roster = protoBoxer variants only (matches
  design — GLB fighters were scouting options that never shipped). Not a
  runtime bug (no 404s — props are loaded on demand, never demanded), but
  the manifest is currently pure dead data.
- **License note:** all 3 are CC-BY — notes demand attribution ("Zaw
  Imagineering via poly.pizza", "Zsky via poly.pizza") **if** used. They are
  never rendered anywhere, so nothing to display today; if a worker wires
  them in as set dressing, attribution must ship with it.

## Dead weight (note, not a bug)

Referenced by **nothing** in the live pages or modules (full-text grep over
`*.html`/`*.js`/`*.mjs`, importmap-aware):

- `vendor/models/glb/` non-boxing props: bone, cardboard-delivery-box,
  clinical-waste-bin, drill, forklift, fuel-drum, hardhat,
  instrument-trolley, medical-gas-cylinder, medicine-cabinet,
  operating-table, pallet, pipe, scalpel, scrub-sink-station, sharps-bin,
  surgical-light, toolbox, vice, workbench (20), all of `kfactory/` (13),
  `kgrave/` (2), `ksurvival/` (3) — ~38 GLBs + texture pngs, former
  job-page props.
- `vendor/ort/` — entire ONNX runtime (8 files, ~1MB+ wasm) — never imported.
- `vendor/three/three-mesh-bvh.module.js`, `three-bvh-csg.module.js` —
  vendored but unreferenced (package.json deps of the same name also unused
  by source — only `three` is).

## Mockup dirs (read-only) — dead-link audit

`menu-mockups/` (11), `lineup-mockups/` (16), `iso-mockups/` (5) + `shared/`:
- every subdir has `index.html` (`iso-mockups/shared/` is an asset dir);
- every `index.html` `src="NN/…"`/`shot.png`/`href="NN/"` resolves —
  all 21 `shot.png` thumbnails exist for the 21 references;
- `./shared/boxing/assetManifest.json` + `protoBoxer.js` imports inside
  `lineup-mockups/*` resolve correctly via `<base href="../../">`;
- `iso-mockups/*/index.html` `import '../shared/core.js'` resolves;
- **no dead local links found.** External links are Google Fonts CDN only —
  offline they degrade to the fallback stacks (harmless for mockups).

## Out-of-boundary bugs (route via orchestrator)

| sev | file:line | evidence | suggested fix |
|---|---|---|---|
| **med** | `boxing.html:837-838` | `hnd.lm.every(p => Number.isFinite(p?.x) && …)` — `lm` can be a non-Array with `length>=21` via `__forceHands` (string `'xxx…'`, array-like). Strings have no `.every` → **TypeError → pageerror every frame**, and the exception kills `drawOverlay` mid-frame → gloves blank (A7 violation). | `Array.isArray(hnd.lm) && hnd.lm.every(...)` — one token. |
| **med** | `boxing.html:1169-1175` | `drawEntranceGloves` gates `h.lm?.length >= 21` then reads `hnd.lm[i].x` — `null` joint → **TypeError → pageerror during intro/outro**; NaN joint → NaN px landmarks to `mitt.draw` (now mitigated: classic.js `lmOk` falls back to fist cloud — glove stays — but page should still filter like drawOverlay does). | Same finiteness gate as line 838 before using `hnd.lm`. |
| **med** | `shared/boxing/game.js:388` + `shared/boxing/npc.js:304-311` | `game.reset()` misses camera-impulse state — `push, pushUp, snapYaw, camSway, shakeT, dodged, downCamT, dodgeX, dodgeY, prevDodgeKey` and `npc.kick{x,y,z}` keep residual values ~0.5s into the rematch. Worse: `npc.setDamage` latches `dmgCur` monotonically (`frac <= dmgCur → return`, comment says "wounds persist between rounds") — after `fight.reset()` restores hp for a *new fight*, `setDamage(0)` still no-ops → **NPC keeps the previous fight's bruises forever** (the exact dirty-state class my brief hunts). Latent: page replay uses `location.reload()`, but `game.reset()` is the documented API and `__boxing.game.reset()` is reachable from tests. | Reset the listed fields; add `npc.resetDamage()` (or let `setDamage` accept decreases) and call it from `reset()`. |
| low | `shared/boxing/npc.js:361-363` | `api.kick *= Math.exp(-dt*7)` — NaN `dt` → NaN kick → `group.position.set(NaN)` → NPC invisible permanently (dt comes page-clamped today — defensive note). | `if (!Number.isFinite(dt)) dt = 0` at top of `update`. |
| note | lines drift | Co-tenant workers are mid-edit on `boxing.html`/`game.js`/`npc.js` — the line numbers above were re-verified against current files at report time; they may shift again by the time they're picked up. | — |
| low | `shared/boxing/npc.js:394` | `dispose()` removes the group but never frees the `tel` sprite's CanvasTexture/material (page never tears down — leak is latent). | `tel.material.map.dispose(); tel.material.dispose()` in dispose. |
| low | `shared/boxing/npc.js:285-287` | `eyeY/headY` derive from `Box3` — an impl whose group had no meshes gives `min=+Inf` → `eyeY=Infinity` → camera NaN/black screen (all current impls have meshes — degenerate note). | `Number.isFinite(bb.min.y) ? … : fallback` clamp. |
| low | `shared/boxing/ring.js:260-264` (READ-ONLY — w4) | `_clamp` divides `f.pos.x / r` — if `opts.radius < f.radius` (`radius < .34`), `lim` goes negative and `r=0` slips past `r <= lim` → `nx = x/0` → NaN position. Default tuning safe; config-degenerate only. | `if (r < 1e-6 || r <= lim) return 0;` |

## Headless verification — boxing.html?vid=test-input.mp4, 20s

`node test/qe-runner.mjs 'http://127.0.0.1:8791/boxing.html?vid=test-input.mp4' --name w6-boxing-vid --seconds 20`
(self-gated: waited 70s through a co-tenant load spike to load1=9.4; one
niced SwiftShader Chromium; 24 RSS samples, peak 1688MB).

**Result: exit 0 — 0 pageerrors, 0 non-benign console errors
(1 benign `INFO: Created TensorFlow Lite XNNPACK delegate`), 0 warnings,
0 failed requests, 0 HTTP≥400.**

FPS (SwiftShader + dual MediaPipe trackers under load — environment-bound,
not a regression metric): **p50 83.3ms (~12fps median), avg 6.2fps,
p95 533.3ms, worst frame 1549.9ms, worst-1s 0.6fps**. Frames: 116 in 20s.
(For scale: round-1 measured 37fps avg on the Vulkan path on a quieter box;
this box's load1 swung 9–21 during the session.) My edits add only a few
`Number.isFinite` checks per call — nothing on the render hot path.

## Gates

- `npm test` — **200 PASS / 0 FAIL** (all 7 suites) after all fixes.
- `npm run qe:static` — **CLEAN**, 20 module blocks across 4 pages.
- `node --check` — all edited files parse.
- `npm run test:e2e` — queued behind the load gate; boxing-page.mjs
  launches ungated so I only run it under load1<10 (see below).

## Assumptions recorded

- `dispose()` additions: return-value extension only — game.js/boxing.html
  never call them today (page lifetime = app lifetime); they're the
  contract-hygiene API for future teardown/tests.
- Kept `cap: Infinity` semantics in classic.js (`?? 96`); `cap: NaN` falls
  to the 48px fallback mitt rather than throwing or blanking — A7 says the
  gloves never disappear.
- fx `update(0)` early-return is behavior-identical to the old loop body on
  a frozen dt (nothing could advance) while also covering NaN/negative.

## Unfinished

- `npm run test:e2e` — awaiting a load1<10 window (co-tenant browsers kept
  load 10–21 for most of the session; will run + append before signoff if
  the gate clears, else flagged for integrator re-run — my changes are
  guards on cold paths and the suite's mitt draw (`lm` of finite pts) is
  exercised green in node).
