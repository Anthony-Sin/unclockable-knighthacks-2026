# Brief: b4-e2e — End-to-end wave 4

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Server: `http://127.0.0.1:8791` (running — don't touch). Browser rules:
`.teamwork/qe/.chromium.lock`, load1<10, MemAvail>2.5GB, one Chromium,
nice it, NO Vulkan.

## Your files (exclusive — fix freely)
- `shared/boxing/npc.js`, `test/qe-e2e.mjs` (extend — deterministic)
- READ-ONLY: boxing.html, game.js, boxing-page.mjs (hot — report bugs there,
  orchestrator fixes)

## Do — regression-verify the wave-3 landed fixes + new hunt
1. **Corrupt `boxing:ko`** (live-repro'd bug we just fixed): setItem to
   `5`, `"x"`, `{"n":"a"}`, `{n:1e308}` → real KO via punches — no rAF
   crash, stat increments sanely, endcard shows.
2. **waitForHands hold**: `out.entranceWaiting` + "FINDING YOUR HANDS" —
   synthesize: `__boxing.game` exists, monkey-patch handStatus/'loading'
   path via `?notrack` OFF is hard — instead verify the hold logic via
   `controls.waitForHands=true` injection into game.step + check
   countdown doesn't tick and cd element shows the hint.
3. **Endcard same-tick re-arm**: `game.reset();game.skipIntro()` in ONE
   evaluate while endcard up → next hud frame must clear card + ended,
   and the new bout must re-latch a fresh card on its own win/lose.
4. **Corrupt `boxing:volume`/`boxing:sound`/`boxing:best`/`boxing:wins`**:
   NaN/garbage — boot clean, audio volume finite, endcard BEST sane.
5. **npc.js residual**: dt torture at phase boundaries, dispose during
   telegraph, manifest candidate normalization with bogus entries.

## Report
`.teamwork/reports/b4-e2e.md` + `.teamwork/qe/b4-*.json`. Route
hot-file bugs. End: `node test/qe-e2e.mjs` + `npm run test:e2e` green.
