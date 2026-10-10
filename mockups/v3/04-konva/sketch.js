/* sketch.js — rough-style stroke helpers that emit Konva NODES.
 *
 * Every "hand-drawn" mark is a small scene-graph: a Konva.Group holding two
 * jittered Konva.Line passes (a fat wobbly stroke + a thinner ghost pass),
 * plus an optional flat fill shape underneath and optional clipped hatch
 * lines for the crayon-shading look. No images, no raster art.
 *
 *   const r = SK.rng(42);
 *   const n = SK.ellipse(0, -60, 30, 22, { r, fill:'#FF9EBB' });
 *   someLayer.add(n);
 */
(function () {
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
  function rng(seed) {
    const f = mulberry32((seed | 0) || 1);
    return {
      f,
      rr: (a, b) => a + f() * (b - a),
      ri: (a, b) => Math.floor(a + f() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(f() * arr.length)],
      sign: () => (f() < .5 ? -1 : 1),
    };
  }

  /* ---------- point wobblers ---------- */
  function wobPts(pts, r, amp) {
    amp = amp == null ? 1.6 : amp;
    return pts.map(p => [p[0] + (r.f() - .5) * amp * 2, p[1] + (r.f() - .5) * amp * 2]);
  }
  function segPts(x1, y1, x2, y2, r, amp) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(d / 26));
    const nx = -(y2 - y1) / (d || 1), ny = (x2 - x1) / (d || 1);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = (i === 0 || i === n) ? (r.f() - .5) * amp : (r.f() - .5) * amp * 2.2;
      pts.push(x1 + (x2 - x1) * t + nx * w, y1 + (y2 - y1) * t + ny * w);
    }
    return pts;
  }
  function ellipsePts(cx, cy, rx, ry, r, amp, a0, a1) {
    a0 = a0 == null ? 0 : a0; a1 = a1 == null ? Math.PI * 2 : a1;
    const span = a1 - a0;
    const n = Math.max(10, Math.round(Math.max(rx, ry) * span / 14));
    const wob = r.rr(0, Math.PI * 2);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = a0 + span * i / n;
      const jw = 1 + (r.f() - .5) * (amp || .05);
      pts.push(cx + Math.cos(t + wob * .02) * rx * jw,
               cy + Math.sin(t + wob * .02) * ry * jw);
    }
    return pts;
  }
  function rectPts(x, y, w, h, r, bow) {
    bow = bow == null ? 2 : bow;
    const pts = [];
    const edge = (x1, y1, x2, y2) => {
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 34));
      for (let i = 0; i < n; i++) {
        const t = i / n;
        pts.push(x1 + (x2 - x1) * t + (r.f() - .5) * bow,
                 y1 + (y2 - y1) * t + (r.f() - .5) * bow);
      }
    };
    edge(x, y, x + w, y); edge(x + w, y, x + w, y + h);
    edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
    pts.push(x, y);
    return pts;
  }
  function starPts(cx, cy, ro, ri, spikes, rot) {
    rot = rot == null ? -Math.PI / 2 : rot;
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? ro : ri;
      const a = rot + Math.PI * i / spikes;
      pts.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    pts.push(pts[0], pts[1]);
    return pts;
  }
  const flat = pts => { const o = []; for (const p of pts) o.push(p[0], p[1]); return o; };

  /* ---------- core: a sketchy stroked path = Group of 2 passes ---------- */
  function strokePath(pts, closed, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    const g = new Konva.Group({ listening: o.listening !== false });
    const w = o.strokeWidth || 3;
    if (o.fill) {
      g.add(new Konva.Line({
        points: flat(pts), closed: true, fill: o.fill, strokeEnabled: false,
        opacity: o.fillOpacity == null ? .9 : o.fillOpacity,
        tension: o.tension == null ? .45 : o.tension, listening: false,
      }));
    }
    const mk = (amp, sw, op) => new Konva.Line({
      points: flat(wobPts(pts, r, amp)), closed: !!closed,
      stroke: o.stroke || INK, strokeWidth: sw, opacity: op,
      lineCap: 'round', lineJoin: 'round',
      tension: o.tension == null ? .45 : o.tension,
      dash: o.dash || null, listening: false,
    });
    g.add(mk(o.amp == null ? 1.4 : o.amp, w, .95));
    g.add(mk((o.amp == null ? 1.4 : o.amp) * 1.7, Math.max(1.1, w * .55), .45));
    return g;
  }

  /* hatch shading clipped inside a shape — clipFunc keeps every stray
   * jittered hatch stroke inside the outline, like crayon shading */
  function hatchIn(pathFn, bx, by, bw, bh, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    const g = new Konva.Group({ listening: false });
    g.clipFunc(ctx => pathFn(ctx));
    const gap = o.gap || 7;
    const ang = (o.angle == null ? -40 : o.angle) * Math.PI / 180;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const len = Math.hypot(bw, bh) * 1.4;
    const cx = bx + bw / 2, cy = by + bh / 2;
    const nx = -dy, ny = dx;
    for (let off = -len / 2; off < len / 2; off += gap) {
      const mx = cx + nx * off + (r.f() - .5) * 3;
      const my = cy + ny * off + (r.f() - .5) * 3;
      const w1 = (r.f() - .5) * 4, w2 = (r.f() - .5) * 4;
      g.add(new Konva.Line({
        points: [mx - dx * len / 2 + w1, my - dy * len / 2 + w2,
                 mx + dx * len / 2 - w2, my + dy * len / 2 - w1],
        stroke: o.stroke || INK, strokeWidth: o.strokeWidth || 1.4,
        opacity: o.opacity == null ? .5 : o.opacity,
        lineCap: 'round', listening: false,
      }));
    }
    return g;
  }

  /* ---------- shape builders (all return Konva.Group) ---------- */
  function path(pts, o) { return strokePath(pts, false, o); }
  function curve(pts, o) { o = Object.assign({ tension: .6 }, o); return strokePath(pts, false, o); }
  function poly(pts, o) { return strokePath(pts, true, o); }
  function rect(x, y, w, h, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    const g = strokePath(rectPts(x, y, w, h, r, o.bow), true, o);
    if (o.hatch) g.add(hatchIn(ctx => ctx.rect(x, y, w, h), x, y, w, h,
      { r, stroke: o.stroke || INK, gap: o.hatchGap, angle: o.hatchAngle }));
    return g;
  }
  function ellipse(cx, cy, rx, ry, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    const g = strokePath(ellipsePts(cx, cy, rx, ry, r, o.wobAmp || .06), true, o);
    if (o.hatch) g.add(hatchIn(ctx => {
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.closePath();
    }, cx - rx, cy - ry, rx * 2, ry * 2,
      { r, stroke: o.stroke || INK, gap: o.hatchGap, angle: o.hatchAngle }));
    return g;
  }
  function circle(cx, cy, rad, o) { return ellipse(cx, cy, rad, rad, o); }
  function arc(cx, cy, rx, ry, a0, a1, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    return strokePath(ellipsePts(cx, cy, rx, ry, r, .07, a0, a1), false, o);
  }
  function line(x1, y1, x2, y2, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    return strokePath(segPts(x1, y1, x2, y2, r, o.amp == null ? 1.4 : o.amp), false,
      Object.assign({ tension: .3 }, o));
  }
  function star(cx, cy, ro, ri, spikes, o) {
    o = o || {};
    return strokePath(starPts(cx, cy, ro, ri, spikes || 5), true,
      Object.assign({ tension: .15, amp: .9, fill: '#FFC53D' }, o));
  }
  function tri(cx, cy, w, h, o) { /* up-pointing triangle, feet at cy */
    return poly([[cx - w / 2, cy], [cx + w / 2, cy], [cx + w * .08, cy - h], [cx - w / 2, cy]], o);
  }

  /* ---------- name chip (the hover differentiator) ---------- */
  function nameChip(text) {
    const l = new Konva.Label({ x: 0, y: 0, opacity: 0, listening: false });
    l.add(new Konva.Tag({
      fill: '#FFFDF6', stroke: INK, strokeWidth: 2, cornerRadius: 9,
      pointerDirection: 'down', pointerWidth: 9, pointerHeight: 6,
      shadowColor: 'rgba(43,33,24,.9)', shadowBlur: 0,
      shadowOffset: { x: 2, y: 2 }, shadowOpacity: 1,
    }));
    l.add(new Konva.Text({
      text, fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive",
      fontSize: 16, fill: INK, padding: 7, listening: false,
    }));
    return l;
  }

  /* floating text scribble inside the canvas (kept off DOM) */
  function scribbleText(text, x, y, o) {
    o = o || {};
    return new Konva.Text({
      x, y, text,
      fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive",
      fontSize: o.fontSize || 18, fill: o.fill || INK,
      rotation: o.rotation || 0, listening: false, opacity: o.opacity == null ? 1 : o.opacity,
    });
  }

  window.SK = {
    INK, rng, mulberry32,
    wobPts, segPts, ellipsePts, rectPts, starPts, flat,
    path, curve, poly, rect, ellipse, circle, arc, line, star, tri,
    hatchIn, nameChip, scribbleText,
  };
})();
