# Teamwork Project Prompt — QE Wave 5 (bug hunt until clean) on SCRAP!

> Status: APPROVED by user → 6-agent waves until a wave finds ZERO bugs,
> then an optimization wave
> Requested team: 6 subagents — 3 headless-Chromium, 3 non-browser

Wave protocol (user directive): keep dispatching bug-hunt waves. If any
real bugs are found and fixed → another wave. Stop only when a full wave
reports zero new defects. THEN switch to optimization work.

This is wave 5. Waves 1–4 fixed ~120 bugs and built the QE tooling
(fuzz 82, e2e 90, server 227, static ~50 probes — all green).
The post-A7 glove contract stands: a hand with no landmarks legitimately
leaves the canvas (drawOverlay clearRects every frame); third-person
shots use the avatar's own 3D gloves. Do NOT report the absence of a
guard-pose/glove holdover as a bug, and do NOT re-add it.

User's in-flight features (respect, don't revert): **cornerHold** halftime
coach card (game.js freezes fdt/punches/dodge under `controls.cornerHold`;
boxing.html renders the card + coachAdvice fetch w/ AbortController +
offline tips), **hitFx** ink-burst, crowd renderers. Verify these paths —
they're new code — but route defects in them rather than rewriting.

Just-landed (verify, don't trust): dynamic contract-module imports +
parkFail in boxing.html, videoLive gate (bogus ?vid), tracker
grace-3 verdict-wait (bootMs*3 dead-man cap — never two model fetches,
worker kept for late adopt), If-Range/conditional HTTP, npc manifest
normalization, proto-key injection clamps.

Working directory: /home/ANT/unclockable-knighthacks-2026/spatial-objects
Live server under test: http://127.0.0.1:8791/ (do NOT kill/restart)
Approach policy: development — no new npm deps.

## HARD: user-hot files (READ-ONLY this wave, bugs → report only)
- `boxing.html`, `shared/boxing/game.js`, `test/boxing-page.mjs`

## Requirements

### R1. Hunt NEW bugs
Find defects not already reported (see `.teamwork/reports/w*.md` and
`.teamwork/routing-queue.md` for what's fixed). Fix in-boundary bugs;
report out-of-boundary with file:line + repro evidence.

### R2. Keep the green wall
`npm test` (incl. qe-fuzz + qe-server), `npm run test:e2e`
(boxing-page + qe-e2e), `npm run qe:static`, qe-runner on the 4 pages —
all must stay green after your fixes.

### R3. Resource governance
qe-runner self-gates + serializes Chromium. Custom launches: load1<10 &&
MemAvailable>2500MB; ONE browser per worker; nice it; Vulkan --gpu flags
are BROKEN box-wide right now — do NOT use them (webgl2 ctx returns null).

## Team (6 — boundaries exclusive)

| agent | browser | owns (fix freely) |
|-------|---------|-------------------|
| b3-fuzz   | none     | shared/boxing/{fight,fists,ring,protoBoxer,tutorial,audio}.js, test/qe-fuzz.mjs, package.json |
| b3-soak   | chromium | NOTHING — report only (.teamwork/qe/b3-*) |
| b3-render | chromium | shared/boxing/{fx,scene,entrance}.js, assetManifest.json, shared/boxing/mitts/ |
| b3-e2e    | chromium | test/qe-e2e.mjs, shared/boxing/npc.js |
| b3-server | none     | server.mjs, test/qe-server.mjs |
| b3-pages  | none     | index.html, lineup.html, gallery.html, shared/{hands,face,glove,track-worker}.js, test/qe-static.mjs |

`*-mockups/` dirs: read-only for everyone.
No git mutations, no .env, no new deps, no edits outside boundaries.

## Report format
`.teamwork/reports/<name>.md` — findings table
(sev | file:line | evidence | fix | verification) + residual risks.
A wave "finds bugs" = any sev≥P3 real defect (not style nits).
