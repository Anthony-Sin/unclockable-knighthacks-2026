/* world.js — Breezefield: a windy painted meadow (zero dependencies).
 *
 * Highland-Path-style continuous world (emberwood-transitions/app.js):
 * the only animated state is camera travel + ambient wind — every hill,
 * tree, cloud, grass blade and drifter is a live function of world-x and
 * time, re-painted EVERY frame. Terrain is soft painted fills only — no
 * sketch outlines. The SK crayon work stays on the actors (props, hero,
 * pig house).
 *
 * Wind model: a slowly-varying breeze {dir, str} plus a decaying gust
 * envelope (WORLD.blow). Grass leans with traveling sine waves, flower
 * heads nod, tree canopies sway, clouds drift, and ~20 ambient drifters
 * (petals / seed fluff / leaves) sail across the sky, wrapping at edges.
 *
 *   WORLD.resize(W, H)          logical stage size
 *   WORLD.frame(ctx, cam, t)    painted world at camera cam — every rAF
 *   WORLD.reset(sceneSeed)      first stretch of world
 *   WORLD.ahead(sceneSeed)      the road ahead morphs to this biome/palette
 *   WORLD.groundAt(worldX)      painted trail height Y at a world-x
 *   WORLD.camStart()            camera so the hero sits on the left third
 *   WORLD.blow(power, dir)      a real gust: grass flattens, drifters race
 *   WORLD.wind()                {dir, str, gust} — current breeze
 *   WORLD.drawBuild(ctx, stage, x, y, r, opts)   crayon pig house (07 port)
 */
