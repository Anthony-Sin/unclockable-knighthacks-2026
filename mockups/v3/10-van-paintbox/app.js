/* ============================================================
   Pip & the Painty Road — app.js   (v3 · 10-van-paintbox)
   The PAINTED contract: ONE continuous painted world (world.js,
   Highland-Path style) redrawn every rAF at camera S.cam — and its
   signature here: the world DRAWS ITSELF ON stroke-by-stroke just
   ahead of the hero. The draw-on frontier IS the transition — no
   torn-paper pan, no worldB. Props scribble-in like crayon; every
   submitted word paints a brush-stroke ribbon across the sky before
   the prop pops in. Story beats come from the REAL LLM (llm.js).
   ============================================================ */
'use strict';

const SK = window.SK;
const INK = SK.INK;
const $ = (id) => document.getElementById(id);

const stage    = $('stage');
const worldCv  = $('worldCv');
const playCv   = $('playCv');
const goalFill = $('goalFill'), goalPig = $('goalPig');
const wolfFill = $('wolfFill'), wolfMood = $('wolfMood');
const lineChip = $('lineChip'), msChip = $('msChip');
const stopBtn  = $('stopBtn');
const makerOv  = $('makerOverlay'), makerCv = $('makerCv');
const swatchBox= $('swatches'), heroNameEl = $('heroName');
const doneBtn  = $('doneBtn'), surpriseBtn = $('surpriseBtn');
const clearBtn = $('clearBtn'), watchBtn = $('watchBtn');
const endOv    = $('endOverlay'), recap = $('recap');
const againBtn = $('againBtn'), watchAgain = $('watchAgainBtn');
const narrEl   = $('narrative'), obRow = $('obstacles');
const blank    = $('blank'), goBtn = $('goBtn');
const dymEl    = $('dym'), dymBtn = $('dymBtn');
const choicesEl= $('choices'), coach = $('coach');

const GOAL = 'The Three Little Pigs — help the pig friends gather ' +
  'materials, build houses, and reach the strong brick house before ' +
  'the Big Bad Wolf huffs and puffs.';

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOutBack = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

/* ---------- THE PAINTED ROAD — one continuous world canvas ----------
   No worldA/worldB hand-off. The world is ONE continuous world-x space:
   WORLD.frame() repaints it every rAF at camera S.cam, and inside the
   "reveal frontier" (heroWX + FR) the terrain strokes itself ON — ridges
   dash-draw, puffs pop, trees grow — while past the edge only pencil
   ghosts wait on blank paper. The draw-on frontier IS the transition. */
let W = 800, H = 420;
let curSS = { biome: 'meadow', seed: 1234, palette: 'warm', props: [] };
const STARTX = 420;                       /* hero's world-x at story start */
const STRIDE = 430;                       /* world px walked per turn */
const BUILD_WX = STARTX + 3300;           /* pig-house plot: end of the road */
const FR = 250;                           /* reveal frontier: px ahead of hero */

function sizeCanvas(c) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  c.width = Math.max(2, Math.round(W * dpr));
  c.height = Math.max(2, Math.round(H * dpr));
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  return x;
}
function sizeAll() {
  W = stage.clientWidth || 800;
  H = stage.clientHeight || 420;
  sizeCanvas(worldCv); sizeCanvas(playCv);
  window.WORLD.resize(W, H);
}

/* ============================================================
   GAME STATE
   ============================================================ */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false,
  history: [], words: [], slips: 0, pigs: 0,
  goal: 0, wolf: .14,
  propSeq: 0, props: new Map(),
  buildStage: 0, riding: null, gear: [],
  hero: null, heroWX: STARTX, heroWXT: STARTX, heroState: 'idle', heroAnim: null,
  heroJ: 0, heroVY: 0, heroLift: 0, landT: 0,
  cam: 0, ribbons: [],
  dizzyUntil: 0, wolfAnim: null, fx: [],
  shake: null, shakeX: 0, shakeY: 0,
  pendingWord: null, won: false, sceneSeed: 1234,
};
const okEp = (ep) => ep === S.epoch;
const propWX = (frac) => S.cam + 50 + clamp01(frac == null ? .5 : frac) * (W - 110);
const heroFeetY = () => window.WORLD.groundAt(S.heroWX);
const heroSX = () => S.heroWX - S.cam;

/* ============================================================
   BEAT 0 — THE HERO MAKER (kid draws → strokes become the hero)
   ============================================================ */
const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
const MW = 440, MH = 264;
let strokes = [], curStroke = null, selColor = CRAYONS[1], makerBusy = false;
let mctx = null;

function makerCtx() {
  if (!mctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    makerCv.width = MW * dpr; makerCv.height = MH * dpr;
    mctx = makerCv.getContext('2d');
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.lineCap = mctx.lineJoin = 'round';
  }
  return mctx;
}
/* replay every stroke through the SAME wobbler that draws the world */
function replayMaker() {
  const ctx = makerCtx();
  ctx.clearRect(0, 0, MW, MH);
  strokes.forEach((st, i) => {
    const r = SK.rng(1000 + i * 131);
    if (st.pts.length < 2) {
      SK.circle(ctx, st.pts[0][0], st.pts[0][1], 5,
        { r, fill: st.c, stroke: st.c, strokeWidth: 3 });
    } else {
      SK.curve(ctx, st.pts, { r, stroke: st.c, strokeWidth: st.w || 11, amp: .9 });
    }
  });
}
function clearMaker() { strokes = []; curStroke = null; replayMaker(); }
function makerPos(e) {
  const b = makerCv.getBoundingClientRect();
  return [(e.clientX - b.left) * MW / b.width, (e.clientY - b.top) * MH / b.height];
}

