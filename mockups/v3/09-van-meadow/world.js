/* world.js — Meadowpath: a painted meadow renderer (zero dependencies).
 *
 * The Highland Path port: the only animated state is camera travel; every
 * object lives at a stable world coordinate on a wrapping WORLD_LEN ring.
 *
 *   WORLD.frame(ctx, cam, time) — repaint the whole painted world at cam
 *   WORLD.ahead(sceneSeed)      — terrain AHEAD morphs toward the new biome
 *   WORLD.groundAt(worldX)      — painted trail Y at a world x
 *   WORLD.drawBuild(...)        — crayon pig house (ported from 07 unchanged)
 *   WORLD.camStart()            — initial cam so the hero sits left-third
 *
 * Techniques ported from bonfire-backgrounds/emberwood-transitions:
 * hash/rnd/periodic noise, wrap/visibleX depth projection, climate()/col()
 * palette blending along world distance, layered ridge band()s, soft
 * ellipse clouds, painted pine + round trees, a dashed winding trail,
 * and undergrowth strokes. Palette words come from 07's PALETTES,
 * adapted to softer painted tones.
 *
 * Painted rule: terrain is filled soft shapes only — no sketchy outlines.
 * Crayon (SK) stays for the house + actors, which live in app.js/props.js.
 */
