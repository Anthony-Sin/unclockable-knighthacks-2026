# Brief: w1-qe-tools — Build the QE tooling

You are the tooling worker on a 3-agent QE team. Read
`.teamwork/prompt_draft.md` (master prompt) and `.teamwork/CONTRACT.md`
(project rules) first — both at `/home/ANT/unclockable-knighthacks-2026/.teamwork/`.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects` — vendored
  Three.js + MediaPipe hand/face tracking, plain ES modules, no build step.
- Live server: `http://127.0.0.1:34149/` serves the repo dir. Do NOT kill
  or restart it. Other agents are testing against it concurrently.
- Chromium: `/usr/bin/chromium`, driven by `puppeteer-core` (installed).
  Working launch patterns are in `test/fps-probe.mjs` (GPU flags, rAF FPS
  sampling) and `test/boxing-page.mjs` (fake-media flags).
- Machine: 16 cores, ~15.6 GB RAM, RTX 4070 (8 GB) via nvidia-smi.

## Your files (exclusive — others must not touch)
- `test/qe-resources.mjs` (new)
- `test/qe-runner.mjs` (new)
- `test/qe-static.mjs` (new)
- `package.json` (you are the ONLY worker allowed to edit it — add
  scripts only: `qe`, `qe:static`, `qe:res`)
- `.teamwork/qe/` (output dir for JSON results)

## Build

1. **`test/qe-resources.mjs`** — resource governor.
   - Export `snapshot()` → `{load1, load5, memAvailMB, gpuUtilPct, gpuMemUsedMB, ok, reasons[]}`
   - Export `waitForResources({timeoutMs, pollMs})` → resolves when
     `load1 < 10 && memAvailMB > 2500 && gpuMemUsedMB < 6000`, else throws
     after timeout. Log each wait cycle.
   - CLI: `node test/qe-resources.mjs` prints the snapshot and exits 0/1.
   - Parse `/proc/loadavg`, `/proc/meminfo` (MemAvailable), and
     `nvidia-smi --query-gpu=... --format=csv,noheader` (tolerate its
     absence → treat GPU as ok).
2. **`test/qe-runner.mjs`** — generic headless page-QE runner.
   - CLI: `node test/qe-runner.mjs <url> [--name <n>] [--seconds <n>] [--gpu]`
   - ALWAYS `await waitForResources()` before launching Chromium. Recheck
     mid-run; if memory drops below 1500 MB, kill the browser, record
     `aborted: "resources"` in the JSON, exit 2.
   - Launch chromium via nice (`nice -n 10` equivalent — use
     `detached:false` + spawn nice, or `process` priority; simplest is to
     spawn `nice -n 10 chromium` is hard through puppeteer — instead pass
     executablePath through a small wrapper or skip nice but keep ONE
     browser max and document the choice).
   - Capture: `pageerror`, `console` (error + warning), `requestfailed`,
     responses with status ≥400.
   - FPS: reuse the rAF-sampling pattern from `test/fps-probe.mjs`
     (median frame ms, avg fps, worst 1s-window fps).
   - Sample the chromium process RSS while running (read
     `/proc/<pid>/status` VmRSS of the browser pid tree — puppeteer
     `browser.process().pid`; a shallow sample of that pid is fine).
   - Write `.teamwork/qe/<name>.json` with everything; print a summary;
     exit 1 if any pageerror or console-error, else 0.
   - `--gpu` adds the Vulkan flags; default run uses the fake-media flags
     so getUserMedia resolves instantly
     (`--use-fake-device-for-media-stream --use-fake-ui-for-media-stream
     --mute-audio`).
3. **`test/qe-static.mjs`** — static check over `index.html`,
   `lineup.html`, `gallery.html`, `boxing.html`:
   - Extract every `<script type="module">…</script>` block → write to a
     temp file → `node --check` it (syntax).
   - Parse importmap JSON; verify every mapped path exists on disk.
   - Collect `import … from '…'` specifiers across inline modules AND
     `shared/**/*.js`; verify relative specifiers resolve to real files.
   - Flag duplicate `id="…"` attributes per file.
   - Print findings, exit nonzero on any.

## Verify before reporting
- `node test/qe-resources.mjs` → snapshot printed.
- `node test/qe-runner.mjs http://127.0.0.1:34149/index.html --name w1-index --seconds 15` → JSON written, summary printed.
- `node test/qe-static.mjs` → findings (or clean).
- `npm run qe -- --help`-ish sanity: scripts exist.

## Report to `.teamwork/reports/w1-qe-tools.md`
Tools built (paths + usage), your verification output, any app bugs your
tools surfaced (file:line + error text — do NOT fix them, that's routing
input for the orchestrator), resource-gate behavior observed.

## Hard rules
- No git mutations. No `.env`. No edits outside "Your files".
- One Chromium at a time. Always gate on resources first.