/* parametric "surprise" monster — emitted as strokes, like a kid drew it */
function surpriseStrokes() {
  const r = SK.rng(((Math.random() * 0x7ffffffe) | 0) + 7);
  const c = r.pick([CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
  const lite = { '#FF6B57': '#FFC9BF', '#4FB06D': '#B7E6C3',
                 '#5DA9E9': '#C7E6FA', '#B565D8': '#DCC3F2' }[c];
  const cx = MW / 2, cy = MH / 2 + 16;
  const bw = r.rr(118, 148), bh = r.rr(104, 126);
  const rx = bw / 2, ry = bh / 2;
  const out = [];
  const ellPts = (ex, ey, erx, ery, n = 26, jit = 2.5) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * 2 * i / n;
      pts.push([ex + Math.cos(a) * erx + r.rr(-jit, jit),
                ey + Math.sin(a) * ery + r.rr(-jit, jit)]);
    }
    return pts;
  };
  const zig = (ex, ey, erx, ery, col, w) => {
    for (let y = -ery + 8; y < ery - 4; y += 12) {
      const half = erx * Math.sqrt(Math.max(0, 1 - (y / ery) * (y / ery)));
      if (half < 6) continue;
      const pts = [];
      for (let x = -half; x <= half; x += 8)
        pts.push([ex + x, ey + y + Math.sin(x * .3) * 3]);
      out.push({ c: col, pts, w });
    }
  };
  out.push({ c, pts: ellPts(cx, cy, rx, ry), w: 10 });
  zig(cx, cy + 8, rx * .8, ry * .7, lite, 8);
  out.push({ c, w: 7, pts: [[cx, cy - ry + 4], [cx - 8, cy - ry - 16], [cx + 5, cy - ry - 30]] });
  out.push({ c: '#FFC53D', w: 9, pts: ellPts(cx + 5, cy - ry - 34, 8, 8, 12, 1.5) });
  [[cx - bw * .18, cy - bh * .18], [cx + bw * .22, cy - bh * .14]].forEach(([ex, ey], i) => {
    zig(ex, ey, 12 - i * 3, 14 - i * 3, '#FFFDF6', 7);
    out.push({ c: INK, w: 9, pts: ellPts(ex + 3, ey + 1, 4, 4.5, 10, 1) });
    out.push({ c: INK, w: 6, pts: ellPts(ex, ey, 13 - i * 3, 15 - i * 3, 18, 2) });
  });
  const sm = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * .18 + Math.PI * .64 * i / 14;
    sm.push([cx + 2 + Math.cos(a) * bw * .22, cy + 6 + Math.sin(a) * bh * .16]);
  }
  out.push({ c: INK, pts: sm, w: 7 });
  out.push({ c: '#FF6B57', w: 6, pts: ellPts(cx - bw * .4, cy + 2, 5, 4, 10, 1.5) });
  out.push({ c: '#FF6B57', w: 6, pts: ellPts(cx + bw * .42, cy + 4, 4, 3.5, 10, 1.5) });
  out.push({ c: '#6B4A2A', w: 8, pts: ellPts(cx - bw * .26, cy + ry + 2, bw * .15, 8, 14, 2) });
  out.push({ c: '#6B4A2A', w: 8, pts: ellPts(cx + bw * .26, cy + ry + 2, bw * .15, 8, 14, 2) });
  return out;
}
async function surpriseMe(fast, ep) {
  if (makerBusy) return;
  makerBusy = true;
  clearMaker();
  for (const st of surpriseStrokes()) {
    if (ep != null && !okEp(ep)) { makerBusy = false; return; }
    strokes.push(st);
    replayMaker();
    await sleep(fast ? 45 : 120);
  }
  makerBusy = false;
}

