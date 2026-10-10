/* ============================================================
   Sketch-DOM Pigs — app.js   (v3 · 02-rough-svg)
   The DOM-native sketch world: every prop is a <g> you can
   address; the hero is the kid's own strokes replayed as rough
   SVG paths — the drawing literally becomes DOM. Story beats
   come from the REAL LLM through ../shared/llm.js.
   ============================================================ */
'use strict';

if (!window.rough) {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('narrative').textContent =
      'rough.js failed to load — check vendor/rough.js';
  });
  throw new Error('rough.js missing');
}

/* ---------- element handles ---------- */
const $ = (id) => document.getElementById(id);
const worldSvg  = $('worldSvg');
const camG      = $('camG'),      shakeG  = $('shakeG');
const layers = {
  sky: $('skyLayer'), fxback: $('fxBackLayer'),
  terrain: $('terrainLayer'), build: $('buildLayer'),
  props: $('propLayer'), fx: $('fxLayer'),
};
const wolfPos   = $('wolfPos'),   wolfG    = $('wolfG');
const heroPos   = $('heroPos'),   heroG    = $('heroG');
const heroInk   = $('heroInk'),   heroDizzy= $('heroDizzy');
const goalFill  = $('goalFill'),  goalPct  = $('goalPct');
const wolfFill  = $('wolfFill'),  wolfLabel= $('wolfLabel');
const latChip   = $('latChip'),   modeChip = $('modeChip');
const stopBtn   = $('stopBtn');
const makerOv   = $('makerOverlay'), makerSvg = $('makerSvg');
const makerG    = $('makerG'),    makerCv  = $('makerCv');
const swatchBox = $('swatches'),  nodeCount= $('nodeCount');
const doneBtn   = $('doneBtn'),   surpriseBtn = $('surpriseBtn');
const clearBtn  = $('clearBtn'),  watchBtn = $('watchBtn');
const endOv     = $('endOverlay'), winLine = $('winLine');
const recap     = $('recap'),     againBtn = $('againBtn');
const watchAgain= $('watchAgainBtn');
const narrEl    = $('narrative'), obRow    = $('obstacles');
const blank     = $('blank'),     goBtn    = $('goBtn');
const dymEl     = $('dym'),       dymBtn   = $('dymBtn');
const choicesEl = $('choices'),   coach    = $('coach');
const domList   = $('domList'),   logEl    = $('log');

const INK = '#2B2118';
const GY = 430;                    /* ground line in world coords */
const GOAL = 'The Three Little Pigs — help the pig friends gather ' +
  'materials, build houses, and reach the strong brick house before ' +
  'the Big Bad Wolf huffs and puffs.';

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const mulberry32 = window.SketchWorld.mulberry32;
const rr = (r, a, b) => a + r() * (b - a);
const pick = (r, arr) => arr[(r() * arr.length) | 0];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const SVGNS = 'http://www.w3.org/2000/svg';
function G(cls, parent) {
  const g = document.createElementNS(SVGNS, 'g');
  if (cls) g.setAttribute('class', cls);
  if (parent) parent.appendChild(g);
  return g;
}
const easeIO = (k) => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function tween(ms, fn, ep) {        /* dumb little tween driver; ep bails on stop/reset */
  return new Promise((res) => {
    let t0 = null;
    (function step(t) {
      if (ep != null && !okEp(ep)) return res();
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / ms);
      fn(k);
      if (k < 1) requestAnimationFrame(step); else res();
    })(performance.now());
  });
}

/* ---------- rough svg handles ---------- */
const RS   = rough.svg(worldSvg);
const RS_M = rough.svg(makerSvg);

/* ---------- game state (all positions in WORLD coords; camera pans) ---------- */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false,
  history: [], words: [], slips: 0, pigs: 0,
  goal: 0, wolf: .14,
  heroWX: 140, heroLift: 0,            /* hero world-x + hop height   */
  camX: 0, section: 0, worldW: 960,    /* panorama: 960px per stretch */
  queued: null,
  propSeq: 0, props: new Map(),
  buildStage: 0, riding: null, gear: [],
  heroColor: '#4FB06D', sceneSeed: ((Math.random() * 0x7ffffffe) | 0) + 1,
};
const okEp = (ep) => ep === S.epoch;
const SECW = 960;
const secBase = () => S.section * SECW;

/* ============================================================
   BEAT 0 — THE HERO MAKER (draw on canvas → replay as SVG DOM)
   ============================================================ */
const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
let strokes = [], curStroke = null, selColor = CRAYONS[1], makerBusy = false;
let mctx = null;

function makerCtx() {
  if (!mctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    makerCv.width = 420 * dpr; makerCv.height = 264 * dpr;
    mctx = makerCv.getContext('2d');
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.lineCap = mctx.lineJoin = 'round';
  }
  return mctx;
}
function replayMaker() {
  /* every stroke becomes a real <g><path> in makerG */
  makerG.innerHTML = '';
  strokes.forEach((st, i) => {
    if (st.pts.length < 2) {
      makerG.appendChild(RS_M.circle(st.pts[0][0], st.pts[0][1], 7,
        { stroke: st.c, strokeWidth: 3, fill: st.c, fillStyle: 'solid', seed: 1000 + i }));
    } else {
      makerG.appendChild(RS_M.curve(st.pts,
        { stroke: st.c, strokeWidth: st.w || 11, roughness: 1.9, seed: 1000 + i }));
    }
  });
  makerCtx().clearRect(0, 0, 420, 264);
  nodeCount.textContent =
    `${strokes.length} stroke${strokes.length === 1 ? '' : 's'} · ` +
    `${makerG.childElementCount} DOM node${makerG.childElementCount === 1 ? '' : 's'}`;
}
function clearMaker() {
  strokes = []; curStroke = null;
  replayMaker();
}
function makerPos(e) {
  const r = makerCv.getBoundingClientRect();
  return [ (e.clientX - r.left) * 420 / r.width,
           (e.clientY - r.top)  * 264 / r.height ];
}

