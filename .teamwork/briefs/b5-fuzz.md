# Brief: b5-fuzz — Deep fuzz wave 5 (NO browser)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
- `test/qe-fuzz.mjs` at 82 checks, runs in `npm test`. Waves 1–4 covered
  sequence fuzz, phase invariants, tuning mutation, proto-injection,
  dt boundaries, co-sim, serialization, event-stream legality.

## Your files (exclusive — fix freely)
- `shared/boxing/{fight,fists,ring,protoBoxer,tutorial,audio}.js`
- `test/qe-fuzz.mjs` (extend — deterministic, seeded)
- `package.json` (only you may edit it)
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot), npc.js (b5-e2e)

## Do — angles not yet covered
1. **cornerHold semantics** (new user feature — game.js is read-only;
   fuzz the CONTRACT): while `controls.cornerHold` is set, fdt/punches/
   dodge/duck freeze — verify via the api surface that a held bout can
   never leak a buffered punch/dodge when it unfreezes, that corner
   during down/win/lose phases is ignored, and that spamming
   cornerHold toggles can't wedge a phase or leak stamina/hp changes.
   Any defect here → report to routing-queue (game.js is hot).
2. **Module singleton contamination**: two co-created fights/trackers/
   sims stepped alternately — shared module-level state must never leak
   across instances (events, tuning snapshots, telegraphs, bruises).
3. **Adversarial structural inputs**: Proxy objects, getters that throw,
   Symbol-keyed fields, getters returning different values per read,
   arrays with holes, cyclic state passed into step/tick.
4. **Long-horizon replay determinism**: same seed across 3 full bouts to
   decision — identical event streams + identical state digests each step.
5. **audio.js lifecycle**: rapid unlock/lock/mute toggles + crowd swells
   during dispose — no leaked AudioNodes, no doubling of voices.

## Report
`.teamwork/reports/b5-fuzz.md` — file:line, severity, repro seed, fix/route.
Update fuzz count. `npm test` green at end.
