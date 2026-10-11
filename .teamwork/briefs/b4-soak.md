# Brief: b4-soak — Browser soak wave 4 (report-only)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Server: `http://127.0.0.1:8791` (already running — DO NOT restart/kill it).
Browser rules: `.teamwork/qe/.chromium.lock` serialization, load1<10,
MemAvailable>2.5GB, one Chromium, nice it, NO Vulkan (broken box-wide —
SwiftShader only). Kill any orphan chromium you find older than 10min.

## Context — wave-4 fresh hunts (soak angles from b3 are done: churn,
denied-cam, hidden-tab dt, rematch accumulation, 3G load)

1. **waitForHands hold (NEW — just landed, verify live)**: slow-link boot
   should hold the bell: `out.entranceWaiting` true while handStatus is
   'loading', countdown element shows "FINDING YOUR HANDS", bell releases
   on hands-ready OR the 35s deadline (TRACK_WAIT_MS), never wedges. Drive
   with `?vid=` + a throttled/CDN-delayed profile; also verify NOTRACK and
   camera-denied paths never trigger the hold. Report behavior matrix.
2. **Tracker lifecycle churn**: hands.stop()/Hands.create() cycles ×10
   mid-page — worker count, RSS, pending-fetch count must not grow; the
   new double-grace (60s) must never spawn two concurrent model fetches
   (instrument via request counting on /vendor/mediapipe paths).
3. **Long-bout decay**: 5-min continuous fight at 4× CPU throttle — fps
   trend, rAF gap distribution, heap slope, renderer.info counters.
4. **Reload×10 memory trend**: heap after each full reload of boxing.html
   (prior round did ×8 — confirm slope still flat after wave-3 changes).
5. **localStorage quota-exceeded mid-fight**: fill storage ~full before
   KO — recordEnd/recordKo/store.set must survive (try/catch) and the
   endcard must still render.

## Report-only
`.teamwork/reports/b4-soak.md` + artifacts `.teamwork/qe/b4-*.json`.
Route fixes via `.teamwork/routing-queue.md` — file:line, severity, repro.