/* parametric "surprise" monster — emitted as STROKES so the
   hero is built the exact same way a kid would draw it */
function surpriseStrokes() {
  const r = mulberry32(((Math.random() * 0x7ffffffe) | 0) + 7);
  const c = pick(r, [CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
  const lite = { '#FF6B57': '#FFC9BF', '#4FB06D': '#B7E6C3',
                 '#5DA9E9': '#C7E6FA', '#B565D8': '#DCC3F2' }[c];
  const cx = 210, cy = 146;
  const bw = rr(r, 118, 148), bh = rr(r, 104, 126);
  const rx = bw / 2, ry = bh / 2;
  const S_ = [];
  const ellPts = (ex, ey, erx, ery, n = 30, jit = 2.5) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * 2 * i / n;
      pts.push([ex + Math.cos(a) * erx + rr(r, -jit, jit),
                ey + Math.sin(a) * ery + rr(r, -jit, jit)]);
    }
    return pts;
  };
  const zig = (ex, ey, erx, ery, col, w) => {      /* crayon fill scribble */
    for (let y = -ery + 7; y < ery - 4; y += 12) {
      const half = erx * Math.sqrt(Math.max(0, 1 - (y / ery) * (y / ery)));
      if (half < 6) continue;
      const pts = [];
      for (let x = -half; x <= half; x += 8)
        pts.push([ex + x, ey + y + Math.sin(x * .3) * 3]);
      S_.push({ c: col, pts, w });
    }
  };
  S_.push({ c, pts: ellPts(cx, cy, rx, ry), w: 10 });            /* body outline */
  zig(cx, cy + 8, rx * .8, ry * .7, lite, 8);                    /* belly fill */
  /* antenna + tip */
  S_.push({ c, w: 7, pts: [[cx, cy - ry + 4], [cx - 8, cy - ry - 16], [cx + 5, cy - ry - 30]] });
  S_.push({ c: '#FFC53D', w: 9, pts: ellPts(cx + 5, cy - ry - 34, 8, 8, 12, 1.5) });
  /* eyes: white scribble dots + ink pupils */
  [[cx - bw * .18, cy - bh * .18], [cx + bw * .22, cy - bh * .14]].forEach(([ex, ey], i) => {
    zig(ex, ey, 12 - i * 3, 14 - i * 3, '#FFFDF6', 7);
    S_.push({ c: INK, w: 9, pts: ellPts(ex + 3, ey + 1, 4, 4.5, 10, 1) });
    S_.push({ c: INK, w: 6, pts: ellPts(ex, ey, 13 - i * 3, 15 - i * 3, 18, 2) });
  });
  /* smile + cheeks + feet */
  const sm = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * .18 + Math.PI * .64 * i / 14;
    sm.push([cx + 2 + Math.cos(a) * bw * .22, cy + 6 + Math.sin(a) * bh * .16]);
  }
  S_.push({ c: INK, pts: sm, w: 7 });
  S_.push({ c: '#FF6B57', w: 6, pts: ellPts(cx - bw * .4, cy + 2, 5, 4, 10, 1.5) });
  S_.push({ c: '#FF6B57', w: 6, pts: ellPts(cx + bw * .42, cy + 4, 4, 3.5, 10, 1.5) });
  S_.push({ c: '#6B4A2A', w: 8, pts: ellPts(cx - bw * .26, cy + ry + 2, bw * .15, 8, 14, 2) });
  S_.push({ c: '#6B4A2A', w: 8, pts: ellPts(cx + bw * .26, cy + ry + 2, bw * .15, 8, 14, 2) });
  return S_;
}
async function surpriseMe(fast, ep) {
  if (makerBusy) return;
  makerBusy = true;
  clearMaker();
  for (const st of surpriseStrokes()) {
    if (ep != null && !okEp(ep)) { makerBusy = false; return; }
    strokes.push(st);
    replayMaker();
    await sleep(fast ? 55 : 130);
  }
  makerBusy = false;
}

