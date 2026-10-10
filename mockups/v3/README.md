# v3 — "The Three Little Pigs" · LLM-driven procedural story

Wave 3: the same goal across **8 different rendering engines**, driven by a
**real LLM** (TensorMux `glm-4-7-flash`) through a local proxy — the API key
never touches browser code.

## Run it

```bash
cd mockups
python3 v3/server.py            # http://localhost:8001
```

Then open `http://localhost:8001/v3/` (landing page) or any variant directly:

| # | Folder | Engine |
|---|--------|--------|
| 1 | `01-rough-canvas` | Rough.js → Canvas (flagship) |
| 2 | `02-rough-svg` | Rough.js → SVG DOM |
| 3 | `03-paperjs` | Paper.js vector morphs |
| 4 | `04-konva` | Konva scene graph |
| 5 | `05-twojs` | Two.js springy motion |
| 6 | `06-zdog` | Zdog pseudo-3D diorama |
| 7 | `07-vanilla` | hand-rolled Canvas wobble (baseline) |
| 8 | `08-pixi` | PixiJS WebGL sketch |

## Shared contract

- Game: draw your hero → type words → the LLM game-master replies with
  `narrative / obstacles / scene_seed / props / did_you_mean / goal_progress`
  → the world re-renders procedurally and props physically spawn.
- "Watch it play" runs the **real LLM** through a scripted word list —
  it's a real run, not a canned video. A canned mini-GM is only the last
  fallback and labels itself "demo mode".
- `shared/llm.js` = browser client (remote/local/offline modes, JSON
  rescue, latency `_meta`, `waitForHeadroom()` RAM guard).
- `server.py` = static server + `/api/chat` proxy (+`?mode=local` for
  ollama), `/api/sysguard` (RAM+GPU), `/api/stats` (latency log).
- `.env` holds the key (gitignored). `SPEC.md` = the build contract.

## Speed notes

`reasoning_effort: "none"` on the proxy ~halves GLM latency (~2.3s vs ~5.7s
observed). Local mode (`?mode=local`) hits ollama at `LOCAL_BASE` if a
runtime is installed — see README of `07-vanilla` for zero-dep fallback.