'use strict';
(function () {
const SK = window.SK;

/* ---------- tunables ---------- */
const WORLD_LEN = 6144;        /* one loop of the world, px */
const BLEND = 780;             /* px of world-x over which a biome morphs in */
const SEED = 6067;             /* the meadow's one true seed */
const HERO_X0 = 340;           /* world-x where the hero starts walking */

let W = 800, H = 420;          /* canvas CSS size, set via setSize */
let lastCam = 0;               /* last cam seen by frame() — for ahead() */

/* ---------- painted palettes (07's crayon PALETTES → soft paint) ---------- */
const PALETTES = {
  warm: { skyTop: '#B9DEF2', skyBot: '#FCEFCB', far: '#ACD6A2', mid: '#82C184',
          near: '#5FAE6E', deep: '#4C9760', trail: '#E7D09C', trailDash: '#FBEDC6',
          sun: '#FFC53D', glow: '#F7DFA6', cloud: '#FFFCF2',
          leaf: '#5CA86A', leafHi: '#7EC783', trunk: '#7C5A38', pine: '#3E7F57',
          flora: ['#FF7A66', '#FFC53D', '#FFF6E8', '#F58ACB'] },
  cool: { skyTop: '#A9D4EE', skyBot: '#E3F2FA', far: '#9ACBB3', mid: '#6FB59C',
          near: '#539E82', deep: '#43836C', trail: '#E2D8AC', trailDash: '#F4EEC9',
          sun: '#FFE08A', glow: '#F3E3AC', cloud: '#FAFDF5',
          leaf: '#519B78', leafHi: '#70BF96', trunk: '#6E5A40', pine: '#34705B',
          flora: ['#5DA9E9', '#FFFDF6', '#9FD8F0', '#B565D8'] },
  dusk: { skyTop: '#F4B385', skyBot: '#FBE1BC', far: '#D1A67C', mid: '#B08E66',
          near: '#8C9E5C', deep: '#75854C', trail: '#E3C491', trailDash: '#F5E1B5',
          sun: '#FF9E57', glow: '#F7C58C', cloud: '#FFE3C4',
          leaf: '#7E9A52', leafHi: '#99B062', trunk: '#6E4E30', pine: '#4E6B44',
          flora: ['#FF9E57', '#FFC53D', '#F58ACB', '#B565D8'] },
  night: { skyTop: '#2E3A5C', skyBot: '#5B5F80', far: '#3F4C64', mid: '#3A4A5E',
           near: '#37514F', deep: '#2E443F', trail: '#7A705C', trailDash: '#998D72',
           sun: '#FFF1C4', glow: '#E8D9A0', cloud: '#49546E',
           leaf: '#3E5E4C', leafHi: '#4C6E58', trunk: '#3A2E22', pine: '#2E4638',
           flora: ['#8FD0F5', '#FFF1C4', '#B565D8', '#5DA9E9'] },
};

/* biome word → blendable flavor knobs (meadow is the baseline look) */
const BIOMES = {
  meadow:  { trees: 1.0, pine: .18, flowers: 1.0, clouds: 1.0, sunLow: 0, stars: 0, rain: 0, flies: 0, snow: 0 },
  forest:  { trees: 1.7, pine: .55, flowers: .5,  clouds: 1.0, sunLow: 0, stars: 0, rain: 0, flies: .2, snow: 0 },
  river:   { trees: .85, pine: .3,  flowers: .8,  clouds: 1.1, sunLow: 0, stars: 0, rain: 0, flies: .3, snow: 0 },
  village: { trees: .5,  pine: .1,  flowers: .7,  clouds: 1.0, sunLow: 0, stars: 0, rain: 0, flies: .15, snow: 0 },
  storm:   { trees: .7,  pine: .45, flowers: .3,  clouds: 2.2, sunLow: 0, stars: 0, rain: .85, flies: 0, snow: 0 },
  rain:    { trees: .7,  pine: .35, flowers: .45, clouds: 1.7, sunLow: 0, stars: 0, rain: .55, flies: 0, snow: 0 },
  dusk:    { trees: .8,  pine: .3,  flowers: .8,  clouds: .8,  sunLow: 1, stars: .15, rain: 0, flies: 1, snow: 0 },
  cave:    { trees: .15, pine: .5,  flowers: .15, clouds: .3,  sunLow: 0, stars: 1, rain: 0, flies: .6, snow: 0 },
  snow:    { trees: 1.0, pine: .7,  flowers: .12, clouds: 1.4, sunLow: 0, stars: 0, rain: 0, flies: 0, snow: 1 },
};
const BIOME_MAP = {
  meadow: 'meadow', meadows: 'meadow', field: 'meadow', plains: 'meadow', grass: 'meadow',
  hill: 'meadow', hills: 'meadow', path: 'meadow', trail: 'meadow',
  forest: 'forest', woods: 'forest', wood: 'forest', trees: 'forest', jungle: 'forest', grove: 'forest',
  river: 'river', stream: 'river', creek: 'river', water: 'river', lake: 'river', pond: 'river', brook: 'river',
  village: 'village', town: 'village', farm: 'village', homes: 'village', house: 'village',
  storm: 'storm', thunder: 'storm', thunderstorm: 'storm', windy: 'storm', wind: 'storm',
  rain: 'rain', rainstorm: 'rain', drizzle: 'rain', shower: 'rain',
  dusk: 'dusk', sunset: 'dusk', evening: 'dusk', twilight: 'dusk', midnight: 'dusk',
  night: 'dusk', dark: 'dusk',
  cave: 'cave', cavern: 'cave', tunnel: 'cave', den: 'cave',
  snow: 'snow', winter: 'snow', ice: 'snow', frost: 'snow',
};

/* ---------- tiny math (ported from emberwood) ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function hash(n) {
  let a = (n | 0) + 0x6D2B79F5;
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a ^= a + Math.imul(a ^ (a >>> 7), 61 | a);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
const rnd = (seed, n) => hash(seed + n * 374761393);
function rgb(value) {
  if (value.startsWith('rgb')) return (value.match(/\d+/g) || []).slice(0, 3).map(Number);
  const n = parseInt(value.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function blend(a, b, t) {
  const aa = rgb(a), bb = rgb(b);
  return `rgb(${Math.round(aa[0] + (bb[0] - aa[0]) * t)},${Math.round(aa[1] + (bb[1] - aa[1]) * t)},${Math.round(aa[2] + (bb[2] - aa[2]) * t)})`;
}
const periodic = (x, k = 1, phase = 0) => Math.sin(2 * Math.PI * x / WORLD_LEN * k + phase);
const wrap = (x) => ((x % WORLD_LEN) + WORLD_LEN) % WORLD_LEN;
/* project a stable world-x to screen-x at parallax depth; off-ring = offscreen */
function visibleX(worldX, camera, depth) {
  const x = wrap(worldX - camera * depth);
  return x > WORLD_LEN / 2 ? x - WORLD_LEN : x;
}

/* ---------- paint helpers (soft fills, no ink outlines on terrain) ---------- */
function circle(ctx, x, y, rad, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function poly(ctx, points, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath(); ctx.fill();
}
function stroke(ctx, points, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width == null ? 1 : width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}
function gradX(ctx, x0, x1, a, b) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, a); g.addColorStop(1, b); return g;
}
function rgbaOf(c, a) {
  const v = rgb(c);
  return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
}
function smoothPath(ctx, points) {           /* curve through midpoints */
  const n = points.length;
  ctx.moveTo(points[0][0], points[0][1]);
  if (n === 2) { ctx.lineTo(points[1][0], points[1][1]); return; }
  for (let i = 1; i < n - 1; i++) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    ctx.quadraticCurveTo(points[i][0], points[i][1], mx, my);
  }
  ctx.lineTo(points[n - 1][0], points[n - 1][1]);
}
function strokeSmooth(ctx, points, color, width, dash) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); smoothPath(ctx, points); ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