'use strict';
(function () {
const SK = window.SK;

const LEN = 3840;          /* the meadow loops every 3840 world px */
const BLEND = 900;         /* biome/palette morph distance, px */
let W = 800, H = 420;

/* ---------- small math ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const wrap = x => ((x % LEN) + LEN) % LEN;
function hash(n) {
  let a = (n | 0) + 0x6D2B79F5;
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a ^= a + Math.imul(a ^ (a >>> 7), 61 | a);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
const rnd = (s, n) => hash((s | 0) + n * 374761393);
const periodic = (x, k, ph) => Math.sin(2 * Math.PI * x / LEN * (k || 1) + (ph || 0));
function rgb(v) {
  if (v[0] !== '#') return (v.match(/\d+(?:\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
  const n = parseInt(v.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
const blend = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
};
function ellipse(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function circle(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function poly(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }
function stroke(ctx, pts, c, w) {
  ctx.strokeStyle = c; ctx.lineWidth = w || 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
function xgrad(ctx, a, b) { const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function visibleX(wx, cam, depth) { let x = wrap(wx - cam * depth); return x > LEN / 2 ? x - LEN : x; }

/* ---------- palettes (warm project palette, emberwood keys) ---------- */
const PALS = {
  warm: { top: '#BDE2F6', horizon: '#FFF0C8', far: '#AEDB9E', mid: '#85C98A',
          near: '#5FB874', grass: '#49A263', path: '#EFDCAA', leaf: '#4FA85F',
          trunk: '#7A5A38', accent: '#FFC53D', water: '#7FC4EE',
          flora: ['#FF6B57', '#FFC53D', '#FFFDF6', '#F58ACB'] },
  cool: { top: '#B7E0F2', horizon: '#E8F6FF', far: '#9FD0BC', mid: '#76BCA2',
          near: '#5AAE8C', grass: '#459876', path: '#EFE4BC', leaf: '#3E9060',
          trunk: '#6E4F30', accent: '#FFE08A', water: '#6FBEEA',
          flora: ['#5DA9E9', '#FFFDF6', '#9FD8F0', '#B565D8'] },
  dusk: { top: '#FFC79A', horizon: '#FBE0BC', far: '#D6B28C', mid: '#B28F70',
          near: '#8AA765', grass: '#749355', path: '#EFDCAA', leaf: '#7C9253',
          trunk: '#64482C', accent: '#FF9E57', water: '#EFA468',
          flora: ['#FF9E57', '#FFC53D', '#F58ACB', '#B565D8'] },
  night: { top: '#2E3C60', horizon: '#6A6E92', far: '#45536A', mid: '#3A4866',
           near: '#43664F', grass: '#355545', path: '#8A7E68', leaf: '#3A6850',
           trunk: '#443628', accent: '#FFF1C4', water: '#3E5E8A',
           flora: ['#B565D8', '#8FD0F5', '#FFF1C4', '#5DA9E9'] },
};
const BIO_MAP = {
  meadow: 'meadow', meadows: 'meadow', field: 'meadow', plains: 'meadow',
  grass: 'meadow', hill: 'meadow', hills: 'meadow', plain: 'meadow',
  forest: 'forest', woods: 'forest', wood: 'forest', trees: 'forest',
  jungle: 'forest', grove: 'forest', cave: 'forest', cavern: 'forest',
  tunnel: 'forest', den: 'forest',
  village: 'village', town: 'village', farm: 'village', homes: 'village',
  river: 'river', stream: 'river', creek: 'river', water: 'river',
  lake: 'river', pond: 'river', brook: 'river',
  storm: 'storm', thunder: 'storm', thunderstorm: 'storm', windy: 'storm',
  rain: 'storm', rainstorm: 'storm', drizzle: 'storm', shower: 'storm',
  snow: 'snow', winter: 'snow', ice: 'snow', frost: 'snow',
  dusk: 'dusk', sunset: 'dusk', evening: 'dusk', twilight: 'dusk',
  night: 'dusk', dark: 'dusk', midnight: 'dusk',
};
function bioFor(ss) { return BIO_MAP[String(ss && ss.biome || 'meadow').toLowerCase()] || 'meadow'; }
function palFor(ss) {
  const bio = bioFor(ss);
  let p = String(ss && ss.palette || '').toLowerCase();
  if (!PALS[p]) p = bio === 'dusk' ? 'dusk' : (bio === 'storm' || bio === 'snow') ? 'cool' : 'warm';
  return p;
}

/* ---------- the world is a stack of morph boundaries along world-x ----------
   segs[0] is the home stretch; each ahead() pushes a boundary at
   lastCam + W*1.02 — terrain past it blends into the next biome as the
   camera travels. Palette folds across every boundary; biome objects
   (trees/props/scatter) belong to the boundary most recently passed. */
let segs = [{ wx0: 0, pal: 'warm', bio: 'meadow', seed: 1234, props: [] }];
let lastCam = 0;
function reset(ss) {
  segs = [{ wx0: 0, pal: palFor(ss), bio: bioFor(ss),
            seed: ((ss && ss.seed) | 0) || 1234, props: ((ss && ss.props) || []).slice(0, 5) }];
}
function ahead(ss) {
  segs.push({ wx0: wrap(lastCam + W * 1.02), pal: palFor(ss), bio: bioFor(ss),
              seed: ((ss && ss.seed) | 0) || 77, props: ((ss && ss.props) || []).slice(0, 5) });
  if (segs.length > 12) segs.splice(1, segs.length - 12);
}
/* distance along the loop since boundary s — 0 right at the boundary */
function segAt(wx) {
  let best = segs[0], bd = Infinity;
  for (const s of segs) { const d = wrap(wx - s.wx0); if (d < bd) { bd = d; best = s; } }
  return best;
}
function bioAt(wx) { return segAt(wx).bio; }
function palNameAt(wx) { return segAt(wx).pal; }
function col(key, wx) {
  let c = (PALS[segs[0].pal] || PALS.warm)[key] || '#999999';
  for (let i = 1; i < segs.length; i++) {
    const s = segs[i], k = smooth(wrap(wx - s.wx0) / BLEND);
    if (k > 0) { const p = PALS[s.pal]; if (p && p[key]) c = blend(c, p[key], k); }
  }
  return c;
}
function floraAt(wx, i) {
  const p = PALS[palNameAt(wx)] || PALS.warm;
  return p.flora[i % p.flora.length];
}

/* ---------- the wind ---------- */
let windStr = .4, windDir = 1;       /* ambient breeze: slow strength + direction */
let gustEnv = 0, gustDir = 1;        /* decaying gust envelope (typed "blow", wolf huffs) */
let cloudDrift = 0, streakPh = 0, lastT = 0;
function wind() { return { dir: windDir, str: +windStr.toFixed(2), gust: +gustEnv.toFixed(2) }; }
function blow(power, dir) {
  const pwr = power || 1;
  gustEnv = Math.min(1.9, gustEnv + pwr);
  gustDir = dir || windDir || 1;
  for (const d of DRIFT) d.vx += gustDir * (140 + rnd(d.seed, 3) * 300) * pwr;
}
/* lean factor ≈ -2..2: traveling sine gusts roll across the meadow */
function leanAt(wx, t) {
  const wave = Math.sin(wx * .023 - t * 3.1) * .55 + Math.sin(wx * .0085 - t * 1.7) * .45;
  const base = windStr * (.58 + .42 * wave);
  const gust = gustEnv * (1.15 + .45 * Math.sin(wx * .045 - t * 9));
  return windDir * base + gustDir * gust;
}

/* ---------- the trail the hero walks ---------- */
function groundAt(wx) {
  wx = wrap(wx);
  return H * .855 + periodic(wx, 5, .7) * 4 + periodic(wx, 9, 2) * 2;   /* ±6px wander */
}

/* ---------- sky + sun + drifting clouds ---------- */
function sky(ctx, cam, t) {
  for (let x = 0; x < W; x += 26) {
    const wx = wrap(cam + x + 13);
    const g = ctx.createLinearGradient(0, 0, 0, H * .84);
    g.addColorStop(0, col('top', wx));
    g.addColorStop(1, col('horizon', wx));
    ctx.fillStyle = g;
    ctx.fillRect(x - 1, 0, 28, H);
    if (bioAt(wx) === 'storm') {
      ctx.fillStyle = 'rgba(84,100,120,.16)';
      ctx.fillRect(x - 1, 0, 28, H * .8);
    }
  }
  const wx = wrap(cam + W * .72), palN = palNameAt(wx);
  const night = palN === 'night', duskLow = palN === 'dusk';
  const sx = W * .72, sy = H * (night ? .17 : duskLow ? .27 : .15), sr = duskLow ? 44 : 33;
  const gl = ctx.createRadialGradient(sx, sy, 4, sx, sy, sr * 3.4);
  gl.addColorStop(0, night ? 'rgba(255,241,196,.45)' : 'rgba(255,224,150,.42)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  circle(ctx, sx, sy, sr * 3.4, gl);
  circle(ctx, sx, sy, sr, col('accent', wx));
  if (night) {
    ellipse(ctx, sx - 9, sy - 7, 6, 5, 'rgba(200,200,180,.45)');
    ellipse(ctx, sx + 10, sy + 8, 4.4, 3.8, 'rgba(200,200,180,.4)');
    for (let i = 0; i < 16; i++)
      circle(ctx, rnd(31, i) * W, 14 + rnd(77, i) * H * .5, .9 + rnd(51, i) * 1.2,
        'rgba(255,241,196,.55)');
  } else {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + .2;
      const rr = sr * (1.72 + .18 * Math.sin(t * 1.3 + i));
      stroke(ctx, [[sx + Math.cos(a) * sr * 1.25, sy + Math.sin(a) * sr * 1.25],
                   [sx + Math.cos(a) * rr, sy + Math.sin(a) * rr]],
        blend(col('accent', wx), '#FFFFFF', .3), 3.2);
    }
  }
}
function puff(ctx, x, y, s, c, a) {
  ctx.save(); ctx.globalAlpha = a;
  ellipse(ctx, x + 4 * s, y + 9 * s, 42 * s, 10 * s, 'rgba(140,150,160,.22)');
  ellipse(ctx, x - 22 * s, y + 4 * s, 22 * s, 10 * s, c);
  ellipse(ctx, x, y - 3 * s, 30 * s, 14 * s, c);
  ellipse(ctx, x + 26 * s, y + 5 * s, 24 * s, 10 * s, c);
  ctx.restore();
}
function clouds(ctx, cam, t) {
  for (let i = 0; i < 8; i++) {
    const cwx = i * 521 + rnd(37, i) * 280 + cloudDrift;
    const x = visibleX(cwx, cam, .16);
    if (x < -150 || x > W + 150) continue;
    const wx = wrap(cam + x);
    const night = palNameAt(wx) === 'night', storm = bioAt(wx) === 'storm';
    const y = H * .07 + rnd(71, i) * H * .24 + Math.sin(t * .35 + i * 1.7) * 4;
    const s = (.68 + rnd(93, i) * .8) * (storm ? 1.25 : 1);
    puff(ctx, x, y, s, storm ? '#C3CFDA' : night ? '#566284' : '#FFFDF6',
      (storm ? .55 : .72) * (night ? .5 : 1));
  }
}

/* ---------- parallax ridge bands (filled polygons on periodic noise) ---------- */
const BAND_Y = [.55, .66, .80], BAND_A = [24, 22, 15], BAND_D = [.34, .62, 1];
function ridgeY(wx, base, amp, layer) {
  return base + (periodic(wx, 2 + layer, .7) + .42 * periodic(wx, 5 + layer, 1.2)
    + .23 * periodic(wx, 9, 2.4)) * amp;
}
function band(ctx, cam, layer) {
  const depth = BAND_D[layer], base = H * BAND_Y[layer], amp = BAND_A[layer];
  const field = ['far', 'mid', 'near'][layer];
  ctx.fillStyle = xgrad(ctx, col(field, wrap(cam + 40)), col(field, wrap(cam + W - 40)));
  ctx.beginPath(); ctx.moveTo(-30, H + 30);
  for (let x = -30; x <= W + 30; x += 14)
    ctx.lineTo(x, ridgeY(wrap(cam * depth + x), base, amp, layer));
  ctx.lineTo(W + 30, H + 30); ctx.closePath(); ctx.fill();
  if (layer === 2) {   /* snow dusts the near ridge */
    for (let x = -20; x < W + 20; x += 16) {
      const wx = wrap(cam + x);
      if (bioAt(wx) !== 'snow') continue;
      const y0 = ridgeY(wx, base, amp, layer), y1 = ridgeY(wrap(wx + 16), base, amp, layer);
      poly(ctx, [[x, y0 - 2], [x + 16, y1 - 2], [x + 16, y1 + 5], [x, y0 + 5]],
        'rgba(248,250,240,.6)');
    }
  }
}

/* ---------- painted trees — canopies sway with the gusts ---------- */
function pineTree(ctx, x, y, s, leaf, trunk, lean, snow) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = trunk; ctx.fillRect(-3 * s, -14 * s, 6 * s, 15 * s);
  for (let i = 0; i < 3; i++) {
    const ty = -12 * s - i * 24 * s, tw = (56 - i * 15) * s, th = 42 * s;
    const off = lean * s * (1.2 + i * 1.1);            /* top sways most */
    poly(ctx, [[-tw / 2, ty], [off, ty - th], [tw / 2, ty]], leaf);
    if (snow > .05)
      poly(ctx, [[off - 10 * s, ty - th * .72], [off, ty - th], [off + 10 * s, ty - th * .72],
        [off + 3 * s, ty - th * .58], [off - 3 * s, ty - th * .58]],
        `rgba(246,250,240,${(snow * .8).toFixed(2)})`);
  }
  ctx.restore();
}
function roundTree(ctx, x, y, s, leaf, trunk, lean) {
  ctx.save(); ctx.translate(x, y);
  poly(ctx, [[-4 * s, 0], [-3 * s, -46 * s], [3 * s, -46 * s], [4.5 * s, 0]], trunk);
  stroke(ctx, [[0, -28 * s], [(-14 + lean * .5) * s, -48 * s]], trunk, 3.2 * s);
  const dark = blend(leaf, '#2E5B3E', .2);
  for (const [bx, by, br] of [[0, -62, 27], [-19, -50, 19], [19, -51, 20], [3, -43, 16]]) {
    const k = 1 + (62 + by) / 34;                       /* higher blobs sway more */
    ellipse(ctx, (bx + lean * k) * s, by * s, br * s, br * .82 * s, leaf);
  }
  ellipse(ctx, (2 + lean * 1.2) * s, -44 * s, 18 * s, 8 * s, dark);
  ctx.restore();
}
function trees(ctx, cam, layer, t) {
  const depth = layer === 0 ? .55 : 1, step = layer === 0 ? 110 : 82;
  const s0 = layer === 0 ? .42 : .78;
  const cells = Math.ceil(LEN / step);
  for (let i = 0; i < cells; i++) {
    const h1 = (i * 2654435761) | 0;
    const wx = i * step + rnd(h1, 3) * step * .8;
    const x = visibleX(wx, cam, depth);
    if (x < -100 || x > W + 100) continue;
    const seg = segAt(wx), bio = seg.bio, sd = seg.seed;
    const n = rnd((h1 ^ sd) | 0, 7);
    const density = { meadow: .3, forest: .88, village: .38, river: .3,
                      storm: .5, snow: .55, dusk: .4 }[bio] || .4;
    if (n > density * (layer === 0 ? .8 : 1)) continue;
    const s = s0 * (.62 + rnd(h1, 11) * .72);
    const leaf = blend(col('leaf', wx), col(layer === 0 ? 'far' : 'near', wx), layer === 0 ? .45 : .18);
    const baseY = layer === 0
      ? ridgeY(wrap(wx), H * BAND_Y[1], BAND_A[1], 1) + 4
      : H * .80 + rnd(h1, 17) * H * .05;
    const lean = leanAt(wx, t) * (layer === 0 ? 4 : 6);
    const piney = bio === 'forest' ? rnd(h1, 19) < .8
                : bio === 'snow' ? rnd(h1, 19) < .6 : rnd(h1, 19) < .2;
    if (piney) pineTree(ctx, x, baseY, s, leaf, col('trunk', wx), lean, bio === 'snow' ? .75 : 0);
    else roundTree(ctx, x, baseY, s, leaf, col('trunk', wx), lean);
  }
}

/* ---------- village cottages on the mid ridge (smoke drifts downwind) ---------- */
function houses(ctx, cam) {
  const step = 300;
  for (let i = 0; i < Math.ceil(LEN / step); i++) {
    const wx = i * step + rnd(555, i) * 160;
    if (bioAt(wx) !== 'village') continue;
    const x = visibleX(wx, cam, .62);
    if (x < -60 || x > W + 60) continue;
    const ry = ridgeY(wrap(wx), H * BAND_Y[1], BAND_A[1], 1);
    const hs = .5 + rnd(556, i) * .3;
    ctx.save(); ctx.translate(x, ry + 2); ctx.scale(hs, hs);
    poly(ctx, [[-26, 0], [-26, -22], [26, -22], [26, 0]], blend(col('near', wx), '#E8C9A0', .55));
    poly(ctx, [[-32, -22], [0, -40], [32, -22]], blend(col('leaf', wx), '#B05A3C', .62));
    ctx.fillStyle = '#5A4632'; ctx.fillRect(-6, -14, 12, 14);
    circle(ctx, 12, -16, 3, '#FFE9A0');
    stroke(ctx, [[16, -40], [16 + windDir * (4 + windStr * 14), -50],
                 [16 + windDir * (10 + windStr * 26), -58]], 'rgba(200,200,190,.55)', 3);
    ctx.restore();
  }
}

/* ---------- the winding dashed trail ---------- */
function trail(ctx, cam) {
  ctx.strokeStyle = xgrad(ctx, col('path', wrap(cam)), col('path', wrap(cam + W)));
  ctx.lineWidth = 42; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = -16; x <= W + 16; x += 12) {
    const y = groundAt(cam + x);
    if (x === -16) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,225,.4)'; ctx.lineWidth = 2;
  ctx.setLineDash([12, 24]); ctx.stroke(); ctx.setLineDash([]);
}

