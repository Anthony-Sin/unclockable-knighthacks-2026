/* world.js — PAINTED Highland Path renderer (zero dependencies).
 *
 * A faithful port of the 'highland' route from
 * mockups/bonfire-backgrounds/emberwood-transitions/app.js, adapted to the
 * PAINTED contract: ONE continuous world space, camera travel is the only
 * animated state, every object has a stable world coordinate.
 *
 *   window.WORLD = {
 *     frame(ctx, cam, time),          // painted world at camera, every rAF
 *     ahead(sceneSeed),               // morph the road ahead toward this biome
 *     groundAt(worldX),               // REAL trail elevation at a world x
 *     slopeAt(worldX),                // trail slope dy/dx (screen coords)
 *     drawBuild(ctx, stage, x, y, r), // crayon pig house (sticker layer)
 *     camStart(),                     // initial cam so hero sits left-third
 *     size(W, H), reset(), wrap(x), visibleX(wx, cam, depth), LEN
 *   };
 *
 * The trail climbs through a pass: `pass` lifts the ground line ~±30px+
 * along world-x, so the hero visibly climbs and descends as cam advances.
 * `WORLD.ahead(ss)` pushes a "leg" — terrain ahead cross-blends palette,
 * snowline and tree cover into the LLM's new biome; no wipe, ever.
 */