/* kid strokes → normalized hero doodle (bottom-center anchored ~100px tall) */
function buildHero() {
  if (!strokes.length) return false;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  strokes.forEach(st => st.pts.forEach(([x, y]) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  const w = Math.max(10, x1 - x0), h = Math.max(10, y1 - y0);
  const k = Math.min(104 / w, 108 / h, 1.9);
  const mx = (x0 + x1) / 2;
  const hstrokes = strokes.map((st, i) => ({
    c: st.c, w: Math.max(3, (st.w || 11) * k * .92), seed: 3000 + i * 97,
    pts: st.pts.map(([x, y]) => [(x - mx) * k, (y - y1) * k]),
  }));
  const tally = {};
  strokes.forEach(st => tally[st.c] = (tally[st.c] || 0) + st.pts.length);
  const color = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || CRAYONS[1];
  const name = (heroNameEl.value || 'Pip').trim().slice(0, 14) || 'Pip';
  S.hero = { strokes: hstrokes, color, name };
  return true;
}
const COLORWORDS = { '#FF6B57': 'coral-red', '#FFC53D': 'sun-yellow',
  '#4FB06D': 'leaf-green', '#5DA9E9': 'sky-blue',
  '#B565D8': 'berry-purple', '#2B2118': 'inky-black' };
const heroDesc = () => S.hero
  ? `${S.hero.name}, a kid-drawn doodle hero in ${COLORWORDS[S.hero.color] || 'crayon'} crayon`
  : 'a kid-drawn doodle hero';

/* ============================================================
   PROP ENTITIES — spawn / react / poof / gags
   ============================================================ */
const FLY_KINDS = new Set(['starprop', 'raincloud', 'moon', 'firefly']);
const SCRIB_T = .62;                        /* crayon scribble-in seconds */
function propCanvases(p) {
  /* one-time offscreen renders: the finished prop + its silhouette mask
     + the scratch pad the crayon scribbles pile into */
  if (p.img) return;
  const pad = 16, w = p.def.w, h = p.def.h;
  const mk = () => { const c = document.createElement('canvas');
    c.width = w + pad * 2; c.height = h + pad * 2; return c; };
  p.img = mk();
  { const x = p.img.getContext('2d'); x.translate(pad, pad);
    p.def.draw(x, w, h, SK.rng(p.seed), p.raw); }
  p.mask = mk();
  { const x = p.mask.getContext('2d'); x.translate(pad, pad);
    p.def.draw(x, w, h, SK.rng(p.seed), p.raw);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#8A7F6E'; x.fillRect(-pad, -pad, w + pad * 2, h + pad * 2); }
  p.scr = mk();
  /* pre-rolled zigzag crayon strokes across the prop's bounding box */
  const r = SK.rng(p.seed ^ 0x9e37);
  p.strokes = [];
  for (let i = 0; i < 16; i++) {
    const y = r.rr(4, h - 2), x0 = r.rr(-6, w * .3), x1 = r.rr(w * .55, w + 8);
    const pts = [], n = Math.max(3, Math.round((x1 - x0) / 15));
    for (let j = 0; j <= n; j++)
      pts.push([x0 + (x1 - x0) * j / n, y + Math.sin(j * 2.2 + i * 1.3) * 5 + r.rr(-3, 3)]);
    p.strokes.push({ pts, c: r.pick(CRAYONS), w: r.rr(8, 14) });
  }
}
function spawnProp(rawKind, xFrac, opts = {}) {
  const res = window.resolveKind(rawKind);
  const def = window.PROPS[res.def] || window.PROPS.doodle;
  const id = `p${++S.propSeq}`;
  const p = {
    id, kind: res.def, raw: String(rawKind || res.word || 'thing'),
    word: res.word, def, cls: def.cat || 'plain',
    wx: propWX(xFrac), alt: null, vy: 0, hover: 0,
    slideT: null, slideFrom: 0, slideTo: 0, slideDur: 600, flyIn: null,
    sc: window.propScale(def, W), seed: SK.hashStr(res.def + ':' + id),
    born: performance.now(), state: 'idle', pop: 0, dead: false,
    img: null, mask: null, scr: null, strokes: null, sparkled: false,
  };
  if (opts.born) p.born = opts.born;
  /* EVERY prop scribbles itself in — then the class entrances run */
  if (p.cls === 'ride') {                    /* mounts still trot to the hero */
    p.slideFrom = p.wx - 190; p.slideTo = p.wx; p.slideT = p.born; p.slideDur = 720;
    p.wx = p.slideFrom;
  } else if (p.cls === 'bonk' || p.cls === 'material') {
    p.alt = Math.max(130, heroFeetY() - 40);  /* drops out of the sky, bounces */
    p.vy = -40;
  } else if (FLY_KINDS.has(p.kind)) {        /* fliers drift down & hover */
    p.hover = 118 + (p.seed % 42);
    p.flyIn = { t0: p.born, dur: 950 };
  }
  S.props.set(id, p);
  if (S.props.size > 13) {
    for (const [oid, q] of S.props) {
      if (q === S.riding || S.gear.includes(q)) continue;
      poofProp(oid); break;
    }
  }
  return p;
}
function findProp(rawKind) {
  const res = window.resolveKind(rawKind);
  for (const [id, p] of S.props) if (p.kind === res.def) return id;
  return null;
}
function poofProp(id) {
  const p = S.props.get(id);
  if (!p || p.dead) return;
  p.dead = true;
  p.state = 'poof'; p.stateT = performance.now();
  if (S.riding === p) S.riding = null;
  S.gear = S.gear.filter(g => g !== p);
  fxPuff(p.wx, window.WORLD.groundAt(p.wx) - 20, '#E8DCC0');
  setTimeout(() => S.props.delete(id), 520);
}
function reactProp(id) {
  const p = S.props.get(id);
  if (!p || p.dead) return;
  p.state = 'react'; p.stateT = performance.now();
}
function coachSay(t, uhoh) {
  coach.textContent = t;
  coach.classList.toggle('uhoh', !!uhoh);
}
function heroGag(type, ms) {
  S.heroState = type;
  S.heroAnim = { type, t0: performance.now(), dur: ms, from: S.heroWX, to: S.heroWX };
  return sleep(ms).then(() => {
    if (S.heroState === type) S.heroState = 'idle';
  });
}
/* a real hop: gravity + ground clamp (the landing dusts itself) */
function heroJump(v, state) {
  if (S.heroJ <= 0) S.heroVY = v;
  S.heroState = state || 'hop';
}
/* forward travel on foot or mounted — the painted world slides underneath */
function heroTravel(from, to, dur, type) {
  S.heroState = type;
  S.heroAnim = { type, t0: performance.now(), dur, from, to, stepN: -1 };
}
async function travel() {
  /* the pig-house plot is a fixed world coordinate — pre-win the hero can
     march up to it but never past; at goal .9 the win run takes it in */
  const cap = S.won ? BUILD_WX + 40 : BUILD_WX - 190;
  const to = Math.min(cap, S.heroWX + STRIDE, Math.max(S.heroWXT, S.heroWX + 150));
  const dist = Math.max(0, to - S.heroWX);
  if (dist < 30) { await sleep(480); return; }   /* parked by the plot — paint still dries */
  const dur = 420 + dist * 1.65;
  heroTravel(S.heroWX, to, dur, S.riding ? 'ride' : 'walk');
  await sleep(dur + 90);
}

/* fx particles */
function fxPuff(x, y, col, big) {
  const n = big ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n + .4;
    S.fx.push({ type: 'puff', x, y, vx: Math.cos(a) * (big ? 60 : 42),
      vy: Math.sin(a) * 34 - 26, age: 0, ttl: .85, size: big ? 11 : 8,
      col: col || '#E8DCC0', seed: (i * 37 + x) | 0 });
  }
}
function fxTwinkle(x, y) {
  S.fx.push({ type: 'twinkle', x, y, vx: 0, vy: -12, age: 0, ttl: .95,
    size: 11, col: '#FFC53D', seed: (x * 3 + y) | 0 });
}
function fxPuffCloud(x, y, big) {
  S.fx.push({ type: 'puffcloud', x, y, vx: 340 + Math.random() * 90,
    vy: -6 + Math.random() * 10, age: 0, ttl: 2.1, size: big ? 26 : 18,
    col: '#EFE4D0', seed: (x + y * 7) | 0 });
}
function fxDebris(x, y) {
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * .2 - Math.PI * .6 * (i / 6);
    S.fx.push({ type: 'debris', x, y: y - 40, vx: Math.cos(a) * (140 + i * 30),
      vy: Math.sin(a) * (200 + i * 20), rot: i, spin: (i % 2 ? 1 : -1) * (2 + i),
      age: 0, ttl: 1.5, size: 14 + (i % 3) * 8, col: i % 2 ? '#C9A06B' : '#8A5E2E',
      seed: i * 911 });
  }
}

/* --- what the prop DOES to the hero (the comedy) --- */
async function applyProp(p, rawKind) {
  const cls = window.propClass(rawKind);
  const alive = () => S.props.has(p.id) && !p.dead;
  switch (cls) {
    case 'ride': {
      if (S.riding) S.riding = null;
      /* the mount trots over to the hero, then the hero hops on */
      p.slideFrom = p.wx; p.slideTo = Math.max(S.cam + 70, S.heroWX - 4);
      p.slideT = performance.now(); p.slideDur = 500;
      await sleep(510);
      if (!alive()) return;
      S.riding = p;
      heroJump(370, 'mount');
      coachSay(`You hop on the ${p.raw} — giddyup!`);
      await sleep(320);
      if (alive()) S.heroState = 'ride';
      return;
    }
    case 'slip': {
      p.wx = Math.min(S.cam + W - 60, S.heroWX + 44);   /* right in the hero's path */
      await sleep(420);
      coachSay(`Whoops — a ${p.raw}! Right under your feet!`, true);
      S.slips++;
      const g = heroGag('slip', 1450);         /* skid → spin → splat → dust off */
      S.heroAnim.to = Math.min(S.cam + W - 50, S.heroWX + 40);
      setTimeout(() => reactProp(p.id), 620);  /* the peel squashes too */
      await g;
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'bonk': {
      p.wx = Math.min(S.cam + W - 60, Math.max(S.cam + 70, S.heroWX + 26));
      p.alt = heroFeetY() - 30; p.vy = -30;    /* falls onto the hero's spot */
      await sleep(620);
      coachSay(`Bonk! A falling ${p.raw}!`, true);
      S.slips++;
      await heroGag('bonk', 800);
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'eat': {
      p.wx = Math.min(S.cam + W - 60, S.heroWX + 54);
      await sleep(480);
      coachSay(`Yum — the ${p.raw} disappears fast!`);
      p.state = 'eaten'; p.stateT = performance.now();
      heroJump(400, 'hop');
      await sleep(720);
      setTimeout(() => { if (!p.dead) poofProp(p.id); }, 320);
      return;
    }
    case 'wear': {
      await sleep(500);
      if (!alive()) return;
      p.worn = true;
      S.gear.push(p);
      if (S.gear.length > 3) {
        const old = S.gear.shift();
        setTimeout(() => poofProp(old.id), 200);
      }
      coachSay(`The ${p.raw} is yours now — it rides along!`);
      heroJump(360, 'hop');
      await sleep(680);
      return;
    }
    case 'material': {
      /* building stuff drops from the sky just past the paint head */
      p.wx = Math.min(BUILD_WX - 90, S.heroWX + 250 + Math.random() * 90);
      p.alt = window.WORLD.groundAt(p.wx) - 30; p.vy = -40;
      const tier = /straw|hay/.test(rawKind) ? 1 : /brick|stone/.test(rawKind) ? 3 : 2;
      const names = { 1: 'straw', 2: 'sticks', 3: 'brick' };
      await sleep(620);
      S.buildStage = Math.max(S.buildStage, tier);
      coachSay(`Building stuff! The ${names[tier]} house takes shape.`);
      fxPuff(p.wx + 60, window.WORLD.groundAt(p.wx + 60) - 50, '#E8DCC0', true);
      heroJump(360, 'hop');
      await sleep(520);
      return;
    }
    case 'wolf': {
      coachSay('The Big Bad Wolf peeks out — huff incoming!', true);
      setWolf(S.wolf + .24);
      return;
    }
    case 'pig': {
      S.pigs++;
      coachSay(`A pig friend joins the trip! (${Math.min(S.pigs, 3)}/3 pals)`);
      heroJump(380, 'hop');
      await sleep(640);
      return;
    }
    default:
      return;
  }
}
function dismount() {
  if (!S.riding) return;
  S.riding = null;
  heroJump(330, 'hop');                       /* a little hop off the mount */
}

/* ---------- the huff & puff ---------- */
async function huffPuff(ep) {
  S.wolfAnim = { t0: performance.now(), dur: 1500 };
  S.shake = { t0: performance.now(), dur: 1500, amp: 7 };   /* the whole world rattles */
  wolfMood.textContent = 'PUFFING!';
  coachSay('The wolf huffs… and PUFFS!', true);
  const wy = window.WORLD.groundAt(S.cam + 50) - 70;
  for (let i = 0; i < 4; i++)
    setTimeout(() => fxPuffCloud(S.cam + 30 + i * 10, wy + i * 10, i > 1), i * 140);
  await sleep(900);
  if (!ep || okEp(ep)) {
    if (S.buildStage > 0 && S.buildStage < 3) {
      fxDebris(BUILD_WX, window.WORLD.groundAt(BUILD_WX) - 20);
      S.buildStage = Math.max(0, S.buildStage - 1);
      coachSay('Whoosh! The weak house blew to bits. Stronger stuff needed!', true);
      await sleep(600);
    } else if (S.buildStage >= 3) {
      coachSay('The brick house does NOT budge. Not one brick!');
      fxPuff(BUILD_WX, window.WORLD.groundAt(BUILD_WX) - 80, '#EFE4D0');
    }
  }
  setWolf(.45);                      /* wolf needs a breather */
}

/* ============================================================
   LIVE FRAME LOOP — props, wolf, hero, fx at 60fps
   ============================================================ */
let lastT = 0;
const easeOutC = (k) => 1 - Math.pow(1 - k, 3);
/* -------- THE WORD RIBBON — Painty Road's playstyle twist --------
   Every submitted word paints itself across the sky: a brush-swipe
   ribbon lengthens left→right while the letters reveal under it like
   handwriting, a little crayon nib riding the tip. Prop pops after. */
const RIB_COLS = ['#FF6B57', '#B565D8', '#5DA9E9', '#4FB06D', '#E8A020'];
function paintRibbon(word) {
  const r = SK.rng(SK.hashStr('rb:' + word));
  const x0 = Math.max(70, Math.min(W - 300, heroSX() - 16));
  const len = Math.min(W - 70 - x0, 96 + String(word).length * 14.5);
  const y0 = 92 + r.rr(-10, 12);
  const pts = [];
  for (let i = 0; i <= 22; i++) {
    const k = i / 22;
    pts.push([x0 + len * k, y0 + Math.sin(k * Math.PI) * 22 + r.rr(-2, 2)]);
  }
  S.ribbons.push({ word, pts, t0: performance.now(), dur: 1150, ttl: 3.8,
    x0, y0, len, col: RIB_COLS[(S.ribbons.length + S.words.length) % RIB_COLS.length] });
  if (S.ribbons.length > 3) S.ribbons.shift();
  return sleep(1180);
}
function drawRibbons(ctx, tms) {
  for (let i = S.ribbons.length - 1; i >= 0; i--) {
    const rb = S.ribbons[i];
    const age = (tms - rb.t0) / 1000;
    if (age > rb.ttl) { S.ribbons.splice(i, 1); continue; }
    const prog = Math.min(1, age / (rb.dur / 1000));
    const fade = Math.min(1, (rb.ttl - age) / .8);
    const n = Math.max(2, Math.ceil(rb.pts.length * easeOutC(prog)));
    const head = rb.pts[Math.min(n - 1, rb.pts.length - 1)];
    ctx.save(); ctx.globalAlpha = .5 * fade;
    /* the swash — painted progressively along its own length */
    ctx.strokeStyle = rb.col; ctx.lineWidth = 21;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(rb.pts[0][0], rb.pts[0][1]);
    for (let j = 1; j < n; j++) ctx.lineTo(rb.pts[j][0], rb.pts[j][1]);
    ctx.stroke();
    /* the word, revealed letter-by-letter under a growing clip */
    ctx.globalAlpha = fade;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, head[0] + 4, H); ctx.clip();
    SK.text(ctx, rb.word, rb.x0 + 8, rb.y0 - 20,
      { size: 27, weight: 700, fill: INK, align: 'left' });
    ctx.restore();
    /* the little crayon nib riding the tip */
    if (prog < 1) {
      ctx.translate(head[0], head[1]); ctx.rotate(-.5);
      ctx.strokeStyle = rb.col; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -14); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, 6.3); ctx.fill();
    }
    ctx.restore();
  }
}

