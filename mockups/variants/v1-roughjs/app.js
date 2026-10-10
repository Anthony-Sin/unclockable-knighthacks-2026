/* ============================================================
   Fill the Tale · Crayon Woods edition — variant V1
   Engine: rough.js (https://github.com/rough-stuff/rough)
   The kid draws the hero on a crayon canvas, then types words
   into the story — every word becomes a real rough.js prop in a
   hand-drawn world: forest → rain → river → cave → home.
   ============================================================ */
'use strict';

if (!window.rough) {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.stage').innerHTML =
      '<p style="padding:40px;font-family:sans-serif">rough.js failed to load — check vendor/rough.js</p>';
  });
  throw new Error('rough.js missing');
}

/* ---------- element handles ---------- */
const stage      = document.getElementById('stage');
const world      = document.getElementById('world');
const worldCv    = document.getElementById('worldCv');
const propLayer  = document.getElementById('propLayer');
const rideLayer  = document.getElementById('rideLayer');
const darkCv     = document.getElementById('darkCv');
const fx         = document.getElementById('fx');
const heroEl     = document.getElementById('hero');
const hinner     = document.getElementById('hinner');
const heroCv     = document.getElementById('heroCv');
const headprop   = document.getElementById('headprop');
const heldprop   = document.getElementById('heldprop');
const dizzyEl    = document.getElementById('dizzy');
const dizzyCv    = document.getElementById('dizzyCv');
const cheerEl    = document.getElementById('cheer');
const birdEl     = document.getElementById('bird');
const birdCv     = document.getElementById('birdCv');
const chirpEl    = document.getElementById('chirp');
const lineChip   = document.getElementById('lineChip');
const sceneBtn   = document.getElementById('sceneBtn');
const stopBtn    = document.getElementById('stopBtn');
const makerOv    = document.getElementById('makerOverlay');
const makerCv    = document.getElementById('makerCv');
const swatchBox  = document.getElementById('swatches');
const doneBtn    = document.getElementById('doneBtn');
const surpriseBtn= document.getElementById('surpriseBtn');
const clearBtn   = document.getElementById('clearBtn');
const endOv      = document.getElementById('endOverlay');
const watchBtn   = document.getElementById('watchBtn');
const againBtn   = document.getElementById('againBtn');
const watchAgain = document.getElementById('watchAgainBtn');
const gemCv      = document.getElementById('gemCv');
const recapEl    = document.getElementById('recap');
const slipsEl    = document.getElementById('slips');
const preText    = document.getElementById('preText');
const postText   = document.getElementById('postText');
const blank      = document.getElementById('blank');
const blankbox   = document.querySelector('.blankbox');
const underSvg   = document.getElementById('underSvg');
const coachP     = document.querySelector('.coach');
const coach      = document.getElementById('coach');
const dymEl      = document.getElementById('dym');
const dymBtn     = document.getElementById('dymBtn');
const mirror     = document.getElementById('mirror');
const tapType    = document.getElementById('tapType');
const squiggle   = document.getElementById('titleSquiggle');

const INK = '#2B2118';

/* ---------- seeded rng ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let sceneSeed = ((Math.random() * 0x7ffffffe) | 0) + 1;
let shapeN = 0;
const sh = () => ((sceneSeed ^ (shapeN++ * 7919)) >>> 0) || 1;
const pick = (r, arr) => arr[(r() * arr.length) | 0];
const rr = (r, a, b) => a + r() * (b - a);
const O = (extra) => Object.assign({ stroke: INK, strokeWidth: 2.4, roughness: 2, seed: sh() }, extra);

/* ---------- world layout (all world-space px) ---------- */
const ZONE_W = 880;
const WORLD_W = ZONE_W * 6 + 140;              // 5420
const SPAWN_X = 300;
const CREEK = { cx: 1320, l: 1250, r: 1390 };  // beat 1: blocked path
const RAINZ = { l: 1860, r: 2640 };            // beat 2: rainy patch
const RIVER = { l: 2880, r: 3360 };            // beat 3: wide river
const CAVE  = { l: 3540, r: 4380 };            // beat 4: dark cave
const HOME  = { door: 5030, l: 4860, r: 5180 };// beat 5: cottage
const APPROACH = [1150, 1960, 2790, 3590, 4700];
const POST     = [1530, 2530, 3430, 4270, 4990];

const stageW = () => stage.clientWidth;
const stageH = () => stage.clientHeight;
const groundY = () => stageH() - 96;

/* ---------- canvas sizing ---------- */
function sizeCv(cv, w, h, dprCap) {
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap || 2);
  cv.width = Math.max(2, Math.round(w * dpr));
  cv.height = Math.max(2, Math.round(h * dpr));
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* ---------- small geometry helpers ---------- */
function starPts(cx, cy, ro, ri, n, rot) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (Math.PI * i) / n;
    const r = i % 2 ? ri : ro;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
