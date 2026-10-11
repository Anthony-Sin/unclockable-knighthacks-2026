# b3-soak — Lifecycle/transition soak, wave 3 (headless Chromium 153)

Date: 2026-10-11 · Server under test: `http://127.0.0.1:8791/` · SwiftShader
GL (no `--gpu`/Vulkan — still broken box-wide).
Artifacts: `.teamwork/qe/b3-{churn,visibility,freeze2,denied,rematch,slow3g,idle-index,idle-lineup}.json` +
`/tmp/b3/*.png` screenshots. Probes (throwaway): `/tmp/b3/{harness,churn,visibility,freeze2,denied,rematch,slow3g}.mjs`.

## Findings

| sev | file:line | finding | evidence | suggested owner |
|-----|-----------|---------|----------|-----------------|
| P2 | `shared/boxing/game.js:110` + `boxing.html:434-436,1190` | **The bout never waits for hand trackers — `waitForHands` hold is dead code on the shipped path.** `waiting = phase==='intro' && controls.waitForHands && !skipRequested`, but `createGame` is always called with `skipIntro:true` and `game.skipIntro()` runs at boot, so `skipRequested` is true through the entire first intro → `waiting` is always false → the countdown starts even while `handStatus==='loading'`. On a slow tracker boot (weak CPU / slow model fetch — real users download ~13 MB of wasm+`.task`), the NPC fights and can **KO the defenseless player** before any input exists; only a tiny `hands loading` peep tag signals why. Mouse fallback is unaffected (always live). `out.entranceWaiting` is computed (game.js:378) but consumed nowhere. | `b3-slow3g.json` run `boxing-cam`: `status='hands loading · ~17fps'` at 8/20/35/55/75 s while `phase` went `countdown→fighting→lose` — player KO'd in R1 with ~0:51 left, `npcHp` untouched. Fix sketch: make the hold unconditional on user-skip (`waiting && !userSkip`), or gate `fight.startNow()` on `handStatus!=='loading'`, plus a visible "loading trackers" callout. | boxing.html/game.js — **user-hot**, report only |
| P3 | `boxing.html:596-600` (re-arm) + `:524` (`showEnd` early return) | **Endcard re-arm is a frame-order race**: it only clears the `ended` latch when a *rendered* `hud()` frame observes `phase==='intro'`. Same-tick `game.reset()` + `game.skipIntro()` (the natural rematch call — boxing.html itself skips intros at boot) jumps `intro→countdown` inside the next `fight.step`, so `hud()` never sees `'intro'` → `ended` stays `true` → `.endcard.on` (`opacity:1, pointer-events:auto`) stays visible **over the whole rematch bout**, and the next verdict hits `if (ended) return` → **stale card, swallowed verdict** — a rematch *loss* still displays `YOU WIN!`. The documented rematch intent ("re-arm so the next win/lose can show a fresh card", line 593) silently fails. Reachable today via the `__boxing.game.reset()` debug handle; any future in-page rematch button hits it. | `b3-rematch.json`: every `postReset` sample `phase:'countdown'` with `endOn:true` (4/4); `wins` counter still incremented per bout but the card was never re-shown (never un-shown). Fix sketch: re-arm on any non-`intro` transition out of `win/lose` (e.g. first `countdown` frame), or clear the latch inside `game.reset()` via an out-flag. | boxing.html — **user-hot**, report only |
| P3 | `shared/hands.js:40-47` (`BOOT_MS` race), `shared/face.js` same pattern | **Duplicate MediaPipe downloads under slow worker boot.** The 30 s `BOOT_MS` race fires `'slow'` → `_initLocal()` re-downloads the *same* `vision_bundle.mjs` + `vision_wasm_internal.*` + `.task` in the page realm **while the worker keeps downloading its own copies** — exactly when bandwidth is the bottleneck. Hands+Face = up to 4× the ~9.5 MB wasm and 2 model files in flight. | `b3-slow3g.json` `boxing-cam` `requestsPerFile`: `vision_wasm_internal.wasm`×4, `vision_bundle.mjs`×3, `vision_wasm_internal.js`×3, `track-worker.js`×2 under emulated Slow-3G. Fix sketch: fetch the asset bytes once (page realm), transfer to the worker; or skip the inline fallback when the worker's boot is merely network-slow (share progress), or rely on HTTP-cache coherence. | b3-pages (`shared/{hands,face,track-worker}.js`) |

Everything else probed is **clean** — see matrices below. (Per wave rules: no guard-pose/glove holdover reported — gloves leaving canvas on tracking loss is intended A7 behavior.)

## 1 · Page-transition churn — index → lineup → boxing(real cam) ×10, one browser+tab

`b3-churn.json`, 30 real `page.goto` navigations. `documents` (CDP metric) climbs to ~10
then oscillates — **back-forward cache filling then evicting normally**, not a leak.
Per-page-type numbers **plateau after cycle 3**:

