/* ============================================================
   Pip & the Storywood — app.js   (v3 · 12-van-lantern · LANTERN TRAIL)
   Zero-dependency canvas. The backdrop is a single PAINTED DUSK
   WORLD drawn live every rAF (world.js): teal-purple sky, low sun,
   parallax ridge bands, lantern posts pooling warm light, ~40
   drifting fireflies. The camera only moves FORWARD — a new
   scene_seed morphs the world AHEAD via WORLD.ahead(ss).

   THE TWIST — "name it to light it":
   · every prop ARRIVES DIM (a ~35%-alpha shadow): fireflies carry it
     in on a glowing sling, set it down on the trail, then scatter.
   · the shadow stays dim until the kid TYPES ITS NAME — the exact
     prop word lights it (full color + warm glow ring + sparkles)
     and THEN its gag plays (slip/bonk/ride/material/...).
   · tapping a dim prop makes the fireflies whisper its name
     (coach hint) and flicker it brighter.
   · a near-miss guess pops "did you mean …" and breaks the streak;
     the HUD counts props "lit ×N" in a row.
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
const streakChip = $('streakChip');
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

/* ============================================================
   CONTINUOUS WORLD + CAMERA — Highland Path rule: the only
   animated state is camera travel; every object has a stable
   world coordinate. There is ONE world canvas, repainted live
   each frame at `cam`. cam only ever eases forward.
   ============================================================ */
let W = 800, H = 420;
let cam = 0;                                   /* world-x at the left screen edge */
const ANCHOR = .30;                            /* hero rests in the left third */
const STRIDE = 230;                            /* world-px the hero gains per turn */
const feetAt = (wx) => window.WORLD.groundAt(wx);
const heroFeetY = () => feetAt(S.heroWX);

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
  if (S) S.heroX = S.heroWX - cam;
}

/* ============================================================
   GAME STATE
   ============================================================ */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false,
  history: [], words: [], slips: 0, pigs: 0,
  goal: 0, wolf: .14,
  propSeq: 0, props: new Map(),
  buildStage: 0, buildWX: 0, riding: null, gear: [],
  hero: null, heroX: 0, heroWX: 0, heroWT: 0, heroState: 'idle', heroAnim: null,
  heroJ: 0, heroVY: 0, heroLift: 0, landT: 0,
  dizzyUntil: 0, wolfAnim: null, fx: [],
  shake: null, shakeX: 0, shakeY: 0,
  pendingWord: null, won: false, sceneSeed: 707,
  streak: 0, litTotal: 0, bestStreak: 0, litQueue: [],
};
const okEp = (ep) => ep === S.epoch;
const propWX = (frac) => cam + 50 + clamp01(frac == null ? .5 : frac) * (W - 110);

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
/* replay every stroke through the SAME wobbler that draws the props */
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
   LANTERN TRAIL: every prop arrives DIM, carried in by fireflies.
   It stays a shadow until the kid NAMES it (or taps it for a hint).
   ============================================================ */
