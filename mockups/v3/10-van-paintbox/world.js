/* world.js — Painty Road: the painted world that DRAWS ITSELF ON,
 * stroke-by-stroke, just ahead of the hero. (zero dependencies)
 *
 * Technique is a straight port of the Emberwood "Highland Path" renderer
 * (mockups/bonfire-backgrounds/emberwood-transitions/app.js):
 * hash/rnd seeded noise, periodic() ridge lines, wrap()/occ() world coords,
 * and a climate() that cross-blends palettes along world-x — except here
 * the blend hops between "stops" pushed by WORLD.ahead(scene_seed), so the
 * world morphs into the next biome as you travel, never wipes.
 *
 * THE SIGNATURE — the "reveal frontier". `paintXf` is the paint head in
 * world coords (the app feeds it a target = heroWX + ~250 via paintAhead).
 *   - behind the frontier : fully painted Highland-Path-style soft fills
 *   - inside the frontier  (~140px band): terrain animates in — ridge lines
 *     stroke on via a setLineDash reveal, bands fill under a wobbly wet
 *     edge, cloud puffs pop blob-by-blob, trees grow trunk -> canopy,
 *     the trail's stitches paint forward, flowers pop
 *   - ahead of the frontier : faint pencil-ghost silhouettes on unpainted
 *     paper — you can see what's about to be drawn
 * A little dipped-brush cursor rides the wet edge for flavor.
 *
 * Public API (PAINTED.md contract):
 *   frame(ctx, cam, time)   painted world at camera cam, call every rAF
 *   ahead(sceneSeed)        the road ahead morphs toward this biome/palette
 *   groundAt(worldX)        painted trail line Y at a world x
 *   drawBuild(ctx,stage,x,y,r,opts)   crayon pig house (ported from 07)
 *   camStart(w)             initial cam so hero sits left-third
 *   resize(w,h)             logical stage size
 *   reset(wx0)              rewind the paint head (new story)
 *   paintAhead(wx)          set the frontier target (heroWX + 250)
 *   probe()                 headless-verification peek at frontier state
 */
