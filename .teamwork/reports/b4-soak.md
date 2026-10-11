# b4-soak — Lifecycle/behavior soak, wave 4 (headless Chromium, SwiftShader)

Date: 2026-10-11 · Server under test: `http://127.0.0.1:8791/` · no `--gpu`/Vulkan
flags (broken box-wide — SwiftShader ANGLE only), chromium niced, launches
serialized through `.teamwork/qe/.chromium.lock`, resource-gated.
Artifacts: `.teamwork/qe/b4-{hold,churn,bout,reload,quota}.json`.
Probes (throwaway): `/tmp/b4/{harness,hold,churn,bout,reload,quota}.mjs`.

## Findings

| sev | file:line | finding | evidence | fix sketch / owner |
|-----|-----------|---------|----------|--------------------|
| P3 | `shared/hands.js:50-54` (+ same pattern `shared/face.js:56-64`) | **The 60 s double-grace narrows but does NOT close the worker+inline double-download.** After the second 30 s grace, `_initLocal()` fires while the worker's own boot fetches are still in flight — on a link slower than ~60 s per ~13 MB bundle (~1.8 Mbps — Slow-3G real users), both realms fetch `vision_bundle.mjs` (then wasm + `.task`) concurrently, same as the b3 bug, just shifted later. The in-flight worker is never cancelled. | `b4-churn.json › doubleFetch`: vendor hung 70 s → `vision_bundle.mjs` requested **×2 while the first was still pending** (`dupeSameUrl:[2]`); after release both realms fetched everything (each of `wasm.js`/`.wasm`/`hand_landmarker.task` ends ×2); `create()` resolved `gpu` (inline cover won) at 71.4 s. | Fetch the asset bytes once in the page and transfer to the worker, or share boot progress so `_initLocal` only fires when the worker fetch has actually failed/stalled-out (progress heartbeat), or make grace a real timeout that terminates the worker before inline starts. Owner: hands.js/face.js (b4-pages territory — route) |
| P4 | `boxing.html:396-405` + `:1207` | **`?vid=<missing>` still fires the tracker-hold in "mouse mode".** `video.src = params.get('vid')` is assigned BEFORE `await video.play()` — when the fetch/play fails the catch arm shows `mouse mode`, but `video.src` stays truthy → `waitForHands` (`!!(video.srcObject||video.src)`) holds the bell anyway AND `!noTrack && (video.srcObject||video.src)` at :408 still spawns Face/Hands workers on a dead element (`cam 0/s` forever). Cosmetic wart on a test-hook-only path — real camera-denied users never hit it (verified clean in D). | `b4-hold.json › E_bogusVid`: `mouse mode` shown yet `entranceWaiting=true` for ~8.1 s ("FINDING YOUR HANDS …" displayed), released only when Hands resolved `gpu-worker`; status later shows `cam 0/s · track 0/s`. | Move `video.src =` inside the try after `await video.play()` succeeds, or clear `video.srcObject`/src on catch. Owner: boxing.html (user-hot → orchestrator) |

Everything else probed this wave is **clean** — matrices below.

## 1 · waitForHands hold-the-bell — verified LIVE (`b4-hold.json`)

Drove the real page + real `out.entranceWaiting` (wrapped `game.step` in-page;
the persistent `out` object is read post-call). Behavior matrix:

| path | drive | hold? | release | verdict |
|------|-------|-------|---------|---------|
| slow vendor (4 s/req stall) | `?vid=test-input.mp4` + request interception | **YES** — `entranceWaiting=true` 80 consecutive samples (~2.9 s→35.3 s), `cdRound='FINDING YOUR HANDS'`, `cdN='…'`, countdown frozen at **3** the whole time, `player.hp=100`, `npc.action='idle'` — nothing lands | 35 s `TRACK_WAIT_MS` deadline (tracker still `hands loading`) → `wait=false` at t≈35.3 s → countdown 3-2-1 → `fighting` t≈39.4 s, `round-start` logged | **PASS** — deadline works |
| fast vendor | `?vid=` no stall | **YES** — `entranceWaiting` 55 samples (~0.5→22.2 s), same HUD hold | hands-ready (`gpu-worker`, `handStatus→ready`) → `wait=false` t≈22.2 s → `fighting` t≈27.9 s | **PASS** — ready-release |
| `?notrack=1` | synthetic input | **never** — 0 wait samples, `synthetic mode` | `fighting` at t≈3.8 s | **PASS** |
| camera denied | `getUserMedia`→`NotAllowedError` | **never** — `mouse mode`, 0 wait samples | `fighting` at t≈6.6 s | **PASS** |
| `?vid=404` | dead video src | **holds ~8 s** — see P4 finding | hands-ready (dead feed) | wart |

- The hold is real: while it held, `fight.step` got `dt=0` — the countdown never
  ticked, no NPC windup, zero damage to the defenseless player; the moment it
  released, the normal 3-2-1-FIGHT played (`ROUND 1` text returns, `cdN` counts).
