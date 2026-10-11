# b4-pages — QE Report (wave 4)

Scope: `index.html`, `lineup.html`, `gallery.html`, `shared/hands.js`,
`shared/face.js`, `shared/glove.js`, `shared/track-worker.js`,
`test/qe-static.mjs`. Method: static audit + in-Node dynamic probes that run
the REAL tracker modules and the REAL worker module under stubbed browser
globals + a file-backed fake vision bundle. No browser tooling used; the
live server was never killed or restarted; no deps added.

This wave's assigned angles: (1) verify the landed double-grace boot in
hands.js/face.js, (2) fuzz the track-worker protocol, (3) partial top-level
boot failures per page, (4) adversarial storage-seeded DOM/injection/layout,
(5) rapid resize/DPR-change behavior during boot.

## Findings (fixed, in boundary)

| # | Sev | File:line | Evidence | Fix | Verification |
|---|-----|-----------|----------|-----|--------------|
| 1 | High | `shared/hands.js:79,335`, `shared/face.js:79,305` | during both BOOT_MS grace races the worker is not yet `_worker` — `stop()` couldn't reach it → a still-booting worker kept downloading ~13MB (or leaked forever if 'ready' never landed) | `_bootW` slot set at spawn, cleared on `done()`/adopt, terminated in `stop()` | Node probe J ×2 classes: dead-everything boot resolves `delegate:'none'`, pump armed for late adopt, `stop()` terminates the boot worker |
| 2 | High | `shared/hands.js:129`, `shared/face.js:123` | `_adopt` ran `landmarker.close()` unguarded inside the worker's onmessage — a throwing close (half-dead GL graph) escaped the handler, skipped `res('ok')`/onerror rewire, and left `landmarker` truthy → every future `_initLocal` early-returned → next worker death had NO fallback | `try { this.landmarker?.close?.(); } catch {}` then null the ref | probe G: `__lmCloseThrow` — adopt completes (`delegate='gpu-worker'`, landmarker null), then worker death re-arms inline |
| 3 | High | `shared/hands.js:89`, `shared/face.js:89` | a second/stray `{type:'ready', error}` on an already-ADOPTED worker hit `w.terminate()` directly → `_worker` left dangling at a dead worker → `_inFlight` wedged until the watchdog noticed | route through `_workerDied(w, false)` — clears `_worker`/delegate/flight gate and skips respawn | probe F: stray ready+error → `_worker===null`, worker terminated, inline re-armed |
| 4 | Med | `shared/hands.js:102`, `shared/face.js:95` | a malformed result that threw inside `_ingest` also swallowed `h._onNew()` → the pump never re-dispatched → tracking stalls silently | `try { _ingest } catch {}` while `_inFlight` still clears and `_onNew` still fires | probe L: garbage payloads dropped, subsequent valid result still lands (`hands=1 'right'` / `face.found=true`) |
| 5 | Med | `shared/track-worker.js:93–104` | a frame message whose `frame` wasn't an object-with-`close()` threw a TypeError inside the try → counted in `failN` → 31 junk envelopes escalated a HEALTHY landmarker to `fatal` | validate the envelope before inference; post an empty result (clears page `_inFlight`); never count failN; warn once via `warnedFrame` | probe: 105 malformed frames → 0 `fatal`; each still answered a clearing result |
| 6 | Med | `shared/track-worker.js:121–128` | `frame.timestamp === Infinity` → `raw=Inf` → `tsOff=-Inf` → `ts=NaN` → detect ts poisoned, then `lastTs=NaN` broke every subsequent frame's monotonic floor | accept only finite positive media stamps: `Number.isFinite(frame.timestamp) && frame.timestamp > 0` | probe: Infinity/NaN/negative/undefined timestamps all yield finite ts; log strictly increasing per landmarker |
| 7 | Med | `shared/hands.js:255–262`, `shared/face.js:227–235` | `requestVideoFrameCallback` registration/callback threw on a detached document → uncaught error AND a dead pump chain | re-registration wrapped in try; callback body guarded; `_stopped` kills the chain explicitly | probe K + J: stop() is idempotent, post-stop result ignored, pump armed only while useful |
| 8 | Med | `lineup.html:229–263` | stage-engine failure showed the note "the card below still picks your rival" — but with no engine, NOTHING wired the chips → dead picker, stale stored pick, note lying | minimal fallback inside the engine catch: chips select+`sel` class+persist `boxing:npc`, `[data-pick]` follows, ENTER keeps `?practice`, stored pick reflected on load | static (fallback is inside `try`, all writes textContent/classList); qe-static dynamic pass green; lock-gating stays server-side in npc.js so an ungated pick can't sneak a locked fighter in |
| 9 | Low | `index.html:680` | corrupt `boxing:ko` with absurd `sum` → `(sum/n).toFixed(1)` prints every digit of a <1e21 number → KO-AVG pill overflows a 320px screen | `Math.min(koSum / koN, 99.9).toFixed(1)` — it displays an average KO round | static check + layout reasoning; textContent sink already |
| 10 | Low | `index.html:716–778` | settings load/save used bare derefs — a renamed/missing control id threw inside the shared try → remaining controls never wired, and a save-listener deref threw on a dead element | `?.`/null guards on every settings element incl. the modal, and per-control isolation in the load block | `node --check`; qe-static id-resolution check still sees every `#id` present |

