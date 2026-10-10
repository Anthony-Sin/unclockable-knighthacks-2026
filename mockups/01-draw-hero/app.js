'use strict';
/* ============================================================
   Draw Your Hero — mockup 01
   Vanilla-JS crayon canvas + simulated "rigging" overlay +
   storywood payoff scene. Everything hardcoded, no real AI.
   ============================================================ */

/* ---------- canvas setup ---------- */
const LOGICAL_W = 1200;
const LOGICAL_H = 800;

const canvas  = document.getElementById('pad');
const ctx     = canvas.getContext('2d');
const dpr     = Math.min(window.devicePixelRatio || 1, 2);
canvas.width  = LOGICAL_W * dpr;
canvas.height = LOGICAL_H * dpr;
ctx.scale(dpr, dpr);
ctx.lineCap  = 'round';
ctx.lineJoin = 'round';

const state = {
  color: '#FF6B57',
  size: 24,
  erasing: false,
  drawing: false,
  activeId: null,
  last: null,
  busy: false,
  painting: false,
  hasDrawn: false
};

const undoStack = [];
const UNDO_MAX = 30;

/* ---------- element handles ---------- */
const paletteEl  = document.getElementById('palette');
const sizesEl    = document.getElementById('sizes');
const eraserBtn  = document.getElementById('eraserBtn');
const undoBtn    = document.getElementById('undoBtn');
const clearBtn   = document.getElementById('clearBtn');
const doneBtn    = document.getElementById('doneBtn');
const ring       = document.getElementById('brushRing');
const miniToast  = document.getElementById('miniToast');
const overlay    = document.getElementById('aiOverlay');
const scanLine   = document.getElementById('scanLine');
const sparkleBox = document.getElementById('sparkleBox');
const rigSvg     = document.getElementById('rigSvg');
const toastsEl   = document.getElementById('toasts');
const skipAiBtn  = document.getElementById('skipAi');
const studioSec  = document.getElementById('studio');
const payoffSec  = document.getElementById('payoff');
const sceneCard  = document.getElementById('sceneCard');
const heroImg    = document.getElementById('heroImg');
const capName    = document.getElementById('capName');
const nameInput  = document.getElementById('nameInput');
const gemLetterSvg   = document.getElementById('gemLetterSvg');
const gemLetterLabel = document.getElementById('gemLetterLabel');
const gemWord    = document.getElementById('gemWord');
const againBtn   = document.getElementById('againBtn');
const friendBtn  = document.getElementById('friendBtn');
const magicBtn   = document.getElementById('magicBtn');

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (LOGICAL_W / r.width),
    y: (e.clientY - r.top)  * (LOGICAL_H / r.height)
  };
}

function pushUndo() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > UNDO_MAX) undoStack.shift();
}

function canvasHasInk() {
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] > 0) return true;
  }
  return false;
}

/* ---------- crayon strokes ---------- */
function crayonSegment(x0, y0, x1, y1) {
  ctx.globalCompositeOperation = state.erasing ? 'destination-out' : 'source-over';
  const w = state.erasing ? state.size * 1.6 : state.size;

  ctx.lineWidth = w;
  ctx.strokeStyle = state.erasing ? '#000000' : state.color;
  ctx.globalAlpha = state.erasing ? 1 : 0.93;
  ctx.beginPath();
  const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 2;
  const my = (y0 + y1) / 2 + (Math.random() - 0.5) * 2;
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.stroke();

  // waxy grain: faint speckles scattered along the stroke
  if (!state.erasing) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.floor(dist / 5));
    ctx.fillStyle = state.color;
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      const px = x0 + (x1 - x0) * t + (Math.random() - 0.5) * w * 1.1;
      const py = y0 + (y1 - y0) * t + (Math.random() - 0.5) * w * 1.1;
      ctx.globalAlpha = 0.10 + Math.random() * 0.22;
      ctx.beginPath();
      ctx.arc(px, py, w * (0.12 + Math.random() * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function crayonDot(p) {
  crayonSegment(p.x, p.y, p.x + 0.01, p.y + 0.01);
}

/* ============================================================
   Pre-drawn friends — kid-style doodles painted with the same
   crayon engine, centered so the hardcoded skeleton lands on
   the arms and legs. Presenters never have to draw live.
   ============================================================ */
const PI2 = Math.PI * 2;

function ptsLine(x1, y1, x2, y2, jit = 3) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 14));
  const p = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    p.push({ x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * jit,
             y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * jit });
  }
  return p;
}

