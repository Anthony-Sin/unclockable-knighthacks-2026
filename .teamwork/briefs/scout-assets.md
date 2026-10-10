# Brief: scout-assets

You are the asset scout for a cute Punch-Out!!-style webcam boxing game being
built in `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
FIRST read `.teamwork/CONTRACT.md` (one level up from repo root:
`/home/ANT/unclockable-knighthacks-2026/.teamwork/CONTRACT.md`).

## Your slice
Hunt and download **3-6 free, legally-usable cartoon character/boxer GLB
assets** plus optionally a boxing-ring prop or glove model. The player will
pick one from a lineup viewer as the NPC boxer.

## Targets (in priority order)
- Kenney.nl asset packs (CC0) — e.g. "Characters" kits, sports kits. The repo
  already vendors Kenney-style GLBs under `vendor/models/glb/k*` (kfactory,
  kgrave, ksurvival) — match that single-texture colormap style.
- Quaternius (quaternius.com, CC0) — Ultimate Animated Character pack, etc.
- poly.pizza / other CC0 or similarly-permissive sources.
- A boxing-ring GLB and boxing-glove GLB would be bonuses (separate entries).

## Requirements
- Download actual files into `spatial-objects/vendor/models/glb/boxing/`
  (create it). Keep each small (<5MB); unzip packs and pick single GLBs.
- Verify each GLB is valid: file starts with `glTF` magic, or run a quick
  `node -e` check reading the header. Report triangle/skin info if feasible
  (`strings`, python, or node parse of the JSON chunk is fine).
- Only CC0/CC-BY/permissive. Record exact license + source URL.
- Write `spatial-objects/shared/boxing/assetManifest.json` per the CONTRACT
  schema. Set `scale`/`yOffset` best-guess so model is ~1.3 units, feet at 0.
- Prefer: humanoid/boxy characters with gloves or mitt-like hands, single
  colormap texture (easily recolorable), rigs/animations a bonus not a must.
- If network downloads fail entirely, still write the manifest with a
  `notes` entry explaining failure and 3 specific URLs you would have used —
  the procedural worker covers us either way. Do not fake files.

## Your files (ONLY these)
- `spatial-objects/vendor/models/glb/boxing/**`
- `spatial-objects/shared/boxing/assetManifest.json`
- `.teamwork/reports/scout-assets.md` (final report: what you got, licenses,
  which you'd recommend, what failed)

Do NOT edit anything else. Work fast; it's a hackathon pivot.
