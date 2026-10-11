# Brief: b5-server — HTTP/static-server wave 5 (NO browser)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.
Live `:8791` — never kill it; scratch instances on ephemeral ports.

## Your files (exclusive — fix freely)
- `server.mjs`, `test/qe-server.mjs` (extend — deterministic; 227 checks)

## Do — new angles (traversal/methods/range/TOCTOU/concurrency/
conditionals/smuggling/normalization/keep-alive all done)
1. **Conditional×Range matrix**: If-Range+INM, IUS+Range, weak-vs-strong
   etag mixes, INM on a 206, preconditions evaluated in RFC order across
   method types — build the truth table in code, verify every cell.
2. **HEAD/GET parity**: same URL/conditions/ranges → identical headers
   (except body), ETag/Last-Modified byte-identical, HEAD never touches
   the file body (stat-only or read-consistent).
3. **ETag stability**: mtime-changes via utimes → new ETag; content same
   + mtime same → stable ETag; sub-second mtime floors correct.
4. **Concurrent same-URL floods**: 50 parallel GETs on one 12MB file —
   every client gets identical bytes (hash them), no interleaved reads.
5. **Raw-socket garbage fuzz**: random byte soup, partial requests then
   FIN, oversized start-line, malformed version tokens, NULs in headers,
   header names with spaces/tabs — server never throws, never wedges,
   always closes or 400s, fd count stable.

## Report
`.teamwork/reports/b5-server.md`. `node test/qe-server.mjs` + `--live`
green at end.