function ptsPoly(verts, jit = 3) {
  let p = [];
  for (let i = 1; i < verts.length; i++) {
    const seg = ptsLine(verts[i - 1][0], verts[i - 1][1], verts[i][0], verts[i][1], jit);
    p = p.concat(i === 1 ? seg : seg.slice(1));
  }
  return p;
}

function ptsQuad(p0, c, p1, jit = 3, n = 16) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    p.push({
      x: u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0] + (Math.random() - 0.5) * jit,
      y: u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1] + (Math.random() - 0.5) * jit
    });
  }
  return p;
}

function ptsEllipse(cx, cy, rx, ry, a0 = 0, a1 = PI2, n = 34, jit = 4, rot = 0) {
  const p = [];
  const cosR = Math.cos(rot), sinR = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    const wob = 1 + (Math.random() - 0.5) * 0.07;          // kid-wobble on the radius
    const ex = Math.cos(a) * rx * wob, ey = Math.sin(a) * ry * wob;
    p.push({ x: cx + ex * cosR - ey * sinR + (Math.random() - 0.5) * jit,
             y: cy + ex * sinR + ey * cosR + (Math.random() - 0.5) * jit });
  }
  return p;
}

function ptsRoundRect(x1, y1, x2, y2, r, jit = 3) {
  const pts = [];
  const corners = [
    { cx: x2 - r, cy: y1 + r, a0: -Math.PI / 2, a1: 0 },
    { cx: x2 - r, cy: y2 - r, a0: 0,            a1: Math.PI / 2 },
    { cx: x1 + r, cy: y2 - r, a0: Math.PI / 2,  a1: Math.PI },
    { cx: x1 + r, cy: y1 + r, a0: Math.PI,      a1: Math.PI * 1.5 }
  ];
  corners.forEach(cn => {
    for (let i = 0; i <= 6; i++) {
      const a = cn.a0 + (cn.a1 - cn.a0) * (i / 6);
      pts.push({ x: cn.cx + Math.cos(a) * r + (Math.random() - 0.5) * jit,
                 y: cn.cy + Math.sin(a) * r + (Math.random() - 0.5) * jit });
    }
  });
  pts.push({ x: pts[0].x, y: pts[0].y });                  // close the shape
  return pts;
}

function dot(x, y) {
  return [{ x, y }, { x: x + 0.01, y: y + 0.01 }];
}

/* Skeleton landmarks the doodles are built around (see JOINTS below):
   head(600,205) neck(600,330) hips(600,560)
   shoulders (470,385)/(730,385) · hands (338,566)/(862,566)
   feet (452,764)/(748,764)                                       */
const INK = '#2B2118', LEAF = '#4FB06D', SKY = '#5DA9E9',
      BERRY = '#B565D8', PINK = '#FF8FAB', CORAL = '#FF6B57', SUN = '#FFC53D';
const S = (c, s, p) => ({ c, s, p });

