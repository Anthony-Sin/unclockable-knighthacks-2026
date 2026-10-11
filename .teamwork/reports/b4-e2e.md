# b4-e2e — QE wave 4: e2e regression-verify + npc.js residual hunts

Date: 2026-10-11 · Server under test: `http://127.0.0.1:8791/` · Chromium headless, SwiftShader, niced, single browser (shared `.teamwork/qe/.chromium.lock` honored — several waves ran on this box, so runs queued behind teammates' sessions).
Artifacts: `.teamwork/qe/b4-e2e.json` (90 checks — was `w7-e2e.json`; renamed for this wave).
Files owned this wave: `shared/boxing/npc.js`, `test/qe-e2e.mjs`. Read-only: `boxing.html`, `shared/boxing/game.js`, `test/boxing-page.mjs`.

## Baseline

| suite | result |
|-------|--------|
| `npm test` (fight/ring/fists/hands/proto/audio/tutorial/fuzz/server) | **227 passed / 0 failed** |
| `npm run qe:static` | CLEAN (pre-existing notes only) |
| `node test/qe-e2e.mjs` | **90/90 PASS** |
| `npm run test:e2e` (`boxing-page.mjs` 16/16 + `qe-e2e.mjs` 90/90) | **green** |

## Wave-3 fix regression verification (all live-verified this wave)

Every wave-3 production fix got a dedicated e2e section driving the REAL page path — no stubbed storage, no mocked rAF:

| fix | section | evidence this wave |
|-----|---------|--------------------|
| `recordKo` shape-check (`boxing:ko` corrupt → `ko.n +=` threw inside the rAF events loop) | L | `5`, `"x"`, `{"n":"a"}`, `{"n":1e308}` each booted + fought a REAL bout (landmark thrusts resolved by the page's own rAF — `ev:['player-punch','player-hit']`, `dist=0.95`) → every corrupt shape rewrote to `{n:1,sum:1}`, endcard `YOU WIN!` on, 0 pageerrors. Valid control `{n:2,sum:5}` incremented to `{n:3,sum:6}` — the increment path survived. |
| `controls.waitForHands` hold (`game.js`) + `FINDING YOUR HANDS` (`boxing.html` hud) | M | Injected `waitForHands:true` through `game.step` so EVERY caller (rAF loop included) presents the flag — the exact shape the page computes while `handStatus==='loading'`. Result: `entranceWaiting` on every wrapped step (`waits=13`), phase frozen (`countdown→countdown`, `cd:3→3` over 1.5s), countdown slot paints `FINDING YOUR HANDS` + `…`. Release → `ROUND 1` + `round-start` + `fighting`. |
| Endcard re-arm (`boxing.html` hud `ended` latch) | N | `game.reset(); game.skipIntro()` in ONE evaluate while the win card was up — no `intro` frame renders, yet the countdown-round-1 frame still re-armed: `{endOn:false, ended:false, round:1}` and the rematch re-latched its own `YOU WIN!` card. The `phase==='countdown'` half of the fix is what saves this; the old `intro`-only check would have swallowed bout 2's verdict. |
| `boxing:volume`/`sound`/`best`/`wins` guards | O | `volume:'abc'` (NaN) + `sound:'loud'` + `best:'"oops"'` + `wins:'"x"'` → clean boot; a first-gesture `keydown` unlock built the audio graph and the captured master GainNode sat at **0.80** (the `Number.isFinite` guard rejected the NaN — unguarded it would have parked gain at 0). Real KO → `win` → endcard `BEST 535`, `boxing:best=535`, `boxing:wins=1`. |

## npc.js findings — all fixed in-slice this wave

All five were latent adapter-boundary crashes reachable with hand-edited config or an unusual caller. Node probe (real `three` import — `document` absent so the telegraph sprite path self-skips) reproduced each throw before the fix; the live suite now covers all of them (section P).

| sev | file:line | finding | evidence | fix | verification |
|-----|-----------|---------|----------|-----|--------------|
| P2 | `shared/boxing/npc.js` `fetchManifest` (was ~48-58) | Injected `opts.manifest` passed **verbatim** — `{candidates:'oops'}`/`{}`/`null`, a primitive `7`, all crashed later at `manifest.candidates.find` (TypeError) or `manifest.candidates` read on `7`. Fetched manifests were normalized; injected ones were not. | probe: `THROW candidates:string → manifest.candidates.find is not a function`; `candidates:object` same; `candidates:null` → `Cannot read properties of null`; `manifest:number` → `.candidates of undefined` | Single normalizer now wraps BOTH sources: `return { candidates: Array.isArray(j?.candidates) ? j.candidates : [] }` | live P: 8 manifest shapes → all resolve a fighter, never throw; `valid-glb-control` still loads the GLB (`kind:'glb'`, id `bg`) |
| P2 | `shared/boxing/npc.js` candidate match (was ~256) | `candidates.find(c => c.id === pick …)` crashed on `null`/`undefined`/primitive entries — `Cannot read properties of null (reading 'id')` — before the proto fallback could run. | probe: `THROW null-entries → Cannot read properties of null (reading 'id')` | `c && typeof c === 'object'` gate in the predicate | live P: `[null, undefined, 5, 'x']` → `proto/bubble`, no throw |
| P2 | `shared/boxing/npc.js` `update` telegraph stash (was `npc._seenKind/_seenSide` writes ~447) | Telegraph memory was stored **on the caller's fight-state node** — a frozen `ctx.npc` threw `TypeError` in strict module scope mid-swing; the write also mutated caller-owned state (banned contract) and leaked if instances shared a ctx.npc. | probe: `Object.freeze({action:'windup',telegraph:{…}})` ctx → `Cannot add property _seenKind, object is not extensible` | Per-instance `SEEN={kind,side}` closure; `mapAction`/`STRIKE.kind` read it | live P: frozen-ctx telegraph→punch sequence clean, transforms finite |
| P3 | `shared/boxing/npc.js` `update`/`resetDamage` kick use (~435, ~360) | `api.kick` is a documented write-target — but a consumer REPLACING it (`n.kick = 42`) made `k[a] = 0` throw on a primitive; NaN/Infinity components silently poisoned `r3.kick`/`imp.v`. | probe: `api.kick = 5` → `update` THROW (strict assignment); `kick.x = NaN` → kick velocity NaN | Re-seat `api.kick = {x:0,y:0,z:0}` when it isn't an object (both sites); per-component `!Number.isFinite → 0` un-poison in `update` | live P: `kick=42` → re-seated to object after `update`, no throw |
| P3 | `shared/boxing/npc.js` `setDamage` (~348) + `createNpc` `opts.scene` (~289) | `resetDamage` honored `dead` but `setDamage` didn't — post-dispose calls still touched a dead impl. `opts.scene.add(group)` assumed `scene` was an Object3D — `createNpc(T,{scene:{}})` threw `.add is not a function`. | probe throw paths | `if (dead) return;` in `setDamage`; `opts.scene?.add?.(group)` | live P: dispose mid-telegraph then `pose`/`setDamage`/`resetDamage`/`update` → all true no-ops, `group.parent === null` |

## e2e coverage added (`test/qe-e2e.mjs`, 65 → 90 checks)

| section | what it drives | checks |
|---------|----------------|--------|
| L — corrupt `boxing:ko` | One boot; per corrupt shape (`5`, `"x"`, `{n:"a"}`, `{n:1e308}`) + valid control: real landmark-thrust KO resolved by the page's own rAF (parked `_npc` + `sim.npc.pos` teleported to .95 punch range — the hit path stays 100% real), `win` via `waitForFunction`, storage + endcard asserted | 6 |
| M — `waitForHands` | `game.step` wrapper injecting `controls.waitForHands:true` for every caller: fresh-bout phase holds, countdown number frozen at 3, `FINDING YOUR HANDS` + `…` on the countdown slot, release → `ROUND 1` + `round-start` + `fighting` | 5 |
| N — same-tick re-arm | Real KO → `win` + card; `reset();skipIntro()` in ONE evaluate → `endOn`/`ended` cleared on the countdown frame; second bout re-latches its own `YOU WIN!` | 4 |
| O — corrupt audio/stats storage | `evaluateOnNewDocument` wraps `AudioContext.prototype.createGain` → `__qeGains[0]` is the master gain; `'x'` keydown = the real first-gesture unlock; corrupt `volume/sound/best/wins` boot + fight cleanly | 4 |
| P — npc residual (live, real THREE) | 8 injected-manifest shapes incl. valid-GLB control; frozen `ctx.npc`; `kick` replacement + component poisoning; dispose mid-telegraph then full api sweep; dt extremes {0,−1,NaN,∞,1e9} × 10 actions × boundary `actionT`s with finite-transform assertions | 6 |

Driver additions: `Q.punchRT` — same scripted swing as `Q.punch` but wall-clock paced so the KO lands on the page's OWN rAF (the only drain that reaches `hud()` → `recordKo`/`showEnd`/storage writes — `fight.state.events` is single-consumer and manual `Q.step` would steal them). Stage dwell is 120ms so a ~15fps rAF still samples the span ramp.

Harness hardening inside my file: E-section pixel probes now park `fight._npc` (same park F already used) — a live PIP hit mid-probe fires the new wave-4 `hitFx` ink-burst which legitimately fills the 48px glove boxes → false "ghost gloves" fail (seen live: `pxLost 2304/2304` with gloves actually gone). Also a bounded read-retry for paint latency on a saturated box (assertion unchanged — gloves must still appear).

## Routed item resolved

`test/qe-e2e.mjs` `rs===2` unreachable-by-construction (from the wave-3 queue): current K-section asserts `r2.rs === 1` — `rs0` is snapshotted after round-1's bell is already drained, so only the round-2 bell lands in `rs − rs0` — and it passed live (`round=2, tl=89.9, rs=1`). No residual action.

## Residual risks / notes

- `npc.js` still reads `localStorage` twice (`boxing:npc` pick, `boxing:ko` for `variantOpen`) — both already try/catch-guarded pre-wave-3; throws there can't escape.
- `tryGlb`'s dynamic `import('three/addons/…GLTFLoader.js')` relies on the page importmap — in a bare node import (no importmap) it fails and correctly falls back to proto; that's by design but worth knowing if npc.js is ever consumed outside the page.
- The wave-3 `qe-e2e` E-check interference documented above is a test-ordering hazard, not a product bug — any future pixel-probe section must park `_npc` (or accept FX paint).
- `?notrack` keeps `waitForHands` permanently false in the page's own formula, so M injects the flag rather than riding `handStatus==='loading'` — same hold path exercised, deterministic.
- Boxing page got concurrent teammate edits this wave (comic hitFx, crowd renderers); my slice is `npc.js` + `qe-e2e.mjs` only — zero read-only-file edits needed.

## Commands

```
node test/qe-e2e.mjs        → 90/90 PASS · .teamwork/qe/b4-e2e.json
npm run test:e2e            → boxing-page 16/16 + qe-e2e 90/90
npm test                    → 227/227
npm run qe:static           → CLEAN
```