/* ---------- the biome chain along world-x ----------
 * segs[] marks where the world CHANGES: each seg is the palette/biome the
 * world blends INTO from that world-x onward (smoothstep over BLEND px). */
let segs = [];
function resolveSS(ss) {
  const biome = BIOME_MAP[String(ss && ss.biome || 'meadow').toLowerCase()] || 'meadow';
  let pk = String(ss && ss.palette || '').toLowerCase();
  if (!PALETTES[pk]) pk = (biome === 'cave' || biome === 'dusk') ? 'night' : 'warm';
  if (biome === 'cave' && pk !== 'night') pk = 'night';
  if (biome === 'storm' && pk === 'warm') pk = 'cool';
  const bio = Object.assign({}, BIOMES.meadow, BIOMES[biome]);
  if (pk === 'night') { bio.stars = 1; bio.flies = Math.max(bio.flies, .7); bio.sunLow = 0; }
  if (biome === 'dusk') bio.sunLow = Math.max(bio.sunLow, .8);
  return { palKey: pk, pal: PALETTES[pk], biome, bio, seed: (ss && ss.seed | 0) || 0 };
}
function reset() {
  segs = [{ x: 0, s: resolveSS({ biome: 'meadow', palette: 'warm', seed: 1234 }) }];
}
reset();
/* terrain ahead of the camera morphs into the new scene_seed — never a wipe */
function ahead(ss) {
  const s = resolveSS(ss);
  const last = segs[segs.length - 1];
  if (last.s.palKey === s.palKey && last.s.biome === s.biome) return;
  segs.push({ x: Math.max(last.x + 150, lastCam + W * .45), s });
  if (segs.length > 24) segs.splice(0, segs.length - 24);
}
/* which transition is in force at wx? → {a, b, t} blending a→b.
 * The governing seg = the boundary we passed most recently = smallest
 * forward distance wrap(wx - seg.x); the previous one is 2nd smallest. */
function segAt(wx) {
  wx = wrap(wx);
  let bi = 0, bd = Infinity, pi = -1, pd = Infinity;
  for (let i = 0; i < segs.length; i++) {
    const d = wrap(wx - segs[i].x);
    if (d < bd) { pd = bd; pi = bi; bd = d; bi = i; }
    else if (d < pd) { pd = d; pi = i; }
  }
  if (pi < 0) pi = bi;
  return { a: segs[pi].s, b: segs[bi].s, t: smooth(bd / BLEND) };
}
function col(key, wx) { const c = segAt(wx); return blend(c.a.pal[key], c.b.pal[key], c.t); }
function bio(key, wx) { const c = segAt(wx); return c.a.bio[key] + (c.b.bio[key] - c.a.bio[key]) * c.t; }
function floraCol(i, wx) {
  const c = segAt(wx);
  return blend(c.a.pal.flora[i % c.a.pal.flora.length],
               c.b.pal.flora[i % c.b.pal.flora.length], c.t);
}

