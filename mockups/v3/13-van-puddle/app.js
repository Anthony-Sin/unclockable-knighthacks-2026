/* ============================================================
   Puddlejump — app.js   (v3 · 13-van-puddle · painted marsh, zero-dep)
   A continuous PAINTED marsh slides under the camera (Emberwood
   Highland-Path style): the only animated world state is camera
   travel — every reed, puddle and cattail holds a stable world
   coordinate. The hero travels by HOPPING tuft-to-tuft across the
   puddled trail; props SPLASH IN with expanding rings + droplet
   arcs; material words fill the house-build meter and the pig
   house visibly upgrades a stage on the trail ahead.
   Story beats come from the REAL LLM through ../shared/llm.js.
   ============================================================ */
'use strict';

const SK = window.SK;
const INK = SK.INK;
const $ = (id) => document.getElementById(id);

const stage    = $('stage');
const worldCv  = $('worldCv');
const playCv   = $('playCv');
const goalFill = $('goalFill'), goalPig = $('goalPig');
const buildFillEl = $('buildFill'), buildStageEl = $('buildStage');
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

/* ---------- ONE painted world + the camera ----------
   Highland Path rule: the only animated state is camera travel.
   `S.cam` is the world-x of the screen's left edge; it eases toward
   `heroWX - anchor` every frame. Props, puddles, tufts and the pig
   house all live at stable WORLD x positions — the marsh sliding
   past IS the transition. No pan, no worldB, no wipe. */
let W = 800, H = 420;
let wctx = null;
let curSS = { biome: 'marsh', seed: 1234, palette: 'cool', props: [] };

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
  wctx = worldCv.getContext('2d');
  window.WORLD.resize(W, H);
  if (S) {
    S.travelLen = Math.round(W * 1.35);
    S.houseWX = S.startWX + S.travelLen;
    S.cam = Math.max(0, S.heroWX - W * .30);
  }
}

