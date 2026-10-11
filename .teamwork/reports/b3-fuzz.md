# b3-fuzz — wave-3 pure-logic fuzz + fixes

Worker: **b3-fuzz** (node-side QE, no browser). Repo: `spatial-objects/`.
Suite: `test/qe-fuzz.mjs` — extended 765 → 1318 lines, **37 → 69 checks**, deterministic (identical output on repeat runs), ~1.4s runtime.

`npm test` all green: boxing-fight 80, boxing-ring 37, boxing-fists, boxing-proto, boxing-audio 25, boxing-tutorial 7, **qe-fuzz 69**, qe-server 115 — 0 failures, ~15s total.

## Findings (all fixed this wave)

| # | Sev | File:line | Bug / evidence | Fix | Verification |
|---|-----|-----------|----------------|-----|--------------|
| 1 | HIGH | `fists.js:102` (`_clean`), calls at 79/157/311 | Finite-but-degenerate tuning poisons outputs: `MIN_SPAN<=0`→bad reach, `SWAY_RANGE=0`→NaN sway (÷0), `GUARD_RATE:-8`→EMA diverges (guard drifted below 0 every frame), `REACH_CAP<=1`→÷0 in power norm, `RESET_VEL:-1e9`→dead tracker | `_clean()` sanitizes `this.T` in ctor/`update()`/`calibrate()`: floors on divisors/windows, non-neg rates, band re-order, `REACH_CAP>1`, `FIRE_FRAMES>=1`, `POWER_FLOOR∈[0,1]`, EMIT/RESET_VEL sanity | 24-case battery + live `ft.T` mutation → all outputs in contract (`|sway|≤1`, `guard/duck∈[0,1]`, `power∈[0,1]`), tracker still emits punches |
| 2 | HIGH | `fight.js:211-235` | `reset()` leaks: `_wantSlam` survives → rematch opens with slam telegraph; `opts.playerHp='x'`→string hp, `npcHp=-9`→neg hp, `roundLen=NaN`→NaN `timeLeft` (fight never advances) | reset floors hp/roundLen (`Math.max(1,num(...))`), coerces `npcName`, clears `_wantSlam/_wantSledge/_wantCombo/_normals/_swing`/telegraph/transients | reset() mid windup/punch/down/win/countdown → recovers + verdict; mutated opts → 100/1/90/'PIP'; identical replay after reset |
| 3 | HIGH | `fight.js:161-169` (`saneT`), 216-218 (snapshot), `this._T` throughout | Live mutation of exported `TUNING` poisons in-flight fight: `TUNING.dmg.jab=NaN`→NaN hp; `TUNING.windup.jab=NaN`→`NaN>=NaN` never true → **permanent windup wedge** | `_TDEF/_SDEF/_VDEF` deep snapshots at module load; recursive `saneT`; per-instance `_T/_special/_stat` re-taken every `reset()`; all logic uses `_T` | garbage-TUNING fight + live-mutation mid-fight → invariants hold, windup completes, verdict reached |
| 4 | MED | `ring.js:83` (`_clean`), calls at 73/96/115 | Live `sim.t` mutation (`accel=NaN`, `npcSpeed<0`) → NaN positions within a few steps | `_clean()` on ctor/reset/every `step`: non-finite/negative → defaults, `playerPushShare∈[0,1]`, radius ≥ 2 bodies, `orbitFlipMax≥Min` | ringLegality holds under live tuning garbage; post-reset replays seeded trajectory exactly (`diff=0`) |
| 5 | MED | `audio.js:278-285` (`_crowdOff`), 317/334/350 (`onended`) | Graph leak: strict mock counted +40 edges into master after 20 plays; crowd on/off left stopped `src/filter/lfo` connected permanently | `onended` → env-gain `disconnect()` for `_tone/_fm/_noise`; `_crowd` stores full chain (`src,gain,lfo,filter,lg`), `_crowdOff` disconnects all defensively | 400-event storm + 40 crowd toggles → drain → `master._ins === 0` (was unbounded before) |
| 6 | LOW | `protoBoxer.js:1138` | `tick(dt, Object.freeze({}))` throws `Cannot add property pose, object is not extensible` | debug state writes in try/catch | frozen/sealed state + double `dispose()` → no throw |
| 7 | LOW | `protoBoxer.js:936-938` | `warned` set grows unbounded: 300 unique pose names → 300 warns | dedup cap 64 | 300 unique poses → warns ≤64, >0 |
| 8 | LOW | `tutorial.js:62,81` (time clamps), 112-119 (`_els`/`_pips`), 151 (`_els.w`) | Partial DOM stubs throw (`querySelectorAll`→null spread; missing `.tut-*` el write); `now < t0` → negative elapsed | null-safe `_pips`/`_set`/width guards; `Math.max(0, now-…)` on both clocks | fake-DOM root → no throw; −120s clock regression → still finishes; abandoned 40s → finishes; `fight.reset()` mid-run → finishes |

