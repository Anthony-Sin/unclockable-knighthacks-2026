# w7-qe-e2e — Extended boxing.html e2e QE (round 2)

Date: 2026-10-11 · Server under test: `http://127.0.0.1:8791/` · Chromium 153 headless, SwiftShader, niced, one browser.
Artifacts: `.teamwork/qe/w7-e2e.json` (36 checks), `w7-boxing-{notrack,vid,practice}.json`.
New standalone suite: `spatial-objects/test/qe-e2e.mjs` — `node test/qe-e2e.mjs` (self-gates on resources + the shared chromium lock; prefers :8791, falls back to self-serve :8890).

## Baseline

| suite | result |
|-------|--------|
| `npm test` | **186 passed / 0 failed** (80 + 37 + 25 + 7 + 37 across the five files) |
| `npm run test:e2e` (`test/boxing-page.mjs`) | **12/12 PASS** — no regression after fixes |
| `node test/qe-e2e.mjs` (new, this round) | **36/36 PASS** in ~34s |

## Findings (all fixed inside my exclusive files; each verified live)

| sev | file:line | finding | evidence | fix | verification |
|-----|-----------|---------|----------|-----|--------------|
| P1 | `boxing.html` drawOverlay (was `838`), drawEntranceGloves (`1168`) | Malformed `window.__forceHands` **crashed the rAF overlay**: `hnd.lm.every is not a function` (a 25-char `lm` string passes the `length >= 21` gate), `hs.hands is not iterable` (`hands:5`/`{}`/`'abc'`), `.find is not a function`. A thrown frame also **hid both gloves outright** — the exact thing A7 forbids. | run-1 `w7-e2e`: `pageerror: hnd.lm.every is not a function` ×3; `"string lm"→0` overlay px; glove-guard probe `0` on dropped input | `saneHands()` at the single `hs` acquisition point (`boxing.html:1228-1240`, applied `:1248`) — non-array `hands` → `EMPTY_HS`; any entry without a finite 21-pt `lm` array is filtered out; clean states pass through by identity | 16/16 malformed inputs → **0 pageerrors**; overlay never blank (min `total=3900px`); lost-tracking guard pose `guard=7057` |
| P2 | `shared/boxing/game.js` `reset()` (`388-402`) | In-page `game.reset()` left stale state in the next bout: camera impulses (`push`, `pushUp`, `snapYaw`, `camSway`, `shakeT`, `downCamT`), the dodge-lean latches (`dodged`, `prevDodgeKey`), punches still queued in `tracker.punches`, and the NPC's painted bruises. | static audit + run-1: `hashAfter===hashHit` (damage never cleared), endcard stuck | clear every impulse/latch, drain `tracker.punches`, call `npc.resetDamage?.()` | `clean0`: phase `intro`, hp 100/100, score/combo/events 0; material-hash `84879 → 85428` (=pristine baseline); post-reset bout lands real hits round 1 |
| P2 | `shared/boxing/npc.js` `setDamage` (`313`) + new `resetDamage` (`330-352`) | Bruise wash + protoBoxer wound meshes are monotone — a reset/replay fighter stayed black-eye bruised (`npc.setDamage(0)` was a no-op). | run-1: `{"hash":[85428,84879,84879]}` — hash unchanged after `game.reset()` | `resetDamage()`: restores recorded colour+emissive baselines for GLB/emergency rigs; for `kind:'proto'` rebuilds the boxer via the cached module (cheap, sync, no fetches) since `protoBoxer.setDamage` can only worsen, then re-baselines `scanMats()`; also zeroes `kick` | run-4: `hash 85428 → 84879 (hit) → 85428 (reset)` — wash + wounds fully healed |
| P2 | `boxing.html` `hud()` (`562-570`) | `ended` latch + `.endcard.on` + `body.ended` survived `game.reset()` while a verdict card was up — stale card sat over the new bout **and** `showEnd`'s `if (ended) return` would swallow every later verdict. | run-1: `{"endOn0":true,"endOn":true,"ended":true,"phase":"intro"}` | re-arm in `hud()`: `ended && st.phase==='intro'` → `ended=false`, drop `.ended`/`.on`. Terminal phases untouched; the tutorial card (shows during `fighting`) unaffected | run-4: `{"endOn0":true,"endOn":false,"ended":false,"phase":"intro"}`; lose-card → reset → card gone |
| test-only | `test/qe-e2e.mjs` DRIVER `FACE` | First synthetic face **without `manual:true`** latched the sway centre to the nose → lean read 0 forever → dodge never engaged (`fists.js:143`). | run-1: tries `hook/left→connected`, `jab/left→resolved` | `manual:true` on the injected face (matches `mouseFace`) | run-4: `hook/left→dodged` first try |

## e2e coverage added (`test/qe-e2e.mjs`, 36 checks)

