# worker-fists — report

## Built
`spatial-objects/shared/boxing/fists.js` — pure-JS `FistTracker` per CONTRACT
(no THREE/DOM; `window.FistTracker` guarded for browser-global parity).
`spatial-objects/test/boxing-fists.mjs` — node-only test, 31 checks, all PASS.

## API (as contracted)
`new FistTracker(opts)` → `update(handsState, faceState, dt)` · `punches`
(drainable `[{kind, side, power:0..1, t}]`) · `guard{left,right}` · `sway` ·
`calibrate()` · `debug()` · exported `TUNING`. `opts` merges over `TUNING`.

## Design notes / assumptions
- **Punch lifecycle:** `idle → throw → recover → idle`. Throw *starts* when
  smoothed `d(reach)/dt > FIRE_VEL` (1.5 reach/s) while fist-ish; the event
  *emits* at apex — when forward motion dies (`reachVel < -0.05`) or after a
  0.3 s hold-out — so `power ∝ peak reach` (cap 1.8 → power 1, floor 0.15).
  `recover` blocks re-firing until `reachVel < 0.25` ⇒ retract re-arms combos.
- **Kind:** net throw motion is integrated in hand-size units
  (thrust = Δreach, x/y = palm travel ÷ span) — comparable channels; the
  dominant channel picks hook (lateral) / uppercut (upward) / jab|cross (side).
- **Baseline** is a slow EMA (1.2/s) gated on *smoothed* velocities being
  calm — raw MediaPipe jitter would otherwise never qualify as "calm".
  Frozen while moving or mid-throw. Snaps on first sight, on `calibrate()`,
  and after >45 missing frames; velocities snap (not spike) on any re-acquire.
- **Guard** = height factor × closeness factor, EMA-smoothed. Height band is
  anchored to the smoothed nose (`palm.y` vs `nose.y + 0.18`, range 0.2) when
  a face is found, else fixed band [.36→.58]. Closeness = reach ≥ ~1.
- **Sway** = smoothed `(nose.x − calibrated cx)/0.13`, clamped ±1;
  + = head toward screen-right (selfie-mirrored = player's right). Decays to
  0 when face is lost. `calibrate()` snaps `sway=0` immediately.
- Hands with missing `side` fall back to palm-x half (screen-left = left).
- `punches` is never auto-cleared (consumer drains); capped at 16 as safety.

## Verify
`cd spatial-objects && node test/boxing-fists.mjs` → `ALL PASS`, exit 0
(37 checks). Covers all 6 briefed scenarios + combo re-arm, degenerate
inputs, opts override, and the adversarial-review regressions below.

## Fixes after adversarial review (review-fists.md)
All 5 defects fixed; regression assertions added (test §9):
1. **Non-array `hands`** (`{}`, `'x'`, `5`, `Map`) → guarded with
   `Array.isArray(handsState?.hands)` — malformed state = empty frame.
2. **Null/non-object hand entries** → find predicate runs `_usable(h)`
   (null-safe) before `_sideOf(h)`; `[null, validHand]` no longer crashes
   or blocks the valid hand.
3. **Landmark holes** → `_usable` requires finite `lm[0]`/`lm[9]` x/y
   (the only two landmarks the depth model reads); holey lm → treated as
   a missing-hand frame, never throws.
4. **1-frame jitter phantom punch** → new `FIRE_FRAMES: 2` debounce:
   `reachVel > FIRE_VEL` must persist ≥2 consecutive frames before the
   throw engages (`S.hot` counter). A single-frame span spike heats once
   then collapses — zero punches; a real 2-frame throw still fires.
5. **`calibrate()` ignored instance `MIN_SPAN`** → now `this.T.MIN_SPAN`,
   so constructor opts override is honored (regression test snaps a
   baseline through an override-scoped span).

## Known gaps / notes for integrators
- Punch events emit at apex/retract (≈1–3 frames after peak extension), not at
  threshold crossing — lowest practical latency while honoring peak-reach power.
  The FIRE_FRAMES debounce adds ~1 frame of trigger latency on top of that.
- A hand suddenly appearing large after a >45-frame absence re-snaps baseline
  (reach=1) rather than firing — intentional anti-phantom choice.
- `punches[].t` (seconds since tracker start) is an extra field over contract;
  safe to ignore.
- No `window.__forceHands` consumer exists yet — scene worker wires it; this
  module reads whatever `handsState.hands` is passed each frame, fresh.