Note: `Fight.ai` is now a getter (`fight.js:204`) so `opts.ai`/`opts.practice` are live-flippable mid-fight — verified both directions.

## New wave-3 coverage in `qe-fuzz.mjs` (32 new checks)

- **§8 state-machine legality** — enumerated phase-pair table (`intro→countdown→fighting→{countdown,npcdown,playerdown,win,lose}→…`), npc.action transition table, per-action duration ceilings (`actionT ≤ bound+3dt`), terminal stickiness — 3 seeds × 9 variants, every fight reaches a verdict.
- **§9 full fights** — decision LOSE (passive giant), decision WIN by hp fraction, npcHp=1 KO, playerHp=1 KO, roundLen=1 (clock re-arms each round, heal observed), 14 ctor combos (`npcName:null/5/''`→'PIP', `npcHp:.01`→floored), rage scaling measurable (wounded PIP telegraphs faster, same seed/kind).
- **§10 boundary values** — sway `±dodgeT`/`dodgeT−1e-9` (held lean = aimed → hit), fresh lean → dodged, held duck vs upper (`duckUpperMul` via committed dodge), guard `guardT`/`guardT−1e-9` mirrored side, gassed guard (`gasGuard<guardT`), distance `npcReach`/`npcReach+1e-9`/`npcReach−.01`, player reach `edge`/`edge+1e-9`.
- **§11 reset + live flips + TUNING garbage** — reset mid windup/punch/down/win/countdown → recovers+verdict; mutated-opts re-floor; deterministic replay; live `practice`/`ai` flips; module-TUNING garbage (new + in-flight fights).
- **§12 fists** — 24 degenerate finite tunings + live `ft.T` mutation → contract bounds + liveness.
- **§13 audio** — 400 out-of-order events (`ko` before `round-start`, `win` mid-fight, rapid mute) on a strict ctx that throws on non-finite params (Chrome-like); drain→`master._ins===0` leak check; every EVENT_VOCAB event → real SFX.
- **§14 proto/ring** — warn cap 64, sealed/frozen state, double dispose, ring reset determinism.
- **§15 tutorial** — abandon 40s, −120s clock regression, `fight.reset()` mid-run, partial fake-DOM.

## Routed bugs

None new. The previously routed `npc.js` NaN-kick issue stays out of scope (already fixed per routing). No new out-of-boundary findings — all defects found this wave were in owned files.

## Notes / assumptions

- `ducked-into` requires the *committed* duck dodge (`dg.dir`) to be live at impact (`dodgeWin=.5s`); a duck only *held* since before the telegraph is read as `aim='duck'` and hits normally — test timed accordingly.
- Backwards-clock tutorial semantics: regression pauses rather than wedges (age clamps at 0, resumes once `now > t0`) — verified it still terminates.
- No git mutations, no `.env`, no new deps, server untouched.

TEAMWORK_DONE b3-fuzz
