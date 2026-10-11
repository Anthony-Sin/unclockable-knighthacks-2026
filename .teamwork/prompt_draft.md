# Teamwork Project Prompt — QE Pass on SCRAP! (spatial-objects)

> Status: APPROVED by user → delegating to 3-agent QE team
> Requested team: 3 subagents, iterative fix loop until clean

QE pass on the live SCRAP! boxing game + spatial-objects pages: build
reusable error-detection tooling, hunt bugs, fix them, and iterate until
the test suite and headless page runs come back clean. Measure FPS.

Working directory: /home/ANT/unclockable-knighthacks-2026/spatial-objects
Live server under test: http://127.0.0.1:34149/ (serves the repo dir;
file edits appear on reload — do NOT kill or restart this server)
Approach policy: development (any approach that works; no new npm deps —
project rule from .teamwork/CONTRACT.md)

## Requirements

### R1. Reusable QE tooling
Headless page-QE runner (puppeteer-core + /usr/bin/chromium) that captures
pageerrors, console errors/warnings, failed requests, and samples FPS —
plus a resource governor that checks CPU load / free RAM / GPU memory
before and during headless runs, and a static check over the HTML files'
inline modules. Wired into package.json scripts.

### R2. Resource governance (hard user requirement)
Every headless browser launch must be gated on system resources:
1-min loadavg < 10 AND MemAvailable > 2500 MB; nvidia-smi GPU memory used
< 6 GB when Vulkan flags are used. Wait+retry when over; never more than
one Chromium instance per worker at a time; `nice` heavy processes.

### R3. Bug hunt + fix
Exercise the app (npm test suite, e2e page test, headless runs of every
page on the live server) and audit code. Fix every bug found inside your
file boundaries; report out-of-boundary bugs for routing. Iterate until
no more errors are found. Do NOT git commit/reset/checkout or touch .env.

### R4. Measurement
FPS numbers for boxing.html under the test-video input (median frame
time, avg fps, worst 1s fps), before/after fixes.

## Acceptance Criteria

### Tooling
- [ ] `npm run qe` runs the headless runner against a URL and exits
      nonzero on pageerrors/console-errors; writes JSON to .teamwork/qe/
- [ ] Resource gate demonstrably delays a launch when load/mem/GPU over
      threshold (unit-testable or logged evidence)
- [ ] `npm run qe:static` checks all 4 top-level HTML files

### Quality
- [ ] `npm test` (7 boxing scripts) + `npm run test:e2e` pass
- [ ] qe-runner reports zero pageerrors/console-errors on index, lineup,
      gallery, boxing pages on the live server
- [ ] Every bug in the reports is either fixed-in-boundary with a passing
      re-verification, or filed with file:line evidence for the owner
- [ ] boxing FPS reported before/after; no regression >5% from fixes

### Hygiene
- [ ] No git mutations, no .env changes, no edits outside file boundaries

## Verification Resources
- Existing suite: `npm test`, `npm run test:e2e`, `node test/fps-probe.mjs`
- Chromium: /usr/bin/chromium; flags used by existing probes
  (--use-fake-device-for-media-stream, --use-fake-ui-for-media-stream,
  --use-angle=vulkan --enable-features=Vulkan --ignore-gpu-blocklist)
- Test video input: boxing.html?vid=test-input.mp4

---
*Delegation: 3 background subagents — w1 qe-tools, w2 qe-boxing, w3 qe-pages.*
