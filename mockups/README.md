# Pip & the Storywood — Interactive Mockups (KnightHacks 2026)

7 front-end mockups of one product idea: an interactive story game that helps
kids learn to read, write, and draw. Each folder demos a different input
modality. All mockups are hardcoded front-end — no backend, no real AI.

## Run them

```bash
cd mockups
python3 -m http.server 8000
# open http://localhost:8000
```

(Camera/mic mockups need `localhost` or `https` for browser permissions;
each also has a manual fallback.)

## The 7 mockups

| Folder | Modality | Concept |
|--------|----------|---------|
| `01-draw-hero` | mouse/touch drawing | Draw a character → it comes alive in the story |
| `02-photo-world` | webcam photo | Snap a paper drawing → it becomes the story world |
| `03-trace-magic` | pointer tracing | Trace letters to cast story moments |
| `04-voice-tale` | microphone | Read a word aloud → the story reacts |
| `05-story-blocks` | drag & drop | Arrange story cards → watch the story play |
| `06-letter-hunt` | camera "AR" | Hunt for real objects starting with a letter |
| `07-type-quest` | keyboard | Type the words → Pip walks through the tale |

## Wave 2 — `variants/`

"Fill the Tale": one game (build hero → type words → props spawn) in 7
procedural art engines (`v1-roughjs` … `v7-pixelmon`). Still front-end only.

## Wave 3 — `v3/` (real LLM)

"The Three Little Pigs" — the same game rebuilt in 8 rendering engines,
narrated live by a real LLM through a local proxy (`v3/server.py`):

```bash
cd mockups
python3 v3/server.py    # http://localhost:8001  (+ /api/chat proxy)
```

Open `http://localhost:8001/v3/` for the side-by-side dashboard. Served
from the plain `http.server` (:8000) the v3 pages run in labeled demo mode
instead. See `v3/README.md` and `v3/SPEC.md` for the contract.

## Wave 3b — `v3/09`…`14` (painted vanilla worlds)

Six variations on `07-vanilla`: the crayon-repaint backdrop is replaced by
a continuous **painted** world (Highland-Path-style layered ridges, cloud
blobs and trail that morph into the next biome as the hero walks — camera
travel IS the transition). Characters, animals and houses keep the
crayon-sticker look; each variant changes how props arrive and how you
play. See `v3/PAINTED.md` for the shared contract.

| Folder | World | Twist |
|--------|-------|-------|
| `09-van-meadow`   | painted meadow | props draw-on; tap them to bonk |
| `10-van-paintbox` | world draws itself ahead | your word paints a ribbon |
| `11-van-breeze`   | windy meadow | gusts physically shove light props |
| `12-van-lantern`  | dusk + lanterns | name a dim prop to light it |
| `13-van-puddle`   | marsh + puddles | hop tuft-to-tuft; materials build the house |
| `14-van-highland` | mountain pass | props tumble/roll downhill to the hero |

See `CONVENTIONS.md` for the shared theme/style rules each mockup follows.
