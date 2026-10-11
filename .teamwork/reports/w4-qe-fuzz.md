# w4-qe-fuzz — QE round 2: deterministic fuzz/property sweep of pure game logic

Worker: **w4-qe-fuzz** (no browser work). Owned files:
`shared/boxing/{fight,fists,ring,protoBoxer,tutorial,audio}.js`,
`test/qe-fuzz.mjs` (new), `package.json` (test script only).

Deliverable: a seeded, deterministic fuzz/property suite
(`test/qe-fuzz.mjs`, 765 lines, 37 checks) exercising malformed inputs,
state-machine fuzzing, invariant checks, 60k-tick soaks, audio-graph fuzz
with a strict mock `AudioContext`, and a wired fists→fight→ring integration
chaos run. All defects it surfaced are fixed in the owned files and
regression-covered by the suite. `node test/qe-fuzz.mjs` is appended to
`npm test`.

## Verification (deterministic; the only wall-clock read is one perf assert)

- `node test/qe-fuzz.mjs` → **37 passed, 0 failed**, exit 0.
- `npm test` → **285 checks green, 0 failures**, exit 0:
  boxing-fight 80, boxing-ring 37, boxing-fists 43, boxing-hands 4,
  boxing-proto 52 ("all green"), boxing-audio 25, boxing-tutorial 7,
  qe-fuzz 37.
- Determinism re-verified: two consecutive `node test/qe-fuzz.mjs` runs
  produce byte-identical output (`diff -q` clean) — a single mulberry32
  stream drives every random generator, `reseed()` between sections keeps
  failures attributable.

**Concurrency note**: a cross-cutting `blocky`→`sumo` variant rename by the
proto/fight design worker touched `protoBoxer.js` and `fight.js` while this
work was in flight. `npm test` was transiently red (5 checks: stale SLEDGE/
'blocky' expectations in their `boxing-fight.mjs`/`boxing-proto.mjs`) until
their test updates landed; final state is green. All w4 fixes survived
their edit (verified by re-diff). Their compat flag `_wantSledge` did
surface one new NaN path in my file — fixed below.

## Findings (all fixed in owned files, all regression-covered by qe-fuzz)

Pre-existing hardening confirmed by the suite (committed before this
round, not re-fixed): fists `_usable()` shape gate, `FIRE_FRAMES`
sustained-hot requirement, hands `Array.isArray` gate, dt guards,
instance `MIN_SPAN` in `calibrate()`; fight `dt` clamp + `num()` input
sanitization + `distance`→Infinity default; ring `!(dt>0)` skip, dt cap,
input-field normalization, asymmetric `_pushNpcOff` (player stays planted).

