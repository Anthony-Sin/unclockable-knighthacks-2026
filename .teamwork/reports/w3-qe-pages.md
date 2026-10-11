# w3-qe-pages — Non-boxing pages + shared tracking layer QE report

Scope: `index.html`, `lineup.html`, `gallery.html`, `server.mjs`,
`shared/face.js`, `shared/glove.js`, `shared/hands.js`, `shared/track-worker.js`.
Method: full static audit → fixes → headless re-verification on the live
server (`http://127.0.0.1:34149/`) via `test/qe-runner.mjs` (w1's tool —
gates every launch on load1<10 + MemAvailable>2500MB, serializes Chromium
via `.teamwork/qe/.chromium.lock`, nices the browser). Server changes were
verified on my own instance `PORT=8933` (34149 was never touched).
Artifacts: `.teamwork/qe/w3-index.json`, `w3-lineup.json`, `w3-gallery.json`,
`w3-index-v2.json`, `w3-lineup-v2.json`, `w3-gallery-v2.json` — all exit 0.

## Findings (severity | file:line | evidence | fix | verification)

| # | sev | file:line | bug | fix | verified |
|---|-----|-----------|-----|-----|----------|
| 1 | HIGH | server.mjs:50→101 (old:50-52) | `res.writeHead(200)` ran **before** `await readFile(file)`; on a stat→read TOCTOU failure the catch's `res.writeHead(500)` threw `ERR_HTTP_HEADERS_SENT` → unhandled rejection → **whole server dies** (Node ≥15 default). | read file before writeHead; catch guards `res.headersSent` and wraps `res.end` | curl battery on :8933 — no crash paths; node --check |
| 2 | MED | server.mjs:41,48-51 (old:30) | `file.startsWith(ROOT)` has no separator — a sibling `spatial-objects-evil/` shares the prefix; **symlinks inside the tree pointing outside were served** (lexical check only). | `file !== ROOT && !file.startsWith(ROOT + sep)` + `realpath(file)` must stay under `realpath(ROOT)` | `--path-as-is /%2f..%2f.teamwork/…` → 403; planted symlink→/etc/hostname → 403; legit files → 200 |
| 3 | MED | server.mjs:23-26,73-92 (old:38,50-51) | `.mp4` absent from MIME → `application/octet-stream`; **Range ignored** → `<video>` seek/loop unreliable (Chromium sends `Range: bytes=0-` on `?vid=test-input.mp4` inputs). | video/audio/model MIMEs; single-range → 206 + `content-range`/`content-length`; bad range → 416; `accept-ranges: bytes` on all 200s | `Range: 0-1023` → 206, 1024B, correct content-range; `bytes=-100` → 206; `bytes=999999999-`, `bytes=abc-def` → 416; mp4 → `video/mp4` |
| 4 | LOW | server.mjs:109-114 (old:none) | `EADDRINUSE` → raw uncaught-exception stack trace. | `server.on('error')` → friendly `port N already in use` + exit 1 | `PORT=8933` second instance → clean msg, exit=1 |
| 5 | LOW | server.mjs:33-36,95,98-100 | malformed percent-encoding/bare `*` → 500 (should be 400); HEAD read the whole file into memory and relied on implicit body-strip. | 400 on URL/decode failure; HEAD returns headers + `content-length` only | `/%E0%A4%A` → 400; `HEAD /index.html` → 200, content-length set, 0 body |
| 6 | MED | index.html:611-624 (old:588-594) | `career()` ran first in the module: `localStorage['boxing:best']` = `"null"` parses to `null` → `.toLocaleString()` throws → **entire module dead** (settings modal, tutorial toggle, 3D scene). Non-numeric `ko.n` printed `undefined`. | null/type-guarded `get`/`num`, guarded `set` | headless eval with `boxing:best` poisoned to `'null'` → page fully functional; pills show `0`/`—`; settings modal opens |
| 7 | LOW | index.html:722-730,1128-1130 | `init3D` is decorative but a WebGL/renderer failure threw a pageerror mid-module (THREE also logs its own console error). | `try { (init3D)() } catch → console.warn`; `webgl2/webgl` pre-probe skips quietly before THREE logs; `sceneObj.ring?.group`/`?.mat`/`?.ropes` guards | degrade probe (getContext→null): 0 pageerrors/console-errors; normal run still renders |
| 8 | LOW | index.html:1073 | `setPixelRatio` ran once at boot → stale DPR on zoom/monitor move (blurry canvas). | moved into `updateCamera` (resize path) | node --check on extracted module |
| 9 | MED | lineup.html:230-245,375 (old:231-238,365) | `new THREE.WebGLRenderer` threw → module abort **after** cells built but **before** loaders ran → all cells stuck `!ok` → `select()` unreachable → Enter bar permanently `.dim` — dead page on no-WebGL machines. | renderer optional (pre-probe + try/catch); loaders/select/`enterbar` work regardless; thumbnail loop gated `cells.length && ren` | degrade probe: 3 cells, pick=BUBBLE, `npc=proto:bubble` stored, enter live `./boxing.html`, **0 errors** |
| 10 | LOW | gallery.html:4 | no `<link rel="icon" href="data:,">` (index/lineup/boxing all have it) → `/favicon.ico` 404 → counted as a hard error by qe-runner (w1-abort-demo.json proved it). | added the link | `w3-gallery-v2.json`: http≥400 = 0 |
| 11 | MED | shared/hands.js:104-109, shared/face.js:100-105 | concurrent `_initLocal()` (fatal + onerror racing, retry during boot) → two inline landmarkers constructed; loser overwritten → leaked MediaPipe graph (GPU/CPU ctx). | `_initLocalP` promise memo — one in-flight boot shared by all callers | code review; import in node OK |
| 12 | MED | shared/hands.js:62,73-82,92-100; shared/face.js:63,67-76,88-96 | `onerror` didn't terminate the worker — an errored-but-alive worker keeps posting `result`s → double-ingest next to the respawn, and `fatal`/`onerror` cleared `_inFlight`/`delegate` unconditionally (could stomp the replacement worker's state). | terminate on every error path; identity guards `this._worker !== w` on result/fatal/onerror | code review; behavior identical on happy path |
| 13 | LOW | shared/hands.js:188-198,247-259; shared/face.js:162-172,210-220 | `stop()` left the rAF/rVFC pump chain rescheduling forever (leak across create/stop cycles) and left stale `pinch/point/orbit/zoom/spread` handles pointing at dead hand objects. | `_stopped` flag kills both chains; `stop()` resets full state + `delegate='none'` | node import still clean; pump exits next frame after stop |
| 14 | LOW | shared/track-worker.js:66-70 | warm-up `detectForVideo(canvas, 1)` consumed ts=1 — a fresh `?vid=` VideoFrame's media-time stamp (~0µs) then violated VIDEO-mode monotonic-ts → detect throw counted toward the 30-fail `fatal` cascade. | `lastTs = Math.max(lastTs, 1)` after warm-up | static verify; first real frame now ≥2 |
| 15 | LOW | shared/track-worker.js:32-34 | a second `init` on the same worker leaked the previous landmarker and carried stale `lastTs`/`failN`. | close + reset on init | code review |

