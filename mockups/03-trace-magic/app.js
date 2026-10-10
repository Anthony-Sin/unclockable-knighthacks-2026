'use strict';
/* Trace & Spell — trace letters with a pointer; each finished word moves the story.
   Hardcoded front-end demo. The "AI read" moment is simulated. */

const SVGNS = 'http://www.w3.org/2000/svg';
const COVER_R = 30;        // svg units: pointer this close to a sample covers it
const STRAY_R = 60;        // further than this from the letter = straying
const SPACING = 7;         // sample spacing along the guide path
const COMPLETE_AT = 0.92;  // coverage fraction that counts as "letter done"

/* ---------- hand-authored letter guides (viewBox 0 0 200 260)
   baseline y=190 · x-height y=110 · ascender y=55 · descender y=235 ---------- */
const LETTERS = {
  m: ['M 40 115 L 40 190 L 40 120 C 40 100 55 94 68 99 C 84 105 90 116 90 132 L 90 190 L 90 132 C 90 104 104 95 118 100 C 134 106 140 118 140 134 L 140 190'],
  a: ['M 122 112 C 114 96 86 92 66 104 C 46 116 42 150 58 172 C 74 194 114 196 122 168 L 122 112 L 122 190'],
  p: ['M 60 108 L 60 232 L 60 116 C 62 100 84 96 102 104 C 128 114 134 140 124 160 C 114 182 80 186 64 168'],
  k: ['M 58 52 L 58 190',
      'M 108 112 L 60 148 L 118 190'],
  e: ['M 54 140 L 120 140 C 124 118 108 100 86 100 C 60 100 48 122 50 146 C 52 172 74 192 100 190 C 116 188 126 180 130 170'],
  y: ['M 56 110 C 58 148 64 180 88 186 C 110 191 124 174 126 150 L 126 110 L 126 198 C 126 226 112 240 90 236 C 76 233 70 226 70 216'],
  s: ['M 124 104 C 114 92 88 90 74 100 C 58 112 62 126 84 132 C 110 139 126 148 124 166 C 122 186 98 196 78 190 C 62 185 56 176 56 166'],
  u: ['M 58 110 C 60 150 66 182 90 187 C 112 191 126 174 126 148 L 126 110 L 126 190'],
  n: ['M 58 112 L 58 190 L 58 118 C 58 100 74 93 90 99 C 110 106 118 120 118 138 L 118 190'],
};

const WORDS = [
  {
    word: 'map',
    prompt: 'Pip is lost in the Storywood! He needs a <b>map</b>. Trace each letter to write the word.',
    chip: 'nice letters!',
    beat: { title: 'Pip found the map!', sub: 'The dotted trail leads to a whispering old tree.', scene: 'map' },
  },
  {
    word: 'key',
    prompt: 'A tiny door glows inside the tree. Pip needs a <b>key</b> — write it to open the door!',
    chip: 'neat and tidy!',
    beat: { title: 'The key fits the tree-door!', sub: 'Click! The little door swings wide open.', scene: 'key' },
  },
  {
    word: 'sun',
    prompt: 'The woods are dark and sleepy. Write <b>sun</b> to wake up the morning!',
    chip: 'beautifully round!',
    beat: { title: 'Morning came to Storywood!', sub: 'Warm light spills over the hills. Time for gems!', scene: 'sun' },
  },
];

const STRAY_LINES = [
  'Stay on the dashed line!',
  'Almost — follow the dots!',
  'Wobbly is okay — keep going!',
  'Come back to the letter!',
];

/* ---------- dom ---------- */
const $ = id => document.getElementById(id);
const svg = $('traceSvg');
const guideLayer = $('guideLayer'), fillLayer = $('fillLayer');
const dotLayer = $('dotLayer'), inkLayer = $('inkLayer'), covCircles = $('covCircles');
const stageCard = $('stageCard'), stageTitle = $('stageTitle'), svgBox = $('svgBox');
const coverBar = $('coverBar'), coverPct = $('coverPct'), wordBar = $('wordBar');
const letterChips = $('letterChips'), wordCount = $('wordCount'), wordName = $('wordName');
const promptText = $('promptText'), toast = $('toast'), readout = $('readout');
const scan = $('scan'), sparkleSlot = $('sparkleSlot'), beatsEl = $('beats');
const finale = $('finale'), tipDot = $('tipDot');
const pen = $('pen'), autoBtn = $('autoBtn');

