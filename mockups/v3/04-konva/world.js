/* world.js — procedural biome renderer.
 *
 * WORLD.render(bgGroup, W, H, scene_seed) clears and re-grows the whole
 * background sketch from {biome, seed, palette}: sky gradient, celestial,
 * cloud deck, far hills, ground band + dashed walking path, then a
 * biome-specific scatter pass (trees / reeds / cave rocks / village huts).
 * scene_seed.props[] are planted along the ground as real PROP nodes too.
 *
 * Same seed => same world. Everything added is a Konva node.
 */
(function () {
  const S = SK;

  const PALETTES = {
    warm: {
      skyTop: '#BFE6FB', skyBot: '#FFF3D2', sun: '#FFC53D', moon: null,
      hillFar: '#B7E3C0', hillNear: '#8ED1A1', ground: '#F3E3BC',
      path: '#D9B98A', pathEdge: '#B98A4F', scatter: ['#4FB06D', '#5FBF7B'],
      flower: ['#FF6B57', '#F58ACB', '#B565D8', '#FF9E57'], ink: '#2B2118',
    },
    cool: {
      skyTop: '#AFD6F2', skyBot: '#EAF6FF', sun: '#FFE49A', moon: null,
      hillFar: '#9FD0C0', hillNear: '#7FBFA6', ground: '#E4ECD2',
      path: '#C9C49A', pathEdge: '#9AA26E', scatter: ['#3E8F57', '#57A86E'],
      flower: ['#5DA9E9', '#B565D8', '#FF9EBB'], ink: '#2B2118',
    },
    dusk: {
      skyTop: '#F7B98A', skyBot: '#FCE3C2', sun: '#FF9E57', moon: null,
      hillFar: '#C9A0B8', hillNear: '#A87E9E', ground: '#EDD3AC',
      path: '#C9A06B', pathEdge: '#9A7046', scatter: ['#7A5E8E', '#96789E'],
      flower: ['#FFB45E', '#FF8A6B', '#DCC3F2'], ink: '#2B2118',
    },
    night: {
      skyTop: '#33395E', skyBot: '#6E6E94', sun: null, moon: '#F4E9C8',
      hillFar: '#565B7E', hillNear: '#46496B', ground: '#7E7791',
      path: '#9B93A8', pathEdge: '#6E657E', scatter: ['#3E4468', '#565B7E'],
      flower: ['#C9BEC8', '#8FA8D8'], ink: '#242033',
    },
  };

  const BIOMES = ['meadow', 'forest', 'rain', 'river', 'cave', 'village', 'storm'];

  function cloud(g, r, x, y, s, col, ink) {
    col = col || '#FFFDF6';
    for (const [dx, dy, rx, ry] of [[-18, 4, 18, 11], [0, -4, 24, 15], [20, 5, 16, 10]])
      g.add(S.ellipse(x + dx * s, y + dy * s, rx * s, ry * s,
        { r, fill: col, stroke: ink, strokeWidth: 2.2 }));
  }
  function grassTuft(g, r, x, y, col) {
    for (const dx of [-4, 0, 4])
      g.add(S.curve([[x + dx, y], [x + dx + r.rr(-3, 3), y - r.rr(8, 15)]],
        { r, stroke: col, strokeWidth: 2 }));
  }
  function tree(g, r, x, y, s, cols, ink) {
    g.add(S.line(x, y, x + r.rr(-3, 3), y - 34 * s, { r, stroke: '#8A5E2E', strokeWidth: 6 * s }));
    for (const [dx, dy, rr] of [[-14, -46, 17], [12, -50, 15], [0, -64, 19]])
      g.add(S.circle(x + dx * s, y + dy * s, rr * s,
        { r, fill: r.pick(cols), hatch: true, hatchGap: 7, strokeWidth: 2.2 }));
  }
  function pine(g, r, x, y, s, col) {
    g.add(S.line(x, y, x, y - 14 * s, { r, stroke: '#8A5E2E', strokeWidth: 4 * s }));
    for (let i = 0; i < 3; i++)
      g.add(S.tri(x, y - (10 + i * 14) * s, (44 - i * 10) * s, 22 * s,
        { r, fill: col, hatch: i === 2, hatchGap: 6, strokeWidth: 2.2, amp: 1 }));
  }

  /* ---------- modular builders ---------- */
  function buildSky(g, W, H, P, r, biome) {
    g.add(new Konva.Rect({
      x: 0, y: 0, width: W, height: H, listening: false,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 0, y: H * .9 },
      fillLinearGradientColorStops: [0, P.skyTop, 1, P.skyBot],
    }));
    if (P.sun) {
      const sx = W * r.rr(.68, .88), sy = H * (P === PALETTES.dusk ? .42 : .16);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        g.add(S.line(sx + Math.cos(a) * 34, sy + Math.sin(a) * 34,
          sx + Math.cos(a) * (46 + r.rr(0, 10)), sy + Math.sin(a) * (46 + r.rr(0, 10)),
          { r, stroke: P.sun, strokeWidth: 3 }));
      }
      g.add(S.circle(sx, sy, 26, { r, fill: P.sun, hatch: true, hatchGap: 5, hatchAngle: 40, stroke: P.ink, strokeWidth: 3 }));
    }
    if (P.moon) {
      const mx = W * .8, my = H * .16;
      g.add(S.arc(mx, my, 26, 26, Math.PI * .3, Math.PI * 1.7, { r, stroke: P.moon, strokeWidth: 7 }));
      g.add(S.arc(mx + 10, my, 22, 22, Math.PI * .35, Math.PI * 1.65, { r, stroke: P.moon, strokeWidth: 4 }));
      for (let i = 0; i < 14; i++)
        g.add(S.circle(W * r.f(), H * .42 * r.f(), r.rr(1, 2.2),
          { r, fill: '#FFF6C9', stroke: 'none', strokeWidth: 0, opacity: r.rr(.5, .95) }));
    }
    const clouds = biome === 'storm' ? 4 : biome === 'rain' ? 4 : r.ri(1, 3);
    for (let i = 0; i < clouds; i++) {
      const dark = biome === 'storm' || biome === 'rain';
      cloud(g, r, W * r.rr(.08, .92), H * r.rr(.08, .3), r.rr(.7, 1.3),
        dark ? '#C9D2E0' : '#FFFDF6', P.ink);
    }
    if (biome === 'storm') {
      for (let i = 0; i < 2; i++) {
        const lx = W * r.rr(.25, .8);
        g.add(S.path([[lx, H * .3], [lx - 12, H * .42], [lx + 4, H * .42], [lx - 14, H * .56]],
          { r, stroke: '#FFC53D', strokeWidth: 4, tension: .1 }));
      }
    }
  }

  function buildGround(g, W, H, P, r) {
    const gy = H * .8;
    /* far hill */
    const hillFar = [];
    for (let x = -20; x <= W + 20; x += 26)
      hillFar.push([x, gy - 26 - Math.sin(x / W * Math.PI * 2 + r.rr(0, .6)) * 22 - r.rr(0, 14)]);
    g.add(S.poly(hillFar.concat([[W + 20, gy], [-20, gy]]),
      { r, fill: P.hillFar, stroke: 'none', strokeWidth: 0, tension: .55, listening: false }));
    g.add(S.curve(hillFar, { r, stroke: P.ink, strokeWidth: 2, opacity: .8, tension: .55 }));
    /* near hill */
    const hillNear = [];
    for (let x = -20; x <= W + 20; x += 24)
      hillNear.push([x, gy - 8 - Math.abs(Math.sin(x / W * Math.PI * 3)) * 16 - r.rr(0, 8)]);
    g.add(S.poly(hillNear.concat([[W + 20, gy + 40], [-20, gy + 40]]),
      { r, fill: P.hillNear, stroke: 'none', strokeWidth: 0, tension: .55 }));
    g.add(S.curve(hillNear, { r, stroke: P.ink, strokeWidth: 2, opacity: .8, tension: .55 }));
    /* ground band */
    g.add(new Konva.Rect({
      x: -10, y: gy, width: W + 20, height: H - gy + 10, listening: false, fill: P.ground,
    }));
    g.add(S.line(-10, gy, W + 10, gy, { r, stroke: P.ink, strokeWidth: 2.6, amp: 2 }));
    /* dashed walking path */
    const pathPts = [];
    for (let x = -10; x <= W + 10; x += 40)
      pathPts.push([x, gy + 30 + Math.sin(x / W * Math.PI * 2.2) * 8]);
    g.add(S.curve(pathPts, { r, stroke: P.path, strokeWidth: 26, opacity: .8, tension: .5 }));
    g.add(S.curve(pathPts, { r, stroke: P.pathEdge, strokeWidth: 2.4, dash: [10, 14], tension: .5 }));
    return gy;
  }

  /* biome scatter — the part that makes each seed feel like a new place */
  function buildScatter(g, W, H, gy, P, r, biome) {
    const rx = () => r.rr(20, W - 20);
    switch (biome) {
      case 'forest': {
        for (let i = 0; i < 6; i++)
          (r.f() < .5 ? pine : tree)(g, r, rx(), gy - r.rr(0, 14), r.rr(.7, 1.2),
            biome === 'forest' && r.f() < .4 ? '#2E7A46' : r.pick(P.scatter), P.ink);
        for (let i = 0; i < 8; i++) grassTuft(g, r, rx(), gy + r.rr(2, 26), P.scatter[0]);
        break;
      }
      case 'rain': {
        for (let i = 0; i < 26; i++) {
          const x = W * r.f(), y = H * .34 + r.f() * H * .38;
          g.add(S.line(x, y, x - 6, y + r.rr(12, 20), { r, stroke: '#7FB8E8', strokeWidth: 2.4 }));
        }
        for (let i = 0; i < 4; i++)
          g.add(S.ellipse(rx(), gy + r.rr(16, 34), r.rr(20, 34), r.rr(4, 7),
            { r, fill: '#8FD0F2', strokeWidth: 1.8 }));
        for (let i = 0; i < 5; i++) grassTuft(g, r, rx(), gy + r.rr(2, 20), P.scatter[0]);
        break;
      }
      case 'river': {
        const cx = W * .58;
        g.add(S.poly([[cx - 60, gy - 4], [cx + 60, gy - 4], [cx + 90, H], [cx - 90, H]],
          { r, fill: '#8FD0F2', stroke: 'none', strokeWidth: 0, tension: .2 }));
        for (const dy of [14, 30, 46])
          g.add(S.curve([[cx - 50 - dy, gy + dy], [cx, gy + dy - 5], [cx + 50 + dy, gy + dy]],
            { r, stroke: '#C4E7FB', strokeWidth: 2.4, tension: .4 }));
        g.add(S.line(cx - 60, gy - 2, cx + 60, gy - 2, { r, stroke: '#5DA9E9', strokeWidth: 2.6 }));
        for (let i = 0; i < 5; i++) {
          const bx = r.f() < .5 ? cx - r.rr(70, 110) : cx + r.rr(70, 110);
          g.add(S.line(bx, gy + 8, bx + r.rr(-3, 3), gy - r.rr(18, 30), { r, stroke: '#3E8F57', strokeWidth: 2.6 }));
          g.add(S.ellipse(bx + 2, gy - 32, 4, 9, { r, fill: '#8A5E2E', strokeWidth: 1.6 }));
        }
        for (let i = 0; i < 3; i++) tree(g, r, rx(), gy - r.rr(0, 10), r.rr(.6, .9), P.scatter, P.ink);
        break;
      }
      case 'cave': {
        g.add(new Konva.Rect({ x: -10, y: -10, width: W + 20, height: H + 20, fill: 'rgba(43,33,24,.32)', listening: false }));
        g.add(S.poly([[-10, -10], [-10, H * .5], [W * .16, H * .3], [W * .4, H * .22],
          [W * .62, H * .26], [W * .84, H * .34], [W + 10, H * .46], [W + 10, -10]],
          { r, fill: '#6E6257', hatch: true, hatchGap: 9, strokeWidth: 3, tension: .3 }));
        for (let i = 0; i < 5; i++) {
          const x = W * r.rr(.12, .88);
          g.add(S.tri(x, H * r.rr(.3, .4), r.rr(14, 26), r.rr(24, 44),
            { r, fill: '#5C5148', strokeWidth: 2.4 }));
        }
        for (let i = 0; i < 4; i++)
          g.add(S.ellipse(rx(), gy + r.rr(4, 20), r.rr(10, 20), r.rr(5, 9),
            { r, fill: '#8B8378', strokeWidth: 2 }));
        for (let i = 0; i < 4; i++)
          g.add(S.circle(W * r.f(), H * r.rr(.5, .68), 2.4,
            { r, fill: '#FFF6C9', stroke: 'none', strokeWidth: 0, opacity: .8 }));
        break;
      }
      case 'village': {
        for (let i = 0; i < 3; i++) {
          const hx = W * (.12 + i * .3) + r.rr(-20, 20), s = r.rr(.55, .8);
          g.add(S.rect(hx - 34 * s, gy - 44 * s, 68 * s, 44 * s,
            { r, fill: r.pick(['#FFF1D6', '#F7E3C2', '#FFE9D6']), strokeWidth: 2.6 }));
          g.add(S.poly([[hx - 42 * s, gy - 44 * s], [hx + 42 * s, gy - 44 * s], [hx, gy - 72 * s]],
            { r, fill: r.pick(['#FF6B57', '#E8A020', '#B565D8']), strokeWidth: 2.6, tension: .2 }));
          g.add(S.rect(hx - 8 * s, gy - 20 * s, 16 * s, 20 * s, { r, fill: '#8A5E2E', strokeWidth: 2 }));
          g.add(S.rect(hx + 12 * s, gy - 36 * s, 12 * s, 12 * s, { r, fill: '#FFF6C9', strokeWidth: 1.8 }));
        }
        for (let i = 0; i < 4; i++) grassTuft(g, r, rx(), gy + r.rr(2, 22), P.scatter[0]);
        for (let i = 0; i < 3; i++) {
          const fx = rx();
          g.add(S.ellipse(fx, gy + 4, 10, 5, { r, fill: r.pick(P.flower), strokeWidth: 1.6 }));
        }
        break;
      }
      case 'storm': {
        for (let i = 0; i < 20; i++) {
          const x = W * r.f(), y = H * .36 + r.f() * H * .36;
          g.add(S.line(x, y, x - 8, y + r.rr(14, 24), { r, stroke: '#7FB8E8', strokeWidth: 2.6 }));
        }
        for (let i = 0; i < 3; i++) pine(g, r, rx(), gy - r.rr(0, 10), r.rr(.7, 1), '#3E5E46');
        for (let i = 0; i < 5; i++) {
          const x = rx();
          g.add(S.curve([[x, gy + 4], [x - r.rr(6, 14), gy - r.rr(4, 10)]],
            { r, stroke: '#6E768C', strokeWidth: 2.2 }));
        }
        break;
      }
      case 'meadow':
      default: {
        for (let i = 0; i < 3; i++) tree(g, r, rx(), gy - r.rr(0, 12), r.rr(.7, 1.1), P.scatter, P.ink);
        for (let i = 0; i < 10; i++) grassTuft(g, r, rx(), gy + r.rr(2, 28), P.scatter[0]);
        for (let i = 0; i < 7; i++) {
          const x = rx(), y = gy + r.rr(4, 30), col = r.pick(P.flower);
          g.add(S.line(x, y, x, y - 9, { r, stroke: '#3E8F57', strokeWidth: 1.8 }));
          g.add(S.circle(x, y - 12, 4, { r, fill: col, strokeWidth: 1.5 }));
          g.add(S.circle(x, y - 12, 1.6, { r, fill: '#FFC53D', stroke: 'none', strokeWidth: 0 }));
        }
      }
    }
  }

  /* ---------- public ---------- */
  function render(bg, W, H, ss) {
    bg.destroyChildren();
    const biome = BIOMES.includes(ss.biome) ? ss.biome : 'meadow';
    const P = PALETTES[ss.palette] || PALETTES.warm;
    const r = S.rng((ss.seed | 0) || 1);

    const sky = new Konva.Group({ name: 'sky', listening: false });
    const groundG = new Konva.Group({ name: 'ground', listening: false });
    const scatter = new Konva.Group({ name: 'scatter', listening: true });
    bg.add(sky, groundG, scatter);

    buildSky(sky, W, H, P, r, biome);
    const gy = buildGround(groundG, W, H, P, r);
    buildScatter(scatter, W, H, gy, P, S.rng((ss.seed | 0) + 909), biome);

    /* scene_seed.props[] — scenery prop nodes planted along the ground */
    (ss.props || []).slice(0, 6).forEach((k, i) => {
      const pr = S.rng((ss.seed | 0) + i * 61 + 5);
      const node = PROPS.build(k, (ss.seed | 0) + i * 977);
      const x = W * (0.1 + 0.8 * ((i + 0.5) / Math.min(6, (ss.props || []).length || 1)));
      node.position({ x: x + pr.rr(-24, 24), y: gy + 2 });
      node.scale({ x: .8, y: .8 });
      node.setAttr('scenery', true);
      scatter.add(node);
    });
    return gy;
  }

  window.WORLD = { render, PALETTES, BIOMES, groundFrac: .8 };
})();
