# w9-qe-pages — Round-2 QE Report

Scope: `index.html`, `lineup.html`, `gallery.html`, `shared/hands.js`,
`shared/face.js`, `shared/glove.js`, `shared/track-worker.js`,
`test/qe-static.mjs`. Method: static analysis + Node probes (`/tmp`) + curl
against `http://127.0.0.1:8791/`. No browser tooling used; the live server
was never killed or restarted.

## Findings (fixed, in boundary)

| # | Sev | File:line | Evidence | Fix | Verification |
|---|-----|-----------|----------|-----|--------------|
| 1 | High | `shared/track-worker.js:34–89,143` | async `init`/`close` raced: two inits could interleave `forVisionTasks`+`createFromOptions` (leaked graphs, mismatched kind/model); close during init left a live landmarker | serialized `chain` promise; `doInit`/`doClose` reset landmarker+model+ts+warn+failN | `probe-worker.mjs` — double-init ordered, init+close posts exactly one ready, no hang |
| 2 | High | `shared/track-worker.js:36–42` | `{type:'init', kind:'anything'}` silently accepted → wrong model file fetched | `kind` whitelisted to `hands`/`face`; unknown → `{type:'ready', error}` | probe: unknown kind → ready error |
| 3 | High | `shared/track-worker.js:115–123` | face-detector path dereferenced `det.boundingBox`/`det.keypoints[2]` unguarded — malformed detection crashed the frame handler | require `boundingBox`, keypoints, nose keypoint before building `face:{nose,box}` | probe: malformed detections tolerated, fatal-fail counter still works |
| 4 | High | `shared/hands.js:61–101`, `shared/face.js:62–97` | late `ready` after `stop()` adopted a worker into a dead tracker; a replacement worker wasn't terminated; a pending inline landmarker was installed after stop | `_stopped` gate in `_adopt` (terminate instead), replaced-worker reaping, pending-`lm` closed if worker/stop wins | probes: "late ready → terminated", "landmarker resolving after stop is closed" |
| 5 | High | `shared/hands.js:112–129`, `shared/face.js:108–126` | concurrent `_initLocal` callers (fatal + onerror) each built an inline landmarker → duplicated GPU/CPU graphs | shared `_initLocalP` promise; `_stopped` early-out before the dynamic import | probes + static read — single boot shared by all callers |
| 6 | High | `shared/hands.js:217–232` | `_ingest` assumed `lm` was a 21-point array of finite `{x,y}` — a short/NaN hand crashed on `lm[9]` and NaN permanently poisoned the EMA `_prev` state | drop non-arrays, `length<21`, non-finite x/y; sanitize non-finite z→0 before smoothing | probe-hands: short/NaN/Infinity dropped, EMA stays finite, valid hand preserved |
| 7 | High | `shared/face.js:189–225` | empty `landmarks` array fed min/max bounds → garbage mega-face `size`; non-finite mesh pts poisoned EMA + `stats` | whole-frame validation: detector needs finite nose + positive box; mesh requires all-finite pts, finite bounds; bad frame dropped wholesale | probe-face: no bogus sizes, malformed data never marks `found`, cache stays finite |
| 8 | Med | `shared/hands.js:143–171`, `shared/face.js:137–161` | `createImageBitmap` absent/rejecting threw inside the rVFC callback → unhandled rejection + wedged `_inFlight`; `postMessage` transfer failure leaked the frame | bitmap failure → `VideoFrame` fallback; post failure → `frame.close()` + `_inFlight=false`; both paths clear the gate | probes: in-flight cleared on every failure branch |
| 9 | Med | `shared/hands.js:269–277`, `shared/face.js:241–249` | `stop()` didn't reset `_inFlight`/`_prev` → a re-created tracker inherited stale EMA + a stuck gate | `stop()` clears `_inFlight`, `_prev`, worker, state | probes: "stop() clears EMA prev state / in-flight flag" |
| 10 | Med | `lineup.html:503–510` | `new THREE.WebGLRenderer(...)` at module top level — no-WebGL machine (or blocked GPU) threw → whole module dead incl. the pick card | `webglOK` canvas probe first; GL block wrapped in try; `glGone()` degrade → hidden canvas + hint; card still works | probe-lineup-page: no-GL + ctor-throw both degrade cleanly, card functional |
| 11 | Med | `lineup.html:416–421` | `JSON.parse`d career values used raw — `'null'`/`'"x"'`/wrong shapes crashed `.n`/`.toLocaleString` arithmetic | `num()` normalizer; `ko` rebuilt to `{n≥0,sum≥0}`; `koAvg` only when `n>0`; wrong-shape → 0 | probe-lineup-ls: corrupt/null/wrong-shape all survive |
| 12 | Med | `index.html:1127–1131`, `lineup.html:635–638` | rAF loops had no `webglcontextlost` handling — a lost context burned a dead loop spamming pageerrors; restore could double-schedule | `dead` flag + `webglcontextlost`/`webglcontextrestored` handlers; restore only restarts a *stopped* loop; ≥5 render faults → degrade | lineup probe: loop schedules, ticks, stops, restarts |
| 13 | Med | `index.html:1090` | fallback rival hardcoded `'blocky'` — after the roster rename a locked/corrupt pick produced a ghost variant | fallback = `VARIANTS.find(v => VARIANT_INFO[v]?.koAvg == null) || VARIANTS[0]` (the always-open starter) | index probe + static: `open` gate requires `VARIANTS.includes(v)` |
| 14 | Med | `lineup.html:436,454,567,588` | `ROSTER_VARIANTS` hardcoded `['bubble','blocky','bean']` + `(i-1)*GAP` centering — roster rename left a ghost pick ('blocky') and hid the new rival ('sumo'); markup tabs hardcoded names with no lock badge on tab 0 | roster derived `VARIANTS.filter(v => VARIANT_INFO[v])`; centered `(i-(n-1)/2)*GAP`; glow cycles; tab shells relabeled/cloned/hidden live; lock-ic added to tab 0 | lineup probe: labels `'№ 1 · BUBBLE|№ 2 · BEAN|№ 3 · SUMO'`, stale `proto:blocky` → BUBBLE |
| 15 | Med | `lineup.html:585–602` | one `buildBoxer` throw inside `contenders.forEach` aborted the whole loop → later plinths never built, diorama half-dead | per-contender try/catch — broken variant keeps plinth+spot+glow, loses only its mesh | lineup probe `broken:'bean'`: loop + card survive |
| 16 | Low | `shared/glove.js` | renderer didn't isolate canvas state — font/lineCap/lineWidth could leak to the caller | `ctx.save()`/`ctx.restore()` wrap; `roundRect` missing → `arcTo` fallback; short/NaN landmarks → no draw; zero-span → size floor | probe-glove: state restored, fallback draws, degenerate input safe |
| 17 | Low | `lineup.html:794–807,821–844` | `selectContender`/`renderPips`/card updates assumed every node existed | null-safe `put()` writes, `?.` derefs, guards on `target`/`boxer`/`badge` | lineup probe + qe-static `#id` resolution check |
| 18 | Low | `index.html:605–718` (verified, no fix needed) | career/settings block — checked for the corrupt-storage class | already hardened by round 1 (`num()` validators); confirmed under `'null'`/`'"oops"'`/`[1,2]`/`notanum` | probe-index-page: 11 checks incl. corrupt storage |

