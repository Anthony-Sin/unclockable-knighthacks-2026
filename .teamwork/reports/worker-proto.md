# worker-proto — procedural cute NPC boxer (protoBoxer.js)

## What I built
`shared/boxing/protoBoxer.js` — a ~1.3-unit chibi Punch-Out!! boxer built
entirely from Three.js primitives + flat/toon materials in the house
palette (warm paper, `#2B2118` ink, coral/sun/leaf/sky/berry accents).
No skeleton, no assets, no DOM, no top-level `three` import — THREE is
passed in to `buildBoxer`, so the module imports cleanly under plain node.

**Variants** (`export const VARIANTS = ['bubble','blocky','bean']` —
string ids exactly per contract; `VARIANT_INFO` added for lineup labels):
- `bubble` — sphere-stack blob: belly sphere, ball head, sprout on top,
  coral gloves, sun shorts.
- `blocky` — voxel-ish boxes: box torso/head, ink flat-top hair + fringe,
  sky gloves, leaf shorts.
- `bean` — capsule bean body + melted head cap, stem+leaves tuft,
  berry gloves, sky shorts.

Each variant has its own palette flavor (VPAL table), overridable via the
`palette` arg `{skin,glove,shorts,trim,cheek,ink,paper}`.

**Rig**: `group → root(bounce/fall) → squash(squash-&-stretch) → parts`.
Named `parts`: root, squash, torso, shorts, head, eyeL/R, browL/R, mouth,
tuft, armL/R, gloveL/R, legL/R, footL/R. Stub arms/legs are shoulder/hip
pivots whose capsule bone auto-aims (+Z local, `YXZ` order) at the glove/
foot each tick and stretches thin like a rubber hose (scale ~0.55–3.2).

**Face**: per-eye mode groups toggled by `.visible` —
`open` (paper white + ink pupil), `x` (crossed bars), `spiral` (nested
rings = dizzy), `happy` (◠ arcs). Brows rotate for anger/worry; mouth has
smile/grin/o/flat. Blush cheeks on all variants.

**Ink outlines**: inverted hull — every solid part gets a child mesh
sharing its geometry with a shared `MeshBasicMaterial({color:ink,
side:BackSide})` scaled ×1.055. ~58–60 meshes per boxer.

## API (contract + extras)
`buildBoxer(THREE, {variant='bubble', palette={}})` →
`{group, parts, pose(name,t01), tick(dt,state), dispose()}` per contract,
plus `snap(name,t01)` (instant apply — for lineup thumbnails),
`variant`, `height`. `tick(dt,state)` writes `{pose,k,time}` into `state`
when given a mutable object.

- `pose()` fills a fresh-from-rest target table; `tick()` exp-blends each
  node toward it (gloves @ rate 22, body @ 12 → punch snap), then adds
  breathing (reduced when down), ~3.7s blink cycle, pupil wander, tuft
  wiggle — all additive so they never fight the pose.
- Poses: idle, windup (angry telegraph), jab, cross, hook (arced whip),
  block, hurt (X-eyes recoil), down (easeOutBounce fall + splat + spiral
  eyes), celebrate (happy eyes, hops). Squash-and-stretch everywhere;
  punches smear the glove scale on the extension axis.

### t01 semantics (assumptions recorded)
- `idle`/`celebrate` are **cyclic**: they consume raw unclamped t01 so a
  seconds-accumulating `actionT` keeps looping (clamping would freeze
  them at k=1).
- `down` is a **held state**: npc.js pins t01=1 forever, so an internal
  `downT` ramp (dt-driven, ~2.2/s) plays the bounce-fall once even when
  the caller never sweeps t01. Partial t01 (<1) is still respected
  verbatim for scrubbing; `snap('down')` jumps to the fallen frame.
- Everything else uses clamped t01; `attack()` envelope = snap out (.25),
  hold (.47), ease back.

## How to test
```
cd spatial-objects
node --check shared/boxing/protoBoxer.js   # clean
node test/boxing-proto.mjs                 # all green (35 asserts)
```
Test uses a minimal stub THREE (Group/Mesh/V3/geos/mats defined in-file)
— no WebGL, no node_modules needed. Also verified against the real
vendored `three` package: bbox minY≈0 feet, height 1.32–1.38, down pose
rests on the mat (minY≈0), jab glove reaches z≈0.68.

## Verified against consumers
- `npc.js` emits exactly the 9 pose names ('upper'→'cross' its side) and
  calls `pose(name,t01)` + `tick(dt, npc)` every frame — compatible.
- `lineup.html` iterates `VARIANTS` string ids and calls
  `pose('idle',0)`/`tick(dt)` — compatible.
- Unknown variant/pose → warn once + fall back to bubble/idle (no throw).

## Known gaps / notes for others
- `npm test` legacy suite can't run — `test/forcepull.mjs` etc. were
  deleted by the pivot itself, not by me. My test is standalone green.
- MeshToonMaterial is used when present (falls back to Lambert/Basic);
  it needs scene lights — worker-scene should keep a warm hemi+dir rig.
- Materials are not `flatShading`ed — blocky keeps smooth shading which
  still reads flat under toon steps; tweak if the scene looks off.
- dispose() frees all tracked geos/mats but leaves the node tree intact
  (so consumers holding part refs don't crash post-dispose).

## Files changed
- `spatial-objects/shared/boxing/protoBoxer.js` (new, ~620 lines)
- `spatial-objects/test/boxing-proto.mjs` (new)
- `.teamwork/reports/worker-proto.md` (this file)
