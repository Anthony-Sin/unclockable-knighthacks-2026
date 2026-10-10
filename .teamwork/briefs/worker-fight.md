# Brief: worker-fight (fight brain + state machine)

You are building the **fight logic** for a Punch-Out!!-style webcam boxing
game in `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
FIRST read `/home/ANT/unclockable-knighthacks-2026/.teamwork/CONTRACT.md`
fully — your `Fight` class API is fixed there (fight.js section). Other
workers build rendering and input against this contract in parallel — do not
change the API, and do not touch their files.

## Your slice
`shared/boxing/fight.js` — pure-JS fight state machine + NPC brain.
No THREE, no DOM — must run in plain node for unit tests.

## Requirements
- Implement the `Fight` class exactly per CONTRACT: constructor opts,
  `step(dt, inputs)`, `state`, `npcDir()`, `reset()`.
- NPC brain with personality: a little showboat. Behavior loop —
  circle (find angle) → press (close distance) → telegraphed windup (~0.4-0.6s,
  `telegraph:{kind,t01}`) → punch → recover; occasional block and retreat
  when hurt. Difficulty ramps: faster/craftier as its HP drops.
- Hit resolution per CONTRACT: player punch lands when `distance <= reach`
  (tune ~1.1) and NPC not blocking/dodging; NPC jab/hook/upper do different
  damage/speed; player `guard >= .6` on the matching side halves damage;
  `|sway| >= .6` at impact = clean dodge (emit 'player-dodged', no damage).
- Stamina: punches cost stamina, regen over time; exhausted punches
  whiff at reduced power (emit 'player-miss' w/ reason).
- HP → KO: `npcdown`/`playerdown` phases, then `win`/`lose`. Emit `ko` event.
  Round timer per roundLen; `round-start` events. Keep `score` for clean
  hits, dodges, KOs.
- Deterministic: constructor takes `{seed}`; use a small local PRNG
  (mulberry32 or similar) — no Math.random.
- Tune constants as exported `TUNING` object so the integrator can tweak
  without reading logic.

## Test — `test/boxing-fight.mjs` (node, no deps)
Drive the class with scripted inputs and assert, printing PASS/FAIL lines:
1. A scripted player punch in range reduces npc.hp and emits 'player-hit'.
2. NPC windup → punch lands on idle player (hp drops, 'player-hit-taken').
3. Same attack with guard raised → reduced damage + 'player-blocked'.
4. Same attack with sway committed → zero damage + 'player-dodged'.
5. Hammering npc.hp → 'npcdown' → 'win' phase.
6. npcDir() returns a valid directive every step; stamina gates spam.
End with a non-zero exit code on any failure.

## Your files (ONLY these)
- `spatial-objects/shared/boxing/fight.js`
- `spatial-objects/test/boxing-fight.mjs`
- `.teamwork/reports/worker-fight.md`

Run your test until green before reporting done.
