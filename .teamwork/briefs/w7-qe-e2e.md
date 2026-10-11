# Brief: w7-qe-e2e — End-to-end fight flow QE (headless Chromium)

QE round 2. Read `.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md`
at `/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` (never kill/restart). Chromium at
  /usr/bin/chromium, puppeteer-core installed.
- QE tooling exists: `node test/qe-runner.mjs <url> --name n --seconds N
  [--gpu]` (self-gates on CPU/RAM/GPU, serializes via a lockfile).
- `npm run test:e2e` = `node test/boxing-page.mjs` — self-serves on
  :8890 if dark, drives `__forceHands`, asserts boot/punch/hit/distance.
- Debug hooks in boxing.html: `window.__boxing` (fight/sim/tracker/game/
  state/log), `window.__forceHands`, `window.__forceFace`.
- Round 1 fixed 20 bugs — find NEW ones.

## Your files (exclusive — fix bugs freely)
- `boxing.html`
- `shared/boxing/game.js`, `shared/boxing/npc.js`
- `test/boxing-page.mjs`
- NOT yours: scene.js/fx.js/entrance.js/mitts (w6), fight/fists/ring/
  protoBoxer/tutorial/audio (w4), server.mjs (w8), index/lineup/
  gallery.html + shared trackers (w9). Findings there → report only.

## Do
1. **Baseline**: `npm test` + `npm run test:e2e` — record pass/fail.
2. **Extend e2e coverage** in test/boxing-page.mjs (or a new
   test/qe-e2e.mjs runnable standalone — do NOT edit package.json, w4
   owns it). Drive a REAL fight with `?notrack=1` + `__forceHands`:
   - countdown → fighting phase transition
   - land jabs/crosses until NPC hp drops; assert damage events in
     `__boxing.log`/state.events
   - NPC telegraph → player dodge via `__forceFace` sway → 'player-dodged'
   - keep punching to KO → 'npcdown' → 'win'; then verify a reset/
     restart path doesn't carry stale state
   - `?practice=1` mode if it exists (check source)
   - tutorial flow if `?tutorial=1` exists — steps must advance
3. **Lineup → boxing hand-off**: load lineup.html, pick a fighter
   (set localStorage['boxing:npc']), navigate to boxing.html, assert the
   selected NPC actually spawns (check npc id/name in __boxing or scene).
4. **Mode sweep** via qe-runner 15–20s each (JSON → .teamwork/qe/w7-*):
   `boxing.html?notrack=1`, `?vid=test-input.mp4`, `?practice=1`.
   Zero pageerrors/console-errors required.
5. **Edge**: `__forceHands` with malformed input (empty array, one hand,
   NaN landmarks, 5 hands) — no pageerror; gloves must NOT disappear
   when tracking drops (A7 contract: drift to neutral guard).

## Resource rules (HARD)
qe-runner self-gates — prefer it. For your own puppeteer scripts: check
load1<10 && MemAvailable>2500MB before launch, ONE browser at a time,
nice it. GPU runs only when nvidia-smi <6000MiB.

## Report `.teamwork/reports/w7-qe-e2e.md`
Findings table (sev | file:line | evidence | fix | verification),
e2e coverage added, mode-sweep matrix, residual risks.
