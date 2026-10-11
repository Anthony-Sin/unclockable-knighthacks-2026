# b3-e2e — wave-3 robustness QE: dropout edges, reset spam, corrupt storage, hidden tab, npc.js audit

Date: 2026-10-11 · Worker: **b3-e2e** · Owned files: `shared/boxing/npc.js`, `test/qe-e2e.mjs` only.
Server under test: `http://127.0.0.1:8791/` (live, untouched) · Chromium headless, SwiftShader
flags only, shared `.chromium.lock`, load1<10 / MemAvail>2.5 GB gate, one browser.
Artifact: `.teamwork/qe/w7-e2e.json` (65 checks — suite grew 36 → 65 this wave).

## Baseline / suite status

| suite | result |
|-------|--------|
| `node test/qe-e2e.mjs` | **65/65 PASS**, `ALL CHECKS PASSED` — sections A–K |
| `npm run qe:static` | **CLEAN** — notes only, several became routed findings below |
| `npm test` | **GREEN, exit 0** — boxing-fight 80/80 · ring 37/37 · fists+hands+proto green · audio 25/25 · tutorial 7/7 · qe-fuzz 69/69 · qe-server 115/115. **Note:** earlier same-day runs under load1≈13–17 flaked 4–6 checks inside `qe-fuzz` (fight/audio latent races — routed below); zero failures outside fuzz, none in my files |
| `npm run test:e2e` | `boxing-page.mjs` **14/14** + `qe-e2e.mjs` **65/65** |

## Findings — fixed in `shared/boxing/npc.js` (all verified live + node)

Real defects (would have produced visible corruption or a crash — not just hardening):

