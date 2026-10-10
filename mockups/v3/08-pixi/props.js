/* ============================================================
   The Three Little Pigs · PixiJS edition — props.js
   Shared kid-safe prop art catalog (same rough.js draw ops as
   the flagship 01-rough-canvas build). Each def draws with
   rough.js onto an OFFSCREEN canvas once -> baked PIXI.Texture.
   Seeded Rough.js sketch catalog. Every prop is a draw(rc,w,h,r)
   that crayons itself into a w×h box (bottom-anchored), driven by
   a mulberry32 rng so the same seed = the same doodle.
   ============================================================ */
'use strict';

const INK = '#2B2118';

/* ---------- seeded rng + sketch helpers (shared: world.js, maker.js, game.js) ---------- */
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
const PO = (r, extra) =>
  Object.assign({ stroke: INK, strokeWidth: 2.4, roughness: 2, seed: ((r() * 0x7ffffffe) | 0) + 1 }, extra);

function starPts(cx, cy, ro, ri, n, rot) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (Math.PI * i) / n;
    const rad = i % 2 ? ri : ro;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
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
/* string → int seed so "wolf" always draws the same wolf-ish */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 7;
}
window.RH = { mulberry32, pick, rr, PO, starPts, smoothPath, hashStr, INK };

/* ============================================================
   THE PROP CATALOG — Three Little Pigs edition
   ============================================================ */
