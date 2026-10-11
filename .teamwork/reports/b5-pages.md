# b5-pages — Page/tracker wave 5 (NO browser)

Scope: `index.html`, `lineup.html`, `gallery.html`, `shared/hands.js`,
`shared/face.js`, `shared/glove.js`, `shared/track-worker.js`,
`test/qe-static.mjs`. Method: static analysis + Node probes inside
`qe-static.mjs` (real `hands.js`/`face.js`/`track-worker.js`/`glove.js`
run under stubbed `Worker`/`VideoFrame`/`rVFC`/fake MediaPipe bundle).
No browser tooling used; the live server at `127.0.0.1:8791` was never
touched.

## Verified (grace-3 tracker boot — brief item 1)

Proven by new probes N–R in `qe-static.mjs:797–914` for **both** `Hands`
and `Face` (same lifecycle code):

| Requirement | Evidence (probe) |
|---|---|
| `create()` resolves when the worker is silently dead | N: no `ready`/error/fatal posted → resolves inline at the `bootMs*3` cap, `delegate ∈ {cpu,gpu}` |
| No inline build before the cap | N: `__lmLog` unchanged at `bootMs*2+40ms` — verdict-wait holds the double-fetch shut (the routed P3 fix) |
| The inline build itself is capped | P: `__lmDelay=400 > bootMs` → `create()` resolves in `<300ms`, pump armed; the late build still installs into the armed pump |
| Boot worker stays alive for a late `ready` | N: `_bootW === w && !w.terminated` after cap — worker kept for adoption |
| Late `ready` adopts over inline | N: `ready` post-cap → `_worker === w`, `delegate='gpu-worker'`, pending inline `lm.closed === 1` |
| `stop()` reaps everything | N + R: adopted workers, boot handles, inline graphs all terminated/closed; `delegate='none'`, `_inFlight=false` |
| No second build over an adopted worker | Q: `await h._initLocal()` after adoption → `__lmLog` unchanged (the `_worker` guard at `hands.js:173`) |
| Superseding `_spawn` reaps stale boot handle | Q: planted orphan `_bootW` → terminated on next `_spawn` (`hands.js:89`) |
| Rapid create/stop ×20, verdicts at every lifecycle point | R: adopt/stop+post-stop msgs (no resurrection), `ready+error`, `onerror` death, death→respawn-timer→stop-cancels — **0 zombie workers**, consistent post-stop state every cycle |

## Findings — fixed (in boundary)