- `round-start` reaches `__boxing.log` after every release; no wedge on any path.
- First-sample `entranceWaiting=null` in run A is instrumentation lag
  (step-wrapper installs after `__boxing` appears), not a hold gap.
- Caveat on run B: a stale delay-handler from run A leaked into B's "hang"
  interception (multi-handler stacking) — B ended up exercising the
  ready-release path instead of a true infinite-hang. A's deadline already
  proves the hang case (35 s while `hands loading`), so coverage is complete.
- 0 pageerrors across all 5 subtests.

## 2 · Tracker lifecycle churn (`b4-churn.json`)

`boxing.html?vid=test-input.mp4`; page's own `hands.stop()` first, then in-page
`Hands.create()/stop()` ×10 on the live `<video>` (25 s cap/cycle — creates
that timed out were auto-`stop()`ed on late resolve). Live-Worker counting via
an in-page `Worker` subclass (page-realm spawns = the real leak risk; CDP
`targets()` is blind to dedicated workers on this build).

| cyc | resolved | delegate | boot ms | workers after | heap MB | tree RSS MB | vendor reqs |
|-----|----------|----------|---------|---------------|---------|-------------|-------------|
| boot | yes | gpu-worker | 26638 | — | 10.5 | 1625 | — |
| 0 | yes | gpu-worker | 17375 | 0 | 13.4 | 1684 | 4 |
| 1 | yes | gpu-worker | 17104 | 0 | 10.8 | 1685 | 4 |
| 2 | yes | gpu-worker | 19895 | 0 | 9.8 | 1651 | 4 |
| 3 | yes | gpu-worker | 23691 | 0 | 10.6 | 1655 | 4 |
| 4 | yes | gpu-worker | 18322 | 0 | 11.4 | 1661 | 4 |
| 5 | timed out (>25 s, load) | — | — | 0→1 pending | 11.3 | 1757 | 4 |
| 6 | timed out | — | — | 1 pending | 10.9 | 1784 | 4 |
| 7 | timed out | — | — | 1 pending | 12.5 | 1788 | 4 |
| 8 | yes | gpu-worker | 20465 | **0** | 11.5 | 1688 | 4 |
| 9 | yes | gpu-worker | 22514 | **0** | 10.7 | 1685 | 4 |

- **No worker leak**: every resolved `stop()` took live-worker count back to
  baseline; c5-c7's late-resolving pending creates were stopped by the probe's
  auto-cleanup and c8 shows `workers=0`. Heap oscillates 9.8-13.4 MB (GC
  noise), RSS 1625→1685 (+60 MB over 11 worker boots — drift, not climb;
  the 1788 peak was pending workers mid-flight and settled back).
- **Fetch cadence flat**: exactly 4 vendor requests per cycle
  (`vision_bundle.mjs`, `wasm.js`, `.wasm`, `hand_landmarker.task`) — a fresh
  worker realm re-fetches per create (HTTP-cache served, no accumulation).
  Boot-time ×2 duplicates for `vision_bundle`/wasm across hands+face workers
  is the known parallel-boot pattern (separate realms, by design).
- **Double-grace → still a double fetch after 60 s** — see P3 finding above.
- 0 pageerrors; no requestfailed beyond expected aborts on `stop()`.

## 3 · 5-min bout @ 4× CPU throttle (`b4-bout.json`)

`?vid=test-input.mp4`, `Emulation.setCPUThrottlingRate(4)`, bout kept alive in
`fighting` (hp topped-up so decay — not the outcome — is measured), synthetic
punches through `tracker.punches` (real hit/fx/audio path; score 0→666).

| metric | t=38 s | t≈110 s | t≈200 s | t=240 s | verdict |
|--------|--------|---------|---------|---------|---------|
| usedJSHeap MB | 11.0 | 20.6 | 20.0 | 19.5 | **sawtooth** — GC troughs 11.4→11.6→12.2 MB (floor slope ≈+0.3 MB/min, GC noise); peaks are per-beat fx/particle churn, all reclaimed |
| rAF gap p50 / p95 | — | 111 / 663 ms | 58 / 4205 ms | 87 / 7618 ms | tracks **box load1** (11–20), not time-decay — gaps spike & recover with external contention |
| fps | — | 1.6–4.8 oscillating | same band | same | no monotonic decline |
| drawCalls / geo / tex / prog | 125 / 80 / 2 / 7 | 120 / 94 / 8 / 10 | 154 / 100 / 8 / 10 | 147 / 100 / 8 / 10 | bounded plateaus (geo/prog warm-up then flat) |
| nodes / listeners | 336 / 24 | 335 / 25 | 319 / 29 | 313 / 30 | stable |
| tree RSS | 1721 | 1834 | 1914 | 1891 | +170 MB over ~3.5 min — browser-side churn under load; page heap flat |

