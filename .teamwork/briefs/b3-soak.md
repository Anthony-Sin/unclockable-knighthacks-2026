# Brief: b3-soak — Lifecycle/transition soak wave 3 (headless Chromium)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first (wave-3 rules:
the A7 holdover is intentionally GONE — gloves leaving the canvas on
tracking loss is correct now; boxing.html/game.js are user-hot read-only).

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` (never kill/restart). Chromium
  /usr/bin/chromium + puppeteer-core installed.
- Tooling: `node test/qe-runner.mjs <url> --name b3-<n> --seconds N`
  (self-gates, serializes via lockfile, JSON → `.teamwork/qe/`).
  Custom scripts under /tmp/b3/. **Do NOT use --gpu/Vulkan flags —
  Vulkan is broken box-wide right now (webgl2 ctx returns null).**
- Round-2 soak was clean on boxing-vid. Your job: the surfaces round 2
  never soaked.

## You own NOTHING — report only
Every finding → report with file:line + repro. No app-file edits.

## Do — lifecycle bugs, the kind round 2 didn't chase
1. **Page-transition churn**: index → lineup → boxing → index → lineup…
   ×10 in ONE browser session (real navigations). Heap/DOM/listener
   growth across navigations; stray rAF loops still running after nav;
   MediaPipe workers terminated on leave? (workers spawned per page —
   orphan check via chrome://inspect impossible, count via performance
   entries/heap instead.)
2. **Idle/background behavior**: `Emulation.setLifecycleState` or
   visibilitychange — hidden tab 10s → visible: does the sim jump
   (huge dt)? AudioContext suspended/resumed cleanly? Then a 60s
   idle-visible soak on index.html + lineup.html (not just boxing).
3. **Camera permission denial path**: puppeteer with fake-ui REMOVED +
   permissions denied → does boxing.html degrade to mouse mode cleanly
   (status 'mouse mode', game playable)? This is the real-user failure
   path nobody hit yet.
4. **Repeated fight cycles**: play→win→replay→win→replay ×5 via
   __forceHands/__boxing handles in one page — watch for listener
   stacking, doubled SFX, growing __boxing.log, renderer program
   accumulation (renderer.info.memory grows unboundedly?).
5. **Slow network**: CDP `Network.emulateNetworkConditions` 3G during
   page load — do module/model loads race or timeout? Does the page
   render a broken half-state or a graceful loading state?

## Resource rules (HARD)
qe-runner self-gates. Custom: load1<10 && MemAvailable>2500MB before
launch, ONE browser, nice it. No Vulkan flags.

## Report `.teamwork/reports/b3-soak.md`
Findings (sev | file:line | evidence | suggested owner), leak numbers
(per-navigation heap trend, per-rematch renderer.info counts), the
denial/idle/offline matrices, residual risks.
