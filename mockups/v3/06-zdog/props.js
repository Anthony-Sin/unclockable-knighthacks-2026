/* ============================================================
   The Three Little Pigs · Zdog Diorama — props.js
   Seeded catalog of little 3D props. Every builder draws into a
   Zdog.Anchor bottom-anchored at y=0 (the prop stands on the disc).
   Same seed = same prop. Unknown words fall back to "doodad".

   Engine: Zdog (https://zzz.dog) — round pseudo-3D: fat strokes and
   capped volumes, no real lighting, so we paint our own shading.
   ============================================================ */
'use strict';
(function () {
const Z = window.Zdog;
const TAU = Z.TAU;
const INK = '#2B2118';

/* ---------- seeded rng (shared contract with world/app) ---------- */
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
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 7;
}
function hexRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- zdog shorthand ----------
   y is DOWN in Zdog. All props sit at local y=0 and grow up (-y).
   dot  = a round ball (Shape with fat stroke — the zdog "sphere")
   ell  = flat circle/ellipse card
   cyl  = cylinder; default rotate.x=-TAU/4 stands it upright, top=frontFace
   cone = apex up by default
   dome = hemisphere dome up by default
   box  = Box with per-face colors
   flat = flat Shape path facing the camera (+z)                        */
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });
function dot(g, d, c, x = 0, y = 0, z = 0) {
  return new Z.Shape({ addTo: g, stroke: d, color: c, translate: V(x, y, z) });
}
function ell(g, w, h, c, o = {}) {
  return new Z.Ellipse({
    addTo: g, width: w, height: h, stroke: o.s ?? 3, fill: o.f ?? true,
    color: c, quarters: o.q || 4, closed: o.cl !== false,
    translate: V(o.x || 0, o.y || 0, o.z || 0),
    rotate: o.rot || { x: 0 }, backface: o.bf ?? true,
  });
}
function cyl(g, d, l, c, o = {}) {
  return new Z.Cylinder({
    addTo: g, diameter: d, length: l, stroke: o.s ?? 2, fill: true,
    color: c, frontFace: o.front || c, rearFace: o.rear || c,
    translate: V(o.x || 0, o.y || 0, o.z || 0),
    rotate: o.rot ?? { x: -TAU / 4 },
  });
}
function cone(g, d, l, c, o = {}) {
  return new Z.Cone({
    addTo: g, diameter: d, length: l, stroke: o.s ?? 2, color: c,
    translate: V(o.x || 0, o.y || 0, o.z || 0),
    rotate: o.rot ?? { x: -TAU / 4 }, backface: o.bf ?? true,
  });
}
function dome(g, d, c, o = {}) {
  return new Z.Hemisphere({
    addTo: g, diameter: d, stroke: o.s ?? 2, color: c,
    translate: V(o.x || 0, o.y || 0, o.z || 0),
    rotate: o.rot ?? { x: -TAU / 4 },
  });
}
function box(g, w, h, d, c, o = {}) {
  return new Z.Box({
    addTo: g, width: w, height: h, depth: d, stroke: o.s ?? 3, fill: true,
    color: c, topFace: o.top || c, bottomFace: o.bottom || c,
    frontFace: o.front || c, rearFace: o.rear || c,
    leftFace: o.left || c, rightFace: o.right || c,
    translate: V(o.x || 0, o.y || 0, o.z || 0), rotate: o.rot,
  });
}
function flat(g, path, o = {}) {
  return new Z.Shape({
    addTo: g, path, closed: o.cl ?? !!o.f, stroke: o.s ?? 3,
    fill: o.f ?? false, color: o.c || INK,
    translate: V(o.x || 0, o.y || 0, o.z || 0), rotate: o.rot,
    backface: o.bf ?? true,
  });
}