/* the kid's strokes -> normalized hero doodle inside <g id="heroInk"> */
function buildHero() {
  if (!strokes.length) return false;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  strokes.forEach(st => st.pts.forEach(([x, y]) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  const w = Math.max(10, x1 - x0), h = Math.max(10, y1 - y0);
  const k = Math.min(96 / w, 100 / h, 1.8);
  const mx = (x0 + x1) / 2;
  heroInk.innerHTML = '';
  strokes.forEach((st, i) => {
    const pts = st.pts.map(([x, y]) => [(x - mx) * k, (y - y1) * k]);
    if (pts.length < 2) {
      heroInk.appendChild(RS.circle(pts[0][0], pts[0][1], 4,
        { stroke: st.c, strokeWidth: 2, fill: st.c, fillStyle: 'solid', seed: 3000 + i }));
    } else {
      heroInk.appendChild(RS.curve(pts,
        { stroke: st.c, strokeWidth: Math.max(3, (st.w || 11) * k * .92),
          roughness: 1.9, seed: 3000 + i }));
    }
  });
  /* count colors → name the hero */
  const tally = {};
  strokes.forEach(st => tally[st.c] = (tally[st.c] || 0) + st.pts.length);
  S.heroColor = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || CRAYONS[1];
  return true;
}
const COLORWORDS = { '#FF6B57': 'coral-red', '#FFC53D': 'sun-yellow',
  '#4FB06D': 'leaf-green', '#5DA9E9': 'sky-blue',
  '#B565D8': 'berry-purple', '#2B2118': 'inky-black' };
const heroDesc = () => `a kid-drawn doodle hero in ${COLORWORDS[S.heroColor] || 'crayon'} crayon`;

/* ============================================================
   WORLD RENDER + CAMERA + HERO LOCOMOTION + WOLF + GOAL
   The world is a growing panorama: each accepted turn sketches
   the next 960px stretch at (section * 960). The camera pans
   right to follow the hero — the journey always moves forward.
   ============================================================ */
let houseSet = null;
function renderScene(ss, offX) {
  window.SketchWorld.render(RS, layers, ss, offX);
}
function houseWX() { return secBase() + 802; }   /* door sits ahead, right edge */
function setBuild(stage) {
  S.buildStage = Math.max(S.buildStage, stage);
  houseSet = window.SketchWorld.renderBuild(RS, layers.build, S.buildStage,
    S.sceneSeed, secBase());
}
function setWolf(p) {
  S.wolf = clamp01(p);
  wolfFill.style.width = Math.round(S.wolf * 100) + '%';
  wolfLabel.textContent = S.wolf > .68 ? 'huffy!' : 'wolf';
}
function setGoal(p, snap) {
  /* smooth + monotonic-ish: may dip a touch on a fail beat, never plummet */
  const t = snap ? clamp01(p) : Math.max(clamp01(p), S.goal - .06);
  S.goal = t;
  goalFill.style.width = Math.round(S.goal * 100) + '%';
  goalPct.textContent = Math.round(S.goal * 100) + '%';
  /* the house takes shape as the journey nears home */
  if (S.goal >= .82) setBuild(3); else if (S.goal >= .5) setBuild(2);
  else if (S.goal >= .28) setBuild(1);
}

/* ---------- hero placement + locomotion (world coords) ---------- */
function heroClass(c) { heroG.setAttribute('class', c); }
function heroCls()    { return heroG.getAttribute('class') || 'idle'; }
function placeHero() {
  heroPos.setAttribute('transform',
    `translate(${S.heroWX} ${GY - (S.heroLift || 0)})`);
  /* a mounted friend carries the hero — it walks too */
  if (S.riding) S.riding.node.setAttribute('transform',
    `translate(${S.heroWX - 4} ${GY})`);
}
async function walkTo(wx2, ep, speed) {
  speed = speed || .34;
  if (S.demoOn) speed *= 1.4;
  const x0 = S.heroWX, dur = Math.max(320, Math.abs(wx2 - x0) / speed);
  if (!S.riding) heroClass('g-walk');
  await tween(dur, (k) => {
    S.heroWX = x0 + (wx2 - x0) * easeIO(k);
    placeHero();
  }, ep);
  if (heroCls() === 'g-walk') heroClass(S.riding ? 'g-ride' : 'idle');
}
async function hopTo(wx2, peak, ep) {
  const x0 = S.heroWX;
  const dur = Math.max(360, Math.abs(wx2 - x0) / .4);
  await tween(dur, (k) => {
    S.heroWX = x0 + (wx2 - x0) * easeIO(k);
    S.heroLift = Math.sin(Math.PI * k) * peak;   /* up, arc, back to the ground */
    placeHero();
  }, ep);
  if (!ep || okEp(ep)) { S.heroLift = 0; placeHero(); }
}

/* ---------- master rAF loop: the camera follows the hero ---------- */
function loop() {
  const target = Math.max(0, Math.min(S.heroWX - 300, S.worldW - SECW));
  S.camX += (target - S.camX) * .12;
  camG.setAttribute('transform', `translate(${-S.camX} 0)`);
  /* the wolf trails just off the left edge of the screen */
  wolfPos.setAttribute('transform',
    `translate(${S.camX - 150 + S.wolf * 168} ${GY})`);
  requestAnimationFrame(loop);
}

/* ============================================================
   PROP NODES — spawn / react / remove / poof (world coords)
   ============================================================ */
const FLY_RE = /bird|bee|butterfly|duck|fly|owl|bat|dragonfly/;

/* gravity: a spawned prop falls from above, lands, one bounce, settles */
function dropIn(p, ep) {
  return new Promise((res) => {
    const ty = p.y;
    let y = ty - rr(Math.random, 240, 340), v = 0, bounces = 0;
    let t = performance.now();
    const setY = (yy) => p.node.setAttribute('transform',
      `translate(${p.x} ${yy})`);
    setY(y);
    (function step(now) {
      if (ep != null && !okEp(ep)) { setY(ty); return res(); }
      const dt = Math.min(.05, (now - t) / 1000); t = now;
      v += 2600 * dt;
      y += v * dt;
      if (y >= ty) {
        y = ty;
        if (bounces < 1 && v > 300) {
          v = -v * .32; bounces++;
          fxPuff(p.x, GY - 4, '#E8DCC0');
        } else {
          setY(ty); p.inner.classList.add('bob');
          return res();
        }
      }
      setY(y);
      requestAnimationFrame(step);
    })(t);
  });
}
/* fliers swoop in from the right and hover — never grounded */
function flyIn(p, ep) {
  const fromX = S.camX + SECW + 90, fromY = p.y - 60;
  p.node.setAttribute('transform', `translate(${fromX} ${fromY})`);
  return tween(950, (k) => {
    const e = easeIO(k);
    p.node.setAttribute('transform',
      `translate(${fromX + (p.x - fromX) * e} ${fromY + (p.y - fromY) * e + Math.sin(k * 9) * 12})`);
  }, ep).then(() => {
    p.node.setAttribute('transform', `translate(${p.x} ${p.y})`);
    p.inner.classList.add('bob');
  });
}

function spawnProp(rawKind, wxOrFrac, opts = {}) {
  const kind = window.propKind(rawKind);          /* unknown → doodad (labeled) */
  const id = `prop-${++S.propSeq}`;
  const outer = G('propnode');
  outer.id = id;
  outer.dataset.kind = kind;
  outer.dataset.raw = String(rawKind || kind);
  const inner = G('prop-inner', outer);
  const builder = window.SKETCH_PROPS[kind] || window.SKETCH_PROPS.doodad;
  const art = builder(RS, (S.sceneSeed ^ (S.propSeq * 7919)) >>> 0, rawKind);
  inner.appendChild(art);
  /* wxOrFrac >= 1.5 is treated as a world-x; a fraction maps into the
     current stretch ahead of the hero's landing spot */
  const wx = (wxOrFrac != null && wxOrFrac > 1.5)
    ? wxOrFrac
    : secBase() + 400 + clamp01(wxOrFrac == null ? .5 : wxOrFrac) * 440;
  const cls = window.propClass(rawKind);
  const flyer = cls === 'fly' || FLY_RE.test(String(rawKind));
  const wy = flyer ? GY - 140 - Math.random() * 70 : GY;
  outer.setAttribute('transform', `translate(${wx} ${wy})`);
  layers.props.appendChild(outer);
  const p = { node: outer, inner, kind, raw: rawKind, x: wx, y: wy, flyer };
  S.props.set(id, p);
  /* keep the DOM tidy: oldest non-riding, non-gear prop poofs away past 14 */
  if (S.props.size > 14) {
    for (const [oid, q] of S.props) {
      if (q === S.riding || S.gear.includes(q)) continue;
      poofProp(oid); break;
    }
  }
  /* entrance motion: fliers swoop, everything else drops in with gravity */
  if (!opts.quiet) {
    if (flyer) flyIn(p, opts.ep);
    else dropIn(p, opts.ep);
  } else setTimeout(() => inner.classList.add('bob'), 560);
  refreshDomPeek();
  return p;
}
function findProp(rawKind) {
  const kind = window.propKind(rawKind);
  for (const [id, p] of S.props) if (p.kind === kind) return id;
  return null;
}
function poofProp(id) {
  const p = S.props.get(id);
  if (!p) return;
  S.props.delete(id);
  if (S.riding === p) S.riding = null;
  S.gear = S.gear.filter(g => g !== p);
  p.inner.classList.remove('bob');
  p.inner.classList.add('poof');
  setTimeout(() => p.node.remove(), 480);
  refreshDomPeek();
}
function reactProp(id) {
  const p = S.props.get(id);
  if (!p) return;
  p.inner.classList.remove('bob', 'react');
  void p.inner.getBBox();                   /* reflow to restart anim */
  p.inner.classList.add('react');
  setTimeout(() => { p.inner.classList.remove('react'); p.inner.classList.add('bob'); }, 650);
}

/* ============================================================
   GAGS — comedy hung on the <g> nodes (world coords!)
   ============================================================ */
function heroGag(cls, ms) {
  return new Promise((res) => {
    heroClass(cls);
    setTimeout(() => {
      if (heroCls() === cls) heroClass(S.riding ? 'g-ride' : 'idle');
      res();
    }, ms);
  });
}
function showDizzy(ms) {
  heroDizzy.setAttribute('opacity', 1);
  heroDizzy.classList.add('orbit');
  setTimeout(() => { heroDizzy.setAttribute('opacity', 0); heroDizzy.classList.remove('orbit'); }, ms);
}
function coachSay(t, uhoh) {
  coach.textContent = t;
  coach.classList.toggle('uhoh', !!uhoh);
}

/* dust puff / splash bits in fxLayer — SMIL rides again */
function fxPuff(x, y, color, big) {
  const n = big ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const g = G('fxbit', layers.fx);
    const a = Math.PI * 2 * i / n + .4;
    g.appendChild(RS.circle(0, 0, big ? 12 : 8,
      { stroke: 'none', fill: color || '#E8DCC0', fillStyle: 'solid' }));
    g.setAttribute('transform', `translate(${x} ${y})`);
    const anim = document.createElementNS(SVGNS, 'animateTransform');
    anim.setAttribute('attributeName', 'transform');
    anim.setAttribute('type', 'translate');
    anim.setAttribute('additive', 'sum');
    anim.setAttribute('values', `0 0; ${Math.cos(a) * 46} ${Math.sin(a) * 34 - 16}`);
    anim.setAttribute('dur', '.8s');
    anim.setAttribute('fill', 'freeze');
    g.appendChild(anim);
    const fade = document.createElementNS(SVGNS, 'animate');
    fade.setAttribute('attributeName', 'opacity');
    fade.setAttribute('values', '1;0');
    fade.setAttribute('dur', '.85s');
    fade.setAttribute('fill', 'freeze');
    g.appendChild(fade);
    setTimeout(() => g.remove(), 900);
  }
}
function twinkle(x, y) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + Math.PI * i / 5;
    const r = i % 2 ? 4 : 11;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const g = G('fxbit twinkle', layers.fx);
  g.setAttribute('transform', `translate(${x} ${y})`);
  g.appendChild(RS.polygon(pts, { stroke: INK, strokeWidth: 1.5, fill: '#FFC53D', fillStyle: 'solid', seed: 777 }));
  setTimeout(() => g.remove(), 950);
}

