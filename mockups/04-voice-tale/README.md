# Read It Aloud — `04-voice-tale`

Modality: **microphone / reading aloud** (reading practice).

A karaoke-style story page shows a big readable sentence with ONE shiny
target word in a chunky pill — "Pip found a shiny **MOON** stone." The kid
says the word out loud, the mic orb shows a real live waveform, and after a
short "Listening…" beat the story pops a recognition chip and moves on.
Four beats — *moon, bridge, dance, home* — each earns a letter-gem, and the
last one pays off with "You read Pip home!"

## Run it

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000/04-voice-tale/
```

(Mic permission needs `localhost` or `https`. Everything is static — plain
HTML/CSS/vanilla JS, no build step, no backend.)

## Three ways to play a beat

| Path | What happens |
|------|--------------|
| **Mic orb** | Tap or hold the orb. `getUserMedia` + `AnalyserNode` draw a *real* waveform inside the orb and measure voice level. ~1.7s of detected voice — or releasing the button — triggers the (simulated) recognition. |
| **Let Pip read it** | Hands-free auto-demo for stage presenters: fake voice squiggles, the word's letters bounce like karaoke, then the same listening → recognition → story-advance sequence plays out. Press once per page. |
| **Pretend mode** | Always visible, clearly labeled: "tap when you've said it." If mic permission is denied or unavailable, the orb goes to sleep and this path is highlighted — the demo never dead-ends. |

The audio bits are real; the "AI understood you" bit is hardcoded (the chip
always says you got it right — it's a mockup). Mic tracks are stopped and the
AudioContext closed the moment listening ends.

## How the real version works

In the shipped game, the stand-in would be a read-aloud speech engine —
think **Google's Read Along** app, which listens to children read stories
aloud on-device, follows along in the text, and gives gentle help with
tricky words — or the browser's **Web Speech API**
(`SpeechRecognition`/`webkitSpeechRecognition`) for quick prototypes. The
real loop: stream mic audio → the recognizer matches what it hears against
the expected sentence → correct word advances the story, a near-miss pops a
friendly hint ("try the word *moon* again"), and a reading log tracks which
words the kid finds hard so the game can adapt. The waveform/volume meter in
this mockup (AnalyserNode + RMS level) is real code — only the recognition
step is mocked.
