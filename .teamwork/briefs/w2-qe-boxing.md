# Brief: w2-qe-boxing — Boxing page bug hunt + fix

You are the boxing worker on a 3-agent QE team. Read
`.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md` first — both at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/`.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects` — plain ES
  modules, no build step, no new npm deps.
- Live server: `http://127.0.0.1:34149/` serves the repo dir (edits appear
  on reload). Do NOT kill/restart it.
- There are UNCOMMITTED in-progress changes in `boxing.html`,
  `shared/boxing/npc.js`, `shared/boxing/protoBoxer.js` (a "dodge-driven
  combat" rework). Treat them as the user's live work — fix bugs in them
  but never revert them.
- Chromium: `/usr/bin/chromium` + `puppeteer-core`. Working launch/FPS
  patterns: `test/fps-probe.mjs` (Vulkan flags + rAF sampling),
  `test/boxing-page.mjs` (e2e fight flow). Test video input:
  `boxing.html?vid=test-input.mp4`.
- fps-probe hardcodes port 8890 — to measure, spawn your own server:
  `PORT=8890 node server.mjs` from the repo dir is fine IF nothing is on
  8890; otherwise copy the probe pattern into a throwaway script under
  `/tmp` (do NOT add files to test/ — that dir belongs to another worker)
  pointing at `http://127.0.0.1:34149/boxing.html?vid=test-input.mp4`.

## Your files (exclusive)
- `boxing.html`
- `shared/boxing/**` (audio.js, entrance.js, fight.js, fists.js, fx.js,
  game.js, mitts/, npc.js, protoBoxer.js, ring.js, scene.js, tutorial.js,
  assetManifest.json)

Bug found outside these (e.g. `shared/hands.js`, `server.mjs`,
`index.html`, `test/`, `package.json`): report with file:line + evidence,
do NOT edit.

## Do

1. Baseline: `npm test` (7 scripts) and `npm run test:e2e`. Record
   failures verbatim.
2. Headless exercise of the live boxing page (~30–60 s): capture
   pageerrors/console-errors/failed requests; sample FPS (median frame
   ms, avg fps, worst 1s fps) — the BEFORE number.
3. Bug hunt, especially around the fresh dodge/combat rework:
   - state-machine dead-ends (dodge → counter → hit resolution)
   - NaN/undefined guards on tracking input (hands drop mid-frame)
   - event-listener / RAF leaks, double-init on reload
   - audio scheduling errors, missing asset paths vs assetManifest.json
   - boundary math: ring bounds, glove reach, NPC vs player collision
4. Fix every bug in your files. Verify each fix by re-running the exact
   test/probe that exposed it; keep `npm test` + `test:e2e` green.
5. AFTER FPS number on the same probe; flag if it regressed >5%.

## Resource rules (HARD — user requirement)
- Before EVERY Chromium launch: `load1 < 10` (see /proc/loadavg) AND
  `MemAvailable > 2500` MB (see /proc/meminfo). If over, sleep 20 s and
  retry, up to 15 min; then note the skip in your report.
- GPU runs (Vulkan flags): only when `nvidia-smi` shows <6000 MiB used.
- ONE Chromium instance at a time. Always. No parallel pages.
- Never touch `.env`, never git commit/reset/checkout.

## Report to `.teamwork/reports/w2-qe-boxing.md`
Baseline results, findings table (severity | file:line | evidence | fix |
verification), out-of-boundary bugs filed, FPS before/after, remaining
known issues.