/* --- the gag dispatcher: what does this prop DO to the hero? --- */
async function applyProp(p, rawKind, ep) {
  const cls = window.propClass(rawKind);
  switch (cls) {
    case 'ride': {
      if (S.riding) dismount();
      /* hero hops forward onto the mount — it carries him from here */
      if (Math.abs(p.x - S.heroWX) > 60) await walkTo(p.x - 14, ep);
      await hopTo(p.x, 62, ep); if (ep != null && !okEp(ep)) return;
      p.y = GY; p.x = S.heroWX - 4;
      p.node.setAttribute('transform', `translate(${S.heroWX - 4} ${GY})`);
      S.riding = p;
      coachSay(`You hop on the ${p.raw} — giddyup!`);
      heroClass('g-ride');
      return;
    }
    case 'slip': {
      /* hero strolls up to the peel, then WHOOP — spin + splat + stars */
      await walkTo(Math.max(S.heroWX + 40, p.x - 44), ep, .3);
      if (ep != null && !okEp(ep)) return;
      p.node.setAttribute('transform', `translate(${S.heroWX + 46} ${GY})`);
      await sleep(400);
      coachSay(`Whoops — a ${p.raw}! Right under your feet!`, true);
      S.slips++;
      await heroGag('g-slip', 1160);
      showDizzy(1300);
      fxPuff(S.heroWX + 70, GY - 8, '#E8DCC0');
      await sleep(340);
      coachSay('Dusts off, giggles, onward!');
      fxPuff(S.heroWX + 10, GY - 30, '#EFE4D0');
      return;
    }
    case 'bonk': {
      /* heavy thing drops out of the sky next to the hero */
      await walkTo(Math.max(S.heroWX + 30, p.x - 30), ep, .3);
      if (ep != null && !okEp(ep)) return;
      p.x = S.heroWX + 34;
      p.node.setAttribute('transform', `translate(${p.x} ${GY})`);
      p.inner.classList.remove('bob'); p.inner.classList.add('drop');
      await sleep(300);
      coachSay(`Bonk! A falling ${p.raw}!`, true);
      S.slips++;
      await heroGag('g-bonk', 820);
      showDizzy(1300);
      fxPuff(S.heroWX + 34, GY - 20, '#CBC2B0', true);
      setTimeout(() => { p.inner.classList.remove('drop'); p.inner.classList.add('bob'); }, 700);
      return;
    }
    case 'eat': {
      await walkTo(Math.max(S.heroWX + 30, p.x - 58), ep, .3);
      if (ep != null && !okEp(ep)) return;
      await sleep(420);
      coachSay(`Yum — the ${p.raw} disappears fast!`);
      p.inner.style.setProperty('--ex', `${(S.heroWX + 4 - p.x)}px`);
      p.inner.style.setProperty('--ey', '-64px');
      p.inner.classList.remove('bob'); p.inner.classList.add('eaten');
      await heroGag('g-nom', 720);
      setTimeout(() => { const id = p.node.id; poofProp(id); }, 300);
      return;
    }
    case 'wear': {
      /* the prop node literally moves inside the hero's <g> — DOM-native! */
      await walkTo(Math.max(S.heroWX + 30, p.x - 60), ep, .3);
      if (ep != null && !okEp(ep)) return;
      await sleep(420);
      p.node.setAttribute('transform', 'translate(0 -96)');
      p.node.dataset.kind = p.kind + '-gear';
      heroG.appendChild(p.node);              /* reparent into the hero */
      p.inner.classList.remove('bob'); p.inner.classList.add('bob');
      S.gear.push(p);
      if (S.gear.length > 3) {
        const old = S.gear.shift();
        setTimeout(() => poofProp(old.node.id), 200);
      }
      coachSay(`The ${p.raw} is yours now — it rides along in the DOM!`);
      await heroGag('g-hop', 720);
      refreshDomPeek();
      return;
    }
    case 'material': {
      /* building stuff slides over to the house plot, one hop at a time */
      const tier = /straw|hay/.test(rawKind) ? 1 : /brick|stone/.test(rawKind) ? 3 : 2;
      const names = { 1: 'straw', 2: 'sticks', 3: 'brick' };
      const mx = houseWX() - 96 - Math.random() * 50;
      const x0 = p.x;
      await tween(760, (k) => {
        const e = easeIO(k);
        p.node.setAttribute('transform',
          `translate(${x0 + (mx - x0) * e} ${GY - Math.sin(Math.PI * k) * 60})`);
      }, ep);
      if (ep != null && !okEp(ep)) return;
      p.x = mx; p.y = GY;
      p.node.setAttribute('transform', `translate(${mx} ${GY})`);
      setBuild(Math.max(tier, S.buildStage));
      coachSay(`Building stuff! The ${names[tier]} house takes shape.`);
      fxPuff(houseWX(), GY - 60, '#E8DCC0', true);
      await heroGag('g-hop', 720);
      return;
    }
    case 'wolf': {
      coachSay('The Big Bad Wolf peeks out — huff incoming!', true);
      setWolf(S.wolf + .24);
      reactProp(p.node.id);
      return;
    }
    case 'pig': {
      S.pigs++;
      coachSay(`A pig friend joins the trip! (${Math.min(S.pigs, 3)}/3 pals)`);
      reactProp(p.node.id);
      await heroGag('g-hop', 720);
      return;
    }
    case 'fly': {
      /* swoops past the hero, loops once */
      await tween(700, (k) => {
        p.node.setAttribute('transform',
          `translate(${p.x - Math.sin(Math.PI * k) * 90} ${p.y - Math.sin(Math.PI * k) * 40})`);
      }, ep);
      return;
    }
    default: {
      /* plain props still react — a friendly wiggle when the hero passes */
      if (Math.abs(p.x - S.heroWX) < 240) reactProp(p.node.id);
      return;
    }
  }
}
function dismount() {
  if (!S.riding) return;
  S.riding = null;
  if (heroCls() === 'g-ride') heroClass('idle');
}