const DOODLES = [
  {
    name: 'Blobby',
    strokes: [
      S(LEAF, 26, ptsEllipse(600, 192, 90, 82)),           // head
      S(LEAF, 26, ptsEllipse(600, 448, 168, 148)),         // body
      S(LEAF, 16, ptsLine(585, 266, 583, 304)),            // neck
      S(LEAF, 16, ptsLine(617, 266, 619, 304)),
      S(LEAF, 24, ptsQuad([480, 378], [398, 438], [350, 552])),  // arm L
      S(LEAF, 24, ptsQuad([720, 378], [802, 438], [850, 552])),  // arm R
      S(LEAF, 18, ptsEllipse(342, 558, 20, 20, 0, PI2, 22)),     // hand L
      S(LEAF, 18, ptsEllipse(858, 558, 20, 20, 0, PI2, 22)),     // hand R
      S(LEAF, 24, ptsQuad([545, 582], [498, 672], [462, 744])),  // leg L
      S(LEAF, 24, ptsQuad([655, 582], [702, 672], [738, 744])),  // leg R
      S(LEAF, 18, ptsEllipse(452, 758, 32, 15, 0, PI2, 22)),     // foot L
      S(LEAF, 18, ptsEllipse(748, 758, 32, 15, 0, PI2, 22)),     // foot R
      S(CORAL, 14, ptsLine(566, 120, 550, 82)),            // antenna L
      S(CORAL, 14, ptsEllipse(546, 72, 13, 13, 0, PI2, 18)),
      S(CORAL, 14, ptsLine(634, 120, 650, 82)),            // antenna R
      S(CORAL, 14, ptsEllipse(654, 72, 13, 13, 0, PI2, 18)),
      S(INK, 13, ptsEllipse(566, 182, 15, 15, 0, PI2, 20)),      // eye L
      S(INK, 13, ptsEllipse(640, 182, 15, 15, 0, PI2, 20)),      // eye R
      S(INK, 15, dot(570, 186)),                           // pupils
      S(INK, 15, dot(644, 186)),
      S(INK, 14, ptsEllipse(602, 220, 48, 42, Math.PI * 0.14, Math.PI * 0.86, 22)) // smile
    ]
  },
  {
    name: 'Beep',
    strokes: [
      S(SKY, 26, ptsRoundRect(532, 120, 668, 288, 30)),          // head box
      S(SKY, 16, ptsLine(584, 286, 584, 314)),             // neck
      S(SKY, 16, ptsLine(616, 286, 616, 314)),
      S(SKY, 26, ptsRoundRect(502, 314, 698, 592, 34)),          // body box
      S(CORAL, 15, ptsEllipse(600, 432, 24, 24, 0, PI2, 24)),    // chest button
      S(CORAL, 12, dot(600, 432)),
      S(SKY, 22, ptsPoly([[496, 372], [462, 404], [400, 462], [348, 556]])), // arm L
      S(SKY, 22, ptsPoly([[704, 372], [738, 404], [800, 462], [852, 556]])), // arm R
      S(SKY, 18, ptsEllipse(350, 552, 19, 19, 0, PI2, 20)),      // hand L
      S(SKY, 18, ptsEllipse(850, 552, 19, 19, 0, PI2, 20)),      // hand R
      S(SKY, 22, ptsPoly([[550, 582], [502, 674], [468, 748]])), // leg L
      S(SKY, 22, ptsPoly([[650, 582], [698, 674], [732, 748]])), // leg R
      S(SKY, 18, ptsEllipse(456, 760, 32, 14, 0, PI2, 20)),      // foot L
      S(SKY, 18, ptsEllipse(744, 760, 32, 14, 0, PI2, 20)),      // foot R
      S(INK, 13, ptsEllipse(568, 198, 14, 14, 0, PI2, 18)),      // eye L
      S(INK, 13, ptsEllipse(634, 198, 14, 14, 0, PI2, 18)),      // eye R
      S(INK, 15, dot(571, 201)),                           // pupils
      S(INK, 15, dot(637, 201)),
      S(INK, 13, ptsPoly([[556, 242], [571, 256], [586, 242], [601, 256],
                          [616, 242], [631, 256], [646, 242]], 2)),          // zigzag mouth
      S(SKY, 14, ptsLine(600, 118, 600, 88)),              // antenna
      S(CORAL, 14, ptsEllipse(600, 74, 14, 14, 0, PI2, 18)),
      S(INK, 12, ptsEllipse(524, 200, 10, 10, 0, PI2, 14)),      // ear bolt L
      S(INK, 12, ptsEllipse(676, 200, 10, 10, 0, PI2, 14))       // ear bolt R
    ]
  },
  {
    name: 'Plum',
    strokes: [
      S(BERRY, 26, ptsEllipse(600, 388, 172, 252)),              // big egg body
      S(SUN, 15, ptsPoly([[548, 152], [536, 100], [580, 142], [548, 152]])),  // horn L
      S(SUN, 15, ptsPoly([[652, 152], [664, 100], [620, 142], [652, 152]])),  // horn R
      S(BERRY, 22, ptsQuad([472, 398], [398, 468], [352, 552])), // arm L
      S(BERRY, 22, ptsQuad([728, 398], [802, 468], [848, 552])), // arm R
      S(BERRY, 18, ptsEllipse(344, 556, 19, 19, 0, PI2, 20)),    // hand L
      S(BERRY, 18, ptsEllipse(856, 556, 19, 19, 0, PI2, 20)),    // hand R
      S(BERRY, 22, ptsQuad([548, 612], [500, 690], [464, 748])), // leg L
      S(BERRY, 22, ptsQuad([652, 612], [700, 690], [736, 748])), // leg R
      S(BERRY, 18, ptsEllipse(454, 762, 30, 14, 0, PI2, 20)),    // foot L
      S(BERRY, 18, ptsEllipse(746, 762, 30, 14, 0, PI2, 20)),    // foot R
      S(INK, 14, ptsEllipse(560, 208, 17, 17, 0, PI2, 20)),      // eye L (big)
      S(INK, 14, ptsEllipse(650, 200, 13, 13, 0, PI2, 18)),      // eye R (small)
      S(INK, 16, dot(564, 212)),
      S(INK, 14, dot(653, 203)),
      S(INK, 14, ptsEllipse(602, 248, 56, 46, Math.PI * 0.14, Math.PI * 0.86, 22)), // smile
      S(PINK, 12, ptsEllipse(512, 262, 11, 11, 0, PI2, 16)),     // cheek L
      S(PINK, 12, ptsEllipse(690, 262, 11, 11, 0, PI2, 16)),     // cheek R
      S(SUN, 15, ptsPoly([[600, 407], [615, 430], [638, 445], [615, 460],
                          [600, 483], [585, 460], [562, 445], [585, 430], [600, 407]], 3)) // belly star
    ]
  },
  {
    name: 'Flop',
    strokes: [
      S(PINK, 20, ptsEllipse(545, 78, 17, 48, 0, PI2, 26, 4, -0.26)),  // ear L
      S(PINK, 20, ptsEllipse(657, 78, 17, 48, 0, PI2, 26, 4, 0.26)),   // ear R
      S(PINK, 26, ptsEllipse(600, 200, 95, 80)),                 // head
      S(PINK, 16, ptsLine(585, 272, 583, 306)),                  // neck
      S(PINK, 16, ptsLine(617, 272, 619, 306)),
      S(PINK, 26, ptsEllipse(600, 452, 150, 142)),               // body
      S(PINK, 22, ptsQuad([478, 382], [400, 444], [352, 554])),  // arm L
      S(PINK, 22, ptsQuad([722, 382], [800, 444], [848, 554])),  // arm R
      S(PINK, 18, ptsEllipse(344, 558, 19, 19, 0, PI2, 20)),     // hand L
      S(PINK, 18, ptsEllipse(856, 558, 19, 19, 0, PI2, 20)),     // hand R
      S(PINK, 22, ptsQuad([545, 585], [500, 674], [464, 746])),  // leg L
      S(PINK, 22, ptsQuad([655, 585], [700, 674], [736, 746])),  // leg R
      S(PINK, 18, ptsEllipse(454, 760, 31, 14, 0, PI2, 20)),     // foot L
      S(PINK, 18, ptsEllipse(746, 760, 31, 14, 0, PI2, 20)),     // foot R
      S(INK, 15, ptsEllipse(600, 196, 26, 26, 0, PI2, 26)),      // one big eye
      S(INK, 20, dot(606, 200)),                                 // pupil
      S(INK, 13, ptsEllipse(602, 236, 40, 34, Math.PI * 0.16, Math.PI * 0.84, 20)), // smile
      S(CORAL, 15, ptsEllipse(600, 428, 16, 16, 0, PI2, 20))     // belly button flower
    ]
  }
];

