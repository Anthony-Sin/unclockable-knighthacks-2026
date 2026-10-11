# Brief: b4-fuzz — Deep fuzz wave 4 (NO browser)

Read `.teamwork/prompt_draft.md` (master prompt — incl. the post-A7 glove
contract and user-hot read-only list) and `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`. Node-only
  pure logic. `test/qe-fuzz.mjs` now has 69 checks and runs in `npm test`.
- Waves 1–3 are green. Sequence fuzz, phase-machine invariants, tuning
  sanitization and reset-leak checks are already covered — find what's left.

## Your files (exclusive — fix freely)
- `shared/boxing/{fight,fists,ring,protoBoxer,tutorial,audio}.js`
- `test/qe-fuzz.mjs` (extend — deterministic, seeded)
- `package.json` (only you may edit it)
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot), npc.js (b4-e2e)

## Do — new angles only
1. **Live-mutation fuzz**: mutate the exported TUNING/SPECIALS/VSTATS
   *while a fight runs* (a documented "feel knobs" surface) — the fight's
   sanitized snapshot must stay sane until reset(), and reset() must
   re-sanitize fresh garbage. Frozen/sealed controls objects too.
2. **dt boundary torture**: dt = 0, -0, 1e-12, .1 (exact clamp), Infinity,
   -Infinity, NaN, string 'x' — every module's step()/tick()/update() must
   stay finite and never wedge a phase forever.
3. **Cross-module co-sim**: RingSim+FistTracker+Fight stepped together from
   correlated seeds — hp monotonicity per fighter (no free healing), score
   non-decreasing, stamina ∈ [0,1], distance stays finite for 10k steps.
4. **Serialization round-trip**: JSON.stringify(fight.state) mid-bout —
   must not throw; document which fields a resume would lose.
5. **Event stream invariants**: 'ko' only from fighting; 'round-start'
   count == round; events never duplicated across two drains; lastBlow
   only ever names a real blow.

## Report
`.teamwork/reports/b4-fuzz.md`: each finding w/ file:line, severity,
repro seed, fix or route. Update fuzz check-count. Run `npm test` end.
