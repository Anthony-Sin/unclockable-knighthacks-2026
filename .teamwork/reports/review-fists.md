# Review: shared/boxing/fists.js + test/boxing-fists.mjs
Reviewer: adversarial. Verified independently — ran tests, wrote /tmp probes (no repo edits).

## Verified working (with evidence)
- `node test/boxing-fists.mjs` → 31 PASS lines, `ALL PASS`, exit 0. Assertions are real
  (`check()` increments `fails`, `process.exit(fails?1:0)`).
- API surface: `FistTracker(opts)`, `update(handsState,faceState,dt)`, drainable
  `punches` [{kind,side,power≤1}], `guard{left,right}`∈0..1, `sway`∈-1..1,
  `calibrate()`, `debug()`, `TUNING` export. All confirmed by probes.
- Depth model per contract: span=hypot(lm9−lm0), EMA baseline while calm,
  reach=span/baseline (fists.js:130-152). First-sight span snap → no phantom punch
  when a hand appears mid-frame already large.
- 3-state machine idle→throw→recover; jab/cross/hook/uppercut all classify
  correctly (test §2-3, my battery probe: 200 mixed frames → all events valid).
- Punch gating verified: open-palm thrust → no punch; slow reach growth → no punch;
  fist thrust → punch. Power clamped ≤1 (≤1.8 spec).
- Missing hand → guard decays to 0, half-throw cancelled, debug stays finite.
- dt=0/-5/NaN/Infinity/1e9 all safe (default + DT_MAX clamp). NaN palm/nose/lm → safe.
- Bare `node` import works; no THREE/DOM (only guarded `typeof window` shim, :238).
- A1: module outputs only punches/guard/sway — nothing implies foot movement. PASS.
- A4: zero glove rendering in module. PASS.

## Defects

1. **Crash on non-array `hands`** — fists.js:121 only guards null/undefined
   (`|| []`), then :124 calls `hands.find`. `{hands:{}}`, `{hands:'x'}`,
   `{hands:5}`, `{hands:new Map()}` → `TypeError: hands.find is not a function`.
   One malformed state kills the whole per-frame update (uncaught → rAF-loop crash
   in game.js). Fix: `const hands = Array.isArray(handsState?.hands) ? handsState.hands : []`.
   Severity: medium.

2. **Crash on null/non-object hand entries** — fists.js:124 `find(h => this._sideOf(h))`
   reads `h.side` (:90) before `_usable` can filter. `{hands:[null]}` → TypeError.
   Worse: `[null, validHand]` throws too — one bad entry both crashes the frame AND
   blocks the valid hand. Fix: guard predicate (`h && typeof h==='object'`). Severity: medium.

3. **Crash on landmark holes** — `_usable` (:95) only checks `lm.length >= 10`;
   `Math.hypot(lm[9].x - lm[0].x, ...)` (:130) throws on `lm` containing null/undefined
   entries (`new Array(21).fill(null)`, `lm[9]=undefined` both TypeError). NaN coords
   are handled (span NaN → treated missing); structural holes are not. Fix: require
   finite `lm[0]/lm[9].x/.y` in `_usable`. Severity: medium — hands.js guarantees shape
   in production, but the module explicitly supports `__forceHands` injection.

4. **Single-frame landmark glitch fires a punch** — feed span 1.6→3.2 for ONE frame
   then back to 1.6: emits `jab` power=1.0. VEL_SMOOTH (:34) is documented to "kill
   1-frame lm jitter" but a 1-frame spike still crosses FIRE_VEL (:157) and emits on
   the next frame (:170, `reachVel < EMIT_VEL`); there is no MIN_THROW_T/debounce.
   Real MediaPipe pop-outs (no malformed input needed) → phantom punches → wasted
   stamina in fight.js. Fix: require reachVel > FIRE_VEL sustained ≥2 frames, or a
   MIN_THROW_T, or cancel throws whose span returns to baseline within ~2 frames.
   Severity: medium.

5. **`calibrate()` ignores instance MIN_SPAN** — fists.js:218 compares
   `S.lastSpan > TUNING.MIN_SPAN` (module global) instead of `this.T.MIN_SPAN`, so an
   opts override is honored in `update` but not `calibrate`. Severity: trivial.

## Observations (non-blocking)
- `point`/`other` hands with `nExt<=2` count as fist-ish → a pointing thrust fires
  a 'jab' (probe-confirmed). Defensible under "fist-ish"; flagging for awareness.
- `fistish` is only checked at throw start; a hand that opens mid-throw still emits.
- `PUNCH_MAX` silently drops oldest events if a consumer never drains.

## Verdict rationale
Core contract is fully implemented and the shipped test is honest. However the module
advertises robustness ("degenerate inputs → no throw" is literally a check in its own
test) yet has four input classes that throw uncaught, and one real-tracking-noise case
that produces phantom punches. In-scope, fixable in ~10 lines.

VERDICT: NEEDS-FIX (5 defects: 1 trivial, 4 medium — crash-on-garbage ×3, jitter phantom-punch ×1)