- **Bout survived ~3.6 min of real fighting** (npcHp ground down 100→32 by
  real punches) with **0 pageerrors, 0 failed requests**.
- **The Chromium process died at t≈254 s** — whole browser tree vanished
  mid-sample (`detached Frame`, `treeRss=0`, `SIGCHLD` on all pids). Zero
  pageerrors/console anomalies before it; MemAvailable stayed >5 GB (not
  system OOM); no `.dmp` survived (profile auto-cleaned). Same class of
  box-level chromium instability b3 reported twice (orphan runaway GPU
  processes) — most likely **environmental** (SwiftShader + 4× throttle +
  load1≈13), not a page defect. Logged as a watch item, not a defect.
- fps 1.3–4.8 = SwiftShader + 4× throttle + box load — env caveat, same as
  prior waves.

## 4 · reload ×10 heap trend (`b4-reload.json`)

11 × `page.goto(boxing.html?vid=test-input.mp4)` (same tab, ~10 s settle —
mirrors w5's protocol), `usedJSHeapSize` per cycle:

| cycle | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|-------|---|---|---|---|---|---|---|---|---|---|----|
| heap MB | 10.7 | 13.9 | 9.0 | 12.3 | 17.2 | 14.3 | 13.1 | 12.7 | 15.6 | 8.4 | **8.2** |

- **Slope −0.164 MB/cycle** — still flat/negative after wave-3 changes
  (w5 ran ×8 at ~8.7 MB flat; this ends *below* start). nodes 73, windowKeys
  239, resourceEntries 19 — all constant.
- Every visit sat in `countdown` at sample time — the wave-4 tracker-hold
  doing its job on this slow box (feature live on every reload, 0 errors).

## 5 · localStorage quota-exceeded mid-fight (`b4-quota.json`) — PASS, guarded

Real quota wall: 79×64 KB + 125×512 B + 21×1 B filler → `setItem` threw
`QuotaExceededError` even for 1-byte writes (then `Storage.prototype.setItem`
hard-patched to throw — the true "quota hit mid-fight" state). A real KO was
then driven through the page's own rAF loop (`tracker.punches.push`, `sim.npc`
pinned at reach, `npc.hp=2`) so `hud()` drained `ko`/`win` in-band:

| check | result |
|-------|--------|
| KO lands + events flow | `koLogged=true`, phase `npcdown`→`win` (event order: `player-punch, player-hit, npc-hit, ko, win`) |
| `recordKo` (`boxing:ko` write throws) | survives — try/catch (`boxing.html:509`) — **0 pageerrors** |
| `recordEnd` (`wins`/`best` writes throw) | survives — **0 pageerrors**; still returns `best=554` for display |
| endcard renders | `.endcard.on` ✓, `body.ended` ✓, title `YOU WIN!`, sub `BUBBLE DEFEATED · 554 PTS · BEST 554` |
| stored values | `boxing:ko`/`wins`/`best` all `null` (writes correctly failed, nothing half-written) |
| storage afterwards | filler cleaned; `setItem` restored; page functional |

First-pass note: a coarse 4.9 MB fill left enough headroom for the ~20-byte
record writes (they succeeded then too) — both outcomes are safe: writes that
fit are written; writes that don't are swallowed and the endcard still shows.

## Ops note

- Box load rode 11–20 for most of the wave (teammate `qe-e2e` suite, another
  agent's render probe, the dev servers). Every probe waited out `load1<10`
  in the governor gate and serialized on `.chromium.lock` — the lock queue
  worked exactly as designed (5 probes interleaved with 3 teammate runs, no
  overlap).
- **One whole-browser death mid-probe** (bout soak, t≈254 s — see §3):
  chromium pid + entire process tree gone, no `.dmp`, no OOM signature
  (MemAvail >5 GB). Suspect box-level chromium/SwiftShader instability
  (third instability event this week per b3's notes). Watch item.
- **Zero orphan chromium** found on final sweep — only the pre-existing
  interactive session on :34149 (untouched, predates QE, not an orphan).

## Residual risks

- (carried) dedicated-worker orphans are still invisible to
  `browser.targets()` on this Chromium build — churn coverage leans on
  in-page Worker counting + RSS instead.
- `?vid=` + dead-url hold (P4) proves `video.src` truthiness alone is a weak
  gate for "real camera input" — same assumption underlies :408's tracker
  spawn and :1207's hold.
- The P3 double-fetch finding needs a >60 s link to matter — rare, but it is
  exactly the cohort the double-grace was built for; if the fix lands as
  "terminate worker before inline cover", the inline landmarker becomes the
  only fetch path after grace expiry (no dupes) at the cost of never
  upgrading to the worker on that link.
- Bout-crash attribution is unresolved (env vs product) — if it recurs on a
  quiet box, hunt it; the probe (`/tmp/b4/bout.mjs`) is replayable as-is.