function smoothPath(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i];
    d += ` Q ${px} ${py} ${(px + x) / 2} ${(py + y) / 2}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return d + ` L ${lx} ${ly}`;
}

/* ---------- async frame helpers ---------- */
let epoch = 0;
const ok = (ep) => ep === epoch;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const easeIO = (k) => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function tween(dur, fn, ep) {
  return new Promise((res) => {
    let t0 = null;
    function step(t) {
      if (ep !== undefined && !ok(ep)) return res();
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / dur);
      fn(k);
      if (k < 1) requestAnimationFrame(step);
      else res();
    }
    requestAnimationFrame(step);
  });
}

/* ============================================================
   THE CRAYON WORLD — six zones painted by rough.js, seeded
   ============================================================ */
function drawWorld() {
  shapeN = 0;
  const h = stageH(), gy = groundY();
  world.style.width = WORLD_W + 'px';
  sizeCv(worldCv, WORLD_W, h, 1.5);
  const rc = rough.canvas(worldCv);
  const r = mulberry32(sceneSeed);

  /* sky over the whole world */
  rc.rectangle(-10, -10, WORLD_W + 20, gy + 70, O({
    fill: '#CDE7F6', fillStyle: 'hachure', hachureAngle: -14,
    hachureGap: 13, fillWeight: .7, stroke: 'none', roughness: 1.2
  }));

  /* scribbled sun + rays over the forest */
  rc.circle(170, 76, 68, O({
    fill: '#FFC53D', fillStyle: 'hachure', hachureAngle: 60,
    hachureGap: 4.5, fillWeight: 1.5, strokeWidth: 3, roughness: 2.4
  }));
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 + rr(r, -0.1, 0.1);
    rc.line(170 + Math.cos(a) * 44, 76 + Math.sin(a) * 44,
            170 + Math.cos(a) * rr(r, 56, 68), 76 + Math.sin(a) * rr(r, 56, 68),
            O({ stroke: '#F0A428', strokeWidth: 3.2, roughness: 2.6 }));
  }

  /* distant rolling hills, full width */
  for (const [lift, col, gap] of [[-26, '#B9DFAE', 8], [-4, '#8FCE8F', 6.5]]) {
    const pts = [[-20, gy + lift]];
    for (let i = 1; i <= 16; i++)
      pts.push([(WORLD_W * i) / 16 + rr(r, -60, 60), gy + lift - rr(r, 10, 80)]);
    pts.push([WORLD_W + 20, gy + lift]);
    rc.path(smoothPath(pts) + ` L ${WORLD_W + 20} ${h + 20} L -20 ${h + 20} Z`,
      O({ fill: col, fillStyle: 'hachure', hachureAngle: -62, hachureGap: gap, fillWeight: 1, strokeWidth: 2, roughness: 1.8 }));
  }

  /* foreground grass band */
  const gpts = [[-20, gy + 12]];
  for (let i = 1; i <= 24; i++) gpts.push([(WORLD_W * i) / 24, gy + 12 + rr(r, -7, 7)]);
  gpts.push([WORLD_W + 20, gy + 12]);
  rc.path(smoothPath(gpts) + ` L ${WORLD_W + 20} ${h + 20} L -20 ${h + 20} Z`, O({
    fill: '#6FC07C', fillStyle: 'hachure', hachureAngle: -78,
    hachureGap: 6.5, fillWeight: 1.2, strokeWidth: 2.2
  }));

  /* stitched walking path (broken by creek + river) */
  const pathSegs = [[-20, CREEK.l - 6], [CREEK.r + 6, RIVER.l], [RIVER.r, WORLD_W + 20]];
  for (const [a, b] of pathSegs) {
    const pts = [];
    const n = Math.max(3, Math.round((b - a) / 160));
    for (let i = 0; i <= n; i++)
      pts.push([a + ((b - a) * i) / n, gy + 42 + Math.sin(i * 1.4 + a * .01) * 6 + rr(r, -4, 4)]);
    rc.curve(pts, O({ stroke: '#EFDCAA', strokeWidth: 22, roughness: 1.8 }));
    rc.curve(pts, O({ stroke: '#B98A4F', strokeWidth: 2.6, roughness: 2.2, strokeLineDash: [9, 12] }));
  }

  /* little ink birds in the sky */
  for (let i = 0; i < 6; i++) {
    const bx = rr(r, 200, WORLD_W - 400), by = rr(r, 40, 120), bs = rr(r, .7, 1.1);
    if (bx > CAVE.l - 60 && bx < CAVE.r + 60) continue;
    rc.arc(bx - 7 * bs, by, 16 * bs, 12 * bs, Math.PI * 1.05, Math.PI * 1.95, false, O({ strokeWidth: 1.8, roughness: 2.6 }));
    rc.arc(bx + 7 * bs, by, 16 * bs, 12 * bs, Math.PI * 1.05, Math.PI * 1.95, false, O({ strokeWidth: 1.8, roughness: 2.6 }));
  }

  zForest(rc, r, 0, 880, gy, h);
  zGap(rc, r, 880, 1760, gy, h);
  zRain(rc, r, 1760, 2640, gy, h);
  zRiver(rc, r, 2640, 3520, gy, h);
  zCave(rc, r, 3520, 4400, gy, h);
  zHome(rc, r, 4400, WORLD_W, gy, h);
}

/* --- shared veg painters --- */
function tree(rc, r, x, gy, s) {
  const ty = gy + rr(r, -4, 10);
  rc.rectangle(x - 7 * s, ty - 46 * s, 14 * s, 48 * s,
    O({ fill: '#9A6A3B', fillStyle: 'hachure', hachureGap: 4, fillWeight: 1.3, strokeWidth: 2.4 }));
  const gcols = ['#58BC7B', '#4FB06D', '#7CC97F'];
  for (let k = 0; k < 3; k++) {
    const ang = (Math.PI * 2 * k) / 3 - Math.PI / 2;
    rc.circle(x + Math.cos(ang) * 17 * s, ty - 52 * s + Math.sin(ang) * 15 * s, 30 * s * rr(r, .8, 1.05),
      O({ fill: pick(r, gcols), fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, fillWeight: 1.2, strokeWidth: 2.4 }));
  }
  rc.circle(x, ty - 66 * s, 34 * s,
    O({ fill: '#4FB06D', fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, fillWeight: 1.2, strokeWidth: 2.4 }));
}
function flower(rc, r, x, gy, col) {
  const fy = gy + rr(r, 24, 56);
  rc.line(x, fy, x, fy - 15, O({ stroke: '#3E8F57', strokeWidth: 2.2 }));
  for (let p = 0; p < 5; p++) {
    const a = (Math.PI * 2 * p) / 5 - Math.PI / 2;
    rc.circle(x + Math.cos(a) * 7, fy - 19 + Math.sin(a) * 7, 8, O({ fill: col, fillStyle: 'solid', strokeWidth: 1.4, roughness: 2.2 }));
  }
  rc.circle(x, fy - 19, 7, O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.3 }));
}
function tuft(rc, r, x, gy) {
  const fy = gy + rr(r, 20, 50);
  for (let p = -1; p <= 1; p++)
    rc.line(x, fy, x + p * 7 + rr(r, -2, 2), fy - rr(r, 10, 17), O({ stroke: '#3E8F57', strokeWidth: 2.2 }));
}
function cloud(rc, r, cx, cy, s, col) {
  const fill = col || '#FFFDF6';
  rc.ellipse(cx - 26 * s, cy + 8 * s, 44 * s, 30 * s, O({ fill, fillStyle: 'solid', strokeWidth: 2 }));
  rc.ellipse(cx, cy - 2 * s, 58 * s, 42 * s, O({ fill, fillStyle: 'solid', strokeWidth: 2.2 }));
  rc.ellipse(cx + 28 * s, cy + 8 * s, 42 * s, 28 * s, O({ fill, fillStyle: 'solid', strokeWidth: 2 }));
}
function sign(rc, x, gy, label) {
  rc.line(x, gy + 26, x, gy - 46, O({ stroke: '#8A5E2E', strokeWidth: 5 }));
  rc.rectangle(x - 44, gy - 78, 88, 36, O({ fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 5, bowing: 4, strokeWidth: 2.6 }));
  const ctx = worldCv.getContext('2d');
  ctx.save();
  ctx.font = '700 20px Fredoka, sans-serif';
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, gy - 53);
  ctx.restore();
}

/* --- zone 0: forest glade (spawn) --- */
function zForest(rc, r, x0, x1, gy) {
  for (const tx of [80, 470, 660, 800]) tree(rc, r, tx + rr(r, -24, 24), gy, rr(r, .85, 1.2));
  for (let i = 0; i < 8; i++) {
    const fx0 = rr(r, x0 + 40, x1 - 40);
    if (Math.abs(fx0 - SPAWN_X) < 90) continue;
    if (r() < .55) flower(rc, r, fx0, gy, pick(r, ['#FF6B57', '#FFC53D', '#FFFDF6', '#F58ACB']));
    else tuft(rc, r, fx0, gy);
  }
  /* butterflies: two tiny wing arcs */
  for (const bx of [rr(r, 360, 480), rr(r, 640, 780)]) {
    const by = rr(r, gy - 160, gy - 90);
    rc.arc(bx - 5, by, 10, 8, Math.PI * 1.1, Math.PI * 1.9, false, O({ stroke: '#F58ACB', strokeWidth: 2.4 }));
    rc.arc(bx + 5, by, 10, 8, Math.PI * 1.1, Math.PI * 1.9, false, O({ stroke: '#F58ACB', strokeWidth: 2.4 }));
  }
  sign(rc, 210, gy, 'CH 1');
  cloud(rc, r, rr(r, 500, 700), rr(r, 60, 90), rr(r, .8, 1.1));
}

/* --- zone 1: the creek that blocks the path --- */
function zGap(rc, r, x0, x1, gy, h) {
  for (const tx of [960, 1080, 1620, 1720]) tree(rc, r, tx + rr(r, -16, 16), gy, rr(r, .9, 1.25));
  for (const tx of [1160, 1480]) tuft(rc, r, tx, gy);
  /* creek water between the banks */
  rc.rectangle(CREEK.l, gy - 4, CREEK.r - CREEK.l, h - gy + 20, O({
    fill: '#8FD0F2', fillStyle: 'hachure', hachureAngle: 0, hachureGap: 7, fillWeight: 1.2, stroke: 'none'
  }));
  /* wobbly banks */
  for (const bx of [CREEK.l, CREEK.r]) {
    rc.curve([[bx, gy - 12], [bx + rr(r, -8, 8), gy + 30], [bx + rr(r, -6, 6), h]],
      O({ stroke: '#6B4A2A', strokeWidth: 4, roughness: 2.4 }));
  }
  /* water sparkle + pebbles */
  for (let i = 0; i < 3; i++)
    rc.line(CREEK.l + 18 + i * 40, gy + 24 + i * 8, CREEK.l + 44 + i * 40, gy + 22 + i * 8,
      O({ stroke: '#C4E7FB', strokeWidth: 3 }));
  for (let i = 0; i < 4; i++)
    rc.ellipse(rr(r, CREEK.l + 14, CREEK.r - 14), gy + rr(r, 52, 80), rr(r, 12, 22), rr(r, 7, 11),
      O({ fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 1.8 }));
  /* reeds */
  for (const bx of [CREEK.l - 12, CREEK.r + 12]) {
    rc.line(bx, gy + 8, bx - 3, gy - 22, O({ stroke: '#3E8F57', strokeWidth: 2.6 }));
    rc.line(bx + 7, gy + 8, bx + 10, gy - 18, O({ stroke: '#3E8F57', strokeWidth: 2.4 }));
    rc.ellipse(bx - 3, gy - 26, 7, 14, O({ fill: '#8A5E2E', fillStyle: 'solid', strokeWidth: 1.6 }));
  }
  sign(rc, 1140, gy, '!');
  for (let i = 0; i < 4; i++) flower(rc, r, rr(r, 1440, 1700), gy, pick(r, ['#FF6B57', '#FFFDF6']));
}

/* --- zone 2: the rainy patch --- */
function zRain(rc, r, x0, x1, gy) {
  /* grumpy cloud bank along the top of the zone */
  for (let i = 0; i < 6; i++) {
    const cx = x0 + 90 + i * 140 + rr(r, -20, 20), cy = rr(r, 34, 72), s = rr(r, .9, 1.3);
    cloud(rc, r, cx, cy, s, '#B9C4D4');
  }
  /* slanted rain hatch strokes */
  for (let x = RAINZ.l; x < x1 - 20; x += 44) {
    const top = rr(r, 96, 130);
    for (let y = top; y < gy - 60; y += rr(r, 90, 130))
      rc.line(x + rr(r, -8, 8), y, x - 10 + rr(r, -4, 4), y + rr(r, 26, 40),
        O({ stroke: '#7FB8E8', strokeWidth: 2.4, roughness: 2.6 }));
  }
  /* puddles + droopy plants */
  for (const px of [RAINZ.l + 130, RAINZ.l + 330, RAINZ.l + 560]) {
    rc.ellipse(px, gy + 52, rr(r, 76, 104), 20, O({ fill: '#8FD0F2', fillStyle: 'hachure', hachureAngle: 0, hachureGap: 5, fillWeight: 1, strokeWidth: 2 }));
    rc.line(px - 20, gy + 50, px - 2, gy + 48, O({ stroke: '#C4E7FB', strokeWidth: 2.6 }));
  }
  for (const tx of [x0 + 60, x0 + 250, x0 + 700]) {
    /* droopy flowers in the rain */
    const fy = gy + rr(r, 28, 48);
    rc.curve([[tx, fy], [tx + 2, fy - 12], [tx + 10, fy - 20]], O({ stroke: '#3E8F57', strokeWidth: 2.4 }));
    rc.ellipse(tx + 12, fy - 20, 16, 10, O({ fill: '#A9B8C8', fillStyle: 'solid', strokeWidth: 1.8 }));
  }
  /* one brave mushroom + a frog */
  rc.rectangle(x1 - 140, gy + 30, 14, 20, O({ fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
  rc.path(`M ${x1 - 163} ${gy + 32} Q ${x1 - 133} ${gy + 2} ${x1 - 103} ${gy + 32} Z`, O({ fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.2 }));
  rc.circle(x1 - 300, gy + 44, 20, O({ fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
  rc.circle(x1 - 308, gy + 30, 7, O({ fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 1.6 }));
  rc.circle(x1 - 292, gy + 30, 7, O({ fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 1.6 }));
  rc.circle(x1 - 307, gy + 31, 3, O({ fill: INK, fillStyle: 'solid', stroke: 'none' }));
  rc.circle(x1 - 291, gy + 31, 3, O({ fill: INK, fillStyle: 'solid', stroke: 'none' }));
}

/* --- zone 3: the wide river --- */
function zRiver(rc, r, x0, x1, gy, h) {
  /* the water band */
  rc.rectangle(RIVER.l, gy - 8, RIVER.r - RIVER.l, h - gy + 30, O({
    fill: '#7FC4EE', fillStyle: 'hachure', hachureAngle: -6, hachureGap: 7, fillWeight: 1.4, stroke: 'none'
  }));
  /* wavy surface + highlights */
  for (let i = 0; i < 6; i++) {
    const wx = RIVER.l + 30 + i * 74, wy = gy + 6 + (i % 2) * 14;
    rc.curve([[wx, wy], [wx + 16, wy - 5], [wx + 34, wy], [wx + 50, wy - 4]],
      O({ stroke: '#C4E7FB', strokeWidth: 3, roughness: 2.6 }));
  }
  /* banks: sandy lumps + cattails */
  for (const bx of [RIVER.l, RIVER.r]) {
    rc.curve([[bx, gy - 14], [bx + (bx === RIVER.l ? -14 : 14), gy + 34], [bx + (bx === RIVER.l ? -6 : 6), h]],
      O({ stroke: '#B98A4F', strokeWidth: 5, roughness: 2.4 }));
    for (let i = 0; i < 3; i++) {
      const tx = bx + (bx === RIVER.l ? -16 - i * 12 : 16 + i * 12);
      rc.line(tx, gy + 6, tx + rr(r, -4, 4), gy - rr(r, 20, 40), O({ stroke: '#3E8F57', strokeWidth: 2.6 }));
      rc.ellipse(tx + rr(r, -4, 4), gy - rr(r, 24, 44), 7, 15, O({ fill: '#8A5E2E', fillStyle: 'solid', strokeWidth: 1.6 }));
    }
  }
  /* lily pads + jumping fish */
  for (const lx of [RIVER.l + 90, RIVER.l + 250, RIVER.r - 110]) {
    rc.ellipse(lx, gy + 30, 34, 12, O({ fill: '#4FB06D', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.line(lx, gy + 28, lx + 12, gy + 24, O({ stroke: '#3E8F57', strokeWidth: 2 }));
  }
  const fxp = rr(r, RIVER.l + 140, RIVER.r - 140);
  rc.arc(fxp, gy + 2, 40, 34, Math.PI * 1.15, Math.PI * 1.85, false, O({ stroke: '#FF9E57', strokeWidth: 2.6 }));
  rc.path(`M ${fxp - 4} ${gy - 24} Q ${fxp + 16} ${gy - 44} ${fxp + 8} ${gy - 58} Q ${fxp - 12} ${gy - 42} ${fxp - 4} ${gy - 24} Z`,
    O({ fill: '#FF9E57', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
  /* riverside trees on both edges */
  for (const tx of [x0 + 60, x0 + 190, x1 - 150, x1 - 60]) tree(rc, r, tx + rr(r, -10, 10), gy, rr(r, .8, 1.1));
}

/* --- zone 4: the dark cave --- */
function zCave(rc, r, x0, x1, gy, h) {
  /* rocky floor */
  rc.rectangle(x0 - 10, gy + 8, x1 - x0 + 20, h - gy, O({
    fill: '#7D7488', fillStyle: 'hachure', hachureAngle: -64, hachureGap: 7, fillWeight: 1.1, strokeWidth: 2
  }));
  /* cave ceiling: jagged rock band with stalactites */
  const ceil = [[x0 - 30, -20], [x0 - 30, gy - 210]];
  let cx = x0 - 30;
  while (cx < x1 + 30) {
    cx += rr(r, 90, 150);
    ceil.push([Math.min(cx, x1 + 30), gy - rr(r, 170, 235)]);
  }
  ceil.push([x1 + 30, -20]);
  rc.polygon(ceil, O({ fill: '#6E6478', fillStyle: 'hachure', hachureAngle: -58, hachureGap: 6, fillWeight: 1.3, strokeWidth: 2.8, roughness: 2.2 }));
  /* stalactites */
  for (const tx of [x0 + 140, x0 + 340, x0 + 560, x0 + 720]) {
    const len = rr(r, 28, 58), top = gy - rr(r, 170, 200);
    rc.polygon([[tx - 16, top], [tx + 18, top - 4], [tx + 3, top + len]],
      O({ fill: '#6E6478', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.2 }));
  }
  /* glowing crystals (they show through the lantern light) */
  for (const [px, ps] of [[x0 + 200, 1], [x0 + 470, .8], [x0 + 650, 1.15]]) {
    const by = gy + rr(r, 30, 60);
    rc.polygon([[px - 14 * ps, by], [px - 8 * ps, by - 34 * ps], [px + 4 * ps, by - 44 * ps], [px + 14 * ps, by - 18 * ps], [px + 12 * ps, by]],
      O({ fill: '#B565D8', fillStyle: 'hachure', hachureGap: 4, hachureAngle: -40, strokeWidth: 2.2 }));
    rc.polygon([[px + 12 * ps, by], [px + 18 * ps, by - 22 * ps], [px + 26 * ps, by - 14 * ps], [px + 24 * ps, by]],
      O({ fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
  }
  /* spiral cave painting */
  const sx = x0 + 300, sy = gy - 120;
  rc.arc(sx, sy, 46, 46, 0.3, Math.PI * 1.8, false, O({ stroke: '#E8A020', strokeWidth: 2.6 }));
  rc.arc(sx, sy, 26, 26, 0.3, Math.PI * 1.8, false, O({ stroke: '#E8A020', strokeWidth: 2.4 }));
  /* entrance arch lip */
  rc.arc(x0 + 30, gy + 10, 150, gy - 60, Math.PI * 1.02, Math.PI * 1.98, false, O({ strokeWidth: 5, roughness: 2.6 }));
  /* bats near the roof */
  for (const bx of [x0 + 240, x0 + 600]) {
    const by = gy - rr(r, 150, 190);
    rc.arc(bx - 8, by, 14, 10, Math.PI * 1.15, Math.PI * 1.95, false, O({ stroke: '#3A3140', strokeWidth: 2.6 }));
    rc.arc(bx + 8, by, 14, 10, Math.PI * 1.05, Math.PI * 1.85, false, O({ stroke: '#3A3140', strokeWidth: 2.6 }));
  }
}

/* --- zone 5: home cottage --- */
function zHome(rc, r, x0, x1, gy, h) {
  /* low warm sun + soft clouds */
  rc.circle(x0 + 620, 130, 54, O({ fill: '#FFB45E', fillStyle: 'hachure', hachureAngle: 40, hachureGap: 5, fillWeight: 1.4, strokeWidth: 2.8 }));
  cloud(rc, r, x0 + 220, rr(r, 56, 84), rr(r, .8, 1));
  /* cottage */
  const cl = HOME.l, cr = HOME.r, cy = gy + 10;
  rc.rectangle(cl, cy - 170, cr - cl, 170, O({ fill: '#FFDE9E', fillStyle: 'hachure', hachureAngle: -30, hachureGap: 7, fillWeight: 1.3, strokeWidth: 3 }));
  rc.polygon([[cl - 34, cy - 168], [(cl + cr) / 2, cy - 262], [cr + 34, cy - 168]],
    O({ fill: '#E86A4E', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.4, strokeWidth: 3 }));
  /* chimney + smoke curls */
  rc.rectangle(cr - 78, cy - 242, 34, 70, O({ fill: '#C98F5F', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.6 }));
  for (const [sx0, sy0, ss] of [[cr - 60, cy - 258, 1], [cr - 52, cy - 288, .8]]) {
    rc.curve([[sx0, sy0], [sx0 - 14 * ss, sy0 - 16 * ss], [sx0 + 6 * ss, sy0 - 30 * ss]],
      O({ stroke: '#C9BEC8', strokeWidth: 4, roughness: 2.6 }));
  }
  /* round windows + flower boxes */
  for (const wx of [cl + 62, cr - 62]) {
    rc.circle(wx, cy - 104, 44, O({ fill: '#FFF6C9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    rc.line(wx - 22, cy - 104, wx + 22, cy - 104, O({ strokeWidth: 2 }));
    rc.line(wx, cy - 126, wx, cy - 82, O({ strokeWidth: 2 }));
    rc.rectangle(wx - 30, cy - 78, 60, 16, O({ fill: '#9A6A3B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    for (let i = 0; i < 3; i++)
      rc.circle(wx - 20 + i * 20, cy - 82, 9, O({ fill: pick(r, ['#FF6B57', '#F58ACB', '#FFC53D']), fillStyle: 'solid', strokeWidth: 1.4 }));
  }
  /* door frame + closed door (the beat-5 prop can replace it) */
  const dx = HOME.door;
  rc.rectangle(dx - 42, cy - 118, 84, 118, O({ fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 6, strokeWidth: 2.6 }));
  rc.rectangle(dx - 32, cy - 108, 64, 108, O({ fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.4, strokeWidth: 2.6 }));
  rc.circle(dx + 20, cy - 52, 7, O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
  /* door step + fence + flowers + HOME sign */
  rc.rectangle(dx - 46, cy - 4, 92, 14, O({ fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
  for (let i = 0; i < 5; i++) {
    const fx0 = cl - 130 + i * 36;
    rc.rectangle(fx0, gy + 14, 10, 34, O({ fill: '#C9A06B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 1.8 }));
  }
  rc.line(cl - 132, gy + 26, cl + 22, gy + 26, O({ stroke: '#C9A06B', strokeWidth: 3.4 }));
  sign(rc, x0 + 330, gy, 'HOME');
  for (let i = 0; i < 6; i++)
    flower(rc, r, rr(r, x0 + 40, x1 - 60), gy, pick(r, ['#FF6B57', '#FFC53D', '#F58ACB']));
}

/* ---------- darkness overlay for the cave zone ---------- */
const caveRect = () => ({ x: CAVE.l - 30, w: CAVE.r - CAVE.l + 60 });
let lightR = 0;                                  // 0 = pitch dark
function sizeDark() {
  const cr = caveRect();
  darkCv.style.left = cr.x + 'px';
  sizeCv(darkCv, cr.w, stageH(), 1.5);
  drawDark();
}
function drawDark() {
  const ctx = darkCv.getContext('2d');
  const w = darkCv.width, h = darkCv.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();
  ctx.fillStyle = 'rgba(19,14,40,0.93)';
  ctx.fillRect(0, 0, caveRect().w, stageH());
  if (lightR > 4) {
    const hx = hero.wx - caveRect().x;
    const hy = groundY() - 80;
    const g = ctx.createRadialGradient(hx, hy, lightR * .25, hx, hy, lightR);
    g.addColorStop(0, 'rgba(0,0,0,0.98)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(hx, hy, lightR, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* ============================================================
   HERO — positioned in world coords; the drawing is the kid's
   ============================================================ */
const hero = { wx: SPAWN_X, lift: 0 };
function placeHero() {
  heroEl.style.left = (hero.wx - 75) + 'px';
  heroEl.style.top = (groundY() + 4 - 150 - hero.lift) + 'px';
  if (lightR > 0) drawDark();
}
function heroResetPose() {
  hinner.className = 'hinner';
  dizzyEl.classList.remove('on');
  heroEl.style.opacity = '';
}
let approachP = null;
async function walkTo(wx2, ep, speed) {
  speed = speed || 0.26;
  if (demoOn) speed *= 1.45;
  const x0 = hero.wx, dur = Math.max(200, Math.abs(wx2 - x0) / speed);
  hinner.classList.add('walking');
  await tween(dur, (k) => { hero.wx = x0 + (wx2 - x0) * easeIO(k); placeHero(); }, ep);
  hinner.classList.remove('walking');
}
async function hopTo(wx2, peak, liftTo, ep) {
  const x0 = hero.wx, l0 = hero.lift;
  const dur = Math.max(340, Math.abs(wx2 - x0) / 0.34);
  await tween(dur, (k) => {
    hero.wx = x0 + (wx2 - x0) * easeIO(k);
    hero.lift = l0 + ((liftTo || 0) - l0) * easeIO(k) + Math.sin(Math.PI * k) * peak;
    placeHero();
  }, ep);
  if (ok(ep)) hero.lift = liftTo || 0;
  placeHero();
}
async function liftTo(l2, dur, ep) {
  const l0 = hero.lift;
  await tween(dur, (k) => { hero.lift = l0 + (l2 - l0) * easeIO(k); placeHero(); }, ep);
}
function startApproach(i, ep) {
  approachP = walkTo(APPROACH[i], ep).then(() => { approachP = null; });
}

/* ============================================================
   SCOUT — the sketchy little bird who follows the hero
   ============================================================ */
const bird = { x: 200, y: 120, t: 0, mode: 'follow' };
function drawBird() {
  const ctx = sizeCv(birdCv, 80, 66);
  const rc = rough.canvas(birdCv);
  const s = sh;
  rc.ellipse(38, 38, 46, 32, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, hachureAngle: -40, fillWeight: 1.4, strokeWidth: 2.6, seed: s() }));
  rc.ellipse(38, 46, 22, 12, O({ fill: '#FFF1D6', fillStyle: 'solid', strokeWidth: 1.6, seed: s() }));
  /* wing mid-flap */
  rc.path('M 30 34 Q 18 14 4 18 Q 18 26 28 40 Z', O({ fill: '#FF9E57', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2, seed: s() }));
  /* tail */
  rc.linearPath([[14, 40], [2, 34], [4, 44]], O({ stroke: '#E8A020', strokeWidth: 3, seed: s() }));
  /* beak + eye + cheek */
  rc.polygon([[58, 34], [70, 38], [58, 42]], O({ fill: '#FF6B57', fillStyle: 'solid', strokeWidth: 1.8, seed: s() }));
  rc.circle(48, 32, 7, O({ fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 1.8, seed: s() }));
  rc.circle(49, 33, 3, O({ fill: INK, fillStyle: 'solid', stroke: 'none', seed: s() }));
  rc.circle(52, 44, 6, O({ fill: '#FF9E7A', fillStyle: 'solid', stroke: 'none', seed: s() }));
}
let chirpT = null;
function chirp(text, ms) {
  chirpEl.textContent = text;
  chirpEl.classList.add('on');
  clearTimeout(chirpT);
  chirpT = setTimeout(() => chirpEl.classList.remove('on'), ms || 1800);
}
function birdTarget() {
  if (bird.mode === 'roof') return { x: HOME.door + 40, y: groundY() - 258 };
  if (bird.mode === 'wait') return { x: CAVE.l - 50, y: groundY() - 190 };
  const inCave = hero.wx > CAVE.l - 60 && hero.wx < CAVE.r + 40;
  return {
    x: inCave ? CAVE.l - 60 : hero.wx - 88,
    y: groundY() - 168 - hero.lift * 0.6
  };
}

/* ---------- master rAF loop: camera, bird, rain ---------- */
let camX = 0, raining = false, rainT = 0;
function loop(t) {
  /* camera follows the hero */
  const target = Math.max(0, Math.min(hero.wx - stageW() * 0.38, WORLD_W - stageW()));
  camX += (target - camX) * 0.12;
  world.style.transform = `translateX(${-camX}px)`;
  /* bird flutter-follow */
  bird.t = t;
  const bt = birdTarget();
  const flap = Math.sin(t / 190) * 7;
  bird.x += (bt.x - bird.x) * 0.055;
  bird.y += (bt.y + flap - bird.y) * 0.09;
  birdEl.style.left = (bird.x - 40) + 'px';
  birdEl.style.top = (bird.y - 33) + 'px';
  birdCv.classList.toggle('flipx', bt.x < bird.x - 4);
  /* rain drops over the rainy patch */
  if (raining && t - rainT > 95) {
    rainT = t;
    const x = camX + 40 + Math.random() * (stageW() - 80);
    if (x > RAINZ.l && x < RAINZ.r + 200) {
      const d = document.createElement('i');
      d.className = 'rain';
      d.style.left = x + 'px';
      d.style.top = (60 + Math.random() * (groundY() - 190)) + 'px';
      fx.appendChild(d);
      setTimeout(() => d.remove(), 700);
    }
  }
  requestAnimationFrame(loop);
}

/* ---------- fx poofs ---------- */
function poof(wx, wy, n, cls, color) {
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    if (cls) b.className = cls;
    if (color) b.style.borderColor = color;
    const sz = 8 + Math.random() * 14;
    b.style.width = b.style.height = sz + 'px';
    b.style.left = wx + (Math.random() - 0.5) * 90 + 'px';
    b.style.top = wy + (Math.random() - 0.5) * 30 + 'px';
    fx.appendChild(b);
    setTimeout(() => b.remove(), 1100);
  }
}
function sparkle(wx, wy, n) { poof(wx, wy, n, 'star'); }

/* ============================================================
   PROP LIBRARY — every word gets its own crayon drawing
   ============================================================ */
const PROPDEF = {
  /* --- beat-1 crossings --- */
  bridge: { w: 300, h: 130, draw(rc, w, h) {
    const cx = w / 2, y = h - 4;
    rc.path(`M ${cx - 140} ${y} Q ${cx} ${y - 92} ${cx + 140} ${y}`,
      O({ stroke: '#9A6A3B', strokeWidth: 26, roughness: 2.4, bowing: 5 }));
    rc.path(`M ${cx - 140} ${y - 34} Q ${cx} ${y - 122} ${cx + 140} ${y - 34}`, O({ strokeWidth: 3 }));
    for (let i = -3; i <= 3; i++) {
      const t = i / 3.4, px = cx + t * 132;
      const py = y - 46 * (1 - t * t) ;
      rc.line(px, py + 4, px, py - 34 - 40 * (1 - t * t) + 26, O({ strokeWidth: 3 }));
    }
    rc.path(`M ${cx - 140} ${y} Q ${cx} ${y - 92} ${cx + 140} ${y}`,
      O({ stroke: '#6B4A2A', strokeWidth: 3, roughness: 2.6 }));
  }},
  log: { w: 210, h: 80, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 90, y - 40, 176, 34, O({ fill: '#B07A43', fillStyle: 'hachure', hachureGap: 5, fillWeight: 1.4, bowing: 4, strokeWidth: 2.8 }));
    rc.circle(cx + 86, y - 23, 30, O({ fill: '#D9A96B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.circle(cx + 86, y - 23, 14, O({ strokeWidth: 1.8 }));
    rc.line(cx - 80, y - 30, cx + 66, y - 33, O({ stroke: '#7A5027', strokeWidth: 1.8 }));
    rc.line(cx - 82, y - 14, cx + 66, y - 17, O({ stroke: '#7A5027', strokeWidth: 1.8 }));
  }},
  plank: { w: 240, h: 64, draw(rc, w, h) {
    const cx = w / 2, y = h - 4;
    rc.rectangle(cx - 112, y - 22, 224, 18, O({ fill: '#C9A06B', fillStyle: 'hachure', hachureGap: 5, bowing: 6, strokeWidth: 2.6 }));
    rc.line(cx - 100, y - 13, cx + 96, y - 15, O({ stroke: '#8A5E2E', strokeWidth: 1.8 }));
    rc.circle(cx - 92, y - 13, 4, O({ fill: '#6B4A2A', fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 92, y - 14, 4, O({ fill: '#6B4A2A', fillStyle: 'solid', stroke: 'none' }));
  }},
  vine: { w: 170, h: 190, draw(rc, w, h) {
    const cx = w / 2;
    rc.curve([[cx - 10, 0], [cx + 20, h * .4], [cx - 16, h * .72], [cx + 6, h - 8]],
      O({ stroke: '#3E8F57', strokeWidth: 6, roughness: 2.6 }));
    for (const [ly, side] of [[h * .3, 1], [h * .5, -1], [h * .66, 1]])
      rc.ellipse(cx + side * 16, ly, 22, 10, O({ fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
    rc.ellipse(cx - 4, h - 12, 26, 12, O({ fill: '#4FB06D', fillStyle: 'solid', strokeWidth: 2 }));
  }},
  boat: { w: 240, h: 110, draw(rc, w, h) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 108} ${y - 46} L ${cx + 108} ${y - 46} L ${cx + 76} ${y} L ${cx - 76} ${y} Z`,
      O({ fill: '#B07A43', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -35, fillWeight: 1.4, strokeWidth: 3 }));
    rc.line(cx - 100, y - 46, cx + 100, y - 46, O({ stroke: '#6B4A2A', strokeWidth: 3 }));
    rc.line(cx - 40, y - 46, cx - 40, y - 10, O({ stroke: '#6B4A2A', strokeWidth: 2.4 }));
    rc.line(cx + 30, y - 46, cx + 30, y - 10, O({ stroke: '#6B4A2A', strokeWidth: 2.4 }));
    rc.line(cx + 70, y - 70, cx + 96, y - 18, O({ stroke: '#8A5E2E', strokeWidth: 5 }));
    rc.ellipse(cx + 98, y - 12, 14, 22, O({ fill: '#8A5E2E', fillStyle: 'solid', strokeWidth: 2 }));
  }},
  raft: { w: 230, h: 76, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    for (let i = 0; i < 4; i++)
      rc.rectangle(cx - 104, y - 16 - i * 14, 208 - (i % 2) * 14, 12, O({ fill: '#B07A43', fillStyle: 'hachure', hachureGap: 5, bowing: 5, strokeWidth: 2.2 }));
    rc.line(cx - 70, y - 4, cx - 70, y - 62, O({ stroke: '#6B4A2A', strokeWidth: 4 }));
    rc.line(cx + 70, y - 4, cx + 70, y - 62, O({ stroke: '#6B4A2A', strokeWidth: 4 }));
  }},

  /* --- beat-2 headgear --- */
  umbrella: { w: 190, h: 140, draw(rc, w, h) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 82} ${y - 78} A 84 84 0 0 1 ${cx + 82} ${y - 78} Q ${cx + 41} ${y - 68} ${cx} ${y - 78} Q ${cx - 41} ${y - 68} ${cx - 82} ${y - 78} Z`,
      O({ fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 3 }));
    rc.line(cx, y - 78, cx, y - 10, O({ strokeWidth: 3.4 }));
    rc.arc(cx - 9, y - 10, 18, 15, Math.PI * 0.05, Math.PI, false, O({ strokeWidth: 3 }));
    rc.polygon([[cx - 5, y - 132], [cx + 9, y - 138], [cx + 3, y - 122]], O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2 }));
  }},
  hat: { w: 150, h: 90, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 34} ${y - 8} L ${cx - 30} ${y - 52} Q ${cx} ${y - 66} ${cx + 30} ${y - 52} L ${cx + 34} ${y - 8} Z`,
      O({ fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.ellipse(cx, y - 8, 118, 20, O({ fill: '#3F86C9', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.6 }));
    rc.line(cx - 30, y - 26, cx + 30, y - 26, O({ stroke: '#FFC53D', strokeWidth: 5 }));
  }},
  leaf: { w: 160, h: 110, draw(rc, w, h) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 64} ${y - 20} Q ${cx - 30} ${y - 84} ${cx + 56} ${y - 74} Q ${cx + 70} ${y - 20} ${cx - 64} ${y - 20} Z`,
      O({ fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -45, strokeWidth: 2.8 }));
    rc.curve([[cx - 60, y - 22], [cx, y - 48], [cx + 52, y - 68]], O({ stroke: '#2E7A46', strokeWidth: 3 }));
    rc.line(cx - 62, y - 20, cx - 78, y + 2, O({ stroke: '#2E7A46', strokeWidth: 4 }));
    for (const [lx, ly] of [[-18, -40], [6, -50], [28, -58]])
      rc.line(cx + lx, y + ly + 8, cx + lx + 10, y + ly - 6, O({ stroke: '#2E7A46', strokeWidth: 1.8 }));
  }},
  newspaper: { w: 180, h: 84, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.polygon([[cx - 82, y - 10], [cx - 10, y - 62], [cx + 70, y - 44], [cx + 82, y - 10]],
      O({ fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 8, fillWeight: .8, strokeWidth: 2.6 }));
    rc.line(cx - 10, y - 62, cx + 8, y - 14, O({ strokeWidth: 2 }));
    for (let i = 0; i < 3; i++)
      rc.line(cx - 60 + i * 8, y - 24 - i * 6, cx - 22 + i * 6, y - 38 - i * 4, O({ stroke: '#8B93A8', strokeWidth: 1.6 }));
  }},

  /* --- beat-3 rides --- */
  duck: { w: 250, h: 160, draw(rc, w, h) {
    const cx = w / 2, y = h - 8;
    rc.ellipse(cx - 10, y - 44, 150, 74, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -35, fillWeight: 1.4, strokeWidth: 3 }));
    rc.circle(cx + 62, y - 98, 48, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 3 }));
    rc.polygon([[cx + 82, y - 102], [cx + 112, y - 94], [cx + 82, y - 86]], O({ fill: '#FF6B57', fillStyle: 'solid', strokeWidth: 2.2 }));
    rc.circle(cx + 68, y - 104, 6, O({ fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.path(`M ${cx - 80} ${y - 60} Q ${cx - 104} ${y - 66} ${cx - 96} ${y - 42}`, O({ stroke: '#E8A020', strokeWidth: 5 }));
    rc.circle(cx + 52, y - 92, 9, O({ fill: '#FF9E7A', fillStyle: 'solid', stroke: 'none' }));
  }},
  fish: { w: 240, h: 120, draw(rc, w, h) {
    const cx = w / 2, y = h - 8;
    rc.ellipse(cx - 6, y - 52, 150, 74, O({ fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, fillWeight: 1.4, strokeWidth: 3 }));
    rc.polygon([[cx + 66, y - 52], [cx + 108, y - 84], [cx + 104, y - 52], [cx + 108, y - 20]],
      O({ fill: '#3F86C9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.polygon([[cx - 22, y - 84], [cx + 2, y - 104], [cx + 16, y - 84]], O({ fill: '#3F86C9', fillStyle: 'solid', strokeWidth: 2.2 }));
    rc.circle(cx - 48, y - 60, 8, O({ fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx - 47, y - 59, 3.4, O({ fill: INK, fillStyle: 'solid', stroke: 'none' }));
    for (let i = 0; i < 3; i++)
      rc.arc(cx - 8 + i * 24, y - 52, 22, 60, -Math.PI / 2, Math.PI / 2, false, O({ stroke: '#3F86C9', strokeWidth: 2.2 }));
  }},
  unicorn: { w: 310, h: 200, draw(rc, w, h) {
    const cx = w / 2 - 20, y = h - 8;
    /* legs */
    for (const lx of [-56, -24, 26, 58])
      rc.line(cx + lx, y - 56, cx + lx + 4, y - 2, O({ stroke: '#EDEAF4', strokeWidth: 9 }));
    for (const lx of [-56, -24, 26, 58])
      rc.line(cx + lx + 1, y - 10, cx + lx + 6, y - 2, O({ stroke: '#B565D8', strokeWidth: 9.4 }));
    /* tail */
    rc.curve([[cx - 84, y - 92], [cx - 116, y - 60], [cx - 104, y - 18]], O({ stroke: '#F58ACB', strokeWidth: 7, roughness: 2.6 }));
    rc.curve([[cx - 82, y - 86], [cx - 106, y - 56], [cx - 96, y - 20]], O({ stroke: '#B565D8', strokeWidth: 4, roughness: 2.6 }));
    /* body */
    rc.ellipse(cx, y - 78, 172, 80, O({ fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, fillWeight: 1.2, strokeWidth: 3.2 }));
    /* neck + head */
    rc.curve([[cx + 52, y - 96], [cx + 76, y - 130], [cx + 84, y - 148]], O({ stroke: '#EDEAF4', strokeWidth: 26, roughness: 1.8 }));
    rc.circle(cx + 92, y - 152, 44, O({ fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 3 }));
    rc.ellipse(cx + 112, y - 140, 26, 18, O({ fill: '#FBD9E8', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx + 86, y - 158, 6.5, O({ fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 88, y - 160, 2.4, O({ fill: '#FFFDF6', fillStyle: 'solid', stroke: 'none' }));
    /* golden horn */
    rc.polygon([[cx + 84, y - 172], [cx + 102, y - 214], [cx + 108, y - 168]], O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 3.5, strokeWidth: 2.4 }));
    rc.line(cx + 90, y - 190, cx + 100, y - 188, O({ stroke: '#E8A020', strokeWidth: 2 }));
    /* mane: candy scribbles down the neck */
    const maneCols = ['#F58ACB', '#B565D8', '#FF6B57'];
    for (let i = 0; i < 3; i++)
      rc.curve([[cx + 62 - i * 6, y - 138 + i * 4], [cx + 40 - i * 10, y - 118], [cx + 30 - i * 8, y - 92]],
        O({ stroke: maneCols[i], strokeWidth: 5.5, roughness: 2.6 }));
    rc.curve([[cx + 84, y - 176], [cx + 70, y - 186], [cx + 60, y - 176]], O({ stroke: '#F58ACB', strokeWidth: 5 }));
    /* sparkle stars around it */
    rc.polygon(starPts(cx - 96, y - 140, 11, 5, 5, -Math.PI / 2), O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.polygon(starPts(cx + 130, y - 190, 9, 4, 5, -Math.PI / 2), O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.polygon(starPts(cx - 40, y - 160, 8, 3.5, 5, -Math.PI / 2), O({ fill: '#F58ACB', fillStyle: 'solid', strokeWidth: 1.6 }));
  }},

  /* --- beat-4 lights --- */
  lantern: { w: 130, h: 150, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.arc(cx, y - 138, 30, 22, Math.PI, Math.PI * 2, false, O({ strokeWidth: 3 }));
    rc.rectangle(cx - 30, y - 122, 60, 18, O({ fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.rectangle(cx - 24, y - 104, 48, 74, O({ fill: '#FFE9A0', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.2, strokeWidth: 2.8 }));
    rc.rectangle(cx - 30, y - 30, 60, 24, O({ fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.circle(cx, y - 66, 14, O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
    for (const a of [-0.7, 0, 0.7])
      rc.line(cx + Math.sin(a) * 40, y - 60 + Math.cos(a) * 6 - 8, cx + Math.sin(a) * 56, y - 60 + Math.cos(a) * 6 - 12,
        O({ stroke: '#F0C94B', strokeWidth: 2.4 }));
  }},
  torch: { w: 110, h: 150, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.line(cx, y - 8, cx + 4, y - 92, O({ stroke: '#8A5E2E', strokeWidth: 9 }));
    rc.line(cx - 8, y - 92, cx + 14, y - 92, O({ stroke: '#6B4A2A', strokeWidth: 5 }));
    rc.path(`M ${cx - 18} ${y - 92} Q ${cx - 24} ${y - 128} ${cx + 2} ${y - 142} Q ${cx + 26} ${y - 124} ${cx + 18} ${y - 92} Z`,
      O({ fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 4, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.path(`M ${cx - 9} ${y - 94} Q ${cx - 11} ${y - 118} ${cx + 3} ${y - 128} Q ${cx + 14} ${y - 114} ${cx + 10} ${y - 94} Z`,
      O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2 }));
  }},
  candle: { w: 100, h: 140, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 18, y - 74, 36, 74, O({ fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.6 }));
    rc.curve([[cx - 18, y - 60], [cx - 24, y - 46], [cx - 18, y - 38]], O({ strokeWidth: 2.4 }));
    rc.ellipse(cx, y - 4, 60, 14, O({ fill: '#D9CBB2', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    rc.line(cx, y - 74, cx, y - 86, O({ strokeWidth: 2.4 }));
    rc.path(`M ${cx - 10} ${y - 88} Q ${cx - 8} ${y - 112} ${cx + 2} ${y - 118} Q ${cx + 12} ${y - 106} ${cx + 10} ${y - 88} Z`,
      O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 3.5, strokeWidth: 2.2 }));
  }},
  firefly: { w: 150, h: 140, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 34, y - 96, 68, 92, O({ fill: '#DFF2FB', fillStyle: 'hachure', hachureGap: 9, fillWeight: .8, strokeWidth: 2.6 }));
    rc.rectangle(cx - 40, y - 108, 80, 16, O({ fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    const r2 = mulberry32(sh());
    for (let i = 0; i < 5; i++)
      rc.circle(cx + rr(r2, -22, 22), y - 20 - rr(r2, 0, 66), rr(r2, 5, 8), O({ fill: '#E8F75E', fillStyle: 'solid', strokeWidth: 1.4 }));
    /* escapees with dotted trails */
    for (const [ex, ey] of [[cx - 52, y - 96], [cx + 54, y - 76]]) {
      rc.circle(ex, ey, 7, O({ fill: '#E8F75E', fillStyle: 'solid', strokeWidth: 1.6 }));
      rc.line(ex - 3, ey - 4, ex + 3, ey + 4, O({ strokeWidth: 1.4 }));
      for (let d = 1; d < 4; d++) rc.circle(ex + d * 8, ey + d * 6, 2.6, O({ fill: '#E8F75E', fillStyle: 'solid', stroke: 'none' }));
    }
  }},
  matchstick: { w: 100, h: 130, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.line(cx - 14, y - 6, cx + 10, y - 84, O({ stroke: '#D9A96B', strokeWidth: 6 }));
    rc.ellipse(cx + 12, y - 92, 16, 22, O({ fill: '#4A3B52', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    for (let i = 0; i < 3; i++)
      rc.curve([[cx + 10 + i * 4, y - 106], [cx + 4 + i * 4, y - 118], [cx + 12 + i * 4, y - 126]],
        O({ stroke: '#8B93A8', strokeWidth: 2, roughness: 3 }));
  }},

  /* --- beat-5 home --- */
  key: { w: 170, h: 90, draw(rc, w, h) {
    const cx = w / 2 - 10, y = h - 14;
    rc.circle(cx - 52, y - 44, 40, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, hachureAngle: -40, strokeWidth: 2.8 }));
    rc.circle(cx - 52, y - 44, 16, O({ strokeWidth: 2.2 }));
    rc.line(cx - 32, y - 44, cx + 78, y - 44, O({ stroke: '#E8A020', strokeWidth: 8 }));
    rc.line(cx + 48, y - 44, cx + 48, y - 24, O({ stroke: '#E8A020', strokeWidth: 8 }));
    rc.line(cx + 68, y - 44, cx + 68, y - 18, O({ stroke: '#E8A020', strokeWidth: 8 }));
  }},
  cookiejar: { w: 160, h: 160, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 52, y - 116, 104, 116, O({ fill: '#DFF2FB', fillStyle: 'hachure', hachureGap: 8, fillWeight: .8, strokeWidth: 2.8 }));
    rc.rectangle(cx - 58, y - 132, 116, 20, O({ fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.circle(cx, y - 138, 12, O({ fill: '#E5484D', fillStyle: 'solid', strokeWidth: 2 }));
    for (const [ox, oy] of [[-24, -40], [10, -60], [-4, -88], [26, -30]]) {
      rc.circle(cx + ox, y + oy, 22, O({ fill: '#D9A96B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
      rc.circle(cx + ox - 4, y + oy - 3, 3, O({ fill: '#5A3A22', fillStyle: 'solid', stroke: 'none' }));
      rc.circle(cx + ox + 5, y + oy + 4, 2.6, O({ fill: '#5A3A22', fillStyle: 'solid', stroke: 'none' }));
    }
    rc.line(cx - 40, y - 12, cx + 40, y - 12, O({ strokeWidth: 1.6 }));
  }},
  dooropen: { w: 150, h: 190, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    /* warm glow where the door used to be */
    rc.rectangle(cx - 34, y - 116, 68, 116, O({ fill: '#FFE9A0', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, fillWeight: 1.6, strokeWidth: 2.2 }));
    /* door swung open */
    rc.polygon([[cx - 34, y - 116], [cx - 62, y - 100], [cx - 62, y - 6], [cx - 34, y]],
      O({ fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.4, strokeWidth: 2.6 }));
    rc.circle(cx - 44, y - 58, 5, O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    /* light spilling out onto the step */
    rc.polygon([[cx - 30, y - 30], [cx + 30, y - 30], [cx + 52, y + 4], [cx - 52, y + 4]],
      O({ fill: '#FFF1C4', fillStyle: 'solid', stroke: 'none' }));
    rc.rectangle(cx - 46, y - 2, 92, 12, O({ fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
  }},

  /* --- silly props --- */
  peel: { w: 130, h: 80, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 10, 24, 15, O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2.4 }));
    rc.path(`M ${cx - 3} ${y - 14} Q ${cx - 36} ${y - 20} ${cx - 40} ${y - 4} Q ${cx - 22} ${y - 8} ${cx - 3} ${y - 14} Z`, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.path(`M ${cx + 3} ${y - 14} Q ${cx + 36} ${y - 24} ${cx + 40} ${y - 8} Q ${cx + 22} ${y - 8} ${cx + 3} ${y - 14} Z`, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.path(`M ${cx} ${y - 16} Q ${cx - 5} ${y - 48} ${cx + 6} ${y - 52} Q ${cx + 7} ${y - 26} ${cx} ${y - 16} Z`, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
  }},
  slime: { w: 230, h: 76, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 10, 196, 34, O({ fill: '#7ED957', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.circle(cx - 56, y - 22, 10, O({ fill: '#7ED957', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.circle(cx + 48, y - 26, 8, O({ fill: '#7ED957', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.arc(cx - 14, y - 20, 42, 16, Math.PI * 1.15, Math.PI * 1.85, false, O({ stroke: '#B7E6C3', strokeWidth: 3 }));
    rc.circle(cx + 76, y - 40, 5, O({ fill: '#7ED957', fillStyle: 'solid', strokeWidth: 1.4 }));
  }},
  toaster: { w: 150, h: 140, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 56, y - 92, 112, 92, O({ fill: '#B9C9D8', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    for (const sx of [-22, 16])
      rc.rectangle(cx + sx, y - 100, 40, 10, O({ fill: '#4A3B52', fillStyle: 'solid', strokeWidth: 2 }));
    rc.rectangle(cx - 4, y - 122, 34, 26, O({ fill: '#F5E2B8', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    rc.line(cx + 62, y - 76, cx + 74, y - 76, O({ strokeWidth: 3 }));
    rc.circle(cx + 76, y - 76, 7, O({ fill: '#4A3B52', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.line(cx - 40, y - 6, cx - 40, y, O({ strokeWidth: 4 }));
    rc.line(cx + 40, y - 6, cx + 40, y, O({ strokeWidth: 4 }));
  }},
  fridge: { w: 170, h: 220, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 66, y - 204, 132, 204, O({ fill: '#DDE6EF', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.1, strokeWidth: 3 }));
    rc.line(cx - 66, y - 130, cx + 66, y - 130, O({ strokeWidth: 2.6 }));
    rc.line(cx - 46, y - 118, cx - 46, y - 60, O({ stroke: '#8B93A8', strokeWidth: 6 }));
    rc.line(cx - 46, y - 190, cx - 46, y - 152, O({ stroke: '#8B93A8', strokeWidth: 6 }));
    rc.rectangle(cx + 8, y - 190, 30, 26, O({ fill: '#FF6B57', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx + 34, y - 108, 9, O({ fill: '#5DA9E9', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.polygon([[cx - 10, y - 106], [cx + 8, y - 106], [cx - 2, y - 92]], O({ fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.line(cx - 50, y - 6, cx - 50, y, O({ strokeWidth: 5 }));
    rc.line(cx + 50, y - 6, cx + 50, y, O({ strokeWidth: 5 }));
  }},
  paperbag: { w: 140, h: 150, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 46} ${y} L ${cx - 50} ${y - 96} L ${cx - 34} ${y - 108} L ${cx - 20} ${y - 96} L ${cx - 4} ${y - 110} L ${cx + 14} ${y - 98} L ${cx + 30} ${y - 110} L ${cx + 44} ${y - 96} L ${cx + 46} ${y} Z`,
      O({ fill: '#D9B98A', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.rectangle(cx - 34, y - 76, 66, 40, O({ stroke: '#B98A4F', strokeWidth: 1.8 }));
    rc.line(cx - 30, y - 52, cx + 28, y - 54, O({ stroke: '#B98A4F', strokeWidth: 1.6 }));
  }},
  toast: { w: 120, h: 120, draw(rc, w, h) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 40} ${y} L ${cx - 42} ${y - 74} Q ${cx - 44} ${y - 104} ${cx - 16} ${y - 100} Q ${cx} ${y - 112} ${cx + 16} ${y - 100} Q ${cx + 44} ${y - 104} ${cx + 42} ${y - 74} L ${cx + 40} ${y} Z`,
      O({ fill: '#E8B96C', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, strokeWidth: 2.8 }));
    rc.path(`M ${cx - 30} ${y - 6} L ${cx - 32} ${y - 70} Q ${cx - 32} ${y - 92} ${cx - 12} ${y - 90} M ${cx + 30} ${y - 6} L ${cx + 32} ${y - 70} Q ${cx + 32} ${y - 92} ${cx + 12} ${y - 90}`,
      O({ stroke: '#B98A4F', strokeWidth: 2.4 }));
    rc.ellipse(cx + 6, y - 46, 20, 26, O({ fill: '#FFE9A0', fillStyle: 'solid', strokeWidth: 1.6 }));
  }},
  sponge: { w: 150, h: 100, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 60, y - 58, 120, 58, O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, bowing: 5, strokeWidth: 2.8 }));
    for (const [hx, hy, hr] of [[-36, -40, 7], [-4, -22, 6], [22, -44, 8], [44, -18, 5], [-20, -10, 4]])
      rc.circle(cx + hx, y + hy, hr * 2, O({ fill: '#E8A020', fillStyle: 'solid', stroke: 'none' }));
  }},
  sock: { w: 110, h: 140, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 16} ${y - 112} L ${cx + 14} ${y - 112} L ${cx + 14} ${y - 56} Q ${cx + 40} ${y - 46} ${cx + 34} ${y - 22} Q ${cx + 26} ${y - 4} ${cx} ${y - 8} Q ${cx - 16} ${y - 14} ${cx - 16} ${y - 40} Z`,
      O({ fill: '#9FC3E8', fillStyle: 'hachure', hachureGap: 4.5, hachureAngle: -35, strokeWidth: 2.6 }));
    rc.line(cx - 16, y - 104, cx + 14, y - 104, O({ stroke: '#5DA9E9', strokeWidth: 4 }));
    for (let i = 0; i < 3; i++)
      rc.curve([[cx - 18 + i * 14, y - 118], [cx - 24 + i * 14, y - 128], [cx - 14 + i * 14, y - 136]], O({ stroke: '#8B93A8', strokeWidth: 2, roughness: 3 }));
  }},
  pickle: { w: 120, h: 130, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 60, 52, 104, O({ fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    for (const [px, py] of [[-12, -88], [10, -66], [-8, -42], [12, -96], [-14, -70]])
      rc.circle(cx + px, y + py, 5, O({ fill: '#3E8F57', fillStyle: 'solid', stroke: 'none' }));
  }},
  rock: { w: 150, h: 90, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    rc.polygon([[cx - 56, y], [cx - 60, y - 26], [cx - 24, y - 54], [cx + 18, y - 58], [cx + 54, y - 30], [cx + 52, y]],
      O({ fill: '#A9A39B', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.8 }));
    rc.line(cx - 18, y - 42, cx + 4, y - 28, O({ stroke: '#7d766c', strokeWidth: 1.8 }));
  }},
  scribble: { w: 170, h: 130, draw(rc, w, h) {
    const cx = w / 2, y = h - 6;
    const r2 = mulberry32(sh());
    for (let i = 0; i < 7; i++) {
      const sx = cx - 60 + r2() * 40, sy = y - 8 - r2() * 60;
      rc.linearPath([[sx, sy], [sx + 16 + r2() * 24, sy - 14 + r2() * 24], [sx + 44 + r2() * 24, sy - 4 + r2() * 30]],
        O({ stroke: pick(r2, ['#B565D8', '#FF6B57', '#5DA9E9']), strokeWidth: 3.4, roughness: 2.8 }));
    }
    rc.circle(cx + 44, y - 16, 12, O({ fill: '#B565D8', fillStyle: 'solid', strokeWidth: 2 }));
  }}
};

