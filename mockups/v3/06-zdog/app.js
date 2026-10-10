/* ============================================================
   The Three Little Pigs · Zdog Diorama — app.js
   Engine: Zdog v1.1.3 (vendored, MIT — https://zzz.dog)

   Differentiator: the whole story world is a TOY DIORAMA on a
   slowly-spinning lazy susan — a fat little Zdog cylinder puck
   with trees, houses and typed props glued on top. The kid's
   crayon hero becomes a paper standee (drawing on a card on a
   popsicle stick) that swivels to face the camera and bobs along
   the front of the disc. The wolf lurks at the table's edge and
   his huff SHAKES the whole diorama. Story beats come from the
   real LLM via ../shared/llm.js — every scene_seed re-grows the
   biome, palette and prop scatter.
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const stage      = $('stage');
const zdogCv     = $('zdogCv');
const lineChip   = $('lineChip');
const msChip     = $('msChip');
const goalFill   = $('goalFill');
const goalPig    = $('goalPig');
const wolfFill   = $('wolfFill');
const wolfMood   = $('wolfMood');
const stopBtn    = $('stopBtn');
const makerOv    = $('makerOverlay');
const makerCv    = $('makerCv');
const swatchBox  = $('swatches');
const doneBtn    = $('doneBtn');
const surpriseBtn= $('surpriseBtn');
const clearBtn   = $('clearBtn');
const watchBtn   = $('watchBtn');
const endOv      = $('endOverlay');
const againBtn   = $('againBtn');
const watchAgain = $('watchAgainBtn');
const winTitle   = $('winTitle');
const recapEl    = $('recap');
const narrativeEl= $('narrative');
const obstaclesEl= $('obstacles');
const wordInput  = $('blank');
const goBtn      = $('goBtn');
const dymEl      = $('dym');
const dymBtn     = $('dymBtn');
const choicesEl  = $('choices');
const coachEl    = $('coach');

if (!window.Zdog || !window.StoryLLM || !window.ZPROP || !window.ZWORLD) {
  narrativeEl.textContent =
    'Something did not load — check vendor/zdog.dist.min.js and ../shared/llm.js.';
  throw new Error('Zdog, StoryLLM, ZPROP or ZWORLD missing');
}

const Z = window.Zdog;
const ZP = window.ZPROP;
const TAU = Z.TAU;
const INK = '#2B2118';
const { mulberry32, pick, rr } = ZP;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function empty(a) { a.children.slice().forEach((c) => c.remove()); }

/* ============================================================
   THE STAGE — one Illustration, camera = illo (dragRotate-able),
   the lazy susan = spin anchor.
   ============================================================ */
let W = 800, H = 400;
const illo = new Z.Illustration({
  element: zdogCv,
  dragRotate: true,
  rotate: { x: -0.52, y: 0.4 },          // from slightly above, angled start
});
illo.zoom = 1;

const sky      = new Z.Anchor({ addTo: illo });              // camera space
const spin     = new Z.Anchor({ addTo: illo, rotate: { y: 0 } });
const platform = new Z.Anchor({ addTo: spin, translate: { y: 78 } });
const puck     = new Z.Anchor({ addTo: platform });          // the wooden puck (rebuilt)
const ring     = new Z.Anchor({ addTo: platform });          // disc-top frame (scenery)
const propsRing= new Z.Anchor({ addTo: platform });          // live props (survive re-growth)
const heroAnchor = new Z.Anchor({ addTo: illo, translate: { x: -105, y: 53, z: 72 } });
const heroBob    = new Z.Anchor({ addTo: heroAnchor });
const heroFace   = new Z.Anchor({ addTo: heroBob });
const wolfAnchor = new Z.Anchor({ addTo: illo, translate: { x: 172, y: 53, z: 34 } });
const wolfBob    = new Z.Anchor({ addTo: wolfAnchor });
const wolfFace   = new Z.Anchor({ addTo: wolfBob });

/* tabletop shadow under the whole puck — soft css-only blob is behind us;
   this one sits under the hero so the standee feels planted */
const TOP_WORLD_Y = 53;                                    // platform 78 + SURF_Y -25

function makeShadow(parent, w) {
  return new Z.Ellipse({
    addTo: parent, width: w, height: w * 0.5, fill: true, stroke: 0,
    color: 'rgba(43,33,24,.18)', rotate: { x: TAU / 4 }, translate: { y: -0.5 },
  });
}
const heroShadow = makeShadow(heroAnchor, 46);
const wolfShadow = makeShadow(wolfAnchor, 62);

/* dizzy stars — a little orbit that appears over the standee on slips */
const starOrbit = new Z.Anchor({
  addTo: heroBob, translate: { y: -86 }, visible: false });
for (let i = 0; i < 3; i++) {
  const a = (TAU * i) / 3;
  ZP.flat(starOrbit, ZP.starPts(0, 0, 8, 3.4, 5),
    { c: '#FFC53D', f: true, s: 2.4,
      x: Math.cos(a) * 25, y: Math.sin(a) * 9, z: 6 });
}

/* ---------- tiny spring system (props pop, hero slips) ---------- */
const springs = new Set();
function spring(from, to, apply, o = {}) {
  const s = { x: from, v: 0, t: to, k: o.k ?? 0.09, d: o.d ?? 0.68,
              apply, done: o.done, delay: o.delay ?? 0, tag: o.tag };
  springs.add(s);
  apply(from);
  return s;
}
function killTag(tag) { for (const s of [...springs]) if (s.tag === tag) springs.delete(s); }
function updateSprings(dtms) {
  for (const s of [...springs]) {
    if (s.delay > 0) { s.delay -= dtms; continue; }
    s.v += (s.t - s.x) * s.k;
    s.v *= s.d;
    s.x += s.v;
    s.apply(s.x);
    if (Math.abs(s.v) < 0.001 && Math.abs(s.t - s.x) < 0.001) {
      s.apply(s.t); springs.delete(s);
      if (s.done) s.done();
    }
  }
}