/* little path helpers (for flat cards like rainbow, banana, star) */
function arcPts(cx, cy, rad, a0, a1, n = 14, ry = null) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * (ry ?? rad) });
  }
  return pts;
}
function starPts(cx, cy, ro, ri, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    pts.push({ x: cx + Math.cos(a) * (i % 2 ? ri : ro),
               y: cy + Math.sin(a) * (i % 2 ? ri : ro) });
  }
  return pts;
}
function crescentPts(cx, cy, ro, ri, a0, a1, n = 10) {
  const pts = arcPts(cx, cy, ro, a0, a1, n);
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: cx + Math.cos(a) * ri, y: cy - 6 + Math.sin(a) * ri });
  }
  return pts;
}

/* ============================================================
   THE CATALOG — one builder per prop kind
   ============================================================ */
function buildWolf(g, r) {
  const fur = '#8C93A0', dark = '#6E768C';
  dot(g, 46, fur, 6, -26);                                   // body
  dot(g, 30, fur, -26, -50);                                 // head
  cone(g, 18, 16, fur, { x: -44, y: -50, rot: { y: -TAU / 4, x: 0 } }); // snout ←
  dot(g, 7, INK, -54, -50, 2);                               // nose
  cone(g, 12, 12, fur, { x: -33, y: -64 });                  // ear
  cone(g, 12, 12, fur, { x: -20, y: -66 });                  // ear
  dot(g, 5, '#FFFDF6', -30, -54, 13);                        // eye white
  dot(g, 2.6, INK, -31, -54, 16);                            // pupil
  dot(g, 5, '#FFFDF6', -22, -56, 11);
  dot(g, 2.6, INK, -23, -56, 14);
  cone(g, 14, 20, dark, { x: 26, y: -38, rot: { y: TAU / 4, z: -0.5 } }); // tail →
  for (const lx of [-8, 2, 14, 24])
    cyl(g, 7, rr(r, 14, 18), dark, { x: lx, y: -8 });
}
function buildPiglet(g, r, pink = '#F5A0B5') {
  dot(g, 38, pink, 2, -22);                                  // body
  dot(g, 25, pink, -20, -42);                                // head
  dot(g, 10, '#E87A95', -34, -40, 2);                        // snout
  dot(g, 1.8, INK, -36, -40, 8);
  dot(g, 1.8, INK, -32, -40, 8);
  cone(g, 9, 10, pink, { x: -27, y: -55 });
  cone(g, 9, 10, pink, { x: -13, y: -57 });
  dot(g, 4, INK, -25, -44, 11);
  dot(g, 4, INK, -16, -44, 12);
  flat(g, arcPts(20, -30, 7, -1.2, 4.4, 8), { c: '#E87A95', s: 2.6, z: 8 }); // tail curl
  for (const lx of [-9, 3, 13, 21])
    cyl(g, 6, rr(r, 12, 15), '#E87A95', { x: lx, y: -7 });
}

