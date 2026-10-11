# Teamwork Project Prompt — QE Round 2 on SCRAP! (spatial-objects)

> Status: APPROVED by user → delegating to 6-agent QE team
> Requested team: 6 subagents — 3 headless-Chromium, 3 non-browser —
> iterative fix loop until clean

QE round 2 on the SCRAP! boxing game + spatial-objects pages. Round 1
(3 agents) built the QE tooling and fixed ~20 bugs; all 4 pages report
zero console errors. Round 2 hunts what round 1 can't see: state-machine
fuzz, soak/leak, render-layer defects, e2e fight flow, HTTP server edge
cases, and static/code audit of the tracking + page layer. Fix every bug
found inside file boundaries; route the rest with file:line evidence.

Working directory: /home/ANT/unclockable-knighthacks-2026/spatial-objects
Live server under test: http://127.0.0.1:8791/ (serves the repo dir;
file edits appear on reload — do NOT kill or restart this server)
Approach policy: development (any approach that works; no new npm deps —
project rule from .teamwork/CONTRACT.md)

## Requirements

### R1. Bug hunt + fix
Exercise the app per your brief (fuzz suites, e2e drives, headless page
runs, HTTP probes, static analysis). Fix every bug found inside your
file boundaries; report out-of-boundary bugs with file:line + evidence.
Do NOT git commit/reset/checkout or touch .env.

### R2. Resource governance (hard user requirement)
Every headless browser launch must be gated: 1-min loadavg < 10 AND
MemAvailable > 2500 MB; nvidia-smi GPU memory used < 6 GB when Vulkan
flags are used. `node test/qe-runner.mjs` self-gates AND serializes via
.teamwork/qe/.chromium.lock — prefer it. Custom puppeteer scripts must
gate themselves the same way; ONE Chromium per worker; nice processes.

### R3. Measurement + evidence
Every claim in a report needs evidence (JSON artifact, test output, or
repro steps). FPS numbers where the brief asks for them.

## Acceptance Criteria

### Quality
- [ ] `npm test` + `npm run test:e2e` pass after all fixes
- [ ] qe-runner reports zero pageerrors/console-errors on index, lineup,
      gallery, boxing on http://127.0.0.1:8791/
- [ ] Every bug in the reports is either fixed-in-boundary with a
      passing re-verification, or filed with file:line evidence

### Hygiene
- [ ] No git mutations, no .env changes, no edits outside file
      boundaries, no new npm deps

## Verification Resources
- `npm test`, `npm run test:e2e`, `node test/fps-probe.mjs`
- `node test/qe-runner.mjs <url> [--name n] [--seconds N] [--gpu]`
- `npm run qe:static`, `npm run qe:res`
- Chromium: /usr/bin/chromium (SwiftShader default; --gpu → Vulkan)
- Test video input: boxing.html?vid=test-input.mp4 ; synthetic mode:
  boxing.html?notrack=1 ; hooks: window.__forceHands/__forceFace/__boxing

## Team (6 agents — file boundaries are exclusive)

| agent | browser | owns (fix freely) |
|-------|---------|-------------------|
| w4-qe-fuzz   | none     | shared/boxing/{fight,fists,ring,protoBoxer,tutorial,audio}.js, test/qe-fuzz.mjs, package.json |
| w5-qe-soak   | chromium | NOTHING — report only (.teamwork/qe/w5-*) |
| w6-qe-render | chromium | shared/boxing/{fx,scene,entrance}.js, assetManifest.json, shared/boxing/mitts/ |
| w7-qe-e2e    | chromium | boxing.html, shared/boxing/{game,npc}.js, test/boxing-page.mjs |
| w8-qe-server | none     | server.mjs, test/qe-server.mjs |
| w9-qe-pages  | none     | index.html, lineup.html, gallery.html, shared/{hands,face,glove,track-worker}.js, test/qe-static.mjs |

Mockup dirs (`*-mockups/`) are read-only for everyone — audit + report.
Bugs outside your boundary → report with file:line, orchestrator routes.

---
*Delegation: 6 background subagents (teamwork-worker), event-loop
orchestration; fixes verified by re-running the owning suite.*
