/* ============================================================
   The Three Little Pigs · Rough Canvas — game.js   (v3 flagship)
   The game-loop glue: kid draws a hero → types words → the REAL
   LLM game master (../shared/llm.js) answers with narrative +
   scene_seed + props → we re-crayon the whole stage through
   WorldScene.render and drop physical prop doodles into the DOM.

   Canvas scenes double-buffer (#sceneA/#sceneB) so every reply
   wipes the old world away like a page turn. Props are little
   rough.js canvases in #propLayer that pop, bob, tip over in the
   wolf's huff, ride the hero, land on heads, and slip under feet.
   ============================================================ */
'use strict';
(function () {

if (!window.rough || !window.StoryLLM || !window.WorldScene || !window.HeroMaker) {
  document.addEventListener('DOMContentLoaded', () => {
    const n = document.getElementById('narrative');
    if (n) n.textContent = 'A crayon is missing — check vendor/rough.js and friends.';
  });
  console.error('rough-canvas: a script dependency failed to load');
  return;
}

/* ---------- element handles ---------- */
const $ = (id) => document.getElementById(id);
const stage   = $('stage');
const sceneA  = $('sceneA'),   sceneB  = $('sceneB'),  wipeEdge = $('wipeEdge');
const propLayer = $('propLayer'), rideLayer = $('rideLayer');
const fx      = $('fx'),       glowDot = $('glowDot');
const pigA    = $('pigA'),     pigB    = $('pigB');
const heroEl  = $('hero'),     hinner  = $('hinner'),  heroCv   = $('heroCv');
const headprop= $('headprop'), heldprop= $('heldprop');
const dizzyEl = $('dizzy'),    dizzyCv = $('dizzyCv'), cheerEl  = $('cheer');
const modeChip= $('modeChip'), latChip = $('latChip');
const watchBtn2 = $('watchBtn2'), stopBtn = $('stopBtn');
const makerOv = $('makerOverlay'), makerCv = $('makerCv'), heroNameIn = $('heroName');
const doneBtn = $('doneBtn'), surpriseBtn = $('surpriseBtn');
const clearBtn = $('clearBtn'), watchBtn = $('watchBtn');
const endOv   = $('endOverlay'), endTitle = $('endTitle'), endBlurb = $('endBlurb');
const recapEl = $('recap'),    slipsEl = $('slips');
const againBtn = $('againBtn'), watchAgainBtn = $('watchAgainBtn');
const goalFill = $('goalFill');
const wolfSegs = Array.from(document.querySelectorAll('.wolftrack i'));
const wolfLabel = $('wolfLabel');
const narrEl  = $('narrative'), obRow = $('obstacles');
const blank   = $('blank'),    blankBox = document.querySelector('.blankbox');
const underSvg = $('underSvg'), goBtn = $('goBtn');
const choicesEl = $('choices');
const coachEl = $('coach'),    coachP = document.querySelector('.coach');
const dymEl   = $('dym'),      dymBtn = $('dymBtn');
const tapType = $('tapType'),  mirror = $('mirror'),   titleSq = $('titleSquiggle');

const { mulberry32, pick, rr, PO, starPts, hashStr, INK } = window.RH;

const GOAL = 'The Three Little Pigs — help the pig friends gather materials, ' +
  'build houses, and reach the strong brick house before the Big Bad Wolf ' +
  'huffs and puffs.';

/* ---------- tiny helpers ---------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
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
function tween(ms, fn) {
  return new Promise((res) => {
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      fn(k);
      if (k < 1) requestAnimationFrame(step); else res();
    })(t0);
  });
}
const easeIO = (k) => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

/* ---------- game state ---------- */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false, heroReady: false,
  history: [], words: [], silly: new Set(), slips: 0, pigs: 0,
  goal: 0, wolf: .14, heroX: 120, heroLift: 0, W: 900, H: 420, gy: 340, dark: false,
  propSeq: 0, props: new Map(), riding: null, pending: null,
  sceneSeed: ((Math.random() * 0x7ffffffe) | 0) + 1,
  lastScene: { biome: 'meadow', seed: 0, palette: 'warm', props: [] },
  ambientTimer: 0, latHist: [],
};
const okEp = (ep) => ep === S.epoch;
window.__lat = S.latHist;   // harvested for the README latency report
window.__S = S;             // dashboard/e2e introspection hook

/* ---------- grounded physics: gravity + ground clamp ---------- */
const GRAV = 3000;                      /* px/s² — snappy cartoon gravity */
function phys(ep, fn) {                 /* fn(dt seconds) → true when settled */
  return new Promise((res) => {
    let last = performance.now();
    (function step(t) {
      if (ep != null && !okEp(ep)) return res();
      const dt = Math.min(.05, (t - last) / 1000); last = t;
      if (fn(dt)) return res();
      requestAnimationFrame(step);
    })(last);
  });
}

/* ============================================================
   THE STAGE — double-buffered scene canvases + forward-travel pan
   ============================================================ */
let front = sceneA, back = sceneB;

function stageSize() { S.W = stage.clientWidth || 900; S.H = stage.clientHeight || 420; }
function renderInto(cv, ss) {
  stageSize();
  return window.WorldScene.render(cv, ss, S.W, S.H);
}

/* THE JOURNEY: the next stretch of road (freshly seeded on the back
   canvas) slides in from the right while the old world slides off the
   left — one contiguous strip, like a camera panning a long panorama.
   The hero STRIDES left→right across the stage the whole time (walk
   cycle + heel-dust), and the old scene's loose props sweep past with
   foreground parallax. Forward progress, never a re-paint in place. */
async function travelToScene(ss, ep) {
  const meta = renderInto(back, ss);
  S.lastScene = ss;
  S.gy = meta.gy; S.dark = meta.dark;
  back.style.zIndex = 3; front.style.zIndex = 2;
  back.style.transform = `translateX(${S.W}px)`;
  front.style.transform = 'translateX(0)';
  wipeEdge.classList.add('on');

  /* loose props get left behind — they fly past the walking hero */
  const loose = [...S.props.values()].filter(p => !p.attached && p !== S.riding);
  const baseL = new Map(loose.map(p => [p, parseFloat(p.node.style.left) || 0]));

  /* where does the stride land? goal-driven, but always forward */
  const startX = S.heroX;
  const want = restX();
  const cap = Math.max(S.W * (.30 + S.goal * .5), startX + S.W * .05);
  let dest = Math.max(want, startX + S.W * .16);
  if (dest > cap) dest = cap;
  dest = Math.min(dest, S.W * .86);

  hinner.classList.add('walking');
  if (dest - startX > S.W * .3) hinner.classList.add('running');
  pigA.classList.add('walking'); pigB.classList.add('walking');
  let puffAt = 0;
  await tween(1150, (k) => {
    const e = easeIO(okEp(ep) ? k : 1);   /* stopped? snap the pan home */
    front.style.transform = `translateX(${(-e * S.W).toFixed(1)}px)`;
    back.style.transform = `translateX(${((1 - e) * S.W).toFixed(1)}px)`;
    wipeEdge.style.left = ((1 - e) * S.W - 26) + 'px';   /* ink edge rides the seam */
    wipeEdge.style.opacity = e < .12 ? (e / .12) : e > .86 ? (1 - e) / .14 : .9;
    for (const p of loose)
      p.node.style.left = (baseL.get(p) - e * S.W * 1.5) + 'px';
    S.heroX = startX + (dest - startX) * e;
    placeHero(); pigsPlace(S.heroX); placeRide();
    if (e - puffAt > .13) {   /* little heel-dust while striding */
      puffAt = e;
      fxBit('poof', S.heroX - 50 + rr(Math.random, -8, 10), S.gy + 4, 7 + rr(Math.random, 0, 5));
    }
  });
  /* always settle the swap — the stage is never left half-covered */
  const t = front; front = back; back = t;
  front.style.zIndex = 2; back.style.zIndex = 1;
  front.style.transform = ''; back.style.transform = '';
  wipeEdge.classList.remove('on'); wipeEdge.style.opacity = '';
  for (const p of loose) { S.props.delete(p.node.id); p.node.remove(); }
  if (okEp(ep)) { S.heroX = dest; }
  placeHero(); pigsPlace(S.heroX);
  hinner.classList.remove('walking', 'running');
  pigA.classList.remove('walking'); pigB.classList.remove('walking');
  return meta;
}

/* ambient weather — rain streaks, drifting leaves, snow flecks */
function startAmbient(meta, ep) {
  clearInterval(S.ambientTimer);
  S.ambientTimer = 0;
  const kind = meta.rain ? 'rain' : meta.snow ? 'snow' : meta.leaves ? 'leaf' : null;
  if (!kind) return;
  S.ambientTimer = setInterval(() => {
    if (!okEp(ep)) { clearInterval(S.ambientTimer); return; }
    const i = document.createElement('i');
    i.className = kind === 'snow' ? 'rain' : kind;
    if (kind === 'snow') { i.style.background = '#FFFDF6'; i.style.width = '5px'; i.style.height = '5px'; i.style.borderRadius = '50%'; }
    i.style.left = rr(Math.random, 20, S.W - 20) + 'px';
    i.style.top = rr(Math.random, 0, 60) + 'px';
    fx.appendChild(i);
    setTimeout(() => i.remove(), 2800);
  }, kind === 'leaf' ? 750 : 120);
}

/* ============================================================
   HERO + PIG PALS — placement on the ground line
   ============================================================ */
const HERO_FEET = 146;                       // hero art rests here inside its 150px box
function rideLift() { return S.riding ? S.riding.dh * .30 : 0; }
function placeHero() {
  /* feet ON the ground line — except during a real gravity hop */
  heroEl.style.left = (S.heroX - 75) + 'px';
  heroEl.style.top = (S.gy + 8 - HERO_FEET - rideLift() - (S.heroLift || 0)) + 'px';
  updateGlow();
}
/* gravity hop: up on an arc, clamped back onto the ground line */
async function heroHop(peak, ep) {
  let v = Math.sqrt(2 * GRAV * peak);
  S.heroLift = .01;
  await phys(ep, (dt) => {
    v -= GRAV * dt;
    S.heroLift += v * dt;
    if (S.heroLift <= 0) { S.heroLift = 0; placeHero(); return true; }
    placeHero(); return false;
  });
  S.heroLift = 0; placeHero();
}
function pigsPlace(x) {
  const ax = Math.max(104, x - 88), bx = Math.max(34, x - 172);
  pigA.style.left = (ax - 48) + 'px'; pigA.style.top = (S.gy + 8 - 80) + 'px';
  pigB.style.left = (bx - 48) + 'px'; pigB.style.top = (S.gy + 8 - 74) + 'px';
}
async function heroWalkTo(x, ms, ep) {
  if (ep != null && !okEp(ep)) return;
  x = Math.max(70, Math.min(S.W - 60, x));
  const dist = Math.abs(x - S.heroX);
  if (dist < 8) return;
  hinner.classList.add('walking');
  if (dist > S.W * .28) hinner.classList.add('running');
  pigA.classList.add('walking'); pigB.classList.add('walking');
  const from = S.heroX;
  await tween(ms || 850, (k) => {
    const e = easeIO(okEp(ep) ? k : 1);
    S.heroX = from + (x - from) * e;
    placeHero(); pigsPlace(S.heroX); placeRide();
  });
  if (okEp(ep)) S.heroX = x;
  placeHero(); pigsPlace(S.heroX); placeRide();
  hinner.classList.remove('walking', 'running');
  pigA.classList.remove('walking'); pigB.classList.remove('walking');
}
function restX() { return S.W * .11 + S.goal * S.W * .66; }

/* ============================================================
   PROPS — rough.js doodles as DOM .prop nodes
   ============================================================ */
function drawPropArt(def, res, maxW, maxH) {
  const sc = Math.min(maxW / def.w, maxH / def.h, 1);
  const dw = Math.max(12, Math.round(def.w * sc));
  const dh = Math.max(12, Math.round(def.h * sc));
  const c = document.createElement('canvas');
  const ctx = sizeCv(c, dw, dh);
  ctx.scale(sc, sc);
  const r = mulberry32((hashStr(res.word || res.def) ^ S.sceneSeed) >>> 0);
  def.draw(rough.canvas(c), def.w, def.h, r, res.word);
  return { canvas: c, dw, dh };
}
function propTop(p) {
  const lift = p.cat === 'weather' ? 86 : p.cat === 'light' && !p.attached ? 40 : 0;
  return S.gy + 8 - p.dh - lift;
}
function placeProp(p) {
  if (p.attached) return;
  p.node.style.left = (clamp01(p.x) * S.W - p.dw / 2) + 'px';
  p.node.style.top = propTop(p) + 'px';
}
/* ---- entrances: every prop ARRIVES with motion, never freezes in ---- */
function settleIdle(p) {
  if (p.node.isConnected && !p.attached && S.riding !== p &&
      !p.node.classList.contains('fadeout'))
    p.node.classList.add('bob');
}
/* critters & pals scoot in along the ground from an offstage edge */
function slideInProp(p, dir, ep) {
  const target = clamp01(p.x) * S.W - p.dw / 2;
  const from = dir === 'left' ? -p.dw - 50 : S.W + 50;
  p.node.style.left = from + 'px';
  p.node.style.top = propTop(p) + 'px';
  p.node.classList.add('bob');
  return tween(700, (k) => {
    p.node.style.left = (from + (target - from) * easeOut(k)) + 'px';
  }).then(() => {
    p.node.style.left = target + 'px';
    settleIdle(p);
  });
}
/* things fall out of the sky, land on the ground line, one bounce, dust */
function propFall(p, ep) {
  const groundTop = propTop(p);
  let y = -p.dh - 70, v = 0;
  p.node.style.left = (clamp01(p.x) * S.W - p.dw / 2) + 'px';
  p.node.style.top = y + 'px';
  return phys(ep, (dt) => {
    v += GRAV * dt; y += v * dt;
    if (y >= groundTop) {
      y = groundTop;
      if (v > 300) {                              /* impact — bounce once */
        v = -v * .24;
        p.node.style.transform = `rotate(${rr(Math.random, -8, 8).toFixed(1)}deg)`;
        poofFx(clamp01(p.x) * S.W, S.gy + 2);
      } else {
        p.node.style.top = y + 'px';
        p.node.style.transform = '';
        return true;
      }
    } else {
      p.node.style.top = y + 'px';
      p.node.style.transform = `rotate(${(Math.sin(y * .018) * 9).toFixed(1)}deg)`;
    }
    return false;
  }).then(() => {                                 /* settle even if aborted */
    p.node.style.top = groundTop + 'px';
    p.node.style.transform = '';
    settleIdle(p);
  });
}
/* sky-things (clouds etc.) drift down to their hover height */
function descendProp(p, ep) {
  const top = propTop(p);
  const y0 = Math.min(-p.dh - 20, top - 170);
  p.node.style.left = (clamp01(p.x) * S.W - p.dw / 2) + 'px';
  p.node.style.top = y0 + 'px';
  return tween(850, (k) => {
    p.node.style.top = (y0 + (top - y0) * easeOut(k) + Math.sin(k * Math.PI) * -10) + 'px';
  }).then(() => { p.node.style.top = top + 'px'; settleIdle(p); });
}

function spawnProp(rawKind, xFrac, opts) {
  opts = opts || {};
  const res = window.resolveKind(rawKind);
  const def = window.PROPDEF[res.def] || window.PROPDEF.doodle;
  const big = def.cat === 'structure' || def.cat === 'wolf';
  const art = drawPropArt(def, res, big ? 250 : 170, big ? 215 : 140);
  const node = document.createElement('div');
  node.className = 'prop';
  node.id = 'prop-' + (++S.propSeq);
  node.style.width = art.dw + 'px';
  node.style.height = art.dh + 'px';
  node.appendChild(art.canvas);
  propLayer.appendChild(node);
  const p = { node, canvas: art.canvas, def, res, cat: def.cat, raw: rawKind,
              x: xFrac == null ? .5 : xFrac, dw: art.dw, dh: art.dh,
              pinned: false, attached: false, enter: null };
  S.props.set(node.id, p);
  const ep = opts.ep;
  if (p.cat === 'ride' || p.cat === 'pal') p.enter = slideInProp(p, 'right', ep);
  else if (p.cat === 'wolf') p.enter = slideInProp(p, 'left', ep);
  else if (p.cat === 'weather') p.enter = descendProp(p, ep);
  else if (opts.drop || p.cat === 'heavy' || p.cat === 'slip' || p.cat === 'splashy' ||
           (p.cat === 'silly' && p.res.def !== 'doodle'))
    p.enter = propFall(p, ep);
  else {
    placeProp(p);
    node.classList.add('pop');
    p.enter = sleep(560);
    setTimeout(() => { node.classList.remove('pop'); settleIdle(p); }, 950);
  }
  /* keep the stage tidy — oldest loose prop wanders off */
  if (S.props.size > 12) {
    for (const [oid, q] of S.props) {
      if (q === p || q === S.riding || q.pinned || q.attached) continue;
      poofProp(oid); break;
    }
  }
  return p;
}
function findProp(rawKind) {
  const def = window.resolveKind(rawKind).def;
  for (const [id, p] of S.props) if (p.res.def === def) return id;
  return null;
}
function poofProp(id) {
  const p = S.props.get(id);
  if (!p) return;
  S.props.delete(id);
  if (S.riding === p) dismount();
  p.node.classList.remove('bob', 'pop', 'drops', 'wiggle', 'shake');
  p.node.classList.add('fadeout');
  const px = p.attached ? S.heroX : p.x * S.W;
  const py = p.attached ? S.gy - 120 : propTop(p) + 10;
  for (let i = 0; i < 3; i++) fxBit('poof', px - 10 + i * 14, py, 10 + i * 4);
  setTimeout(() => p.node.remove(), 480);
}
function reactProp(id) {
  const p = S.props.get(id);
  if (!p) return;
  p.node.classList.remove('wiggle', 'shake');
  void p.node.offsetWidth;
  p.node.classList.add('wiggle');
  setTimeout(() => p.node.classList.remove('wiggle'), 1050);
}

/* ---- rides: the prop climbs into rideLayer under the hero ---- */
function placeRide() {
  if (!S.riding) return;
  const p = S.riding;
  p.node.style.left = (S.heroX - p.dw / 2) + 'px';
  p.node.style.top = (S.gy + 8 - p.dh) + 'px';
}
/* mount it for real: the critter scoots under the hero, hero hops aboard */
async function mountRide(p, ep) {
  if (S.riding && S.riding !== p) dismount();
  if (p.enter) await p.enter;                       /* finish trotting in */
  if (ep != null && !okEp(ep)) return;
  const from = parseFloat(p.node.style.left) || 0;
  const to = S.heroX - p.dw / 2;
  await tween(430, (k) => {
    p.node.style.left = (from + (to - from) * easeIO(k)) + 'px';
  });
  if (ep != null && !okEp(ep)) return;
  S.riding = p; p.pinned = true;
  rideLayer.appendChild(p.node);          // z7 — hero tucks in behind
  p.node.classList.remove('bob', 'wiggle');
  placeRide();
  await heroHop(44, ep);                          /* hop aboard! */
  if (ep != null && !okEp(ep)) return;
  hinner.classList.add('riding');
  placeHero();
}
function dismount() {
  if (!S.riding) return;
  const p = S.riding;
  S.riding = null;
  hinner.classList.remove('riding');
  placeHero();
  if (p && p.node.isConnected) {
    propLayer.appendChild(p.node);
    p.node.classList.add('bob');
    placeProp(p);
  }
}

/* ---- gear: props that live ON the hero (head / hand) ---- */
function attachProp(rawKind, slot) {
  const res = window.resolveKind(rawKind);
  const def = window.PROPDEF[res.def] || window.PROPDEF.doodle;
  const art = drawPropArt(def, res, slot === 'head' ? 96 : 84, slot === 'head' ? 76 : 88);
  const node = document.createElement('div');
  node.className = 'prop';
  node.id = 'prop-' + (++S.propSeq);
  node.appendChild(art.canvas);
  const host = slot === 'head' ? headprop : heldprop;
  /* old gear politely pops off */
  for (const [id, q] of S.props) if (q.attached === slot) poofProp(id);
  node.classList.add('pop');
  host.appendChild(node);
  const p = { node, canvas: art.canvas, def, res, cat: def.cat, raw: rawKind,
              x: 0, dw: art.dw, dh: art.dh, pinned: true, attached: slot };
  S.props.set(node.id, p);
  if (slot === 'held' && def.cat === 'light') updateGlow();
  return p;
}
function updateGlow() {
  let lit = false;
  for (const p of S.props.values()) if (p.attached === 'held' && p.cat === 'light') lit = true;
  const on = lit && S.dark;
  glowDot.classList.toggle('on', on);
  if (on) {
    glowDot.style.left = (S.heroX - 150 + 60) + 'px';
    glowDot.style.top = (S.gy - 230) + 'px';
  }
}

/* ============================================================
   FX PARTICLES + REACTIONS
   ============================================================ */
function fxBit(cls, x, y, s) {
  const i = document.createElement('i');
  i.className = cls;
  i.style.left = x + 'px'; i.style.top = y + 'px';
  if (s) { i.style.width = s + 'px'; i.style.height = s + 'px'; }
  fx.appendChild(i);
  setTimeout(() => i.remove(), 3000);
}
const poofFx = (x, y) => { for (let i = 0; i < 3; i++) fxBit('poof', x + i * 16 - 8, y - i * 8, 12 + i * 5); };
const dropFx = (x, y) => { for (let i = 0; i < 4; i++) fxBit('drop', x + i * 14 - 16, y - (i % 2) * 14, 9); };
const starFx = (x, y) => { for (let i = 0; i < 3; i++) setTimeout(() => fxBit('star', x + i * 26 - 20, y + (i % 2) * 18 - 10, 16), i * 110); };

function gag(cls, ms) {
  return new Promise((res) => {
    hinner.classList.add(cls);
    setTimeout(() => { hinner.classList.remove(cls); res(); }, ms);
  });
}
function dizzy(ms) {
  dizzyEl.classList.add('on');
  setTimeout(() => dizzyEl.classList.remove('on'), ms || 1400);
}
function cheer(text) {
  cheerEl.textContent = text;
  cheerEl.classList.remove('pop'); void cheerEl.offsetWidth;
  cheerEl.classList.add('pop');
}
function coach(t, mood) {
  coachEl.textContent = t;
  coachP.className = 'coach' + (mood ? ' ' + mood : '');
}
const heroName = () => (heroNameIn.value || 'Pip').trim() || 'Pip';
const heroDesc = () => `a kid-drawn crayon hero named "${heroName()}"`;

/* ---- the gag dispatcher: what does this prop DO to the hero?
   `ok` = the LLM's verdict on the typed word. Sensible words just
   arrive; silly ones (success=false) play the full slapstick fail.
   And some props are born silly — a banana peel slips you no matter
   how serious the story-brain was being (SLIP_KINDS / SILLY_KINDS). ---- */
async function applyProp(p, ep, ok) {
  const cat = p.cat;
  if (p.enter) { await p.enter; if (!okEp(ep)) return; }   /* land first! */
  /* inherently goofy props always cause the gag */
  const gagIt = !ok || SLIP_KINDS.has(p.res.def) ||
    (SILLY_KINDS.has(p.res.def) && p.res.def !== 'doodle');
  switch (cat) {
    case 'slip': {
      await heroWalkTo(p.x * S.W - 30, 640, ep); if (!okEp(ep)) return;
      if (!gagIt) {                    /* just… there */
        starFx(p.x * S.W, propTop(p));
        return;
      }
      coach(`Whoops — a ${p.res.word}! Right under your feet!`, 'uhoh');
      S.slips++; S.silly.add(String(p.raw || p.res.word));
      await gag('g-slip', 1160);
      dizzy(1400); poofFx(S.heroX + 30, S.gy - 10);
      await gag('g-dust', 700);
      coach('Dust yourself off — onward!', '');
      return;
    }
    case 'splashy': {
      await heroWalkTo(p.x * S.W - 20, 640, ep); if (!okEp(ep)) return;
      if (!gagIt) { starFx(p.x * S.W, propTop(p)); return; }
      coach('Splash! Right into the puddle!', 'uhoh');
      S.slips++; S.silly.add(String(p.raw || p.res.word));
      dropFx(S.heroX + 20, S.gy - 30);
      await gag('g-splash', 900);
      hinner.classList.add('soggy');
      setTimeout(() => hinner.classList.remove('soggy'), 2600);
      await gag('g-dust', 700);
      return;
    }
    case 'heavy': {
      /* it just fell out of the sky beside the hero — bonk! */
      if (!gagIt) { starFx(p.x * S.W, propTop(p)); return; }
      coach(`Look out — a falling ${p.res.word}!`, 'uhoh');
      await sleep(140); if (!okEp(ep)) return;
      S.slips++; S.silly.add(String(p.raw || p.res.word));
      poofFx(S.heroX + 24, S.gy - 26);
      await gag('g-bonk', 1250);
      dizzy(1400);
      await gag('g-dust', 700);
      return;
    }
    case 'silly': {
      if (!gagIt) {                    /* a doodle the story wanted */
        p.node.classList.add('hop-in-place');
        setTimeout(() => p.node.classList.remove('hop-in-place'), 600);
        starFx(p.x * S.W, propTop(p));
        return;
      }
      coach(`A ${p.res.word}? Of course a ${p.res.word}!`, 'uhoh');
      S.slips++; S.silly.add(String(p.raw || p.res.word));
      await gag('g-spin', 1300);
      dizzy(1300); poofFx(S.heroX, S.gy - 20);
      await gag('g-dust', 700);
      coach('Everyone giggles. Try a real story word!', '');
      return;
    }
    case 'ride': {
      cheer('hop on!');
      await mountRide(p, ep);
      if (!okEp(ep)) return;
      coach(`Riding the ${p.res.word} — giddyup!`, 'yay');
      return;
    }
    case 'wolf': {
      /* the wolf always prowls in from stage left */
      coach('The Big Bad Wolf is peeking — keep moving!', 'uhoh');
      hinner.classList.add('scared');
      pigA.classList.add('excited'); pigB.classList.add('excited');
      setTimeout(() => { hinner.classList.remove('scared');
        pigA.classList.remove('excited'); pigB.classList.remove('excited'); }, 1600);
      setWolf(S.wolf + .16);
      return;
    }
    case 'pal': {
      S.pigs++;
      pigA.classList.add('excited'); pigB.classList.add('excited');
      setTimeout(() => { pigA.classList.remove('excited'); pigB.classList.remove('excited'); }, 1700);
      cheer('oink!');
      coach(`A pig friend hurries over! (${Math.min(S.pigs + 2, 3)} pig pals together)`);
      await gag('g-cheer', 900);
      return;
    }
    case 'material': {
      p.node.classList.add('hop-in-place');
      setTimeout(() => p.node.classList.remove('hop-in-place'), 600);
      starFx(p.x * S.W, propTop(p) - 10);
      coach('Building stuff! The pigs can use that.', 'yay');
      await gag('g-cheer', 900);
      return;
    }
    case 'crossing': {
      coach(`A way across — clever!`, 'yay');
      starFx(p.x * S.W, propTop(p));
      return;
    }
    case 'weather': {
      /* clouds hover; make it rain a little */
      for (let i = 0; i < 8; i++)
        setTimeout(() => fxBit('rain', p.x * S.W - 40 + i * 12, propTop(p) + p.dh - 8), i * 90);
      coach('Rain clouds roll in — hurry along!', 'uhoh');
      return;
    }
    case 'item': {
      if (/cookiejar|gift|chest/.test(p.res.def)) {
        cheer('oooh!');
        await gag('g-nom', 1050);
        p.node.classList.add('sinks');
        setTimeout(() => poofProp(p.node.id), 700);
        return;
      }
      starFx(p.x * S.W, propTop(p));
      return;
    }
    default: return;   /* structures, scenery — just stand there looking drawn */
  }
}

/* ============================================================
   METERS — goal bar + wolf huff-meter
   ============================================================ */
function setGoal(p, ok, force) {
  const t = clamp01(p);
  /* smooth + monotonic-ish: climbs freely, dips only slightly on an
     explicit fail beat — never teleports 40% → 2% */
  if (force || t >= S.goal) S.goal = t;
  else if (ok === false) S.goal = Math.max(t, S.goal - .06);
  goalFill.style.width = (S.goal * 100).toFixed(1) + '%';
}
const WOLF_WORDS = [
  [.25, 'wolf is far away'], [.5, 'wolf is sniffing around'],
  [.75, 'the wolf is getting close'], [.95, 'the wolf is RIGHT there'],
  [2, 'HUFF AND PUFF TIME!'],
];
function setWolf(p) {
  S.wolf = clamp01(p);
  const lit = Math.round(S.wolf * wolfSegs.length);
  wolfSegs.forEach((el, i) => {
    el.classList.toggle('on', i < lit);
    el.classList.toggle('hot', i === lit - 1 && S.wolf > .6);
  });
  wolfLabel.textContent = WOLF_WORDS.find(([t]) => S.wolf < t)[1];
}

/* ---- the huff & puff: the wolf shakes and shoves the whole world ---- */
async function huffPuff(ep) {
  coach('The wolf huffs… and PUFFS!', 'uhoh');
  hinner.classList.add('scared');
  stage.classList.remove('huffed'); void stage.offsetWidth;
  stage.classList.add('huffed');
  setTimeout(() => stage.classList.remove('huffed'), 880);
  for (let i = 0; i < 6; i++)
    setTimeout(() => fxBit('puff', 18 + i * 10, S.gy - 40 - i * 14, 22 + i * 6), i * 110);
  /* the gust shoves the hero back a step, then they recover */
  const hx = S.heroX, shove = Math.min(30, Math.max(10, S.heroX - 80));
  tween(340, k => { S.heroX = hx - shove * easeOut(k); placeHero(); pigsPlace(S.heroX); placeRide(); })
    .then(() => tween(520, k => {
      if (!okEp(ep)) return;
      S.heroX = (hx - shove) + shove * easeIO(k); placeHero(); pigsPlace(S.heroX); placeRide();
    }));
  await sleep(560); if (!okEp(ep)) { hinner.classList.remove('scared'); return; }
  let brickHeld = false;
  for (const [id, p] of S.props) {
    if (p.attached || p === S.riding) continue;
    if (p.cat === 'structure') {
      if (p.res.def === 'brickhouse' || p.res.def === 'wall') {
        brickHeld = true;
        p.node.classList.add('shake');
        setTimeout(() => p.node.classList.remove('shake'), 950);
      } else {
        p.node.classList.remove('bob');
        p.node.classList.add('tipover');
        setTimeout(() => { if (S.props.has(id)) poofProp(id); }, 850);
      }
    } else {
      /* loose props tumble along the ground with the gust */
      const l0 = parseFloat(p.node.style.left) || 0;
      const push = 50 + Math.random() * 80;
      p.node.classList.remove('bob');
      p.node.classList.add('wiggle');
      tween(540, k => {
        p.node.style.left = (l0 + push * easeOut(k)) + 'px';
      }).then(() => {
        if (!S.props.has(id) || p.attached) return;
        p.x = clamp01((parseFloat(p.node.style.left) + p.dw / 2) / S.W);
        p.node.classList.remove('wiggle');
        settleIdle(p);
      });
    }
  }
  await sleep(900); if (!okEp(ep)) { hinner.classList.remove('scared'); return; }
  hinner.classList.remove('scared');
  coach(brickHeld
    ? 'The brick house does NOT budge. Not one brick!'
    : 'Whoosh! Weak houses tumble — need stronger stuff!', brickHeld ? 'yay' : 'uhoh');
  setWolf(.42);                              /* the wolf needs a breather */
}

/* ============================================================
   NARRATIVE TYPEWRITER + CHIPS + DID-YOU-MEAN
   ============================================================ */
let typerId = 0;
function typewrite(text, ep) {
  const id = ++typerId;
  narrEl.innerHTML = '';
  const txt = document.createTextNode('');
  const cur = document.createElement('span');
  cur.className = 'cursor'; cur.textContent = '|';
  narrEl.appendChild(txt); narrEl.appendChild(cur);
  let i = 0;
  (function step() {
    if (id !== typerId || (ep != null && !okEp(ep))) return;
    if (i >= text.length) { setTimeout(() => { if (id === typerId) cur.remove(); }, 1000); return; }
    const ch = text[i++];
    txt.textContent += ch;
    setTimeout(step, ch === ' ' ? 14 : 26);
  })();
}
function setChips(list) {
  choicesEl.innerHTML = '';
  (list || []).slice(0, 4).forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'choicechip';
    b.textContent = c;
    b.addEventListener('click', () => { blank.value = c; fitBlank(); submitWord(); });
    choicesEl.appendChild(b);
  });
}
function showDym(word) {
  if (!word) { dymEl.hidden = true; return; }
  dymBtn.textContent = word;
  dymBtn.dataset.word = word;
  dymEl.hidden = false;
}