const PROPDEF = {

  /* ---------------- houses & structures ---------------- */
  strawhouse: { w: 340, h: 290, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    const hw = 230, hh = 150, top = y - hh;
    /* hay walls — a big round-shouldered straw mound of a house */
    rc.path(`M ${cx - hw / 2} ${y} L ${cx - hw / 2 - 6} ${top + 30}
             Q ${cx} ${top - 34} ${cx + hw / 2 + 6} ${top + 30} L ${cx + hw / 2} ${y} Z`,
      PO(r, { fill: '#F2D488', fillStyle: 'hachure', hachureAngle: -48, hachureGap: 7, fillWeight: 1.2, strokeWidth: 3.2, bowing: 3 }));
    /* thatch strands sticking out everywhere */
    for (let i = 0; i < 16; i++) {
      const tx = cx + rr(r, -hw / 2, hw / 2), ty = rr(r, top + 10, y - 10);
      rc.line(tx, ty, tx + rr(r, -14, 14), ty - rr(r, 8, 22), PO(r, { stroke: '#D9A94B', strokeWidth: 2.2, roughness: 2.8 }));
    }
    /* wobbly thatch cap */
    rc.curve([[cx - hw / 2 - 10, top + 26], [cx - 40, top - 20], [cx + 46, top - 24], [cx + hw / 2 + 10, top + 24]],
      PO(r, { stroke: '#E8B94B', strokeWidth: 12, roughness: 2.6 }));
    rc.curve([[cx - hw / 2 - 10, top + 26], [cx - 40, top - 20], [cx + 46, top - 24], [cx + hw / 2 + 10, top + 24]],
      PO(r, { stroke: INK, strokeWidth: 2.6, roughness: 2.6 }));
    /* round window + straw door */
    rc.circle(cx + 62, top + 60, 34, PO(r, { fill: '#FFF6C9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.line(cx + 45, top + 60, cx + 79, top + 60, PO(r, { strokeWidth: 2 }));
    rc.line(cx + 62, top + 43, cx + 62, top + 77, PO(r, { strokeWidth: 2 }));
    rc.path(`M ${cx - 60} ${y} L ${cx - 60} ${y - 74} Q ${cx - 24} ${y - 96} ${cx + 8} ${y - 74} L ${cx + 10} ${y} Z`,
      PO(r, { fill: '#D9B078', fillStyle: 'hachure', hachureGap: 4.5, hachureAngle: -60, fillWeight: 1.2, strokeWidth: 2.8 }));
    rc.circle(cx - 2, y - 40, 5, PO(r, { fill: '#8A5E2E', fillStyle: 'solid', strokeWidth: 1.6 }));
    /* it wobbles in wind even standing still */
    for (const [sx, sy] of [[cx - hw / 2 - 16, y - 40], [cx + hw / 2 + 16, y - 90]])
      rc.curve([[sx, sy], [sx + 10, sy - 16], [sx - 4, sy - 30]], PO(r, { stroke: '#C9A23F', strokeWidth: 2.2, roughness: 3 }));
  }},

  stickhouse: { w: 340, h: 290, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    const hw = 240, hh = 158, top = y - hh;
    /* log-cabin-ish stack of sticks */
    rc.rectangle(cx - hw / 2, top, hw, hh, PO(r, { fill: '#C9A06B', fillStyle: 'hachure', hachureAngle: -12, hachureGap: 12, fillWeight: 1, strokeWidth: 3, bowing: 3 }));
    for (let i = 0; i < 5; i++) {
      const ly = top + 18 + i * 28;
      rc.line(cx - hw / 2 - 8 + rr(r, -4, 4), ly, cx + hw / 2 + 8 + rr(r, -4, 4), ly + rr(r, -4, 4),
        PO(r, { stroke: '#8A5E2E', strokeWidth: 7, roughness: 2.6 }));
      rc.circle(cx - hw / 2 - 8, ly, 7, PO(r, { fill: '#D9A96B', fillStyle: 'solid', strokeWidth: 1.8 }));
      rc.circle(cx + hw / 2 + 8, ly + 2, 7, PO(r, { fill: '#D9A96B', fillStyle: 'solid', strokeWidth: 1.8 }));
    }
    /* branch roof, slightly askew */
    rc.polygon([[cx - hw / 2 - 26, top + 4], [cx - 4, top - 62], [cx + hw / 2 + 20, top + 2]],
      PO(r, { fill: '#A9713F', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -35, fillWeight: 1.3, strokeWidth: 3 }));
    for (let i = 0; i < 4; i++) {
      const bx = cx - hw / 2 + 20 + i * 52;
      rc.line(bx, top + 2, bx + 42, top - 40, PO(r, { stroke: '#6B4A2A', strokeWidth: 4, roughness: 2.8 }));
    }
    /* square window + plank door */
    rc.rectangle(cx + 40, top + 40, 56, 52, PO(r, { fill: '#FFF6C9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.line(cx + 68, top + 40, cx + 68, top + 92, PO(r, { strokeWidth: 2 }));
    rc.line(cx + 40, top + 66, cx + 96, top + 66, PO(r, { strokeWidth: 2 }));
    rc.rectangle(cx - 78, y - 92, 62, 92, PO(r, { fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -58, fillWeight: 1.3, strokeWidth: 2.8 }));
    rc.line(cx - 66, y - 88, cx - 66, y - 8, PO(r, { stroke: '#6B4A2A', strokeWidth: 2.4 }));
    rc.line(cx - 40, y - 88, cx - 40, y - 8, PO(r, { stroke: '#6B4A2A', strokeWidth: 2.4 }));
    rc.circle(cx - 26, y - 48, 5, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    /* a couple of nails sticking out — it's a stick house */
    rc.line(cx - hw / 2 + 26, top - 8, cx - hw / 2 + 30, top - 22, PO(r, { strokeWidth: 2.4 }));
    rc.line(cx + hw / 2 - 30, top - 6, cx + hw / 2 - 24, top - 20, PO(r, { strokeWidth: 2.4 }));
  }},

  brickhouse: { w: 360, h: 310, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    const hw = 250, hh = 168, top = y - hh;
    /* SOLID brick walls */
    rc.rectangle(cx - hw / 2, top, hw, hh, PO(r, { fill: '#E0664F', fillStyle: 'hachure', hachureAngle: -32, hachureGap: 8, fillWeight: 1.3, strokeWidth: 3.4 }));
    /* brick courses */
    for (let row = 0; row < 6; row++) {
      const by = top + 16 + row * 26;
      rc.line(cx - hw / 2 + 2, by, cx + hw / 2 - 2, by, PO(r, { stroke: '#A8434F', strokeWidth: 2, roughness: 1.8 }));
      const off = (row % 2) * 22;
      for (let bxi = 0; bxi < 5; bxi++)
        rc.line(cx - hw / 2 + 24 + off + bxi * 44, by, cx - hw / 2 + 24 + off + bxi * 44, by + 26,
          PO(r, { stroke: '#A8434F', strokeWidth: 1.8, roughness: 1.6 }));
    }
    /* strong roof + chimney */
    rc.polygon([[cx - hw / 2 - 24, top + 2], [cx, top - 58], [cx + hw / 2 + 24, top + 2]],
      PO(r, { fill: '#6E6478', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -45, fillWeight: 1.3, strokeWidth: 3.2 }));
    rc.rectangle(cx + 66, top - 72, 36, 62, PO(r, { fill: '#C9553F', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.6 }));
    rc.rectangle(cx + 60, top - 82, 48, 14, PO(r, { fill: '#A8434F', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    /* smoke curls — somebody's home */
    rc.curve([[cx + 84, top - 88], [cx + 70, top - 108], [cx + 92, top - 126]], PO(r, { stroke: '#C9BEC8', strokeWidth: 5, roughness: 2.6 }));
    rc.curve([[cx + 92, top - 130], [cx + 80, top - 146], [cx + 98, top - 160]], PO(r, { stroke: '#C9BEC8', strokeWidth: 4, roughness: 2.6 }));
    /* two square windows + strong arched door */
    for (const wx of [cx - 74, cx + 74]) {
      rc.rectangle(wx - 30, top + 44, 60, 54, PO(r, { fill: '#FFF6C9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
      rc.line(wx, top + 44, wx, top + 98, PO(r, { strokeWidth: 2.2 }));
      rc.line(wx - 30, top + 71, wx + 30, top + 71, PO(r, { strokeWidth: 2.2 }));
      rc.rectangle(wx - 36, top + 98, 72, 10, PO(r, { fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
    }
    rc.path(`M ${cx - 34} ${y} L ${cx - 34} ${y - 84} Q ${cx} ${y - 116} ${cx + 34} ${y - 84} L ${cx + 34} ${y} Z`,
      PO(r, { fill: '#6B4A2A', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.4, strokeWidth: 3 }));
    rc.circle(cx + 20, y - 44, 6, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.rectangle(cx - 44, y - 4, 88, 12, PO(r, { fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
  }},

  cottage: { w: 340, h: 290, cat: 'structure', draw(rc, w, h, r) {
    /* friendly generic house — the "any house" fallback */
    const cx = w / 2, y = h - 8;
    rc.rectangle(cx - 110, y - 150, 220, 150, PO(r, { fill: '#FFDE9E', fillStyle: 'hachure', hachureAngle: -30, hachureGap: 7, fillWeight: 1.3, strokeWidth: 3 }));
    rc.polygon([[cx - 134, y - 148], [cx, y - 230], [cx + 134, y - 148]],
      PO(r, { fill: '#E86A4E', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.4, strokeWidth: 3 }));
    rc.rectangle(cx + 56, y - 214, 30, 60, PO(r, { fill: '#C98F5F', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.4 }));
    rc.curve([[cx + 70, y - 222], [cx + 58, y - 240], [cx + 76, y - 254]], PO(r, { stroke: '#C9BEC8', strokeWidth: 4.4, roughness: 2.6 }));
    for (const wx of [cx - 62, cx + 62]) {
      rc.circle(wx, y - 96, 40, PO(r, { fill: '#FFF6C9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
      rc.line(wx - 20, y - 96, wx + 20, y - 96, PO(r, { strokeWidth: 2 }));
      rc.line(wx, y - 116, wx, y - 76, PO(r, { strokeWidth: 2 }));
    }
    rc.rectangle(cx - 32, y - 108, 64, 108, PO(r, { fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.4, strokeWidth: 2.8 }));
    rc.circle(cx + 18, y - 52, 6, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
  }},

  /* ---------------- THE WOLF (huffy, kid-safe) ---------------- */
  wolf: { w: 310, h: 200, cat: 'wolf', draw(rc, w, h, r) {
    const cx = w / 2 + 6, y = h - 8;
    /* four stubby legs */
    for (const lx of [-70, -40, 30, 62]) {
      rc.line(cx + lx, y - 58, cx + lx - 2, y - 4, PO(r, { stroke: '#8E94A4', strokeWidth: 11 }));
      rc.line(cx + lx - 2, y - 8, cx + lx - 8, y - 2, PO(r, { stroke: '#5A5F6E', strokeWidth: 9 }));
    }
    /* big woolly tail, low and non-scary */
    rc.curve([[cx - 92, y - 84], [cx - 124, y - 92], [cx - 132, y - 56], [cx - 112, y - 50]],
      PO(r, { stroke: '#8E94A4', strokeWidth: 13, roughness: 2.6 }));
    rc.curve([[cx - 96, y - 78], [cx - 122, y - 84], [cx - 126, y - 58]], PO(r, { stroke: '#B9BEC9', strokeWidth: 6, roughness: 2.6 }));
    /* body — a shaggy gray lozenge */
    rc.ellipse(cx - 10, y - 76, 190, 88, PO(r, { fill: '#9AA0AE', fillStyle: 'hachure', hachureGap: 5.5, hachureAngle: -40, fillWeight: 1.3, strokeWidth: 3.2 }));
    /* scruff tufts */
    for (const tx of [-80, -50, -18, 14])
      rc.curve([[cx + tx, y - 116], [cx + tx + 8, y - 132], [cx + tx + 18, y - 114]],
        PO(r, { stroke: '#7B8090', strokeWidth: 3.4, roughness: 3 }));
    /* head + big snout */
    rc.circle(cx + 84, y - 112, 56, PO(r, { fill: '#9AA0AE', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 3.2 }));
    rc.ellipse(cx + 122, y - 100, 46, 30, PO(r, { fill: '#B9BEC9', fillStyle: 'hachure', hachureGap: 4.5, strokeWidth: 2.8 }));
    rc.circle(cx + 142, y - 104, 11, PO(r, { fill: '#4A3B52', fillStyle: 'solid', strokeWidth: 2 }));
    /* silly round ears */
    rc.circle(cx + 62, y - 152, 18, PO(r, { fill: '#9AA0AE', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.circle(cx + 66, y - 150, 8, PO(r, { fill: '#C9A0B4', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.circle(cx + 96, y - 158, 15, PO(r, { fill: '#9AA0AE', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    /* one grumpy-huffy eye + brow */
    rc.circle(cx + 96, y - 120, 10, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2.2 }));
    rc.circle(cx + 98, y - 118, 4, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.line(cx + 82, y - 136, cx + 108, y - 130, PO(r, { strokeWidth: 3.4 }));
    /* huffy cheeks + little breath cloud */
    rc.arc(cx + 128, y - 92, 22, 14, Math.PI * 0.05, Math.PI * 0.8, false, PO(r, { stroke: '#7B8090', strokeWidth: 2.6 }));
    rc.circle(cx - 14, y - 66, 30, PO(r, { fill: '#8E94A4', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 0 })); /* belly shade */
  }},

  /* ---------------- little pig pal ---------------- */
  pig: { w: 150, h: 130, cat: 'pal', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    for (const lx of [-34, -12, 14, 34])
      rc.line(cx + lx, y - 22, cx + lx, y - 2, PO(r, { stroke: '#E88BA0', strokeWidth: 8 }));
    /* curly tail */
    rc.curve([[cx - 52, y - 52], [cx - 66, y - 62], [cx - 62, y - 48], [cx - 70, y - 54]],
      PO(r, { stroke: '#E88BA0', strokeWidth: 3.6, roughness: 2.8 }));
    /* round pink body */
    rc.ellipse(cx, y - 48, 96, 70, PO(r, { fill: '#F5A0B5', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, fillWeight: 1.2, strokeWidth: 3 }));
    /* snout */
    rc.ellipse(cx + 34, y - 44, 26, 18, PO(r, { fill: '#F5A0B5', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.circle(cx + 30, y - 44, 2.6, PO(r, { fill: '#8A4B5C', fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 38, y - 44, 2.6, PO(r, { fill: '#8A4B5C', fillStyle: 'solid', stroke: 'none' }));
    /* happy eye + floppy ear */
    rc.circle(cx + 16, y - 62, 4, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.polygon([[cx - 4, y - 82], [cx - 14, y - 102], [cx + 12, y - 88]],
      PO(r, { fill: '#F5A0B5', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    /* blush */
    rc.circle(cx + 4, y - 38, 7, PO(r, { fill: '#F08090', fillStyle: 'solid', stroke: 'none' }));
    /* builder's belt */
    rc.line(cx - 40, y - 30, cx + 40, y - 30, PO(r, { stroke: '#8A5E2E', strokeWidth: 6 }));
    rc.rectangle(cx - 8, y - 36, 16, 14, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
  }},

  /* ---------------- material piles ---------------- */
  strawpile: { w: 220, h: 120, cat: 'material', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 96} ${y} Q ${cx - 80} ${y - 84} ${cx} ${y - 92} Q ${cx + 84} ${y - 86} ${cx + 96} ${y} Z`,
      PO(r, { fill: '#F2D488', fillStyle: 'hachure', hachureAngle: -50, hachureGap: 6, fillWeight: 1.3, strokeWidth: 2.8 }));
    for (let i = 0; i < 12; i++) {
      const tx = cx + rr(r, -88, 88), ty = rr(r, y - 80, y - 4);
      rc.line(tx, ty, tx + rr(r, -16, 16), ty - rr(r, 6, 18), PO(r, { stroke: '#D9A94B', strokeWidth: 2, roughness: 3 }));
    }
    rc.curve([[cx - 70, y - 30], [cx - 30, y - 52], [cx + 20, y - 40], [cx + 66, y - 56]],
      PO(r, { stroke: '#C9963B', strokeWidth: 2.4, roughness: 3 }));
  }},

  stickpile: { w: 220, h: 120, cat: 'material', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    /* a neat wobbly bundle of sticks */
    for (let i = 0; i < 5; i++) {
      const sy = y - 8 - i * 16, lean = rr(r, -14, 14);
      rc.line(cx - 84 + rr(r, -4, 4), sy, cx + 80 + rr(r, -6, 6), sy + lean * 0.4,
        PO(r, { stroke: pick(r, ['#8A5E2E', '#A9713F', '#6B4A2A']), strokeWidth: 8.5, roughness: 2.6 }));
    }
    /* rope ties */
    for (const tx of [cx - 44, cx + 40]) {
      rc.line(tx, y - 4, tx + 2, y - 76, PO(r, { stroke: '#B98A4F', strokeWidth: 3 }));
      rc.line(tx, y - 4, tx - 2, y - 76, PO(r, { stroke: '#B98A4F', strokeWidth: 3 }));
    }
    /* twiggy bits poking out */
    for (const [tx, dir] of [[cx - 88, -1], [cx + 84, 1]]) {
      rc.line(tx, y - 40, tx + dir * 16, y - 58, PO(r, { stroke: '#6B4A2A', strokeWidth: 3.4 }));
      rc.line(tx, y - 24, tx + dir * 12, y - 36, PO(r, { stroke: '#6B4A2A', strokeWidth: 3 }));
    }
  }},

  brickpile: { w: 220, h: 130, cat: 'material', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    /* pyramid of bricks: 3 + 2 + 1 */
    const bw = 64, bh = 26;
    for (let i = 0; i < 3; i++)
      rc.rectangle(cx - 96 + i * 68 + rr(r, -3, 3), y - bh, bw, bh,
        PO(r, { fill: pick(r, ['#E0664F', '#C9553F', '#D96B50']), fillStyle: 'hachure', hachureGap: 5, bowing: 2, strokeWidth: 2.4 }));
    for (let i = 0; i < 2; i++)
      rc.rectangle(cx - 62 + i * 66 + rr(r, -3, 3), y - bh * 2 - 4, bw, bh,
        PO(r, { fill: pick(r, ['#E0664F', '#C9553F']), fillStyle: 'hachure', hachureGap: 5, bowing: 2, strokeWidth: 2.4 }));
    rc.rectangle(cx - 30, y - bh * 3 - 10, bw, bh,
      PO(r, { fill: '#E0664F', fillStyle: 'hachure', hachureGap: 5, bowing: 3, strokeWidth: 2.4 }));
    /* mortar dashes + dust */
    for (let i = 0; i < 6; i++)
      rc.line(cx + rr(r, -90, 80), y - rr(r, 4, 100), cx + rr(r, -90, 80) + 10, y - rr(r, 4, 100),
        PO(r, { stroke: '#B9AFA0', strokeWidth: 1.8 }));
  }},

  /* ---------------- rides & crossings ---------------- */
  bridge: { w: 300, h: 130, cat: 'crossing', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 4;
    rc.path(`M ${cx - 140} ${y} Q ${cx} ${y - 92} ${cx + 140} ${y}`,
      PO(r, { stroke: '#9A6A3B', strokeWidth: 26, roughness: 2.4, bowing: 5 }));
    rc.path(`M ${cx - 140} ${y - 34} Q ${cx} ${y - 122} ${cx + 140} ${y - 34}`, PO(r, { strokeWidth: 3 }));
    for (let i = -3; i <= 3; i++) {
      const t = i / 3.4, px = cx + t * 132;
      const py = y - 46 * (1 - t * t);
      rc.line(px, py + 4, px, py - 34 - 40 * (1 - t * t) + 26, PO(r, { strokeWidth: 3 }));
    }
    rc.path(`M ${cx - 140} ${y} Q ${cx} ${y - 92} ${cx + 140} ${y}`,
      PO(r, { stroke: '#6B4A2A', strokeWidth: 3, roughness: 2.6 }));
  }},

  log: { w: 210, h: 80, cat: 'material', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 90, y - 40, 176, 34, PO(r, { fill: '#B07A43', fillStyle: 'hachure', hachureGap: 5, fillWeight: 1.4, bowing: 4, strokeWidth: 2.8 }));
    rc.circle(cx + 86, y - 23, 30, PO(r, { fill: '#D9A96B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.circle(cx + 86, y - 23, 14, PO(r, { strokeWidth: 1.8 }));
    rc.line(cx - 80, y - 30, cx + 66, y - 33, PO(r, { stroke: '#7A5027', strokeWidth: 1.8 }));
    rc.line(cx - 82, y - 14, cx + 66, y - 17, PO(r, { stroke: '#7A5027', strokeWidth: 1.8 }));
  }},

  plank: { w: 240, h: 64, cat: 'material', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 4;
    rc.rectangle(cx - 112, y - 22, 224, 18, PO(r, { fill: '#C9A06B', fillStyle: 'hachure', hachureGap: 5, bowing: 6, strokeWidth: 2.6 }));
    rc.line(cx - 100, y - 13, cx + 96, y - 15, PO(r, { stroke: '#8A5E2E', strokeWidth: 1.8 }));
    rc.circle(cx - 92, y - 13, 4, PO(r, { fill: '#6B4A2A', fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 92, y - 14, 4, PO(r, { fill: '#6B4A2A', fillStyle: 'solid', stroke: 'none' }));
  }},

  ladder: { w: 110, h: 220, cat: 'crossing', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 4;
    rc.line(cx - 26, y - 2, cx - 20, y - 210, PO(r, { stroke: '#A9713F', strokeWidth: 9 }));
    rc.line(cx + 26, y - 2, cx + 20, y - 210, PO(r, { stroke: '#A9713F', strokeWidth: 9 }));
    for (let i = 0; i < 5; i++)
      rc.line(cx - 26, y - 24 - i * 40, cx + 26, y - 26 - i * 40, PO(r, { strokeWidth: 6 }));
  }},

  stones: { w: 240, h: 80, cat: 'crossing', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    for (const [dx, s] of [[-78, 1], [-8, 1.15], [66, .95]])
      rc.ellipse(cx + dx, y - 16 * s, 48 * s, 26 * s,
        PO(r, { fill: pick(r, ['#B8B2A6', '#CDC7BA']), fillStyle: 'hachure', hachureGap: 4.5, strokeWidth: 2.6 }));
  }},

  boat: { w: 240, h: 110, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 108} ${y - 46} L ${cx + 108} ${y - 46} L ${cx + 76} ${y} L ${cx - 76} ${y} Z`,
      PO(r, { fill: '#B07A43', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -35, fillWeight: 1.4, strokeWidth: 3 }));
    rc.line(cx - 100, y - 46, cx + 100, y - 46, PO(r, { stroke: '#6B4A2A', strokeWidth: 3 }));
    rc.line(cx - 40, y - 46, cx - 40, y - 10, PO(r, { stroke: '#6B4A2A', strokeWidth: 2.4 }));
    rc.line(cx + 30, y - 46, cx + 30, y - 10, PO(r, { stroke: '#6B4A2A', strokeWidth: 2.4 }));
    rc.line(cx + 70, y - 70, cx + 96, y - 18, PO(r, { stroke: '#8A5E2E', strokeWidth: 5 }));
    rc.ellipse(cx + 98, y - 12, 14, 22, PO(r, { fill: '#8A5E2E', fillStyle: 'solid', strokeWidth: 2 }));
  }},

  raft: { w: 230, h: 76, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    for (let i = 0; i < 4; i++)
      rc.rectangle(cx - 104, y - 16 - i * 14, 208 - (i % 2) * 14, 12,
        PO(r, { fill: '#B07A43', fillStyle: 'hachure', hachureGap: 5, bowing: 5, strokeWidth: 2.2 }));
    rc.line(cx - 70, y - 4, cx - 70, y - 62, PO(r, { stroke: '#6B4A2A', strokeWidth: 4 }));
    rc.line(cx + 70, y - 4, cx + 70, y - 62, PO(r, { stroke: '#6B4A2A', strokeWidth: 4 }));
  }},

  barrel: { w: 150, h: 140, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    /* a round-bellied barrel — roll it! */
    rc.path(`M ${cx - 52} ${y - 18} Q ${cx - 66} ${y - 62} ${cx - 52} ${y - 116}
             L ${cx + 52} ${y - 116} Q ${cx + 66} ${y - 62} ${cx + 52} ${y - 18} Z`,
      PO(r, { fill: '#B07A43', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -35, fillWeight: 1.4, strokeWidth: 3 }));
    rc.ellipse(cx, y - 116, 52, 16, PO(r, { fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    /* stave lines + metal hoops */
    for (const dx of [-30, -10, 10, 30])
      rc.line(cx + dx, y - 110, cx + dx * 1.2, y - 20, PO(r, { stroke: '#7A5027', strokeWidth: 2, roughness: 1.8 }));
    for (const hy of [y - 96, y - 40]) {
      rc.curve([[cx - 58, hy], [cx, hy + 8], [cx + 58, hy]], PO(r, { stroke: '#5A5F6E', strokeWidth: 7, roughness: 2 }));
      rc.curve([[cx - 58, hy], [cx, hy + 8], [cx + 58, hy]], PO(r, { stroke: INK, strokeWidth: 1.6, roughness: 2 }));
    }
  }},

  duck: { w: 250, h: 160, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    rc.ellipse(cx - 10, y - 44, 150, 74, PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -35, fillWeight: 1.4, strokeWidth: 3 }));
    rc.circle(cx + 62, y - 98, 48, PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 3 }));
    rc.polygon([[cx + 82, y - 102], [cx + 112, y - 94], [cx + 82, y - 86]], PO(r, { fill: '#FF6B57', fillStyle: 'solid', strokeWidth: 2.2 }));
    rc.circle(cx + 68, y - 104, 6, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.path(`M ${cx - 80} ${y - 60} Q ${cx - 104} ${y - 66} ${cx - 96} ${y - 42}`, PO(r, { stroke: '#E8A020', strokeWidth: 5 }));
    rc.circle(cx + 52, y - 92, 9, PO(r, { fill: '#FF9E7A', fillStyle: 'solid', stroke: 'none' }));
  }},

  fish: { w: 240, h: 120, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    rc.ellipse(cx - 6, y - 52, 150, 74, PO(r, { fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, fillWeight: 1.4, strokeWidth: 3 }));
    rc.polygon([[cx + 66, y - 52], [cx + 108, y - 84], [cx + 104, y - 52], [cx + 108, y - 20]],
      PO(r, { fill: '#3F86C9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.polygon([[cx - 22, y - 84], [cx + 2, y - 104], [cx + 16, y - 84]], PO(r, { fill: '#3F86C9', fillStyle: 'solid', strokeWidth: 2.2 }));
    rc.circle(cx - 48, y - 60, 8, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx - 47, y - 59, 3.4, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    for (let i = 0; i < 3; i++)
      rc.arc(cx - 8 + i * 24, y - 52, 22, 60, -Math.PI / 2, Math.PI / 2, false, PO(r, { stroke: '#3F86C9', strokeWidth: 2.2 }));
  }},

  turtle: { w: 240, h: 110, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    for (const lx of [-70, -30, 34, 70])
      rc.ellipse(cx + lx, y - 10, 22, 14, PO(r, { fill: '#4FB06D', fillStyle: 'solid', strokeWidth: 2 }));
    rc.arc(cx, y - 16, 150, 92, Math.PI, Math.PI * 2, true,
      PO(r, { fill: '#3E8F57', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, strokeWidth: 3 }));
    rc.line(cx - 74, y - 16, cx + 74, y - 16, PO(r, { strokeWidth: 3 }));
    /* shell hexes */
    for (const dx of [-40, 0, 40])
      rc.ellipse(cx + dx, y - 52, 30, 22, PO(r, { stroke: '#2E7A46', strokeWidth: 2 }));
    rc.circle(cx + 92, y - 30, 24, PO(r, { fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.circle(cx + 98, y - 34, 4, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
  }},

  unicorn: { w: 310, h: 200, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2 - 20, y = h - 8;
    for (const lx of [-56, -24, 26, 58])
      rc.line(cx + lx, y - 56, cx + lx + 4, y - 2, PO(r, { stroke: '#EDEAF4', strokeWidth: 9 }));
    for (const lx of [-56, -24, 26, 58])
      rc.line(cx + lx + 1, y - 10, cx + lx + 6, y - 2, PO(r, { stroke: '#B565D8', strokeWidth: 9.4 }));
    rc.curve([[cx - 84, y - 92], [cx - 116, y - 60], [cx - 104, y - 18]], PO(r, { stroke: '#F58ACB', strokeWidth: 7, roughness: 2.6 }));
    rc.curve([[cx - 82, y - 86], [cx - 106, y - 56], [cx - 96, y - 20]], PO(r, { stroke: '#B565D8', strokeWidth: 4, roughness: 2.6 }));
    rc.ellipse(cx, y - 78, 172, 80, PO(r, { fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, fillWeight: 1.2, strokeWidth: 3.2 }));
    rc.curve([[cx + 52, y - 96], [cx + 76, y - 130], [cx + 84, y - 148]], PO(r, { stroke: '#EDEAF4', strokeWidth: 26, roughness: 1.8 }));
    rc.circle(cx + 92, y - 152, 44, PO(r, { fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 3 }));
    rc.ellipse(cx + 112, y - 140, 26, 18, PO(r, { fill: '#FBD9E8', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx + 86, y - 158, 6.5, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 88, y - 160, 2.4, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', stroke: 'none' }));
    rc.polygon([[cx + 84, y - 172], [cx + 102, y - 214], [cx + 108, y - 168]],
      PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 3.5, strokeWidth: 2.4 }));
    rc.line(cx + 90, y - 190, cx + 100, y - 188, PO(r, { stroke: '#E8A020', strokeWidth: 2 }));
    const maneCols = ['#F58ACB', '#B565D8', '#FF6B57'];
    for (let i = 0; i < 3; i++)
      rc.curve([[cx + 62 - i * 6, y - 138 + i * 4], [cx + 40 - i * 10, y - 118], [cx + 30 - i * 8, y - 92]],
        PO(r, { stroke: maneCols[i], strokeWidth: 5.5, roughness: 2.6 }));
    rc.curve([[cx + 84, y - 176], [cx + 70, y - 186], [cx + 60, y - 176]], PO(r, { stroke: '#F58ACB', strokeWidth: 5 }));
    rc.polygon(starPts(cx - 96, y - 140, 11, 5, 5, -Math.PI / 2), PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.polygon(starPts(cx + 130, y - 190, 9, 4, 5, -Math.PI / 2), PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.polygon(starPts(cx - 40, y - 160, 8, 3.5, 5, -Math.PI / 2), PO(r, { fill: '#F58ACB', fillStyle: 'solid', strokeWidth: 1.6 }));
  }},

  pony: { w: 290, h: 190, cat: 'ride', draw(rc, w, h, r) {
    /* unicorn without the horn — still a great ride */
    const cx = w / 2 - 16, y = h - 8;
    for (const lx of [-52, -22, 24, 54]) {
      rc.line(cx + lx, y - 52, cx + lx + 3, y - 2, PO(r, { stroke: '#C98F5F', strokeWidth: 9 }));
      rc.line(cx + lx + 1, y - 10, cx + lx + 5, y - 2, PO(r, { stroke: '#6B4A2A', strokeWidth: 9.4 }));
    }
    rc.curve([[cx - 78, y - 88], [cx - 108, y - 58], [cx - 98, y - 18]], PO(r, { stroke: '#8A5E2E', strokeWidth: 7, roughness: 2.6 }));
    rc.ellipse(cx, y - 74, 164, 76, PO(r, { fill: '#D9A96B', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, fillWeight: 1.2, strokeWidth: 3.2 }));
    rc.curve([[cx + 50, y - 92], [cx + 72, y - 124], [cx + 80, y - 140]], PO(r, { stroke: '#C98F5F', strokeWidth: 25, roughness: 1.8 }));
    rc.circle(cx + 88, y - 144, 42, PO(r, { fill: '#D9A96B', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 3 }));
    rc.ellipse(cx + 106, y - 132, 24, 17, PO(r, { fill: '#B98A6B', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx + 82, y - 150, 6, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.polygon([[cx + 72, y - 168], [cx + 80, y - 190], [cx + 92, y - 166]], PO(r, { fill: '#C98F5F', fillStyle: 'solid', strokeWidth: 2.2 }));
    for (let i = 0; i < 3; i++)
      rc.curve([[cx + 60 - i * 5, y - 132 + i * 3], [cx + 40 - i * 8, y - 112], [cx + 30 - i * 7, y - 88]],
        PO(r, { stroke: '#8A5E2E', strokeWidth: 5, roughness: 2.6 }));
  }},

  dragon: { w: 300, h: 190, cat: 'ride', draw(rc, w, h, r) {
    const cx = w / 2 - 10, y = h - 8;
    for (const lx of [-58, -24, 28, 60])
      rc.line(cx + lx, y - 54, cx + lx + 4, y - 2, PO(r, { stroke: '#3E8F57', strokeWidth: 10 }));
    rc.curve([[cx - 88, y - 80], [cx - 126, y - 66], [cx - 138, y - 30]],
      PO(r, { stroke: '#3E8F57', strokeWidth: 11, roughness: 2.6 }));
    rc.ellipse(cx, y - 72, 176, 82, PO(r, { fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 5.5, hachureAngle: -40, fillWeight: 1.3, strokeWidth: 3.2 }));
    rc.ellipse(cx + 2, y - 58, 110, 50, PO(r, { fill: '#B7E6C3', fillStyle: 'solid', strokeWidth: 2 }));
    /* wing */
    rc.polygon([[cx - 30, y - 106], [cx - 66, y - 168], [cx - 8, y - 136], [cx + 12, y - 110]],
      PO(r, { fill: '#7CC97F', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -50, strokeWidth: 2.8 }));
    /* head + snout + tiny horn nubs */
    rc.circle(cx + 86, y - 116, 44, PO(r, { fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 3 }));
    rc.ellipse(cx + 114, y - 104, 32, 22, PO(r, { fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.circle(cx + 120, y - 108, 3.4, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 78, y - 122, 7, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx + 79, y - 121, 3, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.polygon([[cx + 68, y - 152], [cx + 76, y - 172], [cx + 84, y - 150]], PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2 }));
    /* friendly puff of smoke */
    rc.circle(cx + 142, y - 116, 9, PO(r, { fill: '#D8DEE8', fillStyle: 'solid', strokeWidth: 1.4 }));
    rc.circle(cx + 156, y - 126, 6, PO(r, { fill: '#D8DEE8', fillStyle: 'solid', strokeWidth: 1.2 }));
  }},

  /* ---------------- head props & rain gear ---------------- */
  umbrella: { w: 190, h: 140, cat: 'head', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 82} ${y - 78} A 84 84 0 0 1 ${cx + 82} ${y - 78} Q ${cx + 41} ${y - 68} ${cx} ${y - 78} Q ${cx - 41} ${y - 68} ${cx - 82} ${y - 78} Z`,
      PO(r, { fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 3 }));
    rc.line(cx, y - 78, cx, y - 10, PO(r, { strokeWidth: 3.4 }));
    rc.arc(cx - 9, y - 10, 18, 15, Math.PI * 0.05, Math.PI, false, PO(r, { strokeWidth: 3 }));
    rc.polygon([[cx - 5, y - 132], [cx + 9, y - 138], [cx + 3, y - 122]], PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2 }));
  }},

  hat: { w: 150, h: 90, cat: 'head', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 34} ${y - 8} L ${cx - 30} ${y - 52} Q ${cx} ${y - 66} ${cx + 30} ${y - 52} L ${cx + 34} ${y - 8} Z`,
      PO(r, { fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.ellipse(cx, y - 8, 118, 20, PO(r, { fill: '#3F86C9', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.6 }));
    rc.line(cx - 30, y - 26, cx + 30, y - 26, PO(r, { stroke: '#FFC53D', strokeWidth: 5 }));
  }},

  leaf: { w: 160, h: 110, cat: 'head', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 64} ${y - 20} Q ${cx - 30} ${y - 84} ${cx + 56} ${y - 74} Q ${cx + 70} ${y - 20} ${cx - 64} ${y - 20} Z`,
      PO(r, { fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -45, strokeWidth: 2.8 }));
    rc.curve([[cx - 60, y - 22], [cx, y - 48], [cx + 52, y - 68]], PO(r, { stroke: '#2E7A46', strokeWidth: 3 }));
    rc.line(cx - 62, y - 20, cx - 78, y + 2, PO(r, { stroke: '#2E7A46', strokeWidth: 4 }));
    for (const [lx, ly] of [[-18, -40], [6, -50], [28, -58]])
      rc.line(cx + lx, y + ly + 8, cx + lx + 10, y + ly - 6, PO(r, { stroke: '#2E7A46', strokeWidth: 1.8 }));
  }},

  newspaper: { w: 180, h: 84, cat: 'head', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.polygon([[cx - 82, y - 10], [cx - 10, y - 62], [cx + 70, y - 44], [cx + 82, y - 10]],
      PO(r, { fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 8, fillWeight: .8, strokeWidth: 2.6 }));
    rc.line(cx - 10, y - 62, cx + 8, y - 14, PO(r, { strokeWidth: 2 }));
    for (let i = 0; i < 3; i++)
      rc.line(cx - 60 + i * 8, y - 24 - i * 6, cx - 22 + i * 6, y - 38 - i * 4, PO(r, { stroke: '#8B93A8', strokeWidth: 1.6 }));
  }},

  mushroom: { w: 140, h: 120, cat: 'head', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 16, y - 44, 32, 44, PO(r, { fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 4.5, strokeWidth: 2.4 }));
    rc.path(`M ${cx - 56} ${y - 40} Q ${cx} ${y - 118} ${cx + 56} ${y - 40} Z`,
      PO(r, { fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    for (const [dx, s] of [[-24, 8], [4, 7], [28, 9]])
      rc.circle(cx + dx, y - 68 - Math.abs(dx) * 0.4, s, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 1.4 }));
  }},

  bucket: { w: 120, h: 120, cat: 'head', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.polygon([[cx - 40, y - 92], [cx + 40, y - 92], [cx + 32, y], [cx - 32, y]],
      PO(r, { fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    rc.ellipse(cx, y - 92, 44, 12, PO(r, { fill: '#FF9C86', fillStyle: 'solid', strokeWidth: 2.4 }));
    rc.arc(cx, y - 92, 56, 40, Math.PI * 1.05, Math.PI * 1.95, false, PO(r, { strokeWidth: 3 }));
  }},

  /* ---------------- lights ---------------- */
  lantern: { w: 130, h: 150, cat: 'light', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.arc(cx, y - 138, 30, 22, Math.PI, Math.PI * 2, false, PO(r, { strokeWidth: 3 }));
    rc.rectangle(cx - 30, y - 122, 60, 18, PO(r, { fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.rectangle(cx - 24, y - 104, 48, 74, PO(r, { fill: '#FFE9A0', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.2, strokeWidth: 2.8 }));
    rc.rectangle(cx - 30, y - 30, 60, 24, PO(r, { fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.circle(cx, y - 66, 14, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
    for (const a of [-0.7, 0, 0.7])
      rc.line(cx + Math.sin(a) * 40, y - 60 + Math.cos(a) * 6 - 8, cx + Math.sin(a) * 56, y - 60 + Math.cos(a) * 6 - 12,
        PO(r, { stroke: '#F0C94B', strokeWidth: 2.4 }));
  }},

  torch: { w: 110, h: 150, cat: 'light', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.line(cx, y - 8, cx + 4, y - 92, PO(r, { stroke: '#8A5E2E', strokeWidth: 9 }));
    rc.line(cx - 8, y - 92, cx + 14, y - 92, PO(r, { stroke: '#6B4A2A', strokeWidth: 5 }));
    rc.path(`M ${cx - 18} ${y - 92} Q ${cx - 24} ${y - 128} ${cx + 2} ${y - 142} Q ${cx + 26} ${y - 124} ${cx + 18} ${y - 92} Z`,
      PO(r, { fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 4, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.path(`M ${cx - 9} ${y - 94} Q ${cx - 11} ${y - 118} ${cx + 3} ${y - 128} Q ${cx + 14} ${y - 114} ${cx + 10} ${y - 94} Z`,
      PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2 }));
  }},

  candle: { w: 100, h: 140, cat: 'light', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 18, y - 74, 36, 74, PO(r, { fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.6 }));
    rc.curve([[cx - 18, y - 60], [cx - 24, y - 46], [cx - 18, y - 38]], PO(r, { strokeWidth: 2.4 }));
    rc.ellipse(cx, y - 4, 60, 14, PO(r, { fill: '#D9CBB2', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    rc.line(cx, y - 74, cx, y - 86, PO(r, { strokeWidth: 2.4 }));
    rc.path(`M ${cx - 10} ${y - 88} Q ${cx - 8} ${y - 112} ${cx + 2} ${y - 118} Q ${cx + 12} ${y - 106} ${cx + 10} ${y - 88} Z`,
      PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 3.5, strokeWidth: 2.2 }));
  }},

  firefly: { w: 150, h: 140, cat: 'light', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 34, y - 96, 68, 92, PO(r, { fill: '#DFF2FB', fillStyle: 'hachure', hachureGap: 9, fillWeight: .8, strokeWidth: 2.6 }));
    rc.rectangle(cx - 40, y - 108, 80, 16, PO(r, { fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    for (let i = 0; i < 5; i++)
      rc.circle(cx + rr(r, -22, 22), y - 20 - rr(r, 0, 66), rr(r, 5, 8), PO(r, { fill: '#E8F75E', fillStyle: 'solid', strokeWidth: 1.4 }));
    for (const [ex, ey] of [[cx - 52, y - 96], [cx + 54, y - 76]]) {
      rc.circle(ex, ey, 7, PO(r, { fill: '#E8F75E', fillStyle: 'solid', strokeWidth: 1.6 }));
      rc.line(ex - 3, ey - 4, ex + 3, ey + 4, PO(r, { strokeWidth: 1.4 }));
      for (let d = 1; d < 4; d++) rc.circle(ex + d * 8, ey + d * 6, 2.6, PO(r, { fill: '#E8F75E', fillStyle: 'solid', stroke: 'none' }));
    }
  }},

  starprop: { w: 130, h: 130, cat: 'light', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    rc.polygon(starPts(cx, y - 62, 52, 24, 5, -Math.PI / 2),
      PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4.5, hachureAngle: -40, strokeWidth: 3 }));
    rc.circle(cx - 12, y - 68, 3.6, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 12, y - 68, 3.6, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.arc(cx, y - 56, 16, 10, Math.PI * 0.15, Math.PI * 0.85, false, PO(r, { strokeWidth: 2.4 }));
    for (const a of [-0.9, 0.9])
      rc.line(cx + Math.sin(a) * 62, y - 60, cx + Math.sin(a) * 78, y - 60, PO(r, { stroke: '#F0C94B', strokeWidth: 2.4 }));
  }},

  matchstick: { w: 100, h: 130, cat: 'light', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.line(cx - 14, y - 6, cx + 10, y - 84, PO(r, { stroke: '#D9A96B', strokeWidth: 6 }));
    rc.ellipse(cx + 12, y - 92, 16, 22, PO(r, { fill: '#4A3B52', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    for (let i = 0; i < 3; i++)
      rc.curve([[cx + 10 + i * 4, y - 106], [cx + 4 + i * 4, y - 118], [cx + 12 + i * 4, y - 126]],
        PO(r, { stroke: '#8B93A8', strokeWidth: 2, roughness: 3 }));
  }},

  /* ---------------- sillies & heavies ---------------- */
  peel: { w: 130, h: 80, cat: 'slip', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 10, 24, 15, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2.4 }));
    rc.path(`M ${cx - 3} ${y - 14} Q ${cx - 36} ${y - 20} ${cx - 40} ${y - 4} Q ${cx - 22} ${y - 8} ${cx - 3} ${y - 14} Z`,
      PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.path(`M ${cx + 3} ${y - 14} Q ${cx + 36} ${y - 24} ${cx + 40} ${y - 8} Q ${cx + 22} ${y - 8} ${cx + 3} ${y - 14} Z`,
      PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.path(`M ${cx} ${y - 16} Q ${cx - 5} ${y - 48} ${cx + 6} ${y - 52} Q ${cx + 7} ${y - 26} ${cx} ${y - 16} Z`,
      PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
  }},

  soap: { w: 130, h: 90, cat: 'slip', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 48, y - 40, 96, 38, PO(r, { fill: '#BFE8FF', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, bowing: 6, strokeWidth: 2.8 }));
    rc.ellipse(cx, y - 21, 60, 16, PO(r, { stroke: '#8FD0F5', strokeWidth: 2 }));
    for (const [bx, by, s] of [[cx + 44, y - 52, 12], [cx + 60, y - 36, 8], [cx + 30, y - 62, 6]])
      rc.circle(bx, by, s, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 1.6 }));
  }},

  slime: { w: 230, h: 76, cat: 'slip', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 10, 196, 34, PO(r, { fill: '#7ED957', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.circle(cx - 56, y - 22, 10, PO(r, { fill: '#7ED957', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.circle(cx + 48, y - 26, 8, PO(r, { fill: '#7ED957', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.arc(cx - 14, y - 20, 42, 16, Math.PI * 1.15, Math.PI * 1.85, false, PO(r, { stroke: '#B7E6C3', strokeWidth: 3 }));
    rc.circle(cx + 76, y - 40, 5, PO(r, { fill: '#7ED957', fillStyle: 'solid', strokeWidth: 1.4 }));
  }},

  toaster: { w: 150, h: 140, cat: 'heavy', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 56, y - 92, 112, 92, PO(r, { fill: '#B9C9D8', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    for (const sx of [-22, 16])
      rc.rectangle(cx + sx, y - 100, 40, 10, PO(r, { fill: '#4A3B52', fillStyle: 'solid', strokeWidth: 2 }));
    rc.rectangle(cx - 4, y - 122, 34, 26, PO(r, { fill: '#F5E2B8', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    rc.line(cx + 62, y - 76, cx + 74, y - 76, PO(r, { strokeWidth: 3 }));
    rc.circle(cx + 76, y - 76, 7, PO(r, { fill: '#4A3B52', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.line(cx - 40, y - 6, cx - 40, y, PO(r, { strokeWidth: 4 }));
    rc.line(cx + 40, y - 6, cx + 40, y, PO(r, { strokeWidth: 4 }));
  }},

  fridge: { w: 170, h: 220, cat: 'heavy', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 66, y - 204, 132, 204, PO(r, { fill: '#DDE6EF', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.1, strokeWidth: 3 }));
    rc.line(cx - 66, y - 130, cx + 66, y - 130, PO(r, { strokeWidth: 2.6 }));
    rc.line(cx - 46, y - 118, cx - 46, y - 60, PO(r, { stroke: '#8B93A8', strokeWidth: 6 }));
    rc.line(cx - 46, y - 190, cx - 46, y - 152, PO(r, { stroke: '#8B93A8', strokeWidth: 6 }));
    rc.rectangle(cx + 8, y - 190, 30, 26, PO(r, { fill: '#FF6B57', fillStyle: 'solid', strokeWidth: 2 }));
    rc.circle(cx + 34, y - 108, 9, PO(r, { fill: '#5DA9E9', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.polygon([[cx - 10, y - 106], [cx + 8, y - 106], [cx - 2, y - 92]], PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.line(cx - 50, y - 6, cx - 50, y, PO(r, { strokeWidth: 5 }));
    rc.line(cx + 50, y - 6, cx + 50, y, PO(r, { strokeWidth: 5 }));
  }},

  rock: { w: 150, h: 90, cat: 'heavy', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.polygon([[cx - 56, y], [cx - 60, y - 26], [cx - 24, y - 54], [cx + 18, y - 58], [cx + 54, y - 30], [cx + 52, y]],
      PO(r, { fill: '#A9A39B', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.8 }));
    rc.line(cx - 18, y - 42, cx + 4, y - 28, PO(r, { stroke: '#7d766c', strokeWidth: 1.8 }));
  }},

  anvil: { w: 170, h: 110, cat: 'heavy', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 72} ${y - 78} L ${cx - 12} ${y - 78} L ${cx + 4} ${y - 92} L ${cx + 4} ${y - 70}
             L ${cx + 70} ${y - 70} Q ${cx + 74} ${y - 46} ${cx + 30} ${y - 44} L ${cx + 20} ${y - 12}
             L ${cx + 38} ${y - 12} L ${cx + 38} ${y} L ${cx - 38} ${y} L ${cx - 38} ${y - 12}
             L ${cx - 18} ${y - 12} L ${cx - 28} ${y - 44} Q ${cx - 72} ${y - 50} ${cx - 72} ${y - 78} Z`,
      PO(r, { fill: '#6F7B8A', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, strokeWidth: 3 }));
    rc.line(cx - 30, y - 30, cx + 24, y - 30, PO(r, { stroke: '#525F6E', strokeWidth: 2.4 }));
  }},

  piano: { w: 170, h: 130, cat: 'heavy', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 74, y - 96, 148, 70, PO(r, { fill: '#4A3B52', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, strokeWidth: 3 }));
    rc.rectangle(cx - 62, y - 56, 124, 24, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2.4 }));
    for (let i = 0; i < 7; i++)
      rc.line(cx - 54 + i * 18, y - 54, cx - 54 + i * 18, y - 44, PO(r, { strokeWidth: 2 }));
    rc.line(cx - 56, y, cx - 56, y - 26, PO(r, { strokeWidth: 6 }));
    rc.line(cx + 56, y, cx + 56, y - 26, PO(r, { strokeWidth: 6 }));
    rc.circle(cx - 44, y - 78, 6, PO(r, { fill: '#FFC53D', fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 44, y - 78, 6, PO(r, { fill: '#FFC53D', fillStyle: 'solid', stroke: 'none' }));
  }},

  tv: { w: 140, h: 140, cat: 'heavy', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.line(cx - 18, y - 122, cx - 2, y - 100, PO(r, { strokeWidth: 4 }));
    rc.line(cx + 20, y - 124, cx + 4, y - 100, PO(r, { strokeWidth: 4 }));
    rc.circle(cx - 19, y - 126, 5, PO(r, { fill: INK, fillStyle: 'solid' }));
    rc.circle(cx + 21, y - 128, 5, PO(r, { fill: INK, fillStyle: 'solid' }));
    rc.rectangle(cx - 62, y - 100, 124, 84, PO(r, { fill: '#A9713F', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 3 }));
    rc.rectangle(cx - 48, y - 88, 74, 58, PO(r, { fill: '#BFE8FF', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.4 }));
    rc.circle(cx + 44, y - 78, 7, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.circle(cx + 44, y - 56, 7, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.line(cx - 50, y, cx - 50, y - 16, PO(r, { strokeWidth: 5 }));
    rc.line(cx + 50, y, cx + 50, y - 16, PO(r, { strokeWidth: 5 }));
  }},

  paperbag: { w: 140, h: 150, cat: 'head', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 46} ${y} L ${cx - 50} ${y - 96} L ${cx - 34} ${y - 108} L ${cx - 20} ${y - 96} L ${cx - 4} ${y - 110} L ${cx + 14} ${y - 98} L ${cx + 30} ${y - 110} L ${cx + 44} ${y - 96} L ${cx + 46} ${y} Z`,
      PO(r, { fill: '#D9B98A', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.rectangle(cx - 34, y - 76, 66, 40, PO(r, { stroke: '#B98A4F', strokeWidth: 1.8 }));
    rc.line(cx - 30, y - 52, cx + 28, y - 54, PO(r, { stroke: '#B98A4F', strokeWidth: 1.6 }));
  }},

  toast: { w: 120, h: 120, cat: 'silly', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 8;
    rc.path(`M ${cx - 40} ${y} L ${cx - 42} ${y - 74} Q ${cx - 44} ${y - 104} ${cx - 16} ${y - 100} Q ${cx} ${y - 112} ${cx + 16} ${y - 100} Q ${cx + 44} ${y - 104} ${cx + 42} ${y - 74} L ${cx + 40} ${y} Z`,
      PO(r, { fill: '#E8B96C', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, strokeWidth: 2.8 }));
    rc.path(`M ${cx - 30} ${y - 6} L ${cx - 32} ${y - 70} Q ${cx - 32} ${y - 92} ${cx - 12} ${y - 90} M ${cx + 30} ${y - 6} L ${cx + 32} ${y - 70} Q ${cx + 32} ${y - 92} ${cx + 12} ${y - 90}`,
      PO(r, { stroke: '#B98A4F', strokeWidth: 2.4 }));
    rc.ellipse(cx + 6, y - 46, 20, 26, PO(r, { fill: '#FFE9A0', fillStyle: 'solid', strokeWidth: 1.6 }));
  }},

  sponge: { w: 150, h: 100, cat: 'silly', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 60, y - 58, 120, 58, PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -30, bowing: 5, strokeWidth: 2.8 }));
    for (const [hx, hy, hr] of [[-36, -40, 7], [-4, -22, 6], [22, -44, 8], [44, -18, 5], [-20, -10, 4]])
      rc.circle(cx + hx, y + hy, hr * 2, PO(r, { fill: '#E8A020', fillStyle: 'solid', stroke: 'none' }));
  }},

  sock: { w: 110, h: 140, cat: 'silly', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.path(`M ${cx - 16} ${y - 112} L ${cx + 14} ${y - 112} L ${cx + 14} ${y - 56} Q ${cx + 40} ${y - 46} ${cx + 34} ${y - 22} Q ${cx + 26} ${y - 4} ${cx} ${y - 8} Q ${cx - 16} ${y - 14} ${cx - 16} ${y - 40} Z`,
      PO(r, { fill: '#9FC3E8', fillStyle: 'hachure', hachureGap: 4.5, hachureAngle: -35, strokeWidth: 2.6 }));
    rc.line(cx - 16, y - 104, cx + 14, y - 104, PO(r, { stroke: '#5DA9E9', strokeWidth: 4 }));
    for (let i = 0; i < 3; i++)
      rc.curve([[cx - 18 + i * 14, y - 118], [cx - 24 + i * 14, y - 128], [cx - 14 + i * 14, y - 136]], PO(r, { stroke: '#8B93A8', strokeWidth: 2, roughness: 3 }));
  }},

  pickle: { w: 120, h: 130, cat: 'silly', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 60, 52, 104, PO(r, { fill: '#4FB06D', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    for (const [px, py] of [[-12, -88], [10, -66], [-8, -42], [12, -96], [-14, -70]])
      rc.circle(cx + px, y + py, 5, PO(r, { fill: '#3E8F57', fillStyle: 'solid', stroke: 'none' }));
  }},

  /* ---------------- scenery props ---------------- */
  tree: { w: 150, h: 180, cat: 'scenery', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 9, y - 66, 18, 68, PO(r, { fill: '#9A6A3B', fillStyle: 'hachure', hachureGap: 4, fillWeight: 1.3, strokeWidth: 2.4 }));
    const gcols = ['#58BC7B', '#4FB06D', '#7CC97F'];
    for (let k = 0; k < 3; k++) {
      const ang = (Math.PI * 2 * k) / 3 - Math.PI / 2;
      rc.circle(cx + Math.cos(ang) * 22, y - 74 + Math.sin(ang) * 20, 42 * rr(r, .85, 1.05),
        PO(r, { fill: pick(r, gcols), fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, fillWeight: 1.2, strokeWidth: 2.4 }));
    }
    rc.circle(cx, y - 94, 48, PO(r, { fill: '#4FB06D', fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, fillWeight: 1.2, strokeWidth: 2.4 }));
  }},

  pinetree: { w: 140, h: 190, cat: 'scenery', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 8, y - 34, 16, 36, PO(r, { fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    for (const [ty, tw] of [[y - 40, 118], [y - 96, 88], [y - 146, 56]])
      rc.polygon([[cx - tw / 2, ty + 16], [cx, ty - 34], [cx + tw / 2, ty + 16]],
        PO(r, { fill: '#3E8F57', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.2, strokeWidth: 2.6 }));
  }},

  bush: { w: 150, h: 80, cat: 'scenery', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    for (const [dx, s] of [[-34, .9], [0, 1.1], [36, .85]])
      rc.circle(cx + dx, y - 26 * s, 40 * s, PO(r, { fill: pick(r, ['#4FB06D', '#58BC7B']), fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, strokeWidth: 2.4 }));
    rc.circle(cx - 20, y - 34, 5, PO(r, { fill: '#FF6B57', fillStyle: 'solid', strokeWidth: 1.4 }));
    rc.circle(cx + 24, y - 28, 5, PO(r, { fill: '#F58ACB', fillStyle: 'solid', strokeWidth: 1.4 }));
  }},

  flower: { w: 70, h: 90, cat: 'scenery', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    const col = pick(r, ['#FF6B57', '#FFC53D', '#F58ACB', '#FFFDF6']);
    rc.line(cx, y, cx + rr(r, -4, 4), y - 46, PO(r, { stroke: '#3E8F57', strokeWidth: 2.6 }));
    rc.ellipse(cx - 8, y - 20, 14, 7, PO(r, { fill: '#4FB06D', fillStyle: 'solid', strokeWidth: 1.6 }));
    const fy = y - 52;
    for (let p = 0; p < 5; p++) {
      const a = (Math.PI * 2 * p) / 5 - Math.PI / 2;
      rc.circle(cx + Math.cos(a) * 11, fy + Math.sin(a) * 11, 10, PO(r, { fill: col, fillStyle: 'solid', strokeWidth: 1.6 }));
    }
    rc.circle(cx, fy, 8, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
  }},

  fence: { w: 240, h: 80, cat: 'scenery', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    for (let i = 0; i < 5; i++) {
      const fx = cx - 104 + i * 52;
      rc.rectangle(fx - 6, y - 58, 12, 60, PO(r, { fill: '#C9A06B', fillStyle: 'hachure', hachureGap: 4, bowing: 3, strokeWidth: 2 }));
      rc.polygon([[fx - 7, y - 56], [fx, y - 68], [fx + 7, y - 56]], PO(r, { fill: '#C9A06B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
    }
    rc.line(cx - 116, y - 40, cx + 116, y - 34, PO(r, { stroke: '#C9A06B', strokeWidth: 6 }));
    rc.line(cx - 116, y - 18, cx + 116, y - 14, PO(r, { stroke: '#C9A06B', strokeWidth: 6 }));
  }},

  raincloud: { w: 200, h: 150, cat: 'weather', draw(rc, w, h, r) {
    const cx = w / 2, cy = 58;
    rc.ellipse(cx - 34, cy + 12, 58, 38, PO(r, { fill: '#B9C4D4', fillStyle: 'solid', strokeWidth: 2.4 }));
    rc.ellipse(cx + 4, cy - 4, 74, 52, PO(r, { fill: '#B9C4D4', fillStyle: 'solid', strokeWidth: 2.6 }));
    rc.ellipse(cx + 42, cy + 12, 54, 36, PO(r, { fill: '#B9C4D4', fillStyle: 'solid', strokeWidth: 2.4 }));
    /* grumpy little face */
    rc.line(cx - 20, cy - 10, cx - 6, cy - 6, PO(r, { strokeWidth: 2.6 }));
    rc.line(cx + 20, cy - 10, cx + 6, cy - 6, PO(r, { strokeWidth: 2.6 }));
    rc.circle(cx - 12, cy + 2, 3, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 12, cy + 2, 3, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.arc(cx, cy + 16, 10, 7, Math.PI * 1.15, Math.PI * 1.85, false, PO(r, { strokeWidth: 2.2 }));
    /* the rain it is grumpy about */
    for (const dx of [-46, -16, 14, 44])
      rc.line(cx + dx, cy + 40, cx + dx - 8, cy + 76, PO(r, { stroke: '#7FB8E8', strokeWidth: 3, roughness: 2.6 }));
  }},

  sunprop: { w: 150, h: 150, cat: 'scenery', draw(rc, w, h, r) {
    const cx = w / 2, cy = h / 2;
    rc.circle(cx, cy, 58, PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureAngle: 60, hachureGap: 4.5, fillWeight: 1.5, strokeWidth: 3 }));
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + rr(r, -0.1, 0.1);
      rc.line(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38,
        cx + Math.cos(a) * rr(r, 52, 62), cy + Math.sin(a) * rr(r, 52, 62),
        PO(r, { stroke: '#F0A428', strokeWidth: 3.2, roughness: 2.6 }));
    }
    rc.circle(cx - 11, cy - 6, 3.6, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.circle(cx + 11, cy - 6, 3.6, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
    rc.arc(cx, cy + 4, 16, 11, Math.PI * 0.15, Math.PI * 0.85, false, PO(r, { strokeWidth: 2.6 }));
  }},

  moon: { w: 120, h: 130, cat: 'scenery', draw(rc, w, h, r) {
    const cx = w / 2, cy = h / 2;
    rc.circle(cx, cy, 52, PO(r, { fill: '#FFF1C4', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, strokeWidth: 2.8 }));
    rc.circle(cx - 14, cy - 10, 9, PO(r, { fill: '#EFE0B0', fillStyle: 'solid', strokeWidth: 1.4 }));
    rc.circle(cx + 12, cy + 14, 6, PO(r, { fill: '#EFE0B0', fillStyle: 'solid', strokeWidth: 1.4 }));
    rc.circle(cx + 16, cy - 18, 5, PO(r, { fill: '#EFE0B0', fillStyle: 'solid', strokeWidth: 1.4 }));
  }},

  door: { w: 140, h: 190, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 48, y - 130, 96, 130, PO(r, { fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 6, strokeWidth: 2.6 }));
    rc.rectangle(cx - 36, y - 118, 72, 118, PO(r, { fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.4, strokeWidth: 2.8 }));
    rc.circle(cx + 22, y - 58, 7, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
    rc.rectangle(cx - 52, y - 4, 104, 14, PO(r, { fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
  }},

  dooropen: { w: 150, h: 190, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 34, y - 116, 68, 116, PO(r, { fill: '#FFE9A0', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, fillWeight: 1.6, strokeWidth: 2.2 }));
    rc.polygon([[cx - 34, y - 116], [cx - 62, y - 100], [cx - 62, y - 6], [cx - 34, y]],
      PO(r, { fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.4, strokeWidth: 2.6 }));
    rc.circle(cx - 44, y - 58, 5, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.6 }));
    rc.polygon([[cx - 30, y - 30], [cx + 30, y - 30], [cx + 52, y + 4], [cx - 52, y + 4]],
      PO(r, { fill: '#FFF1C4', fillStyle: 'solid', stroke: 'none' }));
    rc.rectangle(cx - 46, y - 2, 92, 12, PO(r, { fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
  }},

  window: { w: 130, h: 140, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 10;
    rc.rectangle(cx - 46, y - 110, 92, 96, PO(r, { fill: '#FFF6C9', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 3 }));
    rc.rectangle(cx - 54, y - 118, 108, 14, PO(r, { fill: '#C9A06B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.4 }));
    rc.line(cx, y - 110, cx, y - 14, PO(r, { strokeWidth: 2.6 }));
    rc.line(cx - 46, y - 62, cx + 46, y - 62, PO(r, { strokeWidth: 2.6 }));
    rc.rectangle(cx - 54, y - 14, 108, 12, PO(r, { fill: '#B9AFA0', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    /* tiny flower on the sill */
    rc.circle(cx + 30, y - 20, 5, PO(r, { fill: '#FF6B57', fillStyle: 'solid', strokeWidth: 1.2 }));
    rc.line(cx + 30, y - 15, cx + 30, y - 8, PO(r, { stroke: '#3E8F57', strokeWidth: 1.6 }));
  }},

  wall: { w: 240, h: 150, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 110, y - 120, 220, 120, PO(r, { fill: '#E0664F', fillStyle: 'hachure', hachureGap: 7, hachureAngle: -32, strokeWidth: 3 }));
    for (let row = 0; row < 4; row++) {
      const by = y - 104 + row * 30;
      rc.line(cx - 108, by, cx + 108, by, PO(r, { stroke: '#A8434F', strokeWidth: 2 }));
      const off = (row % 2) * 26;
      for (let bxi = 0; bxi < 4; bxi++)
        rc.line(cx - 90 + off + bxi * 52, by, cx - 90 + off + bxi * 52, by + 30, PO(r, { stroke: '#A8434F', strokeWidth: 1.8 }));
    }
  }},

  tent: { w: 230, h: 160, cat: 'structure', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.polygon([[cx - 100, y], [cx - 10, y - 140], [cx + 100, y]],
      PO(r, { fill: '#FF9E57', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.3, strokeWidth: 3 }));
    rc.polygon([[cx - 26, y], [cx - 8, y - 64], [cx + 26, y]],
      PO(r, { fill: '#C9553F', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.4 }));
    rc.line(cx - 10, y - 140, cx - 104, y + 2, PO(r, { strokeWidth: 2.6 }));
    rc.line(cx - 10, y - 140, cx + 100, y + 2, PO(r, { strokeWidth: 2.6 }));
    rc.circle(cx - 10, y - 142, 6, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.8 }));
  }},

  key: { w: 170, h: 90, cat: 'item', draw(rc, w, h, r) {
    const cx = w / 2 - 10, y = h - 14;
    rc.circle(cx - 52, y - 44, 40, PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, hachureAngle: -40, strokeWidth: 2.8 }));
    rc.circle(cx - 52, y - 44, 16, PO(r, { strokeWidth: 2.2 }));
    rc.line(cx - 32, y - 44, cx + 78, y - 44, PO(r, { stroke: '#E8A020', strokeWidth: 8 }));
    rc.line(cx + 48, y - 44, cx + 48, y - 24, PO(r, { stroke: '#E8A020', strokeWidth: 8 }));
    rc.line(cx + 68, y - 44, cx + 68, y - 18, PO(r, { stroke: '#E8A020', strokeWidth: 8 }));
  }},

  cookiejar: { w: 160, h: 160, cat: 'item', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 52, y - 116, 104, 116, PO(r, { fill: '#DFF2FB', fillStyle: 'hachure', hachureGap: 8, fillWeight: .8, strokeWidth: 2.8 }));
    rc.rectangle(cx - 58, y - 132, 116, 20, PO(r, { fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.circle(cx, y - 138, 12, PO(r, { fill: '#E5484D', fillStyle: 'solid', strokeWidth: 2 }));
    for (const [ox, oy] of [[-24, -40], [10, -60], [-4, -88], [26, -30]]) {
      rc.circle(cx + ox, y + oy, 22, PO(r, { fill: '#D9A96B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
      rc.circle(cx + ox - 4, y + oy - 3, 3, PO(r, { fill: '#5A3A22', fillStyle: 'solid', stroke: 'none' }));
      rc.circle(cx + ox + 5, y + oy + 4, 2.6, PO(r, { fill: '#5A3A22', fillStyle: 'solid', stroke: 'none' }));
    }
    rc.line(cx - 40, y - 12, cx + 40, y - 12, PO(r, { strokeWidth: 1.6 }));
  }},

  gift: { w: 140, h: 140, cat: 'item', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 46, y - 76, 92, 76, PO(r, { fill: '#B565D8', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.8 }));
    rc.rectangle(cx - 54, y - 96, 108, 24, PO(r, { fill: '#C77FE3', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.6 }));
    rc.line(cx, y - 96, cx, y, PO(r, { stroke: '#FFC53D', strokeWidth: 8 }));
    rc.path(`M ${cx} ${y - 96} C ${cx - 20} ${y - 96} ${cx - 26} ${y - 118} ${cx - 10} ${y - 118}
             C ${cx - 2} ${y - 118} ${cx} ${y - 104} ${cx} ${y - 96}
             C ${cx} ${y - 104} ${cx + 2} ${y - 118} ${cx + 10} ${y - 118}
             C ${cx + 26} ${y - 118} ${cx + 20} ${y - 96} ${cx} ${y - 96}`,
      PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2.2 }));
  }},

  chest: { w: 160, h: 120, cat: 'item', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.rectangle(cx - 60, y - 56, 120, 56, PO(r, { fill: '#A9713F', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -35, strokeWidth: 2.8 }));
    rc.path(`M ${cx - 60} ${y - 56} Q ${cx - 60} ${y - 108} ${cx} ${y - 108} Q ${cx + 60} ${y - 108} ${cx + 60} ${y - 56} Z`,
      PO(r, { fill: '#C98A54', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -35, strokeWidth: 2.8 }));
    rc.rectangle(cx - 10, y - 66, 20, 24, PO(r, { fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2.2 }));
    rc.line(cx - 60, y - 56, cx + 60, y - 56, PO(r, { strokeWidth: 2.4 }));
  }},

  puddle: { w: 200, h: 60, cat: 'splashy', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 14, 176, 32, PO(r, { fill: '#8FD0F2', fillStyle: 'hachure', hachureAngle: 0, hachureGap: 5, fillWeight: 1, strokeWidth: 2.4 }));
    rc.ellipse(cx - 38, y - 16, 34, 10, PO(r, { fill: '#C4E7FB', fillStyle: 'solid', stroke: 'none' }));
    rc.line(cx + 20, y - 18, cx + 60, y - 20, PO(r, { stroke: '#C4E7FB', strokeWidth: 2.6 }));
  }},

  mud: { w: 210, h: 60, cat: 'slip', draw(rc, w, h, r) {
    const cx = w / 2, y = h - 6;
    rc.ellipse(cx, y - 12, 184, 34, PO(r, { fill: '#A9713F', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.4 }));
    rc.ellipse(cx - 40, y - 14, 40, 12, PO(r, { fill: '#8A5E2E', fillStyle: 'solid', stroke: 'none' }));
    for (const [bx, bs] of [[cx + 50, 5], [cx + 68, 4], [cx - 70, 4]])
      rc.circle(bx, y - rr(r, 18, 30), bs, PO(r, { fill: '#8A5E2E', fillStyle: 'solid', strokeWidth: 1.2 }));
  }},

  hay: { w: 150, h: 110, cat: 'material', draw(rc, w, h, r) {
    /* round hay bale */
    const cx = w / 2, y = h - 6;
    rc.circle(cx, y - 46, 84, PO(r, { fill: '#F2D488', fillStyle: 'hachure', hachureGap: 6, hachureAngle: -50, strokeWidth: 2.8 }));
    rc.circle(cx, y - 46, 56, PO(r, { stroke: '#D9A94B', strokeWidth: 3 }));
    rc.circle(cx, y - 46, 28, PO(r, { stroke: '#D9A94B', strokeWidth: 2.6 }));
    for (let i = 0; i < 5; i++)
      rc.line(cx + rr(r, -50, 50), y - rr(r, 10, 80), cx + rr(r, -60, 60), y - rr(r, 10, 80),
        PO(r, { stroke: '#D9A94B', strokeWidth: 1.8 }));
  }},

  /* the "anything" fallback — a crayon label tag for words with no art yet */
  doodle: { w: 190, h: 120, cat: 'silly', draw(rc, w, h, r, word) {
    const cx = w / 2, y = h - 6;
    /* scribbly idea-blob */
    rc.curve([[cx - 70, y - 20], [cx - 88, y - 60], [cx - 46, y - 84], [cx, y - 96], [cx + 50, y - 88], [cx + 80, y - 56], [cx + 66, y - 18], [cx - 70, y - 20]],
      PO(r, { fill: '#FFF6C9', fillStyle: 'hachure', hachureGap: 7, fillWeight: .9, strokeWidth: 2.6, roughness: 2.8 }));
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.6;
      rc.line(cx + Math.cos(a) * 80, y - 52 + Math.sin(a) * 44,
        cx + Math.cos(a) * 98, y - 52 + Math.sin(a) * 58,
        PO(r, { stroke: pick(r, ['#B565D8', '#FF6B57', '#5DA9E9', '#4FB06D']), strokeWidth: 2.6, roughness: 3 }));
    }
    /* the word itself, hand-lettered */
    const ctx = rc.ctx || null;
    if (ctx) {
      ctx.save();
      ctx.font = '700 24px "Patrick Hand", "Comic Sans MS", cursive';
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (word || 'thing').slice(0, 18);
      ctx.fillText(label, cx, y - 52);
      /* question-spark */
      ctx.font = '700 18px "Patrick Hand", cursive';
      ctx.fillStyle = '#B565D8';
      ctx.fillText('?', cx + label.length * 7 + 14, y - 78);
      ctx.restore();
    }
  }},
};
window.PROPDEF = PROPDEF;

/* ============================================================
   KIND RESOLVER — the LLM can emit any word; we map it to a
   catalog def + behavior. Unknown words get a doodle-tag prop.
   ============================================================ */
const KIND_ALIASES = {
  /* houses & structures */
  'straw house': 'strawhouse', 'house of straw': 'strawhouse', 'hay house': 'strawhouse',
  'straw hut': 'strawhouse', 'hut': 'strawhouse',
  'stick house': 'stickhouse', 'house of sticks': 'stickhouse', 'wood house': 'stickhouse',
  'wooden house': 'stickhouse', 'twig house': 'stickhouse', 'log cabin': 'stickhouse', 'cabin': 'stickhouse',
  'brick house': 'brickhouse', 'house of bricks': 'brickhouse', 'brick home': 'brickhouse',
  'strong house': 'brickhouse', 'safe house': 'brickhouse',
  'house': 'cottage', 'cottage': 'cottage', 'home': 'cottage',
  'tent': 'tent', 'teepee': 'tent', 'wall': 'wall', 'brick wall': 'wall',
  'door': 'door', 'front door': 'door', 'open door': 'dooropen', 'doorway': 'door',
  'window': 'window', 'fence': 'fence', 'gate': 'fence',
  /* the wolf & pigs */
  'wolf': 'wolf', 'big bad wolf': 'wolf', 'the wolf': 'wolf', 'bad wolf': 'wolf',
  'pig': 'pig', 'piggy': 'pig', 'little pig': 'pig', 'piglet': 'pig', 'friend': 'pig',
  'pig friend': 'pig', 'sibling': 'pig', 'brother': 'pig', 'sister': 'pig',
  /* materials */
  'straw': 'strawpile', 'straw pile': 'strawpile', 'hay': 'strawpile', 'haystack': 'strawpile',
  'hay bale': 'hay', 'bale': 'hay',
  'stick': 'stickpile', 'sticks': 'stickpile', 'twigs': 'stickpile', 'twig': 'stickpile',
  'wood': 'stickpile', 'sticks pile': 'stickpile', 'pile of sticks': 'stickpile',
  'firewood': 'stickpile', 'lumber': 'stickpile', 'branches': 'stickpile',
  'brick': 'brickpile', 'bricks': 'brickpile', 'brick pile': 'brickpile', 'pile of bricks': 'brickpile',
  'red bricks': 'brickpile',
  'log': 'log', 'plank': 'plank', 'board': 'plank', 'stone': 'stones', 'stones': 'stones',
  'stepping stones': 'stones', 'rock pile': 'stones',
  /* crossings & rides */
  'bridge': 'bridge', 'rope bridge': 'bridge', 'ladder': 'ladder',
  'boat': 'boat', 'sailboat': 'boat', 'rowboat': 'boat', 'ship': 'boat', 'canoe': 'boat', 'kayak': 'boat',
  'raft': 'raft', 'barrel': 'barrel',
  'duck': 'duck', 'fish': 'fish', 'big fish': 'fish', 'turtle': 'turtle', 'tortoise': 'turtle',
  'unicorn': 'unicorn', 'pegasus': 'unicorn', 'pony': 'pony', 'horse': 'pony',
  'dragon': 'dragon', 'dinosaur': 'dragon', 'dino': 'dragon',
  /* weather & sky */
  'rain': 'raincloud', 'rain cloud': 'raincloud', 'cloud': 'raincloud', 'storm cloud': 'raincloud',
  'sun': 'sunprop', 'moon': 'moon', 'star': 'starprop', 'stars': 'starprop',
  'shooting star': 'starprop', 'twinkle': 'starprop',
  /* rain gear / head */
  'umbrella': 'umbrella', 'rain hat': 'hat', 'hat': 'hat', 'cap': 'hat',
  'leaf': 'leaf', 'leaf hat': 'leaf', 'newspaper': 'newspaper', 'paper': 'newspaper',
  'mushroom': 'mushroom', 'toadstool': 'mushroom', 'bucket': 'bucket', 'pail': 'bucket',
  'paper bag': 'paperbag', 'bag': 'paperbag', 'sack': 'paperbag',
  /* lights */
  'lantern': 'lantern', 'lamp': 'lantern', 'torch': 'torch', 'candle': 'candle',
  'firefly': 'firefly', 'fireflies': 'firefly', 'lightning bug': 'firefly',
  'match': 'matchstick', 'matches': 'matchstick', 'flashlight': 'lantern', 'light': 'lantern',
  /* slips & sillies */
  'banana peel': 'peel', 'banana': 'peel', 'peel': 'peel', 'soap': 'soap',
  'ice': 'soap', 'ice cube': 'soap', 'slime': 'slime', 'slime puddle': 'slime',
  'glue': 'slime', 'mud': 'mud', 'mud puddle': 'mud', 'puddle': 'puddle', 'pond': 'puddle',
  'toaster': 'toaster', 'fridge': 'fridge', 'refrigerator': 'fridge', 'rock': 'rock',
  'boulder': 'rock', 'anvil': 'anvil', 'piano': 'piano', 'tv': 'tv', 'television': 'tv',
  'toast': 'toast', 'sponge': 'sponge', 'sock': 'sock', 'pickle': 'pickle',
  /* nature & items */
  'tree': 'tree', 'pine': 'pinetree', 'pine tree': 'pinetree', 'oak': 'tree', 'bush': 'bush',
  'flower': 'flower', 'flowers': 'flower',
  'key': 'key', 'cookie jar': 'cookiejar', 'cookie': 'cookiejar', 'cookies': 'cookiejar',
  'jar': 'cookiejar', 'gift': 'gift', 'present': 'gift', 'treasure': 'chest',
  'treasure chest': 'chest', 'chest': 'chest', 'balloon': 'starprop',
  'nest': 'bush', 'birdhouse': 'cottage',
};

/* words we treat as slippery no matter what */
const SLIP_KINDS = new Set(['peel', 'soap', 'slime', 'mud']);
const SILLY_KINDS = new Set(['toast', 'sponge', 'sock', 'pickle', 'doodle']);

function stripArt(w) {
  return w.replace(/^(a|an|the|some|my|our|your|his|her|its|one|two|three|big|little|small)\s+/i, '');
}
function resolveKind(raw) {
  const w = String(raw || '').toLowerCase().trim().replace(/[\s_-]+/g, ' ').replace(/[^\w ']/g, '');
  if (!w) return { def: 'doodle', word: raw || 'thing' };
  if (KIND_ALIASES[w]) return { def: KIND_ALIASES[w], word: w };
  const clean = stripArt(w);
  if (KIND_ALIASES[clean]) return { def: KIND_ALIASES[clean], word: w };
  /* de-plural + suffix match ("pile of straw", "a straw") */
  const sing = clean.replace(/s$/, '');
  if (KIND_ALIASES[sing]) return { def: KIND_ALIASES[sing], word: w };
  for (const key of Object.keys(KIND_ALIASES)) {
    if (clean.endsWith(' ' + key) || clean === key || sing === key || sing.endsWith(' ' + key))
      return { def: KIND_ALIASES[key], word: w };
  }
  /* "house" hiding anywhere ("my straw house!") */
  if (/straw|hay/.test(w) && /house|home|hut/.test(w)) return { def: 'strawhouse', word: w };
  if (/stick|wood|twig|log/.test(w) && /house|home|cabin/.test(w)) return { def: 'stickhouse', word: w };
  if (/brick|stone|strong/.test(w) && /house|home|wall/.test(w)) return { def: 'brickhouse', word: w };
  if (/wolf/.test(w)) return { def: 'wolf', word: w };
  if (/pig/.test(w)) return { def: 'pig', word: w };
  if (/house|home/.test(w)) return { def: 'cottage', word: w };
  return { def: 'doodle', word: w };   /* ANY word still draws something */
}
window.resolveKind = resolveKind;
window.SLIP_KINDS = SLIP_KINDS;
window.SILLY_KINDS = SILLY_KINDS;
