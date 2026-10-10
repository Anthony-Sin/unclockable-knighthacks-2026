# voice/ — "Mouth Detective" · read-aloud trainer (SPEC)

7 different takes on ONE feature, to compare how best to add it to the game:
**speech/reading-aloud trainer — mouth/jaw landmarks + voice gate word
pronunciation beats.** Pairs with `../04-voice-tale/` (read it for the
existing voice UI/karaoke vocabulary — reuse its look).

## Serve
Same v3 server: `cd mockups && python3 v3/server.py` →
`http://localhost:8001/voice/<your-folder>/`

## Shared game (identical in all 7)
- Passage (ties to v3 theme): **"Little pig, little pig, let me come in.
  Not by the hair on my chinny chin chin. Then I'll huff, and I'll puff,
  and I'll blow your house down!"** — shown word-by-word karaoke style.
- The gate: each word lights up ONLY when the trainer's signal(s) say the
  kid actually attempted it (mouth moved / voice heard — per your tech).
  Wrong/absent attempt → gentle kid-friendly "try that sound again!" +
  the word wiggles. Success → sparkle + next word.
- **Mouth/jaw focus:** wherever your tech allows, visualize WHAT the mouth
  is doing (jaw-open amount, lip pucker/round, smile spread) — the learning
  hook is "shape your mouth like this".
- **No-device fallback REQUIRED:** if camera/mic denied or absent, a
  "Pip reads it" mode demonstrates the whole flow with a simulated mouth/
  voice (clearly labeled pretend) — the demo must never dead-end.
- **"Pip reads it"** = the hands-free auto-demo (like previous waves').
- Kid-safe everything, no emojis in UI, rounded doodle UI per
  ../CONVENTIONS.md, latency/detect stats shown in a small chip.
- `README.md`: approach, real-tech it maps to (MediaPipe FaceMesh, Web
  Speech API, Whisper, viseme theory, reading-tutor products), latency,
  accuracy limits, how it would slot into the main game + v3 story.

## Real vs simulated — honesty rule
If your tech runs real in-browser (facemesh, webaudio, webspeech, whisper)
→ run it REAL, with the simulated path only as fallback. If it can't,
simulate it faithfully and say exactly what the real version would use.
Never fake it silently.

## Resource rule
Machine: 15GB RAM, RTX 4070 8GB. Models must be small (<=~150MB download);
check `llm.waitForHeadroom(3)` (or fetch /api/sysguard) before loading any
model >50MB. No GPU-heavy work except where explicitly assigned.

## Your build
index.html + js/css in your folder ONLY, relative paths, vendored libs,
node --check all js, serve on your assigned port 86xx (never touch 8000/
8001), verify 200 OK, write README, report back.
