/* world.js — LANTERN TRAIL: a painted DUSK world, alive under the camera.
 * (PAINTED.md contract — port of Emberwood "Lanternward" techniques.)
 *
 *   WORLD.frame(ctx, cam, time)          painted world at camera `cam`, every rAF
 *   WORLD.ahead(sceneSeed)               the road AHEAD cross-blends to this biome/palette
 *   WORLD.groundAt(worldX)               painted trail line Y at a world x
 *   WORLD.drawBuild(ctx, stage, x, y, r) crayon pig house (ported unchanged from 07)
 *   WORLD.camStart()                     initial cam — hero sits left-third
 *   WORLD.resize(W, H)                   stage size (called from app sizeAll)
 *   WORLD.reset(sceneSeed)               instant palette snap (no blend) for new runs
 *   WORLD.info()                         current biome/palette/seed for the HUD probe
 *
 * The look: deep teal-purple dusk sky with early twinkling stars and a warm
 * sun setting low on the horizon; 3 parallax ridge bands in cool dusk tones;
 * tree silhouettes; lantern posts every ~360 world-x pooling warm radial
 * light onto the trail; ~40 world-anchored fireflies sine-wandering with
 * time-pulsed alpha. All painted fills — no sketch outlines on terrain.
 *
 * The morph: every scene_seed maps into the DUSK FAMILY (ember / violet /
 * teal / night). When ahead(ss) is called, the world ahead of the camera
 * cross-blends toward the new palette + mood with
 *   t = smoothstep((worldX - blendStart) / BLEND)
 * so light color and mood literally shift up the road — no cut, no wipe.
 *
 * World space is continuous and infinite ahead (cam only grows); every
 * object is a stable function of world-x. Nothing is baked — everything
 * is drawn live from (cam, time) each frame.
 */