**`shared/glove.js` — clean.** Audited: `P.length<21` guard, canvas size
read from `ctx.canvas` (caller-owned sizing → no resize/DPR bug to own),
no top-level DOM (imports in plain node), `roundRect`/`arc(0,7)` fine on
modern Chromium. No changes needed.

## Out-of-boundary bugs (filed — do NOT fix here)

| sev | file:line | evidence |
|-----|-----------|----------|
| MED | `boxing.html:382-405` vs `shared/boxing/game.js:49-53` | **Tracker race**: `Face.create`/`Hands.create` fire async (up to BOOT_MS=30s); `createGame({hands, face, …})` at :403 passes the *current* locals — if still `null`, game.js only self-creates when `opts.video` is passed and boxing.html doesn't pass it → **game runs permanently trackerless** (mouse fallback) while the late-resolving trackers still burn CPU unused. w2 to await the creates, pass `video`, or adopt `game.hands/face` post-boot. |
| LOW | `index.html:9` (mine — flagged, kept) | Google Fonts `<link>` is an external runtime call vs contract "no external runtime calls". Kept: it's the menu's display typeface and headless loads it fine; owner decides whether to vendor. |
| INFO | package.json `qe`/`qe:static`/`qe:res` scripts | w1's `test/qe-*.mjs` exist and work — no gap. `npm test`/`test:e2e` are w2's verification domain. |

