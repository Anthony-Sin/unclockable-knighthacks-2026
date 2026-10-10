/* Letter Hunt — mockup 06
   Front-end demo of a camera "AR" letter hunt.
   All detections are HARDCODED — they stand in for real object detection
   (in the real game this would be vision AI like Detectron2 / Google Lens). */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);

/* ---------------- data ---------------- */
const FINDS = [
  { label: 'book',   ok: true,  note: 'starts with B!' },
  { label: 'ball',   ok: true,  note: 'starts with B!' },
  { label: 'bottle', ok: true,  note: 'starts with B!' },
  { label: 'banana', ok: true,  note: 'starts with B!' },
  { label: 'bear',   ok: true,  note: 'starts with B!' },
  { label: 'cup',    ok: false, note: "that's C — keep looking!" },
  { label: 'plant',  ok: false, note: "that's P — keep looking!" },
  { label: 'sock',   ok: false, note: "that's S — keep looking!" },
  { label: 'lamp',   ok: false, note: "that's L — keep looking!" },
];

/* Where each object actually sits in the practice-room SVG (percent rects),
   so the fake AI "spots" the real drawn things. */
const ANCHORS = {
  book:   { x: 9,  y: 23, w: 21, h: 15 },
  bottle: { x: 12, y: 9,  w: 9,  h: 13 },
  bear:   { x: 11, y: 41, w: 12, h: 17 },
  cup:    { x: 50, y: 47, w: 10, h: 11 },
  banana: { x: 57, y: 48, w: 13, h: 9 },
  ball:   { x: 33, y: 74, w: 13, h: 17 },
  sock:   { x: 52, y: 80, w: 14, h: 14 },
  plant:  { x: 67, y: 35, w: 15, h: 33 },
  lamp:   { x: 80, y: 24, w: 16, h: 45 },
};

const SLOTS_NEEDED = 3;

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="10" fill="#4FB06D" stroke="#2B2118" stroke-width="2"/>' +
  '<path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#FFFDF6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MAG_SVG =
  '<svg viewBox="0 0 24 24" class="ic"><circle cx="10.5" cy="10.5" r="6.5" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/>' +
  '<path d="M15.5 15.5 L20 20" stroke="#2B2118" stroke-width="2.6" stroke-linecap="round"/></svg>';
const gemSVG = (letter) =>
  '<svg viewBox="0 0 100 110" class="slot-gem">' +
  '<polygon points="50,8 88,34 74,96 26,96 12,34" fill="#5DA9E9" stroke="#2B2118" stroke-width="6" stroke-linejoin="round"/>' +
  '<polygon points="50,8 88,34 12,34" fill="#9CCFEF"/>' +
  '<path d="M50 8 L36 34 L26 96 M50 8 L64 34 L74 96" stroke="#2B2118" stroke-width="3" fill="none" opacity=".35"/>' +
  '<text x="50" y="76" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="42" font-weight="700" fill="#FFFDF6" stroke="#2B2118" stroke-width="1.5">' + letter + '</text></svg>';

/* ---------------- elements ---------------- */
const hero      = $('#hero');
const hunt      = $('#hunt');
const payoff    = $('#payoff');
const video     = $('#cam');
const room      = $('#room');
const vf        = $('#viewfinder');
const detLayer  = $('#detections');
const fx        = $('#fx');
const slotsEl   = $$('#slots .slot');
const toast     = $('#toast');
const modeChip  = $('#mode-chip');
const btnCamera = $('#btn-camera');
const btnPractice = $('#btn-practice');
const btnScan   = $('#btn-scan');
const btnPause  = $('#btn-pause');
const btnSwap   = $('#btn-swap');
const btnBack   = $('#btn-back');
const btnAgain  = $('#btn-again');
const btnChange = $('#btn-change');
const confettiEl = $('#confetti');

function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

