# Brief: worker-fists (webcam hands → punches/blocks/sway)

You are building the **input combat layer** for a Punch-Out!!-style webcam
boxing game in `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
FIRST read `/home/ANT/unclockable-knighthacks-2026/.teamwork/CONTRACT.md`
fully — your `FistTracker` API is fixed there (fists.js section), including
the depth model. Also read `shared/hands.js` and `shared/face.js` for the
exact input shapes you consume.

## Your slice
`shared/boxing/fists.js` — pure-JS per-frame classifier turning MediaPipe
hand/face state into boxing inputs. No THREE, no DOM — plain node testable.

## Requirements
- `FistTracker` per CONTRACT: `update(handsState, faceState, dt)`,
  drainable `punches`, `guard{left,right}`, `sway`, `calibrate()`, `debug()`.
- DEPTH MODEL (core mechanic — "hand grows bigger = closer to screen"):
  per hand, `span = hypot(lm[9].x-lm[0].x, lm[9].y-lm[0].y)`. Maintain a
  baseline span per side via slow EMA while the hand is calm;
  `reach = span / baseline`. A **punch event** fires when d(reach)/dt is
  fast-positive through a threshold while the hand is fist/closed-ish
  (`kind==='fist'` OR few fingers extended) — power ∝ peak reach (cap ~1.8).
  Retract (negative velocity) resets the throw so combos work.
- Punch kind: 'jab' = left hand, 'cross' = right hand (simplification);
  'hook' when lateral palm velocity dominates the thrust; 'uppercut' when
  upward velocity dominates. Tune so casual testers trigger jabs reliably.
- Guard: glove-up-ness 0..1 per side — high when palm y is above chest
  zone / near face band AND hand is close (span ≥ baseline). Both up ~1 =
  block stance. Face tracking may supplement (face.size = lean-in).
- Sway: `faceState.nose.x` vs calibrated center → smoothed -1..1.
  `calibrate()` sets current nose.x/span baselines (call on 'C' key).
- Robustness: missing hand → that side decays gracefully; `handsState` may
  be replaced wholesale with a synthetic object (tests use
  `window.__forceHands`-style injection) — never cache identity across
  update(), only read the current frame's fields + your own EMA state.
- Export `TUNING` constants at top (thresholds, EMA rates, reach cap).

## Test — `test/boxing-fists.mjs` (node, no deps)
Build a tiny fake-landmark generator (21 pts around a center, scalable —
see test/jobverify.mjs `lm()` for the pattern) and scripted state feeds:
1. Calm hand → baseline settles; no punches emitted.
2. Fast span growth on left → exactly one 'jab' punch event, power>0.
3. Same on right → 'cross'. Lateral-dominant motion → 'hook'.
4. Both hands high+close → guard ≥ .6 both sides.
5. nose.x offset → sway sign correct; calibrate() re-zeros it.
6. Hand disappears mid-thrust → no NaN, no stuck punch.
PASS/FAIL lines, non-zero exit on failure.

## Your files (ONLY these)
- `spatial-objects/shared/boxing/fists.js`
- `spatial-objects/test/boxing-fists.mjs`
- `.teamwork/reports/worker-fists.md`

Run your test until green before reporting done.
