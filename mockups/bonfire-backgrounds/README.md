# Storywood background laboratory

Seven local, seed-reproducible background mockups for the v3 story game. Open
`http://localhost:8012/bonfire-backgrounds/` after running:

```bash
cd /home/ANT/unclockable-knighthacks-2026/mockups
python3 -m http.server 8012 --bind 127.0.0.1
```

The existing v3 server also serves this folder at
`http://localhost:8001/bonfire-backgrounds/`. This page does not call an API,
load a model, or need the v3 proxy. The gallery is separate from the existing
v1–v3 index and dashboards.

## Scene contract

`app.js` holds a shared `sceneBrief` object with `seed`, `mood`, `biome`, and
`landmarks`. Every renderer takes `(canvasContext, seededRandom, sceneBrief)`.
The seed and mood controls rerender all seven views; the same seed produces the
same composition. The scene brief field uses a small local keyword parser:
`marsh`, `highlands`, `meadow`, or `forest` changes ground details, while
`river` or `standing stones` adds a landmark. `night`, `morning`, and `dusk`
select the mood. A future LLM `scene_seed` response can set those fields
directly without changing a renderer. The scene brief is a preview parser,
not a claim of live LLM generation.
All rendering is browser-local Canvas 2D. There are no runtime art dependencies.

The gallery imports the **actual v3 pig and brick-house drawing functions**
from `v3/07-vanilla/sketch.js` and `props.js`, then renders them on a transparent
canvas above each generated world. Pip is a representative SVG doodle because
the real v3 hero is drawn by the child at runtime and has no fixed sprite.
`pip-fire.svg` holds that doodle and the campfire; `cast.svg` keeps the original
full composition study. Turn off **Show cast** to inspect the backgrounds alone.
To test a future sprite sheet, replace the foreground drawing layer; background
generation needs no change.

## Emberwood seasonal walk

The [seven animated season transitions](emberwood-transitions/) live in a
separate gallery inside this folder. They scroll a continuous route through
winter, spring, summer and fall without showing characters. Open it at
`http://localhost:8013/bonfire-backgrounds/emberwood-transitions/`, or follow
the link on Emberwood's gallery card. See its
[implementation notes](emberwood-transitions/README.md) for the seven methods.

## Seven pipelines

| Scene | Generator | Reference / related open-source work |
| --- | --- | --- |
| Emberwood | Layered hills, depth-sorted conifer silhouettes, mist and glow | [Rough.js](https://github.com/rough-stuff/rough) for a possible hand-drawn finishing pass |
| Paper Hills | Soft-shadowed cut-paper landforms and foliage | [Paper.js](https://github.com/paperjs/paper.js) scene graph |
| The Winding Vale | Seeded contour lines, elevation bands and river | [d3-contour](https://github.com/d3/d3-contour) for a richer height-map version |
| Mosslight Marsh | Many translucent pigment dabs and irregular canopy stamps | [p5.js](https://github.com/processing/p5.js) creative coding approach |
| Firefly Night | Particle field, atmospheric silhouettes and local light | [PixiJS](https://github.com/pixijs/pixijs) for eventual animated lights |
| Faceted Morning | Jittered triangle mesh and limited mineral palette | [Trianglify](https://github.com/qrohlf/trianglify) geometry approach |
| The Inked Grove | Hand-drawn strokes, hatching and irregular leaf outlines | [Rough.js](https://github.com/rough-stuff/rough) sketch approach |

These links are **inspiration and possible next-stage tools**. This prototype
implements the algorithms directly in Canvas 2D; it does not bundle or call
the linked libraries. Each scene uses the same foreground and 960×540 stage to
keep the comparison fair. The Bonfire reference is mood, composition, and
depth, not copied game art.
