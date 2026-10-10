# Report: worker-scene — boxing page, ring world, lineup picker, e2e

## Built (all within owned files)

- `spatial-objects/shared/boxing/scene.js` — `buildScene(THREE, renderer)` →
  `{scene, update(dt,state), ring}`. Cartoon ring: ink-outlined mat with
  canvas-painted apron logos, 4 posts (red corner = player, blue = NPC),
  3 rope runs with sagging catenary curves, corner pads, crowd rows of
  bobbing capsule blobs in palette colors fading into a warm paper void,
  hemisphere + warm key light + rim fill. `update()` animates crowd bob,
  rope tension wobble on hits (`state.lastBlow`), and telegraph-corner
  pulse. Node-importable (all THREE use is behind the passed namespace).
- `spatial-objects/shared/boxing/npc.js` — `createNpc({THREE, manifest?})`
  async adapter. Reads `localStorage['boxing:npc']`, matches manifest
  entry → GLTFLoader GLB (scaled/grounded via manifest `yOffset`/`scale`),
  else `buildBoxer` proto variant (default `bubble`), else a tiny
  emergency primitive boxer. ANY GLB failure → procedural fallback.
  `tick(dt, fightState)` maps `state.npc.action` + telegraph to poses;
  GLB clips driven by `THREE.AnimationMixer` with keyword matching
  (idle/attack/hurt/down/celebrate/windup/block); rigless GLBs get a
  procedural idle sway; `state.npc.down` flattens any model. When the
  telegraph object disappears mid-punch the adapter stashes the last
  telegraph kind so the punch pose stays correct.
- `spatial-objects/shared/boxing/game.js` — `createGame({THREE, renderer,
  cam, world, hands, face, npc?, fightOpts?})`. Owns `FistTracker`,
  `RingSim`, `Fight`. `step(dt, handsState, faceState)` →
  `{state, punches, events, sim, npc}` runs the contract pipeline:
  tracker.update → `sim.step(dt,{sway,dodge,npcDir:fight.npcDir()})` →
  `fight.step(dt,{punches,guard,sway,distance:sim.distance()})` →
  world/npc update; returns drained `state.events` for HUD/SFX.
  `calibrate()` = tracker.calibrate. Node-importable pure glue.
- `spatial-objects/shared/boxing/boxglove.js` — wraps `shared/glove.js`
  `drawGlove` (unmodified); `drawBoxGlove(ctx,x,y,s,hand,P,opts)` defaults
  `style:'boxing'`, recolors to boxing red with ink outline + cuff/star
  detailing, preserves glove-icon cartoon flavor.
- `spatial-objects/boxing.html` — self-contained page modeled on job.html's
  structure (same importmap → vendored three r170, `#world` + `#hands`
  canvases, mast/bout-card/score/peep/legend skeleton) restyled to the cute
  house palette (paper bg, ink, coral/sun/leaf/sky, Fredoka-first stack,
  rounded card, no emojis). HUD: player+NPC HP bars (uses `maxHp`),
  stamina bar, round + clock, telegraph `!` flash over the NPC corner,
  event feed (JAB!/BLOCKED/KO! etc. driven by drained `state.events` +
  `lastBlow` kind). Webcam via MediaPipe Hands+Face when available;
  mouse fallback (left/right drag = gloves, shift-drag = sway); `C`
  recenter/calibrate; `M` mute. Debug: `window.__forceHands` synthetic
  input, `window.__boxing = {THREE, scene, cam, game, npc, fight, sim,
  tracker, state, log, pressLog}`.
- `spatial-objects/lineup.html` — picker: loads `assetManifest.json`,
  filters out `notes` starting with `PROP`, merges with
  `protoBoxer.VARIANTS`/`VARIANT_INFO`. One shared Three renderer renders
  every cell (GLB thumb w/ mixer idle or sway, proto via `snap('idle',0)`);
  per-candidate failures marked `unavailable`, never crash. Click →
  `localStorage['boxing:npc']=id` + selection ring + "enter the ring ▸"
  link enabled → `boxing.html`.
- `spatial-objects/test/boxing-page.mjs` — puppeteer e2e, chromium
  `/usr/bin/chromium`, jobverify-style SwiftShader/fake-media flags,
  `PORT=8890 node server.mjs` (spawns only if port dark). Asserts: zero
  page errors, `__boxing` exists, scripted growing-hand punch via
  `__forceHands` emits `player-punch`, `npc.hp < 100`, `sim.distance()`
  shrinks while NPC presses, screenshot → `/tmp/boxing.png`. PASS lines,
  nonzero exit on failure.

## Deviations / decisions worth noting

- **`?notrack=1` param added to boxing.html**: skips webcam + MediaPipe
  init (trackers stay null; `__forceHands` still feeds the tracker).
  Needed because SwiftShader+MediaPipe dropped real fps so low that
  wall-clock e2e windows were flaky; production path unchanged.
- **Synthetic punch timing**: `FistTracker` emits on apex/retraction or
  throw-timeout — a hand that vanishes mid-growth cancels the punch. Test
  + mouse fallback grow span over ~6 frames, HOLD ~400 ms, then clear.
- **`audio.js` wired in boxing.html** (wasn't in original brief; worker-audio
  shipped it): lazy `import()`, unlock on first pointerdown/keydown, drained
  `events` → `handleEvent`, per-frame `update(dt,state)`, `M` toggles
  `audio.muted`. Graceful no-op if the module is absent.
- **Manifest `yOffset`** treated as world lift/grounding (confirmed against
  real GLBs); prop entries (`notes` ^`PROP`) excluded from the fighter
  roster — 9 cells render: 6 GLBs + 3 proto variants.
- **`pressLog`**: page pushes `sim.distance()` samples while phase is
  `fighting` and `fight.npcDir()==='press'` so the e2e can observe the
  press shrink without peeking inside modules.
- NPC HP row label shows first word of the (often long) manifest name to
  fit the 44 px label; bout card keeps the full name.

## Verified

- `node --check` clean: `scene.js`, `game.js`, `npc.js`, `boxglove.js`,
  `test/boxing-page.mjs`, and extracted inline module scripts of
  `boxing.html` + `lineup.html`.
- `node test/boxing-page.mjs` → **ALL CHECKS PASSED**, exit 0:
  boot/no-errors, `__boxing`, 6 swings → `player-punch,player-hit,npc-hit`,
  `npc.hp=89`, distance 1.66→1.49 while pressing, `/tmp/boxing.png`.
- Lineup: 9/9 cells render, zero console errors, selection persists to
  `localStorage`, enter-ring link enables (screenshot `/tmp/lineup.png`).
- GLB NPC path: `boxing:npc=kenney-blocky-red` loads real GLB w/ mixer,
  poses track fight state, no errors (screenshot `/tmp/boxglb.png`).
- Re-ran e2e after wiring `audio.js` — still all green.

## Integration risks / notes for integrator

- `game.js` imports sibling modules at top level — if any sibling module
  is absent the page catches it and idles the ring (`status` shows
  "ring ready — modules pending"); no repo stubs were created.
- First `pointerdown`/`keydown` unlocks WebAudio — autoplay-safe.
- Camera pose: `sim` drives player XZ; camera lerps to player position +
  sway lean each frame; `C` re-centers via tracker calibrate only (sim
  keeps its truth).
- `npc.js` fetches `shared/boxing/assetManifest.json` relative to the page;
  works from both `boxing.html` and `lineup.html`.
- Port 8890 is reserved for this e2e per brief.