function el(tag, attrs) {
  const n = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/* ---------- svg art ---------- */
function pipSVG() {
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M40 34 L33 14 L53 26 Z" fill="#FF6B57" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
    <path d="M77 28 L89 10 L93 33 Z" fill="#FF6B57" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
    <path d="M24 66 C16 62 12 54 15 47" fill="none" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M96 66 C104 61 107 53 104 46" fill="none" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M28 70 C24 46 44 28 62 30 C84 32 98 50 94 74 C91 94 74 104 56 102 C40 100 31 90 28 70 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M44 102 C44 110 50 113 56 109" fill="none" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M70 103 C72 111 79 112 83 107" fill="none" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="62" cy="58" r="14" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>
    <circle cx="64" cy="60" r="6" fill="#2B2118"/>
    <circle cx="66.5" cy="57" r="2.2" fill="#FFFDF6"/>
    <path d="M50 78 C55 85 68 86 74 78" fill="none" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="45" cy="70" r="4" fill="#FF6B57" opacity=".55"/>
    <circle cx="82" cy="70" r="4" fill="#FF6B57" opacity=".55"/>
  </svg>`;
}

function gemSVG() {
  return `<svg viewBox="0 0 140 140" aria-hidden="true">
    <path d="M70 12 L116 40 L126 82 L70 128 L14 82 L24 40 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>
    <path d="M24 40 L70 64 L116 40 L70 12 Z" fill="#FFE08A"/>
    <path d="M24 40 L70 64 L116 40 M70 64 L70 128 M70 64 L14 82 M70 64 L126 82" fill="none" stroke="#2B2118" stroke-width="2.5" opacity=".55"/>
    <path d="M14 82 L70 128 L60 84 Z" fill="#F0A92E" opacity=".7"/>
    <path d="M30 22 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6 z" fill="#FFFDF6"/>
    <path d="M112 92 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#FFFDF6"/>
  </svg>`;
}

const SCENES = {
  map: () => `<svg viewBox="0 0 220 150" aria-hidden="true">
    <rect x="16" y="22" width="188" height="106" rx="12" fill="#FFEFC7" stroke="#2B2118" stroke-width="3"/>
    <rect x="27" y="33" width="166" height="84" rx="8" fill="none" stroke="#DCC49A" stroke-width="2.5" stroke-dasharray="7 6"/>
    <path d="M42 104 C 68 96 76 60 110 64 C 144 68 152 94 182 46" fill="none" stroke="#B565D8" stroke-width="4.5" stroke-dasharray="9 8" stroke-linecap="round"/>
    <circle cx="42" cy="104" r="7" fill="#4FB06D" stroke="#2B2118" stroke-width="3"/>
    <path d="M172 38 L190 56 M190 38 L172 56" stroke="#FF6B57" stroke-width="6" stroke-linecap="round"/>
    <path d="M54 112 l8 -15 8 15 z" fill="#4FB06D" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M62 112 v7" stroke="#2B2118" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M142 112 l7 -13 7 13 z" fill="#4FB06D" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M149 112 v7" stroke="#2B2118" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  key: () => `<svg viewBox="0 0 220 150" aria-hidden="true">
    <path d="M52 64 C38 46 52 24 76 26 C84 10 112 8 124 24 C144 16 162 34 156 52 C170 62 160 82 140 80 L72 84 C56 86 46 76 52 64 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M8 144 Q 70 134 212 144" fill="none" stroke="#4FB06D" stroke-width="4" stroke-linecap="round"/>
    <path d="M92 82 L86 144 L126 144 L120 82 Z" fill="#9A6B47" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M95 144 L95 116 C95 102 119 102 119 116 L119 144 Z" fill="#5DA9E9" stroke="#2B2118" stroke-width="3"/>
    <circle cx="114" cy="130" r="3" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/>
    <g transform="translate(152,96) rotate(18)">
      <circle cx="0" cy="0" r="9" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>
      <circle cx="0" cy="0" r="3" fill="#FFF8EC"/>
      <rect x="7" y="-3.5" width="27" height="7" rx="3" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>
      <rect x="25" y="2" width="5" height="9" rx="2" fill="#FFC53D" stroke="#2B2118" stroke-width="2.5"/>
      <rect x="31" y="2" width="5" height="7" rx="2" fill="#FFC53D" stroke="#2B2118" stroke-width="2.5"/>
    </g>
    <path d="M140 66 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#FFC53D"/>
    <path d="M170 120 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#FFC53D"/>
  </svg>`,
  sun: () => `<svg viewBox="0 0 220 150" aria-hidden="true">
    <g stroke="#2B2118" stroke-width="3.5" stroke-linecap="round">
      <path d="M110 10 L110 22"/><path d="M140 26 L148 18"/><path d="M150 56 L162 56"/>
      <path d="M80 26 L72 18"/><path d="M70 56 L58 56"/>
    </g>
    <circle cx="110" cy="56" r="26" fill="#FFC53D" stroke="#2B2118" stroke-width="3.5"/>
    <path d="M150 36 q6 -8 12 0 M166 28 q5 -7 11 0" fill="none" stroke="#2B2118" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M0 150 L0 108 Q 55 84 110 108 T 220 104 L220 150 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="3"/>
    <path d="M0 150 L0 128 Q 62 106 132 130 T 220 122 L220 150 Z" fill="#3F9B5C" stroke="#2B2118" stroke-width="3"/>
    <g transform="translate(44,128)">
      <path d="M0 0 v12" stroke="#2B2118" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="0" cy="-4" r="3.5" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/>
      <circle cx="-5" cy="-7" r="3" fill="#FF6B57" stroke="#2B2118" stroke-width="2"/>
      <circle cx="5" cy="-7" r="3" fill="#FF6B57" stroke="#2B2118" stroke-width="2"/>
    </g>
  </svg>`,
};

/* ---------- state ---------- */
let wi = 0, li = 0;
let samples = [], covered = 0;
let tracing = false, locked = false;
let inkPath = null, pts = [];
let lastStray = 0, toastTimer = 0, strayIdx = 0;
let timers = [];
let auto = false;                 // Pip's-pen auto-demo running
let currentGuides = [];           // guide <path> elements of the current letter

const PEN_SPEED = 78;             // svg units per second — a careful kid pace
const PEN_LIFT_MS = 320;          // pause between strokes

const T = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const frame = () => new Promise(r => requestAnimationFrame(r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const curWord = () => WORDS[wi];
const curChar = () => curWord().word[li];

/* ---------- helpers ---------- */
function toSvg(e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
const d2 = (p, x, y) => { const a = p.x - x, b = p.y - y; return a * a + b * b; };

function nearestDist(p) {
  let best = Infinity;
  for (const s of samples) {
    const v = d2(p, s.x, s.y);
    if (v < best) best = v;
  }
  return Math.sqrt(best);
}

function showToast(msg, good) {
  toast.textContent = msg;
  toast.classList.toggle('good', !!good);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

function stray() {
  stageCard.classList.remove('wiggle');
  void stageCard.offsetWidth;            // restart animation
  stageCard.classList.add('wiggle');
  showToast(STRAY_LINES[strayIdx++ % STRAY_LINES.length]);
}

function sparkBurst(n = 7) {
  const colors = ['#FFC53D', '#FF6B57', '#5DA9E9', '#B565D8', '#4FB06D'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = (12 + Math.random() * 76) + '%';
    s.style.top = (10 + Math.random() * 70) + '%';
    s.style.animationDelay = (Math.random() * 0.6) + 's';
    const sz = 16 + Math.random() * 16;
    s.innerHTML = `<svg width="${sz}" height="${sz}" viewBox="0 0 26 26"><path d="M13 1 L15.7 10.3 L25 13 L15.7 15.7 L13 25 L10.3 15.7 L1 13 L10.3 10.3 Z" fill="${colors[i % colors.length]}"/></svg>`;
    sparkleSlot.appendChild(s);
    setTimeout(() => s.remove(), 1800);
  }
}

function confetti(n = 46) {
  const colors = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    const sz = 6 + Math.random() * 8;
    c.style.left = Math.random() * 100 + 'vw';
    c.style.width = sz + 'px';
    c.style.height = sz * (0.6 + Math.random() * 0.9) + 'px';
    c.style.background = colors[i % colors.length];
    c.style.borderRadius = Math.random() < 0.4 ? '50%' : '3px';
    c.style.animationDuration = 2.4 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4600);
  }
}

/* ---------- word strip ---------- */
function renderChips() {
  const w = curWord().word;
  letterChips.innerHTML = '';
  [...w].forEach((ch, i) => {
    const c = document.createElement('span');
    c.className = 'chip' + (i < li ? ' done' : i === li ? ' cur' : '');
    c.textContent = ch;
    if (i < li) {
      c.innerHTML = `${ch}<span class="tick"><svg viewBox="0 0 12 12"><path d="M1.5 6.5 L4.5 9.5 L10.5 2.5" fill="none" stroke="#2B2118" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
    }
    letterChips.appendChild(c);
  });
  wordBar.style.width = (li / w.length) * 100 + '%';
}