## `test/qe-static.mjs` additions (all green)

Ownership-aware bug-class checks — **fail on owned files, note-only on
foreign files** (so another owner's in-flight page can't block my suite):

- Emoji_Presentation chars in markup (contract: draw shapes, no emojis)
- every `src=`/`href=` + meta-refresh `url=` resolves on disk
- `TODO|FIXME|XXX|HACK` leftovers in module code
- `JSON.parse` / `localStorage.setItem` outside `try` (`nearTry` lookback) —
  the corrupt-storage crash class
- literal `#id` lookups (`getElementById`, `$('#x')`, `querySelector('#x')`)
  must name an id present in the page
- `new THREE.WebGLRenderer` without a `getContext('webgl')` probe, and a
  `requestAnimationFrame` loop without `webglcontextlost` handling
- `'./x'`/`'../x'` quoted literals (worker/fetch/href paths) must resolve
  file-relative *or* page-relative
- shared/`*.js`: same JSON.parse, marker, and literal-path checks

Result: `checked 20 module blocks/files across 4 pages — CLEAN`
(one routed note, below).

## Resource 404s

None — all verified `src`/`href`/import/fetch paths return HTTP 200:
pages (`index`,`lineup`,`gallery`,`boxing`), `shared/{hands,face,glove,track-worker}.js`,
`shared/boxing/{protoBoxer,npc,scene,game,audio,tutorial,mitts/index}.js`,
`assetManifest.json`, `vendor/three/{three.module,GLTFLoader}.js`,
`vendor/mediapipe/{vision_bundle.mjs,hand_landmarker.task,face_landmarker.task,blaze_face_short_range.tflite,wasm/vision_wasm_internal.js}`.