/* ---------- undergrowth: leaning grass, nodding flowers, ponds ---------- */
function undergrowth(ctx, cam, t) {
  const step = 17, cells = Math.ceil(LEN / step);
  for (let i = 0; i < cells; i++) {
    const wx = i * step + rnd(7777, i) * 12;
    const x = visibleX(wx, cam, 1);
    if (x < -14 || x > W + 14) continue;
    const seg = segAt(wx), bio = seg.bio, sd = seg.seed;
    const ty = groundAt(wx);
    const r1 = rnd((sd ^ (i * 131)) | 0, 5), r2 = rnd(sd, i * 57 + 9);
    const y = ty - 24 + r2 * (H - ty + 36);
    const L = leanAt(wx, t);
    const flut = gustEnv * Math.sin(t * 21 + wx * .7) * 2.6;   /* gust flutter */
    if (bio === 'river' && r1 < .1) {
      ellipse(ctx, x, y + 6, 24 + r2 * 18, 6 + r2 * 4, col('water', wx));
      stroke(ctx, [[x - 14, y + 4], [x - 15 + L * 3, y - 14]], '#3E7A55', 2.2);
      ellipse(ctx, x - 15 + L * 3, y - 17, 2.6, 6, '#8A5E2E');
      continue;
    }
    if (bio === 'snow' && r1 < .42) {
      circle(ctx, x, y, 2 + r2 * 2.4, 'rgba(250,252,246,.8)');
      continue;
    }
    if (r1 < .15 && bio !== 'snow') {
      /* a nodding flower — stem leans, head dips downwind */
      const h = 13 + r2 * 12;
      const tx = x + L * h * .7 + flut;
      const tyy = y - h + Math.abs(L) * 2.5;
      stroke(ctx, [[x, y], [x + L * h * .35, y - h * .55], [tx, tyy]], '#3E8F57', 1.8);
      const fc = floraAt(wx, i);
      for (let pp = 0; pp < 5; pp++) {
        const a = pp / 5 * Math.PI * 2;
        circle(ctx, tx + Math.cos(a) * 3.6, tyy + Math.sin(a) * 3.2, 2.5, fc);
      }
      circle(ctx, tx, tyy, 2, '#FFE9A0');
      continue;
    }
    /* grass blades — leaning with the traveling gust wave */
    const h = 9 + r2 * 15;
    const gcol = blend(col('near', wx), '#2F7A4C', .3 + r1 * .3);
    stroke(ctx, [[x, y], [x + L * h * .8 + flut, y - h]], gcol, 1.7);
    stroke(ctx, [[x + 4, y], [x + 4 + L * h * .6 + flut * .8, y - h * .75]],
      blend(gcol, '#1E5238', .35), 1.3);
  }
}