/* ---------- the trail the hero walks (groundAt IS this line) ---------- */
function trailY(wx) {
  return H * .9 + periodic(wx, 5, .7) * 7 + periodic(wx, 9, 2) * 3;
}
function groundAt(wx) { return trailY(wx); }

/* ---------- sky: per-strip gradients so the palette slides along x ---------- */
function sky(ctx, cam) {
  const step = 24;
  for (let x = 0; x < W; x += step) {
    const wx = cam + x + step / 2;
    const top = col('skyTop', wx), bot = col('skyBot', wx);
    const g = ctx.createLinearGradient(0, 0, 0, H * .78);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(x, -4, step + 1, H + 8);
  }
  /* sun or moon — screen-anchored, tinted by the local climate, low at dusk */
  const cx = W * .16;
  const low = bio('sunLow', cam + cx);
  const sy = H * .17 + low * (H * .52);
  const sunR = 30 + low * 10;
  const glow = ctx.createRadialGradient(cx, sy, 4, cx, sy, sunR * 4.4);
  glow.addColorStop(0, rgbaOf(col('glow', cam + cx), .55));
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  circle(ctx, cx, sy, sunR * 4.4, glow);
  circle(ctx, cx, sy, sunR, col('sun', cam + cx));
  /* stars fade in where the world goes night */
  const starK = bio('stars', cam + W * .5);
  if (starK > .03) {
    ctx.save(); ctx.globalAlpha = Math.min(1, starK);
    for (let i = 0; i < 40; i++) {
      const sx = rnd(SEED, 300 + i) * W, syy = 14 + rnd(SEED, 400 + i) * H * .42;
      circle(ctx, sx, syy, .9 + rnd(SEED, 500 + i) * 1.3, 'rgba(255,244,208,.85)');
    }
    ctx.restore();
  }
}

/* soft elliptical cloud puffs at deep parallax */
function puff(ctx, x, y, s, color) {
  ellipse(ctx, x - 26 * s, y + 6 * s, 24 * s, 12 * s, color);
  ellipse(ctx, x + 2 * s, y - 3 * s, 31 * s, 16 * s, color);
  ellipse(ctx, x + 28 * s, y + 6 * s, 23 * s, 11 * s, color);
  ellipse(ctx, x + 2 * s, y + 9 * s, 34 * s, 9 * s, color);
}
function clouds(ctx, cam) {
  for (let i = 0; i < 16; i++) {
    const world = i * 397 + rnd(SEED, 200 + i) * 170;
    const x = visibleX(world, cam, .16);
    if (x < -110 || x > W + 110) continue;
    if (rnd(SEED, 900 + i) > Math.min(1, bio('clouds', cam + x) * .8)) continue;
    const y = 42 + rnd(SEED, 310 + i) * H * .2;
    ctx.save();
    ctx.globalAlpha = .82;
    puff(ctx, x, y, .7 + rnd(SEED, 421 + i) * .85, col('cloud', cam + x));
    ctx.restore();
  }
}

/* ---------- layered ridge bands (far .34 / mid .62 / near 1.0) ---------- */
const DEPTH = [.34, .62, 1];
function ridgeBase(layer) { return H * [.56, .68, .80][layer]; }
const RIDGE_AMP = [26, 24, 18];
function ridgeY(wx, layer) {
  const n = periodic(wx, 2 + layer, .35 * 6) + .42 * periodic(wx, 5 + layer, 1.2) + .23 * periodic(wx, 9, 2.4);
  return ridgeBase(layer) + n * RIDGE_AMP[layer];
}
function band(ctx, cam, layer) {
  const depth = DEPTH[layer];
  const field = ['far', 'mid', 'near'][layer];
  ctx.fillStyle = gradX(ctx, 0, W, col(field, cam), col(field, cam + W));
  ctx.beginPath(); ctx.moveTo(-6, H + 6);
  for (let x = -6; x <= W + 12; x += 12) ctx.lineTo(x, ridgeY(cam * depth + x, layer));
  ctx.lineTo(W + 6, H + 6); ctx.closePath(); ctx.fill();
  /* a soft painted rim along the crest — light, not an outline */
  ctx.save(); ctx.globalAlpha = .16;
  const rim = [];
  for (let x = -6; x <= W + 12; x += 12) rim.push([x, ridgeY(cam * depth + x, layer) + 5]);
  strokeSmooth(ctx, rim, '#FFFDF2', 3.5);
  ctx.restore();
}

