/* ============================================================
   world.js — Paper.js scene engine for "The Three Little Pigs"
   ============================================================
   THE DIFFERENTIATOR: everything on stage is a paper.Path /
   paper.Group vector object, so the world can MORPH, not swap:

   - The pig house is a small set of paths whose segments are
     interpolated between straw -> stick -> brick specs
     (points + bezier handles + fill color all lerp).
   - The wolf's huff-and-puff is a sinusoidal wobble driven by
     view.onFrame (chest puffs, cheeks billow, wind streaks
     travel via dashOffset).
   - The kid's crayon strokes arrive as raw segment lists, get
     path.simplify()-ed + path.smooth()-ed, and become a puppet
     group with pivot-jointed legs that bob and walk.
   - Terrain is procedural per scene_seed: seeded RNG -> layered
     noise hills (path.smooth()), foliage stamps, gradient sky
     bands, biome extras (river band, rain streaks, cave arch).
   ============================================================ */
'use strict';
window.PaperWorld = (function () {
  const W = new paper.PaperScope();
  /* CRITICAL: keep transforms on item matrices instead of baking them into
     path segments. With the default applyMatrix:true, every transform()
     (position/rotation/scaling writes, incl. per-frame anims) is multiplied
     permanently into descendant segment points — a spring-pop scale starting
     near 0 collapses the whole puppet/prop to a dot forever. With false, the
     matrix persists and scaling back to 1 restores geometry exactly. */
  W.settings.applyMatrix = false;
  const INK = '#2B2118';

  /* ---------- state ---------- */
  let cv, stageEl;
  let Wpx = 900, Hpx = 460, gy = 360;              // ground line y
  let sceneG, propG;                               // current section group + its prop layer
  let pigG, houseG, heroG, wolfG, fxG;             // persistent layers above the section
  let scene = { biome: 'meadow', seed: 1, palette: 'warm', props: [] };
  let heroReady = false, heroBusy = false;
  let houseStage = 0;                               // 0 none · 1 straw · 2 stick · 3 brick
  let wolfLevel = 0, huffBusy = false;
  let onHouseEvent = null;

  const anims = [];      // {t0,dur,fn(k),done} — one-shot tweens
  const tickers = [];    // fn(t, dt) — continuous per-frame life
  const spawned = [];    // {kind, group}

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

  /* ---------- tiny animation kit (driven by view.onFrame) ---------- */
  function anim(dur, fn, done) {
    anims.push({ t0: -1, dur, fn, done });
  }
  const easeOutBack = k => { const c = 1.9; k -= 1; return k * k * ((c + 1) * k + c) + 1; };
  const easeInOut = k => k < .5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
  const easeOut = k => 1 - (1 - k) ** 3;
  function wait(dur) { return new Promise(res => anim(dur, () => {}, res)); }
  /* ticker bound to an item's life — dies automatically when the item leaves
     the stage (prevents ticker leaks across scene rebuilds) */
  function lifeTicker(item, fn) {
    const tk = (t, dt) => {
      if (!item.isInserted()) { tk.dead = true; return; }
      fn(t, dt);
    };
    tickers.push(tk);
    return tk;
  }

  /* ---------- path shorthands (always under scope W) ---------- */
  function style(p, o) {
    if (!o) return p;
    if (o.stroke) p.strokeColor = o.stroke;
    if (o.sw) p.strokeWidth = o.sw;
    if (o.fill) p.fillColor = o.fill;
    if (o.cap) p.strokeCap = o.cap;
    if (o.join) p.strokeJoin = o.join;
    if (o.opacity != null) p.opacity = o.opacity;
    if (o.dash) { p.dashArray = o.dash; }
    return p;
  }
  function path(pts, o) {
    const p = new W.Path({ segments: pts, closed: !!(o && o.closed) });
    return style(p, o);
  }
  function blob(cx, cy, rx, ry, o, r) {
    // 8-segment wobbly blob — the workhorse shape
    const rnd = r || Math.random;
    const w = 1 + rr(rnd, -0.06, 0.06), h = 1 + rr(rnd, -0.06, 0.06);
    const k = 0.5523;
    const pts = [
      [cx - rx * w, cy], [cx, cy - ry * h], [cx + rx * w, cy], [cx, cy + ry * h]
    ];
    const p = new W.Path({ segments: pts, closed: true });
    // widen to 8 segments so morph targets can share a spec shape
    p.segments[0].handleOut = new W.Point(rx * k, -ry * k * .2);
    p.segments[0].handleIn = new W.Point(rx * k, ry * k * .2);
    p.segments[1].handleIn = new W.Point(-rx * k, -ry * k * .2);
    p.segments[1].handleOut = new W.Point(rx * k * .2, 0);
    p.segments[2].handleIn = new W.Point(-rx * k * .2, 0);
    p.segments[2].handleOut = new W.Point(-rx * k, -ry * k * .2);
    p.segments[3].handleIn = new W.Point(rx * k * .2, ry * k);
    p.segments[3].handleOut = new W.Point(-rx * k * .2, ry * k);
    return style(p, o);
  }
  function ell(cx, cy, rx, ry, o) {
    return style(new W.Path.Ellipse({ center: [cx, cy], radius: [rx, ry] }), o);
  }
  function circ(cx, cy, r, o) { return ell(cx, cy, r, r, o); }
  function rrect(x, y, w, h, r, o) {
    return style(new W.Path.Rectangle({ rectangle: [x, y, w, h], radius: r }), o);
  }
  function tri(pts, o) { return path(pts, Object.assign({ closed: true, join: 'round' }, o)); }
  function label(x, y, txt, size) {
    return new W.PointText({
      point: [x, y], content: txt, justification: 'center',
      fontSize: size || 15, fontFamily: "'Patrick Hand','Comic Sans MS',cursive",
      fillColor: INK
    });
  }

  /* ---------- palettes & biomes ---------- */
  const PALETTES = {
    warm: { skyTop: '#8FD4F5', skyBot: '#FFF3D8', sun: '#FFC53D', cloud: '#FFFDF6',
            hill1: '#CDEBD8', hill2: '#A4DDBB', hill3: '#7CCE9F',
            ground: '#57B877', path: '#EAD9AE', leaf: '#4FB06D', trunk: '#8A5E2E',
            night: false },
    cool: { skyTop: '#9CC9EE', skyBot: '#E9F5FB', sun: '#FFE08A', cloud: '#F4FBFF',
            hill1: '#BFDCE8', hill2: '#93C4DA', hill3: '#6FADC9',
            ground: '#5FAE8E', path: '#D8D2BC', leaf: '#3E9E7E', trunk: '#7A5B3A',
            night: false },
    dusk: { skyTop: '#8B7BC0', skyBot: '#FFC98F', sun: '#FF9E57', cloud: '#F2DDE4',
            hill1: '#C9A8B8', hill2: '#A8849F', hill3: '#846A8E',
            ground: '#5F7E66', path: '#C4A884', leaf: '#3E7E5A', trunk: '#6B4A2A',
            night: false },
    night: { skyTop: '#26335E', skyBot: '#5D6FA0', sun: '#FFF1C4', cloud: '#8892B8',
             hill1: '#4A5B8E', hill2: '#3A4A7A', hill3: '#2E3C66',
             ground: '#3E5E52', path: '#8A8468', leaf: '#2E6B4E', trunk: '#4A3220',
             night: true }
  };
  function colorsFor(biome, pal) {
    const c = Object.assign({}, PALETTES[pal] || PALETTES.warm);
    if (biome === 'rain' || biome === 'storm') {
      c.skyTop = biome === 'storm' ? '#6E7E9E' : '#8FA8C8';
      c.skyBot = '#D8E2EA'; c.cloud = '#A8B4C4'; c.leaf = '#3E8E66';
      c.hill1 = '#A8C4CC'; c.hill2 = '#84A8B4'; c.hill3 = '#648E9E';
    }
    if (biome === 'cave') {
      c.skyTop = '#3A3450'; c.skyBot = '#565070'; c.cloud = '#6A6488';
      c.hill1 = '#565070'; c.hill2 = '#46406A'; c.hill3 = '#383258';
      c.ground = '#4A4460'; c.night = true;
    }
    return c;
  }

  /* ---------- terrain builders ---------- */
  function hillPath(base, amp, col, r) {
    const pts = [];
    const f1 = rr(r, .5, 1.1), f2 = rr(r, 1.6, 3), p1 = rr(r, 0, 6), p2 = rr(r, 0, 6);
    const n = Math.ceil(Wpx / 70) + 2;
    for (let i = 0; i <= n; i++) {
      const x = i * (Wpx / n);
      const y = base
        - (Math.sin(i * .9 * f1 + p1) * .5 + .5) * amp * .7
        - (Math.sin(i * 2.3 * f2 + p2) * .5 + .5) * amp * .3;
      pts.push([x, y]);
    }
    pts.push([Wpx + 40, Hpx + 40], [-40, Hpx + 40]);
    const hpath = new W.Path({ segments: pts, closed: true, fillColor: col });
    hpath.smooth();
    return hpath;
  }
  function cloudPath(x, y, s, col, r) {
    const g = new W.Group();
    const b1 = blob(x, y, 34 * s, 18 * s, { fill: col, stroke: INK, sw: 2.2 }, r);
    const b2 = blob(x - 24 * s, y + 7 * s, 22 * s, 13 * s, { fill: col, stroke: INK, sw: 2 }, r);
    const b3 = blob(x + 26 * s, y + 8 * s, 24 * s, 14 * s, { fill: col, stroke: INK, sw: 2 }, r);
    g.addChildren([b3, b2, b1]);
    g.data.speed = rr(r, 3, 9);                      // px/sec drift
    lifeTicker(g, (t, dt) => {
      g.position.x += g.data.speed * dt;
      if (g.position.x > Wpx + 120) g.position.x = -120;
    });
    return g;
  }
  function treePath(x, y, s, c, r) {
    const g = new W.Group();
    g.addChild(rrect(-5 * s, -52 * s, 10 * s, 52 * s, 4 * s, { fill: c.trunk, stroke: INK, sw: 2 }));
    const n = 3 + (r() * 3 | 0);
    for (let i = 0; i < n; i++)
      g.addChild(blob(rr(r, -16, 16) * s, (-62 - rr(r, 0, 26)) * s, rr(r, 18, 26) * s, rr(r, 14, 20) * s,
        { fill: c.leaf, stroke: INK, sw: 2 }, r));
    g.position.x = x; g.position.y = y;
    g.data.sway = rr(r, 0, 6);
    lifeTicker(g, (t) => { g.rotation = Math.sin(t * .8 + g.data.sway) * 1.6; });
    g.pivot = new W.Point(0, 0);
    return g;
  }
  function bushPath(x, y, s, c, r) {
    const g = new W.Group();
    for (let i = 0; i < 3; i++)
      g.addChild(blob((i - 1) * 18 * s, -8 * s - Math.abs(i - 1) * -4 * s, 17 * s, 13 * s,
        { fill: c.leaf, stroke: INK, sw: 2 }, r));
    g.position.x = x; g.position.y = y;
    return g;
  }
  function flowerPath(x, y, s, r) {
    const g = new W.Group();
    g.addChild(path([[0, 0], [rr(r, -3, 3) * s, -14 * s]], { stroke: '#3E8F57', sw: 2.2, cap: 'round' }));
    const col = pick(r, ['#FF6B57', '#FFC53D', '#B565D8', '#FF8FAB']);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      g.addChild(circ(Math.cos(a) * 6 * s, -16 * s + Math.sin(a) * 6 * s, 4.5 * s,
        { fill: col, stroke: INK, sw: 1.4 }));
    }
    g.addChild(circ(0, -16 * s, 3.6 * s, { fill: '#FFF1C4', stroke: INK, sw: 1.4 }));
    g.position.x = x; g.position.y = y;
    return g;
  }
  function tuftPath(x, y, c, r) {
    const g = new W.Group();
    for (let i = -1; i <= 1; i++)
      g.addChild(path([[i * 4, 0], [i * 7 + rr(r, -2, 2), -rr(r, 9, 15)]],
        { stroke: c.leaf, sw: 2, cap: 'round' }));
    g.position.x = x; g.position.y = y;
    return g;
  }
  function starDot(x, y, s) {
    const p = new W.Path.Star({ center: [x, y], points: 5, radius1: 6 * s, radius2: 2.6 * s,
      fillColor: '#FFE9A8', opacity: .9 });
    p.data.ph = Math.random() * 6;
    lifeTicker(p, t => { p.opacity = .5 + .4 * Math.sin(t * 2 + p.data.ph); });
    return p;
  }

  /* ---------- house specs — THE MORPH ---------- */
  /* Each stage defines the SAME 8-segment body and 6-segment roof as
     {p:[x,y], hi:[dx,dy], ho:[dx,dy]} in house-local space
     (origin = bottom center). Morphing lerps every point + handle,
     so straw bulges flatten into crisp brick corners. */
  const Z = [0, 0];
  function seg(x, y, hi, ho) { return { p: [x, y], hi: hi || Z, ho: ho || Z }; }
  const HOUSE = [
    null,
    { /* STRAW — bulgy haystack */
      body: [seg(-58, 0, [-14, 0], [14, 0]), seg(-66, -44, [0, 16], [0, -16]),
             seg(-30, -84, [-22, 6], [16, 8]), seg(0, -94, [-16, 0], [16, 0]),
             seg(30, -84, [-16, 8], [22, 6]), seg(66, -44, [0, -16], [0, 16]),
             seg(58, 0, [-14, 0], [14, 0]), seg(0, 0, [-18, 0], [18, 0])],
      roof: [seg(-80, -72, [0, 12], [8, -8]), seg(-42, -106, [-10, 12], [10, -8]),
             seg(0, -118, [-15, 0], [15, 0]), seg(42, -106, [-10, -8], [10, 12]),
             seg(80, -72, [-8, -8], [0, 12]), seg(0, -76, [-32, 6], [32, 6])],
      bodyFill: '#EBCB6B', roofFill: '#DFAF45' },
    { /* STICK — planky box, slightly wonky */
      body: [seg(-54, 0, [-8, 0], [8, 0]), seg(-57, -44, [0, 10], [0, -10]),
             seg(-52, -82, [-7, 4], [7, -4]), seg(0, -86, [-10, 0], [10, 0]),
             seg(52, -80, [-7, -4], [7, 4]), seg(56, -44, [0, -10], [0, 10]),
             seg(54, 0, [-8, 0], [8, 0]), seg(0, 0, [-10, 0], [10, 0])],
      roof: [seg(-74, -76, [0, 6], [4, -4]), seg(-36, -100, [-5, 6], [5, -4]),
             seg(0, -110, [-9, 0], [9, 0]), seg(36, -100, [-5, -4], [5, 6]),
             seg(74, -76, [-4, -4], [0, 6]), seg(0, -80, [-24, 3], [24, 3])],
      bodyFill: '#B98A4F', roofFill: '#8A5E2E' },
    { /* BRICK — crisp strongbox */
      body: [seg(-56, 0), seg(-56, -46), seg(-56, -88), seg(0, -90),
             seg(56, -88), seg(56, -46), seg(56, 0), seg(0, 0)],
      roof: [seg(-70, -80), seg(-32, -108), seg(0, -116),
             seg(32, -108), seg(70, -80), seg(0, -82)],
      bodyFill: '#D96A4E', roofFill: '#A8492F' }
  ];
  let houseBodyP, houseRoofP, houseDetailG, houseDoorP, houseWinP, houseChimP;

  function specToPath(spec, o) {
    const p = new W.Path({
      segments: spec.map(s => new W.Segment(
        new W.Point(s.p), new W.Point(s.hi), new W.Point(s.ho))),
      closed: true
    });
    return style(p, o);
  }
  function hexRGB(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function lerpCol(a, b, k) {
    return new W.Color(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
  }
  function snapSegs(p) {
    return p.segments.map(s => ({
      p: [s.point.x, s.point.y], hi: [s.handleIn.x, s.handleIn.y], ho: [s.handleOut.x, s.handleOut.y]
    }));
  }
  function applySegs(p, from, to, k) {
    p.segments.forEach((s, i) => {
      const a = from[i], b = to[i];
      s.point.set(a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k);
      s.handleIn.set(a.hi[0] + (b.hi[0] - a.hi[0]) * k, a.hi[1] + (b.hi[1] - a.hi[1]) * k);
      s.handleOut.set(a.ho[0] + (b.ho[0] - a.ho[0]) * k, a.ho[1] + (b.ho[1] - a.ho[1]) * k);
    });
  }
  function buildHouseDetail(stage) {
    houseDetailG.removeChildren();
    const r = mulberry32(99 + stage);
    if (stage === 1) {                                   /* straw hatch */
      for (let i = 0; i < 6; i++)
        houseDetailG.addChild(path([[-44 + i * 16, -8], [-38 + i * 16 + rr(r, -6, 6), -74]],
          { stroke: '#D9AE4E', sw: 2, cap: 'round' }));
      for (let i = 0; i < 5; i++)
        houseDetailG.addChild(path([[-58 + i * 28, -80], [-46 + i * 28 + rr(r, -6, 6), -104]],
          { stroke: '#F2DA8A', sw: 2, cap: 'round' }));
    } else if (stage === 2) {                            /* plank lines */
      for (let i = 0; i < 5; i++)
        houseDetailG.addChild(path([[-38 + i * 19, -6], [-38 + i * 19 + rr(r, -3, 3), -80]],
          { stroke: '#8A5E2E', sw: 2.4, cap: 'round' }));
      houseDetailG.addChild(path([[-54, -30], [54, -28]], { stroke: '#8A5E2E', sw: 2.4 }));
      houseDetailG.addChild(path([[-54, -58], [55, -60]], { stroke: '#8A5E2E', sw: 2.4 }));
    } else if (stage === 3) {                            /* brick courses */
      for (let row = 0; row < 4; row++) {
        houseDetailG.addChild(path([[-56, -16 - row * 18], [56, -16 - row * 18]],
          { stroke: '#A8492F', sw: 2 }));
        for (let i = 0; i < 4; i++) {
          const off = row % 2 ? 0 : 13;
          houseDetailG.addChild(path([[-43 + off + i * 26, -16 - row * 18], [-43 + off + i * 26, -34 - row * 18]],
            { stroke: '#A8492F', sw: 1.6 }));
        }
      }
    }
    /* door + window ride along on every stage */
    const doorW = 26, doorH = 40;
    houseDoorP.removeChildren();
    houseDoorP.addChild(rrect(-doorW / 2, -doorH, doorW, doorH, 8,
      { fill: '#8A4B2C', stroke: INK, sw: 2.6 }));
    houseDoorP.addChild(circ(7, -doorH / 2, 2.6, { fill: '#FFC53D', stroke: 'none' }));
    houseWinP.removeChildren();
    houseWinP.addChild(circ(34, -58, 11, { fill: '#BFE8FF', stroke: INK, sw: 2.6 }));
    houseWinP.addChild(path([[34, -69], [34, -47]], { stroke: INK, sw: 1.8 }));
    houseWinP.addChild(path([[23, -58], [45, -58]], { stroke: INK, sw: 1.8 }));
    houseChimP.removeChildren();
    if (stage >= 2) {
      houseChimP.addChild(rrect(28, -128, 18, 34, 3, { fill: '#9AA0A8', stroke: INK, sw: 2.4 }));
    }
  }
  function setHouse(stage, instant) {
    stage = Math.max(0, Math.min(3, stage));
    if (stage === houseStage) return;
    if (stage === 0) { houseG.visible = false; houseStage = 0; return; }
    houseG.visible = true;
    const target = HOUSE[stage];
    if (instant || houseStage === 0) {
      /* snap into spec, pop in */
      applySegs(houseBodyP, snapSegs(houseBodyP), target.body, 1);
      applySegs(houseRoofP, snapSegs(houseRoofP), target.roof, 1);
      houseBodyP.fillColor = target.bodyFill;
      houseRoofP.fillColor = target.roofFill;
      buildHouseDetail(stage);
      houseStage = stage;
      if (!instant) pop(houseG);
      return;
    }
    /* THE MORPH — lerp every segment point + both handles */
    const fromB = snapSegs(houseBodyP), fromR = snapSegs(houseRoofP);
    const cB0 = hexRGB(houseBodyP.fillColor.toCSS(true));
    const cR0 = hexRGB(houseRoofP.fillColor.toCSS(true));
    const cB1 = hexRGB(target.bodyFill), cR1 = hexRGB(target.roofFill);
    houseDetailG.opacity = 0;
    anim(1.15, (k) => {
      applySegs(houseBodyP, fromB, target.body, k);
      applySegs(houseRoofP, fromR, target.roof, k);
      houseBodyP.fillColor = lerpCol(cB0, cB1, k);
      houseRoofP.fillColor = lerpCol(cR0, cR1, k);
      houseG.scaling = new W.Point(1 + Math.sin(k * Math.PI) * .04, 1 - Math.sin(k * Math.PI) * .03);
    }, () => {
      buildHouseDetail(stage);
      houseDetailG.opacity = 0;
      anim(.5, k => { houseDetailG.opacity = k; houseG.scaling = new W.Point(1, 1); });
      houseStage = stage;
      if (onHouseEvent) onHouseEvent('morphed', stage);
    });
  }
  function houseCollapse() {
    if (houseStage === 0 || houseG.data.falling) return;
    houseG.data.falling = true;
    puff(houseG.position.x - 40, gy - 40, 7, '#D8C49A');
    puff(houseG.position.x + 40, gy - 30, 7, '#D8C49A');
    const r = mulberry32(Date.now() & 0xffff);
    anim(.7, (k) => {
      houseG.scaling = new W.Point(1 + k * .7, 1 - k * .72);
      houseG.rotation = Math.sin(k * 9) * 4 * (1 - k);
      houseBodyP.segments.forEach(s => { s.point.y += r() * .9; });
      houseRoofP.segments.forEach(s => { s.point.y += r() * 1.1; });
    }, () => {
      houseG.data.falling = false;
      const next = Math.min(3, houseStage + 1);          // pigs rebuild stronger!
      houseStage = 0;
      anim(.35, k => { houseG.opacity = 1 - k; }, () => {
        houseG.opacity = 1;
        houseG.scaling = new W.Point(1, 1);
        houseG.rotation = 0;
        setHouse(next);                                 // morph into the upgrade
        if (onHouseEvent) onHouseEvent('rebuilt', next);
      });
    });
    if (onHouseEvent) onHouseEvent('collapse', houseStage);
  }

  /* ---------- the wolf ---------- */
  let wolfBody, wolfChest, wolfCheekL, wolfCheekR, wolfTail, windG;
  function buildWolf() {
    wolfG = new W.Group();
    const grey = '#8D93A0', dark = '#6E7484', belly = '#C9CEDA';
    wolfTail = path([[58, -34], [86, -52], [92, -40], [70, -22]], { closed: true, fill: grey, stroke: INK, sw: 2.6 });
    wolfBody = blob(0, -34, 52, 30, { fill: grey, stroke: INK, sw: 2.8 });
    wolfChest = blob(-26, -30, 24, 26, { fill: belly, stroke: 'none' });
    const legF = rrect(-26, -16, 12, 16, 5, { fill: grey, stroke: INK, sw: 2.2 });
    const legB = rrect(24, -16, 12, 16, 5, { fill: grey, stroke: INK, sw: 2.2 });
    const head = new W.Group([
      circ(-56, -64, 26, { fill: grey, stroke: INK, sw: 2.8 }),
      tri([[-78, -84], [-70, -102], [-60, -86]], { fill: grey, stroke: INK, sw: 2.4 }),
      tri([[-48, -88], [-38, -104], [-32, -84]], { fill: grey, stroke: INK, sw: 2.4 }),
      rrect(-96, -72, 34, 18, 9, { fill: belly, stroke: INK, sw: 2.4 }),
      circ(-96, -64, 4.5, { fill: INK }),
      circ(-62, -68, 4, { fill: INK }),
      path([[-72, -80], [-60, -78]], { stroke: INK, sw: 2.4, cap: 'round' }),
      path([[-92, -56], [-70, -54]], { stroke: INK, sw: 2, cap: 'round' })
    ]);
    wolfCheekL = circ(-78, -58, 9, { fill: belly, stroke: 'none' });
    wolfCheekR = circ(-66, -56, 8, { fill: belly, stroke: 'none' });
    wolfG.addChildren([wolfTail, legB, wolfBody, wolfChest, legF, head, wolfCheekL, wolfCheekR]);
    wolfG.pivot = new W.Point(0, 0);
    /* wind streaks — dashed curves that travel by dashOffset */
    windG = new W.Group();
    for (let i = 0; i < 3; i++) {
      const s = new W.Path({
        segments: [[-90, -62 + i * 12], [-20, -70 + i * 14], [70, -56 + i * 10], [180, -64 + i * 12]],
        strokeColor: '#BFE0F4', strokeWidth: 5 - i, strokeCap: 'round',
        dashArray: [26, 40], opacity: 0
      });
      s.smooth();
      s.data.off = i * 30;
      windG.addChild(s);
    }
    wolfG.addChild(windG);
    wolfG.visible = false;
    wolfG.position = new W.Point(-160, gy);
  }
  function huffPuff() {
    if (huffBusy) return;
    huffBusy = true;
    wolfG.visible = true;
    const targetX = houseG.position.x - 250;
    /* trot up to the house */
    anim(.8, k => {
      const e = easeOut(k);
      wolfG.position.x = -160 + (targetX + 160) * e;
      wolfG.position.y = gy - Math.abs(Math.sin(k * 12)) * 8;
    }, () => {
      /* three big breaths — sinusoidal chest/cheek wobble via onFrame data */
      const t0 = { v: 0 };
      anim(2.3, (k, raw) => {
        const w = Math.sin(raw * Math.PI * 3);          // 3 breaths
        wolfChest.scaling = new W.Point(1 + w * .18, 1 + w * .3);
        wolfBody.scaling = new W.Point(1 + w * .05, 1 + w * .08);
        wolfCheekL.scaling = new W.Point(1 + w * .8, 1 + w * .8);
        wolfCheekR.scaling = new W.Point(1 + w * .8, 1 + w * .8);
        wolfTail.rotation = Math.sin(raw * 20) * 8;
      }, () => {
        /* THE PUFF — wind streaks travel to the house */
        windG.children.forEach(s => { s.opacity = .95; s.dashOffset = 0; });
        anim(1.1, (k) => {
          windG.children.forEach((s, i) => {
            s.dashOffset = -k * 260 - s.data.off;
            s.opacity = .95 * (1 - k * .7);
          });
          const shake = houseStage === 3 ? .6 : 4.5;      // brick barely wiggles
          houseG.position.x = houseG.data.homeX + Math.sin(k * 40) * shake * (1 - k);
          if (sceneG) sceneG.position.x = Math.sin(k * 34) * shake * .8 * (1 - k);   // the whole world shudders
          pigG.children.forEach(p => { p.position.y = p.data.baseY - Math.abs(Math.sin(k * 14 + p.data.i)) * 14 * (1 - k); });
        }, () => {
          windG.children.forEach(s => { s.opacity = 0; });
          if (sceneG) sceneG.position.x = 0;
          if (houseStage === 3) {
            /* wolf fails comedically on brick */
            anim(.9, k => {
              wolfG.rotation = Math.sin(k * Math.PI) * -18;
              wolfG.position.y = gy - Math.sin(k * Math.PI) * 26;
            }, () => {
              wolfG.rotation = 0;
              anim(1, k => { wolfG.position.x = wolfG.data.outX = -160 + (wolfG.position.x + 160) * (1 - easeInOut(k)); },
                () => { wolfG.visible = false; huffBusy = false; wolfLevel = 38; });
            });
            if (onHouseEvent) onHouseEvent('huff-fail', houseStage);
          } else {
            houseCollapse();
            anim(1.1, k => { wolfG.position.x = targetX + (-160 - targetX) * easeInOut(k); },
              () => { wolfG.visible = false; huffBusy = false; wolfLevel = 42; });
            if (onHouseEvent) onHouseEvent('huff-down', houseStage);
          }
        });
      });
    });
  }
  function wolfBump(n) {
    wolfLevel = Math.max(0, Math.min(100, wolfLevel + n));
    if (wolfLevel >= 40 && wolfLevel < 85 && !wolfG.visible && !huffBusy) {
      /* peek from the edge */
      wolfG.visible = true;
      anim(.7, k => { wolfG.position.x = -160 + easeOutBack(k) * 120; });
    }
    if (wolfLevel >= 85) huffPuff();
    return wolfLevel;
  }

  /* ---------- puffs, stars, confetti ---------- */
  function puff(x, y, n, col) {
    const r = mulberry32((x * 31 + y) | 0);
    for (let i = 0; i < (n || 5); i++) {
      const c = circ(x + rr(r, -14, 14), y + rr(r, -10, 10), rr(r, 5, 11),
        { fill: col || '#E8DCC0', opacity: .9 });
      const dx = rr(r, -46, 46), dy = rr(r, -40, -6);
      anim(.7, k => {
        c.position.x += dx * .016; c.position.y += dy * .016;
        c.scaling = new W.Point(1 + k * 1.4, 1 + k * 1.4);
        c.opacity = .9 * (1 - k);
      }, () => c.remove());
      fxG.addChild(c);
    }
  }
  function starsAround(x, y) {
    for (let i = 0; i < 3; i++) {
      const s = new W.Path.Star({ center: [x, y - 40], points: 5, radius1: 8, radius2: 3.4,
        fillColor: '#FFC53D', strokeColor: INK, strokeWidth: 1.6 });
      const ph = i * 2.1;
      anim(1.4, k => {
        const a = ph + k * 5;
        s.position = new W.Point(x + Math.cos(a) * 34, y - 40 + Math.sin(a) * 12);
        s.rotation += 4; s.opacity = 1 - k;
      }, () => s.remove());
      fxG.addChild(s);
    }
  }
  function pop(item) {
    item.data.p0 = item.position.clone();
    anim(.45, k => {
      const e = easeOutBack(k);
      item.scaling = new W.Point(Math.max(.01, e), Math.max(.01, e));
    });
  }
  function confetti(x, y) {
    const r = mulberry32(Date.now() & 0xffff);
    for (let i = 0; i < 26; i++) {
      const c = rrect(x, y, 7, 11, 2, { fill: pick(r, ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8']) });
      const vx = rr(r, -160, 160), vy = rr(r, -260, -80);
      let px = x, py = y, t2 = 0;
      anim(1.3, (k, raw) => {
        t2 = raw; px += vx * .016; py += vy * .016 + 190 * raw * .016;
        c.position = new W.Point(px, py);
        c.rotation += rr(r, -8, 8); c.opacity = 1 - k * .8;
      }, () => c.remove());
      fxG.addChild(c);
    }
  }

  /* ---------- piglets ---------- */
  function piglet(i) {
    const g = new W.Group();
    const pink = '#FFB3C2';
    g.addChild(blob(0, -14, 18, 13, { fill: pink, stroke: INK, sw: 2.2 }));
    g.addChild(circ(-13, -24, 9.5, { fill: pink, stroke: INK, sw: 2.2 }));
    g.addChild(tri([[-19, -31], [-15, -38], [-11, -31]], { fill: pink, stroke: INK, sw: 1.8 }));
    g.addChild(ell(-20, -23, 4.5, 3.4, { fill: '#F58AAC', stroke: INK, sw: 1.6 }));
    g.addChild(circ(-14, -26, 1.7, { fill: INK }));
    g.addChild(path([[18, -16], [24, -19], [22, -13]], { stroke: '#F58AAC', sw: 2.2, cap: 'round' }));
    g.addChild(rrect(-12, -3, 6, 5, 2, { fill: pink, stroke: INK, sw: 1.6 }));
    g.addChild(rrect(6, -3, 6, 5, 2, { fill: pink, stroke: INK, sw: 1.6 }));
    g.data.i = i;
    return g;
  }

  /* ---------- prop factory ---------- */
  const BUILDERS = {
    unicorn() {
      const g = new W.Group();
      const legs = [];
      for (let i = 0; i < 4; i++) {
        const l = rrect(-34 + i * 20, -26, 9, 27, 4, { fill: '#F4ECFF', stroke: INK, sw: 2 });
        l.pivot = new W.Point(-34 + i * 20 + 4.5, -26);
        legs.push(l); g.addChild(l);
      }
      g.data.legs = legs;
      g.addChild(ell(0, -42, 42, 24, { fill: '#FFFDF6', stroke: INK, sw: 2.6 }));
      g.addChild(path([[-36, -54], [-52, -84]], { stroke: '#FFFDF6', sw: 16, cap: 'round' }));
      g.addChild(path([[-36, -54], [-52, -84]], { stroke: INK, sw: 16, cap: 'round', opacity: .0 }));
      const headN = new W.Group([
        circ(-58, -88, 15, { fill: '#FFFDF6', stroke: INK, sw: 2.6 }),
        rrect(-76, -88, 20, 13, 6, { fill: '#FFFDF6', stroke: INK, sw: 2.4 }),
        circ(-77, -81, 2, { fill: '#F58AAC' }),
        circ(-62, -92, 2.6, { fill: INK }),
        tri([[-58, -104], [-52, -126], [-46, -104]], { fill: '#FFC53D', stroke: INK, sw: 2 })
      ]);
      g.addChild(headN);
      const mane = path([[-40, -70], [-30, -88], [-22, -66]], { stroke: '#F58AAC', sw: 7, cap: 'round' });
      g.addChild(mane);
      const tail = path([[40, -52], [56, -66], [60, -46]], { stroke: '#B565D8', sw: 6, cap: 'round' });
      g.addChild(tail);
      g.data.rideTop = -66;                             // hero sits here
      g.data.trot = (k) => legs.forEach((l, i) => { l.rotation = Math.sin(k * 14 + i * 1.6) * 26; });
      return g;
    },
    banana() {
      const g = new W.Group();
      const p = new W.Path({ segments: [[-16, -6], [-4, 4], [14, -2], [18, -14]], closed: false });
      p.strokeColor = '#E8A93D'; p.strokeWidth = 10; p.strokeCap = 'round';
      const inner = new W.Path({ segments: [[-16, -6], [-4, 4], [14, -2], [18, -14]] });
      inner.strokeColor = '#FFD93B'; inner.strokeWidth = 6; inner.strokeCap = 'round';
      g.addChildren([p, inner]);
      g.addChild(circ(18, -15, 2.6, { fill: INK }));
      return g;
    },
    pig() { const g = piglet(0); g.scaling = new W.Point(1.15, 1.15); return g; },
    straw() {
      const g = new W.Group();
      g.addChild(blob(0, -18, 34, 20, { fill: '#EBCB6B', stroke: INK, sw: 2.4 }));
      for (let i = 0; i < 6; i++)
        g.addChild(path([[-26 + i * 10, -6], [-20 + i * 10, -30]], { stroke: '#D9AE4E', sw: 2, cap: 'round' }));
      return g;
    },
    sticks() {
      const g = new W.Group();
      for (let i = 0; i < 5; i++)
        g.addChild(rrect(-34 + i * 13, -26 - (i % 2) * 6, 9, 34, 4,
          { fill: i % 2 ? '#8A5E2E' : '#B98A4F', stroke: INK, sw: 2 }));
      return g;
    },
    bricks() {
      const g = new W.Group();
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 3 - (row === 2 ? 1 : 0); i++)
          g.addChild(rrect(-30 + i * 22 + (row % 2) * 11, -12 - row * 11, 20, 10, 2,
            { fill: '#D96A4E', stroke: INK, sw: 1.8 }));
      return g;
    },
    bridge() {
      const g = new W.Group();
      g.addChild(path([[-52, 0], [-26, -20], [0, -24], [26, -20], [52, 0]],
        { stroke: '#8A5E2E', sw: 9, cap: 'round' }));
      g.addChild(path([[-52, 0], [-26, -20], [0, -24], [26, -20], [52, 0]],
        { stroke: '#B98A4F', sw: 4, cap: 'round' }));
      for (let i = -2; i <= 2; i++)
        g.addChild(path([[i * 22, -4 - Math.abs(i) * -6], [i * 22, -14 - Math.abs(i) * -7]],
          { stroke: '#6B4A2A', sw: 3 }));
      return g;
    },
    torch() {
      const g = new W.Group();
      g.addChild(rrect(-4, -34, 8, 34, 3, { fill: '#8A5E2E', stroke: INK, sw: 2 }));
      const fl = blob(0, -46, 11, 16, { fill: '#FF9E57', stroke: INK, sw: 2 });
      const fl2 = blob(0, -44, 6, 10, { fill: '#FFD93B' });
      g.addChildren([fl, fl2]);
      g.data.flame = fl;
      lifeTicker(g, t => { fl.scaling = new W.Point(1 + Math.sin(t * 9) * .1, 1 + Math.sin(t * 11) * .16); });
      return g;
    },
    cookie() {
      const g = new W.Group();
      g.addChild(circ(0, -14, 15, { fill: '#C98A4B', stroke: INK, sw: 2.4 }));
      [[-5, -18], [4, -10], [6, -20], [-7, -8], [0, -15]].forEach(p =>
        g.addChild(circ(p[0], p[1], 2, { fill: '#5E3A1E' })));
      return g;
    },
    flower() { return flowerPath(0, 0, 1.6, mulberry32(7)); },
    tree() {
      const c = colorsFor(scene.biome, scene.palette);
      return treePath(0, 0, 1, c, mulberry32(41));
    },
    rock() {
      const g = new W.Group();
      g.addChild(blob(0, -14, 26, 16, { fill: '#B8B2A6', stroke: INK, sw: 2.4 }));
      g.addChild(path([[-10, -18], [2, -24]], { stroke: '#8f897c', sw: 2, cap: 'round' }));
      return g;
    },
    rainbow() {
      const g = new W.Group();
      ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9'].forEach((c, i) => {
        const p = new W.Path({ segments: [[-60 + i * 7, 0], [-60 + i * 7, -46], [0, -78 - i * 2 + i * 7], [60 - i * 7, -46], [60 - i * 7, 0]], closed: false });
        p.strokeColor = c; p.strokeWidth = 6; p.strokeCap = 'round';
        g.addChild(p);
      });
      return g;
    },
    balloon() {
      const g = new W.Group();
      g.addChild(path([[0, -6], [4, -24], [-4, -40]], { stroke: INK, sw: 1.6 }));
      const b = blob(0, -62, 18, 22, { fill: '#FF6B57', stroke: INK, sw: 2.4 });
      g.addChild(b);
      lifeTicker(g, t => { b.position.y = -62 + Math.sin(t * 2.2) * 4; });
      return g;
    },
    mushroom() {
      const g = new W.Group();
      g.addChild(rrect(-8, -18, 16, 18, 6, { fill: '#FFF1D6', stroke: INK, sw: 2 }));
      g.addChild(blob(0, -26, 22, 13, { fill: '#FF6B57', stroke: INK, sw: 2.4 }));
      g.addChild(circ(-8, -28, 2.6, { fill: '#FFFDF6' }));
      g.addChild(circ(6, -32, 2, { fill: '#FFFDF6' }));
      return g;
    },
    trampoline() {
      const g = new W.Group();
      g.addChild(ell(0, -20, 34, 10, { fill: '#5DA9E9', stroke: INK, sw: 2.6 }));
      g.addChild(path([[-24, -12], [-30, 0]], { stroke: INK, sw: 3, cap: 'round' }));
      g.addChild(path([[24, -12], [30, 0]], { stroke: INK, sw: 3, cap: 'round' }));
      return g;
    },
    soap() {
      const g = new W.Group();
      g.addChild(rrect(-16, -12, 32, 14, 7, { fill: '#BFE8FF', stroke: INK, sw: 2.2 }));
      g.addChild(circ(10, -22, 4, { fill: '#E4F6FF', stroke: INK, sw: 1.4 }));
      g.addChild(circ(18, -30, 3, { fill: '#E4F6FF', stroke: INK, sw: 1.2 }));
      return g;
    },
    kite() {
      const g = new W.Group();
      g.addChild(tri([[0, -78], [20, -58], [0, -38], [-20, -58]], { fill: '#B565D8', stroke: INK, sw: 2.4 }));
      g.addChild(path([[0, -38], [4, -24], [-4, -10]], { stroke: INK, sw: 1.8 }));
      return g;
    },
    cake() {
      const g = new W.Group();
      g.addChild(rrect(-24, -20, 48, 20, 4, { fill: '#FFF1D6', stroke: INK, sw: 2.2 }));
      g.addChild(rrect(-24, -20, 48, 8, 4, { fill: '#FF8FAB', stroke: INK, sw: 1.8 }));
      g.addChild(path([[-3, -30], [-3, -20]], { stroke: '#5DA9E9', sw: 3, cap: 'round' }));
      g.addChild(circ(-3, -32, 2.4, { fill: '#FFD93B', stroke: INK, sw: 1.2 }));
      return g;
    }
  };
  const ALIAS = {
    peel: 'banana', bananapeel: 'banana', hay: 'straw', haystack: 'straw',
    stick: 'sticks', wood: 'sticks', twigs: 'sticks', lumber: 'sticks',
    brick: 'bricks', block: 'bricks', blocks: 'bricks',
    pony: 'unicorn', horse: 'unicorn', horsefriend: 'unicorn',
    cookies: 'cookie', cookiejar: 'cookie', jar: 'cookie',
    mushroomhouse: 'mushroom', toadstool: 'mushroom', soapbar: 'soap',
    puddle: 'soap', mud: 'soap', slime: 'soap', jelly: 'soap', ice: 'soap',
    piggy: 'pig', pigletfriend: 'pig', flowers: 'flower', stones: 'rock', boulder: 'rock'
  };
  const RIDE = new Set(['unicorn', 'bike', 'bicycle', 'scooter', 'skateboard', 'dragon', 'bus']);
  const SLIP = new Set(['banana', 'soap']);
  const EAT = new Set(['cookie', 'cake', 'apple', 'carrot', 'sandwich', 'milk', 'pie']);
  const BOUNCE = new Set(['trampoline', 'ball', 'balloon', 'kite']);
  const normKind = k => (k || '').toLowerCase().replace(/[^a-z]/g, '');

  function genericProp(kind) {
    const g = new W.Group();
    const cols = ['#FFD93B', '#FF8FAB', '#8FD4F5', '#B7E6C3', '#DCC3F2'];
    const col = cols[kind.length % cols.length];
    g.addChild(blob(0, -24, 24, 20, { fill: col, stroke: INK, sw: 2.6 }));
    g.addChild(circ(-7, -28, 2.4, { fill: INK }));
    g.addChild(circ(7, -28, 2.4, { fill: INK }));
    g.addChild(path([[-6, -20], [0, -17], [6, -20]], { stroke: INK, sw: 1.8, cap: 'round' }));
    g.addChild(rrect(-34, 6, 68, 18, 8, { fill: '#FFFDF6', stroke: INK, sw: 1.8 }));
    g.addChild(label(0, 20, kind.slice(0, 12), 13));
    return g;
  }
  function spawnProp(kind, action, x) {
    W.activate();
    const nk = normKind(kind);
    const rec = spawned.find(s => s.kind === nk);
    if (action === 'remove') {
      if (rec) {
        spawned.splice(spawned.indexOf(rec), 1);
        anim(.35, k => { rec.group.scaling = new W.Point(1 - k, 1 - k); }, () => rec.group.remove());
      }
      return null;
    }
    if (action === 'react' && rec) {
      anim(.6, k => { rec.group.rotation = Math.sin(k * Math.PI * 3) * 8 * (1 - k); });
      return rec.group;
    }
    if (nk === 'house' || nk === 'brickhouse' || nk === 'stickhouse' || nk === 'strawhouse') {
      setHouse(nk.includes('brick') ? 3 : nk.includes('stick') ? 2 : Math.max(1, houseStage));
      return null;
    }
    if (nk === 'wolf') { wolfBump(28); return null; }
    const builder = BUILDERS[ALIAS[nk] || nk];
    const g = builder ? builder() : genericProp(kind.split(/\s+/)[0] || 'thing');
    const px = Math.max(70, Math.min(Wpx - 70, x * Wpx));
    g.pivot = new W.Point(0, 0);
    g.position = new W.Point(px, gy - 175);              // enters aloft
    propG.addChild(g);
    if (!rec || rec.group !== g) spawned.push({ kind: nk, group: g });
    /* grounded entry: gravity fall, one bounce, spring pop */
    anim(.85, k => {
      let y;
      if (k < .55) { const f = k / .55; y = gy - 175 + 175 * f * f; }
      else { const b = (k - .55) / .45; y = gy - Math.sin(b * Math.PI) * 16; }
      g.position.y = y;
      const s = easeOutBack(Math.min(1, k * 1.7));
      g.scaling = new W.Point(Math.max(.01, s), Math.max(.01, s));
    });
    anim(.5, () => {}, () => {                            // thud where it lands
      const wp = g.localToGlobal(new W.Point(0, -8));
      puff(wp.x, wp.y, 4, '#FFF1C4');
    });
    return g;
  }
  function propGag(kind) {
    const nk = ALIAS[normKind(kind)] || normKind(kind);
    if (RIDE.has(nk)) return 'ride';
    if (SLIP.has(nk)) return 'slip';
    if (EAT.has(nk)) return 'eat';
    if (BOUNCE.has(nk)) return 'bounce';
    return 'none';
  }

  /* ---------- hero (kid's strokes -> simplified vector puppet) ---------- */
  let heroBodyG, legL, legR;
  function buildHero(strokes) {
    W.activate();
    if (heroG) heroG.remove();
    heroG = new W.Group();
    heroBodyG = new W.Group();
    /* normalize strokes into an ~88px box, feet at y=0 */
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    strokes.forEach(st => st.segs.forEach(s => {
      x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]);
      x1 = Math.max(x1, s[0]); y1 = Math.max(y1, s[1]);
    }));
    const w = Math.max(20, x1 - x0), h = Math.max(20, y1 - y0);
    const sc = Math.min(96 / w, 96 / h);
    const ox = -(x0 + x1) / 2 * sc, oy = -y1 * sc;
    strokes.forEach(st => {
      const p = new W.Path({
        segments: st.segs.map(s => new W.Segment(
          new W.Point(s[0] * sc + ox, s[1] * sc + oy),
          new W.Point(s[2] * sc, s[3] * sc),
          new W.Point(s[4] * sc, s[5] * sc))),
        closed: st.closed
      });
      p.strokeColor = st.color; p.strokeWidth = Math.max(3, st.w * sc * .8);
      p.strokeCap = 'round'; p.strokeJoin = 'round';
      p.simplify(2.2);                                   // the magic: crayon -> smooth vector
      p.smooth();
      heroBodyG.addChild(p);
    });
    /* pivot-jointed legs */
    const legW = Math.min(26, w * sc * .3);
    legL = new W.Path({ segments: [[-legW, -6], [-legW, 0]], strokeColor: INK, strokeWidth: 7, strokeCap: 'round' });
    legR = new W.Path({ segments: [[legW, -6], [legW, 0]], strokeColor: INK, strokeWidth: 7, strokeCap: 'round' });
    legL.pivot = new W.Point(-legW, -8); legR.pivot = new W.Point(legW, -8);
    legL.addChild(circ(-legW, 0, 4, { fill: INK }));
    legR.addChild(circ(legW, 0, 4, { fill: INK }));
    heroG.addChildren([legL, legR, heroBodyG]);
    heroG.pivot = new W.Point(0, 0);
    heroG.position = new W.Point(Wpx * .2, gy);
    heroG.data.walking = false; heroG.data.phase = Math.random() * 6;
    heroBodyG.data.restY = heroBodyG.position.y;       // bob anchor for heroTk
    if (fxG) heroG.insertBelow(fxG);                    // confetti/stars pop over him
    heroReady = true;
    pop(heroG);
  }
  function heroWalkTo(x, dur) {
    return new Promise(res => {
      if (!heroG) return res();
      heroG.data.walking = true;
      const sx = heroG.position.x;
      anim(dur || 1, k => {
        heroG.position.x = sx + (x - sx) * easeInOut(k);
      }, () => { heroG.data.walking = false; res(); });
    });
  }
  function heroSlip() {
    return new Promise(res => {
      if (!heroG || heroBusy) return res();
      heroBusy = true;
      anim(.5, k => {
        heroG.rotation = -easeOut(k) * 78;
        heroG.scaling = new W.Point(1 + k * .3, 1 - k * .35);
        heroG.position.y = gy - Math.sin(k * Math.PI) * 30;
      }, () => {
        starsAround(heroG.position.x, gy - 30);
        puff(heroG.position.x, gy, 5, '#E8DCC0');
        anim(.9, k => {
          const e = easeOutBack(k);
          heroG.rotation = -78 * (1 - e);
          heroG.scaling = new W.Point(1.3 - e * .3, .65 + e * .35);
          heroG.position.y = gy;
        }, () => { heroG.rotation = 0; heroBusy = false; res(); });
      });
    });
  }
  function heroRide(prop) {
    return new Promise(res => {
      if (!heroG || !prop) return res();
      heroBusy = true;
      const px = prop.position.x, top = prop.data.rideTop || -46;
      anim(.6, k => {
        heroG.position.x = heroG.position.x + (px - heroG.position.x) * easeInOut(k);
        heroG.position.y = gy + (gy + top - gy) * easeInOut(k);
      }, async () => {
        /* three little trots — each hop lands forward of the last */
        for (let i = 0; i < 3; i++) {
          if (prop.data.trot) prop.data.trot(0);
          anim(.4, k => {
            if (prop.data.trot) prop.data.trot(k + i);
            prop.position.x = px + (i + easeInOut(k)) * 34;
            prop.position.y = gy - Math.abs(Math.sin(k * Math.PI * 2)) * 7;
            heroG.position.x = prop.position.x;
          });
          await wait(.42);
        }
        anim(.5, k => {
          heroG.position.y = gy + top + (gy - (gy + top)) * easeOut(k) - Math.sin(k * Math.PI) * 22;
        }, () => { heroG.position.y = gy; heroBusy = false; res(); });
      });
    });
  }
  function heroEat(prop) {
    return new Promise(res => {
      heroWalkTo(prop.position.x - 30, .6).then(() => {
        anim(.8, k => {
          prop.scaling = new W.Point(1 - k * .9, 1 - k * .9);
          prop.rotation = k * 40;
          heroG.position.y = gy - Math.abs(Math.sin(k * 8)) * 10;
        }, () => { prop.remove(); heroG.position.y = gy; res(); });
      });
    });
  }
  function heroBounce(prop) {
    return new Promise(res => {
      heroWalkTo(prop.position.x, .5).then(() => {
        anim(1.2, k => {
          heroG.position.y = gy - Math.abs(Math.sin(k * Math.PI * 3)) * 66;
          heroG.rotation = Math.sin(k * Math.PI * 3) * 8;
        }, () => { heroG.rotation = 0; heroG.position.y = gy; res(); });
      });
    });
  }
  function heroHop(x) {
    return new Promise(res => {
      heroWalkTo(x, .55).then(() => {
        anim(.7, k => { heroG.position.y = gy - Math.abs(Math.sin(k * Math.PI * 2)) * 18; },
          () => { heroG.position.y = gy; res(); });
      });
    });
  }

  /* ---------- scene sections — the forward-travel panorama ----------
     Each accepted turn grows a fresh "section" (terrain + seed props) as a
     single group, parked offstage right at x=+Wpx; then the old section
     slides away left while the new one slides in — a visible pan into the
     next stretch of the journey. Pigs / house / hero / wolf / fx are
     persistent layers ABOVE the section; the hero walks ahead during it. */
  function normScene(ss) {
    return {
      biome: (ss && ss.biome) || 'meadow',
      seed: (ss && ss.seed) || 1,
      palette: (ss && ss.palette) || 'warm',
      props: (ss && ss.props) || []
    };
  }
  function buildSection() {
    const r = mulberry32(scene.seed >>> 0 || 7);
    const c = colorsFor(scene.biome, scene.palette);
    const G = new W.Group();
    /* layer order inside a section: sky < clouds < hills < ground < foliage < props */
    const skyG = new W.Group(), cloudG = new W.Group(), hillG = new W.Group(),
          groundG = new W.Group(), foliageG = new W.Group(), pG = new W.Group();
    G.addChildren([skyG, cloudG, hillG, groundG, foliageG, pG]);
    G.data.pG = pG;

    /* --- sky: gradient band + two translucent bands --- */
    const sky = new W.Path.Rectangle({
      rectangle: [-20, -20, Wpx + 40, gy + 40],
      fillColor: new W.Color(new W.Gradient([[c.skyTop, 0], [c.skyBot, 1]]),
        new W.Point(0, -20), new W.Point(0, gy))
    });
    skyG.addChild(sky);
    const band = new W.Path.Rectangle({ rectangle: [-20, gy * .42, Wpx + 40, gy * .16], fillColor: c.skyBot, opacity: .35 });
    const band2 = new W.Path.Rectangle({ rectangle: [-20, gy * .68, Wpx + 40, gy * .12], fillColor: '#FFFFFF', opacity: .18 });
    skyG.addChildren([band, band2]);

    /* sun / moon + stars */
    if (c.night) {
      const moon = circ(Wpx * .82, 74, 30, { fill: '#FFF4CE', stroke: INK, sw: 2.6 });
      const crater = circ(Wpx * .82 - 8, 70, 6, { fill: '#EBDCAE' });
      const crater2 = circ(Wpx * .82 + 9, 82, 4, { fill: '#EBDCAE' });
      skyG.addChildren([moon, crater, crater2]);
      for (let i = 0; i < 14; i++) {
        const s = starDot(rr(r, 20, Wpx - 20), rr(r, 20, gy * .55), rr(r, .5, 1.1));
        skyG.addChild(s);
      }
    } else {
      const sun = circ(Wpx * .84, 66, 30, { fill: c.sun, stroke: INK, sw: 2.8 });
      const rays = new W.Group();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        rays.addChild(path([[Wpx * .84 + Math.cos(a) * 40, 66 + Math.sin(a) * 40],
          [Wpx * .84 + Math.cos(a) * 52, 66 + Math.sin(a) * 52]],
          { stroke: c.sun, sw: 4, cap: 'round' }));
      }
      skyG.addChildren([rays, sun]);
    }

    /* clouds */
    const nCloud = scene.biome === 'rain' || scene.biome === 'storm' ? 4 : 2 + (r() * 2 | 0);
    for (let i = 0; i < nCloud; i++) {
      const cl = cloudPath(rr(r, 80, Wpx - 80), rr(r, 40, gy * .4), rr(r, .7, 1.3), c.cloud, r);
      cloudG.addChild(cl);
    }

    /* layered noise hills */
    hillG.addChild(hillPath(gy + 6, 60, c.hill1, r));
    hillG.addChild(hillPath(gy + 10, 92, c.hill2, r));
    hillG.addChild(hillPath(gy + 16, 128, c.hill3, r));

    /* ground + walking path */
    groundG.addChild(new W.Path.Rectangle({ rectangle: [-20, gy, Wpx + 40, Hpx - gy + 20], fillColor: c.ground }));
    const pathP = new W.Path({ segments: [[-20, gy + 8], [Wpx * .3, gy + 26], [Wpx * .6, gy + 12], [Wpx + 20, gy + 30]], strokeColor: c.path, strokeWidth: 26, strokeCap: 'round' });
    pathP.smooth();
    groundG.addChild(pathP);
    groundG.addChild(new W.Path({ segments: [[-20, gy], [Wpx + 20, gy]], strokeColor: INK, strokeWidth: 2.4 }));

    /* --- biome extras --- */
    if (scene.biome === 'river') {
      const water = new W.Path.Rectangle({ rectangle: [-20, gy + 18, Wpx + 40, 34], fillColor: '#7FC4EE' });
      groundG.addChild(water);
      const wob = new W.Path({ segments: [[-20, gy + 18], [Wpx * .25, gy + 14], [Wpx * .5, gy + 22], [Wpx * .75, gy + 14], [Wpx + 20, gy + 20]], strokeColor: '#C4E7FB', strokeWidth: 4, cap: 'round' });
      wob.smooth(); groundG.addChild(wob);
      lifeTicker(wob, (t) => { wob.position.y = Math.sin(t * 2) * 2.5; });
    }
    if (scene.biome === 'rain' || scene.biome === 'storm') {
      const rg = new W.Group();
      const drops = [];
      for (let i = 0; i < 26; i++) {
        const d = path([[0, 0], [-6, 16]], { stroke: '#7FB8E8', sw: 2.4, cap: 'round' });
        d.position = new W.Point(rr(r, 0, Wpx), rr(r, 0, gy));
        drops.push(d); rg.addChild(d);
      }
      groundG.addChild(rg);
      lifeTicker(rg, (t, dt) => drops.forEach(d => {
        d.position.y += 340 * dt; d.position.x -= 60 * dt;
        if (d.position.y > gy) { d.position.y = -10; d.position.x = rr(r, 0, Wpx + 60); }
      }));
    }
    if (scene.biome === 'cave') {
      const arch = new W.Path({
        segments: [[-20, -20], [Wpx + 20, -20], [Wpx + 20, gy + 10], [Wpx * .8, gy * .5], [Wpx * .5, gy * .34], [Wpx * .2, gy * .5], [-20, gy + 10]],
        closed: true, fillColor: '#3A3450', opacity: .82
      });
      arch.smooth();
      hillG.addChild(arch);
      for (let i = 0; i < 4; i++)
        hillG.addChild(tri([[rr(r, 60, Wpx - 60), gy * .34], [rr(r, 60, Wpx - 60) + 14, gy * .34], [rr(r, 60, Wpx - 60) + 7, gy * .34 + 34]],
          { fill: '#565070' }));
    }
    if (scene.biome === 'village') {
      for (let i = 0; i < 3; i++) {
        const hx = rr(r, 90, Wpx - 160), hy = gy - rr(r, 60, 100) * .4;
        const s = rr(r, .4, .62);
        const hh = new W.Group([
          rrect(-30 * s, -34 * s, 60 * s, 34 * s, 4, { fill: '#FFF1D6', stroke: INK, sw: 2 }),
          tri([[-36 * s, -32 * s], [0, -58 * s], [36 * s, -32 * s]], { fill: '#FF6B57', stroke: INK, sw: 2 })
        ]);
        hh.position = new W.Point(hx, hy); hh.opacity = .9;
        hillG.addChild(hh);
      }
    }

    /* --- foliage stamps by biome --- */
    const dens = { forest: 7, meadow: 3, village: 3, river: 3, rain: 2, storm: 2, cave: 0 }[scene.biome] ?? 3;
    for (let i = 0; i < dens; i++) {
      const t = treePath(rr(r, 60, Wpx - 60), gy + rr(r, 2, 18), rr(r, .7, 1.25), c, r);
      foliageG.addChild(t);
    }
    for (let i = 0; i < 3; i++)
      foliageG.addChild(bushPath(rr(r, 50, Wpx - 50), gy + rr(r, 8, 26), rr(r, .7, 1.1), c, r));
    const nFl = scene.biome === 'meadow' ? 8 : 3;
    for (let i = 0; i < nFl; i++)
      foliageG.addChild(flowerPath(rr(r, 40, Wpx - 40), gy + rr(r, 14, 42), rr(r, .8, 1.2), r));
    for (let i = 0; i < 14; i++)
      foliageG.addChild(tuftPath(rr(r, 20, Wpx - 20), gy + rr(r, 6, 48), c, r));
    if (scene.biome === 'storm')
      for (let i = 0; i < 2; i++)
        cloudG.addChild(cloudPath(rr(r, 100, Wpx - 100), rr(r, 36, 80), rr(r, 1.4, 1.8), '#8E9AAC', r));
    return G;
  }

  /* make G the live section: it becomes the layer `propG` points at and the
     `spawned` registry resets — old props leave with their old section */
  function mountSection(G) {
    if (sceneG) sceneG.remove();
    sceneG = G;
    propG = G.data.pG;
    spawned.length = 0;
    G.insertBelow(pigG);
  }
  function spawnSeeds() {
    (scene.props || []).forEach((k, i) => {
      if (normKind(k) === 'house') return;
      spawnProp(k, 'spawn', .12 + .76 * (i + .5) / Math.max(1, scene.props.length));
    });
  }

  /* instant swap — used only at boot + reset (never mid-story: that's what
     travelTo is for) */
  function renderScene(ss) {
    W.activate();
    scene = normScene(ss);
    mountSection(buildSection());
    spawnSeeds();
  }

  /* THE forward-travel beat: the new section slides in from the right while
     the old one drifts off-left fading; the hero walks ahead into it. */
  function travelTo(ss) {
    W.activate();
    scene = normScene(ss);
    const oldG = sceneG;
    const G = buildSection();
    G.position.x = Wpx;
    sceneG = G; propG = G.data.pG; spawned.length = 0;
    G.insertBelow(pigG);
    /* hero marches while the world pans — forward if he's left, and the
       moving ground carries him back if a ride left him deep on the right */
    let walkP = Promise.resolve();
    if (heroG) {
      heroG.data.walking = true;
      const hx = heroG.position.x;
      const tx = hx < Wpx * .5 ? Math.min(hx + Wpx * .16, Wpx * .6)
                               : Math.max(hx - Wpx * .28, Wpx * .3);
      walkP = new Promise(r => anim(1.05, k => {
        heroG.position.x = hx + (tx - hx) * easeInOut(k);
      }, () => { heroG.data.walking = false; r(); }));
    }
    return new Promise(res => {
      anim(1.1, k => {
        const e = easeInOut(k);
        G.position.x = Wpx * (1 - e);
        if (oldG) {
          oldG.position.x = -Wpx * .55 * e;
          oldG.opacity = k < .55 ? 1 : 1 - (k - .55) / .45;
        }
      }, () => {
        if (oldG) oldG.remove();
        spawnSeeds();               // seed props drop in as the new scene settles
        res();
      });
    }).then(() => walkP);
  }

  /* ---------- setup ---------- */
  function init(canvas, stage) {
    cv = canvas; stageEl = stage;
    W.setup(cv);
    resize();
    /* persistent layers — the moving section slides in BELOW these */
    pigG = new W.Group(); houseG = new W.Group();
    heroG = null; buildWolf(); fxG = new W.Group();

    /* house scaffold (invisible until stage > 0) */
    houseBodyP = specToPath(HOUSE[1].body, { fill: HOUSE[1].bodyFill, stroke: INK, sw: 3, join: 'round' });
    houseRoofP = specToPath(HOUSE[1].roof, { fill: HOUSE[1].roofFill, stroke: INK, sw: 3, join: 'round' });
    houseDetailG = new W.Group(); houseDoorP = new W.Group();
    houseWinP = new W.Group(); houseChimP = new W.Group();
    houseG.addChildren([houseChimP, houseBodyP, houseDetailG, houseDoorP, houseWinP, houseRoofP]);
    houseG.data.homeX = Wpx * .78;
    houseG.position = new W.Point(Wpx * .78, gy + 2);
    houseG.pivot = new W.Point(0, 0);
    houseG.visible = false;

    for (let i = 0; i < 3; i++) {
      const p = piglet(i);
      p.position = new W.Point(Wpx * .78 - 150 + i * 46, gy + 6);
      p.data.baseY = gy + 6;
      pigG.addChild(p);
    }
    const pigTk = t => pigG.children.forEach((p, i) => {
      if (!houseG.data.falling)
        p.position.y = p.data.baseY - Math.max(0, Math.sin(t * 2.6 + i * 2.1)) * 7;
    });
    tickers.push(pigTk);

    /* hero bob + leg swing — bobs AROUND the stored rest position
       (position.y is absolute, not a delta!) */
    const heroTk = t => {
      if (!heroG || heroBusy) return;
      const restY = heroBodyG.data.restY || 0;
      if (heroG.data.walking) {
        legL.rotation = Math.sin(t * 11) * 30;
        legR.rotation = -Math.sin(t * 11) * 30;
        heroBodyG.position.y = restY - Math.abs(Math.sin(t * 11)) * 4;
      } else {
        legL.rotation *= .8; legR.rotation *= .8;
        heroBodyG.position.y = restY + Math.sin(t * 2.4 + heroG.data.phase) * 2.4;
        heroBodyG.rotation = Math.sin(t * 2.4 + heroG.data.phase) * 1.6;
      }
    };
    tickers.push(heroTk);

    renderScene({ biome: 'meadow', seed: 1234, palette: 'warm', props: [] });

    W.view.onFrame = (ev) => {
      const t = ev.time, dt = Math.min(.05, ev.delta);
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i];
        if (a.t0 < 0) a.t0 = t;
        const raw = Math.min(1, (t - a.t0) / a.dur);
        a.fn(raw <= .5 ? 2 * raw * raw : 1 - ((-2 * raw + 2) ** 2) / 2, raw);   // default easeInOut
        if (raw >= 1) { anims.splice(i, 1); if (a.done) a.done(); }
      }
      for (let i = tickers.length - 1; i >= 0; i--) {
        if (tickers[i].dead) { tickers.splice(i, 1); continue; }
        tickers[i](t, dt);
      }
      if (heroG) heroG.position.x = Math.max(20, Math.min(Wpx - 20, heroG.position.x));
    };
  }
  function resize() {
    if (!stageEl) return;
    Wpx = Math.max(520, stageEl.clientWidth);
    Hpx = Math.max(360, stageEl.clientHeight);
    gy = Hpx - 96;
    W.view.viewSize = new W.Size(Wpx, Hpx);
    if (houseG) { houseG.data.homeX = Wpx * .78; houseG.position.x = Wpx * .78; houseG.position.y = gy + 2; }
    pigG && pigG.children.forEach((p, i) => { p.position.x = Wpx * .78 - 150 + i * 46; p.data.baseY = gy + 6; });
    if (heroG) heroG.position.y = gy;
    if (wolfG) wolfG.position.y = gy;
    if (sceneG && sceneG.position.x !== 0) sceneG.position.x = 0;   // snap if mid-slide
  }

  return {
    init, resize, renderScene, travelTo, spawnProp, propGag, setHouse, houseCollapse,
    buildHero, heroWalkTo, heroSlip, heroRide, heroEat, heroBounce, heroHop,
    wolfBump, huffPuff, puff, confetti,
    rebuild() { renderScene(scene); },
    get houseStage() { return houseStage; },
    get wolfLevel() { return wolfLevel; },
    get heroReady() { return heroReady; },
    get scene() { return scene; },
    get heroG() { return heroG; },          // probes/screenshots can verify he's alive
    get sceneG() { return sceneG; },
    set onHouseEvent(fn) { onHouseEvent = fn; },
    scope: W
  };
})();
