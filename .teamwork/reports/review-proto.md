# Review — shared/boxing/protoBoxer.js + test/boxing-proto.mjs
Reviewer: adversarial pass. Evidence: `node test/boxing-proto.mjs` (exit 0,
34 real asserts), custom /tmp node probes, and real WebGL screenshots via
puppeteer (lineup.html + a 3×3 pose-grid harness per variant + close-ups).

## Criterion verdicts
| Criterion | Verdict | Evidence |
|---|---|---|
| VARIANTS = ['bubble','blocky','bean'], ≥3 distinct | PASS | test + 3 visibly distinct bodies (sphere-stack / voxel / capsule) |
| buildBoxer → {group,parts,pose,tick,dispose} | PASS | all present + parts.head/torso/gloveL/gloveR/eyes/brows/mouth/arms/feet/root/squash |
| ~1.3u tall | PASS (~) | Box3 max.y 1.375–1.406 incl. tuft+hull; body top ≈1.28–1.30. `height` field claims 1.3 (cosmetic drift, note only) |
| feet at y=0 | PASS w/ defect #1 | soles ≈0, but leg bones dip to −0.12 |
| faces +Z | PASS | front-view renders show face/guard; face built at +ez |
| emotion eyes/brows/mouths | PASS | open/X/spiral/happy eyes, V/Λ/raised brows, smile/grin/o/flat mouths — all verified on screen |
| inverted-hull ink outlines | PASS | close-up shows clean #2B2118 rims; 18–19 BackSide shells per variant |
| 9 poses w/ squash-stretch | PASS | all 9 visually distinct; squash node scaled in 8 attack/hit poses |
| deterministic | PASS | no Math.random/Date in file; test asserts identical runs to 1e-12 |
| node-safe import | PASS | `node -e` import ok; zero DOM/fetch refs; THREE passed in |
| house art style | PASS | warm paper scene, coral/sun/leaf/sky/berry accents only, chunky chibi, zero neon/photorealism |

## Defects
1. **LOW — leg bones clip through the floor.** `solveLimb` (protoBoxer.js:573–577)
   scales the whole limb capsule by `s = d/len`, stretching the hemispherical
   caps too, so the bone tip lands at `d·(1+r/len)` — overshooting the foot.
   Legs have the worst r/len ratio (≈0.42–0.5): measured Box3 min.y = **−0.112**
   (blocky), −0.074 (bubble), −0.058 (bean) at rest idle; the 4 offenders are
   the leg capsules + their ink hulls. Hidden behind feet/from above a floor,
   but visible from low/side angles on a bare ground plane. Fix: scale to land
   the tip on the effector, e.g. `s = d/(len + r)` (or shorten bone position).
2. **LOW — `snap('down')` with no t01 never falls.** protoBoxer.js:559–562 sets
   `downT=1` for `t01===undefined`, but `pose()` computes `curK=clamp(undefined||0)=0`
   → `k=0` → standing pose, contradicting the "thumbnail = fallen" comment.
   Verified: `snap('down')` leaves `parts.root.rotation.x = 0.000`. No current
   caller passes bare 'down' (lineup/npc use pose/tick). Fix: `pose(name, t01=1)`
   for 'down', or have snap pass `t01 ?? 1`.
3. **COSMETIC** — returned `height:1.3` understates measured 1.37–1.41.
4. **INFO (other slice)** — `npm test` chain fails at `test/boxing-audio.mjs`
   (MODULE_NOT_FOUND) — worker-audio's missing file, not this slice; all tests
   before it in the chain (incl. boxing-proto) are green.

## Visual verdict per variant (screenshots: /tmp/proto-review/*.png)
- **bubble**: PASS — round potato toddler, coral mitts, sun trunks, leaf sprout; every pose reads.
- **blocky**: PASS — voxel kid, flat-top, sky mitts, leaf trunks; crispest ink outlines.
- **bean**: PASS — squashy capsule, berry mitts, sky trunks; most plush-like; all poses read.

Notes: poses are genuinely distinct and readable (block covers face, hurt drops
gloves + X eyes, celebrate raises mitts + ◠ eyes + grin, down lies flat on the
mat). This is a real cute boxer, not a blob.

VERDICT: PASS — all contract criteria met; defects are low-severity polish
(floor clipping, snap('down') edge case), not blockers.