/* ---------- scene_seed.props baked in as stable world-x scenery ---------- */
function bakedProps(ctx, cam) {
  for (const s of segs) {
    for (let j = 0; j < s.props.length; j++) {
      const res = window.resolveKind(s.props[j]);
      const def = window.PROPS[res.def];
      if (!def) continue;
      const wx = wrap(s.wx0 + 480 + j * 320 + rnd(s.seed, j + 40) * 130);
      const x = visibleX(wx, cam, 1);
      if (x < -70 || x > W + 70) continue;
      const sc = window.propScale(def, W) * .55;
      const y = groundAt(wx) - 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      ctx.translate(-def.w / 2, -def.h + 8);
      def.draw(ctx, def.w, def.h, SK.rng(s.seed + j * 71), res.word);
      ctx.restore();
      SK.caption(ctx, res.word, x, y + 15, SK.rng(s.seed + j * 91), { size: 12 });
    }
  }
}

/* ---------- biome weather extras ---------- */
function rain(ctx, cam, t) {
  const step = 46;
  for (let i = 0; i < Math.ceil(LEN / step); i++) {
    const wx = i * step + rnd(321, i) * 26;
    if (bioAt(wx) !== 'storm') continue;
    const x = visibleX(wx, cam, .8);
    if (x < -20 || x > W + 20) continue;
    const yy = (rnd(322, i) * H + t * (300 + windStr * 140)) % (H * .82);
    const slant = windDir * (6 + windStr * 16) + gustDir * gustEnv * 18;
    stroke(ctx, [[x, yy], [x + slant, yy + 20]], 'rgba(160,190,220,.4)', 1.6);
  }
}
function fireflies(ctx, cam, t) {
  for (let i = 0; i < 24; i++) {
    const wx = i * 167 + rnd(400, i) * 90;
    if (bioAt(wx) !== 'dusk') continue;
    const x = visibleX(wx, cam, .9);
    if (x < -10 || x > W + 10) continue;
    const y = H * .48 + rnd(410, i) * H * .3 + Math.sin(t * 1.3 + i) * 7;
    const tw = .5 + .5 * Math.sin(t * 3 + i * 2.4);
    circle(ctx, x, y, 1.6 + tw * 1.4, `rgba(232,247,94,${(.3 + tw * .55).toFixed(2)})`);
  }
}