| section | what it drives | checks |
|---------|----------------|--------|
| A — real fight (`?notrack=1`) | clean boot → countdown→fighting → `round-start` → landmark-thrust punches land (`player-hit`/`npc-hit`, `npc.hp` drop, `lastBlow.dmg`) → real telegraph → face-sway dodge → `player-dodged` → sustained fight → `ko` + `npcdown` → rAF verdict `win` + `YOU WIN!` card → `[data-replay]` reload → fresh round-1 bout → in-page `game.reset()` (hp/score/combo/events/endcard + NPC wash) → post-reset bout → defenceless player → `ko`/`playerdown` → `lose` + lose card → reset-with-card-up | 17 |
| B — `?practice=1` | `practice:true` + `ai:false` on the fight; frozen clock (`timeLeft 90→90`); NPC hp floors, no KO; coach element on | 4 |
| C — tutorial (`?practice`/`?tutorial`) | `B.tutor` drives step-by-step: `punch` (2 real hits), `block` (guard through scripted jab), `slip` (timed lean vs scripted jab), `perfect` (late dodge → stunned → flurry hit) → `YOU'RE READY!` + `BASICS · 4/4 NAILED` + `Fight the champ →`; `?tutorial=1` engages the same mode | 4 |
| D — lineup hand-off | click `.cell[0]` on `lineup.html` → `localStorage['boxing:npc']='proto:bubble'` → bubble spawns + HUD label; earned `proto:bean` (ko avg ≤2) → bean; smuggled locked pick → bubble fallback; stale PROP id → bubble + `kind:'proto'` | 6 |
| E — `__forceHands` edges | 16 inputs: empty obj/`hands:[]`, garbage entries, full/partial NaN, short `lm`, string `lm`, `hands`=5/`{}`/`'abc'`, `__forceHands`=42/string/bare-array, one/five hands, bogus side — plus permanent tracking loss | 3 |

Driver mechanics worth noting: `fight.state.events` is **single-consumer** — `Q.step` collects events itself and also consults `__boxing.log`; terminal phases (`npcdown→win`, `playerdown→lose`) are left to the page rAF so the real HUD path runs. Scripted-swing cadence and tutorial beats are **wall-clock paced** — the tutorial driver yields (`await sleep`) between step bursts or swings never fire. `lastBlow` lives one `step()`, so the driver snapshots it per call.

## Mode sweep (`qe-runner`, 15s each, JSON → `.teamwork/qe/w7-*`)

| mode | JSON | pageerrors | console errors | failed req / HTTP≥400 | exit | avg fps | peak RSS |
|------|------|-----------|----------------|----------------------|------|---------|----------|
| `?notrack=1` | `w7-boxing-notrack.json` | **0** | **0** | 0 / 0 | 0 | 13.6 (p50 66.7ms) | 1360 MB |
| `?vid=test-input.mp4` | `w7-boxing-vid.json` | **0** | **0 real** (1 benign `INFO: Created TensorFlow Lite XNNPACK delegate`) | 0 / 0 | 0 | 10.5 | 1744 MB |
| `?practice=1` | `w7-boxing-practice.json` | **0** | **0 real** (same benign XNNPACK line) | 0 / 0 | 0 | 12.7 | 1736 MB |

SwiftShader fps is software-render cost, not a defect.

## Residual risks / reported only (outside my files)

- `shared/boxing/protoBoxer.js:1142` — `setDamage` is monotonic by design (w4's file, not mine): `dmg` can never decrease. My `resetDamage` works around it by rebuilding the impl, which is correct for all current damage channels (wash, wounds, swollen eye, blink scale). If protoBoxer later adds damage state outside the impl (e.g., shared textures), the rebuild path remains valid but the mats baseline re-scan in `npc.js:294` should be re-checked.
- `resetDamage` GLB branch is untested live — the manifest contains only PROP entries, so every spawn this round resolved to procedural variants. The mats-restore path is the same code the proto fallback uses; verified structurally.
- `saneHands` guarantees a *drawable* hand shape (21 finite landmarks). A hand with valid `lm` but garbage `palm`/`side` still reaches the tracker — `FistTracker._usable` self-filters it (fists.js:113-123); the overlay draws it if it claims a side. Acceptable, but a fully-exotic record could still render oddly — cosmetic only, never a throw.
- Boxing page received concurrent teammate edits this round (block-BLOCK! comic FX etc. visible in `git diff` vs old HEAD); my boxing.html diff is limited to `tutor` getter (`:421`), endcard re-arm (`:562-570`), `saneHands` (`:1228-1248`). Verified the page end-to-end post-merge.
- `?tutorial=1` steps auto-advance on wall-clock time-boxes by design — a tab frozen mid-lesson still finishes in ≤30s; tested to full completion, all 4 lessons passed by the real mechanics.
