# Brief: b3-e2e — Extended e2e wave 3 (headless Chromium)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first. KEY CHANGE:
A7 holdover removed — hands with no landmarks leave the canvas; the
canvas clears on dropout; third-person shots use the avatar's 3D gloves.
boxing.html + game.js + test/boxing-page.mjs are USER-HOT READ-ONLY —
bugs there → report with file:line + evidence, I fix them.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` (never kill/restart — boxing-page.mjs
  can self-serve :8890 if needed).
- `test/qe-e2e.mjs` (37 checks) is yours to extend. `test/boxing-page.mjs`
  is user-hot — run it, don't edit it.
- No Vulkan/--gpu flags — broken box-wide.

## Your files (exclusive — fix freely)
- `test/qe-e2e.mjs` (extend with new scenarios)
- `shared/boxing/npc.js` (the render adapter — fair game for fixes)
- Everything else report-only this wave.

## Do — scenarios round 2 didn't drive
1. **New-contract checks**: update/extend section E already reflects
   "dropout clears canvas, tracked draws, recovery redraws" — verify the
   user refactor keeps those true AND add: partial dropout (one hand
   drops, other stays drawn), dropout DURING a swing mid-flight
   (punch resolves on stale data or cancels cleanly?), glove at screen
   edge when tracking returns (no pop across the screen — does pos
   snap or interpolate?).
2. **Rapid reset spam**: `game.reset()` ×20 back-to-back, reset during
   telegraph, reset during KO anim, reset between countdown ticks —
   no stuck phases, no doubled listeners, endcard sane.
3. **Storage corruption**: localStorage `boxing:npc` = `'{}'`,
   `'"proto:bogus"'`, `null` byte junk, HUGE string; `boxing:stats`/
   history entries malformed JSON → lineup + boxing must not throw.
4. **Tab hidden mid-fight**: `document.visibilityState` forced hidden
   via CDP → 5s → visible: dt spike handled? audio? timers?
5. **Multi-KO/rapid rounds**: force hp low, ride through round
   transitions — `round-start` fires per round, clock resets.
6. **npc.js audit + fix** (you own it): pose() with unknown names,
   tick(dt) extremes, telegraph sprite world-pos when parts missing,
   strike ctx malformed, dispose() idempotent? gloveColor garbage.
7. Extend `test/qe-e2e.mjs` with new checks; keep it passing.
   `npm run test:e2e` + `npm test` stay green.

## Resource rules (HARD)
qe-runner/qe-e2e self-gate + serialize. Custom scripts: same gates,
ONE browser, nice. No Vulkan.

## Report `.teamwork/reports/b3-e2e.md`
Findings (sev | file:line | evidence | fix | verification), coverage
added, bugs routed to hot-file owners.
