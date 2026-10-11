# w8-qe-server — HTTP server + static-shell QE (round 2)

Scope: `server.mjs` (fixed) + `test/qe-server.mjs` (new durable probe suite).
No browser used — node `http`/`net` only.

## Deliverables

- **`test/qe-server.mjs`** — 96-probe suite. `node test/qe-server.mjs` spawns
  its OWN `server.mjs` on a scratch port (`QE_PORT`, default 8893, +1 while
  busy), builds fixtures under `test/.qe-server-tmp/` (deterministic blob,
  space/+ / UTF-8 names, dir/index.html, symlinks: escape/ELOOP/in-root),
  runs the matrix, and removes fixtures + kills the child on exit (verified:
  no residue, no stray listeners). `--live` runs a GET/HEAD-only pass against
  the live `:8791` without spawning, and tolerates documented pre-fix
  behavior there. Verbatim paths go through `http.request.path` (fetch/URL
  normalize `..`/`%2e%2e` client-side, so they cannot probe traversal); truly
  malformed bytes go through raw `net` sockets. Exits 1 on any FAIL.
- **`server.mjs`** — 7 bugs fixed (below), suite stays green: **96/96 PASS**
  on the fixed build.

## Bugs fixed (line refs = pre-fix revision of server.mjs)

| file:line | bug + evidence | fix | re-verification |
|---|---|---|---|
| server.mjs:56 | **Cache poisoning via `%2f`-boosted `..`** — `cacheable = path.startsWith('/vendor/')` used the decoded-but-unresolved path. `GET /vendor/..%2fpackage.json` on live `:8791` → `200, cache-control: max-age=86400, immutable` — a mutable source file borrowed the immutable policy (and the 304 skip) for 24h | `cacheable = real.startsWith(VENDOR_PREFIX)` on the realpath-resolved path (new lines 98, 13) | `/vendor/..%2fpackage.json` → `no-cache` + `IMS → 304` on fixed build (matrix rows 44–45) |
| server.mjs:98 (missing guard) | **POST/PUT/DELETE served files** — `POST /package.json` on live → `200 + body`; request payload never drained | method gate: anything ≠ GET/HEAD → `405` + `allow: GET, HEAD` (lines 47–50) | POST/PUT/DELETE/PATCH/PROPFIND/`OPTIONS *` → 405; GET after 4KB undrained POST → 200 |
| server.mjs:44–98 | **TOCTOU**: `stat(file)` → `realpath(file)` → `readFile(file)` were three lookups on the same path; a symlink/dir swap between them could redirect the read past the guard | resolved file is pinned to one fd (`open(real, O_RDONLY|O_NONBLOCK)`, fstat+readFile on it); `/proc/self/fd/<n>` re-resolution verifies the *opened inode* is inside root (lines 81–97); O_NONBLOCK stops a swapped FIFO parking a worker thread | suite green; symlink probes (escape → 403, ELOOP → 404, in-root → 200 bytes-equal) |
| server.mjs:77–88 | **`Range: items=0-1` → 416** — RFC 9110 §14.1.2 requires ignoring unknown units. Live → `416` | unknown unit / multi-range set → ignored → `200` whole body; only malformed or unsatisfiable `bytes=` → `416` (lines 121–145) | `items=0-1` and `bytes=0-1,2-3` → `200 len=5000`; `bytes=abc`, `bytes=-`, `bytes=50-10`, `bytes=999999999-`, `bytes=-0` → `416 bytes */5000` |
| server.mjs:93+98 | **content-length promised from `stat` before `readFile`** — a file shrinking between them would send fewer bytes than the header claims | read first (kept), then clamp `end` to `buf.length`; a shrunk range → `416` (lines 151–162) | range round-trip + all 206 rows pass |
| — (missing) | **`/.git/config` → 200 on live** — repo internals (full history, deleted secrets) served to the LAN on the `0.0.0.0` bind | resolved-path denylist `DENY={'.git','.env'}` → `404` (lines 14–17, 72–74) | `/.git/config` and `/.git%2fconfig` → 404 on fixed build |
| — (missing) | **unhandled `error` on req/res wrappers** — a client abort could surface as an EventEmitter `error` (throws with no listener); round 1 already lost the server to `ERR_HTTP_HEADERS_SENT` | noop `req/res.on('error')` at handler top (lines 42–43) + kept inner res try/catch | raw-socket abort probes: server answers `GET /` → 200 after mid-download RST, half-sent request, garbage lines, oversized request line |

## Live `:8791` sanity (read-only pass)

`node test/qe-server.mjs --live` → **71 checks, 0 FAIL**. The live process
runs the pre-fix build (never restarted per brief), so it *demonstrates* the
bugs the fixed build resolves — captured evidence:

- `/.git/config` → **200** (leaks repo config; fixed → 404)
- `/.git%2fconfig` → **200** (fixed → 404)
- `/vendor/..%2fpackage.json` → `cache-control: max-age=86400, immutable`
  (fixed → `no-cache`, `IMS → 304`)
- `Range: items=0-1` / `bytes=0-1,2-3` → **416** (fixed → 200)
- `POST /package.json` → **200 + body** (fixed → 405)

All other behaviors identical; live still serves `GET /` → 200 afterwards.

## Probe matrix (fixed build, scratch :8893)

