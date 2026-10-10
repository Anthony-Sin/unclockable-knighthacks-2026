# Report: scout-assets

## What I got
9 real GLBs downloaded into `spatial-objects/vendor/models/glb/boxing/`, all
verified valid (`glTF` magic, parseable JSON chunk). Manifest written to
`spatial-objects/shared/boxing/assetManifest.json` per contract schema —
**6 character candidates + 3 bonus props**.

### Characters (6)
| id | source | license | tris | tex | anims | notes |
|---|---|---|---|---|---|---|
| kenney-blocky-red | kenney.nl Blocky Characters | CC0 | 72 | 1 colormap | 27 | melee-attack + die + idle clips, node-hierarchy rig |
| kenney-blocky-yellow | same pack | CC0 | 72 | 1 | 27 | sun-yellow variant |
| kenney-blocky-purple | same pack | CC0 | 72 | 1 | 27 | berry-purple variant |
| gnome-boxer | poly.pizza/m/6uAogR8224 (portomat) | **CC-BY** | 226 | flat colors | 0 | gnome already wearing big boxing gloves — most on-theme |
| male-fighter | poly.pizza/m/GorWw41SFf (mastjie) | CC0 | 4232 | 1 | ~4 real | humanoid fighter, tiny-authored (scale 30) |
| eye-fighter | poly.pizza/m/3ghMF4tnfq (Polygonal Mind) | CC0 | 3736 | 1 | 0 | oddball cyclops fighter, flat-card style |

### Props (bonus)
| id | source | license | tris | notes |
|---|---|---|---|---|
| boxing-ring | poly.pizza/m/52-2oyc8wzE (Zaw Imagineering) | **CC-BY** | 824 | 30-mesh ring, normalized 2³ cube |
| boxing-gloves | poly.pizza/m/l2S6HNEpey (Zsky) | **CC-BY** | 800 | named L+R glove meshes |
| punching-bag | poly.pizza/m/4VgbuuhY8j (Zsky) | **CC-BY** | 300 | freestanding bag, Z-up |

## Recommendation
- **Primary: the three Kenney blocky characters.** Exact match to the repo's
  existing Kenney-style vendored GLBs, single embedded colormap (I embedded the
  pack's external `Textures/*.png` into each GLB so they're self-contained),
  72 tris, and **27 usable animations per character** including
  `attack-melee-right/left`, `idle`, `die`, `emote-yes/no` — free NPC moves.
- **Personality pick: gnome-boxer** (literally a gnome with boxing gloves).
- **male-fighter / eye-fighter** add humanoid + weirdo variety; verify facing
  and flatness in the lineup before shipping.
- Props are optional dressing for worker-scene.

## Deviations / notes for consumers
- `yOffset` convention in the manifest: **post-scale additive offset that puts
  the lowest vertex at y=0** (`scale` targets ~1.3u height). Flagged in notes.
- Kenney GLBs originally reference `Textures/*.png` by URI — I rewrote the JSON
  chunk to embed each texture as a bufferView. No external files needed.
- `male-fighter` anims include junk `CameraAction`/`SpotAction`/`CubeAction`
  clips — ignore; the 4 `*Action.*` clips are real but unnamed.
- `eye-fighter` is a flat card (6mm thick in X) — may need Y-rotation or X-rot.
- `punching-bag` long axis is +Z — needs a -90° X rotation to hang/stand.
- `boxing-ring` is proportionally a cube; probably wants non-uniform Y squash.
- **CC-BY assets require attribution in credits/about text**: portomat
  (gnome-boxer), Zaw Imagineering (boxing-ring), Zsky (gloves, bag). All via
  poly.pizza. Kenney + mastjie + Polygonal Mind are CC0 (no attribution needed).

## What failed / was skipped
- Nothing failed outright. Skipped: `female-fighter` (redundant w/ male),
  Quaternius "Adventurer" GLB (downloaded OK but 1.6MB/6.8k tris/fantasy theme —
  off-style), and a second Boxing Ring model (kept the better-documented one).
- Kenney `kenney.nl/assets/characters` 404s; `blocky-characters` was used
  instead (better fit anyway — it ships GLB format directly).

## Verification
Every file: `head -c4` == `glTF`; JSON chunk parsed; tri/skin/anim/bbox stats
extracted via a small node script (magic + chunk walk + accessor min/max).
All ≤ 833KB (limit 5MB). Manifest validated as JSON with all paths re-checked
on disk after writing.
