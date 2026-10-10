/* world.js — seeded biome renderer (zero dependencies).
 *
 * WORLD.render(cv, ss, W, H) re-crayons the whole backdrop from the LLM's
 * scene_seed {biome, seed, palette, props[]}: sky gradient, sun/moon,
 * clouds, rolling hills, grass + dashed walking path, a biome-specific
 * scatter pass, and scene_seed.props baked in as labeled scenery.
 *
 * Same seed => same world. Every mark goes through SK (sketch.js).
 *
 * Also: WORLD.drawBuild(ctx, stage, x, y, r) — the growing pig house
 * (plot → straw → sticks → brick), drawn fresh each frame on the play
 * canvas so it can shake during a huff.
 */
'use strict';
(function () {
const SK = window.SK;
const INK = SK.INK;

/* ---------- palettes per LLM palette word ---------- */
const PALETTES = {
  warm:  { skyTop: '#CDE7F6', skyBot: '#FFF3D2', hillFar: '#B9DFAE', hillNear: '#8FCE8F',
           grass: '#6FC07C', grassDeep: '#55A868', sun: '#FFC53D', ray: '#F0A428',
           cloud: '#FFFDF6', path: '#EFDCAA', pathEdge: '#B98A4F',
           water: '#7FC4EE', waterHi: '#C4E7FB', rock: '#B9AFA0',
           flora: ['#FF6B57', '#FFC53D', '#FFFDF6', '#F58ACB'] },
  cool:  { skyTop: '#BFE3F5', skyBot: '#EAF6FF', hillFar: '#A8D4C2', hillNear: '#7FBCA8',
           grass: '#66B894', grassDeep: '#4FA07E', sun: '#FFE08A', ray: '#F0C94B',
           cloud: '#FFFDF6', path: '#EFE4BC', pathEdge: '#B98A4F',
           water: '#6FBEEA', waterHi: '#BEE9FB', rock: '#B9B4A6',
           flora: ['#5DA9E9', '#FFFDF6', '#9FD8F0', '#B565D8'] },
  dusk:  { skyTop: '#FFD3A0', skyBot: '#FCE3C2', hillFar: '#D8B48E', hillNear: '#B89372',
           grass: '#8FAF6E', grassDeep: '#789A58', sun: '#FF9E57', ray: '#E8803F',
           cloud: '#FFE9D0', path: '#EFDCAA', pathEdge: '#B98A4F',
           water: '#F0A868', waterHi: '#FFD9A8', rock: '#A8988A',
           flora: ['#FF9E57', '#FFC53D', '#F58ACB', '#B565D8'] },
  night: { skyTop: '#333F63', skyBot: '#6E6E94', hillFar: '#475369', hillNear: '#3C4A66',
           grass: '#476B54', grassDeep: '#3A5A46', sun: '#FFF1C4', ray: '#E8D9A0',
           cloud: '#4A5570', path: '#8A7E68', pathEdge: '#5E5442',
           water: '#3E5E8A', waterHi: '#7FA8D8', rock: '#6E6478',
           flora: ['#B565D8', '#8FD0F5', '#FFF1C4', '#5DA9E9'] },
};

/* ---------- shared bits ---------- */
function cloud(ctx, r, cx, cy, s, col) {
  SK.ellipse(ctx, cx - 26 * s, cy + 8 * s, 22 * s, 15 * s, { r, fill: col, strokeWidth: 2 });
  SK.ellipse(ctx, cx, cy - 2 * s, 29 * s, 21 * s, { r, fill: col, strokeWidth: 2.2 });
  SK.ellipse(ctx, cx + 28 * s, cy + 8 * s, 21 * s, 14 * s, { r, fill: col, strokeWidth: 2 });
}
function tree(ctx, r, x, gy, s, dark) {
  const ty = gy + r.rr(-4, 8);
  SK.rect(ctx, x - 7 * s, ty - 46 * s, 14 * s, 48 * s,
    { r, fill: dark ? '#6B4A2A' : '#9A6A3B', hatch: true, hatchGap: 4, strokeWidth: 2.4 });
  const gcols = dark ? ['#3E6B4F', '#466B58', '#3A5A46'] : ['#58BC7B', '#4FB06D', '#7CC97F'];
  for (let k = 0; k < 3; k++) {
    const a = Math.PI * 2 * k / 3 - Math.PI / 2;
    SK.circle(ctx, x + Math.cos(a) * 17 * s, ty - 52 * s + Math.sin(a) * 15 * s,
      15 * s * r.rr(.8, 1.05),
      { r, fill: r.pick(gcols), hatch: true, hatchGap: 5, hatchAngle: -50, strokeWidth: 2.4 });
  }
  SK.circle(ctx, x, ty - 66 * s, 17 * s,
    { r, fill: r.pick(gcols), hatch: true, hatchGap: 5, hatchAngle: -50, strokeWidth: 2.4 });
}
function pine(ctx, r, x, gy, s, dark) {
  const ty = gy + r.rr(-2, 8);
  SK.rect(ctx, x - 6 * s, ty - 24 * s, 12 * s, 26 * s,
    { r, fill: dark ? '#5E452C' : '#8A5E2E', hatch: true, hatchGap: 4, strokeWidth: 2 });
  const g = dark ? '#3A5A46' : '#3E8F57';
  for (const [tyy, tw] of [[ty - 30 * s, 86 * s], [ty - 70 * s, 64 * s], [ty - 104 * s, 40 * s]])
    SK.tri(ctx, x, tyy + 12 * s, tw, 36 * s,
      { r, fill: g, hatch: true, hatchGap: 5, hatchAngle: -55, strokeWidth: 2.4, amp: 1 });
}
function flower(ctx, r, x, gy, col) {
  const fy = gy + r.rr(24, 52);
  SK.line(ctx, x, fy, x + r.rr(-3, 3), fy - 15, { r, stroke: '#3E8F57', strokeWidth: 2.2 });
  for (let p = 0; p < 5; p++) {
    const a = Math.PI * 2 * p / 5 - Math.PI / 2;
    SK.circle(ctx, x + Math.cos(a) * 7, fy - 19 + Math.sin(a) * 7, 4,
      { r, fill: col, strokeWidth: 1.4 });
  }
  SK.circle(ctx, x, fy - 19, 3.6, { r, fill: '#FFC53D', strokeWidth: 1.3 });
}
function tuft(ctx, r, x, gy, col) {
  const fy = gy + r.rr(20, 46);
  for (let p = -1; p <= 1; p++)
    SK.line(ctx, x, fy, x + p * 7 + r.rr(-2, 2), fy - r.rr(10, 17),
      { r, stroke: col || '#3E8F57', strokeWidth: 2.2 });
}
function cattail(ctx, r, x, gy) {
  SK.line(ctx, x, gy + 8, x - 3, gy - 24, { r, stroke: '#3E8F57', strokeWidth: 2.6 });
  SK.line(ctx, x + 7, gy + 8, x + 10, gy - 18, { r, stroke: '#3E8F57', strokeWidth: 2.4 });
  SK.ellipse(ctx, x - 3, gy - 30, 3.6, 8, { r, fill: '#8A5E2E', strokeWidth: 1.6 });
}
function mushroom(ctx, r, x, gy, s) {
  const my = gy + r.rr(20, 40);
  SK.rect(ctx, x - 7 * s, my - 20 * s, 14 * s, 20 * s, { r, fill: '#FFF1D6', strokeWidth: 2 });
  SK.path(ctx, [[x - 20 * s, my - 18 * s], [x - 16 * s, my - 40 * s], [x, my - 46 * s],
    [x + 16 * s, my - 40 * s], [x + 20 * s, my - 18 * s]],
    { r, fill: '#FF6B57', hatch: true, hatchGap: 5, strokeWidth: 2.2 });
  SK.circle(ctx, x - 7 * s, my - 32 * s, 3 * s, { r, fill: '#FFFDF6', stroke: 'none' });
  SK.circle(ctx, x + 8 * s, my - 28 * s, 2.6 * s, { r, fill: '#FFFDF6', stroke: 'none' });
}
function bird(ctx, r, x, y, s) {
  SK.arc(ctx, x - 7 * s, y, 8 * s, 6 * s, Math.PI * 1.05, Math.PI * 1.95, { r, strokeWidth: 1.8 });
  SK.arc(ctx, x + 7 * s, y, 8 * s, 6 * s, Math.PI * 1.05, Math.PI * 1.95, { r, strokeWidth: 1.8 });
}
function butterfly(ctx, r, x, y) {
  SK.arc(ctx, x - 5, y, 5, 4, Math.PI * 1.1, Math.PI * 1.9, { r, stroke: '#F58ACB', strokeWidth: 2.4 });
  SK.arc(ctx, x + 5, y, 5, 4, Math.PI * 1.1, Math.PI * 1.9, { r, stroke: '#F58ACB', strokeWidth: 2.4 });
}

/* smooth path through points → a filled landmass shape */
function landmass(ctx, pts, x0, y0, W, H, o) {
  const closed = pts.concat([[W + 20, H + 20], [-20, H + 20]]);
  SK.poly(ctx, closed, o);
}

/* ---------- shared base: sky → hills → grass → path ---------- */
function base(ctx, r, W, H, gy, pal, opts) {
  opts = opts || {};
  /* sky band (flat gradient under the sketch — canvas gradients allowed) */
  const gr = ctx.createLinearGradient(0, -10, 0, gy + 40);
  gr.addColorStop(0, pal.skyTop); gr.addColorStop(1, pal.skyBot);
  ctx.fillStyle = gr;
  ctx.fillRect(-10, -10, W + 20, gy + 60);

  /* celestial body */
  if (opts.night) {
    SK.circle(ctx, W * .16, 84, 26, { r, fill: '#FFF1C4', hatch: true, hatchGap: 5, hatchAngle: -40, strokeWidth: 2.6 });
    SK.circle(ctx, W * .16 - 12, 74, 4, { r, fill: '#EFE0B0', stroke: 'none' });
    SK.circle(ctx, W * .16 + 14, 92, 3, { r, fill: '#EFE0B0', stroke: 'none' });
    for (let i = 0; i < 14; i++) {
      const sx = r.rr(30, W - 30), sy = r.rr(24, gy - 190);
      if (Math.abs(sx - W * .16) < 80 && Math.abs(sy - 84) < 70) continue;
      SK.poly(ctx, SK.starPts(sx, sy, r.rr(4, 8), r.rr(1.8, 3), 5, -Math.PI / 2),
        { r, fill: '#FFF1C4', stroke: 'none' });
    }
  } else {
    const sunX = opts.lowSun ? W * .5 : W * .13;
    const sunY = opts.lowSun ? gy - 96 : 74;
    const sunR = opts.lowSun ? 42 : 31;
    SK.circle(ctx, sunX, sunY, sunR, { r, fill: pal.sun, hatch: true, hatchAngle: 60,
      hatchGap: opts.lowSun ? 6 : 4.5, strokeWidth: 3 });
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 2 * i / 10 + r.rr(-.1, .1);
      SK.line(ctx, sunX + Math.cos(a) * sunR * .72, sunY + Math.sin(a) * sunR * .72,
        sunX + Math.cos(a) * r.rr(sunR * .9, sunR * 1.1),
        sunY + Math.sin(a) * r.rr(sunR * .9, sunR * 1.1),
        { r, stroke: pal.ray, strokeWidth: 3.2 });
    }
  }
  /* clouds */
  const nClouds = opts.clouds == null ? 3 : opts.clouds;
  for (let i = 0; i < nClouds; i++)
    cloud(ctx, r, r.rr(W * .2, W * .92), r.rr(44, 96), r.rr(.7, 1.15), pal.cloud);

  /* far + near rolling hills */
  for (const [lift, col] of [[-30, pal.hillFar], [-10, pal.hillNear]]) {
    const pts = [[-20, gy + lift]];
    for (let i = 1; i <= 10; i++)
      pts.push([W * i / 10 + r.rr(-50, 50), gy + lift - r.rr(8, 64)]);
    pts.push([W + 20, gy + lift]);
    landmass(ctx, pts, 0, 0, W, H,
      { r, fill: col, hatch: true, hatchGap: 9, hatchAngle: -62, strokeWidth: 2 });
  }
  /* foreground grass band */
  const gpts = [[-20, gy + 10]];
  for (let i = 1; i <= 16; i++) gpts.push([W * i / 16, gy + 10 + r.rr(-7, 7)]);
  gpts.push([W + 20, gy + 10]);
  landmass(ctx, gpts, 0, 0, W, H,
    { r, fill: pal.grass, hatch: true, hatchGap: 6.5, hatchAngle: -78, strokeWidth: 2.2 });
  /* stitched walking path */
  const pts = [];
  for (let i = 0; i <= 7; i++)
    pts.push([-20 + (W + 40) * i / 7, gy + 44 + Math.sin(i * 1.4) * 6 + r.rr(-4, 4)]);
  SK.curve(ctx, pts, { r, stroke: pal.path, strokeWidth: 20 });
  SK.curve(ctx, pts, { r, stroke: pal.pathEdge, strokeWidth: 2.4, dash: [9, 12] });
}

/* ---------- biome scatter passes ---------- */
const BIOME_PAINTERS = {
  meadow(ctx, r, W, H, gy, pal) {
    for (const tx of [.1, .9]) tree(ctx, r, tx * W + r.rr(-30, 30), gy, r.rr(.9, 1.15));
    for (let i = 0; i < 9; i++) {
      const fx = r.rr(30, W - 30);
      if (r.f() < .6) flower(ctx, r, fx, gy, r.pick(pal.flora));
      else tuft(ctx, r, fx, gy);
    }
    butterfly(ctx, r, r.rr(W * .3, W * .6), r.rr(gy - 170, gy - 100));
    butterfly(ctx, r, r.rr(W * .6, W * .85), r.rr(gy - 150, gy - 90));
    for (let i = 0; i < 4; i++) bird(ctx, r, r.rr(W * .3, W * .9), r.rr(50, 110), r.rr(.7, 1.05));
  },

  forest(ctx, r, W, H, gy, pal, night) {
    for (let i = 0; i < 5; i++)
      pine(ctx, r, W * (.08 + i * .2) + r.rr(-20, 20), gy - 14, r.rr(.55, .75), night);
    for (const tx of [.06, .3, .62, .88]) {
      if (r.f() < .55) tree(ctx, r, tx * W + r.rr(-22, 22), gy, r.rr(1, 1.3), night);
      else pine(ctx, r, tx * W + r.rr(-22, 22), gy, r.rr(.95, 1.25), night);
    }
    for (const bx of [.2, .48, .76]) {
      const bx0 = bx * W + r.rr(-20, 20);
      for (const [dx, s] of [[-24, .8], [0, 1], [26, .75]])
        SK.circle(ctx, bx0 + dx, gy + r.rr(26, 40), 11 * s,
          { r, fill: night ? '#3A5A46' : '#4FB06D', hatch: true, hatchGap: 5, strokeWidth: 2.2 });
    }
    mushroom(ctx, r, W * r.rr(.14, .3), gy, r.rr(.8, 1.1));
    mushroom(ctx, r, W * r.rr(.6, .85), gy, r.rr(.7, 1));
    for (let i = 0; i < 5; i++) tuft(ctx, r, r.rr(20, W - 20), gy, night ? '#3A5A46' : '#3E8F57');
  },

  river(ctx, r, W, H, gy, pal) {
    const wl = W * .3, wr = W * .78;
    SK.rect(ctx, wl, gy - 12, wr - wl, H - gy + 30,
      { r, fill: pal.water, hatch: true, hatchAngle: -6, hatchGap: 7, stroke: 'none' });
    for (let i = 0; i < 6; i++) {
      const wx = wl + 20 + i * ((wr - wl - 40) / 6), wy = gy + 2 + (i % 2) * 16;
      SK.curve(ctx, [[wx, wy], [wx + 14, wy - 5], [wx + 30, wy], [wx + 44, wy - 4]],
        { r, stroke: pal.waterHi, strokeWidth: 3 });
    }
    for (const [bx, dir] of [[wl, -1], [wr, 1]]) {
      SK.curve(ctx, [[bx, gy - 14], [bx + dir * r.rr(8, 16), gy + 30], [bx + dir * 6, H]],
        { r, stroke: pal.pathEdge, strokeWidth: 5 });
      for (let i = 0; i < 3; i++) cattail(ctx, r, bx + dir * (12 + i * 14) + r.rr(-3, 3), gy);
    }
    for (const lx of [wl + 60, wl + (wr - wl) * .5, wr - 70]) {
      SK.ellipse(ctx, lx, gy + 34, 15, 6, { r, fill: '#4FB06D', strokeWidth: 1.8 });
      SK.line(ctx, lx, gy + 32, lx + 11, gy + 28, { r, stroke: '#3E8F57', strokeWidth: 2 });
    }
    const fxp = r.rr(wl + 80, wr - 80);
    SK.arc(ctx, fxp, gy + 6, 18, 15, Math.PI * 1.15, Math.PI * 1.85, { r, stroke: '#FF9E57', strokeWidth: 2.6 });
    tree(ctx, r, W * .07, gy, r.rr(.9, 1.1));
    pine(ctx, r, W * .93, gy, r.rr(.9, 1.15));
    for (let i = 0; i < 4; i++) tuft(ctx, r, r.rr(20, wl - 40), gy);
    for (let i = 0; i < 4; i++) tuft(ctx, r, r.rr(wr + 40, W - 20), gy);
  },

  village(ctx, r, W, H, gy, pal) {
    for (const [hx, hs] of [[.2, .82], [.52, 1], [.82, .88]]) {
      const hxx = hx * W, hy = gy + 6, hw2 = 110 * hs;
      SK.rect(ctx, hxx - hw2 / 2, hy - 78 * hs, hw2, 78 * hs,
        { r, fill: r.pick(['#FFDE9E', '#FFF1D6', '#FFD9A8']), hatch: true, hatchGap: 7, hatchAngle: -30, strokeWidth: 2.6 });
      SK.poly(ctx, [[hxx - hw2 / 2 - 14, hy - 76 * hs], [hxx, hy - 126 * hs], [hxx + hw2 / 2 + 14, hy - 76 * hs]],
        { r, fill: r.pick(['#E86A4E', '#C9553F', '#E0805E']), hatch: true, hatchGap: 6, hatchAngle: -40, strokeWidth: 2.6 });
      SK.rect(ctx, hxx - 13 * hs, hy - 48 * hs, 26 * hs, 48 * hs,
        { r, fill: '#8A5E2E', hatch: true, hatchGap: 4.5, hatchAngle: -55, strokeWidth: 2.2 });
      SK.circle(ctx, hxx + 8 * hs, hy - 26 * hs, 3, { r, fill: '#FFC53D', strokeWidth: 1.4 });
      SK.curve(ctx, [[hxx + hw2 / 4, hy - 124 * hs], [hxx + hw2 / 4 - 10, hy - 140 * hs], [hxx + hw2 / 4 + 8, hy - 152 * hs]],
        { r, stroke: '#C9BEC8', strokeWidth: 4 });
    }
    for (let i = 0; i < 8; i++) {
      const fx = W * .06 + i * 34;
      SK.rect(ctx, fx, gy + 12, 9, 30, { r, fill: '#C9A06B', strokeWidth: 1.6 });
    }
    SK.line(ctx, W * .05, gy + 26, W * .06 + 8 * 34, gy + 26, { r, stroke: '#C9A06B', strokeWidth: 3.2 });
    for (let i = 0; i < 6; i++)
      SK.ellipse(ctx, r.rr(W * .3, W * .9), gy + r.rr(52, 64), r.rr(14, 24), r.rr(6, 10),
        { r, fill: pal.rock, hatch: true, hatchGap: 4, strokeWidth: 1.6 });
    const lx = W * .94;
    SK.line(ctx, lx, gy + 20, lx, gy - 96, { r, stroke: '#5A5F6E', strokeWidth: 6 });
    SK.line(ctx, lx, gy - 96, lx - 26, gy - 96, { r, stroke: '#5A5F6E', strokeWidth: 4 });
    SK.rect(ctx, lx - 40, gy - 92, 24, 30, { r, fill: '#FFE9A0', hatch: true, hatchGap: 5, strokeWidth: 2.2 });
    SK.circle(ctx, lx - 28, gy - 76, 6, { r, fill: '#FFC53D', strokeWidth: 1.4 });
  },

  storm(ctx, r, W, H, gy, pal) {
    for (let i = 0; i < 5; i++)
      cloud(ctx, r, W * .1 + i * (W * .21) + r.rr(-16, 16), r.rr(40, 66), r.rr(1, 1.35), '#B9C4D4');
    for (let x = 30; x < W - 10; x += 46) {
      const top = r.rr(90, 130);
      for (let y = top; y < gy - 70; y += r.rr(90, 130))
        SK.line(ctx, x + r.rr(-8, 8), y, x - 10 + r.rr(-4, 4), y + r.rr(26, 40),
          { r, stroke: '#7FB8E8', strokeWidth: 2.4 });
    }
    for (const px of [W * .18, W * .5, W * .78]) {
      SK.ellipse(ctx, px, gy + 52, r.rr(70, 96), 19, { r, fill: '#8FD0F2', hatch: true, hatchGap: 5, hatchAngle: 0, strokeWidth: 2 });
      SK.line(ctx, px - 20, gy + 50, px - 2, gy + 48, { r, stroke: '#C4E7FB', strokeWidth: 2.6 });
    }
    for (const tx of [W * .3, W * .66]) {
      const fy = gy + r.rr(30, 46);
      SK.curve(ctx, [[tx, fy], [tx + 2, fy - 12], [tx + 10, fy - 20]], { r, stroke: '#3E8F57', strokeWidth: 2.4 });
      SK.ellipse(ctx, tx + 12, fy - 20, 8, 5, { r, fill: '#A9B8C8', strokeWidth: 1.8 });
    }
    const bx = W * .9;
    SK.curve(ctx, [[bx, gy + 8], [bx - 16, gy - 30], [bx - 30, gy - 56]], { r, stroke: '#8A5E2E', strokeWidth: 7 });
    SK.circle(ctx, bx - 36, gy - 62, 15, { r, fill: '#4A7A5C', hatch: true, hatchGap: 5, strokeWidth: 2.4 });
    mushroom(ctx, r, W * .44, gy, 1);
  },

  rain(ctx, r, W, H, gy, pal) { BIOME_PAINTERS.storm(ctx, r, W, H, gy, pal); },

  dusk(ctx, r, W, H, gy, pal) {
    for (const tx of [.14, .86]) {
      const txx = tx * W;
      SK.ellipse(ctx, txx + 40, gy + 30, 60, 8, { r, fill: pal.grassDeep, stroke: 'none' });
      tree(ctx, r, txx, gy, r.rr(1, 1.2), true);
    }
    for (let i = 0; i < 7; i++) {
      const fx = r.rr(W * .1, W * .9), fy = r.rr(gy - 160, gy - 40);
      SK.circle(ctx, fx, fy, r.rr(2.4, 4), { r, fill: '#E8F75E', stroke: 'none' });
      SK.circle(ctx, fx, fy, r.rr(6, 9), { r, stroke: '#E8F75E', strokeWidth: 1 });
    }
    for (let i = 0; i < 5; i++) bird(ctx, r, r.rr(W * .2, W * .8), r.rr(60, 120), r.rr(.7, 1));
    for (let i = 0; i < 6; i++) flower(ctx, r, r.rr(30, W - 30), gy, r.pick(pal.flora));
  },

  cave(ctx, r, W, H, gy, pal) {
    SK.rect(ctx, -10, gy + 8, W + 20, H - gy, { r, fill: '#7D7488', hatch: true, hatchAngle: -64, hatchGap: 7, strokeWidth: 2 });
    const ceil = [[-30, -20], [-30, gy - 200]];
    let cx = -30;
    while (cx < W + 30) { cx += r.rr(90, 150); ceil.push([Math.min(cx, W + 30), gy - r.rr(160, 225)]); }
    ceil.push([W + 30, -20]);
    SK.poly(ctx, ceil, { r, fill: '#6E6478', hatch: true, hatchAngle: -58, hatchGap: 6, strokeWidth: 2.8 });
    for (const tx of [W * .18, W * .42, W * .66, W * .86]) {
      const len = r.rr(26, 54), top = gy - r.rr(160, 190);
      SK.poly(ctx, [[tx - 16, top], [tx + 18, top - 4], [tx + 3, top + len]],
        { r, fill: '#6E6478', hatch: true, hatchGap: 5, strokeWidth: 2.2 });
    }
    for (const [px, ps] of [[W * .22, 1], [W * .55, .8], [W * .78, 1.1]]) {
      const by = gy + r.rr(30, 50);
      SK.poly(ctx, [[px - 14 * ps, by], [px - 8 * ps, by - 34 * ps], [px + 4 * ps, by - 44 * ps], [px + 14 * ps, by - 18 * ps], [px + 12 * ps, by]],
        { r, fill: '#B565D8', hatch: true, hatchGap: 4, hatchAngle: -40, strokeWidth: 2.2 });
      SK.poly(ctx, [[px + 12 * ps, by], [px + 18 * ps, by - 22 * ps], [px + 26 * ps, by - 14 * ps], [px + 24 * ps, by]],
        { r, fill: '#5DA9E9', hatch: true, hatchGap: 4, strokeWidth: 2 });
    }
    const sx = W * .35, sy = gy - 110;
    SK.arc(ctx, sx, sy, 40, 40, .3, Math.PI * 1.8, { r, stroke: '#E8A020', strokeWidth: 2.6 });
    SK.arc(ctx, sx, sy, 22, 22, .3, Math.PI * 1.8, { r, stroke: '#E8A020', strokeWidth: 2.4 });
    const bx = W * r.rr(.6, .85), byy = gy - r.rr(140, 180);
    SK.arc(ctx, bx - 8, byy, 7, 5, Math.PI * 1.15, Math.PI * 1.95, { r, stroke: '#3A3140', strokeWidth: 2.6 });
    SK.arc(ctx, bx + 8, byy, 7, 5, Math.PI * 1.05, Math.PI * 1.85, { r, stroke: '#3A3140', strokeWidth: 2.6 });
  },

  snow(ctx, r, W, H, gy, pal) {
    for (const tx of [.12, .55, .88]) pine(ctx, r, tx * W + r.rr(-16, 16), gy, r.rr(.9, 1.15));
    for (let i = 0; i < 22; i++)
      SK.circle(ctx, r.rr(10, W - 10), r.rr(30, gy + 30), r.rr(2, 4.5),
        { r, fill: '#FFFDF6', stroke: 'none' });
    const sx = W * .3;
    SK.circle(ctx, sx, gy + 24, 22, { r, fill: '#FFFDF6', hatch: true, hatchGap: 6, strokeWidth: 2.4 });
    SK.circle(ctx, sx, gy - 16, 15, { r, fill: '#FFFDF6', hatch: true, hatchGap: 6, strokeWidth: 2.4 });
    SK.circle(ctx, sx - 8, gy - 22, 1.6, { r, fill: INK, stroke: 'none' });
    SK.circle(ctx, sx + 8, gy - 22, 1.6, { r, fill: INK, stroke: 'none' });
    SK.poly(ctx, [[sx + 2, gy - 16], [sx + 18, gy - 13], [sx + 2, gy - 9]],
      { r, fill: '#FF9E57', strokeWidth: 1.6 });
  },
};

const BIOME_MAP = {
  meadow: 'meadow', meadows: 'meadow', field: 'meadow', plains: 'meadow', grass: 'meadow',
  hill: 'meadow', hills: 'meadow',
  forest: 'forest', woods: 'forest', wood: 'forest', trees: 'forest', jungle: 'forest', grove: 'forest',
  river: 'river', stream: 'river', creek: 'river', water: 'river', lake: 'river', pond: 'river', brook: 'river',
  village: 'village', town: 'village', farm: 'village', homes: 'village',
  storm: 'storm', thunder: 'storm', thunderstorm: 'storm', windy: 'storm', wind: 'storm',
  rain: 'rain', rainstorm: 'rain', drizzle: 'rain', shower: 'rain',
  dusk: 'dusk', sunset: 'dusk', evening: 'dusk', twilight: 'dusk', midnight: 'dusk',
  night: 'dusk', dark: 'dusk',
  cave: 'cave', cavern: 'cave', tunnel: 'cave', den: 'cave',
  snow: 'snow', winter: 'snow', ice: 'snow', frost: 'snow',
};

/* ---------- bake scene_seed.props[] into the backdrop ---------- */
function bakeProps(ctx, r, propKinds, W, gy) {
  const used = [];
  for (const [i, kind] of (propKinds || []).slice(0, 7).entries()) {
    const res = window.resolveKind(kind);
    const def = window.PROPS[res.def];
    if (!def) continue;
    const sc = window.propScale(def, W) * .9;
    let px = 0, tries = 0;
    do {
      px = r.rr(W * .1, W * .9); tries++;
    } while (tries < 12 && used.some(u => Math.abs(u - px) < def.w * sc * .7));
    used.push(px);
    ctx.save();
    ctx.translate(px - (def.w * sc) / 2, gy + 4 - def.h * sc);
    ctx.scale(sc, sc);
    def.draw(ctx, def.w, def.h, r, res.word);
    ctx.restore();
    /* every baked prop still gets its hand-lettered name */
    SK.caption(ctx, res.word, px, gy + 26 + (i % 2) * 4, r, { size: 14 });
  }
}

/* ---------- the public world render (draws into a canvas) ---------- */
function render(cv, ss, W, H) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  cv.width = Math.max(2, Math.round(W * dpr));
  cv.height = Math.max(2, Math.round(H * dpr));
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  /* paper floor under everything (shows through hatch gaps) */
  ctx.fillStyle = '#FDF3E3';
  ctx.fillRect(0, 0, W, H);

  const seed = (ss && (ss.seed | 0)) || 1234;
  const r = SK.rng(seed);
  const biome = BIOME_MAP[String(ss && ss.biome || 'meadow').toLowerCase()] || 'meadow';
  let palette = String(ss && ss.palette || 'warm').toLowerCase();
  if (!PALETTES[palette]) palette = (biome === 'cave' || biome === 'dusk') ? 'night' : 'warm';
  if (biome === 'cave' && palette !== 'night') palette = 'night';
  if (biome === 'storm' && palette === 'warm') palette = 'cool';
  const pal = PALETTES[palette];

  const gy = Math.round(H * .8);
  const night = palette === 'night';
  base(ctx, r, W, H, gy, pal, {
    night,
    lowSun: biome === 'dusk',
    clouds: (biome === 'storm' || biome === 'rain' || biome === 'cave') ? 0 : (night ? 2 : 3),
  });
  (BIOME_PAINTERS[biome] || BIOME_PAINTERS.meadow)(ctx, r, W, H, gy, pal, night);
  bakeProps(ctx, r, ss && ss.props, W, gy);

  return {
    biome, palette, gy,
    rain: biome === 'storm' || biome === 'rain',
    dark: night,
    leaves: biome === 'forest' || biome === 'dusk',
    snow: biome === 'snow',
  };
}

/* ---------- the house under construction (drawn live on play canvas) ---------- */
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

window.WORLD = { render, drawBuild, PALETTES, BIOME_MAP, groundFrac: .8 };
})();