/* ---------- ~20 ambient drifters: petals, seed fluff, leaves on wind paths ---------- */
const DRIFT = [];
function seedDrifters() {
  DRIFT.length = 0;
  for (let i = 0; i < 20; i++) {
    DRIFT.push({
      x: rnd(9100, i) * (W + 240) - 120,
      y: H * .08 + rnd(9200, i) * H * .6,
      vx: 0, ph: rnd(9300, i) * 6.3,
      sp: .55 + rnd(9400, i) * .95,
      rot: rnd(9500, i) * 6.3, spin: (rnd(9500, i + 40) - .5) * 4,
      size: 2.4 + rnd(9600, i) * 3.6,
      seed: 9000 + i * 13,
      type: i % 3,                    /* 0 petal · 1 seed fluff · 2 leaf */
      col: ['#F58ACB', '#FFC9BF', '#FFE08A', '#FFFDF6'][i % 4],
    });
  }
}
function drifters(ctx, dt, t) {
  if (!DRIFT.length) seedDrifters();
  for (const d of DRIFT) {
    const target = windDir * (26 + windStr * 130) * d.sp + gustDir * gustEnv * 460 * d.sp;
    d.vx += (target - d.vx) * Math.min(1, dt * 2.4);
    d.x += d.vx * dt;
    d.y += (Math.sin(t * 1.5 + d.ph) * 10 + Math.sin(t * .6 + d.ph * 2) * 4) * dt;
    d.rot += d.spin * dt * (1 + gustEnv * 4);
    if (d.x > W + 90) d.x -= W + 180;
    if (d.x < -90) d.x += W + 180;
    if (d.y < -30) d.y += H * .75;
    if (d.y > H * .84) d.y -= H * .7;
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
    ctx.globalAlpha = .85;
    if (d.type === 0) {
      ellipse(ctx, 0, 0, d.size * 1.5, d.size * .8, d.col);
    } else if (d.type === 1) {
      for (let a = 0; a < 4; a++) {
        const an = -Math.PI / 2 + (a - 1.5) * .5;
        stroke(ctx, [[0, 0], [Math.cos(an) * d.size * 1.3, Math.sin(an) * d.size * 1.3]],
          'rgba(255,253,246,.85)', .9);
      }
      circle(ctx, 0, 1, 1.3, '#C9B98A');
    } else {
      ellipse(ctx, 0, 0, d.size * 1.7, d.size * .85, '#67B86F');
      stroke(ctx, [[-d.size * 1.4, 0], [d.size * 1.5, 0]], '#3E8F57', .8);
    }
    ctx.restore();
  }
}
/* visible streak lines while a gust sweeps through */
function gustStreaks(ctx) {
  if (gustEnv < .05) return;
  ctx.save();
  ctx.globalAlpha = Math.min(.5, gustEnv * .5);
  const span = W + 320;
  for (let i = 0; i < 9; i++) {
    const y = (i * 137 % (H * .82)) + 24;
    const raw = i * 233 + streakPh * (1 + i * .04);
    const x = ((raw % span) + span) % span - 160;
    const len = 46 + gustEnv * 90 + i * 4;
    stroke(ctx, [[x, y], [x + gustDir * len, y - 3]], '#FFFDF6', 2.6);
    stroke(ctx, [[x + 8, y + 8], [x + 8 + gustDir * len * .7, y + 6]],
      'rgba(190,215,228,.8)', 1.4);
  }
  ctx.restore();
}

