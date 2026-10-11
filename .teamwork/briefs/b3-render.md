# Brief: b3-render — Render layer wave 3 (light Chromium + deep audit)

Read `.teamwork/prompt_draft.md` + `.teamwork/CONTRACT.md` at
`/home/ANT/unclockable-knighthacks-2026/.teamwork/` first. NOTE the A7
change: glove guard-pose holdover is intentionally removed — don't
flag/re-add it. boxing.html + game.js are user-hot READ-ONLY.

## Context
- Repo: `/home/ANT/unclockable-knighthacks-2026/spatial-objects`; live
  server `http://127.0.0.1:8791/` (never kill/restart).
- Tooling: `node test/qe-runner.mjs <url> --name b3-<n> --seconds N`
  (self-gates). No Vulkan/--gpu flags — Vulkan is broken box-wide.
- Rounds 1-2 cleaned NaN poisoning, disposals, manifest. Hunt
  SECOND-ORDER render bugs now.

## Your files (exclusive — fix freely)
- `shared/boxing/fx.js`, `scene.js`, `entrance.js`
- `shared/boxing/assetManifest.json`
- `shared/boxing/mitts/` (index.js, classic.js, any siblings)
- READ-ONLY: ring.js (b3-fuzz), npc.js (b3-e2e), boxing.html/game.js (hot)

## Do
1. **Round-transition & rematch render state**: after win/lose→replay —
   stale particles, KO zoom left on, damage wash (npc-owned but scene
   side effects), camera impulses, confetti still flying in round 1.
   Trace `reset()`/`game.reset()` paths through YOUR files: what do they
   forget to clear?
2. **fx.js under sustained load**: run the events at max rate for 10k
   sim-steps in node (fx is import-safe): particle pool exhaustion,
   sprite count vs pool cap, z-fighting stains (hundreds accumulate —
   is there a cap/disposal?), the `dispose()` w6 added — does the
   caller ever call it?
3. **mitts renderer**: per-frame canvas ops — grad/shadow creation per
   draw? Path2D reuse? `setTransform` state bleed (ctx.save/restore
   balance — a leak corrupts every later draw). Fuzz draw() 5k× with
   garbage-but-plausible args.
4. **entrance.js**: mid-entrance skip/reset (intro skipped at 20%, 80%),
   double-start, dispose on early exit. What does it leave running?
5. **qe-runner verify** after fixes: `boxing.html?vid=test-input.mp4`
   20s, 0 errors, note p50.
6. Mockup dirs read-only audit still applies (dead links/assets).

## Resource rules (HARD)
qe-runner self-gates. Custom Chromium: load1<10 && MemAvail>2500MB,
ONE browser, niced. No Vulkan flags.

## Report `.teamwork/reports/b3-render.md`
Findings (sev | file:line | evidence | fix | verification), rematch-state
audit table, mockup findings.