/* ---------- prop spawning ---------- */
let liveProps = [];
function makePropCanvas(name) {
  const def = PROPDEF[name];
  const cv = document.createElement('canvas');
  sizeCv(cv, def.w, def.h);
  def.draw(rough.canvas(cv), def.w, def.h);
  return cv;
}
function spawnProp(name, wx, opts) {
  opts = opts || {};
  const def = PROPDEF[name];
  const div = document.createElement('div');
  div.className = 'prop' + (opts.cls ? ' ' + opts.cls : '');
  const cv = makePropCanvas(name);
  div.appendChild(cv);
  const wy = (opts.y !== undefined ? opts.y : groundY() + 6);
  const p = { name, div, wx, wy, dyg: wy - groundY(), w: def.w, h: def.h };
  placeProp(p);
  (opts.layer === 'ride' ? rideLayer : propLayer).appendChild(div);
  liveProps.push(p);
  return p;
}
function placeProp(p) {
  p.div.style.left = (p.wx - p.w / 2) + 'px';
  p.div.style.top = (groundY() + p.dyg - p.h) + 'px';
}
function setPropWX(p, wx) { p.wx = wx; placeProp(p); }
function headProp(name, topPx) {
  clearAttachment(headprop);
  const cv = makePropCanvas(name);
  const div = document.createElement('div');
  div.className = 'prop pop';
  div.style.top = topPx + 'px';
  div.style.left = '50%';
  div.style.marginLeft = (-PROPDEF[name].w / 2) + 'px';
  div.appendChild(cv);
  headprop.appendChild(div);
  return div;
}
function heldProp(name) {
  clearAttachment(heldprop);
  const cv = makePropCanvas(name);
  const div = document.createElement('div');
  div.className = 'prop pop';
  div.appendChild(cv);
  heldprop.appendChild(div);
  return div;
}
function clearAttachment(el) { el.innerHTML = ''; }
function clearAllProps() {
  liveProps = [];
  propLayer.innerHTML = '';
  rideLayer.innerHTML = '';
  clearAttachment(headprop);
  clearAttachment(heldprop);
}