function frame(tms) {
  requestAnimationFrame(frame);
  const t = tms / 1000, dt = Math.min(.05, t - (lastT || t));
  lastT = t;

  /* world shake (wolf huff, heavy thuds) — every canvas layer rattles together */
  if (S.shake) {
    const k = (tms - S.shake.t0) / S.shake.dur;
    if (k >= 1) { S.shake = null; S.shakeX = 0; S.shakeY = 0; }
    else {
      const a = S.shake.amp * (1 - k);
      S.shakeX = (Math.sin(tms * .09) + Math.sin(tms * .041)) * .5 * a;
      S.shakeY = Math.cos(tms * .113) * a * .7;
    }
  } else { S.shakeX = 0; S.shakeY = 0; }

  /* the camera keeps the hero on the left third; the paint head runs
     ~250px ahead of the hero — the draw-on frontier IS the transition */
  const camT = S.heroWX - W * .32;
  S.cam += (camT - S.cam) * Math.min(1, dt * 4);
  window.WORLD.paintAhead(S.heroWX + FR);
  const wctx = worldCv.getContext('2d');
  window.WORLD.frame(wctx, S.cam, t);
  worldCv.style.transform = `translate(${S.shakeX}px, ${S.shakeY}px)`;
  playCv.style.transform = `translate(${S.shakeX}px, ${S.shakeY}px)`;

  const ctx = playCv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const feetY = heroFeetY();

  /* hero vertical physics: gravity + ground clamp for hops & mount-jumps */
  if (S.heroJ > 0 || S.heroVY > 0) {
    S.heroJ += S.heroVY * dt;
    S.heroVY -= 1900 * dt;
    if (S.heroJ <= 0) {
      S.heroJ = 0; S.heroVY = 0; S.landT = tms;
      fxPuff(S.heroWX + 2, feetY + 1, '#E8DCC0');
      if (S.heroState === 'hop' || S.heroState === 'mount')
        S.heroState = S.riding ? 'ride' : 'idle';
    }
  }
  /* riding lift eases on/off so mounting never teleports */
  S.heroLift += ((S.riding ? 52 : 0) - S.heroLift) * Math.min(1, dt * 6.5);

  /* --- the house-in-progress at the build plot (a stable world-x) --- */
  const shaking = S.wolfAnim && (tms - S.wolfAnim.t0) < 1500 && S.buildStage > 0;
  const houseX = BUILD_WX - S.cam;
  if (houseX > -220) {
    const wp = window.WORLD.probe();
    const rev = Math.min(1, Math.max(0, (wp.paintX - BUILD_WX + 260) / 320));
    ctx.save(); ctx.globalAlpha = .3 + .7 * rev;
    window.WORLD.drawBuild(ctx, S.buildStage, houseX,
      window.WORLD.groundAt(BUILD_WX), SK.rng((curSS.seed | 0) + 555),
      { shake: shaking, doorOpen: S.won });
    ctx.restore();
  }

  /* --- props — crayon stickers that SCRIBBLE themselves in --- */
  for (const p of S.props.values()) {
    if (p.dead && tms - (p.stateT || 0) > 520) { S.props.delete(p.id); continue; }
    const age = (tms - p.born) / 1000;
    let pop = age < SCRIB_T ? 1 : easeOutBack(Math.min(1, (age - SCRIB_T) / .42));
    let sx = p.wx - S.cam, sy = WORLD.groundAt(p.wx), rot = 0, alpha = 1;
    const bob = Math.sin(t * 1.9 + (p.seed % 17)) * 3;

    /* entrance 1: mounts slide in from stage left */
    if (p.slideT != null) {
      const k = Math.min(1, (tms - p.slideT) / p.slideDur);
      p.wx = p.slideFrom + (p.slideTo - p.slideFrom) * easeOutC(k);
      if (k >= 1) p.slideT = null;
      sx = p.wx - S.cam;
    }
    /* entrance 2: sky-drops fall, bounce once, then settle on the ground */
    if (p.alt != null) {
      p.alt += p.vy * dt; p.vy -= 1650 * dt;
      if (p.alt <= 0) {
        if (p.vy < -330) {
          p.alt = 0; p.vy = -p.vy * .3;
          fxPuff(p.wx, WORLD.groundAt(p.wx), '#E8DCC0');
        } else {
          p.alt = null; p.vy = 0;
          fxPuff(p.wx, WORLD.groundAt(p.wx), '#D8CCB4');
          if (p.cls === 'bonk')              /* heavy props land with a thud */
            S.shake = { t0: tms, dur: 280, amp: 3 };
        }
      }
    }
    /* fliers descend to their hover height and bob up there */
    let lift = p.hover || 0;
    if (p.flyIn) {
      const k = Math.min(1, (tms - p.flyIn.t0) / p.flyIn.dur);
      lift += (1 - easeOutC(k)) * 170;
      if (k >= 1) p.flyIn = null;
    }
    sy -= lift + (p.alt || 0);

    if (p.worn) {
      sx = heroSX();
      sy = feetY - S.heroLift - S.heroJ - 108 + bob * .6;  /* on the hero's head */
    } else if (p === S.riding) {
      sx = heroSX(); sy = feetY + bob * .4;                 /* carries the hero */
    } else {
      sy += bob * (p.hover ? 1.9 : 1);
    }
    if (sx < -260 || sx > W + 260) continue;               /* way offstage: keep entity, skip draw */
    if (p.state === 'react') {
      const k = (tms - p.stateT) / 500;
      if (k >= 1) p.state = 'idle';
      else { pop *= 1 + Math.sin(k * Math.PI) * .28; rot = Math.sin(k * Math.PI * 2) * .06; }
    }
    if (p.state === 'eaten') {
      const k = Math.min(1, (tms - p.stateT) / 320);
      pop *= 1 - k; alpha = Math.min(alpha, 1 - k);
      sx += (heroSX() - sx) * k * .3;
    }
    if (p.state === 'poof') {
      const k = Math.min(1, (tms - p.stateT) / 480);
      pop *= 1 - k; alpha = Math.min(alpha, 1 - k);
    }

    propCanvases(p);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    const sc = p.sc * Math.max(.01, pop);
    ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    if (age < SCRIB_T) {
      /* SCRIBBLE-IN: crayon strokes pile onto the silhouette mask, then
         clip to it — the prop literally colors itself on */
      const sctx = p.scr.getContext('2d');
      sctx.clearRect(0, 0, p.scr.width, p.scr.height);
      sctx.globalAlpha = .16; sctx.drawImage(p.mask, 0, 0); sctx.globalAlpha = 1;
      const nn = Math.ceil(p.strokes.length * (age / SCRIB_T));
      sctx.lineCap = 'round'; sctx.lineJoin = 'round';
      for (let i = 0; i < nn; i++) {
        const st = p.strokes[i];
        sctx.strokeStyle = st.c; sctx.lineWidth = st.w;
        sctx.beginPath(); sctx.moveTo(st.pts[0][0] + 16, st.pts[0][1] + 16);
        for (let j = 1; j < st.pts.length; j++) sctx.lineTo(st.pts[j][0] + 16, st.pts[j][1] + 16);
        sctx.stroke();
      }
      sctx.globalCompositeOperation = 'destination-in';
      sctx.drawImage(p.mask, 0, 0);
      sctx.globalCompositeOperation = 'source-over';
      ctx.translate(-p.def.w / 2 - 16, -p.def.h + 8 - 16);
      ctx.drawImage(p.scr, 0, 0);
      /* a wiggle while it's being colored */
      ctx.restore();
    } else {
      if (!p.sparkled) { p.sparkled = true; fxTwinkle(p.wx + 10, sy - p.def.h * p.sc * .6); }
      ctx.translate(-p.def.w / 2 - 16, -p.def.h + 8 - 16);
      ctx.drawImage(p.img, 0, 0);
      ctx.restore();
    }

    /* hand-lettered name under every live prop (once it's painted) */
    if (alpha > .6 && !p.worn && age >= SCRIB_T * .8)
      SK.caption(ctx, p.raw, sx, WORLD.groundAt(p.wx) + 18, SK.rng(p.seed + 5), { size: 14 });
  }

  /* --- word ribbons painting across the sky --- */
  drawRibbons(ctx, tms);

  /* --- the wolf, creeping in from the left --- */
  const wolfX = (-.18 + S.wolf * .24) * W;
  const wolfDef = window.PROPS.wolf;
  const wsc = window.propScale(wolfDef, W) * .9;
  const wolfBob = Math.sin(t * 2.4) * 2.4;
  ctx.save();
  let lean = 0;
  if (S.wolfAnim) {
    const k = Math.min(1, (tms - S.wolfAnim.t0) / 1500);
    lean = Math.sin(k * Math.PI) * 34;
    if (k >= 1) S.wolfAnim = null;
  }
  ctx.translate(wolfX + lean, WORLD.groundAt(S.cam + wolfX) + wolfBob);
  ctx.scale(wsc, wsc);
  ctx.globalAlpha = S.wolf > .04 ? 1 : 0;
  ctx.translate(-wolfDef.w / 2 + 30, -wolfDef.h + 8);
  wolfDef.draw(ctx, wolfDef.w, wolfDef.h, SK.rng(4242), 'wolf');
  ctx.restore();

  /* --- the hero (kid's strokes, replayed wobbly) — feet pinned to the path --- */
  if (S.hero && S.started) {
    let hx = heroSX(), rot = 0, alpha = 1;
    let hy = feetY - S.heroJ - S.heroLift;          /* ground + jump + mount */
    let sq = 1 + Math.sin(t * 2.7) * .018;          /* idle breathe, feet stay planted */
    const lk = (tms - S.landT) / 240;               /* landing squash after a hop */
    if (lk < 1) sq *= 1 - Math.sin(lk * Math.PI) * .16;
    if (S.heroState === 'ride') { hy += Math.sin(t * 3.6) * 3.4; rot = .05; }
    if (S.heroAnim) {
      const a = S.heroAnim;
      const k = Math.min(1, (tms - a.t0) / a.dur);
      if (a.type === 'walk' || a.type === 'run' || a.type === 'ride') {
        /* TRAVEL — steady forward pace, legless-doodle bob + waddle + step dust */
        const dist = a.to - a.from;
        S.heroWX = a.from + dist * k; hx = heroSX();
        const steps = Math.max(2, Math.round(Math.abs(dist) / 44));
        const lift = a.type === 'run' ? 9 : a.type === 'ride' ? 5 : 6.5;
        hy = WORLD.groundAt(S.heroWX) - S.heroJ - S.heroLift - Math.abs(Math.sin(k * steps * Math.PI)) * lift;
        rot = a.type === 'run' ? .13 : Math.sin(k * steps * Math.PI * 2) * .08;
        const st = Math.floor(k * steps * 2);
        if (st !== a.stepN) { a.stepN = st; fxPuff(S.heroWX - 14, feetY + 2, '#E4D8BE'); }
      } else if (a.type === 'slip') {
        /* skid forward → tumble-spin up & over → SPLAT flat → dust-off wobble */
        if (k < .42) {
          const kk = k / .42;
          S.heroWX = a.from + (a.to - a.from) * kk; hx = heroSX();
          rot = kk * Math.PI * 2;
          hy -= Math.sin(kk * Math.PI) * 50;
        } else if (k < .68) {
          if (!a.splat) { a.splat = true; fxPuff(S.heroWX + 8, feetY - 4, '#E8DCC0', true); }
          rot = 0; sq = .48;
        } else {
          const kk = (k - .68) / .32;
          sq = .48 + .52 * Math.min(1, kk * 1.7);
          rot = Math.sin(kk * Math.PI * 3) * .15 * (1 - kk);
          if (!a.dust && kk > .45) { a.dust = true; fxPuff(S.heroWX - 6, feetY - 34, '#D8CCB4'); }
        }
      } else if (a.type === 'bonk') {
        sq *= 1 - Math.sin(k * Math.PI) * .5;
      }
      if (k >= 1) { S.heroAnim = null; if (S.heroState !== 'ride') S.heroState = 'idle'; }
    }
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rot);
    ctx.scale(1, sq);
    ctx.globalAlpha = alpha;
    for (const st of S.hero.strokes) {
      if (st.pts.length < 2) {
        SK.circle(ctx, st.pts[0][0], st.pts[0][1], Math.max(2, st.w / 2.4),
          { r: SK.rng(st.seed), fill: st.c, stroke: st.c, strokeWidth: 2 });
      } else {
        SK.curve(ctx, st.pts, { r: SK.rng(st.seed), stroke: st.c, strokeWidth: st.w, amp: .7 });
      }
    }
    ctx.restore();
    /* dizzy stars orbit after a gag */
    if (tms < S.dizzyUntil) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * Math.PI * 2 / 3;
        SK.star(ctx, hx + Math.cos(a) * 30, hy - 84 + Math.sin(a) * 10,
          7, 3, 5, { r: SK.rng(500 + i), fill: '#FFC53D', strokeWidth: 1.2 });
      }
    }
  }

  /* --- fx particles --- */
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i];
    f.age += dt;
    if (f.age > f.ttl) { S.fx.splice(i, 1); continue; }
    f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
    if (f.type === 'debris') { f.vy += 620 * dt; f.rot += (f.spin || 0) * dt; }
    const k = f.age / f.ttl, fr = SK.rng(f.seed);
    const fsx = f.x - S.cam;                     /* particles live in world-x */
    ctx.save();
    ctx.globalAlpha = 1 - k;
    if (f.type === 'puff') {
      SK.circle(ctx, fsx, f.y, f.size * (1 + k), { r: fr, fill: f.col, stroke: 'none' });
    } else if (f.type === 'twinkle') {
      ctx.translate(fsx, f.y);
      ctx.rotate(k * 1.4);
      SK.star(ctx, 0, 0, f.size * (1 - k * .4), f.size * .4, 5,
        { r: fr, fill: f.col, strokeWidth: 1.4 });
    } else if (f.type === 'puffcloud') {
      SK.ellipse(ctx, fsx, f.y, f.size * (1 + k * .7), f.size * .6,
        { r: fr, fill: f.col, strokeWidth: 1.6 });
    } else if (f.type === 'debris') {
      ctx.translate(fsx, f.y);
      ctx.rotate(f.rot);
      SK.rect(ctx, -f.size / 2, -5, f.size, 10, { r: fr, fill: f.col, strokeWidth: 1.6 });
    }
    ctx.restore();
  }
}

