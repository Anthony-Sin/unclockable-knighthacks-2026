# b5-fuzz — QE wave 5 report

Worker: `b5-fuzz` · Scope: `shared/boxing/{fight,fists,ring,protoBoxer,tutorial,audio}.js` + `test/qe-fuzz.mjs`
Result: **green** — `node test/qe-fuzz.mjs` 122/122, `npm test` 649/649, zero read-only edits.

## What this wave covered

1. cornerHold freeze semantics (`Fight.step(0)` is now a true freeze)
2. module singleton contamination (co-live instances stepped alternately)
3. adversarial structural inputs (Proxies, throwing getters, Symbols,
   flip-flop getters, sparse/cyclic objects) on every public entry point
4. three-bout replay determinism (per-step digest + event stream)
5. audio lifecycle (unlock/dispose/mute churn, crowd bed accounting)

## Defects found & fixed (owned files)

### fight.js — dt=0 was not a real freeze (HIGH)

`step(0, inputs)` still ran the whole pipeline: edge-triggered dodge
commits, punch resolution, NPC brain ticks, clock/stamina changes and
event emissions. Under `cornerHold` (`game.js:145-190` passes `hdt=0` for
the whole halftime break) a player holding a lean + punch walked back in
to a buffered dodge/whiff. Fix — gate all progression behind `dt > 0`
(`shared/boxing/fight.js:355-392`); input-edge memory (`_prevSway`,
`_prevDuck`, `inp.dodge`) still updates during held frames so actions
presented mid-hold are *consumed*, not buffered for a post-release
surprise.

Second defect in the same function: `s.events.length = 0` ran
unconditionally, so `fight.corner()` — called *between* steps from
`boxing.html:893` — had its `'corner'` event eaten by the next held frame
before the page drain could see it. Now the clear is gated on `dt > 0`
(`fight.js:349-353`); nothing internal emits at dt=0, so the queue is
exactly what external emitters left. **Consequence in a read-only file
routed below.**

Third: `state.events` is the public drain array — a frozen/replaced queue
threw on `.length = 0` or inside `_emit`, killing the whole step. Now
rebound to a fresh writable array before the clear + `_emit` drops events
on a sealed state instead of throwing (`fight.js:345-352, 524-527`).

Already-hardened inputs this wave also covered: punches array copied +
capped at 64 (`fight.js:355-365`), safe `sget`/`num` reads for
guard/sway/duck/dodge/distance/riseAspect, own-property dispatch for
`throwPunch`/`_playerPunch`/`_whiff` kind keys.

### protoBoxer.js — hostile pose name escaped via hasOwnProperty (MED)

`pose(name)` used `hasOwnProperty.call(POSES, name)` — an own-property
check on the *table*, but `name` itself runs ToPropertyKey → `toString` →
a Proxy get trap / Symbol throws right through the check. `b.snap(prox, t)`
killed the call. Fixed: safe `String(name)` coerce inside try before the
lookup, unknown-pose dedupe keyed on the coerced string so console.warn
never inspects the hostile object (`protoBoxer.js:947-965`).

### fists.js — hostile hands/face objects (MED)

`sget`/`sarr` wrappers (`fists.js:88-89`), Symbol/BigInt dt coercion
(`:191-194`), per-hand try/catch inside the hands loop, safe face reads,
tuning-table rebase on frozen/sealed/mutated `T` (`_clean`, `:123-156`).
A throwing hand object now drops out for that frame instead of killing
`update`.

### ring.js — hostile input + poisoned internals (MED)

Hostile ctor opts/seed (`ring.js:81-87`), `_clean` tuning
sanitization/rebase (`:98-118`), dt coerce+cap (`:139-141`), single-read
input snapshot so a flip-flopping `playerStep` getter can't
split-validate (`:144-156`), whole-frame try around the sim internals so
`sim.player = Proxy` skips one frame instead of wedging (`:157,265-269`),
finite-forced `distance()`/`angleToNpc()` (`:272-289`).

### tutorial.js — malformed `out`/`sim` state (LOW)

Safe opts reads (`tutorial.js:32-45`), `update()` wraps `_update` in a
frame-level try (`:68`), `step` getter and `_build` failures degrade to
no-op instead of throwing on partial/malformed state.

### audio.js — lifecycle + hostile input batch (MED)

