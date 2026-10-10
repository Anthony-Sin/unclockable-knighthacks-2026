/* ============================================================
   The Three Little Pigs · Rough Canvas — maker.js
   Beat 0: the kid crayons their hero on a paper canvas.
   Strokes replay as wobbly rough.js curves, then crop → hero.
   ============================================================ */
'use strict';
(function () {
const { mulberry32, pick, rr, PO, INK } = window.RH;

const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
let cv, ctx2d, heroCv;
let strokes = [], curStroke = null, selColor = CRAYONS[1];
let busy = false;

function sizeCv(c, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.max(2, Math.round(w * dpr));
  c.height = Math.max(2, Math.round(h * dpr));
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  return x;
}

function redraw() {
  if (!ctx2d) return;
  const w = cv.clientWidth || 420, h = cv.clientHeight || 250;
  ctx2d.clearRect(0, 0, w, h);
  const rc = rough.canvas(cv);
  strokes.forEach((st, i) => {
    if (st.op) { st.op(rc); return; }
    if (st.pts.length < 2) {
      rc.circle(st.pts[0][0], st.pts[0][1], 7, { stroke: st.c, strokeWidth: 3, fill: st.c, fillStyle: 'solid', seed: 1000 + i });
    } else {
      rc.curve(st.pts, { stroke: st.c, strokeWidth: 13, roughness: 1.9, seed: 1000 + i });
    }
  });
}

function pos(e) {
  const r = cv.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function clear() {
  strokes = [];
  if (ctx2d) ctx2d.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
}

/* the auto-hero: a blob monster painted stroke-by-stroke */
function surpriseOps() {
  const w = cv.clientWidth || 420, h = cv.clientHeight || 250;
  const r = mulberry32(((Math.random() * 0x7ffffffe) | 0) + 7);
  const c = pick(r, [CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
  const lite = { '#FF6B57': '#FFC9BF', '#4FB06D': '#B7E6C3', '#5DA9E9': '#C7E6FA', '#B565D8': '#DCC3F2' }[c];
  const cx = w / 2, cy = h / 2 + 12;
  const bw = rr(r, 120, 150), bh = rr(r, 106, 126);
  return [
    (rc) => rc.ellipse(cx, cy, bw, bh, {
      stroke: c, strokeWidth: 12, roughness: 2.2, fill: c,
      fillStyle: 'hachure', hachureGap: 8, fillWeight: 1.6, seed: 555 }),
    (rc) => {
      rc.curve([[cx, cy - bh / 2 + 6], [cx - 6, cy - bh / 2 - 18], [cx + 4, cy - bh / 2 - 30]],
        { stroke: c, strokeWidth: 7, roughness: 2.2, seed: 556 });
      rc.circle(cx + 4, cy - bh / 2 - 34, 13, { fill: '#FFC53D', fillStyle: 'solid', stroke: INK, strokeWidth: 2.6, seed: 557 });
    },
    (rc) => {
      rc.ellipse(cx - bw * .18, cy - bh * .18, 26, 30, { fill: '#FFFDF6', fillStyle: 'solid', stroke: INK, strokeWidth: 3.4, seed: 558 });
      rc.ellipse(cx + bw * .22, cy - bh * .14, 18, 22, { fill: '#FFFDF6', fillStyle: 'solid', stroke: INK, strokeWidth: 3, seed: 559 });
    },
    (rc) => {
      rc.circle(cx - bw * .18 + 3, cy - bh * .18 + 2, 8, { fill: INK, fillStyle: 'solid', stroke: 'none', seed: 560 });
      rc.circle(cx + bw * .22 + 2, cy - bh * .14 + 1, 5.5, { fill: INK, fillStyle: 'solid', stroke: 'none', seed: 561 });
    },
    (rc) => {
      rc.ellipse(cx + 2, cy + bh * .2, bw * .5, bh * .4, { fill: lite, fillStyle: 'solid', stroke: INK, strokeWidth: 2.4, seed: 562 });
      rc.arc(cx + 2, cy + 6, bw * .42, bh * .3, Math.PI * 0.18, Math.PI * 0.82, false, { stroke: INK, strokeWidth: 5, roughness: 2.4, seed: 563 });
      rc.circle(cx - bw * .4, cy + 2, 8, { fill: '#FF6B57', fillStyle: 'solid', stroke: 'none', seed: 564 });
      rc.circle(cx + bw * .42, cy + 4, 6.5, { fill: '#FF6B57', fillStyle: 'solid', stroke: 'none', seed: 565 });
    },
    (rc) => {
      rc.ellipse(cx - bw * .26, cy + bh * .46, bw * .3, 16, { fill: '#6B4A2A', fillStyle: 'solid', stroke: INK, strokeWidth: 2.6, seed: 566 });
      rc.ellipse(cx + bw * .26, cy + bh * .46, bw * .3, 16, { fill: '#6B4A2A', fillStyle: 'solid', stroke: INK, strokeWidth: 2.6, seed: 567 });
    },
  ];
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
async function surprise(fast) {
  if (busy) return;
  busy = true;
  clear();
  for (const op of surpriseOps()) {
    strokes.push({ op });
    redraw();
    await sleep(fast ? 80 : 230);
  }
  busy = false;
}

/* crop the drawing — it becomes the in-story hero */
function cropHero() {
  const w = cv.clientWidth || 420, h = cv.clientHeight || 250;
  const data = ctx2d.getImageData(0, 0, cv.width, cv.height);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y += 2) {
    for (let x = 0; x < cv.width; x += 2) {
      if (data.data[(y * cv.width + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < 60) return false;
  const pad = 16;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(cv.width, x1 + pad); y1 = Math.min(cv.height, y1 + pad);
  const sw = x1 - x0, shh = y1 - y0;
  const scale = Math.min(146 / sw, 146 / shh);
  const hctx = sizeCv(heroCv, 150, 150);
  hctx.clearRect(0, 0, 150, 150);
  const dw = sw * scale, dh = shh * scale;
  hctx.drawImage(cv, x0, y0, sw, shh, (150 - dw) / 2, 146 - dh, dw, dh);
  return true;
}

function init(makerCv, heroCanvas, onSwatch) {
  cv = makerCv; heroCv = heroCanvas;
  const swatchBox = document.getElementById('swatches');
  CRAYONS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (i === 1 ? ' sel' : '');
    b.style.background = c;
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', 'crayon ' + (i + 1));
    b.addEventListener('click', () => {
      selColor = c;
      swatchBox.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
      b.classList.add('sel');
      if (onSwatch) onSwatch(c);
    });
    swatchBox.appendChild(b);
  });
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    curStroke = { c: selColor, pts: [pos(e)] };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!curStroke) return;
    const [x, y] = pos(e);
    const pts = curStroke.pts;
    const [lx, ly] = pts[pts.length - 1];
    if (Math.hypot(x - lx, y - ly) < 3) return;
    pts.push([x, y]);
    ctx2d.strokeStyle = curStroke.c;
    ctx2d.lineWidth = 13;
    ctx2d.lineCap = ctx2d.lineJoin = 'round';
    ctx2d.globalAlpha = .92;
    ctx2d.beginPath(); ctx2d.moveTo(lx, ly); ctx2d.lineTo(x, y); ctx2d.stroke();
    ctx2d.globalAlpha = 1;
  });
  const end = () => {
    if (!curStroke) return;
    strokes.push(curStroke);
    curStroke = null;
    redraw();
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  requestAnimationFrame(() => {
    ctx2d = sizeCv(cv, cv.clientWidth || 420, cv.clientHeight || 250);
    redraw();
  });
}

function resize() {
  if (!cv) return;
  ctx2d = sizeCv(cv, cv.clientWidth || 420, cv.clientHeight || 250);
  redraw();
}

window.HeroMaker = { init, clear, surprise, cropHero, resize,
  get hasDrawing() { return strokes.length > 0; },
  get busy() { return busy; } };
})();