/* ---------- letter build ---------- */
function buildLetter() {
  const ch = curChar();
  guideLayer.innerHTML = ''; fillLayer.innerHTML = '';
  dotLayer.innerHTML = ''; inkLayer.innerHTML = ''; covCircles.innerHTML = '';
  readout.innerHTML = '';
  samples = []; covered = 0; currentGuides = [];
  dotLayer.style.opacity = '1';
  fillLayer.setAttribute('mask', 'url(#covMask)');
  fillLayer.classList.remove('done');
  stageCard.classList.remove('locked');

  LETTERS[ch].forEach((d, si, arr) => {
    const guide = el('path', { class: 'guide', d });
    guideLayer.appendChild(guide);
    currentGuides.push(guide);
    fillLayer.appendChild(el('path', { class: 'fillstroke', d }));

    const len = guide.getTotalLength();
    const n = Math.max(8, Math.round(len / SPACING));
    for (let i = 0; i <= n; i++) {
      const p = guide.getPointAtLength(len * i / n);
      const c = el('circle', { cx: p.x, cy: p.y, r: 34, fill: '#fff' });
      c.style.display = 'none';
      covCircles.appendChild(c);
      samples.push({ x: p.x, y: p.y, cov: false, el: c });
    }

    // stroke-order start dot + direction arrow
    const s0 = guide.getPointAtLength(0);
    const s1 = guide.getPointAtLength(Math.min(26, len));
    const ang = Math.atan2(s1.y - s0.y, s1.x - s0.x) * 180 / Math.PI;
    const g = el('g');
    g.appendChild(el('circle', { class: 'startdot-ring', cx: s0.x, cy: s0.y, r: 13 }));
    g.appendChild(el('circle', { class: 'startdot', cx: s0.x, cy: s0.y, r: 10 }));
    if (arr.length > 1) {
      const t = el('text', { class: 'startnum', x: s0.x, y: s0.y + 0.5 });
      t.textContent = si + 1;
      g.appendChild(t);
    }
    const rad = ang * Math.PI / 180;
    g.appendChild(el('path', {
      class: 'startarrow',
      d: 'M -4 -7 L 8 0 L -4 7 Z',
      transform: `translate(${s0.x + Math.cos(rad) * 27} ${s0.y + Math.sin(rad) * 27}) rotate(${ang})`,
    }));
    dotLayer.appendChild(g);
  });

  stageTitle.textContent = `Trace the letter \u201C${ch}\u201D`;
  coverBar.style.width = '0%';
  coverPct.textContent = '0%';
  locked = false;
  renderChips();
}

