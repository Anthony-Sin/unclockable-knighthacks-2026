# b4-server — HTTP/static-server hardening probes, wave 4 (NO browser)

Scope: `server.mjs` (fixed) + `test/qe-server.mjs` (extended: sections K–O,
115 → **227 checks**). Node `http`/`net`/`fs`/`/proc` only — no browser, no
deps. Live `:8791` never touched; all destructive/load probes run against
scratch spawns on ephemeral ports.

## Result: 4 real defects found & fixed. Suite 115 → **227 probes, all green, ~25s**. `npm test` chain green.

## Bugs fixed

| sev | file:line (pre-fix) | evidence | fix | re-verification |
|---|---|---|---|---|
| P2 | server.mjs:131-145 | **If-Range ignored → stale 206 splice.** `Range: bytes=0-9` + `If-Range: <stale date/etag>` returned `206` of the CHANGED file — a resuming downloader silently splices bytes from two versions (RFC 9110 §14.3 requires ignoring the Range → whole 200). Pre-fix repro: `If-Range: Wed, 01 Jan 2020` on a live file → `206 len=10`; `If-Range: "zzz"` → `206` | If-Range evaluated inside the range block: strong-etag must equal ours, weak `W/` never gates, HTTP-date must equal Last-Modified to the second; on mismatch the Range is ignored entirely (even a malformed `bytes=` → 200, not 416) | `If-Range stale date → 200 whole len=5000`, `unknown etag → 200`, `weak → 200`, `garbage → 200`, `matching LM → 206`, `matching etag → 206`, `failed If-Range + malformed range → 200`, `empty file → 200 cl=0`, `HEAD variant → 200 cl=5000` — all PASS |
| P3 | server.mjs (no etag, no conditionals) | **conditional requests non-functional.** No ETag was ever emitted and If-None-Match/If-Match were ignored: `If-None-Match: *` → `200` (want 304), `If-Match: "x"` → `200` (want 412), `If-Unmodified-Since: <stale>` → `200` (want 412). Conditional GETs could never revalidate | strong `etag: "sizeHEX-mtimeMsHEX"` emitted on every file response; RFC 9110 §13.2.2 order implemented: If-Match (strong, `*` allowed) → 412; If-Unmodified-Since → 412 when mtime newer (ignored when If-Match present, malformed→ignored); If-None-Match (weak compare, `*` allowed) → 304; IMS suppressed while INM present (§13.1.3). Precondition match beats Range → 304 | 14 probes: INM match/`*`/weak/list/HEAD → 304, bogus → 200; If-Match `*`/own → 200, bogus/weak → 412; IUS stale → 412, future/malformed → 200; IMS-suppressed-by-INM → 200; INM+Range → 304; 404 never masked |
| P3 | server.mjs (new code) | **Date.parse(0) invents a validator** — `Date.parse(header \|\| 0)` → `946702800000` (Jan 2000, *truthy*). Harmless for IMS semantics (year-2000 < mtime → same 200) but inverts under If-Unmodified-Since: a missing header → `412` on EVERY request (caught by my own probes pre-merge) | both IMS and IUS are presence-gated (`hdr === undefined → NaN`) instead of `Date.parse(\|\|0)` | bare GET → 200; all 27 conditional probes pass |
| P4 | server.mjs:51-55 | **empty `Host:` accepted on HTTP/1.1** — node 400s a *missing* Host itself, but `Host:` (empty) and `Host: \t` sailed through to a 200 (RFC 9110 §7.2: empty authority ⇒ 400) | `if (req.headers.host === '') → 400` after the method gate | `HTTP/1.1 EMPTY Host → 400`, `whitespace-only Host → 400`, `missing Host → 400` (node), `HTTP/1.0 no Host → 200` exempt — all PASS |

## Wave-4 additions to `test/qe-server.mjs`

New helper `fdCount()` — scratch child's open-fd count via `/proc/<pid>/fd`.
New fixture `cond.bin` for utimes-driven deterministic mtime control.