/* ---------- painted trees: round canopies + occasional pines ---------- */
function roundTree(ctx, x, y, s, leaf, hi, trunk) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = trunk; ctx.fillRect(-5, -56, 10, 60);
  stroke(ctx, [[0, -40], [-20, -62]], trunk, 5);
  stroke(ctx, [[0, -48], [21, -68]], trunk, 5);
  for (const [dx, dy, rad] of [[-24, -64, 21], [22, -65, 22], [0, -80, 27], [1, -58, 23]])
    circle(ctx, dx, dy, rad, leaf);
  circle(ctx, -8, -84, 15, hi);
  circle(ctx, 12, -72, 10, hi);
  ctx.restore();
}
function pineTree(ctx, x, y, s, leaf, trunk) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = trunk; ctx.fillRect(-4, -12, 8, 26);
  poly(ctx, [[-25, -4], [0, -96], [25, -4]], leaf);
  poly(ctx, [[-32, -3], [0, -70], [32, -3]], leaf);
  ctx.restore();
}
function trees(ctx, cam, layer) {
  const depth = layer === 0 ? .57 : 1;
  const step = layer === 0 ? 104 : 76;
  const scale = layer === 0 ? .5 : .86;
  const range = Math.ceil(WORLD_LEN / step);
  for (let i = 0; i < range; i++) {
    const world = i * step + rnd(SEED, 11 + i) * step * .7;
    const x = visibleX(world, cam, depth);
    if (x < -90 || x > W + 90) continue;
    const wx = cam * depth + x;
    const n = rnd(SEED, 399 + i);
    if (n > Math.min(1, bio('trees', wx) * (layer === 0 ? .8 : .62))) continue;
    const size = scale * (.62 + n * .67);
    const leaf = col('leaf', wx), hi = col('leafHi', wx), trunk = col('trunk', wx);
    const baseY = layer === 0 ? ridgeBase(1) - 6 + rnd(SEED, 82 + i) * 22
                              : groundAt(world) - 66 + rnd(SEED, 92 + i) * 46;
    if (n < bio('pine', wx)) pineTree(ctx, x, baseY, size, col('pine', wx), trunk);
    else roundTree(ctx, x, baseY, size, leaf, hi, trunk);
  }
}

/* ---------- flowers, tufts, rocks — the undergrowth ---------- */
function flower(ctx, x, y, s, colr) {
  stroke(ctx, [[x, y], [x + 1.5, y - 11 * s]], '#3F7A50', 1.8);
  for (let p = 0; p < 5; p++) {
    const a = Math.PI * 2 * p / 5 - Math.PI / 2;
    circle(ctx, x + 1.5 + Math.cos(a) * 5.4 * s, y - 13 * s + Math.sin(a) * 5.4 * s, 3.4 * s, colr);
  }
  circle(ctx, x + 1.5, y - 13 * s, 2.6 * s, '#FFD24D');
}
function undergrowth(ctx, cam) {
  for (let i = 0; i < 190; i++) {
    const world = i * 33 + rnd(SEED, 1000 + i) * 26;
    const x = visibleX(world, cam, 1);
    if (x < -12 || x > W + 12) continue;
    const y = groundAt(world) + 10 + rnd(SEED, 1200 + i) * (H * .09);
    const wx = world;
    const fl = bio('flowers', wx), sn = bio('snow', wx);
    const size = .6 + rnd(SEED, 1400 + i) * .9;
    if (sn > .25) {
      ellipse(ctx, x, y, size * 4.5, size * 1.8, `rgba(250,252,246,${Math.min(1, sn) * .8})`);
      continue;
    }
    if (i % 3 === 0 && rnd(SEED, 1500 + i) < fl) {
      flower(ctx, x, y, size, floraCol(i, wx));
    } else {
      const g = i % 2 ? col('deep', wx) : col('leaf', wx);
      stroke(ctx, [[x, y + 3], [x - 3 * size, y - 4 * size]], g, 1.6);
      stroke(ctx, [[x, y + 3], [x, y - 6 * size]], g, 1.6);
      stroke(ctx, [[x, y + 3], [x + 3.4 * size, y - 4.4 * size]], g, 1.6);
    }
  }
}