/* ---------- the frame ---------- */
function frame(ctx, cam, t) {
  lastCam = cam;
  const dt = clamp(t - (lastT || t), 0, .08); lastT = t;
  /* the breeze breathes slowly; direction flips now and then */
  windDir = Math.sin(t * .021 + 1) > -.62 ? 1 : -1;
  windStr = clamp(.34 + .24 * Math.sin(t * .13 + 1) + .14 * Math.sin(t * .043), .06, 1);
  gustEnv *= Math.exp(-dt * 2.2);
  cloudDrift += windDir * (8 + windStr * 26) * dt;
  streakPh += (windDir * (60 + windStr * 100) + gustDir * gustEnv * 900) * dt;

  ctx.clearRect(0, 0, W, H);
  sky(ctx, cam, t);
  clouds(ctx, cam, t);
  band(ctx, cam, 0);
  trees(ctx, cam, 0, t);
  band(ctx, cam, 1);
  houses(ctx, cam);
  band(ctx, cam, 2);
  trees(ctx, cam, 1, t);
  trail(ctx, cam);
  undergrowth(ctx, cam, t);
  bakedProps(ctx, cam);
  rain(ctx, cam, t);
  drifters(ctx, dt, t);
  gustStreaks(ctx);
  fireflies(ctx, cam, t);
}

function resize(w, h) {
  W = Math.max(200, w | 0);
  H = Math.max(160, h | 0);
  if (!DRIFT.length) seedDrifters();
  else for (const d of DRIFT) { d.x = Math.min(d.x, W + 80); d.y = Math.min(d.y, H * .8); }
}
function camStart() { return 240 - W * .30; }   /* hero (worldX 240) at left-third */

/* ---------- the house under construction (crayon, drawn on play canvas) ---------- */
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
  resize, frame, reset, ahead, groundAt, camStart, blow, wind, leanAt, drawBuild,
  LEN, PALS, BIO_MAP,
};
})();