/* local near-miss guesser when the LLM leaves did_you_mean null */
const DYM_WORDS = ['straw','sticks','bricks','house','unicorn','banana','peel',
  'wolf','pig','bridge','boat','raft','ladder','torch','lantern','cookie',
  'umbrella','balloon','mushroom','flower','tree','rock','key','door','hat',
  'log','plank','stones','toaster','piano','sock','soap','slime','puddle',
  'dragon','duck','fish','turtle','moon','star','run','hide','build','jump',
  'swim','climb','inside','gather','dance','sing','help','cross','dig'];
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1,
        d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[m][n];
}
function localDym(word) {
  const w = word.toLowerCase().trim();
  if (!w || w.length < 3 || DYM_WORDS.includes(w)) return null;
  let best = null, bd = 99;
  for (const c of DYM_WORDS) {
    const d = lev(w, c);
    if (d < bd) { bd = d; best = c; }
  }
  return bd <= 2 && bd < w.length ? best : null;
}

/* ============================================================
   THE LLM TURN — type a word, the story-brain re-draws the world
   ============================================================ */
const llm = new StoryLLM({
  mode: 'remote',
  onStatus(st) {
    if (st.waiting) latChip.textContent = 'waiting for memory headroom…';
    else if (st.failed) latChip.textContent = 'the story-brain is napping — trying again…';
    else latChip.innerHTML = 'asking the story-brain<span class="tdots"><i></i><i></i><i></i></span>';
  },
});

