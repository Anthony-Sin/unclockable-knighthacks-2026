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
