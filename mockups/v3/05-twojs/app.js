/* ============================================================
   Springy Scribble — Three Little Pigs · Two.js edition
   Engine: Two.js v0.8.24 (vendored, MIT — https://two.js.org)

   Differentiator: the whole world is a handful of two.Path /
   two.Group objects with a hand-drawn look — every shape is
   stroked 2-3 times with jittered copies, plus a live "boil"
   wobble. Props pop in on real springs (scale overshoot), the
   kid-drawn hero is replayed stroke-by-stroke as two.Path and
   bounces along, and the wolf's huff squash-and-stretches the
   ENTIRE world group. Biome/palette/seed re-render per LLM
   scene_seed. Story is written by the real LLM via ../shared/llm.js
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const stage      = $('stage');
const latChip    = $('latChip');
const modeChip   = $('modeChip');
const wolfMeter  = $('wolfMeter');
const goalFill   = $('goalFill');
const goalPig    = $('goalPig');
const stopBtn    = $('stopBtn');
const makerOv    = $('makerOverlay');
const makerCv    = $('makerCv');
const swatchBox  = $('swatches');
const doneBtn    = $('doneBtn');
const surpriseBtn= $('surpriseBtn');
const clearBtn   = $('clearBtn');
const watchBtn   = $('watchBtn');
const endOv      = $('endOverlay');
const againBtn   = $('againBtn');
const watchAgain = $('watchAgainBtn');
const winLine    = $('winLine');
const recapEl    = $('recap');
const narrativeEl= $('narrative');
const obstaclesEl= $('obstacles');
const dymEl      = $('dym');
const dymBtn     = $('dymBtn');
const wordInput  = $('word');
const goBtn      = $('goBtn');
const choicesEl  = $('choices');
const coachEl    = $('coach');

const INK = '#2B2118';

if (!window.Two || !window.StoryLLM) {
  narrativeEl.textContent = 'Something did not load — check vendor/two.min.js and ../shared/llm.js.';
  throw new Error('Two.js or StoryLLM missing');
}

/* ---------- seeded rng ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[(r() * arr.length) | 0];
const rr = (r, a, b) => a + r() * (b - a);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- the Two.js stage ---------- */
const two = new Two({ type: Two.Types.svg, autostart: true, width: 10, height: 10 });
two.appendTo(stage);

let W = 800, H = 400;
const gyOf = () => H - 74;

const world   = new Two.Group();  // EVERYTHING lives here → wolf huff squashes it all
const panoG   = new Two.Group();  // camera: slides left by W on every journey step
const propsG  = new Two.Group();  // gameplay props (parallax-dragged while traveling)
const wolfG   = new Two.Group();
const heroG   = new Two.Group();
const heroIn  = new Two.Group();  // bob / rotation / squash target
const dizzyG  = new Two.Group();
const fxG     = new Two.Group();

/* Each scene slot is one "stretch" of the journey: sky + decor + its own
 * dressing props. A new LLM scene_seed draws into the OFF-screen slot at
 * +W, then the pano slides it in while the hero walks in place. */
function mkSceneSlot() {
  const g = new Two.Group();
  g._sky   = new Two.Group();
  g._decor = new Two.Group();
  g._props = new Two.Group();
  g._drift = [];                  // cloud groups inside this slot
  g.add([g._sky, g._decor, g._props]);
  panoG.add(g);
  return g;
}
const slotA = mkSceneSlot();
const slotB = mkSceneSlot();
let curSlot = slotA;              // on-screen scene
let nextSlot = slotB;             // incoming scene (off right)
nextSlot.position.x = W;          // parked off-stage right

world.add([panoG, propsG, wolfG, heroG, fxG]);
heroG.add(heroIn);
heroIn.add(dizzyG);
two.add(world);

/* non-uniform squash needs a Vector scale */
const worldScale = new Two.Vector(1, 1);
world.scale = worldScale;
const squash = { x: 1, y: 1 };
function applySquash() {
  worldScale.set(squash.x, squash.y);
  world.position.set(W * 0.5 * (1 - squash.x), gyOf() * (1 - squash.y));
}

/* ---------- tiny spring system (the "springy feel") ---------- */
const springs = new Set();
function spring(from, to, apply, o = {}) {
  const s = { x: from, v: 0, t: to, k: o.k ?? 0.09, d: o.d ?? 0.68,
              apply, done: o.done, delay: o.delay ?? 0, tag: o.tag };
  springs.add(s);
  apply(from);
  return s;
}
function killTag(tag) {
  for (const s of [...springs]) if (s.tag === tag) springs.delete(s);
}
function updateSprings(dtms) {
  for (const s of [...springs]) {
    if (s.delay > 0) { s.delay -= dtms; continue; }
    s.v += (s.t - s.x) * s.k;
    s.v *= s.d;
    s.x += s.v;
    s.apply(s.x);
    if (Math.abs(s.v) < 0.001 && Math.abs(s.t - s.x) < 0.001) {
      s.apply(s.t);
      springs.delete(s);
      if (s.done) s.done();
    }
  }
}

/* frame tween — cancellable by epoch (used for travel pans + gravity arcs) */
const easeIO = (k) => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function tween(dur, fn, ep) {
  return new Promise((res) => {
    let t0 = null;
    (function step(t) {
      if (ep !== undefined && ep !== epoch) return res(false);
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / dur);
      fn(k);
      if (k < 1) requestAnimationFrame(step);
      else res(true);
    })(performance.now());
  });
}

/* ---------- hand-drawn helper: N jittered stroke copies ---------- */
const boil = [];                     // paths that get the line-boil wobble
function anch(pts) { return pts.map((p) => new Two.Anchor(p[0], p[1])); }
function mkPath(pts, closed, curved) {
  return new Two.Path(anch(pts), !!closed, curved !== false);
}
function jitterPts(pts, j, r) {
  return pts.map((p) => [p[0] + (r() - 0.5) * 2 * j, p[1] + (r() - 0.5) * 2 * j]);
}
/* Draw pts as 1-3 sketchy copies. o:{stroke,lw,fill,closed,copies,j,rng,boil,opacity,curve} */
function sketch(parent, pts, o = {}) {
  const r = o.rng || Math.random;
  const copies = o.copies ?? 2, j = o.j ?? 1.7;
  const closed = !!o.closed || !!o.fill;
  if (o.fill) {
    const f = mkPath(jitterPts(pts, j * 0.6, r), true, o.curve !== false);
    f.fill = o.fill; f.noStroke();
    if (o.fillOpacity != null) f.opacity = o.fillOpacity;
    parent.add(f);
  }
  for (let i = 0; i < copies; i++) {
    const p = mkPath(jitterPts(pts, j, r), closed, o.curve !== false);
    p.noFill();
    p.stroke = o.stroke || INK;
    p.linewidth = (o.lw ?? 2.4) * (i === 0 ? 1 : rr(r, 0.55, 0.8));
    p.opacity = (o.opacity ?? 1) * (i === 0 ? 1 : rr(r, 0.35, 0.6));
    p.cap = 'round'; p.join = 'round';
    parent.add(p);
    if (o.boil) {
      p._b = p.vertices.map((v) => [v.x, v.y]);
      p._bj = (o.bj ?? 0.7);
      boil.push(p);
    }
  }
}
function emptyGroup(g) {
  for (const c of g.children.slice()) { g.remove(c); two.release(c); }
}
/* is p still wired into the live scene graph? (walks .parent to the root) */
function inScene(p) {
  let q = p, hops = 0;
  while (q && q.parent && hops++ < 30) q = q.parent;
  return q === two.scene || q === two.renderer;
}
function pruneBoil() {
  for (let i = boil.length - 1; i >= 0; i--) if (!inScene(boil[i])) boil.splice(i, 1);
}
function circlePts(cx, cy, rx, ry, n = 10, r) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const w = r ? rr(r, 0.92, 1.08) : 1;
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
  }
  return pts;
}
function arcPts(cx, cy, rx, ry, a0, a1, n = 8, r) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const w = r ? rr(r, 0.9, 1.1) : 1;
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
  }
  return pts;
}
function blobPts(cx, cy, rad, n, r, squashY = 1) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const w = rr(r, 0.82, 1.18);
    pts.push([cx + Math.cos(a) * rad * w, cy + Math.sin(a) * rad * w * squashY]);
  }
  return pts;
}

/* ============================================================
   PROCEDURAL SCENERY — rebuilt from every LLM scene_seed
   ============================================================ */
const PALETTES = {
  warm:  { sky: '#9FD9F2', sky2: '#E8F8FF', sun: '#FFC53D', rays: '#F0A428',
           hills: ['#B9DFAE', '#8FCE8F'], grass: '#6FC07C',
           tree: ['#58BC7B', '#4FB06D', '#7CC97F'], trunk: '#9A6A3B',
           cloud: '#FFFDF6', flower: ['#FF6B57', '#FFC53D', '#F58ACB', '#FFFDF6'] },
  cool:  { sky: '#A8D4E8', sky2: '#DDF0F8', sun: '#FFE08A', rays: '#EFC25D',
           hills: ['#9CC7B4', '#7FB5A4'], grass: '#69A98B',
           tree: ['#5FA98F', '#4E9A80', '#79BCA6'], trunk: '#8A6A4A',
           cloud: '#F4FAFC', flower: ['#7FB8E8', '#FFFDF6', '#B565D8'] },
  dusk:  { sky: '#E8998D', sky2: '#F8DDB0', sun: '#FF8E5E', rays: '#E86A4A',
           hills: ['#C98FA6', '#A97B9E'], grass: '#8FA06B',
           tree: ['#7C9A6B', '#6B8A5E', '#93AC7C'], trunk: '#7A5A3E',
           cloud: '#F4C9B0', flower: ['#FFC53D', '#FF6B57', '#FFFDF6'] },
  night: { sky: '#33406B', sky2: '#6B7AA8', sun: '#F4F0D8', rays: '#D8D4B8',
           hills: ['#3E5A54', '#4E6B62'], grass: '#4A665C',
           tree: ['#4E6B5E', '#44604F', '#5A7A68'], trunk: '#5A4A3E',
           cloud: '#7A88A8', flower: ['#B565D8', '#F4F0D8', '#7FB8E8'] },
};