'use strict';
(function () {
const SK = window.SK;

/* ================= seeded math (emberwood port) ================= */
const LEN = 8192;                       /* one painted lap of world */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);
const eob = k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function hash(n) { let a = (n | 0) + 0x6D2B79F5; a = Math.imul(a ^ (a >>> 15), 1 | a); a ^= a + Math.imul(a ^ (a >>> 7), 61 | a); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; }
function rnd(s, n) { return hash(s + n * 374761393); }
function rgb(v) { if (v.startsWith('rgb')) return (v.match(/\d+/g) || []).slice(0, 3).map(Number); const n = parseInt(v.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function blend(a, b, t) { const x = rgb(a), y = rgb(b); return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`; }
function periodic(x, k, ph) { return Math.sin(2 * Math.PI * x / LEN * (k || 1) + (ph || 0)); }
const wrap = x => ((x % LEN) + LEN) % LEN;

/* canvas micro-helpers — painted style (no crayon hatching out here) */
function fell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(.2, rx), Math.max(.2, ry), 0, 0, 6.3); c.fill(); }
function fpoly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); }
function ell(c, x, y, rx, ry, col, a) { c.globalAlpha = a == null ? 1 : a; c.fillStyle = col; fell(c, x, y, rx, ry); c.globalAlpha = 1; }
function pline(c, pts, col, w, a, dash) {
  c.globalAlpha = a == null ? 1 : a; c.strokeStyle = col; c.lineWidth = w;
  c.lineCap = 'round'; c.lineJoin = 'round'; if (dash) c.setLineDash(dash);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke(); if (dash) c.setLineDash([]); c.globalAlpha = 1;
}
function seg(c, x1, y1, x2, y2, col, w, a) { pline(c, [[x1, y1], [x2, y2]], col, w, a); }
function eout(c, x, y, rx, ry, col, w, a) {   /* pencil-outline ellipse for ghosts */
  c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = w; c.setLineDash([7, 5]);
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.3); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
}
const PENCIL = '#8A7F6E';                   /* the ghost-sketch color */

/* ================= palettes (07's warm set, + leaf key) ================= */
const PALETTES = {
  warm:  { skyTop: '#CDE7F6', skyBot: '#FFF3D2', hillFar: '#B9DFAE', hillNear: '#8FCE8F',
           grass: '#6FC07C', grassDeep: '#55A868', leaf: '#4FA85F', pine: '#3E8F57',
           sun: '#FFC53D', ray: '#F0A428', cloud: '#FFFDF6', path: '#EFDCAA',
           pathEdge: '#B98A4F', water: '#7FC4EE', waterHi: '#C4E7FB', rock: '#B9AFA0',
           flora: ['#FF6B57', '#FFC53D', '#FFFDF6', '#F58ACB'] },
  cool:  { skyTop: '#BFE3F5', skyBot: '#EAF6FF', hillFar: '#A8D4C2', hillNear: '#7FBCA8',
           grass: '#66B894', grassDeep: '#4FA07E', leaf: '#43A57F', pine: '#35805A',
           sun: '#FFE08A', ray: '#F0C94B', cloud: '#FFFDF6', path: '#EFE4BC',
           pathEdge: '#B98A4F', water: '#6FBEEA', waterHi: '#BEE9FB', rock: '#B9B4A6',
           flora: ['#5DA9E9', '#FFFDF6', '#9FD8F0', '#B565D8'] },
  dusk:  { skyTop: '#FFD3A0', skyBot: '#FCE3C2', hillFar: '#D8B48E', hillNear: '#B89372',
           grass: '#8FAF6E', grassDeep: '#789A58', leaf: '#7C9A52', pine: '#5E7A44',
           sun: '#FF9E57', ray: '#E8803F', cloud: '#FFE9D0', path: '#EFDCAA',
           pathEdge: '#B98A4F', water: '#F0A868', waterHi: '#FFD9A8', rock: '#A8988A',
           flora: ['#FF9E57', '#FFC53D', '#F58ACB', '#B565D8'] },
  night: { skyTop: '#333F63', skyBot: '#6E6E94', hillFar: '#475369', hillNear: '#3C4A66',
           grass: '#476B54', grassDeep: '#3A5A46', leaf: '#3A5F4A', pine: '#2E4A3C',
           sun: '#FFF1C4', ray: '#E8D9A0', cloud: '#4A5570', path: '#8A7E68',
           pathEdge: '#5E5442', water: '#3E5E8A', waterHi: '#7FA8D8', rock: '#6E6478',
           flora: ['#B565D8', '#8FD0F5', '#FFF1C4', '#5DA9E9'] },
};
const BIOME_MAP = {
  meadow: 'meadow', meadows: 'meadow', field: 'meadow', plains: 'meadow', grass: 'meadow',
  hill: 'meadow', hills: 'meadow',
  forest: 'forest', woods: 'forest', wood: 'forest', trees: 'forest', jungle: 'forest', grove: 'forest',
  river: 'river', stream: 'river', creek: 'river', water: 'river', lake: 'river', pond: 'river', brook: 'river',
  village: 'village', town: 'village', farm: 'village', homes: 'village',
  storm: 'storm', thunder: 'storm', thunderstorm: 'storm', windy: 'storm', wind: 'storm',
  rain: 'rain', rainstorm: 'rain', drizzle: 'rain', shower: 'rain',
  dusk: 'dusk', sunset: 'dusk', evening: 'dusk', twilight: 'dusk', midnight: 'dusk',
  night: 'dusk', dark: 'dusk',
  cave: 'cave', cavern: 'cave', tunnel: 'cave', den: 'cave',
  snow: 'snow', winter: 'snow', ice: 'snow', frost: 'snow',
};
/* per-biome feature weights — blended numerically along world-x */
const FEATS = {
  meadow:  { density: .6,  tree: .55, pine: .18, flower: .85, bush: .45, rock: .15, house: 0,   cattail: 0,   mushroom: .18, crystal: 0,   snow: 0, rain: 0, firefly: 0,   water: 0 },
  forest:  { density: .95, tree: .8,  pine: .8,  flower: .25, bush: .6,  rock: .3,  house: 0,   cattail: 0,   mushroom: .4,  crystal: 0,   snow: 0, rain: 0, firefly: .1,  water: 0 },
  river:   { density: .62, tree: .35, pine: .2,  flower: .45, bush: .3,  rock: .35, house: 0,   cattail: .95, mushroom: .1,  crystal: 0,   snow: 0, rain: 0, firefly: 0,   water: 1 },
  village: { density: .7,  tree: .3,  pine: .1,  flower: .4,  bush: .3,  rock: .3,  house: .9,  cattail: 0,   mushroom: 0,   crystal: 0,   snow: 0, rain: 0, firefly: 0,   water: 0 },
  storm:   { density: .5,  tree: .35, pine: .25, flower: .15, bush: .3,  rock: .5,  house: 0,   cattail: .2,  mushroom: 0,   crystal: 0,   snow: 0, rain: 1, firefly: 0,   water: .25 },
  rain:    { density: .5,  tree: .35, pine: .25, flower: .15, bush: .3,  rock: .5,  house: 0,   cattail: .3,  mushroom: .1,  crystal: 0,   snow: 0, rain: 1, firefly: 0,   water: .3 },
  dusk:    { density: .62, tree: .6,  pine: .3,  flower: .35, bush: .4,  rock: .3,  house: .12, cattail: 0,   mushroom: .18, crystal: 0,   snow: 0, rain: 0, firefly: .95, water: 0 },
  cave:    { density: .45, tree: 0,   pine: 0,   flower: 0,   bush: .15, rock: .7,  house: 0,   cattail: 0,   mushroom: 0,   crystal: .85, snow: 0, rain: 0, firefly: .35, water: .15 },
  snow:    { density: .5,  tree: .12, pine: .75, flower: 0,   bush: .2,  rock: .4,  house: 0,   cattail: 0,   mushroom: 0,   crystal: .15, snow: 1, rain: 0, firefly: 0,   water: 0 },
};

/* ================= world state ================= */
let W = 960, H = 540;
let stops = [];                          /* [{x, biome, palette, seed}] sorted by x */
let baked = [];                          /* scene_seed.props as world stickers */
let paintXf = 0, paintTarget = 0;        /* the paint head (world coords) */
let camNow = 0, tNow = 0, lastT = 0;
const BLEND = 800;                       /* biome cross-blend distance, world px */
const REVEAL = 150, LEAD = 36, GHOST = 560; /* frontier band / lead-in / ghost reach */
const PAINT_RATE = 780;                  /* px/s the paint head catches up at */

function resize(w, h) { W = w; H = h; }
function camStart(w) { return 420 - (w || W) * .32; }
function reset(wx0) {
  stops = [{ x: -1e12, biome: 'meadow', palette: 'warm', seed: 1234 }];
  baked = [];
  paintXf = wx0 - 170;                   /* a little painted ground behind the hero */
  paintTarget = wx0 + 250;
}
function paintAhead(wx) { paintTarget = Math.max(paintTarget, wx); }
function ahead(ss) {
  ss = ss || {};
  let biome = BIOME_MAP[String(ss.biome || 'meadow').toLowerCase()] || 'meadow';
  let palette = String(ss.palette || 'warm').toLowerCase();
  if (!PALETTES[palette]) palette = 'warm';
  if (biome === 'cave') palette = 'night';
  else if (biome === 'dusk' && palette === 'warm') palette = 'dusk';
  else if ((biome === 'storm' || biome === 'rain') && palette === 'warm') palette = 'cool';
  else if (biome === 'snow' && palette === 'warm') palette = 'cool';
  const seed = (ss.seed | 0) || 1234;
  /* the blend lands just past the wet edge, so the new biome materializes
     through the reveal frontier as it sweeps forward */
  const x = paintXf + 90;
  stops.push({ x, biome, palette, seed });
  stops.sort((a, b) => a.x - b.x);
  while (stops.length > 8) stops.splice(1, 1);      /* keep base + 7 newest */
  /* scene_seed.props become little crayon stickers planted in the world */
  (ss.props || []).slice(0, 4).forEach((k, i) => {
    const res = window.resolveKind(k), def = window.PROPS[res.def];
    if (def) baked.push({ def, word: res.word, seed: seed + i * 31,
      wx: x + 330 + i * 175 + rnd(seed, 900 + i) * 90 });
  });
  while (baked.length > 14) baked.shift();
}

/* climate along world-x: which pair of stops we're between + blend t.
   Per-frame memo caches keyed by ~32px buckets — col()/wgtFn run hundreds
   of times a frame and blend() would parse hex strings every call. */
let climCache = new Map(), colCache = new Map(), wgtCache = new Map();
function climate(wx) {
  let i = 0;
  while (i + 1 < stops.length && stops[i + 1].x <= wx) i++;
  const b = stops[i], a = stops[i - 1] || b;
  const t = i === 0 ? 1 : smooth(clamp((wx - b.x) / BLEND, 0, 1));
  return { a, b, t };
}
function climateAt(wx) {
  const k = wx >> 6;
  let c = climCache.get(k);
  if (!c) { c = climate(wx); climCache.set(k, c); }
  return c;
}
const palOf = s => PALETTES[s.palette] || PALETTES.warm;
function col(key, wx) {
  const k = key + '|' + (wx >> 5);
  let v = colCache.get(k);
  if (v === undefined) {
    const c = climateAt(wx);
    v = blend(palOf(c.a)[key], palOf(c.b)[key], c.t);
    colCache.set(k, v);
  }
  return v;
}
function leafAt(wx) { return col('leaf', wx); }
function floraCol(i, wx) { const c = climateAt(wx); return blend(palOf(c.a).flora[i % 4], palOf(c.b).flora[i % 4], c.t); }
function wgtFn(wx) {
  const k = wx >> 6;
  let f = wgtCache.get(k);
  if (!f) {
    const c = climateAt(wx);
    const fa = FEATS[c.a.biome] || FEATS.meadow, fb = FEATS[c.b.biome] || FEATS.meadow;
    const t = c.t;
    f = kk => (fa[kk] || 0) * (1 - t) + (fb[kk] || 0) * t;
    wgtCache.set(k, f);
  }
  return f;
}

/* the trail line — hero + props plant their feet on it */
function trailY(wx) { return H * .8 + 46 + periodic(wx, 5, .7) * 4.5 + periodic(wx, 9, 2) * 1.8; }
function groundAt(wx) { return trailY(wx) - 12; }

/* ================= reveal-frontier helpers ================= */
const thr = d => paintXf - camNow * (1 - d);          /* painted-threshold in layer coords */
const prog = (occ, d) => clamp((thr(d) - occ + LEAD) / REVEAL, 0, 1);
const ghostA = (occ, d) => { const g = occ - thr(d); return g > 0 && g < GHOST ? 1 - g / GHOST : 0; };
/* canonical lap position w -> the unwrapped occurrence nearest the view */
function occ(w, cam, d) { const base = cam * d; return w + Math.round((base + W * .55 - w) / LEN) * LEN; }
/* the wobbly wet edge, in screen x */
function edgeX(y) { return paintXf - camNow + Math.sin(y * .045 + tNow * 1.6) * 7 + Math.sin(y * .016 + 2.2) * 10; }
function paintClip(c, off) {
  c.beginPath(); c.moveTo(-80, -60);
  for (let y = -40; y <= H + 60; y += 20) c.lineTo(edgeX(y) + (off || 0), y);
  c.lineTo(-80, H + 60); c.closePath(); c.clip();
}
function ghostClip(c, off) {
  c.beginPath(); c.moveTo(W + 80, -60);
  for (let y = -40; y <= H + 60; y += 20) c.lineTo(edgeX(y) + (off || 0), y);
  c.lineTo(W + 80, H + 60); c.closePath(); c.clip();
}

/* ================= sky / sun / paper-ahead ================= */
function sky(ctx, cam) {
  for (let x = 0; x < W; x += 34) {
    const wx = cam + x + 17;
    const g = ctx.createLinearGradient(0, 0, 0, H * .88);
    g.addColorStop(0, col('skyTop', wx)); g.addColorStop(1, col('skyBot', wx));
    ctx.fillStyle = g; ctx.fillRect(x, 0, 35, H * .88 + 4);
  }
  /* the sun hangs near the hero's side of the sky — always already painted */
  const sx = W * .14, sy = 78;
  const g2 = ctx.createRadialGradient(sx, sy, 4, sx, sy, 130);
  g2.addColorStop(0, 'rgba(255,240,190,.5)'); g2.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(sx, sy, 130, 0, 6.3); ctx.fill();
  ell(ctx, sx, sy, 30, 30, col('sun', cam + sx));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * 6.3 + Math.sin(tNow * .4) * .05;
    seg(ctx, sx + Math.cos(a) * 38, sy + Math.sin(a) * 38,
      sx + Math.cos(a) * 50, sy + Math.sin(a) * 50, col('ray', cam + sx), 3, .8);
  }
  /* unpainted paper beyond the frontier */
  ctx.save(); ghostClip(ctx, -6);
  ctx.globalAlpha = .94; ctx.fillStyle = '#FDF3E3'; ctx.fillRect(-10, -10, W + 20, H + 20);
  ctx.restore();
}

function clouds(ctx, cam) {
  for (let i = 0; i < 15; i++) {
    const w = i * 547 + rnd(707, 200 + i) * 160;
    const o = occ(w, cam, .16), x = o - cam * .16;
    if (x < -130 || x > W + 130) continue;
    const p = prog(o, .16), g = ghostA(o, .16);
    const y = 48 + rnd(707, 310 + i) * 120, s = .62 + rnd(707, 421 + i) * .8;
    const puffs = [[-21 * s, 5 * s, 23 * s, 9 * s], [0, 0, 34 * s, 12 * s], [27 * s, 5 * s, 28 * s, 8 * s]];
    if (p <= 0) {
      if (g > 0) puffs.forEach(pf => eout(ctx, x + pf[0], y + pf[1], pf[2], pf[3], PENCIL, 1.4, .14 * g));
      continue;
    }
    const cc = blend(col('cloud', o), '#ffffff', .35);
    /* blob-by-blob pop-in */
    puffs.forEach((pf, j) => {
      const tj = (p - .06 - j * .2) / .26;
      if (tj <= 0) return;
      const k = eob(clamp(tj, 0, 1));
      ell(ctx, x + pf[0], y + pf[1], pf[2] * k, pf[3] * k, cc, .93);
    });
  }
}

/* ================= ridge bands ================= */
function ridgeN(world, layer) {
  return periodic(world, 2 + layer, .35 * 777 + layer) + .42 * periodic(world, 5 + layer, 1.2) + .23 * periodic(world, 9, 2.4);
}
function band(ctx, cam, layer) {
  const depth = [.34, .62, 1][layer], y0 = [.563, .678, .802][layer] * H, amp = [30, 25, 16][layer];
  const field = ['hillFar', 'hillNear', 'grass'][layer];
  const pts = [];
  for (let x = -30; x <= W + 30; x += 12) {
    const wx = cam * depth + x;
    pts.push([x, y0 + ridgeN(wx, layer) * amp]);
  }
  /* painted fill behind the wet edge */
  ctx.save(); paintClip(ctx, 6);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, col(field, cam * depth)); g.addColorStop(1, col(field, cam * depth + W));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-40, H + 40);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(W + 40, H + 40); ctx.closePath(); ctx.fill();
  /* a soft tonal stroke halfway down the band = painted depth */
  ctx.strokeStyle = blend(col(field, cam * depth + W * .5), '#3c4a3c', .18);
  ctx.lineWidth = 7; ctx.globalAlpha = .3;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; if (i === 0) ctx.moveTo(p[0], p[1] + amp * .55); else ctx.lineTo(p[0], p[1] + amp * .55);
  }
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
  /* the ridge ink-line strokes itself on — setLineDash reveal along the
     polyline, deliberately ~26px past the fill so the outline leads */
  const vis = Math.max(0, paintXf - camNow + 26 + 34);
  pline(ctx, pts, blend(col(field, cam * depth + W * .4), '#3A3140', .34), 2.6, .85, [vis, 99999]);
  /* pencil ghost ahead on the blank paper */
  ctx.save(); ghostClip(ctx, 26);
  ctx.globalAlpha = .05; ctx.fillStyle = PENCIL;
  ctx.beginPath(); ctx.moveTo(-40, H + 40);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(W + 40, H + 40); ctx.closePath(); ctx.fill();
  pline(ctx, pts, PENCIL, 1.7, .16, [7, 6]);
  ctx.restore();
}

/* ================= scatter objects (trees, houses, flowers…) ================= */
function pickKind(o, r1, r2, layer) {
  const wgt = wgtFn(o);
  const cands = layer === 0
    ? [['tree', .95], ['pine', .9], ['house', .55], ['bush', .35], ['mushroom', .3]]
    : [['tree', .8], ['pine', .72], ['house', .95], ['cattail', .9], ['mushroom', .62],
       ['crystal', .9], ['bush', .78], ['rock', .62], ['flower', .72]];
  let best = 'tuft', bs = .14;
  for (const [k, cap] of cands) {
    const sc = wgt(k) * cap * (.55 + r1);
    if (sc > bs) { bs = sc; best = k; }
  }
  if (best === 'tuft' || r2 > wgt('density')) return 'tuft';
  return best;
}

/* every scatter shape draws inside a s-scaled frame, feet at y=0.
   ghost mode: same silhouette in flat pencil so kids see what's coming. */
function scatter(ctx, kind, x, by, s, p, ga, o, seed) {
  ctx.save(); ctx.translate(x, by); ctx.scale(s, s);
  const F = PENCIL;
  if (ga > 0) {                      /* ghost pass: flat pencil silhouette */
    ctx.globalAlpha = .16 * ga; ctx.fillStyle = F;
    switch (kind) {
      case 'tree': ctx.fillRect(-5, -66, 10, 66); fell(ctx, 0, -94, 32, 27);
        fell(ctx, -24, -68, 24, 20); fell(ctx, 24, -70, 25, 21); break;
      case 'pine': ctx.fillRect(-4, -30, 8, 30);
        fpoly(ctx, [[-30, -30], [30, -30], [0, -74]]);
        fpoly(ctx, [[-24, -58], [24, -58], [0, -102]]);
        fpoly(ctx, [[-17, -84], [17, -84], [0, -126]]); break;
      case 'house': ctx.fillRect(-46, -44, 92, 44);
        fpoly(ctx, [[-54, -44], [54, -44], [0, -76]]); break;
      case 'cattail': ctx.fillRect(-2, -34, 3.5, 34); fell(ctx, -1, -42, 4, 10); break;
      case 'mushroom': ctx.fillRect(-7, -20, 14, 20);
        fpoly(ctx, [[-18, -18], [-12, -36], [0, -42], [12, -36], [18, -18]]); break;
      case 'crystal': fpoly(ctx, [[-14, 0], [-8, -34], [4, -44], [14, -18], [12, 0]]);
        fpoly(ctx, [[12, 0], [18, -22], [26, -14], [24, 0]]); break;
      case 'bush': fell(ctx, -16, -18, 22, 16); fell(ctx, 16, -16, 20, 14); fell(ctx, 0, -30, 24, 18); break;
      case 'rock': fpoly(ctx, [[-26, 0], [-22, -20], [-6, -30], [18, -24], [26, -8], [22, 0]]); break;
      case 'flower': ctx.fillRect(-1.5, -28, 3, 28); fell(ctx, 0, -34, 10, 10); break;
      default: seg(ctx, 0, 0, -5, -14, F, 2, .16 * ga); seg(ctx, 0, 0, 0, -16, F, 2, .16 * ga);
        seg(ctx, 0, 0, 5, -13, F, 2, .16 * ga);
    }
    ctx.restore(); return;
  }
  if (p <= 0) { ctx.restore(); return; }
  const leaf = leafAt(o);
  switch (kind) {
    case 'tree': {
      const th = clamp(p / .4, 0, 1);
      ctx.fillStyle = '#6B543C'; ctx.fillRect(-5, -66 * th, 10, 66 * th);
      [[0, -94, 32, 27], [-24, -68, 24, 20], [24, -70, 25, 21], [2, -58, 26, 19]].forEach((b, j) => {
        const tj = (p - .38 - j * .15) / .24;
        if (tj > 0) { const k = eob(clamp(tj, 0, 1)); ctx.fillStyle = leaf; fell(ctx, b[0], b[1] * 1, b[2] * k, b[3] * k); }
      });
      break;
    }
    case 'pine': {
      const th = clamp(p / .3, 0, 1);
      ctx.fillStyle = '#6B543C'; ctx.fillRect(-4, -30 * th, 8, 30 * th);
      const pc = blend(leaf, '#2E7A46', .3);
      [[-30, -74, 30], [-58, -102, 24], [-84, -126, 17]].forEach((t, j) => {
        const tj = (p - .3 - j * .17) / .28;
        if (tj > 0) { const k = eob(clamp(tj, 0, 1)); ctx.fillStyle = pc;
          fpoly(ctx, [[-t[2] * k, t[0]], [t[2] * k, t[0]], [0, t[0] + (t[1] - t[0]) * k]]); }
      });
      break;
    }
    case 'house': {
      const hw = 46, hh = 44;
      const th = clamp(p / .45, 0, 1);
      ctx.fillStyle = '#FFE7B8'; ctx.fillRect(-hw, -hh * th, hw * 2, hh * th);
      const tj = (p - .42) / .3;
      if (tj > 0) { const k = eob(clamp(tj, 0, 1)); ctx.fillStyle = '#E86A4E';
        fpoly(ctx, [[-(hw + 8) * k, -hh], [(hw + 8) * k, -hh], [0, -hh - 30 * k]]); }
      if (p > .68) { ctx.fillStyle = '#8A5E2E'; ctx.fillRect(-9, -22, 18, 22); }
      if (p > .8) { ctx.fillStyle = '#FFF6C9'; ctx.fillRect(14, -34, 14, 12); }
      break;
    }
    case 'cattail': {
      const th = clamp(p / .4, 0, 1);
      ctx.strokeStyle = '#3E8F57'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, -34 * th); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(9, -26 * th); ctx.stroke();
      if (p > .45) { const k = eob(clamp((p - .45) / .3, 0, 1)); ctx.fillStyle = '#8A5E2E';
        fell(ctx, -2, -36 - 6 * k, 4 * k, 10 * k); }
      break;
    }
    case 'mushroom': {
      const th = clamp(p / .45, 0, 1);
      ctx.fillStyle = '#FFF1D6'; ctx.fillRect(-7, -20 * th, 14, 20 * th);
      const tj = (p - .42) / .3;
      if (tj > 0) { const k = eob(clamp(tj, 0, 1)); ctx.fillStyle = '#FF6B57';
        fpoly(ctx, [[-18 * k, -18], [-12 * k, -18 - 18 * k], [0, -18 - 24 * k], [12 * k, -18 - 18 * k], [18 * k, -18]]);
        ctx.fillStyle = '#FFFDF6'; fell(ctx, -6, -30 * k, 2.4, 2.4); fell(ctx, 5, -26 * k, 2, 2); }
      break;
    }
    case 'crystal': {
      const k = eob(clamp(p / .6, 0, 1));
      ctx.fillStyle = '#B565D8';
      fpoly(ctx, [[-14 * k, 0], [-8 * k, -34 * k], [4 * k, -44 * k], [14 * k, -18 * k], [12 * k, 0]]);
      ctx.fillStyle = '#5DA9E9';
      fpoly(ctx, [[12 * k, 0], [18 * k, -22 * k], [26 * k, -14 * k], [24 * k, 0]]);
      break;
    }
    case 'bush': {
      [[-16, -18, 22, 16], [16, -16, 20, 14], [0, -30, 24, 18]].forEach((b, j) => {
        const tj = (p - .1 - j * .2) / .3;
        if (tj > 0) { const k = eob(clamp(tj, 0, 1)); ctx.fillStyle = blend(leaf, '#ffffff', .08);
          fell(ctx, b[0], b[1], b[2] * k, b[3] * k); }
      });
      break;
    }
    case 'rock': {
      const k = eob(clamp(p / .55, 0, 1));
      ctx.fillStyle = col('rock', o);
      fpoly(ctx, [[-26 * k, 0], [-22 * k, -20 * k], [-6 * k, -30 * k], [18 * k, -24 * k], [26 * k, -8 * k], [22 * k, 0]]);
      ctx.strokeStyle = blend(col('rock', o), '#3A3140', .3); ctx.lineWidth = 1.6; ctx.globalAlpha = .5;
      ctx.beginPath(); ctx.moveTo(-12 * k, -20 * k); ctx.lineTo(6 * k, -24 * k); ctx.stroke(); ctx.globalAlpha = 1;
      break;
    }
    case 'flower': {
      const th = clamp(p / .4, 0, 1);
      ctx.strokeStyle = '#3E8F57'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, -30 * th); ctx.stroke();
      const tj = (p - .38) / .35;
      if (tj > 0) {
        const k = eob(clamp(tj, 0, 1)), fc = floraCol(seed % 4, o);
        ctx.fillStyle = fc;
        for (let j = 0; j < 5; j++) {
          const a = j / 5 * 6.3 - 1.57;
          fell(ctx, 1 + Math.cos(a) * 8 * k, -34 + Math.sin(a) * 8 * k, 4.5 * k, 4.5 * k);
        }
        ctx.fillStyle = '#FFC53D'; fell(ctx, 1, -34, 4 * k, 4 * k);
      }
      break;
    }
    default: { /* 'tuft' — grass blades sketch themselves up */
      const k = clamp(p / .5, 0, 1);
      ctx.strokeStyle = blend(col('grassDeep', o), '#2E5A36', .2); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(j * 6 + Math.sin(seed + j) * 2, -(11 + (seed % 5) + j * 2) * k);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/* one layer of scattered world objects — positions are pure functions of
   index + lap, so every thing has a stable world coordinate */
function scatLayer(ctx, cam, layer) {
  const depth = layer === 0 ? .62 : 1, step = layer === 0 ? 108 : 74;
  const sBase = layer === 0 ? .52 : .9;
  const n = Math.ceil(LEN / step);
  for (let i = 0; i < n; i++) {
    const w = i * step + rnd(4242 + layer * 77, i * 3 + 11) * step * .72;
    const o = occ(w, cam, depth), x = o - cam * depth;
    if (x < -100 || x > W + 100) continue;
    const p = prog(o, depth), ga = ghostA(o, depth);
    if (p <= 0 && ga <= 0) continue;
    const r1 = rnd(4242 + layer, i * 7 + 5), r2 = rnd(91 + layer, i * 13 + 3);
    const by = layer === 0
      ? H * .70 + rnd(4 + layer, i) * H * .05
      : H * .83 + rnd(9 + layer, i) * H * .055;
    const kind = pickKind(o, r1, r2, layer);
    scatter(ctx, kind, x, by, sBase * (.6 + r1 * .7), p, p <= 0 ? ga : 0, o, i * 31 + layer * 7);
  }
}

/* ================= trail / water / small life ================= */
function trail(ctx, cam) {
  const pts = [];
  for (let x = -44; x <= W + 44; x += 14) pts.push([x, trailY(cam + x)]);
  ctx.save(); paintClip(ctx, 4);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, col('path', cam)); g.addColorStop(1, col('path', cam + W));
  ctx.strokeStyle = g; ctx.lineWidth = 40; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.stroke();
  /* the stitched dashes paint forward a beat behind the edge */
  ctx.save(); ctx.beginPath(); ctx.moveTo(-80, -60);
  for (let y = -40; y <= H + 60; y += 20) ctx.lineTo(edgeX(y) - 40, y);
  ctx.lineTo(-80, H + 60); ctx.closePath(); ctx.clip();
  ctx.setLineDash([11, 22]); ctx.strokeStyle = '#FFF7E0'; ctx.lineWidth = 2.4;
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] - 4) : ctx.moveTo(p[0], p[1] - 4));
  ctx.stroke(); ctx.setLineDash([]);
  ctx.restore(); ctx.restore();
  /* ghost road ahead — pencil dashes on the blank page */
  ctx.save(); ghostClip(ctx, 26);
  pline(ctx, pts.map(p => [p[0], p[1]]), PENCIL, 3, .16, [12, 10]);
  ctx.restore();
}

function river(ctx, cam) {
  /* where the river biome weight is high, the path is a painted water band */
  ctx.save(); paintClip(ctx, 4);
  for (let x = -30; x < W + 30; x += 18) {
    const wx = cam + x, w = wgtFn(wx)('water');
    if (w < .4) continue;
    const y = trailY(wx) + 6, y2 = trailY(wx + 18) + 6;
    ctx.globalAlpha = Math.min(.85, (w - .4) * 2.6);
    ctx.fillStyle = col('water', wx);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 19, y2);
    ctx.lineTo(x + 19, y2 + 66); ctx.lineTo(x, y + 66); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = Math.min(.7, (w - .4) * 2.4);
    ctx.strokeStyle = col('waterHi', wx); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 3, y + 16); ctx.lineTo(x + 15, y2 + 13); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function undergrowth(ctx, cam) {
  for (let i = 0; i < 190; i++) {
    const w = i * 43 + rnd(555, 1000 + i) * 30, o = occ(w, cam, 1), x = o - cam;
    if (x < -16 || x > W + 16) continue;
    const p = prog(o, 1), ga = ghostA(o, 1);
    const y = H * .815 + rnd(555, 1200 + i) * H * .15;
    if (p <= 0) {
      if (ga > 0 && i % 3 === 0) seg(ctx, x, y, x + 2, y - 9, PENCIL, 1.5, .14 * ga);
      continue;
    }
    const k = clamp(p * 1.7, 0, 1);
    const fl = rnd(555, 1400 + i);
    if (fl < wgtFn(o)('flower') * .5) {
      /* a flower painting itself: stem up, then petals pop */
      ctx.strokeStyle = '#3E8F57'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 13 * k); ctx.stroke();
      const tj = (p - .45) / .4;
      if (tj > 0) {
        const kk = eob(clamp(tj, 0, 1));
        ctx.fillStyle = floraCol(i, o);
        for (let j = 0; j < 5; j++) {
          const a = j / 5 * 6.3 - 1.57;
          fell(ctx, x + 1 + Math.cos(a) * 5.5 * kk, y - 15 + Math.sin(a) * 5.5 * kk, 3 * kk, 3 * kk);
        }
        ctx.fillStyle = '#FFC53D'; fell(ctx, x + 1, y - 15, 2.6 * kk, 2.6 * kk);
      }
    } else {
      ctx.strokeStyle = blend(col('grassDeep', o), '#2E5A36', .25);
      ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.globalAlpha = .8;
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + j * 5 + (rnd(i, j + 7) - .5) * 3, y - (9 + rnd(i, j + 3) * 7) * k);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}

/* scene_seed.props planted in the world as crayon stickers — they pop in
   through the same frontier as everything else */
function bakedProps(ctx, cam) {
  for (const b of baked) {
    const x = b.wx - cam;
    if (x < -90 || x > W + 90) continue;
    const p = prog(b.wx, 1), ga = ghostA(b.wx, 1);
    const by = groundAt(b.wx) + 2;
    if (p <= 0) {
      if (ga > 0) {
        ctx.save(); ctx.globalAlpha = .13 * ga;
        ctx.translate(x - b.def.w * .28, by - b.def.h * .55);
        ctx.scale(.55, .55);
        b.def.draw(ctx, b.def.w, b.def.h, SK.rng(b.seed), b.word);
        ctx.restore();
      }
      continue;
    }
    const k = eob(clamp(p / .8, 0, 1));
    ctx.save();
    ctx.translate(x, by); ctx.scale(.55 * k, .55 * k);
    ctx.globalAlpha = Math.min(1, p * 1.6);
    ctx.translate(-b.def.w / 2, -b.def.h + 8);
    b.def.draw(ctx, b.def.w, b.def.h, SK.rng(b.seed), b.word);
    ctx.restore();
    if (p > .9) SK.caption(ctx, b.word, x, by + 15, SK.rng(b.seed + 3), { size: 13 });
  }
}

/* rain streaks / snow motes / fireflies / butterflies — ambient life that
   also waits behind the frontier until it's painted */
function weather(ctx, cam) {
  for (let i = 0; i < 120; i++) {
    const w = i * 71 + rnd(909, 2200 + i) * 40, o = occ(w, cam, 1), x = o - cam;
    if (x < -10 || x > W + 10) continue;
    const p = prog(o, 1); if (p < .55) continue;
    const wgt = wgtFn(o);
    const y = (rnd(909, 2600 + i) * H * .72 + tNow * (18 + rnd(909, 2700 + i) * 22)) % (H * .78) + 16;
    const rw = wgt('rain'), sw = wgt('snow');
    if (rw > .15) seg(ctx, x, y, x - 4, y + 11, '#9FC8E8', 1.6, rw * .5 * p);
    else if (sw > .15) ell(ctx, x + Math.sin(tNow * 1.3 + i) * 5, y, 1.6 + sw, 1.6 + sw, '#FFFDF6', sw * .6 * p);
  }
  for (let i = 0; i < 26; i++) {
    const w = i * 300 + rnd(313, i) * 140, o = occ(w, cam, .85), x = o - cam * .85;
    if (x < -20 || x > W + 20) continue;
    const p = prog(o, .85); if (p < .5) continue;
    const fw = wgtFn(o)('firefly'); if (fw < .2) continue;
    const y = H * .3 + rnd(313, 77 + i) * H * .38 + Math.sin(tNow * 1.7 + i) * 9;
    ell(ctx, x, y, 2.4, 2.4, '#FFE9A0', fw * (.3 + .6 * Math.abs(Math.sin(tNow * 2.4 + i * 2))) * p);
  }
  for (let i = 0; i < 8; i++) {
    const w = i * 900 + rnd(414, i) * 300, o = occ(w, cam, .9), x = o - cam * .9 + Math.sin(tNow * .9 + i) * 26;
    if (x < -30 || x > W + 30) continue;
    const p = prog(o, .9); if (p <= 0) continue;
    const wgt = wgtFn(o);
    const mw = Math.max(wgt('flower'), wgt('tree') * .6); if (mw < .25) continue;
    const y = H * .34 + rnd(414, i + 9) * H * .24 + Math.sin(tNow * 2.2 + i * 1.3) * 14;
    const fl = Math.sin(tNow * 9 + i * 3) * .4;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .75 * p * mw;
    ctx.fillStyle = floraCol(i, o);
    ctx.beginPath(); ctx.ellipse(-4, 0, 5, 3 + fl * 2, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, 0, 5, 3 + fl * 2, 0, 0, 6.3); ctx.fill();
    ctx.restore();
  }
}

/* ================= the wet edge + the little brush ================= */
function wetEdge(ctx, cam) {
  const xF = paintXf - cam;
  if (xF < -80 || xF > W + 100) return;
  /* wet sheen right behind the paint head */
  const sg = ctx.createLinearGradient(xF - 30, 0, xF + 8, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(.8, 'rgba(255,255,255,.13)');
  sg.addColorStop(1, 'rgba(255,255,255,.3)');
  ctx.fillStyle = sg; ctx.fillRect(xF - 30, 0, 38, H);
  /* the wobbly seam itself */
  ctx.strokeStyle = 'rgba(90,70,50,.22)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = -10; y <= H + 10; y += 22) {
    const x = edgeX(y);
    y === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  /* a little dipped brush rides the edge, painting the road */
  const bx = xF + 2, by = groundAt(paintXf) + 9;
  const lag = clamp(paintTarget - paintXf, 0, 320);
  const wob = Math.sin(tNow * (5 + lag * .02)) * (.05 + lag * .0004);
  ctx.save(); ctx.translate(bx, by); ctx.rotate(-.72 + wob);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8A5E2E'; ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24, -30); ctx.stroke();
  ctx.strokeStyle = '#C8CDD4'; ctx.lineWidth = 7.5;
  ctx.beginPath(); ctx.moveTo(24, -30); ctx.lineTo(29, -36); ctx.stroke();
  ctx.strokeStyle = col('path', paintXf); ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(30, -37); ctx.lineTo(37, -45); ctx.stroke();
  ctx.restore();
  ell(ctx, bx - 2, by - 1, 5, 2.6, col('path', paintXf), .8);
}

/* ================= the frame ================= */
function frame(ctx, cam, time) {
  camNow = cam; tNow = time;
  climCache.clear(); colCache.clear(); wgtCache.clear();
  /* dt cap .12 (not .05): under software rasterizers the rAF can drop to
     ~4fps and a tight cap would stall the paint head mid-walk */
  const dt = Math.min(.12, Math.max(0, time - (lastT || time)));
  lastT = time;
  /* the paint head chases its target — only forward, never unpaints */
  paintXf += clamp(paintTarget - paintXf, 0, dt * PAINT_RATE);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#FDF3E3';           /* paper floor under everything */
  ctx.fillRect(0, 0, W, H);

  sky(ctx, cam);
  clouds(ctx, cam);
  band(ctx, cam, 0);
  scatLayer(ctx, cam, 0);
  band(ctx, cam, 1);
  band(ctx, cam, 2);
  river(ctx, cam);
  trail(ctx, cam);
  scatLayer(ctx, cam, 1);
  undergrowth(ctx, cam);
  bakedProps(ctx, cam);
  weather(ctx, cam);
  wetEdge(ctx, cam);
}

/* ================= the pig house (crayon, ported from 07) ================= */
function drawBuild(ctx, stage, cx, gy, r, opts) {
  opts = opts || {};
  const y = gy + 4;
  if (stage <= 0) {
    SK.rect(ctx, cx - 80, y - 70, 160, 70,
      { r, stroke: '#B9A78A', strokeWidth: 2.4, dash: [8, 8], amp: 2 });
    SK.text(ctx, 'house plot', cx, y - 34, { size: 15, fill: '#B9A78A' });
    return;
  }
  const defs = { 1: 'strawhouse', 2: 'stickhouse', 3: 'brickhouse' };
  const def = window.PROPS[defs[Math.min(3, stage)]];
  if (!def) return;
  const sc = Math.min(1.06, 340 / def.w);
  ctx.save();
  ctx.translate(cx - def.w * sc / 2, y - def.h * sc);
  if (opts.shake) ctx.translate(r.rr(-3, 3), r.rr(-2, 2));
  ctx.scale(sc, sc);
  def.draw(ctx, def.w, def.h, r);
  ctx.restore();
  if (opts.doorOpen) {
    SK.circle(ctx, cx, y - 40, 16, { r, fill: '#FFF6C9', stroke: 'none' });
    SK.line(ctx, cx - 86, y - 118, cx - 86, y - 160, { r, strokeWidth: 3 });
    SK.poly(ctx, [[cx - 86, y - 160], [cx - 54, y - 152], [cx - 86, y - 142]],
      { r, fill: '#4FB06D', strokeWidth: 2 });
  }
}

window.WORLD = {
  frame, ahead, groundAt, drawBuild, camStart, resize, reset, paintAhead,
  probe: () => ({ paintX: Math.round(paintXf), target: Math.round(paintTarget),
    frontierSX: Math.round(paintXf - camNow), biomes: stops.map(s => s.biome),
    palette: (climate(camNow + W * .5).b || {}).palette }),
};
})();
