# w2-qe-boxing — QE Report

Worker: **w2-qe-boxing**. Owned files: `boxing.html`, `shared/boxing/**`.
Live page exercised: `http://127.0.0.1:34149/boxing.html?vid=test-input.mp4`
(server left running, untouched). All Chromium launches gated on load<10,
MemAvailable>2500 MB, and (Vulkan runs) nvidia-smi <6000 MiB — one browser at
a time; several runs waited out load spikes of 15–21 from co-tenants.

## Baseline (pre-fix)

- `npm test` — **all 7 scripts green, exit 0**: fight 80/80, ring 37/37,
  audio 25/25, tutorial 7/7, fists+hands+proto all PASS (196 PASS total,
  0 FAIL).
- `npm run test:e2e` — **12/12 PASS, "ALL CHECKS PASSED"** (boot, countdown,
  scripted punch → hit, step in/out, S-step, A-slip, 0 page errors, glove
  silhouette, mobile HUD).
- Live Vulkan probe (20 s warm-up + 40 s sampling, test video): **avg 37.4
  fps, p50 16.7 ms, p95 83.3 ms, worst frame 233 ms, worst-1s 15.7 fps** —
  0 errors, 0 warnings, 0 failed requests. ANGLE/Vulkan on Intel Mesa
  (weakGpu path active). `hands=gpu-worker`, `face=cpu-worker`.

## Findings (all in `boxing.html`; all fixed + verified)

| severity | file:line | evidence | fix | verification |
|---|---|---|---|---|
| **medium** (contract A7) | boxing.html:881–907 (was ~858) | CONTRACT.md A7: "the on-screen glove must NOT vanish — hold last position and drift back to a neutral guard pose … optionally dimmed ~60% … always on screen, every frame." Old code faded `dim` to 0 over `HOLD=.45`s then `continue`d — gloves fully disappeared on any tracking dropout, and were never drawn at all in `?notrack` mouse-idle. | Dropout now floors `dim` at `LOST_DIM=.6`, eases target pose/landmarks toward a synthesized neutral fist at `GUARD_PT` (.30/.70 × .76, bottom quarter, fists up), and never drops `lastP`; a never-tracked glove appears *at* guard. Re-acquire snaps fresh (`hasT=false`). | Live pixel check: tracking held empty 1.6 s → 7055/7050 opaque px at the two guard spots, 0 mid-screen; hand re-shown → 6064 px at the cursor spot. E2E "glove silhouette follows knuckles" still passes (3593 px). |
| **low** (display) | boxing.html:519 | `clock()` = `floor(t/60)` + `ceil(t%60)` — for `t mod 60 ∈ (59,60)` the seconds print `60` → HUD reads **"0:60"** for ~1 s at each minute boundary (hits once every 90 s round). | Ceil the *total* seconds first, then split: `s=Math.ceil(t)` → `floor(s/60):pad(s%60)`. | Live page: `timeLeft=59.5` → "1:00" (was "0:60"); `59.0` → "0:59". Boundary values re-checked in probe. |
| **low** (cosmetic) | boxing.html:~1031 + resize() | Peep canvas `[data-nose]` cached `clientWidth/Height` once (`if(!ncW)`) — but the peep is CSS-sized (238 px ↔ 116 px at the ≤700 px breakpoint), so a resize across it drew face dots at stale scale forever. | `resize()` now zeroes the cache → next frame re-measures (layout read stays off the hot path). | Code inspection + resize path exercised in e2e mobile-viewport pass. |
| **low** (robustness) | boxing.html:833–837 | `found[]` gate checked only `lm.length >= 21` — a NaN landmark cloud (contract: NaN/undefined-safe tracking) would poison `gloveLM`/position buffers and blank the mitt until a clean sample. | `lm.every(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))` added to the gate — full 21-pt scan (mitt draws all 21; `fists.js` only needed lm[0]/[9]). | `npm run test:e2e` re-run green; static review of all downstream draws. |

## Fresh-rework verification (npc.js / protoBoxer.js / fight.js)

Exercised both in node (`THREE` real, DOM-free) and live on :34149:

- **Pick gate** — 18/18 node checks: `proto:bean` locked w/o KOs → bubble;
  `boxing:ko {n:1,sum:2}` (koAvg 2 ≤ 2) → bean; bare `'bean'` ≡ `'proto:bean'`;
  koAvg 3.0 → bean locked; `proto:blocky` at koAvg 3.0; PROP manifest ids
  (`boxing-ring`) rejected; stale/garbage ids → bubble; corrupt/malformed
  `boxing:ko` JSON → gate closed → bubble.