function sketchTree(g, r, x, gy, s, pal) {
  sketch(g, [[x - 6 * s, gy + 8], [x - 6 * s, gy - 40 * s], [x + 6 * s, gy - 40 * s], [x + 6 * s, gy + 8]],
    { fill: pal.trunk, closed: true, rng: r, lw: 2.2 });
  for (let k = 0; k < 3; k++) {
    const a = (Math.PI * 2 * k) / 3 - Math.PI / 2;
    sketch(g, circlePts(x + Math.cos(a) * 15 * s, gy - 46 * s + Math.sin(a) * 13 * s, 15 * s, 14 * s, 9, r),
      { fill: pick(r, pal.tree), closed: true, rng: r, lw: 2.2, boil: true });
  }
  sketch(g, circlePts(x, gy - 58 * s, 17 * s, 15 * s, 9, r),
    { fill: pal.tree[1], closed: true, rng: r, lw: 2.4, boil: true });
}
function sketchFlower(g, r, x, gy, col) {
  const fy = gy + rr(r, 22, 46);
  sketch(g, [[x, fy], [x + rr(r, -3, 3), fy - 14]], { stroke: '#3E8F57', lw: 2, rng: r, copies: 1 });
  for (let p = 0; p < 5; p++) {
    const a = (Math.PI * 2 * p) / 5 - Math.PI / 2;
    sketch(g, circlePts(x + Math.cos(a) * 7, fy - 18 + Math.sin(a) * 7, 5.5, 5.5, 6, r),
      { fill: col, closed: true, rng: r, lw: 1.4, copies: 1 });
  }
  sketch(g, circlePts(x, fy - 18, 4, 4, 6, r), { fill: '#FFC53D', closed: true, rng: r, lw: 1.2, copies: 1 });
}
function sketchTuft(g, r, x, gy) {
  const fy = gy + rr(r, 18, 42);
  for (let p = -1; p <= 1; p++)
    sketch(g, [[x, fy], [x + p * 7 + rr(r, -2, 2), fy - rr(r, 9, 15)]],
      { stroke: '#3E8F57', lw: 1.8, rng: r, copies: 1 });
}
function sketchCloud(g, r, cx, cy, s, col) {
  const cl = new Two.Group();
  sketch(cl, blobPts(0, 0, 26 * s, 8, r, 0.6), { fill: col, closed: true, rng: r, lw: 2, boil: true });
  sketch(cl, circlePts(-18 * s, 8 * s, 18 * s, 13 * s, 8, r), { fill: col, closed: true, rng: r, lw: 1.8 });
  sketch(cl, circlePts(20 * s, 8 * s, 16 * s, 12 * s, 8, r), { fill: col, closed: true, rng: r, lw: 1.8 });
  cl.position.set(cx, cy);
  cl._drift = rr(r, 4, 9);            // px/sec
  g.add(cl);
  return cl;
}

let curScene = null;                 // last scene_seed (re-render on resize)

function renderScene(ss, slot) {
  if (ss) curScene = ss;
  if (!curScene) return;
  slot = slot || curSlot;
  const seed = curScene.seed | 0;
  const r = mulberry32(seed || 12345);
  const pal = PALETTES[curScene.palette] || PALETTES.warm;
  const biome = String(curScene.biome || 'meadow').toLowerCase();
  const gy = gyOf();
  const skyG = slot._sky, decorG = slot._decor, slotProps = slot._props;

  emptyGroup(skyG); emptyGroup(decorG); emptyGroup(slotProps);
  slot._drift.length = 0;
  /* drop this slot's old dressing props from the live list */
  for (let i = liveProps.length - 1; i >= 0; i--) {
    if (liveProps[i].slot === slot) liveProps.splice(i, 1);
  }
  pruneBoil();

  /* --- sky (gradient if we can, solid otherwise) --- */
  const sky = new Two.Rectangle(W / 2, (gy + 60) / 2, W + 4, gy + 60);
  try {
    sky.fill = new Two.LinearGradient(0, -gy / 2, 0, gy / 2 + 30,
      new Two.Stop(0, pal.sky), new Two.Stop(1, pal.sky2));
  } catch { sky.fill = pal.sky; }
  sky.noStroke();
  skyG.add(sky);

  /* --- sun or moon + rays --- */
  const sx = rr(r, 90, 180), sy = rr(r, 55, 85);
  sketch(skyG, circlePts(sx, sy, 30, 30, 10, r),
    { fill: pal.sun, closed: true, rng: r, lw: 3, boil: true });
  for (let i = 0; i < 9; i++) {
    const a = (Math.PI * 2 * i) / 9 + rr(r, -0.1, 0.1);
    sketch(skyG, [[sx + Math.cos(a) * 40, sy + Math.sin(a) * 40],
                  [sx + Math.cos(a) * rr(r, 48, 58), sy + Math.sin(a) * rr(r, 48, 58)]],
      { stroke: pal.rays, lw: 3, rng: r });
  }

  /* --- rolling hills, two layers --- */
  for (const [lift, col] of [[-30, pal.hills[0]], [-8, pal.hills[1]]]) {
    const pts = [[-30, gy + lift]];
    for (let i = 1; i <= 12; i++)
      pts.push([(W * i) / 12 + rr(r, -50, 50), gy + lift - rr(r, 14, 64)]);
    pts.push([W + 30, gy + lift], [W + 30, gy + 60], [-30, gy + 60]);
    sketch(skyG, pts, { fill: col, closed: true, rng: r, lw: 2, j: 2.4 });
  }

  /* --- grass band + stitched path --- */
  const gpts = [[-30, gy + 8]];
  for (let i = 1; i <= 18; i++) gpts.push([(W * i) / 18, gy + 8 + rr(r, -6, 6)]);
  gpts.push([W + 30, gy + 8], [W + 30, H + 30], [-30, H + 30]);
  sketch(decorG, gpts, { fill: pal.grass, closed: true, rng: r, lw: 2.2, j: 2 });

  const path = [];
  for (let i = 0; i <= 10; i++)
    path.push([(W * i) / 10, gy + 38 + Math.sin(i * 1.3) * 5 + rr(r, -3, 3)]);
  const pathP = mkPath(path, false, true);
  pathP.noFill(); pathP.stroke = '#EFDCAA'; pathP.linewidth = 18; pathP.cap = 'round';
  decorG.add(pathP);
  const dash = mkPath(jitterPts(path, 2, r), false, true);
  dash.noFill(); dash.stroke = '#B98A4F'; dash.linewidth = 2.2;
  dash.dashes = [9, 12]; dash.cap = 'round';
  decorG.add(dash);

  /* --- biome dressing --- */
  switch (true) {
    case /forest|wood/.test(biome): {
      for (let i = 0; i < 7; i++)
        sketchTree(decorG, r, rr(r, 40, W - 40), gy, rr(r, 0.75, 1.15), pal);
      for (let i = 0; i < 5; i++)
        r() < 0.5 ? sketchFlower(decorG, r, rr(r, 30, W - 30), gy, pick(r, pal.flower))
                  : sketchTuft(decorG, r, rr(r, 30, W - 30), gy);
      sketchCloud(skyG, r, rr(r, W * 0.4, W * 0.7), rr(r, 40, 70), rr(r, 0.8, 1.1), pal.cloud);
      break;
    }
    case /rain|drizzle/.test(biome): {
      for (let i = 0; i < 4; i++)
        sketchCloud(skyG, r, 90 + i * (W / 4) + rr(r, -20, 20), rr(r, 30, 60), rr(r, 0.9, 1.25), '#B9C4D4');
      for (let i = 0; i < 26; i++) {
        const x = rr(r, 20, W - 20), y = rr(r, 90, gy - 50);
        sketch(decorG, [[x, y], [x - 8, y + rr(r, 22, 34)]],
          { stroke: '#7FB8E8', lw: 2.2, rng: r, copies: 1 });
      }
      for (let i = 0; i < 3; i++)
        sketch(decorG, circlePts(rr(r, 60, W - 60), gy + 46, rr(r, 40, 60), 9, 8, r),
          { fill: '#8FD0F2', closed: true, rng: r, lw: 1.8 });
      for (let i = 0; i < 3; i++)
        sketchTree(decorG, r, rr(r, 40, W - 40), gy, rr(r, 0.7, 1), pal);
      break;
    }
    case /river|lake|stream|creek/.test(biome): {
      const water = new Two.Rectangle(W / 2, gy + 42, W + 4, 64);
      water.fill = '#7FC4EE'; water.noStroke();
      decorG.add(water);
      for (let i = 0; i < 7; i++) {
        const wx = 30 + i * (W / 7), wy = gy + 16 + (i % 2) * 12;
        sketch(decorG, [[wx, wy], [wx + 14, wy - 5], [wx + 30, wy], [wx + 44, wy - 4]],
          { stroke: '#C4E7FB', lw: 2.6, rng: r });
      }
      for (let i = 0; i < 4; i++)
        sketch(decorG, circlePts(rr(r, 60, W - 60), gy + 40 + rr(r, 0, 18), rr(r, 9, 15), 6, 7, r),
          { fill: '#B9AFA0', closed: true, rng: r, lw: 1.6 });
      for (let i = 0; i < 3; i++)
        sketch(decorG, circlePts(rr(r, 50, W - 50), gy + 26, 17, 6, 7, r),
          { fill: '#4FB06D', closed: true, rng: r, lw: 1.6 });
      sketchTree(decorG, r, rr(r, 30, 90), gy, rr(r, 0.8, 1.05), pal);
      sketchTree(decorG, r, rr(r, W - 90, W - 30), gy, rr(r, 0.8, 1.05), pal);
      break;
    }
    case /cave|tunnel|dark/.test(biome): {
      /* rocky ceiling band with stalactites */
      const ceil = [[-30, -30], [-30, 60]];
      for (let x = -30; x < W + 30;) { x += rr(r, 70, 130); ceil.push([Math.min(x, W + 30), rr(r, 30, 90)]); }
      ceil.push([W + 30, -30]);
      sketch(decorG, ceil, { fill: '#6E6478', closed: true, rng: r, lw: 2.6 });
      for (let i = 0; i < 5; i++) {
        const tx = rr(r, 60, W - 60), len = rr(r, 26, 52), top = rr(r, 44, 80);
        sketch(decorG, [[tx - 14, top], [tx + 16, top - 3], [tx + 2, top + len]],
          { fill: '#6E6478', closed: true, rng: r, lw: 2 });
      }
      for (let i = 0; i < 4; i++) {
        const px = rr(r, 50, W - 50), by = gy + rr(r, 22, 44), ps = rr(r, 0.7, 1.15);
        sketch(decorG, [[px - 12 * ps, by], [px - 7 * ps, by - 28 * ps], [px + 3 * ps, by - 38 * ps],
                        [px + 13 * ps, by - 14 * ps], [px + 11 * ps, by]],
          { fill: '#B565D8', closed: true, rng: r, lw: 2 });
      }
      for (let i = 0; i < 6; i++)
        sketch(decorG, circlePts(rr(r, 30, W - 30), gy + rr(r, 24, 50), rr(r, 4, 9), 4, 6, r),
          { fill: '#8D8498', closed: true, rng: r, lw: 1.4, copies: 1 });
      break;
    }
    case /village|town|house/.test(biome): {
      for (let i = 0; i < 3; i++) {
        const hx = 120 + i * (W / 3.2) + rr(r, -30, 30), hw = rr(r, 46, 60), hh = rr(r, 34, 46);
        const hy = gy - 6;
        sketch(decorG, [[hx - hw / 2, hy], [hx - hw / 2, hy - hh], [hx + hw / 2, hy - hh], [hx + hw / 2, hy]],
          { fill: i % 2 ? '#FFE3C4' : '#FFF1D6', closed: true, rng: r, lw: 2.2 });
        sketch(decorG, [[hx - hw / 2 - 8, hy - hh + 4], [hx, hy - hh - 22], [hx + hw / 2 + 8, hy - hh + 4]],
          { fill: '#FF6B57', closed: true, rng: r, lw: 2.2 });
        sketch(decorG, [[hx - 7, hy], [hx - 7, hy - 16], [hx + 7, hy - 16], [hx + 7, hy]],
          { fill: '#8A5E2E', closed: true, rng: r, lw: 1.8 });
      }
      for (let i = 0; i < 8; i++) {
        const fx = (W * i) / 8 + rr(r, -8, 8);
        sketch(decorG, [[fx, gy + 30], [fx, gy + 14]], { stroke: '#B98A4F', lw: 3, rng: r, copies: 1 });
        if (i) sketch(decorG, [[fx - W / 8 + 4, gy + 20], [fx - 4, gy + 20]],
          { stroke: '#B98A4F', lw: 2.4, rng: r, copies: 1 });
      }
      sketchCloud(skyG, r, rr(r, W * 0.3, W * 0.6), rr(r, 36, 64), rr(r, 0.8, 1.1), pal.cloud);
      break;
    }
    case /storm|thunder/.test(biome): {
      for (let i = 0; i < 4; i++)
        sketchCloud(skyG, r, 70 + i * (W / 3.6), rr(r, 28, 55), rr(r, 1, 1.4), '#8A93A8');
      const bx = rr(r, W * 0.3, W * 0.7);
      sketch(decorG, [[bx, 70], [bx - 16, 130], [bx + 2, 130], [bx - 20, 190]],
        { stroke: '#FFC53D', lw: 4, rng: r, boil: true });
      for (let i = 0; i < 18; i++) {
        const x = rr(r, 20, W - 20), y = rr(r, 110, gy - 40);
        sketch(decorG, [[x, y], [x - 9, y + rr(r, 24, 36)]],
          { stroke: '#7FB8E8', lw: 2.4, rng: r, copies: 1 });
      }
      for (let i = 0; i < 2; i++)
        sketchTree(decorG, r, rr(r, 40, W - 40), gy, rr(r, 0.7, 0.95), pal);
      break;
    }
    default: { /* meadow */
      for (let i = 0; i < 3; i++)
        sketchTree(decorG, r, rr(r, 50, W - 50), gy, rr(r, 0.8, 1.15), pal);
      for (let i = 0; i < 8; i++)
        r() < 0.55 ? sketchFlower(decorG, r, rr(r, 30, W - 30), gy, pick(r, pal.flower))
                  : sketchTuft(decorG, r, rr(r, 30, W - 30), gy);
      sketchCloud(skyG, r, rr(r, W * 0.4, W * 0.75), rr(r, 40, 70), rr(r, 0.9, 1.2), pal.cloud);
      sketchCloud(skyG, r, rr(r, W * 0.1, W * 0.3), rr(r, 60, 95), rr(r, 0.6, 0.9), pal.cloud);
      for (let i = 0; i < 4; i++) {   /* tiny ink birds */
        const bx = rr(r, 140, W - 160), by = rr(r, 40, 90);
        sketch(skyG, arcPts(bx - 6, by, 8, 6, Math.PI * 1.1, Math.PI * 1.9, 4, r), { rng: r, lw: 1.7, copies: 1 });
        sketch(skyG, arcPts(bx + 6, by, 8, 6, Math.PI * 1.1, Math.PI * 1.9, 4, r), { rng: r, lw: 1.7, copies: 1 });
      }
    }
  }

  /* --- scene_seed.props[]: dressing pops in with the pan, rides the slot --- */
  const dressings = (curScene.props || []).slice(0, 6);
  dressings.forEach((kind, i) => {
    const x = 0.12 + ((i + 0.5) / dressings.length) * 0.76 + rr(r, -0.04, 0.04);
    const d = spawnProp(kind, clamp(x, 0.06, 0.94),
      { quiet: true, rng: r, parent: slotProps });
    d.dressing = true; d.slot = slot;
  });

  /* track drifting clouds (per slot so both can drift mid-pan) */
  skyG.children.forEach((c) => { if (c._drift) slot._drift.push(c); });
}