const BUILDERS = {
  tree(g, r) {
    cyl(g, 11, 26, '#8A5E2E', { y: -13, front: '#A8743B' });
    dot(g, 36, '#4FB06D', rr(r, -3, 3), -44);
    dot(g, 26, '#5FBF7B', -15, -33);
    dot(g, 25, '#3E9A5E', 14, -35);
    if (r() < 0.5) for (const [ax, ay] of [[-10, -46], [8, -52]])
      dot(g, 5, '#FF6B57', ax, ay, 14);                      // apples
  },
  pine(g, r) {
    cyl(g, 8, 14, '#8A5E2E', { y: -7 });
    const c = pick(r, ['#2E7A46', '#3E8F57', '#357A5E']);
    cone(g, 36, 30, c, { y: -12 });
    cone(g, 27, 24, c, { y: -32 });
    cone(g, 18, 18, c, { y: -48 });
  },
  house(g, r, brick) {
    const wall = brick ? '#E8734F' : pick(r, ['#FFF1D6', '#F7E3C2', '#FFE9D6']);
    const roof = brick ? '#8A5E2E' : pick(r, ['#FF6B57', '#E8A020', '#B565D8']);
    box(g, 52, 38, 40, wall, { y: -19, top: wall,
      front: brick ? '#DF6844' : '#FFFDF6' });
    cone(g, 62, 30, roof, { y: -38 });                       // apex up
    box(g, 14, 22, 4, '#8A5E2E', { y: -11, z: 21 });
    dot(g, 3, '#FFC53D', 4, -11, 24);                        // knob
    dot(g, 9, '#BFE8F7', -14, -24, 21);                      // window
    if (brick) {
      box(g, 10, 22, 10, '#B9AFA0', { x: 14, y: -56 });
      for (const wy of [-10, -20, -30])
        flat(g, [{ x: -24, y: wy }, { x: 24, y: wy }],
          { c: '#B8512E', s: 2.4, z: 21.5 });
    }
  },
  straw(g, r) {                                              // haystack
    cyl(g, 56, 12, '#E8B23D', { y: -6 });
    dome(g, 52, '#FFC53D', { y: -11 });
    dot(g, 4, '#E8A020', 0, -38, 4);
    for (let i = 0; i < 5; i++)
      flat(g, [{ x: -22 + i * 11, y: -8 }, { x: -24 + i * 11, y: -20 }],
        { c: '#E8A020', s: 2, z: 22 });
  },
  sticks(g, r) {                                             // bundle of sticks
    for (const [dx, dz] of [[-9, -4], [0, 0], [9, 4]]) {
      cyl(g, 7, 48, pick(r, ['#9A6A3B', '#8A5E2E', '#B98A4F']),
        { x: dx, y: -24, z: dz, rot: { x: -TAU / 4, z: dx / -60 } });
    }
    ell(g, 26, 10, '#E8A020', { y: -20, z: 6, s: 5, f: false }); // twine
  },
  bricks(g, r) {
    for (const [bx, by] of [[-14, -6], [14, -6], [-7, -17], [7, -17], [0, -28]]) {
      box(g, 24, 11, 16, pick(r, ['#E8734F', '#DF6844', '#D85C3A']),
        { x: bx, y: by, rot: { y: rr(r, -0.1, 0.1) } });
    }
  },
  bridge(g, r) {
    flat(g, arcPts(0, -4, 40, Math.PI, TAU, 16, 26),
      { c: '#9A6A3B', s: 13, z: 0 });                        // arch band
    flat(g, arcPts(0, -4, 40, Math.PI, TAU, 16, 26),
      { c: '#B98A4F', s: 7, z: 2 });
    for (const px of [-30, -15, 0, 15, 30])
      cyl(g, 5, 16, '#8A5E2E', { x: px, y: -34 + Math.abs(px) * 0.5, z: 4 });
    flat(g, [{ x: -40, y: -38 }, { x: 40, y: -38 }], { c: '#8A5E2E', s: 6, z: 4 });
  },
  wolf(g, r) { buildWolf(g, r); },
  piglet(g, r) { buildPiglet(g, r); },
  pig(g, r) { buildPiglet(g, r); },
  flower(g, r) {
    const c = pick(r, ['#FF6B57', '#F58ACB', '#B565D8', '#FF9E57']);
    cyl(g, 4, 26, '#3E8F57', { y: -13 });
    for (let p = 0; p < 5; p++) {
      const a = (TAU * p) / 5 - TAU / 4;
      dot(g, 9, c, Math.cos(a) * 9, -30 + Math.sin(a) * 9, 3);
    }
    dot(g, 10, '#FFC53D', 0, -30, 6);
  },
  tuft(g, r) {
    for (const dx of [-7, 0, 7])
      cone(g, 6, rr(r, 10, 16), '#4FB06D', { x: dx, y: 0, rot: { x: -TAU / 4, z: dx / 40 } });
  },
  rock(g, r) {
    const a = new Z.Anchor({ addTo: g, scale: { x: 1.15, y: 0.72, z: 1 } });
    dome(a, 36, '#B9AFA0', { y: -4 });
    dome(a, 20, '#9D9389', { x: 16, y: -3 });
    flat(g, [{ x: -12, y: -14 }, { x: -2, y: -20 }], { c: '#8D8498', s: 3, z: 16 });
  },
  star(g, r) {
    cyl(g, 4, 34, '#8A5E2E', { y: -17 });
    flat(g, starPts(0, -48, 17, 7.5), { c: '#FFC53D', f: true, s: 4, z: 2 });
  },
  cloud(g, r) {
    dot(g, 30, '#FFFDF6', -18, -56);
    dot(g, 40, '#FFFDF6', 2, -62);
    dot(g, 28, '#FFFDF6', 22, -54);
    ell(g, 66, 14, '#F4FAFC', { y: -48, s: 0 });
  },
  balloon(g, r) {
    dot(g, 34, pick(r, ['#FF6B57', '#5DA9E9', '#B565D8', '#4FB06D']), 0, -64);
    cone(g, 8, 9, '#C4503F', { y: -45, rot: { x: TAU / 4 } });
    flat(g, [{ x: 0, y: -42 }, { x: -4, y: -28 }, { x: 3, y: -14 }, { x: 0, y: -2 }],
      { c: INK, s: 2 });
  },
  kite(g, r) {
    flat(g, [{ x: 0, y: -80 }, { x: 16, y: -58 }, { x: 0, y: -36 }, { x: -16, y: -58 }],
      { c: '#5DA9E9', f: true, s: 4 });
    flat(g, [{ x: 0, y: -80 }, { x: 0, y: -36 }], { c: '#FFFDF6', s: 2 });
    flat(g, [{ x: -16, y: -58 }, { x: 16, y: -58 }], { c: '#FFFDF6', s: 2 });
    flat(g, [{ x: 0, y: -36 }, { x: -5, y: -24 }, { x: 4, y: -14 }, { x: 0, y: -4 }],
      { c: INK, s: 2 });
    for (const [bx, by] of [[-4, -27], [3, -18]])
      dot(g, 5, '#FF6B57', bx, by, 2);
  },
  cookie(g, r) {
    cyl(g, 44, 12, '#D8A15E', { y: -26, rot: { x: 0 }, front: '#E8B87E' });
    for (const [cx, cy] of [[-10, -30], [6, -34], [-2, -20], [12, -25]])
      dot(g, 5.5, '#6B4A2A', cx, cy, 8);
  },
  mushroom(g, r) {
    cyl(g, 16, 20, '#FFF1D6', { y: -10 });
    dome(g, 44, '#FF6B57', { y: -16 });
    for (const [cx, cy, cz] of [[-10, -32, 12], [6, -38, 10], [14, -30, 8]])
      dot(g, 6, '#FFFDF6', cx, cy, cz);
  },
  log(g, r) {
    cyl(g, 18, 54, '#9A6A3B', { y: -10, rot: { y: TAU / 4, x: 0 },
      front: '#C9A56E', rear: '#C9A56E' });
    ell(g, 9, 9, '#8A5E2E', { x: 27.5, y: -10, s: 2.6, f: false });
  },
  boat(g, r) {
    flat(g, [{ x: -34, y: -20 }, { x: 34, y: -20 }, { x: 20, y: -4 }, { x: -20, y: -4 }],
      { c: '#B98A4F', f: true, s: 4 });
    cyl(g, 5, 44, '#8A5E2E', { y: -42 });
    flat(g, [{ x: 2, y: -62 }, { x: 24, y: -40 }, { x: 2, y: -30 }],
      { c: '#FFFDF6', f: true, s: 3, z: 2 });
    flat(g, [{ x: -2, y: -60 }, { x: -20, y: -44 }, { x: -2, y: -32 }],
      { c: '#FF6B57', f: true, s: 3, z: -2 });
  },
  torch(g, r) {
    cyl(g, 6, 34, '#8A5E2E', { y: -17 });
    cone(g, 16, 22, '#FF9E57', { y: -34 });
    dot(g, 9, '#FFC53D', 0, -40, 4);
  },
  key(g, r) {
    ell(g, 18, 18, '#FFC53D', { y: -46, s: 5, f: false });
    flat(g, [{ x: 0, y: -38 }, { x: 0, y: -8 }], { c: '#FFC53D', s: 5 });
    flat(g, [{ x: 0, y: -16 }, { x: 10, y: -16 }], { c: '#FFC53D', s: 5 });
    flat(g, [{ x: 0, y: -8 }, { x: 8, y: -8 }], { c: '#FFC53D', s: 5 });
  },
  door(g, r) {
    box(g, 28, 46, 7, '#8A5E2E', { y: -23, front: '#9A6A3B' });
    box(g, 34, 50, 4, '#6B4A2A', { y: -25, z: -4 });
    dot(g, 5, '#FFC53D', 8, -22, 5);
  },
  chest(g, r) {
    box(g, 42, 20, 26, '#9A6A3B', { y: -10, front: '#A8743B' });
    box(g, 44, 12, 28, '#B98A4F', { y: -24 });
    box(g, 6, 32, 28.5, '#E8A020', { y: -16 });
    dot(g, 6, '#FFC53D', 0, -18, 15);
  },
  ladder(g, r) {
    cyl(g, 5, 60, '#9A6A3B', { x: -14, y: -30 });
    cyl(g, 5, 60, '#9A6A3B', { x: 14, y: -30 });
    for (const ry2 of [-12, -26, -40, -54])
      cyl(g, 4, 28, '#B98A4F', { y: ry2, rot: { y: TAU / 4, x: 0 } });
  },
  trampoline(g, r) {
    for (const [lx, lz] of [[-22, -10], [22, -10], [0, 16]])
      cyl(g, 5, 16, '#8D8498', { x: lx, y: -8, z: lz });
    ell(g, 56, 56, '#7FB8E8', { y: -18, rot: { x: TAU / 4 }, s: 0 });
    ell(g, 64, 64, '#5DA9E9', { y: -18, rot: { x: TAU / 4 }, s: 9, f: false });
  },
  puddle(g, r) {
    ell(g, 64, 26, '#8FD0F2', { y: -1, rot: { x: TAU / 4 }, s: 0 });
    ell(g, 34, 10, '#C4E7FB', { x: -8, y: -2, z: 4, rot: { x: TAU / 4 }, s: 0 });
  },
  rainbow(g, r) {
    const cols = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9'];
    cols.forEach((c, i) => {
      flat(g, arcPts(0, -4, 48 - i * 10, Math.PI, TAU, 14, 42 - i * 9),
        { c, s: 7, z: -i * 0.4 });
    });
    dot(g, 14, '#FFFDF6', -48, -4);
    dot(g, 14, '#FFFDF6', 48, -4);
  },
  leaf(g, r) {
    flat(g, [{ x: 0, y: 0 }, { x: 14, y: -14 }, { x: 12, y: -36 },
             { x: -8, y: -30 }, { x: -8, y: -12 }],
      { c: '#4FB06D', f: true, s: 3 });
    flat(g, [{ x: 0, y: -2 }, { x: 4, y: -32 }], { c: '#3E8F57', s: 2 });
  },
  banana(g, r) {                                             // peel-ready
    flat(g, crescentPts(0, -22, 20, 11, Math.PI * 0.05, Math.PI * 0.95),
      { c: '#FFC53D', f: true, s: 3.4 });
    flat(g, [{ x: 0, y: -8 }, { x: -9, y: -2 }, { x: -3, y: 0 }],
      { c: '#E8A020', f: true, s: 2.4, z: 2 });
    flat(g, [{ x: 0, y: -8 }, { x: 9, y: -2 }, { x: 3, y: 0 }],
      { c: '#E8A020', f: true, s: 2.4, z: 2 });
  },
  unicorn(g, r) {
    dot(g, 36, '#FFFDF6', 4, -26);                           // body
    dot(g, 20, '#FFFDF6', -22, -46);                         // head
    cone(g, 8, 17, '#FFC53D', { x: -28, y: -56, rot: { x: -TAU / 4, z: 0.35 } });
    dot(g, 12, '#F58ACB', -12, -58);                         // mane
    dot(g, 10, '#F58ACB', -4, -56);
    dot(g, 10, '#B565D8', 2, -50);
    dot(g, 4, INK, -26, -48, 9);
    cone(g, 10, 16, '#F58ACB', { x: 22, y: -36, rot: { y: TAU / 4, z: -0.4 } });
    for (const lx of [-8, 4, 14, 22])
      cyl(g, 6, 16, '#F0E6F4', { x: lx, y: -8 });
  },
  toaster(g, r) {
    box(g, 36, 24, 24, '#C9D2DC', { y: -12, top: '#AAB6C4' });
    box(g, 26, 4, 12, '#6E768C', { y: -26 });
    box(g, 18, 12, 5, '#E8B04F', { y: -32 });                // toast!
    dot(g, 4, INK, 19, -12, 0);
    cyl(g, 3, 8, '#8D8498', { x: 20, y: -10, rot: { y: TAU / 4, x: 0 } });
  },
  slime(g, r) {
    const a = new Z.Anchor({ addTo: g, scale: { x: 1.1, y: 0.8, z: 1.05 } });
    dome(a, 50, '#7CD67C', { y: -4 });
    dot(g, 5, INK, -8, -22, 17);
    dot(g, 5, INK, 8, -22, 17);
    flat(g, arcPts(0, -16, 7, 0.3, Math.PI - 0.3, 6), { c: INK, s: 2.4, z: 18 });
    dot(g, 7, '#A8E8B2', -12, -32, 14);
  },
  fridge(g, r) {
    box(g, 36, 54, 30, '#DCE9F2', { y: -27, front: '#EAF2F8' });
    flat(g, [{ x: -18, y: -34 }, { x: 18, y: -34 }], { c: '#AAB6C4', s: 2.6, z: 15.5 });
    cyl(g, 4, 14, '#8D8498', { x: 12, y: -24, z: 15.5 });
    dot(g, 4, '#FF6B57', -8, -40, 16);
    dot(g, 4, '#4FB06D', -2, -46, 16);
    dot(g, 4, '#FFC53D', -12, -48, 16);
  },
  sock(g, r) {
    flat(g, [{ x: 0, y: -36 }, { x: 0, y: -12 }, { x: 14, y: -4 }],
      { c: '#B9AFA0', s: 16 });
    dot(g, 10, '#FF6B57', 15, -4, 4);                        // toe
    dot(g, 8, '#5DA9E9', 0, -14, 6);                         // heel
    flat(g, [{ x: -8, y: -36 }, { x: 8, y: -36 }], { c: '#FF6B57', s: 5 });
  },
  jelly(g, r) {
    const a = new Z.Anchor({ addTo: g, scale: { x: 1.05, y: 0.85, z: 1 } });
    dome(a, 48, hexRgba('#F58ACB', 0.9), { y: -4 });
    dot(g, 8, '#FBD7EA', -10, -24, 16);
  },
  homework(g, r) {
    new Z.RoundedRect({
      addTo: g, width: 34, height: 44, cornerRadius: 4, fill: true,
      stroke: 3, color: '#FFFDF6', translate: V(0, -26, 0),
      rotate: { z: 0.08 },
    });
    for (const ly of [-36, -30, -24, -18])
      flat(g, [{ x: -11, y: ly }, { x: 11, y: ly + rr(r, -1, 1) }],
        { c: '#8FA8D8', s: 2, z: 2 });
    flat(g, starPts(8, -42, 5, 2.2), { c: '#FFC53D', f: true, s: 2, z: 2 });
  },
  ball(g, r) { dot(g, 36, pick(r, ['#FF6B57', '#5DA9E9', '#4FB06D']), 0, -18); },
  apple(g, r) {
    dot(g, 26, '#E84A3A', 0, -16);
    flat(g, [{ x: 0, y: -28 }, { x: 3, y: -36 }], { c: '#8A5E2E', s: 3 });
    flat(g, [{ x: 3, y: -36 }, { x: 12, y: -38 }, { x: 6, y: -32 }],
      { c: '#4FB06D', f: true, s: 2 });
  },
  crown(g, r) {
    cyl(g, 30, 10, '#FFC53D', { y: -8 });
    for (const dx of [-10, 0, 10])
      cone(g, 8, 14, '#FFC53D', { x: dx, y: -14 });
    dot(g, 5, '#FF6B57', 0, -18, 12);
  },
  umbrella(g, r) {
    cyl(g, 4, 44, '#8A5E2E', { y: -22 });
    dome(g, 58, '#5DA9E9', { y: -42 });
    dot(g, 5, '#FFC53D', 0, -46, 4);
    flat(g, arcPts(0, 0, 6, 0, Math.PI, 6), { c: '#8A5E2E', s: 3, z: 4 });
  },
  dragon(g, r) {
    buildPiglet(g, r, '#7CC97F');
    cone(g, 9, 12, '#FFC53D', { x: -26, y: -56 });
    flat(g, [{ x: 8, y: -34 }, { x: 24, y: -52 }, { x: 22, y: -30 }],
      { c: '#5FBF7B', f: true, s: 2.6, z: -6 });
  },
  monster(g, r) {
    dome(g, 42, pick(r, ['#B565D8', '#5DA9E9', '#4FB06D']), { y: -6 });
    dot(g, 10, '#FFFDF6', -8, -32, 14);
    dot(g, 4, INK, -8, -32, 19);
    dot(g, 10, '#FFFDF6', 8, -32, 14);
    dot(g, 4, INK, 8, -32, 19);
    cone(g, 7, 10, '#FFC53D', { x: -12, y: -42 });
    cone(g, 7, 10, '#FFC53D', { x: 12, y: -42 });
  },
  robot(g, r) {
    box(g, 34, 30, 24, '#B9AFA0', { y: -15, front: '#C9C9D4' });
    box(g, 24, 20, 20, '#C9C9D4', { y: -42 });
    dot(g, 6, '#5DA9E9', -6, -44, 11);
    dot(g, 6, '#5DA9E9', 6, -44, 11);
    cyl(g, 3, 10, '#8D8498', { y: -58 });
    dot(g, 5, '#FF6B57', 0, -62);
    for (const lx of [-10, 10]) cyl(g, 7, 10, '#8D8498', { x: lx, y: -4 });
  },
  fish(g, r) {
    ell(g, 40, 24, '#FF9E57', { y: -30, s: 3 });
    flat(g, [{ x: 20, y: -30 }, { x: 34, y: -38 }, { x: 34, y: -22 }],
      { c: '#E8742E', f: true, s: 3 });
    dot(g, 4, INK, -12, -32, 11);
  },
  duck(g, r) {
    dot(g, 30, '#FFC53D', 4, -18);
    dot(g, 18, '#FFC53D', -16, -38);
    cone(g, 9, 10, '#FF9E57', { x: -28, y: -38, rot: { y: -TAU / 4, x: 0 } });
    dot(g, 3.4, INK, -18, -42, 9);
  },
  frog(g, r) {
    dome(g, 40, '#4FB06D', { y: -4 });
    dot(g, 9, '#4FB06D', -10, -30, 8);
    dot(g, 9, '#4FB06D', 10, -30, 8);
    dot(g, 4, INK, -10, -32, 14);
    dot(g, 4, INK, 10, -32, 14);
    flat(g, arcPts(0, -16, 9, 0.4, Math.PI - 0.4, 6), { c: INK, s: 2.4, z: 17 });
  },
  heart(g, r) {
    flat(g, [{ x: 0, y: -14 }, { x: -18, y: -32 }, { x: -10, y: -44 },
             { x: 0, y: -36 }, { x: 10, y: -44 }, { x: 18, y: -32 }],
      { c: '#FF6B57', f: true, s: 3 });
  },
  /* unknown word → the friendly mystery blob */
  doodad(g, r) {
    const c = pick(r, ['#DCC3F2', '#B7E6C3', '#C7E6FA', '#FFD9A8']);
    const a = new Z.Anchor({ addTo: g, scale: { x: 1, y: rr(r, 0.8, 1.1), z: 1 } });
    dome(a, 38, c, { y: -4 });
    dot(g, 5, INK, -7, -20, 13);
    dot(g, 5, INK, 7, -20, 13);
    flat(g, [{ x: -6, y: -12 }, { x: -2, y: -10 }, { x: 2, y: -12 }, { x: 6, y: -10 }],
      { c: INK, s: 2, z: 13 });
    flat(g, [{ x: 0, y: -40 }, { x: rr(r, -3, 3), y: -50 }], { c: INK, s: 2.4 });
    dot(g, 7, '#FFC53D', 2, -54);
  },
};

