# Brief: w9-qe-pages — Page + tracking-layer static QE (NO browser)

QE round 2. Read `.teamwork/prompt_draft.md` and `.teamwork/CONTRACT.md`
at `/home/ANT/unclockable-knighthacks-2026/.teamwork/` first.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` (never kill/restart).
- You get NO Chromium this round — your tools are `npm run qe:static`,
  `npm run qe:res`, node imports of pure modules, curl, and careful
  reading. Other agents (w5/w6/w7) do the browser verification.
- Round 1 fixed 20 bugs — find NEW ones.

## Your files (exclusive — fix bugs freely)
- `index.html`, `lineup.html`, `gallery.html` (inline modules included)
- `shared/hands.js`, `shared/face.js`, `shared/glove.js`,
  `shared/track-worker.js`
- `test/qe-static.mjs` (extend it — must still pass on all 4 pages
  including boxing.html read-only checks)
- NOT yours: boxing.html + shared/boxing/* (w4/w6/w7 split those),
  server.mjs (w8), package.json (w4). Findings → report only.

## Do
1. **Run the suite**: `npm test`, `npm run qe:static`, `npm run qe:res`.
   Any failure is a live bug — dig.
2. **Read every owned file fully.** Targets:
   - `track-worker.js`: Worker lifecycle — what happens on MediaPipe
     init failure, model 404, malformed messages, double-init, terminate
     mid-callback? OffscreenCanvas fallback paths?
   - `hands.js`/`face.js`: landmark arrays assumed length-21? NaN pass-
     through? EMA/div-by-zero on first frame or after tracking loss?
     state reset between camera stops? `kind`/`side` classification on
     degenerate input?
   - `glove.js`: canvas ops on missing landmarks, ctx state leaks,
     scale=0.
   - `index.html`/`lineup.html`/`gallery.html` inline code: addEvent-
     Listener leaks across navigations, unhandled promise rejections,
     localStorage JSON.parse without try/catch (corrupt 'boxing:npc'
     value = crash on lineup?), missing-element null derefs, WebGL-
     context-lost handling (round 1 added a lineup fallback — verify it
     actually works: does it cover context creation failure AND
     context-lost events?), race between module scripts.
   - Resource paths: every src/href/import/fetch in your files must
     resolve on the live server — curl them. 404 = bug.
3. **Extend test/qe-static.mjs** with checks for the bug CLASSES you
   find (e.g. unguarded JSON.parse, missing await-catch, TODO/FIXME
   left in shipped code) — keep it fast and deterministic.
4. Fix every bug in your files. Re-run `npm test` + `npm run qe:static`
   — must stay green. Node-importable modules (hands/face logic) can be
   exercised directly under node; write throwaway probes in /tmp.

## Report `.teamwork/reports/w9-qe-pages.md`
Findings table (sev | file:line | evidence | fix | verification),
qe-static additions, resource-404 list, bugs routed to other owners.
