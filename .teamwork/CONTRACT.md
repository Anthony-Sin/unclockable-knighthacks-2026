# Boxing Pivot — Shared Contract (READ FULLY, BUILD TO THIS EXACTLY)

## Project
`spatial-objects/` (in `/home/ANT/unclockable-knighthacks-2026`) is a webcam
hand-tracked 3D sim: vendored Three.js (importmap `three`), MediaPipe
HandLandmarker (`shared/hands.js`), FaceLandmarker (`shared/face.js`),
cartoon-glove canvas renderer (`shared/glove.js`), static server `server.mjs`.
We are adding a **Punch-Out!!-style cute boxing game**. First-person: the
player's real hands are their gloves (bigger hand on camera = closer to
screen = punch reaching out). An NPC boxer and the player both auto-move
around a cartoon ring via a pathfinding/steering layer — the player never
walks manually; head sway leans/dodges.

## House art style ("cute / Nintendo")
From `mockups/CONVENTIONS.md`: warm paper `#FFF8EC`/`#FDF3E3`, ink outlines
`#2B2118` (2-3px equivalent), chunky rounded forms, saturated flat accents —
coral `#FF6B57`, sun `#FFC53D`, leaf `#4FB06D`, sky `#5DA9E9`, berry `#B565D8`.
Sticker/doodle energy, springy squash-and-stretch motion, big readable
silhouettes. NO photorealism, NO purple gradients/glassmorphism, NO dark neon.
Everything on screen must share this palette — mismatched assets are a defect.
No emojis in UI; draw with shapes.

## Rules for all workers
- Plain ES modules, no build step, no new npm deps, no external runtime calls.
- Three.js only via `import * as THREE from 'three'` (importmap) or passed in.
- Pure-logic modules must be importable by `node` directly (import THREE lazily
  or not at all — game logic must not require WebGL/DOM).
- Touch ONLY the files listed under "Your files" in your brief. If you need a
  change in someone else's file, note it in your report instead.
- Write a final report to `.teamwork/reports/<your-name>.md`: what you built,
  API notes/deviations, how to test, known gaps.

## Module contracts

### shared/boxing/ring.js  (owner: worker-ring)
```js
export class RingSim {
  constructor(opts = {})   // {radius=2.6, npcSpeed=1.4, playerDrift=1.0}
  player = { pos:{x,z}, radius }
  npc    = { pos:{x,z}, radius }
  step(dt, input)
  // input = { sway:-1..1,                 // head lean → lateral player drift
  //           playerDodge:-1|0|1,         // committed dodge hop
  //           npcDir:'press'|'circle'|'retreat'|'hold',
  //           npcStunned:false }
  // Moves BOTH fighters every step (auto footwork — nobody walks manually):
  // NPC steers toward/around/away from player per npcDir at preferred range;
  // player drifts with sway + keeps ring position legal. Soft-collision push
  // apart, clamp to ring radius. Smooth accel, no teleports.
  distance()   // center gap between fighters
  angleToNpc() // radians, bearing player→npc in world
  reset()
}
```

### shared/boxing/fists.js  (owner: worker-fists)
```js
export class FistTracker {
  constructor(opts = {})
  update(handsState, faceState, dt)
  // handsState = Hands.state shape: {hands:[{kind,side,palm,wrist,lm,...}]}
  //   lm = 21 MediaPipe landmarks, normalized 0-1, x already mirrored
  //   kind ∈ 'pinch'|'palm'|'fist'|'point'|'other'; side ∈ 'left'|'right'
  // faceState = Face.state: {found, nose:{x,y}, size}
  punches  // consumer drains each frame: [{kind:'jab'|'cross'|'hook'|'uppercut',
           //   side:'left'|'right', power:0..1}]
  guard    // {left:0..1, right:0..1} — glove raised toward face/ready
  sway     // -1..1 head lean vs calibrated center
  calibrate()
  debug()  // {span:{left,right}, reach:{left,right}, guard, sway}
}
// DEPTH MODEL (the core mechanic — "hand grows bigger = closer"):
//   span = hypot(lm[9].x-lm[0].x, lm[9].y-lm[0].y)  (wrist→middle-mcp, norm.)
//   baseline = EMA of span while hand is slow; reach = span/baseline.
//   A punch = fast positive d(reach)/dt through a threshold while fist-ish;
//   jab=left lead / cross=right rear simplification: kind by side + lateral
//   velocity (hook) + vertical velocity (uppercut). power ∝ peak reach.
```