const PROP_RULES = [
  [/unicorn|pony|horse|pegasus/, 'unicorn'],
  [/dragon/, 'dragon'],
  [/banana|peel/, 'banana'],
  [/bridge|plank/, 'bridge'],
  [/straw|hay|haystack/, 'straw'],
  [/stick|twig|wood(?!en house)/, 'sticks'],
  [/brick/, 'bricks'],
  [/wolf/, 'wolf'],
  [/pig|piglet|piggy/, 'piglet'],
  [/house|cottage|home|shelter/, 'house'],
  [/flower|daisy|tulip/, 'flower'],
  [/tree|bush/, 'tree'],
  [/pine|fir|evergreen/, 'pine'],
  [/rock|boulder|stone|pebble/, 'rock'],
  [/star|wand/, 'star'],
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
  [/puddle|water|pond/, 'puddle'],
  [/mud|slime|jelly|goo/, 'slime'],
  [/rainbow/, 'rainbow'],
  [/leaf|leaves/, 'leaf'],
  [/toaster/, 'toaster'],
  [/fridge|refrigerator/, 'fridge'],
  [/sock/, 'sock'],
  [/homework|paper|book|page/, 'homework'],
  [/ball/, 'ball'],
  [/apple|fruit|snack/, 'apple'],
  [/crown|tiara|king|queen/, 'crown'],
  [/umbrella/, 'umbrella'],
  [/monster|blob/, 'monster'],
  [/robot/, 'robot'],
  [/fish/, 'fish'],
  [/duck/, 'duck'],
  [/frog|toad/, 'frog'],
  [/heart|love|hug/, 'heart'],
  [/grass|tuft/, 'tuft'],
];
const RIDEABLE = /unicorn|horse|pony|pegasus|dragon|bike|scooter|dolphin|whale/i;
const SLIPPERY = /banana|peel|slime|mud|puddle|ice|soap|jelly|toaster|fridge|sock|butter/i;

function propKindOf(kind) {
  const w = String(kind).toLowerCase();
  if (/brick/.test(w) && /house|home|cottage/.test(w)) return 'brickhouse';
  for (const [re, name] of PROP_RULES) if (re.test(w)) return name;
  return 'doodad';
}

/* build a prop model into a fresh anchor (bottom-anchored at y=0) */
function build(kind, seed) {
  const pkind = propKindOf(kind);
  const r = mulberry32(((seed | 0) || 7) + hashStr(String(kind)) * 131);
  const a = new Z.Anchor();
  if (pkind === 'brickhouse') BUILDERS.house(a, r, true);
  else (BUILDERS[pkind] || BUILDERS.doodad)(a, r);
  return a;
}

window.ZPROP = { build, propKindOf, PROP_RULES, RIDEABLE, SLIPPERY,
                 mulberry32, pick, rr, hashStr, hexRgba,
                 dot, ell, cyl, cone, dome, box, flat, arcPts, starPts, V, TAU,
                 buildWolf, buildPiglet, INK };
})();