/* ============================================================
   FORWARD TRAVEL — each accepted turn pans the world one screen
   to the left while the hero walks in place, so the new
   scene_seed reads as "the next stretch of the journey".
   ============================================================ */
let panning = false;
let panSeq = 0;                     // bumps kill any in-flight pan tween
const PAN_DRAG = 0.42;              // fraction of a screen old props trail behind

/* land the pan: bake translations, swap slots, cull off-screen props.
 * Idempotent — a resize/stop may snap-land while the tween is still queued. */
function landPan() {
  if (!panning) return;
  panSeq++;                         // stop the pan tween writing positions
  panoG.position.x = 0;
  propsG.position.x = 0;
  /* the old stretch is fully off-screen — empty it and park it right */
  emptyGroup(curSlot._sky); emptyGroup(curSlot._decor); emptyGroup(curSlot._props);
  curSlot._drift.length = 0;
  for (let i = liveProps.length - 1; i >= 0; i--) {
    if (liveProps[i].slot === curSlot) liveProps.splice(i, 1);
  }
  /* gameplay props stayed at their world spot → they trail left */
  for (let i = liveProps.length - 1; i >= 0; i--) {
    const p = liveProps[i];
    if (p.slot) continue;           // slot dressing rides its own scene
    p.xFrac -= PAN_DRAG;
    if (p.xFrac <= 0.045) {         // walked out of the story — let it go
      liveProps.splice(i, 1);
      p.parent.remove(p.g); two.release(p.g);
    } else {
      p.g.position.x = p.xFrac * W;
    }
  }
  const old = curSlot; curSlot = nextSlot; nextSlot = old;
  curSlot.position.x = 0;
  nextSlot.position.x = W;
  heroWalking = false;
  panning = false;
  pruneBoil();
}

function travelTo(ss, ep) {
  const my = ++panSeq;
  nextSlot.position.x = W;
  renderScene(ss, nextSlot);        // draw the new stretch off-screen right
  panning = true;
  heroWalking = true;               // hero marches while the world scrolls
  return tween(1050, (k) => {
    if (my !== panSeq) return;
    const x = -W * easeIO(k);
    panoG.position.x = x;
    propsG.position.x = x * PAN_DRAG;   // parallax: props slide less = "left behind"
  }, ep).then(() => { if (my === panSeq) landPan(); });
}

/* ============================================================
   PROP LIBRARY — every kind becomes real two.Path shapes
   ============================================================ */
function S(g, pts, o) { sketch(g, pts, o); }