/* rAF tween helper (like v1-roughjs): resolves early if epoch is bumped */
let epoch = 0;
const okEp = (ep) => ep === epoch;
const easeIO = (k) => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function tween(dur, fn, ep) {
  return new Promise((res) => {
    let t0 = null;
    function step(t) {
      if (ep !== undefined && !okEp(ep)) return res();
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / dur);
      fn(k);
      if (k < 1) requestAnimationFrame(step);
      else res();
    }
    requestAnimationFrame(step);
  });
}

/* ============================================================
   WORLD — rebuild on every scene_seed
   ============================================================ */
let skyBits = { clouds: [], drops: [], bolt: null };
let curSeed = { biome: 'meadow', seed: 20260, palette: 'warm', props: ['flower', 'tree'] };

const worldCtx = {
  puck, ring, sky,
  setSky(t, b, biome) {
    stage.style.setProperty('--skyt', t);
    stage.style.setProperty('--skyb', b);
    stage.classList.toggle('dark-sky', biome === 'storm' || t === '#33395E');
  },
};
function renderScene(ss) {
  curSeed = ss || curSeed;
  skyBits = ZWORLD.build(worldCtx, curSeed);
}

/* ============================================================
   FORWARD TRAVEL — a diorama can't pan, so the LAZY SUSAN is the
   wipe: every accepted turn spins the puck a stretch forward.
   Old scenery shrinks away while it sweeps past; the freshly-seeded
   biome pops up around the ring ahead of the walking standee.
   ============================================================ */
let traveling = false;
/* anchors here carry numeric scales (zdog normalizes at render) */
const scaleOf = (a) => (typeof a.scale === 'number' ? a.scale : (a.scale && a.scale.x) || 1);
function shrinkRing() {
  ring.children.slice().forEach((c, i) => {
    spring(scaleOf(c), 0.001,
      (v) => { c.scale = Math.max(0.001, v); },
      { k: 0.26, d: 0.62, delay: i * 40 });
  });
}
function growRing() {
  ring.children.slice().forEach((c, i) => {
    const fs = (c.userData && c.userData.fs) || 1;
    c.scale = 0.001;
    spring(0.001, fs, (v) => { c.scale = Math.max(0.001, v); },
      { k: 0.13, d: 0.56, delay: 60 + i * 75 });
  });
}
async function travelSpin(ss, ep) {
  if (traveling) { renderScene(ss); growRing(); return; }
  traveling = true;
  heroWalking = true;
  const dist = 1.85 + Math.random() * 0.45;          // ~105°–130° forward
  const y0 = spin.rotate.y;
  let swapped = false;
  shrinkRing();                                      // old stretch shrinks away
  await tween(1180, (k) => {
    spin.rotate.y = y0 + dist * easeIO(k);
    if (!swapped && k >= 0.48) {                     // masked by peak spin speed
      swapped = true;
      renderScene(ss);
      growRing();                                    // new biome grows in ahead
    }
  }, ep);
  if (!swapped && okEp(ep)) { renderScene(ss); growRing(); }
  heroWalking = false;
  traveling = false;
}

/* ============================================================
   PROPS — spawn / remove / react on the spinning disc
   ============================================================ */
const liveProps = [];      // {kind, pkind, anchor, inner, ang, rad}
let propSeq = 0;
const PROP_R = 112;

function propAngleFor(xFrac) {
  /* choose a disc-local angle so the prop pops in near the
     requested screen x *right now* (it will orbit away gently) */
  const t = clamp((xFrac - 0.5) * 2.15, -0.96, 0.96);
  return Math.asin(t) - spin.rotate.y;
}
function spawnProp(kind, xFrac, o = {}) {
  const w = String(kind).toLowerCase();
  const r = mulberry32(((xFrac * 9973) | 0) ^ (propSeq++ * 131) ^ ((curSeed?.seed | 0) || 7));
  const anchor = new Z.Anchor();
  const inner = ZP.build(w, (curSeed?.seed | 0) + propSeq * 7);
  const pkind = ZP.propKindOf(w);
  anchor.addChild(inner);
  const ang = propAngleFor(clamp(xFrac, 0.05, 0.95));
  const rad = PROP_R * rr(r, 0.82, 1.06);
  /* drop in from above the table and settle on the disc with a bounce */
  anchor.translate = { x: Math.sin(ang) * rad, y: -190,
                       z: Math.cos(ang) * rad };
  const sc = o.quiet ? rr(r, 0.55, 0.72) : rr(r, 0.95, 1.12);
  anchor.scale = 0.001;
  propsRing.addChild(anchor);
  const rec = { kind: w, pkind, anchor, inner, ang, rad,
                rideable: ZP.RIDEABLE.test(w), slippery: ZP.SLIPPERY.test(w) };
  liveProps.push(rec);
  /* keep the tabletop uncluttered — oldest toy quietly hops off */
  if (liveProps.length > 14) {
    const old = liveProps.find((p) => p !== rec && p.pkind !== 'brickhouse');
    if (old) removeProp(old.kind);
  }
  const dly = o.delay ?? 0;
  spring(-190, ZWORLD.SURF_Y + 1, (v) => { anchor.translate.y = v; },
    { k: 0.115, d: 0.58, delay: dly });                    // gravity drop + bounce
  spring(0.001, sc, (v) => { anchor.scale = Math.max(0.001, v); },
    { k: 0.16, d: 0.55, delay: dly });
  /* unknown kinds: the mystery doodad gets a little paper name tag
     (POLISH: labeled doodle fallback — never silently skip) */
  if (pkind === 'doodad') {
    const tag = document.createElement('span');
    tag.className = 'proplabel';
    tag.textContent = w.slice(0, 18);
    stage.appendChild(tag);
    rec.label = tag;
  }
  return rec;
}
function removeProp(kind) {
  const i = liveProps.findIndex((p) => p.kind === kind || p.pkind === ZP.propKindOf(kind));
  if (i < 0) return;
  const [rec] = liveProps.splice(i, 1);
  if (rec.label) { rec.label.remove(); rec.label = null; }
  spring(scaleOf(rec.anchor), 0.001, (v) => { rec.anchor.scale = Math.max(0.001, v); },
    { k: 0.18, d: 0.7, done: () => rec.anchor.remove() });
}
function reactProp(kind) {
  const rec = liveProps.find((p) => p.kind === kind || p.pkind === ZP.propKindOf(kind));
  if (!rec) { spawnProp(kind, 0.5); return; }
  spring(-0.3, 0, (v) => { rec.inner.rotate.z = v; }, { k: 0.2, d: 0.42 });
  const y0 = ZWORLD.SURF_Y + 1;
  spring(y0 - 26, y0, (v) => { rec.anchor.translate.y = v; },
    { k: 0.16, d: 0.55 });                                 // a little excited hop
}
function clearProps() {
  for (const p of liveProps) {
    p.anchor.remove();
    if (p.label) p.label.remove();
  }
  liveProps.length = 0;
}
/* where a prop sits on screen-ish right now (world x under spin) */
function propScreenX(rec) { return rec.rad * Math.sin(rec.ang + spin.rotate.y); }