/* re-enable the input + fire any word the kid queued mid-transition */
function releaseInput(ep) {
  S.busy = false;
  if (!S.started || !okEp(ep)) return;
  blank.disabled = false; goBtn.disabled = false;
  if (!S.demoOn) blank.focus({ preventScroll: true });
  if (S.pending) {
    const nx = S.pending; S.pending = null;
    blank.value = nx; fitBlank();
    submitWord();
  }
}

async function submitWord() {
  const word = (blank.value || '').trim().slice(0, 28);
  if (!word) {
    blankBox.classList.remove('nope'); void blankBox.offsetWidth;
    blankBox.classList.add('nope');
    return;
  }
  if (!S.started) return;
  if (S.busy) {                          /* typed mid-travel? queue it, never eat it */
    S.pending = word;
    blank.value = ''; fitBlank();
    coach(`“${word}” — got it! One second…`);
    return;
  }
  S.busy = true;
  blank.value = ''; fitBlank();
  goBtn.disabled = true; blank.disabled = true;
  showDym(null);
  latChip.hidden = false; latChip.classList.remove('demo');
  latChip.innerHTML = 'asking the story-brain<span class="tdots"><i></i><i></i><i></i></span>';

  const ep = S.epoch;
  /* strictly sequential LLM calls — never two in flight at once */
  while (S.llmBusy && okEp(ep)) await sleep(140);
  if (!okEp(ep)) { S.busy = false; return; }
  S.llmBusy = true;
  let gm = null;
  try {
    gm = await llm.next({
      goal: GOAL, history: S.history.slice(-4),
      playerText: word, hero: heroDesc(),
    });
  } finally { S.llmBusy = false; }
  if (!okEp(ep)) { S.busy = false; return; }

  /* --- latency + mode chips (honest: real source or "demo mode") --- */
  const ms = gm._meta && gm._meta.ms;
  if (!gm._meta || gm._meta.source === 'offline') {
    latChip.textContent = 'demo mode · canned narrator';
    latChip.classList.add('demo');
    modeChip.textContent = 'demo mode';
  } else {
    S.latHist.push(ms || 0);
    latChip.textContent = `story-brain answered in ${((ms || 0) / 1000).toFixed(1)}s`;
    modeChip.textContent = gm._meta.mode === 'local' ? 'live LLM · local' : 'live LLM';
  }

  /* --- narrative + obstacles (textContent — always kid-safe) --- */
  if (gm.narrative) typewrite(gm.narrative, ep);
  obRow.innerHTML = '';
  (gm.obstacles || []).forEach(o => {
    const c = document.createElement('span');
    c.className = 'obschip';
    c.textContent = 'uh oh — ' + o;
    obRow.appendChild(c);
  });
  S.history.push(`${word} -> ${(gm.narrative || '').slice(0, 90)}`);
  S.words.push(word);

  /* --- goal bar first (clamped, never teleports down) so the
     road beneath the hero knows how far we've come --- */
  const prevGoal = S.goal;
  setGoal(gm.goal_progress, gm.success);
  if (!gm.success) S.silly.add(word);          /* mark the chip "oops" in the recap */
  const gained = Math.max(0, S.goal - prevGoal);

  /* --- TRAVEL: the world pans into the new stretch of road while
     the hero strides left→right and the old roadside sweeps past --- */
  const meta = await travelToScene(gm.scene_seed, ep);
  S.sceneSeed = (gm.scene_seed.seed | 0) || S.sceneSeed;
  if (!okEp(ep)) { S.busy = false; return; }
  startAmbient(meta, ep);
  /* kinds the terrain painter can't name get a DOM doodle instead */
  (gm.scene_seed.props || []).slice(0, 4).forEach((k, i) => {
    if (window.resolveKind(k).def !== 'doodle') return;
    if (findProp(k) != null) return;
    spawnProp(k, .2 + i * .26, { ep });
  });

  /* --- the kid's own typed word ALWAYS becomes a thing first —
     the GM may not echo it into props[]; never silently skip what
     was typed ("unicorn" must appear + be ridden, "banana peel"
     must appear + be slipped on, anything odd gets a labeled
     doodle — courtesy of resolveKind's last-resort mapping) --- */
  const kidRes = window.resolveKind(word);
  const kidDef = window.PROPDEF[kidRes.def] || window.PROPDEF.doodle;
  const kidExist = findProp(word);
  if (kidExist) {
    reactProp(kidExist);
    const ex = S.props.get(kidExist);
    if (ex && (ex.cat === 'wolf' || ex.cat === 'pal' ||
        (ex.cat === 'ride' && S.riding !== ex)))      /* "unicorn!" again = hop back on */
      await applyProp(ex, ep, gm.success);
  } else if (kidDef.cat === 'head' || kidDef.cat === 'light') {
    attachProp(word, kidDef.cat === 'head' ? 'head' : 'held');
    cheer(kidDef.cat === 'head' ? 'nice hat!' : 'a light!');
    await gag('g-cheer', 900);
    if (!okEp(ep)) { S.busy = false; return; }
  } else {
    const kx = kidDef.cat === 'heavy' ? clamp01((S.heroX + 56) / S.W)
             : kidDef.cat === 'wolf' ? .14
             : clamp01(S.heroX / S.W + .22);            /* just up the road */
    const kp = spawnProp(word, kx, { ep, drop: !gm.success && kidDef.cat === 'silly' });
    await applyProp(kp, ep, gm.success);
    if (!okEp(ep)) { S.busy = false; return; }
  }

  /* --- the GM's props: physical spawns + gags --- */
  const hasRide = kidDef.cat === 'ride' || (gm.props || []).some(pr =>
    pr.action !== 'remove' && window.PROPDEF[window.resolveKind(pr.kind).def] &&
    window.PROPDEF[window.resolveKind(pr.kind).def].cat === 'ride');
  if (S.riding && !hasRide) dismount();

  for (const pr of (gm.props || [])) {
    if (!okEp(ep)) break;
    const res = window.resolveKind(pr.kind);
    const def = window.PROPDEF[res.def];
    if (pr.action === 'remove') {
      const id = findProp(pr.kind); if (id) poofProp(id);
      continue;
    }
    if (pr.action === 'react') {
      const id = findProp(pr.kind);
      if (id) reactProp(id); else spawnProp(pr.kind, pr.x, { ep });
      continue;
    }
    /* spawn — or jiggle the one already standing there */
    const existId = findProp(pr.kind);
    if (existId) {
      reactProp(existId);
      const ex = S.props.get(existId);
      if (ex && (ex.cat === 'wolf' || ex.cat === 'pal')) await applyProp(ex, ep, gm.success);
      continue;
    }
    /* falling things bonk the hero; the wolf prowls in from the left */
    if (def && def.cat === 'heavy') pr.x = clamp01((S.heroX + 56) / S.W);
    if (def && def.cat === 'wolf') pr.x = Math.min(clamp01(pr.x), .16);
    /* head/hand gear never litters the ground */
    if (def && (def.cat === 'head' || def.cat === 'light')) {
      const g = attachProp(pr.kind, def.cat === 'head' ? 'head' : 'held');
      g.x = pr.x;
      cheer(def.cat === 'head' ? 'nice hat!' : 'a light!');
      await gag('g-cheer', 900);
      continue;
    }
    const p = spawnProp(pr.kind, pr.x, { ep, drop: !gm.success && def && def.cat === 'silly' });
    await applyProp(p, ep, gm.success);
    await sleep(140);
  }
  if (!okEp(ep)) { S.busy = false; return; }

  /* --- did you mean --- */
  showDym(gm.did_you_mean || localDym(word));

  /* --- wolf pressure --- */
  let dw = .05 + (gm.success ? 0 : .10) + (gm.obstacles || []).length * .03 - gained * .35;
  if (!gm.success) dw += .02;
  setWolf(S.wolf + dw);
  setChips(gm.choices);

  /* --- settle into the new stretch if the goal ran ahead of our stride --- */
  if (okEp(ep) && restX() > S.heroX + 12) await heroWalkTo(restX(), 700, ep);

  /* --- huff & puff threshold, then the win check --- */
  if (S.wolf >= .92 && okEp(ep)) await huffPuff(ep);
  if (S.goal >= .98 && okEp(ep)) { await winSeq(ep); return; }

  releaseInput(ep);
}

