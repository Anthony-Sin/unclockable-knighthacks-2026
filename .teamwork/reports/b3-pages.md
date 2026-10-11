# b3-pages — wave-3 QE report (pages + tracker robustness)

Owned: `index.html`, `lineup.html`, `gallery.html`, `shared/hands.js`,
`shared/face.js`, `shared/glove.js`, `shared/track-worker.js`, `test/qe-static.mjs`.
Method: static analysis + node probes + curl only (no browser tooling, no
server restart). Throwaway probes in `/tmp/b3/`; they run the REAL extracted
page modules / tracker classes under DOM/worker stubs, not paraphrases.

## New defects found + fixed (owned files)

```
sev | file:line | evidence | fix | verification
----+------------------------------+---------+-----+--------------
hi  | index.html:780               | top-level `await Promise.all([import('three'),…])` sat BEFORE all UI wiring — a failed 3D chunk threw at module level → dead settings/tutorial/career (whole module aborted). Probe proved: with the import pointed at a missing file, zero listeners were ever wired. | moved the whole career/settings/tutorial/listener block ABOVE the dynamic-import block and wrapped the 3D boot in `.catch(err => console.warn)` so it degrades to the static menu | /tmp/b3/probe-index.mjs — 14/14, incl. "3D import failure: module still evaluates / career pill still rendered / modal opens"
hi  | lineup.html:216              | same class: `const { boot } = await import('./lineup-mockups/_hero/engine.mjs')` at module top — a failed/missing engine chunk killed the module silently (static card below was fine but nothing told the user the stage died, and any future wiring after it would die too) | dynamic import inside try/catch; on failure the canvas is hidden and the existing [data-note] element reports "the stage lights are out — the card below still picks your rival"; boot() throwing is contained the same way | /tmp/b3/probe-lineup.mjs — 8/8 (failed import → no module error + note; working import → boot(cfg) with fixedCam/palette; boot-throw contained)
hi  | shared/track-worker.js:27,42,112-115 | mixed clock sources: frame.timestamp (media clock, ~0 origin) vs performance.now() (page clock, ~large). First media-stamped frame after perf-stamped ones got clamped to lastTs+1 forever — the infer timeline froze at ~1ms/frame, breaking downstream dt math | added `tsOff` anchor: first positive media timestamp is rebased onto the perf-clock scale, later deltas preserved, strict +1 monotonicity kept; anchor reset on every init | /tmp/b3/probe-worker-ts.mjs — 7/7: media 40ms deltas preserved, no +1 clamping, gap after untimestamped frame preserved, fresh anchor after re-init
hi  | shared/hands.js:18,32,69-78,96-101,149,196-197; shared/face.js:19,73-76,92-97,182 | hung-inference class: a worker that never posts result/error left `_inFlight` latched forever → tracking silently dead; also duplicate/stale onerror/onmessage could terminate a healthy replacement worker or double-init the inline fallback | `STUCK_MS=5000` watchdog keyed on `_sentAt`; centralized `_workerDied(w,respawn)` — idempotent terminate, only clears state if `w` is still the current worker, reaps stale/zombie workers, clears the gate, starts inline fallback, schedules one respawn (skipped when the delegate itself is bad) | /tmp/b3/probe-hands2.mjs — 15/15; /tmp/b3/probe-face2.mjs — 12/12 (hung→reaped, double-death no-op, foreign-worker reaped while current survives, fatal kills without respawn, stop() idempotent)
med | shared/hands.js:_send (~145-168); shared/face.js:141-164 | createImageBitmap can be absent / reject / throw SYNCHRONOUSLY, and postMessage can fail — an exception inside the rVFC/rAF pump callback killed the pump permanently (chain never rescheduled) | all frame-creation paths funnel through a try'd bitmap→VideoFrame fallback; failed posts close the frame and clear `_inFlight`; pump callbacks wrapped so an onNew throw still reschedules the next frame | probes above incl. "synchronous bitmap throw handled" + "pump survives onNew throw"
med | shared/hands.js:120-138; shared/face.js:116-136 | `_initLocalOnce` could reject if the vendored vision bundle/wasm failed to fetch — callers of `_initLocal()` are fire-and-forget (`_initLocal().catch(() => {})` at one site, a bare `await` inside a worker-death path at another) → unhandled rejection + `delegate` left undefined (half-init state) | wrapped bundle+fileset load in try/catch; failure falls through to `delegate='none'` — the initializer now never rejects | hands/face probes still 15/12 green; qe:static dynimport check passes
med | index.html:1144-1157 | stale-DPR cache: renderer.setPixelRatio was only re-synced on 'resize' — an OS display-scale change or hiDPI↔loDPI monitor drag without a geometry change leaves the canvas blurred forever | re-arming `matchMedia('(resolution: Ndppx)')` one-shot listener → calls the existing updateCamera() which re-reads devicePixelRatio; guarded try for older engines | probe-index.mjs 14/14 (matchMedia stubbed); updateCamera re-reads DPR every call (line 1141)
```

