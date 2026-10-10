/* sketch.js — the hand-rolled scribbler (ZERO dependencies).
 *
 * This file is the whole "engine": a seeded PRNG plus stroke helpers that
 * draw straight onto a plain Canvas 2D context. Every "hand-drawn" mark is
 * sketched as 2 (sometimes 3) slightly-offset passes — each pass re-jitters
 * every point with a seeded rng and reconnects them with quadratic curves
 * through the midpoints, so lines look crayon-wobbly instead of vector-crisp.
 *
 * Everything is deterministic: pass the same seed, get the same wobble.
 *
 *   const r = SK.rng(42);
 *   SK.ellipse(ctx, 0, -60, 30, 22, { r, fill:'#FF9EBB', hatch:true });
 *   SK.line(ctx, 0, 0, 40, -30, { r, strokeWidth: 4 });
 */
'use strict';
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
      pick: (arr) => arr[Math.floor(f() * arr.length) % arr.length],
      sign: () => (f() < .5 ? -1 : 1),
    };
  }
  /* string → int seed so "wolf" always doodles the same wolf-ish */
  function hashStr(s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) || 7;
  }

  /* ---------- point generators (pure math, no ctx) ---------- */
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
      pts.push([x1 + (x2 - x1) * t + nx * w, y1 + (y2 - y1) * t + ny * w]);
    }
    return pts;
  }
  function ellipsePts(cx, cy, rx, ry, r, amp, a0, a1) {
    a0 = a0 == null ? 0 : a0; a1 = a1 == null ? Math.PI * 2 : a1;
    const span = a1 - a0;
    const n = Math.max(10, Math.round(Math.max(rx, ry) * Math.abs(span) / 14));
    const wob = r.rr(0, Math.PI * 2);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = a0 + span * i / n;
      const jw = 1 + (r.f() - .5) * (amp == null ? .06 : amp);
      pts.push([cx + Math.cos(t + wob * .02) * rx * jw,
                cy + Math.sin(t + wob * .02) * ry * jw]);
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
        pts.push([x1 + (x2 - x1) * t + (r.f() - .5) * bow,
                  y1 + (y2 - y1) * t + (r.f() - .5) * bow]);
      }
    };
    edge(x, y, x + w, y); edge(x + w, y, x + w, y + h);
    edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
    return pts;
  }
  function starPts(cx, cy, ro, ri, spikes, rot) {
    rot = rot == null ? -Math.PI / 2 : rot;
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? ro : ri;
      const a = rot + Math.PI * i / spikes;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    return pts;
  }

  /* ---------- trace a smoothed path through points ----------
   * quadraticCurveTo through midpoints = the hand-drawn curve feel. */
  function traceSmooth(ctx, pts, closed) {
    const n = pts.length;
    if (n < 2) {
      if (n === 1) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[0][0] + .01, pts[0][1]); }
      return;
    }
    if (!closed) {
      ctx.moveTo(pts[0][0], pts[0][1]);
      if (n === 2) { ctx.lineTo(pts[1][0], pts[1][1]); return; }
      for (let i = 1; i < n - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    } else {
      const mx0 = (pts[0][0] + pts[n - 1][0]) / 2, my0 = (pts[0][1] + pts[n - 1][1]) / 2;
      ctx.moveTo(mx0, my0);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        ctx.quadraticCurveTo(p[0], p[1], mx, my);
      }
      ctx.closePath();
    }
  }

  /* ---------- squiggle hatch lines (call inside a clip) ---------- */
  function hatchLines(ctx, bx, by, bw, bh, r, o) {
    o = o || {};
    const gap = o.gap || 7;
    const ang = (o.angle == null ? -40 : o.angle) * Math.PI / 180;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const len = Math.hypot(bw, bh) * 1.4;
    const cx = bx + bw / 2, cy = by + bh / 2;
    const nx = -dy, ny = dx;
    ctx.strokeStyle = o.stroke || INK;
    ctx.lineWidth = o.strokeWidth || 1.4;
    ctx.globalAlpha = o.opacity == null ? .5 : o.opacity;
    ctx.lineCap = 'round';
    for (let off = -len / 2; off < len / 2; off += gap) {
      const mx = cx + nx * off + (r.f() - .5) * 3;
      const my = cy + ny * off + (r.f() - .5) * 3;
      const w1 = (r.f() - .5) * 4, w2 = (r.f() - .5) * 4;
      ctx.beginPath();
      ctx.moveTo(mx - dx * len / 2 + w1, my - dy * len / 2 + w2);
      ctx.lineTo(mx + dx * len / 2 - w2, my + dy * len / 2 - w1);
      ctx.stroke();
    }
  }

  /* ---------- the core: one "crayon stroke" = fill + 2 jittered passes ---------- */
  function strokePath(ctx, pts, closed, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    const w = o.strokeWidth || 3;
    const amp = o.amp == null ? 1.4 : o.amp;

    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (o.fill && o.fill !== 'none') {
      ctx.beginPath();
      traceSmooth(ctx, wobPts(pts, r, amp * .8), closed);
      ctx.fillStyle = o.fill;
      ctx.globalAlpha = o.fillOpacity == null ? .92 : o.fillOpacity;
      ctx.fill();
      if (o.hatch) {
        /* squiggle shading clipped inside the shape, like crayon shading */
        ctx.save();
        ctx.clip();
        const b = boundsOf(pts);
        hatchLines(ctx, b[0], b[1], b[2] - b[0], b[3] - b[1], r,
          { stroke: o.stroke || INK, gap: o.hatchGap, angle: o.hatchAngle,
            strokeWidth: o.hatchWeight || 1.3, opacity: o.hatchOpacity });
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (o.stroke !== 'none' && w > 0) {
      const passes = o.passes || (w >= 5 ? 3 : 2);
      for (let p = 0; p < passes; p++) {
        ctx.beginPath();
        traceSmooth(ctx, wobPts(pts, r, amp * (p === 0 ? 1 : 1.7)), closed);
        ctx.strokeStyle = o.stroke || INK;
        ctx.lineWidth = p === 0 ? w : Math.max(1, w * (p === 1 ? .55 : .7));
        ctx.globalAlpha = p === 0 ? .95 : (p === 1 ? .45 : .35);
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.stroke();
        if (o.dash) ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
  function boundsOf(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    return [x0, y0, x1, y1];
  }

  /* ---------- shape helpers (all draw on ctx) ---------- */
  function path(ctx, pts, o) { strokePath(ctx, pts, false, o); }
  function curve(ctx, pts, o) { strokePath(ctx, pts, false, o); }
  function poly(ctx, pts, o) { strokePath(ctx, pts, true, o); }
  function line(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    strokePath(ctx, segPts(x1, y1, x2, y2, r, o.amp == null ? 1.4 : o.amp), false, o);
  }
  function rect(ctx, x, y, w, h, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    strokePath(ctx, rectPts(x, y, w, h, r, o.bow), true, o);
  }
  function ellipse(ctx, cx, cy, rx, ry, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    strokePath(ctx, ellipsePts(cx, cy, rx, ry, r, o.wobAmp), true, o);
  }
  function circle(ctx, cx, cy, rad, o) { ellipse(ctx, cx, cy, rad, rad, o); }
  function arc(ctx, cx, cy, rx, ry, a0, a1, o) {
    o = o || {};
    const r = o.r || rng((Math.random() * 1e9) | 0);
    strokePath(ctx, ellipsePts(cx, cy, rx, ry, r, .07, a0, a1), false, o);
  }
  function star(ctx, cx, cy, ro, ri, spikes, o) {
    strokePath(ctx, starPts(cx, cy, ro, ri, spikes || 5), true,
      Object.assign({ amp: .9, fill: '#FFC53D' }, o));
  }
  function tri(ctx, cx, cy, w, h, o) { /* up-pointing triangle, feet at cy */
    poly(ctx, [[cx - w / 2, cy], [cx + w / 2, cy], [cx + w * .08, cy - h]], o);
  }
  /* polygon through explicit points (alias for readability at call sites) */
  function polygon(ctx, pts, o) { poly(ctx, pts, o); }

  /* ---------- hand lettering on canvas ---------- */
  const HAND = "'Patrick Hand', 'Comic Sans MS', cursive";
  function text(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = `${o.weight || 400} ${o.size || 18}px ${HAND}`;
    ctx.fillStyle = o.fill || INK;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.globalAlpha = o.opacity == null ? 1 : o.opacity;
    ctx.fillText(String(str), x, y);
    ctx.restore();
  }
  /* a little caption: hand-lettered word + squiggle underline — every prop
   * gets one so ANY word the LLM emits still makes sense on stage. */
  function caption(ctx, str, x, y, r, o) {
    o = o || {};
    const s = String(str || 'thing').slice(0, 20);
    ctx.save();
    ctx.font = `400 ${o.size || 15}px ${HAND}`;
    const w = ctx.measureText(s).width;
    ctx.restore();
    /* paper-pill behind the word */
    rect(ctx, x - w / 2 - 9, y - 11, w + 18, 22,
      { r, fill: '#FFFDF6', fillOpacity: .88, stroke: INK, strokeWidth: 1.6, amp: .8 });
    text(ctx, s, x, y + 1, { size: o.size || 15 });
  }

  window.SK = {
    INK, HAND, mulberry32, hashStr, rng,
    wobPts, segPts, ellipsePts, rectPts, starPts, traceSmooth, boundsOf,
    strokePath, hatchLines,
    path, curve, poly, polygon, rect, ellipse, circle, arc, line, star, tri,
    text, caption,
  };
})();