/* ---------------- state ---------------- */
const state = {
  mode: 'practice',   // 'camera' | 'practice'
  stream: null,
  paused: false,
  autoPaused: false,
  done: false,
  foundCount: 0,
  foundLabels: new Set(),
  deck: [],
  active: 0,
  round: 0,
  timer: null,
  toastTimer: null,
};

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- camera ---------------- */
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('no getUserMedia');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  state.stream = stream;
  video.srcObject = stream;
  try { await video.play(); } catch (e) { /* autoplay quirks are fine */ }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
  video.srcObject = null;
}

function setMode(mode) {
  state.mode = mode;
  const cam = mode === 'camera';
  video.classList.toggle('hidden', !cam);
  room.classList.toggle('hidden', cam);
  modeChip.textContent = cam ? 'Live camera · demo AI' : 'Practice room · demo AI';
  btnSwap.textContent = cam ? 'Use the practice room' : 'Try the camera';
}

/* ---------------- toast ---------------- */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ---------------- detection boxes ---------------- */
function buildDeck() {
  // already-found B-things leave the deck; misses stay in rotation
  const pool = FINDS.filter((f) => !f.ok || !state.foundLabels.has(f.label));
  state.deck = shuffle(pool);
}

function rectFor(item) {
  if (state.mode === 'practice' && ANCHORS[item.label]) {
    const a = ANCHORS[item.label];
    return {
      x: a.x + rand(-1.5, 1.5),
      y: a.y + rand(-1.5, 1.5),
      w: a.w * rand(0.97, 1.05),
      h: a.h * rand(0.97, 1.05),
    };
  }
  // camera mode: we can't know what's really in frame, so the demo pops
  // friendly stickers at random spots (the real game would track objects)
  const w = rand(15, 24);
  const h = rand(17, 28);
  return {
    x: rand(8, 88 - w),
    y: rand(16, 78 - h),
    w, h,
  };
}

function spawnDetection() {
  if (state.done || state.active >= 2) return;
  if (state.deck.length === 0) buildDeck();
  const item = state.deck.pop();
  if (!item) return;

  const r = rectFor(item);
  const rot = rand(-2.4, 2.4).toFixed(1) + 'deg';
  const el = document.createElement('div');
  el.className = 'detect ' + (item.ok ? 'hit' : 'miss');
  el.style.left = r.x + '%';
  el.style.top = r.y + '%';
  el.style.width = r.w + '%';
  el.style.height = r.h + '%';
  el.style.setProperty('--r', rot);
  const cx = r.x + r.w / 2;
  if (r.y + r.h > 72) el.classList.add('label-top');
  if (cx > 70) el.classList.add('label-right');
  else if (cx < 30) el.classList.add('label-left');
  el.innerHTML =
    '<span class="ai-tag">AI</span>' +
    '<div class="dlabel">' + (item.ok ? CHECK_SVG : MAG_SVG) +
    '<span><b>' + item.label + '</b> — ' + item.note + '</span></div>';

  detLayer.appendChild(el);
  state.active++;

  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));

  const ttl = item.ok ? 2100 : 2400;
  setTimeout(() => {
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => { el.remove(); state.active--; }, 420);
  }, ttl);

  if (item.ok) {
    const round = state.round;
    setTimeout(() => { if (round === state.round) collect(item, r); }, 480);
  }
}

/* ---------------- collecting ---------------- */
function collect(item, r) {
  if (state.done || state.foundLabels.has(item.label)) return;
  state.foundLabels.add(item.label);
  const i = state.foundCount;
  state.foundCount++;

  const slot = slotsEl[i];
  if (slot) {
    slot.classList.add('filled');
    slot.innerHTML = gemSVG('B') + '<span class="slot-word">' + item.label + '</span>';
  }
  burst(r.x + r.w / 2, r.y + r.h / 2);

  if (state.foundCount >= SLOTS_NEEDED) {
    state.done = true;
    clearTimeout(state.timer);
    setTimeout(showPayoff, 1200);
  }
}