## Classes audited — clean in owned files (evidence)

- **localStorage → DOM/style**: zero `innerHTML/outerHTML/insertAdjacentHTML/
  document.write/cssText` in any owned file (grep). Every stored value reaches
  the DOM only through `textContent`, `.value` (range input sanitizes), or a
  fixed literal `href`. Probe fed `'"abc"'`, `42`, `null`, `<svg onload=…>`,
  `'<img src=x>'` variants through all nine `boxing:*` keys read on owned
  pages — 0 PTS pill, 50% range default, no injection (probe-index.mjs).
- **index.html readStore**: `get` is guarded JSON.parse + wrong-shape-safe
  (`ko=42` → `ko.n>0` false → locked → roster fallback; `ko=null` → fallback).
- **boxing:volume on index**: `getItem → settingVolume.value` — the DOM range
  input clamps invalid strings to its default; the mirrored textContent shows
  the sanitized value (verified: `<svg…>` → `50%`).
- **module races / clicks-before-ready**: index `enter-btn`/`lineup` anchors
  are static `href`s — navigation works even if the module never runs; lineup
  contender chips are painted by the engine, so pre-boot there is nothing to
  click stale. No DOMContentLoaded listeners anywhere — module runs once,
  post-parse.
- **tracker ordering across reset**: `stop()` clears `_inFlight`, `_stopped`,
  delegate, landmarker, pump handle; late worker events are ignored via
  `_stopped` + worker-identity checks; `_initLocalP` shares one inline init
  among concurrent callers.
- **EMA baseline across resolution change**: all smoothed quantities (hand lm
  EMA, face size EMA) are in normalized 0–1 landmark units — a resolution swap
  mid-stream does not change their units. `stats.frameWidth/Height` is set
  per-frame at send time, not cached.
- **gallery.html**: pure meta-refresh + fallback link; no module, no storage.
- **double init**: `create()` → `init()` guarded by `_initP` memo; inline init
  dedup'd by `_initLocalP`; worker init/close serialized through `chain`.

## QE-static additions (test/qe-static.mjs)

File already had the wave-3 `hardenChecks()` harness (`flag(owned)` = fail on
owned files, note on foreign). Added three bug-class checks + one fix:

1. **dynimport** — `await import()`/`await Promise.all([...import...])` must be
   try-adjacent or `.catch(`-guarded (the dead-module class). Found real
   defects in my own files on first run — all fixed.
2. **storagenum** — `Number()/parseFloat()/parseInt()` directly on
   `localStorage.getItem` — catches the boxing:volume NaN class.
3. **storeshape** — `x = *.get('boxing:*', {…})` then `x.prop =/+= …` without a
   `typeof === 'object'` guard — catches the boxing:ko recordKo class.
4. **comment-blanking** — `hardenChecks` now scans a block-comment-stripped,
   index-preserving copy so doc text (`/* … await import() … */`) can't
   false-positive.

`npm run qe:static` → **CLEAN** (20 blocks/files, 0 findings; 14 routed notes
on foreign files).

## Routed — foreign files (NOT fixed, ownership respected)