```
| case | expected | got | result |
| range bytes=0-0 | 206 cr=bytes 0-0/5000 | 206 cr=bytes 0-0/5000 | pass |
| range bytes=100- (open end) | 206 cr=bytes 100-4999/5000 | same | pass |
| range bytes=-500 (suffix) | 206 cr=bytes 4500-4999/5000 | same | pass |
| range suffix > size clamps | 206 cr=bytes 0-4999/5000 | same | pass |
| range bytes=abc malformed | 416 */5000 | same | pass |
| range start>end (50-10) | 416 */5000 | same | pass |
| range start past EOF (999999999-) | 416 */5000 | same | pass |
| range zero suffix (-0) | 416 */5000 | same | pass |
| range empty spec (bytes=-) | 416 | same | pass |
| range end past EOF clamps | 206 cr=bytes 0-4999/5000 | same | pass |
| range unknown unit (items=0-1) | 200 whole | 200 len=5000 | pass |
| multi-range (0-1,2-3) | 200 whole | 200 len=5000 | pass |
| ranged chunks reassemble | == full 5000B body | eq=true | pass |
| HEAD + range | 206 cl=1, empty | same | pass |
| empty file GET | 200 cl=0 | same | pass |
| empty file range | 416 */0 | same | pass |
| mp4 bytes=0-1023 | 206 == file slice | same | pass |
| range on vendor file | 206 len=100 | same | pass |
| range beats if-modified-since | 206 | same | pass |
| /../, /%2e%2e/ (URL parser collapses in-root) | 404 | 404 | pass |
| /..%2f, /%2e%2e%2f, nested %2e%2e%2f | 403 | 403 | pass |
| /..%2f..%2fetc%2fpasswd | 403, no leak | 403 | pass |
| /%00 NUL | 404 | 404 | pass |
| raw + encoded backslashes | 404 | 404 | pass |
| double-encoded %252e (no double decode) | 404 | 404 | pass |
| bare // | 400 | 400 | pass |
| symlink escape / ELOOP / in-root | 403 / 404 / 200 eq | same | pass |
| /.git/config, /.git%2fconfig | 404 | 404 | pass |
| HEAD == GET minus body | same headers, no body | same | pass |
| IMS echo → 304 (non-vendor) | 304 empty | same | pass |
| future / garbage IMS | 304 / 200 | same | pass |
| vendor IMS → NOT 304 | 200 + body | same | pass |
| cache-control non-vendor / vendor | no-cache / immutable | same | pass |
| POST/PUT/DELETE/PATCH/PROPFIND/OPTIONS* | 405 allow=GET,HEAD | same | pass |
| GET after undrained POST body | 200 | same | pass |
| MIME: html/js/mjs/css/json/wasm/mp4/glb/task/png/xyz/UPPER.HTML | per map | same | pass |
| COOP/COEP/CORP isolation headers | present | same | pass |
| accept-ranges: bytes | present | same | pass |
| / → index.html | body == file | eq=true | pass |
| /dir/ → index.html / dir w/o slash / missing dir | 200 / 404 / 404 | same | pass |
| %20 / + literal / utf-8 names | 200 / 404 / 200 | same | pass |
| query ignored, empty query, ;suffix | 200 / 200 / 404 | same | pass |
| 5KB path | 404 | 404 | pass |
| garbage line / bad % / HTTP/9.9 | 400 ×3 | 400 | pass |
| CRLF-in-URL header injection | 404, no injected hdr | same | pass |
| abort mid-download / half-sent / pipelined / absolute-form / LF-only / >16KB | server alive (GET → 200) after each | same | pass |
```
Full verbatim table + PASS lines: run `node test/qe-server.mjs` (96 checks).

## Audit notes (checked, no action needed)

- **Range overflow**: regex is `\d*`-only; `+m[i]` saturates → `Math.min`/`<size`
  checks bound everything. `bytes=9007199254740993-` → 416.
- **mtime 304 slack**: `st.mtimeMs <= ims + 999` is equivalent to a
  second-floor compare; a file re-written <1 s after the client's copy can
  304-stale — inherent to Last-Modified's second granularity, documented.
- **Header injection**: every response header value is static or numeric;
  the decoded path never enters a header. CRLF-in-URL probe → 404, no
  injected header.
- **Request smuggling**: node llhttp enforces TE/CL precedence and rejects
  bare-LF (`LF-only → 400`) and oversized lines (`>16KB → 431`). Pipelining
  works per spec (2×200). Noted, not fixable at our layer.
- **`//` quirk**: `new URL()` treats `//host/path` as scheme-relative —
  host is swallowed, `/path` is served. No redirect → harmless; documented.
- **Traversal reality-check**: `new URL` collapses `..`/`%2e%2e` during
  parse, so plain `/../` never reaches the guard (lands in-root → 404).
  `%2f` survives parsing and exercises the lexical guard → 403. Both safe.

## Residual risks

- Live `:8791` runs the pre-fix build until someone restarts it (out of
  scope — forbidden). The report above lists exactly which rows differ.
- 500 body echoes the error string (path info) — dev server, accepted.
- Denylist is exact-name `.git`/`.env`; other dotfiles (`.gitignore`) still
  serve — minimal by design.
- No `If-Range` support — a resumed conditional range gets a legal 200.
- `open()` of a swapped FIFO is guarded by O_NONBLOCK; a swap to a *slow*
  filesystem (FUSE) could still stall a worker thread — dev-server threat
  model accepted.
- Whole file is buffered even for ranges (fine at ≤ ~20 MB vendor files).
- `test/.qe-server-tmp/` fixtures are briefly visible inside the served root
  during runs (created+deleted inside the suite; symlinks guarded anyway).
