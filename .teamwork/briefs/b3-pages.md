# Brief: b3-pages — Page correctness wave 3 (NO browser)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first (wave-3 rules;
boxing.html + game.js + boxing-page.mjs are user-hot read-only).

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` (curl it for resource checks).
- Tools: `npm run qe:static`, `npm run qe:res`, node + curl. NO browser —
  b3-soak/b3-e2e/b3-render cover live pages.
- Rounds 1-2 fixed your layer already (roster desync, rAF doubles,
  tracker bail). Hunt deeper classes.

## Your files (exclusive — fix freely)
- `index.html`, `lineup.html`, `gallery.html` (+ inline modules)
- `shared/hands.js`, `shared/face.js`, `shared/glove.js`,
  `shared/track-worker.js`
- `test/qe-static.mjs` (extend)

## Do — classes nobody audited yet
1. **localStorage as attack surface**: every getItem→JSON.parse or
   string-injection into DOM (innerHTML insertAdjacentHTML, style attr)
   in your files — corrupted/adversarial values (scripts, quotes, huge
   payloads, wrong types). `boxing:npc` corruption is covered — find the
   OTHER keys (stats/history/settings) and what they feed.
2. **Timing races**: module scripts racing (import order), double
   DOMContentLoaded paths, async init interleaving with user clicks
   before ready (click Enter before roster builds → dead nav?).
3. **Visibility/resize**: resize mid-render (canvas re-measure),
   devicePixelRatio changes, orientation — does anything cache stale
   sizes permanently?
4. **hands.js/face.js/track-worker.js deeper**: message ordering across
   reset, worker error events mid-infer, half-initialized state read by
   callers, `terminate()` idempotence, EMA across camera-resolution
   change (span baseline measured in old units?), timestamp order
   (performance.now vs video.currentTime mixing).
5. **i18n/locale robustness**: toLocaleString/parseFloat on numbers from
   storage; `,` vs `.` decimals in any parsed value.
6. **qe-static.mjs**: add checks for the bug classes you find. Must keep
   passing on all 4 pages.
7. `npm test` + `npm run qe:static` + `npm run qe:res` green after fixes.

## Hard rules
No git, no .env, no new deps, stay in boundaries. Throwaway probes in
/tmp. Report `.teamwork/reports/b3-pages.md` (findings table + qe-static
additions + routed bugs).