```
sev | file:line | evidence | suggested fix | routed to
----+----------------------------+---------+-------------+----------
hi  | boxing.html:519-521 (`recordKo`, called at :658) | corrupt `boxing:ko` JSON-that-isn't-object: 'null' → `ko.n` throws, 42/"x"/true → TypeError "Cannot create property" INSIDE the events loop — the throw escapes hud(), kills the rest of the frame's events + the KO is never recorded; `{}` poisons to {n:null,sum:null}; "a" → "a1" string concat. node repro in report header | `const ko = store.get('boxing:ko',{n:0,sum:0}); if (typeof ko!=='object'||ko===null) ko={n:0,sum:0}` — or num() each field | b3-boxing / b3-e2e
med | boxing.html:463-464 | `audio.setVolume(Number(localStorage.getItem('boxing:volume'))/100)` — 'abc' → NaN → NaN gain poisons the audio graph; '999' → +∞ volume | clamp finite 0-100 (num() helper exists in fight files) | b3-boxing
med | shared/boxing/fight.js:161-163 | `JSON.parse(JSON.stringify(TUNING))` outside try — flagged by storagenum/jsonparse check; a patched TUNING containing undefined/functions would crash module init | wrap or structuredClone | b3-fuzz
med | shared/boxing/tutorial.js:106 + boxing.html:366/526/541 | innerHTML sinks — tutorial's is a constant template (benign); boxing.html feed/card assignments deserve a source audit | verify interpolated values are never storage-derived | b3-boxing
lo  | lineup-mockups/_hero/engine.mjs:151 | `ren.setPixelRatio` once at boot; resize path never re-reads devicePixelRatio → stale DPR across monitor drag/OS rescale | call setPixelRatio in the resize handler (same pattern index.html now uses) | b3-boxing / mockups owner
lo  | lineup-mockups/_hero/engine.mjs:244 | `webglcontextrestored` handler restarts the loop unconditionally — a rAF scheduled before 'lost' can survive → doubled render chain (my own check flags it) | guard with a "loop alive" check | b3-boxing / mockups owner
lo  | lineup-mockups/_hero/engine.mjs (ROSTER = VARIANTS.slice(0,3)) | manifest GLB candidates are unreachable from the lineup roster; and boot() writes boxing:npc=ROSTER[0].id on load, clobbering a stored GLB pick before read | read the pick before writing the fallback; include manifest candidates in the pick list | b3-boxing / mockups owner
info| boxing.html:438, shared/boxing/npc.js:155 | await-import notes from the dynimport check — 438 is inside a >500-char try (heuristic boundary, guarded); npc.js:155 inside tryGlb whose caller catches | none needed | b3-boxing
```

## Verification summary

- `npm run qe:static` — **CLEAN**, 20 blocks/files, 0 findings.
- `npm run qe:res` — fails only on `load1 18.95 ≥ 10`: a teammate's Chromium
  e2e (lineup-mockups, port 34149) is saturating the box; same transient as
  w9. Resources themselves all probe fine.
- `npm test` — boxing-fight 80✓, boxing-ring 37✓, boxing-fists/hands/proto✓,
  boxing-audio 25✓, boxing-tutorial 7✓; **qe-fuzz 64/69** with 5 failures all
  inside `shared/boxing/fight.js`/`audio.js` behavior (decision scoring, sway
  threshold damage, `_wantSlam` on reset, garbage-TUNING, audio voice edges)
  — b3-fuzz's files, `M fight.js` mid-edit, not pages-layer. `qe-server.mjs`
  rerun standalone: **115/115 PASS** (earlier ENOENT/keep-alive failures were
  b3-server's mid-edit transient, now resolved).
- `curl` — /, index, lineup, gallery, engine.mjs, all shared trackers,
  three.module.js, protoBoxer.js, scene.js → all 200.
- Trackers not exercised end-to-end (no browser allowed); contract verified
  via the 5 stubbed probes above (56 checks total).

## Residual risks

- qe-fuzz must be re-run after b3-fuzz settles; none of the 5 failures touch
  pages/tracker files but a green wave needs it green.
- `matchMedia('(resolution:…)')` path can't be browser-verified; it is
  fail-safe (try/catch, resize still covers most cases).
- boxing.html's `recordKo`/`volume` bugs are the live exploit surface of the
  storage-adversarial class — routed but unfixed until b3-boxing lands a fix.
- engine.mjs (lineup stage) was audited read-only: storage wrapper is solid,
  DOM writes are textContent; the routed items are its only real findings.

TEAMWORK_DONE b3-pages
