/* world.js — PUDDLEJUMP painted marsh renderer (zero dependencies).
 *
 * A continuous painted marsh/river world in the Emberwood "Highland Path"
 * style: the only animated state is camera travel — every reed, puddle and
 * cattail has a stable world coordinate. WORLD.frame(ctx, cam, time) paints
 * the world at camera `cam` every rAF: soft teal sky, drizzle-grey cloud
 * blobs with falling drop streaks, 3 parallax marsh bands, a winding river
 * that periodically floods the trail, puddles sitting ON the trail, grass
 * tufts & stepping stones (the hero's hop targets), cattails + lilypads.
 *
 * The palette cross-blends along world-x through zone palettes
 * (marsh → meadow → dusk → storm). WORLD.ahead(scene_seed) repaints the
 * zones AHEAD of the camera, so travel morphs the world — never a wipe.
 *
 *   window.WORLD = {
 *     frame(ctx, cam, time), ahead(ss), groundAt(wx), drawBuild(...),
 *     camStart(), resize(W,H),
 *     puddleNear(wx,range), inPuddle(wx), isWaterAt(wx), stepAfter(wx),
 *   };
 *
 * WORLD.drawBuild stays the crayon pig house from 07-vanilla.
 */
'use strict';
(function () {
const SK = window.SK;

/* ---------- tiny math kit (ported from emberwood) ---------- */
const LEN = 3840;                       /* wrapping world length, px */
const SEG = 960;                        /* one palette zone */
const NZ  = LEN / SEG;                  /* zone count (4) */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);
function hash(n) { let a = (n | 0) + 0x6D2B79F5; a = Math.imul(a ^ (a >>> 15), 1 | a); a ^= a + Math.imul(a ^ (a >>> 7), 61 | a); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; }
const rnd = (seed, n) => hash(seed + n * 374761393);
function rgb(v) { const n = parseInt(v.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function blend(a, b, t) {
  const aa = rgb(a), bb = rgb(b);
  return `rgb(${Math.round(aa[0] + (bb[0] - aa[0]) * t)},${Math.round(aa[1] + (bb[1] - aa[1]) * t)},${Math.round(aa[2] + (bb[2] - aa[2]) * t)})`;
}
const wrap = x => ((x % LEN) + LEN) % LEN;
const periodic = (x, k = 1, ph = 0) => Math.sin(2 * Math.PI * x / LEN * k + ph);
function circle(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function ellipse(ctx, x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function stroke(ctx, pts, col, w = 1) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }

/* ---------- marsh-family palettes (warm, teal-shifted) ---------- */
const PALETTES = [
  /* 0 marsh — misty teal morning */
  { top: '#9CCDD4', horizon: '#E6E8CC', far: '#9DBC9F', mid: '#6A9E7F', near: '#3F7A63',
    path: '#C4B285', pathEdge: '#8F7A52', water: '#67B3C4', waterHi: '#D8F2F0',
    reed: '#4C7A56', leaf: '#5E9873', accent: '#F6E4AE', cloud: '#E4EAE2', cloudDark: '#A9BAB0',
    trunk: '#6B5942' },
  /* 1 meadow-marsh — sunnier green banks */
  { top: '#ACD6D6', horizon: '#F4EAC4', far: '#ACC79B', mid: '#79AC74', near: '#4E8A5E',
    path: '#D0BC8C', pathEdge: '#97824F', water: '#7CC4C9', waterHi: '#E2F5F0',
    reed: '#5C8A50', leaf: '#6FA861', accent: '#F8E49C', cloud: '#F0F0E2', cloudDark: '#BCC4AC',
    trunk: '#7A6244' },
  /* 2 dusk marsh — peachy sundown over the reeds */
  { top: '#C4A0AA', horizon: '#F2C894', far: '#AFA294', mid: '#8A9070', near: '#57705C',
    path: '#C2A276', pathEdge: '#8A6C48', water: '#D89F7E', waterHi: '#F6D8B2',
    reed: '#5F6F4C', leaf: '#8A8C60', accent: '#F0B070', cloud: '#EDD4BC', cloudDark: '#BA9E8C',
    trunk: '#5E4C3A' },
  /* 3 storm marsh — rainy slate-teal */
  { top: '#54708A', horizon: '#93A8A4', far: '#6D8C84', mid: '#4E6E68', near: '#33534B',
    path: '#948268', pathEdge: '#66584A', water: '#5C8A9C', waterHi: '#ACCACE',
    reed: '#41634E', leaf: '#4E7460', accent: '#E8DCA8', cloud: '#7E94A0', cloudDark: '#5A707C',
    trunk: '#4A4038' },
];

/* zone palettes: marsh → meadow → dusk → meadow(default cycle).
 * ahead(ss) rewrites the zones in front of the camera — the morph reveals
 * itself purely by travelling. */
const zonePal = [0, 1, 2, 1];
let lastAhead = 0;
function palIdxFor(ss) {
  const pal = String(ss && ss.palette || '').toLowerCase();
  const bio = String(ss && ss.biome || '').toLowerCase();
  if (/storm|rain|cave|night|dark/.test(bio) || /night/.test(pal)) return 3;
  if (/dusk|evening|sunset|twilight|village/.test(bio) || /dusk/.test(pal)) return 2;
  if (/cool/.test(pal) || /river|water|rain|storm|snow/.test(bio)) return 0;
  if (/forest|wood|snow|winter/.test(bio)) return 0;
  return 1;
}
/* The world AHEAD of the camera takes the new palette: rewrite the zones
 * from the next zone boundary onward. The blend itself is emberwood's
 * zone-fade — smoothstep across each 960px zone. */
function ahead(ss) {
  const zi = Math.floor((camNow + W * .55) / SEG);
  const p = palIdxFor(ss);
  zonePal[((zi + 1) % NZ + NZ) % NZ] = p;
  zonePal[((zi + 2) % NZ + NZ) % NZ] = p;
  lastAhead = p;
  return p;
}
function zone(x) { const u = wrap(x) / SEG, i = Math.floor(u); return { i, t: smooth(u - i) }; }
function col(key, x) {
  const z = zone(x);
  return blend(PALETTES[zonePal[z.i % NZ]][key],
               PALETTES[zonePal[(z.i + 1) % NZ]][key], z.t);
}

/* ---------- world geometry ---------- */
let W = 800, H = 420, camNow = 0;
let GY = 336;                           /* base trail line y */
function resize(w, h) { W = w; H = h; GY = Math.round(H * .80); }

const START_WX = 260;
function camStart() { return Math.max(0, START_WX - W * .30); }

/* the painted trail line — hero + props plant their feet on it */
function trailY(wx) { return GY + periodic(wx, 5, .7) * 5 + periodic(wx, 9, 2) * 2.6; }
function groundAt(wx) { return trailY(wx) + 12; }

/* the lazy river: a wide water ribbon that wanders in y and periodically
 * floods the walking trail (the puddle-jump crossings). */
function riverY(wx) { return GY + 40 + periodic(wx, 2.6, 1.4) * 44 + periodic(wx, 5.2, 3) * 13; }
function riverAtTrail(wx) { return riverY(wx) < trailY(wx) + 26; }

/* puddles ON the trail — deterministic world-x anchors */
const PDX = 310, PSEED = 5100;
function puddleX(i) { return i * PDX + 60 + rnd(PSEED, i) * 150; }
function puddleR(i) { return 36 + rnd(PSEED + 9, i) * 30; }
function puddleNear(wx, range) {
  const i0 = Math.floor((wx - range - 200) / PDX);
  let best = null;
  for (let i = i0; i < i0 + 4; i++) {
    const px = puddleX(i), d = Math.abs(px - wx);
    if (d < range + puddleR(i) * .4 && (!best || d < best.d)) best = { x: px, rx: puddleR(i), d };
  }
  return best;
}
function inPuddle(wx) {
  const p = puddleNear(wx, 8);
  return !!(p && Math.abs(wx - p.x) < p.rx * .8);
}
function isWaterAt(wx) { return inPuddle(wx) || riverAtTrail(wx); }

/* grass tufts / stepping stones — the hero's hop targets */
const TDX = 92, TSEED = 6100;
function tuftX(i) { return i * TDX + 26 + rnd(TSEED, i) * 44; }
function stepAfter(wx) {
  const i0 = Math.floor((wx - 60) / TDX);
  for (let i = i0; i < i0 + 4; i++) { const tx = tuftX(i); if (tx > wx + 24) return tx; }
  return wx + 96;
}

/* ---------- painted passes ---------- */
function sky(ctx, cam) {
  for (let x = 0; x < W; x += 24) {
    const loc = cam + x + 12;
    const g = ctx.createLinearGradient(0, 0, 0, H * .82);
    g.addColorStop(0, col('top', loc));
    g.addColorStop(1, col('horizon', loc));
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 25, H);
  }
  /* a hazy marsh sun, low and pale behind the drizzle */
  const sx = W * .74, sy = H * .26;
  const lg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 130);
  lg.addColorStop(0, col('accent', cam + sx) + '');
  lg.addColorStop(0, 'rgba(246,236,190,.55)');
  lg.addColorStop(1, 'rgba(246,236,190,0)');
  circle(ctx, sx, sy, 130, lg);
  circle(ctx, sx, sy, 30, col('accent', cam + sx));
}
function cloudBlob(ctx, x, y, s, c0, c1) {
  ellipse(ctx, x - 22 * s, y + 5 * s, 22 * s, 10 * s, c0);
  ellipse(ctx, x, y - 2 * s, 30 * s, 15 * s, c0);
  ellipse(ctx, x + 26 * s, y + 6 * s, 24 * s, 9 * s, c0);
  ellipse(ctx, x + 2 * s, y + 9 * s, 30 * s, 7 * s, c1);   /* grey drizzle belly */
}
function clouds(ctx, cam, time) {
  for (let i = 0; i < 11; i++) {
    const wx = i * 397 + rnd(900, i) * 190;
    const x = wrap(wx - cam * .16);
    const sx = x > LEN / 2 ? x - LEN : x;
    if (sx < -140 || sx > W + 140) continue;
    const wxs = cam + sx;
    const y = 40 + rnd(901, i) * 88, s = .8 + rnd(902, i) * .85;
    const c0 = blend(col('cloud', wxs), '#9AAAB0', .30);
    const c1 = blend(col('cloudDark', wxs), '#8FA0A8', .30);
    ctx.globalAlpha = .9;
    cloudBlob(ctx, sx, y, s, c0, c1);
    ctx.globalAlpha = 1;
    /* drizzle: short drop streaks animating down out of the cloud */
    if (rnd(903, i) > .30) {
      const drops = 5 + Math.floor(rnd(904, i) * 4);
      for (let d = 0; d < drops; d++) {
        const dx = sx - 26 * s + rnd(905 + d, i) * 52 * s;
        const span = 96 + rnd(906 + d, i) * 40;
        const yy = y + 12 + ((time * (66 + rnd(907 + d, i) * 30) + rnd(908 + d, i) * span) % span);
        const fade = 1 - (yy - y - 12) / span;
        stroke(ctx, [[dx, yy], [dx - 3, yy + 11]], `rgba(160,196,208,${(.5 * fade).toFixed(3)})`, 1.6);
      }
    }
  }
}
function ridgeY(wx, y, amp, layer) {
  const n = periodic(wx, 2 + layer, .35 * 404) + .42 * periodic(wx, 5 + layer, 1.2) + .23 * periodic(wx, 9, 2.4);
  return y + n * amp;
}
function band(ctx, cam, layer) {
  const depth = [.30, .58, 1][layer];
  const y = [H * .56, H * .66, H * .755][layer];
  const amp = [16, 13, 9][layer];
  const field = ['far', 'mid', 'near'][layer];
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, col(field, cam));
  g.addColorStop(1, col(field, cam + W));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, ridgeY(cam * depth + x, y, amp, layer));
  ctx.lineTo(W, H);
  ctx.fill();
}
function willow(ctx, x, y, s, leaf, trunk) {
  stroke(ctx, [[x, y], [x + 2 * s, y - 30 * s]], trunk, 5 * s);
  ellipse(ctx, x, y - 40 * s, 34 * s, 20 * s, leaf);
  ellipse(ctx, x - 14 * s, y - 30 * s, 20 * s, 13 * s, leaf);
  ellipse(ctx, x + 16 * s, y - 31 * s, 18 * s, 12 * s, leaf);
  for (let k = -2; k <= 2; k++)                        /* droopy willow strands */
    stroke(ctx, [[x + k * 12 * s, y - 34 * s], [x + k * 14 * s, y - 12 * s]], leaf, 1.6 * s);
}
function farFlora(ctx, cam) {
  for (let i = 0; i < 14; i++) {
    const wx = i * 311 + rnd(920, i) * 130;
    const x = wrap(wx - cam * .45);
    const sx = x > LEN / 2 ? x - LEN : x;
    if (sx < -80 || sx > W + 80) continue;
    const wy = cam + sx;
    if (rnd(921, i) < .45) {
      const s = .5 + rnd(922, i) * .4;
      willow(ctx, sx, H * .665 + rnd(923, i) * 14, s,
        blend(col('leaf', wy), col('far', wy), .4), col('trunk', wy));
    } else {                                            /* distant reed clumps */
      const ry = H * .665 + rnd(923, i) * 16;
      for (let k = 0; k < 5; k++)
        stroke(ctx, [[sx + k * 4 - 8, ry], [sx + k * 4 - 10, ry - 9 - rnd(924 + k, i) * 8]],
          blend(col('reed', wy), col('mid', wy), .4), 1.6);
    }
  }
}
function trail(ctx, cam) {
  const pts = [];
  for (let x = -15; x <= W + 15; x += 12) pts.push([x, trailY(cam + x) + 6]);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, col('path', cam));
  g.addColorStop(1, col('path', cam + W));
  ctx.strokeStyle = g;
  ctx.lineWidth = 34;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  /* stitched center line — the crayon path keeps its dashed seam */
  ctx.strokeStyle = col('pathEdge', cam);
  ctx.globalAlpha = .45; ctx.lineWidth = 2;
  ctx.setLineDash([11, 20]);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
}
function river(ctx, cam, time) {
  const pts = [];
  for (let x = -60; x <= W + 60; x += 12) pts.push([x, riverY(cam + x)]);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, col('water', cam));
  g.addColorStop(1, col('water', cam + W));
  ctx.strokeStyle = g; ctx.lineWidth = 88;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  /* soft inner shine + a drifting dashed current line */
  ctx.strokeStyle = col('waterHi', cam);
  ctx.globalAlpha = .55; ctx.lineWidth = 5;
  ctx.setLineDash([26, 44]); ctx.lineDashOffset = -time * 26;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] - 8);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1] - 8);
  ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1;
}
function lilypads(ctx, cam, time) {
  for (let i = 0; i < 22; i++) {
    const wx = i * 179 + rnd(930, i) * 90;
    const x = wrap(wx - cam);
    const sx = x > LEN / 2 ? x - LEN : x;
    if (sx < -30 || sx > W + 30) continue;
    const ry = riverY(wx);
    if (ry > GY + 96) continue;                          /* pads live on the river */
    const py = ry + rnd(931, i) * 30 - 15 + Math.sin(time * 1.1 + i) * 1.6;
    const pr = 9 + rnd(932, i) * 8;
    const pad = blend(col('leaf', wx), '#3F8A5E', .35);
    ellipse(ctx, sx, py, pr, pr * .42, pad);
    stroke(ctx, [[sx, py], [sx + pr * .8, py - pr * .3]], pad, 1.4);
    if (rnd(933, i) > .72) circle(ctx, sx + pr * .2, py - pr * .4, 2.6, '#F5A9C4');
  }
}
function puddles(ctx, cam, time) {
  const i0 = Math.floor((cam - 120) / PDX), i1 = Math.ceil((cam + W + 120) / PDX);
  for (let i = i0; i <= i1; i++) {
    const wx = puddleX(i), sx = wx - cam;
    if (sx < -120 || sx > W + 120) continue;
    const rx = puddleR(i), ry = 7 + rx * .10;
    const py = trailY(wx) + 16;
    /* sky-reflection tinted water with a darker rim */
    ellipse(ctx, sx, py, rx, ry, blend(col('water', wx), col('waterHi', wx), .45));
    ctx.globalAlpha = .5;
    ctx.strokeStyle = col('pathEdge', wx); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(sx, py, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    /* shimmer: a drifting specular streak + a slow ripple ring */
    const shx = Math.sin(time * 1.7 + wx * .11) * rx * .4;
    ellipse(ctx, sx + shx, py - ry * .3, rx * .34, ry * .22, 'rgba(255,255,255,.55)');
    const k = (time * .5 + rnd(940, i)) % 1;
    ctx.globalAlpha = (1 - k) * .4;
    ctx.strokeStyle = col('waterHi', wx); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(sx, py, rx * (.3 + k * .7), ry * (.3 + k * .7), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function tuftsAndStones(ctx, cam) {
  const i0 = Math.floor((cam - 80) / TDX), i1 = Math.ceil((cam + W + 80) / TDX);
  for (let i = i0; i <= i1; i++) {
    const wx = tuftX(i), sx = wx - cam;
    if (sx < -40 || sx > W + 40) continue;
    const ty = groundAt(wx);
    const wet = isWaterAt(wx);
    if (wet || rnd(TSEED + 3, i) > .68) {                /* stepping stone */
      ellipse(ctx, sx, ty - 1, 17, 6.5, blend('#A8B0A4', col('path', wx), .3));
      ellipse(ctx, sx - 3, ty - 3.5, 10, 3, 'rgba(235,242,228,.65)');
    } else {                                             /* grass tuft — a hop pad */
      for (let k = -2; k <= 2; k++) {
        const b = rnd(TSEED + 4 + k, i);
        stroke(ctx, [[sx + k * 5, ty + 2], [sx + k * 6.5 + (b - .5) * 5, ty - 9 - b * 9]],
          col('reed', wx), 2.4);
      }
      ellipse(ctx, sx, ty + 2.5, 13, 3.4, blend(col('near', wx), '#3F7A63', .4));
    }
  }
}
function cattail(ctx, x, y, s, reed, head) {
  stroke(ctx, [[x, y], [x - 2 * s, y - 34 * s]], reed, 2.4 * s);
  stroke(ctx, [[x + 7 * s, y], [x + 9 * s, y - 26 * s]], reed, 2 * s);
  ellipse(ctx, x - 2 * s, y - 40 * s, 3.4 * s, 9 * s, head);
  circle(ctx, x - 2 * s, y - 50 * s, 1.4 * s, '#E8DC9A');
}
function reedsAndCattails(ctx, cam) {
  /* river-edge cattails */
  for (let i = 0; i < 30; i++) {
    const wx = i * 137 + rnd(950, i) * 70;
    const x = wrap(wx - cam);
    const sx = x > LEN / 2 ? x - LEN : x;
    if (sx < -30 || sx > W + 30) continue;
    const ry = riverY(wx);
    if (ry > GY + 110) continue;
    cattail(ctx, sx, ry + 24 + rnd(951, i) * 12, .7 + rnd(952, i) * .5,
      col('reed', wx), '#8A5E2E');
  }
  /* marsh-bank cattails behind the trail */
  for (let i = 0; i < 26; i++) {
    const wx = i * 167 + 40 + rnd(960, i) * 80;
    const x = wrap(wx - cam);
    const sx = x > LEN / 2 ? x - LEN : x;
    if (sx < -30 || sx > W + 30) continue;
    if (inPuddle(wx)) continue;
    cattail(ctx, sx, trailY(wx) + 2 + rnd(961, i) * 8, .55 + rnd(962, i) * .45,
      col('reed', wx), '#8A5E2E');
  }
  /* little reed scribbles across the near marsh */
  for (let i = 0; i < 120; i++) {
    const wx = i * 31 + rnd(970, i) * 22;
    const x = wrap(wx - cam);
    const sx = x > LEN / 2 ? x - LEN : x;
    if (sx < -10 || sx > W + 10) continue;
    const by = trailY(wx) + 30 + rnd(971, i) * (H - trailY(wx) - 34);
    const rw = rnd(972, i);
    if (rw < .6) {
      stroke(ctx, [[sx, by + 4], [sx - 3 + rw * 6, by - 6 - rw * 6]],
        blend(col('reed', wx), col('near', wx), .3), 1.4);
    } else if (rw < .7) {                                /* a marsh flower */
      circle(ctx, sx, by - 7, 2.6, '#F5A9C4');
      stroke(ctx, [[sx, by + 3], [sx, by - 5]], col('reed', wx), 1.4);
    }
  }
}
function drizzleFront(ctx, cam, time) {
  /* a few faint drops falling across the whole scene */
  for (let i = 0; i < 26; i++) {
    const wx = i * 151 + rnd(980, i) * 90;
    const x = wrap(wx - cam * .9);
    const sx = x > LEN / 2 ? x - LEN : x;
    if (sx < -10 || sx > W + 10) continue;
    const span = H * .9;
    const yy = 20 + ((time * (80 + rnd(981, i) * 40) + rnd(982, i) * span) % span);
    stroke(ctx, [[sx, yy], [sx - 4, yy + 13]], 'rgba(170,205,215,.30)', 1.5);
  }
}

/* ---------- the frame: paint the world at camera `cam` ---------- */
function frame(ctx, cam, time) {
  camNow = cam;
  ctx.clearRect(0, 0, W, H);
  sky(ctx, cam);
  clouds(ctx, cam, time);
  band(ctx, cam, 0);
  farFlora(ctx, cam);
  band(ctx, cam, 1);
  band(ctx, cam, 2);
  trail(ctx, cam);
  river(ctx, cam, time);
  lilypads(ctx, cam, time);
  puddles(ctx, cam, time);
  tuftsAndStones(ctx, cam);
  reedsAndCattails(ctx, cam);
  drizzleFront(ctx, cam, time);
}

/* ---------- the house under construction (crayon, live on play canvas) ---- */
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

function resetZones() { zonePal[0] = 0; zonePal[1] = 1; zonePal[2] = 2; zonePal[3] = 1; lastAhead = 0; }

window.WORLD = {
  frame, ahead, groundAt, drawBuild, camStart, resize, resetZones,
  puddleNear, inPuddle, isWaterAt, stepAfter, riverAtTrail, trailY,
  LEN, START_WX,
  get aheadPal() { return lastAhead; },
};
})();