`fin()` now catches Symbol/`valueOf` throws (`audio.js:61`); `unlock` is
atomic — a mid-setup throw can't leave `this.ctx` half-published
(`:90-…`); new `dispose()` stops+disconnects the crowd bed, disconnects
the master and closes the ctx (`dispose`/`_crowdOff`); `_crowdOn` early-
returns when a bed exists and rolls back on partial creation (no doubled
beds); osc `onended` disconnects its gain; `handleEvent`/`update`/`play`
wrapped for hostile evt/state/opts; own-property preset dispatch kills
`'__proto__'`/`'constructor'` plays.

## Wave-5 fuzz sections added (qe-fuzz.mjs, 82 → 122 checks, +40)

| § | checks | what it pins |
|---|--------|--------------|
| 20 cornerHold | 10 | 240 held frames bit-identical + 0 events; buffered punch/dodge/lean never leaks post-release; mid-swing telegraph pins t01/actionT/hp then resolves on schedule; `corner()` heal-floor + re-deal + refused outside `fighting`; `'corner'` survives held frames to the drain; hold ignored in countdown/playerdown/npcdown/win/lose; rise QTE freezes and resumes; 3000 toggle-spam pairs ≡ uninterrupted run |
| 21 contamination | 8 | two co-live `Fight`s ≡ their own solo runs over 6000 interleaved steps; distinct events/tuning/input-buffer objects; tracker/ring/proto/audio/tutorial sibling isolation; per-instance warn-dedup budget |
| 22 hostile structure | 8 | Proxy/throwing-getter/Symbol/sparse/cyclic inputs on every public entry point + ctors; frozen/replaced events queue survives; poisoned `sim.player` recovers; hostile injected audio ctx fails clean then recovers |
| 23 replay | 3 | 3 bouts same seed+stream → identical per-step digest + event stream through verdict; `reset()` ≡ fresh construction ×3000 steps |
| 24 audio lifecycle | 11 | edge-counting ctx: unlock idempotent, dispose mid-swell stops+disconnects all 5 crowd nodes + master + closes ctx + resets meters, post-dispose API inert, re-unlock rebuilds, `_crowdOn` never doubles, 200 unlock→sfx→dispose churn cycles, dispose×2 while muted |

`EVENT_VOCAB` gained `'corner'` (emitted by `fight.corner()` — was
missing from the legality set).

## Routed defects (read-only files — NOT fixed locally)

- **P3 boxing.html:900 + :1482 + :893 — doubled 'corner' chime.**
  `cornerTick` calls `fight.corner()` (:893) → emits `'corner'`; the
  manual `audio?.handleEvent('corner', st)` (:900) plays it same-frame,
  and the now-preserved queue delivers it *again* through `out.events` →
  `audio.handleEvent` (:1482) next frame → two bell dings per halftime
  break. The manual call was a workaround for the old queue-eating
  `step(0)` clear — now redundant and harmful. Fix belongs to the
  boxing.html owner (delete :900 or skip 'corner' in the :1482 loop).
  Filed in `.teamwork/routing-queue.md` under "b5-fuzz — routed".
- Contract note for the integrator: `step(0)` now preserves pending
  events by design; single-consumer `splice` drain (`game.js:232-233`)
  still owns delivery. No other read-only defect found.

## Verification

```
$ node test/qe-fuzz.mjs          → 122 passed, 0 failed   (was 82)
$ npm test                       → boxing-fight 103, boxing-ring 37,
                                   boxing-fists+hands+proto+audio+tutorial,
                                   qe-fuzz 122, qe-server 355 — all green,
                                   exit 0
$ node --check shared/boxing/*.js → all six clean
```

## Files changed

- `shared/boxing/fight.js` — dt=0 true-freeze gate, queue preserve +
  rebind-before-clear, `_emit` guard, hostile-input reads
- `shared/boxing/protoBoxer.js` — safe pose-name coercion before
  `hasOwnProperty`
- `shared/boxing/fists.js`, `ring.js`, `tutorial.js`, `audio.js` —
  hostile-input/lifecycle hardening (this wave)
- `test/qe-fuzz.mjs` — §20–24 (+40 checks), `EVENT_VOCAB` + `'corner'`
- `.teamwork/routing-queue.md` — one routed read-only defect

## Assumptions / notes

- `step(0)` = freeze is asserted at the Fight boundary; game.js also
  gates `fightIn` fields (sway/dodge latch stays live — `game.js:185`
  passes `sw` even while held — the fight-level edge-consumption fix is
  what makes held-lean safe there).
- Toggle-spam equivalence is checked with sub-dodge-threshold sway so
  edge memory can't legitimately diverge the run.
- 122 checks total (82 inherited + 40 new); no package.json change
  needed.
