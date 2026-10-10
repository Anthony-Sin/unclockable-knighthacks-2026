/* ============================================================
   L-system engine — "Fill the Tale · Garden Glade edition"
   ------------------------------------------------------------
   A tiny Lindenmayer-system renderer in the tradition of
   The Coding Train's "Coding Challenge #16: Fractal Trees —
   L-System" (github.com/CodingTrain/Coding-Challenges -> 016_LSystem)
   and Prusinkiewicz & Lindenmayer's "The Algorithmic Beauty
   of Plants".

   Pipeline:
     1. expand()  — parallel string rewriting. Rules may be
        stochastic (weighted alternatives chosen per symbol,
        driven by a seeded RNG so a seed reproduces a forest).
     2. interpret() — a turtle walks the rewritten string and
        emits draw ops (branch segments, leaves, blossoms)
        in growth order.
     3. makePlant() — bakes ops into one <canvas> per plant and
        animates the ops appearing branch-by-branch (the magic).

   Alphabet used:
     F G   draw a segment forward        f  move without drawing
     + -   turn left / right             [ ] push / pop turtle state
     L     leaf                          O  blossom
     M     mushroom cap (may glow)       U  big leaf / lily pad
     T     thorn spike                   X Y  variables (draw nothing)
   ============================================================ */