## Headless results (final, post-fix)

| page | run | pageerrors | consoleErrors | reqFailed | http≥400 | notes |
|------|-----|-----------:|--------------:|----------:|---------:|-------|
| index.html | w3-index-v2 | 0 | 0 | 0 | 0 | clean; ~2fps under SwiftShader on loaded box |
| lineup.html | w3-lineup-v2 | 0 | 0 | 0 | 0 | clean; 3 proto cells (manifest GLBs are all PROP-filtered) |
| gallery.html | w3-gallery-v2 | 0 | 0 | 0 | 0 | meta-refresh → index; favicon 404 gone |
| lineup (WebGL killed) | degrade probe | 0 | 0 | — | — | selection + localStorage + enter all work; cells show names/stats |

Functional spot-checks (custom probe, same gating+lock): lineup renders all
3 thumbnails (canvas pixels non-blank), auto-selects BUBBLE, click on
locked BLOCKY correctly nudges (needs `koAvg≤3`, fresh player has no KOs),
`?practice=1` → `./boxing.html?practice=1` hand-off intact,
`localStorage['boxing:npc']` writes correctly.

## Gap list

- My three pages use **no camera/video** — `?vid=` and fake-media flags are
  moot there (still launched with them, harmless). The tracking layer
  (`hands.js`/`face.js`/`track-worker.js`) is exercised live only via
  boxing.html (w2's run); my coverage is static audit + node-import +
  lifecycle review.
- `server.mjs` edits **cannot take effect on :34149** — that process runs
  the old code until the owner restarts it (hard rule: never restarted).
  All server behavior was verified on `PORT=8933`.
- FPS numbers are SwiftShader-software numbers on a box at load≈8-12;
  index/lineup run heavy 3D → 2-7fps there. Not a correctness defect on
  real GPU hardware; boxing.html FPS is w2's metric (R4).

## Remaining known issues / notes

- `enterbar` dim link is disabled by CSS `pointer-events` only — keyboard
  activation can still navigate (harmless: pre-select populates `boxing:npc`
  anyway; boxing.html defaults `proto:bubble`).
- `npm test` legacy boxing tests weren't run by me (w2's scope); `node
  --check` passes on `server.mjs` and both extracted inline modules;
  `hands.js`/`face.js`/`glove.js` import in plain node;
  `track-worker.js` correctly fails node import (`self` — worker-only file).
- Concurrent uncommitted work by teammates exists in the tree (boxing.html,
  lineup-mockups/, mitts/classic.js, test/*) — untouched by me; the user
  committed mid-run (cdc8a28+ contains most of these fixes; remaining
  uncommitted: the glProbe pre-checks + track-worker re-init reset — all
  verified post-edit).

## Files changed (all in-boundary)

- `server.mjs` — containment (sep + realpath), MIME+Range/206/416/HEAD/400,
  crash-proof catch, EADDRINUSE handler.
- `index.html` — career() type-guards, tutToggle guards, init3D try/catch +
  glProbe + ring guards, DPR-aware pixel ratio.
- `lineup.html` — optional WebGL renderer (pre-probe + try/catch), loop
  gated on `ren`, degrade note.
- `gallery.html` — `data:` favicon.
- `shared/hands.js`, `shared/face.js` — `_initLocalP` dedup, zombie-worker
  terminate+identity guards, `_stopped` pump kill, full state reset in stop().
- `shared/track-worker.js` — post-warmup `lastTs` floor, init re-arm.
- `shared/glove.js` — no changes (clean).
