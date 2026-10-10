# Brief: worker-proto (procedural cute boxer)

You are building the **procedural cartoon boxer** for a Punch-Out!!-style
webcam boxing game in `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
FIRST read `/home/ANT/unclockable-knighthacks-2026/.teamwork/CONTRACT.md` fully
— palette and your `protoBoxer.js` API are fixed there. Your module is the
guaranteed-cohesive NPC option; a separate scout hunts GLBs in parallel.

## Your slice
`shared/boxing/protoBoxer.js` — a chibi boxer built entirely from Three.js
primitives + flat/toon materials, in the house palette (warm paper, ink
outlines, saturated accents). Think Animal Crossing meets Little Mac.

## Requirements
- `export const VARIANTS = [...]` — at least **3 visually distinct styles**
  (e.g. `bubble` = sphere-stack blob with huge gloves; `blocky` = voxel-ish
  box body; `bean` = capsule bean with stubby limbs). Give each its own
  palette flavor within the house palette.
- `buildBoxer(THREE, {variant, palette})` per CONTRACT: returns
  `{group, parts, pose(name,t01), tick(dt,state), dispose()}`.
- Chibi proportions: big head (~40% height), big simple eyes + brow that can
  show emotion (angry for windup, X eyes / spirals for hurt/down), oversized
  rounded boxing gloves, shorts, tiny feet. ~1.3 units tall, feet at y=0,
  faces +Z.
- Ink outline trick: inverted-hull back-face shells or `EdgesGeometry` lines
  so it reads cartoon like `shared/glove.js` (read that file for the vibe).
- `pose()` must cover: idle, windup, jab, cross, hook, block, hurt, down,
  celebrate — with squash-and-stretch; `tick()` does continuous breathing
  bounce + smooth blends between poses.
- Animation must be pure math (sin/lerp on named parts), no skeletal
  animation deps. Deterministic given (dt, pose, t01).
- Module must import safely in node WITHOUT WebGL (only build meshes when
  buildBoxer is called with THREE passed in). `node --check` clean.
- Include a tiny self-test: `test/boxing-proto.mjs` that imports the module,
  asserts VARIANTS>=3 and that buildBoxer with a stub THREE namespace
  (Group/Mesh/etc. can be minimal class stubs you define in the test)
  returns all API fields. Keep it light.

## Your files (ONLY these)
- `spatial-objects/shared/boxing/protoBoxer.js`
- `spatial-objects/test/boxing-proto.mjs`
- `.teamwork/reports/worker-proto.md`

Do NOT touch hands.js/face.js/glove.js/server.mjs/package.json or any html.
