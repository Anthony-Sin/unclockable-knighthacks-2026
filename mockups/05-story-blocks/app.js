'use strict';
/* Story Blocks — drag & drop story sequencing. Front-end only. */

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPRING = 'transform .34s cubic-bezier(.34,1.56,.64,1)';

/* ------------------------------------------------------------------ */
/* Story data: 5 blocks. SVGs are static in card pics; the same markup */
/* animates on the stage because the keyframes are scoped under .scene */
/* ------------------------------------------------------------------ */
const STORIES = [
  {
    id: 0,
    caption: 'Pip woke up',
    svg: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#FFF3DA"/>
      <g class="anim-pop">
        <g class="anim-bob">
          <circle cx="38" cy="30" r="15" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>
          <path d="M38 6 v-4 M38 54 v4 M14 30 h-4 M62 30 h4 M21 13 l-3-3 M55 13 l3-3 M21 47 l-3 3 M55 47 l3 3" stroke="#2B2118" stroke-width="3" stroke-linecap="round"/>
        </g>
        <path d="M0 128 Q60 116 200 124 L200 150 L0 150 Z" fill="#E9F7EE"/>
        <rect x="26" y="72" width="13" height="56" rx="6" fill="#8B5E3C" stroke="#2B2118" stroke-width="3"/>
        <rect x="30" y="104" width="142" height="22" rx="8" fill="#8B5E3C" stroke="#2B2118" stroke-width="3"/>
        <rect x="44" y="90" width="44" height="18" rx="9" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>
        <path d="M104 88 h62 a6 6 0 0 1 6 6 v14 h-68 Z" fill="#FF6B57" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="66" cy="82" r="15" fill="#B565D8" stroke="#2B2118" stroke-width="3"/>
        <path d="M56 71 l-6 -9 l11 3 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
        <path d="M76 71 l6 -9 l-11 3 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
        <path d="M60 82 q4 4 8 0" fill="none" stroke="#2B2118" stroke-width="3" stroke-linecap="round"/>
        <text class="anim-z" x="88" y="66" font-family="Fredoka, sans-serif" font-weight="700" font-size="15" fill="#8a7457">Z</text>
        <text class="anim-z" style="animation-delay:.8s" x="98" y="56" font-family="Fredoka, sans-serif" font-weight="700" font-size="12" fill="#8a7457">z</text>
      </g>
    </svg>`
  },
  {
    id: 1,
    caption: 'Pip found a golden key',
    svg: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#EAF4FD"/>
      <g class="anim-pop">
        <path d="M0 112 Q100 86 200 112 L200 150 L0 150 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="3"/>
        <circle cx="30" cy="118" r="10" fill="#3E9159"/>
        <circle cx="176" cy="122" r="12" fill="#3E9159"/>
        <g transform="translate(104 58) rotate(-18)">
          <g class="anim-bob">
            <rect x="10" y="-5" width="62" height="10" rx="5" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>
            <rect x="50" y="4" width="8" height="14" rx="3" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>
            <rect x="62" y="4" width="8" height="10" rx="3" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>
            <circle cx="0" cy="0" r="14" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>
            <circle cx="0" cy="0" r="6.5" fill="#EAF4FD" stroke="#2B2118" stroke-width="3"/>
          </g>
        </g>
        <g fill="#FFC53D" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round">
          <path class="anim-tw1" d="M52 34 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/>
          <path class="anim-tw2" d="M162 24 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"/>
          <path class="anim-tw1" d="M150 92 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"/>
        </g>
      </g>
    </svg>`
  },
  {
    id: 2,
    caption: 'The tree-door opened',
    svg: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#FFF3DA"/>
      <g class="anim-pop">
        <circle cx="100" cy="34" r="34" fill="#4FB06D" stroke="#2B2118" stroke-width="3"/>
        <circle cx="62" cy="46" r="22" fill="#4FB06D" stroke="#2B2118" stroke-width="3"/>
        <circle cx="138" cy="46" r="22" fill="#4FB06D" stroke="#2B2118" stroke-width="3"/>
        <path d="M76 150 C76 108 70 78 84 58 L116 58 C130 78 124 108 124 150 Z" fill="#8B5E3C" stroke="#2B2118" stroke-width="3"/>
        <path class="anim-glow" d="M84 150 V100 a16 20 0 0 1 32 0 V150 Z" fill="#FFC53D"/>
        <g class="anim-door">
          <path d="M86 150 V101 a14 18 0 0 1 28 0 V150 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3"/>
          <circle cx="92" cy="126" r="3" fill="#2B2118"/>
        </g>
        <circle class="anim-tw2" cx="48" cy="120" r="4" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/>
        <circle class="anim-tw1" cx="152" cy="126" r="4" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/>
      </g>
    </svg>`
  },
  {
    id: 3,
    caption: 'Pip danced with the fireflies',
    svg: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#3A3A6B"/>
      <g class="anim-pop">
        <path class="anim-tw1" d="M26 22 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#FFC53D"/>
        <path class="anim-tw2" d="M172 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#FFF8EC"/>
        <path class="anim-tw1" d="M180 64 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FFC53D"/>
        <path d="M0 132 Q100 118 200 132 L200 150 L0 150 Z" fill="#2B2B52"/>
        <g class="anim-bob">
          <circle cx="100" cy="94" r="24" fill="#B565D8" stroke="#2B2118" stroke-width="3"/>
          <path d="M84 80 l-9 -13 l15 4 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
          <path d="M116 80 l9 -13 l-15 4 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="91" cy="90" r="3.5" fill="#2B2118"/>
          <circle cx="109" cy="90" r="3.5" fill="#2B2118"/>
          <path d="M92 102 q8 8 16 0" fill="none" stroke="#2B2118" stroke-width="3" stroke-linecap="round"/>
          <path d="M76 96 q-12 -4 -16 -14" fill="none" stroke="#2B2118" stroke-width="3" stroke-linecap="round"/>
          <path d="M124 96 q12 -4 16 -14" fill="none" stroke="#2B2118" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g class="anim-flyA"><circle cx="46" cy="70" r="9" fill="#FFC53D" opacity=".3"/><circle cx="46" cy="70" r="4.5" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/></g>
        <g class="anim-flyB"><circle cx="156" cy="88" r="9" fill="#FFC53D" opacity=".3"/><circle cx="156" cy="88" r="4.5" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/></g>
        <g class="anim-flyC"><circle cx="128" cy="44" r="8" fill="#FFC53D" opacity=".3"/><circle cx="128" cy="44" r="4" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/></g>
        <g class="anim-flyB"><circle cx="60" cy="110" r="7" fill="#FFC53D" opacity=".3"/><circle cx="60" cy="110" r="3.5" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/></g>
      </g>
    </svg>`
  },
  {
    id: 4,
    caption: 'Pip snuggled into bed',
    svg: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#3A3A6B"/>
      <g class="anim-pop">
        <g class="anim-moon">
          <circle cx="160" cy="30" r="14" fill="#FFC53D"/>
          <circle cx="154" cy="26" r="12" fill="#3A3A6B"/>
        </g>
        <path class="anim-tw1" d="M30 24 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#FFF8EC"/>
        <path class="anim-tw2" d="M96 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FFC53D"/>
        <rect x="26" y="76" width="13" height="52" rx="6" fill="#8B5E3C" stroke="#2B2118" stroke-width="3"/>
        <rect x="30" y="106" width="142" height="20" rx="8" fill="#8B5E3C" stroke="#2B2118" stroke-width="3"/>
        <rect x="44" y="92" width="44" height="16" rx="8" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>
        <path d="M78 90 q10 -12 24 -4 l4 8 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="66" cy="86" r="14" fill="#B565D8" stroke="#2B2118" stroke-width="3"/>
        <path d="M57 76 l-6 -9 l11 3 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
        <path d="M60 86 q4 4 8 0" fill="none" stroke="#2B2118" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 92 h64 a6 6 0 0 1 6 6 v12 h-70 Z" fill="#FF6B57" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
        <text class="anim-z" x="94" y="70" font-family="Fredoka, sans-serif" font-weight="700" font-size="15" fill="#FFF8EC">Z</text>
        <text class="anim-z" style="animation-delay:.8s" x="106" y="58" font-family="Fredoka, sans-serif" font-weight="700" font-size="12" fill="#FFF8EC">z</text>
      </g>
    </svg>`
  }
];

const ROTS = [-2, 1.6, -1.2, 2.2, -1.8];
const SLOT_COUNT = STORIES.length;

/* ------------------------------------------------------------------ */
/* DOM refs + state                                                    */
/* ------------------------------------------------------------------ */
const slotsEl   = $('#slots');
const trayEl    = $('#tray');
const boardEl   = $('#board');
const scanBeam  = $('#scanBeam');
const hintEl    = $('#hintBubble');
const checkBtn  = $('#checkBtn');
const shuffleBtn= $('#shuffleBtn');
const autoBtn   = $('#autoBtn');
const stopDemoBtn = $('#stopDemoBtn');
const stageEl   = $('#stage');
const sceneEl   = $('#scene');
const capEl     = $('#stageCaption');
const endCard   = $('#endCard');
const replayBtn = $('#replayBtn');
const againBtn  = $('#againBtn');

let state = 'arrange';          // arrange | checking | payoff | autoplay
let selectedCard = null;
let drag = null;
let playToken = 0;              // guards stage playback
let flowToken = 0;              // guards checkStory awaits (reset/stop bumps it)
let demoToken = 0;              // guards auto-demo glide loop
const cards = [];
const slots = [];

/* ------------------------------------------------------------------ */
/* Build the board                                                     */
/* ------------------------------------------------------------------ */
function buildBoard() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;
    slot.innerHTML = `<span class="slot-num">${i + 1}</span><span class="slot-hint">drop a<br>card here</span>`;
    slotsEl.appendChild(slot);
    slots.push(slot);
  }
  for (let i = 0; i < SLOT_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = i;
    el.style.setProperty('--rot', ROTS[i] + 'deg');
    el.innerHTML = `<span class="pic">${STORIES[i].svg}</span><span class="cap">${STORIES[i].caption}</span>`;
    el.addEventListener('pointerdown', onCardPointerDown);
    cards.push(el);
    trayEl.appendChild(el);
  }
  shuffleTray();
}

function shuffleTray() {
  const inTray = cards.filter(c => c.parentElement === trayEl);
  const order = inTray.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.forEach((c, i) => {
    trayEl.appendChild(c);
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = `popIn .4s cubic-bezier(.34,1.56,.64,1) ${i * 60}ms both`;
    setTimeout(() => { c.style.animation = ''; }, 500 + i * 60);
  });
  syncSlots();
}

function syncSlots() {
  slots.forEach(s => s.classList.toggle('filled', !!s.querySelector('.card')));
}

/* ------------------------------------------------------------------ */
/* FLIP helper: move el to wherever it now lives, from old rect r1     */
/* ------------------------------------------------------------------ */
function flipMove(el, r1) {
  const r2 = el.getBoundingClientRect();
  const dx = r1.left - r2.left;
  const dy = r1.top - r2.top;
  el.style.transition = 'none';
  el.style.transform = `translate(${dx}px, ${dy}px)`;
  void el.getBoundingClientRect();
  // setTimeout (not rAF) so flips still settle when the tab is hidden
  setTimeout(() => {
    el.style.transition = SPRING;
    el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; }, 380);
  }, 30);
}

function clearDragStyles(c) {
  c.classList.remove('dragging');
  ['position', 'left', 'top', 'width', 'height', 'margin', 'zIndex',
   'transform', 'boxShadow', 'border', 'animation']
    .forEach(p => { c.style[p] = ''; });
}

function popSlot(slot) {
  slot.classList.remove('slot-pop');
  void slot.offsetWidth;
  slot.classList.add('slot-pop');
}

/* ------------------------------------------------------------------ */
/* Pointer Events drag & drop (mouse + touch)                          */
/* ------------------------------------------------------------------ */
function onCardPointerDown(e) {
  if (state !== 'arrange') return;
  if (drag) return;                       // one card at a time
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  const c = e.currentTarget;
  const r = c.getBoundingClientRect();
  drag = {
    card: c,
    pointerId: e.pointerId,
    startX: e.clientX, startY: e.clientY,
    dx: e.clientX - r.left, dy: e.clientY - r.top,
    sx: r.left, sy: r.top,
    moved: false,
    lastZone: null
  };
  c.setPointerCapture(e.pointerId);
  c.addEventListener('pointermove', onDragMove);
  c.addEventListener('pointerup', onDragEnd, { once: true });
  c.addEventListener('pointercancel', onDragCancel, { once: true });
  c.addEventListener('lostpointercapture', onLostCapture, { once: true });
}

function onDragMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
  if (!drag.moved && d > 7) startDragVisual();
  if (!drag.moved) return;
  const c = drag.card;
  const x = e.clientX - drag.dx - drag.sx;
  const y = e.clientY - drag.dy - drag.sy;
  c.style.transform = `translate(${x}px, ${y}px) rotate(-1.5deg) scale(1.06)`;
  updateZoneHighlight(e.clientX, e.clientY);
}

function startDragVisual() {
  const c = drag.card;
  drag.moved = true;
  deselect();
  // Measure BEFORE switching to position:fixed — a slotted card's
  // width/height:100% would otherwise resolve against the viewport.
  const w = c.offsetWidth, h = c.offsetHeight;
  c.classList.add('dragging');
  c.style.position = 'fixed';
  c.style.left = drag.sx + 'px';
  c.style.top = drag.sy + 'px';
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  c.style.margin = '0';
  c.style.zIndex = '50';
  c.style.transition = 'none';
  c.style.animation = 'none';
  c.style.border = '3px solid #2B2118';
  c.style.boxShadow = '10px 14px 0 rgba(43,33,24,.28)';
}

function zoneAt(x, y) {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (drag && drag.card.contains(el)) continue;
    if (!(el instanceof Element)) continue;
    const slot = el.closest('.slot');
    if (slot) return { type: 'slot', el: slot };
    if (el.closest('#tray')) return { type: 'tray', el: trayEl };
    const card = el.closest('.card');
    if (card) {
      const p = card.parentElement;
      if (p.classList.contains('slot')) return { type: 'slot', el: p };
      if (p === trayEl) return { type: 'tray', el: trayEl };
    }
  }
  return null;
}

function updateZoneHighlight(x, y) {
  const z = zoneAt(x, y);
  if (drag.lastZone && (!z || z.el !== drag.lastZone.el)) {
    drag.lastZone.el.classList.remove('drop-target');
  }
  if (z) z.el.classList.add('drop-target');
  drag.lastZone = z;
}

function clearZoneHighlight() {
  if (drag && drag.lastZone) drag.lastZone.el.classList.remove('drop-target');
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
}

function onDragEnd(e) {
  if (!drag) return;
  const c = drag.card;
  c.removeEventListener('pointermove', onDragMove);
  c.removeEventListener('lostpointercapture', onLostCapture);
  c.removeEventListener('pointercancel', onDragCancel);
  const wasDrag = drag.moved;
  const zone = wasDrag ? zoneAt(e.clientX, e.clientY) : null;
  clearZoneHighlight();
  drag = null;
  if (!wasDrag) { tapCard(c); return; }
  if (zone) landCard(c, zone); else returnCard(c);
}

function onDragCancel() {
  if (!drag) return;
  const c = drag.card;
  c.removeEventListener('pointermove', onDragMove);
  c.removeEventListener('lostpointercapture', onLostCapture);
  const wasDrag = drag.moved;
  clearZoneHighlight();
  drag = null;
  if (wasDrag) returnCard(c);
}

function onLostCapture() {
  // If capture was lost mid-drag without pointerup/cancel, bring the card home.
  if (drag && drag.moved) {
    const c = drag.card;
    c.removeEventListener('pointermove', onDragMove);
    c.removeEventListener('pointercancel', onDragCancel);
    clearZoneHighlight();
    drag = null;
    returnCard(c);
  }
}

function returnCard(c) {
  const r1 = c.getBoundingClientRect();
  clearDragStyles(c);
  flipMove(c, r1);
}

function landCard(c, zone) {
  const r1 = c.getBoundingClientRect();
  const home = c.parentElement;
  if (zone.type === 'slot') {
    const slot = zone.el;
    const occupant = slot.querySelector('.card');
    const occR = occupant ? occupant.getBoundingClientRect() : null;
    clearDragStyles(c);
    slot.appendChild(c);
    if (occupant && occupant !== c) {
      home.appendChild(occupant);
      flipMove(occupant, occR);
    }
    flipMove(c, r1);
    popSlot(slot);
  } else {
    clearDragStyles(c);
    trayEl.appendChild(c);
    flipMove(c, r1);
  }
  hideHint();
  syncSlots();
}

/* ------------------------------------------------------------------ */
/* Tap-to-select fallback (tap card, then tap a slot)                  */
/* ------------------------------------------------------------------ */
function select(c)   { deselect(); selectedCard = c; c.classList.add('selected'); }
function deselect()  { if (selectedCard) selectedCard.classList.remove('selected'); selectedCard = null; }

function tapCard(c) {
  if (selectedCard === c) { deselect(); return; }
  if (selectedCard) {
    // swap the two cards' homes
    const a = selectedCard, b = c;
    const pa = a.parentElement, pb = b.parentElement;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    deselect();
    pb.appendChild(a); pa.appendChild(b);
    flipMove(a, ra); flipMove(b, rb);
    if (pa.classList.contains('slot')) popSlot(pa);
    if (pb.classList.contains('slot')) popSlot(pb);
    hideHint();
    syncSlots();
  } else {
    select(c);
  }
}

function placeIntoSlot(slot, c) {
  const r1 = c.getBoundingClientRect();
  const occupant = slot.querySelector('.card');
  const occR = occupant ? occupant.getBoundingClientRect() : null;
  const home = c.parentElement;
  slot.appendChild(c);
  if (occupant) { home.appendChild(occupant); flipMove(occupant, occR); }
  flipMove(c, r1);
  popSlot(slot);
  hideHint();
  syncSlots();
}

slotsEl.addEventListener('pointerdown', e => {
  if (state !== 'arrange' || !selectedCard) return;
  const slot = e.target.closest('.slot');
  if (!slot || e.target.closest('.card')) return;
  e.preventDefault();
  const c = selectedCard;
  deselect();
  placeIntoSlot(slot, c);
});

trayEl.addEventListener('pointerdown', e => {
  if (state !== 'arrange' || !selectedCard) return;
  if (e.target.closest('.card')) return;
  e.preventDefault();
  const c = selectedCard;
  const r1 = c.getBoundingClientRect();
  deselect();
  trayEl.appendChild(c);
  flipMove(c, r1);
  hideHint();
  syncSlots();
});

/* ------------------------------------------------------------------ */
/* Hints                                                               */
/* ------------------------------------------------------------------ */
function showHint(msg, kind) {
  hintEl.textContent = msg;
  hintEl.className = 'hint-bubble show ' + (kind || '');
}
function hideHint() { hintEl.classList.remove('show'); }

/* Smart-sounding hardcoded logic: returns {msg, slots:[i,j]} or null */
function checkRules(ids) {
  const pos = id => ids.indexOf(id);
  if (pos(2) < pos(1))
    return { msg: 'Hmm — can the door open before Pip finds the key?',
             slots: [pos(2), pos(1)] };
  if (pos(3) < pos(2))
    return { msg: 'The fireflies live behind the tree-door — Pip has not opened it yet!',
             slots: [pos(3), pos(2)] };
  if (pos(4) < pos(3))
    return { msg: 'Pip cannot snuggle into bed before the firefly dance — that is the best part!',
             slots: [pos(4), pos(3)] };
  if (pos(1) < pos(0))
    return { msg: 'Stories start when Pip wakes up — can Pip find a key while still asleep?',
             slots: [pos(1), pos(0)] };
  return null;
}

/* ------------------------------------------------------------------ */
/* The "Story Check" — simulated AI moment                             */
/* ------------------------------------------------------------------ */
async function checkStory() {
  if (state !== 'arrange') return;
  const placed = slots.map(s => s.querySelector('.card'));
  if (placed.some(c => !c)) {
    showHint('Fill every slot first — the story needs all its pieces!', 'warn');
    return;
  }
  state = 'checking';
  const myFlow = flowToken;
  deselect();
  setControls(false);
  hideHint();

  scanBeam.classList.remove('run');
  void scanBeam.offsetWidth;
  scanBeam.classList.add('run');
  slots.forEach((s, i) => setTimeout(
    () => { if (myFlow === flowToken) s.classList.add('scanning'); },
    140 + i * 200));
  await wait(1550);
  if (myFlow !== flowToken) return;
  slots.forEach(s => s.classList.remove('scanning'));

  const ids = placed.map(c => +c.dataset.id);
  const rule = checkRules(ids);
  const wrong = [];
  ids.forEach((id, i) => { if (id !== i) wrong.push(i); });

  if (!wrong.length) {
    showHint('That story makes perfect sense. Let’s watch it!', 'good');
    confetti(28);
    state = 'payoff';
    await wait(1150);
    if (myFlow !== flowToken) return;
    stageEl.hidden = false;
    stageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await wait(700);
    if (myFlow !== flowToken) return;
    playStory();
  } else {
    const shakeIdx = rule ? rule.slots : wrong;
    shakeIdx.forEach(i => {
      const card = slots[i].querySelector('.card');
      if (!card) return;
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    });
    showHint(rule ? rule.msg : 'Almost! Read the pictures left to right — what happens first?', 'warn');
    state = 'arrange';
    setControls(true);
  }
}

function setControls(on) {
  checkBtn.disabled = !on;
  shuffleBtn.disabled = !on;
  autoBtn.disabled = !on;
}

/* ------------------------------------------------------------------ */
/* Confetti                                                            */
/* ------------------------------------------------------------------ */
function confetti(n) {
  const colors = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--fall-d', (1.1 + Math.random() * 1) + 's');
    p.style.setProperty('--fall-delay', (Math.random() * .4) + 's');
    if (Math.random() < .4) p.style.borderRadius = '50%';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

/* ------------------------------------------------------------------ */
/* Stage playback — the payoff                                         */
/* ------------------------------------------------------------------ */
async function playStory() {
  const token = ++playToken;
  state = 'payoff';
  replayBtn.disabled = true;
  againBtn.disabled = true;
  endCard.hidden = true;

  for (let i = 0; i < STORIES.length; i++) {
    if (token !== playToken) return;
    const st = STORIES[i];
    sceneEl.innerHTML = st.svg;
    capEl.innerHTML = st.caption.split(' ')
      .map(w => `<span class="w">${w}</span>`).join(' ');
    const words = [...capEl.querySelectorAll('.w')];
    const per = 430;
    words.forEach((w, j) =>
      setTimeout(() => { if (token === playToken) w.classList.add('on'); }, 220 + j * per));
    await wait(260 + words.length * per + 850);
  }

  if (token !== playToken) return;
  capEl.innerHTML = '';
  sceneEl.innerHTML = '';
  endCard.hidden = false;
  confetti(64);
  showStop(false);              // auto-demo finished naturally
  autoBtn.disabled = false;     // allow running the demo again
  replayBtn.disabled = false;
  againBtn.disabled = false;
}

/* ------------------------------------------------------------------ */
/* Reset                                                               */
/* ------------------------------------------------------------------ */
function resetBoard() {
  playToken++;
  flowToken++;
  demoToken++;
  state = 'arrange';
  showStop(false);
  endCard.hidden = true;
  sceneEl.innerHTML = '';
  capEl.innerHTML = '';
  stageEl.hidden = true;
  deselect();
  slots.forEach(s => {
    const c = s.querySelector('.card');
    if (c) trayEl.appendChild(c);
    s.classList.remove('scanning', 'slot-pop');
  });
  // wipe any inline leftovers from drags, flips, shakes or demo glides
  cards.forEach(c => {
    c.classList.remove('selected', 'shake', 'dragging');
    ['position', 'left', 'top', 'width', 'height', 'margin', 'zIndex',
     'transform', 'boxShadow', 'border', 'animation', 'transition']
      .forEach(p => { c.style[p] = ''; });
  });
  shuffleTray();
  setControls(true);
  hideHint();
  boardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ------------------------------------------------------------------ */
/* "Watch it work" — hands-free auto-demo                              */
/* ------------------------------------------------------------------ */
function showStop(on) { stopDemoBtn.hidden = !on; }

function glideCardToSlot(card, slot, t) {
  const bail = () => t !== demoToken;
  return new Promise(res => {
    const r1 = card.getBoundingClientRect();
    const occupant = slot.querySelector('.card');
    if (occupant && occupant !== card) trayEl.appendChild(occupant);
    slot.appendChild(card);
    const r2 = card.getBoundingClientRect();
    const dx = r1.left - r2.left, dy = r1.top - r2.top;
    card.style.transition = 'none';
    card.style.zIndex = '40';
    card.style.border = '3px solid #2B2118';
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(4deg) scale(1.06)`;
    card.style.boxShadow = '10px 14px 0 rgba(43,33,24,.28)';
    void card.getBoundingClientRect();
    // setTimeout (not rAF) so the glide still plays when the tab is hidden
    setTimeout(() => {
      if (bail()) { res(); return; }
      card.style.transition = 'transform .55s cubic-bezier(.34,1.56,.64,1), box-shadow .55s';
      card.style.transform = 'rotate(-1deg) scale(1.02)';
      card.style.boxShadow = '6px 8px 0 rgba(43,33,24,.2)';
      setTimeout(() => {
        if (bail()) { res(); return; }
        card.style.transition = 'transform .16s, box-shadow .16s, border .16s';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.border = '';
        setTimeout(() => {
          if (!bail()) { card.style.transition = ''; card.style.zIndex = ''; }
          res();
        }, 180);
      }, 570);
    }, 30);
  });
}