/* ============================================================
   HUD — goal & wolf meters
   ============================================================ */
function setGoal(p) {
  S.goal = clamp01(p);
  const pct = Math.round(S.goal * 100);
  goalFill.style.width = pct + '%';
  goalPig.style.left = `calc(${pct}% - 12px)`;
  /* the journey only goes forward along the road: heroWXT is the
     furthest the goal has ever mapped to — the hero walks to it */
  S.heroWXT = Math.max(S.heroWXT, STARTX + S.goal * (BUILD_WX - STARTX - 320));
  if (S.goal >= .82) S.buildStage = Math.max(S.buildStage, 3);
  else if (S.goal >= .5) S.buildStage = Math.max(S.buildStage, 2);
  else if (S.goal >= .28) S.buildStage = Math.max(S.buildStage, 1);
}
function setWolf(p) {
  S.wolf = clamp01(p);
  wolfFill.style.width = Math.round(S.wolf * 100) + '%';
  wolfMood.textContent =
    S.wolf > .88 ? 'huffing soon!' :
    S.wolf > .6 ? 'getting huffy' :
    S.wolf > .32 ? 'sniffing around' : 'far away';
}

/* ============================================================
   THE LLM LOOP
   ============================================================ */
const urlMode = new URLSearchParams(location.search).get('mode');
const llm = new StoryLLM({
  mode: urlMode === 'local' ? 'local' : 'remote',
  onStatus(st) {
    if (st.waiting) msChip.textContent = 'waiting for memory headroom…';
    else if (!st.failed) msChip.textContent = 'asking the story-brain…';
  },
});

