# Report: worker-audio — procedural game audio layer

## Built
- `spatial-objects/shared/boxing/audio.js` (293 lines) — `BoxingAudio` class
  per CONTRACT A5 + pure exported `EVENT_SFX` map. 100% synthesized Web
  Audio: oscillators (plain + 2-op FM) and one shared 1s white-noise buffer
  through biquad filters. No audio files, no network, no deps.
- `spatial-objects/test/boxing-audio.mjs` — 25 assertions, all PASS.
  `node test/boxing-audio.mjs` → exit 0.

## API
```js
const audio = new BoxingAudio();
audio.unlock();                    // first user gesture; lazily creates ctx
audio.muted = true;                // toggle; zeroes master, stops crowd bed
audio.setVolume(.8);               // clamped 0..1
audio.handleEvent(evt, fightState) // evt = string or {type}; reads
                                   //   state.lastBlow for kind/dmg
audio.play(name, opts)             // direct sfx trigger → bool scheduled
audio.update(dt, fightState)       // crowd murmur bed + gassed breathing
```
`unlock(ac)` accepts an injected AudioContext (tests/headless); returns
`null` if no `AudioContext`/`webkitAudioContext` exists. Every public method
is a safe no-op before unlock or while muted — zero DOM/AudioContext at
module top level, imports clean in plain node.

## EVENT_SFX coverage (all 13 fight.js events)
| event | sfx | notes |
|---|---|---|
| round-start | bell | FM ding ×3 |
| player-punch / npc-punch / player-miss | whoosh | filtered-noise burst, pitched by `lastBlow.kind` (jab snappy → hook/uppercut lower-heavier); miss = airier |
| player-hit / npc-hit | thwack | sine thud + noise snap; heavier for hook/uppercut, scaled by `lastBlow.dmg`; npc-hit layers +12ms for chunk |
| npc-blocked / player-blocked | thud | dull low thump, no snap |
| player-dodged | dodge | airy rising whoosh |
| player-hit-taken | hurt | heavy low thud + FM "oof" bark |
| ko | ko | square-wave buzzer + slow-mo FM pitch drop + `_crowdLevel=1` swell |
| win / lose | win / lose | 4-note FM arps; lose descends w/ final slide-down |

## Beds (`update`)
- **Crowd murmur**: looped noise → bandpass @420Hz w/ slow LFO wobble →
  gain. Runs only during `phase==='fighting'`, subtle (~.05), swells toward
  `.3·_crowdLevel` on landed hits (+.4) and KO (1), decays .45/s.
- **Heavy breathing**: when `player.stamina < .3` during fighting, bandpass
  noise puffs on a timer that pants faster as stamina empties.

## Design notes / assumptions
- Master chain = gain → DynamicsCompressor → destination (soft-clip safety
  on stacked hits); compressor creation is `?.`-guarded for exotic ctx.
- `handleEvent` reads `state.lastBlow` for kind/dmg/power — it's only set
  for resolved blows, so swing whooshes fall back to sensible defaults.
- `play()` dispatches through an internal name→preset table; `EVENT_SFX`
  values are validated against it by the test (no dead presets possible).
- Internal buffer renamed `this._buf` after a caught collision with the
  `_noise()` helper method.

## Verification
```
$ node test/boxing-audio.mjs        → 25 passed, 0 failed (exit 0)
$ npm test                          → all 5 suites green (fight 36, ring 31,
                                      fists ALL PASS, proto ok, audio 25)
```
Test coverage: node-safe import, lazy ctx, headless unlock/play/update
no-ops, EVENT_SFX ⊇ every string fight.js can `_emit` (scanned from source,
ternary emit included), stub-ctx node creation for every mapped event,
muted → zero node creation + master gain 0, crowd bed start/stop by phase,
low-stamina breath puffs, setVolume clamping.

Extra smoke (not committed): drove real `Fight` + `BoxingAudio` w/ stub ctx
for 120 simulated seconds — 426 nodes created across 9 event kinds incl.
ko/win, zero throws, zero node creation while muted.

## Known gaps / notes for worker-scene
- `game.js` doesn't consume audio yet — per A5, wire it with a tolerant
  dynamic import (`audio.handleEvent(e, fight.state)` per drained event +
  `audio.update(dt, fight.state)` per frame; `unlock()` on first gesture).
- `lastBlow` doesn't carry player punch `power`, only `kind`/`dmg` — whoosh
  pitch keys off kind, thwack loudness off dmg. Fine for now; if power
  scaling is wanted, worker-fight would need to expose it on the punch evt.
- No `dispose()`/`suspend()` — page is a single-screen game; add only if
  scene lifecycle needs it.

TEAMWORK_DONE worker-audio
