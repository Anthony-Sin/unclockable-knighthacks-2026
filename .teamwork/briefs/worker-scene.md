# Brief: worker-scene (boxing page, world, lineup viewer, e2e)

You are building the **visual/integration layer** for a Punch-Out!!-style
webcam boxing game in `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
FIRST read `/home/ANT/unclockable-knighthacks-2026/.teamwork/CONTRACT.md`
fully — all module APIs are fixed there. Sibling workers are building
`shared/boxing/{fight,ring,fists,protoBoxer}.js` and `assetManifest.json`
IN PARALLEL — import them per the contract exactly; if a file doesn't exist
yet when you test, create a TEMP stub under /tmp only (never in the repo).
Read `job.html` fully first — copy its page structure, importmap, style
variables, mouse-fallback and `__forceHands`/`__job` debug-hook patterns.

## Your slice
1. **`shared/boxing/scene.js`** — the cartoon ring world: canvas-textured or
   flat-colored ring (mat, posts, ropes), crowd/void backdrop, warm lighting,
   paper/ink toon feel. Player's red corner vs NPC's blue corner.
   `buildScene(THREE, renderer)` → {scene, ring meshes, update(dt,state)}.
2. **`shared/boxing/npc.js`** — NPC adapter: given `localStorage['boxing:npc']`
   id → load matching `assetManifest.json` GLB via GLTFLoader, else
   `buildBoxer` variant (default 'bubble'). Maps `fight.state.npc.action` +
   telegraph → poses (windup = lean back + angry brows; down = flatten).
   Falls back to protoBoxer on ANY GLB load failure.
3. **`shared/boxing/game.js`** — glue: owns Hands, Face, FistTracker,
   RingSim, Fight; per frame: trackers → sim.step(dt,{sway,dodge,npcDir:
   fight.npcDir()}) → fight.step → scene/npc update → HUD.
4. **`boxing.html`** — self-contained page (sibling of job.html): importmap,
   `#world` canvas + `#hands` glove overlay canvas, mast/card/score/peep/
   legend HUD restyled to the CUTE house palette (chunky rounded card,
   Fredoka-ish font stack, saturated accents — see CONTRACT art section;
   keep layout skeleton from job.html). HP bars for player+NPC, round
   indicator, telegraph flash ("!"), event feed ("JAB!", "BLOCKED", "KO!").
   Gloves overlay = `drawGlove` recolored to boxing-red with glove-icon
   flavor (add optional `opts.style='boxing'` param INSIDE YOUR OWN wrapper
   module `shared/boxing/boxglove.js` that calls drawGlove — do NOT edit
   shared/glove.js). Mouse fallback: left-drag = left glove thrust, right-
   drag = right glove, shift-drag = sway. `C` = recenter/calibrate.
   `window.__forceHands` synthetic input + `window.__boxing` = {fight, sim,
   tracker, THREE, scene} debug handle for tests.
5. **`lineup.html`** — character picker: loads `assetManifest.json` +
   `protoBoxer.VARIANTS`, renders each candidate in a labeled thumbnail cell
   (small shared Three scene per cell or one scene with grid layout; idle
   pose + name + license). Click → `localStorage['boxing:npc']=id` +
   visual selection + "enter the ring" link to boxing.html. Works when some
   candidates 404 (mark them unavailable, don't crash).
6. **`test/boxing-page.mjs`** — puppeteer e2e (copy launch pattern from
   `test/jobverify.mjs`; chromium /usr/bin/chromium; serve via
   `PORT=8890 node server.mjs` — you own port 8890). Assert: boxing.html
   loads with zero page errors; `__boxing` exists; injecting
   `__forceHands` with a scripted growing-hand punch emits a punch; NPC
   takes a hit (npc.hp < 100 or 'player-hit'/'npc-hit' event seen);
   sim.distance() shrinks while npc presses; screenshot to
   /tmp/boxing.png. NOTE: sibling modules may not exist yet — write the
   test but DO NOT be blocked by their absence; leave run to integrator.

## Your files (ONLY these)
- `spatial-objects/boxing.html`, `spatial-objects/lineup.html`
- `spatial-objects/shared/boxing/scene.js`, `game.js`, `npc.js`, `boxglove.js`
- `spatial-objects/test/boxing-page.mjs`
- `.teamwork/reports/worker-scene.md`

Do NOT edit: shared/* existing files, other html pages, server.mjs,
package.json, fight/ring/fists/protoBoxer modules. Note integration risks
in your report.