/* ---------- the huff & puff ---------- */
async function huffPuff(ep) {
  wolfG.classList.add('g-huff');
  shakeG.classList.remove('shake');
  void shakeG.getBBox();                          /* reflow → restart the shake */
  shakeG.classList.add('shake');                  /* the WHOLE world rattles */
  setTimeout(() => shakeG.classList.remove('shake'), 780);
  coachSay('The wolf huffs… and PUFFS!', true);
  /* puff clouds racing right (SMIL) — spawn at the screen's left edge */
  for (let i = 0; i < 4; i++) {
    const g = G('fxbit', layers.fx);
    g.setAttribute('transform', `translate(${S.camX + 30 + i * 8} ${GY - 60 + i * 8})`);
    g.appendChild(RS.ellipse(0, 0, 34 + i * 8, 20 + i * 5,
      { stroke: INK, strokeWidth: 1.6, fill: '#EFE4D0', fillStyle: 'solid', seed: 6000 + i }));
    const anim = document.createElementNS(SVGNS, 'animateTransform');
    anim.setAttribute('attributeName', 'transform');
    anim.setAttribute('type', 'translate');
    anim.setAttribute('additive', 'sum');
    anim.setAttribute('values', `0 0; ${760 + i * 30} ${-14 + i * 6}`);
    anim.setAttribute('dur', `${1.1 + i * .18}s`);
    anim.setAttribute('begin', `${i * .12}s`);
    anim.setAttribute('fill', 'freeze');
    g.appendChild(anim);
    const fade = document.createElementNS(SVGNS, 'animate');
    fade.setAttribute('attributeName', 'opacity');
    fade.setAttribute('values', '1;1;0');
    fade.setAttribute('dur', `${1.25 + i * .18}s`);
    fade.setAttribute('begin', `${i * .12}s`);
    fade.setAttribute('fill', 'freeze');
    g.appendChild(fade);
    setTimeout(() => g.remove(), 2200 + i * 200);
  }
  await sleep(620);
  if (!ep || okEp(ep)) {
    if (houseSet) {
      houseSet.classList.add('huffed');
      if (S.buildStage > 0 && S.buildStage < 3) {
        /* weak house scatters — each wall <g> flies its own way */
        await sleep(500);
        houseSet.classList.add('scattered');
        await sleep(760);
        S.buildStage = Math.max(0, S.buildStage - 1);
        houseSet = window.SketchWorld.renderBuild(RS, layers.build, S.buildStage,
          S.sceneSeed, secBase());
        coachSay('Whoosh! The weak house blew to bits. Stronger stuff needed!', true);
      } else if (S.buildStage >= 3) {
        await sleep(500);
        coachSay('The brick house does NOT budge. Not one brick!');
        fxPuff(houseWX(), GY - 90, '#EFE4D0');
      }
      setTimeout(() => houseSet && houseSet.classList.remove('huffed'), 900);
    }
  }
  wolfG.classList.remove('g-huff');
  setWolf(.5);                                  /* wolf needs a breather */
}