/* ============================================================
   HERO — kid crayon strokes → a paper standee on a stick
   ============================================================ */
const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
let strokes = [], curStroke = null, selColor = CRAYONS[1];
let mctx = null, makerBusy = false;
let heroDesc = '', heroReady = false;

function sizeMaker() {
  const wpx = makerCv.clientWidth || 420;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  makerCv.width = wpx * dpr;
  makerCv.height = 240 * dpr;
  mctx = makerCv.getContext('2d');
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderMaker();
}
function drawStroke(ctx, st) {
  ctx.strokeStyle = st.c; ctx.lineWidth = st.w;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.92;
  const pts = st.pts;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], st.w / 2, 0, TAU);
    ctx.fillStyle = st.c; ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const l = pts[pts.length - 1];
    ctx.lineTo(l[0], l[1]);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function renderMaker() {
  if (!mctx) return;
  mctx.clearRect(0, 0, makerCv.clientWidth, 240);
  for (const st of curStroke ? strokes.concat([curStroke]) : strokes)
    drawStroke(mctx, st);
}
function makerPos(e) {
  const b = makerCv.getBoundingClientRect();
  return [e.clientX - b.left, e.clientY - b.top];
}
function clearMaker() { strokes = []; curStroke = null; renderMaker(); }

/* the auto-hero: a blob monster painted stroke-by-stroke */
function surpriseStrokes() {
  const w = makerCv.clientWidth || 420, h = 240;
  const r = mulberry32(((Math.random() * 0x7ffffffe) | 0) + 7);
  const c = pick(r, [CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
  const cx = w / 2, cy = h / 2 + 10;
  const bw = rr(r, 110, 140), bh = rr(r, 96, 118);
  const body = [], n = 16;
  for (let i = 0; i <= n; i++) {
    const a = (TAU * i) / n - TAU / 4;
    body.push([cx + Math.cos(a) * bw / 2 * rr(r, 0.9, 1.1),
               cy + Math.sin(a) * bh / 2 * rr(r, 0.9, 1.1)]);
  }
  const st = [
    { c, w: 13, pts: body, closed: true },
    { c: INK, w: 11, pts: [[cx - bw * 0.2, cy - bh * 0.14]] },          // eye
    { c: INK, w: 11, pts: [[cx + bw * 0.2, cy - bh * 0.14]] },          // eye
    { c: INK, w: 8, pts: ZP.arcPts(cx, cy + 4, bw * 0.18, 0.3, Math.PI - 0.3, 8)
        .map((p) => [p.x, p.y]) },                                    // smile
    { c, w: 9, pts: [[cx, cy - bh / 2], [cx + rr(r, -14, 14), cy - bh / 2 - 26]] }, // antenna
    { c: CRAYONS[2], w: 10, pts: [[cx + 6, cy - bh / 2 - 32]] },        // antenna tip
    { c, w: 11, pts: [[cx - bw * 0.28, cy + bh / 2 - 4], [cx - bw * 0.3, cy + bh / 2 + 16]] }, // leg
    { c, w: 11, pts: [[cx + bw * 0.28, cy + bh / 2 - 4], [cx + bw * 0.3, cy + bh / 2 + 16]] }, // leg
  ];
  if (r() < 0.5) st.push({ c: CRAYONS[5], w: 8,
    pts: [[cx - bw * 0.44, cy + 6], [cx - bw * 0.62, cy - 8]] });       // wave arm
  if (r() < 0.5) st.push({ c: CRAYONS[5], w: 8,
    pts: [[cx + bw * 0.44, cy + 6], [cx + bw * 0.62, cy - 8]] });
  return st;
}
async function surpriseMe(fast) {
  if (makerBusy) return;
  makerBusy = true;
  const gen = surpriseStrokes();
  strokes = []; curStroke = null;
  renderMaker();
  for (const st of gen) {
    strokes.push(st);
    renderMaker();
    if (!fast) await sleep(160); else await sleep(30);
  }
  makerBusy = false;
}

/* strokes[] → Zdog standee: card + popsicle stick + fat path strokes */
function buildHero() {
  if (!strokes.length) return false;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const st of strokes) for (const [x, y] of st.pts) {
    minx = Math.min(minx, x); miny = Math.min(miny, y);
    maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
  }
  const bw = Math.max(30, maxx - minx), bh = Math.max(30, maxy - miny);
  const s = Math.min(62 / bw, 62 / bh);
  const cw = bw * s + 18, ch = bh * s + 18, stickH = 16;
  const cardCy = -(stickH + ch / 2);

  empty(heroFace);
  /* popsicle stick + base — it is literally a standee on the diorama */
  ZP.cyl(heroFace, 5, stickH + 4, '#B98A4F', { y: -stickH / 2 + 1 });
  new Z.RoundedRect({
    addTo: heroFace, width: cw, height: ch, cornerRadius: 10,
    fill: true, stroke: 4, color: 'rgba(255,253,246,.94)',
    translate: { y: cardCy }, backface: 'rgba(243,227,188,.9)',
  });
  strokes.slice(0, 16).forEach((st, i) => {
    const pts = st.pts.length > 26
      ? st.pts.filter((_, j) => j % 2 === 0 || j === st.pts.length - 1) : st.pts;
    new Z.Shape({
      addTo: heroFace,
      path: pts.map(([x, y]) => ({
        x: (x - (minx + bw / 2)) * s,
        y: cardCy + (y - (miny + bh / 2)) * s,
      })),
      closed: !!st.closed, fill: st.closed ? ZP.hexRgba(st.c, 0.22) : false,
      stroke: clamp(st.w * s * 0.85, 3.6, 7.5), color: st.c,
      translate: { z: 1 + i * 0.3 },
    });
  });
  heroDesc = `a kid-drawn hero on a standee card (${strokes.length} crayon strokes)`;
  heroReady = true;
  return true;
}

/* hero motion gags — heroHeld hands translate.y/rotate.z to springs
   (the tick's idle bob would otherwise overwrite them every frame) */
let heroWalking = false, slipping = false, riding = false, heroHeld = false;
let goalShown = 0;
function heroHop() {
  heroHeld = true;
  spring(-46, 0, (v) => { heroBob.translate.y = v; },
    { k: 0.12, d: 0.5, tag: 'herohop', done: () => { heroHeld = false; } });
}
/* silly-beat gag, ~1.3s: the standee spins once around its popsicle
   stick, splats flat (squash+stretch), dizzy stars orbit overhead —
   then two dust-off hops and he's back on his feet. */
function heroSlip() {
  if (slipping || riding) return;
  slipping = true;
  killTag('herodrop'); killTag('herohop'); heroHeld = false;  // take over motion
  const ep = epoch;
  const y0 = heroBob.rotate.y;
  spring(y0, y0 + TAU, (v) => { heroBob.rotate.y = v; },        // spin on the stick
    { k: 0.3, d: 0.68 });
  spring(0.7, 1, (v) => {                                     // splat squash
    heroBob.scale.y = v; heroBob.scale.x = 1 + (1 - v) * 0.9;
  }, { k: 0.16, d: 0.5, delay: 120 });
  spring(0.9, 0, (v) => { heroBob.rotate.z = v; }, { k: 0.2, d: 0.42, delay: 60 });
  spring(-14, 0, (v) => { if (!riding) heroBob.translate.y = v; },
    { k: 0.24, d: 0.5 });
  starOrbit.visible = true;                                   // stars!
  setTimeout(() => { if (okEp(ep)) starOrbit.visible = false; }, 980);
  setTimeout(() => {                                          // dust-off hop 1
    if (okEp(ep)) spring(-22, 0, (v) => { if (!riding) heroBob.translate.y = v; },
      { k: 0.22, d: 0.55 });
  }, 1030);
  setTimeout(() => {                                          // dust-off hop 2 + settle
    if (!okEp(ep)) return;
    heroBob.rotate.z = 0;
    spring(-12, 0, (v) => { if (!riding) heroBob.translate.y = v; },
      { k: 0.26, d: 0.6, done: () => { slipping = false; } });
  }, 1210);
}
function heroRide(rec) {
  if (riding || slipping) return;
  riding = true;
  killTag('herox');                                     // take over the x glide
  const px = propScreenX(rec);
  const startX = heroAnchor.translate.x, startY = heroAnchor.translate.y;
  spring(0, 1, (v) => {
    heroAnchor.translate.x = Z.lerp(startX, px, Z.easeInOut(v, 2));
    heroBob.translate.y = Z.lerp(startY - TOP_WORLD_Y, -84, Math.min(1, v * 1.6)) +
      Math.abs(Math.sin(v * 12)) * -10;
  }, { k: 0.14, d: 0.7, done: () => {
    setTimeout(() => {
      const back = heroX();                            // land at the goal spot
      spring(0, 1, (v) => {
        heroAnchor.translate.x = Z.lerp(px, back, Z.easeInOut(v, 2));
        heroBob.translate.y = Z.lerp(-84, 0, Z.easeInOut(v, 2));
      }, { k: 0.16, d: 0.6, done: () => { riding = false; heroBob.translate.y = 0; } });
    }, 350);
  } });
}
function heroX() { return -105 + goalShown * 210; }
function setHeroX(x) {
  killTag('herox');
  spring(heroAnchor.translate.x, x,
    (v) => { heroAnchor.translate.x = v; }, { k: 0.06, d: 0.7, tag: 'herox' });
}

/* ============================================================
   THE WOLF — lurks table-right; meter slides him closer,
   the huff shakes the whole toy
   ============================================================ */
let wolf = { meter: 0 };
let huffCount = 0, shake = 0;
(function buildWolf() { ZP.buildWolf(wolfFace, mulberry32(4242)); wolfFace.scale = 0.9; })();

function wolfMoodText(m) {
  if (m < 0.28) return 'far away';
  if (m < 0.55) return 'sniffing around';
  if (m < 0.85) return 'getting close!';
  return 'huffing and puffing!';
}
function setWolfMeter(v) {
  wolf.meter = clamp(v, 0, 1);
  wolfFill.style.width = (wolf.meter * 100).toFixed(0) + '%';
  wolfMood.textContent = wolfMoodText(wolf.meter);
  const target = 176 - wolf.meter * 62;
  killTag('wolfx');
  spring(wolfAnchor.translate.x, target,
    (v) => { wolfAnchor.translate.x = v; }, { k: 0.05, d: 0.7, tag: 'wolfx' });
}
/* the gust: little models get shoved and wobble, the standee leans */
function blowProps(st) {
  liveProps.forEach((p, i) => setTimeout(() => {
    spring(-13 * st, 0,
      (v) => { p.inner.translate.x = v; p.inner.rotate.z = v * 0.055; },
      { k: 0.22, d: 0.4 });
  }, i * 55));
  if (!slipping && !riding && !heroHeld)
    spring(-0.14 * st, 0, (v) => { heroFace.rotate.z = v; }, { k: 0.2, d: 0.5 });
}
function huff(strength = 1) {
  huffCount++;
  shake = Math.max(shake, 9 * strength);                    // rattles the toy
  spring(wolfBob.scale.x || 1, 1.5,
    (v) => { wolfBob.scale = v; }, { k: 0.2, d: 0.4,
    done: () => spring(1.5, 1, (v) => { wolfBob.scale = v; }, { k: 0.16, d: 0.5 }) });
  blowProps(strength);
  lineChip.textContent = 'The wolf huffs and puffs — the whole diorama rattles!';
}

/* ============================================================
   GAME LOOP — typed word → real LLM → diorama rebuild
   ============================================================ */
const GOAL = 'The Three Little Pigs — help the pig friends gather materials, ' +
  'build houses, and reach the strong brick house before the Big Bad Wolf huffs and puffs.';
const llm = new StoryLLM({
  onStatus: (s) => {
    if (s.waiting) coach('Waiting for a little memory room…');
    else if (s.failed) coach('The story master hiccuped — trying a helper instead.');
  },
});

let history = [], wordLog = [];
let heroProgress = 0, busy = false, started = false;
let demoOn = false, pendingWord = null;
const latHist = [];

const SENSIBLE = ['straw', 'sticks', 'bricks', 'house', 'bridge', 'run', 'hide',
  'build', 'jump', 'swim', 'boat', 'knock', 'sing', 'dance', 'cookie', 'unicorn',
  'climb', 'rope', 'ladder', 'torch', 'key', 'door', 'dig', 'help', 'nap', 'slide',
  'tunnel', 'flower', 'balloon', 'kite', 'mushroom', 'wagon', 'skate', 'hug'];
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function wordLike(w) {
  return /^[a-z]+([ '-][a-z]+)*$/i.test(w) && w.length >= 2 && w.length <= 32 &&
    /[aeiouy]/i.test(w) && !/(.)\1\1/.test(w);
}
function localGuess(word) {
  const w = word.trim().toLowerCase();
  let best = null, bd = 3;
  for (const s of SENSIBLE) {
    const d = lev(w, s);
    if (d < bd) { bd = d; best = s; }
  }
  return bd <= 2 ? best : null;
}

/* ---------- DOM helpers (kid-safe: textContent only) ---------- */
function coach(msg) { coachEl.textContent = msg; }
function setNarrative(t) {
  narrativeEl.textContent = t || '…';
  narrativeEl.classList.remove('pop');
  void narrativeEl.offsetWidth;
  narrativeEl.classList.add('pop');
}
function setObstacles(list) {
  obstaclesEl.textContent = '';
  (list || []).slice(0, 4).forEach((o) => {
    const c = document.createElement('span');
    c.className = 'obstacle';
    c.textContent = 'watch out: ' + o;
    obstaclesEl.appendChild(c);
  });
}
function setChoices(list) {
  choicesEl.textContent = '';
  (list || []).slice(0, 4).forEach((c) => {
    const b = document.createElement('button');
    b.className = 'choice'; b.type = 'button'; b.textContent = c;
    b.addEventListener('click', () => { wordInput.value = c; hideDym(); takeTurn(c); });
    choicesEl.appendChild(b);
  });
}
function hideDym() { dymEl.hidden = true; }
function showDym(word) {
  dymBtn.textContent = word; dymBtn.dataset.word = word;
  dymEl.hidden = false;
}
/* goal bar: smooth (CSS transition) + monotonic-ish — a fail beat may
   dip the fill a touch, but it never teleports backwards */
function setGoal(p, hard) {
  heroProgress = clamp(p, 0, 1);
  if (hard) goalShown = heroProgress;
  else goalShown = heroProgress > goalShown
    ? heroProgress
    : Math.max(heroProgress, goalShown - 0.06);
  goalFill.style.width = (goalShown * 100).toFixed(1) + '%';
  goalPig.style.left = (goalShown * 100).toFixed(1) + '%';
}
function setLine(t) { lineChip.textContent = t; }
function latShow(txt, off) {
  msChip.hidden = false;
  msChip.textContent = txt;
  msChip.classList.toggle('off', !!off);
}
function latHideSoon() { setTimeout(() => { if (!busy) msChip.hidden = true; }, 4200); }
function setInputsEnabled(on) { wordInput.disabled = !on; goBtn.disabled = !on; }

const NOT_KIND = /(?:^|[^a-z])(damn|hell|stupid|idiot|dumb|shut up|hate you|kill|die|poop|fart|butt|ugly)(?:[^a-z]|$)/i;
function kindCheck(word) {
  if (NOT_KIND.test(word)) {
    coach("Hmm — let's keep our story words kind and silly!");
    wordInput.value = '';
    return false;
  }
  return true;
}

/* ---------- one turn through the real story master ---------- */
async function takeTurn(word) {
  word = String(word || '').trim();
  if (!started) return;
  if (busy) {
    /* a word typed mid-transition queues (one deep) instead of dying */
    if (word && pendingWord == null && kindCheck(word)) {
      pendingWord = word;
      wordInput.value = '';
      coach('One thing at a time — "' + word + '" goes next!');
    }
    return;
  }
  if (!word) { coach('Type a little word first — try "straw" or "run"!'); return; }
  if (!kindCheck(word)) return;
  const ep = epoch;
  busy = true;
  setInputsEnabled(false);
  hideDym();
  wordInput.value = '';
  latShow('story master is thinking…');
  setLine('The diorama listens…');

  try { await llm.waitForHeadroom(4, 8000); } catch { /* proceed anyway */ }
  if (ep !== epoch) { busy = false; return; }

  let gm = null;
  try {
    gm = await llm.next({ goal: GOAL, history, playerText: word, hero: heroDesc });
  } catch (e) { gm = null; }
  if (ep !== epoch) { busy = false; return; }
  if (!gm) { msChip.hidden = true; setInputsEnabled(true); busy = false; return; }

  const meta = gm._meta || {};
  const ms = meta.ms || 0;
  if (meta.source === 'offline') {
    latShow('demo mode — offline narrator', true);
  } else {
    const who = meta.mode === 'local' ? 'local model' : 'GLM';
    latShow(`${who} answered in ${(ms / 1000).toFixed(1)}s`);
    latHist.push(ms);
  }
  console.log('[06-zdog] turn', meta.source || '?', ms + 'ms', 'goal=' + gm.goal_progress);
  latHideSoon();

  setNarrative(gm.narrative);
  setLine(gm.narrative.length > 90 ? gm.narrative.slice(0, 88) + '…' : gm.narrative);
  setObstacles(gm.obstacles);
  setChoices(gm.choices);
  history.push(`"${word}" -> ${gm.narrative}`.slice(0, 160));
  wordLog.push({ word, silly: !gm.success });

  if (gm.did_you_mean) showDym(gm.did_you_mean);
  else if (!gm.success && wordLike(word)) {
    const g = localGuess(word);
    if (g && g !== word.toLowerCase()) showDym(g);
  }

  /* HUD + hero start moving first — the kid reads while the lazy
     susan spins a stretch forward into the freshly-seeded scene */
  setGoal(gm.goal_progress);
  setHeroX(heroX());
  if (!demoOn) setInputsEnabled(true);         // typing mid-travel queues
  await travelSpin(gm.scene_seed, ep);
  if (ep !== epoch) { busy = false; return; }

  /* typed props drop onto the turntable, then do their gag */
  const gags = [];
  (gm.props || []).forEach((p, i) => {
    const a = (p.action || 'spawn').toLowerCase();
    if (a === 'remove') removeProp(p.kind);
    else if (a === 'react')
      setTimeout(() => { if (okEp(ep)) reactProp(p.kind); }, 260 + i * 150);
    else {
      const rec = spawnProp(p.kind, p.x ?? 0.6, { delay: i * 140 });
      if (rec.rideable) gags.push(() => heroRide(rec));
      else if (rec.slippery || !gm.success) gags.push(heroSlip);
    }
  });
  if (!gm.success && !gags.length && /slip|trip|bonk|splat|oops|fell/i.test(gm.narrative))
    gags.push(heroSlip);
  gags.forEach((fn, i) => setTimeout(() => { if (okEp(ep)) fn(); }, 750 + i * 900));

  /* wolf pressure — a huff shakes the toy and blows the models */
  const wolfy = /wolf|huff|puff|blow/i.test(
    gm.narrative + ' ' + (gm.obstacles || []).join(' '));
  const meter = wolf.meter + (gm.success ? -0.07 : 0.1) + (wolfy ? 0.16 : 0.045);
  setWolfMeter(meter);
  if (wolfy || wolf.meter >= 0.95) {
    huff(wolf.meter >= 0.9 ? 2 : 1);
    if (wolf.meter >= 0.95) setWolfMeter(0.45);
  } else {
    liveProps.forEach((p, i) => setTimeout(
      () => spring(-0.07, 0, (v) => { p.inner.rotate.z = v; }, { k: 0.2, d: 0.4 }), i * 60));
  }

  if (heroProgress >= 0.985 && !liveProps.some((p) => p.pkind === 'brickhouse'))
    spawnProp('brick house', 0.88);

  busy = false;
  if (pendingWord && ep === epoch) {
    const w = pendingWord; pendingWord = null;
    return takeTurn(w);
  }
  if (!demoOn) setInputsEnabled(true);
  if (heroProgress >= 1) setTimeout(() => { if (ep === epoch) showEnd(); }, 1500);
  wordInput.focus({ preventScroll: true });
}
function submitWord() { if (started) takeTurn(wordInput.value); }

/* ---------- start / end ---------- */
function startStory() {
  epoch++;
  started = true;
  history = []; wordLog = [];
  huffCount = 0; pendingWord = null;
  setGoal(0, true);
  setWolfMeter(0.1);
  clearProps();
  heroAnchor.translate.x = -105;
  springs.clear();                                        // no stale anims
  heroBob.translate.y = 0; heroBob.rotate.z = 0; heroBob.rotate.y = 0;
  heroBob.scale = { x: 1, y: 1, z: 1 }; heroFace.rotate.z = 0;
  starOrbit.visible = false;
  slipping = false; riding = false; heroWalking = false;
  traveling = false; heroHeld = false;
  makerOv.classList.remove('show');
  setTimeout(() => { makerOv.hidden = true; }, 320);
  setNarrative('Off we go! The three little pigs point down the path…');
  setLine('The diorama spins up — type a word to play!');
  setObstacles([]);
  setChoices(['gather straw', 'find sticks', 'look for bricks']);
  coach('Type a word — what should the hero do first?');
  setInputsEnabled(true);
  renderScene({ biome: 'meadow', seed: 20260, palette: 'warm', props: ['flower', 'tree'] });
  /* the standee drops onto the spinning disc with a bounce, then a hop */
  heroHeld = true;
  heroBob.translate.y = -175;
  spring(-175, 0, (v) => { heroBob.translate.y = v; },
    { k: 0.11, d: 0.55, tag: 'herodrop', done: () => {
      heroHeld = false;
      if (started && !slipping && !riding) heroHop();
    } });
  wordInput.focus({ preventScroll: true });
}
function showEnd() {
  setInputsEnabled(false);
  winTitle.textContent = 'Your hero made it to the brick house!';
  recapEl.textContent = `Your hero needed ${wordLog.length} words — ` +
    `${huffCount} huff${huffCount === 1 ? '' : 's'} and puff${huffCount === 1 ? '' : 's'} ` +
    `survived: ${wordLog.map((w) => w.word).join(', ')}`;
  endOv.hidden = false;
  requestAnimationFrame(() => endOv.classList.add('show'));
  huff(1);
}
function resetToMaker() {
  epoch++;
  demoOn = false; busy = false; started = false;
  pendingWord = null;
  stopBtn.hidden = true;
  endOv.classList.remove('show'); endOv.hidden = true;
  clearProps();
  setGoal(0, true); setWolfMeter(0);
  springs.clear();
  heroBob.translate.y = 0; heroBob.rotate.z = 0; heroBob.rotate.y = 0;
  heroBob.scale = { x: 1, y: 1, z: 1 }; heroFace.rotate.z = 0;
  starOrbit.visible = false;
  slipping = false; riding = false; heroWalking = false;
  traveling = false; heroHeld = false;
  empty(heroFace); heroReady = false;
  setNarrative('Once upon a time, three little pigs needed a hero…');
  setLine('Draw your hero to begin!');
  setObstacles([]); setChoices([]);
  coach('Draw your hero first — the crayons are waiting!');
  setInputsEnabled(false);
  makerOv.hidden = false;
  requestAnimationFrame(() => makerOv.classList.add('show'));
  requestAnimationFrame(sizeMaker);
}

/* ---------- Watch it play: the REAL run ---------- */
const DEMO_WORDS = ['straw', 'sticks', 'unicorn', 'banana peel', 'bricks', 'brick house', 'hide inside', 'into the brick house'];
async function runDemo() {
  const ep = epoch;
  try {
    for (const word of DEMO_WORDS) {
      if (ep !== epoch || !demoOn) return;
      wordInput.value = '';
      for (const ch of word) {
        if (ep !== epoch || !demoOn) return;
        wordInput.value += ch;
        await sleep(110 + Math.random() * 120);
      }
      await sleep(380);
      if (ep !== epoch || !demoOn) return;
      await takeTurn(word);
      while (busy && ep === epoch && demoOn) await sleep(160);
      if (ep !== epoch || !demoOn) return;
      await sleep(650);
    }
  } finally {
    if (ep === epoch) { demoOn = false; stopBtn.hidden = true; setInputsEnabled(started); }
  }
}
async function startDemo() {
  epoch++;
  const ep = epoch;
  demoOn = true;
  stopBtn.hidden = false;
  clearProps();
  history = []; wordLog = []; huffCount = 0; pendingWord = null;
  endOv.classList.remove('show'); endOv.hidden = true;
  makerOv.hidden = false;
  makerOv.classList.add('show');
  setInputsEnabled(false);
  coach('The show paints a hero first…');
  await sleep(300);
  await surpriseMe(true);
  if (ep !== epoch || !demoOn) return;
  buildHero();
  await sleep(500);
  if (ep !== epoch || !demoOn) return;
  startStory();
  await sleep(400);
  runDemo();
}
function stopDemo() {
  if (!demoOn) return;
  epoch++;
  demoOn = false;
  pendingWord = null;
  stopBtn.hidden = true;
  makerBusy = false;
  heroWalking = false; slipping = false; riding = false;
  starOrbit.visible = false;
  if (makerOv.classList.contains('show')) return;
  busy = false;
  setInputsEnabled(started);
  coach('You take over — type a word!');
}
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;

/* ============================================================
   THE RENDER LOOP — spin the susan, breathe the world
   ============================================================ */
let lastT = performance.now();
function tick(now) {
  const dt = Math.min(64, now - lastT);
  lastT = now;
  updateSprings(dt);

  /* the lazy susan — always slowly turning */
  spin.rotate.y += dt * 0.00009;
  /* camera stays sane */
  illo.rotate.x = clamp(illo.rotate.x, -0.95, -0.16);
  illo.rotate.y = clamp(illo.rotate.y, -1.2, 1.2);
  /* huff shake decays */
  if (shake > 0.01) {
    illo.rotate.z = Math.sin(now * 0.05) * 0.012 * shake;
    shake *= Math.pow(0.94, dt / 16);
  } else { illo.rotate.z = 0; shake = 0; }

  /* standee + wolf swivel to face the camera while the world orbits */
  heroFace.rotate.y = -illo.rotate.y;
  wolfFace.rotate.y = -illo.rotate.y;
  starOrbit.rotate.y = -illo.rotate.y;
  if (starOrbit.visible) starOrbit.rotate.z += dt * 0.02;

  /* hero idle bob / walk bounce (not while a gag owns the standee) */
  if (!slipping && !riding && !heroHeld) {
    const amp = heroWalking ? 9 : 2.6;
    const spd = heroWalking ? 0.022 : 0.004;
    heroBob.translate.y = -Math.abs(Math.sin(now * spd)) * amp;
    heroBob.rotate.z = Math.sin(now * spd) * (heroWalking ? 0.08 : 0.03);
  }
  heroShadow.scale = 1 + Math.abs(heroBob.translate.y) * 0.006;

  /* wolf breathing */
  wolfBob.translate.y = Math.sin(now * 0.0034) * 3;

  /* clouds drift and wrap in camera space */
  for (const c of skyBits.clouds) {
    c.translate.x += (c.userData.drift * dt) / 1000;
    if (c.translate.x > 320) c.translate.x = -320;
  }
  /* rain falls */
  for (const d of skyBits.drops) {
    d.translate.y += (d.userData.v * dt) / 1000;
    if (d.translate.y > 60) d.translate.y = -170 - Math.random() * 40;
  }
  if (skyBits.bolt) skyBits.bolt.visible = Math.sin(now * 0.004) > -0.6;

  illo.updateRenderGraph();

  /* doodad name tags ride along with their props (DOM overlay).
     renderOrigin is in unzoomed illo units, centered — ×zoom → css px. */
  const zm = illo.zoom;
  for (const p of liveProps) {
    if (!p.label) continue;
    const depth = Math.cos(p.ang + spin.rotate.y) * p.rad;   // +front / −behind
    const sc = scaleOf(p.anchor);
    if (depth < -20 || sc < 0.3) { p.label.style.display = 'none'; continue; }
    p.label.style.display = '';
    const ro = p.anchor.renderOrigin;
    p.label.style.left = (W / 2 + ro.x * zm) + 'px';
    p.label.style.top = (H / 2 + (ro.y - 52) * zm) + 'px';
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   EVENTS + SIZING
   ============================================================ */
makerCv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  makerCv.setPointerCapture(e.pointerId);
  curStroke = { c: selColor, w: 13, pts: [makerPos(e)], closed: false };
});
makerCv.addEventListener('pointermove', (e) => {
  if (!curStroke) return;
  const [x, y] = makerPos(e);
  const p = curStroke.pts, l = p[p.length - 1];
  if (Math.hypot(x - l[0], y - l[1]) < 3) return;
  p.push([x, y]);
  renderMaker();
});
function endStroke() {
  if (!curStroke) return;
  const p = curStroke.pts;
  if (p.length > 6) {
    const [x0, y0] = p[0], [x1, y1] = p[p.length - 1];
    if (Math.hypot(x1 - x0, y1 - y0) < 20) curStroke.closed = true;
  }
  strokes.push(curStroke);
  curStroke = null;
  renderMaker();
}
makerCv.addEventListener('pointerup', endStroke);
makerCv.addEventListener('pointercancel', endStroke);

CRAYONS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === 1 ? ' sel' : '');
  b.style.background = c; b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', 'crayon ' + (i + 1));
  b.addEventListener('click', () => {
    selColor = c;
    swatchBox.querySelectorAll('.swatch').forEach((s) => s.classList.remove('sel'));
    b.classList.add('sel');
  });
  swatchBox.appendChild(b);
});