async function autoDemo() {
  if (state === 'checking' || state === 'autoplay') return;
  const t = ++demoToken;
  state = 'autoplay';
  showStop(true);
  setControls(false);
  deselect();
  hideHint();
  // close any previous payoff
  playToken++;
  endCard.hidden = true;
  sceneEl.innerHTML = '';
  capEl.innerHTML = '';
  stageEl.hidden = true;
  // pull everything back to the tray so the demo starts clean
  slots.forEach(s => {
    const c = s.querySelector('.card');
    if (c) trayEl.appendChild(c);
    s.classList.remove('scanning', 'slot-pop');
  });
  syncSlots();
  boardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await wait(380);
  if (t !== demoToken) return;

  for (let i = 0; i < SLOT_COUNT; i++) {
    if (t !== demoToken) return;
    await glideCardToSlot(cards[i], slots[i], t);
    if (t !== demoToken) return;
    popSlot(slots[i]);
    syncSlots();
    await wait(170);
  }
  if (t !== demoToken) return;
  await wait(480);
  if (t !== demoToken) return;
  state = 'arrange';
  checkStory();   // scan → confetti → stage payoff (same path as manual)
}

function stopDemo() {
  demoToken++;
  resetBoard();
}

/* ------------------------------------------------------------------ */
checkBtn.addEventListener('click', checkStory);
shuffleBtn.addEventListener('click', resetBoard);
againBtn.addEventListener('click', resetBoard);
replayBtn.addEventListener('click', playStory);
autoBtn.addEventListener('click', autoDemo);
stopDemoBtn.addEventListener('click', stopDemo);

buildBoard();
