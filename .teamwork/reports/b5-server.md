# b5-server — HTTP/static-server hardening probes, wave 5 (NO browser)

Scope: `server.mjs` (1 fix) + `test/qe-server.mjs` (extended: sections P–T,
227 → **355 checks**). Node `http`/`net`/`fs`/`crypto`/`/proc` only — no
browser, no deps. Live `:8791` never touched; destructive/load probes run
against scratch spawns on ephemeral ports (8893+). Live now runs the
wave-4 build (etag/304/405/404 verified — restarted since wave 4), so the
`--live` alternates exist only for hypothetical older builds; the ONE
remaining live delta is the epoch bug below.

## Result: 1 real defect found & fixed. Suite 227 → **355 probes, all green**. `npm test` chain green.

## Bugs fixed

| sev | file:line (pre-fix) | evidence | fix | re-verification |
|---|---|---|---|---|
| P4 | server.mjs:261,275 | **falsy-0 validator ignores epoch HTTP-dates.** `Date.parse('Thu, 01 Jan 1970 00:00:00 GMT')` → `0` — falsy. `if (ius && …)` skipped the check, so `If-Unmodified-Since: <epoch>` returned `200`/`206` instead of `412` (same class as the wave-4 `Date.parse‖0` bug, one level deeper). Sibling on IMS: `If-Modified-Since: <epoch>` on an epoch-mtime file → `200` instead of `304`. Live repro on :8791 (wave-4 build): `IUS epoch + Range → 206`, `IUS epoch → 200`, `IMS epoch → 200` — all tolerated by the suite's `--live` alternates. | `Number.isFinite(ius)` / `Number.isFinite(ims)` gates instead of truthiness (a valid parse of 0 is still a real validator; only NaN means "malformed/absent") | fixed build: `IUS epoch + Range → 412`, `IUS epoch → 412`, `IMS epoch on epoch-mtime file → 304`; all 45 truth-table cells PASS; `--live` shows pre-fix 206/200 as expected deltas |

## Wave-5 additions to `test/qe-server.mjs`

New helpers: `reqHash` (streaming GET → sha256 without retaining the
body), `rawEnd` (write + FIN — truncated-stream probes), seeded LCG
`soup()` (deterministic byte noise), `ioRead` inside Q (`/proc/<pid>/io`
rchar). New fixtures: `etag.bin`, `big.bin` (12MB deterministic —
scratch-only creation).

### P — conditional × Range truth table (45 cells, GET **and** HEAD each)

RFC 9110 §13.2.2 order encoded as data — every cell run as GET and
mirrored as HEAD (same status, empty body). Verified live too (all
identical except the two epoch cells):

```text
If-Match:  bogus/W/-weak → 412 (beats range); own/*/list → 206
           IM own + IUS stale → 206 (IUS ignored under IM, §13.1.4)
           IM bogus + INM own → 412 (IM before INM); IM own + INM own → 304
IUS:       stale → 412 (even with INM own / If-Range match — IUS first)
           future/garbage → proceed; EPOCH → 412 (the fixed bug)
INM:       own/W/-own/*/list → 304 (beats range, even malformed range /
           failed If-Range); bogus → 206; bogus + IMS=LM → 206 (INM
           suppresses IMS)
IMS:       suppressed by any INM presence; suppressed by Range presence;
           IM own + IMS=LM → 304
If-Range:  own-etag/own-LM → 206 (incl. suffix); stale/weak/garbage →
           whole 200 (even malformed range → 200); own + malformed → 416;
           own + unsatisfiable → 416; own + multi-range → 200 (ignored);
           alone w/o Range → 200
vendor:    IUS stale + Range → 412, INM own + Range → 304, IfR own → 206
methods:   POST+IM / POST+INM / PUT+IUS / DELETE+IfR → 405 (method gate
           precedes precondition eval — our ordering, spec-defensible)
```

### Q — HEAD/GET parity (18 rows + validator identity + io proof)

- 18 (path × condition) rows: plain, ranges (incl. suffix/open/malformed/
  unknown-unit), INM/IM/IUS/IMS/If-Range, dir-index, 404, vendor — same
  status, identical `content-type|content-length|content-range|etag|
  last-modified|cache-control|accept-ranges|COOP|COEP|CORP|OAC`, HEAD
  body always empty. Framing headers legitimately differ (GET errors
  carry `TE: chunked`, HEAD none) → allowlist compare.
