# Brief: w3-qe-pages — Non-boxing pages + shared tracking bug hunt + fix

You are the pages/tracking worker on a 3-agent QE team. Read
`.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md` first — both at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/`.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects` — plain ES
  modules, no build step, no new npm deps.
- Live server: `http://127.0.0.1:34149/` serves the repo dir (edits appear
  on reload). Do NOT kill/restart it.
- Chromium: `/usr/bin/chromium` + `puppeteer-core`. Launch patterns:
  `test/fps-probe.mjs` (GPU/FPS), `test/boxing-page.mjs`
  (`--use-fake-device-for-media-stream --use-fake-ui-for-media-stream
  --mute-audio` so getUserMedia resolves). Camera pages accept
  `?vid=test-input.mp4` as synthetic input where wired (check the code).
- Machine: 16 cores, ~15.6 GB RAM, RTX 4070 (nvidia-smi available).

## Your files (exclusive)
- `index.html`, `lineup.html`, `gallery.html`
- `server.mjs`
- `shared/face.js`, `shared/glove.js`, `shared/hands.js`,
  `shared/track-worker.js`

Bug found outside these (e.g. `boxing.html`, `shared/boxing/**`,
`test/`, `package.json`): report with file:line + evidence, do NOT edit.

## Do

1. Static audit of your files first — read them fully. Classic targets:
   - worker lifecycle in `track-worker.js`/`hands.js`/`face.js`
     (terminate on pagehide? double-spawn on reload? message ordering?)
   - `glove.js` canvas sizing on resize/DPR changes
   - `server.mjs`: path traversal (`..`), MIME types, 404 handling,
     port-in-use error path, Range requests for the .mp4
   - dead links/imports across index/lineup/gallery; lineup → boxing
     hand-off params
   - null guards on missing DOM nodes when tracking is denied/unavailable
2. Headless exercise on the live server (one page at a time):
   `index.html`, `lineup.html`, `gallery.html` (~20 s each) with
   fake-media flags — capture pageerrors/console-errors/failed requests.
   If a page needs camera input and supports `?vid=`, use
   `test-input.mp4`; if not supported, note that as a gap.
3. Fix every bug in your files; re-verify with the same headless run.
4. Sanity: `node --check server.mjs`; restart-safety of server.mjs if you
   change it (verify by curling your OWN instance on a free port, e.g.
   `PORT=8933 node server.mjs` — never restart the 34149 one).

## Resource rules (HARD — user requirement)
- Before EVERY Chromium launch: `load1 < 10` (/proc/loadavg) AND
  `MemAvailable > 2500` MB (/proc/meminfo). Over → sleep 20 s, retry up
  to 15 min, then note the skip.
- GPU runs only when `nvidia-smi` shows <6000 MiB used.
- ONE Chromium instance at a time. Always.
- Never touch `.env`, never git commit/reset/checkout.

## Report to `.teamwork/reports/w3-qe-pages.md`
Findings table (severity | file:line | evidence | fix | verification),
out-of-boundary bugs filed, pages that can't run headless (gap list),
remaining known issues.