const PROP_BUILDERS = {
  unicorn(g, r) {
    S(g, blobPts(0, -34, 30, 9, r, 0.75), { fill: '#FFFDF6', closed: true, rng: r, lw: 2.6, boil: true });
    for (const lx of [-18, -6, 8, 20])
      S(g, [[lx, -18], [lx + rr(r, -2, 2), -2]], { lw: 5, rng: r, stroke: '#FFFDF6' });
    S(g, circlePts(-30, -56, 13, 15, 8, r), { fill: '#FFFDF6', closed: true, rng: r, lw: 2.4 });
    S(g, [[-34, -70], [-38, -88], [-30, -72]], { fill: '#FFC53D', closed: true, rng: r, lw: 2.2 });
    S(g, [[-26, -66], [-14, -52], [-20, -44], [-8, -34]], { stroke: '#B565D8', lw: 4, rng: r, boil: true });
    S(g, [[28, -44], [40, -34], [34, -22]], { stroke: '#B565D8', lw: 3.4, rng: r });
    S(g, circlePts(-33, -58, 2.6, 2.6, 6), { fill: INK, closed: true, rng: r, lw: 1.4, copies: 1 });
  },
  banana(g, r) {
    S(g, arcPts(0, -34, 30, 30, Math.PI * 0.15, Math.PI * 0.85, 9, r)
        .concat(arcPts(0, -34, 18, 18, Math.PI * 0.85, Math.PI * 0.15, 9, r)),
      { fill: '#FFC53D', closed: true, rng: r, lw: 2.6, boil: true });
    S(g, [[-26, -50], [-30, -58]], { stroke: '#8A5E2E', lw: 3.4, rng: r });
    S(g, [[26, -50], [30, -58]], { stroke: '#8A5E2E', lw: 3.4, rng: r });
  },
  bridge(g, r) {
    S(g, arcPts(0, 4, 52, 40, Math.PI, Math.PI * 2, 10, r), { lw: 4.5, rng: r, stroke: '#8A5E2E', boil: true });
    for (let i = -3; i <= 3; i++) {
      const px = i * 14;
      S(g, [[px - 6, -30 - Math.abs(i) * -4 - 8], [px + 6, -30 - Math.abs(i) * -4 - 8],
            [px + 6, -18 - Math.abs(i) * -4 - 8], [px - 6, -18 - Math.abs(i) * -4 - 8]],
        { fill: '#B98A4F', closed: true, rng: r, lw: 1.8, copies: 1 });
    }
    S(g, [[-52, -4], [-52, -34]], { stroke: '#8A5E2E', lw: 4, rng: r });
    S(g, [[52, -4], [52, -34]], { stroke: '#8A5E2E', lw: 4, rng: r });
  },
  straw(g, r) {
    S(g, blobPts(0, -22, 26, 9, r, 0.95), { fill: '#F0D878', closed: true, rng: r, lw: 2.4, boil: true });
    for (let i = 0; i < 9; i++) {
      const a = rr(r, -0.9, 0.9);
      S(g, [[Math.cos(a) * 8 - 6, -10], [Math.cos(a) * 26, -22 - Math.abs(Math.sin(a)) * 16]],
        { stroke: '#D8B84A', lw: 2, rng: r, copies: 1 });
    }
    S(g, [[-16, -22], [16, -24]], { stroke: '#B5653D', lw: 3, rng: r });
  },
  sticks(g, r) {
    for (let i = 0; i < 5; i++) {
      const y = -8 - i * 9;
      S(g, [[-26 + rr(r, -4, 4), y], [26 + rr(r, -4, 4), y + rr(r, -5, 5)]],
        { stroke: '#9A6A3B', lw: 5.5, rng: r, boil: i === 2 });
    }
    S(g, [[-4, -52], [2, -62]], { stroke: '#9A6A3B', lw: 4, rng: r });
    S(g, circlePts(6, -64, 6, 8, 6, r), { fill: '#4FB06D', closed: true, rng: r, lw: 1.6 });
  },
  bricks(g, r) {
    S(g, [[-30, 0], [-30, -34], [30, -34], [30, 0]],
      { fill: '#E8734F', closed: true, rng: r, lw: 2.6, boil: true });
    for (let i = 1; i < 3; i++)
      S(g, [[-30, -34 * i / 3], [30, -34 * i / 3 + rr(r, -1.5, 1.5)]], { stroke: '#B8512E', lw: 1.8, rng: r, copies: 1 });
    for (const [x0, x1] of [[-10, 12]])
      for (let i = 0; i < 3; i++)
        S(g, [[x0 + i * 2, -34 * (i + 0.5) / 3.4], [x0 + i * 2, -34 * (i + 1) / 3.4]],
          { stroke: '#B8512E', lw: 1.6, rng: r, copies: 1 });
  },
  house(g, r, brick) {
    const wallC = brick ? '#E8734F' : '#FFF1D6';
    S(g, [[-34, 0], [-34, -40], [34, -40], [34, 0]], { fill: wallC, closed: true, rng: r, lw: 2.6, boil: true });
    S(g, [[-42, -38], [0, -66], [42, -38]], { fill: brick ? '#8A5E2E' : '#FF6B57', closed: true, rng: r, lw: 2.6 });
    S(g, [[-9, 0], [-9, -20], [9, -20], [9, 0]], { fill: '#8A5E2E', closed: true, rng: r, lw: 2.2 });
    S(g, circlePts(-20, -28, 6, 6, 6, r), { fill: '#BFE8F7', closed: true, rng: r, lw: 1.8 });
    if (brick) {
      for (let i = 1; i < 3; i++)
        S(g, [[-34, -40 * i / 3], [34, -40 * i / 3 + rr(r, -1.5, 1.5)]], { stroke: '#B8512E', lw: 1.6, rng: r, copies: 1 });
      S(g, [[20, -66], [20, -82], [28, -82], [28, -62]], { fill: '#B9AFA0', closed: true, rng: r, lw: 2 });
      S(g, [[24, -84], [22, -92], [26, -96]], { stroke: '#C9C9D4', lw: 3, rng: r });
    }
  },
  wolfmini(g, r) { buildWolfInto(g, r); },
  flower(g, r) { sketchFlower(g, r, 0, -50, pick(r, ['#FF6B57', '#F58ACB', '#FFC53D'])); },
  tree(g, r) { sketchTree(g, r, 0, 0, 0.9, PALETTES.warm); },
  rock(g, r) {
    S(g, blobPts(0, -14, 22, 8, r, 0.75), { fill: '#B9AFA0', closed: true, rng: r, lw: 2.4, boil: true });
    S(g, [[-10, -20], [-2, -26]], { stroke: '#8D8498', lw: 1.8, rng: r, copies: 1 });
  },
  star(g, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 5, rad = i % 2 ? 11 : 24;
      pts.push([Math.cos(a) * rad, -26 + Math.sin(a) * rad]);
    }
    S(g, pts, { fill: '#FFC53D', closed: true, rng: r, lw: 2.4, boil: true });
  },
  cloud(g, r) { sketchCloud(g, r, 0, -60, 0.9, '#FFFDF6'); },
  balloon(g, r) {
    S(g, circlePts(0, -62, 20, 24, 9, r), { fill: '#FF6B57', closed: true, rng: r, lw: 2.4, boil: true });
    S(g, [[0, -38], [-4, -22], [3, -10], [0, -2]], { lw: 1.8, rng: r });
    S(g, [[-5, -38], [5, -38], [0, -33]], { fill: '#E84A3A', closed: true, rng: r, lw: 1.6, copies: 1 });
  },
  kite(g, r) {
    S(g, [[0, -78], [16, -58], [0, -36], [-16, -58]], { fill: '#5DA9E9', closed: true, rng: r, lw: 2.4, boil: true });
    S(g, [[0, -78], [0, -36]], { lw: 1.6, rng: r, copies: 1 });
    S(g, [[-16, -58], [16, -58]], { lw: 1.6, rng: r, copies: 1 });
    S(g, [[0, -36], [-5, -22], [4, -12], [0, -4]], { lw: 1.8, rng: r });
  },
  cookie(g, r) {
    S(g, circlePts(0, -26, 22, 21, 10, r), { fill: '#D8A15E', closed: true, rng: r, lw: 2.6, boil: true });
    for (const [cx, cy] of [[-8, -32], [6, -36], [-2, -20], [10, -24]])
      S(g, circlePts(cx, cy, 3.4, 3.4, 5, r), { fill: '#6B4A2A', closed: true, rng: r, lw: 1.2, copies: 1 });
    S(g, arcPts(8, -46, 14, 14, -0.6, 0.8, 5, r), { stroke: '#FFF8EC', lw: 5, rng: r });
  },
  mushroom(g, r) {
    S(g, [[-8, 0], [-8, -18], [8, -18], [8, 0]], { fill: '#FFF1D6', closed: true, rng: r, lw: 2.2 });
    S(g, arcPts(0, -16, 28, 24, Math.PI, Math.PI * 2, 9, r), { fill: '#FF6B57', closed: true, rng: r, lw: 2.4, boil: true });
    for (const [cx, cy, cr] of [[-12, -30, 4], [4, -38, 5], [14, -28, 3.4]])
      S(g, circlePts(cx, cy, cr, cr, 6, r), { fill: '#FFFDF6', closed: true, rng: r, lw: 1.2, copies: 1 });
  },
  log(g, r) {
    S(g, [[-30, -16], [30, -16], [30, -2], [-30, -2]], { fill: '#9A6A3B', closed: true, rng: r, lw: 2.4, boil: true });
    S(g, circlePts(-30, -9, 5, 7, 7, r), { fill: '#C9A56E', closed: true, rng: r, lw: 2 });
    S(g, circlePts(-30, -9, 2.4, 3.4, 6, r), { stroke: '#8A5E2E', closed: true, rng: r, lw: 1.4, copies: 1 });
  },
  boat(g, r) {
    S(g, [[-32, -18], [32, -18], [20, 0], [-20, 0]], { fill: '#B98A4F', closed: true, rng: r, lw: 2.4, boil: true });
    S(g, [[0, -18], [0, -52]], { stroke: '#8A5E2E', lw: 3, rng: r });
    S(g, [[0, -50], [20, -40], [0, -28]], { fill: '#FFFDF6', closed: true, rng: r, lw: 2 });
  },
  torch(g, r) {
    S(g, [[-4, 0], [-4, -30], [4, -30], [4, 0]], { fill: '#8A5E2E', closed: true, rng: r, lw: 2 });
    S(g, blobPts(0, -44, 12, 8, r, 1.25), { fill: '#FF9E57', closed: true, rng: r, lw: 2, boil: true });
    S(g, blobPts(0, -42, 6, 6, r, 1.2), { fill: '#FFC53D', closed: true, rng: r, lw: 1.4, copies: 1 });
  },
  key(g, r) {
    S(g, circlePts(-12, -40, 10, 10, 8, r), { stroke: '#FFC53D', lw: 4.5, rng: r, boil: true });
    S(g, [[-4, -34], [22, -8]], { stroke: '#FFC53D', lw: 4.5, rng: r });
    S(g, [[14, -16], [22, -16]], { stroke: '#FFC53D', lw: 4, rng: r, copies: 1 });
    S(g, [[18, -12], [26, -12]], { stroke: '#FFC53D', lw: 4, rng: r, copies: 1 });
  },
  door(g, r) {
    S(g, [[-16, 0], [-16, -44], [16, -44], [16, 0]], { fill: '#8A5E2E', closed: true, rng: r, lw: 2.6, boil: true });
    S(g, circlePts(9, -22, 3, 3, 6, r), { fill: '#FFC53D', closed: true, rng: r, lw: 1.4, copies: 1 });
    S(g, [[-20, -44], [20, -44], [20, -50], [-20, -50]], { fill: '#6B4A2A', closed: true, rng: r, lw: 2 });
  },
  chest(g, r) {
    S(g, [[-24, -8], [-24, -26], [24, -26], [24, -8]], { fill: '#9A6A3B', closed: true, rng: r, lw: 2.4 });
    S(g, arcPts(0, -26, 24, 16, Math.PI, Math.PI * 2, 8, r), { fill: '#B98A4F', closed: true, rng: r, lw: 2.4, boil: true });
    S(g, [[-24, -20], [24, -20]], { stroke: '#6B4A2A', lw: 1.8, rng: r, copies: 1 });
    S(g, [[-4, -24], [4, -24], [4, -16], [-4, -16]], { fill: '#FFC53D', closed: true, rng: r, lw: 1.8 });
  },
  ladder(g, r) {
    S(g, [[-14, 0], [-14, -64]], { stroke: '#9A6A3B', lw: 4.5, rng: r });
    S(g, [[14, 0], [14, -64]], { stroke: '#9A6A3B', lw: 4.5, rng: r });
    for (let i = 1; i <= 4; i++)
      S(g, [[-14, -64 + i * 13], [14, -64 + i * 13]], { stroke: '#B98A4F', lw: 3.6, rng: r, copies: 1 });
  },
  trampoline(g, r) {
    S(g, circlePts(0, -18, 34, 11, 10, r), { fill: '#5DA9E9', closed: true, rng: r, lw: 2.6, boil: true });
    for (const lx of [-24, 0, 24])
      S(g, [[lx, -10], [lx + rr(r, -3, 3), 0]], { lw: 3.4, rng: r });
  },
  puddle(g, r) {
    S(g, circlePts(0, -4, 30, 9, 10, r), { fill: '#8FD0F2', closed: true, rng: r, lw: 2, boil: true });
    S(g, [[-14, -6], [-4, -8]], { stroke: '#C4E7FB', lw: 2.4, rng: r, copies: 1 });
  },
  rainbow(g, r) {
    const cols = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9'];
    cols.forEach((c, i) => {
      S(g, arcPts(0, 0, 44 - i * 9, 52 - i * 9, Math.PI, Math.PI * 2, 10, r),
        { stroke: c, lw: 7, rng: r, copies: 1, boil: i === 0 });
    });
  },
  piglet(g, r) {
    S(g, blobPts(0, -22, 24, 9, r, 0.78), { fill: '#F5A0B5', closed: true, rng: r, lw: 2.4, boil: true });
    S(g, circlePts(-22, -32, 10, 10, 8, r), { fill: '#F5A0B5', closed: true, rng: r, lw: 2.2 });
    S(g, circlePts(-27, -32, 4.5, 4, 6, r), { fill: '#E87A95', closed: true, rng: r, lw: 1.6 });
    S(g, circlePts(-24, -36, 1.6, 1.6, 5), { fill: INK, closed: true, rng: r, lw: 1, copies: 1 });
    S(g, [[22, -24], [30, -30], [27, -34]], { stroke: '#E87A95', lw: 2.6, rng: r });
    for (const lx of [-14, 8])
      S(g, [[lx, -8], [lx, 0]], { stroke: '#E87A95', lw: 4, rng: r });
  },
  leaf(g, r) {
    S(g, [[0, 0], [14, -18], [10, -38], [-8, -26]], { fill: '#4FB06D', closed: true, rng: r, lw: 2, boil: true });
    S(g, [[0, -2], [2, -30]], { stroke: '#3E8F57', lw: 1.6, rng: r, copies: 1 });
  },
  doodad(g, r, word) {   /* unknown word → a labeled doodle crate, never skipped */
    S(g, [[-26, -38], [26, -38], [24, -2], [-24, -2]],
      { fill: '#E8C89A', closed: true, rng: r, lw: 2.6, boil: true });
    S(g, [[-26, -38], [0, -46], [26, -38]], { stroke: '#B98A4F', lw: 2.2, rng: r });
    S(g, [[-26, -20], [24, -20]], { stroke: '#B98A4F', lw: 1.8, rng: r, copies: 1 });
    /* little flag tag carrying the kid's actual word */
    S(g, [[0, -44], [0, -62]], { lw: 2.6, rng: r });
    S(g, [[0, -62], [26, -62], [26, -48], [0, -48]],
      { fill: '#FFF1D6', closed: true, rng: r, lw: 2 });
    const label = String(word || 'thing').slice(0, 14);
    const t = new Two.Text(label, 13, -50, {
      size: 11, fill: INK, weight: 700, family: 'Patrick Hand, cursive',
      alignment: 'center', baseline: 'middle',
    });
    g.add(t);
    S(g, circlePts(-9, -28, 2.4, 2.4, 5), { fill: INK, closed: true, rng: r, lw: 1, copies: 1 });
    S(g, circlePts(9, -28, 2.4, 2.4, 5), { fill: INK, closed: true, rng: r, lw: 1, copies: 1 });
    S(g, arcPts(0, -14, 7, 5, Math.PI * 1.15, Math.PI * 1.85, 5, r), { lw: 1.8, rng: r, copies: 1 });
  },
};

