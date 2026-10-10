# v3 / 14-van-highland — Highland Trek

> Wave 3 · over the pass to the brick house — a **painted-world** Three Little
> Pigs prototype where the world is one continuous procedural Highland Path,
> the hero climbs a real pass, and props tumble/roll down the painted slope
> to the hero.

Built on `07-vanilla` (same plumbing, same shared `llm.js`) with the twist
in `PAINTED.md`: the background is a live painted world rendered every
frame — no wipes, no torn-paper transitions, camera travel *is* the
transition.

## The twist

- **Continuous painted Highland Path** (`world.js`) — sky gradient, sun,
  clouds, three parallax ridge bands with painted snow-capped peaks, pines
  with snow, scattered rocks, occasional mountain-goat silhouettes, a
  dashed trail. Frost → meadow palette blends smoothly along world-x via
  seeded "legs" (`WORLD.ahead(sceneSeed)` morphs the *next* stretch — the
  same leg system as emberwood-transitions).
- **Real elevation** — `WORLD.groundAt(wx)` / `WORLD.slopeAt(wx)` are the
  source of truth for the trail. The pass term makes the trail climb
  ~40 px visibly; the hero's feet sample `groundAt` every frame, so his
  screen-y rises and falls with the mountain. Measured ground range in a
  single view: ~37 px.
- **Rolling props** — every summoned prop spawns *up-slope* and obeys the
  slope: `vx += slope*g - mu*vx`. Round things (ball, snowball, wheel,
  apple, egg, pumpkin, barrel, round rock…) get `mu≈0.5` and roll hundreds
  of px — often clean past the hero. Heavy/angular things (anvil, fridge,
  logs, materials) get `mu≈2.4` plus a tumble arc, and thud early. Tap a
  rolling prop to make it rock and settle.
- **Materials → summit pile** — collected building materials first roll to
  the hero ("collected!"), then get a real shove and *roll off toward the
  house plot* (a delivery roll, not a warp). The pile grows beside the
  plot and the house upgrades straw → sticks → brick as loads arrive
  (`WORLD.drawBuild` paints the pile + house stage in-world).
- **Elevation goal** — the goal bar tracks how far the hero has climbed
  along the pass (`heroWXT` advances a beat per accepted word; payoff =
  the brick house at the summit, HUD chip shows metres climbed =
  `groundAt` delta / 4).
- **Chase & overshoot** — a prop that rolls past/short of the hero makes
  the hero run to it (`heroWalkTo`), which also advances the camera.
- **Camera** — `cam` eases toward `heroWX - heroSX*`, so the path scrolls
  continuously; scenery/props are world-anchored (`wx - cam`).

## Plumbing (unchanged from vanilla)

- `StoryLLM` shared client: sequential turns, remote/local modes,
  `/api/sysguard` pacing, `waitForHeadroom`, `_meta.ms` latency chip,
  offline fallback labelled `demo mode · offline narrator`.
- Beat-0 hero maker, HUD + goal/wolf meters, narrative card, choices,
  `did_you_mean` slip chips, coach lines, end overlay, Stop button,
  one-deep input queue (`pendingWord`), epoch guards on all awaits.
- `?seed=` / `#` reproduces a run; `window.watchItPlay()` /
  `window.stopWatch()` drive a hands-free demo; `#watch` autostarts it.
- `window.__test(kind, xFrac)` spawns a prop directly (smoke hook);
  `window.__probe()` returns structured state for headless checks.

## Files

| file | role |
|------|------|
| `world.js` | painted Highland Path: legs/palette blend, ridges+peaks+goats+pines+rocks+trail, `frame/ahead/groundAt/slopeAt/drawBuild/camStart/size/reset/wrap/visibleX` |
| `app.js` | game loop, world-space cam/hero, roll+tumble physics, apply-prop gags, material delivery, HUD, LLM glue |
| `props.js` | crayon prop dictionary (+ round flag, + apple/ball/egg/wheel/snowball/pumpkin, + aliases) |
| `sketch.js` | crayon helpers (pig/wolf/house/effects/captions) — unchanged |
| `index.html` / `style.css` | Highland Trek shell, elevation chip, single world canvas |

## Measured LLM latency

Remote `story_turn` via `/api/chat` (TensorMux default model), measured
from `_meta.ms` during the headless verification run (`/tmp/v14/final-verify.log`):

- 4 sequential turns in one play-through: **2.6 s / 2.2 s / 3.0 s / 2.1 s**
  (~2.5 s average; other runs observed 1.9–5.6 s per turn)
- Each turn chips live in the HUD as `live LLM · remote · answered in X.Xs`;
  offline fallback (if the endpoint hiccups) is labelled `demo mode` and the
  story continues.

## Test

```bash
# from mockups/: python3 server.py  (already on :8001)
# headless smoke (chromium + puppeteer-core):
node /tmp/v14/verify.js
```

Checked: HTTP 200 on all assets, `node --check` on all JS, zero console
errors / zero 404s, ≥3 real LLM turns, camera advance, elevation variance,
roll spawn/rotate/settle/tap-to-stop, material→pile→house upgrade,
goal→payoff overlay, Stop restores inputs, `#watch` autostart.
Screenshots in `/tmp/shot-14-*.png`.
