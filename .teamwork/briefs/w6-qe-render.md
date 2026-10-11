# Brief: w6-qe-render — Render/asset layer audit (round 2)

QE round 2. Read `.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md`
at `/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:34149/` (never kill/restart).
- Tooling: `node test/qe-runner.mjs`, `node test/qe-static.mjs` — use
  them; don't edit test/*.
- The user is ACTIVELY editing `boxing.html`, `index.html`,
  `lineup.html`, `shared/track-worker.js`, `shared/boxing/mitts/classic.js`
  (entrance-glove arm/cap work) and the `*-mockups/` dirs RIGHT NOW.
  Those are HOT — read-only for you except mitts/classic.js where you
  may fix only outright crashes/syntax breakage, never revert their work.
- Round 1 fixed 20 bugs — find NEW ones.

## Your files (fix bugs freely)
- `shared/boxing/fx.js`, `scene.js`, `entrance.js`,
  `shared/boxing/assetManifest.json`
- `shared/boxing/mitts/index.js` (classic.js = read + crash-fixes only,
  it is hot)
- `shared/boxing/ring.js` READ-ONLY (w4 owns its fixes — file bugs)

## Do
1. **Asset audit**: parse `assetManifest.json`; HEAD-request or stat
   every referenced path — missing file = runtime 404. Also crawl the
   inverse: files in vendor/ + shared/ that nothing references (dead
   weight is a note, not a bug).
2. **fx.js / scene.js / entrance.js / mitts**: read fully. Classic
   targets —
   - unbounded arrays (particles/trails never culled → soak leak)
   - division by zero / NaN on degenerate input (zero-length bone,
     scale 0, missing joints in hand landmark input)
   - dispose() missing on geometries/materials created per-frame
   - state left dirty on reset()/fight restart (round 2 inherits
     round-1 particles, glove pose, entrance half-played)
   - entrance.js: what's it assume about load order/timing? skipped
     intro (skipIntro path) must not half-run
3. **Headless verify**: qe-runner on `boxing.html?vid=test-input.mp4`
   20s to confirm your fixes don't introduce console errors; note FPS
   p50 in report.
4. **Mockup dirs (read-only)**: `menu-mockups/`, `lineup-mockups/`,
   `iso-mockups/` — dead links/missing assets across their index pages
   worth flagging (they're design mockups; list findings, don't fix).

## Resource rules (HARD)
Gate every Chromium launch: load1<10 && MemAvail>2500MB; GPU runs only
nvidia-smi <6000MiB; ONE browser at a time. qe-runner does this for you.

## Report `.teamwork/reports/w6-qe-render.md`
Findings (sev | file:line | evidence | fix | verification), manifest
audit results, mockup-dir dead links, notes for orchestrator.