function setChips(list) {
  choicesEl.innerHTML = '';
  (list || []).slice(0, 4).forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'choice';
    b.textContent = c;
    b.addEventListener('click', () => { blank.value = c; submitWord(); });
    choicesEl.appendChild(b);
  });
}
function showDym(word) {
  if (!word) { dymEl.hidden = true; return; }
  dymBtn.textContent = word;
  dymBtn.dataset.word = word;
  dymEl.hidden = false;
}
function setLineChip(t) { lineChip.textContent = t; }

/* local near-miss guesser when the LLM leaves did_you_mean null */
const DYM_WORDS = ['straw','sticks','bricks','house','home','unicorn','banana','peel',
  'wolf','pig','bridge','boat','raft','ladder','torch','lantern','cookie','apple',
  'umbrella','balloon','kite','mushroom','flower','tree','bush','rock','key','door',
  'sword','wand','shield','map','drum','bell','gift','star','crown','hat','vine',
  'log','plank','stones','tunnel','trampoline','puddle','slime','soap','toaster',
  'piano','anvil','fridge','sock','run','hide','build','jump','swim','dig','climb',
  'inside','sleep','dance','sing','gather'];
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

async function submitWord() {
  const word = blank.value.trim().slice(0, 40);
  if (!word || !S.started) return;
  if (S.busy) {
    /* kid typed mid-animation — queue ONE word instead of eating it */
    if (!S.demoOn) {
      S.pendingWord = word;
      blank.value = '';
      coachSay(`Got it — “${word}” comes next!`);
    }
    return;
  }
  S.busy = true;
  blank.value = '';
  goBtn.disabled = true;
  showDym(null);
  msChip.hidden = false;
  msChip.classList.add('thinking');
  msChip.textContent = 'asking the story-brain…';

  const ep = S.epoch;
  const gm = await llm.next({
    goal: GOAL, history: S.history.slice(-4),
    playerText: word, hero: heroDesc(),
  });
  if (!okEp(ep)) { S.busy = false; goBtn.disabled = false; return; }

  /* --- latency + mode chips --- */
  const ms = gm._meta && gm._meta.ms ? (gm._meta.ms / 1000).toFixed(1) : null;
  const mode = gm._meta ? gm._meta.mode : 'offline';
  msChip.classList.remove('thinking');
  if (mode === 'offline') {
    msChip.textContent = 'demo mode · canned narrator';
    msChip.classList.add('off');
    setLineChip('demo mode — the story-brain is offline, a puppet is filling in');
  } else {
    msChip.textContent = `live LLM · ${mode === 'local' ? 'local' : 'remote'} · answered in ${ms}s`;
    msChip.classList.remove('off');
    setLineChip(word ? `you said “${word}”` : '');
  }

  /* --- narrative + obstacles --- */
  if (gm.narrative) narrEl.textContent = gm.narrative;
  obRow.innerHTML = '';
  (gm.obstacles || []).forEach(o => {
    const c = document.createElement('span');
    c.className = 'obstacle';
    c.textContent = 'watch out: ' + o;
    obRow.appendChild(c);
  });
  S.history.push(`${word} -> ${(gm.narrative || '').slice(0, 90)}`);
  S.words.push(word);

  /* --- goal first: the bar climbs WHILE the hero walks forward ---
     monotonic-ish: fail beats may dip a little; success beats always
     move forward at least a step (the hero DID travel). */
  let gTarget = gm.success ? Math.max(S.goal, gm.goal_progress)
                          : Math.max(S.goal - .05, gm.goal_progress);
  if (gm.success) gTarget = Math.min(1, Math.max(gTarget, S.goal + .03));
  const gained = Math.max(0, gTarget - S.goal);
  setGoal(gTarget);

  /* --- TRAVEL: the road ahead morphs to the new biome, the word paints
     itself across the sky, and the hero walks while the world draws on --- */
  S.sceneSeed = gm.scene_seed.seed || S.sceneSeed;
  curSS = gm.scene_seed;                  /* the live biome label follows the LLM */
  window.WORLD.ahead(gm.scene_seed);
  const ribP = paintRibbon(word);
  await travel();
  await ribP;                              /* ribbon done → the prop pops in */
  if (!okEp(ep)) { S.busy = false; goBtn.disabled = false; return; }

  /* --- the typed-word props: physical spawns + gags --- */
  if (S.riding && !(gm.props || []).some(pp => window.propClass(pp.kind) === 'ride'))
    dismount();
  for (const pr of (gm.props || [])) {
    if (!okEp(ep)) break;
    if (pr.action === 'remove') { const id = findProp(pr.kind); if (id) poofProp(id); continue; }
    if (pr.action === 'react') {
      const id = findProp(pr.kind);
      if (id) reactProp(id); else spawnProp(pr.kind, pr.x);
      continue;
    }
    const exist = findProp(pr.kind);
    const p = exist ? S.props.get(exist) : spawnProp(pr.kind, pr.x);
    if (exist) reactProp(exist);
    const cls = window.propClass(pr.kind);
    if ((cls !== 'plain' && !exist) || cls === 'wolf' || cls === 'pig')
      await applyProp(p, String(pr.kind).toLowerCase());
    await sleep(120);
  }

  /* --- did you mean --- */
  showDym(gm.did_you_mean || localDym(word));

  /* --- wolf pressure --- */
  let dw = .05 + (gm.success ? 0 : .10) + (gm.obstacles || []).length * .03 - gained * .35;
  if (window.propClass(word) === 'slip' || !gm.success) dw += .02;
  setWolf(S.wolf + dw);
  setChips(gm.choices);

  if (S.wolf >= .92 && okEp(ep)) await huffPuff(ep);

  if (S.goal >= .9 && okEp(ep)) { winSeq(); }
  else {
    S.busy = false;
    goBtn.disabled = false;
    if (!S.demoOn) blank.focus({ preventScroll: true });
    /* a queued word the kid typed mid-animation runs now */
    const pw = S.pendingWord; S.pendingWord = null;
    if (pw && okEp(ep))
      setTimeout(() => { blank.value = pw; submitWord(); }, 90);
  }
}

