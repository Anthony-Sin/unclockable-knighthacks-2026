# Brief: b3-fuzz — Deep fuzz wave 3 (NO browser)

Read `.teamwork/prompt_draft.md` (wave-3 master prompt — incl. the A7
contract change and user-hot read-only list) and `.teamwork/CONTRACT.md`
at `/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`. Node-only
  pure logic. `test/qe-fuzz.mjs` (37 checks) exists and runs in `npm test`.
- Rounds 1-2 are green. Your job: hunt what the current fuzz misses.

## Your files (exclusive — fix freely)
- `shared/boxing/{fight,fists,ring,protoBoxer,tutorial,audio}.js`
- `test/qe-fuzz.mjs` (extend it — stays deterministic, seeded)
- `package.json` (only you may edit it)
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (user-hot), npc.js (b3-e2e)

## Do — new angles, not round-2 repeats
1. **Sequence/combination fuzz**: two fighters interleaved at extreme
   cadence (punch-during-punch, dodge-during-KO, reset mid-telegraph,
   practice→real transitions mid-round, tutorial abandon mid-step).
2. **State-machine invariants**: enumerate reachable phase pairs
   (intro→*, *→down, down→win/lose) — fuzz must never reach an illegal
   transition or a phase outside the enum; `timeLeft` ∈ [0, roundLen];
   score/stamina bounded.
3. **Round/NPC progression**: simulate FULL fights to decision (rounds
   run out → win/lose by score?), multi-KO runs, `round` increments, NPC
   difficulty/rage scaling if it exists — fuzz constructor tuning
   combos (npcHp=1, roundLen=1, stamina=0).
4. **Sway/dodge boundary**: sway at exactly ±threshold, guard exactly
   .6, distance exactly at reach — boundary-value hunting (floating
   point edge: .5999999 vs .6).
5. **audio.js**: event ORDER fuzz (ko before round-start, win during
   playerdown), rapid mute/unmute, unlock() before/after events.
6. Extend `qe-fuzz.mjs` with the coverage; keep seeded + fast (<60s).
7. Fix every real bug in your files. `npm test` stays green.

## Hard rules
No git mutations, no .env, files outside your list are report-only.
Report `.teamwork/reports/b3-fuzz.md`.
