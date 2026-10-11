# w5-qe-soak — Browser soak / leak / mode-matrix QE (round 2)

Date: 2026-10-11 · Server under test: `http://127.0.0.1:8791/` · Chromium 153, headless.
Artifacts: `.teamwork/qe/w5-*.json` (+ `w5-notrack.png`, `w5-gpu-ctx.png`).
Probes (throwaway): `/tmp/w5/{harness,reload,edge,throttle,mobile,handoff,gpuctx,glmin,overflow}.mjs`.

## Findings

| sev | file:line | finding | evidence | suggested owner |
|-----|-----------|---------|----------|-----------------|
| P1 | `boxing.html:345` | `new THREE.WebGLRenderer` is **uncaught** — when WebGL context creation fails the whole module dies → black page, no game, no user message. Reproduced live on the Vulkan path today. | `w5-soak-boxing-vid.json` (pageerror `Error creating WebGL context`, console `context could not be created / blocked`), `w5-gpu-ctx.json` (`phase=null`, no `game`/`ren` after 18s), `w5-gpu-ctx.png` | w7-qe-e2e |
| P1 | `lineup.html:441` | Same pattern — renderer ctor uncaught → module dies → static HTML with dead tabs/buttons. Contrast: `index.html:729-730` guards with a probe `getContext` + early return. Suggest same guard + a visible "no WebGL" state on both pages. | same root cause as above; code inspection | w9-qe-pages |
| P2 | `index.html:157-159`, `index.html:70` | Horizontal overflow @390px viewport: `scrollW=399 > clientW=390` (9px). `#ring-canvas` `width:100%` on `position:fixed` = ICB incl. scrollbar → 399px; `.comic-halftone` `inset:-40px -60px -30px` bleeds past parent un-clipped; `.tut-label` right edge 398.8. Fix: `overflow-x:clip` on body/html or clip the halftone's parent. | `w5-mobile-matrix.json` (`horizOverflow:true`), `w5-index-overflow.json` (offender rects) | w9-qe-pages |
| env | — | **Vulkan/ANGLE is broken box-wide right now**: `getContext('webgl2')` returns `null` on `about:blank` under `--use-angle=vulkan --enable-features=Vulkan` — zero app code, reproduced twice (before and after killing an orphaned runaway chromium gpu-process). Round-1 soak ran Vulkan fine at 03:01 → box-state regression, not code. **All `--gpu` numbers this round are invalid.** | `/tmp/w5/glmin.mjs` runs (ctx1/ctx2 both null), `w5-gpu-ctx.json` | — (environment) |

## Soak — `boxing.html?vid=test-input.mp4`, 120s

| run | errors | RSS trend | verdict |
|-----|--------|-----------|---------|
| `--gpu` (Vulkan) | 1 pageerror + 3 console errors — page **never booted** (context blocked) | flat 1135→1147MB — measured a dead page, invalid for leak | surfaced P1 finding |
| SwiftShader | **0 errors** (exit 0) | 1289→1745MB; **post-warmup slope +0.55MB/s ≈ +4.6%/108s** (warmup-mean 1695 → end-mean 1739, +2.6%) | **no acute leak** (< 30% threshold); mild linear drift — watch item |

Post-warmup RSS is a near-perfect straight line (+0.55MB/s, still creeping at end). Over 2 min it's ~44MB — below leak threshold but worth a 10-min soak to confirm plateau vs true leak. Suspects if real: FX particle/material churn, MediaPipe buffers, `__boxing.log` (capped 4000 — bounded), renderer program cache.

fps under SwiftShader (avgFps 9.1, p50 83ms) is software-render cost — not a defect; round-1 Vulkan p50 was 16.7ms.

## Reload-loop leak — same tab, `page.reload()` ×8, vid mode