/* ============================================================
   WIN
   ============================================================ */
async function winSeq() {
  S.busy = true; S.won = true;
  coachSay('Run! The brick house door is open!');
  S.heroState = 'run';
  const runTo = BUILD_WX - 30, runDist = Math.max(60, runTo - S.heroWX);
  S.heroAnim = { type: 'run', t0: performance.now(), dur: 500 + runDist * 1.15,
                 from: S.heroWX, to: runTo, stepN: -1 };
  window.WORLD.paintAhead(S.heroWX + FR + runDist);   /* paint the doorstep too */
  const hg = window.WORLD.groundAt(BUILD_WX);
  for (let i = 0; i < 8; i++)
    setTimeout(() => fxTwinkle(BUILD_WX - 60 + Math.random() * 140,
      hg - 60 - Math.random() * 90), i * 90);
  await sleep(500 + runDist * 1.15 + 320);
  recap.innerHTML = '';
  const line = document.createElement('p');
  line.style.margin = '4px 0 8px';
  line.textContent = `Your hero made it in ${S.words.length} word${S.words.length === 1 ? '' : 's'}` +
    (S.slips ? ` — with ${S.slips} silly slip${S.slips === 1 ? '' : 's'}!` : ' — no slips at all!');
  recap.appendChild(line);
  S.words.slice(-10).forEach(w => {
    const c = document.createElement('span');
    c.className = 'wordchip'; c.textContent = w;
    recap.appendChild(c);
  });
  endOv.hidden = false;
  setTimeout(() => endOv.classList.add('show'), 30);
}

/* ============================================================
   STORY START / RESET
   ============================================================ */
function startStory() {
  S.started = true;
  makerOv.classList.remove('show');
  setTimeout(() => { makerOv.hidden = true; }, 320);
  narrEl.textContent =
    'Three little pigs need to reach the strong brick house before the wolf ' +
    'huffs and puffs. Type what your hero does!';
  coachSay('Try: gather straw — or anything silly!');
  setLineChip(`go, ${S.hero ? S.hero.name : 'hero'}, go!`);
  blank.disabled = false; goBtn.disabled = false;
  blank.focus({ preventScroll: true });
}
function resetGame(keepHero) {
  S.epoch++;
  S.busy = false; S.demoOn = false;
  S.history = []; S.words = []; S.slips = 0; S.pigs = 0;
  S.goal = 0; S.wolf = .14; S.heroWX = STARTX; S.heroWXT = STARTX;
  S.buildStage = 0; S.riding = null; S.gear = [];
  S.props.clear(); S.fx = []; S.won = false;
  S.heroState = 'idle'; S.heroAnim = null; S.wolfAnim = null;
  S.heroJ = 0; S.heroVY = 0; S.heroLift = 0; S.landT = 0;
  S.shake = null; S.shakeX = 0; S.shakeY = 0;
  S.pendingWord = null; S.ribbons = [];
  S.cam = window.WORLD.camStart(W);
  window.WORLD.reset(STARTX);                  /* rewind the paint head */
  window.WORLD.ahead(curSS);
  if (!keepHero) S.hero = null;
  setGoal(0); setWolf(.14);
  narrEl.textContent = 'Draw your hero to open the storybook…';
  obRow.innerHTML = ''; setChips([]); showDym(null);
  coachSay('The crayons are waiting!');
  endOv.classList.remove('show'); endOv.hidden = true;
  stopBtn.hidden = true;
  S.started = !!keepHero;
  blank.disabled = !keepHero; goBtn.disabled = !keepHero;
  if (keepHero) startStory();
}