const PROP_RULES = [
  [/unicorn|pony|horse|pegasus/, 'unicorn'],
  [/banana|peel/, 'banana'],
  [/bridge|plank/, 'bridge'],
  [/straw|hay|haystack/, 'straw'],
  [/stick|twig|wood(?!en house)/, 'sticks'],
  [/brick/, 'bricks'],
  [/wolf/, 'wolfmini'],
  [/house|cottage|home|shelter/, 'house'],
  [/flower|daisy|tulip/, 'flower'],
  [/tree|bush/, 'tree'],
  [/rock|boulder|stone/, 'rock'],
  [/star/, 'star'],
  [/cloud/, 'cloud'],
  [/balloon/, 'balloon'],
  [/kite/, 'kite'],
  [/cookie|treat|snack|biscuit/, 'cookie'],
  [/mushroom|toadstool/, 'mushroom'],
  [/log/, 'log'],
  [/boat|raft|canoe|ship|sail/, 'boat'],
  [/torch|lantern|light|firefly|candle/, 'torch'],
  [/key/, 'key'],
  [/door/, 'door'],
  [/chest|treasure|gift|present/, 'chest'],
  [/ladder/, 'ladder'],
  [/trampoline|bounce/, 'trampoline'],
  [/puddle|mud|water|river|pond/, 'puddle'],
  [/rainbow/, 'rainbow'],
  [/pig/, 'piglet'],
  [/leaf|leaves/, 'leaf'],
];
const RIDEABLE = /unicorn|horse|pony|pegasus|dragon|bike|scooter|dolphin|whale/i;
const SLIPPERY = /banana|peel|slime|mud|puddle|ice|soap|jelly|toaster|fridge|sock|butter/i;
/* words that are actions/manners, not things — these don't spawn props */
const ACTIONY = new Set(('run walk go come jump hide wait look see watch sing dance ' +
  'sleep nap rest help build swim climb push pull dig knock hug shout yell cry laugh ' +
  'giggle hurry sneak tiptoe listen think smile wave point grab carry fetch chase follow ' +
  'enter exit stop sit stand eat drink play read draw paint wash clean fix open close ' +
  'lock unlock turn spin roll slide bounce fly float swing drive ride hop skip crawl ' +
  'march stomp whisper talk say ask tell wish dream inside outside up down away back ' +
  'together again fast slow quick quietly softly gently loudly tight cozy warm the a ' +
  'an to in on at of and or but with for').split(' '));
function isThingy(w) {
  return !w.split(/\s+/).every(x => ACTIONY.has(x));
}

function propKindOf(kind) {
  const w = String(kind).toLowerCase();
  if (/brick/.test(w) && /house|home|cottage/.test(w)) return 'brickhouse';
  for (const [re, name] of PROP_RULES) if (re.test(w)) return name;
  return 'doodad';
}

const liveProps = [];   // {kind, g, xFrac}
let propSeq = 0;

const FLOATY = /balloon|kite|cloud|bird|butterfl|leaf|feather|bubble|ghost|fairy/i;

function spawnProp(kind, xFrac, o = {}) {
  const w = String(kind).toLowerCase();
  const pkind = propKindOf(w);
  const seed = ((xFrac * 9973) | 0) ^ (propSeq++ * 131) ^ ((curScene?.seed | 0) || 7);
  const r = o.rng || mulberry32(seed || 1);
  const g = new Two.Group();
  const scaleBase = o.quiet ? rr(r, 0.55, 0.72) : rr(r, 0.95, 1.15);
  if (pkind === 'brickhouse') PROP_BUILDERS.house(g, r, true);
  else (PROP_BUILDERS[pkind] || PROP_BUILDERS.doodad)(g, r, w);
  const gy = gyOf();
  const px = clamp(xFrac, 0.05, 0.95) * W;
  const baseY = gy + (pkind === 'puddle' ? 10 : 0);
  const parent = o.parent || propsG;
  g.position.set(px, baseY);
  g.scale = 0.001;
  parent.add(g);
  const rec = { kind: w, pkind, g, parent, xFrac, baseY, drop: 0, bobT: Math.random() * 7,
                floaty: FLOATY.test(w), rideable: RIDEABLE.test(w), slippery: SLIPPERY.test(w) };
  liveProps.push(rec);
  /* springy pop-in with overshoot */
  spring(0.001, scaleBase, (v) => { g.scale = Math.max(0.001, v); },
    { k: 0.16, d: 0.55, delay: o.delay ?? 0 });
  if (!o.quiet) {
    /* falls from above → one small bounce → settles on the ground line */
    rec.drop = -rr(r, 70, 110);
    spring(rec.drop, 0, (v) => { rec.drop = v; }, { k: 0.12, d: 0.58 });
  }
  return rec;
}
function removeProp(kind) {
  const i = liveProps.findIndex((p) => p.kind === kind || p.pkind === propKindOf(kind));
  if (i < 0) return;
  const [rec] = liveProps.splice(i, 1);
  spring(rec.g.scale, 0.001, (v) => { rec.g.scale = Math.max(0.001, v); }, {
    k: 0.18, d: 0.7,
    done: () => { rec.parent.remove(rec.g); two.release(rec.g); },
  });
}
function reactProp(kind) {
  const rec = liveProps.find((p) => p.kind === kind || p.pkind === propKindOf(kind));
  if (!rec) { spawnProp(kind, 0.5); return; }
  spring(-0.35, 0, (v) => { rec.g.rotation = v; }, { k: 0.2, d: 0.45 });
}

/* ============================================================
   THE WOLF — creeps in from the right; huffs squash the world
   ============================================================ */
let wolf = { meter: 0, xFrac: 1 };
function buildWolfInto(g, r) {
  S(g, blobPts(0, -30, 26, 9, r, 0.95), { fill: '#8C93A0', closed: true, rng: r, lw: 2.6, boil: true });
  S(g, blobPts(-24, -52, 17, 8, r, 1), { fill: '#8C93A0', closed: true, rng: r, lw: 2.4 });
  S(g, [[-38, -56], [-52, -54], [-40, -48]], { fill: '#8C93A0', closed: true, rng: r, lw: 2.2 });  // snout
  S(g, [[-34, -66], [-30, -78], [-24, -66]], { fill: '#8C93A0', closed: true, rng: r, lw: 2 });     // ear
  S(g, [[-18, -64], [-14, -74], [-8, -62]], { fill: '#8C93A0', closed: true, rng: r, lw: 2 });      // ear
  S(g, circlePts(-30, -56, 2.6, 3.4, 6), { fill: INK, closed: true, rng: r, lw: 1.2, copies: 1 });  // eye
  S(g, circlePts(-50, -53, 3.4, 3, 6, r), { fill: INK, closed: true, rng: r, lw: 1.2, copies: 1 }); // nose
  S(g, [[24, -36], [38, -30], [32, -20]], { stroke: '#8C93A0', lw: 4.5, rng: r });                  // tail
  for (const lx of [-12, 10])
    S(g, [[lx, -10], [lx, 0]], { stroke: '#8C93A0', lw: 5, rng: r });
}
function buildWolf() {
  const r = mulberry32(4242);
  buildWolfInto(wolfG, r);
  wolfG.scale = 1.25;
  placeWolf(1);
}
function placeWolf(scaleIn) {
  const px = W + 80 - wolf.meter * (W * 0.28 + 60);
  wolfG.position.set(px, gyOf() + 2);
}
function setWolfMeter(v) {
  wolf.meter = clamp(v, 0, 1);
  const segs = wolfMeter.querySelectorAll('i');
  const on = Math.round(wolf.meter * segs.length);
  segs.forEach((el, i) => {
    el.classList.toggle('on', i < on);
    el.classList.toggle('hot', i < on && wolf.meter > 0.72);
  });
  const target = W + 80 - wolf.meter * (W * 0.28 + 60);
  const cur = wolfG.position.x || target;
  killTag('wolfx');
  spring(cur, target, (x) => { wolfG.position.x = x; }, { k: 0.08, d: 0.6, tag: 'wolfx' });
}

/* huff & puff → whole-world squash & stretch + puff clouds */
function puffCloud(x, y, dir) {
  const r = mulberry32((Math.random() * 1e6) | 0);
  const c = new Two.Group();
  sketch(c, blobPts(0, 0, 14, 7, r, 0.7), { fill: '#FFFDF6', closed: true, rng: r, lw: 1.8 });
  c.position.set(x, y);
  c.scale = 0.3;
  fxG.add(c);
  spring(0.3, 1.1, (v) => { c.scale = v; }, { k: 0.12, d: 0.7 });
  spring(x, x + dir * rr(r, 140, 240), (v) => { c.position.x = v; },
    { k: 0.05, d: 0.85, done: () => { fxG.remove(c); two.release(c); } });
  spring(1, 0, (v) => { c.opacity = v; }, { k: 0.06, d: 0.9, delay: 500 });
}
let huffCount = 0;
function huff(times = 1) {
  const seq = Math.min(3, times);
  for (let i = 0; i < seq; i++) {
    setTimeout(() => {
      squash.x = 1.16; squash.y = 0.78; applySquash();
      const wx = wolfG.position.x - 60, wy = gyOf() - 70;
      puffCloud(wx, wy, -1);
      puffCloud(wx - 10, wy - 16, -1);
      setTimeout(() => { squash.x = 0.9; squash.y = 1.1; applySquash(); }, 130);
      setTimeout(() => {
        killTag('sqx'); killTag('sqy');
        spring(squash.x, 1, (v) => { squash.x = v; applySquash(); }, { k: 0.1, d: 0.5, tag: 'sqx' });
        spring(squash.y, 1, (v) => { squash.y = v; applySquash(); }, { k: 0.1, d: 0.5, tag: 'sqy' });
      }, 240);
    }, i * 420);
  }
  /* wolf chest puffs */
  spring(1.25, 1.45, (v) => { wolfG.scale = v; }, { k: 0.2, d: 0.4 });
  setTimeout(() => spring(wolfG.scale, 1.25, (v) => { wolfG.scale = v; }, { k: 0.2, d: 0.5 }), 350);
  huffCount++;
}

