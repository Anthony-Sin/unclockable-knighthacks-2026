/* ============================================================
   Breezefield — app.js   (v3 · 11-van-breeze · zero-dep)
   A PAINTED meadow where everything is alive with wind — drawn fresh
   every rAF by world.js (Highland Path style: camera travel is the only
   transition; palettes/biomes morph along world-x). Props DRIFT IN on
   the breeze — leaf parachutes, tumbleweed rolls, thudding heavy drops —
   and a real gust ("blow"/"gust"/"wind" or the Gust! button) shoves
   light props across the grass while the wolf's huff scatters them.
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
const blank    = $('blank'), goBtn = $('goBtn'), gustBtn = $('gustBtn');
const dymEl    = $('dym'), dymBtn = $('dymBtn');
const choicesEl= $('choices'), coach = $('coach');

const GOAL = 'The Three Little Pigs — help the pig friends gather ' +
  'materials, build houses, and reach the strong brick house before ' +
  'the Big Bad Wolf huffs and puffs.';

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOutBack = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

/* ---------- ONE painted world — the continuous Breezefield ----------
   Highland Path rule: the only animated state is camera travel. The hero
   has a stable world-x (S.heroWX); `cam` eases along behind it. Every
   hill, tree, grass blade and drifter is a live function of world-x
   re-painted by WORLD.frame() each rAF — a new scene_seed morphs the
   world AHEAD (palette/biome blend along x), never a wipe. */
let W = 800, H = 420;
const STRIDE = 340;                 /* world px per accepted turn */
const HERO_WX0 = 240;               /* where the journey starts */
const HOUSE_WX = 3160;              /* the brick-house plot, out on the trail */
let curSS = { biome: 'meadow', seed: 1234, palette: 'warm', props: [] };
let wctx = null;

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
  if (S) S.cam = S.heroWX - W * .30;   /* keep the hero anchored on resize */
}
const groundAt = (wx) => window.WORLD.groundAt(wx);

/* ============================================================
   GAME STATE
   ============================================================ */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false,
  history: [], words: [], slips: 0, pigs: 0,
  goal: 0, wolf: .14,
  propSeq: 0, props: new Map(),
  buildStage: 0, riding: null, gear: [],
  hero: null, heroWX: HERO_WX0, heroX: 0, heroState: 'idle', heroAnim: null,
  heroJ: 0, heroVY: 0, heroLift: 0, landT: 0,
  dizzyUntil: 0, wolfAnim: null, fx: [],
  shake: null, shakeX: 0, shakeY: 0,
  cam: 0, gust: null, brace: null, lastGust: 0,
  pendingWord: null, won: false, sceneSeed: 1234,
};
const okEp = (ep) => ep === S.epoch;
const propX = (frac) => 50 + clamp01(frac == null ? .5 : frac) * (W - 110);
const heroFeetY = () => groundAt(S.heroWX) - 4;

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
   Every prop has a stable WORLD-X and a MASS. Entrances ride the wind:
   light things parachute in on a leaf, mid things tumbleweed-roll along
   the ground, heavies just drop with a thud. Gusts shove them by mass.
   ============================================================ */
const FLY_KINDS = new Set(['starprop', 'raincloud', 'moon', 'firefly']);
const MASS_FEATHER = new Set(['leaf', 'newspaper', 'paperbag', 'doodle', 'firefly']);
const MASS_LIGHT = new Set(['peel', 'soap', 'flower', 'mushroom', 'key', 'wand',
  'matchstick', 'candle', 'sock', 'sponge', 'toast', 'pickle', 'umbrella',
  'starprop', 'moon', 'sunprop', 'hat', 'bucket']);
const MASS_HEAVY = new Set(['rock', 'stones', 'brickpile', 'log', 'bridge',
  'chest', 'toaster', 'tree', 'pinetree', 'ladder', 'wolf']);
const MASS_ANVIL = new Set(['anvil', 'fridge', 'piano', 'tv', 'strawhouse',
  'stickhouse', 'brickhouse', 'cottage', 'tent']);