clearBtn.addEventListener('click', clearMaker);
surpriseBtn.addEventListener('click', () => surpriseMe(false));
doneBtn.addEventListener('click', () => {
  if (makerBusy) return;
  if (!buildHero()) {
    coach('Draw a hero first — or press "Surprise me"!');
    makerCv.classList.remove('nope');
    void makerCv.offsetWidth;
    makerCv.classList.add('nope');
    return;
  }
  startStory();
});
goBtn.addEventListener('click', submitWord);
wordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
});
wordInput.addEventListener('input', hideDym);
document.addEventListener('keydown', (e) => {
  if (demoOn || e.metaKey || e.ctrlKey || e.altKey) return;
  if (started && makerOv.hidden && !makerOv.classList.contains('show') &&
      document.activeElement !== wordInput && /^[a-zA-Z ]$/.test(e.key))
    wordInput.focus({ preventScroll: true });
});
dymBtn.addEventListener('click', () => {
  wordInput.value = dymBtn.dataset.word;
  hideDym();
  takeTurn(dymBtn.dataset.word);
});
watchBtn.addEventListener('click', startDemo);
watchAgain.addEventListener('click', startDemo);
againBtn.addEventListener('click', () => { clearMaker(); resetToMaker(); });
stopBtn.addEventListener('click', stopDemo);

function resize() {
  W = stage.clientWidth || 800;
  H = stage.clientHeight || 400;
  illo.setSize(W, H);
  illo.zoom = clamp(Math.min(W / 560, H / 400), 0.55, 1.4);
}
let rsz;
window.addEventListener('resize', () => {
  clearTimeout(rsz);
  rsz = setTimeout(() => { resize(); sizeMaker(); }, 160);
});

/* ---------- init ---------- */
resize();
renderScene(curSeed);
requestAnimationFrame(sizeMaker);
requestAnimationFrame(tick);
window.__lat = latHist;      // for the README latency report
/* tiny debug/verification hooks (harmless in production) */
window.__props = () => liveProps.length;
window.__spin = () => spin.rotate.y;
window.__trav = () => traveling;
window.__heroY = () => heroBob.translate.y;
window.__heroRO = () => ({ x: heroAnchor.renderOrigin.x, y: heroAnchor.renderOrigin.y });
window.__zoom = () => illo.zoom;
window.__spawn = (k, x) => spawnProp(k, x ?? 0.5);

/* ?watch=1 auto-starts the show (dashboard + self-test hook) */
if (new URLSearchParams(location.search).has('watch'))
  setTimeout(() => { if (!started) startDemo(); }, 900);