## `test/qe-static.mjs` additions (all green)

**Static checks**

- teardown-call guard: any `.close(`/`.close?.(`/`.terminate(` outside an
  enclosing `try` is flagged (owned = FAIL, foreign = note). It immediately
  caught 4 real sites the old heuristic had masked (catch-block
  `frame.close?.()` ×2, bare `this._worker?.terminate()` ×2) — all wrapped.
- `nearTry` rewritten brace-aware: walks `try` keywords back and counts
  braces, so a call is guarded iff it sits lexically inside an *open* try
  block. The old "try within 500 chars / tries>catches" heuristic wrongly
  cancelled an enclosing try whenever an earlier try…catch pair sat in the
  window (false positive on index.html:749) and missed calls inside `catch`
  blocks (false negative).

**Dynamic probes (~50 assertions, deterministic — keyed on outcomes not
timers; grace/stuck/respawn clocks shrink via the probe-only
`create({bootMs,stuckMs,respawnMs})` opts)**

Per class (Hands ×12 subtests, Face ×12):

- A `ready` inside grace-1 → immediate adopt, init+frame traffic verified,
  result clears `_inFlight`, stop() reaps
- B `ready` landing *between* the grace races → still adopted, no inline built
- C `fail` (onerror) inside grace-2 → inline covers, dead worker reaped
- D double-slow → inline covers AND late `ready` adopts, closing the inline
  landmarker exactly once
- E `ready` while `_initLocal`'s `createFromOptions` is still in flight →
  the pending landmarker is closed, never installed over the worker
- F stray `ready`+error on an adopted worker → `_worker` cleared, no wedge
- G `landmarker.close()` throwing inside `_adopt` → adoption still completes
- H hung infer (frame taken, never answered) → STUCK watchdog reaps, one
  respawn arrives and gets its init
- I zombie worker (replaced) → its `result` is ignored
- J stop() while a worker is still booting → boot worker terminated, create
  resolves 'none', pump stays armed for late adopt
- K stop() idempotent; post-stop results ignored
- L malformed `result` payloads dropped; valid payload still ingested
- M Worker ctor throw / init-postMessage throw → 'fail' → inline fallback

track-worker.js (real module, in-process `self`):

- garbage envelopes (`42`, `'x'`, `null`, unknown `type`) ignored
- `init` with unknown kind / `javascript:` vendorUrl / missing bundle →
  `ready`+error each; garbage `preferCpu` still boots; second `init` (hands
  →face kind switch) re-boots cleanly; `close` then frames → empty results
- warm-up detect at ts=1 runs per init; real/Infinity/NaN/negative/undefined
  timestamps → finite, strictly increasing ts into detect
- 105 malformed frame envelopes → 0 `fatal`; 32 genuine detect throws →
  exactly 1 `fatal`; post-fatal frames still answer a clearing result

