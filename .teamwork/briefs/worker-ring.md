# Brief: worker-ring (auto footwork / pathfinding)

You are building the **ring + auto-movement layer** for a Punch-Out!!-style
webcam boxing game in `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
FIRST read `/home/ANT/unclockable-knighthacks-2026/.teamwork/CONTRACT.md`
fully — your `RingSim` class API is fixed there (ring.js section). The user
requirement: "I won't move — the pathfinding moves for both me and the NPC".
Both fighters' positions are driven entirely by your sim.

## Your slice
`shared/boxing/ring.js` — pure-JS 2D movement sim on the ring's ground plane
(x,z). No THREE, no DOM — must run in plain node.

## Requirements
- Implement `RingSim` exactly per CONTRACT: constructor opts, `player`,
  `npc` ({pos:{x,z}, radius}), `step(dt, input)`, `distance()`,
  `angleToNpc()`, `reset()`.
- Movement model: steering/velocity-based (seek, orbit, flee) with smooth
  accel/decel — this IS the "pathfinding": NPC continuously routes around
  the player to its goal point; add light obstacle avoidance so fighters
  never overlap (soft push-apart). A coarse waypoint/orbit lane is fine —
  the ring is small, elegance over machinery.
- NPC directives: 'press' → close to preferred punch range (~0.9) and hold
  it; 'circle' → orbit player at mid range, occasional direction flips;
  'retreat' → back off toward ring edge; 'hold' → stand ground. Respect
  `npcStunned` (no movement / deadened drift).
- Player: no manual walking — auto-drifts to maintain a sane fighting
  distance (gentle spring toward mid range) + `sway` (-1..1) shifts them
  laterally (dodge lean); `playerDodge` (-1|0|1) = a committed side-hop
  impulse with cooldown. Both always clamp inside ring radius minus body
  radius; keep NPC between player and ring center-ish when pressing.
- Deterministic given inputs (seeded if you use randomness for orbit flips —
  accept `{seed}`).
- Export `TUNING` constants (speeds, ranges, accel) at top for integrator.

## Test — `test/boxing-ring.mjs` (node, no deps)
Scripted assertions, PASS/FAIL lines, non-zero exit on failure:
1. npcDir 'press' → distance() decreases monotonically-ish to punch range.
2. 'retreat' → distance grows toward edge; fighters never leave ring radius.
3. Fighters never overlap (min distance >= sum of radii*0.9 always).
4. sway=+1 for 1s → player.pos.x shifts laterally (document axis choice).
5. 'circle' → npc angle around player accumulates (it actually orbits).
6. playerDodge impulse decays; player stays in bounds.
7. 1000 random-input steps → no NaN, no out-of-bounds, no overlap.

## Your files (ONLY these)
- `spatial-objects/shared/boxing/ring.js`
- `spatial-objects/test/boxing-ring.mjs`
- `.teamwork/reports/worker-ring.md`

Run your test until green before reporting done.
