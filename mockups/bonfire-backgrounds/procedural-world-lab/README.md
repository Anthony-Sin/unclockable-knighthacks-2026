# Living landscape lab

Open [the gallery](index.html) or visit `http://127.0.0.1:8013/bonfire-backgrounds/procedural-world-lab/` while serving `mockups/` on port 8013. Eight browser-local Canvas 2D renderers interpret the same brief. **Show me a place** picks a fresh combination without typing; **Same place, new seed** rerolls its geometry. Drag the route slider or let it walk forward from the Highland Path into the new biome.

| # | Method | What is generated |
|---|---|---|
| 1 | Noise field | Continuous ridge, soil, wetness, and vegetation density fields |
| 2 | Habitat mosaic | Blended neighborhood regions with different grove densities and hill heights |
| 3 | Branch grammar | Trees grown recursively from trunk and branch-angle rules |
| 4 | Contour and strata | Height bands and land contours over a continuous terrain field |
| 5 | Water follows land | Wet channels determine where reeds and trees grow |
| 6 | Living colonies | Seeded plant clusters with local survival and spacing rules |
| 7 | Neighbor grammar | Connected neighboring habitat patches, with continuous edges |
| 8 | Open world synthesis | Combines fields, habitat variation, growth, water-aware placement, and ground-locked plants |

These are small custom implementations inspired by established procedural approaches, not packages bundled into the mockup. Useful references: [FastNoiseLite](https://github.com/Auburn/FastNoiseLite) for continuous noise fields, [Red Blob Games mapgen4](https://www.redblobgames.com/maps/mapgen4/) for terrain and drainage, [Algorithmic Botany's L-system survey](https://algorithmicbotany.org/papers/l-sys.csiro96.pdf) for rule-based plant growth, and [WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse) for adjacency-based composition. Method 7 is a lightweight neighborhood grammar, **not** a full WFC implementation.

## Speed and grounding

Everything renders in the browser without network fetches or a generative model. A brief becomes `{biome, wetness, elevation, trees, plant, mood, landmark}`. The seed fixes world coordinates. Ground height is sampled at each plant's world position, and plant bases sit on that computed height during camera movement. There are no stored sprite or background assets in method 8. Terrain, crowns, trunks, reeds, grass, and water are generated as Canvas paths. Render time is shown in the control panel on each generation.

## Current limitation

The text parser recognizes a deliberately broad but finite list of climate, biome, plant, weather, and landmark words. An unknown word changes the seed through the brief text but does not create a new semantic category. Adding a new plant family still needs a growth rule, or an external model/asset synthesis step. A later LLM could turn freeform prose into the small scene specification; running an image model for every step would break the instant feedback target, so the fast renderer should remain the runtime path.