| severity | file:line | evidence | fix | verification |
|---|---|---|---|---|
| **high** (nondeterminism / caller mutation) | fight.js:232–238 | `step()` aliased the caller's `inputs.punches` array into a persistent buffer, then ran `buf.length = 0` on the next non-array step — **truncating the caller's array**. Two runs over the same input stream diverged: `fighting\|1\|77.05\|93\|145\|idle` vs `fighting\|1\|100\|96.15\|129\|windup` — a real determinism defect (contract requires seeded determinism), and any caller retaining its punches array got silently corrupted. | Punches are copied into the persistent buffer, capped at 64/step at ingest. | `fight: garbage-stream determinism` — same 2000-input stream → identical phase/round/hp/score/action twice. |
| **medium** (hang) | fight.js:173–179 | `roundLen: NaN/-5/'x'/Infinity` → `timeLeft` never reached 0 → rounds never ended → fight stuck in `fighting` forever. `playerHp/npcHp ≤ 0` spawned already-down fighters. | Floors: `playerHp/npcHp ≥ 1`, `roundLen ≥ 1` via `num()` finite-guard. | `fight: degenerate opts → state stays legal` — 12 garbage-opt cases × 2400-s simulated budget. |
| **medium** (wedged NPC) | fight.js:341–346, 601–608 | `throwPunch(kind, side, windup)` accepted `windup ≤ 0 / NaN / 'x'` → `_windupFor ≤ 0` → `telegraph.t01` never reached 1 → PIP telegraphed forever (tutorial stalls on its scripted swings). Garbage `kind`/`side` also leaked into telegraph state. | `kind` validated against `TUNING.windup`, `side` forced left\|right, `windup` must be finite & > 0 else per-kind default; `_windupFor` floored at `.05`. | `fight: throwPunch garbage windup/side → never wedges` — 8 garbage windups × 15 s all resolve. |
| **medium** (out of bounds) | ring.js:81, 93, 259–266 | `RingSim({radius:.1})`: `_home` fixed at (0,1.5) sat outside the shrunken ring → the corner leash dragged the player out of bounds (`r=0.780 > lim=0.200`), and two bodies of radius .34 cannot fit inside r=.1 → permanent overlap. | `radius ≥ 2·bodyRadius + .3` floor; `_home.z = min(1.5, (radius−bodyRadius)·.9)`; leash cap `min(playerLeash, ringLim − \|home\|)` keeps the player inside the ropes by triangle inequality; `_clamp` lim floored at 0. | `ring: garbage TUNING overrides → sim stays legal` — 19 degenerate cases × 300 steps, legality each step. |
| **medium** (throw) | ring.js:103–112, 72–82 | `sim.step(dt, 'press' / 42 / null)` dereferenced `input.npcDir` → TypeError. Non-finite/negative tuning overrides (`accel:-5`, `playerLeash:-1`, `playerPushShare:9`, `orbitFlipMin:'x'`) produced NaN/inverted physics. | Non-object input → `{}`; per-key finite/non-negative fallback; `playerPushShare` clamped to [0,1]; orbit bounds ordered. | `ring: step(dt, null/primitive) never throws` + garbage-TUNING case battery. |
| **medium** (permanent NaN rig) | protoBoxer.js:869–877, 999–1006 | `pose('idle','x')` / `t01 = NaN` baked NaN into pose targets → `tick()` lerped node transforms to NaN **permanently** (`lerp(NaN→x)` stays NaN). `tick(NaN)` NaN'd `time` → every transform NaN forever. `strike {reach:NaN/-5/1e9, y:'x'}` dragged the glove off the rig. | `t01`/`dt`/`moveSpeed` finite-guarded (bad frame skipped); `strike.reach` clamped [0,2.5], `strike.y` [0,2]. | `proto: 3000 pose/tick chaos — transforms stay finite` + `NaN/∞ dt — rig recovers`. |
| **medium** (throw) | protoBoxer.js:121–130, 960–975 | `buildBoxer(THREE, null/5/'x')` destructured a non-object → TypeError. `trackHands({hands:5/'x'/{}})` threw (`for..of` non-iterable); a NaN palm poisoned the glove blend target permanently; NaN landmark span poisoned z. | Destructure inside with `opts \|\| {}`; non-array hands → `[]`; per-hand finite palm gate; span NaN → `.1`. | `proto: garbage buildBoxer opts` + `trackHands structural garbage` + `NaN hand palm — glove recovers`. |
| **medium** (real-ctx crash) | audio.js:54, 279–335 | A NaN `dmg`/`delay`/`peak`/`f`/`q` from a glitched state flowed into `AudioParam.setValueAtTime` — real Chrome contexts throw RangeError, killing the audio path mid-fight. | `fin(v,d)` choke point: every synth helper (`_env`/`_tone`/`_fm`/`_noise`) sanitizes delay/attack/dur/peak/freq/Q; `_now()` finite-guarded. | `audio: 1200 garbage events on strict ctx` — mock params throw on non-finite like real Chrome; zero throws. |
| **medium** (node flood) | audio.js:185–190 | `play('bell', {times: 1e9})` scheduled a billion FM voices — unbounded node creation / tab freeze. | `times` clamped to [1,8]. | `audio: times=1e9 is bounded` — node count < 200. |
| **low** (meter poison) | audio.js:120,127,160–180 | `update(NaN dt)` froze `_crowdLevel`/`_breathT` at NaN → crowd swell and gassed-breath beds died for the session; `stamina: NaN` propagated into `_breathT`. | `dt` finite-guarded; `(this._crowdLevel \|\| 0)` on every accumulate; `!(_breathT > 0)` re-arms a stuck timer; stamina finite-clamped. | `audio: 500 garbage update() calls — meters stay finite` + `crowd swell survives garbage dt`. |
| **low** (throw) | tutorial.js:32–48, 60–62 | `new Tutorial(null)` destructured `null` → TypeError. `{sim:{}}` crashed in `_spar` at construction (`this.sim.player.pos` → `undefined.pos`). `sim.distance:'x'` threw on call. | `opts \|\| {}`; `_spar` guards `sim?.player?.pos`/`N?.pos`/`N.vel`; `typeof distance === 'function'` gate. | `tutorial: degenerate constructor/update args never throw` incl. 4 malformed-`sim` shapes. |
| **low** (dead failsafe) | tutorial.js:51–55, 64, 70, 91, 115 | `update(out, NaN)` wrote `t0 = NaN` → `now − t0 >= TOTAL` always false → the 30-s cap died → tutorial could run forever. Malformed `out` (`events:5`, `state:{}`) or a missing `fight` skipped/garbled state access. | Non-finite `now` returns early; `out.state` falls back to `fight?.state`; events iterated only if array; `throwPunch`/`state`/`_render` null-guarded. | `tutorial: NaN clock → still finishes under TOTAL+ε` + `malformed out → still terminates`. |
| **low** (throw) | fight.js:229 | `step(dt, null/42/'x')` dereferenced `inputs.punches` → TypeError (default `{}` only covers `undefined`). | Non-object inputs → `{}`. | `fight: step(dt, null/primitive) never throws`. |
| **low** (punch flood / perf) | fight.js:235–238 | A pathological 200k-entry `punches` array flooded `state.events` and stalled the frame (same fix as the determinism row — the copy loop caps ingest at 64). | Copy ≤64/step at ingest. | `200k-entry punches → events ≤400, step <100 ms`. |
| **low** (garbage tuning) | fists.js:79–82 | `new FistTracker({MIN_SPAN:'x'})` silently bricked the tracker forever — `span > 'x'` is false → every hand rejected, punches stop. | Non-finite per-key override falls back to `TUNING`. | `fists: garbage tuning opts → tracker still works` — 5 degenerate cases still emit punches. |
| **low** (NaN anchor) | fists.js:135–139 | `face {size: Infinity}` (a real tracker output under degenerate ROI) poisoned `_faceSize` via EMA → NaN guard-height band forever. | `Number.isFinite(f.size) && f.size > 0` gate before EMA. | `fists: face.size=Infinity → _faceSize stays finite`. |
| **low** (NaN hp) | fight.js:648–660 | The rename worker's `_wantSledge` compat flag can be forced on a non-slam spec whose `dmgMul`/`chip` don't exist → `dmg = 17·1·undefined = NaN` → `player.hp = NaN` (stale boxing-fight test showed `took=NaN`). | `num(spec.dmgMul, 1)` / `num(spec.chip, T.blockMul)` fallbacks — hp stays finite on every slam/compat path. | boxing-fight stale-check now computes `took=8.5` (finite); qe-fuzz invariants unchanged. |

