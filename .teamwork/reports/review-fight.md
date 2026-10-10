# Review: worker-fight — shared/boxing/fight.js + test/boxing-fight.mjs
Reviewer: adversarial | Verdict: **NEEDS-FIX** (4 substantive defects + minors)

Re-ran `node test/boxing-fight.mjs` → 25/25 PASS, exit 0 (real assertions, exact-damage checks).
Independently probed in /tmp: surface, state shape, phase machine, event drain, sway threshold
boundary, mirrored guard (both directions), reach/power edges, block/i-frames, rounds + judges'
decision (win/lose/tie), npcDir fuzz ×3000, determinism (hp seq identical ×2 runs; PRNG live —
npc state diverges step 129 across seeds), garbage inputs, A2 stamina sub-claims.

## Core contract: PASS
step/state/npcDir/reset/TUNING present; state shape matches (phase/round/timeLeft/
player{hp,stamina,score,status,hurtT}/npc{hp,stamina,name,action,actionT,telegraph{kind,side,t01}}/
events[]); events are strings, cleared per step, all in contract vocab; lastBlow carries details;
KO→down→win/lose; rounds+heal+decision verified all three outcomes; seeded PRNG deterministic;
npcDir only emits the 4 valid directives; mirrored guard verified both ways (left telegraph blocked
by guard.right, same-side guard takes full damage); |sway|>=.6 boundary exact (.59 hits, ±.6 dodges);
sway used ONLY for dodge (A1 clean — sway does not affect offense, no locomotion in this module).

## DEFECTS

1. **[HIGH] NPC fatigue is unreachable dead code — A2 "NPC gets tired after combos" not met.**
   fight.js:288,386-393. Max possible stamina drain ≈ npcCost(.10) / fastest cycle(~.77s) ≈ .13/s
   vs npcRegen .30/s → stamina can never fall. Empirical: min npc.stamina = 0.90 over 30s close-range
   fight. The `gassed` branches in _choose (windup:0, circle:.55, retreat:.3) and the press fade-out
   NEVER execute. Worker's report claims "NPC stamina gates its own swing spam" — it cannot.
   Fix: raise npcCost, lower npcRegen, or add a real combo-fatigue accumulator.

2. **[MED] A2 regen slowdown absent.** fight.js:125-126 — `stamina += stamRegen*dt` unconditional in
   every phase/state. Measured identical regen (0.140/0.5s) idle vs `_punchT>0` vs `hurtT>0`.
   A2 explicitly requires slower regen "while punching and while being hit". Not implemented at all.
   (Also regen ticks during down/win/lose phases — cosmetic.)

3. **[MED] A2 "slower guard" absent.** Guard check fight.js:358 uses raw `inp.guard` vs guardT with
   no stamina term — verified 'player-blocked' at player.stamina=.02 with guard held. Exhaustion has
   zero effect on blocking.

4. **[MED] A2 "visible gassed state" absent + no exported threshold.** No `gassed`/`exhausted`
   flag on state.player or state.npc; status enums unchanged. No exhaust threshold in TUNING —
   the only gates are per-kind `stamCost` and hardcoded `npcCost*1.5` (line 386). A HUD cannot
   render "gassed" without duplicating implicit logic.

5. **[LOW] distance=NaN bypasses reach check.** fight.js:239 — `NaN > reach*…` is false → punch
   LANDS (verified: player-hit, npc.hp 100→93). distance=-5 also lands. Real integration risk:
   sibling module ring.js currently emits non-finite positions (npm test's boxing-ring.mjs
   fails 22× on NaN pos). Sanitize distance → treat non-finite as out-of-range.

6. **[LOW] decision-lose leaves stale telegraph.** _roundEnd (fight.js:198-199) win branch clears
   npc.telegraph; lose branch does not — windup-cutoff-at-bell can leave a frozen telegraph
   object rendered during 'lose'.

7. **[INFO] Exhausted punch = hard whiff cliff, not graduated "weaker/slower".** fight.js:234 —
   stamina < cost → 'player-miss'(exhausted); ≥ cost → full damage. A cliff satisfies "gates spam"
   but is a stretch for "weaker/slower". Also regen-ticks-before-cost-check means stamina
   cost−0.005 still throws a full-power punch (verified: stam .097 threw jab for full 7 dmg).

8. **[INFO] Cosmetic:** blocked hit sets hurtT=.2 → status reads 'hurt' briefly after a successful
   block; npc.actionT frozen during down phases (celebrate pose static unless renderer self-times).

## Summary
Core fight contract is solid and well-tested — mechanics all verified independently, not just via
the shipped test. The failure is confined to addendum A2 "stamina is first-class": costs and the
player whiff-gate exist, but regen modulation, guard degradation, gassed visibility, and NPC
fatigue are absent or unreachable. Fix 1-4 (tuning/logic, small diff) + 5 (one-line sanitize).
