# Brief: w8-qe-server — HTTP server + static-shell QE (NO browser)

QE round 2. Read `.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md`
at `/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` running `server.mjs` (never kill or
  restart it — file edits appear on reload, and other agents are testing
  against it).
- You need NO Chromium for this brief — node + curl/fetch only.
- `server.mjs` is a hand-rolled static server: MIME map, path-traversal
  guard (lexical + realpath), vendor/ immutable caching, last-modified
  304s, single-range byte serving for the .mp4 test input.
- Round 1 hardened it (ERR_HTTP_HEADERS_SENT fix, symlink guard) —
  find what remains.

## Your files (exclusive — fix bugs freely)
- `server.mjs`
- `test/qe-server.mjs` (new — durable standalone probe suite;
  `node test/qe-server.mjs` must spawn its OWN server on a scratch port
  e.g. 8893 so it never depends on the live instance)
- NOT yours: package.json (w4), every app/page file. Findings → report.

## Do
1. **Write test/qe-server.mjs** — deterministic probe suite asserting:
   - range: `bytes=0-0`, `bytes=100-`, `bytes=-500` (suffix), malformed
     `bytes=abc`, `bytes=50-10` (start>end), `bytes=999999999-` → each
     correct status (206 vs 416 vs 200-ignore) + content-range sanity;
     round-trip: reassemble ranged chunks == full body hash
   - traversal: `/../`, `/%2e%2e/`, `/..%2f`, `//`, `/%00`, backslashes,
     symlink-escape if one exists → 403/404, never a file outside root
   - HEAD == GET minus body (status + content-length match)
   - conditional GET: send last-modified back → 304 on a non-vendor
     file, and that a vendor/ file does NOT 304 (immutable path)
   - methods: POST/PUT/DELETE get a sane non-500 response
   - MIME: .html/.js/.mjs/.wasm/.mp4/.glb/.task correct content-type;
     unknown ext → octet-stream
   - index: `/` serves index.html; `/dir/` appends index.html
   - URL quirks: `%20` spaces, `+`, very long path (>4KB), query strings
   - malformed requests don't kill the server (it must still answer the
     next request — round 1 found a server-killing crash; prove there's
     no second one)
2. **Audit server.mjs** by reading: TOCTOU between stat/realpath/
   readFile, mtime granularity vs the 1s-304-slack, range math overflow
   (start+end > Number.MAX_SAFE_INTEGER is impossible but > file size
   isn't), header injection via crafted URL, request smuggling surface
   (node http handles most — note, don't fix), unhandled 'error' events
   on the socket.
3. **Live sanity**: run your suite against the LIVE :8791 too (GETs
   only, no load hammering — it's serving other agents).
4. Fix every real bug in server.mjs; your probe suite must stay green
   after fixes.

## Report `.teamwork/reports/w8-qe-server.md`
Probe matrix (case | expected | got | pass/fail), bugs fixed
(file:line | evidence | fix | re-verification), residual risks.