## Routed to other owners (not fixed — outside boundary)

| Sev | File:line | Evidence |
|-----|-----------|----------|
| Med | `boxing.html:302` | render loop schedules `requestAnimationFrame` with no `webglcontextlost` handling — a lost context burns a dead rAF loop and can spam pageerrors. (qe-static note; same class fixed in index/lineup) |
| — | `shared/boxing/protoBoxer.js` + `test/boxing-fight.mjs:484–516` + `test/boxing-proto.mjs` | transient during audit: `blocky→sumo` rename landed in `VARIANTS`/`VARIANT_INFO`/`fight.js` while `BUILDERS.sumo`, test expectations (`SLEDGE`), and sumo foot-grounding were still in flight. All resolved by their owners before report time — npm test green now. Lineup/index were updated by me to derive from `VARIANTS` so the contract can't break again. |

## Verification (all run by me)

- `npm test` — **green** (boxing-fight 80, boxing-ring 37, boxing-fists ALL PASS, boxing-hands PASS, boxing-proto ok, boxing-audio 25, boxing-tutorial 7, qe-fuzz 37; 0 failed)
- `npm run qe:static` — **CLEAN**, 20 blocks/files, one routed note
- `npm run qe:res` — `ok: true` (load1 8.61, memAvail 11 GB, gpu 0%).
  Transient `ok:false` seen mid-audit was `load1 ≥ 10` from a teammate's
  headless-Chromium e2e run saturating the box — environmental, not a code
  issue; green again once their run drained.
- `/tmp/probe-worker.mjs` — 10 checks (lifecycle ordering, malformed msgs, close races)
- `/tmp/probe-hands.mjs` — 12 checks (ingest validation, EMA, stop, adopt races)
- `/tmp/probe-face.mjs` — 11 checks (detector/mesh validation, lost-grace, stop)
- `/tmp/probe-glove.mjs` — 8 checks (save/restore, arcTo fallback, degenerate input)
- `/tmp/probe-lineup-ls.mjs` — 7 checks (corrupt/wrong-shape storage)
- `/tmp/probe-lineup-page.mjs` — 22 checks (real module under DOM/THREE stubs: no-GL, ctor-throw, restore, stale pick, roster sync, per-contender failure)
- `/tmp/probe-index-page.mjs` — 11 checks (real DOM slice: corrupt storage, tutorial href rewrite, career pills)

## Not verified

- No browser/e2e run (prohibited for this worker) — `npm run test:e2e` untouched.
- `gallery.html` is a pure redirect stub — nothing executable to audit.
