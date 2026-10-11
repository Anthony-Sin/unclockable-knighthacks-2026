# Brief: w5-qe-soak — Browser soak / leak / mode-matrix QE (round 2)

QE round 2. Read `.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md`
at `/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` (never kill/restart). Chromium at
  /usr/bin/chromium, puppeteer-core installed.
- QE tooling exists — USE IT: `node test/qe-runner.mjs <url> --name n
  --seconds N [--gpu]` (self-gates on CPU/RAM/GPU; JSON → `.teamwork/qe/`).
  Extend via `/tmp` scripts or inline `-e` — do NOT edit test/*.
- Round 1 is clean: 0 errors on all 4 pages; boxing p50 16.7ms @Vulkan.

## Your files
- WRITE-ONLY outputs: `.teamwork/qe/w5-*` JSON + throwaway probes under
  `/tmp/w5/` + your report. **You may not edit any app file.**
- Every bug → report with file:line + repro evidence. Another worker fixes.

## Do — hunt what unit tests can't see
1. **Soak**: `boxing.html?vid=test-input.mp4` for ~120s (qe-runner,
   `--gpu` if GPU mem <6GB). Watch chromiumRSS slope — >30% growth over
   the window after warmup = suspected leak; record trend.
2. **Reload-loop leak**: same browser, `page.reload()` ×8 on boxing.html
   (vid mode). Each cycle record `performance.memory.usedJSHeapSize` and
   `document.querySelectorAll('*').length`. Rising heap/DOM across
   reloads = listener/timer/init leak. Also count `window.__boxing.log`
   duplicates if present.
3. **Mode matrix** — qe-runner 15s each, capture errors:
   - `boxing.html?notrack=1` (synthetic mode — gloves must still render)
   - `boxing.html?practice=1`
   - `boxing.html?tutorial=1` if that param exists (check source first)
   - `index.html`, `lineup.html` at mobile viewport 390×844
   - lineup → boxing hand-off: click/select a fighter → navigation works
4. **CPU throttle**: CDP `Emulation.setCPUThrottlingRate` 4× during a
   20s boxing run — errors/timeouts that only appear under slow CPU
   (races the fast box hides).
5. Edge inputs via `page.evaluate`: `window.__forceHands` /
   `__forceFace` hooks exist (see boxing.html ~L1117) — inject NaN
   landmarks, giant coordinates, two-left-hands, and watch for
   pageerrors.

## Resource rules (HARD)
qe-runner self-gates — just use it. For your own puppeteer scripts:
check load1<10 && MemAvail>2500MB before launch, ONE browser at a time,
nice it. GPU runs only when nvidia-smi <6000MiB.

## Report `.teamwork/reports/w5-qe-soak.md`
Findings table (sev | file:line | evidence | suggested owner), soak/reload
numbers (RSS slope, heap trend per reload), mode-matrix results matrix,
residual risks.
