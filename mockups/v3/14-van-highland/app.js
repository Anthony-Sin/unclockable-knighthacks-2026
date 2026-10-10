/* ============================================================
   Highland Trek — app.js   (v3 · 14-van-highland · zero libraries)
   The PAINTED contract: ONE continuous highland world (world.js,
   a faithful port of emberwood's 'highland' route) scrolls under a
   live crayon play layer at 60fps. Camera travel is the only
   transition — the trail literally climbs through a pass, so
   groundAt() has real elevation (±30px+) and props TUMBLE/ROLL
   downhill to the hero: round ones roll farthest, heavy ones thud.
   Story beats come from the REAL LLM through ../shared/llm.js.
   ============================================================ */
'use strict';

const SK = window.SK;
const INK = SK.INK;
const $ = (id) => document.getElementById(id);

const stage    = $('stage');
const worldA   = $('worldA');
const playCv   = $('playCv');
const goalFill = $('goalFill'), goalPig = $('goalPig');
const elevChip = $('elevChip');
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

/* ---------- ONE painted world, camera travel is the transition ----------
   Everything lives in world coordinates: hero, props, house plot, fx.
   cam eases toward the hero; WORLD.frame paints the whole backdrop
   every rAF — the trail underfoot is WORLD.groundAt(heroWX), a real
   elevation line that climbs through the pass. */
const WORLD = window.WORLD;
let W = 800, H = 420;
let cam = 0;                                  /* world camera, px */
let worldCtx = null;

const HERO_X0 = () => WORLD.HERO_X0;
const houseWX = () => WORLD.HERO_X0 + 2650;   /* the summit: brick house plot */

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
  worldCtx = sizeCanvas(worldA);
  sizeCanvas(playCv);
  WORLD.size(W, H);
  if (S) cam = Math.max(cam, WORLD.camStart());
}

/* ============================================================
   GAME STATE
   ============================================================ */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false,
  history: [], words: [], slips: 0, pigs: 0,
  goal: 0, wolf: .14,
  propSeq: 0, props: new Map(),
  buildStage: 0, riding: null, gear: [], pileN: 0,
  hero: null, heroWX: 600, heroWXT: 600, heroState: 'idle', heroAnim: null,
  heroJ: 0, heroVY: 0, heroLift: 0, landT: 0,
  dizzyUntil: 0, wolfAnim: null, fx: [],
  shake: null, shakeX: 0, shakeY: 0,
  pendingWord: null, won: false, sceneSeed: 1234, trace: 'boot',
};
const okEp = (ep) => ep === S.epoch;
/* worldX helpers — everything anchors to the painted world */
const propWX = (frac) => cam + 50 + clamp01(frac == null ? .5 : frac) * (W - 110);
const heroFeetY = () => WORLD.groundAt(S.heroWX);
const heroSX = () => S.heroWX - cam;
const groundAt = (wx) => WORLD.groundAt(wx);
const slopeAt = (wx) => WORLD.slopeAt(wx);
const elevM = () => Math.round((WORLD.groundAt(HERO_X0()) - WORLD.groundAt(S.heroWX)) / 4);

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
/* friction per kind: round props roll far, slippery ones skid, heavy ones thud */
const rollMu = (p) =>
  p.def.round ? .5 :
  p.cls === 'slip' ? 1.0 :
  (p.cls === 'bonk' || p.cls === 'material') ? 2.4 : 1.2;