| sev | file:line | finding | evidence | fix | verification |
|-----|-----------|---------|----------|-----|--------------|
| P3 | `npc.js` `makeRig.tick` (`:106`) | `tick(Infinity)` / `tick(1e9)` parked the rig clock at `t=Infinity` → `Math.sin(∞)` NaN → `rig.position.y/rotation` NaN **forever** (lerp keeps NaN). Hidden-tab/monster-dt path on GLB+emergency rigs (protoBoxer guards itself). | node torture: `update(Infinity)` then `update(.016)` → `pos.y` NaN pre-fix | `dt` sanitized + capped at `.5`; accumulated `t` wraps mod `1e6` | post-fix `pos.y` finite through `[Infinity,-1,NaN,1e9,0]`; e2e J-section live GLB bag |
| P3 | `npc.js` `update` (`:429`) | `update(dt, null)` — `ctx` defaulted via `= {}` but `null` bypasses defaults → `ctx.strike` threw `TypeError`. Same for `update(dt)` from any odd caller. | node smoke: `Cannot read properties of null (reading 'strike')` at old `:448` | `ctx = ctx || {}` before destructure | `update(.016, null/undefined/5/'x')` all clean; e2e J `updateNullCtx:true` |
| P3 | `npc.js` `setDamage` (`:342`) | `setDamage(NaN)` slipped the monotone gate (`NaN<=x` false), latched `dmgCur=NaN`, lerped **every** material colour to NaN → fighter rendered black/invisible until rebuild. | code audit + material scan | clamp finite `[0,1]`, non-finite → `0` | `setDamage(NaN|-3|.5|2)` → 0 NaN materials (e2e `badMats:0`) |
| P3 | `npc.js` `makeRig.pose` (`:98`) | Unknown pose name left the rig **frozen on the previous pose** (e.g. stuck in `down` after a typo'd action) — protoBoxer falls back to idle; rigs didn't. | audit vs `protoBoxer.pose` contract | `POSES[n] || POSES.idle` | live GLB: `down` pose then 40×`bogusAction` → `rx≈0` (≈-2.3e-10), not -1.35 |
| P3 | `npc.js` telegraph block (`:461-475`) | `tg.t01=NaN`/missing `parts.gloveL/R` (GLB rigs have no named parts) wrote NaN into sprite scale/world pos or crashed `getWorldPosition`. | audit — `parts` only exists on proto impls | `t01` clamped; fallback anchor `(±.34, headY+.18, .2)` when part/`worldPos` non-finite | e2e live GLB: `side:'middle', t01:NaN` → sprite shown + finite |

Robustness hardening (defensive — no live crash observed, cheap insurance at an adapter boundary):

| sev | file:line | finding | fix |
|-----|-----------|---------|-----|
| P4 | `npc.js` `update` pos/target (`:437-445`) | `pos.x=NaN` or `target` NaN wrote NaN into `group.position`/`rotation.y` | only apply finite pos / finite computed yaw |
| P4 | `npc.js` `STRIKE.y` (`:453`) | `{reach:.9, y:NaN}` flowed NaN into the pose strike ctx | `Number.isFinite` gate on `y` too |
| P4 | `npc.js` `gloveColor` (`:416-423`) | non-numeric impl color → `'#NaN'`/`'#[object Object]'` CSS for the smash overlay | `THREE.Color`→`getHex()`, finite hex coerced+clamped, else `0xe0341f` |
| P4 | `npc.js` `dispose` (`:419,478`) | repeated `dispose()` re-ran cleanup; `update()`/`pose()`/`resetDamage()` still ran post-disposal | `dead` flag — idempotent + no-ops |
| P4 | `npc.js` `fetchManifest` (`:56`) | `candidates:'oops'` → `.find` crash later | normalize to array |
| P4 | `npc.js` `tryGlb` (`:161-175`) | manifest `scale:'x'`/NaN `yOffset`/junk `yaw` poisoned transforms | finite-positive scale else auto-fit; yOffset → ground-by-bounds; `+yaw||0` |
| P4 | `npc.js` vel/msp (`:455`) | NaN `ctx.vel` → NaN mover speed | `fnum()` + cap 12 |

## Findings — ROUTED (hot files / other owners; NOT fixed by me)

| sev | file:line | evidence | suggested fix |
|-----|-----------|----------|---------------|
| **P3** | `boxing.html:517-521` `recordKo` | `store.get` returns parsed values verbatim; `boxing:ko='5'`/`'null'`/`'true'`/`'"x"'` all **parse successfully** → `ko.n += 1` on a primitive → **`TypeError` inside the rAF events loop on every real NPC KO** (`if (e==='ko') recordKo(st)`, boxing.html:658). KO stat never records; uncaught pageerror each KO. **Live-reproduced**: `boxing:ko='5'` + real in-range KO → `phase:'npcdown'`, `ko:true`, pageerror `Cannot create property 'n' on number '5'`. Node proof for the other primitives: `'null'→Cannot read properties of null`, `'true'`/`'"x"'`→same create-property throw. `[]` and `'{}'` don't throw but silently corrupt (`{"n":null,"sum":null}` → `variantOpen` gates stay shut forever — mild secondary effect). | shape-check the value: `const raw = store.get('boxing:ko',{n:0,sum:0}); const ko = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {n:0,sum:0};` — same for `recordEnd`'s `boxing:best`/`boxing:wins` (`'x'` → `Math.max('x',score)` → NaN → stores `null`). |
| P3 | `shared/boxing/fight.js` `reset()` / `_wantSlam` | `qe-fuzz` consistent FAIL: `fight: reset() mid-windup/punch/down/win/countdown` — `reset@punch: _wantSlam survived`. A queued special intent outlives `fight.reset()` → next bout can open with a slam. (Owner: fight.js — reproduces every qe-fuzz run.) | clear `_wantSlam`/`_wantSledge`-family fields in `reset()` (partially done — `_wantSlam` missed). |
| P3-flaky | `shared/boxing/fight.js` TUNING sanitize + decision | `qe-fuzz` intermittent: `module TUNING garbage — fights stay legal ← round=1`; `out-boxed rival → decision WIN ← phase=lose round=3`; `sway/duck/guard thresholds — ducked-into-upper dmg 17 want ×1.35≈23`. Standalone `boxing-fight.mjs` is 80/80 green — ordering/mutation-state dependent inside qe-fuzz. | re-check `saneT` deep-copy vs live `TUNING` mutation; decision hp-fraction compare may use post-heal vs pre-heal hp inconsistently. |
| P3-flaky | `shared/boxing/audio.js` voice graph | `qe-fuzz` consistent-ish FAIL: `ended voices + crowd beds release their edge into master — master inputs=11`. Sources that ended aren't disconnecting → master node input leak (grows across a session). | audit `disconnect()` on ended sources / crowd beds. |
| P4 | `shared/boxing/fight.js:161-163` | `JSON.parse` ×3 outside try/catch at module load (`_TDEF`/`_SDEF`/`_VDEF` snapshots) — flagged by `qe:static`. Only reachable if `TUNING`/`SPECIALS`/`VSTATS` held non-serializable junk at import — low risk. | try/catch or a `deepCopy` helper. |
| P4 | `boxing.html:464` | `Number(localStorage.getItem('boxing:volume'))` → `setVolume(NaN)` — safe today (`setVolume` clamps `+v||0`) but relies on callee leniency. | validate before call. |

## e2e coverage added (`test/qe-e2e.mjs`, +29 checks → 65 total)

| section | what it drives | checks |
|---------|----------------|--------|
| F — dropout edges (new A7 contract) | partial drop (right leaves, left stays `5382px`/`0px` + redraw on return) · drop mid-swing past `MISS_GRACE` → throw **cancels**, 0 stale emits, state `idle` · drop inside grace → re-entry emits **once**, re-arms · re-entry at far screen edge **snaps** (`mid:0px` — no glide) | 6 |
| G — rapid reset spam | 20 back-to-back `game.reset()` → 2 scene children, clean bout (`events:0`,`punches:0`,1×`round-start`,no endcard) · reset **mid-telegraph** (`windup`+telegraph die: `tel:null,act:idle`) · reset **mid-down-count** + **between countdown ticks** → `intro`→`fighting`, count/endcard off · post-spam bout still lands real hits | 5 |
| H — corrupt localStorage | `boxing:npc` = `'{}'`, `'"proto:bogus"'`, `'+junk'`, 200 KB string → all fall back `v:'bubble'`, 0 errs · `boxing:ko:'{bad'`+`best:'[]'`+`wins:'"x"'`+`sound:'loud'`+`volume:'abc'` → boots + reaches `fighting` · lineup renders 3 cells + pick under the same corruption | 3 |
| I — hidden-tab mid-fight | real rAF stall via CDP `Debugger.pause` 3.5 s → resume: rAF resumes (+60 ticks), **clock drained only the post-resume window** (`89.95→87.74`, page clamps `dt≤.1`), npc transform finite · JS `hidden`/`visibilityState` override + `visibilitychange` dispatch ×2 → listener never throws | 5 |
| J — npc.js torture live | real GLB (`punching-bag.glb` over HTTP → `kind:'glb'` → `makeRig` path): dt torture finite, unknown-pose→idle (`rx≈0`), telegraph sprite w/ missing parts + NaN `t01` → fallback anchor, `dispose`×2 + `update(null)` · live proto npc: dt torture, `strike:{reach:.9,y:NaN}`, `setDamage(NaN|-2|.6)` → 0 NaN materials, css `gloveColor` `#ff6b57` | 5 |
| K — multi-round / multi-KO | `timeLeft=.05` → `countdown` → `round-start` #2 fires, `round:2`, clock back to 90, phase `fighting` · round-2 KO → `npcdown` → rAF verdict `win` | 4 |

Per-section "zero pageerrors" checks are folded into the counts above.

Driver additions: `Q.box(fx,fy,w,h)` — normalized-region alpha probe on the
`#hands` canvas (per-glove pixel queries); `Q.count(ev,m,ml)` — event counting
across both drains (`Q.got` for my steps, `__boxing.log` for rAF steps).

## A7 contract compliance

All new dropout checks encode the UPDATED contract: missing hands leave the
canvas, `clearRect` each frame, partial dropout is valid, no dimmed-ghost
holdover. No holdover logic was added anywhere — F1's `r:0` reading literally
verifies the dropped glove paints nothing. Third-person gloves remain the
avatar's 3D gloves (J-section exercises them untouched).

## Residual risks / notes

- **`recordKo` (P3 above)** is the wave's only user-visible un-fixed defect —
  requires a corrupt `boxing:ko` that parses to a primitive, then any NPC KO.
  Reproduced live (uncaught `pageerror` on the 'ko' drain) and in node.
- `qe-fuzz` failures are ordering/seed/load sensitive — `qe-fuzz.mjs` itself
  was edited by a teammate mid-wave (check count moved 65→69) and is now
  69/69 green ×4 incl. a full `npm test`. Earlier same-session runs showed
  4–6 fails (the checks above). Real latent races, flaky repro — the routed
  items may already be addressed by the fight/audio owners.
- Hidden-tab coverage: real `Page.setWebLifecycleState:'hidden'` is
  unimplemented in this Chromium 153 — `Debugger.pause` reproduces the exact
  failure mode (rAF stall → giant `dt`) and the JS-override path exercises the
  `visibilitychange` listener. A real OS-level background tab would behave
  identically on the `dt` path (page clamps `.1`).
- The F-section probes park `B.fight._npc` (same technique as
  `test/boxing-page.mjs`) so the overlay contains only mitts during pixel
  checks; the real AI is restored (`delete`) for G/K.
- The 4-page `qe-runner` sweep was left to its owners — my boxing-only suite
  exercises the page far deeper than a 15 s runner pass, and the shared
  chromium lock stayed saturated all wave.

## Wave verdict

This wave found **new defects** — it is not a zero-bug wave:

- **1 production-reachable P3**, routed: `recordKo()` crashes on any real KO
  when `boxing:ko` parses to a primitive (`'5'`/`'null'`/`'true'`/`'"x"'`) —
  `boxing.html` owner.
- **5 latent P3 contract defects** fixed inside `npc.js` — real bugs at the
  adapter boundary (NaN transforms, permanent damage poisoning, null-ctx
  crash) not reachable through boxing.html's current clamped callers, plus
  **8 P4 hardenings**.
- **3–4 routed flaky failures** in `qe-fuzz` (fight.js `_wantSlam`-across-
  reset, audio master-edge leak, decision/threshold edge cases).