/* ============================================================
   HERO — kid strokes replayed as two.Path, draw-on + bounce
   ============================================================ */
const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
let strokes = [];           // {c, w, pts, closed}
let curStroke = null;
let selColor = CRAYONS[1];
let mctx = null, makerBusy = false;
let heroDesc = '';

function sizeMaker() {
  const wpx = makerCv.clientWidth || 420;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  makerCv.width = wpx * dpr; makerCv.height = 240 * dpr;
  mctx = makerCv.getContext('2d');
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderMaker();
}
function renderMaker() {
  if (!mctx) return;
  mctx.clearRect(0, 0, makerCv.clientWidth, 240);
  mctx.lineCap = mctx.lineJoin = 'round';
  const all = curStroke ? strokes.concat([curStroke]) : strokes;
  for (const st of all) {
    mctx.strokeStyle = st.c; mctx.lineWidth = st.w; mctx.globalAlpha = 0.92;
    mctx.beginPath();
    st.pts.forEach(([x, y], i) => i ? mctx.lineTo(x, y) : mctx.moveTo(x, y));
    if (st.closed && st.pts.length > 2) mctx.closePath();
    mctx.stroke();
  }
  mctx.globalAlpha = 1;
}
function makerPos(e) {
  const b = makerCv.getBoundingClientRect();
  return [e.clientX - b.left, e.clientY - b.top];
}