/* Flatten a doodle into ordered crayon segments, then paint them —
   instantly or as a quick "draws itself" animation. */
function paintDoodle(idx, animate) {
  const segs = [];
  DOODLES[idx].strokes.forEach(st => {
    for (let i = 1; i < st.p.length; i++) {
      segs.push({ c: st.c, s: st.s,
                  x0: st.p[i - 1].x, y0: st.p[i - 1].y,
                  x1: st.p[i].x,     y1: st.p[i].y });
    }
  });

  const prev = { c: state.color, s: state.size, e: state.erasing };
  state.erasing = false;
  state.painting = true;
  let i = 0;
  const PER_FRAME = animate ? 7 : segs.length;

  (function step() {
    const end = Math.min(i + PER_FRAME, segs.length);
    for (; i < end; i++) {
      const g = segs[i];
      state.color = g.c;
      state.size = g.s;
      crayonSegment(g.x0, g.y0, g.x1, g.y1);
    }
    if (i < segs.length) {
      requestAnimationFrame(step);
    } else {
      state.color = prev.c;
      state.size = prev.s;
      state.erasing = prev.e;
      state.painting = false;
      state.hasDrawn = true;
    }
  })();
}

/* ---------- pointer drawing (mouse + touch + pen) ---------- */
canvas.addEventListener('pointerdown', (e) => {
  if (state.busy || state.painting || state.activeId !== null) return;
  e.preventDefault();
  state.activeId = e.pointerId;
  state.drawing = true;
  canvas.setPointerCapture(e.pointerId);
  pushUndo();
  const p = pointerPos(e);
  state.last = p;
  crayonDot(p);
  state.hasDrawn = true;
});