window.LSYS = (function () {
  'use strict';

  /* ---------- seeded RNG (mulberry32) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rng(seed) { return mulberry32(seed >>> 0); }

  /* ---------- 1. string rewriting ---------- */
  // rules: { 'F': 'F[+F]F' }  or  { 'F': [{w:3,s:'F[+F]F'},{w:1,s:'FF'}] }
  function expand(axiom, rules, iterations, rand) {
    var s = axiom;
    for (var i = 0; i < iterations; i++) {
      var out = '';
      for (var j = 0; j < s.length; j++) {
        var ch = s[j];
        var r = rules[ch];
        if (r === undefined) { out += ch; continue; }
        if (typeof r === 'string') { out += r; continue; }
        var total = 0, k;
        for (k = 0; k < r.length; k++) total += r[k].w;
        var pick = rand() * total, acc = 0, chosen = r[r.length - 1].s;
        for (k = 0; k < r.length; k++) {
          acc += r[k].w;
          if (pick < acc) { chosen = r[k].s; break; }
        }
        out += chosen;
      }
      s = out;
    }
    return s;
  }

  // swap leftover variables for terminators (e.g. X -> O blossom)
  function postProcess(script, post) {
    if (!post) return script;
    var out = '';
    for (var i = 0; i < script.length; i++) {
      var ch = script[i];
      out += (post[ch] !== undefined) ? post[ch] : ch;
    }
    return out;
  }

  /* ---------- 2. turtle interpretation ---------- */
  // Returns { ops, x0, y0, w, h } — ops in draw order, local coords,
  // plant base at (0,0), y grows upward (negative y = up on canvas).
  function interpret(script, o) {
    var ops = [];
    var stack = [];
    var x = 0, y = 0;
    var a = (o.startDeg !== undefined ? o.startDeg : -90) * Math.PI / 180;
    var depth = 0, maxDepth = 0;
    var maxOps = o.maxOps || 1400;
    var rand = o.rand;
    var i, ch;

    for (i = 0; i < script.length; i++) {
      ch = script[i];
      if (ch === 'F' || ch === 'G') {
        var len = o.step * Math.pow(o.shrink, depth) *
                  (1 + (rand() * 2 - 1) * o.stepJitter);
        var nx = x + Math.cos(a) * len;
        var ny = y + Math.sin(a) * len;
        ops.push({
          t: 'seg', x1: x, y1: y, x2: nx, y2: ny,
          w: Math.max(1.1, o.w0 * Math.pow(o.wShrink, depth)),
          d: depth
        });
        x = nx; y = ny;
      } else if (ch === 'f') {
        x += Math.cos(a) * o.step; y += Math.sin(a) * o.step;
      } else if (ch === '+') {
        a += o.angle * (1 + (rand() * 2 - 1) * o.angleJitter);
      } else if (ch === '-') {
        a -= o.angle * (1 + (rand() * 2 - 1) * o.angleJitter);
      } else if (ch === '[') {
        stack.push({ x: x, y: y, a: a, d: depth });
        depth++; if (depth > maxDepth) maxDepth = depth;
      } else if (ch === ']') {
        var p = stack.pop();
        if (p) { x = p.x; y = p.y; a = p.a; depth = p.d; }
      } else if (ch === 'L') {
        ops.push({
          t: 'leaf', x: x, y: y, a: a,
          s: o.leafSize * (0.7 + rand() * 0.6),
          c: o.leafPalette[(rand() * o.leafPalette.length) | 0]
        });
      } else if (ch === 'O') {
        ops.push({
          t: 'bloom', x: x, y: y,
          s: o.bloomSize * (0.75 + rand() * 0.5),
          c: o.bloomPalette[(rand() * o.bloomPalette.length) | 0],
          petals: 5 + ((rand() * 2) | 0)
        });
      } else if (ch === 'M') {
        ops.push({
          t: 'cap', x: x, y: y, a: a,
          s: o.capSize * (0.75 + rand() * 0.5),
          c: o.capPalette[(rand() * o.capPalette.length) | 0],
          glow: o.capGlow, d: depth
        });
      } else if (ch === 'U') {
        ops.push({
          t: 'bigleaf', x: x, y: y, a: a,
          s: o.bigSize * (0.85 + rand() * 0.3),
          c: o.bigPalette[(rand() * o.bigPalette.length) | 0],
          notch: o.bigNotch, d: depth
        });
      } else if (ch === 'T') {
        ops.push({
          t: 'thorn', x: x, y: y, a: a,
          s: o.thornSize * (0.7 + rand() * 0.6), d: depth
        });
      }
      // variables (X, Y, A, B…) draw nothing
      if (ops.length >= maxOps) break;
    }

    // tip foliage: sprinkle leaves at the ends of high-depth twigs
    if (o.tipLeaves) {
      var tl = o.tipLeaves;
      for (i = 0; i < ops.length; i++) {
        var op = ops[i];
        if (op.t === 'seg' && op.d >= tl.fromDepth && rand() < tl.prob) {
          ops.push({
            t: 'leaf',
            x: op.x2 + (rand() * 2 - 1) * tl.size * 0.6,
            y: op.y2 + (rand() * 2 - 1) * tl.size * 0.6,
            a: rand() * Math.PI * 2,
            s: tl.size * (0.7 + rand() * 0.7),
            c: o.leafPalette[(rand() * o.leafPalette.length) | 0],
            tip: true
          });
        }
      }
    }

    // growth key: lower depth grows first (trunk, then branches);
    // within a depth keep string order. b is ~0..maxDepth+1.
    var N = ops.length;
    for (i = 0; i < N; i++) {
      var dd = ops[i].d !== undefined ? ops[i].d : maxDepth;
      ops[i].b = dd + (i / Math.max(1, N)) * 0.9;
    }

    // bounds
    var x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    for (i = 0; i < N; i++) {
      var q = ops[i], pad = q.s || q.w || 2;
      var ax1 = q.t === 'seg' ? Math.min(q.x1, q.x2) : q.x;
      var ax2 = q.t === 'seg' ? Math.max(q.x1, q.x2) : q.x;
      var ay1 = q.t === 'seg' ? Math.min(q.y1, q.y2) : q.y;
      var ay2 = q.t === 'seg' ? Math.max(q.y1, q.y2) : q.y;
      if (ax1 - pad < x0) x0 = ax1 - pad;
      if (ax2 + pad > x1) x1 = ax2 + pad;
      if (ay1 - pad < y0) y0 = ay1 - pad;
      if (ay2 + pad > y1) y1 = ay2 + pad;
    }
    return { ops: ops, x0: x0, y0: y0, w: x1 - x0, h: y1 - y0, maxDepth: maxDepth };
  }

  /* ---------- 3. plant = ops baked into its own canvas ---------- */
  var INK = '#2B2118';
  var BARKS = ['#8A5E2E', '#9A6A3B', '#7A4E2D'];
  var GREENS = ['#4FB06D', '#58BC7B', '#7CC97F', '#3E8F57'];
  var BLOOMS = ['#FF6B57', '#FFC53D', '#B565D8', '#5DA9E9', '#FFFDF6'];

  function backEase(t) { // overshoot pop for leaves/blooms
    var s = 1.9, u = t - 1;
    return 1 + (s + 1) * u * u * u + s * u * u;
  }

  function drawOp(ctx, op, prog, bark) {
    if (op.t === 'cap') {
      var cs = backEase(Math.min(1, prog));
      if (cs <= 0.02) return;
      ctx.save();
      ctx.translate(op.x, op.y);
      ctx.scale(cs, cs);
      if (op.glow) {
        var g = ctx.createRadialGradient(0, -op.s * 0.4, 0, 0, -op.s * 0.4, op.s * 2.6);
        g.addColorStop(0, 'rgba(255,222,120,.55)');
        g.addColorStop(1, 'rgba(255,222,120,0)');
        ctx.beginPath(); ctx.arc(0, -op.s * 0.4, op.s * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.beginPath();                       // little stem nub
      ctx.ellipse(0, op.s * 0.28, op.s * 0.3, op.s * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F3E4C8'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath();                       // dome cap
      ctx.ellipse(0, -op.s * 0.18, op.s, op.s * 0.72, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = op.c; ctx.fill();
      ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
      for (var d = 0; d < 3; d++) {          // cap dots
        var da = -0.9 + d * 0.9;
        ctx.beginPath();
        ctx.arc(Math.sin(da) * op.s * 0.5, -op.s * 0.3 - Math.cos(da) * op.s * 0.18,
                op.s * 0.13, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFDF6'; ctx.fill();
      }
      ctx.restore();
      return;
    }
    if (op.t === 'bigleaf') {
      var bs2 = backEase(Math.min(1, prog));
      if (bs2 <= 0.02) return;
      ctx.save();
      ctx.translate(op.x, op.y);
      ctx.rotate(op.notch ? 0 : op.a + Math.PI / 2);
      ctx.scale(bs2, bs2);
      ctx.beginPath();
      if (op.notch) {                        // lily pad: disk with a wedge mouth
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, op.s, 0.42, Math.PI * 2 - 0.42);
        ctx.closePath();
      } else {                               // giant canopy leaf: two-curve lens
        ctx.moveTo(-op.s, 0);
        ctx.quadraticCurveTo(-op.s * 0.55, -op.s * 0.62, op.s, -op.s * 0.08);
        ctx.quadraticCurveTo(op.s * 0.55, op.s * 0.5, -op.s, 0);
      }
      ctx.fillStyle = op.c; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath();                       // veins
      if (op.notch) {
        for (var v = 0; v < 5; v++) {
          var va = 0.7 + v * (Math.PI * 2 - 1.4) / 4;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(va) * op.s * 0.86, Math.sin(va) * op.s * 0.86);
        }
      } else {
        ctx.moveTo(-op.s * 0.9, 0); ctx.lineTo(op.s * 0.9, -op.s * 0.07);
        ctx.moveTo(-op.s * 0.3, -op.s * 0.03); ctx.lineTo(-op.s * 0.05, -op.s * 0.3);
        ctx.moveTo(0.05 * op.s, -op.s * 0.05); ctx.lineTo(op.s * 0.3, op.s * 0.2);
      }
      ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(43,33,24,.5)'; ctx.stroke();
      ctx.restore();
      return;
    }
    if (op.t === 'thorn') {
      var ts = Math.min(1, prog);
      if (ts <= 0.02) return;
      ctx.save();
      ctx.translate(op.x, op.y);
      ctx.rotate(op.a);
      ctx.scale(ts, ts);
      ctx.beginPath();
      ctx.moveTo(-op.s * 0.4, 0);
      ctx.lineTo(0, -op.s);
      ctx.lineTo(op.s * 0.4, 0);
      ctx.closePath();
      ctx.fillStyle = '#5B3B2E'; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
      return;
    }
    if (op.t === 'seg') {
      var ex = op.x1 + (op.x2 - op.x1) * prog;
      var ey = op.y1 + (op.y2 - op.y1) * prog;
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = op.w + 2.6;
      ctx.beginPath(); ctx.moveTo(op.x1, op.y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = bark;
      ctx.lineWidth = op.w;
      ctx.beginPath(); ctx.moveTo(op.x1, op.y1); ctx.lineTo(ex, ey); ctx.stroke();
    } else if (op.t === 'leaf') {
      var sc = backEase(Math.min(1, prog));
      if (sc <= 0.02) return;
      ctx.save();
      ctx.translate(op.x, op.y);
      ctx.rotate(op.a);
      ctx.scale(sc, sc);
      ctx.beginPath();
      ctx.ellipse(0, 0, op.s, op.s * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = op.c; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    } else if (op.t === 'bloom') {
      var bs = backEase(Math.min(1, prog));
      if (bs <= 0.02) return;
      ctx.save();
      ctx.translate(op.x, op.y);
      ctx.scale(bs, bs);
      for (var i = 0; i < op.petals; i++) {
        var pa = (i / op.petals) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(pa) * op.s * 0.72, Math.sin(pa) * op.s * 0.72,
                    op.s * 0.52, op.s * 0.38, pa, 0, Math.PI * 2);
        ctx.fillStyle = op.c; ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, op.s * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFC53D'; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
  }

  // makePlant(spec, rand, scale) -> plant object with .el canvas
  function makePlant(spec, rand, scale) {
    var s = scale || 1;
    var script = postProcess(
      expand(spec.axiom, spec.rules, spec.iters, rand), spec.post);
    var res = interpret(script, {
      angle: spec.angle * Math.PI / 180,
      angleJitter: spec.angleJitter,
      step: spec.step * s,
      stepJitter: spec.stepJitter,
      shrink: spec.shrink,
      w0: spec.w0 * s,
      wShrink: spec.wShrink,
      leafSize: spec.leafSize * s,
      bloomSize: spec.bloomSize * s,
      leafPalette: spec.leafPalette || GREENS,
      bloomPalette: spec.bloomPalette || BLOOMS,
      capSize: (spec.capSize || 10) * s,
      capPalette: spec.capPalette || ['#FF6B57', '#FFC53D', '#B565D8'],
      capGlow: !!spec.capGlow,
      bigSize: (spec.bigSize || 40) * s,
      bigPalette: spec.bigPalette || ['#58BC7B', '#4FB06D', '#7CC97F'],
      bigNotch: !!spec.bigNotch,
      thornSize: (spec.thornSize || 6) * s,
      tipLeaves: spec.tipLeaves,
      startDeg: spec.startDeg,
      maxOps: spec.maxOps || 1400,
      rand: rand
    });

    var pad = Math.max(spec.leafSize, spec.bloomSize, spec.capSize || 0,
                       (spec.bigSize || 0) * 1.2) * s + 10;
    var w = Math.ceil(res.w + pad * 2), h = Math.ceil(res.h + pad * 2);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var el = document.createElement('canvas');
    el.className = 'plant';
    el.width = w * dpr; el.height = h * dpr;
    el.style.width = w + 'px'; el.style.height = h + 'px';
    var ctx = el.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.translate(pad - res.x0, pad - res.y0); // local (0,0) = plant base

    var plant = {
      el: el,
      ops: res.ops,
      ctx: ctx,
      growMs: spec.growMs || 1600,
      // canvas px where the plant base sits — for transform-origin + layout
      ox: pad - res.x0,
      oy: pad - res.y0,
      topY: pad,                      // canvas px of highest point
      bark: BARKS[(rand() * BARKS.length) | 0],
      startAt: 0,
      done: false,
      specName: spec.name,
      _maxB: maxB({ ops: res.ops })
    };
    el.style.transformOrigin = plant.ox + 'px ' + plant.oy + 'px';
    return plant;
  }

  // draw every op that should be visible at time t (0..1 of growth)
  function paintPlant(plant, t) {
    var ctx = plant.ctx;
    var span = plant.growMs;
    for (var i = 0; i < plant.ops.length; i++) {
      var op = plant.ops[i];
      var b0 = op.b * (span / (plant._maxB + 1.2));
      var dur = op.t === 'seg' ? span * 0.09 : span * 0.12;
      var prog = (t * span - b0) / dur;
      if (prog <= 0) continue;
      drawOp(ctx, op, Math.min(1, prog), plant.bark);
    }
  }

  // find the largest growth key so ops spread across growMs
  function maxB(plant) {
    var m = 0;
    for (var i = 0; i < plant.ops.length; i++)
      if (plant.ops[i].b > m) m = plant.ops[i].b;
    return m;
  }

  /* ---------- species (stochastic grammars) ---------- */
  // Each returns spec params; rules are arrays of weighted alternates
  // so every seed grows a genuinely different plant.
  var SPECS = {
    tree: function (r) {
      return {
        name: 'tree',
        axiom: 'F',
        rules: { F: [
          { w: 3, s: 'F[+F]F[-F]F' },
          { w: 2, s: 'F[+F]F[-F]' },
          { w: 2, s: 'F[-F]F[+F]' },
          { w: 1, s: 'FF[+F][-F]' },
          { w: 1, s: 'F[++F][--F]F' }
        ]},
        iters: 4 + ((r() * 2) | 0),
        angle: 20 + r() * 14, angleJitter: 0.28,
        step: 9 + r() * 4, stepJitter: 0.18,
        shrink: 0.55 + r() * 0.2,
        w0: 7.5 + r() * 2.5, wShrink: 0.68,
        leafSize: 11, bloomSize: 0,
        tipLeaves: { fromDepth: 2, prob: 0.8, size: 9 + r() * 6 },
        maxOps: 2600,
        growMs: 2100
      };
    },
    pine: function (r) {
      return {
        name: 'pine',
        axiom: 'F',
        rules: { F: [
          { w: 3, s: 'FF-[-F+F+F]+[+F-F-F]' },
          { w: 2, s: 'FF+[+F-F-F]-[-F+F+F]' },
          { w: 1, s: 'FF-[-F+F]+[+F-F]' }
        ]},
        iters: 3,
        angle: 16 + r() * 10, angleJitter: 0.22,
        step: 7.5 + r() * 3, stepJitter: 0.16,
        shrink: 0.62 + r() * 0.14,
        w0: 6 + r() * 2, wShrink: 0.66,
        leafSize: 7, bloomSize: 0,
        leafPalette: ['#3E8F57', '#4FB06D', '#2F7A47'],
        tipLeaves: { fromDepth: 1, prob: 0.5, size: 5 + r() * 4 },
        growMs: 1900
      };
    },
    bush: function (r) {
      return {
        name: 'bush',
        axiom: 'F',
        rules: { F: [
          { w: 3, s: 'FF[+F-F][-F+F]' },
          { w: 2, s: 'FF[+F][-F][F]' },
          { w: 1, s: 'F[+F-F][-F+F]F' }
        ]},
        iters: 3,
        angle: 26 + r() * 14, angleJitter: 0.3,
        step: 6.5 + r() * 3, stepJitter: 0.22,
        shrink: 0.68 + r() * 0.12,
        w0: 4.5 + r() * 1.5, wShrink: 0.72,
        leafSize: 8, bloomSize: 0,
        tipLeaves: { fromDepth: 2, prob: 0.85, size: 6 + r() * 5 },
        growMs: 1400
      };
    },
    fern: function (r) {
      return {
        name: 'fern',
        axiom: 'X',
        rules: {
          X: [
            { w: 3, s: 'F+[[X]-X]-F[-FX]+X' },
            { w: 1, s: 'F-[[X]+X]+F[+FX]-X' }
          ],
          F: 'FF'
        },
        iters: 4 + ((r() * 2) | 0),
        angle: 21 + r() * 6, angleJitter: 0.14,
        step: 3.4 + r() * 1.4, stepJitter: 0.12,
        shrink: 0.9, w0: 3 + r() * 1.2, wShrink: 0.8,
        leafSize: 0, bloomSize: 0,
        maxOps: 2200,
        growMs: 2000
      };
    },
    flower: function (r) {
      return {
        name: 'flower',
        axiom: 'FX',
        rules: { X: [
          { w: 2, s: 'F[+FL]X' },
          { w: 2, s: 'F[-FL]X' },
          { w: 1, s: 'F[++FL]X' },
          { w: 1, s: 'F[--FL]X' }
        ]},
        post: { X: 'O' },
        iters: 2 + ((r() * 3) | 0),
        angle: 22 + r() * 10, angleJitter: 0.2,
        step: 9 + r() * 5, stepJitter: 0.15,
        shrink: 0.94, w0: 3.6 + r(), wShrink: 0.85,
        leafSize: 7 + r() * 3, bloomSize: 9 + r() * 4,
        growMs: 1300
      };
    },
    tuft: function (r) {
      return {
        name: 'tuft',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'F[--F][-F][F][+F][++F]' },
          { w: 1, s: 'F[-F][F][+F]' },
          { w: 1, s: 'F[--F][-F][+F][++F]F' }
        ]},
        iters: 1,
        angle: 30 + r() * 14, angleJitter: 0.25,
        step: 5 + r() * 4, stepJitter: 0.3,
        shrink: 0.95, w0: 2.6 + r(), wShrink: 0.8,
        leafSize: 0, bloomSize: 0,
        growMs: 700
      };
    },
    vine: function (r) { // used by the tangle gag — leafy creeper
      return {
        name: 'vine',
        axiom: 'X',
        rules: {
          X: [
            { w: 2, s: 'F[+XL]F[-XL]+X' },
            { w: 1, s: 'F[-XL]F[+XL]-X' }
          ],
          F: 'FF'
        },
        iters: 3 + ((r() * 2) | 0),
        angle: 24 + r() * 8, angleJitter: 0.3,
        step: 4.5 + r() * 1.5, stepJitter: 0.2,
        shrink: 0.92, w0: 3.4 + r(), wShrink: 0.82,
        leafSize: 6 + r() * 3, bloomSize: 0,
        growMs: 900
      };
    },
    party: function (r) { // finale blossom tree
      return {
        name: 'party',
        axiom: 'F',
        rules: { F: [
          { w: 3, s: 'F[+FO]F[-FO]F' },
          { w: 2, s: 'F[+F][-FO]F' },
          { w: 2, s: 'F[-FO]F[+F]' },
          { w: 1, s: 'FF[+FO][-FO]' }
        ]},
        iters: 5,
        angle: 21 + r() * 10, angleJitter: 0.24,
        step: 11 + r() * 3, stepJitter: 0.16,
        shrink: 0.6 + r() * 0.14,
        w0: 9 + r() * 2, wShrink: 0.68,
        leafSize: 10, bloomSize: 8 + r() * 4,
        tipLeaves: { fromDepth: 3, prob: 0.5, size: 7 + r() * 5 },
        maxOps: 2600,
        growMs: 3000
      };
    },

    /* ---------- beat-0 hero: a sprout curling out of the pot ---------- */
    sprout: function (r) {
      return {
        name: 'sprout',
        axiom: 'X',
        rules: {
          X: [
            { w: 2, s: 'F[+L]F[-L]+X' },
            { w: 2, s: 'F[-L]F[+L]-X' },
            { w: 1, s: 'F[++L]F[-L]+X' }
          ]
        },
        post: { X: 'O' },
        iters: 3,
        angle: 20 + r() * 8, angleJitter: 0.18,
        step: 13 + r() * 4, stepJitter: 0.12,
        shrink: 0.95, w0: 4.4 + r(), wShrink: 0.9,
        leafSize: 10 + r() * 3, bloomSize: 11 + r() * 4,
        growMs: 1500
      };
    },

    /* ---------- beat-1 crossing props ---------- */
    bridgehalf: function (r) { // one arc of the woven branch-bridge
      return {                 // grows rightward, sagging down into the gap
        name: 'bridgehalf',
        axiom: 'X',
        rules: {
          X: [
            { w: 3, s: 'FF-[-FL][+FL]+X' },
            { w: 2, s: 'FF-[+FL][-FL]X' },
            { w: 1, s: 'FF--[+L][-L]X' }
          ]
        },
        iters: 8 + ((r() * 3) | 0),
        angle: 7 + r() * 4, angleJitter: 0.3,
        step: 9 + r() * 2, stepJitter: 0.16,
        shrink: 0.94, w0: 6.5 + r() * 1.5, wShrink: 0.93,
        leafSize: 5 + r() * 2, bloomSize: 0,
        startDeg: -6 - r() * 8,
        growMs: 1500
      };
    },
    logbridge: function (r) { // one thick rough branch spanning the gap
      return {
        name: 'logbridge',
        axiom: 'X',
        rules: {
          X: [
            { w: 3, s: 'FFF-[+F][-F]X' },
            { w: 1, s: 'FFF-[+FL][-F]X' }
          ]
        },
        iters: 8,
        angle: 4.5 + r() * 2, angleJitter: 0.2,
        step: 12 + r() * 2, stepJitter: 0.1,
        shrink: 0.96, w0: 11 + r() * 2, wShrink: 0.95,
        leafSize: 5, bloomSize: 0,
        startDeg: -4 - r() * 4,
        growMs: 1300
      };
    },
    post: function (r) { // leaning trunk the swing-vine hangs from
      return {
        name: 'post',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'FF-[+L]X' },   // each iter curves further left
          { w: 1, s: 'FF-[-L]X' }
        ]},
        iters: 5,
        angle: 13 + r() * 4, angleJitter: 0.15,
        step: 25 + r() * 6, stepJitter: 0.1,
        shrink: 0.97, w0: 9 + r() * 2, wShrink: 0.9,
        leafSize: 8 + r() * 3, bloomSize: 0,
        startDeg: -92 - r() * 10, // starts near-vertical, arcs left over the gap
        growMs: 1100
      };
    },
    hangvine: function (r) { // grows DOWNWARD from the post tip — the swing
      return {
        name: 'hangvine',
        axiom: 'X',
        rules: {
          X: [
            { w: 2, s: 'F[+L]F[-L]+X' },
            { w: 2, s: 'F[-L]F[+L]-X' },
            { w: 1, s: 'FF+L-X' }
          ]
        },
        iters: 5 + ((r() * 2) | 0),
        angle: 13 + r() * 6, angleJitter: 0.25,
        step: 16 + r() * 3, stepJitter: 0.12,
        shrink: 0.97, w0: 4.6 + r(), wShrink: 0.95,
        leafSize: 6 + r() * 2, bloomSize: 0,
        startDeg: 86 + r() * 6,   // points down (canvas +y)
        growMs: 1300
      };
    },
    stalk: function (r) { // beanstalk — leaf rungs make it a living ladder
      return {
        name: 'stalk',
        axiom: 'X',
        rules: { X: [
          { w: 3, s: 'F[+L][-L]FX' },
          { w: 1, s: 'F[++L][--L]FX' }
        ]},
        iters: 5 + ((r() * 2) | 0),   // ~150-190 tall; tips over to span the gap
        angle: 10 + r() * 5, angleJitter: 0.2,
        step: 15 + r() * 3, stepJitter: 0.12,
        shrink: 0.96, w0: 6 + r() * 1.5, wShrink: 0.95,
        leafSize: 10 + r() * 3, bloomSize: 0,
        leafPalette: ['#4FB06D', '#58BC7B', '#7CC97F'],
        growMs: 1900
      };
    },

    /* ---------- beat-2 drizzle shelters ---------- */
    leafumbrella: function (r) { // stem with one giant canopy leaf on top
      return {
        name: 'leafumbrella',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'F[+FL][-FL]FX' },
          { w: 1, s: 'FF[+L]X' }
        ]},
        post: { X: 'U' },
        iters: 3,
        angle: 16 + r() * 6, angleJitter: 0.2,
        step: 22 + r() * 6, stepJitter: 0.12,
        shrink: 0.96, w0: 5 + r(), wShrink: 0.92,
        leafSize: 7 + r() * 2, bloomSize: 0,
        bigSize: 68 + r() * 16,
        growMs: 1300
      };
    },
    shroombrella: function (r) { // toadstool parasol — cap pops open over Pip
      return {
        name: 'shroombrella',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'FFX' },
          { w: 1, s: 'F+F-X' }
        ]},
        post: { X: 'M' },
        iters: 3 + ((r() * 2) | 0),
        angle: 8 + r() * 4, angleJitter: 0.2,
        step: 17 + r() * 4, stepJitter: 0.12,
        shrink: 0.96, w0: 6 + r(), wShrink: 0.93,
        leafSize: 0, bloomSize: 0,
        capSize: 46 + r() * 12,
        capPalette: ['#FF6B57', '#B565D8', '#5DA9E9', '#FFC53D'],
        growMs: 1200
      };
    },

    /* ---------- beat-3 pond rides ---------- */
    lilypad: function (r) { // raft: short stalk rising into a huge flat pad
      return {
        name: 'lilypad',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'FFX' },
          { w: 1, s: 'F+F-FX' }
        ]},
        post: { X: 'U' },
        iters: 2,
        angle: 6 + r() * 4, angleJitter: 0.15,
        step: 10 + r() * 3, stepJitter: 0.1,
        shrink: 0.96, w0: 5 + r(), wShrink: 0.9,
        leafSize: 0, bloomSize: 0,
        bigSize: 74 + r() * 12, bigNotch: true,
        bigPalette: ['#4FB06D', '#58BC7B', '#3E8F57'],
        growMs: 1100
      };
    },
    reed: function (r) { // pond-side cattails
      return {
        name: 'reed',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'F[+L]F[-L]FXO' },
          { w: 1, s: 'F[-L]FFXO' }
        ]},
        iters: 2 + ((r() * 2) | 0),
        angle: 14 + r() * 6, angleJitter: 0.2,
        step: 16 + r() * 4, stepJitter: 0.14,
        shrink: 0.97, w0: 2.6 + r(), wShrink: 0.9,
        leafSize: 9 + r() * 4,
        bloomSize: 7 + r() * 2,
        bloomPalette: ['#8A5E2E', '#7A4E2D'],   // brown cattail tips
        growMs: 900
      };
    },

    /* ---------- beat-4 cave lights ---------- */
    glowshroom: function (r) { // a clump of glowing lantern mushrooms
      return {
        name: 'glowshroom',
        axiom: 'X',
        rules: {
          X: [
            { w: 3, s: 'F[+XM][-XM]FM' },
            { w: 2, s: 'FM[+XM]' },
            { w: 1, s: 'F[+XM][-XM][XM]' }
          ]
        },
        iters: 2,
        angle: 26 + r() * 10, angleJitter: 0.25,
        step: 9 + r() * 3, stepJitter: 0.15,
        shrink: 0.9, w0: 4 + r(), wShrink: 0.85,
        leafSize: 0, bloomSize: 0,
        capSize: 12 + r() * 5, capGlow: true,
        capPalette: ['#FFC53D', '#7CC9C0', '#5DA9E9'],
        growMs: 1400
      };
    },
    torch: function (r) { // a fire-flower: stalk tipped with a burning bloom
      return {
        name: 'torch',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'F[+L]FX' },
          { w: 1, s: 'F[-L]FX' }
        ]},
        post: { X: 'O' },
        iters: 4 + ((r() * 2) | 0),
        angle: 11 + r() * 5, angleJitter: 0.2,
        step: 15 + r() * 4, stepJitter: 0.12,
        shrink: 0.95, w0: 4.4 + r(), wShrink: 0.9,
        leafSize: 7 + r() * 2,
        bloomSize: 13 + r() * 4,
        bloomPalette: ['#FF6B57', '#FFC53D', '#E5484D'],
        growMs: 1200
      };
    },

    /* ---------- silly beat: thorny weed that tangles Pip ---------- */
    weed: function (r) {
      return {
        name: 'weed',
        axiom: 'X',
        rules: {
          X: [
            { w: 3, s: 'F[+XT][-XT]FX' },
            { w: 2, s: 'F[+T][-XT]F[+X]' },
            { w: 1, s: 'FT[-X][+XT]' }
          ]
        },
        iters: 4 + ((r() * 2) | 0),
        angle: 30 + r() * 12, angleJitter: 0.35,
        step: 5.5 + r() * 1.5, stepJitter: 0.25,
        shrink: 0.9, w0: 3 + r(), wShrink: 0.85,
        leafSize: 0, bloomSize: 0, thornSize: 6 + r() * 3,
        growMs: 900,
        maxOps: 700
      };
    },

    /* ---------- dressing ---------- */
    hedge: function (r) { // dense bramble blocking the glade path look
      return {
        name: 'hedge',
        axiom: 'X',
        rules: { X: [
          { w: 2, s: 'F[+XL][-XL]FX' },
          { w: 1, s: 'F[-XL][+X]F' }
        ]},
        iters: 4,
        angle: 34 + r() * 12, angleJitter: 0.35,
        step: 5 + r() * 1.5, stepJitter: 0.25,
        shrink: 0.9, w0: 3.4 + r(), wShrink: 0.85,
        leafSize: 6 + r() * 2, bloomSize: 0,
        leafPalette: ['#3E8F57', '#2F7A47', '#4FB06D'],
        growMs: 1200,
        maxOps: 900
      };
    },
    hometree: function (r) { // the big friendly tree Pip's door grows into
      return {
        name: 'hometree',
        axiom: 'F',
        rules: { F: [
          { w: 3, s: 'F[+FL]F[-FL]F' },
          { w: 2, s: 'F[++FL]F[--FL]' },
          { w: 1, s: 'FF[+FL][-FL]' }
        ]},
        iters: 5,
        angle: 24 + r() * 8, angleJitter: 0.22,
        step: 10 + r() * 2, stepJitter: 0.14,
        shrink: 0.58 + r() * 0.1,
        w0: 15 + r() * 3, wShrink: 0.62,
        leafSize: 12, bloomSize: 0,
        leafPalette: ['#4FB06D', '#58BC7B', '#7CC97F', '#3E8F57'],
        tipLeaves: { fromDepth: 2, prob: 0.85, size: 10 + r() * 6 },
        maxOps: 2600,
        growMs: 2600
      };
    }
  };

  return {
    rng: rng,
    expand: expand,
    interpret: interpret,
    makePlant: makePlant,
    paintPlant: paintPlant,
    maxB: maxB,
    SPECS: SPECS
  };
})();
