# Brief: b5-soak — Browser soak wave 5 (report-only)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Server `http://127.0.0.1:8791` — never restart/kill. Browser rules:
`.teamwork/qe/.chromium.lock`, load1<10, MemAvailable>2.5GB, one Chromium,
nice it, NO Vulkan (SwiftShader only). Kill orphan chromium >10min old.

## Context — fresh hunts (churn/hold/reload/quota/bout-decay done)

1. **cornerHold halftime (user's NEW feature — verify live)**: during a
   real bout the corner card should fire once per bout at the halftime
   trigger, freeze the fight (hp/positions/events frozen — compare
   state digests sampled 2s apart), accept Enter/skip, release into the
   same bout state, never double-fire post-reset, and survive a KO
   landing exactly on the halftime boundary. Matrix: corner during
   fighting/countdown/down/win phases.
2. **coachAdvice fetch path**: if a coach URL fetch is configured,
   throttle the endpoint to hang — the AbortController must fire at
   COACH.apiMs and the corner must still resolve on tips fallback.
3. **New dynamic-import degrade paths (just landed)**: intercept a
   module fetch (scene.js / hands.js / mitts) with request-failure —
   page must degrade (fail card / mouse mode / bare-fist), never a dead
   black page, never a pageerror that escapes.
4. **hitFx ink-burst render load**: spam player-hit-taken at ~5/s for
   60s — overlay pixel work, canvas state, heap, rAF gaps bounded.
5. **Idle-page drain**: leave index/lineup/gallery idle 5 min each —
   rAF activity should throttle or stay cheap (measure), no heap creep.

## Report-only
`.teamwork/reports/b5-soak.md` + `.teamwork/qe/b5-*.json` artifacts.
Route fixes via `.teamwork/routing-queue.md` — file:line, severity, repro.
