# w1-qe-tools — Report

Worker: **w1-qe-tools** (QE tooling). Scope honored: only `test/qe-*.mjs`,
`package.json` (scripts), `.teamwork/qe/*.json` touched. No git mutations, no
`.env`, no app fixes (none found in my runs anyway).

## Tools built

### 1. `test/qe-resources.mjs` — resource governor
- `snapshot()` → `{load1, load5, memAvailMB, gpuUtilPct, gpuMemUsedMB, ok, reasons[]}`
  (parses `/proc/loadavg`, `/proc/meminfo` MemAvailable, `nvidia-smi`; missing/
  N/A GPU data → `null` → treated as OK).
- `waitForResources({timeoutMs=120000, pollMs=2000, log})` → resolves with the
  passing snapshot (+`waitedMs`), throws on timeout, **logs every blocked cycle**.
- Thresholds (exported `LIMITS`): `load1<10 && memAvailMB>2500 && gpuMemUsedMB<6000`.
- CLI `node test/qe-resources.mjs` prints snapshot JSON, exit 0 ok / 1 not.
- **Test hooks** (env): `QE_LOADAVG`, `QE_MEMINFO` point at substitute proc files;
  `QE_GPU_MEM_USED` overrides nvidia-smi. Lets anyone exercise the gate without
  stressing the shared box. Never set in real runs.

### 2. `test/qe-runner.mjs` — headless page-QE runner
```
node test/qe-runner.mjs <url> [--name <n>] [--seconds <n>] [--gpu]
npm run qe -- <url> --name <n> --seconds <n>
```
- Gate: `waitForResources()` before every launch; mid-run watchdog kills
  Chromium (SIGKILL) if MemAvailable < 1500 MB → `aborted:"resources"`, exit 2.
- One Chromium at a time: advisory lock `.teamwork/qe/.chromium.lock`
  (pid + timestamp, auto-stale >15 min or dead pid); runners queue behind it.
- Niced: puppeteer can't inject `nice`, so the runner writes a tiny
  `qe-nice-chromium-<pid>.sh` wrapper (`exec nice -n 10 /usr/bin/chromium "$@"`)
  to `os.tmpdir()`, uses it as `executablePath`, removes it after.
- Flags: default = `--no-sandbox --use-gl=angle --use-angle=swiftshader
  --enable-unsafe-swiftshader` + fake-media (`--use-fake-device-for-media-stream
  --use-fake-ui-for-media-stream --mute-audio`), per test/boxing-page.mjs.
  `--gpu` swaps in the Vulkan set from test/fps-probe.mjs.
- Captures: `pageerror`, console **error + warning**, `requestfailed`,
  responses ≥400. Console errors matching the repo's BENIGN regex
  (`^INFO:|XNNPACK|TensorFlow|Created TensorFlow|GroupMarker`, same as
  boxing-page.mjs:42) are tagged `benign:true` and don't count toward exit.
- FPS: rAF sampling (fps-probe pattern) → `{frames, avgFps, p50Ms, p95Ms,
  worstMs, worst1sFps}`.
- RAM: Chromium **process-tree** RSS (pid + descendants via `/proc/*/stat`
  PPid walk, VmRSS sum) sampled 1×/s → `{peak, samples[]}`.
- Output `.teamwork/qe/<name>.json` + console summary.
  Exit: **0** clean · **1** any pageerror/non-benign console-error/failed-req/
  HTTP≥400/load error · **2** resource abort.

### 3. `test/qe-static.mjs` — static checker (4 top-level HTML files)
- `node --check` on every `<script type="module">` block (temp `.mjs`) AND on
  every `.js` under `shared/` — 20 modules/files checked.
- importmap JSON.parse per page; every mapped relative/absolute path must
  exist on disk (remote URLs noted, not failed).
- Import specifiers: `import/export … from`, side-effect and dynamic
  `import()` collected; relative specifiers must resolve — from inline modules
  AND recursively through the reachable shared-graph **per page**; bare
  specifiers must exist in that page's own importmap.
- Duplicate `id="…"` per file flagged with both line numbers.
- Exit 1 on any finding.

### package.json
Added `"qe"`, `"qe:static"`, `"qe:res"` scripts (only edit).

## Verification evidence
| Run | Result |
|---|---|
| `node test/qe-resources.mjs` | snapshot ok, exit 0 |
| fake `QE_LOADAVG=99` / `QE_GPU_MEM_USED=8000` | `ok:false`, correct reasons, exit 1 |
| `waitForResources` under fake high load, healed at +3.5 s | 4 blocked cycles logged, resolved `waitedMs=4086` |
| `w1-index` (`index.html`, 15 s, default flags) | 0 errors, fps{avgFps 4.1, p50 250 ms} under SwiftShader, RSS peak 1389 MB, exit 0 |
| `npm run qe -- gallery.html` | clean, exit 0 |
| `npm run qe:static` | `checked 20 … CLEAN`, exit 0 |
| `npm run qe:res` | snapshot OK |
| 404 URL run | httpStatus 404 + 2 console errors captured, exit 1 |
| `--gpu` smoke (gallery, 5 s) | Vulkan flags launch fine, 60 fps, exit 0 |
| **Launch-gate hold**: mem low at launch | 60 blocked cycles ×2 s, no Chromium spawned, timeout → exit 1 (JSON written) |
| **Mid-run abort**: mem →1000 MB at +8 s | "killing chromium", `aborted:"resources"`, exit 2 |

JSONs for all of the above are in `.teamwork/qe/w1-*.json`.

## Resource-gate behavior observed live
During verification real load1 spiked to 10.39 (other workers active) — the
gate genuinely matters on this box; a launch at that moment would have queued.

## App bugs surfaced
**None.** index.html and gallery.html both produced zero pageerrors, console
errors/warnings, failed requests or HTTP≥400. (boxing.html / lineup.html deep
runs left to w2/w3 — my mandate was tooling + verification runs.)

Notes for w2/w3:
- index.html under headless **SwiftShader** renders ~4 fps (250 ms frames) —
  that's software-GL cost at 1600×900, not an app bug. Use `--gpu` for real
  FPS numbers; reserve SwiftShader runs for error capture.
- qe-runner's fake-media flags make getUserMedia resolve instantly; boxing
  runs should still pass `?vid=test-input.mp4` or `?notrack=1` as appropriate.
- If a runner exits 2, its JSON says `aborted:"resources"` — just re-run;
  it's the governor, not the app.