/* ============================================================
   WIN — into the brick house!
   ============================================================ */
async function winSeq(ep) {
  coach('Run! The brick house door is open!', 'yay');
  await heroWalkTo(S.W * .8, 1100, ep);
  if (!okEp(ep)) { S.busy = false; return; }
  cheer('safe!');
  hinner.classList.add('g-enter');            /* shrinks through the door */
  for (let i = 0; i < 6; i++)
    setTimeout(() => fxBit('star', S.W * .74 + Math.random() * S.W * .16,
      S.gy - 90 - Math.random() * 70, 14 + Math.random() * 10), i * 120);
  await sleep(1000);
  if (!okEp(ep)) { hinner.classList.remove('g-enter'); S.busy = false; return; }
  hinner.classList.remove('g-enter');

  recapEl.innerHTML = '';
  S.words.slice(-10).forEach(w => {
    const c = document.createElement('span');
    const silly = S.silly.has(w);
    c.className = 'rechip' + (silly ? ' silly' : '');
    c.textContent = w;
    if (silly) {
      const t = document.createElement('span');
      t.className = 'tag'; t.textContent = 'oops';
      c.appendChild(t);
    }
    recapEl.appendChild(c);
  });
  slipsEl.textContent =
    `${S.words.length} word${S.words.length === 1 ? '' : 's'} typed` +
    (S.slips ? ` — with ${S.slips} silly slip${S.slips === 1 ? '' : 's'}!` : ' — not one silly slip!');
  const real = S.latHist.filter(m => m > 0).length;
  const avg = real ? (S.latHist.reduce((a, b) => a + b, 0) / S.latHist.length / 1000).toFixed(1) : 0;
  endBlurb.textContent = real
    ? `The wolf huffed and puffed and gave up — and every single beat was ` +
      `answered by the real story-brain (about ${avg}s a turn). Your hero did that!`
    : 'The wolf huffed and puffed and… gave up and went home for cocoa. Your hero did that!';
  endTitle.textContent = `${heroName()} made it home!`;
  endOv.hidden = false;
  requestAnimationFrame(() => endOv.classList.add('show'));
  S.pending = null;
  S.busy = false;
}

