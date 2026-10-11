# Brief: b3-server — Server under load wave 3 (NO browser)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` — NEVER kill/restart it. Your suite
  spawns its own scratch servers (see test/qe-server.mjs for the pattern).
- w8 hardened server.mjs in round 2 (7 fixes: methods gate, .git/.env
  denylist, TOCTOU fd-pin, range fixes). `test/qe-server.mjs` = 96
  probes, green. Hunt what static edge-cases missed: CONCURRENCY + TIME.

## Your files (exclusive — fix freely)
- `server.mjs`, `test/qe-server.mjs` (extend)
- package.json is b3-fuzz's — if you need script changes, report it.

## Do
1. **Concurrency**: 50 parallel GETs of the 2.6MB mp4 with disjoint
   ranges; 20 parallel mixed GET/HEAD/range/404; assert none hang, all
   correct, server RSS sane after. Parallel requests to the SAME file
   while it's deleted mid-flight (fixture): 404/500 but never crash.
2. **Streaming behavior**: client reads the mp4 slowly (trickle 1KB/50ms)
   while others hammer — head-of-line blocking? Event loop stalls?
   (readFile whole-file buffering: does one big file starve others?)
3. **Abort storms**: 100× connect→request→abort mid-response; ECONNRESET
   / EPIPE handled? `res.end` after socket dead — no unhandled errors,
   server survives.
4. **Keep-alive + pipelining**: one socket, 30 sequential + pipelined
   requests; header-heavy requests; Expect: 100-continue.
5. **304 races**: IMS while file mid-write (truncate during request) —
   served size vs content-length mismatch?
6. **Slow-loris lite**: request headers drip-fed byte-per-200ms —
   node's timeouts handle it; document behavior, no fix needed unless
   it dies.
7. Extend qe-server.mjs with a load/concurrency section (keep it
   deterministic + <90s). `node test/qe-server.mjs` green; `npm test`
   still green.

## Hard rules
No git, no .env, no new deps, report `.teamwork/reports/b3-server.md`
(probe matrix + bugs fixed w/ evidence + residual risks).
