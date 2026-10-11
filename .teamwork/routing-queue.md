# QE Round 2 — routed bug queue (orchestrator)

Bugs filed outside a worker's boundary, to be fixed by owner or orchestrator.

## → w7 files (boxing.html, game.js, npc.js) — from w6
- [x] boxing.html:838 — `hnd.lm.every` throws on non-array lm → w7 fixed via
      saneHands() (boxing.html:1228-1248); 16 malformed inputs → 0 errors
- [x] boxing.html:1169-1175 — drawEntranceGloves null joints → same saneHands fix
- [x] game.js:388 + npc.js:310 — reset() stale state + bruise carryover →
      w7 fixed: clears impulses/latches/queued punches + npc.resetDamage()
      (rebuilds proto impl, restores mat baselines) + endcard re-arm
- [x] npc.js kick NaN-dt → FIXED (orch): dt sanitized + kick un-poison loop,
      update():396-400
- [x] npc.js tel-texture leak → FIXED (orch): tel.material.map + material
      disposed in dispose()
- [x] npc.js empty-Box3 eyeY → FIXED (orch): finite-checked H/baseY,
      chibi 1.3 fallback
- [x] gloves-never-disappear / malformed __forceHands → w7 verified:
      saneHands + A7 guard-pose fallback, 16/16 edge cases clean
- [x] boxing.html webglcontextlost → FIXED (orch): preventDefault + status
      note + reload on restored
- [x] boxing.html:345 uncaught WebGLRenderer → FIXED (orch): ctor wrapped,
      readable "CAN'T FIND THE RING" card + module parked (no black page,
      no pageerror)

## → orchestrator (w9 done — files free)
- [x] lineup.html:441 — ALREADY FIXED (stale report): webgl probe + try/catch
      → glGone() degrade + contextlost + glBooted check exist (w9 verified)
- [x] index.html — 9px overflow @390px FIXED + verified headless:
      scrollW 399→390; .ring-canvas dropped redundant w/h (inset:0);
      .comic-halftone bleed capped ≤480px; .tut-label re-anchored right
      on mobile (right edge 398.8→358.1)

## → w4 files — from w6
- [x] ring.js:260 — _clamp div-by-zero when r degenerate → RESOLVED by w4:
      radius floor + bounds-aware home/leash; _clamp only divides when
      r > lim ≥ 0 (r>0); fuzz invariants cover degenerate configs

## Integration checklist (orchestrator, after all workers)
- [ ] npm test green (incl. new qe-fuzz + qe-server)
- [ ] npm run test:e2e passes (w6 was load-blocked — re-run when settled)
- [ ] qe-runner clean on index/lineup/gallery/boxing @ :8791
- [ ] restart :8791 to pick up server.mjs fixes

---

# QE Wave 3 — routed bug queue

## Status: b3-server DONE (3 fixes, verified 115/115). Awaiting: fuzz, soak, render, e2e, pages.
## Wave found bugs → wave 4 required (user rule).

## b3-render DONE — 7 fixed (confetti carryover, Infinity hang, stains, NaN ops).
## Routed: test/qe-e2e.mjs:1065 `rs===2` unreachable by construction → owner b3-e2e (may self-fix).
## b3-e2e status: qe-e2e at 64/65 — sole fail = that harness check.

## b3-pages DONE — ~6 fixes (module-import-failure kills UI wiring, DPR staleness,
## track-worker mixed-clock ~1ms/frame bug, worker death watchdog, postMessage
## failure pump-kill). Routed to HOT files: boxing.html recordKo `ko.n +=`
## TypeError on corrupt 'boxing:ko' (HI), Number(getItem) volume NaN (MED);
## boxing innerHTML sinks; tutorial innerHTML (fuzz owner may cover);
## fight.js JSON.parse (likely covered by b3-fuzz); engine.mjs (mockup read-only).

## b3-fuzz DONE — 8 fixes (tuning NaN poisons x3, reset transient leaks, audio
## graph leaks, proto frozen-state, tutorial clamps); qe-fuzz 37→69 checks.

## Integration checklist (after all 6):
- [ ] boxing.html recordKo corrupt-storage guard (b3-pages route)
- [ ] boxing.html volume NaN guard (b3-pages route)
- [ ] npm test + test:e2e + qe-runner sweep on final tree
- [ ] THEN wave 4 (bugs were found)

## b3-soak DONE — 3 defects (all report-only):
## → boxing.html/game.js (USER-HOT — orchestrator fixes at integration):
   - P2 game.js:110 + boxing.html:434-436,1190 — waitForHands intro-hold DEAD
     CODE: skipIntro makes `waiting` permanently false → bout starts while
     trackers boot; real user on slow net KO'd defenseless ~39s. NOTE: fix
     must NOT block camera-DENIED path (mouse mode must still start) —
     gate on handStatus 'loading' only, timeout fallback.
   - P3 boxing.html:596-600,524 — endcard re-arm race: same-tick
     game.reset()+skipIntro() skips the rendered 'intro' frame → `ended`
     stays latched → stale endcard over rematch + swallowed verdicts.
     Fix: re-arm on phase!=terminal, not only on rendered 'intro'.
   - P3 shared/hands.js:40-47 + face.js — BOOT_MS race → parallel inline+
     worker downloads of same ~13MB MediaPipe payload (×4 wasm, ×3 mjs on
     3G). b3-pages already done → orchestrator fixes.
