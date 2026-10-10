# Report: worker-fight — fight brain + state machine

## Built
- `spatial-objects/shared/boxing/fight.js` — `Fight` class per CONTRACT +
  exported `TUNING`. Pure JS, zero imports — runs in plain node.
- `spatial-objects/test/boxing-fight.mjs` — 36 assertions, all PASS.
  `node test/boxing-fight.mjs` → exit 0.

## Post-review fixes (review-fight.md → all defects addressed)
- **Stamina is real, not dead code:** regen multiplies by `regenBusy`(.3) while
  `punchT` is hot (punch/recover window) and by `regenHurt`(.3) for
  `hurtRegenT`(.6s) after taking a hit (blocked or clean). NPC regen stalls
  during windup/punch/hurt.
- **`gassed` state exposed:** `player.gassed`/`npc.gassed` flags with hysteresis
  (`gassedT` .3 enter, `gassedT+gassedHyst` .45 exit) — no flicker. Gassed
  player punches land at `gasPower`(.5) power and recover `gasRecover`(1.6)×
  slower (longer 'punching' window). Gassed guard caps at `gasGuard`(.4) <
  `guardT`(.6) → can't block. NPC gassed telegraphs stretch `gasWindup`(1.4)×.
- **NPC fatigue reachable:** `npcCost` .10→.3/swing, `npcRegen` .3→.1/s +
  busy-stall — measured: idle player at range, PIP gases out at ~12s
  (min stamina .095), disengages to retreat/circle till >.45, re-engages.
  The gassed brain branches now actually execute.
- **Input sanitization:** NaN/undefined `distance` → Infinity (out-of-range,
  no hit, npc whiffs too); negative clamps to 0; `guard`/`sway` clamp to
  finite 0..1/-1..1; non-array `punches` and non-object entries dropped;
  `pn.power` clamped 0..1 (NaN→0).
- **Stale telegraph:** decision-lose branch now clears `npc.telegraph`.
- All thresholds live in exported `TUNING`.

## Contract conformance
Constructor `{playerHp, npcHp, npcName, roundLen}` (+ `{seed}`), `step(dt, inputs)`
with `{punches, guard, sway, distance}`, `state` shape exactly as specced
(phase/round/timeLeft/player/npc/events), `npcDir()` → 'press'|'circle'|'retreat'|'hold',
`reset()` restores everything and re-seeds the PRNG (deterministic replays).

## Mechanics implemented
- **NPC brain (PIP, a showboat):** idle/circle → press until `distance<=attackAt`
  → telegraphed windup (`telegraph={kind,side,t01}`, 0.38–0.62s by kind) →
  punch (impact at `hitAt` t01 through the swing) → recover. Occasional
  `block`; `retreat` after staggers scaled by a `tilt` meter of recent player
  hits; `celebrate` taunts when cocky (hp lead) or after embarrassing the
  player — fully punishable, 4s cooldown. Rage = `1-hp/maxHp` ramps windup
  speed, decision pace, aggression, block/slip chance.
- **Hit resolution:** player punches land at `distance <= reach(1.1) * (1+0.2*power)`;
  npc `block` → 'npc-blocked'; circle/retreat slip chance (grows with rage);
  `hurt` action = i-frames (no juggling). Clean hits interrupt windups —
  counter mechanic. Damage = `dmg[kind] * (0.55+0.45*power)`.
- **NPC swings:** jab/hook/upper — different damage, windup length, side bias
  (jabs mostly npc-left). `|sway|>=.6` at impact → 'player-dodged', no damage,
  +dodge score, longer whiff recovery (counter window). Guarded hits deal
  `blockMul=.5` damage + 'player-blocked'. Otherwise 'player-hit-taken' +
  `hurtT`.
- **Stamina:** per-kind costs, regen .28/s slowed while punching/recovering and
  ~0.6s post-hit; `gassed` flag below `gassedT` — gassed punches weaker
  (gasPower) + slower (gasRecover), guard capped (gasGuard); can't-afford
  punches still whiff ('player-miss', reason 'exhausted'). NPC swings drain
  real stamina — gassed PIP stops attacking and fades out to recover.
- **KO/rounds:** hp<=0 → 'ko' event → npcdown/playerdown (2.4s) → win/lose.
  Round timer per roundLen, 'round-start' each round, small heal between
  rounds, judges' decision after `rounds=3` on hp fraction (ties → player).

## API notes / assumptions (documented in file header too)
- **Events are plain strings** matching the contract vocabulary exactly;
  `state.events` is cleared at the top of each `step`. For consumers wanting
  payload (damage numbers, miss reason), resolution details ride on
  `state.lastBlow = {who, kind, side?, dmg?, result, reason?}`.
- **'player-hit' AND 'npc-hit' both emitted** on a player hit (score + npc
  flinch cues); contract's event list is ambiguous there — additive, safe.
- **`telegraph` carries an extra `side` field** (contract requires kind/t01;
  side is additive) — needed so players can read which glove cocks back.
- **Blocking is MIRRORED:** `telegraph.side` names the NPC's glove, which sits
  on the player's opposite screen side. A 'left' telegraph is blocked by
  `guard.right` (and any committed sway dodges). The test encodes this.
- `playerDodge` isn't a Fight input per contract — committed sway IS the dodge.
- KO is a full KO (no 10-count) → down phase → verdict. Assumed per contract.

## Verified (commands run)
- `node test/boxing-fight.mjs` → 36 PASS / 0 FAIL, exit 0 (3× stable).
- Covered: intro→round-start, punch lands + events + exact damage, windup →
  'player-hit-taken' w/ exact kind damage, mirrored guard → 'player-blocked'
  @ half damage, sway → 'player-dodged' @ zero, hammering → 'ko' → npcdown →
  win, npcDir valid over 600 varied steps, stamina gating ('player-miss'
  reason 'exhausted'), seeded determinism (two 900-step runs identical),
  regen-rate punched-vs-idle-vs-post-hit, gassed flag/weak-punch/slow-
  recover/sluggish-guard, npc stamina < gassedT under sustained attack
  (empirical), NaN/string distance → no hit, NaN sway/guard → hit lands.
- Extra smoke: bare/malformed inputs don't throw; `reset()` clean; full
  free-runs exercise ko-lose, decision-win, decision-lose paths.
- No `Math.random` (mulberry32 from `{seed}`); no THREE/DOM imports.

## Known gaps / notes for integrator
- No separate 'npc-miss' event (not in contract vocab) — a whiffed npc swing
  emits 'npc-punch' only; `lastBlow.result='whiff'` marks it.
- Tuning lives in `TUNING` at the top of fight.js — all feel knobs there.
- `test/boxing-fight.mjs` not added to `npm test` script (package.json is
  another worker's boundary).