## Fuzz coverage notes

- **fists** — 2500-frame chaos stream (non-array hands 10–16%, malformed
  entries, truncated/NaN landmark clouds, NaN/garbage palm, garbage face,
  dt pool {0,−1,1e-6,.5,10,NaN,±∞,'x'}); per-frame guards on sway/duck/
  guard/reach ranges, punch vocab (`kind`/`side`/`power`/`t`); `debug()`
  finiteness; 60k-tick soak verifying the `punches` cap (`PUNCH_MAX`).
- **ring** — 5000 chaos steps + 19 degenerate-tuning constructor cases +
  live `sim.t` mutation to NaN; legality asserted every step: finite
  pos/vel, `|pos| ≤ radius − bodyRadius`, `distance ≥ Σradii·.99`,
  `angleToNpc` finite. Determinism: identical 900-step trajectory per seed.
- **fight** — 3 seeds × 8000 chaos steps with a full invariant check after
  every step: phase ∈ enum, `0 ≤ round ≤ rounds`, `0 ≤ timeLeft` finite,
  hp ∈ [0,maxHp], stamina ∈ [0,1], score ≥ 0, `npc.action` ∈ enum,
  telegraph `t01∈[0,1]`/`kind`/`side` valid, every event ∈ vocab,
  `lastBlow.result` ∈ enum. Plus: degenerate constructor opts, garbage
  `throwPunch` windups (anti-wedge), 5 seeds reaching win/lose inside a
  computed round budget, 200k-punch flood bound + step-time bound,
  practice-mode 3000-step no-KO fuzz, 2000-input garbage-stream
  determinism A/B.