Plus a process-wide `unhandledRejection` counter asserted === 0 (the point
of res()-only spawnP + `.catch`'d `_initLocal`).

Result: `checked 20 module blocks/files across 4 pages — CLEAN`
(notes only, all on foreign files — table below).

## Audited, no defect found

- **index.html partial boot**: UI wiring (career pills, tutorial toggle,
  settings) runs *before* the optional 3D module boot; every dynamic import
  (`three`, protoBoxer, ring/scene builders, audio) sits inside the IIFE
  `try` — a failed chunk hides the canvas instead of killing the page.
  `boxing:npc` is only *whitelist-compared* (`VARIANTS.includes` + koAvg
  gate), never rendered — script/emoji/RTL payloads can't inject or even
  pick a ghost variant; fallback is the always-open starter.
- **storage adversarial**: `grep` confirms ZERO
  `innerHTML/outerHTML/insertAdjacentHTML/document.write` across all owned
  files — every dynamic string (names, stats, notes) is a `textContent`
  text node → `<img onerror>` payloads inert, emoji/RTL/ZWSP render as
  glyphs only. The one unbounded-length display (koAvg) is now clamped.
  All `getItem`/`setItem`/`JSON.parse` sit inside try (re-verified by the
  rewritten nearTry).
- **resize/DPR during boot**: `updateCamera` is a pure recompute —
  recomputes aspect (0-width floored), `setPixelRatio(min(dpr,2))`,
  `setSize` — idempotent per event; 50 rapid resizes accumulate nothing
  (no listeners/timers per event). The resolution media-query watcher
  re-arms inside `try` and fires `updateCamera` on DPR change, covering
  compositors that skip `resize`. Mitt/face state is normalized [0,1]
  coordinates — viewport-size independent, so HUD/collision math is
  unaffected by buffer resizes.
- **lineup.html**: engine import already in `try` (wave-3); this wave added
  the picker fallback so the failure path is honest (finding 8).
- **gallery.html**: redirect stub with no executable module — nothing to
  harden; the "no module scripts" note is expected.

## Routed (foreign files — noted not fixed)

| Sev | File:line | Evidence |
|-----|-----------|----------|
| Med | `boxing.html:304–307` | static imports of `hands.js`/`face.js`/`scene.js`/`mitts/index.js` in a DOM-wiring module — a failed dep kills the whole module incl. UI; prefer dynamic `import()` inside try (same class fixed in index/lineup) |
| Med | `boxing.html:440` | unguarded `await import()` — a failed chunk kills the module before UI wiring |
| Med | `boxing.html:466` | `Number()` directly on `getItem` — NaN leaks (re-notes the wave-3 route; still open) |
| Med | `shared/boxing/fight.js:166–168` | `JSON.parse` outside try/catch — corrupt storage kills the caller (re-notes wave-3 route) |
| Med | `shared/boxing/tutorial.js:110` | `innerHTML` assigned a non-literal — storage/user-fed markup is DOM XSS (re-notes wave-3 route) |
| Med | `shared/boxing/npc.js:159` | unguarded `await import()` — failed chunk kills the module |
| Low | `lineup-mockups/_hero/engine.mjs:244` | `webglcontextrestored` restarts the loop unconditionally — a pending rAF doubles the chain (read-only mockup) |
| Med | `server.mjs` + `test/qe-server.mjs:1162,1194–1195` | 3 `npm test` failures in the server worker's in-flight diff: HTTP/1.0 pipelined request gets 0 responses instead of one-200-then-close; literal `HTTP/2.0` and `HTTP/0.9` version tokens answered 200 instead of 4xx/closed |

## Verification (all run by me)

- `npm run qe:static` — **CLEAN**, 20 blocks/files, notes only on foreign
  files; ~50 dynamic probe assertions green on the real tracker/worker code
- `npm test` — my slice green; suite as a whole currently **223 pass /
  3 fail**, and all 3 failures are inside `test/qe-server.mjs` against the
  server worker's **in-flight** `server.mjs` (+59 uncommitted lines, plus
  their +545-line suite expansion that landed mid-run):
  `HTTP/1.0 pipelined w/o keep-alive → 1 response`,
  `HTTP/2.0 text version refused`, `HTTP/0.9 version refused`.
  → routed to the server owner; none of my files are on that path
  (verified: `node test/{boxing-fight,boxing-ring,boxing-fists,
  boxing-hands,boxing-proto,boxing-audio,boxing-tutorial,qe-fuzz}.mjs`
  all pass; earlier this wave `npm test` read 115/0 before the expansion
  landed).
- Report file: `.teamwork/reports/b4-pages.md` (this file).

## Residual risks / not verified

- `nearTry` counts braces literally — a `}` inside a template literal or
  regex inside a try block could skew the scan; documented heuristic,
  strictly more precise than the previous window guess both directions.
- `FakeWorker` can't emulate real worker error-event edge timings; the
  track-worker probe runs the module in-process (same realm), so the fake
  vision bundle is shared across hands/face subtests — intentional, and
  assertions key on observable state so ordering noise can't flake.
- No browser/e2e run (prohibited for this worker) — `npm run test:e2e`
  untouched; real-browser exercise of the double-grace path remains for
  the orchestrator's integration sweep.
- Resize×50 is proven by construction (idempotent handler, no accumulation
  points) rather than by a browser harness — no DOM-free way to exercise
  `window.resize` semantics meaningfully in Node.