### shared/boxing/fight.js  (owner: worker-fight)
```js
export class Fight {
  constructor(opts = {}) // {playerHp=100, npcHp=100, npcName='PIP', roundLen=90}
  step(dt, inputs)
  // inputs = { punches:[...from FistTracker...], guard:{left,right},
  //            sway, distance, riseAspect (overlay W/H),
  //            riseTouch:[{x,y}…]  // glove palm spots — a glove pressed inside
  //                                // the ring tags it too (entry edge only) }
  state = {
    phase:'intro'|'fighting'|'playerdown'|'npcdown'|'win'|'lose',
    round, timeLeft, bout   // bout increments in reset() — pages re-arm
                          // per-bout state (corner.used) off it, immune to
                          // frames that burn through intro/countdown
    player:{hp, stamina, score, status:'idle'|'punching'|'blocking'|'hurt'|'down', hurtT},
    npc:{hp, stamina, name, action:'idle'|'press'|'circle'|'retreat'|'windup'|'punch'|'block'|'hurt'|'down'|'celebrate', actionT, telegraph:null|{kind:'jab'|'hook'|'upper', t01}},
    events:[]  // drained by consumer each step:
               // 'player-punch' 'player-hit' 'player-miss' 'npc-hit' 'npc-blocked'
               // 'npc-punch' 'player-hit-taken' 'player-blocked' 'player-dodged'
               // 'ko' 'round-start' 'win' 'lose'
               // 'rise' 'rise-hit' 'rise-miss' 'rise-fade' 'revive'  (get-up QTE)
    rise:{active, need, got, t01, each01, x, y, r, depth}
        // playerdown beat-the-count QTE — escalates per knockdown:
        // need = riseTargets + (depth-1)·riseStepN, fuse −riseStepFuse, r −riseStepR
  }
  npcDir()   // → 'press'|'circle'|'retreat'|'hold' (drives RingSim)
  reset()
}
// NPC telegraphs: 'windup' w/ telegraph{t01} before 'punch'. Player punch hits
// if distance <= reach (~1.1) && npc not blocking/in i-frames; guard>=.6
// halves damage; |sway|>=.6 at impact dodges. Stamina gates punch spam.
// KO at hp<=0 → down phase → win/lose.
```

### shared/boxing/protoBoxer.js  (owner: worker-proto)
```js
export const VARIANTS = ['bubble', 'blocky', 'bean']  // ≥3 distinct cute styles
export function buildBoxer(THREE, {variant='bubble', palette={}} = {})
// → { group,            // feet at y=0, faces +Z, chibi ~1.3 units tall
//     parts,            // {head, torso, gloveL, gloveR, ...} named nodes
//     pose(name, t01),  // 'idle'|'windup'|'jab'|'cross'|'hook'|'block'|'hurt'|'down'|'celebrate'
//     tick(dt,state),   // breathing/idle bounce + blend toward pose()
//     dispose() }
// All primitives + toon/flat materials, ink-outline trick (inverted hull or
// edge geometry ok). Big head, big eyes, big gloves. Palette defaults = house.
```

### shared/boxing/assetManifest.json  (owner: scout-assets)
```json
{ "candidates": [
  { "id":"kenney-x", "name":"...", "type":"glb",
    "path":"vendor/models/glb/boxing/<file>.glb",
    "source":"<url>", "license":"CC0", "scale":1.0,
    "yOffset":0, "notes":"has rig? recolorable? polycount" } ] }
// 3-6 real downloaded candidates. Files actually on disk. Free licenses only.
```