## Ops: second orphan runaway chromium killed (pid 170767, ~1037% CPU).

## Still running: b3-e2e (last one — owns qe-e2e.mjs incl. the :1065
## unreachable-check route from b3-render).

## Wave 4 — routed (pending)

| From | File:line | Issue | Status |
|------|-----------|-------|--------|
| b4-pages | boxing.html:304-307 | static imports of hands/face/scene/mitts — failed dep kills whole module incl. UI wiring | → orchestrator (hot file) |
| b4-pages | boxing.html:440 | unguarded `await import(tutorial)` — chunk fail kills module | → orchestrator (hot file) |
| b4-pages | boxing.html:466 | Number(getItem) NaN — STALE note: volume already finite-clamped at :464-465 | closed (already fixed) |
| b4-pages | fight.js:166-168 | JSON.parse at module load on static literals — cannot throw | closed (not a bug) |
| b4-pages | tutorial.js:110 | innerHTML = non-literal (storage-fed markup → DOM XSS) | → b4-fuzz owns file; else orchestrator |
| b4-pages | npc.js:159 | unguarded await import | → b4-e2e owns file |
| b4-pages | server.mjs | 3 failures vs b4-server in-flight diff | → b4-server owns |
| b4-pages | mockups/_hero/engine.mjs:244 | contextrestored double-rAF | read-only mockup, noted |

### Wave-4 closed on inspection
- tutorial.js:110 innerHTML — interpolates only literal `<i>` pips; all
  dynamic text via textContent (:124). Not XSS. CLOSED.
- fight.js:166-168 — JSON.parse(JSON.stringify(static literals)) at module
  load cannot throw. CLOSED.
- boxing.html:466 — volume already Number.isFinite-gated. CLOSED (stale).

### Wave-4 orchestrator integration run (qe-e2e snapshot mid-flight: 84/90)
- L/N/O sections: follow-up KOs not landing within swing budget
  (dist≈1.9, koSeen=false) — pattern looks test-sequencing, b4-e2e owns
- P section: injected-manifest probe hits a real 404 → counts as page
  error — b4-e2e to mark benign or exclude own probe URL
- CONFIRMED WORKING: waitForHands hold (cd frozen + FINDING YOUR HANDS +
  release→bell), same-tick re-arm, ghost-glove spot probes
- boxing.html:304-307 + :440 → fixed by orchestrator (dynamic imports +
  parkFail); scene/mitt/trackers/tutorial now degrade individually

## b4-soak — routed (report-only; evidence in .teamwork/reports/b4-soak.md
## + qe/b4-hold.json, b4-churn.json, b4-quota.json)

| sev | file:line | issue | repro/evidence |
|-----|-----------|-------|----------------|
| P3 | shared/hands.js:50-54 (+face.js:56-64 same pattern) | 60s double-grace narrows but does NOT close worker+inline double-fetch: `_initLocal()` still fires while worker boot fetches are in flight → same ~13MB payload downloaded by BOTH realms on >60s-per-13MB links | b4-churn doubleFetch: vendor hung 70s → `vision_bundle.mjs` ×2 concurrently pending (`dupeSameUrl:[2]`); post-release every vendor file ends ×2 (both realms); create resolved `gpu` inline at 71.4s. Repro: intercept `/vendor/mediapipe/*`, hold 70s, watch request log |
| P4 | boxing.html:396-405 + :1207 | `?vid=<bad>`: `video.src` set before `await video.play()`; on failure src stays truthy → `waitForHands` still holds the bell in "mouse mode" AND :408 spawns Face/Hands workers on a dead element (cam 0/s) | b4-hold E_bogusVid: `mouse mode` + `entranceWaiting=true` ~8.1s ("FINDING YOUR HANDS" shown), gpu-worker adopted on dead feed |
| — | waitForHands feature | VERIFIED WORKING — do not regress: deadline release @35s while still loading; ready-release @~22s; notrack/denied never hold; countdown frozen at 3 + player untouchable during hold | b4-hold subtests A-E |
| — | quota mid-fight | VERIFIED SAFE — recordKo/recordEnd/store.set throw→caught, endcard still renders (0 pageerrors) | b4-quota.json checks.pass=true |
- b4-render landed: mitt save/restore try/finally, mitt-id whitelist,
  scene dispose() idempotent + InstancedMesh release, qe-runner --gpu warn.
  Notes the same qe-e2e L/N/O/P instability → b4-e2e boundary.

### Orchestrator integration (post-soak)
- P3 double-fetch → FIXED: grace-3 verdict-wait (bootMs×3) — never a second
  fetch while worker plausibly boots; dead-man cap covers silent-hung
  workers; worker kept for late-adopt (probe J contract preserved).
- P4 bogus-?vid hold → FIXED: videoLive gate (real frames only) for
  trackers + waitForHands + fps-status.
- qe:static probes D/E/G/J updated to wait-for-verdict contract → CLEAN.
- boxing.html contract imports → dynamic w/ parkFail degrade (user's
  cornerHold halftime work preserved — they extended the re-arm predicate).
- npm test green: fuzz 82 + server 227 + legacy. Live :8791 restart
  pending (browser agents still attached).
- b4-e2e in-flight (89/90): only 'ghost gloves (glove spots clear)' fails —
  chevron-bleed into ±24px box at .3w on 390w viewport (chevron reaches
  ~74-110px; box starts at 93). Fix post-landing: ±18px boxes at .32/.68.