/* surprise hero: programmatic strokes so they replay as two.Path too */
function surpriseStrokes() {
  const w = makerCv.clientWidth || 420, h = 240;
  const r = mulberry32(((Math.random() * 0x7ffffffe) | 0) + 7);
  const c = pick(r, [CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
  const lite = { '#FF6B57': '#FFC9BF', '#4FB06D': '#B7E6C3', '#5DA9E9': '#C7E6FA', '#B565D8': '#DCC3F2' }[c];
  const cx = w / 2, cy = h / 2 + 16;
  const bw = rr(r, 110, 140), bh = rr(r, 96, 118);
  const st = [];
  st.push({ c, w: 11, closed: true, pts: circlePts(cx, cy, bw / 2, bh / 2, 14, r) });
  st.push({ c, w: 7, pts: [[cx, cy - bh / 2 + 6], [cx - 7, cy - bh / 2 - 16], [cx + 5, cy - bh / 2 - 28]] });
  st.push({ c: '#FFC53D', w: 7, closed: true, pts: circlePts(cx + 5, cy - bh / 2 - 32, 7, 7, 7, r) });
  st.push({ c: INK, w: 6, closed: true, pts: circlePts(cx - bw * 0.18, cy - bh * 0.16, 12, 14, 8, r) });
  st.push({ c: INK, w: 5, closed: true, pts: circlePts(cx + bw * 0.22, cy - bh * 0.12, 8.5, 10, 8, r) });
  st.push({ c: lite, w: 8, closed: true, pts: circlePts(cx + 2, cy + bh * 0.2, bw * 0.24, bh * 0.18, 9, r) });
  st.push({ c: INK, w: 4.5, pts: arcPts(cx + 2, cy + 2, bw * 0.2, bh * 0.14, Math.PI * 0.18, Math.PI * 0.82, 7, r) });
  st.push({ c: '#FF6B57', w: 6, closed: true, pts: circlePts(cx - bw * 0.4, cy + 2, 4.5, 4.5, 6, r) });
  st.push({ c: '#FF6B57', w: 6, closed: true, pts: circlePts(cx + bw * 0.42, cy + 4, 3.8, 3.8, 6, r) });
  st.push({ c: '#6B4A2A', w: 7, closed: true, pts: circlePts(cx - bw * 0.26, cy + bh * 0.47, bw * 0.15, 7, 7, r) });
  st.push({ c: '#6B4A2A', w: 7, closed: true, pts: circlePts(cx + bw * 0.26, cy + bh * 0.47, bw * 0.15, 7, 7, r) });
  return st;
}
async function surpriseMe(fast) {
  if (makerBusy) return;
  makerBusy = true;
  const ep = epoch;                 /* Stop / reset abandons the paint-in */
  strokes = [];
  renderMaker();
  for (const st of surpriseStrokes()) {
    if (ep !== epoch) break;
    strokes.push(st);
    renderMaker();
    await sleep(fast ? 80 : 220);
  }
  makerBusy = false;
}
function clearMaker() { strokes = []; curStroke = null; renderMaker(); }

/* turn strokes[] → a two.Group hero, then replay draw-on */
let heroReady = false;
function buildHero() {
  if (!strokes.length) return false;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const st of strokes) for (const [x, y] of st.pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const sw = Math.max(1, x1 - x0), sh = Math.max(1, y1 - y0);
  if (sw * sh < 40) return false;
  const sc = Math.min(104 / sh, 118 / sw);

  /* wipe old hero strokes (keep dizzyG) */
  for (const c of heroIn.children.slice()) {
    if (c === dizzyG) continue;
    heroIn.remove(c); two.release(c);
  }
  for (let i = boil.length - 1; i >= 0; i--) if (boil[i]._hero) boil.splice(i, 1);

  const cx = (x0 + x1) / 2;
  const paths = [];
  strokes.forEach((st, i) => {
    const pts = st.pts.map(([x, y]) => [(x - cx) * sc, (y - y1) * sc]);  // feet at y=0
    if (pts.length === 1) pts.push([pts[0][0] + 1.5, pts[0][1] + 1.5]);
    /* a pale offset ghost copy = hand-drawn double stroke */
    const ghost = mkPath(jitterPts(pts, 1.4, Math.random), st.closed, true);
    ghost.noFill(); ghost.stroke = INK; ghost.linewidth = st.w * sc * 1.5;
    ghost.opacity = 0.16; heroIn.add(ghost);
    const p = mkPath(pts, st.closed, true);
    p.noFill(); p.stroke = st.c; p.linewidth = Math.max(2.2, st.w * sc);
    p.cap = 'round'; p.join = 'round';
    heroIn.add(p);
    p._b = p.vertices.map((v) => [v.x, v.y]); p._bj = 0.5; p._hero = true;
    boil.push(p);
    p.ending = 0;
    paths.push(p);
  });
  /* dizzy stars (hidden until a slip) */
  emptyGroup(dizzyG);
  for (let i = 0; i < 3; i++) {
    const sp = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (Math.PI * k) / 5, rad = k % 2 ? 3.4 : 7;
      sp.push(new Two.Anchor(Math.cos(a) * rad, Math.sin(a) * rad));
    }
    const star = new Two.Path(sp, true, false);
    star.fill = '#FFC53D'; star.stroke = INK; star.linewidth = 1.2;
    dizzyG.add(star);
  }
  dizzyG.position.set(0, -118);
  dizzyG.visible = false;

  /* draw-on replay, stroke by stroke */
  paths.forEach((p, i) => {
    spring(0, 1, (v) => { p.ending = v; }, { k: 0.14, d: 0.75, delay: 200 + i * 160 });
  });
  heroDesc = `a kid-drawn crayon hero with ${strokes.length} wobbly strokes`;
  return true;
}

/* hero locomotion */
let heroXFrac = 0.08, heroWalking = false, heroRiding = null, slipping = false;
let hopping = false, locoSeq = 0;   // locoSeq: newest locomotion gag owns position.y
const heroState = { bob: 0 };
function heroTargetX() { return 0.08 + heroProgress * 0.66; }
function setHeroX(xf, walk = true) {
  heroXFrac = clamp(xf, 0.05, 0.92);
  const tx = heroXFrac * W;
  if (walk) heroWalking = true;
  killTag('herox');
  spring(heroG.position.x || 60, tx, (v) => { heroG.position.x = v; },
    { k: 0.07, d: 0.62, tag: 'herox',
      done: () => { if (!panning) heroWalking = false; } });
}
heroG.position.set(60, gyOf());

/* comedic slip: spin-drop-recover + dizzy stars */
function heroSlip() {
  if (slipping) return;
  locoSeq++;
  slipping = true; hopping = false;
  heroWalking = false;
  dizzyG.visible = true;
  spring(0, Math.PI * 2.1, (v) => { heroIn.rotation = v; }, { k: 0.13, d: 0.5 });
  spring(0, 26, (v) => { heroIn.position.y = v; }, {
    k: 0.12, d: 0.55,
    done: () => spring(26, 0, (v) => { heroIn.position.y = v; },
      { k: 0.1, d: 0.55, done: () => {
        heroIn.rotation = 0; dizzyG.visible = false; slipping = false;
      } }),
  });
}
/* happy hop on success — a real gravity arc + a springy squash on landing */
function heroHop() {
  if (slipping || hopping) return;
  const my = ++locoSeq;
  hopping = true;
  spring(1, 1.14, (v) => { heroIn.scale = v; }, { k: 0.24, d: 0.5 });
  tween(580, (k) => {
    if (my === locoSeq) heroIn.position.y = -38 * 4 * k * (1 - k);  // parabola up→down
  }).then(() => {
    if (my === locoSeq) heroIn.position.y = 0;
    hopping = false;
    spring(1.14, 1, (v) => { heroIn.scale = v; }, { k: 0.16, d: 0.55 });
  });
}
/* ride a prop: lift hero onto it, gallop, hop off ahead */
function heroRide(rec) {
  if (heroRiding) return;
  locoSeq++; hopping = false;
  heroRiding = rec;
  const px = rec.g.position.x;
  spring(heroIn.position.y, -64, (v) => { heroIn.position.y = v; }, { k: 0.11, d: 0.6 });
  setHeroX(px / W);
  setTimeout(() => {
    /* gallop wobble on the mount */
    spring(-0.12, 0.12, (v) => { rec.g.rotation = v; }, { k: 0.1, d: 0.3 });
    setTimeout(() => {
      spring(heroIn.position.y, 0, (v) => { heroIn.position.y = v; },
        { k: 0.12, d: 0.5, done: () => { heroRiding = null; } });
      setHeroX(clamp(px / W + 0.1, 0.05, 0.9));
    }, 1400);
  }, 700);
}

/* ============================================================
   GAME STATE + THE REAL LLM
   ============================================================ */
const GOAL = 'The Three Little Pigs — help the pig friends gather materials, ' +
  'build houses, and reach the strong brick house before the Big Bad Wolf huffs and puffs.';
const llm = new StoryLLM({
  onStatus: (s) => {
    if (s.waiting) coach('Waiting for a little memory room…');
    else if (s.failed) coach('The story master hiccuped — trying a helper instead.');
  },
});

let history = [];          // strings fed back to the GM
let wordLog = [];          // {word, silly}
let heroProgress = 0;      // mirrored goal_progress
let busy = false;
let started = false;
let epoch = 0;
let demoOn = false;
const latHist = [];

const SENSIBLE = ['straw', 'sticks', 'bricks', 'house', 'bridge', 'run', 'hide',
  'build', 'jump', 'swim', 'boat', 'knock', 'sing', 'dance', 'cookie', 'unicorn',
  'climb', 'rope', 'ladder', 'torch', 'key', 'door', 'dig', 'help', 'nap', 'slide',
  'tunnel', 'flower', 'balloon', 'kite', 'mushroom', 'wagon', 'skate', 'hug'];

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function wordLike(w) {
  return /^[a-z]+([ '-][a-z]+)*$/i.test(w) && w.length >= 2 && w.length <= 32 &&
    /[aeiouy]/i.test(w) && !/(.)\1\1/.test(w);
}
function localGuess(word) {
  const w = word.trim().toLowerCase();
  let best = null, bd = 3;
  for (const s of SENSIBLE) {
    const d = lev(w, s);
    if (d < bd) { bd = d; best = s; }
  }
  return bd <= 2 ? best : null;
}

/* ---------- DOM helpers (kid-safe: textContent only) ---------- */
function coach(msg, cls) {
  coachEl.textContent = msg;
  coachEl.className = cls || '';
}
function setNarrative(t) {
  narrativeEl.textContent = t || '…';
  narrativeEl.classList.remove('pop');
  void narrativeEl.offsetWidth;
  narrativeEl.classList.add('pop');
}
function setObstacles(list) {
  obstaclesEl.textContent = '';
  (list || []).slice(0, 4).forEach((o) => {
    const c = document.createElement('span');
    c.className = 'obchip';
    c.textContent = 'watch out: ' + o;
    obstaclesEl.appendChild(c);
  });
}
function setChoices(list) {
  choicesEl.textContent = '';
  (list || []).slice(0, 4).forEach((c) => {
    const b = document.createElement('button');
    b.className = 'choicechip';
    b.type = 'button';
    b.textContent = c;
    b.addEventListener('click', () => { wordInput.value = c; hideDym(); takeTurn(c); });
    choicesEl.appendChild(b);
  });
}
function hideDym() { dymEl.hidden = true; }
function showDym(word) {
  dymBtn.textContent = word;
  dymBtn.dataset.word = word;
  dymEl.hidden = false;
}
/* goal bar: LLM gives a raw number → we keep a monotonic-ish LOGICAL value
 * (never falls on a success beat, dips only a little on a fail beat) and an
 * eased DISPLAY value the update loop animates toward it. */
let goalLogical = 0;
let goalShown = 0;
function setGoal(p, failBeat) {
  const t = clamp(Number(p) || 0, 0, 1);
  if (t >= goalLogical) goalLogical = t;                    // always climb
  else goalLogical = failBeat ? Math.max(t, goalLogical - 0.06)  // small dip OK on fails
                              : goalLogical;                     // never dip on success
  heroProgress = goalLogical;
}
function paintGoal() {
  goalFill.style.width = (goalShown * 100).toFixed(1) + '%';
  goalPig.style.left = (goalShown * 100).toFixed(1) + '%';
}
/* Honest chips: "live LLM" only when _meta.source is remote/local;
 * "demo mode" only on offline; ms numbers only on real calls. */
function latShow(txt, meta) {
  latChip.hidden = false;
  latChip.textContent = txt;
  const src = meta && meta.source;
  if (src === 'remote' || src === 'local') {
    modeChip.hidden = false;
    modeChip.textContent = src === 'local' ? 'live LLM · local' : 'live LLM';
    modeChip.classList.add('live');
    modeChip.classList.remove('demo');
  } else if (src === 'offline') {
    modeChip.hidden = false;
    modeChip.textContent = 'demo mode';
    modeChip.classList.add('demo');
    modeChip.classList.remove('live');
  }
  /* meta undefined (still thinking) → leave last-known mode chip alone */
}
function latHideSoon() {
  setTimeout(() => { if (!busy) latChip.hidden = true; }, 4000);
}
function setInputsEnabled(on) {
  wordInput.disabled = !on;
  goBtn.disabled = !on;
}

/* Kid-safety gate — the stage never sends unkind words upstream.
 * Kept tiny on purpose: the story master's system prompt is the real guard. */
const NOT_KIND = /(?:^|[^a-z])(damn|hell|stupid|idiot|dumb|shut up|hate you|kill|die|poop|fart|butt|ugly)(?:[^a-z]|$)/i;
function kindCheck(word) {
  if (NOT_KIND.test(word)) {
    coach("Hmm — let's keep our story words kind and silly!", 'uhoh');
    wordInput.value = '';
    wordInput.focus({ preventScroll: true });
    return false;
  }
  return true;
}

/* ---------- one turn through the real story master ---------- */
let pendingWord = null;    // kids can keep typing while the world travels
async function takeTurn(word) {
  word = String(word || '').trim();
  if (!started) return;
  if (busy) {
    if (word) {                 // queue it — the next beat picks it up
      pendingWord = word;
      coach(`Got it — "${word}" is next!`);
    }
    return;
  }
  if (!word) { coach('Type a little word first — try "straw" or "run"!'); return; }
  if (!kindCheck(word)) return;
  const ep = epoch;
  busy = true;
  hideDym();
  wordInput.value = '';
  latShow('story master is thinking…');

  /* SPEC guardrail: check machine headroom before the call */
  try { await llm.waitForHeadroom(4, 8000); } catch { /* proceed anyway */ }
  if (ep !== epoch) { busy = false; return; }

  let gm;
  try {
    gm = await llm.next({ goal: GOAL, history, playerText: word, hero: heroDesc });
  } catch (e) {
    gm = null;
  }
  if (ep !== epoch) { busy = false; return; }
  if (!gm) {
    latChip.hidden = true;
    busy = false;
    return;
  }

  /* latency + mode chips — real source only, ms only on real calls */
  const meta = gm._meta || {};
  const ms = meta.ms || 0;
  if (meta.source === 'offline') {
    latShow('offline narrator answered (no clock time)', meta);
  } else {
    const who = meta.mode === 'local' ? 'local model' : 'GLM';
    latShow(`${who} answered in ${(ms / 1000).toFixed(1)}s`, meta);
    latHist.push(ms);
  }
  latHideSoon();

  /* apply the GM beat */
  setNarrative(gm.narrative);
  setObstacles(gm.obstacles);
  setChoices(gm.choices);
  history.push(`"${word}" -> ${gm.narrative}`.slice(0, 160));
  wordLog.push({ word, silly: !gm.success });

  /* did-you-mean: LLM field first, then local edit-distance guess */
  if (gm.did_you_mean) showDym(gm.did_you_mean);
  else if (!gm.success && wordLike(word)) {
    const g = localGuess(word);
    if (g && g !== word.toLowerCase()) showDym(g);
  }

  /* goal: clamp to monotonic-ish first, hero starts marching, THEN pan */
  setGoal(gm.goal_progress, !gm.success);
  setHeroX(heroTargetX());

  /* FORWARD TRAVEL: the world scrolls one screen into the new scene_seed */
  await travelTo(gm.scene_seed, ep);
  if (ep !== epoch) { busy = false; return; }

  /* props spawn / remove / react — springy entrances on the new ground */
  const gags = [];
  (gm.props || []).forEach((p) => {
    const a = (p.action || 'spawn').toLowerCase();
    if (a === 'remove') removeProp(p.kind);
    else if (a === 'react') reactProp(p.kind);
    else {
      const rec = spawnProp(p.kind, p.x ?? 0.6);
      if (rec.rideable) gags.push(() => heroRide(rec));
      else if (rec.slippery || !gm.success) gags.push(() => setTimeout(heroSlip, 420));
    }
  });
  /* POLISH §4: every typed THING becomes a real prop — if the GM didn't
   * echo the kid's word in props[], spawn it ourselves (labeled doodle
   * crate for unknown kinds). Pure actions (run, hide…) spawn nothing. */
  const wNorm = word.toLowerCase();
  const covered = liveProps.some(p => p.kind === wNorm || p.pkind === propKindOf(wNorm));
  if (!covered && isThingy(wNorm)) {
    const rec = spawnProp(wNorm, rr(Math.random, 0.5, 0.78));
    if (rec.rideable) gags.push(() => heroRide(rec));
    else if (rec.slippery || !gm.success) gags.push(() => setTimeout(heroSlip, 420));
  }
  if (!gm.success && !gags.length && /slip|trip|bonk|splat|oops|fell/i.test(gm.narrative))
    gags.push(() => setTimeout(heroSlip, 420));
  gags.forEach((fn, i) => setTimeout(fn, 350 + i * 900));

  /* wolf pressure — huff & puff when the wolf shows up in the beat */
  const wolfy = /wolf|huff|puff|blow/i.test(
    gm.narrative + ' ' + (gm.obstacles || []).join(' '));
  let meter = wolf.meter + (gm.success ? -0.07 : 0.1) + (wolfy ? 0.16 : 0.045);
  setWolfMeter(meter);
  if (wolfy || wolf.meter >= 0.95) {
    huff(wolf.meter >= 0.9 ? 2 : 1);
    if (wolf.meter >= 0.95) setWolfMeter(0.45);   /* he got tired — for now */
  } else {
    /* every prop wobbles from the breeze of the attempt */
    liveProps.forEach((p, i) =>
      setTimeout(() => spring(-0.08, 0, (v) => { p.g.rotation = v; }, { k: 0.2, d: 0.4 }), i * 60));
  }

  if (gm.success) heroHop();

  /* brick-house finale */
  if (heroProgress >= 0.9 && !liveProps.some((p) => p.pkind === 'brickhouse'))
    spawnProp('brick house', 0.88);

  busy = false;
  if (pendingWord && ep === epoch) {
    const w = pendingWord; pendingWord = null;
    takeTurn(w);                // the queued kid-word goes next
  } else {
    pendingWord = null;
    if (!demoOn) wordInput.focus({ preventScroll: true });
  }
  if (heroProgress >= 0.97) setTimeout(() => { if (ep === epoch) showEnd(); }, 1400);
}

function submitWord() {
  if (!started) return;
  takeTurn(wordInput.value);   // takeTurn queues it if a turn is mid-flight
}

/* ---------- start / end ---------- */
function startStory() {
  epoch++;
  started = true;
  history = []; wordLog = [];
  huffCount = 0;
  pendingWord = null;
  goalLogical = 0; goalShown = 0; heroProgress = 0; paintGoal();
  setWolfMeter(0.1);
  heroXFrac = 0.08;
  heroG.position.set(0.08 * W, gyOf());
  makerOv.classList.remove('show');
  setTimeout(() => { makerOv.hidden = true; }, 320);
  setNarrative('Off we go! The three little pigs point down the path…');
  setObstacles([]);
  setChoices(['gather straw', 'find sticks', 'look for bricks']);
  coach('Type a word — what should the hero do first?');
  setInputsEnabled(true);
  panoG.position.x = 0; propsG.position.x = 0;
  renderScene({ biome: 'meadow', seed: 20260, palette: 'warm', props: ['flower'] });
  wordInput.focus({ preventScroll: true });
}
function showEnd() {
  setInputsEnabled(false);
  winLine.textContent = `Your hero needed ${wordLog.length} words — ` +
    `${huffCount} huff${huffCount === 1 ? '' : 's'} and puff${huffCount === 1 ? '' : 's'} survived!`;
  recapEl.textContent = '';
  wordLog.forEach(({ word, silly }) => {
    const s = document.createElement('span');
    s.textContent = word;
    if (silly) s.className = 'silly';
    recapEl.appendChild(s);
  });
  endOv.hidden = false;
  requestAnimationFrame(() => endOv.classList.add('show'));
  huff(1);
}
function resetToMaker() {
  epoch++;
  demoOn = false;
  busy = false;
  started = false;
  pendingWord = null;
  stopBtn.hidden = true;
  endOv.classList.remove('show');
  endOv.hidden = true;
  /* clear every prop — gameplay + both scene slots' dressing */
  for (const p of liveProps) { p.parent.remove(p.g); two.release(p.g); }
  liveProps.length = 0;
  emptyGroup(nextSlot._sky); emptyGroup(nextSlot._decor); emptyGroup(nextSlot._props);
  nextSlot._drift.length = 0;
  panoG.position.x = 0; propsG.position.x = 0;
  curSlot.position.x = 0; nextSlot.position.x = W;
  panning = false; heroWalking = false; heroRiding = null; slipping = false; hopping = false;
  goalLogical = 0; goalShown = 0; heroProgress = 0; paintGoal();
  setWolfMeter(0);
  setNarrative('Once upon a time, three little pigs needed a hero…');
  setObstacles([]); setChoices([]);
  coach('Draw your hero first — the crayons are waiting!');
  setInputsEnabled(false);
  makerOv.hidden = false;
  requestAnimationFrame(() => makerOv.classList.add('show'));
  requestAnimationFrame(sizeMaker);
}

/* ---------- Watch it play: the REAL run ---------- */
const DEMO_WORDS = ['straw', 'sticks', 'unicorn', 'banana peel', 'bricks',
                    'brick house', 'hide inside', 'lock the door', 'cozy fire',
                    'sleep tight', 'fireworks', 'safe home'];
async function runDemo() {
  const ep = epoch;
  try {
    for (const word of DEMO_WORDS) {
      if (ep !== epoch || !demoOn) return;
      if (goalLogical >= 0.97) return;          // already safe inside
      /* type it like a kid — visibly, one letter at a time */
      wordInput.value = '';
      for (const ch of word) {
        if (ep !== epoch || !demoOn) return;
        wordInput.value += ch;
        await sleep(110 + Math.random() * 120);
      }
      await sleep(380);
      if (ep !== epoch || !demoOn) return;
      await takeTurn(word);
      while (busy && ep === epoch && demoOn) await sleep(160);
      if (ep !== epoch || !demoOn) return;
      await sleep(650);
    }
  } finally {
    if (ep === epoch) { demoOn = false; stopBtn.hidden = true; setInputsEnabled(started); }
  }
}
async function startDemo() {
  if (demoOn) return;                 // idempotent — the dashboard can spam it
  epoch++;
  const ep = epoch;
  demoOn = true;
  pendingWord = null;
  stopBtn.hidden = false;
  /* fresh world + auto hero */
  for (const p of liveProps) { p.parent.remove(p.g); two.release(p.g); }
  liveProps.length = 0;
  emptyGroup(nextSlot._sky); emptyGroup(nextSlot._decor); emptyGroup(nextSlot._props);
  nextSlot._drift.length = 0;
  panoG.position.x = 0; propsG.position.x = 0;
  curSlot.position.x = 0; nextSlot.position.x = W;
  panning = false; heroWalking = false; heroRiding = null; slipping = false; hopping = false;
  history = []; wordLog = []; huffCount = 0;
  endOv.classList.remove('show'); endOv.hidden = true;
  makerOv.hidden = false;
  makerOv.classList.add('show');
  setInputsEnabled(false);
  coach('The show paints a hero first…');
  await sleep(300);
  await surpriseMe(true);
  if (ep !== epoch || !demoOn) return;
  buildHero();
  await sleep(500);
  if (ep !== epoch || !demoOn) return;
  startStory();
  await sleep(400);
  runDemo();
}
function stopDemo() {
  if (!demoOn) return;
  epoch++;
  demoOn = false;
  pendingWord = null;
  stopBtn.hidden = true;
  makerBusy = false;
  if (makerOv.classList.contains('show')) { makerOv.hidden = false; return; }
  busy = false;
  setInputsEnabled(started);
  coach('You take over — type a word!');
}

/* ============================================================
   THE UPDATE LOOP — springs, line-boil, hero bounce, drift
   ============================================================ */
let frame = 0, lastT = performance.now();
let heroTagged = false;
two.bind('update', () => {
  frame++;
  const now = performance.now();
  const dt = Math.min(64, now - lastT);
  lastT = now;

  updateSprings(dt);
  heroG.position.y = gyOf();

  /* tag the hero's <g> once so DOM probes can find it (Two.js draws into SVG) */
  if (!heroTagged && heroG._renderer && heroG._renderer.elem) {
    heroG._renderer.elem.setAttribute('data-hero', 'hero');
    heroG._renderer.elem.id = 'stageHero';
    heroTagged = true;
  }

  /* goal bar: eased display chases the logical (monotonic-ish) value */
  if (goalShown !== goalLogical) {
    goalShown += (goalLogical - goalShown) * Math.min(1, dt * 0.006);
    if (Math.abs(goalLogical - goalShown) < 0.003) goalShown = goalLogical;
    paintGoal();
  }

  /* walking bounce + riding gallop (never during a slip/hop) */
  if ((heroWalking || panning) && !heroRiding && !slipping && !hopping) {
    heroState.bob += dt * 0.016;
    heroIn.position.y = -Math.abs(Math.sin(heroState.bob * Math.PI * 2 / 3)) * 10;
    heroIn.rotation = Math.sin(heroState.bob * Math.PI * 2 / 3) * 0.06;
  } else if (heroRiding) {
    heroIn.position.y = -64 - Math.abs(Math.sin(now * 0.012)) * 7;
  }

  /* props: gravity drop settles to baseY; fliers hover + bob above it */
  for (const p of liveProps) {
    p.bobT += dt * 0.0022;
    p.g.position.y = p.baseY + p.drop + (p.floaty ? -30 + Math.sin(p.bobT) * 6 : 0);
  }
  if (frame % 90 === 0) pruneBoil();

  /* hand-drawn line boil every 3rd frame */
  if (frame % 3 === 0) {
    for (const p of boil) {
      const b = p._b; if (!b) continue;
      for (let i = 0; i < p.vertices.length; i++) {
        p.vertices[i].x = b[i][0] + (Math.random() - 0.5) * 2 * p._bj;
        p.vertices[i].y = b[i][1] + (Math.random() - 0.5) * 2 * p._bj;
      }
    }
    if (dizzyG.visible) dizzyG.rotation += 0.18;
  }

  /* clouds drift + wrap (both slots while a pan is in flight) */
  for (const c of curSlot._drift.concat(nextSlot._drift)) {
    c.position.x += (c._drift * dt) / 1000;
    if (c.position.x > W + 120) c.position.x = -120;
  }

  /* wolf idle breathing */
  wolfG.position.y = gyOf() + 2 + Math.sin(now * 0.0035) * 3;
});

/* ---------- events ---------- */
makerCv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  makerCv.setPointerCapture(e.pointerId);
  curStroke = { c: selColor, w: 12, pts: [makerPos(e)], closed: false };
});
makerCv.addEventListener('pointermove', (e) => {
  if (!curStroke) return;
  const [x, y] = makerPos(e);
  const pts = curStroke.pts, l = pts[pts.length - 1];
  if (Math.hypot(x - l[0], y - l[1]) < 3) return;
  pts.push([x, y]);
  renderMaker();
});
function endStroke() {
  if (!curStroke) return;
  /* close small loops automatically */
  const p = curStroke.pts;
  if (p.length > 6) {
    const [x0, y0] = p[0], [x1, y1] = p[p.length - 1];
    if (Math.hypot(x1 - x0, y1 - y0) < 18) curStroke.closed = true;
  }
  strokes.push(curStroke);
  curStroke = null;
  renderMaker();
}
makerCv.addEventListener('pointerup', endStroke);
makerCv.addEventListener('pointercancel', endStroke);

CRAYONS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === 1 ? ' sel' : '');
  b.style.background = c;
  b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', 'crayon ' + (i + 1));
  b.addEventListener('click', () => {
    selColor = c;
    swatchBox.querySelectorAll('.swatch').forEach((s) => s.classList.remove('sel'));
    b.classList.add('sel');
  });
  swatchBox.appendChild(b);
});