- ETag + Last-Modified byte-identical between GET and HEAD.
- **HEAD never reads the body** — `/proc/<pid>/io` rchar: 3×HEAD on the
  12MB file grew **405B**; one GET grew **12,000,326B** (negative control
  proves the counter discriminates). HEAD is stat-only.

### R — ETag stability under utimes (11 probes)

- Repeated GETs + HEAD → identical etag. mtime +3s → new etag + new LM.
- **Sub-second floor**: mtime +300ms inside the same second → etag
  changes, Last-Modified provably does not (the ms-granularity etag
  catches what the second-granularity LM can't).
- mtime restored to the exact prior instant → etag returns to the exact
  prior value — pure function of (size, mtimeMs), no hidden state.
- Same size + same mtime + **different content** → same etag (documented
  size+mtime limitation, pinned as an invariant so it can't silently
  change).
- Epoch mtime → `"len-0"` etag + real `Thu, 01 Jan 1970` LM; INM→304;
  IMS-epoch→304 (the fixed falsy-0).

### S — concurrent same-URL flood (scratch only)

- 50 parallel full GETs on one 12MB file: all 200, all **sha256-identical
  to the file** (no interleaved reads), one shared etag, **521ms** total.
- fd count 22→22 after settle; RSS transient 122→698MB (~600MB = 50×12MB
  buffered reads — expected), recovered; server alive, `exitCode=null`.

### T — raw-socket garbage fuzz (scratch only, ~50 probes)

- 16× seeded byte soup (1B–8KB random) → all refused/closed, never 2xx.
- FIN at every protocol seam (mid-request-line, after CRLF, mid-name,
  mid-value, trailing `\r`, zero bytes, POST partial JSON body) →
  400/500(abort)/closed — never a wedge.
- Start-lines 16.5KB/64KB/256KB → 431 each.
- Version tokens `XYZ/1.1`, `HTTP/A.B`, `HTTP/1`, `HTTP/`, `HTTP/1.1.2`,
  `http/1.1`, `HTTP/01.1` → 400.
- NUL in value/name/target/after-version, space-in-name, tab-in-name,
  space-before-colon, leading-tab fold → 400 each. Tab **inside** a value
  (legal per RFC field-vchar) → 200. obs-text bytes in value → 200.
- Extra token after version, tab separator, response-line-as-request →
  400. h2 `PRI` preface → 400. Single leading blank line → 200
  (tolerated). Double-space separators → 200 (llhttp leniency, same
  class as minor-version leniency — documented).
- Pipelined valid + garbage → single `400`: node's parser destroys the
  queued 200 with the socket on the second request's parse error (same
  half-close drop class as §O's FIN-after-request). Garbage is never
  dispatched; server stays alive.
- fds 22→22 across the whole fuzz; alive-checked after every cluster.

## Behavioral findings (documented, NOT defects)

- **node coalesces pipelined parse errors into one 400** and drops the
  first request's queued 200 — verified llhttp/http-layer behavior.
- **HEAD error responses carry no `transfer-encoding`** while GET errors
  carry `TE: chunked` — framing is method-dependent per RFC; parity is
  asserted on representation headers only.
- **`etag` is a pure (size, mtimeMs) function** — a same-length rewrite
  at a pinned mtime is invisible to validators (re-states the wave-4
  note, now pinned by a probe).
- **405 precedes all preconditions** — method gate first (defensible:
  no representation is served for a disallowed method anyway).

## Residual risks

- Live `:8791` runs the wave-4 build: the epoch-validator bug is the only
  known live delta vs this tree (restart pending per routing queue).
- `If-Range` HTTP-date compare remains second-granularity (spec-inherent);
  the etag path is ms-precise.
- `500` bodies echo the error string — dev server, accepted (prior waves).

## Verify

- `node test/qe-server.mjs` → **355 passed, 0 failed** (~95s; scratch 8893+)
- `node test/qe-server.mjs --live` → **196 passed, 0 failed** (GET/HEAD
  only; epoch cells tolerated 206/200 on the pre-fix live build)
- `npm test` → full chain green (boxing 103+37+25+7, qe-fuzz 82,
  qe-server 355 — all 0 failed)
- No residue: `test/.qe-server-tmp/` removed; only foreign/pre-existing
  pids remain (live 431910, e2e-era 519996 on :8890).