function burst(px, py) {
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const a = Math.random() * Math.PI * 2;
    const d = 30 + Math.random() * 46;
    s.style.left = px + '%';
    s.style.top = py + '%';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    fx.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

/* ---------------- auto scan loop ---------------- */
function loop() {
  clearTimeout(state.timer);
  if (state.paused || state.done || hunt.classList.contains('hidden')) return;
  spawnDetection();
  state.timer = setTimeout(loop, 2000 + Math.random() * 1400);
}

function startLoop() {
  clearTimeout(state.timer);
  state.timer = setTimeout(loop, 900);
}

function setPaused(p, auto) {
  state.paused = p;
  state.autoPaused = p && !!auto;
  btnPause.textContent = p ? 'Resume' : 'Pause';
  vf.classList.toggle('paused', p);
  if (p) clearTimeout(state.timer);
  else loop();
}

/* ---------------- screens ---------------- */
function resetBoard() {
  state.round++;
  detLayer.innerHTML = '';
  state.active = 0;
  state.foundCount = 0;
  state.foundLabels.clear();
  state.deck = [];
  state.done = false;
  slotsEl.forEach((s, i) => {
    s.classList.remove('filled');
    s.innerHTML = '<span class="n">' + (i + 1) + '</span>';
  });
}

async function enterHunt(withCamera, btn) {
  hero.classList.add('hidden');
  payoff.classList.add('hidden');
  hunt.classList.remove('hidden');
  resetBoard();

  if (withCamera) {
    if (btn) { btn.disabled = true; btn.textContent = 'Asking the camera…'; }
    try {
      await startCamera();
      setMode('camera');
      showToast('Camera on! Watch for B-things.');
    } catch (e) {
      stopCamera();
      setMode('practice');
      showToast("Camera said no — the practice room works too!");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Start the hunt'; }
    }
  } else {
    stopCamera();
    setMode('practice');
    showToast('Practice room — sit back and watch!');
  }
  setPaused(false);
  startLoop();
}

function backToStart() {
  clearTimeout(state.timer);
  stopCamera();
  hunt.classList.add('hidden');
  payoff.classList.add('hidden');
  hero.classList.remove('hidden');
}

/* ---------------- payoff ---------------- */
function showPayoff() {
  confetti();
  payoff.classList.remove('hidden');
}

function confetti() {
  confettiEl.innerHTML = '';
  const colors = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('span');
    c.className = 'conf';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = pick(colors);
    c.style.setProperty('--spin', Math.floor(rand(180, 720)) + 'deg');
    c.style.animationDelay = (Math.random() * 0.7) + 's';
    confettiEl.appendChild(c);
  }
}

/* ---------------- wiring ---------------- */
btnCamera.addEventListener('click', () => enterHunt(true, btnCamera));
btnPractice.addEventListener('click', () => enterHunt(false));

btnScan.addEventListener('click', () => {
  spawnDetection();
  setTimeout(spawnDetection, 450);
});
btnPause.addEventListener('click', () => setPaused(!state.paused));

btnSwap.addEventListener('click', async () => {
  if (state.mode === 'camera') {
    stopCamera();
    setMode('practice');
    showToast('Practice room — the demo AI still finds the B\u2019s!');
  } else {
    try {
      await startCamera();
      setMode('camera');
      showToast('Camera on! Watch for B-things.');
    } catch (e) {
      stopCamera();
      showToast("Camera isn't available — staying in the practice room.");
    }
  }
});

btnBack.addEventListener('click', backToStart);

btnAgain.addEventListener('click', () => {
  payoff.classList.add('hidden');
  resetBoard();
  setPaused(false);
  startLoop();
});
btnChange.addEventListener('click', backToStart);

/* auto-pause when the tab is hidden so stickers don't pile up */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !state.paused && !hunt.classList.contains('hidden')) {
    setPaused(true, true);
  } else if (!document.hidden && state.autoPaused) {
    setPaused(false);
  }
});

/* never leave the camera running */
window.addEventListener('pagehide', stopCamera);
window.addEventListener('beforeunload', stopCamera);

})();