const FLY_KINDS = new Set(['starprop', 'raincloud', 'moon', 'firefly']);
function spawnProp(rawKind, xFrac, opts = {}) {
  const res = window.resolveKind(rawKind);
  const def = window.PROPS[res.def] || window.PROPS.doodle;
  const id = `p${++S.propSeq}`;
  const p = {
    id, kind: res.def, raw: String(rawKind || res.word || 'thing'),
    word: res.word, def, cls: def.cat || 'plain',
    x: propWX(xFrac), alt: null, vy: 0, hover: 0,
    slideT: null, slideFrom: 0, slideTo: 0, slideDur: 600,
    sc: window.propScale(def, W), seed: SK.hashStr(res.def + ':' + id),
    born: performance.now(), state: 'idle', pop: 0, dead: false,
    /* Lantern Trail: every prop is a shadow until named */
    lit: false, litT: 0, peek: 0, litOnLand: false,
    /* the firefly sling: ~6 fireflies spiral in hauling the prop */
    carry: { t0: opts.born || performance.now(),
             dur: 1350 + (SK.hashStr(id) % 420) },
    landT: 0, _hx: -999, _hy: 0, _hw: 0, _hh: 0, _ground: 0,
  };
  if (opts.born) p.born = opts.born;
  if (FLY_KINDS.has(p.kind)) p.hover = 118 + (p.seed % 42);
  S.props.set(id, p);
  if (S.props.size > 13) {
    for (const [oid, q] of S.props) {
      if (q === S.riding || S.gear.includes(q) || q === p) continue;
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
  S.litQueue = S.litQueue.filter(q => q !== p);
  fxPuff(p.x, feetAt(p.x) - 20, '#D8CCB4');
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
/* forward travel on foot or mounted — the painted world flows underneath */
function heroTravel(from, to, dur, type) {
  S.heroState = type;
  S.heroAnim = { type, t0: performance.now(), dur, from, to, stepN: -1 };
}
async function travel() {
  heroTravel(S.heroWX, S.heroWT, 1120, S.riding ? 'ride' : 'walk');
  await sleep(1180);
}

/* ---------- "name it to light it" ---------- */
function guessable() {                    /* every unlit shadow, sling included */
  const out = [];
  for (const p of S.props.values())
    if (!p.lit && !p.dead) out.push(p);
  return out;
}
function dimProps() {                     /* landed shadows on the trail now */
  return guessable().filter(p => !p.carry);
}
function normWord(w) {
  return String(w || '').toLowerCase().trim().replace(/[\s_-]+/g, ' ').replace(/[^\w ']/g, '');
}
/* does this typed word name a shadow? light every match instantly — a prop
   still on the sling lights the moment it lands. Returns count named. */
function tryLight(word) {
  const res = window.resolveKind(word);
  const w = normWord(word);
  let lit = 0;
  for (const p of guessable()) {
    if (p.kind !== res.def && normWord(p.word) !== w) continue;
    if (p.carry) p.litOnLand = true;
    else lightProp(p);
    lit++;
  }
  return lit;
}
function lightProp(p) {
  p.lit = true;
  p.litT = performance.now();
  p.peek = 0;
  S.streak++;
  S.litTotal++;
  S.bestStreak = Math.max(S.bestStreak, S.streak);
  updateStreak(true);
  const gx = p.x, gy2 = feetAt(p.x);
  S.fx.push({ type: 'ring', x: gx, y: gy2 - 34, vx: 0, vy: 0,
              age: 0, ttl: .8, size: 16, col: '#FFCE7E', seed: p.seed + 71 });
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 2 * i / 5 + .5;
    S.fx.push({ type: 'twinkle', x: gx + Math.cos(a) * 34, y: gy2 - 46 + Math.sin(a) * 26,
                vx: Math.cos(a) * 22, vy: Math.sin(a) * 18 - 14, age: 0, ttl: .9 + i * .07,
                size: 10, col: '#FFE49C', seed: p.seed + i * 13 });
  }
  S.litQueue.push(p);
  if (!S.busy)
    coachSay(`“${p.word}” lights up!` +
      (S.streak > 1 ? ` — ${S.streak} in a row!` : ' Say what happens next!'));
}
/* nearest unlit-prop word within a TYPO of the guess → did_you_mean.
   Exact matches (d=0 — e.g. a prop that just spawned this turn) are not
   misses: they stay guessable, never streak-breakers. */
function dimNear(word) {
  const w = normWord(word);
  if (w.length < 3) return null;
  let best = null, bd = 99;
  for (const p of guessable()) {
    for (const cand of [p.word, p.kind]) {
      const d = lev(w, normWord(cand));
      if (d >= 1 && d < bd) { bd = d; best = p.word; }
    }
  }
  return bd >= 1 && bd <= 2 && bd < w.length ? best : null;
}
function updateStreak(bump) {
  streakChip.textContent = `lit ×${S.streak}`;
  streakChip.title = `${S.streak} shadow${S.streak === 1 ? '' : 's'} lit in a row — keep it glowing!`;
  if (bump) {
    streakChip.classList.remove('bump');
    void streakChip.offsetWidth;
    streakChip.classList.add('bump');
  }
}
/* lit props act — the gag queue drains after the current beat */
async function drainLit(ep) {
  while (S.litQueue.length && okEp(ep)) {
    const p = S.litQueue.shift();
    if (p.dead || !S.props.has(p.id) || !p.lit) continue;
    await applyProp(p, String(p.raw).toLowerCase());
    await sleep(80);
  }
}

/* ---------- fx particles (world-x anchored) ---------- */
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
/* a warm ring that blooms outward — the "it lit!" payoff + landing glow */
function fxRing(x, y, col) {
  S.fx.push({ type: 'ring', x, y, vx: 0, vy: 0, age: 0, ttl: .8,
              size: 14, col: col || '#FFCE7E', seed: (x + y) | 0 });
}
/* the carrier fireflies scatter after setting their cargo down */
function fxFlyScatter(x, y, seed) {
  const r = SK.rng(seed);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 2 * i / 6 + r.rr(-.4, .4);
    S.fx.push({ type: 'fly', x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 16,
      vx: Math.cos(a) * r.rr(60, 130), vy: Math.sin(a) * r.rr(40, 80) - r.rr(30, 70),
      age: 0, ttl: r.rr(1.1, 1.8), size: r.rr(1.4, 2.4), col: '#FFE49C',
      seed: seed + i * 57 });
  }
}

/* --- what the prop DOES to the hero (the comedy) — runs AFTER lighting --- */
async function applyProp(p, rawKind) {
  const cls = window.propClass(rawKind);
  const alive = () => S.props.has(p.id) && !p.dead;
  switch (cls) {
    case 'ride': {
      if (S.riding) S.riding = null;
      /* the mount trots over to the hero, then the hero hops on */
      p.slideFrom = p.x; p.slideTo = Math.max(cam + 70, S.heroWX - 4);
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
      p.x = S.heroWX + 44;                    /* lands right in the hero's path */
      await sleep(420);
      coachSay(`Whoops — a ${p.raw}! Right under your feet!`, true);
      S.slips++;
      const g = heroGag('slip', 1450);        /* skid → spin → splat → dust off */
      S.heroAnim.to = S.heroWX + 40;
      setTimeout(() => reactProp(p.id), 620); /* the peel squashes too */
      await g;
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'bonk': {
      p.x = S.heroWX + 26;
      p.alt = heroFeetY() - 30; p.vy = -30;   /* falls onto the hero's spot */
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
      /* building stuff drops by the house plot ahead */
      p.x = S.buildWX - 60 + Math.random() * 46;
      p.alt = heroFeetY() - 30; p.vy = -40;
      const tier = /straw|hay/.test(rawKind) ? 1 : /brick|stone/.test(rawKind) ? 3 : 2;
      const names = { 1: 'straw', 2: 'sticks', 3: 'brick' };
      await sleep(620);
      S.buildStage = Math.max(S.buildStage, tier);
      coachSay(`Building stuff! The ${names[tier]} house takes shape.`);
      fxPuff(S.buildWX, feetAt(S.buildWX) - 50, '#E8DCC0', true);
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
  const wy = heroFeetY() - 70;
  for (let i = 0; i < 4; i++)
    setTimeout(() => fxPuffCloud(cam + 40 + i * 10, wy + i * 10, i > 1), i * 140);
  await sleep(900);
  if (!ep || okEp(ep)) {
    if (S.buildStage > 0 && S.buildStage < 3) {
      fxDebris(S.buildWX, feetAt(S.buildWX) - 20);
      S.buildStage = Math.max(0, S.buildStage - 1);
      coachSay('Whoosh! The weak house blew to bits. Stronger stuff needed!', true);
      await sleep(600);
    } else if (S.buildStage >= 3) {
      coachSay('The brick house does NOT budge. Not one brick!');
      fxPuff(S.buildWX, feetAt(S.buildWX) - 80, '#EFE4D0');
    }
  }
  setWolf(.45);                      /* wolf needs a breather */
}

/* ============================================================
   LIVE FRAME LOOP — painted world + props + wolf + hero + fx
   ============================================================ */
let lastT = 0;
const easeOutC = (k) => 1 - Math.pow(1 - k, 3);
function frame(tms) {
  requestAnimationFrame(frame);
  const t = tms / 1000, dt = Math.min(.05, t - (lastT || t));
  lastT = t;

  /* world shake (wolf huff, heavy thuds) — both layers rattle together */
  if (S.shake) {
    const k = (tms - S.shake.t0) / S.shake.dur;
    if (k >= 1) { S.shake = null; S.shakeX = 0; S.shakeY = 0; }
    else {
      const a = S.shake.amp * (1 - k);
      S.shakeX = (Math.sin(tms * .09) + Math.sin(tms * .041)) * .5 * a;
      S.shakeY = Math.cos(tms * .113) * a * .7;
    }
  } else { S.shakeX = 0; S.shakeY = 0; }

  /* the camera only moves forward, easing toward the hero's anchor */
  const camT = Math.max(0, S.heroWX - ANCHOR * W);
  cam += (camT - cam) * Math.min(1, dt * 3.4);
  S.heroX = S.heroWX - cam;
  S.buildWX = S.won ? S.buildWX : Math.max(S.buildWX, cam + W * .78);

  /* paint the dusk world live — the sliding camera IS the transition */
  window.WORLD.frame(worldCv.getContext('2d'), cam + S.shakeX, t);
  worldCv.style.transform = `translate(0, ${S.shakeY}px)`;
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

  /* --- the house-in-progress on the plot ahead --- */
  const shaking = S.wolfAnim && (tms - S.wolfAnim.t0) < 1500 && S.buildStage > 0;
  window.WORLD.drawBuild(ctx, S.buildStage, S.buildWX - cam, feetAt(S.buildWX),
    SK.rng((S.sceneSeed | 0) + 555), { shake: shaking, doorOpen: S.won });

  /* --- props (world-anchored; shadows until named) --- */
  for (const p of S.props.values()) {
    if (p.dead && tms - (p.stateT || 0) > 520) { S.props.delete(p.id); continue; }
    const ground = feetAt(p.x);
    p._ground = ground;

    /* ENTRANCE — the firefly sling carries the prop in from ahead-right,
       spirals down to the trail, then scatters its flies */
    if (p.carry) {
      const k = clamp01((tms - p.carry.t0) / p.carry.dur);
      const e = .5 - Math.cos(Math.PI * k) / 2;
      const cwx = p.x + (1 - e) * 330 + Math.sin(k * Math.PI * 3 + (p.seed % 6)) * (1 - e) * 54;
      const cwy = -150 + (ground - 46 + 150) * e + Math.sin(k * Math.PI * 2.2) * (1 - e) * 40;
      const sx = cwx - cam;
      p._hx = sx; p._hy = cwy; p._hw = p.def.w * p.sc; p._hh = p.def.h * p.sc;
      /* the dim cargo, swaying on the sling */
      if (sx > -220 && sx < W + 220) {
        ctx.save();
        ctx.translate(sx, cwy);
        ctx.rotate(Math.sin(t * 3.4 + (p.seed % 9)) * .09);
        ctx.scale(p.sc, p.sc);
        ctx.globalAlpha = .45;
        ctx.translate(-p.def.w / 2, -p.def.h + 8);
        p.def.draw(ctx, p.def.w, p.def.h, SK.rng(p.seed), p.raw);
        ctx.restore();
        /* the sling team: 6 glowing flies orbiting the load */
        for (let i = 0; i < 6; i++) {
          const a = t * 3.1 + i * Math.PI * 2 / 6 + (p.seed % 4);
          const fr = 26 + Math.sin(t * 2.2 + i) * 7;
          const fx = sx + Math.cos(a) * fr;
          const fy = cwy - 30 + Math.sin(a) * fr * .62;
          const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
          g.addColorStop(0, 'rgba(255,228,156,.75)');
          g.addColorStop(1, 'rgba(255,228,156,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(fx, fy, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,240,190,.95)';
          ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (k >= 1) {                          /* set down — still a shadow */
        p.carry = null;
        p.landT = tms;
        fxPuff(p.x, ground, '#D8CCB4');
        fxRing(p.x, ground - 6, '#FFCE7E');
        fxFlyScatter(cwx, cwy - 24, p.seed);
        if (p.litOnLand) {                   /* named mid-flight: lights on landing */
          p.litOnLand = false;
          lightProp(p);
          if (!S.busy && S.started) {        /* its gag plays right away */
            S.busy = true;
            drainLit(S.epoch).then(() => { S.busy = false; goBtn.disabled = false; });
          }
        }
      }
      continue;
    }

    const age = (tms - p.born) / 1000;
    let pop = easeOutBack(Math.min(1, age / .45));
    let sx = p.x - cam, sy = ground, rot = 0, alpha = 1;
    const bob = Math.sin(t * 1.9 + (p.seed % 17)) * 3;
    if (p.landT) {
      const lk = (tms - p.landT) / 420;
      if (lk >= 1) p.landT = 0;
      else pop *= 1 + Math.sin(lk * Math.PI) * .16;      /* landing settle bump */
    }

    /* mounts slide along the world to reach the hero */
    if (p.slideT != null) {
      const k = Math.min(1, (tms - p.slideT) / p.slideDur);
      p.x = p.slideFrom + (p.slideTo - p.slideFrom) * easeOutC(k);
      if (k >= 1) p.slideT = null;
      sx = p.x - cam;
    }
    /* sky-drops (lit gags) fall, bounce once, then settle */
    if (p.alt != null) {
      p.alt += p.vy * dt; p.vy -= 1650 * dt;
      if (p.alt <= 0) {
        if (p.vy < -330) {
          p.alt = 0; p.vy = -p.vy * .3;
          fxPuff(p.x, ground, '#E8DCC0');
        } else {
          p.alt = null; p.vy = 0;
          fxPuff(p.x, ground, '#D8CCB4');
          if (p.cls === 'bonk')
            S.shake = { t0: tms, dur: 280, amp: 3 };
        }
      }
    }
    let lift = p.hover || 0;
    sy = ground - lift - (p.alt || 0);

    if (p.worn) {
      sx = S.heroX;
      sy = feetY - S.heroLift - S.heroJ - 108 + bob * .6;
    } else if (p === S.riding) {
      sx = S.heroX; sy = feetY + bob * .4;
    } else {
      sy += bob * (p.hover ? 1.9 : 1);
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
    if (p.state === 'poof') {
      const k = Math.min(1, (tms - p.stateT) / 480);
      pop *= 1 - k; alpha = Math.min(alpha, 1 - k);
    }

    /* the shadow-guess: DIM until named. A tapped shadow peeks brighter. */
    let glowA = 0;
    if (!p.lit) {
      alpha *= .3 + .07 * Math.sin(t * 2.2 + (p.seed % 11));
      if (p.peek && tms - p.peek < 750)
        alpha = Math.max(alpha, .62 * (1 - (tms - p.peek) / 750) + .34);
    } else {
      const lk = (tms - p.litT) / 2200;        /* halo decays to a soft ember */
      glowA = lk < 1 ? .55 - .4 * lk : .15;
    }

    p._hx = sx; p._hy = sy;
    p._hw = p.def.w * p.sc * Math.max(.01, pop);
    p._hh = p.def.h * p.sc * Math.max(.01, pop);

    if (sx < -240 || sx > W + 240) continue;

    /* warm glow ring — lit props carry a little lantern-light with them */
    if (p.lit && glowA > .01) {
      const gg = ctx.createRadialGradient(sx, sy - p._hh * .45, 4,
        sx, sy - p._hh * .45, p._hw * .72 + 26);
      gg.addColorStop(0, `rgba(255,206,126,${(glowA * .55).toFixed(3)})`);
      gg.addColorStop(1, 'rgba(255,206,126,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(sx, sy - p._hh * .45, p._hw * .72 + 26, 0, Math.PI * 2);
      ctx.fill();
    }
    /* dim shadows sit on a faint ember pool — the fireflies' leftover light */
    if (!p.lit) {
      const pg = ctx.createRadialGradient(sx, ground + 3, 2, sx, ground + 3, 54);
      pg.addColorStop(0, `rgba(255,206,126,${(.1 + .05 * Math.sin(t * 2.2 + (p.seed % 7))).toFixed(3)})`);
      pg.addColorStop(1, 'rgba(255,206,126,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(sx, ground + 3, 54, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    const sc = p.sc * Math.max(.01, pop);
    ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    ctx.translate(-p.def.w / 2, -p.def.h + 8);   /* feet at 0,0 */
    p.def.draw(ctx, p.def.w, p.def.h, SK.rng(p.seed), p.raw);
    ctx.restore();

    /* captions: real name once lit, a "?" while it's still a shadow */
    if (alpha > .4 && !p.worn) {
      if (p.lit)
        SK.caption(ctx, p.raw, sx, ground + 18, SK.rng(p.seed + 5), { size: 14 });
      else
        SK.caption(ctx, 'name it!', sx, ground + 18, SK.rng(p.seed + 5), { size: 14 });
    }
  }

  /* --- the wolf, creeping up the trail behind the hero --- */
  const wolfWX = S.heroWX - (.55 - S.wolf * .32) * W;
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
  ctx.translate(wolfWX - cam + lean, feetAt(wolfWX) + wolfBob);
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
      if (a.type === 'walk' || a.type === 'run' || a.type === 'ride') {
        /* TRAVEL — steady forward pace in WORLD x; cam eases after it */
        const dist = a.to - a.from;
        S.heroWX = a.from + dist * k;
        S.heroX = S.heroWX - cam; hx = S.heroX;
        const steps = Math.max(2, Math.round(Math.abs(dist) / 44));
        const lift = a.type === 'run' ? 9 : a.type === 'ride' ? 5 : 6.5;
        hy -= Math.abs(Math.sin(k * steps * Math.PI)) * lift;
        rot = a.type === 'run' ? .13 : Math.sin(k * steps * Math.PI * 2) * .08;
        const st = Math.floor(k * steps * 2);
        if (st !== a.stepN) { a.stepN = st; fxPuff(S.heroWX - 14, feetY + 2, '#E4D8BE'); }
      } else if (a.type === 'slip') {
        /* skid forward → tumble-spin up & over → SPLAT flat → dust-off wobble */
        if (k < .42) {
          const kk = k / .42;
          S.heroWX = a.from + (a.to - a.from) * kk;
          S.heroX = S.heroWX - cam; hx = S.heroX;
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
    /* the hero's own little pool of lamplight — never fully in the dark */
    const hg = ctx.createRadialGradient(hx, feetY + 2, 4, hx, feetY + 2, 64);
    hg.addColorStop(0, 'rgba(255,206,126,.14)');
    hg.addColorStop(1, 'rgba(255,206,126,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(hx, feetY + 2, 64, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* --- fx particles (world-x → screen) --- */
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i];
    f.age += dt;
    if (f.age > f.ttl) { S.fx.splice(i, 1); continue; }
    f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
    if (f.type === 'debris') { f.vy += 620 * dt; f.rot += (f.spin || 0) * dt; }
    const k = f.age / f.ttl, fr = SK.rng(f.seed);
    const sx = f.x - cam;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    if (f.type === 'puff') {
      SK.circle(ctx, sx, f.y, f.size * (1 + k), { r: fr, fill: f.col, stroke: 'none' });
    } else if (f.type === 'twinkle') {
      ctx.translate(sx, f.y);
      ctx.rotate(k * 1.4);
      SK.star(ctx, 0, 0, f.size * (1 - k * .4), f.size * .4, 5,
        { r: fr, fill: f.col, strokeWidth: 1.4 });
    } else if (f.type === 'puffcloud') {
      SK.ellipse(ctx, sx, f.y, f.size * (1 + k * .7), f.size * .6,
        { r: fr, fill: f.col, strokeWidth: 1.6 });
    } else if (f.type === 'debris') {
      ctx.translate(sx, f.y);
      ctx.rotate(f.rot);
      SK.rect(ctx, -f.size / 2, -5, f.size, 10, { r: fr, fill: f.col, strokeWidth: 1.6 });
    } else if (f.type === 'ring') {
      ctx.strokeStyle = f.col;
      ctx.lineWidth = 3.5 * (1 - k) + .8;
      ctx.beginPath();
      ctx.ellipse(sx, f.y, (f.size + k * 60), (f.size + k * 60) * .4, 0, 0, Math.PI * 2);
      ctx.stroke();
      const g = ctx.createRadialGradient(sx, f.y, 2, sx, f.y, (f.size + k * 60) * .8);
      g.addColorStop(0, 'rgba(255,220,150,.28)');
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, f.y, (f.size + k * 60) * .8, (f.size + k * 60) * .34, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.type === 'fly') {
      const g = ctx.createRadialGradient(sx, f.y, 0, sx, f.y, 7);
      g.addColorStop(0, 'rgba(255,228,156,.7)');
      g.addColorStop(1, 'rgba(255,228,156,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, f.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.arc(sx, f.y, f.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

/* ============================================================
   HUD — goal, wolf & streak meters
   ============================================================ */
function setGoal(p) {
  S.goal = clamp01(p);
  const pct = Math.round(S.goal * 100);
  goalFill.style.width = pct + '%';
  goalPig.style.left = `calc(${pct}% - 12px)`;
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

  /* LANTERN TRAIL: naming a shadow lights it — instant, even mid-turn */
  tryLight(word);

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

  /* --- goal first: the bar climbs WHILE the hero walks forward --- */
  let gTarget = gm.success ? Math.max(S.goal, gm.goal_progress)
                          : Math.max(S.goal - .05, gm.goal_progress);
  if (gm.success) gTarget = Math.min(1, Math.max(gTarget, S.goal + .03));
  const gained = Math.max(0, gTarget - S.goal);
  setGoal(gTarget);

  /* --- TRAVEL: the hero strides ahead in world-x; the world AHEAD
         morphs into the new scene_seed — no wipe, just the road --- */
  S.sceneSeed = gm.scene_seed.seed || S.sceneSeed;
  S.curBiome = gm.scene_seed.biome;
  S.heroWT = S.heroWX + (gm.success ? STRIDE : Math.round(STRIDE * .6));
  window.WORLD.ahead(gm.scene_seed);
  await travel();
  if (!okEp(ep)) { S.busy = false; goBtn.disabled = false; return; }

  /* --- the typed-word props: fireflies carry each one in, DIM --- */
  if (S.riding && !(gm.props || []).some(pp => window.propClass(pp.kind) === 'ride'))
    dismount();
  for (const pr of (gm.props || [])) {
    if (!okEp(ep)) break;
    if (pr.action === 'remove') { const id = findProp(pr.kind); if (id) poofProp(id); continue; }
    if (pr.action === 'react') {
      const id = findProp(pr.kind);
      if (id) { reactProp(id); const q = S.props.get(id); if (q && !q.lit) q.peek = performance.now(); }
      else spawnProp(pr.kind, pr.x);
      continue;
    }
    const exist = findProp(pr.kind);
    if (exist) {
      reactProp(exist);
      const q = S.props.get(exist);
      if (q && !q.lit) q.peek = performance.now();   /* "that one!" — flicker it */
    } else {
      spawnProp(pr.kind, pr.x);                       /* dim, on the sling */
    }
    await sleep(120);
  }

  /* --- did you mean (LLM, then dim-prop near-misses, then local list) --- */
  const nearDim = dimNear(word);
  if (nearDim) { S.streak = 0; updateStreak(); }      /* almost — streak breaks */
  showDym(gm.did_you_mean || nearDim || localDym(word));

  /* --- light it → THEN it acts (the gag queue drains post-beat) --- */
  await drainLit(ep);

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
   WIN — safe inside the brick house (the overlay glows)
   ============================================================ */
async function winSeq() {
  S.busy = true; S.won = true;
  coachSay('Run! The brick house door is open!');
  S.heroState = 'run';
  S.heroAnim = { type: 'run', t0: performance.now(), dur: 1200,
                 from: S.heroWX, to: S.buildWX - 46, stepN: -1 };
  for (let i = 0; i < 8; i++)
    setTimeout(() => fxTwinkle(
      S.buildWX - 70 + Math.random() * 170,
      feetAt(S.buildWX) - 60 - Math.random() * 90), i * 90);
  await sleep(1400);
  recap.innerHTML = '';
  const line = document.createElement('p');
  line.style.margin = '4px 0 8px';
  line.textContent = `Your hero made it in ${S.words.length} word${S.words.length === 1 ? '' : 's'}` +
    (S.slips ? ` — with ${S.slips} silly slip${S.slips === 1 ? '' : 's'}!` : ' — no slips at all!');
  recap.appendChild(line);
  if (S.litTotal) {
    const l = document.createElement('p');
    l.style.margin = '0 0 8px';
    l.textContent = `The fireflies lit ${S.litTotal} shadow${S.litTotal === 1 ? '' : 's'}` +
      ` — best streak: ${S.bestStreak} in a row!`;
    recap.appendChild(l);
  }
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
  coachSay('Shadows arrive on the trail — type a shadow’s NAME to light it!');
  setLineChip(`go, ${S.hero ? S.hero.name : 'hero'}, go!`);
  blank.disabled = false; goBtn.disabled = false;
  blank.focus({ preventScroll: true });
}
function resetGame(keepHero) {
  S.epoch++;
  S.busy = false; S.demoOn = false;
  S.history = []; S.words = []; S.slips = 0; S.pigs = 0;
  S.goal = 0; S.wolf = .14;
  S.heroWX = S.heroWT = .30 * W; S.heroX = S.heroWX;
  cam = window.WORLD.camStart();
  S.buildStage = 0; S.buildWX = cam + W * .78;
  S.riding = null; S.gear = [];
  S.props.clear(); S.fx = []; S.won = false;
  S.heroState = 'idle'; S.heroAnim = null; S.wolfAnim = null;
  S.heroJ = 0; S.heroVY = 0; S.heroLift = 0; S.landT = 0;
  S.shake = null; S.shakeX = 0; S.shakeY = 0;
  S.pendingWord = null;
  S.streak = 0; S.litTotal = 0; S.bestStreak = 0; S.litQueue = [];
  window.WORLD.reset({ biome: 'dusk', palette: 'dusk', seed: 707 });
  updateStreak();
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
   (paired words: the second one NAMES the shadow the first spawned)
   ============================================================ */
const DEMO_WORDS = ['gather straw', 'straw', 'banana peel', 'peel',
  'unicorn', 'unicorn', 'sticks', 'bricks', 'bricks',
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
  S.heroAnim = null; S.shake = null; S.pendingWord = null;
  S.litQueue = [];
  if (S.started && !S.busy) {
    goBtn.disabled = false;
    coachSay('You take over — type a word!');
  }
}
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;
/* headless-test hook: spawn a dim prop on the firefly sling (no gag yet) */
window.__test = (kind, xFrac) => {
  const p = spawnProp(kind, xFrac == null ? .55 : xFrac);
  return p.id;
};
/* headless-test hook: does this word light a shadow? */
window.__light = (word) => tryLight(word);
/* tiny read-only state probe — used by the v3 headless verification harness */
window.__probe = () => ({
  started: S.started, busy: S.busy, demo: S.demoOn, won: S.won,
  goal: +S.goal.toFixed(2), wolf: +S.wolf.toFixed(2), build: S.buildStage,
  cam: Math.round(cam), heroX: Math.round(S.heroX), heroWX: Math.round(S.heroWX),
  heroState: S.heroState, riding: !!S.riding,
  heroJ: Math.round(S.heroJ), buildWX: Math.round(S.buildWX),
  props: [...S.props.values()].map(p => ({ raw: p.raw, lit: p.lit, carry: !!p.carry,
    sx: Math.round(p._hx), sy: Math.round(p._hy) })),
  dim: dimProps().length, carrying: [...S.props.values()].filter(p => p.carry).length,
  streak: S.streak, litTotal: S.litTotal, bestStreak: S.bestStreak,
  biome: window.WORLD.info().biome, palette: window.WORLD.info().palette,
  seed: window.WORLD.info().seed,
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

/* tap a shadow → the fireflies whisper its name (coach hint + a peek) */
playCv.addEventListener('pointerdown', (e) => {
  if (!S.started) return;
  const b = playCv.getBoundingClientRect();
  const px = (e.clientX - b.left) * W / b.width;
  const py = (e.clientY - b.top) * H / b.height;
  const list = [...S.props.values()].reverse();      /* topmost first */
  for (const p of list) {
    if (p.dead || p.carry || !p._hw) continue;
    const w = p._hw * .6 + 18, h = p._hh + 26;
    if (Math.abs(px - p._hx) > w || py < p._hy - h || py > p._hy + 16) continue;
    if (!p.lit) {
      p.peek = performance.now();
      reactProp(p.id);
      coachSay(`The fireflies whisper: that shadow is a “${p.word}” — ` +
               `type its name to light it!`);
    } else {
      reactProp(p.id);
    }
    break;
  }
});
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
  svg.innerHTML = `<path d="${d}" fill="none" stroke="#E8963E" stroke-width="3" stroke-linecap="round"/>`;
})();

/* ============================================================
   INIT — snap the starting dusk + start the loop
   ============================================================ */
(function init() {
  sizeAll();
  window.WORLD.reset({ biome: 'dusk', palette: 'dusk', seed: 707 });
  replayMaker();
  setGoal(0); setWolf(.14); updateStreak();
  S.heroWX = S.heroWT = .30 * W;
  cam = window.WORLD.camStart();
  S.buildWX = cam + W * .78;
  /* re-sketch the maker once the hand fonts land */
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => { replayMaker(); });
  requestAnimationFrame(frame);
  if (location.hash === '#watch') setTimeout(() => startDemo(), 450);
})();
