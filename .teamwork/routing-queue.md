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
