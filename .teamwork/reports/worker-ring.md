# Report: worker-ring (auto footwork / pathfinding)

> **A1 FIX APPLIED** (post-review): the player's feet are now planted per
> contract ADDENDUM A1. Removed player locomotion entirely (mid-range
> spring, sway strafe, dodge hop). `sway`/`playerDodge` are still accepted
> in `step()` input but ignored for foot position — they're head-lean/dodge
> inputs consumed by fight.js/scene. NPC steering unchanged. Re-verified
> green: 31/31.

## Built
- `spatial-objects/shared/boxing/ring.js` — pure-JS 2D steering sim on the
  ring's x/z ground plane. No THREE, no DOM; imports cleanly in node.
- `spatial-objects/test/boxing-ring.mjs` — scripted assertion suite,
  `node test/boxing-ring.mjs` → 31 PASS / 0 FAIL, exit 0.

## API (per CONTRACT, plus documented extras)
`new RingSim(opts)` — accepts `{radius, npcSpeed, playerDrift, seed}` per
contract signature (`playerDrift` accepted but now a no-op — A1) plus any
other `TUNING` key (`{...TUNING, ...opts}`).

- `player` / `npc` = `{pos:{x,z}, vel:{x,z}, radius, heading}` — `vel` and
  `heading` are additive extras. `heading` = yaw for a "+Z-facing" model
  (protoBoxer) to face its opponent; the player's heading still *rotates*
  to track the npc (facing ≠ walking).
- `step(dt, input)` — input `{sway, playerDodge, npcDir, npcStunned}`.
  `sway`/`playerDodge` are **deliberately not read** (A1). Ignores
  `dt<=0/NaN`, caps `dt` at 0.1, sanitizes garbage `npcDir`.
- `distance()`, `angleToNpc()`, `reset()` per contract.

## Angle/axis conventions (for worker-scene)
- `angleToNpc()` = `atan2(-dx,-dz)` = **camera-yaw convention**: set
  `camera.rotation.y = sim.angleToNpc()` and a three.js camera (−Z forward)
  at `player.pos + eye` faces the npc. Verified: fwd·dir = 1.00000.
- Player spawn (the corner zone): `(0, +1.5)`; npc `(0, −0.4)`, gap ≈1.9.
- The camera/torso lean on sway is a **scene-layer** effect applied on top
  of `player.pos` — RingSim does not provide a lean offset (feet only).

## A1 player model — "feet planted, tiny settle only"
Three mechanisms guarantee `|player.pos − spawn| ≤ 0.1` under ALL inputs:
1. **No locomotion**: the only player velocity is a stiff, speed-capped
   servo back to `_home` (`anchorGain` 22/s, `anchorSpeed` 0.5 u/s) — at
   spawn, desired vel = 0 → the player is literally motionless until shoved.
2. **Asymmetric push-apart**: the NPC absorbs `1 − playerPushShare` (92%)
   of body separation; the player takes a cm-scale shove at most.
3. **Corner leash**: `_leashPlayer()` hard-clamps `|pos − home| ≤
   playerLeash` (0.1u) every step + final `_pushNpcOff()` pass puts any
   residual separation entirely on the NPC — the player can't be bulldozed.

## Movement model — NPC ("the pathfinding", unchanged)
Velocity steering with exponential accel (`vel += (desired−vel)·(1−e^{−a·dt})`).
- `press` — seeks a goal `punchRange` (0.9) off the player on the
  ring-center side (npc ends between player and center-ish); tangential
  route-around flow while crowding. Settles at d=0.900 and holds.
- `circle` — orbits the planted player at `midRange` (1.5); seeded-RNG
  direction flips every `orbitFlipMin..orbitFlipMax` s.
- `retreat` — flees, blends into rope-tangent slide near the boundary.
- `hold` — stands ground. `npcStunned` → zero steering + heavy damping.

## Verified (node test/boxing-ring.mjs — 31/31, exit 0)
1. `press` → closes to ≤punch+0.25, rebound ≤0.4, holds; player planted. ✓
2. `retreat` → gap grows ≥+0.4, npc reaches ≥85% of rope limit. ✓
3. **Bulldoze probe** (`punchRange=0.5` inside the body, press 10s) →
   player disp ≤0.1 (measured 0.0065), npc absorbs separation, min dist
   ≥0.9·Σradii. ✓
4. `sway=±1` held 3s → feet planted disp ≤0.02 (measured 0.0000); idle 3s
   → ≤0.001. ✓
5. `circle` 12s → ≥2 rad accumulated, ≥1 flip, band [0.8,2.3]; planted. ✓
6. `playerDodge` spam ±sway weave 3s → no crash, disp ≤0.02 (0.0000);
   dodge+press 5s → planted ≤0.1, npc still reaches punch range. ✓
7. 1000 seeded random steps → finite / in-bounds / no overlap / disp ≤0.1. ✓
8. Settle: bulldoze then release → player re-centers in the corner zone. ✓
9. Determinism: same seed + inputs → bit-identical over 480 steps. ✓

Ad-hoc reviewer's probes replicated: sway/dodge/idle/press-10s/brawl-20s
all maxDisp = **0.0000**. Multi-seed jittery-dt fuzz (5×4000): no bounds /
overlap violations, minD 0.88, maxPlayerDisp 0.0000.

## Notes / gaps
- TUNING cleaned: removed dead locomotion knobs (`playerDrift` opt remains
  accepted for signature compat but does nothing; `swaySpeed`, `dodge*`,
  `springDeadband` gone). Added `playerLeash`, `anchorGain`, `anchorSpeed`,
  `playerPushShare`.
- Corner-zone spawn is fixed at (0, 1.5) — if worker-scene wants a
  different player corner, that's an opts addition (ask me or override
  `sim._home` post-construction; leash follows `_home`).
- `player.heading` rotates to face the npc (allowed: facing, not walking).
- No y/vertical motion — camera/torso lean on sway lives in the scene layer.