canvas.addEventListener('pointermove', (e) => {
  moveRing(e);
  if (!state.drawing || e.pointerId !== state.activeId) return;
  e.preventDefault();
  const p = pointerPos(e);
  const dx = p.x - state.last.x;
  const dy = p.y - state.last.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.min(10, Math.floor(dist / 4)));
  let lx = state.last.x, ly = state.last.y;
  for (let i = 1; i <= steps; i++) {
    const nx = state.last.x + (dx * i) / steps;
    const ny = state.last.y + (dy * i) / steps;
    crayonSegment(lx, ly, nx, ny);
    lx = nx; ly = ny;
  }
  state.last = p;
});

function endStroke(e) {
  if (e.pointerId === state.activeId) {
    state.drawing = false;
    state.activeId = null;
  }
}
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('pointerleave', () => { ring.style.display = 'none'; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------- brush ring cursor ---------- */
function moveRing(e) {
  const r = canvas.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom || state.busy) {
    ring.style.display = 'none';
    return;
  }
  const scale = r.width / LOGICAL_W;
  const d = (state.erasing ? state.size * 1.6 : state.size) * scale;
  ring.style.width = d + 'px';
  ring.style.height = d + 'px';
  ring.style.left = (e.clientX - r.left) + 'px';
  ring.style.top = (e.clientY - r.top) + 'px';
  ring.style.borderColor = state.erasing ? 'rgba(43,33,24,.5)' : state.color;
  ring.style.display = 'block';
}

/* ---------- toolbar: colors ---------- */
const COLORS = ['#2B2118', '#FF6B57', '#FF9F43', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8', '#FF8FAB'];
const colorNames = ['Ink black', 'Coral red', 'Orange', 'Sun yellow', 'Leaf green', 'Sky blue', 'Berry purple', 'Pink'];

COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.style.background = c;
  b.title = colorNames[i];
  b.setAttribute('aria-label', colorNames[i]);
  if (c === state.color) b.classList.add('sel');
  b.addEventListener('click', () => {
    state.color = c;
    state.erasing = false;
    refreshTools();
  });
  paletteEl.appendChild(b);
});

