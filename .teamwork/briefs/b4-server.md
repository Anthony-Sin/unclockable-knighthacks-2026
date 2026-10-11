# Brief: b4-server — HTTP/static-server wave 4 (NO browser)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Live server: `http://127.0.0.1:8791` — do NOT kill it; spawn scratch
instances on ephemeral ports for destructive probes.

## Your files (exclusive — fix freely)
- `server.mjs`, `test/qe-server.mjs` (extend — keep deterministic)
- READ-ONLY: everything else.

## Do — new angles (traversal/methods/range/TOCTOU/concurrency done)
1. **Conditional-request edges**: If-Range (valid/invalid/weak), If-Match,
   If-None-Match vs mid-write mtime changes, malformed dates in
   If-Modified-Since, IMS on HEAD.
2. **Method/protocol oddballs**: OPTIONS/TRACE/CONNECT/UPGRADE, HTTP/1.0
   requests, `Connection: keep-alive` on 1.0, absolute-form request-lines
   (`GET http://x/path`), no Host header on 1.1.
3. **Request-smuggling robustness**: duplicate Content-Length, CL+Transfer-
   Encoding conflicts, negative/huge CL, trailers — server must not wedge,
   must not serve smuggled bytes, must stay alive.
4. **URL normalization**: `%00`, `\\`, `//`, `a/./b`, `a//../`, query with
   `#`-encoded, overlong UTF-8, Unicode confusables — resolved path must
   stay inside root and map predictably.
5. **Keep-alive lifecycle**: idle-socket timeout (if any), FIN mid-read,
   socket without request, 100 sockets half-open — server survives, no fd
   leak (track /proc/self/fd or EMFILE).

## Report
`.teamwork/reports/b4-server.md`. Run `node test/qe-server.mjs` (local) +
`--live` (8791) at the end — both green.