clearBtn.addEventListener('click', clearMaker);
surpriseBtn.addEventListener('click', () => surpriseMe(false));
doneBtn.addEventListener('click', () => {
  if (makerBusy) return;
  if (!buildHero()) {
    coach('Draw a hero first — or press "Surprise me"!', 'uhoh');
    makerCv.classList.remove('nope');
    void makerCv.offsetWidth;
    makerCv.classList.add('nope');
    return;
  }
  heroReady = true;
  startStory();
});

goBtn.addEventListener('click', submitWord);
wordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
});
wordInput.addEventListener('input', hideDym);
document.addEventListener('keydown', (e) => {
  if (demoOn || e.metaKey || e.ctrlKey || e.altKey) return;
  if (started && makerOv.hidden && !makerOv.classList.contains('show') &&
      document.activeElement !== wordInput && /^[a-zA-Z ]$/.test(e.key))
    wordInput.focus({ preventScroll: true });
});
dymBtn.addEventListener('click', () => {
  wordInput.value = dymBtn.dataset.word;
  hideDym();
  takeTurn(dymBtn.dataset.word);
});
watchBtn.addEventListener('click', startDemo);
watchAgain.addEventListener('click', startDemo);
againBtn.addEventListener('click', () => { clearMaker(); resetToMaker(); });
stopBtn.addEventListener('click', stopDemo);

/* ---------- sizing ---------- */
function resize() {
  W = stage.clientWidth || 800;
  H = stage.clientHeight || 400;
  two.renderer.setSize(W, H);
  applySquash();
  /* settle any in-flight pan instantly, then rebuild the current stretch */
  panoG.position.x = 0; propsG.position.x = 0;
  curSlot.position.x = 0; nextSlot.position.x = W;
  if (panning) landPan();           // snap: never leave the stage half-panned
  if (curScene) renderScene(null, curSlot);
  /* keep live props glued to the ground at their x fractions */
  const gy = gyOf();
  for (const p of liveProps) {
    p.baseY = gy + (p.pkind === 'puddle' ? 10 : 0);
    p.g.position.x = p.xFrac * W;
  }
  placeWolf();
  heroG.position.set(heroXFrac * W, gy);
}
let rsz;
window.addEventListener('resize', () => {
  clearTimeout(rsz);
  rsz = setTimeout(resize, 160);
});

/* ---------- init ---------- */
resize();
buildWolf();
setWolfMeter(0);
renderScene({ biome: 'meadow', seed: 20260, palette: 'warm', props: ['flower'] });
requestAnimationFrame(sizeMaker);
window.__lat = latHist;   // for the README latency report

/* the v3 dashboard drives these across all 8 builds */
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;
