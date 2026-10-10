# Emberwood: walk through the year

Seven procedural motion studies of a continuous Emberwood route. All seven
canvases share a camera position and show winter → spring → summer → fall →
winter as **spatial changes along the path**. There are no characters in these
studies. The route repeats seamlessly; the camera keeps moving forward.

Run from the `mockups/` directory:

```bash
python3 -m http.server 8013 --bind 127.0.0.1
```

Open `http://localhost:8013/bonfire-backgrounds/emberwood-transitions/`.
The existing v3 server also serves this page at
`http://localhost:8001/bonfire-backgrounds/emberwood-transitions/`.

## What changes in each study

1. **The Slow Thaw:** sky, snow, conifers and ground color blend together.
2. **The Changing Treeline:** tree species move from firs to leafy forms.
3. **Horizon in Layers:** far, middle and near planes introduce the next
   season at different distances and scroll speeds.
4. **Along the River:** an unbroken river changes from ice to open water and
   warm banks.
5. **A Passing Front:** precipitation changes from snow to rain, clear air,
   and drifting leaves according to world position.
6. **The Highland Path:** elevation and rocky ground alter the snowline while
   the trail continues.
7. **Lanternward:** the same seasonal route passes through twilight and warm
   pools of lantern light.

The route is 3,840 world units long, with a seasonal anchor every 960 units.
`climate(worldX)` blends adjacent palettes with a smooth interpolation.
Landforms use periodic sine fields, and trees, flowers, rocks, clouds and
lights use deterministic positions. The camera samples the world at
`worldX = travel + screenX`; distant layers use a slower camera factor for
parallax. Nothing swaps the entire background on a season boundary. The year
cycles back to winter with periodic terrain and palette values.

The slider seeks to any position. The play button pauses the walk, and speed
controls set how quickly it moves. For a reproducible still frame, use
`?at=930&pause=1`. All art is native Canvas 2D and is intentionally kept near
Emberwood's soft silhouettes and muted, layered colors. The direction of
travel is inspired by continuous side-scrolling exploration, while the
minimal atmospheric palette refers to
[The Bonfire: Forsaken Lands](https://store.steampowered.com/app/788210/The_Bonfire_Forsaken_Lands/).