/* ---------- toolbar: sizes ---------- */
const SIZES = [
  { label: 'Small crayon',  v: 12, dot: 9 },
  { label: 'Medium crayon', v: 24, dot: 16 },
  { label: 'Big crayon',    v: 42, dot: 24 }
];
SIZES.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'size-btn';
  b.title = s.label;
  b.setAttribute('aria-label', s.label);
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.width = s.dot + 'px';
  dot.style.height = s.dot + 'px';
  b.appendChild(dot);
  if (s.v === state.size) b.classList.add('sel');
  b.addEventListener('click', () => {
    state.size = s.v;
    state.erasing = false;
    refreshTools();
  });
  b._size = s.v;
  sizesEl.appendChild(b);
});

function refreshTools() {
  paletteEl.querySelectorAll('.swatch').forEach((s, i) => {
    s.classList.toggle('sel', COLORS[i] === state.color && !state.erasing);
  });
  sizesEl.querySelectorAll('.size-btn').forEach((b) => {
    b.classList.toggle('sel', b._size === state.size);
    b.querySelector('.dot').style.background = state.erasing ? 'var(--soft)' : state.color;
  });
  eraserBtn.classList.toggle('active', state.erasing);
}

/* ---------- toolbar: eraser / undo / clear ---------- */
eraserBtn.addEventListener('click', () => {
  state.erasing = !state.erasing;
  refreshTools();
});

undoBtn.addEventListener('click', () => {
  if (!undoStack.length) return;
  const img = undoStack.pop();
  ctx.putImageData(img, 0, 0);
});

clearBtn.addEventListener('click', () => {
  pushUndo();
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
});

/* ---------- mini toast ("draw first!") ---------- */
let miniToastTimer = null;
function showMiniToast(msg) {
  miniToast.textContent = msg;
  miniToast.classList.add('show');
  clearTimeout(miniToastTimer);
  miniToastTimer = setTimeout(() => miniToast.classList.remove('show'), 1600);
}

/* ============================================================
   Simulated AI rigging sequence
   ============================================================ */
const SVG_NS = 'http://www.w3.org/2000/svg';

/* Hardcoded joints in canvas space (1200 x 800) */
const JOINTS = {
  head:  [600, 205],
  neck:  [600, 330],
  chest: [600, 430],
  hips:  [600, 560],
  sL:    [470, 385], eL: [385, 468], hL: [338, 566],
  sR:    [730, 385], eR: [815, 468], hR: [862, 566],
  pL:    [536, 592], kL: [486, 690], fL: [452, 764],
  pR:    [664, 592], kR: [714, 690], fR: [748, 764]
};