'use strict';
(function () {
const SK = window.SK;

/* ---------- stage size ---------- */
let W = 800, H = 420;
let GY = Math.round(H * .8);           /* grassy ground line baseline */

function resize(w, h) { W = w; H = h; GY = Math.round(H * .8); }

/* ---------- emberwood math helpers (ported) ---------- */
const LEN = 3840;                       /* noise period — a "year" of trail */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = v => clamp(v, 0, 1);
const smooth = t => t * t * (3 - 2 * t);
function hash(n) {
  let a = (n | 0) + 0x6D2B79F5;
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a ^= a + Math.imul(a ^ (a >>> 7), 61 | a);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
function rnd(seed, n) { return hash(seed + n * 374761393); }
function rgb(v) {
  if (v.startsWith('rgb')) return (v.match(/\d+/g) || []).slice(0, 3).map(Number);
  const n = parseInt(v.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function blend(a, b, t) {
  const aa = rgb(a), bb = rgb(b);
  return `rgb(${Math.round(aa[0] + (bb[0] - aa[0]) * t)},${Math.round(aa[1] + (bb[1] - aa[1]) * t)},${Math.round(aa[2] + (bb[2] - aa[2]) * t)})`;
}
function rgba(hex, a) {
  const c = rgb(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${clamp01(a).toFixed(3)})`;
}
function periodic(x, k = 1, ph = 0) { return Math.sin(2 * Math.PI * x / LEN * k + ph); }
function circle(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function poly(ctx, pts, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}
function strokeP(ctx, pts, col, w) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
}
function gradX(ctx, x0, x1, a, b) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, a); g.addColorStop(1, b); return g;
}

/* ---------- the dusk family — every palette word maps into it ---------- */
const PALS = {
  ember: { top: '#1E2A4C', horizon: '#E8895E', far: '#3A4266', mid: '#2F3958', near: '#222C46',
           path: '#7A6B5C', leaf: '#24344A', glow: '#FFCE7E', fly: '#FFE49C',
           sun: '#FF9A5C', stars: .9 },
  violet:{ top: '#2B2350', horizon: '#C06E8C', far: '#3E3668', mid: '#322C54', near: '#241F40',
           path: '#6E6070', leaf: '#292952', glow: '#FFB284', fly: '#FFD4A2',
           sun: '#EE7E66', stars: 1.05 },
  teal:  { top: '#122E3E', horizon: '#A87C60', far: '#29424F', mid: '#1F3646', near: '#162B3A',
           path: '#6A6055', leaf: '#1D3340', glow: '#FFD98E', fly: '#E2F7AE',
           sun: '#EF985C', stars: .8 },
  night: { top: '#131A3A', horizon: '#6A5078', far: '#252C4E', mid: '#1E2542', near: '#151D34',
           path: '#5A5260', leaf: '#1B2540', glow: '#FFC98C', fly: '#CDE6FF',
           sun: '#DC7A64', stars: 1.35 },
};
const PAL_MAP = { warm: 'ember', dusk: 'violet', cool: 'teal', night: 'night',
                  ember: 'ember', violet: 'violet', teal: 'teal', sunset: 'violet',
                  evening: 'violet', twilight: 'violet' };

/* biome → numeric mood params (all lerpable, blended like colors) */
function parFor(ss) {
  const b = String(ss && ss.biome || 'meadow').toLowerCase();
  const p = { treeDen: 1, pine: .3, mist: .12, lantern: 1, stars: 1 };
  if (/forest|wood|jungle|grove|pine/.test(b)) { p.treeDen = 1.55; p.pine = .85; }
  else if (/village|town|farm|home/.test(b)) { p.treeDen = .7; p.lantern = 1.55; p.pine = .18; }
  else if (/storm|rain|thunder|wind/.test(b)) { p.mist = .5; p.treeDen = .8; p.stars = .45; }
  else if (/cave|tunnel|den|dark|night/.test(b)) { p.mist = .3; p.treeDen = .5; p.stars = 1.45; }
  else if (/river|lake|pond|stream|water|creek|brook/.test(b)) { p.mist = .32; p.treeDen = .85; }
  else if (/snow|winter|ice|frost/.test(b)) { p.treeDen = .55; p.pine = .9; p.mist = .18; p.stars = 1.25; }
  return p;
}

/* ---------- live blend state ---------- */
const BLEND = 1150;                      /* world-px over which A → B cross-fades */
const SEED = 707;                        /* geometry seed stays fixed — only light morphs */
let palA = PALS.violet, palB = PALS.violet;
let parA = parFor({ biome: 'dusk' }), parB = parA;
let blendStart = -1e9;                   /* far past → everything uses palB */
let lastCam = 0;
let cur = { biome: 'dusk', palette: 'dusk', seed: SEED };

const blendT = wx => smooth(clamp01((wx - blendStart) / BLEND));
const col = (key, wx) => blend(palA[key], palB[key], blendT(wx));
const num = (key, wx) => parA[key] + (parB[key] - parA[key]) * blendT(wx);

function ahead(ss) {
  const key = PAL_MAP[String(ss && ss.palette || 'dusk').toLowerCase()] || 'violet';
  palA = palB; parA = parB;
  palB = PALS[key]; parB = parFor(ss);
  blendStart = lastCam + W * 1.02;        /* morph begins just past the right edge */
  cur = { biome: String(ss && ss.biome || 'dusk'), palette: String(ss && ss.palette || 'dusk'),
          seed: (ss && ss.seed | 0) || SEED };
}
function reset(ss) {                      /* instant snap — new run, no journey yet */
  const key = PAL_MAP[String(ss && ss.palette || 'dusk').toLowerCase()] || 'violet';
  palA = palB = PALS[key]; parA = parB = parFor(ss);
  blendStart = -1e9;
  cur = { biome: String(ss && ss.biome || 'dusk'), palette: String(ss && ss.palette || 'dusk'),
          seed: (ss && ss.seed | 0) || SEED };
}

/* ---------- the walking line ---------- */
function groundAt(wx) {
  return GY + 34 + periodic(wx, 5, .7) * 6.5 + periodic(wx, 9, 2.1) * 3;
}

/* ---------- sky: dusk gradient + early stars + low warm sun ---------- */
function sky(ctx, cam) {
  for (let x = 0; x < W; x += 26) {
    const wx = cam + x + 13;
    const g = ctx.createLinearGradient(0, 0, 0, GY + 50);
    g.addColorStop(0, col('top', wx));
    g.addColorStop(.58, blend(col('top', wx), col('horizon', wx), .5));
    g.addColorStop(1, col('horizon', wx));
    ctx.fillStyle = g;
    ctx.fillRect(x, -4, 27, H + 8);
  }
  /* warm dusk glow hugging the horizon, strongest near the sun */
  const sx = W * .74, sy = GY - 92;
  const hg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 300);
  hg.addColorStop(0, rgba(col('sun', cam + sx), .34));
  hg.addColorStop(1, rgba(col('sun', cam + sx), 0));
  circle(ctx, sx, sy, 300, hg);
}
function stars(ctx, cam, time) {
  const depth = .08, step = 52;
  const lo = cam * depth - 60, hi = cam * depth + W + 60;
  for (let i = Math.floor(lo / step); i * step < hi; i++) {
    const sx = i * step + rnd(SEED + 71, i) * 30 - cam * depth;
    if (sx < -8 || sx > W + 8) continue;
    const y = 16 + rnd(SEED + 39, i) * (GY * .48);
    const amt = clamp(num('stars', cam + sx) * palB.stars * .75, 0, 1.5);
    if (rnd(SEED + 91, i) > amt) continue;
    const tw = .5 + .5 * Math.sin(time * 1.5 + i * 2.31);
    circle(ctx, sx, y, .8 + rnd(SEED + 17, i) * 1.3,
      rgba('#FFEECC', .3 + .5 * tw));
  }
}
function sun(ctx, cam) {
  const sx = W * .74, sy = GY - 92;
  const c = col('sun', cam + sx);
  circle(ctx, sx, sy, 34, c);
  /* low-sun glow ring */
  const g = ctx.createRadialGradient(sx, sy, 30, sx, sy, 96);
  g.addColorStop(0, rgba(c, .3)); g.addColorStop(1, rgba(c, 0));
  circle(ctx, sx, sy, 96, g);
}
function clouds(ctx, cam) {
  const depth = .16, step = 262;
  const lo = cam * depth - 160, hi = cam * depth + W + 160;
  for (let i = Math.floor(lo / step); i * step < hi; i++) {
    const sx = i * step + rnd(SEED, 200 + i) * 110 - cam * depth;
    if (sx < -120 || sx > W + 120) continue;
    const y = 44 + rnd(SEED, 310 + i) * 120;
    const s = .6 + rnd(SEED, 421 + i) * .9;
    const c = rgba(blend(col('top', cam + sx), '#0E1626', .5), .5);
    ellipse(ctx, sx, y, 40 * s, 11 * s, c);
    ellipse(ctx, sx - 26 * s, y + 5 * s, 26 * s, 8 * s, c);
    ellipse(ctx, sx + 30 * s, y + 6 * s, 30 * s, 8 * s, c);
  }
}

/* ---------- ridge bands: 3 parallax layers, filled silhouettes ---------- */
function ridgeY(wx, y, amp, layer) {
  const n = periodic(wx, 2 + layer, .35 * SEED) +
            .42 * periodic(wx, 5 + layer, 1.2) +
            .23 * periodic(wx, 9, 2.4);
  return y + n * amp;
}
function band(ctx, cam, layer) {
  const depth = [.30, .58, 1][layer];
  const y = [GY - 74, GY - 26, GY + 26][layer];
  const amp = [24, 21, 15][layer];
  const f = ['far', 'mid', 'near'][layer];
  ctx.fillStyle = gradX(ctx, 0, W, col(f, cam), col(f, cam + W));
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 12; x += 12)
    ctx.lineTo(x, ridgeY(cam * depth + x, y, amp, layer));
  ctx.lineTo(W, H); ctx.fill();
}

/* ---------- tree silhouettes on the ridges ---------- */
function pine(ctx, x, y, s, col) {
  ctx.fillStyle = '#141225';
  ctx.fillRect(x - 3.5 * s, y - 12 * s, 7 * s, 14 * s);
  poly(ctx, [[x - 22 * s, y - 6 * s], [x, y - 88 * s], [x + 22 * s, y - 6 * s]], col);
  poly(ctx, [[x - 28 * s, y - 2 * s], [x, y - 60 * s], [x + 28 * s, y - 2 * s]], col);
}
function roundTree(ctx, x, y, s, col) {
  ctx.fillStyle = '#141225';
  ctx.fillRect(x - 4 * s, y - 46 * s, 8 * s, 50 * s);
  circle(ctx, x, y - 66 * s, 25 * s, col);
  circle(ctx, x - 19 * s, y - 52 * s, 18 * s, col);
  circle(ctx, x + 20 * s, y - 54 * s, 19 * s, col);
  circle(ctx, x + 3 * s, y - 46 * s, 20 * s, col);
}
function trees(ctx, cam, layer) {
  const depth = layer === 0 ? .56 : 1;
  const step = layer === 0 ? 96 : 76;
  const lo = cam * depth - 110, hi = cam * depth + W + 110;
  for (let i = Math.floor(lo / step); i * step < hi; i++) {
    const wx = i * step + rnd(SEED, 11 + i) * step * .7;
    const sx = wx - cam * depth;
    if (sx < -90 || sx > W + 90) continue;
    const n = rnd(SEED, 399 + i);
    if (rnd(SEED, 77 + i) > num('treeDen', cam + sx)) continue;
    const baseY = layer === 0
      ? GY - 20 + rnd(SEED, 82 + i) * 20
      : GY + 40 + rnd(SEED, 92 + i) * 42;
    const s = (layer === 0 ? .44 : .78) * (.62 + n * .66);
    const leaf = blend(col('leaf', cam + sx), '#0D1428', layer === 0 ? .55 : .4);
    if (n < num('pine', cam + sx)) pine(ctx, sx, baseY, s, leaf);
    else roundTree(ctx, sx, baseY, s, leaf);
  }
}

/* ---------- the trail itself ---------- */
function trail(ctx, cam) {
  const pts = [];
  for (let x = -16; x <= W + 16; x += 12) pts.push([x, groundAt(cam + x)]);
  ctx.strokeStyle = gradX(ctx, 0, W, col('path', cam), col('path', cam + W));
  ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,233,190,.26)';
  ctx.lineWidth = 2.4; ctx.setLineDash([13, 26]); ctx.stroke(); ctx.setLineDash([]);
}
function undergrowth(ctx, cam) {
  const step = 23;
  for (let i = Math.floor((cam - 30) / step); i * step < cam + W + 30; i++) {
    const wx = i * step + rnd(SEED, 1000 + i) * 16;
    const sx = wx - cam;
    if (sx < -10 || sx > W + 10) continue;
    const y = GY + 42 + rnd(SEED, 1200 + i) * (H - GY - 50);
    const c = rnd(SEED, 1400 + i) > .82 ? '#3A3450' : '#182238';
    strokeP(ctx, [[sx, y + 4], [sx - 3, y - 3], [sx, y + 1], [sx + 3, y - 5]], c, 1.2);
    if (rnd(SEED, 1500 + i) > .9)
      ellipse(ctx, sx + 6, y + 2, 5 + rnd(SEED, i + 7) * 7, 3 + rnd(SEED, i + 9) * 3, '#232B46');
  }
}
function mistfog(ctx, cam) {
  for (let x = 0; x < W; x += 34) {
    const wx = cam + x;
    const m = num('mist', wx);
    if (m < .03) continue;
    const g = ctx.createLinearGradient(0, GY - 30, 0, H);
    g.addColorStop(0, rgba('#8E9CC8', 0));
    g.addColorStop(.55, rgba('#8E9CC8', m * .16));
    g.addColorStop(1, rgba('#8E9CC8', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, GY - 30, 34, H - GY + 30);
  }
}

/* ---------- the signature: lantern posts pooling warm light ---------- */
function lanterns(ctx, cam, time) {
  const step = 360;
  for (let i = Math.floor((cam - 140) / step); i * step < cam + W + 140; i++) {
    const wx = 75 + i * step;
    const sx = wx - cam;
    if (sx < -90 || sx > W + 90) continue;
    if (rnd(SEED, 555 + i) > num('lantern', wx)) continue;
    const gy = groundAt(wx);
    const glow = col('glow', wx);
    const flick = .92 + .08 * Math.sin(time * 7 + i * 3.1) + .04 * Math.sin(time * 13 + i * 1.7);
    /* the pool of warm light on the path */
    const pg = ctx.createRadialGradient(sx, gy + 4, 4, sx, gy + 4, 96);
    pg.addColorStop(0, rgba(glow, .34 * flick));
    pg.addColorStop(.6, rgba(glow, .12 * flick));
    pg.addColorStop(1, rgba(glow, 0));
    ellipse(ctx, sx, gy + 4, 96, 24, pg);
    /* post + lamp house */
    strokeP(ctx, [[sx, gy], [sx, gy - 54]], '#131B2E', 3.4);
    poly(ctx, [[sx - 9, gy - 55], [sx - 7, gy - 71], [sx + 7, gy - 71], [sx + 9, gy - 55]], '#1B2438');
    strokeP(ctx, [[sx - 10, gy - 55], [sx + 10, gy - 55]], '#0E1526', 2);
    /* halo around the flame */
    const g = ctx.createRadialGradient(sx, gy - 62, 2, sx, gy - 62, 60 * flick);
    g.addColorStop(0, rgba(glow, .5));
    g.addColorStop(.42, rgba(glow, .16));
    g.addColorStop(1, rgba(glow, 0));
    circle(ctx, sx, gy - 62, 60 * flick, g);
    circle(ctx, sx, gy - 62, 4.4, '#FFEBB4');
  }
}

/* ---------- ~40 fireflies: world-anchored, sine-wander, pulsing alpha ---------- */
function fireflies(ctx, cam, time) {
  const step = 88, depth = .9;               /* ~44 per LEN, ~11 on screen */
  const lo = cam * depth - 70, hi = cam * depth + W + 70;
  for (let i = Math.floor(lo / step); i * step < hi; i++) {
    const wx = i * step + rnd(SEED, 700 + i) * 42;
    const sx = wx - cam * depth;
    if (sx < -30 || sx > W + 30) continue;
    const baseY = GY - 168 + rnd(SEED, 711 + i) * 150;
    const fx = sx + Math.sin(time * .55 + i * 2.1) * 16;
    const fy = baseY + Math.sin(time * .8 + i * 1.37) * 9;
    const tw = .5 + .5 * Math.sin(time * 2.1 + i * 1.9 + rnd(SEED, 734, i) * 6);
    const a = .16 + .58 * tw;
    const c = col('fly', cam + sx);
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    circle(ctx, fx, fy, 9, g);
    circle(ctx, fx, fy, 1.2 + rnd(SEED, 723, i) * 1.1, rgba(c, Math.min(1, a + .28)));
  }
}

/* ---------- frame: the whole painted world at camera `cam` ---------- */
function frame(ctx, cam, time) {
  lastCam = cam;
  ctx.clearRect(0, 0, W, H);
  sky(ctx, cam);
  stars(ctx, cam, time);
  sun(ctx, cam);
  clouds(ctx, cam);
  band(ctx, cam, 0);
  trees(ctx, cam, 0);
  band(ctx, cam, 1);
  band(ctx, cam, 2);
  trees(ctx, cam, 1);
  mistfog(ctx, cam);
  trail(ctx, cam);
  undergrowth(ctx, cam);
  lanterns(ctx, cam, time);
  fireflies(ctx, cam, time);
}

/* ---------- the house under construction (drawn live on play canvas) ----------
   Ported unchanged from 07-vanilla — the crayon "sticker" look stays. */
function drawBuild(ctx, stage, cx, gy, r, opts) {
  opts = opts || {};
  const y = gy + 4;
  if (stage <= 0) {
    /* dashed plot marker — "house goes here" */
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
    /* warm doorway glow + little welcome flag */
    SK.circle(ctx, cx, y - 40, 16, { r, fill: '#FFF6C9', stroke: 'none' });
    SK.line(ctx, cx - 86, y - 118, cx - 86, y - 160, { r, strokeWidth: 3 });
    SK.poly(ctx, [[cx - 86, y - 160], [cx - 54, y - 152], [cx - 86, y - 142]],
      { r, fill: '#4FB06D', strokeWidth: 2 });
  }
}

window.WORLD = {
  frame, ahead, groundAt, drawBuild,
  camStart: () => 0,
  resize, reset,
  info: () => Object.assign({}, cur),
};
})();
