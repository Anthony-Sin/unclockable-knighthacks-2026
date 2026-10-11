# Brief: b5-e2e — End-to-end wave 5

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Server `http://127.0.0.1:8791` — don't touch. Browser rules:
`.chromium.lock`, load1<10, MemAvail>2.5GB, one Chromium, nice, NO Vulkan.

## Your files (exclusive — fix freely)
- `shared/boxing/npc.js`, `test/qe-e2e.mjs` (extend — deterministic)
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot — report only;
  cornerHold/coachAdvice live there)

## Do — new angles
1. **cornerHold e2e** (user's new halftime): real bout → corner triggers
   once, card visible, fight frozen (hp/pos/events static across frames),
   Enter key skips → same bout resumes, reset during corner → no stuck
   card, second bout re-arms corner (used flag clears), corner during
   down/win phases never fires, halftime boundary exact-KO ordering sane.
2. **coachAdvice**: stub `COACH.url` fetch to hang/abort — corner still
   resolves on COACH_TIPS within hold window; AbortController leak check.
3. **Roster sweep**: drive each `?npc=`/storage pick variant (bubble,
   bean, sumo, glb kinds, props) through a real bout start — each spawns,
   telegraphs, KOs/dies correctly; unknown → bubble fallback.
4. **Score/combo math under real bouts**: sustained punch series —
   combo counts exactly, score matches landed dmg table, counter window
   expires, no double-count on multi-drain.
5. **GLB failure cascade**: manifest pointing at 404/broken/corrupt GLB —
   fallback rig, telegraph anchor fallback, dispose idempotent.

## Report
`.teamwork/reports/b5-e2e.md` + `.teamwork/qe/b5-*.json`.
End: `node test/qe-e2e.mjs` + `npm run test:e2e` green.
