# Brief: worker-audio (procedural game audio)

You are building the **audio layer** for a Punch-Out!!-style webcam boxing
game in `/home/ANT/unclockable-knighthacks-2026/spatial-objects`.
FIRST read `/home/ANT/unclockable-knighthacks-2026/.teamwork/CONTRACT.md`
fully — palette/style context + your `audio.js` contract are in ADDENDUM A5.
The fight events you map are produced by `shared/boxing/fight.js`
(read its event list — it's already written).

## Your slice
`shared/boxing/audio.js` — fully procedural Web Audio SFX engine.
NO audio files, NO network, NO external deps — synthesize everything with
oscillators + noise buffers + filters.

## Requirements (per CONTRACT A5)
- `export class BoxingAudio`: `unlock()` (lazy AudioContext on first user
  gesture — never create at import), `muted` toggle, `setVolume(v)`,
  `handleEvent(evt, state)`, `play(name, opts)`, `update(dt, fightState)`
  for the crowd murmur bed + stamina "heavy breathing" cue if cheap.
- SFX: round bell ×3 on 'round-start'; punch whooshes pitched by kind/power
  (jab snappier, hook/upper lower-heavier); impact thwacks on player-hit /
  npc-hit; dull blocked thud; airy dodge whoosh; low hurt thud on
  player-hit-taken; KO = buzzer + crowd swell + slow-mo pitch drop;
  short win/lose jingles; idle crowd murmur bed during 'fighting' phase
  (subtle, cute-arcade not stadium), swelling on landed hits/KO.
- Cute arcady character: slightly exaggerated, FM-ish, Punch-Out energy.
- Node-safe import: zero DOM/AudioContext at module top level; keep a pure
  exported `EVENT_SFX` map (event string → sfx name) for unit testing.
- Keep total under ~300 lines, clean helper fns (env/osc/noise helpers).

## Test — `test/boxing-audio.mjs` (node, no deps)
1. Module imports in node with no window/AudioContext (guard globals).
2. `EVENT_SFX` covers every event fight.js emits (read fight.js for the
   list — assert each known event maps to a defined sfx name).
3. With a stub AudioContext (fake ctx object with createOscillator etc.
   recording calls), `play('bell')` + `handleEvent('player-hit')` produce
   node-creation calls — prove the synth paths execute without throwing.
4. muted=true → no node creation. PASS/FAIL lines, non-zero exit on fail.

## Your files (ONLY these)
- `spatial-objects/shared/boxing/audio.js`
- `spatial-objects/test/boxing-audio.mjs`
- `.teamwork/reports/worker-audio.md`

Run your test until green before reporting done.