- **Bean build** — all 19 poses incl. strike-target punches run clean;
  scowl-brows persist at idle (brow rot −0.16); frame top 1.48 > bubble's
  (champ silhouette); `setDamage(.8)` applies; `playerLook` reach clamped to
  .5 from shoulder (measured 0.27).
- **Live page** — `localStorage['boxing:npc']='proto:bean'` + ko record →
  reload → `npc.variant==='bean'`, nameplate "BEAN". Locked record → bubble.
- **Combat round-trip live**: scripted jab + real `keydown('a')` →
  `player-dodge`+`player-dodged` (hp untouched); held `f` → `player-blocked`
  (hp 100→94, = half of 12 hook dmg); `_wantCombo` → `TRIPLE TAP` telegraph +
  3 release events; KO → `npcdown` → `win` card "BUBBLE DEFEATED · 741 PTS" →
  `boxing:ko = {n:1,sum:1}` (lineup unlocks). 16/16 checks, 0 page errors,
  0 console errors, 0 failed requests.

## FPS before / after (same Vulkan probe, same URL)

| run | avg fps | p50 ms | p95 ms | worst ms | worst-1s fps | draw calls |
|---|---|---|---|---|---|---|
| BEFORE | 37.4 | 16.7 | 83.3 | 233.3 | 15.7 | 124 |
| AFTER #1 | 23.9 | 16.7 | 150.0 | 266.7 | 13.6 | 176 |
| AFTER #2 | 43.4 | 16.7 | 50.0 | 66.7 | 30.5 | 177 |

**No regression attributable to the fixes.** Median frame is identical
(16.7 ms) in all three runs; the spread lives entirely in the tail and is
machine-load noise (co-tenant load swung 8–21 during the session; AFTER #2
beat the baseline on every metric). My edits add ~100 flops to a dropout-only
branch + two mitt draws/frame only while hands are absent — far under the 5%
regression flag line. Draw calls differ because the AFTER samples landed in
the `lose` end-card phase (outro avatar + crowd) vs BEFORE's `playerdown`.

## Post-fix gates

- `npm test` — **all 7 suites green, exit 0** (196 PASS / 0 FAIL).
- `npm run test:e2e` — **12/12 PASS, ALL CHECKS PASSED, zero page errors**
  (run twice — before and after the last NaN-gate edit).
- Live exercise — **16/16 PASS, 0 errors**; clock regression verified inline.

## Out-of-boundary bugs

None found. `shared/hands.js`, `shared/track-worker.js`, `server.mjs` were
not deeply audited (other workers' scope); no page errors or failed requests
observed from them across ~4 min of exercised live play on :34149.

## Notes / remaining known issues

- **Concurrent in-flight work respected**: `boxing.html` + `mitts/classic.js`
  also carry the user's parallel edits (entrance-glove shoulder anchoring +
  `mittOpts.cap` plumb — coherent; `armL/armR` exist in protoBoxer parts).
  The dodge/combat rework in npc.js/protoBoxer.js/fight.js was **committed**
  mid-session (`cdc8a28`); my checks ran against it either way. Nothing
  reverted; no git mutations by me.
- **Classic mitt renderer keeps finger-chain articulation** when the tracked
  hand isn't a fist — user-chosen direction ("Revert gloves to classic blob
  mitts", c9f5099). Technically looser than A7's "NO FINGERS EVER"; reported,
  not overridden.
- **`fight.step` event queue is single-consumer**: events pushed between
  steps are cleared at the next step's top (`fight.js:221`, documented at
  :182). All in-app `_emit` calls happen inside `step()`; verified safe —
  but probes calling `game.step` alongside the rAF loop will steal events.
- **`simIn.sway` / `simIn.playerDodge`** are fed to `RingSim.step` but unused
  there (ring reads only `npcDir`/`npcStunned`/`playerStep`) — dead input,
  harmless.
- **Punch cancel on starved loops**: a fist held out <`MAX_THROW_T`=.24 *sim*
  seconds then vanishing drops the throw silently (`fists.js:271`) — only
  reachable at ~<5 fps real; by design, noted for the record.
- Probe scripts left in `/tmp/w2/` (fps-probe.mjs, fight-exercise.mjs,
  npc-pick-probe.mjs) — not committed (outside the repo).