| cycle | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|-------|---|---|---|---|---|---|---|---|---|
| usedJSHeap MB | 8.3 | 8.4 | 8.4 | 8.3 | 8.3 | 8.3 | 12.1 | 8.3 | 12.2 |
| DOM nodes | 66 | 66 | 66 | 65 | 64 | 64 | 64 | 64 | 64 |
| __boxing.log | 6 | 6 | 6 | 4 | 2 | 2 | 1 | 3 | 1 |

Heap oscillates (GC timing, forced `window.gc()` before each sample), DOM stable, `windowKeys` constant 240, resource entries ~19 constant, **0 pageerrors across 9 loads**. `__boxing.log` fresh per cycle; `countdown`×3 entries are by-design (one per 3-2-1 tick, `fight.js:282`). **No listener/timer/init leak.**

## Mode matrix

| mode | run | result |
|------|-----|--------|
| `boxing.html?notrack=1` | qe-runner 15s + edge probe | **0 errors**; gloves render confirmed — **38,464 lit px** on `#hands` overlay + `w5-notrack.png` |
| `boxing.html?practice=1` | qe-runner 15s | **0 errors**. Note: `?practice=1` intentionally = tutorial path (index.html:667 menu toggle links `lineup?practice=1`; boxing.html:315-316 aliases practice→tutorialMode). Design, not a bug. |
| `boxing.html?tutorial=1` | qe-runner 15s | **0 errors** (param exists — same code path as practice) |
| `index.html` @390×844 mobile | custom probe 15s | **0 errors**; horizontal overflow 9px → P2 finding |
| `lineup.html` @390×844 mobile | custom probe 15s | **0 errors**, no overflow |
| lineup → boxing handoff | custom probe | **PASS**: `localStorage['boxing:npc']='proto:bubble'` on select, Enter → `boxing.html`, `npcName=BUBBLE`, `phase=countdown`, 0 errors both pages. Locked contender (bean/SUMO) correctly rejects: button `LOCKED (AVG KO ≤ R2)`, href removed, localStorage untouched. |

## CPU throttle 4× — 20s vid-mode run

`Emulation.setCPUThrottlingRate rate:4` applied at nav: game booted `countdown→fighting`, **10/10 liveness polls OK, 0 hangs, 0 pageerrors**, clean recovery after un-throttle. No slow-CPU races surfaced. (`w5-cpu-throttle.json`)

## Malformed inputs — `__forceHands` / `__forceFace` (notrack mode)

15 injected cases ~1.4s each: NaN landmarks, ±Infinity span, 1e9 coords, two-left-hands, empty lm, null lm entries, missing fields, `hands:'x'`, `__forceHands=42`, null-proto object, NaN face, face missing nose, `__forceFace=7`, 12-hand giant burst. **0 pageerrors, 0 console errors — all cases.** Game stayed `fighting`, recovered cleanly on reset. Input pipeline is robust. (`w5-edge-inputs.json`)

## Ops note (team-visible)

Killed an **orphaned headless Chromium** (pid 40097, PPID=1 — owner node dead): its gpu-process ran ~1000% CPU for ~6 min, driving load1≈19-20 and gating the whole QE team out of launches. It was NOT the lock-holder and not the user's desktop browser. Load1 recovered to <10 after the kill. Post-kill, Vulkan is *still* broken — the orphan was a victim of the same Vulkan failure (likely a spinning retry loop), not its cause.

## Residual risks

- **RSS drift**: +0.55MB/s post-warmup is suspicious-but-sub-threshold; a 10-20 min soak would settle plateau-vs-leak. 120s window too short to conclude.
- **Vulkan path**: untestable until the box's ANGLE/Vulkan recovers — `--gpu` runs hard-fail before the app loads. The P1 uncaught-renderer bug means any `--gpu` run today produces a dead page, not just bad numbers.
- **fps numbers**: all SwiftShader fps this round are contaminated by multi-agent box load; do not compare with round-1 baselines.
- Tutorial UX depth (coach steps completing) only smoke-tested via 0-error boot — w7's e2e owns deeper coverage.