/* ============================================================
   WORD TABLE — five story beats
   ============================================================ */
const SENTENCES = [
  { pre: 'The path is blocked! Pip needs a ', post: ' to cross the creek.',
    hint: 'Try: bridge, log, vine, boat… or something very silly.' },
  { pre: 'It started to rain! Pip grabs a ', post: '.',
    hint: 'Umbrella? Hat? Leaf? Anything but a paper bag…' },
  { pre: 'A wide river! Pip rides the ', post: ' across.',
    hint: 'Boat? Duck? Fish? Maybe even… a unicorn?' },
  { pre: 'The cave is dark! Pip lights a ', post: '.',
    hint: 'Lantern? Torch? Fireflies? A wet match will NOT work.' },
  { pre: 'Home at last! Pip opens the ', post: '.',
    hint: 'Door? Key? Cookie jar? Home smells like cookies.' }
];
const TABLES = [
  /* beat 1 — the creek */
  { 'bridge':      { kind: 'good', prop: 'bridge', gag: 'cross', line: 'A crayon bridge! Solid-ish.' },
    'log':         { kind: 'good', prop: 'log',    gag: 'cross', line: 'A log! Classic crossing.' },
    'plank':       { kind: 'good', prop: 'plank',  gag: 'cross', line: 'Plank you very much!' },
    'board':       { kind: 'good', prop: 'plank',  gag: 'cross', line: 'Plank you very much!' },
    'vine':        { kind: 'good', prop: 'vine',   gag: 'swing', line: 'Tarzan time! Wheee!' },
    'rope':        { kind: 'good', prop: 'vine',   gag: 'swing', line: 'Tarzan time! Wheee!' },
    'boat':        { kind: 'good', prop: 'boat',   gag: 'ferry', line: 'Ferry service — one doodle aboard!' },
    'banana peel': { kind: 'silly', prop: 'peel',  gag: 'slip',  line: 'WHOA — banana peel! Down you go!' },
    'banana':      { kind: 'silly', prop: 'peel',  gag: 'slip',  line: 'That peel though… WHOA!' },
    'slime':       { kind: 'silly', prop: 'slime', gag: 'splat', line: 'SPLAT. Slime is not a bridge.' },
    'slime puddle':{ kind: 'silly', prop: 'slime', gag: 'splat', line: 'SPLAT. Slime is not a bridge.' },
    'toaster':     { kind: 'silly', prop: 'toaster', gag: 'bonk', line: 'A toaster?! BONK.' },
    'fridge':      { kind: 'silly', prop: 'fridge', gag: 'fridgegap', line: 'A FRIDGE?! …okay, it accidentally worked.' },
    'rock':        { kind: 'silly', prop: 'rock',  gag: 'bonk',  line: 'BONK. Rocks are not crossings.' } },
  /* beat 2 — rain */
  { 'umbrella':    { kind: 'good', prop: 'umbrella', gag: 'head', line: 'Snug and dry under the umbrella!' },
    'hat':         { kind: 'good', prop: 'hat',      gag: 'head', line: 'Stylin\' AND dry.' },
    'leaf':        { kind: 'good', prop: 'leaf',     gag: 'head', line: 'A leaf-hat! Forest fashion.' },
    'leaf-hat':    { kind: 'good', prop: 'leaf',     gag: 'head', line: 'A leaf-hat! Forest fashion.' },
    'newspaper':   { kind: 'good', prop: 'newspaper', gag: 'head', line: 'Yesterday\'s news keeps you dry!' },
    'paper bag':   { kind: 'silly', prop: 'paperbag', gag: 'sog', line: 'A soggy bag! You can\'t see a thing!' },
    'bag':         { kind: 'silly', prop: 'paperbag', gag: 'sog', line: 'A soggy bag! You can\'t see a thing!' },
    'toast':       { kind: 'silly', prop: 'toast',    gag: 'sog', line: 'Soggy toast. On your head. Great.' },
    'sponge':      { kind: 'silly', prop: 'sponge',   gag: 'sog', line: 'The sponge drank ALL the rain. Heavy!' },
    'sock':        { kind: 'silly', prop: 'sock',     gag: 'sog', line: 'A wet sock hat. Squish squish.' } },
  /* beat 3 — the river */
  { 'boat':        { kind: 'good', prop: 'boat',    gag: 'ride', rideLift: 30, line: 'Row row row your doodle!' },
    'raft':        { kind: 'good', prop: 'raft',    gag: 'ride', rideLift: 38, line: 'Huck-Finn style!' },
    'duck':        { kind: 'good', prop: 'duck',    gag: 'ride', rideLift: 72, line: 'Quack taxi, at your service!' },
    'fish':        { kind: 'good', prop: 'fish',    gag: 'ride', rideLift: 62, line: 'Riding a giant fish. Obviously.' },
    'unicorn':     { kind: 'good', prop: 'unicorn', gag: 'ride', rideLift: 96, line: 'A UNICORN! Best! Ride! Ever!', bird: 'chirp!! a UNICORN!!' },
    'toaster':     { kind: 'silly', prop: 'toaster', gag: 'sink', line: 'Toasters can\'t swim. GLUG GLUG.' },
    'fridge':      { kind: 'silly', prop: 'fridge',  gag: 'sink', line: 'A fridge sinks like a fridge.' },
    'rock':        { kind: 'silly', prop: 'rock',    gag: 'sink', line: 'Rocks sink. Who knew? Everyone.' } },
  /* beat 4 — the cave */
  { 'lantern':     { kind: 'good', prop: 'lantern',  gag: 'light', line: 'Ooh, cozy lantern light.' },
    'torch':       { kind: 'good', prop: 'torch',    gag: 'light', line: 'A torch! Cave explorer mode!' },
    'firefly':     { kind: 'good', prop: 'firefly',  gag: 'light', line: 'Fireflies in a jar — tiny lanterns!', bird: 'tweet! so sparkly!' },
    'fireflies':   { kind: 'good', prop: 'firefly',  gag: 'light', line: 'Fireflies in a jar — tiny lanterns!' },
    'candle':      { kind: 'good', prop: 'candle',   gag: 'light', line: 'A little candle, a little light.' },
    'wet match':   { kind: 'silly', prop: 'matchstick', gag: 'fizzle', line: 'A WET match. Fsss… nothing.' },
    'match':       { kind: 'silly', prop: 'matchstick', gag: 'fizzle', line: 'Just one soggy match. Fss… nothing.' },
    'pickle':      { kind: 'silly', prop: 'pickle',  gag: 'fizzle', line: 'Pickles do not glow. Science says so.' },
    'paper bag':   { kind: 'silly', prop: 'paperbag', gag: 'fizzle', line: 'A bag over your head is… darker.' } },
  /* beat 5 — home */
  { 'door':        { kind: 'good', prop: 'dooropen', gag: 'open', line: 'Creeeak — home sweet home!' },
    'doorknob':    { kind: 'good', prop: 'dooropen', gag: 'open', line: 'Turn the knob — home!' },
    'key':         { kind: 'good', prop: 'key',      gag: 'key',  line: 'Click! The key fits!' },
    'cookie jar':  { kind: 'good', prop: 'cookiejar', gag: 'cookie', line: 'COOKIES! Best homecoming ever.', bird: 'chirp!! cookies!!' },
    'cookie':      { kind: 'good', prop: 'cookiejar', gag: 'cookie', line: 'COOKIES! Best homecoming ever.' },
    'cookies':     { kind: 'good', prop: 'cookiejar', gag: 'cookie', line: 'COOKIES! Best homecoming ever.' },
    'wall':        { kind: 'silly', prop: 'rock',     gag: 'bonkdoor', line: 'BONK. That\'s a wall, not a door.' } }
];
/* silly words that work anywhere — the peel is always watching */
const GLOBAL_SILLY = {
  'banana peel': { kind: 'silly', prop: 'peel',  gag: 'slip',  line: 'WHOA — banana peel! Down you go!' },
  'slime':       { kind: 'silly', prop: 'slime', gag: 'splat', line: 'SPLAT. Right in the slime.' },
  'slime puddle':{ kind: 'silly', prop: 'slime', gag: 'splat', line: 'SPLAT. Right in the slime.' },
  'toaster':     { kind: 'silly', prop: 'toaster', gag: 'bonk', line: 'A toaster?! BONK.' }
};