/* ============================================================
   STORY START / RESET
   ============================================================ */
function showOverlay(ov) {
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('show'));
}
function hideOverlay(ov) {
  ov.classList.remove('show');
  setTimeout(() => { if (!ov.classList.contains('show')) ov.hidden = true; }, 360);
}

function startStory() {
  S.started = true;
  hideOverlay(makerOv);
  typewrite(`Three little pigs need to reach the strong brick house before ` +
    `the wolf huffs and puffs. ${heroName()}, lead the way!`);
  coach('Try “straw” to gather building stuff — or anything silly!');
  modeChip.textContent = 'your turn!';
  blank.disabled = false; goBtn.disabled = false;
  blank.focus({ preventScroll: true });
  heroWalkTo(S.W * .16, 700);          /* the first steps of the journey */
  heroHop(40);                          /* and a happy little leap */
  cheer(`it's ${heroName()}!`);
}

function resetGame(keepHero) {
  S.epoch++;
  S.busy = false; S.demoOn = false; S.pending = null; S.heroLift = 0;
  S.history = []; S.words = []; S.silly = new Set();
  S.slips = 0; S.pigs = 0; S.latHist.length = 0;
  S.goal = 0; S.heroX = Math.max(90, S.W * .11);
  S.riding = null;
  [...S.props.keys()].forEach(id => { S.props.get(id).node.remove(); });
  S.props.clear();
  fx.innerHTML = '';
  headprop.innerHTML = ''; heldprop.innerHTML = '';
  glowDot.classList.remove('on');
  hinner.className = 'hinner';
  pigA.classList.remove('walking', 'excited'); pigB.classList.remove('walking', 'excited');
  dizzyEl.classList.remove('on');
  /* settle the double-buffer so no half-slid scene survives a reset */
  front.style.transform = ''; back.style.transform = '';
  front.style.zIndex = 2; back.style.zIndex = 1;
  wipeEdge.classList.remove('on'); wipeEdge.style.opacity = '';
  setGoal(0, true, true); setWolf(.14);
  narrEl.textContent = 'The crayons are warming up…';
  obRow.innerHTML = ''; setChips([]); showDym(null);
  coach(keepHero ? 'Off we go again — type a word!' : 'Draw your hero first — the crayons are waiting!');
  modeChip.textContent = keepHero ? 'your turn!' : 'draw your hero!';
  endOv.classList.remove('show'); endOv.hidden = true;
  stopBtn.classList.remove('show');
  S.started = !!keepHero;
  if (!keepHero) { blank.disabled = true; goBtn.disabled = true; }
  /* re-render the meadow so the page turn doesn't keep last scene's seed */
  const ss = { biome: 'meadow', seed: S.sceneSeed = ((Math.random() * 0x7ffffffe) | 0) + 1,
               palette: 'warm', props: [] };
  const meta = renderInto(front, ss);
  S.lastScene = ss; S.gy = meta.gy; S.dark = meta.dark;
  startAmbient(meta, S.epoch);
  placeHero(); pigsPlace(S.heroX);
  if (keepHero) startStory();
}