function propMass(p) {
  if (MASS_FEATHER.has(p.kind)) return .16;
  if (MASS_LIGHT.has(p.kind)) return .34;
  if (p.kind === 'strawpile' || p.kind === 'hay') return .42;   /* straw scatters! */
  if (MASS_ANVIL.has(p.kind)) return 1.7;                       /* comedy anchor */
  if (MASS_HEAVY.has(p.kind)) return 1.2;
  if (p.cls === 'ride') return .8;
  if (p.cls === 'material') return .7;
  if (p.cls === 'pig') return .9;
  return .6;
}
function spawnProp(rawKind, xFrac, opts = {}) {
  const res = window.resolveKind(rawKind);
  const def = window.PROPS[res.def] || window.PROPS.doodle;
  const id = `p${++S.propSeq}`;
  const target = S.cam + propX(xFrac);        /* stable WORLD-x to settle on */
  const p = {
    id, kind: res.def, raw: String(rawKind || res.word || 'thing'),
    word: res.word, def, cls: def.cat || 'plain',
    wx: target, alt: null, vy: 0, hover: 0,
    vx: 0, tumRot: 0, gLift: 0, haul: false, dustT: 0,
    slideT: null, slideFrom: 0, slideTo: 0, slideDur: 600, enter: null,
    sc: window.propScale(def, W), seed: SK.hashStr(res.def + ':' + id),
    born: performance.now(), state: 'idle', pop: 0, dead: false, mass: 1,
  };
  p.mass = propMass(p);
  if (opts.born) p.born = opts.born;
  /* every prop DRIFTS IN on the wind — nothing pops into existence.
     Entries come from upwind (the breeze carries them onto the stage). */
  const dir = (window.WORLD.wind().dir || 1);
  if (p.cls === 'wolf' || p.cls === 'pig') {
    /* animals scamper in low along the ground */
    p.enter = { mode: 'roll', t0: p.born, dur: 950,
                from: target - dir * (W * .75 + 200), target };
  } else if (FLY_KINDS.has(p.kind)) {
    p.hover = 118 + (p.seed % 42);
    p.enter = { mode: 'fly', t0: p.born, dur: 1400,
                from: target - dir * (W * .9 + 240), target, alt: 90 };
  } else if (p.cls === 'slip') {
    /* slippery things tumble in fast and skid to a stop */
    p.enter = { mode: 'roll', t0: p.born, dur: 620,
                from: target - dir * (W * .55 + 160), target };
  } else if (p.cls === 'ride') {
    /* rideables glide in on a leaf parachute OR tumbleweed-roll in */
    if ((p.seed & 1) === 0)
      p.enter = { mode: 'chute', t0: p.born, dur: 1500,
                  from: target - dir * (W * .7 + 200), target, alt: H * .6 };
    else
      p.enter = { mode: 'roll', t0: p.born, dur: 1150,
                  from: target - dir * (W * .78 + 220), target };
  } else if (p.mass < .5) {
    p.enter = { mode: 'chute', t0: p.born, dur: 1350,
                from: target - dir * (W * .7 + 180), target,
                alt: H * (.48 + (p.seed % 30) / 100) };
  } else if (p.mass <= 1.0) {
    p.enter = { mode: 'roll', t0: p.born, dur: 1150,
                from: target - dir * (W * .8 + 220), target };
  } else {
    /* too heavy for the breeze to carry — it gives up and drops it, THUD */
    p.enter = { mode: 'drop', t0: p.born, dur: 640,
                from: target - dir * 120, target, alt: H * .68 };
  }
  if (p.enter) p.wx = p.enter.from;
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
  fxPuff(p.wx - S.cam, groundAt(p.wx) - 20, '#E8DCC0');
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
  S.heroAnim = { type, t0: performance.now(), dur: ms, from: S.heroX, to: S.heroX };
  return sleep(ms).then(() => {
    if (S.heroState === type) S.heroState = 'idle';
  });
}
/* a real hop: gravity + ground clamp (the landing dusts itself) */
function heroJump(v, state) {
  if (S.heroJ <= 0) S.heroVY = v;
  S.heroState = state || 'hop';
}
/* forward travel on foot or mounted — cam eases along behind the hero */
function heroTravel(from, to, dur, type) {
  S.heroState = type;
  S.heroAnim = { type, t0: performance.now(), dur, from, to, stepN: -1 };
}
async function travel() {
  heroTravel(S.heroWX, S.heroWX + STRIDE, 1180, S.riding ? 'ride' : 'walk');
  await sleep(1240);
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

/* ============================================================
   GUST PLAY — "blow"/"gust"/"wind" or the Gust! button sends a real
   gust across the stage: light props slide & tumble (friction by mass),
   petals burst, grass flattens, drifters race, the hero braces.
   ============================================================ */
const GUST_WORD = /(^|\b)(blow|blows|blowing|gust|gusts|gusting|whoosh|woosh|breeze|wind|windy|fan|puff)\b/i;
function doGust(str, src) {
  const now = performance.now();
  if (now - S.lastGust < 450) return;          /* debounce mashing */
  S.lastGust = now;
  const w = window.WORLD.wind();
  const dir = src === 'wolf' ? 1 : (w.dir || 1);   /* the wolf always blows forward */
  S.gust = { t0: now, dur: 1250 + str * 350, str, dir };
  window.WORLD.blow(Math.min(1.9, str), dir);
  /* streaks sweeping across the stage */
  for (let i = 0; i < 8; i++)
    S.fx.push({ type: 'streak',
      x: dir > 0 ? -60 - Math.random() * 140 : W + 60 + Math.random() * 140,
      y: 30 + Math.random() * (H - 60),
      vx: dir * (1050 + Math.random() * 500) * str,
      vy: (Math.random() - .5) * 30, age: 0, ttl: 1.1,
      size: 40 + Math.random() * 70, seed: (i * 97 + now) | 0 });
  /* petals burst off the meadow */
  for (let i = 0; i < 9; i++)
    S.fx.push({ type: 'petal', x: Math.random() * W, y: H * .45 + Math.random() * H * .4,
      vx: dir * (180 + Math.random() * 260) * str, vy: -40 - Math.random() * 60,
      rot: Math.random() * 6.3, spin: (Math.random() - .5) * 9,
      age: 0, ttl: 1.5 + Math.random() * .5, size: 3.4 + Math.random() * 3.4,
      col: ['#F58ACB', '#FFC9BF', '#FFFDF6', '#FFE08A', '#FF9E57'][i % 5],
      seed: i * 31 });
  /* the physical shove — mass decides (feather < straw < anvil) */
  for (const p of S.props.values()) {
    if (p.dead || p.enter) continue;
    let m = p.mass || .6;
    if (p.worn || p === S.riding) m *= 3;              /* held on tight */
    let kick = dir * str * 340 / (m * m);
    if (Math.abs(kick) < 210) {
      kick *= .18;                                    /* heavies scoot a hair */
      if (Math.abs(kick) < 60)
        fxPuff(p.wx - S.cam, groundAt(p.wx), '#E8DCC0');  /* sad little dust — the anvil barely budges */
    } else kick = Math.max(-860, Math.min(860, kick));
    p.vx = (p.vx || 0) + kick;
    if (m < .3) p.gLift = Math.min(30, (p.gLift || 0) + Math.abs(kick) * .045);
  }
  /* the hero braces against the blast */
  S.brace = { t0: now, dur: 850 + str * 320, dir };
  if (src === 'wolf') coachSay('The wolf\'s huff scatters everything light!', true);
  else coachSay(str > 1.2 ? 'WHOOSH! Hold onto your hat!' : 'A gust sweeps the meadow!');
}

/* --- what the prop DOES to the hero (the comedy) --- */
async function applyProp(p, rawKind) {
  const cls = window.propClass(rawKind);
  const alive = () => S.props.has(p.id) && !p.dead;
  switch (cls) {
    case 'ride': {
      if (S.riding) S.riding = null;
      /* let the mount finish drifting in, then it trots over to the hero */
      for (let i = 0; i < 16 && p.enter && alive(); i++) await sleep(130);
      if (!alive()) return;
      p.slideFrom = p.wx; p.slideTo = S.heroWX - 4;
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
      /* the peel keeps rolling — right into the hero's path */
      p.enter = { mode: 'roll', t0: performance.now(), dur: 500,
                  from: p.wx, target: S.heroWX + 44 };
      await sleep(480);
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
      p.enter = null;
      p.wx = S.heroWX + 26;
      p.alt = heroFeetY() - 30; p.vy = -30;    /* falls onto the hero's spot */
      await sleep(620);
      coachSay(`Bonk! A falling ${p.raw}!`, true);
      S.slips++;
      await heroGag('bonk', 800);
      S.dizzyUntil = performance.now() + 1300;
      return;
    }
    case 'eat': {
      p.enter = null;
      p.wx = S.heroWX + 54;
      await sleep(480);
      coachSay(`Yum — the ${p.raw} disappears fast!`);
      p.state = 'eaten'; p.stateT = performance.now();
      heroJump(400, 'hop');
      await sleep(720);
      setTimeout(() => { if (!p.dead) poofProp(p.id); }, 320);
      return;
    }
    case 'wear': {
      /* let it finish drifting in, then the hero snatches it out of the air */
      for (let i = 0; i < 14 && p.enter && alive(); i++) await sleep(130);
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
      /* building stuff drifts in, lands — then the breeze hauls it away
         to the house plot out on the trail */
      const tier = /straw|hay/.test(rawKind) ? 1 : /brick|stone/.test(rawKind) ? 3 : 2;
      const names = { 1: 'straw', 2: 'sticks', 3: 'brick' };
      for (let i = 0; i < 14 && p.enter && alive(); i++) await sleep(130);
      if (!alive()) return;
      S.buildStage = Math.max(S.buildStage, tier);
      coachSay(`Building stuff! The ${names[tier]} house takes shape.`);
      fxPuff(p.wx - S.cam, groundAt(p.wx) - 30, '#E8DCC0', true);
      heroJump(360, 'hop');
      await sleep(640);
      if (alive()) {
        p.haul = true;
        coachSay(`The breeze hauls the ${p.raw} off to the house plot!`);
      }
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
  S.riding.wx = S.heroWX;             /* the mount stays where you hop off */
  S.riding = null;
  heroJump(330, 'hop');                       /* a little hop off the mount */
}

/* ---------- the huff & puff — a wolf huff is a REAL gust ---------- */
async function huffPuff(ep) {
  S.wolfAnim = { t0: performance.now(), dur: 1500 };
  S.shake = { t0: performance.now(), dur: 1500, amp: 7 };   /* the whole world rattles */
  doGust(1.55, 'wolf');                     /* his puff physically shoves props */
  wolfMood.textContent = 'PUFFING!';
  coachSay('The wolf huffs… and PUFFS!', true);
  const wy = groundAt(S.cam + 60) - 76;
  for (let i = 0; i < 4; i++)
    setTimeout(() => fxPuffCloud(40 + i * 10, wy + i * 10, i > 1), i * 140);
  await sleep(900);
  if (!ep || okEp(ep)) {
    const hsx = HOUSE_WX - S.cam;                 /* house only when on-screen */
    if (S.buildStage > 0 && S.buildStage < 3) {
      if (hsx > -80 && hsx < W + 80) fxDebris(hsx, groundAt(HOUSE_WX) - 20);
      S.buildStage = Math.max(0, S.buildStage - 1);
      coachSay('Whoosh! The weak house blew to bits. Stronger stuff needed!', true);
      await sleep(600);
    } else if (S.buildStage >= 3) {
      coachSay('The brick house does NOT budge. Not one brick!');
      if (hsx > -80 && hsx < W + 80) fxPuff(hsx, groundAt(HOUSE_WX) - 80, '#EFE4D0');
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

  /* world shake (wolf huff, heavy thuds) — both canvas layers rattle */
  if (S.shake) {
    const k = (tms - S.shake.t0) / S.shake.dur;
    if (k >= 1) { S.shake = null; S.shakeX = 0; S.shakeY = 0; }
    else {
      const a = S.shake.amp * (1 - k);
      S.shakeX = (Math.sin(tms * .09) + Math.sin(tms * .041)) * .5 * a;
      S.shakeY = Math.cos(tms * .113) * a * .7;
    }
  } else { S.shakeX = 0; S.shakeY = 0; }

  /* THE camera move: ease toward the hero anchored on the left third,
     then re-paint the whole living meadow at that camera */
  const camT = S.heroWX - W * .30;
  S.cam += (camT - S.cam) * Math.min(1, dt * 3.4);
  S.heroX = S.heroWX - S.cam;
  if (wctx) {
    wctx.save();
    wctx.translate(S.shakeX, S.shakeY);
    window.WORLD.frame(wctx, S.cam, t);
    wctx.restore();
  }

  const ctx = playCv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(S.shakeX, S.shakeY);
  const feetY = heroFeetY();
  const wNow = window.WORLD.wind();

  /* hero vertical physics: gravity + ground clamp for hops & mount-jumps */
  if (S.heroJ > 0 || S.heroVY > 0) {
    S.heroJ += S.heroVY * dt;
    S.heroVY -= 1900 * dt;
    if (S.heroJ <= 0) {
      S.heroJ = 0; S.heroVY = 0; S.landT = tms;
      fxPuff(S.heroX + 2, feetY + 1, '#E8DCC0');
      if (S.heroState === 'hop' || S.heroState === 'mount')
        S.heroState = S.riding ? 'ride' : 'idle';
    }
  }
  /* riding lift eases on/off so mounting never teleports */
  S.heroLift += ((S.riding ? 52 : 0) - S.heroLift) * Math.min(1, dt * 6.5);

  /* --- the house-in-progress, fixed out on the trail ahead --- */
  const houseSX = HOUSE_WX - S.cam;
  const shaking = S.wolfAnim && (tms - S.wolfAnim.t0) < 1500 && S.buildStage > 0;
  if (houseSX > -300 && houseSX < W + 300)
    window.WORLD.drawBuild(ctx, S.buildStage, houseSX, groundAt(HOUSE_WX) - 2,
      SK.rng((curSS.seed | 0) + 555), { shake: shaking, doorOpen: S.won });

  /* --- props (stable world-x; the camera slides past them) --- */
  for (const p of S.props.values()) {
    if (p.dead && tms - (p.stateT || 0) > 520) { S.props.delete(p.id); continue; }
    /* world-anchored cleanup: props the hero has passed stay behind and
       eventually leave the stage; props gust-shoved off the right edge
       blow away with a farewell puff */
    const rel = p.wx - S.cam;
    if (!p.enter && !p.worn && p !== S.riding && !p.dead) {
      if (rel < -260) { S.props.delete(p.id); continue; }
      if (rel > W + 190 && (p.haul || Math.abs(p.vx || 0) > 120)) {
        fxPuff(W - 24, groundAt(p.wx) - 10, '#E8DCC0');
        S.props.delete(p.id); continue;
      }
    }
    const age = (tms - p.born) / 1000;
    let pop = easeOutBack(Math.min(1, age / .45));
    let rot = p.tumRot || 0, alpha = 1;
    const feet = groundAt(p.wx) - 4;
    let lift = p.hover || 0;
    const bob = Math.sin(t * 1.9 + (p.seed % 17)) * 3;

    /* --- drift-in entrances: the wind delivers every prop --- */
    if (p.enter) {
      const e = p.enter, k = Math.min(1, (tms - e.t0) / e.dur);
      if (e.mode === 'chute') {
        const ke = .5 - Math.cos(Math.PI * k) / 2;
        p.wx = e.from + (e.target - e.from) * ke + Math.sin(t * 2.2 + p.seed) * 10 * (1 - k);
        lift = e.alt * (1 - ke) + Math.sin(t * 2.6 + p.seed) * 7 * (1 - k * .6);
        rot += Math.sin(t * 2 + p.seed) * .07 * (1 - k);
      } else if (e.mode === 'roll') {
        const ke = easeOutC(k);
        p.wx = e.from + (e.target - e.from) * ke;
        rot += (p.wx - e.from) * .028 + (1 - k) * Math.sin(k * 26) * .1;
        lift += Math.abs(Math.sin(k * Math.PI * 2.4)) * 12 * (1 - k);
        if (Math.abs(e.target - e.from) * (1 - k) > 90 && tms - p.dustT > 110) {
          p.dustT = tms; fxPuff(p.wx - S.cam - 16, feet, '#E4D8BE');
        }
      } else if (e.mode === 'fly') {
        const ke = .5 - Math.cos(Math.PI * k) / 2;
        p.wx = e.from + (e.target - e.from) * ke + Math.sin(t * 1.8 + p.seed) * 14 * (1 - k);
        lift += (1 - ke) * e.alt;
      } else if (e.mode === 'drop') {
        const ke = k * k;
        p.wx = e.from + (e.target - e.from) * k + Math.sin(t * 3 + p.seed) * 6 * (1 - k);
        lift = e.alt * (1 - ke);
      }
      if (k >= 1) {
        const landedSX = p.wx - S.cam;
        p.enter = null; p.wx = e.target;
        if (e.mode !== 'fly') {
          fxPuff(landedSX, feet, '#E8DCC0');
          p.state = 'react'; p.stateT = tms;          /* the settle bounce */
          if (e.mode === 'drop')
            S.shake = { t0: tms, dur: 240, amp: 3.5 };
          if (e.mode === 'roll')
            S.shake = { t0: tms, dur: 200, amp: 1.4 };
          if (e.mode === 'chute')                     /* the leaf parachute flutters away */
            for (let i = 0; i < 3; i++)
              S.fx.push({ type: 'petal', x: landedSX, y: feet - lift - 70,
                vx: wNow.dir * (140 + i * 70), vy: -30 - i * 14, rot: i, spin: 3 + i,
                age: 0, ttl: 1.3, size: 5, col: '#67B86F', seed: p.seed + i });
        }
      }
    } else {
      /* gust shove physics — slide + tumble, friction scaled by mass */
      if (p.haul) p.vx = Math.min(620, (p.vx || 0) + 620 * dt / p.mass);
      if (p.vx) {
        p.wx += p.vx * dt;
        p.vx *= Math.exp(-dt * (1.7 + p.mass * 1.6));
        if (Math.abs(p.vx) < 9) p.vx = 0;
        if (Math.abs(p.vx || 0) > 60 && p.mass < 1.02) {
          p.tumRot += p.vx * dt * .03;
          if (tms - p.dustT > 130) { p.dustT = tms; fxPuff(p.wx - S.cam, feet, '#E4D8BE'); }
        }
      } else if (p.tumRot) {
        p.tumRot *= Math.exp(-dt * 5);
        if (Math.abs(p.tumRot) < .01) p.tumRot = 0;
      }
    }
    /* mounts slide to the hero (post-arrival) */
    if (p.slideT != null) {
      const k = Math.min(1, (tms - p.slideT) / p.slideDur);
      p.wx = p.slideFrom + (p.slideTo - p.slideFrom) * easeOutC(k);
      if (k >= 1) p.slideT = null;
    }
    /* sky-drops fall, bounce once, then settle (bonk gag) */
    if (p.alt != null) {
      p.alt += p.vy * dt; p.vy -= 1650 * dt;
      if (p.alt <= 0) {
        if (p.vy < -330) {
          p.alt = 0; p.vy = -p.vy * .3;
          fxPuff(p.wx - S.cam, feet, '#E8DCC0');
        } else {
          p.alt = null; p.vy = 0;
          fxPuff(p.wx - S.cam, feet, '#D8CCB4');
          if (p.cls === 'bonk')              /* heavy props land with a thud */
            S.shake = { t0: tms, dur: 280, amp: 3 };
        }
      }
    }
    if (p.gLift) {
      lift += p.gLift;
      p.gLift *= Math.exp(-dt * 2.6);
      if (p.gLift < .4) p.gLift = 0;
    }

    let sx = p.wx - S.cam;
    let sy = feet - lift - (p.alt || 0);
    if (p.worn) {
      p.wx = S.heroWX;
      sx = S.heroX;
      sy = feetY - S.heroLift - S.heroJ - 108 + bob * .6;  /* on the hero's head */
    } else if (p === S.riding) {
      p.wx = S.heroWX;
      sx = S.heroX; sy = feetY + bob * .4;                 /* carries the hero */
    } else {
      /* light props keep drifting on the breeze even after landing */
      if (p.mass < .5 && !p.hover && !p.enter)
        sx += Math.sin(t * 1.7 + p.seed) * (2 + wNow.str * 3.5);
      if (p.mass < .32) sy += Math.sin(t * 2.3 + p.seed * 2) * (2 + wNow.str * 4);
      else sy += bob * (p.hover ? 1.9 : .8) * (1 + wNow.str * .4);
    }
    if (p.state === 'react') {
      const k = (tms - p.stateT) / 500;
      if (k >= 1) p.state = 'idle';
      else { pop *= 1 + Math.sin(k * Math.PI) * .28; rot += Math.sin(k * Math.PI * 2) * .06; }
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

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    const sc = p.sc * Math.max(.01, pop);
    ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    ctx.translate(-p.def.w / 2, -p.def.h + 8);   /* feet at 0,0 */
    p.def.draw(ctx, p.def.w, p.def.h, SK.rng(p.seed), p.raw);
    ctx.restore();

    /* the leaf parachute, while a prop is still gliding in */
    if (p.enter && p.enter.mode === 'chute') {
      const topY = sy - p.def.h * sc;
      const chuteY = topY - 34;
      const swayX = Math.sin(t * 2.6 + p.seed) * 9;
      const cr = SK.rng(p.seed + 77);
      SK.line(ctx, sx - 14, chuteY + 8, sx - 8, topY + 4,
        { r: cr, stroke: '#8A7A58', strokeWidth: 1.6 });
      SK.line(ctx, sx + 14, chuteY + 8, sx + 8, topY + 4,
        { r: cr, stroke: '#8A7A58', strokeWidth: 1.6 });
      SK.ellipse(ctx, sx + swayX, chuteY, 30, 13,
        { r: cr, fill: '#58BC7B', stroke: INK, strokeWidth: 2 });
      SK.ellipse(ctx, sx + swayX - 14, chuteY + 3, 15, 7,
        { r: cr, fill: '#7CC97F', strokeWidth: 1.6 });
    }

    /* hand-lettered name under every live prop */
    if (alpha > .6 && !p.worn)
      SK.caption(ctx, p.raw, sx, feet + 20, SK.rng(p.seed + 5), { size: 14 });
  }

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
  ctx.translate(wolfX + lean, groundAt(S.cam + wolfX) - 4 + wolfBob);
  ctx.scale(wsc, wsc);
  ctx.globalAlpha = S.wolf > .04 ? 1 : 0;
  ctx.translate(-wolfDef.w / 2 + 30, -wolfDef.h + 8);
  wolfDef.draw(ctx, wolfDef.w, wolfDef.h, SK.rng(4242), 'wolf');
  ctx.restore();

  /* --- the hero (kid's strokes, replayed wobbly) — feet pinned to the path --- */
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
        /* TRAVEL — hero advances world-x; the camera eases along behind */
        const dist = a.to - a.from;
        S.heroWX = a.from + dist * k;
        S.heroX = hx = S.heroWX - S.cam;
        const steps = Math.max(2, Math.round(Math.abs(dist) / 44));
        const lift = a.type === 'run' ? 9 : a.type === 'ride' ? 5 : 6.5;
        hy -= Math.abs(Math.sin(k * steps * Math.PI)) * lift;
        rot = a.type === 'run' ? .13 : Math.sin(k * steps * Math.PI * 2) * .08;
        const st = Math.floor(k * steps * 2);
        if (st !== a.stepN) { a.stepN = st; fxPuff(hx - 14, feetY + 2, '#E4D8BE'); }
      } else if (a.type === 'slip') {
        /* skid forward → tumble-spin up & over → SPLAT flat → dust-off wobble */
        if (k < .42) {
          const kk = k / .42;
          S.heroWX = a.from + (a.to - a.from) * kk;
          S.heroX = hx = S.heroWX - S.cam;
          rot = kk * Math.PI * 2;
          hy -= Math.sin(kk * Math.PI) * 50;
        } else if (k < .68) {
          if (!a.splat) { a.splat = true; fxPuff(hx + 8, feetY - 4, '#E8DCC0', true); }
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
      if (k >= 1) { S.heroAnim = null; if (S.heroState !== 'ride') S.heroState = 'idle'; }
    }
    /* the hero braces against a gust — leans into it, squints, hair-lines trail */
    if (S.brace) {
      const bk = (tms - S.brace.t0) / S.brace.dur;
      if (bk >= 1) S.brace = null;
      else {
        const bs = Math.sin(Math.min(1, bk) * Math.PI);
        rot += -S.brace.dir * .13 * bs;
        hx += S.brace.dir * 6 * bs;
        sq *= 1 - .07 * bs;
        ctx.save();
        ctx.globalAlpha = .5 * bs;
        ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const lx = hx - S.brace.dir * (34 + i * 14), ly = hy - 44 - i * 15;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - S.brace.dir * 20, ly + 2); ctx.stroke();
        }
        ctx.restore();
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
    f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
    if (f.type === 'debris') { f.vy += 620 * dt; f.rot += (f.spin || 0) * dt; }
    if (f.type === 'petal') { f.vy += 60 * dt; f.rot += (f.spin || 0) * dt; }
    const k = f.age / f.ttl, fr = SK.rng(f.seed);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    if (f.type === 'puff') {
      SK.circle(ctx, f.x, f.y, f.size * (1 + k), { r: fr, fill: f.col, stroke: 'none' });
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
    } else if (f.type === 'petal') {
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = (1 - k) * .9;
      ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.ellipse(0, 0, f.size * 1.5, f.size * .8, 0, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'streak') {
      ctx.globalAlpha = (1 - k) * .6;
      ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x + (f.vx > 0 ? -1 : 1) * f.size, f.y + 4); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();          /* end play-canvas shake translate */
}

/* ============================================================
   HUD — goal & wolf meters
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
  /* GUST PLAY: "blow"/"gust"/"wind" fires a real gust instantly —
     wind waits for no one — AND the word still goes to the story-brain */
  if (GUST_WORD.test(word)) doGust(1, 'word');
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
    msChip.textContent = 'demo mode · offline narrator';
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

  /* --- TRAVEL: the world AHEAD morphs toward the new scene_seed while
     the hero walks a stride forward — cam slides along, never a wipe --- */
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
  /* the door is the fixed world-x house plot, ahead on the trail */
  const doorWX = Math.max(S.heroWX + 90, HOUSE_WX - 80);
  S.heroAnim = { type: 'run', t0: performance.now(), dur: 1400,
                 from: S.heroWX, to: doorWX, stepN: -1 };
  for (let i = 0; i < 8; i++)
    setTimeout(() => {
      const sx = HOUSE_WX - S.cam;
      fxTwinkle(sx - 40 + Math.random() * 110, groundAt(HOUSE_WX) - 60 - Math.random() * 90);
    }, i * 90);
  await sleep(1600);
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
  coachSay('Try: gather straw — or “blow” to send a gust!');
  setLineChip(`go, ${S.hero ? S.hero.name : 'hero'}, go!`);
  blank.disabled = false; goBtn.disabled = false; gustBtn.disabled = false;
  blank.focus({ preventScroll: true });
}
function resetGame(keepHero) {
  S.epoch++;
  S.busy = false; S.demoOn = false;
  S.history = []; S.words = []; S.slips = 0; S.pigs = 0;
  S.goal = 0; S.wolf = .14;
  S.heroWX = HERO_WX0; S.cam = window.WORLD.camStart();
  S.buildStage = 0; S.riding = null; S.gear = [];
  S.props.clear(); S.fx = []; S.won = false;
  S.heroState = 'idle'; S.heroAnim = null; S.wolfAnim = null;
  S.heroJ = 0; S.heroVY = 0; S.heroLift = 0; S.landT = 0;
  S.shake = null; S.shakeX = 0; S.shakeY = 0;
  S.gust = null; S.brace = null; S.lastGust = 0; S.pendingWord = null;
  curSS = { biome: 'meadow', seed: 1234, palette: 'warm', props: [] };
  window.WORLD.reset(curSS);
  if (!keepHero) S.hero = null;
  setGoal(0); setWolf(.14);
  narrEl.textContent = 'Draw your hero to open the storybook…';
  obRow.innerHTML = ''; setChips([]); showDym(null);
  coachSay('The crayons are waiting!');
  endOv.classList.remove('show'); endOv.hidden = true;
  stopBtn.hidden = true;
  S.started = !!keepHero;
  blank.disabled = !keepHero; goBtn.disabled = !keepHero; gustBtn.disabled = !keepHero;
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
  S.gust = null; S.brace = null;
  if (S.started && !S.busy) {
    goBtn.disabled = false;
    coachSay('You take over — type a word!');
  }
}
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;
/* headless-test hooks: spawn + apply a prop, or fire a gust off-script */
window.__test = (kind, xFrac) => {
  const p = spawnProp(kind, xFrac == null ? .55 : xFrac);
  applyProp(p, String(kind).toLowerCase());
  return p.id;
};
window.__spawn = (kind, xFrac) => spawnProp(kind, xFrac == null ? .55 : xFrac).id;
window.__gust = (str) => doGust(str || 1, 'test');
window.__huff = () => huffPuff(S.epoch);
window.__propX = (id) => { const p = S.props.get(id); return p ? Math.round(p.wx - S.cam) : null; };
/* tiny read-only state probe — used by the v3 headless verification harness */
window.__probe = () => ({
  started: S.started, busy: S.busy, demo: S.demoOn, won: S.won,
  goal: +S.goal.toFixed(2), wolf: +S.wolf.toFixed(2), build: S.buildStage,
  heroX: Math.round(S.heroX), heroWX: Math.round(S.heroWX),
  cam: Math.round(S.cam), heroState: S.heroState, riding: !!S.riding,
  heroJ: Math.round(S.heroJ), feetY: Math.round(heroFeetY()),
  groundY: Math.round(groundAt(S.heroWX)),
  props: [...S.props.values()].map(p => p.raw),
  propsInfo: [...S.props.values()].map(p => ({ raw: p.raw, kind: p.kind,
    mass: p.mass, sx: Math.round(p.wx - S.cam), wx: Math.round(p.wx),
    enter: p.enter ? p.enter.mode : null, vx: Math.round(p.vx || 0) })),
  gust: S.gust ? { str: S.gust.str, dir: S.gust.dir,
                   age: Math.round(performance.now() - S.gust.t0) } : null,
  wind: window.WORLD.wind(),
  houseWX: HOUSE_WX, houseSX: Math.round(HOUSE_WX - S.cam),
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
gustBtn.addEventListener('click', () => { if (S.started) doGust(1, 'button'); });
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
   INIT — paint the meadow + start the loop
   ============================================================ */
(function init() {
  sizeAll();
  window.WORLD.reset(curSS);
  S.heroWX = HERO_WX0;
  S.cam = window.WORLD.camStart();
  S.heroX = S.heroWX - S.cam;
  replayMaker();
  setGoal(0); setWolf(.14);
  /* crisper hand labels once the hand font lands */
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => replayMaker());
  requestAnimationFrame(frame);
  /* #watch → watch-it-play auto-run (used by the verification harness) */
  if (/watch/.test(location.hash)) setTimeout(() => startDemo(), 450);
})();