/* ---------- word logic ---------- */
function normWord(w) { return w.toLowerCase().trim().replace(/\s+/g, ' '); }
function isWordish(w) {
  if (!w || w.length < 3) return false;
  if (!/^[a-z][a-z '-]*$/i.test(w)) return false;
  const core = w.replace(/[^a-z]/g, '');
  if (core.length < 3) return false;
  if (!/[aeiou]/.test(core) && !(core.length >= 4 && /y/.test(core))) return false;
  if (/(.)\1{2,}/.test(core)) return false;        /* aaaa, zzzz */
  return true;
}
function lookup(w, table) {
  const hit = (k) => (table[k] || GLOBAL_SILLY[k]) || null;
  if (hit(w)) return hit(w);
  if (w.endsWith('es') && hit(w.slice(0, -2))) return hit(w.slice(0, -2));
  if (w.endsWith('s') && hit(w.slice(0, -1))) return hit(w.slice(0, -1));
  return null;
}
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const wild = (w) => ({ kind: 'silly', prop: 'scribble', gag: 'bonk',
  line: `A ${w}?! Pip bonks into the idea of it.` });

/* ---------- ui helpers ---------- */
function setCoach(t, mood) {
  coach.textContent = t;
  coachP.className = 'coach' + (mood ? ' ' + mood : '');
}
function hideDym() { dymEl.hidden = true; }
function showDym(word) {
  dymBtn.textContent = word;
  dymBtn.dataset.word = word;
  dymEl.hidden = false;
}
function setLine() {
  lineChip.textContent = si < SENTENCES.length ? `Line ${si + 1} of 5` : 'Done!';
}
function cheer(t) {
  cheerEl.textContent = t;
  cheerEl.classList.remove('pop');
  void cheerEl.offsetWidth;
  cheerEl.classList.add('pop');
}
async function dustOff(ep) {
  dizzyEl.classList.remove('on');
  hinner.className = 'hinner';
  await sleep(60); if (!ok(ep)) return;
  hinner.classList.add('g-dust');
  await sleep(700); if (!ok(ep)) return;
  hinner.classList.remove('g-dust');
}

/* ============================================================
   BEAT CHOREOGRAPHY
   ============================================================ */
const GAG_MS = { slip: 1200, splat: 900, bonk: 1300, sog: 1500, splash: 950, fizzle: 1100,
  cross: 400, swing: 400, ferry: 400, head: 300, ride: 400, sink: 500, light: 400,
  open: 300, key: 300, cookie: 300, fridgegap: 700, bonkdoor: 1200 };

async function sillyRecover(ep, gag) {
  hinner.classList.add('g-' + (gag === 'splat' ? 'flat' : gag === 'sog' ? 'soak' :
    gag === 'fizzle' ? 'fizzle' : gag === 'sink' ? 'splash' :
    gag === 'bonkdoor' ? 'bonk' : gag === 'fridgegap' ? 'startle' : gag));
  await sleep(Math.max(500, (GAG_MS[gag] || 1100) - 350));
  if (!ok(ep)) return;
  dizzyEl.classList.add('on');
  await sleep(400); if (!ok(ep)) return;
  await dustOff(ep);
}

/* --- beat 1: the creek --- */
async function flowCreek(rx, ep) {
  const gy = groundY();
  if (rx.kind === 'good') {
    if (rx.gag === 'swing') {
      spawnProp('vine', CREEK.cx, { y: gy - 6, cls: 'pop' });
      cheer(rx.line);
      await hopTo(POST[0], 180, 0, ep); if (!ok(ep)) return;
    } else if (rx.gag === 'ferry') {
      const p = spawnProp('boat', CREEK.cx - 20, { y: gy + 14, cls: 'pop' });
      cheer(rx.line);
      await hopTo(CREEK.cx - 26, 90, 30, ep); if (!ok(ep)) return;
      /* scoot the boat across the creek */
      await tween(700, (k) => {
        const nx = CREEK.cx - 26 + easeIO(k) * 56;
        hero.wx = nx; setPropWX(p, nx + 4); placeHero();
      }, ep); if (!ok(ep)) return;
      await hopTo(POST[0], 70, 0, ep); if (!ok(ep)) return;
    } else {
      spawnProp(rx.prop, CREEK.cx, { y: gy + 22, cls: 'pop' });
      poof(CREEK.cx, gy - 40, 6);
      cheer(rx.line);
      await sleep(420); if (!ok(ep)) return;
      await hopTo(POST[0], 66, 0, ep); if (!ok(ep)) return;
    }
  } else {
    /* silly: real prop lands at the hero's feet, gag, recover, then scramble over */
    const px = hero.wx + 66;
    if (rx.gag === 'fridgegap') {
      spawnProp('fridge', CREEK.cx, { y: gy + 26, cls: 'drops' });
      poof(CREEK.cx, gy - 20, 9); cheer(rx.line);
      await sillyRecover(ep, 'fridgegap'); if (!ok(ep)) return;
      /* the fridge IS the bridge now — climb over it */
      await hopTo(POST[0], 130, 0, ep); if (!ok(ep)) return;
      return;
    }
    spawnProp(rx.prop, px, { y: gy + 8, cls: rx.gag === 'bonk' ? 'drops' : 'pop' });
    poof(px, gy - 16, 5);
    cheer(rx.line);
    await walkTo(px + 6, ep); if (!ok(ep)) return;
    await sillyRecover(ep, rx.gag); if (!ok(ep)) return;
    setCoach('Pip scrambles over the gap anyway — silly version stays in!');
    await hopTo(POST[0], 90, 0, ep); if (!ok(ep)) return;
  }
}

/* --- beat 2: rain --- */
async function flowRain(rx, ep) {
  if (rx.kind === 'good') {
    headProp(rx.prop, -112);
    cheer(rx.line);
    poof(hero.wx, groundY() - 130, 5);
    await sleep(350); if (!ok(ep)) return;
    await walkTo(POST[1], ep); if (!ok(ep)) return;
    clearAttachment(headprop);
  } else if (rx.gag === 'sog') {
    /* a "hat" that is very much not rain gear */
    const hp = headProp(rx.prop, rx.prop === 'paperbag' ? -84 : -96);
    cheer(rx.line);
    await sleep(650); if (!ok(ep)) return;
    hp.classList.add('sog');
    hinner.classList.add('soggy');
    await sillyRecover(ep, 'sog'); if (!ok(ep)) return;
    hinner.classList.add('soggy');
    setCoach('One soggy hero trudges on…');
    await walkTo(POST[1], ep, 0.15); if (!ok(ep)) return;
    hinner.classList.remove('soggy');
    clearAttachment(headprop);
  } else {
    /* physical silly (peel, scribble…) on the wet path */
    spawnProp(rx.prop, hero.wx + 62, { y: groundY() + 8, cls: 'pop' });
    cheer(rx.line);
    await walkTo(hero.wx + 56, ep); if (!ok(ep)) return;
    await sillyRecover(ep, rx.gag); if (!ok(ep)) return;
    setCoach('Pip shakes off the rain and the embarrassment.');
    await walkTo(POST[1], ep, 0.17); if (!ok(ep)) return;
  }
}

/* --- beat 3: river --- */
async function flowRiver(rx, ep) {
  const gy = groundY();
  if (rx.kind === 'good') {
    const lift = rx.rideLift || 40;
    const p = spawnProp(rx.prop, RIVER.l + 60, { y: gy + 16, cls: 'pop', layer: 'ride' });
    poof(RIVER.l + 60, gy - 30, rx.prop === 'unicorn' ? 10 : 5, rx.prop === 'unicorn' ? 'star' : '');
    cheer(rx.line);
    await sleep(420); if (!ok(ep)) return;
    /* visibly hop on and mount */
    await hopTo(RIVER.l + 70, 110, lift, ep); if (!ok(ep)) return;
    /* ride across the water */
    const rideDur = demoOn ? 1200 : 1900;
    await tween(rideDur, (k) => {
      const nx = RIVER.l + 70 + easeIO(k) * (RIVER.r - RIVER.l - 130);
      hero.wx = nx; setPropWX(p, nx + 6); placeHero();
      if (rx.prop === 'unicorn' && Math.random() < .12) sparkle(hero.wx - 40, gy - 30, 1);
      if (rx.prop === 'duck' && Math.random() < .06) poof(hero.wx - 60, gy + 4, 1, 'drop');
    }, ep); if (!ok(ep)) return;
    /* hop off onto the far bank */
    await hopTo(POST[2], 80, 0, ep); if (!ok(ep)) return;
  } else {
    if (rx.gag === 'sink') {
      /* the "ride" sinks like a stone */
      const p = spawnProp(rx.prop, RIVER.l + 60, { y: gy + 20, cls: 'drops', layer: 'ride' });
      cheer(rx.line);
      await sleep(500); if (!ok(ep)) return;
      p.div.classList.add('sinks');
      poof(RIVER.l + 60, gy - 6, 10, 'drop');
      await sleep(320); if (!ok(ep)) return;
      await sillyRecover(ep, 'splash'); if (!ok(ep)) return;
    } else {
      /* physical silly on the river bank */
      spawnProp(rx.prop, hero.wx + 62, { y: gy + 8, cls: 'pop' });
      cheer(rx.line);
      await walkTo(hero.wx + 56, ep); if (!ok(ep)) return;
      await sillyRecover(ep, rx.gag); if (!ok(ep)) return;
      setCoach('Only one way across now: paddle!');
      await walkTo(RIVER.l + 30, ep); if (!ok(ep)) return;
    }
    /* either way — the hero doggy-paddles across. canon! */
    hinner.classList.add('swimming');
    hinner.classList.add('soggy');
    hero.lift = -26; placeHero();
    const x0 = hero.wx, x1 = RIVER.r - 40;
    await tween(2400, (k) => {
      hero.wx = x0 + (x1 - x0) * easeIO(k); placeHero();
      if (Math.random() < .14) poof(hero.wx + 30, gy - 10, 2, 'drop');
    }, ep); if (!ok(ep)) return;
    hinner.classList.remove('swimming');
    await hopTo(POST[2], 70, 0, ep); if (!ok(ep)) return;
    hinner.classList.remove('soggy');
    setCoach('Pip shakes off like a wet puppy. Across!');
  }
}

/* --- beat 4: the cave --- */
async function flowCave(rx, ep) {
  bird.mode = 'wait';
  chirp('chirp… i\'ll wait out here!', 2200);
  if (rx.kind === 'good') {
    heldProp(rx.prop);
    cheer(rx.line);
    /* the crayon light grows */
    await tween(900, (k) => { lightR = 20 + easeIO(k) * 140; drawDark(); }, ep);
    if (!ok(ep)) return;
    poof(hero.wx + 40, groundY() - 90, 4, 'star');
    await walkTo(POST[3], ep, 0.2); if (!ok(ep)) return;
  } else {
    let bumped = false;
    if (rx.gag === 'fizzle') {
      /* a "light" that produces absolutely no light */
      heldProp(rx.prop);
      cheer(rx.line);
      await sleep(420); if (!ok(ep)) return;
      sparkle(hero.wx + 40, groundY() - 80, 3);          /* one sad little spark */
      const hp = heldprop.firstChild;
      if (hp) hp.classList.add('fizzles');
      await sillyRecover(ep, 'fizzle'); if (!ok(ep)) return;
      bumped = true;
    } else {
      /* physical silly in the dark doorway */
      spawnProp(rx.prop, hero.wx + 62, { y: groundY() + 8, cls: 'pop' });
      cheer(rx.line);
      await walkTo(hero.wx + 56, ep); if (!ok(ep)) return;
      await sillyRecover(ep, rx.gag); if (!ok(ep)) return;
    }
    setCoach('Still dark! Pip tip-toes anyway…');
    /* halfway through the dark — maybe bump something */
    await walkTo(CAVE.l + 340, ep, 0.16); if (!ok(ep)) return;
    if (bumped) {
      hinner.classList.add('g-bonk');
      poof(hero.wx + 30, groundY() - 70, 6);
      await sleep(700); if (!ok(ep)) return;
      dizzyEl.classList.add('on');
      await sleep(500); if (!ok(ep)) return;
      await dustOff(ep); if (!ok(ep)) return;
    }
    await walkTo(POST[3], ep, 0.18); if (!ok(ep)) return;
    clearAttachment(heldprop);
  }
  /* coming out of the cave — the light fades behind */
  await tween(700, (k) => { lightR = lightR * (1 - easeIO(k)); drawDark(); }, ep);
  if (!ok(ep)) return;
  lightR = 0; drawDark();
  clearAttachment(heldprop);
  bird.mode = 'follow';
}

/* --- beat 5: home --- */
async function flowHome(rx, ep) {
  const gy = groundY();
  const doorX = HOME.door;
  async function openDoor() {
    spawnProp('dooropen', doorX, { y: gy + 8, cls: 'pop' });
    poof(doorX, gy - 70, 8, 'star');
    await sleep(500);
  }
  if (rx.gag === 'cookie') {
    spawnProp('cookiejar', doorX - 96, { y: gy + 10, cls: 'pop' });
    cheer(rx.line);
    await walkTo(doorX - 96, ep); if (!ok(ep)) return;
    hinner.classList.add('g-nom');
    poof(hero.wx + 20, gy - 60, 7);
    await sleep(1050); if (!ok(ep)) return;
    hinner.classList.remove('g-nom');
    setCoach('Cookie power! The door swings open…');
    await openDoor(); if (!ok(ep)) return;
  } else if (rx.gag === 'key') {
    const kp = spawnProp('key', hero.wx + 40, { y: gy - 30, cls: 'pop' });
    cheer(rx.line);
    await sleep(500); if (!ok(ep)) return;
    /* the key floats to the lock */
    await tween(800, (k) => {
      kp.div.style.left = (hero.wx + 40 - kp.w / 2 + (doorX - hero.wx - 40) * easeIO(k)) + 'px';
      kp.div.style.top = (gy - 30 - kp.h + Math.sin(k * Math.PI) * -26) + 'px';
    }, ep); if (!ok(ep)) return;
    kp.div.classList.add('fadeout');
    sparkle(doorX + 14, gy - 58, 6);
    await sleep(350); if (!ok(ep)) return;
    await openDoor(); if (!ok(ep)) return;
  } else if (rx.kind === 'good') {
    cheer(rx.line);
    await walkTo(doorX - 60, ep); if (!ok(ep)) return;
    await openDoor(); if (!ok(ep)) return;
  } else {
    /* silly at the doorstep — gag, then the door opens anyway */
    const px = hero.wx + 60;
    spawnProp(rx.prop, px, { y: gy + 8, cls: 'pop' });
    cheer(rx.line);
    await walkTo(px + 4, ep); if (!ok(ep)) return;
    await sillyRecover(ep, rx.gag); if (!ok(ep)) return;
    setCoach('A heroic recovery! Now — the actual door.');
    await openDoor(); if (!ok(ep)) return;
  }
  /* walk in! */
  await walkTo(doorX - 30, ep); if (!ok(ep)) return;
  hinner.classList.add('g-enter');
  await sleep(950); if (!ok(ep)) return;
  heroEl.style.opacity = 0;
  bird.mode = 'roof';
  chirp('home!! cookies!!', 2400);
  /* windows glow + confetti */
  for (let i = 0; i < 3; i++) {
    poof(HOME.l + 62 + i * (HOME.r - HOME.l - 124) / 2, gy - 110, 6, 'star');
    await sleep(220); if (!ok(ep)) return;
  }
  for (let i = 0; i < 10; i++)
    setTimeout(() => poof(doorX + (Math.random() - .5) * 240, gy - 60 - Math.random() * 140, 3), i * 90);
  await sleep(1000); if (!ok(ep)) return;
}

const FLOWS = [flowCreek, flowRain, flowRiver, flowCave, flowHome];
const CHIRP_GOOD  = ['chirp! nice word!', 'tweet! you did it!', 'chirp chirp! onward!'];
const CHIRP_SILLY = ['chirp?! uh-oh!', 'tweet tweet — splat!', 'chirp! so silly!'];
const CHIRP_BEAT  = ['a creek blocks the path!', 'uh oh — rain ahead!', 'a river! we need a ride!',
                     'the cave looks SO dark…', 'home! i smell cookies!'];

/* ---------- game state ---------- */
let si = 0, chosen = [], busy = false, started = false, heroReady = false;
let demoOn = false;
let lastSuggested = null, lastTried = null;

function loadSentence() {
  const s = SENTENCES[si];
  preText.textContent = s.pre;
  postText.textContent = s.post;
  blank.value = '';
  blank.disabled = false;
  raining = (si === 1);                            /* the rainy patch rains */
  sizeBlank();
  setLine();
  setCoach(s.hint);
  hideDym();
  lastSuggested = lastTried = null;
  if (!demoOn) blank.focus({ preventScroll: true });
}

async function react(word, rx, ep) {
  busy = true;
  blank.disabled = true;
  hideDym();
  if (approachP) { await approachP; if (!ok(ep)) return; }
  if (rx.bird) chirp(rx.bird, 2000);
  else if (rx.kind === 'silly') chirp(pick(Math.random, CHIRP_SILLY), 1900);
  await FLOWS[si](rx, ep);
  if (!ok(ep)) return;
  chosen.push({ word, kind: rx.kind });
  si++;
  if (si >= SENTENCES.length) { endChapter(); return; }
  if (rx.kind === 'good') chirp(pick(Math.random, CHIRP_GOOD), 1700);
  clearAttachment(headprop);
  hinner.classList.remove('soggy');
  loadSentence();
  chirp(CHIRP_BEAT[si], 2100);
  startApproach(si, ep);
  busy = false;
}

function submitWord() {
  if (busy || si >= SENTENCES.length || !started) return;
  const w = normWord(blank.value);
  if (!isWordish(w)) {
    blankbox.classList.remove('nope');
    void blankbox.offsetWidth;
    blankbox.classList.add('nope');
    setCoach('Hmm… is that a word? Try again!', 'uhoh');
    return;
  }
  const table = TABLES[si];
  const rx = lookup(w, table);
  if (rx) { react(w, rx, epoch); return; }

  /* spelling help — close miss on a sensible word? */
  let best = null, bestD = 99;
  for (const k of Object.keys(table)) {
    if (table[k].kind !== 'good') continue;
    const d = lev(w, k);
    if (d < bestD) { bestD = d; best = k; }
  }
  const tol = w.length >= 5 ? 2 : 1;             /* "bridg" → bridge */
  if (best && bestD <= tol) {
    if (lastSuggested === best && lastTried === w) {
      /* kid insists on their word — let the scribble happen */
      react(w, wild(w), epoch);
      return;
    }
    lastSuggested = best; lastTried = w;
    showDym(best);
    setCoach(`"${w}" is close!`, 'yay');
    blankbox.classList.remove('nope');
    void blankbox.offsetWidth;
    blankbox.classList.add('nope');
    return;
  }
  /* any other real word becomes a wildcard scribble gag */
  react(w, wild(w), epoch);
}

/* ---------- ending ---------- */
function drawGem() {
  sizeCv(gemCv, 92, 92);
  const rc = rough.canvas(gemCv);
  rc.polygon([[46, 8], [80, 30], [70, 80], [22, 80], [12, 30]],
    O({ fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, fillWeight: 1.4, strokeWidth: 3.2, seed: 7 }));
  rc.line(12, 30, 80, 30, O({ strokeWidth: 1.8, seed: 8 }));
  rc.line(46, 8, 36, 30, O({ strokeWidth: 1.8, seed: 9 }));
  rc.line(46, 8, 56, 30, O({ strokeWidth: 1.8, seed: 10 }));
  rc.line(36, 30, 46, 80, O({ strokeWidth: 1.8, seed: 11 }));
  rc.line(56, 30, 46, 80, O({ strokeWidth: 1.8, seed: 12 }));
  rc.line(24, 22, 38, 14, O({ stroke: '#FFFDF6', strokeWidth: 4, seed: 13 }));
}
function endChapter() {
  setLine();
  setCoach('Chapter written!');
  drawGem();
  recapEl.innerHTML = '';
  let sillies = 0;
  chosen.forEach((c, i) => {
    if (c.kind === 'silly') sillies++;
    const chip = document.createElement('span');
    chip.className = 'rechip' + (c.kind === 'silly' ? ' silly' : '');
    chip.textContent = `${i + 1}. ${c.word}`;
    if (c.kind === 'silly') {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'splat!';
      chip.appendChild(tag);
    }
    recapEl.appendChild(chip);
  });
  slipsEl.textContent = sillies
    ? `Your hero wiped out ${sillies} time${sillies > 1 ? 's' : ''} — and bounced back every single one. The silly versions are official story canon now.`
    : 'A perfectly sensible chapter. Your hero is only a little disappointed — doodles secretly love the splats.';
  endOv.hidden = false;
  requestAnimationFrame(() => endOv.classList.add('show'));
}

/* ---------- chapter control ---------- */
function resetChapter() {
  epoch++;
  hero.wx = SPAWN_X; hero.lift = 0;
  heroEl.style.opacity = '';
  heroResetPose();
  clearAllProps();
  clearAttachment(headprop);
  clearAttachment(heldprop);
  hinner.classList.remove('soggy');
  lightR = 0; drawDark();
  raining = false;
  bird.mode = 'follow';
  bird.x = SPAWN_X - 80; bird.y = groundY() - 160;
  approachP = null;
  si = 0; chosen = []; busy = false;
  camX = 0;
  setLine();
  placeHero();
}
function startStory() {
  resetChapter();
  started = true;
  makerOv.classList.remove('show');
  setTimeout(() => { makerOv.hidden = true; }, 380);
  endOv.classList.remove('show');
  endOv.hidden = true;
  loadSentence();
  chirp('chirp! let\'s go!', 1800);
  startApproach(0, epoch);
}

/* ============================================================
   BEAT 0 — THE HERO MAKER (kid draws the hero)
   ============================================================ */
const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
let mctx = null, strokes = [], curStroke = null, selColor = CRAYONS[1];
let makerBusy = false;

function sizeMaker() {
  mctx = sizeCv(makerCv, makerCv.clientWidth || 420, 264);
  renderStrokes();
}
function renderStrokes() {
  if (!mctx) return;
  const w = makerCv.clientWidth || 420, h = 264;
  mctx.clearRect(0, 0, w, h);
  const rc = rough.canvas(makerCv);
  strokes.forEach((st, i) => {
    if (st.op) { st.op(rc); return; }
    if (st.pts.length < 2) {
      rc.circle(st.pts[0][0], st.pts[0][1], 7, { stroke: st.c, strokeWidth: 3, fill: st.c, fillStyle: 'solid', seed: 1000 + i });
    } else {
      rc.curve(st.pts, { stroke: st.c, strokeWidth: 13, roughness: 1.9, seed: 1000 + i });
    }
  });
}
function makerPos(e) {
  const r = makerCv.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function clearMaker() {
  strokes = [];
  if (mctx) mctx.clearRect(0, 0, makerCv.clientWidth, 264);
}

/* auto-paints a blob monster for hands-free demos */
function surpriseOps() {
  const w = makerCv.clientWidth || 420, h = 264;
  const r = mulberry32(((Math.random() * 0x7ffffffe) | 0) + 7);
  const c = pick(r, [CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
  const lite = { '#FF6B57': '#FFC9BF', '#4FB06D': '#B7E6C3', '#5DA9E9': '#C7E6FA', '#B565D8': '#DCC3F2' }[c];
  const cx = w / 2, cy = h / 2 + 14;
  const bw = rr(r, 120, 150), bh = rr(r, 108, 130);
  const ops = [
    (rc) => rc.ellipse(cx, cy, bw, bh, {
      stroke: c, strokeWidth: 12, roughness: 2.2, fill: c,
      fillStyle: 'hachure', hachureGap: 8, fillWeight: 1.6, seed: 555 }),
    (rc) => {   /* antenna + tip */
      rc.curve([[cx, cy - bh / 2 + 6], [cx - 6, cy - bh / 2 - 18], [cx + 4, cy - bh / 2 - 30]],
        { stroke: c, strokeWidth: 7, roughness: 2.2, seed: 556 });
      rc.circle(cx + 4, cy - bh / 2 - 34, 13, { fill: '#FFC53D', fillStyle: 'solid', stroke: INK, strokeWidth: 2.6, seed: 557 });
    },
    (rc) => {   /* eyes */
      rc.ellipse(cx - bw * .18, cy - bh * .18, 26, 30, { fill: '#FFFDF6', fillStyle: 'solid', stroke: INK, strokeWidth: 3.4, seed: 558 });
      rc.ellipse(cx + bw * .22, cy - bh * .14, 18, 22, { fill: '#FFFDF6', fillStyle: 'solid', stroke: INK, strokeWidth: 3, seed: 559 });
    },
    (rc) => {   /* pupils + sparkle */
      rc.circle(cx - bw * .18 + 3, cy - bh * .18 + 2, 8, { fill: INK, fillStyle: 'solid', stroke: 'none', seed: 560 });
      rc.circle(cx + bw * .22 + 2, cy - bh * .14 + 1, 5.5, { fill: INK, fillStyle: 'solid', stroke: 'none', seed: 561 });
    },
    (rc) => {   /* belly + smile + cheeks */
      rc.ellipse(cx + 2, cy + bh * .2, bw * .5, bh * .4, { fill: lite, fillStyle: 'solid', stroke: INK, strokeWidth: 2.4, seed: 562 });
      rc.arc(cx + 2, cy + 6, bw * .42, bh * .3, Math.PI * 0.18, Math.PI * 0.82, false, { stroke: INK, strokeWidth: 5, roughness: 2.4, seed: 563 });
      rc.circle(cx - bw * .4, cy + 2, 8, { fill: '#FF6B57', fillStyle: 'solid', stroke: 'none', seed: 564 });
      rc.circle(cx + bw * .42, cy + 4, 6.5, { fill: '#FF6B57', fillStyle: 'solid', stroke: 'none', seed: 565 });
    },
    (rc) => {   /* feet */
      rc.ellipse(cx - bw * .26, cy + bh * .46, bw * .3, 16, { fill: '#6B4A2A', fillStyle: 'solid', stroke: INK, strokeWidth: 2.6, seed: 566 });
      rc.ellipse(cx + bw * .26, cy + bh * .46, bw * .3, 16, { fill: '#6B4A2A', fillStyle: 'solid', stroke: INK, strokeWidth: 2.6, seed: 567 });
    }
  ];
  return ops;
}
async function surpriseMe(fast) {
  if (makerBusy) return;
  makerBusy = true;
  clearMaker();
  for (const op of surpriseOps()) {
    strokes.push({ op });
    renderStrokes();
    await sleep(fast ? 90 : 240);
  }
  makerBusy = false;
}

/* crop the drawing → it becomes the hero */
function cropHero() {
  const w = makerCv.clientWidth || 420, h = 264;
  const data = mctx.getImageData(0, 0, makerCv.width, makerCv.height);
  const dpr = makerCv.width / w;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < makerCv.height; y += 2) {
    for (let x = 0; x < makerCv.width; x += 2) {
      if (data.data[(y * makerCv.width + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < 60) return false;
  const pad = 16;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(makerCv.width, x1 + pad); y1 = Math.min(makerCv.height, y1 + pad);
  const sw = x1 - x0, shh = y1 - y0;
  const scale = Math.min(146 / sw, 146 / shh);
  const hctx = sizeCv(heroCv, 150, 150);
  /* center horizontally, sit on the bottom edge */
  const dw = sw * scale, dh = shh * scale;
  hctx.drawImage(makerCv, x0, y0, sw, shh, (150 - dw) / 2, 146 - dh, dw, dh);
  return true;
}

/* ---------- did-you-mean + squiggle + blank sizing ---------- */
function drawSquiggle() {
  squiggle.innerHTML = '';
  const rs = rough.svg(squiggle);
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push([6 + i * 20, 8 + Math.sin(i * 1.15) * 4]);
  squiggle.appendChild(rs.curve(pts, { stroke: '#FF6B57', strokeWidth: 4, roughness: 2.2, seed: sceneSeed }));
}
function drawUnderline() {
  const w = Math.max(120, blank.offsetWidth + 8);
  underSvg.setAttribute('width', w);
  underSvg.setAttribute('height', '14');
  underSvg.setAttribute('viewBox', `0 0 ${w} 14`);
  underSvg.innerHTML = '';
  const rs = rough.svg(underSvg);
  underSvg.appendChild(rs.line(2, 7, w - 2, 7, { stroke: INK, strokeWidth: 3, roughness: 2.4, seed: sceneSeed + 11 }));
  underSvg.appendChild(rs.line(4, 10.5, w - 6, 10, { stroke: '#FF6B57', strokeWidth: 2.2, roughness: 3, seed: sceneSeed + 12 }));
}
function drawDizzy() {
  sizeCv(dizzyCv, 130, 66);
  const rc = rough.canvas(dizzyCv);
  for (const [sx, sy, s] of [[24, 40, .9], [66, 24, 1.1], [106, 42, .8]])
    rc.polygon(starPts(sx, sy, 11 * s, 5 * s, 5, -Math.PI / 2),
      O({ fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 3.4, fillWeight: 1.4, strokeWidth: 2.2, seed: sx }));
}
function sizeBlank() {
  mirror.textContent = blank.value || 'a word!';
  blank.style.width = Math.max(120, mirror.offsetWidth + 26) + 'px';
  drawUnderline();
}

/* ---------- hands-free auto demo ---------- */
const DEMO_WORDS = ['bridge', 'paper bag', 'unicorn', 'torch', 'cookie jar'];
async function runDemo() {
  const ep = epoch;
  try {
    for (let i = 0; i < DEMO_WORDS.length; i++) {
      if (!ok(ep)) return;
      while (si < i) { await sleep(240); if (!ok(ep)) return; }
      if (si !== i) break;
      await sleep(700); if (!ok(ep)) return;
      const word = DEMO_WORDS[i];
      for (const ch of word) {
        if (!ok(ep)) return;
        blank.value += ch;
        sizeBlank();
        await sleep(115 + Math.random() * 110);
      }
      await sleep(420); if (!ok(ep)) return;
      submitWord();
      while (busy && ok(ep)) await sleep(160);
      if (!ok(ep)) return;
      await sleep(500); if (!ok(ep)) return;
    }
  } finally {
    demoOn = false;
    stopBtn.classList.remove('show');
  }
}
async function startDemo() {
  epoch++;
  demoOn = true;
  stopBtn.classList.add('show');
  /* auto-draw a blob hero, animated */
  endOv.classList.remove('show');
  endOv.hidden = true;
  makerOv.hidden = false;
  makerOv.classList.add('show');
  await sleep(200);
  await surpriseMe(true);
  if (!demoOn) return;
  cropHero();
  await sleep(300);
  startStory();
  runDemo();
}
function stopDemo() {
  if (!demoOn) return;
  epoch++;
  demoOn = false;
  stopBtn.classList.remove('show');
  makerBusy = false;
  if (makerOv.classList.contains('show')) return;   /* stopped during painting */
  heroResetPose();
  hero.lift = 0; placeHero();
  hinner.classList.remove('soggy');
  bird.mode = 'follow';
  raining = false;
  if (si < SENTENCES.length) { busy = false; loadSentence(); setCoach('You take over — type a word!'); }
}

/* ---------- maker events ---------- */
CRAYONS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === 1 ? ' sel' : '');
  b.style.background = c;
  b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', 'crayon ' + (i + 1));
  b.addEventListener('click', () => {
    selColor = c;
    swatchBox.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
    b.classList.add('sel');
  });
  swatchBox.appendChild(b);
});
makerCv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  makerCv.setPointerCapture(e.pointerId);
  curStroke = { c: selColor, pts: [makerPos(e)] };
});
makerCv.addEventListener('pointermove', (e) => {
  if (!curStroke) return;
  const [x, y] = makerPos(e);
  const pts = curStroke.pts;
  const [lx, ly] = pts[pts.length - 1];
  if (Math.hypot(x - lx, y - ly) < 3) return;
  pts.push([x, y]);
  /* live crayon preview (rough-ified on release) */
  mctx.strokeStyle = curStroke.c;
  mctx.lineWidth = 13;
  mctx.lineCap = mctx.lineJoin = 'round';
  mctx.globalAlpha = .92;
  mctx.beginPath(); mctx.moveTo(lx, ly); mctx.lineTo(x, y); mctx.stroke();
  mctx.globalAlpha = 1;
});
function endStroke() {
  if (!curStroke) return;
  strokes.push(curStroke);
  curStroke = null;
  renderStrokes();                       /* re-draw everything as rough.js curves */
}
makerCv.addEventListener('pointerup', endStroke);
makerCv.addEventListener('pointercancel', endStroke);
clearBtn.addEventListener('click', clearMaker);
surpriseBtn.addEventListener('click', () => surpriseMe(false));
doneBtn.addEventListener('click', () => {
  if (makerBusy) return;
  if (!cropHero()) {
    setCoach('Draw a hero first — or press "Surprise me"!', 'uhoh');
    makerCv.classList.remove('nope');
    return;
  }
  heroReady = true;
  startStory();
});

/* ---------- events ---------- */
blank.addEventListener('input', () => { hideDym(); sizeBlank(); });
blank.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
});
document.addEventListener('keydown', (e) => {
  if (demoOn || e.metaKey || e.ctrlKey || e.altKey) return;
  if (started && !makerOv.classList.contains('show') &&
      document.activeElement !== blank && /^[a-zA-Z ]$/.test(e.key))
    blank.focus({ preventScroll: true });
});
dymBtn.addEventListener('click', () => {
  blank.value = dymBtn.dataset.word;
  sizeBlank();
  hideDym();
  submitWord();
});
watchBtn.addEventListener('click', startDemo);
watchAgain.addEventListener('click', startDemo);
againBtn.addEventListener('click', () => {
  epoch++;
  demoOn = false;
  endOv.classList.remove('show');
  endOv.hidden = true;
  clearMaker();
  resetChapter();
  makerOv.hidden = false;
  requestAnimationFrame(() => makerOv.classList.add('show'));
});
stopBtn.addEventListener('click', stopDemo);
sceneBtn.addEventListener('click', () => {
  sceneSeed = ((Math.random() * 0x7ffffffe) | 0) + 1;
  drawWorld();
  drawSquiggle();
  drawBird();
  setCoach('Fresh scribble! Same story, brand-new crayons.');
});
tapType.addEventListener('click', () => blank.focus({ preventScroll: false }));

let rsz;
window.addEventListener('resize', () => {
  clearTimeout(rsz);
  rsz = setTimeout(() => {
    drawWorld();
    sizeDark();
    placeHero();
    liveProps.forEach(placeProp);
    sizeMaker();
    drawUnderline();
  }, 160);
});

/* ---------- init ---------- */
drawWorld();
sizeDark();
drawBird();
drawDizzy();
drawSquiggle();
placeHero();
birdEl.style.left = (bird.x - 40) + 'px';
birdEl.style.top = bird.y + 'px';
requestAnimationFrame(loop);
requestAnimationFrame(sizeMaker);
sizeBlank();
loadSentence();
blank.disabled = true;