'use strict';
(function () {
const SK = window.SK;

/* ============================================================
   WORLD SPACE — one wrapping highland route
   ============================================================ */
const LEN = 3840;                 /* one lap of the world, px */
const SEED = 606;                 /* emberwood highland route seed */
const BLEND = 520;                /* palette morph distance, world px */
let W = 800, H = 420;             /* stage size — set via WORLD.size() */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function hash(n) {
  let a = (n | 0) + 0x6D2B79F5;
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a ^= a + Math.imul(a ^ (a >>> 7), 61 | a);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
const rnd = (seed, n) => hash(seed + n * 374761393);
function rgb(c) {
  if (c.startsWith('rgb')) return (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const n = parseInt(c.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
const mixrgb = (a, b, t) =>
  [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
const css = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
const wrap = (x) => ((x % LEN) + LEN) % LEN;
function visibleX(wx, cam, depth) {
  const x = wrap(wx - cam * depth);
  return x > LEN / 2 ? x - LEN : x;
}
const periodic = (x, k = 1, ph = 0) => Math.sin(2 * Math.PI * x / LEN * k + ph);

/* ============================================================
   PALETTES — frost → meadow cross-blend (warmer than emberwood's)
   Each leg carries full color + scalar flavor: snow cover, tree
   density, goat odds. palette word + biome word → leg palette.
   ============================================================ */
const PALS = {
  frost:  { top: '#9FB6C6', horizon: '#EFE4CC', far: '#A2B4AC', mid: '#739487',
            near: '#48705F', path: '#C2B9A0', leaf: '#59796E', accent: '#F6E2AC',
            snow: .92, trees: .8, goats: 1 },
  meadow: { top: '#AECFD2', horizon: '#F5E4B8', far: '#AFC9AC', mid: '#7FAE8C',
            near: '#4F8769', path: '#D2B98E', leaf: '#6FAE78', accent: '#F6D488',
            snow: .14, trees: 1, goats: .7 },
  sunlit: { top: '#9DC8CE', horizon: '#F8DC9E', far: '#A6C3A2', mid: '#72B083',
            near: '#3F7F5E', path: '#D8BC8C', leaf: '#4E9468', accent: '#F8D878',
            snow: .06, trees: 1.15, goats: .5 },
  amber:  { top: '#BAAFAE', horizon: '#F2CBA2', far: '#B6B7A0', mid: '#A39579',
            near: '#6E7357', path: '#C09E7B', leaf: '#B47953', accent: '#ECBA81',
            snow: .3, trees: .85, goats: 1.2 },
  dusk:   { top: '#7E86A2', horizon: '#E4B693', far: '#8F92A0', mid: '#6F7590',
            near: '#4A5068', path: '#A08A6C', leaf: '#5F6A7A', accent: '#EAC9A0',
            snow: .45, trees: .7, goats: 1.3 },
};
const PALKEYS = ['top', 'horizon', 'far', 'mid', 'near', 'path', 'leaf', 'accent'];
const NUMKEYS = ['snow', 'trees', 'goats'];

/* biome/palette word → leg palette + flavor overrides */
function legFor(ss) {
  const biome = String(ss && ss.biome || 'meadow').toLowerCase();
  const pw = String(ss && ss.palette || 'warm').toLowerCase();
  let name = { warm: 'meadow', cool: 'frost', dusk: 'amber', night: 'dusk' }[pw] || 'meadow';
  if (/snow|ice|frost|winter|storm|rain/.test(biome)) name = 'frost';
  else if (/village|town|farm/.test(biome)) name = 'sunlit';
  else if (/cave|night|dark|dusk|sunset/.test(biome)) name = 'dusk';
  else if (/forest|wood|tree|jungle/.test(biome)) name = 'sunlit';
  const base = PALS[name];
  const leg = { x0: 0, seed: (ss && ss.seed | 0) || 7 };
  for (const k of PALKEYS) leg[k] = rgb(base[k]);
  for (const k of NUMKEYS) leg[k] = base[k];
  if (/forest|wood|tree|jungle/.test(biome)) leg.trees = 1.7;
  if (/village|town|farm/.test(biome)) leg.trees = .55;
  if (/meadow|field|plains/.test(biome)) leg.trees = .8;
  leg.scenery = [];
  /* scene_seed.props → sticker doodads waiting ahead on the trail-side */
  let sx = 0;
  for (const kind of (ss && ss.props || []).slice(0, 6)) {
    const res = window.resolveKind(kind);
    if (!window.PROPS[res.def]) continue;
    if (/wolf|pig|house|cottage|tent/.test(res.def)) continue;   /* actors, not scenery */
    leg.scenery.push({ def: res.def, word: res.word, dx: 200 + sx + rnd(leg.seed, sx) * 120 });
    sx += 210;
  }
  return leg;
}

/* legs[0] covers the whole world; each ahead() appends {x0 = just past the
   current view}. palAt(wx) folds successive smoothstep blends. */
let legs = [];
let scenery = [];               /* [{def, word, wx}] baked doodads */
let lastCam = 0;
function reset() {
  legs = [legFor({ biome: 'snow', palette: 'cool', seed: SEED })];
  legs[0].x0 = -LEN;
  scenery = [];
}
function ahead(ss) {
  const leg = legFor(ss);
  leg.x0 = lastCam + W * .82;                 /* morph starts just offstage right */
  legs.push(leg);
  for (const sc of leg.scenery)
    scenery.push({ def: sc.def, word: sc.word, wx: leg.x0 + sc.dx });
  if (scenery.length > 26) scenery = scenery.filter(sc => sc.wx > lastCam - 240);
}
function palAt(wx) {
  const cur = {};
  for (const k of PALKEYS) cur[k] = legs[0][k].slice();
  for (const k of NUMKEYS) cur[k] = legs[0][k];
  for (let i = 1; i < legs.length; i++) {
    const t = sstep((wx - legs[i].x0) / BLEND);
    if (t <= 0) continue;
    for (const k of PALKEYS) cur[k] = mixrgb(cur[k], legs[i][k], t);
    for (const k of NUMKEYS) cur[k] += (legs[i][k] - cur[k]) * t;
  }
  return cur;
}
const colAt = (key, wx) => css(palAt(wx)[key]);

/* seasonal snowline: emberwood's winter() bell, pushed by leg snow bias */
function winterness(wx) {
  const base = Math.pow(Math.max(0, Math.cos(2 * Math.PI * wx / LEN)), 2);
  const pal = palAt(wx);
  return clamp(base * .55 + pal.snow * .55, 0, 1);
}

/* ============================================================
   ELEVATION — the trail climbs through a pass (real groundAt)
   ============================================================ */
function groundAt(wx) {
  const s = H / 540;
  const n = periodic(wx, 2, .35 * SEED) * .5
          + .42 * periodic(wx, 5, 1.2)
          + .23 * periodic(wx, 9, 2.4);
  const pass = Math.pow(Math.max(0, periodic(wx, 1, -.2)), 3);        /* the pass */
  const bump = Math.pow(Math.max(0, periodic(wx, 2, 1.15)), 3) * .4; /* rolling hills */
  return H * .858 + n * 11 * s - (pass + bump) * .072 * H + periodic(wx, 7, .7) * 3.5 * s;
}
function slopeAt(wx) { return (groundAt(wx + 10) - groundAt(wx - 10)) / 20; }

/* ridge line for a parallax band (depth<1) — emberwood ridgeY incl. pass */
function ridgeY(wx, y, amp, layer) {
  const s = H / 540;
  const n = periodic(wx, 2 + layer, .35 * SEED)
          + .42 * periodic(wx, 5 + layer, 1.2)
          + .23 * periodic(wx, 9, 2.4);
  let v = y + n * amp * s;
  const pass = Math.pow(Math.max(0, periodic(wx, 1, -.2)), 4);
  v -= pass * (layer === 0 ? 62 : 39) * s;
  return v;
}

/* ---------- tiny draw helpers (flat painted fills, no outlines) ---------- */
function circle(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function ellipse(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function poly(ctx, pts, c) {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}
function hgrad(ctx, c0, c1) {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, c0); g.addColorStop(1, c1); return g;
}

/* ============================================================
   PAINTED LAYERS — sky, peaks, bands, pines, rocks, goats, trail
   ============================================================ */
function sky(ctx, cam) {
  for (let x = 0; x < W; x += 24) {
    const pal = palAt(cam + x + 12);
    const g = ctx.createLinearGradient(0, 0, 0, H * .8);
    g.addColorStop(0, css(pal.top)); g.addColorStop(1, css(pal.horizon));
    ctx.fillStyle = g; ctx.fillRect(x, 0, 25, H);
  }
  /* sun + soft glow */
  const s = H / 540, sunX = W * .72, sunY = H * .24;
  const lg = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 160 * s);
  lg.addColorStop(0, 'rgba(246,224,170,.5)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
  circle(ctx, sunX, sunY, 160 * s, lg);
  circle(ctx, sunX, sunY, 42 * s, colAt('accent', cam + sunX));
}
function cloudPuff(ctx, x, y, sc, a) {
  ctx.save(); ctx.globalAlpha = a;
  ellipse(ctx, x, y, 34 * sc, 11 * sc, '#FFF8E9');
  ellipse(ctx, x - 21 * sc, y + 4 * sc, 23 * sc, 9 * sc, '#FFF8E9');
  ellipse(ctx, x + 27 * sc, y + 5 * sc, 28 * sc, 8 * sc, '#FFF8E9');
  ctx.restore();
}
function clouds(ctx, cam) {
  const s = H / 540;
  for (let i = 0; i < 17; i++) {
    const wx = i * 251 + rnd(SEED, 200 + i) * 100;
    const x = visibleX(wx, cam, .16);
    if (x < -90 || x > W + 90) continue;
    const y = (56 + rnd(SEED, 310 + i) * 125) * s;
    cloudPuff(ctx, x, y, (.65 + rnd(SEED, 421 + i) * .9) * s,
      .27 + winterness(cam + x) * .14);
  }
}
function highlandPeaks(ctx, cam) {
  const s = H / 540;
  for (let i = 0; i < 18; i++) {
    const wx = i * 245 + 57;
    const x = visibleX(wx, cam, .34);
    if (x < -110 || x > W + 110) continue;
    const ht = (72 + rnd(SEED, i) * 63) * s;
    const base = (310 + rnd(611, i) * 19) * s;
    const shade = mixrgb(palAt(wx).far, rgb('#78978E'), .28);
    const w = winterness(wx);
    poly(ctx, [[x - 95 * s, base], [x, base - ht], [x + 105 * s, base]], css(shade));
    if (w > .12) {
      const a = (w * .72).toFixed(3);
      poly(ctx, [[x - 27 * s, base - ht + 28 * s], [x, base - ht], [x + 28 * s, base - ht + 28 * s],
        [x + 12 * s, base - ht + 21 * s], [x, base - ht + 29 * s], [x - 10 * s, base - ht + 20 * s]],
        `rgba(240,246,235,${a})`);
    }
  }
}
function band(ctx, cam, layer) {
  const s = H / 540;
  const depth = [.34, .62, 1][layer];
  const y = [274, 342, 438][layer] * s;
  const amp = [40, 36, 25][layer];
  const field = ['far', 'mid', 'near'][layer];
  const c0 = colAt(field, cam), c1 = colAt(field, cam + W);
  ctx.fillStyle = hgrad(ctx, c0, c1);
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 12; x += 12) {
    let yy;
    if (layer === 2) yy = groundAt(cam + x) - 48 * s;   /* hillside hugs the trail */
    else yy = ridgeY(cam * depth + x, y, amp, layer);
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(W, H); ctx.fill();
  /* snow dusting on the near band when the snowline drops low */
  if (layer === 2) {
    for (let x = 0; x < W; x += 12) {
      const wx = cam + x, sn = winterness(wx + 6);
      if (sn < .3) continue;
      const y0 = groundAt(wx) - 48 * s, y1 = groundAt(wx + 12) - 48 * s;
      poly(ctx, [[x, y0 - 2], [x + 12, y1 - 2], [x + 12, y1 + 3 + sn * 5], [x, y0 + 3 + sn * 5]],
        `rgba(246,249,240,${(.4 * sn).toFixed(3)})`);
    }
  }
}
function trail(ctx, cam) {
  const s = H / 540;
  const pts = [];
  for (let x = -15; x <= W + 15; x += 10) pts.push([x, groundAt(cam + x)]);
  ctx.strokeStyle = hgrad(ctx, colAt('path', cam), colAt('path', cam + W));
  ctx.lineWidth = 34 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  /* stitched center line */
  ctx.strokeStyle = 'rgba(246,233,206,.35)'; ctx.lineWidth = 2 * s;
  ctx.setLineDash([12 * s, 22 * s]); ctx.stroke(); ctx.setLineDash([]);
}
function pine(ctx, x, y, sc, color, snowAmt) {
  const s = H / 540;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * s, sc * s);
  ctx.fillStyle = '#5A5547'; ctx.fillRect(-4, -12, 8, 26);
  poly(ctx, [[-26, -5], [0, -105], [26, -5]], color);
  poly(ctx, [[-34, -4], [0, -76], [34, -4]], color);
  if (snowAmt > .07) {
    ctx.globalAlpha = Math.min(1, snowAmt * .85);
    poly(ctx, [[-17, -60], [0, -105], [17, -60], [4, -66], [0, -82], [-4, -66]], '#F5F7EB');
    poly(ctx, [[-27, -25], [-18, -42], [0, -76], [18, -42], [27, -25], [7, -32], [0, -50], [-7, -32]], '#EDF4E9');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function roundTree(ctx, x, y, sc, color) {
  const s = H / 540;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * s, sc * s);
  ctx.fillStyle = '#645844'; ctx.fillRect(-5, -60, 10, 77);
  ctx.strokeStyle = '#645844'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(-23, -69);
  ctx.moveTo(0, -53); ctx.lineTo(25, -75); ctx.stroke();
  for (const [dx, dy, r] of [[0, -87, 29], [-25, -67, 23], [22, -68, 24], [2, -62, 25]])
    circle(ctx, dx, dy, r, color);
  ctx.restore();
}
function trees(ctx, cam, layer) {
  const s = H / 540;
  const depth = layer === 0 ? .57 : 1;
  const step = layer === 0 ? 98 : 71;
  const sc0 = layer === 0 ? .48 : .84;
  const range = Math.ceil(LEN / step);
  const midY = 342 * s;
  for (let i = 0; i < range; i++) {
    const wx = i * step + rnd(SEED, 11 + i) * step * .7;
    const x = visibleX(wx, cam, depth);
    if (x < -80 || x > W + 80) continue;
    const pal = palAt(wx);
    const n = rnd(SEED, 399 + i);
    if (n > pal.trees) continue;                    /* biome thins/thickens cover */
    if (layer === 1 && i % 5 === 0) continue;        /* gaps on the hillside */
    let baseY;
    if (layer === 0) baseY = ridgeY(wx, midY, 36, 1) + rnd(SEED, 82 + i) * 26 * s;
    else baseY = groundAt(wx) - (6 + rnd(SEED, 92 + i) * 74) * s;   /* up the hillside */
    const size = sc0 * (.62 + n * .67);
    let leaf = mixrgb(pal.leaf, pal.far, layer === 0 ? .35 : .08);
    if (n < .12) roundTree(ctx, x, baseY, size, css(leaf));
    else pine(ctx, x, baseY, size, css(leaf), winterness(wx));
  }
}
function rocks(ctx, cam) {
  const s = H / 540;
  for (let i = 0; i < 48; i++) {
    const wx = i * 87 + rnd(SEED, 3000 + i) * 50;
    const x = visibleX(wx, cam, 1);
    if (x < -30 || x > W + 30) continue;
    const y = groundAt(wx) + (rnd(SEED, 3300 + i) - .45) * 78 * s;
    const r = (7 + rnd(SEED, 3500 + i) * 16) * s;
    poly(ctx, [[x - r, y], [x - r * .45, y - r], [x + r * .44, y - r * .78], [x + r, y]],
      i % 2 ? '#738D80' : '#9DAEA0');
    ctx.strokeStyle = 'rgba(210,217,198,.4)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * .45, y - r);
    ctx.lineTo(x + r * .44, y - r * .78); ctx.stroke();
  }
}
/* tiny mountain-goat silhouettes standing on the mid ridge */
function goats(ctx, cam) {
  const s = H / 540, midY = 342 * s;
  for (let i = 0; i < 9; i++) {
    const wx = i * 431 + 175 + rnd(617, i) * 180;
    const x = visibleX(wx, cam, .62);
    if (x < -30 || x > W + 30) continue;
    const pal = palAt(wx);
    if (rnd(618, i) > pal.goats) continue;
    const y = ridgeY(wx, midY, 36, 1) - 4 * s;
    const flip = rnd(619, i) < .5 ? -1 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(flip * s, s);
    ctx.fillStyle = 'rgba(52,66,58,.85)';
    ctx.beginPath(); ctx.ellipse(0, -8, 9, 5.5, 0, 0, Math.PI * 2); ctx.fill(); /* body */
    ctx.beginPath(); ctx.arc(8, -13, 3.6, 0, Math.PI * 2); ctx.fill();          /* head */
    ctx.strokeStyle = 'rgba(52,66,58,.9)'; ctx.lineWidth = 1.3;
    ctx.beginPath();                                                            /* horns */
    ctx.moveTo(9, -16); ctx.quadraticCurveTo(12, -20, 10, -22);
    ctx.moveTo(7, -16); ctx.quadraticCurveTo(9, -20, 7, -21); ctx.stroke();
    ctx.beginPath();                                                            /* legs */
    for (const lx of [-5, -1, 4, 7]) { ctx.moveTo(lx, -4); ctx.lineTo(lx, 0); }
    ctx.stroke();
    ctx.restore();
  }
}
function undergrowth(ctx, cam) {
  const s = H / 540;
  for (let i = 0; i < 150; i++) {
    const wx = i * 26 + rnd(SEED, 1000 + i) * 19;
    const x = visibleX(wx, cam, 1);
    if (x < -10 || x > W + 10) continue;
    const y = groundAt(wx) + (12 + rnd(SEED, 1200 + i) * 66) * s;
    const sn = winterness(wx);
    const sz = (.5 + rnd(SEED, 1400 + i) * 1.2) * s;
    if (sn > .4) circle(ctx, x, y, sz * 1.8, `rgba(245,247,235,${(sn * .7).toFixed(2)})`);
    else if (i % 4 === 0) {                       /* little alpine flowers */
      ctx.strokeStyle = '#587D64'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 1, y - 5); ctx.stroke();
      circle(ctx, x + 1, y - 6, 2.5 * s, '#EAD3A4');
    } else {                                      /* grass tufts */
      ctx.strokeStyle = '#5B8D6A'; ctx.lineWidth = 1.1 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y + 4); ctx.lineTo(x - 3, y - 3);
      ctx.moveTo(x, y + 1); ctx.lineTo(x + 3, y - 5);
      ctx.stroke();
    }
  }
}
/* scene_seed.props baked ahead as crayon sticker scenery */
function sceneryDraw(ctx, cam) {
  for (const sc of scenery) {
    const x = sc.wx - cam;
    if (x < -80 || x > W + 80) continue;
    const def = window.PROPS[sc.def];
    const scc = window.propScale(def, W) * .5;
    const y = groundAt(sc.wx) + 26;
    ctx.save();
    ctx.translate(x - def.w * scc / 2, y - def.h * scc);
    ctx.scale(scc, scc);
    def.draw(ctx, def.w, def.h, SK.rng(SK.hashStr(sc.def + ':' + Math.round(sc.wx))), sc.word);
    ctx.restore();
    SK.caption(ctx, sc.word, x, y + 12, SK.rng(Math.round(sc.wx)), { size: 12 });
  }
}

/* ---------- the whole painted frame ---------- */
function frame(ctx, cam, time) {
  lastCam = cam;
  ctx.clearRect(0, 0, W, H);
  sky(ctx, cam);
  clouds(ctx, cam);
  highlandPeaks(ctx, cam);
  band(ctx, cam, 0);
  goats(ctx, cam);
  trees(ctx, cam, 0);
  band(ctx, cam, 1);
  band(ctx, cam, 2);
  trail(ctx, cam);
  trees(ctx, cam, 1);
  undergrowth(ctx, cam);
  rocks(ctx, cam);
  sceneryDraw(ctx, cam);
}

/* ============================================================
   THE CRAYON PIG HOUSE — sticker actor, drawn live on play layer
   (unchanged from 07-vanilla)
   ============================================================ */
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

/* ============================================================ */
const HERO_X0 = 600;                       /* hero's first worldX */
window.WORLD = {
  frame, ahead, groundAt, slopeAt, drawBuild,
  camStart() { return HERO_X0 - W * .30; },
  size(w, h) { W = w; H = h; },
  reset,
  wrap, visibleX, winterness, palAt,
  LEN, HERO_X0,
  get lastCam() { return lastCam; },
};
reset();
})();
