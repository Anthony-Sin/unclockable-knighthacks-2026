# v3 — "The Three Little Pigs" · LLM-driven procedural story (SPEC)

Wave 3: ONE shared goal across all 8 builds so they can be compared fairly.
Rough.js-style sketch world + REAL LLM narrative via the shared TensorMux
proxy. Read `../CONVENTIONS.md` for the kid-friendly art direction.

## Serve & run
```
cd mockups && python3 v3/server.py          # http://localhost:8001
```
- Your page MUST be reachable at `http://localhost:8001/v3/<your-folder>/`.
- ALL LLM calls go through `shared/llm.js` (`<script src="../shared/llm.js">`)
  which posts to `/api/chat` — the API key never enters browser code.
- Server auto-loads `v3/.env` (TENSORMUX key already inside — do NOT print
  the key into files/logs/pages).

## The shared game (identical in all 8)
- **Goal (verbatim):** *"The Three Little Pigs — help the pig friends gather
  materials, build houses, and reach the strong brick house before the Big
  Bad Wolf huffs and puffs."* Progress bar toward `goal_progress` = 1.
- **Beat 0 — Make your hero:** the KID creates the hero — draw it on a
  crayon canvas (port the v1-roughjs maker idea) or configure parts — then
  the hero goes into the story. "Surprise me" for hands-free.
- **Loop:** kid types a word/phrase for what to do next → LLM (as game
  master) replies with narrative + scene_seed + props + did_you_mean → the
  world RE-RENDERS procedurally from scene_seed (new biome/palette/seed/
  props) and props spawn physically (typed "unicorn" → a unicorn appears
  and the hero rides it; "banana peel" → peel appears and hero slips).
- **Emergent, not hardcoded:** obstacles/complications come from the LLM —
  DO NOT hardcode the story path. You may have a light goal scaffold (the
  progress bar + wolf-pressure meter) but narrative content is generated.
- **Silly/safe:** silly words spawn the real silly prop + comedic fail +
  recover. Everything stays kid-safe; the wolf is huffy, not harmful.
- **"Did you mean…?" chip** from the LLM's `did_you_mean` field (plus a
  local edit-distance guess when the field is null and input looks like a
  near-miss of a sensible word).
- **"Watch it play"** — hands-free auto-demo that types a scripted word
  list and plays the WHOLE journey **through the real LLM** (this is the
  "real run" — not canned). Show a live latency chip ("GLM answered in
  1.9s") on every call. Stop button required. If the model is unreachable
  the shared client falls back to the canned mini-GM — label it "demo mode".

## LLM contract (already implemented in shared/llm.js)
Response JSON (all fields): `narrative`, `obstacles[]`, `scene_seed
{biome, seed, palette, props[]}`, `props[{kind, action, x}]`,
`did_you_mean`, `choices[]`, `goal_progress`, `success`. The client
normalizes it and attaches `_meta:{ms, mode, source}`.

## Resource guardrail (REQUIRED)
Machine: 15GB RAM, RTX 4070 8GB VRAM. Before any heavy op (loading a big
model, large asset bake, many parallel calls): call
`llm.waitForHeadroom(neededGB)` — it polls `/api/sysguard` and waits until
free RAM clears your need (13GB system limit — never approach it) or times
out (then degrade politely). No parallel LLM calls; queue them.

## Your build
- `index.html` (+ css/js) in your assigned folder ONLY.
- Your engine via CDN/vendored file, plus `../shared/llm.js`.
- Relative paths. No emojis in UI. Real kid copy.
- `README.md`: what it demos, how to run, engine citation, latency notes
  (measure `/api/chat` yourself — report typical ms), how the real version
  scales.
- Verify: `node --check` JS, page serves 200, and run your own
  "Watch it play" once — report the observed latency range.
- Leave the v3 server running if others may be using it; kill only servers
  YOU started on test ports.