/* ============================================================
   DOM PEEK — every live node, listed & pokeable
   ============================================================ */
function refreshDomPeek() {
  domList.innerHTML = '';
  const chip = (label, node, innerSel, cls) => {
    const c = document.createElement('span');
    c.className = 'domchip' + (cls ? ' ' + cls : '');
    c.textContent = label;
    if (node) {
      c.addEventListener('click', () => {
        const t = innerSel ? node.querySelector(innerSel) || node : node;
        t.classList.remove('peek', 'layerpeek');
        try { void t.getBBox(); } catch (e) {}
        t.classList.add(innerSel ? 'peek' : 'layerpeek');
        setTimeout(() => t.classList.remove('peek', 'layerpeek'), 750);
      });
    } else c.classList.add('domchip-muted');
    domList.appendChild(c);
  };
  chip(`g#skyLayer (${layers.sky.childElementCount})`, layers.sky);
  chip(`g#terrainLayer (${layers.terrain.childElementCount})`, layers.terrain);
  chip(`g#buildLayer · stage ${S.buildStage}`, layers.build, '.house-set');
  for (const [id, p] of S.props)
    chip(`g#${id}.${p.kind}`, p.node, '.prop-inner');
  chip(`g#heroInk (${heroInk.childElementCount} strokes)`, heroInk, null, 'domchip-hero');
  chip('g#wolfG', wolfG, '#wolfG .wolfbody', 'domchip-wolf');
}

/* ============================================================
   THE LLM LOOP
   ============================================================ */
const llm = new StoryLLM({
  mode: 'remote',
  onStatus(st) {
    if (st.waiting) latChip.textContent = 'waiting for memory headroom…';
    else if (!st.failed) latChip.textContent = 'asking the story-brain…';
  },
});