/* ============================================================
   GAME STATE
   ============================================================ */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false,
  history: [], words: [], slips: 0, pigs: 0,
  goal: 0, wolf: .14,
  propSeq: 0, props: new Map(),
  buildStage: 0, buildFill: 0, riding: null, gear: [],
  hero: null,
  heroWX: 0, heroWXT: 0, heroX: 0,           /* world x + derived screen x */
  cam: 0, startWX: 0, travelLen: 1000, houseWX: 1200,
  heroState: 'idle', heroAnim: null,
  heroJ: 0, heroVY: 0, heroLift: 0, landT: 0,
  dizzyUntil: 0, wolfAnim: null, fx: [],
  shake: null, shakeX: 0, shakeY: 0,
  pendingWord: null, won: false, sceneSeed: 1234,
  hopsN: 0, splashesN: 0, jigglesN: 0,
};
const okEp = (ep) => ep === S.epoch;
/* LLM x-frac (0-1 across the screen) → a stable world coordinate */
const propWX = (frac) => S.cam + 50 + clamp01(frac == null ? .5 : frac) * (W - 110);
const heroFeetY = () => window.WORLD.groundAt(S.heroWX);
const propFeetY = (p) => window.WORLD.groundAt(p.x) + (p.wet ? 4 : 0);

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
function splashIn(p) {
  /* SPLASH-IN: pop out of a puddle when one is nearby, else drop from a
     drizzle cloud — either way it lands with rings + droplet arcs. */
  const pud = window.WORLD.puddleNear(p.x, 105);
  if (pud && p.cls !== 'bonk') {
    p.x = pud.x; p.wet = true;
    p.rise = { t0: p.born, dur: 640 };
    fxSplash(p.x - S.cam, window.WORLD.groundAt(p.x) + 4, .9);
  } else {
    p.alt = 150 + (p.seed % 60);             /* falls out of a drizzle cloud */
    p.vy = -30;
  }
}
function spawnProp(rawKind, xFrac, opts = {}) {
  const res = window.resolveKind(rawKind);
  const def = window.PROPS[res.def] || window.PROPS.doodle;
  const id = `p${++S.propSeq}`;
  const p = {
    id, kind: res.def, raw: String(rawKind || res.word || 'thing'),
    word: res.word, def, cls: def.cat || 'plain',
    x: propWX(xFrac), alt: null, vy: 0, hover: 0, rise: null,
    slideT: null, slideFrom: 0, slideTo: 0, slideDur: 600, flyIn: null,
    sc: window.propScale(def, W), seed: SK.hashStr(res.def + ':' + id),
    born: performance.now(), state: 'idle', pop: 0, dead: false,
    wet: false, jigT: 0,
  };
  if (opts.born) p.born = opts.born;
  p.wet = window.WORLD.isWaterAt(p.x);
  /* every prop ENTERS with motion — and in the marsh, that means a splash */
  if (p.cls === 'ride') {                    /* mounts trot in from stage left */
    p.slideFrom = S.cam - 180; p.slideTo = p.x; p.slideT = p.born; p.slideDur = 720;
    fxRing(10, propFeetY(p) - 2, false);
    p.x = p.slideFrom;
  } else if (FLY_KINDS.has(p.kind)) {        /* fliers drift down & hover */
    p.hover = 118 + (p.seed % 42);
    p.flyIn = { t0: p.born, dur: 950 };
    fxPuff(p.x - S.cam, heroFeetY() - p.hover, '#E8F0EE');
  } else {
    splashIn(p);
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
  fxPuff(p.x - S.cam, propFeetY(p) - 20, '#E8DCC0');
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
/* ---------- HOP THE TUFTS — the signature stride ----------
   Every accepted turn the hero travels by chained hops: tuft to tuft,
   stone to stone, puddle to puddle. Each hop is a visible arc with a
   squash landing; landing in water kicks up a splash and jiggles the
   props standing nearby. */
function heroStride(wx0, wx1, mode) {
  const hops = [];
  let x = wx0, guard = 0;
  while (x < wx1 - 6 && guard++ < 60) {
    const nx = Math.min(wx1, window.WORLD.stepAfter(x + 10));
    if (nx <= x + 8) break;
    hops.push(nx); x = nx;
  }
  if (!hops.length) hops.push(wx1);
  hops[hops.length - 1] = wx1;               /* last hop lands on the goal spot */
  const runK = mode === 'run' ? .62 : 1;
  const est = hops.reduce((m, h, i) => {
    const prev = i ? hops[i - 1] : wx0;
    return m + (170 + Math.abs(h - prev) * 1.15) * runK + 46;
  }, 0);
  S.heroState = mode === 'run' ? 'run' : 'hop';
  S.heroAnim = { type: 'stride', t0: performance.now(), dur: est,
    from: wx0, to: wx1, hops, hi: 0, hT0: null, hDur: 0, hFrom: wx0,
    mode, est };
  return est;
}
async function travel() {
  /* hop forward — but never past the pig house door ahead */
  const target = Math.min(S.houseWX - 46, S.heroWX + W * .8,
    Math.max(S.heroWXT, S.heroWX + W * .06));
  if (target <= S.heroWX + 10) { await sleep(340); return; }
  const est = heroStride(S.heroWX, target, 'hop');
  await sleep(est + 160);
}
/* a puddle landing splashes — and nearby props feel it */
function jiggleNear(wx, range) {
  for (const p of S.props.values())
    if (!p.dead && !p.worn && Math.abs(p.x - wx) < range) {
      p.jigT = performance.now();
      S.jigglesN++;
    }
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
function fxRing(x, y, big) {                 /* expanding water rings */
  for (let i = 0; i < (big ? 3 : 2); i++) {
    S.fx.push({ type: 'ring', x, y, vx: 0, vy: 0, age: -i * .14, ttl: .72,
      size: (big ? 34 : 20) + i * 9, col: '#BFE8EE', seed: (i * 77 + x * 3) | 0 });
  }
}
function fxSplash(x, y, s) {                 /* droplet arcs + rings */
  s = s || 1;
  S.splashesN++;
  fxRing(x, y, s > .75);
  const n = Math.round(5 + 5 * s);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (.16 + .68 * i / Math.max(1, n - 1));
    S.fx.push({ type: 'drop', x, y: y - 4,
      vx: Math.cos(a) * (55 + Math.random() * 95) * s,
      vy: Math.sin(a) * (140 + Math.random() * 120) * s,
      age: 0, ttl: .78, size: 2.4 + Math.random() * 2.4,
      col: i % 3 ? '#A8DCE8' : '#EAF6F8', seed: (i * 131 + x * 7) | 0 });
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
      p.slideFrom = p.x; p.slideTo = Math.max(S.cam + 70, S.heroWX - 4);
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
      p.x = S.heroWX + 44;                   /* lands right in the hero's path */
      await sleep(420);
      coachSay(`Whoops — a ${p.raw}! Right under your feet!`, true);
      S.slips++;
      const g = heroGag('slip', 1450);       /* skid → spin → splat → dust off */
      S.heroAnim.to = S.heroWX + 40;
      setTimeout(() => reactProp(p.id), 620);/* the peel squashes too */
      await g;
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'bonk': {
      p.x = S.heroWX + 26;
      p.alt = 120; p.vy = -30;               /* falls onto the hero's spot */
      await sleep(620);
      coachSay(`Bonk! A falling ${p.raw}!`, true);
      S.slips++;
      await heroGag('bonk', 800);
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'eat': {
      p.x = S.heroWX + 54;
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
      /* building stuff splashes in ahead of the hero, then slurps into
         the house-build meter — fill it and the pig house grows a stage */
      p.x = S.heroWX + 104 + Math.random() * 56;
      const pud = window.WORLD.puddleNear(p.x, 120);
      if (pud) { p.x = pud.x; p.wet = true; p.rise = { t0: performance.now(), dur: 620 }; }
      else { p.alt = 64; p.vy = -30; }       /* plops out of low drizzle */
      const tier = /straw|hay/.test(rawKind) ? 1 : /brick|stone/.test(rawKind) ? 3 : 2;
      const names = { 1: 'straw', 2: 'sticks', 3: 'brick' };
      await sleep(640);
      if (!alive()) return;
      coachSay(`${names[tier]} for the house! The build meter drinks it up…`);
      p.state = 'collect'; p.stateT = performance.now();
      setTimeout(() => fillBuild(.5), 560);
      heroJump(360, 'hop');
      await sleep(620);
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
  const wy = heroFeetY() - 120;
  for (let i = 0; i < 4; i++)
    setTimeout(() => fxPuffCloud(40 + i * 10, wy + i * 10, i > 1), i * 140);
  await sleep(900);
  if (!ep || okEp(ep)) {
    const hx = S.houseWX - S.cam, hy = window.WORLD.groundAt(S.houseWX);
    if (S.buildStage > 0 && S.buildStage < 3) {
      fxDebris(hx, hy - 20);
      S.buildStage = Math.max(0, S.buildStage - 1);
      buildStageEl.textContent = ['plot', 'straw', 'sticks', 'brick'][S.buildStage];
      coachSay('Whoosh! The weak house blew to bits. Stronger stuff needed!', true);
      await sleep(600);
    } else if (S.buildStage >= 3) {
      coachSay('The brick house does NOT budge. Not one brick!');
      fxPuff(hx, hy - 80, '#EFE4D0');
    }
  }
  setWolf(.45);                      /* wolf needs a breather */
}

/* ============================================================
   LIVE FRAME LOOP — props, wolf, hero, fx at 60fps
   ============================================================ */
let lastT = 0;
const easeOutC = (k) => 1 - Math.pow(1 - k, 3);
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

  /* CAMERA — eases toward heroWX - anchor; the only animated world state */
  const camT = Math.max(0, S.heroWX - W * .30);
  S.cam += (camT - S.cam) * Math.min(1, dt * 2.8);
  S.heroX = S.heroWX - S.cam;

  worldCv.style.transform = `translate(${S.shakeX}px, ${S.shakeY}px)`;
  playCv.style.transform = `translate(${S.shakeX}px, ${S.shakeY}px)`;

  /* PAINTED MARSH at camera — alive every frame */
  window.WORLD.frame(wctx, S.cam, t);

  const ctx = playCv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const feetY = heroFeetY();
  const striding = S.heroAnim && S.heroAnim.type === 'stride';

  /* hero free-jump physics (mount hops, gag bounces — NOT the stride arcs) */
  if (!striding && (S.heroJ > 0 || S.heroVY > 0)) {
    S.heroJ += S.heroVY * dt;
    S.heroVY -= 1900 * dt;
    if (S.heroJ <= 0) {
      S.heroJ = 0; S.heroVY = 0; S.landT = tms;
      const wet = window.WORLD.isWaterAt(S.heroWX);
      if (wet) { fxSplash(S.heroX + 2, feetY + 1, .7); jiggleNear(S.heroWX, 140); }
      else fxPuff(S.heroX + 2, feetY + 1, '#E8DCC0');
      if (S.heroState === 'hop' || S.heroState === 'mount')
        S.heroState = S.riding ? 'ride' : 'idle';
    }
  }
  /* riding lift eases on/off so mounting never teleports */
  S.heroLift += ((S.riding ? 52 : 0) - S.heroLift) * Math.min(1, dt * 6.5);

  /* --- the pig house under construction — world-anchored on the trail ahead */
  const houseSX = S.houseWX - S.cam;
  const shaking = S.wolfAnim && (tms - S.wolfAnim.t0) < 1500 && S.buildStage > 0;
  if (houseSX > -180 && houseSX < W + 240)
    window.WORLD.drawBuild(ctx, S.buildStage, houseSX,
      window.WORLD.groundAt(S.houseWX) + 8,
      SK.rng((curSS.seed | 0) + 555), { shake: shaking, doorOpen: S.won });

  /* --- props (stable world-x — they slide with the marsh) --- */
  for (const p of S.props.values()) {
    if (p.dead && tms - (p.stateT || 0) > 520) { S.props.delete(p.id); continue; }
    /* tidiness: far-behind props wash away downstream (off-screen) */
    if (!p.worn && p !== S.riding && p.x < S.cam - 340) { S.props.delete(p.id); continue; }
    const age = (tms - p.born) / 1000;
    let pop = easeOutBack(Math.min(1, age / .45));
    let sx = p.x - S.cam, sy = propFeetY(p), rot = 0, alpha = 1;
    const bob = Math.sin(t * 1.9 + (p.seed % 17)) * 3;

    /* entrance 1: mounts slide in from stage left */
    if (p.slideT != null) {
      const k = Math.min(1, (tms - p.slideT) / p.slideDur);
      p.x = p.slideFrom + (p.slideTo - p.slideFrom) * easeOutC(k);
      if (k >= 1) p.slideT = null;
      sx = p.x - S.cam;
    }
    /* entrance 2: drizzle-cloud drops fall, bounce once, SPLASH on settle */
    if (p.alt != null) {
      p.alt += p.vy * dt; p.vy -= 1650 * dt;
      if (p.alt <= 0) {
        if (p.vy < -330) {
          p.alt = 0; p.vy = -p.vy * .3;
          fxSplash(p.x - S.cam, propFeetY(p), .55);
        } else {
          p.alt = null; p.vy = 0;
          p.wet = window.WORLD.isWaterAt(p.x);
          fxSplash(p.x - S.cam, propFeetY(p), p.wet ? 1 : .8);
          jiggleNear(p.x, 120);
          if (p.cls === 'bonk')              /* heavy props land with a thud */
            S.shake = { t0: tms, dur: 280, amp: 3 };
        }
      }
    }
    /* entrance 3: puddle pop — the prop springs up out of the water */
    if (p.rise) {
      const k = Math.min(1, (tms - p.rise.t0) / p.rise.dur);
      sy += (1 - easeOutBack(k)) * 36;
      pop *= .3 + .7 * Math.min(1, k * 1.5);
      if (k >= 1) p.rise = null;
    }
    /* fliers descend to their hover height and bob up there */
    let lift = p.hover || 0;
    if (p.flyIn) {
      const k = Math.min(1, (tms - p.flyIn.t0) / p.flyIn.dur);
      lift += (1 - easeOutC(k)) * 170;
      if (k >= 1) p.flyIn = null;
    }
    sy = sy - lift - (p.alt || 0);

    if (p.worn) {
      sx = S.heroX;
      sy = feetY - S.heroLift - S.heroJ - 108 + bob * .6;  /* on the hero's head */
    } else if (p === S.riding) {
      sx = S.heroX; sy = feetY + bob * .4;                  /* carries the hero */
    } else {
      /* props in water float slightly — a lazy marsh bob + tilt */
      sy += bob * (p.hover ? 1.9 : p.wet ? 1.8 : 1);
      if (p.wet) rot += Math.sin(t * 1.6 + (p.seed % 11)) * .035;
    }
    /* a puddle landing nearby makes loose props jiggle */
    if (p.jigT) {
      const jk = (tms - p.jigT) / 480;
      if (jk >= 1) p.jigT = 0;
      else {
        rot += Math.sin(jk * Math.PI * 4) * (1 - jk) * .1;
        pop *= 1 + Math.sin(jk * Math.PI * 3) * (1 - jk) * .12;
      }
    }
    if (p.state === 'react') {
      const k = (tms - p.stateT) / 500;
      if (k >= 1) p.state = 'idle';
      else { pop *= 1 + Math.sin(k * Math.PI) * .28; rot = Math.sin(k * Math.PI * 2) * .06; }
    }
    if (p.state === 'eaten') {
      const k = Math.min(1, (tms - p.stateT) / 320);
      pop *= 1 - k; alpha = Math.min(alpha, 1 - k);
      sx += (S.heroX - sx) * k * .3;
    }
    if (p.state === 'collect') {
      /* a material prop slurps up into the HUD build meter */
      const k = Math.min(1, (tms - p.stateT) / 620);
      const e = easeOutC(k);
      sx = sx + (W * .46 - sx) * e;
      sy = sy + (24 - sy) * e;
      pop *= 1 - k * .65; alpha = Math.min(alpha, 1 - k * .8);
      if (k >= 1) { S.props.delete(p.id); continue; }
    }
    if (p.state === 'poof') {
      const k = Math.min(1, (tms - p.stateT) / 480);
      pop *= 1 - k; alpha = Math.min(alpha, 1 - k);
    }

    if (sx > -150 && sx < W + 170) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      const sc = p.sc * Math.max(.01, pop);
      ctx.scale(sc, sc);
      ctx.globalAlpha = alpha;
      ctx.translate(-p.def.w / 2, -p.def.h + 8);   /* feet at 0,0 */
      p.def.draw(ctx, p.def.w, p.def.h, SK.rng(p.seed), p.raw);
      ctx.restore();

      /* hand-lettered name under every live prop */
      if (alpha > .6 && !p.worn)
        SK.caption(ctx, p.raw, sx, propFeetY(p) + 18, SK.rng(p.seed + 5), { size: 14 });
    }
  }

  /* --- the wolf, creeping in from the left (he stalks the camera) --- */
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
  ctx.translate(wolfX + lean, feetY + wolfBob);
  ctx.scale(wsc, wsc);
  ctx.globalAlpha = S.wolf > .04 ? 1 : 0;
  ctx.translate(-wolfDef.w / 2 + 30, -wolfDef.h + 8);
  wolfDef.draw(ctx, wolfDef.w, wolfDef.h, SK.rng(4242), 'wolf');
  ctx.restore();

  /* --- the hero (kid's strokes, replayed wobbly) — feet pinned to the trail --- */
  if (S.hero && S.started) {
    let hx = S.heroX, rot = 0, alpha = 1;
    let hy = feetY - S.heroJ - S.heroLift;          /* ground + jump + mount */
    let sq = 1 + Math.sin(t * 2.7) * .018;          /* idle breathe, feet stay planted */
    const lk = (tms - S.landT) / 240;               /* landing squash after a hop */
    if (lk < 1) sq *= 1 - Math.sin(lk * Math.PI) * .16;
    if (S.heroState === 'ride') { hy += Math.sin(t * 3.6) * 3.4; rot = .05; }
    if (S.heroAnim) {
      const a = S.heroAnim;
      const k = Math.min(1, (tms - a.t0) / a.dur);
      if (a.type === 'stride') {
        /* HOP THE TUFTS — chained arcs with squash landings + splashes */
        if (a.hT0 == null && tms >= (a.wait || 0)) {
          a.hFrom = a.hi ? a.hops[a.hi - 1] : a.from;
          a.hDur = Math.max(120, (170 + Math.abs(a.hops[a.hi] - a.hFrom) * 1.15)
            * (a.mode === 'run' ? .62 : 1));
          a.hT0 = tms;
        }
        if (a.hT0 != null) {
          const kk = clamp01((tms - a.hT0) / a.hDur);
          const dist = a.hops[a.hi] - a.hFrom;
          S.heroWX = a.hFrom + dist * kk;
          S.heroX = S.heroWX - S.cam; hx = S.heroX;
          const hopH = Math.min(58, Math.max(30, Math.abs(dist) * .5))
            * (S.riding ? .5 : 1);
          S.heroJ = Math.sin(kk * Math.PI) * hopH;
          hy = feetY - S.heroJ - S.heroLift;
          rot = .1 * Math.sin(kk * Math.PI) + (a.mode === 'run' ? .07 : 0);
          if (kk >= 1) {
            S.heroJ = 0; S.landT = tms; S.hopsN++;
            if (window.WORLD.isWaterAt(S.heroWX)) {
              fxSplash(hx + 2, feetY + 2, .9);
              jiggleNear(S.heroWX, 150);
            } else {
              fxPuff(hx + 2, feetY + 1, '#E4D8BE');
            }
            a.hi++;
            if (a.hi >= a.hops.length) {
              S.heroAnim = null;
              S.heroState = S.riding ? 'ride' : 'idle';
            } else {
              a.hT0 = null; a.wait = tms + 42;   /* beat between hops */
            }
          }
        }
      } else if (a.type === 'slip') {
        /* skid forward → tumble-spin up & over → SPLAT flat → dust-off wobble */
        if (k < .42) {
          const kk = k / .42;
          S.heroWX = a.from + (a.to - a.from) * kk;
          S.heroX = S.heroWX - S.cam; hx = S.heroX;
          rot = kk * Math.PI * 2;
          hy -= Math.sin(kk * Math.PI) * 50;
        } else if (k < .68) {
          if (!a.splat) { a.splat = true; fxSplash(hx + 8, feetY - 4, .8); }
          rot = 0; sq = .48;
        } else {
          const kk = (k - .68) / .32;
          sq = .48 + .52 * Math.min(1, kk * 1.7);
          rot = Math.sin(kk * Math.PI * 3) * .15 * (1 - kk);
          if (!a.dust && kk > .45) { a.dust = true; fxPuff(hx - 6, feetY - 34, '#D8CCB4'); }
        }
      } else if (a.type === 'bonk') {
        sq *= 1 - Math.sin(k * Math.PI) * .5;
      }
      if (a.type !== 'stride' && k >= 1) {
        S.heroAnim = null; if (S.heroState !== 'ride') S.heroState = 'idle';
      }
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
    if (f.age < 0) continue;                        /* staggered ring delay */
    f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
    if (f.type === 'debris') { f.vy += 620 * dt; f.rot += (f.spin || 0) * dt; }
    if (f.type === 'drop') f.vy += 950 * dt;        /* droplets arc back down */
    const k = f.age / f.ttl, fr = SK.rng(f.seed);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    if (f.type === 'puff') {
      SK.circle(ctx, f.x, f.y, f.size * (1 + k), { r: fr, fill: f.col, stroke: 'none' });
    } else if (f.type === 'ring') {
      ctx.strokeStyle = f.col; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.size * (.25 + 1.35 * k), f.size * .38 * (.25 + 1.35 * k),
        0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.type === 'drop') {
      SK.ellipse(ctx, f.x, f.y, f.size * .7, f.size, { r: fr, fill: f.col, stroke: 'none' });
    } else if (f.type === 'twinkle') {
      ctx.translate(f.x, f.y);
      ctx.rotate(k * 1.4);
      SK.star(ctx, 0, 0, f.size * (1 - k * .4), f.size * .4, 5,
        { r: fr, fill: f.col, strokeWidth: 1.4 });
    } else if (f.type === 'puffcloud') {
      SK.ellipse(ctx, f.x, f.y, f.size * (1 + k * .7), f.size * .6,
        { r: fr, fill: f.col, strokeWidth: 1.6 });
    } else if (f.type === 'debris') {
      ctx.translate(f.x, f.y);
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
  /* the journey only goes forward: heroWXT is the furthest the goal
     has ever mapped to in WORLD x — the hero hops to it, never teleports */
  S.heroWXT = Math.max(S.heroWXT, S.startWX + S.goal * S.travelLen);
}
/* the house-build meter: material words fill it; a full meter upgrades
   the pig house one stage on the trail ahead (plot → straw → sticks → brick) */
function fillBuild(amt) {
  S.buildFill += amt;
  let upgraded = false;
  while (S.buildFill >= 1 && S.buildStage < 3) {
    S.buildFill -= 1; S.buildStage++; upgraded = true;
  }
  if (S.buildStage >= 3) S.buildFill = Math.min(S.buildFill, 1);
  buildFillEl.style.width = Math.round(Math.min(1, S.buildFill) * 100) + '%';
  buildStageEl.textContent = ['plot', 'straw', 'sticks', 'brick'][S.buildStage];
  if (upgraded) {
    /* sparkles rain on the house plot — visible the moment it's on screen */
    const hx = S.houseWX - S.cam;
    for (let i = 0; i < 7; i++)
      setTimeout(() => fxTwinkle(
        hx + (Math.random() - .5) * 150,
        window.WORLD.groundAt(S.houseWX) - 30 - Math.random() * 130), i * 80);
    coachSay(`The pig house grows — now it's ${['a marked plot', 'a STRAW house', 'a STICK house', 'the BRICK house'][S.buildStage]}!`);
  }
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

  /* --- TRAVEL: the marsh ahead takes the new palette/biome, the hero
         hops tuft-to-tuft to reach it — the camera IS the transition --- */
  S.sceneSeed = gm.scene_seed.seed || S.sceneSeed;
  curSS = gm.scene_seed;
  window.WORLD.ahead(gm.scene_seed);
  await travel();
  if (!okEp(ep)) { S.busy = false; goBtn.disabled = false; return; }

  /* --- the typed-word props: physical spawns + gags --- */
  if (S.riding && !(gm.props || []).some(pp => window.propClass(pp.kind) === 'ride'))
    dismount();
  for (const pr of (gm.props || [])) {
    if (!okEp(ep)) break;
    if (pr.action === 'remove') { const id = findProp(pr.kind); if (id) poofProp(id); continue; }
    if (pr.action === 'react') {
      const id = findProp(pr.kind);
      if (id) reactProp(id);
      else {
        /* a "react" on a missing prop still splashes in — and material
           still feeds the build meter, whatever action brought it */
        const p = spawnProp(pr.kind, pr.x);
        const cls = window.propClass(pr.kind);
        if (cls !== 'plain') await applyProp(p, String(pr.kind).toLowerCase());
      }
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
  /* the last bricks fly into place — payoff needs the brick house standing */
  if (S.buildStage < 3) {
    S.buildStage = 3; S.buildFill = 0;
    buildStageEl.textContent = 'brick';
    buildFillEl.style.width = '0%';
  }
  coachSay('Hop home! The brick house door is open!');
  const est = S.houseWX - 46 > S.heroWX + 20
    ? heroStride(S.heroWX, S.houseWX - 46, 'run') : 400;
  const hx = () => S.houseWX - S.cam;
  for (let i = 0; i < 8; i++)
    setTimeout(() => fxTwinkle(
      hx() - 40 + Math.random() * 130,
      window.WORLD.groundAt(S.houseWX) - 60 - Math.random() * 110), i * 90);
  await sleep(est + 500);
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
    'Three little pigs need to hop the marshy trail to the strong brick house ' +
    'before the wolf huffs and puffs. Type what your hero does!';
  coachSay('Try: gather straw — or anything silly!');
  setLineChip(`go, ${S.hero ? S.hero.name : 'hero'}, go!`);
  blank.disabled = false; goBtn.disabled = false;
  blank.focus({ preventScroll: true });
}
/* journey layout: the hero starts at START_WX and hops ~1.35 screens of
   trail to reach the pig house — world coordinates, stable forever */
function resetJourney() {
  S.startWX = window.WORLD.START_WX;
  S.travelLen = Math.round(W * 1.35);
  S.houseWX = S.startWX + S.travelLen;
  S.heroWX = S.startWX; S.heroWXT = S.startWX;
  S.cam = window.WORLD.camStart();
  S.heroX = S.heroWX - S.cam;
  if (window.WORLD.resetZones) window.WORLD.resetZones();
}
function resetGame(keepHero) {
  S.epoch++;
  S.busy = false; S.demoOn = false;
  S.history = []; S.words = []; S.slips = 0; S.pigs = 0;
  S.goal = 0; S.wolf = .14;
  resetJourney();
  S.buildStage = 0; S.buildFill = 0;
  buildFillEl.style.width = '0%'; buildStageEl.textContent = 'plot';
  S.riding = null; S.gear = [];
  S.props.clear(); S.fx = []; S.won = false;
  S.heroState = 'idle'; S.heroAnim = null; S.wolfAnim = null;
  S.heroJ = 0; S.heroVY = 0; S.heroLift = 0; S.landT = 0;
  S.shake = null; S.shakeX = 0; S.shakeY = 0;
  S.pendingWord = null;
  S.hopsN = 0; S.splashesN = 0; S.jigglesN = 0;
  curSS = { biome: 'marsh', seed: 1234, palette: 'cool', props: [] };
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
  /* land cleanly: freeze the hop where it stands, restore the inputs */
  S.heroAnim = null; S.shake = null; S.pendingWord = null;
  S.heroJ = 0; S.heroVY = 0;
  if (S.heroState !== 'ride') S.heroState = 'idle';
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
  goal: +S.goal.toFixed(2), wolf: +S.wolf.toFixed(2),
  build: S.buildStage, buildFill: +S.buildFill.toFixed(2),
  heroX: Math.round(S.heroX), heroWX: Math.round(S.heroWX),
  cam: Math.round(S.cam), houseWX: Math.round(S.houseWX),
  heroState: S.heroState, riding: !!S.riding,
  heroJ: Math.round(S.heroJ),
  groundY: Math.round(window.WORLD.groundAt(S.heroWX)),
  inPuddle: window.WORLD.inPuddle(S.heroWX),
  hops: S.hopsN, splashes: S.splashesN, jiggles: S.jigglesN,
  aheadPal: window.WORLD.aheadPal,
  props: [...S.props.values()].map(p => p.raw),
  wetProps: [...S.props.values()].filter(p => p.wet).length,
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
  svg.innerHTML = `<path d="${d}" fill="none" stroke="#2FA3A0" stroke-width="3" stroke-linecap="round"/>`;
})();

/* ============================================================
   INIT — first paint + start the loop
   ============================================================ */
(function init() {
  sizeAll();
  resetJourney();
  replayMaker();
  setGoal(0); setWolf(.14);
  /* re-draw the maker pad once the hand fonts land (labels crisper) */
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => replayMaker());
  requestAnimationFrame(frame);
  if (location.hash === '#watch') setTimeout(() => startDemo(), 500);
})();