/* ============================================================
   WATCH IT PLAY — the whole journey through the REAL LLM
   ============================================================ */
const DEMO_WORDS = ['gather straw', 'sticks', 'unicorn', 'banana peel',
  'bricks', 'brick house', 'hide inside', 'slam the door', 'safe at last'];
/* gentle closers — only used if the story-brain hasn't reached the
   payoff yet; still scripted words, never invented narrative */
const DEMO_TAIL  = ['open the door', 'inside the brick house',
  'cheer with the pig friends', 'home at last'];

async function startDemo() {
  if (S.demoOn) return;
  const ep = ++S.epoch;
  S.demoOn = true;
  stopBtn.classList.add('show');
  endOv.classList.remove('show'); endOv.hidden = true;
  modeChip.textContent = 'watching the show';

  /* resource guardrail: a whole scripted LLM journey is a heavy op */
  latChip.hidden = false;
  latChip.textContent = 'checking memory headroom…';
  const headroom = await llm.waitForHeadroom(4).catch(() => false);
  if (!okEp(ep)) return;
  if (!headroom) coach('The machine is busy — the show may be slow!', 'uhoh');

  /* hands-free hero if we need one */
  if (!S.started || !S.heroReady) {
    showOverlay(makerOv);
    await sleep(280); if (!okEp(ep)) return;
    await window.HeroMaker.surprise(true); if (!okEp(ep)) return;
    window.HeroMaker.cropHero();
    S.heroReady = true;
    if (!heroNameIn.value.trim()) heroNameIn.value = 'Pip';
    await sleep(300); if (!okEp(ep)) return;
    if (!S.started) startStory();
  }

  for (const word of [...DEMO_WORDS, ...DEMO_TAIL]) {
    if (!okEp(ep)) return;
    while (S.busy && okEp(ep)) await sleep(160);
    if (!okEp(ep)) return;
    await sleep(480); if (!okEp(ep)) return;
    /* type it like a kid */
    blank.value = '';
    for (const ch of word) {
      if (!okEp(ep)) return;
      blank.value += ch; fitBlank();
      await sleep(70 + Math.random() * 80);
    }
    await sleep(360); if (!okEp(ep)) return;
    submitWord();
    while (S.busy && okEp(ep)) await sleep(160);
    if (S.goal >= .98) break;
  }
  while (S.busy && okEp(ep)) await sleep(160);
  if (okEp(ep)) {
    S.demoOn = false;
    stopBtn.classList.remove('show');
    modeChip.textContent = 'your turn!';
  }
}
function stopDemo() {
  S.epoch++;                                 /* cancels every in-flight beat */
  S.demoOn = false;
  S.busy = false;
  S.pending = null;
  stopBtn.classList.remove('show');
  hinner.classList.remove('walking', 'running', 'scared');
  pigA.classList.remove('walking'); pigB.classList.remove('walking');
  modeChip.textContent = 'your turn!';
  if (S.started) {
    blank.value = '';                        /* drop any half-typed demo word */
    fitBlank();
    blank.disabled = false; goBtn.disabled = false;
    coach('You take over — type a word!');
  }
}
watchBtn.addEventListener('click', startDemo);
watchBtn2.addEventListener('click', startDemo);
stopBtn.addEventListener('click', stopDemo);

