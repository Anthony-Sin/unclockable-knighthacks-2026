# b3-render — Render layer wave 3 (light Chromium + deep audit)

Worker: **b3-render**. Boundary: `shared/boxing/{fx,scene,entrance}.js`,
`shared/boxing/assetManifest.json`, `shared/boxing/mitts/*` (fixed freely);
`ring.js`/`npc.js`/`boxing.html`/`game.js`/`boxing-page.mjs` read-only.

Method: full re-read of owned files + consumers, node-level probes on the real
modules (vendored `three.module.js`, stub canvas ctx with real-canvas
validation), 10k-step fx soak, 5k-draw mitt fuzz, qe-runner live verify, full
`npm test` / `test:e2e` / `qe:static` wall.

## Findings — fixed in boundary

| sev | file:line | evidence | fix | verification |
|---|---|---|---|---|
| P3 | `shared/boxing/scene.js:204-210` | **Rematch confetti carryover**: `game.reset()` (in-page rematch — the page also honors it, `boxing.html:592`) drops `fight.phase` back to `'intro'`, but the world layer kept raining the KO confetti burst (90 instanced quads, up to ~3 s tail) plus `excite=1.8` crowd hype/spotlight and rope `jolt` into the new bout's walk-in and round-1 countdown. Node probe: `'ko'`+`'win'` → confetti visible mid-party → `update(…,{fight:{phase:'intro'}})` → `confetti.visible` stayed `true` (pre-fix). | `prevPhase` tracking inside `update`: a transition **into** `'intro'` from any other phase = new bout (verified against fight.js — rounds cycle `fighting→countdown→fighting`, verdicts via `win/lose`; `'intro'` is only ever a fresh fight) → kill confetti (`visible=false`, all `cf[].life=0`) + zero `excite`/`jolt`. | probe: `rematch: confetti culled on phase→intro` PASS; round-2 `fighting→countdown→fighting` does **not** cull (checked — confetti still flying, correct same-bout behavior); qe-e2e `G: reset spam ×20` + `A: in-page reset` PASS. |
| P3 | `shared/boxing/scene.js:196` | `update(dt, state)` crashed on malformed state: `state.events` truthy non-iterable (`5`, `{}`, `NaN`) → `for (const e of ev)` **TypeError: ev is not iterable** — thrown inside `game.step`, kills the whole render frame. `update(dt, null)` → TypeError reading `.events`. 432 throws over 2k garbage frames in fuzz. | `ev = Array.isArray(state.events) ? state.events : []`; `state` non-object → `{}`. Same class of hardening w6 applied to `dt`. | node: `update(1/60,{events:5})`/`(1/60,null)` clean; 2k-frame fuzz → 0 throws, spot intensity/color finite every frame. |
| P3 | `shared/boxing/fx.js:84-85` | `burst(pos,{n:Infinity})` **hangs the render loop forever** — `for (let i=0;i<n;i++)` never exits (`i<Infinity` always true). Verified with `timeout 5 node` → SIGKILL (exit 124) pre-fix. `n:1e9` = multi-second frame. | `if (!(n > 0)) return; n = Math.min(n, POOL_N)` — NaN/≤0 spawn nothing; >pool-size just re-steals the same 72 slots anyway. | post-fix: `n:Infinity` returns in 0 ms, `n:1e9` in 4 ms, `n:NaN`/`'x'` no-op. |
| P4 | `shared/boxing/fx.js:127-134` | **Floating stains off the mat**: droplets thrown past the platform edge splatted into a floor stain at `y=.02` mid-air — a red decal hovering beside the ring (KO burst `speed 2.4` × ~1 s airtime ≈ 4+ units of travel; mat half-extent is 3.1). | On-mat bounds check (`MAT_HALF=3.05`, tracks scene.js's `RING*2+.3` box minus lip bleed): droplets splat only where canvas exists; off-mat droplets keep falling to the arena floor (`y≤-.82`) and die there. | node: 72-droplet hard-+X burst → **0 floating stains** (was ~all of them); control mid-mat burst → 14 stains all `|x|,|z| ≤ 3.1`. |
| P4 | `shared/boxing/fx.js:139-140` | NaN `cam.position` (upstream tracking poison) → `distanceToSquared` → NaN `d` → `p.s.scale.setScalar(NaN)` → NaN sprite matrix every frame the camera is bad. | `Number.isFinite(d)` gate → falls back to un-shrunk `p.base`. | soak probe: 0 NaN transforms; math checked — finite cam → identical output. |
| P4 | `shared/boxing/fx.js:74,107` | `size` negative → negative sprite scale (mirrored sprite); `stain({color:NaN})` → `Color.set(NaN)` → NaN material color. | `size` → `Math.max(0, size)`; non-finite *numeric* `color` → blood-red fallback (strings/`THREE.Color` still pass through). | 10k-step soak — bounded, 0 NaN. |
| P4 | `shared/boxing/mitts/classic.js:175` | `pos.ang` truthy-but-non-finite (`Infinity`, `'x'`, `{}`) slipped through `(pos.ang \|\| 0)` → `ctx.rotate(NaN/Infinity)` **poisons the canvas transform** — the mitt blanks for that frame and every later overlay draw inside the save block corrupts (A7: gloves never disappear). Stub-ctx fuzz: 211 NaN geometry calls / 5k draws, all `rotate()`. | `ctx.rotate(Number.isFinite(pos.ang) ? pos.ang * .35 : 0)`. | 5k-draw garbage fuzz: **0 NaN geometry calls**, 0 throws, save/restore balanced every draw, 0 negative-radius arcs. |

## Rematch / round-transition state audit

Everything that could ride from a finished bout into `game.reset()`'s fresh
one, through my files:

| render state | owner | cleared on rematch? | verdict |
|---|---|---|---|
| KO/win confetti (90 inst.) | scene.js `cf`/`confetti` | **now** — phase→`'intro'` cull | **was leaking ≤3 s — fixed** |
| crowd `excite` / rope `jolt` | scene.js | **now** — zeroed on cull | was carrying ~2.4 s — fixed |
| telegraph spot tint (`tel`) | scene.js | lerps out (npc.action→`'idle'`) | self-clearing |
| fx sprite bursts | fx.js pool | ≤1.44 s life, self-culling | intended juice tail (w6 precedent) |
| mat stains | fx.js `stainPool` | ≤7 s life, self-culling | intended — bout history; a fading blood drop into the rematch reads fine |
| camera impulses (push/snapYaw/downCam/dodge/lookX/hitStop/slow/hold) | game.js | `reset()` clears all (w7) | clean — verified in game.js:394-401 |
| NPC bruise wash + kick | npc.js | `resetDamage()` rebuilds + zeroes kick (w7) | clean |
| endcard latch | boxing.html | re-arms on `'intro'` (page code) | clean — qe-e2e `reset-with-card-up` PASS |
| queued punches / dodge latch / `tNow`/`introStartedAt`/`skipRequested` | game.js/fists.js | all cleared in `reset()` | clean |
| sim positions | ring.js | `sim.reset()` | clean |

Entrance: `entrance.js` is pure — skip machinery lives in game.js and is clean:
double `skipIntro()` no-ops (phase gate), `reset()` clears `skipRequested`/`tNow`
/`introStartedAt`, `entryU`/`entPos`/`showAv`/`npc.group.visible` all recompute
per frame from `introU`/`phase`. No mid-skip/double-start residue found.

## fx.js 10k-step soak (node, real THREE)

Max-rate events every step (40+22+18-particle bursts each step + periodic
stains/flashes, `update(1/60)` ×10k):
- `scene.children` stayed exactly **96** (72 sprites + 24 stains) — fixed ring
  buffers, zero growth. Stains are capped at 24 by design (steal-oldest).
- 0 NaN transforms/opacities after the soak; every pooled node hides after max
  life; `dispose()` leaves `scene.children.length === 0`.
- **`dispose()` callers**: still none — `game.js`/`boxing.html` never call
  `fx.dispose()`/`world.dispose()` (user-hot files; page lifetime = app
  lifetime, so latent — noted for the integrator, can't wire it in-boundary).

## mitts classic.js audit

- save/restore: **3 saves / 3 restores** on the main path, **2/2** on the
  arm-sleeve path — fuzz-verified balanced on all 5k garbage draws (imbalance
  would corrupt every later HUD draw on the shared `#hands` ctx).
- Per-draw allocations: **none** — `SCR_FIST`/`SCR_P`/`BLOB_R` module scratch,
  `PASSES`/`LACES`/`FIST`/`ARM_FIST` consts; no gradients/shadowBlur/Path2D
  created per frame. Caller's `o.lm` is never mutated (rescale writes scratch).
- The only NaN ingress was `pos.ang` — fixed above.

## assetManifest.json

Valid JSON, contract shape; all 3 candidates still on disk **and** serving
`200 model/gltf-binary` on :8791 (re-verified HEAD): boxing-ring 81,008 B,
boxing-gloves 61,244 B, punching-bag 24,736 B. Roster note stands from w6: all
3 are `PROP` — filtered out of the fighter roster by npc.js (qe-e2e's own
`D: stale PROP id falls back` check re-verified this live). CC-BY attribution
required if any prop is ever wired in.

## Mockup dirs (read-only) — dead-link audit

Re-scanned `menu-mockups/` (11), `lineup-mockups/` (23), `iso-mockups/` (5)
honoring `<base href>`: **no dead local links**. Naive scan flags 21
`lineup-mockups/*/index.html → ./boxing.html` — all false positives: every one
of those pages declares `<base href="../../">`, so `./boxing.html` resolves to
repo-root `boxing.html` (exists). `import('./shared/boxing/protoBoxer.js')`
inside lineup-mockups and `_hero/engine.mjs`'s `../../shared/…` import resolve
correctly. External links are Google Fonts CDN only (degrade gracefully
offline). Consistent with w6's audit — still clean.

## Headless verification — boxing.html?vid=test-input.mp4, 20 s

`node test/qe-runner.mjs 'http://127.0.0.1:8791/boxing.html?vid=test-input.mp4' --name b3-render-boxing --seconds 20`
(self-gated: waited through co-tenant lock + load 15→9.5; one niced SwiftShader
Chromium; peak RSS 1808 MB).

**Result: exit 0 — 0 pageerrors, 0 non-benign console errors (1 benign
TensorFlow/XNNPACK INFO), 0 warnings, 0 failed requests, 0 HTTP≥400.**
FPS (SwiftShader + trackers under load1 ~9-15 — environment-bound): **p50
66.7 ms (~15 fps median), avg 10.6 fps, p95 333.3 ms, worst 816.6 ms**,
213 frames/20 s. Compare w6's 83.3 ms p50 baseline on the same path/load —
no regression (my edits add a few `isFinite`/`Array.isArray` checks per call).

## Gates

- `npm test` — all suites green (`node --check` clean on all edited files).
- `npm run qe:static` — **CLEAN**, 20 module blocks across 4 pages.
- `npm run test:e2e` — `boxing-page.mjs` **14/14 ALL CHECKS PASSED** (mitt draw
  exercised: `glove silhouette follows tracked knuckles` 3593 px; win/lose
  pose transitions). `qe-e2e.mjs` re-run: **64/65** — sections A–J pass
  including the whole rematch/reset block (`in-page reset`, `reset spam ×20`,
  `reset mid-telegraph`, glove dropout F1–F3, npc torture J, multi-round K2–K4).
  The single FAIL is **K1 `test/qe-e2e.mjs:1065`** — see out-of-boundary.
- Node probes (`/tmp/b3-probe.mjs`): 16/16 PASS — fx 10k soak, rematch cull,
  scene.update 2k garbage fuzz, mitt 5k fuzz, entrance 5k fuzz.

## Out-of-boundary bug (route → b3-e2e, `test/qe-e2e.mjs`)

| sev | file:line | evidence | suggested fix |
|---|---|---|---|
| P3 (harness) | `test/qe-e2e.mjs:1065` | K check demands `mr.r2.rs === 2`, where `rs = Q.count('round-start') - rs0`. **Unreachable by construction**: `'round-start'` emits once per round and `st.events.splice` delivers it to exactly ONE consumer — `Q.got` (inside `pg.evaluate`) xor `__boxing.log` (page rAF) — the two collectors can never both hold the same emission, so the delta for one round transition is always `1`. Observed run: `rs:1` with `between:{phase:'countdown',round:2}` and `r2:{phase:'fighting',round:2,tl:89.92}` — i.e. the round transition itself behaved **correctly**; only the expectation is wrong. Not a product bug; deterministic (rAF can't interleave inside evaluate). | `mr.r2.rs === 1` (or `>= 1`) — or mark `count` from a single source. |

## Assumptions recorded

- `MAT_HALF = 3.05` in fx.js mirrors scene.js's mat box half-extent (3.1) minus
  lip bleed — if the ring geometry changes, update both.
- The rematch cull keys on `state.fight.phase` transitions into `'intro'` —
  verified the only paths there are `fight.reset()`/construction. Consumers
  that pass `state.fight` absent (`world.update(dt, {})` idle-orbit) leave
  `prevPhase` untouched.
- Stains/sprites carrying a fading tail across rematch kept as designed
  (w6's "desirable juice" ruling); only the multi-second payoff states
  (confetti/crowd/rope) get culled.
- `dispose()` stays an uncalled teardown API — page lifetime = app lifetime;
  documented rather than wired (game.js/boxing.html are user-hot).

## Unfinished

- Nothing in-boundary. `npm run test:e2e` exits non-zero until b3-e2e fixes
  the `rs === 2` expectation above (the failure is in their test file; the
  behavior under test is correct).