### Scene layer (owner: worker-scene) — consumes everything above
`boxing.html` (self-contained like job.html, importmap for three,
`window.__forceHands` hook + `window.__boxing` debug handle),
`shared/boxing/scene.js` (renderer/world/ring/props/HUD),
`shared/boxing/game.js` (glue: trackers → RingSim → Fight → scene),
`shared/boxing/npc.js` (adapter: fight.action → boxer pose; loads
`localStorage['boxing:npc']` choice → manifest GLB or protoBoxer variant),
`lineup.html` (character selection: renders every manifest candidate +
every protoBoxer VARIANT in a labeled grid; click → stores
`localStorage['boxing:npc']=id`), `test/boxing-page.mjs` (puppeteer).
Camera: over-the-gloves first person — camera at player.pos + eye height,
aimed along angleToNpc(); gloves overlay via drawGlove recolored boxing-red.
```

## ADDENDUM — user clarifications (all workers MUST apply)

**A1. Player does NOT walk (but dodges lean the whole upper body).**
The player's FEET stay planted — no locomotion/walking at all. What moves
is the head/upper body: head sway (face.js) is THE dodge input, and it
should read as the whole torso leaning — i.e. a SMALL proportional
below-the-neck offset is allowed (within reason) to sell the dodge: the
first-person camera translates+rolls slightly with sway, glove positions
shift with the lean, and any visible shoulder/chest hint tilts. Think
Punch-Out!! — Little Mac's feet never move but dodging visibly leans his
body. RingSim: player.pos stays in the corner zone (tiny settle only);
no player auto-drift, no sway-driven foot movement. NPC does all ring
movement. fight.js consumes sway only as the dodge input — a committed
|sway| >= threshold lean avoids a telegraphed punch.

**A2. Stamina is a first-class system (build it out).** Every punch costs
stamina; stamina regen is slower while punching and while being hit;
exhausted (stamina < threshold) → weaker/slower punches, slower guard, and
a visible "gassed" state. NPC has stamina too and gets tired after combos.
HUD shows a stamina bar per fighter. Exported in TUNING.

**A3. Screen/game-feel effects (worker-scene owns).** Juice matters:
impact flash + screen shake on every landed hit, cartoon sweat/red splash
particle burst at impact point (cute but visible — think Punch-Out!! sweat
spray; a red-ish splash option is fine), red vignette pulse when the
PLAYER takes a hit, zoom/shake KO moment, star/dizzy particles on 'hurt'
and 'down'. All effects in shared/boxing/scene.js (or a fx module inside
scene.js) driven by fight.state.events.

**A4. Boxing gloves, generalized.** The on-screen hands are BOXING GLOVES,
not work gloves — a single chunky rounded mitten shape (big rounded main
lobe, thumb hint, wide cuff band, lace dots or strap) drawn at hand
position, scaled by hand span (bigger = closer). Do NOT need per-finger
articulation — quality over tracking fidelity: smooth the position with
EMA, rotate slightly with hand angle, punch = glove lunges toward viewer
(scale up fast). Owned by worker-scene in shared/boxing/boxglove.js — a
new generalized renderer (may borrow blobPalm technique from glove.js but
does not reuse its finger chains).

**A5. Audio (worker-audio owns `shared/boxing/audio.js`).** Basic but real
game audio, ALL procedural Web Audio — no audio files, no network, no deps:
- `export class BoxingAudio`: lazily creates AudioContext on `unlock()`
  (call from first user gesture — autoplay policy), master gain, `muted`
  toggle, and `handleEvent(evt, state)` mapped to fight events.
- SFX vocabulary (synthesized): round bell (3× FM ding on 'round-start'),
  punch whoosh (filtered noise burst, pitch/power-scaled by punch kind),
  impact thwack on 'player-hit'/'npc-hit' (low sine thud + noise snap;
  heavier for hook/uppercut), dull 'player-blocked'/'npc-blocked' thud,
  airy 'player-dodged' whoosh, heavier low 'player-hit-taken', dramatic
  'ko' (buzzer + crowd swell), short 'win'/'lose' jingles (few-note arps).
- Crowd bed: looped filtered-noise murmur running during 'fighting',
  swells on landed hits and KO. Keep it subtle — cute arcade, not stadium.
- Node-safe: module must import in plain node WITHOUT a DOM/AudioContext
  (create nothing at import). Export a pure `EVENT_SFX` map for testing.
- game.js (scene worker) instantiates it and pipes fight events through —
  scene worker should call `audio.handleEvent` if `window.BoxingAudio` or
  the import exists, tolerating its absence (try/catch dynamic import).

**A6. Scene polish from playtest (worker-scene owns).**
- **Eye-level camera per fighter**: camera height must adapt to the
  SELECTED npc's actual eye/head height (after manifest scale + yOffset or
  protoBoxer height), not a fixed constant — eye-to-eye framing whether the
  pick is a stubby gnome or a tall fighter. Read the loaded model's bbox
  (or buildBoxer's reported height) once at spawn; camera.y ≈ its eye line
  and the aim pitch centers on its chest/head.
- **Push physics (feel)**: landed blows shove the receiver. When the PLAYER
  is hit → camera impulse backward + roll/tilt with spring return (not just
  shake); when the NPC is hit → its visible body gets a backward knock
  impulse along the punch direction that springs back (flinch translate,
  not a ring.js position change — visual layer). Stronger on hook/uppercut
  and KO (KO already has zoom+shake; add the shove). Implement as a
  scene-layer impulse/spring so fight.js stays logic-pure.
- **Player gloves = blocky style**: boxglove.js restyles toward the Kenney
  BLOCKY look the user picked — chunky squared/rounded-rect mitt silhouette
  (blockier lobe, flat-ish knuckle face), bold cuff, still ink-outlined and
  span-scaled. Keep the generalized renderer (no per-finger tracking).

**A7. Scene polish round 2 (worker-scene owns).**
- **Gloves never disappear**: when hand tracking drops (hand leaves frame,
  detector miss — THIS HAPPENS OFTEN mid-punch), the on-screen glove must
  NOT vanish — hold last position and drift back to a neutral guard pose
  (bottom-quarter of screen, fists up), optionally dimmed ~60% to signal
  "lost". Same for mouse fallback when not dragging. Gloves are the
  player — always on screen, every frame.
- **NO FINGERS EVER**: the gloves are solid boxing mitts — a single chunky
  blocky lobe + cuff (A4/A6 style). Fingers, knuckle segments, or any
  per-finger articulation visible on screen = a bug. When a real hand is
  tracked the mitt rides its position/angle, but the SHAPE is always the
  same blocky glove.
- **Hit-push feedback**: when the player takes a hit, the camera/view is
  physically shoved BACK (impulse + spring return, harder on hooks/upper —
  A6 applies; user re-requested explicitly: hits push you back).
- **Blood/damage ON the character**: the NPC accumulates visible damage —
  bruise/cut decals or red smears appearing on face/body as hp drops
  (3+ damage stages), blood splatter burst on heavy hits (hook/upper/KO).
  Cartoon-gory is fine per user request — keep it stylized not realistic.
- **Block visual cue**: when player guard is up (or a block lands), show a
  clear cue — gloves raise to cover center-screen + a "BLOCKED"/guard
  flash or shield shimmer on successful block. Blocking should READ.
- **HUD contrast**: all on-screen text must contrast its background —
  white/paper text on the 3D scene needs an ink outline/shadow or a
  pill/panel behind it; no bare dark text on the scene and no bare light
  text on light panels. Audit every HUD element.
- **Player idle motion**: the player's presence must animate like the
  NPC does — subtle camera bob/weave (boxing rhythm), gloves bob in a
  guard loop (offset phase per glove), gloves ride the head-lean on
  dodges. A frozen static view is a bug.
- **More impact effects**: blood/sweat splash particles fly OUT of the
  impact point toward/past camera on clean hits (arcs + gravity), stay on
  the mat a beat, plus the existing flash/shake. Hits should feel wet.

## Verification
- Each logic owner ships `test/boxing-<module>.mjs` runnable as
  `node test/boxing-<module>.mjs` (no server/browser needed; fake input).
- worker-scene ships `test/boxing-page.mjs` (puppeteer, chromium at
  /usr/bin/chromium, page served via `PORT=8890 node server.mjs`; drive the
  fight through `window.__forceHands`). Integrator runs it after merge.
- Zero console errors on load; `npm test` legacy tests still pass.