| visit | heap MB trend | listeners trend | nodes trend | notes |
|-------|---------------|-----------------|-------------|-------|
| index | 10→18→27→36→**37-42 plateau** | 18→49→80→**111** | 331→844→1361→**1878-2380** | plateau = bfcache cap (~7-10 docs) |
| lineup | 17→43→42→**43-46** | 31→62→93→**106-124** | 522→1039→1556→**2061-2076** | ditto |
| boxing | 21→29→38→54→**45-50** | 54→84→115→**115-129** | 822→1338→1855→**2364-2393** | ditto — per-visit cost constant |

- **Workers**: `Face.create` reached `cpu-worker` on 2/10 visits → dedicated workers
  DO spawn — but **puppeteer `browser.targets()` never lists them** (`worker:0`
  always; targetCounts constant `{browser:1, other:4, page:1-2}` before/after nav).
  Orphan check via targets is therefore blind for dedicated workers; no orphan
  evidence from process counts or RSS either (`workersAfterLeave:0`, chromium
  child-process count stable). MediaPipe `Hands.create` never resolved within each
  ~25 s visit window under box load (`hands=null` at all 10 measures — pending, not
  crashed; in the 90 s+ visibility run it did come alive — `stats.trackHz 3.28`).
- **Chromium tree RSS**: 1402→2500 MB over 30 navs — front-loaded (bfcache fill +
  per-visit SwiftShader/tracker allocs), last 5 cycles roughly flat (2437→2500→2446).
  Watch item only, no acute climb.
- **rAF**: alive on every visit (`rafAlive:true` ×30); dead docs' loops can't run by
  construction — bfcache docs are frozen.
- **0 pageerrors, 0 requestfailed, 0 HTTP≥400** across all 30 loads (10 benign
  XNNPACK INFO console lines).

## 2 · Hidden-tab / lifecycle matrix — boxing.html, real cam path

`b3-visibility.json` + `b3-freeze2.json`.

| transition | result |
|------------|--------|
| 2nd tab fronted → `document.hidden` | **real `true`** — headless honors it |
| hidden 10 s: rAF / `game.step` deltas | **0 / 0** — fully paused, no stray stepping |
| `video.srcObject` track `enabled` | **false while hidden → true on visible** (listener at `boxing.html:418` works) |
| hidden→visible first `game.step` dt | **markMax = 0.1 s** — the loop's `Math.min(.1,…)` clamp (`boxing.html:1177`) eats the whole 10 s gap; **no dt spike, no sim jump** |
| `timeLeft` across hide 10 s + resume | 89.19→87.37 — clock resumes, no catch-up jump |
| AudioContext state | `running` → `running` → `running` (created on real gesture; Chrome does not auto-suspend on hidden — crowd bed keeps playing, acceptable) |
| tracker after resume | `trackHz` resumes ~2-3 Hz |
| CDP `setWebLifecycleState` frozen 8-10 s → active | no errors, no dt spike risk (same clamp path). **Headless artifact**: `document.hidden` stays `true` even after `bringToFront()` post-freeze → rAF legitimately stays paused; a real browser re-fronts on user return, and the verified clamp covers the resume either way |

## 3 · Camera-permission-DENIED path — `b3-denied.json` (7/7 PASS)

Launch flags: fake camera device present, `--deny-permission-prompts`, no
`--use-fake-ui-for-media-stream` → `getUserMedia` rejects `NotAllowedError` like a
real user pressing **Block**.

| check | result |
|-------|--------|
| status text → `mouse mode`, `.peep` hidden | PASS (~1 s after nav) |
| `hands`/`face` null (no trackers spawned) | PASS |
| fight reaches `fighting` | PASS |
| **real** `page.mouse` drags → punches | PASS — 7 `player-punch`, 12 hits, `npcHp` 100→70 |
| glove overlay renders (lit px on `#hands`) | PASS — 30,446 px mid-hold |
| A-key slip → `dodge.dir='left'` | PASS |
| pageerrors / console errors | **0 / 0** |

The real-user failure path degrades cleanly and is fully playable.

## 4 · Win → rematch ×5 in one page — `b3-rematch.json`

5 real bouts (npc.hp→4, then `__forceHands` punches through the page's own rAF loop →
KO → `npcdown` → `win` + endcard), then in-page `game.reset()`+`skipIntro()`:

| cycle | phase@win | heap MB | listeners | nodes | programs | geometries | textures | `__boxing.log` | oscillators (+/bout) | AudioContexts |
|-------|-----------|---------|-----------|-------|----------|------------|----------|----------------|----------------------|---------------|
| c0 | win | 9.52 | 45 | 336 | 10 | 175 | 7 | 9 | 34 (+17) | 1 |
| c1 | win | 13.98 | 76 | 357 | 10 | 175 | 7 | 18 | 73 (+17) | 1 |
| c2 | win | 15.96 | 107 | 378 | 11 | 176 | 7 | 27 | 112 (+17) | 1 |
| c3 | win | 8.21 | 21 | 305 | 11 | 176 | 7 | 36 | 151 (+17) | 1 |
| c4 | win | 7.60 | 21 | 304 | 11 | 176 | 7 | 45 | 190 (+17) | 1 |

- **SFX**: exactly +17 oscillators / +8 buffer sources per bout — **no doubled SFX**;
  one AudioContext total. **Programs 9↔11, geometries 144↔176, textures 7** — bounded.
- **Listeners/nodes/heap sawtooth then GC back below start** (115→21, 383→304,
  15.96→7.60) — transient registrations reclaimed, no net stacking.
- `__boxing.log` +9/bout by design (cap 4000); `wins`/`kos` increment exactly once
  per bout — no doubled events.
- **Real user path**: endcard's `Run it back` click → `location.reload()` → clean
  reboot to `countdown`, fresh `log` (len 1). **0 errors across the whole probe.**
- The one defect this surfaced is the re-arm race in the findings table (endcard
  never dismissed across the rematch).

## 5 · Slow-3G load race — `b3-slow3g.json` (400 ms RTT, 50 KB/s)

| page | domcontentloaded | mid-load state | final | errors |
|------|------------------|----------------|-------|--------|
| `boxing.html?notrack=1` | 28.8 s (~1.6 MB module graph) | `readyState:interactive`, styled HUD shell painted (card/timer/`RINGSIDE`) — **graceful**, not a broken half-state; `b3-boxing-notrack-12000ms.png` | `fighting`, clock ticking | 0 |
| `lineup.html` | 0.9 s | UI text/cards painted at all samples | rendered, no errors | 0 |
| `boxing.html` (cam) | 2.3 s¹ | `hands loading` the whole 75 s; **fight ran to a `lose`** — see P2 finding | trackers still booting at probe end | 0 |

¹ cam run's module graph was HTTP-cache-warm from the notrack run; the MediaPipe
files were NOT cached (notrack never fetches them) → the tracker-download race is
real 3G evidence, incl. the ×3-4 duplicate fetches (P3 finding).
No timeouts, no `requestfailed`, no half-rendered states anywhere — pages degrade
to their static shells while modules stream.

## 6 · 60 s idle-visible soaks — `b3-idle-index.json`, `b3-idle-lineup.json`

| page | duration | errors | RSS trend | verdict |
|------|----------|--------|-----------|---------|
| `index.html` | 60 s | **0** | 1366→1422→1393 (±30 MB GC noise) | clean |
| `lineup.html` | 60 s | **0** | 1405→1446→1439 (first-tick alloc then flat) | clean |

(fps 5.2/4.7 = SwiftShader + box load, not a defect — same caveat as w5.)

## Ops note (team-visible)

Killed an **orphaned headless Chromium** (pid 170767, PPID=1, owner node dead):
its gpu-process spun ~1037% CPU for ~6 min, driving load1 to ~30 and gating the
whole team. Same failure pattern as w5's ops note — second occurrence. Load
recovered <10 after the kill. (Also noted: a separate long-running interactive
chromium on :34149 predates this wave — untouched, not a QE orphan.)

## Residual risks

- **Dedicated-worker orphan check is blind on this Chromium**: `browser.targets()`
  never lists `worker` targets even while `face` ran `cpu-worker`. If MediaPipe
  workers ever leak past document teardown, this method can't see them — process
  count/RSS showed no symptom, but coverage is indirect.
- **`Hands.create` boot >25 s under box load** (never resolved inside any churn
  visit's window; did resolve by ~90 s in the visibility run) — can't distinguish
  env slowness from a marginal slow-path defect without instrumenting the
  swallowed `.catch` at `boxing.html:415`. Combined with the P2 finding, slow-boot
  is now a user-visible failure mode worth a real look on hardware.
- **Churn RSS crept ~+100 MB over the last 5 cycles** while bfcache'd docs churn —
  could be bfcache/GPU-pool churn rather than a true leak; a 30+ nav run with
  forced GC would settle it.
- **Frozen-page resume** couldn't be fully exercised: headless keeps
  `document.hidden=true` after `setWebLifecycleState` frozen→active even with an
  explicit `bringToFront`, so post-freeze rAF resumption is unverified (the same
  dt clamp covers it whenever a frame does fire — verified on hidden→visible).
- 3G cam run's page-side module load was cache-assisted; the pure cold-cache
  boxing+mediapipe 3G path is only partially covered (tracker files themselves
  were cold — that's where the dupe + hold findings came from).