/* the v3 dashboard drives every variant's iframe via these globals */
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;

/* ============================================================
   MAKER + INPUT WIRING
   ============================================================ */
doneBtn.addEventListener('click', () => {
  if (window.HeroMaker.busy) return;
  if (!window.HeroMaker.hasDrawing) {
    coach('Draw a hero first — or press “Surprise me”!', 'uhoh');
    return;
  }
  if (!window.HeroMaker.cropHero()) {
    coach('Give your hero a little more crayon!', 'uhoh');
    return;
  }
  S.heroReady = true;
  startStory();
});
surpriseBtn.addEventListener('click', () => window.HeroMaker.surprise(false));
clearBtn.addEventListener('click', () => window.HeroMaker.clear());

againBtn.addEventListener('click', () => {
  resetGame(false);
  S.heroReady = false;
  window.HeroMaker.clear();
  showOverlay(makerOv);
  requestAnimationFrame(() => window.HeroMaker.resize());
});
watchAgainBtn.addEventListener('click', () => { resetGame(true); startDemo(); });

goBtn.addEventListener('click', submitWord);
blank.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
});
blank.addEventListener('input', () => { showDym(null); fitBlank(); });
dymBtn.addEventListener('click', () => {
  blank.value = dymBtn.dataset.word || '';
  showDym(null); fitBlank();
  submitWord();
});
tapType.addEventListener('click', () => {
  blank.scrollIntoView({ block: 'center', behavior: 'smooth' });
  blank.focus({ preventScroll: true });
});