/* ---------- tracing ---------- */
function moveTip(p) { tipDot.setAttribute('cx', p.x); tipDot.setAttribute('cy', p.y); }

/* shared ink trail — used by manual pointer and by Pip's pen */
function beginInk(p) {
  pts = [p];
  inkPath = el('path', { class: 'ink' });
  inkPath.setAttribute('d', `M ${p.x} ${p.y}`);
  inkLayer.appendChild(inkPath);
}
function extendInk(p) {
  if (!inkPath || !pts.length) return;
  const last = pts[pts.length - 1];
  if (d2(p, last.x, last.y) > 6) { pts.push(p); redrawInk(); }
}

function redrawInk() {
  if (!inkPath || pts.length === 0) return;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length < 3) {
    if (pts[1]) d += ` L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const l = pts[pts.length - 1];
    d += ` L ${l.x.toFixed(1)} ${l.y.toFixed(1)}`;
  }
  inkPath.setAttribute('d', d);
}

function check(p) {
  let hit = false;
  for (const s of samples) {
    if (!s.cov && d2(p, s.x, s.y) < COVER_R * COVER_R) {
      s.cov = true; s.el.style.display = 'block';
      covered++; hit = true;
    }
  }
  if (hit) {
    const pct = Math.round(covered / samples.length * 100);
    coverBar.style.width = pct + '%';
    coverPct.textContent = pct + '%';
    if (covered / samples.length >= COMPLETE_AT) completeLetter();
  }
}

svg.addEventListener('pointerdown', e => {
  if (locked || auto) return;
  e.preventDefault();
  tracing = true;
  try { svg.setPointerCapture(e.pointerId); } catch (err) { /* stale/synthetic pointer */ }
  const p = toSvg(e);
  tipDot.classList.add('on'); moveTip(p);
  beginInk(p);
  if (covered === 0 && nearestDist(p) > STRAY_R) showToast('Start at the glowing dot!');
  check(p);
});

svg.addEventListener('pointermove', e => {
  if (locked || auto || !tracing) return;
  e.preventDefault();
  const p = toSvg(e);
  moveTip(p);
  extendInk(p);
  check(p);
  const now = performance.now();
  if (!locked && nearestDist(p) > STRAY_R && now - lastStray > 1100) {
    lastStray = now;
    stray();
  }
});

['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev =>
  svg.addEventListener(ev, () => { tracing = false; tipDot.classList.remove('on'); })
);
svg.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- auto-demo: Pip's pen traces it for you ---------- */
function penSet(o) { pen.setAttribute('opacity', o); }
function movePen(x, y, ang) { pen.setAttribute('transform', `translate(${x} ${y}) rotate(${ang})`); }

function setAutoUI() {
  stageCard.classList.toggle('auto', auto);
  autoBtn.classList.toggle('on', auto);
  autoBtn.textContent = auto ? 'Stop the demo' : 'Watch Pip trace it';
}

/* Pen follows one guide path at kid pace, feeding points through the same
   coverage check() a finger would hit — so letters complete the usual way. */
async function traceStroke(guide) {
  const len = guide.getTotalLength();
  const s0 = guide.getPointAtLength(0);
  const s1 = guide.getPointAtLength(Math.min(6, len));
  movePen(s0.x, s0.y, Math.atan2(s1.y - s0.y, s1.x - s0.x) * 180 / Math.PI);
  beginInk(s0);
  let t = 0, last = performance.now();
  while (t < len && auto && !locked) {
    await frame();
    const now = performance.now();
    t += (now - last) / 1000 * PEN_SPEED;
    last = now;
    const tt = Math.min(t, len);
    const p0 = guide.getPointAtLength(tt);
    const p1 = guide.getPointAtLength(Math.min(tt + 4, len));
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
    const rad = ang * Math.PI / 180;
    const wob = Math.sin(tt * 0.05) * 2.2;            // little-kid wobble
    const px = p0.x - Math.sin(rad) * wob;
    const py = p0.y + Math.cos(rad) * wob;
    movePen(px, py, ang);
    extendInk({ x: px, y: py });
    check({ x: px, y: py });
  }
}

/* Driver: trace whatever letter is up, click through the AI moment's
   "next" buttons, stop when the finale shows or the presenter stops it. */
async function autoLoop() {
  while (auto) {
    if (!finale.hidden) break;                       // whole story done
    const btn = readout.querySelector('.next-btn');
    if (btn) {
      penSet(0);
      await sleep(1300);                             // let the story beat land
      if (!auto) break;
      btn.click();
      continue;
    }
    if (!locked && currentGuides.length) {
      for (const g of currentGuides) {
        if (!auto || locked) break;
        penSet(1);
        await traceStroke(g);
        penSet(0.25);                                // lift between strokes
        await sleep(PEN_LIFT_MS);
      }
      penSet(1);
      await sleep(140);
    } else {
      penSet(0);                                     // AI moment / build gap
      await sleep(140);
    }
  }
}

function stopAuto(msg) {
  auto = false;
  penSet(0);
  setAutoUI();
  if (msg) showToast(msg, true);
}

autoBtn.addEventListener('click', () => {
  if (auto) { stopAuto('Your turn — keep tracing!'); return; }
  if (!finale.hidden) $('againBtn').click();          // story finished → restart it
  if (!locked) buildLetter();                         // fresh letter for the pen
  auto = true;
  setAutoUI();
  showToast('Watch Pip\u2019s pen trace it!', true);
  autoLoop().then(() => stopAuto());
});

/* ---------- flow ---------- */
function completeLetter() {
  locked = true; tracing = false;
  tipDot.classList.remove('on');
  stageCard.classList.add('locked');
  fillLayer.removeAttribute('mask');
  fillLayer.classList.add('done');
  dotLayer.style.transition = 'opacity .3s';
  dotLayer.style.opacity = '0';
  coverBar.style.width = '100%';
  coverPct.textContent = '100%';
  sparkBurst(6);
  showToast(`Lovely \u201C${curChar()}\u201D!`, true);

  li++;
  renderChips();
  wordBar.style.width = (li / curWord().word.length) * 100 + '%';
  const doneChip = letterChips.children[li - 1];
  if (doneChip) doneChip.classList.add('pop');

  if (li < curWord().word.length) {
    T(() => buildLetter(), 850);
  } else {
    T(() => wordDone(), 850);
  }
}

function wordDone() {
  locked = true;
  stageCard.classList.add('locked');
  readout.innerHTML = `<span class="read-status">Reading your writing\u2026 <span class="read-dots"><i></i><i></i><i></i></span></span>`;
  scan.classList.add('on');
  sparkBurst(8);
  T(() => scan.classList.remove('on'), 2400);

  T(() => {
    const w = curWord();
    readout.innerHTML = `<span class="recog"><span class="ai-tag">AI</span><span><q>${w.word}</q><span class="good-job"> — ${w.chip}</span></span></span>`;
  }, 1800);

  T(() => {
    appendBeat(curWord().beat);
    const last = wi === WORDS.length - 1;
    const btn = document.createElement('button');
    btn.className = 'next-btn';
    btn.type = 'button';
    btn.textContent = last ? 'See the surprise \u2192' : 'Next word \u2192';
    btn.addEventListener('click', () => {
      if (last) showFinale();
      else { wi++; li = 0; startWord(); }
    });
    readout.appendChild(document.createElement('br'));
    readout.appendChild(btn);
  }, 2900);
}

function appendBeat(b) {
  const ph = $('beatPlaceholder');
  if (ph) ph.remove();
  const div = document.createElement('div');
  div.className = 'beat in';
  div.innerHTML = `<div class="scene">${SCENES[b.scene]()}</div><div><h3>${b.title}</h3><p>${b.sub}</p></div>`;
  beatsEl.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showFinale() {
  $('gemSlot').innerHTML = gemSVG();
  finale.hidden = false;
  finale.classList.add('in');
  confetti(54);
  finale.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function startWord() {
  clearTimers();
  const w = curWord();
  promptText.innerHTML = w.prompt;
  wordCount.textContent = `Word ${wi + 1} of ${WORDS.length}`;
  wordName.textContent = `\u201C${w.word}\u201D`;
  readout.innerHTML = '';
  locked = false;
  stageCard.classList.remove('locked');
  buildLetter();
}

$('eraseBtn').addEventListener('click', () => {
  if (locked) return;
  buildLetter();
  showToast('Fresh page — try again!');
});

$('againBtn').addEventListener('click', () => {
  wi = 0; li = 0;
  finale.hidden = true;
  finale.classList.remove('in');
  beatsEl.innerHTML = `<div class="beat placeholder" id="beatPlaceholder"><span class="ph-txt">Finish a word and a story moment pops in here!</span></div>`;
  startWord();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- go ---------- */
$('pipSlot').innerHTML = pipSVG();
startWord();