const RIG_GROUPS = {
  arms: {
    bones: [['neck','sL'], ['sL','eL'], ['eL','hL'], ['neck','sR'], ['sR','eR'], ['eR','hR']],
    dots:  ['sL','eL','hL','sR','eR','hR']
  },
  legs: {
    bones: [['hips','pL'], ['pL','kL'], ['kL','fL'], ['hips','pR'], ['pR','kR'], ['kR','fR']],
    dots:  ['pL','kL','fL','pR','kR','fR']
  },
  core: {
    bones: [['head','neck'], ['neck','chest'], ['chest','hips']],
    dots:  ['head','neck','chest','hips']
  }
};

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function buildRig() {
  let order = 0;
  for (const name in RIG_GROUPS) {
    const def = RIG_GROUPS[name];
    const g = svgEl('g', { 'class': 'rig-part', 'data-group': name });

    def.bones.forEach(([a, b]) => {
      const [x1, y1] = JOINTS[a];
      const [x2, y2] = JOINTS[b];
      const bone = svgEl('g', { 'class': 'rig-pop' });
      bone.style.animationDelay = (order++ * 70) + 'ms';
      bone.appendChild(svgEl('line', { x1, y1, x2, y2, 'class': 'rig-bone-under' }));
      bone.appendChild(svgEl('line', { x1, y1, x2, y2, 'class': 'rig-bone-over' }));
      g.appendChild(bone);
    });

    def.dots.forEach((j) => {
      const [cx, cy] = JOINTS[j];
      const dot = svgEl('circle', {
        cx, cy,
        r: j === 'head' ? 20 : 16,
        'class': 'rig-dot rig-pop' + (j === 'head' ? ' head' : '')
      });
      dot.style.animationDelay = (order++ * 70) + 'ms';
      g.appendChild(dot);
    });

    rigSvg.appendChild(g);
  }
}
buildRig();

function revealGroup(name) {
  const g = rigSvg.querySelector(`g[data-group="${name}"]`);
  if (g) g.classList.add('show');
}

/* ---------- toasts ---------- */
const CHECK_SVG = '<svg class="check" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#4FB06D"/><path d="M6 10.4l2.8 2.8L14.2 7.4" fill="none" stroke="#FFFDF6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function addToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  const ic = document.createElement('span');
  ic.className = 'dot-spin';
  const label = document.createElement('span');
  label.textContent = text;
  t.appendChild(ic);
  t.appendChild(label);
  toastsEl.appendChild(t);
  return t;
}

function doneToast(t) {
  if (!t) return;
  t.classList.add('done');
  const spin = t.querySelector('.dot-spin');
  if (spin) spin.outerHTML = CHECK_SVG;
}

/* ---------- sparkles ---------- */
let sparkleTimer = null;
function spawnSparkle() {
  const s = document.createElement('span');
  s.className = 'sparkle';
  s.style.left = (4 + Math.random() * 88) + '%';
  s.style.top = (4 + Math.random() * 84) + '%';
  const sc = 0.6 + Math.random() * 1.1;
  s.style.width = (18 * sc) + 'px';
  s.style.height = (18 * sc) + 'px';
  if (Math.random() < 0.3) s.style.background = '#FF6B57';
  sparkleBox.appendChild(s);
  setTimeout(() => s.remove(), 950);
}
function startSparkles() {
  stopSparkles();
  sparkleTimer = setInterval(spawnSparkle, 210);
}
function stopSparkles() {
  clearInterval(sparkleTimer);
  sparkleTimer = null;
}
function burstSparkles(n) {
  for (let i = 0; i < n; i++) setTimeout(spawnSparkle, i * 60);
}

/* ---------- sequence driver ---------- */
let seqToken = 0;

async function runAISequence() {
  const my = ++seqToken;
  const alive = () => my === seqToken;

  state.busy = true;
  doneBtn.disabled = true;
  ring.style.display = 'none';

  // reset overlay state
  toastsEl.innerHTML = '';
  sparkleBox.innerHTML = '';
  rigSvg.classList.remove('awake');
  rigSvg.querySelectorAll('.rig-part').forEach(g => g.classList.remove('show'));
  overlay.classList.remove('hidden', 'fade');
  scanLine.classList.remove('run');
  void scanLine.offsetWidth;               // restart the sweep animation
  scanLine.classList.add('run');
  startSparkles();

  const t1 = addToast('Reading your drawing…');
  await sleep(1700); if (!alive()) return;
  doneToast(t1);

  const t2 = addToast('Finding the arms…');
  revealGroup('arms');
  await sleep(1400); if (!alive()) return;
  doneToast(t2);

  const t3 = addToast('Finding the legs…');
  revealGroup('legs');
  await sleep(1400); if (!alive()) return;
  doneToast(t3);

  const t4 = addToast('Waking them up…');
  revealGroup('core');
  rigSvg.classList.add('awake');
  burstSparkles(12);
  await sleep(1700); if (!alive()) return;
  doneToast(t4);

  await sleep(500); if (!alive()) return;
  finishAI();
}