| # | Sev | File:line | Evidence | Fix | Verification |
|---|-----|-----------|----------|-----|--------------|
| 1 | Med | `shared/hands.js:74–77`, `shared/face.js:70–74` | a stalled inline bundle fetch wedged `create()` past the worker cap — the cover itself had no dead-man window | `await Promise.race([_initLocal(), sleep(bootMs)])`; a late-landing build still installs (pump picks it up), or is closed by `_initLocalOnce`'s post-await checks if a worker adopted meanwhile | probe P: `create()` `<300ms` under a 400ms-hung build, late install still lands |
| 2 | Med | `shared/hands.js:88–89`, `shared/face.js:82–83` | `_bootW` is a single-slot handle — a superseding `_spawn` overwrote it and orphaned a still-booting worker (~13MB download nothing could reach) | `try { _bootW?.terminate() }` at `_spawn` entry | probe Q: planted orphan terminated on `_spawn` |
| 3 | Med | `shared/hands.js:131–134`, `shared/face.js:118–121` | `w.postMessage(init)` throwing left the half-spawned worker thread alive — `done(); res('fail')` never reaped it | `try { w.terminate() }` inside the catch | probe M extension: post-throw worker `terminated === true` |
| 4 | Low | `shared/hands.js:144`, `shared/face.js:131` | a bare `{type:'ready'}` (no `delegate`) produced `delegate='undefined-worker'` | `` `${delegate || 'unknown'}-worker` `` | probe A/ready paths still resolve; delegate string sane |
| 5 | Med | `shared/hands.js:173,180`, `shared/face.js:161,168` | `_initLocal`/`_initLocalOnce` lacked a `_worker` guard — a 'ready' racing the verdict→inline gap could build a second ~13MB graph under an adopted worker | `|| this._worker` added to both early-outs | probe Q: `__lmLog` count unchanged over adopted worker |
| 6 | Low | `shared/hands.js:311` | landmark arrays `>21` pts passed the per-point check (indices 0–20) and carried NaN extras into `lm.map` → poisoned EMA downstream | `lm.slice(0, 21)` before map | `qe-static` CLEAN; A7 contract preserved (short/absent hands still legitimately blank the canvas) |
| 7 | Med | `shared/track-worker.js:134` | `detectForVideo` returning `undefined` (a skipped frame on a busy graph) threw on `.landmarks` deref → burned `failN` → healthy landmarker could escalate to `fatal` | `|| {}` — undefined is a skipped frame, not a fault | probe: 35 undefined-results → 0 fatals, 35 clearing results posted |
| 8 | Med | `shared/glove.js:23,131,174` | proto-key gesture kinds (`__proto__`, `toString`, `constructor`, `hasOwnProperty`) hit inherited `Object` members → raw function source landed in `fillStyle`/`fillText` (visible UI garbage / style sink poisoning) | `own()` helper (hasOwnProperty.call) gates `KIND_COL`/`KIND_TXT` lookups | glove probes: `'__proto__'`/'`toString'` kinds → default INK/'READY', no object/function-source reaches style or text sinks |
| 9 | Med | `shared/glove.js:95–113` | `P[i]`/`P.length` reads ran unguarded — a Proxy landmark with a throwing getter escaped `drawGlove` into the caller's render tick, every frame | validation loop wrapped in try → `ok=false` bail; `ctx.save()` itself guarded (`try/catch → return`) | probe: throwing-proxy `P` → returns, `_saves === 0`, no escape |
| 10 | Med | `shared/glove.js:114,176–179` | a mid-draw canvas fault escaped `drawGlove` (kills the caller's whole tick) and `finally{ctx.restore()}` could itself throw on a dead ctx | `try/catch` around the draw body — warn once, drop the one bad frame; `finally` does `try{ctx.restore()}catch{}` | probe: `quadraticCurveTo` fault → returns, save/restore balanced, one warn; throwing `save()`/`restore()` can't wedge |
| 11 | Low | `shared/glove.js:121` | `ctx.canvas.width * .09` on a canvas-less/NaN ctx → `Math.max(90, NaN) === NaN` silently disabled the size cap | `(ctx.canvas?.width || 0)` floors at the absolute 90px cap | probe: canvas-less ctx draws without throw |
| 12 | Low | `shared/glove.js:159–160,172` | `opts.pinchAt` truthy-but-non-finite (`{x:NaN}`, `'no'`) drew a NaN arc; `opts.side` non-string (`42`,`{}`,`[]`) TypeError'd on `.toUpperCase()` | `Number.isFinite` both coords; `typeof side === 'string'` gate | hostile-opts probe battery: 15 shapes incl. `pinchAt:'no'`, `side:{}`, `kind:{}` — none throw |
| 13 | Med | `index.html:743–759` | settings modal opened with `aria-modal` semantics but focus never moved into it; closing dropped focus to `<body>` — keyboard users re-Tab the whole page | `settingsFocusBack` saved on open → `settingsCloseBtn.focus()`; restored on close (`isConnected` guard) | static read; nearTry-clean |
| 14 | Med | `index.html:1186–1301` | decorative Three.js rAF loop ignored `prefers-reduced-motion` — perpetual motion the CSS block can't reach | `reduced` flag from `matchMedia` (+legacy `addListener`); boot → `stillFrame()` (one posed diorama render, no rAF chain); `renderFrame` early-outs while reduced; live flip + context-restore repaint the still frame | media-query static check passes; render loop never starts under reduce |
| 15 | Low | `index.html:693–710`, `lineup.html:269–277` | corrupt career storage could render `-5 KOs`, `2.9 WINS`, or a `0.0` avg-KO round | `cnt()` = `Math.max(0, Math.floor(num(v)))` for counters; avg floored at round 1, capped 99.9 | corrupt-storage probe class + static |
| 16 | Med | `index.html:476–497`, `lineup.html:153–174` | missing `prefers-contrast`, `forced-colors` handling; range inputs had no focus ring; `outline:none` on the stage canvas had no `:focus-visible` counterpart | focus-visible outlines on every interactive element (btns, links, chips, ranges, settings); `prefers-contrast: more` bumps borders/quiet greys; `forced-colors: active` preserves authored state indicators (`forced-color-adjust:none` on checkbox/switch faces, `Highlight` pips/selection) + `prefers-reduced-motion: reduce` CSS kills animations/transitions | new static media-query checks — CLEAN |
| 17 | Low | `lineup.html:256–348` | a failed stage engine left chips dead — clicks did nothing, stored pick never applied, career pills never updated (the card was markup only) | full fallback: chips select+persist `proto:<name>`, hero/stats/pips/spec/pick/ENTER all update, career pills read real (sanitized) record, engine keymap parity (←/→/A–D/digits + native button Tab/Enter), stored pick reflected, honest note | static + storage probes; lock gating stays server-side in `npc.js` (unchanged) |
| 18 | Low | `shared/track-worker.js:918–1031` probes | protocol gaps: frames before init, `init→close→init` interleave, out-of-order media stamps, undefined detect results | (no module change needed — verified behavior) | probes: pre-init frame gets a clearing result (page's `_inFlight` unblocks); serialized lifecycle closes the superseded landmarker, ordered readies; monotonic-ts floor holds when media time goes backwards; 35 undefined results → 0 fatal escalations |

## `test/qe-static.mjs` additions (durable)

- **Static (per page, owned=fail / foreign=note), `qe-static.mjs:284–299`:**
  animating stylesheet with no `prefers-reduced-motion` query → flag;
  `outline:none`/`0` with no `:focus-visible` → flag.
- **Tracker probes N–R** (`797–914`): grace-3 silent-dead cap, hung
  inline cap, adopted-worker guard + stale-`_bootW` reap, 20 rapid
  create/stop cycles with verdicts at every lifecycle point.
- **Worker protocol fuzz+** (`918–1031`): pre-init frame, garbage
  envelopes, serialized `init→close→init`, out-of-order media stamps,
  35× undefined-result run (no fatal burn).
- **Glove domain fuzz** (`1051–1155`): recording FakeCtx — null ctx,
  valid-draw save/restore balance + paint ops, every bad-`P` shape
  bails before touching ctx, throwing-proxy bail, frozen arrays/points
  (incl. the `P.map` rescale path), hostile-opts battery, proto-key
  kind/style+text sink checks, mid-draw fault → balanced restore,
  canvas-less ctx, throwing save/restore.
- **Global landmarker-leak assert** (`1153–1158`): every `createFromOptions`
  product across the whole suite must end `closed` — an open one is a
  leaked GPU/CPU graph.

## gallery.html — audited, no changes (by design)

`gallery.html` is a 6-line redirect stub (`meta refresh → ./`, plain
link). There is **no gallery state, manifest loader, keyboard-nav
surface, or stats renderer to exercise** — the brief's gallery angles
(corrupt gallery storage, missing manifest assets, rapid open/close)
have no implementation to bite on. The stub itself passes every static
check (link resolves, no scripts, no emoji). If a real gallery page is
expected, it does not exist — that's a product/scope question, routed
below rather than silently building one outside this brief.

## Residual risks / notes

- `FakeCtx` in the glove probes records calls only — it can't catch a
  *visual* regression (wrong color, clipped tag); domain/robustness is
  what it proves.
- Probe timing uses `OPTS {bootMs:200, stuckMs:60, respawnMs:30}` —
  order-of-magnitude headroom vs CI jitter; assertions are behavioral
  ("did a build start"), not wall-clock, except the `<300ms` cap check
  which has ~66× slack.
- `mediaQuery.addListener` legacy path is best-effort for old Safari —
  modern engines take `addEventListener`.

## Routed findings (out of boundary — noted, not fixed)

| Sev | File:line | Issue |
|---|---|---|
| note | `boxing.html:0` | CSS animates, no `prefers-reduced-motion` query — same class as fixed here; boxing owner should apply |
| note | `boxing.html:385` | non-literal `innerHTML` from storage-fed markup — DOM XSS class (owned elsewhere) |
| note | `boxing.html:524` | raw `Number()`/`parseFloat` on `getItem` — NaN-leak class |
| note | `shared/boxing/fight.js:181–183` | `JSON.parse` outside try — corrupt storage kills the caller |
| note | `shared/boxing/npc.js:159` | unguarded `await import()` — a failed chunk kills the module before UI wiring |
| note | `shared/boxing/tutorial.js:124` | non-literal `innerHTML` — storage-fed markup class |
| note | `shared/boxing/mitts/index.js:10` | `'../../x'` literal resolves neither file- nor page-relative |
| note | `lineup-mockups/_hero/engine.mjs:244` | `webglcontextrestored` restarts the loop unconditionally — pending rAF → doubled chain (mockup dir, read-only) |

## Verification

- `npm run qe:static` → `checked 20 module blocks/files across 4 pages — CLEAN`
- `npm test` → **609 assertions, 0 failed** (fight 103, ring 37, fists 25,
  hands 7, proto 82, fuzz+server 355 across the remaining suites)
- Console noise during the run (`glove: short landmarks`, `track-worker
  detect failed`, `draw failed — one bad frame dropped`) is the
  *expected warn output* of the negative-path probes — the modules
  correctly warn-and-drop rather than throw.