- **tutorial** — simulated runs wired to a real `Fight`+`RingSim`: passive
  player with a NaN clock frame injected mid-run; malformed `out` every
  frame; 3 seeded random brains — all must `done` ≤ TOTAL+15 s;
  degenerate constructor/update args incl. 4 malformed-`sim` shapes.
- **audio** — strict mock AudioContext whose params throw `RangeError` on
  non-finite values (exactly like real Chrome — a silent no-op mock would
  hide this defect class); 1200 mixed valid/garbage events + malformed
  `lastBlow`/`countdown` states; garbage `play()` opts incl. `times:1e9`
  node-flood bound; 500 garbage `update()` calls + post-storm liveness;
  EVENT_SFX coverage (valid events still handled mid-storm).
- **protoBoxer** — minimal THREE stub; garbage `buildBoxer` opts; 3000
  random `pose(name,t01,strike)`/`tick(dt,state,moveSpeed)` calls with a
  traversal finiteness audit every ~97 iters; NaN-dt then NaN-palm
  **recovery** checks (not just "no throw" — the rig must come back);
  structural `trackHands` garbage; 60k-tick soak; stream determinism.
- **integration** — 12000 ticks wired exactly like `game.js`
  (`ft.update → f.step(punches,guard,sway,duck,distance) → sim.step(npcDir,
  stunned,playerStep)`), fight invariants + ring legality every 16 ticks.

## Residual risks

- **Bounds are "sane-value" not formal proofs**: legality tolerances
  (`1e-6`/`·.99`) and event caps (≤400) are engineering margins, not exact
  contract maxima — a regression could sit inside them briefly.
- **Coverage is stochastic-shaped**: seeds are fixed so the suite is
  deterministic, but a defect reachable only on an untaken random path
  needs a new seed/case to surface (usual property-fuzz caveat).
- **`play()` call-rate**: `bell.times` is capped, but a caller looping
  `play()` itself can still create many nodes per frame — rate limiting
  `play()` is a product decision left to callers.
- **RingSim `_pushNpcOff` asymmetry** assumes the player must stay planted
  (first-person design); a future symmetric mode would need the no-overlap
  bound revisited.

## Bugs routed to other owners

| severity | file:line | evidence | suggested fix | owner |
|---|---|---|---|---|
| **medium** | shared/boxing/npc.js:361–363 | One `NaN` dt into `api.update` permanently poisons `api.kick` → `group.position` NaN forever — the NPC mesh vanishes for the session. Repro (node): `kick.x *= Math.exp(-NaN*7)` → NaN; next good frame `NaN *= anything` → still NaN. Same defect class fixed in `protoBoxer.tick` — but `npc.js` sits outside my boundary. | `if (!Number.isFinite(dt) \|\| dt <= 0) dt = 0` before the kick decay; or `(api.kick.x \|\| 0)` guards. | e2e/npc worker |

No other out-of-boundary defects surfaced during the 12k-tick integration
fuzz (the `game.js`-wired path stayed inside all invariants).

## Files changed

- `shared/boxing/fight.js` — opts floors; non-object-input guard;
  punches copied into a bounded buffer (determinism + flood fix);
  `throwPunch` kind/side/windup sanitize; `_windupFor` positive floor.
- `shared/boxing/fists.js` — per-key finite fallback for tuning overrides;
  `face.size` finite gate.
- `shared/boxing/ring.js` — tuning sanitize + radius floor + orbit ordering;
  `_home` inside ropes; leash cap bounded by ropes; `_clamp` lim ≥ 0;
  non-object-input guard.
- `shared/boxing/protoBoxer.js` — `opts || {}` destructure; `t01` finite
  guard; strike reach/y clamps; `trackHands` array+finite gates; `tick`
  dt/moveSpeed guards.
- `shared/boxing/tutorial.js` — `opts || {}`; NaN-clock guard; malformed
  `out`/`sim`/`fight` tolerance throughout.
- `shared/boxing/audio.js` — `fin()` sanitization through all synth helpers;
  `_bell` times cap; crowd/breath meter NaN recovery; `_now` guard.
- `test/qe-fuzz.mjs` — **new**, 765 lines, 37 deterministic property checks.
- `package.json` — `test` script gains `&& node test/qe-fuzz.mjs`.

No git mutations, no dependency changes, `.env` untouched, live server
untouched, no browser launched.
