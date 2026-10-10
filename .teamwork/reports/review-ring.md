# Review: shared/boxing/ring.js + test/boxing-ring.mjs — NEEDS-FIX

Reviewed against CONTRACT.md **including ADDENDUM A1**. Re-ran the shipped
suite and wrote adversarial probes in /tmp (repo untouched).

## Verdict summary

`node test/boxing-ring.mjs` → **25/25 pass, exit 0** — but the suite asserts
the stale *pre-addendum* contract: tests 4 & 6 REQUIRE the player feet to
move. The implementation walks the player all over the ring, a direct A1
violation. A1 alone = NEEDS-FIX.

## A1 probes (all FAIL — player.pos must stay in corner zone)

| probe | expected | actual |
|---|---|---|
| `sway=+1` ×3s, npcDir hold | settle ≤ ~cm | **disp 2.845** → pos (1.64,−0.83), walked half the ring |
| `sway=−1` ×3s | settle ≤ ~cm | **disp 2.845** → (−1.64,−0.83) |
| `playerDodge=+1` ×2 | feet planted | **disp 1.194** per hop pair |
| `playerDodge=−1` spam | feet planted | **disp 1.194** and climbing |
| zero input ×3s (hold) | no motion | **disp 0.281** — spring drags player toward npc |
| `press` ×10s | tiny settle | **disp 0.760** — player bulldozed to ropes (z 1.5→2.26) |
| brawl 20s (press/circle, weave, hops) | corner zone | **disp 3.718, travel 15.98** — roams the whole ring |

## NPC / robustness probes (all PASS)

- `press`: closes to d=0.900 exactly, holds [0.900,0.900] — seek-and-hold ✔
- `circle`: bearing accumulates 7.66 rad/12s, direction flips, band [1.23,1.56] ✔
- `retreat`: gap grows to 2.55, npc reaches ropes (r=2.26/2.26), no deadlock ✔
- `hold`: injected vel 1.12 decays to 0.0000 ✔; `npcStunned`: |v|=0.0004 vs 0.546 unstunned — deadened drift ✔
- `angleToNpc()`: camera −Z rotated by returned yaw gives fwd·dir = **1.00000** — camera-yaw convention correct ✔
- 2000-step fuzz (random dirs incl. bogus/undefined, |sway| up to 7, dodge spam, stun, dt∈{0, 0.001–0.05, 0.2}, 91 zero-dt, 136 0.2-dt steps): finite, in-bounds, no overlap ✔; dt≤0/NaN ignored, Infinity clamped to 0.1 ✔
- determinism: same seed → maxDiff=0 over 900 steps; different seeds diverge ✔
- surface: `new RingSim({radius,npcSpeed,playerDrift,seed})`, `player/npc{pos{x,z},radius,vel,heading}`, `step/distance/angleToNpc/reset`, `TUNING` exported ✔

## Defects

1. **CRITICAL — sway drives foot locomotion.** `ring.js:167–168`
   (`sx * inp.sway * t.swaySpeed` / `sz * …`). A1: "no sway-driven foot
   movement"; sway is a dodge INPUT consumed by fight.js, not a ring
   position change. Evidence: 2.845-unit translation above.
   Fix: remove the sway term from the player velocity target.

2. **CRITICAL — dodge hop moves the feet.** `ring.js:170–184` (velocity
   kick 175–176 + sustained shove 179–183). A1: "no foot-move dodge hop".
   Evidence: 1.194-unit translation. Fix: delete the dodge impulse path;
   playerDodge is fight.js's business, not RingSim's.

3. **CRITICAL — player auto-drift/spring toward midRange.**
   `ring.js:164–166` feeds `vr` into the same velocity target at
   `167–168`, integrated at `192`. Player walks toward the npc with ZERO
   input (disp 0.281 in 3s). A1: "no player auto-drift". Fix: delete the
   spring; player velocity target must be 0 (or only a ≤cm-scale settle).

4. **HIGH — push-apart shoves the planted player.** `ring.js:224–226`
   splits overlap 50/50, so `press` bulldozes the player 0.76 to the
   ropes — not "tiny settle only". Fix: make separation asymmetric
   (player ≈ immovable; npc takes full correction) or leash player.pos to
   the corner zone.

5. **HIGH — tests assert the forbidden behavior.**
   `test/boxing-ring.mjs:104–118` requires sway to translate the player
   ≥0.5; `144–178` requires a foot-hop impulse >1.5. These encode the
   stale contract and will pass only while A1 stays broken. Rewrite to
   assert `player.pos` displacement < ~0.05 under sway/dodge/idle.

## Minor notes (non-blocking)

- Header comment (ring.js:5–6) still says "the player only leans/hops";
  TUNING keeps dead locomotion knobs (`playerDrift`, `swaySpeed`,
  `dodgeSpeed/Kick/Time/Cooldown`, `springDeadband`). Harmless once the
  code paths die, but they document the wrong spec — clean up with the fix.
- `step(Infinity)` is accepted and clamped to 0.1s rather than ignored —
  defensible, noted only.

## What PASS would look like

Player velocity target ≈ 0 always (no sway/dodge/spring terms), asymmetric
or leashed push-apart, `player.pos` displacement < ~5 cm under all probes
above, and tests rewritten to assert planted feet. NPC steering, stun,
push-apart legality, rope clamp, angleToNpc, determinism, and fuzz
robustness are all already correct and need no changes.
