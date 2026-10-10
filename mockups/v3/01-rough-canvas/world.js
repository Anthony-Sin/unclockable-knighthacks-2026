/* ============================================================
   The Three Little Pigs · Rough Canvas — world.js
   Seeded biome renderer. Every LLM scene_seed re-crayons the
   whole stage: biome + palette + seed + baked-in prop kinds.
   ============================================================ */
'use strict';
(function () {
const { mulberry32, pick, rr, PO, starPts, smoothPath, hashStr, INK } = window.RH;

/* ---------- palettes: sky/ground colors per LLM palette word ---------- */
const PALETTES = {
  warm:  { sky: '#CDE7F6', hillFar: '#B9DFAE', hillNear: '#8FCE8F', grass: '#6FC07C',
           grassDeep: '#55A868', sun: '#FFC53D', ray: '#F0A428', cloud: '#FFFDF6',
           path: '#EFDCAA', pathEdge: '#B98A4F', water: '#7FC4EE', waterHi: '#C4E7FB',
           rock: '#B9AFA0', flora: ['#FF6B57', '#FFC53D', '#FFFDF6', '#F58ACB'] },
  cool:  { sky: '#BFE3F5', hillFar: '#A8D4C2', hillNear: '#7FBCA8', grass: '#66B894',
           grassDeep: '#4FA07E', sun: '#FFE08A', ray: '#F0C94B', cloud: '#FFFDF6',
           path: '#EFE4BC', pathEdge: '#B98A4F', water: '#6FBEEA', waterHi: '#BEE9FB',
           rock: '#B9B4A6', flora: ['#5DA9E9', '#FFFDF6', '#9FD8F0', '#B565D8'] },
  dusk:  { sky: '#FFD3A0', hillFar: '#D8B48E', hillNear: '#B89372', grass: '#8FAF6E',
           grassDeep: '#789A58', sun: '#FF9E57', ray: '#E8803F', cloud: '#FFE9D0',
           path: '#EFDCAA', pathEdge: '#B98A4F', water: '#F0A868', waterHi: '#FFD9A8',
           rock: '#A8988A', flora: ['#FF9E57', '#FFC53D', '#F58ACB', '#B565D8'] },
  night: { sky: '#333F63', hillFar: '#475369', hillNear: '#3C4A66', grass: '#476B54',
           grassDeep: '#3A5A46', sun: '#FFF1C4', ray: '#E8D9A0', cloud: '#4A5570',
           path: '#8A7E68', pathEdge: '#5E5442', water: '#3E5E8A', waterHi: '#7FA8D8',
           rock: '#6E6478', flora: ['#B565D8', '#8FD0F5', '#FFF1C4', '#5DA9E9'] },
};

/* ---------- shared veg / sky painters ---------- */
function cloud(rc, r, cx, cy, s, col) {
  const fill = col || '#FFFDF6';
  rc.ellipse(cx - 26 * s, cy + 8 * s, 44 * s, 30 * s, PO(r, { fill, fillStyle: 'solid', strokeWidth: 2 }));
  rc.ellipse(cx, cy - 2 * s, 58 * s, 42 * s, PO(r, { fill, fillStyle: 'solid', strokeWidth: 2.2 }));
  rc.ellipse(cx + 28 * s, cy + 8 * s, 42 * s, 28 * s, PO(r, { fill, fillStyle: 'solid', strokeWidth: 2 }));
}
function tree(rc, r, x, gy, s, dark) {
  const ty = gy + rr(r, -4, 8);
  const trunk = dark ? '#6B4A2A' : '#9A6A3B';
  const gcols = dark ? ['#3E6B4F', '#466B58', '#3A5A46'] : ['#58BC7B', '#4FB06D', '#7CC97F'];
  rc.rectangle(x - 7 * s, ty - 46 * s, 14 * s, 48 * s,
    PO(r, { fill: trunk, fillStyle: 'hachure', hachureGap: 4, fillWeight: 1.3, strokeWidth: 2.4 }));
  for (let k = 0; k < 3; k++) {
    const ang = (Math.PI * 2 * k) / 3 - Math.PI / 2;
    rc.circle(x + Math.cos(ang) * 17 * s, ty - 52 * s + Math.sin(ang) * 15 * s, 30 * s * rr(r, .8, 1.05),
      PO(r, { fill: pick(r, gcols), fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, fillWeight: 1.2, strokeWidth: 2.4 }));
  }
  rc.circle(x, ty - 66 * s, 34 * s,
    PO(r, { fill: pick(r, gcols), fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, fillWeight: 1.2, strokeWidth: 2.4 }));
}
function pine(rc, r, x, gy, s, dark) {
  const ty = gy + rr(r, -2, 8);
  rc.rectangle(x - 6 * s, ty - 24 * s, 12 * s, 26 * s,
    PO(r, { fill: dark ? '#5E452C' : '#8A5E2E', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
  const g = dark ? '#3A5A46' : '#3E8F57';
  for (const [tyy, tw] of [[ty - 30 * s, 86 * s], [ty - 70 * s, 64 * s], [ty - 104 * s, 40 * s]])
    rc.polygon([[x - tw / 2, tyy + 12 * s], [x, tyy - 24 * s], [x + tw / 2, tyy + 12 * s]],
      PO(r, { fill: g, fillStyle: 'hachure', hachureGap: 5, hachureAngle: -55, fillWeight: 1.2, strokeWidth: 2.4 }));
}
function flower(rc, r, x, gy, col) {
  const fy = gy + rr(r, 24, 56);
  rc.line(x, fy, x + rr(r, -3, 3), fy - 15, PO(r, { stroke: '#3E8F57', strokeWidth: 2.2 }));
  for (let p = 0; p < 5; p++) {
    const a = (Math.PI * 2 * p) / 5 - Math.PI / 2;
    rc.circle(x + Math.cos(a) * 7, fy - 19 + Math.sin(a) * 7, 8,
      PO(r, { fill: col, fillStyle: 'solid', strokeWidth: 1.4, roughness: 2.2 }));
  }
  rc.circle(x, fy - 19, 7, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.3 }));
}
function tuft(rc, r, x, gy, col) {
  const fy = gy + rr(r, 20, 50);
  const c = col || '#3E8F57';
  for (let p = -1; p <= 1; p++)
    rc.line(x, fy, x + p * 7 + rr(r, -2, 2), fy - rr(r, 10, 17), PO(r, { stroke: c, strokeWidth: 2.2 }));
}
function cattail(rc, r, x, gy) {
  rc.line(x, gy + 8, x - 3, gy - 24, PO(r, { stroke: '#3E8F57', strokeWidth: 2.6 }));
  rc.line(x + 7, gy + 8, x + 10, gy - 18, PO(r, { stroke: '#3E8F57', strokeWidth: 2.4 }));
  rc.ellipse(x - 3, gy - 28, 7, 15, PO(r, { fill: '#8A5E2E', fillStyle: 'solid', strokeWidth: 1.6 }));
}
function mushroom(rc, r, x, gy, s) {
  const my = gy + rr(r, 20, 44);
  rc.rectangle(x - 7 * s, my - 20 * s, 14 * s, 20 * s, PO(r, { fill: '#FFF1D6', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
  rc.path(`M ${x - 20 * s} ${my - 18 * s} Q ${x} ${my - 44 * s} ${x + 20 * s} ${my - 18 * s} Z`,
    PO(r, { fill: '#FF6B57', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.2 }));
  rc.circle(x - 7 * s, my - 30 * s, 3.4 * s, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', stroke: 'none' }));
  rc.circle(x + 8 * s, my - 26 * s, 2.8 * s, PO(r, { fill: '#FFFDF6', fillStyle: 'solid', stroke: 'none' }));
}
function bird(rc, r, x, y, s) {
  rc.arc(x - 7 * s, y, 16 * s, 12 * s, Math.PI * 1.05, Math.PI * 1.95, false, PO(r, { strokeWidth: 1.8, roughness: 2.6 }));
  rc.arc(x + 7 * s, y, 16 * s, 12 * s, Math.PI * 1.05, Math.PI * 1.95, false, PO(r, { strokeWidth: 1.8, roughness: 2.6 }));
}
function butterfly(rc, r, x, y) {
  rc.arc(x - 5, y, 10, 8, Math.PI * 1.1, Math.PI * 1.9, false, PO(r, { stroke: '#F58ACB', strokeWidth: 2.4 }));
  rc.arc(x + 5, y, 10, 8, Math.PI * 1.1, Math.PI * 1.9, false, PO(r, { stroke: '#F58ACB', strokeWidth: 2.4 }));
}

/* ---------- the shared base: sky → hills → ground → path ---------- */
function base(rc, r, W, H, gy, pal, opts) {
  opts = opts || {};
  /* sky */
  rc.rectangle(-10, -10, W + 20, gy + 60, PO(r, {
    fill: pal.sky, fillStyle: 'hachure', hachureAngle: -14,
    hachureGap: 14, fillWeight: .7, stroke: 'none', roughness: 1.2 }));
  /* celestial body */
  if (opts.night) {
    /* moon + stars */
    rc.circle(W * 0.16, 84, 52, PO(r, { fill: '#FFF1C4', fillStyle: 'hachure', hachureGap: 5, hachureAngle: -40, strokeWidth: 2.6 }));
    rc.circle(W * 0.16 - 12, 74, 8, PO(r, { fill: '#EFE0B0', fillStyle: 'solid', stroke: 'none' }));
    rc.circle(W * 0.16 + 14, 92, 6, PO(r, { fill: '#EFE0B0', fillStyle: 'solid', stroke: 'none' }));
    for (let i = 0; i < 14; i++) {
      const sx = rr(r, 30, W - 30), sy = rr(r, 24, gy - 190);
      if (Math.abs(sx - W * 0.16) < 80 && Math.abs(sy - 84) < 70) continue;
      rc.polygon(starPts(sx, sy, rr(r, 4, 8), rr(r, 1.8, 3), 5, -Math.PI / 2),
        PO(r, { fill: '#FFF1C4', fillStyle: 'solid', stroke: 'none' }));
    }
  } else {
    const sunX = opts.lowSun ? W * 0.5 : W * 0.13;
    const sunY = opts.lowSun ? gy - 96 : 74;
    const sunR = opts.lowSun ? 84 : 62;
    rc.circle(sunX, sunY, sunR, PO(r, {
      fill: pal.sun, fillStyle: 'hachure', hachureAngle: 60,
      hachureGap: opts.lowSun ? 6 : 4.5, fillWeight: 1.5, strokeWidth: 3, roughness: 2.4 }));
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 + rr(r, -0.1, 0.1);
      rc.line(sunX + Math.cos(a) * (sunR * .68), sunY + Math.sin(a) * (sunR * .68),
        sunX + Math.cos(a) * rr(r, sunR * .85, sunR * 1.05), sunY + Math.sin(a) * rr(r, sunR * .85, sunR * 1.05),
        PO(r, { stroke: pal.ray, strokeWidth: 3.2, roughness: 2.6 }));
    }
  }
  /* clouds */
  const nClouds = opts.clouds == null ? 3 : opts.clouds;
  for (let i = 0; i < nClouds; i++)
    cloud(rc, r, rr(r, W * .2, W * .92), rr(r, 44, 96), rr(r, .7, 1.15), pal.cloud);
  /* far + near rolling hills */
  for (const [lift, col, gap] of [[-30, pal.hillFar, 9], [-10, pal.hillNear, 7]]) {
    const pts = [[-20, gy + lift]];
    for (let i = 1; i <= 10; i++)
      pts.push([(W * i) / 10 + rr(r, -50, 50), gy + lift - rr(r, 8, 64)]);
    pts.push([W + 20, gy + lift]);
    rc.path(smoothPath(pts) + ` L ${W + 20} ${H + 20} L -20 ${H + 20} Z`,
      PO(r, { fill: col, fillStyle: 'hachure', hachureAngle: -62, hachureGap: gap, fillWeight: 1, strokeWidth: 2, roughness: 1.8 }));
  }
  /* foreground grass band */
  const gpts = [[-20, gy + 10]];
  for (let i = 1; i <= 16; i++) gpts.push([(W * i) / 16, gy + 10 + rr(r, -7, 7)]);
  gpts.push([W + 20, gy + 10]);
  rc.path(smoothPath(gpts) + ` L ${W + 20} ${H + 20} L -20 ${H + 20} Z`, PO(r, {
    fill: pal.grass, fillStyle: 'hachure', hachureAngle: -78,
    hachureGap: 6.5, fillWeight: 1.2, strokeWidth: 2.2 }));
  /* stitched walking path */
  const pts = [];
  for (let i = 0; i <= 7; i++)
    pts.push([-20 + ((W + 40) * i) / 7, gy + 44 + Math.sin(i * 1.4) * 6 + rr(r, -4, 4)]);
  rc.curve(pts, PO(r, { stroke: pal.path, strokeWidth: 20, roughness: 1.8 }));
  rc.curve(pts, PO(r, { stroke: pal.pathEdge, strokeWidth: 2.4, roughness: 2.2, strokeLineDash: [9, 12] }));
}

/* ---------- biome painters ---------- */
const BIOME_PAINTERS = {
  meadow(rc, r, W, H, gy, pal) {
    for (const tx of [0.1, 0.9]) tree(rc, r, tx * W + rr(r, -30, 30), gy, rr(r, .9, 1.15));
    for (let i = 0; i < 9; i++) {
      const fx = rr(r, 30, W - 30);
      if (r() < .6) flower(rc, r, fx, gy, pick(r, pal.flora));
      else tuft(rc, r, fx, gy);
    }
    butterfly(rc, r, rr(r, W * .3, W * .6), rr(r, gy - 170, gy - 100));
    butterfly(rc, r, rr(r, W * .6, W * .85), rr(r, gy - 150, gy - 90));
    for (let i = 0; i < 4; i++) bird(rc, r, rr(r, W * .3, W * .9), rr(r, 50, 110), rr(r, .7, 1.05));
  },

  forest(rc, r, W, H, gy, pal, night) {
    /* back row — small + dimmer */
    for (let i = 0; i < 5; i++)
      pine(rc, r, W * (0.08 + i * 0.2) + rr(r, -20, 20), gy - 14, rr(r, .55, .75), night);
    /* front row — mixed trees */
    for (const tx of [0.06, 0.3, 0.62, 0.88]) {
      if (r() < .55) tree(rc, r, tx * W + rr(r, -22, 22), gy, rr(r, 1, 1.3), night);
      else pine(rc, r, tx * W + rr(r, -22, 22), gy, rr(r, .95, 1.25), night);
    }
    for (const bx of [0.2, 0.48, 0.76]) {
      const bx0 = bx * W + rr(r, -20, 20);
      for (const [dx, s] of [[-24, .8], [0, 1], [26, .75]])
        rc.circle(bx0 + dx, gy + rr(r, 26, 40), 22 * s,
          PO(r, { fill: night ? '#3A5A46' : '#4FB06D', fillStyle: 'hachure', hachureAngle: -50, hachureGap: 5, strokeWidth: 2.2 }));
    }
    mushroom(rc, r, W * rr(r, .14, .3), gy, rr(r, .8, 1.1));
    mushroom(rc, r, W * rr(r, .6, .85), gy, rr(r, .7, 1));
    for (let i = 0; i < 5; i++) tuft(rc, r, rr(r, 20, W - 20), gy, night ? '#3A5A46' : '#3E8F57');
  },

  river(rc, r, W, H, gy, pal) {
    /* the river eats the path — water band across the scene */
    const wl = W * 0.3, wr = W * 0.78;
    rc.rectangle(wl, gy - 12, wr - wl, H - gy + 40, PO(r, {
      fill: pal.water, fillStyle: 'hachure', hachureAngle: -6, hachureGap: 7, fillWeight: 1.4, stroke: 'none' }));
    for (let i = 0; i < 6; i++) {
      const wx = wl + 20 + i * ((wr - wl - 40) / 6), wy = gy + 2 + (i % 2) * 16;
      rc.curve([[wx, wy], [wx + 14, wy - 5], [wx + 30, wy], [wx + 44, wy - 4]],
        PO(r, { stroke: pal.waterHi, strokeWidth: 3, roughness: 2.6 }));
    }
    /* wobbly banks + reeds */
    for (const [bx, dir] of [[wl, -1], [wr, 1]]) {
      rc.curve([[bx, gy - 14], [bx + dir * rr(r, 8, 16), gy + 30], [bx + dir * 6, H]],
        PO(r, { stroke: pal.pathEdge, strokeWidth: 5, roughness: 2.4 }));
      for (let i = 0; i < 3; i++) cattail(rc, r, bx + dir * (12 + i * 14) + rr(r, -3, 3), gy);
    }
    /* lily pads + a jumping fish */
    for (const lx of [wl + 60, wl + (wr - wl) * .5, wr - 70]) {
      rc.ellipse(lx, gy + 34, 30, 11, PO(r, { fill: '#4FB06D', fillStyle: 'solid', strokeWidth: 1.8 }));
      rc.line(lx, gy + 32, lx + 11, gy + 28, PO(r, { stroke: '#3E8F57', strokeWidth: 2 }));
    }
    const fxp = rr(r, wl + 80, wr - 80);
    rc.arc(fxp, gy + 6, 36, 30, Math.PI * 1.15, Math.PI * 1.85, false, PO(r, { stroke: '#FF9E57', strokeWidth: 2.6 }));
    rc.path(`M ${fxp - 3} ${gy - 18} Q ${fxp + 14} ${gy - 36} ${fxp + 7} ${gy - 48} Q ${fxp - 10} ${gy - 34} ${fxp - 3} ${gy - 18} Z`,
      PO(r, { fill: '#FF9E57', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
    /* riverside trees on both edges */
    tree(rc, r, W * 0.07, gy, rr(r, .9, 1.1));
    pine(rc, r, W * 0.93, gy, rr(r, .9, 1.15));
    for (let i = 0; i < 4; i++) tuft(rc, r, rr(r, 20, wl - 40), gy);
    for (let i = 0; i < 4; i++) tuft(rc, r, rr(r, wr + 40, W - 20), gy);
  },

  village(rc, r, W, H, gy, pal) {
    /* cottages on the horizon (simple, small — big versions are prop spawns) */
    for (const [hx, hs] of [[0.2, .82], [0.52, 1], [0.82, .88]]) {
      const hxx = hx * W, hy = gy + 6, hw2 = 120 * hs;
      rc.rectangle(hxx - hw2 / 2, hy - 86 * hs, hw2, 86 * hs,
        PO(r, { fill: pick(r, ['#FFDE9E', '#FFF1D6', '#FFD9A8']), fillStyle: 'hachure', hachureAngle: -30, hachureGap: 7, fillWeight: 1.1, strokeWidth: 2.6 }));
      rc.polygon([[hxx - hw2 / 2 - 16, hy - 84 * hs], [hxx, hy - 140 * hs], [hxx + hw2 / 2 + 16, hy - 84 * hs]],
        PO(r, { fill: pick(r, ['#E86A4E', '#C9553F', '#E0805E']), fillStyle: 'hachure', hachureGap: 6, hachureAngle: -40, fillWeight: 1.2, strokeWidth: 2.6 }));
      rc.rectangle(hxx - 14 * hs, hy - 52 * hs, 28 * hs, 52 * hs,
        PO(r, { fill: '#8A5E2E', fillStyle: 'hachure', hachureGap: 4.5, hachureAngle: -55, strokeWidth: 2.2 }));
      rc.circle(hxx + 8 * hs, hy - 28 * hs, 3.4, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.4 }));
      /* chimney smoke */
      rc.curve([[hxx + hw2 / 4, hy - 138 * hs], [hxx + hw2 / 4 - 10, hy - 154 * hs], [hxx + hw2 / 4 + 8, hy - 168 * hs]],
        PO(r, { stroke: '#C9BEC8', strokeWidth: 4, roughness: 2.6 }));
    }
    /* picket fence + cobbles + lantern post */
    for (let i = 0; i < 8; i++) {
      const fx = W * 0.06 + i * 34;
      rc.rectangle(fx, gy + 12, 9, 30, PO(r, { fill: '#C9A06B', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 1.6 }));
    }
    rc.line(W * 0.05, gy + 26, W * 0.06 + 8 * 34, gy + 26, PO(r, { stroke: '#C9A06B', strokeWidth: 3.2 }));
    for (let i = 0; i < 6; i++)
      rc.ellipse(rr(r, W * .3, W * .9), gy + rr(r, 52, 66), rr(r, 14, 24), rr(r, 6, 10),
        PO(r, { fill: pal.rock, fillStyle: 'hachure', hachureGap: 4, strokeWidth: 1.6 }));
    const lx = W * 0.94;
    rc.line(lx, gy + 20, lx, gy - 96, PO(r, { stroke: '#5A5F6E', strokeWidth: 6 }));
    rc.line(lx, gy - 96, lx - 26, gy - 96, PO(r, { stroke: '#5A5F6E', strokeWidth: 4 }));
    rc.rectangle(lx - 40, gy - 92, 24, 30, PO(r, { fill: '#FFE9A0', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.2 }));
    rc.circle(lx - 28, gy - 76, 6, PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 1.4 }));
  },

  storm(rc, r, W, H, gy, pal) {
    /* grumpy cloud bank right on top */
    for (let i = 0; i < 5; i++)
      cloud(rc, r, W * 0.1 + i * (W * 0.21) + rr(r, -16, 16), rr(r, 40, 66), rr(r, 1, 1.35), '#B9C4D4');
    /* slanted rain hatches */
    for (let x = 30; x < W - 10; x += 46) {
      const top = rr(r, 90, 130);
      for (let y = top; y < gy - 70; y += rr(r, 90, 130))
        rc.line(x + rr(r, -8, 8), y, x - 10 + rr(r, -4, 4), y + rr(r, 26, 40),
          PO(r, { stroke: '#7FB8E8', strokeWidth: 2.4, roughness: 2.6 }));
    }
    /* puddles + droopy plants + a bent tree */
    for (const px of [W * .18, W * .5, W * .78]) {
      rc.ellipse(px, gy + 52, rr(r, 70, 96), 19, PO(r, { fill: '#8FD0F2', fillStyle: 'hachure', hachureAngle: 0, hachureGap: 5, fillWeight: 1, strokeWidth: 2 }));
      rc.line(px - 20, gy + 50, px - 2, gy + 48, PO(r, { stroke: '#C4E7FB', strokeWidth: 2.6 }));
    }
    for (const tx of [W * .3, W * .66]) {
      const fy = gy + rr(r, 30, 46);
      rc.curve([[tx, fy], [tx + 2, fy - 12], [tx + 10, fy - 20]], PO(r, { stroke: '#3E8F57', strokeWidth: 2.4 }));
      rc.ellipse(tx + 12, fy - 20, 16, 10, PO(r, { fill: '#A9B8C8', fillStyle: 'solid', strokeWidth: 1.8 }));
    }
    /* one brave bent tree + a mushroom */
    const bx = W * 0.9;
    rc.curve([[bx, gy + 8], [bx - 16, gy - 30], [bx - 30, gy - 56]], PO(r, { stroke: '#8A5E2E', strokeWidth: 7, roughness: 2.4 }));
    rc.circle(bx - 36, gy - 62, 30, PO(r, { fill: '#4A7A5C', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.4 }));
    mushroom(rc, r, W * .44, gy, 1);
  },

  dusk(rc, r, W, H, gy, pal) {
    /* long shadows under everything + silhouetted trees */
    for (const tx of [0.14, 0.86]) {
      const txx = tx * W;
      rc.ellipse(txx + 40, gy + 30, 120, 14, PO(r, { fill: pal.grassDeep, fillStyle: 'solid', stroke: 'none' }));
      tree(rc, r, txx, gy, rr(r, 1, 1.2), true);
    }
    /* fireflies starting to blink */
    for (let i = 0; i < 7; i++) {
      const fx = rr(r, W * .1, W * .9), fy = rr(r, gy - 160, gy - 40);
      rc.circle(fx, fy, rr(r, 3, 5.5), PO(r, { fill: '#E8F75E', fillStyle: 'solid', stroke: 'none' }));
      rc.circle(fx, fy, rr(r, 8, 12), PO(r, { stroke: '#E8F75E', strokeWidth: 1, roughness: 3 }));
    }
    for (let i = 0; i < 5; i++) bird(rc, r, rr(r, W * .2, W * .8), rr(r, 60, 120), rr(r, .7, 1));
    for (let i = 0; i < 6; i++) flower(rc, r, rr(r, 30, W - 30), gy, pick(r, pal.flora));
  },

  cave(rc, r, W, H, gy, pal) {
    /* rocky floor + jagged ceiling with stalactites */
    rc.rectangle(-10, gy + 8, W + 20, H - gy, PO(r, {
      fill: '#7D7488', fillStyle: 'hachure', hachureAngle: -64, hachureGap: 7, fillWeight: 1.1, strokeWidth: 2 }));
    const ceil = [[-30, -20], [-30, gy - 200]];
    let cx = -30;
    while (cx < W + 30) { cx += rr(r, 90, 150); ceil.push([Math.min(cx, W + 30), gy - rr(r, 160, 225)]); }
    ceil.push([W + 30, -20]);
    rc.polygon(ceil, PO(r, { fill: '#6E6478', fillStyle: 'hachure', hachureAngle: -58, hachureGap: 6, fillWeight: 1.3, strokeWidth: 2.8, roughness: 2.2 }));
    for (const tx of [W * .18, W * .42, W * .66, W * .86]) {
      const len = rr(r, 26, 54), top = gy - rr(r, 160, 190);
      rc.polygon([[tx - 16, top], [tx + 18, top - 4], [tx + 3, top + len]],
        PO(r, { fill: '#6E6478', fillStyle: 'hachure', hachureGap: 5, strokeWidth: 2.2 }));
    }
    /* glowing crystals + cave painting */
    for (const [px, ps] of [[W * .22, 1], [W * .55, .8], [W * .78, 1.1]]) {
      const by = gy + rr(r, 30, 56);
      rc.polygon([[px - 14 * ps, by], [px - 8 * ps, by - 34 * ps], [px + 4 * ps, by - 44 * ps], [px + 14 * ps, by - 18 * ps], [px + 12 * ps, by]],
        PO(r, { fill: '#B565D8', fillStyle: 'hachure', hachureGap: 4, hachureAngle: -40, strokeWidth: 2.2 }));
      rc.polygon([[px + 12 * ps, by], [px + 18 * ps, by - 22 * ps], [px + 26 * ps, by - 14 * ps], [px + 24 * ps, by]],
        PO(r, { fill: '#5DA9E9', fillStyle: 'hachure', hachureGap: 4, strokeWidth: 2 }));
    }
    const sx = W * .35, sy = gy - 110;
    rc.arc(sx, sy, 40, 40, 0.3, Math.PI * 1.8, false, PO(r, { stroke: '#E8A020', strokeWidth: 2.6 }));
    rc.arc(sx, sy, 22, 22, 0.3, Math.PI * 1.8, false, PO(r, { stroke: '#E8A020', strokeWidth: 2.4 }));
    /* friendly bat */
    const bx = W * rr(r, .6, .85), byy = gy - rr(r, 140, 180);
    rc.arc(bx - 8, byy, 14, 10, Math.PI * 1.15, Math.PI * 1.95, false, PO(r, { stroke: '#3A3140', strokeWidth: 2.6 }));
    rc.arc(bx + 8, byy, 14, 10, Math.PI * 1.05, Math.PI * 1.85, false, PO(r, { stroke: '#3A3140', strokeWidth: 2.6 }));
  },
};

/* snow biome — light dusting, because LLMs love to try */
BIOME_PAINTERS.snow = function (rc, r, W, H, gy, pal) {
  for (const tx of [0.12, 0.55, 0.88]) pine(rc, r, tx * W + rr(r, -16, 16), gy, rr(r, .9, 1.15));
  for (let i = 0; i < 22; i++)
    rc.circle(rr(r, 10, W - 10), rr(r, 30, gy + 30), rr(r, 2, 4.5),
      PO(r, { fill: '#FFFDF6', fillStyle: 'solid', stroke: 'none' }));
  /* one snowman-ish lump */
  const sx = W * 0.3;
  rc.circle(sx, gy + 24, 44, PO(r, { fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 6, strokeWidth: 2.4 }));
  rc.circle(sx, gy - 16, 30, PO(r, { fill: '#FFFDF6', fillStyle: 'hachure', hachureGap: 6, strokeWidth: 2.4 }));
  rc.circle(sx - 8, gy - 22, 3, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
  rc.circle(sx + 8, gy - 22, 3, PO(r, { fill: INK, fillStyle: 'solid', stroke: 'none' }));
  rc.polygon([[sx + 2, gy - 16], [sx + 18, gy - 13], [sx + 2, gy - 9]], PO(r, { fill: '#FF9E57', fillStyle: 'solid', strokeWidth: 1.6 }));
};

const BIOME_MAP = {
  meadow: 'meadow', meadows: 'meadow', field: 'meadow', plains: 'meadow', grass: 'meadow', hill: 'meadow', hills: 'meadow',
  forest: 'forest', woods: 'forest', wood: 'forest', trees: 'forest', jungle: 'forest', grove: 'forest',
  river: 'river', stream: 'river', creek: 'river', water: 'river', lake: 'river', pond: 'river', brook: 'river',
  village: 'village', town: 'village', farm: 'village', homes: 'village',
  storm: 'storm', rain: 'storm', rainstorm: 'storm', thunder: 'storm', thunderstorm: 'storm', windy: 'storm', wind: 'storm',
  dusk: 'dusk', sunset: 'dusk', evening: 'dusk', twilight: 'dusk', night: 'dusk', midnight: 'dusk',
  cave: 'cave', cavern: 'cave', tunnel: 'cave', dark: 'cave',
  snow: 'snow', winter: 'snow', ice: 'snow', frost: 'snow',
};

/* ---------- bake scene_seed.props[] into the terrain ---------- */
function bakeProps(rc, ctx, r, propKinds, W, gy) {
  const used = [];
  for (const kind of (propKinds || []).slice(0, 7)) {
    const res = window.resolveKind(kind);
    const def = window.PROPDEF[res.def];
    if (!def || res.def === 'doodle') continue;   /* unlabeled kinds live as DOM props */
    const sc = def.w > 280 ? 0.62 : def.w > 170 ? 0.78 : def.w > 110 ? 0.9 : 1;
    /* find a free spot on the ground line */
    let px = 0, tries = 0;
    do {
      px = rr(r, W * 0.1, W * 0.9); tries++;
    } while (tries < 12 && used.some(u => Math.abs(u - px) < def.w * sc * .7));
    used.push(px);
    ctx.save();
    ctx.translate(px - (def.w * sc) / 2, gy + 8 - def.h * sc);
    ctx.scale(sc, sc);
    def.draw(rc, def.w, def.h, r, res.word);
    ctx.restore();
  }
}

/* ---------- the public render ---------- */
function render(cv, ss, W, H) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  cv.width = Math.max(2, Math.round(W * dpr));
  cv.height = Math.max(2, Math.round(H * dpr));
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const rc = rough.canvas(cv);

  const seed = (ss && (ss.seed | 0)) || 1234;
  const r = mulberry32(seed);
  const biome = BIOME_MAP[String(ss && ss.biome || 'meadow').toLowerCase()] || 'meadow';
  let palette = String(ss && ss.palette || 'warm').toLowerCase();
  if (!PALETTES[palette]) palette = (biome === 'cave' || biome === 'dusk') ? 'night' : 'warm';
  if (biome === 'cave' && palette !== 'night') palette = 'night';
  if (biome === 'storm' && palette === 'warm') palette = 'cool';
  const pal = PALETTES[palette];

  const gy = H - 92;
  const night = palette === 'night';
  base(rc, r, W, H, gy, pal, {
    night,
    lowSun: biome === 'dusk',
    clouds: biome === 'storm' || biome === 'cave' ? 0 : (night ? 2 : 3),
  });
  (BIOME_PAINTERS[biome] || BIOME_PAINTERS.meadow)(rc, r, W, H, gy, pal, night);
  bakeProps(rc, ctx, r, ss && ss.props, W, gy);

  return {
    biome, palette, gy,
    rain: biome === 'storm',
    dark: night,
    leaves: biome === 'forest' || biome === 'dusk',
    snow: biome === 'snow',
  };
}

window.WorldScene = { render, PALETTES };
})();