```text
| case (sections K–O)                              | expected                                   | got |
| etag emitted; INM match/*/weak/list/HEAD → 304   | strong "sz-mtime" validator                | all 304 |
| INM bogus → 200; INM+Range → 304 wins            | precondition beats range                   | 200/304 |
| IMS ignored when INM present (§13.1.3)           | 200                                        | 200 |
| If-Match */own → 200; bogus/weak → 412           | strong compare                             | all |
| IUS stale → 412; future/malformed → 200; skipped |                                            | all |
|  under If-Match (§13.1.4)                        |                                            |     |
| If-Range: match LM/etag → 206; stale/unknown/    | 206 vs whole-200                           | all |
|  weak/garbage → 200 whole; failed → even         |                                            |     |
|  malformed range and empty file → 200            |                                            |     |
| utimes mid-write: etag tracks mtime; pre-write   | etag1≠etag2; INM(stale)→200; If-Range      | all |
|  etag/LM → 200, current → 206/304                | (catches changes 1s-grain LM misses)       |     |
| OPTIONS / TRACE / CONNECT / UPGRADE / asterisk / | 405 / 405-no-echo / closed / 400 / 404 /   | all |
|  authority-form                                  | 400                                        |     |
| GET w/ Upgrade hdrs                              | 200-as-GET or closed, never silent 101     | 200   |
| HTTP/1.0 → 200+close; 1.0 keep-alive ×2; 1.0     | honored / dropped-second                   | all   |
|  pipelined → single response                     |                                            |     |
| absolute-form foreign host / https / traversal   | 200 / 200 / 403-no-leak                    | all   |
| missing / EMPTY / whitespace Host on 1.1 → 400   | 400 ×3 (empty = the new fix)               | all   |
| HTTP/1.2 / 2.0 / 0.9 / 9.9                       | lenient-200 or 4xx — never wedge           | 400/200/200/400 |
| dup CL same/conflict, CL -5, huge, 0x10, space-  | 400 each — llhttp rejects                  | all 400 |
|  before-colon, CL+TE, TE+CL, TE×2                |                                            |     |
| chunked POST + trailers                          | 405, trailer never in response headers     | pass  |
| obs-fold continuation                            | 400                                        | 400   |
| GET + CL body + pipelined GET                    | 200→200, framing aligned                   | pass  |
| whole GET smuggled inside CL body                | 405→200→closed — never dispatched          | pass  |
| chunked GET + trailers + pipelined               | 200→200 aligned                            | pass  |
| partial body + RST                               | next req 200, no wedge                     | pass  |
| ./ ../ // %# %-confusable %C0%AE %ED%A0 %F0%28   | resolve in root; overlong/surrogate → 400  | all |
|  %FE; encoded-slash in-root traversal → serves;  |                                            |     |
|  deep/uppercase-hex escapes → 403/404 no leak    |                                            |     |
| 100 half-open sockets                            | responsive while held (fd 22→122), all     | pass  |
|                                                  | reclaimed on death (→22)                   |     |
| FIN mid-headers                                  | 400, clean                                 | pass  |
| 20× FIN-after-request                            | node drops resp on half-close (documented) | 0/20 resp, |
|                                                  |                                            | alive, fds back |
| idle keep-alive                                  | keepAliveTimeout reaps ~5s                 | 6.0s  |
| Connection: close / keep-alive across a 405      | closes / 405→200 same socket               | pass  |
```

## Behavioral findings (documented, NOT defects)

- **llhttp enforces nearly all smuggling resistance itself**: dup/conflicting/
  negative/huge/non-decimal Content-Length, CL+TE in either order, TE×2,
  space-before-colon, obs-fold → all `400`. TE: chunked passes to our 405.
  What server.mjs owns (verified): framing stays aligned — a declared body is
  consumed exactly; a request embedded in a body is never dispatched; no
  wedge on any of it.
- **node answers nothing on a half-closed socket**: `FIN` immediately after a
  complete request → response dropped, socket closed. Verified identical on
  stock `node:http` — llhttp/http-layer policy, not ours. fds still released.
- **llhttp version-lenient**: `HTTP/1.2`, `HTTP/2.0`, `HTTP/0.9` request
  lines are served as 1.x (`200`); only `HTTP/9.9`-class garbage 400s.
  Documented leniency, harmless for a static dev server.
- **`GET` + `Upgrade:` headers with no `upgrade` listener** → handled as a
  normal request → 200 + close. Never a phantom `101`.
- **Zero-byte sockets** are held until `headersTimeout` (60s default);
  **post-request idle** sockets reap at `keepAliveTimeout` ≈ 5.0–6.1s
  (measured `closedIn=6004ms`). Both bounded → no unbounded fd pin.
- **etag = `"size-mtimeMs"`**: a rewrite that lands inside the same
  millisecond with identical size keeps the etag (theoretical; ~ns-fs makes
  this vanishingly rare). INM on vendor files → 304 is honored even though
  IMS is skipped there (immutable policy stays: freshness, not dates).

## Residual risks

- Live `:8791` still runs the pre-fix build: If-Range splice bug, missing
  etag/conditionals, and the empty-Host acceptance are all live there —
  restart forbidden/out of scope (same status as w8/b3).
- If-Match/INM evaluated only after existence+deny checks — `412`/`304`
  never mask a 404/403 (intentional, RFC-compatible ordering).
- `If-Range` date granularity is seconds (inherent to HTTP-date); the etag
  path is ms-granular and is the precise validator.

## Verify

- `node test/qe-server.mjs` → **227 passed, 0 failed** (~25s; scratch 8893+)
- `node test/qe-server.mjs --live` → **123 passed, 0 failed** (GET/HEAD-only
  on :8791; tolerant alternates for the pre-fix build)
- `npm test` → full chain green (qe-server last leg: 227/0)
- no residue: `test/.qe-server-tmp/` removed; only live pid remains