/* ---------- the thick dashed winding trail ---------- */
function trail(ctx, cam) {
  const pts = [];
  for (let x = -16; x <= W + 16; x += 14) pts.push([x, trailY(cam + x)]);
  strokeSmooth(ctx, pts, gradX(ctx, 0, W, col('trail', cam), col('trail', cam + W)), 40);
  strokeSmooth(ctx, pts, col('trailDash', cam + W * .5), 3.2, [13, 22]);
  /* soft edge where paint meets grass */
  ctx.save(); ctx.globalAlpha = .25;
  strokeSmooth(ctx, pts.map(([x, y]) => [x, y - 19]), col('deep', cam + W * .5), 2);
  ctx.restore();
}

/* ---------- light weather: drizzle streaks + fireflies ---------- */
function weather(ctx, cam, time) {
  for (let i = 0; i < 90; i++) {
    const world = i * 61 + rnd(SEED, 2200 + i) * 47;
    const x = visibleX(world, cam, 1);
    if (x < -8 || x > W + 8) continue;
    const wx = cam + x;
    const rainK = bio('rain', wx);
    if (rainK > .04) {
      const y = (rnd(SEED, 2600 + i) * H + time * (190 + rnd(SEED, 2700 + i) * 80)) % (H * .9);
      ctx.globalAlpha = Math.min(1, rainK) * .5;
      stroke(ctx, [[x, y], [x - 3, y + 13]], '#BFE0F2', 1.6);
      ctx.globalAlpha = 1;
    }
    const flyK = bio('flies', wx);
    if (flyK > .06 && i % 3 === 0) {
      const fy = H * .55 + rnd(SEED, 2800 + i) * H * .3 + Math.sin(time * 1.7 + i) * 6;
      const tw = .35 + .65 * Math.abs(Math.sin(time * 2.1 + i * 1.7));
      circle(ctx, x + Math.sin(time * .8 + i) * 9, fy, 1.6 + rnd(SEED, 2900 + i), `rgba(255,231,140,${(flyK * tw).toFixed(3)})`);
    }
  }
}

/* ---------- the per-frame painted world ---------- */
function frame(ctx, cam, time) {
  lastCam = cam;
  ctx.clearRect(0, 0, W, H);
  sky(ctx, cam);
  clouds(ctx, cam);
  band(ctx, cam, 0);
  trees(ctx, cam, 0);
  band(ctx, cam, 1);
  band(ctx, cam, 2);
  trees(ctx, cam, 1);
  trail(ctx, cam);
  undergrowth(ctx, cam);
  weather(ctx, cam, time);
}

/* ---------- the house under construction (crayon — ported unchanged) ---------- */
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
  frame, ahead, groundAt, drawBuild, reset,
  setSize(w, h) { W = w; H = h; },
  camStart() { return wrap(HERO_X0 - W * .3); },
  visibleX, wrap,
  debug() {
    return { segs: segs.map(s => ({ x: Math.round(s.x), pal: s.s.palKey, biome: s.s.biome })) };
  },
  WORLD_LEN, HERO_X0, PALETTES, BIOME_MAP,
};
})();