/* ============================================================
   WATCH IT PLAY — a real LLM run, live latency, visible Stop
   ============================================================ */
const DEMO_WORDS = ['gather straw', 'sticks', 'unicorn', 'banana peel', 'bricks',
  'build brick house', 'run inside', 'slam the door', 'celebrate'];
async function startDemo() {
  const ep = ++S.epoch;
  S.demoOn = true;
  stopBtn.hidden = false;
  endOv.classList.remove('show'); endOv.hidden = true;
  S.won = false;

  /* resource guardrail: a whole scripted LLM journey is the heavy op */
  msChip.hidden = false;
  msChip.classList.add('thinking');
  msChip.textContent = 'checking memory headroom…';
  const headroom = await llm.waitForHeadroom(4).catch(() => false);
  if (!okEp(ep)) return;
  if (!headroom) coachSay('The machine is busy — the show may be slow!', true);
  msChip.classList.remove('thinking');

  /* auto-paint a hero (surprise, sped up) */
  makerOv.hidden = false;
  makerOv.classList.add('show');
  await sleep(240); if (!okEp(ep)) return;
  await surpriseMe(true, ep); if (!okEp(ep)) return;
  buildHero();
  await sleep(300); if (!okEp(ep)) return;
  if (!S.started) startStory();

  for (const word of DEMO_WORDS) {
    if (!okEp(ep)) return;
    while (S.busy && okEp(ep)) await sleep(200);
    if (!okEp(ep)) return;
    await sleep(500); if (!okEp(ep)) return;
    blank.value = '';
    for (const ch of word) {
      if (!okEp(ep)) return;
      blank.value += ch;
      await sleep(75 + Math.random() * 90);
    }
    await sleep(380); if (!okEp(ep)) return;
    submitWord();
    while (S.busy && okEp(ep)) await sleep(200);
    if (S.goal >= .9) break;
  }
  while (S.busy && okEp(ep)) await sleep(200);
  if (okEp(ep)) {
    S.demoOn = false;
    stopBtn.hidden = true;
  }
}
function stopDemo() {
  S.epoch++;
  S.demoOn = false;
  makerBusy = false;
  stopBtn.hidden = true;
  S.heroAnim = null; S.shake = null; S.pendingWord = null; S.ribbons = [];
  if (S.started && !S.busy) {
    goBtn.disabled = false;
    coachSay('You take over — type a word!');
  }
}
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;
/* headless-test hook: spawn + apply a prop directly (drives gags off-script) */
window.__test = (kind, xFrac) => {
  const p = spawnProp(kind, xFrac == null ? .55 : xFrac);
  applyProp(p, String(kind).toLowerCase());
  return p.id;
};
/* tiny read-only state probe — used by the v3 headless verification harness */
window.__probe = () => ({
  started: S.started, busy: S.busy, demo: S.demoOn, won: S.won,
  goal: +S.goal.toFixed(2), wolf: +S.wolf.toFixed(2), build: S.buildStage,
  heroX: Math.round(S.heroWX), heroSX: Math.round(heroSX()),
  cam: Math.round(S.cam), heroState: S.heroState, riding: !!S.riding,
  heroJ: Math.round(S.heroJ), props: [...S.props.values()].map(p => p.raw),
  ribbons: S.ribbons.map(r => r.word),
  world: window.WORLD.probe(),
  biome: curSS.biome, seed: curSS.seed, palette: curSS.palette,
  words: S.words.length, slips: S.slips, pigs: S.pigs,
});

/* ============================================================
   EVENTS
   ============================================================ */
CRAYONS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === 1 ? ' sel' : '');
  b.style.background = c; b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', 'crayon ' + (i + 1));
  b.addEventListener('click', () => {
    selColor = c;
    swatchBox.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
    b.classList.add('sel');
  });
  swatchBox.appendChild(b);
});
makerCv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  makerCv.setPointerCapture(e.pointerId);
  curStroke = { c: selColor, pts: [makerPos(e)], w: 11 };
});
makerCv.addEventListener('pointermove', (e) => {
  if (!curStroke) return;
  const [x, y] = makerPos(e);
  const pts = curStroke.pts;
  const [lx, ly] = pts[pts.length - 1];
  if (Math.hypot(x - lx, y - ly) < 3) return;
  pts.push([x, y]);
  /* live crayon feel while dragging; wobbly replay happens on pointerup */
  const ctx = makerCtx();
  ctx.strokeStyle = curStroke.c;
  ctx.lineWidth = 11;
  ctx.globalAlpha = .92;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
  ctx.globalAlpha = 1;
});
function endStroke() {
  if (!curStroke) return;
  strokes.push(curStroke);
  curStroke = null;
  replayMaker();
}
makerCv.addEventListener('pointerup', endStroke);
makerCv.addEventListener('pointercancel', endStroke);
clearBtn.addEventListener('click', clearMaker);
surpriseBtn.addEventListener('click', () => surpriseMe(false));
doneBtn.addEventListener('click', () => {
  if (makerBusy) return;
  if (!buildHero()) {
    coachSay('Draw a hero first — or press “Surprise me”!', true);
    return;
  }
  startStory();
});
blank.addEventListener('input', () => showDym(null));
blank.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
});
goBtn.addEventListener('click', submitWord);
dymBtn.addEventListener('click', () => {
  blank.value = dymBtn.dataset.word || '';
  showDym(null);
  submitWord();
});
stopBtn.addEventListener('click', stopDemo);
watchBtn.addEventListener('click', startDemo);
watchAgain.addEventListener('click', () => { resetGame(true); startDemo(); });
againBtn.addEventListener('click', () => {
  resetGame(false);
  makerOv.hidden = false;
  setTimeout(() => makerOv.classList.add('show'), 30);
});
window.addEventListener('resize', () => { sizeAll(); });

/* squiggle under the input */
(function underline() {
  const svg = $('underSvg');
  const b = blank.getBoundingClientRect();
  const w = Math.max(120, b.width || 300);
  svg.setAttribute('viewBox', `0 0 ${w} 12`);
  const r = SK.rng(77);
  let d = `M 2 7`;
  for (let x = 2; x < w - 4; x += 26)
    d += ` Q ${x + 7} ${2 + r.f() * 3}, ${x + 13} ${6 + r.f() * 3} T ${x + 26} ${6 + r.f() * 3}`;
  svg.innerHTML = `<path d="${d}" fill="none" stroke="#FF6B57" stroke-width="3" stroke-linecap="round"/>`;
})();

/* ============================================================
   INIT — first sketch + start the loop
   ============================================================ */
(function init() {
  sizeAll();
  window.WORLD.reset(STARTX);          /* paper at the hero's feet */
  window.WORLD.ahead(curSS);
  S.cam = window.WORLD.camStart(W);
  replayMaker();
  setGoal(0); setWolf(.14);
  /* re-sketch once the hand fonts land (labels crisper) */
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => { replayMaker(); });
  requestAnimationFrame(frame);
})();