function finishAI() {
  ++seqToken;                              // cancels any in-flight sequence
  stopSparkles();
  overlay.classList.add('fade');
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.classList.remove('fade');
  }, 420);
  state.busy = false;
  doneBtn.disabled = false;
  showPayoff();
}

skipAiBtn.addEventListener('click', finishAI);

/* ---------- done button ---------- */
doneBtn.addEventListener('click', () => {
  if (state.busy || state.painting) return;
  if (!canvasHasInk()) {
    doneBtn.classList.remove('shake');
    void doneBtn.offsetWidth;
    doneBtn.classList.add('shake');
    showMiniToast('Draw a friend first!');
    return;
  }
  runAISequence();
});

/* ============================================================
   Payoff — Storywood scene
   ============================================================ */
/* Crop the canvas to the inked bounding box so the character
   stands framed nicely no matter where it was drawn. */
function captureDrawing() {
  const w = canvas.width, h = canvas.height;
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas.toDataURL('image/png');   // blank fallback
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06) + 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);
  const crop = document.createElement('canvas');
  crop.width = maxX - minX;
  crop.height = maxY - minY;
  crop.getContext('2d').drawImage(
    canvas,
    minX, minY, crop.width, crop.height,
    0, 0, crop.width, crop.height
  );
  return crop.toDataURL('image/png');
}

function showPayoff() {
  heroImg.src = captureDrawing();
  studioSec.hidden = true;
  payoffSec.hidden = false;
  spawnConfetti();
  payoffSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const CONFETTI_COLORS = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8', '#FF8FAB'];
function spawnConfetti() {
  for (let i = 0; i < 18; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.left = (3 + Math.random() * 94) + '%';
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const w = 8 + Math.random() * 8;
    c.style.width = w + 'px';
    c.style.height = (w * (0.8 + Math.random() * 0.8)) + 'px';
    c.style.animationDuration = (1.5 + Math.random() * 1.3) + 's';
    c.style.animationDelay = (Math.random() * 0.5) + 's';
    sceneCard.appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}

/* ---------- name the friend → caption + gem letter ---------- */
nameInput.addEventListener('input', () => {
  const raw = nameInput.value.trim();
  const name = raw.length ? raw : '';
  capName.textContent = name || 'a new friend';

  const firstAlpha = (name.match(/[A-Za-z]/) || [null])[0];
  const letter = firstAlpha ? firstAlpha.toUpperCase() : 'F';
  gemLetterSvg.textContent = letter;
  gemLetterLabel.textContent = letter;
  gemWord.textContent = name || 'Friend';
});

/* ---------- draw again ---------- */
againBtn.addEventListener('click', () => {
  payoffSec.hidden = true;
  studioSec.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- pre-drawn friend shortcuts (presenter helpers) ---------- */
let doodleIndex = 0;

friendBtn.addEventListener('click', () => {
  if (state.busy || state.painting) return;
  doodleIndex = (doodleIndex + 1) % DOODLES.length;
  pushUndo();
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
  paintDoodle(doodleIndex, true);
  showMiniToast(`Meet ${DOODLES[doodleIndex].name}!`);
});

magicBtn.addEventListener('click', () => {
  if (state.busy || state.painting) return;
  if (!canvasHasInk()) paintDoodle(doodleIndex, false);
  runAISequence();
});

/* init */
refreshTools();
pushUndo();                    // blank baseline, so undo can remove the friend
paintDoodle(doodleIndex, true); // friend draws itself the moment the page opens
