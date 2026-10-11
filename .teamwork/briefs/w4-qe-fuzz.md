# Brief: w4-qe-fuzz — Fuzz/property test the pure game logic (round 2)

QE round 2. Read `.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md`
at `/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`. Plain ES
  modules, node-safe pure logic (per CONTRACT: game logic must not
  require WebGL/DOM). `npm test` currently green (7 suites, ~196 checks).
- Round 1 already fixed 20 bugs — don't re-report those; find NEW ones.
- `qe-runner`/`qe-static`/`qe-resources` tools now exist in test/ — use
  them (`npm run qe`, `npm run qe:static`, `npm run qe:res`).

## Your files (exclusive this round — fix bugs freely)
- `shared/boxing/fight.js`, `fists.js`, `protoBoxer.js`,
  `tutorial.js`, `audio.js`, `ring.js` (RingSim = steering/pathing sim)
- NOT yours: `npc.js` (w7 owns it) — fuzz findings there are report-only
- `test/qe-fuzz.mjs` (new — durable fuzz suite)
- `package.json` (ONLY you may edit it this round — append
  `node test/qe-fuzz.mjs` to the `test` script)

Bugs outside these → report only, file:line + evidence.

## Do
1. Read each owned module; map its input surface (functions taking
   external state: `step(dt, hs, fs)`, `tracker.update`, event handlers).
2. Write `test/qe-fuzz.mjs` — deterministic-seeded fuzz + property
   checks, e.g.:
   - malformed inputs: null/undefined/NaN states, empty `hands` arrays,
     21-elem landmark arrays filled with NaN/±Infinity, dt ∈ {0, -1,
     1e-6, 10, NaN}
   - state-machine fuzz: N random event/action sequences → assert phase
     stays in enum, hp ∈ [0,max], positions finite, rounds ≤ max
   - invariants: `fists.update` output always finite or absent; RingSim
     positions stay in ring bounds; tutorial steps always terminate
     (<30s sim time, matching existing tests)
   - soak: 60k update ticks → no unbounded array growth in module state
   - audio: node-graph calls under mocked AudioContext (existing
     boxing-audio.mjs shows the pattern) with garbage event names
3. Run it. Fix every real bug in your files. Keep `npm test` green
   (your suite runs inside it — must stay deterministic: seeded RNG).
4. Report `.teamwork/reports/w4-qe-fuzz.md`: findings table + fuzz
   coverage notes + residual risks.

## Hard rules
- Resource gate before any Chromium (you likely won't need one — logic
  is node-side). No git mutations, no `.env`, files outside your list
  are report-only.