function spawnProp(rawKind, xFrac, opts = {}) {
  const res = window.resolveKind(rawKind);
  const def = window.PROPS[res.def] || window.PROPS.doodle;
  const id = `p${++S.propSeq}`;
  const p = {
    id, kind: res.def, raw: String(rawKind || res.word || 'thing'),
    word: res.word, def, cls: def.cat || 'plain',
    wx: 0, alt: 0, vy: 0, vx: 0, hover: 0, rot: 0, spin: 0,
    slideT: null, slideFrom: 0, slideTo: 0, slideDur: 600, flyIn: null,
    rolling: false, tumble: false, rollTo: null, mu: 0, radius: 0, piled: false, delivering: false,
    sc: window.propScale(def, W), seed: SK.hashStr(res.def + ':' + id),
    born: performance.now(), state: 'idle', pop: 0, dead: false,
  };
  if (opts.born) p.born = opts.born;
  p.radius = (def.h * p.sc) * .5;
  p.mu = rollMu(p);

  /* every prop ENTERS up-slope and tumbles/rolls down to the trail —
     the signature Highland Trek move */
  const twx = propWX(xFrac);
  const sl = slopeAt(twx);
  const dir = Math.abs(sl) > .025 ? Math.sign(sl) : ((p.seed % 2) ? 1 : -1);
  const r0 = SK.rng(p.seed);
  if (p.cls === 'ride') {
    /* mounts gallop down the slope under their own power */
    p.wx = twx - dir * r0.rr(300, 420);
    p.slideFrom = p.wx; p.slideTo = twx; p.slideT = p.born; p.slideDur = 780;
  } else if (FLY_KINDS.has(p.kind)) {
    p.wx = twx;
    p.hover = 118 + (p.seed % 42);
    p.flyIn = { t0: p.born, dur: 950 };
  } else {
    const up = (p.cls === 'slip' || p.cls === 'eat' || p.cls === 'wear' || p.cls === 'bonk')
      ? r0.rr(200, 300) : r0.rr(250, 400);
    p.wx = twx - dir * up;                    /* appear up-slope */
    p.vx = dir * (p.def.round ? r0.rr(150, 230) : r0.rr(70, 130));
    p.rolling = true;
    p.rot = r0.rr(-.4, .4);
    if (p.cls === 'bonk' || p.cls === 'material' || !p.def.round) {
      /* heavy/angular things get flung: a tumble arc, then bounce+skid */
      p.tumble = true;
      p.alt = r0.rr(60, 150);
      p.vy = -r0.rr(30, 140);
      p.spin = dir * r0.rr(2.5, 6);
    }
    fxPuff(p.wx, groundAt(p.wx) - 6, '#E8DCC0');
  }
  S.props.set(id, p);
  if (S.props.size > 13) {
    for (const [oid, q] of S.props) {
      if (q === S.riding || S.gear.includes(q) || q.piled) continue;
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
  fxPuff(p.wx, groundAt(p.wx) - 20, '#E8DCC0');
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
/* forward travel on foot or mounted — cam follows, trail rises & falls */
function heroTravel(from, to, dur, type) {
  S.heroState = type;
  S.heroAnim = { type, t0: performance.now(), dur, from, to, stepN: -1 };
}
/* the hero walks to a world x (chasing a runaway prop is the comedy) */
async function heroWalkTo(wx, type) {
  const d = Math.abs(wx - S.heroWX);
  if (d < 8) return;
  heroTravel(S.heroWX, wx, Math.min(2400, Math.max(500, d / 240 * 1000)), type || 'walk');
  await sleep(Math.min(2400, Math.max(500, d / 240 * 1000)) + 90);
}
async function travel() {
  const ahead = Math.min(Math.max(S.heroWXT, S.heroWX + 120), S.heroWX + 620);
  const d = Math.abs(ahead - S.heroWX);
  const dur = Math.min(2600, Math.max(720, d / 235 * 1000));
  heroTravel(S.heroWX, ahead, dur, S.riding ? 'ride' : 'walk');
  await sleep(dur + 80);
}
/* wait for a rolling prop to settle (with a safety timeout) */
async function settled(p, ms) {
  const t0 = performance.now();
  while (S.props.has(p.id) && !p.dead && (p.rolling || p.tumble) &&
         performance.now() - t0 < (ms || 4200))
    await sleep(60);
}

/* fx particles — all in world coords so they stay planted in the world */
function fxPuff(wx, y, col, big) {
  const n = big ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 * i / n + .4;
    S.fx.push({ type: 'puff', wx, y, vx: Math.cos(a) * (big ? 60 : 42),
      vy: Math.sin(a) * 34 - 26, age: 0, ttl: .85, size: big ? 11 : 8,
      col: col || '#E8DCC0', seed: (i * 37 + wx) | 0 });
  }
}
function fxTwinkle(wx, y) {
  S.fx.push({ type: 'twinkle', wx, y, vx: 0, vy: -12, age: 0, ttl: .95,
    size: 11, col: '#FFC53D', seed: (wx * 3 + y) | 0 });
}
function fxPuffCloud(wx, y, big) {
  S.fx.push({ type: 'puffcloud', wx, y, vx: 340 + Math.random() * 90,
    vy: -6 + Math.random() * 10, age: 0, ttl: 2.1, size: big ? 26 : 18,
    col: '#EFE4D0', seed: (wx + y * 7) | 0 });
}
function fxDebris(wx, y) {
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * .2 - Math.PI * .6 * (i / 6);
    S.fx.push({ type: 'debris', wx, y: y - 40, vx: Math.cos(a) * (140 + i * 30),
      vy: Math.sin(a) * (200 + i * 20), rot: i, spin: (i % 2 ? 1 : -1) * (2 + i),
      age: 0, ttl: 1.5, size: 14 + (i % 3) * 8, col: i % 2 ? '#C9A06B' : '#8A5E2E',
      seed: i * 911 });
  }
}

/* --- what the prop DOES to the hero (the comedy) ---
   Highland rules: the prop rolls/tumbles down first, THEN the gag plays —
   if it overshoots, the hero chases it down the slope. */
async function applyProp(p, rawKind) {
  const cls = window.propClass(rawKind);
  const alive = () => S.props.has(p.id) && !p.dead;
  switch (cls) {
    case 'ride': {
      if (S.riding) S.riding = null;
      /* the mount gallops over to the hero, then the hero hops on */
      p.slideFrom = p.wx; p.slideTo = Math.max(60, S.heroWX - 4);
      p.slideT = performance.now(); p.slideDur = Math.min(700, Math.max(300, Math.abs(p.slideTo - p.slideFrom) / 350 * 1000));
      await sleep(p.slideDur + 30);
      if (!alive()) return;
      S.riding = p;
      heroJump(370, 'mount');
      coachSay(`You hop on the ${p.raw} — giddyup!`);
      await sleep(320);
      if (alive()) S.heroState = 'ride';
      return;
    }
    case 'slip': {
      p.rollTo = S.heroWX + 40;               /* rolls right into the hero's path */
      await settled(p, 4200);
      if (!alive()) return;
      if (p.wx - S.heroWX > 80) await heroWalkTo(p.wx - 12, 'walk');  /* chase it! */
      coachSay(`Whoops — a ${p.raw}! Right under your feet!`, true);
      S.slips++;
      const g = heroGag('slip', 1450);         /* skid → spin → splat → dust off */
      S.heroAnim.to = S.heroWX + 40;
      setTimeout(() => reactProp(p.id), 620);  /* the peel squashes too */
      await g;
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'bonk': {
      p.rollTo = S.heroWX + 26;
      await settled(p, 3800);
      if (!alive()) return;
      if (p.wx - S.heroWX > 90) await heroWalkTo(p.wx - 16, 'walk');
      coachSay(`Bonk! The ${p.raw} crashed right into you!`, true);
      S.slips++;
      S.shake = { t0: performance.now(), dur: 300, amp: 4 };
      await heroGag('bonk', 800);
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'eat': {
      p.rollTo = S.heroWX + 50;
      await settled(p, 4200);
      if (!alive()) return;
      if (Math.abs(p.wx - S.heroWX) > 95) await heroWalkTo(p.wx - 26, 'walk');
      coachSay(`Yum — the ${p.raw} disappears fast!`);
      p.state = 'eaten'; p.stateT = performance.now();
      heroJump(400, 'hop');
      await sleep(720);
      setTimeout(() => { if (!p.dead) poofProp(p.id); }, 320);
      return;
    }
    case 'wear': {
      p.rollTo = S.heroWX + 40;
      await settled(p, 3600);
      if (!alive()) return;
      if (Math.abs(p.wx - S.heroWX) > 95) await heroWalkTo(p.wx - 20, 'walk');
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
      /* phase 1: it tumbles down to the hero — collected!
         phase 2: it rolls off express to the summit pile — the house
         upgrades as the pile grows */
      p.rollTo = S.heroWX + 44;
      await settled(p, 4500);
      if (!alive()) return;
      if (Math.abs(p.wx - S.heroWX) > 110) await heroWalkTo(p.wx - 20, 'walk');
      const tier = /straw|hay/.test(rawKind) ? 1 : /brick|stone/.test(rawKind) ? 3 : 2;
      const names = { 1: 'straw', 2: 'sticks', 3: 'brick' };
      S.pileN++;
      const pileTier = Math.min(3, Math.ceil(S.pileN / 2));
      S.buildStage = Math.max(S.buildStage, tier, pileTier);
      coachSay(`The ${names[tier]} is collected — rolling it to the summit pile! (load ${S.pileN})`);
      heroJump(360, 'hop');
      const slot = houseWX() - 110 - (S.pileN % 4) * 34 - (S.pileN % 2) * 10;
      p.delivering = true;
      p.rolling = true;
      p.rollTo = slot;
      settled(p, 14000).then(() => {
        if (!alive()) return;
        p.piled = true; p.delivering = false;
        p.wx = slot + (S.pileN % 3) * 8;
        p.rot = ((S.pileN % 3) - 1) * .12;
        fxPuff(slot, groundAt(slot) - 30, '#E8DCC0', true);
      });
      fxPuff(S.heroWX + 30, heroFeetY() - 40, '#E8DCC0', true);
      await sleep(560);
      return;
    }
    case 'wolf': {
      coachSay('The Big Bad Wolf peeks out — huff incoming!', true);
      setWolf(S.wolf + .24);
      return;
    }
    case 'pig': {
      S.pigs++;
      p.rollTo = S.heroWX - 60;
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
  const wx = cam + 40, wy = groundAt(cam + 40) - 70;
  for (let i = 0; i < 4; i++)
    setTimeout(() => fxPuffCloud(wx + i * 10, wy + i * 10, i > 1), i * 140);
  await sleep(900);
  if (!ep || okEp(ep)) {
    if (S.buildStage > 0 && S.buildStage < 3) {
      fxDebris(houseWX(), groundAt(houseWX()) - 20);
      S.buildStage = Math.max(0, S.buildStage - 1);
      coachSay('Whoosh! The weak house blew to bits. Stronger stuff needed!', true);
      await sleep(600);
    } else if (S.buildStage >= 3) {
      coachSay('The brick house does NOT budge. Not one brick!');
      fxPuff(houseWX(), groundAt(houseWX()) - 80, '#EFE4D0');
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
  worldA.style.transform = `translate(${S.shakeX}px, ${S.shakeY}px)`;
  playCv.style.transform = `translate(${S.shakeX}px, ${S.shakeY}px)`;

  /* CAMERA: ease toward the hero (left-third anchor). The painted world
     is a live function of cam — sliding forward IS the transition. */
  const camT = Math.max(WORLD.camStart(), S.heroWX - W * .30);
  cam += (camT - cam) * Math.min(1, dt * 2.4);
  if (Math.abs(camT - cam) < .05) cam = camT;
  /* keep the world coordinate sane on a long lap */
  if (S.heroWX > WORLD.LEN - 200) {
    S.heroWX -= WORLD.LEN; S.heroWXT -= WORLD.LEN; cam -= WORLD.LEN;
    for (const p of S.props.values()) p.wx -= WORLD.LEN;
    for (const f of S.fx) f.wx -= WORLD.LEN;
    WORLD.reset();
  }
  WORLD.frame(worldCtx, cam, t);                    /* painted world, every rAF */

  const ctx = playCv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const feetY = heroFeetY();
  const heroX = heroSX();

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

  /* --- the house-in-progress at the summit build plot --- */
  const hx = houseWX() - cam;
  const shaking = S.wolfAnim && (tms - S.wolfAnim.t0) < 1500 && S.buildStage > 0;
  if (hx > -220 && hx < W + 220)
    WORLD.drawBuild(ctx, S.buildStage, hx, groundAt(houseWX()),
      SK.rng(S.sceneSeed + 555), { shake: shaking, doorOpen: S.won });

  /* --- props (world-anchored; rollers obey the painted slope) --- */
  for (const p of S.props.values()) {
    if (p.dead && tms - (p.stateT || 0) > 520) { S.props.delete(p.id); continue; }
    /* cull SETTLED props the journey has left far behind
       (rollers behind cam are mid-entrance — they're coming back) */
    if (!p.dead && !p.worn && p !== S.riding && !p.piled && !p.delivering &&
        !p.rolling && !p.tumble && p.slideT == null && p.wx < cam - 520) {
      S.props.delete(p.id); continue;
    }
    const age = (tms - p.born) / 1000;
    let pop = easeOutBack(Math.min(1, age / .45));
    let rot = p.rot || 0, alpha = 1;
    const bob = Math.sin(t * 1.9 + (p.seed % 17)) * 3;
    const gy2 = groundAt(p.wx);

    /* mounts gallop in under their own power */
    if (p.slideT != null) {
      const k = Math.min(1, (tms - p.slideT) / p.slideDur);
      p.wx = p.slideFrom + (p.slideTo - p.slideFrom) * easeOutC(k);
      if (k >= 1) p.slideT = null;
    }

    /* ROLL & TUMBLE — slope-following physics with friction.
       vx grows with the local slope (screen +y = downhill right),
       viscous friction decides how far each kind travels. */
    if (p.tumble || p.rolling) {
      const sl = slopeAt(p.wx);
      p.vx += sl * 760 * dt;                        /* gravity along the slope */
      /* guided roll toward rollTo target, if set */
      if (p.rollTo != null) {
        const dist = p.rollTo - p.wx;
        const brake = Math.max(0, 1 - Math.abs(dist) / 230);
        p.vx -= p.vx * (4.5 * brake) * dt;
        /* sticky arrival: snap when close — slope alone must not strand it
           (a summit slot can sit on ground that falls away, so gravity
           would otherwise ping-pong the prop through the window) */
        if (Math.abs(dist) < 40) p.wx += dist * 3.2 * dt;
        if (Math.abs(dist) < 14 && Math.abs(p.vx) < 80) {
          p.vx = 0; p.wx = p.rollTo; p.rollTo = null;      /* arrived */
        } else if (p.delivering) {
          /* express delivery to the summit pile — a real shove, not a warp */
          if (Math.abs(dist) > 40 && Math.abs(p.vx) < 560)
            p.vx += Math.sign(dist) * 900 * dt;
          p.vx = Math.max(-640, Math.min(640, p.vx));
        } else if (Math.abs(dist) > 30 && Math.abs(p.vx) < 50) {
          p.vx += Math.sign(dist) * 160 * dt;              /* gentle nudge — never strands */
        } else if ((dist > 60 && p.vx > 40) || (dist < -60 && p.vx < -40)) {
          p.rollTo = null;                                 /* overshot fast — it escaped! */
        }
      }
      p.vx -= p.vx * p.mu * dt;                     /* rolling friction */
      p.wx += p.vx * dt;

      if (p.tumble) {
        /* airborne arc: falls, bounces, then converts to a ground roll */
        p.alt += p.vy * dt; p.vy -= 1650 * dt;
        p.rot += p.spin * dt;
        if (p.alt <= 0) {
          p.alt = 0;
          fxPuff(p.wx, groundAt(p.wx), '#E8DCC0');
          if (p.vy < -300) { p.vy = -p.vy * .3; }
          else {
            p.tumble = false; p.vy = 0;
            p.rot = ((p.seed % 7) - 3) * .06;       /* lands on a jaunty tilt */
            if (p.cls === 'bonk' || p.cls === 'material')
              S.shake = { t0: tms, dur: 260, amp: 3 };
          }
        }
      } else {
        /* grounded: round props really spin; flat ones skid straight */
        if (p.def.round) p.rot += (p.vx / Math.max(14, p.radius)) * dt;
        else p.rot = Math.max(-.3, Math.min(.3, p.rot + p.vx * .0004)) ;
        /* static grip: heavy things thud to a stop on gentle slopes */
        const stopped = Math.abs(p.vx) < 10 &&
          (Math.abs(sl) < .06 || (p.mu > 1.8 && Math.abs(sl) < .14));
        if (stopped && p.rollTo == null) {
          p.vx = 0; p.rolling = false;
          p.state = 'rock'; p.stateT = tms; p.rockRot = p.rot;
        }
      }
    }

    /* rollers spin about their center; everything else pivots at the feet */
    const spinC = !p.worn && p !== S.riding &&
      (p.tumble || (p.def.round && p.rolling));
    let sx = p.wx - cam;
    let sy = gy2 - (p.alt || 0) - (spinC ? p.radius + 4 : 0);

    if (p.worn) {
      sx = heroX;
      sy = feetY - S.heroLift - S.heroJ - 108 + bob * .6;  /* on the hero's head */
      rot = 0;
    } else if (p === S.riding) {
      sx = heroX; sy = feetY + bob * .4; rot = 0;          /* carries the hero */
    } else if (p.hover || p.flyIn) {
      let lift = p.hover || 0;
      if (p.flyIn) {
        const k = Math.min(1, (tms - p.flyIn.t0) / p.flyIn.dur);
        lift += (1 - easeOutC(k)) * 170;
        if (k >= 1) p.flyIn = null;
      }
      sy = gy2 - lift + bob * 1.9;
    } else if (!p.rolling && !p.tumble) {
      sy += bob * .6;                                 /* settled idle bob */
    }

    if (p.state === 'rock') {                          /* tapped → rock & settle */
      const k = (tms - p.stateT) / 650;
      if (k >= 1) { p.state = 'idle'; p.rot = Math.max(-.16, Math.min(.16, p.rot)); }
      else rot = p.rockRot + Math.sin(k * Math.PI * 3) * .16 * (1 - k);
    }
    if (p.state === 'react') {
      const k = (tms - p.stateT) / 500;
      if (k >= 1) p.state = 'idle';
      else { pop *= 1 + Math.sin(k * Math.PI) * .28; rot += Math.sin(k * Math.PI * 2) * .06; }
    }
    if (p.state === 'eaten') {
      const k = Math.min(1, (tms - p.stateT) / 320);
      pop *= 1 - k; alpha = Math.min(alpha, 1 - k);
      sx += (heroX - sx) * k * .3;
    }
    if (p.state === 'poof') {
      const k = Math.min(1, (tms - p.stateT) / 480);
      pop *= 1 - k; alpha = Math.min(alpha, 1 - k);
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    const sc = p.sc * Math.max(.01, pop);
    ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    ctx.translate(-p.def.w / 2, spinC ? -p.def.h / 2 : -p.def.h + 8);
    p.def.draw(ctx, p.def.w, p.def.h, SK.rng(p.seed), p.raw);
    ctx.restore();

    /* hand-lettered name under every live prop */
    if (alpha > .6 && !p.worn)
      SK.caption(ctx, p.raw, sx, gy2 + 20, SK.rng(p.seed + 5), { size: 14 });
  }

  /* --- the wolf, creeping in from the left on the real hillside --- */
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
  ctx.translate(wolfX + lean, groundAt(cam + wolfX) + wolfBob);
  ctx.scale(wsc, wsc);
  ctx.globalAlpha = S.wolf > .04 ? 1 : 0;
  ctx.translate(-wolfDef.w / 2 + 30, -wolfDef.h + 8);
  wolfDef.draw(ctx, wolfDef.w, wolfDef.h, SK.rng(4242), 'wolf');
  ctx.restore();

  /* --- the hero (kid's strokes, replayed wobbly) — feet on groundAt --- */
  if (S.hero && S.started) {
    let hxx = heroX, rot = 0, alpha = 1;
    const slope = slopeAt(S.heroWX);
    let hy = feetY - S.heroJ - S.heroLift;          /* ground + jump + mount */
    let sq = 1 + Math.sin(t * 2.7) * .018;          /* idle breathe, feet stay planted */
    const lk = (tms - S.landT) / 240;               /* landing squash after a hop */
    if (lk < 1) sq *= 1 - Math.sin(lk * Math.PI) * .16;
    if (S.heroState === 'ride') { hy += Math.sin(t * 3.6) * 3.4; rot = .05; }
    if (S.heroAnim) {
      const a = S.heroAnim;
      const k = Math.min(1, (tms - a.t0) / a.dur);
      if (a.type === 'walk' || a.type === 'run' || a.type === 'ride') {
        /* TRAVEL — steady forward pace, bob + waddle + slope lean + step dust */
        const dist = a.to - a.from;
        S.heroWX = a.from + dist * k; hxx = heroSX();
        const steps = Math.max(2, Math.round(Math.abs(dist) / 44));
        const lift = a.type === 'run' ? 9 : a.type === 'ride' ? 5 : 6.5;
        hy -= Math.abs(Math.sin(k * steps * Math.PI)) * lift;
        rot = (a.type === 'run' ? .13 : Math.sin(k * steps * Math.PI * 2) * .08)
            + Math.atan(slope) * .5;                /* lean into the hill */
        const st = Math.floor(k * steps * 2);
        if (st !== a.stepN) { a.stepN = st; fxPuff(S.heroWX - 14, feetY + 2, '#E4D8BE'); }
      } else if (a.type === 'slip') {
        /* skid forward → tumble-spin up & over → SPLAT flat → dust-off wobble */
        if (k < .42) {
          const kk = k / .42;
          S.heroWX = a.from + (a.to - a.from) * kk; hxx = heroSX();
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
    } else if (Math.abs(slope) > .05) {
      rot = Math.atan(slope) * .28;                 /* idle lean on the grade */
    }
    ctx.save();
    ctx.translate(hxx, hy);
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
        SK.star(ctx, hxx + Math.cos(a) * 30, hy - 84 + Math.sin(a) * 10,
          7, 3, 5, { r: SK.rng(500 + i), fill: '#FFC53D', strokeWidth: 1.2 });
      }
    }
  }

  /* --- fx particles (world coords — they stay planted in the world) --- */
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i];
    f.age += dt;
    if (f.age > f.ttl) { S.fx.splice(i, 1); continue; }
    f.wx += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
    if (f.type === 'debris') { f.vy += 620 * dt; f.rot += (f.spin || 0) * dt; }
    const k = f.age / f.ttl, fr = SK.rng(f.seed);
    const fsx = f.wx - cam;
    if (fsx < -60 || fsx > W + 60) { if (f.type !== 'puffcloud') continue; }
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

  /* elevation chip: real climbed meters from the trail elevation */
  if (elevChip) elevChip.textContent = `+${Math.max(0, elevM())} m`;
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
     has ever mapped to in world space — the hero walks to it */
  S.heroWXT = Math.max(S.heroWXT, HERO_X0() + S.goal * (houseWX() - HERO_X0() - 120));
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
  S.trace = 'ask:' + word;

  const ep = S.epoch;
  const gm = await llm.next({
    goal: GOAL, history: S.history.slice(-4),
    playerText: word, hero: heroDesc(),
  });
  S.trace = 'gm:' + word;
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

  /* --- TRAVEL: the world AHEAD morphs to the new biome — no wipe --- */
  S.sceneSeed = gm.scene_seed.seed || S.sceneSeed;
  WORLD.ahead(gm.scene_seed);
  S.trace = 'travel:' + word;
  await travel();
  S.trace = 'props:' + word;
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

  S.trace = 'done:' + word;
  /* epsilon: fail-dips like .95-.05 land on .8999999 in doubles — the
     summit check needs a whisker of tolerance, not exact math */
  if (S.goal >= .9 - 1e-4 && okEp(ep)) { winSeq(); }
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
  coachSay('Run! The brick house door is open — the summit!');
  S.heroState = 'run';
  const runTo = houseWX() - 30;
  S.heroAnim = { type: 'run', t0: performance.now(),
                 dur: Math.min(2200, Math.max(900, Math.abs(runTo - S.heroWX) / 300 * 1000)),
                 from: S.heroWX, to: runTo, stepN: -1 };
  for (let i = 0; i < 8; i++)
    setTimeout(() => fxTwinkle(houseWX() + (Math.random() - .5) * 200, groundAt(houseWX()) - 60 - Math.random() * 90), i * 90);
  await sleep(1500);
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
  S.goal = 0; S.wolf = .14; S.heroWX = HERO_X0(); S.heroWXT = HERO_X0();
  S.buildStage = 0; S.riding = null; S.gear = []; S.pileN = 0;
  S.props.clear(); S.fx = []; S.won = false;
  S.heroState = 'idle'; S.heroAnim = null; S.wolfAnim = null;
  S.heroJ = 0; S.heroVY = 0; S.heroLift = 0; S.landT = 0;
  S.shake = null; S.shakeX = 0; S.shakeY = 0;
  S.pendingWord = null;
  cam = WORLD.camStart();
  WORLD.reset();
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
  S.heroAnim = null; S.shake = null; S.pendingWord = null;
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
  if (p) applyProp(p, String(kind).toLowerCase());
  return p ? p.id : -1;
};
/* headless-test hook: lift the climb progress (drives the payoff path) */
window.__setGoal = v => { setGoal(v); };
/* tiny read-only state probe — used by the v3 headless verification harness */
window.__probe = () => ({
  started: S.started, busy: S.busy, demo: S.demoOn, won: S.won,
  goal: +S.goal.toFixed(2), wolf: +S.wolf.toFixed(2), build: S.buildStage,
  heroWX: Math.round(S.heroWX), heroSX: Math.round(heroSX()),
  heroY: Math.round(heroFeetY()), heroState: S.heroState, riding: !!S.riding,
  heroJ: Math.round(S.heroJ), props: [...S.props.values()].map(p => p.raw),
  propInfo: [...S.props.values()].map(p => ({
    raw: p.raw, wx: Math.round(p.wx), vx: Math.round(p.vx || 0),
    rolling: !!(p.rolling || p.tumble), piled: !!p.piled })),
  cam: Math.round(cam), elevM: elevM(),
  rolling: [...S.props.values()].filter(p => p.rolling || p.tumble).length,
  pile: S.pileN,
  words: S.words.length, slips: S.slips, pigs: S.pigs,
  pending: S.pendingWord, heroAnim: S.heroAnim ? S.heroAnim.type : null,
  trace: S.trace,
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
/* roll & gather: tap a rolling prop to stop it (it rocks and settles);
   tap a settled one just to make it react. */
playCv.addEventListener('pointerdown', (e) => {
  if (!S.started) return;
  const b = playCv.getBoundingClientRect();
  const mx = (e.clientX - b.left) * W / b.width;
  const my = (e.clientY - b.top) * H / b.height;
  let best = null, bd = 1e9;
  for (const p of S.props.values()) {
    if (p.dead || p.worn || p === S.riding) continue;
    const sx = p.wx - cam, sy = groundAt(p.wx) - (p.alt || 0);
    const d = Math.hypot(mx - sx, my - (sy - p.def.h * p.sc * .5));
    if (d < bd) { bd = d; best = p; }
  }
  if (!best || bd > 90) return;
  if (best.rolling || best.tumble) {
    best.vx = 0; best.vy = 0; best.tumble = false; best.alt = 0;
    best.rolling = false; best.rollTo = null;
    best.state = 'rock'; best.stateT = performance.now(); best.rockRot = best.rot;
    fxPuff(best.wx, groundAt(best.wx) - 6, '#E8DCC0');
    coachSay(`Caught the ${best.raw}!`);
  } else {
    reactProp(best.id);
  }
});
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
   INIT — size the world, plant the hero, start the loop
   ============================================================ */
(function init() {
  sizeAll();
  WORLD.reset();
  replayMaker();
  setGoal(0); setWolf(.14);
  S.heroWX = S.heroWXT = HERO_X0();
  cam = WORLD.camStart();
  /* re-sketch the maker once the hand fonts land (crisper crayon) */
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => { replayMaker(); });
  requestAnimationFrame(frame);
  /* #watch — headless/deep-link auto demo */
  if (location.hash === '#watch') setTimeout(() => startDemo(), 400);
})();
