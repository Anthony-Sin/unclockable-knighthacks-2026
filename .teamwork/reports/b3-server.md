# b3-server — Server under load, wave 3 (NO browser)

Scope: `server.mjs` (fixed) + `test/qe-server.mjs` (extended with a
concurrency/time matrix). Node `http`/`net`/`fs` only — no browser, no deps.
Live `:8791` never touched; all load probes run against scratch spawns.

## Result: 3 real defects found & fixed. Suite 96 → **115 probes, all green, ~13s** (<90s budget). `npm test` green.

## Bugs fixed

| sev | file:line (pre-fix) | evidence | fix | re-verification |
|---|---|---|---|---|
| P2 | server.mjs:145+167 | **content-range lies after mid-read shrink.** `content-range` header was computed from `fstat` *before* `readFile`, but `end`/`content-length` were re-clamped to what was actually read *after* — so a file truncated in between announced a span longer than the wire delivered: `cr=bytes 700000-2999999/3000000 cl=348576 body=348576` (pre-fix build, truncate hammer probe). RFC 9110 violation; a range-resuming client records bytes it never got — silent corruption on retry-free downloaders | after `end = Math.min(end, buf.length - 1)`, re-derive `hdrs['content-range'] = bytes ${start}-${end}/${buf.length}` from the buffer actually read (new server.mjs:182-185) | `range vs mid-write truncate` probe: `racy=4` straddles observed, `inconsistent=0`. Pre-fix build shows `mismatch=2` in 5 straddles |
| P3 | server.mjs:68-70 | **file deleted mid-request → bogus 403.** `realpath()` ENOENT was lumped with genuine escapes (`!real || … → 403`). Unlink landing between `stat()` and `realpath()` surfaced as `Forbidden` instead of `Not Found`. Evidence (pre-fix build): 240 parallel GETs with concurrent `rm` → `{200:32, 403:31, 404:177}` | `!real` → 404 (gone/dangling/ELOOP — nothing to leak); the escape check `!startsWith(ROOT)` keeps its 403 (server.mjs:71-75) | same probe on fixed build: `{200:13, 404:59}` — zero 403s, and `corrupt200=0` (every 200 still delivers the whole pre-unlink file thanks to the fd pin) |
| P3 | server.mjs:93-96 | **denylist checked `real`, not the opened inode — and ` (deleted)` evades basename match.** Two gaps: (a) the `.git`/`.env` DENY check ran on `real` (pre-open resolution), so a dir-component symlink swapped in before `open()` could land the fd on a still-in-root denied file and pass the `/proc/self/fd` prefix check; (b) kernel readlink appends ` (deleted)` to unlinked paths, so `.env (deleted)` ≠ `.env` — basename evasion on the inode path | strip a trailing ` (deleted)` → `fdPath`; apply BOTH the root-prefix check and the DENY component check to `fdPath` (server.mjs:97-110) | defensive-hardening; races need local fs access. Covered by the delete/race probes staying green + `/.git`/`/.env` rows still 404 |

## Wave-3 additions to `test/qe-server.mjs` (section J, scratch-only)

New helpers: `rssKB()` (child VmRSS via /proc), `conn()` — a persistent-socket
wrapper with a real HTTP/1.1 response parser (content-length, **chunked**,
1xx/HEAD/204/304 no-body rules) for keep-alive/pipeline/interim probes.

```text
| case (section J)                                   | expected                              | got |
| 50 parallel disjoint ranges on 2.6MB mp4           | all 206, bodies == file slices        | all ok, 54ms, rss 103→230MB |
| RSS sane after 50×2.6MB storm                      | < 1GB                                 | 230MB |
| 20 parallel mixed GET/HEAD/range/404/416           | each its status, cl==body             | all ok |
| same file deleted mid-flight (12 rounds × 6 reqs)  | 200-full / 404 / 500, never 403/torn  | {200:13,404:59} corrupt=0 |
| stalled reader vs 20 hammering requests            | each <1.5s                            | maxLat=2ms (12MB body, paused client) |
| trickle reader completion                          | intact 12MB body                      | eq=true |
| abort storm 100× connect→request→abort             | all settle, server alive              | settled=100, GET→200, exit=null |
| 30 sequential on one keep-alive socket             | all correct                           | 30/30 |
| 30 pipelined in ONE write (GET/HEAD/404/206 mix)   | in-order, framing intact              | 30/30 |
| header-heavy request (120 headers)                 | 200                                   | 200 |
| Expect: 100-continue                               | interim 100 then 200                  | 100 → 200 |
| undrained request body → keep-alive                | pipelined next req still works        | 200+200 |
| range on file being truncated (80 iter hammer)     | cr span == body bytes on every 206    | racy=4, inconsistent=0 |
| GET during truncate                                | content-length == body                | bad=0 |
| future-IMS during mid-write                        | 304 empty                             | 304 len=0 |
| slow-loris header drip (8 socks, byte/200ms)       | others unaffected; drip completes     | normal GETs 200, loris→200 |
| fd exhaustion: 48-fd server vs 160 held sockets    | survives + recovers                   | dead=false recovered=true |
```

## Behavioral findings (documented, NOT defects)

- **Error responses are `Transfer-Encoding: chunked`** — `writeHead`+`end(msg)`
  paths (404/403/405/416/500) get chunked framing; success paths set explicit
  `content-length`. Legal HTTP/1.1; my parser handles it. No change made.
- **Whole-file buffering confirmed measured, not starving**: 50×2.6MB parallel
  reads peak RSS ~230MB (~4.6MB/conn transient); a paused 12MB download pins
  ~11MB in the socket writelist while other requests stay at 2-6ms latency.
  `res.end` hands the buffer off to the kernel; only loopback-invisible stalls
  hold it. No event-loop head-of-line blocking observed.
- **EMFILE-on-accept is safe**: node/libuv backs off accept and recovers once
  fds free (verified with a dedicated `ulimit -n 48` child).
- **Slow-loris**: drip-fed headers are held ~indefinitely within node's
  `headersTimeout` (60s default); each loris socket costs 1 fd and zero CPU —
  normal traffic unaffected. No app-level timeout added (document only).
- **Expect: 100-continue**: node auto-replies `100` (no checkContinue listener)
  and the handler answers `200` before the body lands; undrained bodies are
  dumped without wedging keep-alive.

## Residual risks

- Every GET buffers the **whole file** (by design — the read-before-writeHead
  fix for ERR_HTTP_HEADERS_SENT). N parallel big-file clients = N×size
  transient RAM; a continuously-growing file being served could bloat one
  request (readFile reads current size). Dev-server scope; a streamed
  `createReadStream` path would reintroduce the headers-then-error problem.
- 304 can go stale within Last-Modified's ~1s granularity (inherent).
- ` (deleted)`-suffix strip assumes no real filename ends with it (a file
  *literally* named `x (deleted)` that was unlinked mid-request could
  false-403/404 — cosmetic, not a leak).
- Live `:8791` still runs the pre-fix build: the three bugs above are live
  there (e.g., `/.git/config` 200, POST served, `%2f` policy boost per w8) —
  restart is forbidden/out of scope.
- package.json: no change needed — `npm test` already runs `test/qe-server.mjs`.

## Verify

- `node test/qe-server.mjs` → **115 passed, 0 failed** (~13s; scratch port 8893+)
- `node test/qe-server.mjs --live` → **71 passed, 0 failed** (read-only on :8791)
- `npm test` → full chain green (qe-server last: 115/0)
- no residue: `test/.qe-server-tmp/` removed, no stray listeners/children