/* the input grows with the word; the crayon underline follows */
function fitBlank() {
  mirror.textContent = blank.value || blank.placeholder || 'type a word!';
  const w = Math.min(320, Math.max(150, mirror.offsetWidth + 34));
  blank.style.width = w + 'px';
  drawUnderLine();
}
function drawUnderLine() {
  const w = (blankBox && blankBox.clientWidth) || 160;
  underSvg.setAttribute('viewBox', `0 0 ${w} 14`);
  underSvg.innerHTML = '';
  const rs = rough.svg(underSvg);
  const pts = [];
  for (let x = 4; x <= w - 4; x += 9)
    pts.push([x, 7 + Math.sin(x * .33) * 2.4]);
  underSvg.appendChild(rs.curve(pts,
    { stroke: '#FF6B57', strokeWidth: 3.4, roughness: 2.4, bowing: 5, seed: 42 }));
}

/* ============================================================
   BOOT — first sketch, pig pals, squiggles, resize
   ============================================================ */
function drawPigPal(cv, seed) {
  const def = window.PROPDEF.pig;
  const ctx = sizeCv(cv, 96, 86);
  const sc = Math.min(96 / def.w, 86 / def.h);
  ctx.translate((96 - def.w * sc) / 2, 86 - def.h * sc);
  ctx.scale(sc, sc);
  def.draw(rough.canvas(cv), def.w, def.h, mulberry32(seed));
}
function drawDizzy() {
  const ctx = sizeCv(dizzyCv, 130, 66);
  const rc = rough.canvas(dizzyCv);
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * 2.1;
    rc.polygon(starPts(65 + Math.cos(a) * 38, 33 + Math.sin(a) * 15, 9, 4, 5, -Math.PI / 2),
      { stroke: INK, strokeWidth: 1.6, fill: '#FFC53D', fillStyle: 'solid', seed: 60 + i });
  }
}
function drawTitleSquiggle() {
  const rs = rough.svg(titleSq);
  const pts = [];
  for (let x = 6; x <= 244; x += 10) pts.push([x, 8 + Math.sin(x * .21) * 4]);
  titleSq.appendChild(rs.curve(pts,
    { stroke: '#FF6B57', strokeWidth: 4.5, roughness: 2.2, bowing: 4, seed: 7 }));
}

let rT = 0;
window.addEventListener('resize', () => {
  clearTimeout(rT);
  rT = setTimeout(() => {
    front.style.transform = ''; back.style.transform = '';
    wipeEdge.classList.remove('on');
    const meta = renderInto(front, S.lastScene);
    S.gy = meta.gy; S.dark = meta.dark;
    for (const p of S.props.values()) if (!p.attached) placeProp(p);
    S.heroX = Math.max(70, Math.min(S.W - 60, S.heroX));
    placeHero(); pigsPlace(S.heroX); placeRide();
    drawUnderLine();
    if (makerOv.classList.contains('show')) window.HeroMaker.resize();
  }, 180);
});

function boot() {
  window.HeroMaker.init(makerCv, heroCv, null);
  drawTitleSquiggle(); drawUnderLine();
  drawPigPal(pigA.querySelector('canvas'), 41);
  drawPigPal(pigB.querySelector('canvas'), 77);
  drawDizzy();
  /* the first meadow, waiting for a hero */
  const ss = { biome: 'meadow', seed: S.sceneSeed, palette: 'warm', props: ['fence', 'flower'] };
  const meta = renderInto(front, ss);
  S.lastScene = ss; S.gy = meta.gy; S.dark = meta.dark;
  S.heroX = Math.max(90, S.W * .11);
  setGoal(0); setWolf(.14);
  placeHero(); pigsPlace(S.heroX);
  narrEl.textContent = 'Draw your hero — the pigs are waiting at the edge of the Storywood!';
  blank.disabled = true; goBtn.disabled = true;
  fitBlank();
  /* deep-link / headless hook: open with #watch to auto-run the show */
  if (/#watch/.test(location.hash)) startDemo();
}
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