function logLine(word, narrative) {
  const g = logEl.querySelector('.ghost-line');
  if (g) g.remove();
  const p = document.createElement('p');
  const b = document.createElement('b');
  b.textContent = `“${word}” `;
  p.appendChild(b);
  p.appendChild(document.createTextNode(narrative));
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function setChips(list) {
  choicesEl.innerHTML = '';
  (list || []).slice(0, 4).forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'choicechip';
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
  const word = blank.value.trim().slice(0, 28);
  if (!word || !S.started) return;
  if (S.busy) {                     /* typed during a transition → queue it */
    S.queued = word;
    blank.value = '';
    coachSay('Hold that thought — hero is mid-step!');
    return;
  }
  S.busy = true;
  blank.value = '';
  /* input stays LIVE during the animation — typing queues the next word */
  showDym(null);
  latChip.classList.add('thinking');
  latChip.textContent = 'asking the story-brain…';

  const ep = S.epoch;
  const gm = await llm.next({
    goal: GOAL, history: S.history.slice(-4),
    playerText: word, hero: heroDesc(),
  });
  if (!okEp(ep)) { S.busy = false; return; }

  /* --- latency + mode chips (honest: live only for remote/local) --- */
  const meta = gm._meta || { ms: 0, mode: 'offline' };
  const mode = meta.mode;
  latChip.classList.remove('thinking');
  latChip.dataset.ms = meta.ms || 0;
  if (mode === 'offline') {
    latChip.textContent = 'demo mode · canned narrator';
    modeChip.textContent = 'demo mode';
    modeChip.classList.add('demo');
    modeChip.dataset.source = 'offline';
  } else {
    latChip.textContent =
      `story-brain answered in ${(meta.ms / 1000).toFixed(1)}s (${Math.round(meta.ms)}ms)`;
    modeChip.textContent = mode === 'local' ? 'live LLM · local' : 'live LLM';
    modeChip.dataset.source = mode;
    modeChip.classList.remove('demo');
  }

  /* --- narrative + obstacles (textContent — always kid-safe) --- */
  if (gm.narrative) narrEl.textContent = gm.narrative;
  obRow.innerHTML = '';
  (gm.obstacles || []).forEach(o => {
    const c = document.createElement('span');
    c.className = 'obchip';
    c.textContent = 'watch out: ' + o;
    obRow.appendChild(c);
  });
  logLine(word, gm.narrative || '…');
  S.history.push(`${word} -> ${(gm.narrative || '').slice(0, 90)}`);
  S.words.push(word);

  /* --- forward travel: grow the next stretch, then walk into it --- */
  const base = (S.section + 1) * SECW;
  S.section++;
  S.worldW = (S.section + 1) * SECW;
  S.sceneSeed = gm.scene_seed.seed || S.sceneSeed;
  renderScene(gm.scene_seed, base);              /* the new stretch slides in */
  S.lastBiome = gm.scene_seed.biome;
  /* the house-in-progress travels with us to the new stretch's edge */
  houseSet = window.SketchWorld.renderBuild(RS, layers.build, S.buildStage,
    S.sceneSeed, base);

  /* --- hero walks forward while the camera pans — the transition --- */
  const walkP = walkTo(base + 300, ep);
  await sleep(430);                            /* let the pan get going, then… */
  if (!okEp(ep)) { S.busy = false; return; }

  /* …props drop/swoop in while the new stretch is sliding into view */
  (gm.scene_seed.props || []).slice(0, 3).forEach((k, i) => {
    if (findProp(k)) return;
    spawnProp(k, base + 430 + i * 150 + Math.random() * 60, { ep });
  });
  if (S.riding && !(gm.props || []).some(pp => window.propClass(pp.kind) === 'ride'))
    dismount();
  const fresh = [];                            /* {p, kind} needing a gag */
  for (const pr of (gm.props || [])) {
    if (!okEp(ep)) break;
    if (pr.action === 'remove') { const id = findProp(pr.kind); if (id) poofProp(id); continue; }
    if (pr.action === 'react') {
      const id = findProp(pr.kind);
      if (id) reactProp(id); else spawnProp(pr.kind, base + 380 + pr.x * 480, { ep });
      continue;
    }
    const exist = findProp(pr.kind);
    if (exist) { reactProp(exist); continue; }
    const p = spawnProp(pr.kind, base + 380 + clamp01(pr.x) * 460, { ep });
    fresh.push([p, String(pr.kind).toLowerCase()]);
  }
  refreshDomPeek();
  await walkP;                                 /* hero arrives in the new stretch */
  if (!okEp(ep)) { S.busy = false; return; }
  window.SketchWorld.prune(layers, S.section - 1);   /* old stretch scrolls off */

  /* --- now the props DO things to the hero --- */
  for (const [p, rk] of fresh) {
    if (!okEp(ep)) break;
    await applyProp(p, rk, ep);
    await sleep(120);
  }

  /* --- did you mean --- */
  showDym(gm.did_you_mean || localDym(word));

  /* --- goal + wolf pressure --- */
  /* light scaffold: every turn moves the journey forward a bit — even a
     silly slip still traveled — so a word-list reaches the payoff even
     when the model paces slowly; the model can always outrun the floor */
  const gained = Math.max(0, gm.goal_progress - S.goal);
  const target = Math.max(gm.goal_progress,
    Math.min(.97, S.goal + (gm.success ? .16 : .12)));
  setGoal(target);
  let dw = .05 + (gm.success ? 0 : .10) + (gm.obstacles || []).length * .03 - gained * .35;
  if (window.propClass(word) === 'slip' || !gm.success) dw += .02;
  setWolf(S.wolf + dw);
  setChips(gm.choices);

  /* --- huff & puff threshold --- */
  if (S.wolf >= .92 && okEp(ep)) await huffPuff(ep);

  /* --- win --- */
  if (S.goal >= .96 && okEp(ep)) { winSeq(); return; }
  S.busy = false;
  if (!S.demoOn) blank.focus({ preventScroll: true });
  /* a word was typed mid-animation — run it now */
  const q = S.queued; S.queued = null;
  if (q && okEp(ep) && !S.demoOn) { blank.value = q; submitWord(); }
}

/* ============================================================
   WIN
   ============================================================ */
async function winSeq() {
  S.busy = true;
  coachSay('Run! The brick house door is open!');
  if (houseSet) houseSet.classList.add('dooropen');
  const doorX = houseWX() - 30;
  const ep = S.epoch;
  if (S.riding) dismount();
  await walkTo(doorX, ep, .5);                 /* the last dash to the door */
  if (!okEp(ep)) return;
  for (let i = 0; i < 8; i++)
    setTimeout(() => twinkle(houseWX() - 100 + Math.random() * 180,
      300 + Math.random() * 90), i * 90);
  heroClass('g-hop');
  await sleep(900);
  recap.innerHTML = '';
  S.words.slice(-10).forEach(w => {
    const c = document.createElement('span');
    c.className = 'wordchip'; c.textContent = w;
    recap.appendChild(c);
  });
  winLine.textContent = `Your hero made it in ${S.words.length} word${S.words.length === 1 ? '' : 's'}` +
    (S.slips ? ` — with ${S.slips} silly slip${S.slips === 1 ? '' : 's'}!` : ' — no slips at all!');
  endOv.hidden = false;
  requestAnimationFrame(() => endOv.classList.add('show'));
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
  blank.disabled = false; goBtn.disabled = false;
  blank.focus({ preventScroll: true });
  refreshDomPeek();
}
function resetGame(keepHero) {
  S.epoch++;
  S.busy = false; S.demoOn = false; S.queued = null;
  S.history = []; S.words = []; S.slips = 0; S.pigs = 0;
  S.goal = 0; S.wolf = .14;
  S.heroWX = 140; S.heroLift = 0; S.camX = 0;
  S.section = 0; S.worldW = SECW;
  S.buildStage = 0; S.riding = null; S.gear = [];
  [...S.props.keys()].forEach(id => { S.props.get(id).node.remove(); });
  S.props.clear();
  layers.fx.innerHTML = '';
  /* the panorama rolls back to stretch zero and re-sketches itself */
  window.SketchWorld.clear(layers);
  renderScene({ biome: 'meadow', seed: S.sceneSeed, palette: 'warm', props: [] }, 0);
  S.lastBiome = 'meadow';
  camG.setAttribute('transform', 'translate(0 0)');
  heroClass('idle');
  S.heroLift = 0; placeHero();
  setGoal(0, true); setWolf(.14); setBuild(0);
  narrEl.textContent = 'Draw your hero to open the storybook…';
  obRow.innerHTML = ''; setChips([]); showDym(null);
  logEl.innerHTML = '<p class="ghost-line">Your story words land here…</p>';
  coachSay('The crayons are waiting!');
  endOv.classList.remove('show'); endOv.hidden = true;
  stopBtn.classList.remove('show');
  S.started = !!keepHero;
  if (keepHero) startStory();
}

/* ============================================================
   WATCH IT PLAY — real LLM run, live latency, Stop button
   ============================================================ */
const DEMO_WORDS = ['gather straw', 'sticks', 'unicorn', 'banana peel',
                    'bricks', 'build a house', 'run inside', 'hide'];
async function startDemo() {
  const ep = ++S.epoch;
  S.demoOn = true; S.queued = null;
  stopBtn.classList.add('show');
  endOv.classList.remove('show'); endOv.hidden = true;

  /* resource guardrail: big op = a whole scripted LLM journey */
  latChip.classList.add('thinking');
  latChip.textContent = 'checking memory headroom…';
  const headroom = await llm.waitForHeadroom(4).catch(() => false);
  if (!okEp(ep)) return;
  if (!headroom) coachSay('The machine is busy — the show may be slow!', true);
  latChip.classList.remove('thinking');

  /* auto-paint a hero on the pad, then send it on stage */
  makerOv.hidden = false;
  makerOv.classList.add('show');
  await sleep(240); if (!okEp(ep)) return;
  await surpriseMe(true, ep); if (!okEp(ep)) return;
  buildHero();
  await sleep(300); if (!okEp(ep)) return;
  makerOv.classList.remove('show');           /* always tuck the pad away */
  setTimeout(() => { if (!makerOv.classList.contains('show')) makerOv.hidden = true; }, 330);
  if (!S.started) startStory();

  for (const word of DEMO_WORDS) {
    if (!okEp(ep)) return;
    /* wait for any busy turn to settle */
    while (S.busy && okEp(ep)) await sleep(200);
    if (!okEp(ep)) return;
    await sleep(500); if (!okEp(ep)) return;
    /* type it like a kid */
    blank.value = '';
    for (const ch of word) {
      if (!okEp(ep)) return;
      blank.value += ch;
      await sleep(80 + Math.random() * 90);
    }
    await sleep(380); if (!okEp(ep)) return;
    submitWord();
    while (S.busy && okEp(ep)) await sleep(200);
    if (S.goal >= .96) break;
  }
  while (S.busy && okEp(ep)) await sleep(200);
  if (okEp(ep)) {
    S.demoOn = false;
    stopBtn.classList.remove('show');
  }
}
function stopDemo() {
  S.epoch++;                        /* cancels every pending walk/gag/call check */
  S.demoOn = false;
  S.busy = false; S.queued = null;
  makerBusy = false;
  stopBtn.classList.remove('show');
  latChip.classList.remove('thinking');
  heroClass(S.riding ? 'g-ride' : 'idle');
  S.heroLift = 0; placeHero();      /* feet back on the ground, always */
  if (S.started) {
    blank.disabled = false; goBtn.disabled = false;
    coachSay('You take over — type a word!');
  }
}
/* the v3 dashboard (and big red buttons) drive these */
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;

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
  replayMaker();                     /* the drawing just became DOM */
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
  resetGame(true);
  makerOv.hidden = false;
  requestAnimationFrame(() => makerOv.classList.add('show'));
});

/* ============================================================
   INIT — the first sketch
   ============================================================ */
(function init() {
  renderScene({ biome: 'meadow', seed: S.sceneSeed, palette: 'warm', props: [] }, 0);
  S.lastBiome = 'meadow';
  window.SketchWorld.drawWolf(RS, wolfG);
  setBuild(0);
  setWolf(.14); setGoal(0, true);
  S.heroWX = 140; S.heroLift = 0; placeHero();
  requestAnimationFrame(loop);        /* camera + wolf-tail forever */
  /* dizzy stars orbit (hidden until a gag) */
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * 2 * i / 3;
    const pts = [];
    for (let j = 0; j < 10; j++) {
      const b = -Math.PI / 2 + Math.PI * j / 5;
      const r = j % 2 ? 3 : 8;
      pts.push([Math.cos(a) * 30 + Math.cos(b) * r, -70 + Math.sin(a) * 12 + Math.sin(b) * r]);
    }
    heroDizzy.appendChild(RS.polygon(pts,
      { stroke: INK, strokeWidth: 1.4, fill: '#FFC53D', fillStyle: 'hachure', hachureGap: 3, seed: 500 + i }));
  }
  replayMaker();
  refreshDomPeek();
})();
