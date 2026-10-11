# b5-render — Render layer wave 5 (freeze-frame integrity + canvas/context pressure)

Worker: **b5-render**. Boundary: `shared/boxing/{fx,scene,entrance}.js`,
`shared/boxing/mitts/*`, `shared/boxing/assetManifest.json`,
`test/qe-runner.mjs`. `boxing.html`/`game.js`/`npc.js`/`boxing-page.mjs`
read-only. Server :8791 untouched.

Method: re-read of owned files + consumers, node-level adversarial probes on
the real modules (vendored three r170 + stub canvas ctx with
throw-at-every-op fault injection), live puppeteer probe on :8791
(serialized on `.teamwork/qe/.chromium.lock`, niced, SwiftShader-only,
load1<10 / MemAvail>2.5 GB gated), `npm test` + `qe:static`.

## Findings — fixed in boundary

| sev | file:line | evidence | fix | verification |
|---|---|---|---|---|
| P3 | `shared/boxing/scene.js:185-210,243-270` | **All ambient animation ran on bout `dt` — cornerHold froze the whole arena.** `world.update(hdt=0)` advanced crowd bob, rope wobble, spotlight flicker and the decay of `excite`/`jolt`/`tel` — a live crowd frozen behind an 8 s corner card reads as a hung renderer, and a mid-decay rope jolt/telegraph glow would hold its displaced pose for the entire hold. | Split clocks: `t` keeps sim-time (still gated by `dt`), new `tw` advances by **wall-clock** elapsed time between calls (clamped ≤ .25 s, negative/NaN wall deltas → 0). Crowd/rope/spotlight phases and all transient decays now run on `tw`/`wdt`; confetti/sprites stay on `dt` (they're bout matter). | node: `update(0)` over 150 ms real → crowd Σy drifts; `update(0)` in a busy loop with the wall clock frozen → bit-identical Σy (no per-call drift). Live: crowd instance y's change across a real hold while fight `timeLeft` is bit-identical. |
| P3 | `shared/boxing/scene.js:226-239` | **Payoff events drained on a frozen frame birthed confetti mid-air.** `ko`/`win`/`lose` arriving with `dt=0` (cornerHold, hit-stop, tracker-wait) fired `burst()` immediately → confetti born inside the freeze, hanging motionless and surviving past release. | `pendingPayoff` latch: payoff events on `dt=0` defer the burst to the first live frame (`pendingPayoff && dt>0 → burst()`); excite/jolt still apply immediately (they're decay state, not sprites). | node: push `ko` on a frozen step → `confetti.visible=false`, 0 children; first `dt>0` step → confetti lives. |
| P4 | `shared/boxing/scene.js:220-227` | **A bout transitioning into `intro` (rematch/`game.reset()`) carried stale payoff state** — KO confetti + crowd hype + rope jolt from the ended bout raining over the new walk-in. | On `phase → 'intro'` from any non-intro phase: hide confetti, zero `cf[].life`, clear `excite`/`jolt`/`pendingPayoff`. | node: live confetti + `intro` transition → `confetti.visible=false`, all lives 0. |
| P4 | `shared/boxing/scene.js:255-262` | **Rope jolt could strand a displaced rope.** `jolt` decays under the `>0.02` threshold and the write loop simply stopped running — the last `sin()` offset stayed baked into `rope.position.y` for the rest of the bout. | `ropesHot` latch: when jolt decays below threshold, one last pass restores every rope to `userData.y0`. | node: jolt during a real hold → peakOff .0334 → settles to **0.0000** by hold end (previously held ~.001-.03). |
| P4 | `shared/boxing/scene.js:55-57` | **`renderer.shadowMap` unguarded.** `buildScene(THREE, {})` / `buildScene(THREE, null)` (test harnesses, partial stubs) threw `TypeError: Cannot set properties of undefined`. | `if (renderer && renderer.shadowMap) renderer.shadowMap.enabled = true;` | node: `buildScene(THREE, null)` and `buildScene(THREE, {})` construct fine. |
| P4 | `shared/boxing/scene.js:201-203` | **NaN/negative `dt` poisoned every phase.** One NaN frame → `t=NaN` → every sin()/matrix/light NaN forever; negative dt ran ambient time backwards. Non-object `state` or a truthy non-iterable `state.events` threw out of `update` mid-`game.step`. | sanitize `dt` (→0), `state` (→{}), `events` (→`[]` if not an array). | node: `update(NaN)`, `update(-1)`, `update(dt, null)`, `update(dt, {events: 5})` → no throw, crowd finite. |
| P4 | `shared/boxing/mitts/classic.js:92-99` | **Hard-throw on missing/absent ctx and non-finite pos.** `draw(null, …)` / stub ctx without `.save` hit `ctx.save is not a function`; `pos={x:NaN}` or `pos=null` threw on `pos.x` read/arithmetic. (Finite-absurd-origin + landmark-poison paths were already fixed in b4 — kept.) | Entry guards: gutted ctx → return; non-object/non-finite pos → return; finite-but-absurd `x/y` clamped to ±1e6 on a local copy (caller object untouched). | stub-ctx battery: null ctx, `{}` ctx, `pos=null`, `pos.x=NaN/1e308` → no throw, 0 ctx ops, caller pos pristine. |

## Wave-angle coverage

| required angle | what I did | result |
|---|---|---|
| **cornerHold freeze**: sprites/confetti don't drift, crowd keeps animating, nothing born mid-freeze survives | node probe on real `scene.update`/`fx.update` with injected `ko`/`win` events at dt=0 + live probe: real hit via `fight.throwPunch('hook',…)` → 18 live sprites, real corner (hp→¼) on :8791, snapshot crowd instanceMatrix + every visible fx sprite (pos+opacity) across 850 ms of hold, then release via the real skip button | crowd animates wall-clock during hold (cy `0.1651,0.7608,1.5821 → 0.0224,0.7113,1.6141`); all **25 live sprites bit-identical** across the hold; phase `countdown`/`timeLeft=90` bit-identical; confetti never visible; release via `[data-coachgo]` → `fighting` resumes and sprites drain to 7. |
| **hitFx ink-burst** (boxing.html — report-only) | live: 30 alternating heavy/light `player-hit-taken` events delivered through the **real** rAF drain (events pushed during the hold survive `fight.step`'s entry-clear, fight.js:345) → measured overlay ink in the burst band (αΣ at y≈.5H) before/during/after | band αΣ **0 → 1,772,712 → 0**: bursts visible during spam, band returns to **baseline 0** after 1 s quiet, `globalAlpha` back to 1 — **no ghost accumulation, clean heavy↔light reset — no defect**. Code audit agrees: `hitFx.x/y` are fixed constants (.42/.58/.5/.6), `hitFx.t=nowS` re-stamps every event (newest wins), `drawImpact` early-returns at `u≥1`, `hx.clearRect` wipes each frame — accumulation is impossible by construction. (Earlier whole-canvas sampling had falsely flagged telegraph chevron ink as ghost.) |
| **mitt under context pressure**: 0×0/4096², font miss, no `filter`, no `roundRect`, hostile throws | live: real canvas ctx — 0×0 canvas, 4096² canvas with `roundRect` deleted + `filter` set + bogus font; 6-case adversarial battery (NaN pos, 1e308 pos, negative size/cap, `dim>1`, hostile arm, NaN/huge landmark clouds); `stroke` poisoned to throw mid-path | 0 throws anywhere; 4096² mitt inks **56,597 px**; `globalAlpha`/`transform` identical before/after every draw incl. the mid-path `"boom"` (try/finally unwinds: α=1, identity matrix). Node: fault injected at **every** one of ~150 ctx ops ×3 draw paths → save/restore depth always 0. |
| **shadow-map cadence**: every 2nd/3rd frame, never per-frame, never frozen, under dt spikes/skipped frames/weakGpu | live: monkey-patch `needsUpdate` setter → count sets vs rAF frames over ~10 s live play | **23 sets / 70 frames = 0.329 ≈ every 3rd frame** (weakGpu divisor) — `frameI++ % (weakGpu?3:2) === 1` at boxing.html:1499 — frame-index modulo of a monotonic counter, immune to dt spikes and skipped rAFs; `weakGpu` is a boot-time const (a mid-session flip would just change the divisor). **No defect — verify-only (read-only file).** |
| **entrance.js**: NaN time, players out of frame, sign poses during cornerHold | node: 500+ garbage `handsState` inputs (nulls, getters that throw, non-array hands, junk kinds/nExt) + live: `game.step(0,…,{sign:'victory',cornerHold:true})` during a real hold + `game.reset()` rematch intro | every input lands in the 6-value enum; hold suppresses pose (`entranceSign=idle` — `over` is false mid-hold so the sign gate can't pose the exit-cam); rematch intro camera track finite. `entrance.js` itself needs no NaN guard — it's a pure sign→pose mapper with no time input. |

## Report-only findings (outside boundary)

| sev | file:line | evidence | routed to |
|---|---|---|---|
| P3 | `shared/boxing/game.js` (camera EMA chain, ~line 176 `depthStep += (targetStep−depthStep)*(1−exp(−dt*9))` and downstream) | **One NaN `dt` permanently poisons the camera.** `game.step(NaN)` → `cam.position = (NaN,NaN,NaN)`; 8–10 further finite steps never recover — the NaN rides the EMA state (`depthStep`, `camSway`, `push`…) and `tNow`. Node probe (owned-module consumers stubbed) **and** live probe both reproduce: `a=(NaN,NaN,NaN) b=(NaN,NaN,NaN)`. Real-world source: any caller passing a bad rAF timestamp delta. | game.js owner |
| P4 (latent) | `shared/boxing/game.js:231-280` | **Hit events drained during a freeze DO birth fx sprites** (`fx.burst` calls in the events loop aren't gated on `hdt>0`). Today unreachable: the only legitimate external emit is `fight.corner()`→`'corner'`, which maps to no burst; hits can't be emitted at dt=0 by fight internals. Reproduced only by injecting `player-hit-taken` into `state.events` mid-hold → sprites born frozen, survive the release. If a future caller emits payoff/hit events during a hold, gate the burst calls on `hdt>0` or let `worldIn` carry them. | game.js owner |
| — | `/api/coach-voice` → **HTTP 501** | Live probe recorded `501 http://127.0.0.1:8791/api/coach-voice` + matching console resource error (filtered benign — offline key). Expected off-key behavior; recorded for the server owner. | server owner |

## Gates

- `npm test` — **355 passed / 0 failed** (after all edits).
- `npm run qe:static` — **CLEAN**, 20 module blocks across 4 pages.
- Node probes — `.teamwork/qe/b5-render-node.json` — **21/21 PASS**
  (freeze wall-clock crowd + rope settle + deferred payoff + confetti
  freeze; fx pool freeze/resume/drain/dispose; entrance garbage battery;
  mitt throw-at-every-op; NaN-camera report evidence; null/stub renderer).
- Live probe — `.teamwork/qe/b5-render-live.json` — **SEE BELOW**.
- `npm run test:e2e` — **SEE BELOW** (contended on the shared Chromium
  lock; result recorded when the gate opened).

## Assumptions recorded

- Ambient-vs-bout split: crowd/rope/spotlight are arena ambience → wall
  clock; confetti/sprites are bout matter → sim `dt`. A wall-clock crowd is
  the only honest reading of "crowd renderers keep animating" during a
  freeze — and `wdt` is clamped so a sleeping tab can't slam a giant step.
- `fight.step`'s dt=0 entry-clear skip (fight.js:345) is the delivery
  mechanism the corner coach relies on; my live probe uses the same
  contract to deliver injected hit events — the injected-burst path is
  flagged OBSERVE, not asserted as a product failure.
- `hitFx` sampling moved to a `.5H`-band so the telegraph chevron (`.4H`,
  gated to `phase==='fighting'`) can't false-positive the ghost check —
  during `countdown` the band is ink-free except the burst itself.
- `qe-runner.mjs` needed no changes this wave (the `--gpu` neutralization
  from b4 still holds — no new flag work required).

## Unfinished

- Nothing in-boundary. The game.js NaN-camera and latent frozen-burst
  items are report-only by wave rules; the 501 is the server's.
