/* ============================================================
   The Three Little Pigs · PixiJS WebGL edition — app.js
   Engine: PixiJS v8 (vendored, MIT — https://pixijs.com)

   The gimmick: EVERY crayon doodle becomes a GPU sprite.
   - world.js renders each LLM scene_seed once into an offscreen
     canvas → PIXI.Texture → background sprite. Two seeded frames
     per scene swap on a timer so the whole world "boils" like a
     living sketch — the swap is pure GPU texture assignment.
   - props.js rough.js defs bake into tiny canvases → prop
     sprites with springy pop-in, wiggle, and 2-frame boil.
   - the kid's hero drawing bakes into a sprite that walks,
     rides, slips, and gets dizzy — all on the graphics card.
   Story beats come from the REAL LLM through ../shared/llm.js.
   ============================================================ */
'use strict';
(function () {

/* ---------- element handles ---------- */
const $ = (id) => document.getElementById(id);
const stage    = $('stage');
const gpuOff   = $('gpuOff');
const modeChip = $('modeChip');
const latChip  = $('latChip');
const watchBtn2= $('watchBtn2');
const stopBtn  = $('stopBtn');
const makerOv  = $('makerOverlay');
const makerCv  = $('makerCv');
const swatchBox= $('swatches');
const heroName = $('heroName');
const doneBtn  = $('doneBtn');
const surpriseBtn = $('surpriseBtn');
const clearBtn = $('clearBtn');
const watchBtn = $('watchBtn');
const endOv    = $('endOverlay');
const endTitle = $('endTitle');
const endBlurb = $('endBlurb');
const recap    = $('recap');
const slipsEl  = $('slips');
const againBtn = $('againBtn');
const watchAgain = $('watchAgainBtn');
const goalFill = $('goalFill');
const wolfTrack= $('wolfTrack');
const wolfLabel= $('wolfLabel');
const narrEl   = $('narrative');
const obRow    = $('obstacles');
const blank    = $('blank');
const underSvg = $('underSvg');
const goBtn    = $('goBtn');
const choicesEl= $('choices');
const coachEl  = $('coach');
const dymEl    = $('dym');
const dymBtn   = $('dymBtn');
const tapType  = $('tapType');

const GOAL = 'The Three Little Pigs — help the pig friends gather ' +
  'materials, build houses, and reach the strong brick house before ' +
  'the Big Bad Wolf huffs and puffs.';

const VW = 960, VH = 540;                 /* internal stage space */
let GY = VH - 92;                          /* ground line (from world.js) */

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);

/* ============================================================
   BOOT — WebGL or bust (bust = show the friendly warning card)
   ============================================================ */
let app = null;
let worldC, panC, bgC, propC, wolfC, heroC, heroIn, gearC, dizzyC, fxC;
const okEp = (ep) => ep === S.epoch;

function gpuFail(msg) {
  gpuOff.hidden = false;
  gpuOff.style.display = 'flex';           /* .gpuoff{display:flex} beats [hidden] */
  narrEl.textContent = msg || 'This build needs WebGL — the crayons could not start.';
}

async function boot() {
  if (!window.PIXI)  { gpuFail('PixiJS did not load — check vendor/pixi.min.js.'); return; }
  if (!window.rough) { gpuFail('rough.js did not load — check vendor/rough.js.'); return; }
  if (!window.StoryLLM || !window.WorldScene || !window.PROPDEF) {
    gpuFail('A game file did not load — check props.js / world.js / ../shared/llm.js.');
    return;
  }

  app = new PIXI.Application();
  try {
    await app.init({
      width: VW, height: VH,
      antialias: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    });
  } catch (e) {
    gpuFail('WebGL is blocked in this browser — the crayons need a GPU. ' +
            'Try the flagship canvas build instead.');
    return;
  }
  if (!app.renderer || !app.canvas) { gpuFail(); return; }

  /* success — keep the warning card hidden for good */
  gpuOff.hidden = true;
  gpuOff.style.display = 'none';
  stage.insertBefore(app.canvas, stage.firstChild);

  /* ---------- layer stack (all GPU sprites) ---------- */
  worldC = new PIXI.Container();           /* huff & puff squashes+shakes THIS */
  panC   = new PIXI.Container();           /* the world strip — slides left, one */
  bgC    = new PIXI.Container();           /*   baked page per scene_seed        */
  propC  = new PIXI.Container();           /* props live ON their strip page     */
  wolfC  = new PIXI.Container();           /* the Big Bad Wolf sprite (screen)   */
  heroC  = new PIXI.Container();           /* hero position (screen)             */
  heroIn = new PIXI.Container();           /* hero squash / spin / bob */
  gearC  = new PIXI.Container();           /* worn props ride the hero */
  dizzyC = new PIXI.Container();           /* orbiting dizzy stars */
  fxC    = new PIXI.Container();           /* puffs, stars, weather (screen) */
  panC.addChild(bgC, propC);               /* bg + props scroll together */
  worldC.addChild(panC, wolfC, heroC, fxC);
  worldC.pivot.set(VW / 2, GY);
  worldC.position.set(VW / 2, GY);
  heroC.addChild(heroIn);
  heroIn.addChild(gearC);
  heroIn.addChild(dizzyC);
  app.stage.addChild(worldC);

  /* squash origin must track the real ground line */
  worldC.pivot.y = GY; worldC.position.y = GY;
  heroC.position.set(84, GY);
  wolfC.position.set(VW + 90, GY + 4);
  dizzyC.visible = false;
  setInputsEnabled(false);

  buildWolf();
  bakeScene({ biome: 'meadow', seed: S.sceneSeed, palette: 'warm', props: ['flower'] });
  app.ticker.add(tick);
  initMaker();
  setWolf(S.wolf); setGoal(0);
  modeChip.textContent = 'draw your hero!';
  narrEl.textContent = 'Draw your hero to open the storybook…';
  /* deep-link / headless hook: open with #watch to auto-run the show */
  if (/#watch/.test(location.hash)) startDemo();
}

/* ============================================================
   GAME STATE
   ============================================================ */
const S = {
  started: false, busy: false, epoch: 0, demoOn: false, ended: false,
  history: [], words: [], slips: 0, pigs: 0,
  goal: 0, wolf: 0.14, heroX: 84, heroH: 96,
  propSeq: 0, props: new Map(), ambient: [],
  buildStage: 0, house: null, riding: null, gear: [],
  sceneSeed: ((Math.random() * 0x7ffffffe) | 0) + 1,
  particles: [], slipping: false, walking: false,
  pageBase: 0,          /* strip-x where the current scene page sits */
  traveling: false,     /* true while the strip pans to the next stretch */
  lift: 0, vy: 0,       /* hero hop/slip physics (px above ground, px/s) */
  queued: null,         /* a word typed mid-turn — plays next */
};

const rngOf = (seed) => window.RH.mulberry32((seed | 0) || 1);

/* ============================================================
   SPRINGS — one tiny system drives every tween on the GPU side
   ============================================================ */
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
    /* a spring can outlive its sprite (poof / cull / stage reset) —
       if the node is gone, retire the spring instead of throwing */
    try { s.apply(s.x); } catch (e) { springs.delete(s); continue; }
    if (Math.abs(s.v) < 0.001 && Math.abs(s.t - s.x) < 0.001) {
      springs.delete(s);
      try { s.apply(s.t); } catch (e) { /* already culled */ }
      try { if (s.done) s.done(); } catch (e) { /* already culled */ }
    }
  }
}

/* ============================================================
   BAKING — rough.js canvases → PIXI textures (the whole trick)
   ============================================================ */
function bakePropFrames(rawKind, seedBase) {
  const res = window.resolveKind(rawKind);
  const def = window.PROPDEF[res.def] || window.PROPDEF.doodle;
  const frames = [];
  for (let k = 0; k < 2; k++) {                 /* two jittered frames = boil */
    const cv = document.createElement('canvas');
    const dpr = 1.6;
    cv.width  = Math.max(2, Math.ceil(def.w * dpr));
    cv.height = Math.max(2, Math.ceil(def.h * dpr));
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rc = rough.canvas(cv);
    const r = rngOf(((window.RH.hashStr(res.word) ^ seedBase) + k * 104729) >>> 0);
    def.draw(rc, def.w, def.h, r, res.word);
    frames.push(PIXI.Texture.from(cv));
  }
  return { res, def, frames };
}
function freeFrames(fr) { for (const t of (fr || [])) t.destroy(true); }

/* small shared doodads (puffs / stars / straw / rain) baked once */
const PTEX = {};
function doodadTex(name, painter) {
  if (PTEX[name]) return PTEX[name];
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const rc = rough.canvas(cv);
  painter(rc, rngOf(window.RH.hashStr(name)));
  PTEX[name] = PIXI.Texture.from(cv);
  return PTEX[name];
}
const puffTex  = () => doodadTex('puff', (rc, r) => {
  rc.ellipse(32, 34, 46, 26, window.RH.PO(r, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2.4 }));
  rc.ellipse(22, 38, 24, 16, window.RH.PO(r, { fill: '#FFFDF6', fillStyle: 'solid', stroke: 'none' }));
});
const starTex  = () => doodadTex('star', (rc, r) => {
  rc.polygon(window.RH.starPts(32, 32, 22, 8, 5, -Math.PI / 2),
    window.RH.PO(r, { fill: '#FFC53D', fillStyle: 'solid', strokeWidth: 2 }));
});
const strawTex = () => doodadTex('straw', (rc, r) => {
  rc.line(10, 32, 54, 30, window.RH.PO(r, { stroke: '#E8B93F', strokeWidth: 7, roughness: 2.8 }));
  rc.line(16, 26, 48, 38, window.RH.PO(r, { stroke: '#F2D488', strokeWidth: 4, roughness: 3 }));
});
const rainTex  = () => doodadTex('rain', (rc, r) => {
  rc.line(34, 6, 22, 58, window.RH.PO(r, { stroke: '#7FB8E8', strokeWidth: 4.4, roughness: 1.6 }));
});
const snowTex  = () => doodadTex('snow', (rc, r) => {
  rc.circle(32, 32, 13, window.RH.PO(r, { fill: '#FFFDF6', fillStyle: 'solid', stroke: 'none' }));
});
const flyTex   = () => doodadTex('fly', (rc, r) => {
  rc.circle(32, 32, 9, window.RH.PO(r, { fill: '#E8F75E', fillStyle: 'solid', stroke: 'none' }));
  rc.circle(32, 32, 20, window.RH.PO(r, { stroke: '#E8F75E', strokeWidth: 1.4, roughness: 3 }));
});
const leafTex  = () => doodadTex('leaf', (rc, r) => {
  rc.ellipse(32, 32, 24, 12, window.RH.PO(r, { fill: '#4FB06D', fillStyle: 'solid', strokeWidth: 1.8 }));
});

/* ============================================================
   THE SCENE — one long crayon strip, not a stage that repaints.
   Each scene_seed bakes a fresh PAGE laid at the right end of the
   strip; the whole strip then pans left while the hero walks, so
   every turn reads as the NEXT stretch of the journey (POLISH §1).
   ============================================================ */
let pages = [];            /* [{node, frames}] — page i sits at strip x = i*VW */
let bgPair = null;         /* newest page — the one that boils */
let panX = 0;              /* how far the strip has slid left (world px) */

function bakeScene(ss) {
  let seed = (ss && (ss.seed | 0)) || (S.sceneSeed + 977);
  if (seed === S.sceneSeed) seed += 977;   /* a repeat seed still = new ground */
  S.sceneSeed = seed;
  const texs = [], info = { gy: VH - 92 };
  for (let k = 0; k < 2; k++) {
    const cv = document.createElement('canvas');
    const got = window.WorldScene.render(cv,
      Object.assign({}, ss, { seed: seed + k * 65537 }), VW, VH);
    Object.assign(info, got);
    texs.push(PIXI.Texture.from(cv));
  }
  GY = info.gy || (VH - 92);
  worldC.pivot.y = GY;

  const node = new PIXI.Container();
  const sprA = new PIXI.Sprite(texs[0]);
  const sprB = new PIXI.Sprite(texs[1]);
  sprA.width = sprB.width = VW;
  sprA.height = sprB.height = VH;
  sprB.alpha = 0;
  node.addChild(sprA, sprB);

  const first = pages.length === 0;
  if (first) {
    S.pageBase = 0; panX = 0; panC.x = 0;
    node.x = 0; node.alpha = 0;
  } else {
    S.pageBase += VW;
    node.x = S.pageBase;                   /* appended at the right edge */
  }
  bgC.addChild(node);
  bgPair = { node, frames: texs, flip: 0 };
  pages.push(bgPair);

  /* the ever-building house + the mount you're riding travel along to
     the new stretch; every other prop is left behind on its own page
     and culled once the pan lands (the journey moves FORWARD) */
  if (S.house) { S.house.node.x = S.pageBase + HOUSEX; S.house.x = S.house.node.x; }

  setWeather(info);
  placeAllProps();

  if (first) {
    /* boot / reset: simply bloom the first page in */
    spring(0, 1, (v) => { node.alpha = v; }, { k: 0.14, d: 0.72 });
  } else {
    panTo(S.pageBase);
  }
}

/* the travel itself: a ~1.1s glide of the whole strip — the hero's
   walk bob plays the whole way (S.traveling keeps it lit in tick) */
function panTo(target) {
  S.traveling = true;
  killTag('panx');
  const d = Math.abs(target - panX);
  spring(panX, target, (v) => { panX = v; panC.x = -v; }, {
    k: 0.07, d: 0.66, tag: 'panx',
    done: () => { S.traveling = false; cullLeft(); } });
  setTimeout(() => { S.traveling = false; }, Math.min(1500, 420 + d * 0.9));
}

/* the journey leaves things behind — once the pan lands, drop pages
   and props that scrolled fully off the left edge */
function cullLeft() {
  for (let i = pages.length - 1; i >= 0; i--) {
    const pg = pages[i];
    if (pg === bgPair) continue;
    if (pg.node.x + VW <= panX + 4) {
      bgC.removeChild(pg.node);
      pg.node.destroy({ children: true });
      freeFrames(pg.frames);
      pages.splice(i, 1);
    }
  }
  for (const [id, p] of [...S.props]) {
    if (p.worn || p === S.house || p === S.riding || S.gear.includes(p)) continue;
    if (p.node.x < panX - 130) poofProp(id);
  }
}

/* back to the start of the strip — used by reset + the watch run */
function resetWorld() {
  killTag('panx');
  for (const pg of pages) {
    bgC.removeChild(pg.node);
    pg.node.destroy({ children: true });
    freeFrames(pg.frames);
  }
  pages = []; bgPair = null;
  S.pageBase = 0; panX = 0; panC.x = 0; S.traveling = false;
}

/* keep prop sprites glued to the (possibly new) ground line —
   heroC.y and wolfC.y are owned by the ticker (gravity + breath) */
function placeAllProps() {
  for (const [, p] of S.props) if (!p.worn) p.node.y = GY + (p.cat === 'splashy' ? 12 : 4);
  if (S.house) S.house.node.y = GY + 8;
}

/* ============================================================
   WEATHER — tiny sprite blizzards, all GPU
   ============================================================ */
function setWeather(info) {
  for (const p of S.particles) { fxC.removeChild(p.spr); p.spr.destroy(); }
  S.particles = [];
  const mk = (tex, n, init) => {
    for (let i = 0; i < n; i++) {
      const spr = new PIXI.Sprite(tex);
      spr.anchor.set(0.5);
      const p = { spr, vx: 0, vy: 0, vr: 0 };
      init(p, true);
      fxC.addChild(spr);
      S.particles.push(p);
    }
  };
  if (info.rain) {
    mk(rainTex(), 22, (p, first) => {
      p.spr.position.set(Math.random() * VW, first ? Math.random() * VH : -30);
      p.spr.rotation = -0.16; p.vx = -60; p.vy = 560 + Math.random() * 160;
      p.wrap = (p) => { if (p.spr.y > VH + 30) { p.spr.y = -30; p.spr.x = Math.random() * (VW + 80); } };
    });
  } else if (info.snow) {
    mk(snowTex(), 24, (p, first) => {
      p.spr.position.set(Math.random() * VW, first ? Math.random() * VH : -20);
      p.spr.scale.set(0.5 + Math.random() * 0.5);
      p.vx = -14 - Math.random() * 20; p.vy = 26 + Math.random() * 30;
      p.ph = Math.random() * 7;
      p.wrap = (p) => { if (p.spr.y > VH + 16) { p.spr.y = -16; p.spr.x = Math.random() * (VW + 60); } };
    });
  } else if (info.dark) {
    mk(flyTex(), 9, (p) => {
      p.spr.position.set(60 + Math.random() * (VW - 120), 120 + Math.random() * (GY - 200));
      p.ph = Math.random() * 7; p.firefly = true;
    });
  } else if (info.leaves) {
    mk(leafTex(), 8, (p, first) => {
      p.spr.position.set(Math.random() * VW, first ? Math.random() * GY : -20);
      p.spr.scale.set(0.55);
      p.vx = 30 + Math.random() * 36; p.vy = 16 + Math.random() * 18; p.vr = 1 + Math.random();
      p.wrap = (p) => { if (p.spr.x > VW + 30) p.spr.x = -30; if (p.spr.y > GY + 40) p.spr.y = -20; };
    });
  }
}

/* ============================================================
   PROPS — each one a bottom-anchored sprite with a wiggle
   ============================================================ */
function propScale(def) { return Math.min(1.18, 205 / def.h, 275 / def.w); }

function spawnProp(rawKind, xFrac, o = {}) {
  const { res, def, frames } = bakePropFrames(rawKind, S.sceneSeed + (++S.propSeq * 31));
  const node = new PIXI.Container();
  const spr = new PIXI.Sprite(frames[0]);
  spr.anchor.set(0.5, 1);
  node.addChild(spr);
  /* props anchor to the CURRENT strip page (world coords) — during a
     pan they ride in from the right with the rest of the new stretch */
  const x = S.pageBase + 40 + clamp01(xFrac == null ? 0.5 : xFrac) * (VW - 80);
  node.position.set(x, GY + (def.cat === 'splashy' ? 12 : 4));
  propC.addChild(node);

  const rec = {
    id: 'prop-' + S.propSeq, node, spr, def, cat: def.cat,
    raw: res.word, kind: res.def, x, frames,
    sx: res.def === 'wolf' ? -1 : 1,            /* the wolf faces the pigs */
    ph: Math.random() * 7, wiggle: def.cat === 'structure' ? 0.4 : 1,
    base: propScale(def),
  };
  S.props.set(rec.id, rec);

  /* springy pop-in + a little drop from the sky */
  spring(0.001, rec.base, (v) => { spr.scale.set(v * rec.sx, Math.abs(v)); }, { k: 0.16, d: 0.55 });
  if (!o.quiet) spring(-30, 0, (v) => { spr.y = v; }, { k: 0.14, d: 0.6 });

  /* keep the stage tidy */
  if (S.props.size > 14) {
    for (const [oid, p] of S.props) {
      if (p === S.riding || p.worn || p === S.house || S.gear.includes(p)) continue;
      poofProp(oid); break;
    }
  }
  return rec;
}
function findProp(rawKind) {
  const def = window.resolveKind(rawKind).def;
  for (const [id, p] of S.props) if (p.kind === def) return id;
  return null;
}
function poofProp(id) {
  const p = S.props.get(id);
  if (!p) return;
  S.props.delete(id);
  if (S.riding === p) S.riding = null;
  if (S.house === p) S.house = null;
  S.gear = S.gear.filter(g => g !== p);
  const ptag = 'poof-' + id;
  spring(p.spr.scale.y, 0.001, (v) => { p.spr.scale.set(v * p.sx, Math.abs(v)); }, { k: 0.18, d: 0.7, tag: ptag });
  spring(1, 0, (v) => { p.spr.alpha = v; }, {
    k: 0.2, d: 0.7, tag: ptag,
    done: () => {
      killTag(ptag);                  /* retire the sibling scale spring */
      if (p.node.parent) p.node.parent.removeChild(p.node);
      p.node.destroy({ children: true });
      p.spr = null;
      freeFrames(p.frames);
    },
  });
}
function reactProp(id) {
  const p = S.props.get(id);
  if (!p) return;
  spring(-0.32, 0, (v) => { p.node.rotation = v; }, { k: 0.2, d: 0.42 });
}

/* ============================================================
   THE HOUSE PLOT — straw → sticks → brick at the right edge
   ============================================================ */
const HOUSEX = VW * 0.84;
function setBuild(stageN) {
  S.buildStage = Math.max(0, Math.min(3, stageN));
  if (S.house) { const h = S.house; S.house = null; poofProp(h.id); }
  if (!S.buildStage) return;
  const kind = { 1: 'straw house', 2: 'stick house', 3: 'brick house' }[S.buildStage];
  const h = spawnProp(kind, 0, { quiet: true });
  h.node.x = S.pageBase + HOUSEX;          /* house plot on the current page */
  h.x = h.node.x;
  h.base = Math.min(0.95, 235 / h.def.h);
  spring(0.001, h.base, (v) => { h.spr.scale.set(v, v); }, { k: 0.13, d: 0.55 });
  S.house = h;
}

/* ============================================================
   THE WOLF — creeps in from the right as the meter fills
   ============================================================ */
let wolfRec = null;
function buildWolf() {
  const { frames, def } = bakePropFrames('wolf', 777);
  wolfC.removeChildren();
  wolfRec = { frames, def, spr: new PIXI.Sprite(frames[0]) };
  wolfRec.spr.anchor.set(0.5, 1);
  wolfRec.spr.scale.set(-0.62, 0.62);          /* faces left, toward the pigs */
  wolfC.addChild(wolfRec.spr);
  wolfC.x = VW + 90;
  wolfC.y = GY + 4;
}
function setWolf(v) {
  S.wolf = clamp01(v);
  const pips = wolfTrack.querySelectorAll('i');
  const on = Math.round(S.wolf * pips.length);
  pips.forEach((el, i) => {
    el.classList.toggle('on', i < on);
    el.classList.toggle('hot', i < on && S.wolf > 0.7);
  });
  wolfLabel.textContent =
    S.wolf > 0.86 ? 'HUFFY!' :
    S.wolf > 0.6  ? 'the wolf is close!' :
    S.wolf > 0.32 ? 'the wolf is sniffing' : 'wolf is far away';
  const target = VW + 90 - S.wolf * (VW * 0.30 + 90);
  killTag('wolfx');
  spring(wolfC.x || (VW + 90), target, (x) => { wolfC.x = x; }, { k: 0.08, d: 0.6, tag: 'wolfx' });
}

/* puff clouds flying left + world squash + straw bits */
function puffCloud(x, y, dir) {
  const spr = new PIXI.Sprite(puffTex());
  spr.anchor.set(0.5);
  spr.position.set(x, y);
  spr.scale.set(0.3);
  fxC.addChild(spr);
  spring(0.3, 1.15, (v) => spr.scale.set(v), { k: 0.12, d: 0.7 });
  spring(x, x + dir * (170 + Math.random() * 120), (v) => { spr.x = v; },
    { k: 0.05, d: 0.85, done: () => { fxC.removeChild(spr); spr.destroy(); } });
  spring(1, 0, (v) => { spr.alpha = v; }, { k: 0.06, d: 0.9, delay: 480 });
}
function strawBits(x, y, n) {
  for (let i = 0; i < n; i++) {
    const spr = new PIXI.Sprite(strawTex());
    spr.anchor.set(0.5);
    spr.position.set(x + (Math.random() - 0.5) * 90, y - Math.random() * 90);
    fxC.addChild(spr);
    const dx = -(140 + Math.random() * 340), dy = -(30 + Math.random() * 120);
    spring(spr.x, spr.x + dx, (v) => { spr.x = v; }, { k: 0.06, d: 0.86 });
    spring(spr.y, spr.y + dy + 90, (v) => { spr.y = v; },
      { k: 0.05, d: 0.85, done: () => { fxC.removeChild(spr); spr.destroy(); } });
    spring(1, 0, (v) => { spr.alpha = v; }, { k: 0.1, d: 0.9, delay: 260 });
    spring(0, (Math.random() - 0.5) * 9, (v) => { spr.rotation = v; }, { k: 0.09, d: 0.8 });
  }
}
const squash = { x: 1, y: 1 };
function applySquash() {
  worldC.scale.set(squash.x, squash.y);
}
/* screen shake — the huff rattles the WHOLE stage container */
let shakeT = 0, shakeMag = 0;
function worldShake(mag, ms) { shakeMag = mag; shakeT = Math.max(shakeT, ms); }
async function huffPuff(ep) {
  coachSay('The wolf huffs… and PUFFS!', true);
  /* wolf blows up like a balloon, then deflates */
  spring(0.62, 0.82, (v) => wolfRec.spr.scale.set(-v, v), { k: 0.2, d: 0.4 });
  setTimeout(() => spring(wolfRec.spr.scale.y, 0.62, (v) => wolfRec.spr.scale.set(-v, v),
    { k: 0.18, d: 0.5 }), 400);
  for (let i = 0; i < 4; i++)
    setTimeout(() => puffCloud(wolfC.x - 60, GY - 90 + i * 10, -1), i * 130);
  /* the whole crayon world squashes AND rattles under the blow */
  squash.x = 1.14; squash.y = 0.8; applySquash();
  worldShake(11, 520);
  /* the hero gets pushed back a step, feet staying on the ground */
  killTag('herox');
  spring(heroC.x, Math.max(56, heroC.x - 52), (v) => { heroC.x = v; S.heroX = v; },
    { k: 0.13, d: 0.55, tag: 'herox' });
  setTimeout(() => { squash.x = 0.92; squash.y = 1.08; applySquash(); }, 140);
  setTimeout(() => {
    spring(squash.x, 1, (v) => { squash.x = v; applySquash(); }, { k: 0.1, d: 0.5 });
    spring(squash.y, 1, (v) => { squash.y = v; applySquash(); }, { k: 0.1, d: 0.5 });
  }, 260);
  await sleep(650);
  if (ep && !okEp(ep)) return;
  if (S.house && S.buildStage > 0 && S.buildStage < 3) {
    strawBits(S.house.node.x - panX, GY - 60, 12);
    coachSay('Whoosh! The weak house blew to bits — stronger stuff needed!', true);
    setBuild(S.buildStage - 1);
  } else if (S.buildStage >= 3 && S.house) {
    reactProp(S.house.id);
    coachSay('The brick house does NOT budge. Not one brick!');
  }
  setWolf(0.42);                                /* wolf needs a breather */
}

/* ============================================================
   GAGS — what a prop DOES to the hero (silly → slapstick)
   ============================================================ */
function heroDizzyShow(ms) {
  dizzyC.visible = true;
  setTimeout(() => { dizzyC.visible = false; }, ms || 1300);
}
function heroSlip() {
  if (S.slipping) return;
  S.slipping = true;
  S.slips++;
  if (S.riding) dismount();
  S.vy = Math.max(S.vy, 560);              /* LAUNCH — gravity owns the arc */
  dizzyC.visible = true;
  spring(0, Math.PI * 2.05, (v) => { heroIn.rotation = v; }, { k: 0.13, d: 0.5 });
  spring(0, 26, (v) => { heroIn.position.y = v; }, {
    k: 0.12, d: 0.55,
    done: () => spring(26, 0, (v) => { heroIn.position.y = v; }, {
      k: 0.1, d: 0.55,
      done: () => { heroIn.rotation = 0; dizzyC.visible = false; S.slipping = false; },
    }),
  });
  fxPuff(heroC.x + 40, GY - 6);
}
function heroHop() {
  if (S.slipping) return;
  S.vy = Math.max(S.vy, 470);              /* a real little hop off the ground */
  spring(1, 1.24, (v) => { heroIn.scale.set(v, v); }, {
    k: 0.2, d: 0.45,
    done: () => spring(1.24, 1, (v) => { heroIn.scale.set(v, v); }, { k: 0.14, d: 0.55 }),
  });
}
function fxPuff(x, y) {
  for (let i = 0; i < 3; i++) {
    const spr = new PIXI.Sprite(puffTex());
    spr.anchor.set(0.5);
    const a = Math.PI * 2 * i / 3 + 0.5;
    spr.position.set(x, y);
    spr.scale.set(0.24); spr.alpha = 0.9;
    fxC.addChild(spr);
    spring(0.24, 0.8, (v) => spr.scale.set(v), { k: 0.14, d: 0.6 });
    spring(x, x + Math.cos(a) * 44, (v) => { spr.x = v; }, { k: 0.08, d: 0.8 });
    spring(y, y + Math.sin(a) * 30 - 10, (v) => { spr.y = v; }, { k: 0.08, d: 0.8 });
    spring(0.9, 0, (v) => { spr.alpha = v; },
      { k: 0.1, d: 0.8, delay: 200, done: () => { fxC.removeChild(spr); spr.destroy(); } });
  }
}
function dismount() {
  if (!S.riding) return;
  S.riding = null;
  spring(heroIn.position.y, 0, (v) => { heroIn.position.y = v; }, { k: 0.13, d: 0.55 });
}

async function applyProp(rec) {
  const kind = String(rec.raw || '').toLowerCase();
  switch (rec.cat) {
    case 'ride': {
      if (S.riding) dismount();
      S.riding = rec;
      coachSay(`You hop on the ${rec.raw} — giddyup!`);
      /* the ticker eases the mount under the hero every frame — even
         while the world strip is panning beneath them */
      await sleep(1600);
      if (S.riding !== rec) return;
      setHeroX(heroC.x + 90);
      dismount();
      return;
    }
    case 'slip': case 'splashy': {
      spring(rec.node.x, panX + heroC.x + 46, (v) => { rec.node.x = v; rec.x = v; }, { k: 0.16, d: 0.6 });
      await sleep(420);
      coachSay(`Whoops — a ${rec.raw}! Right under your feet!`, true);
      heroSlip();
      return;
    }
    case 'heavy': {
      /* it falls out of the sky — BONK (gentle, silly) */
      rec.node.x = panX + heroC.x + 34; rec.x = rec.node.x;
      rec.spr.y = -300;
      spring(-300, 0, (v) => { rec.spr.y = v; }, { k: 0.24, d: 0.62 });
      await sleep(420);
      coachSay(`Bonk! A falling ${rec.raw}!`, true);
      S.slips++;
      heroDizzyShow(1300);
      spring(1, 0.55, (v) => { heroIn.scale.set(1.1, v); }, {
        k: 0.3, d: 0.5,
        done: () => spring(0.55, 1, (v) => { heroIn.scale.set(1, v); }, { k: 0.16, d: 0.5 }),
      });
      fxPuff(heroC.x + 30, GY - 16);
      return;
    }
    case 'silly': {
      spring(rec.node.x, panX + heroC.x + 40, (v) => { rec.node.x = v; rec.x = v; }, { k: 0.14, d: 0.6 });
      await sleep(430);
      coachSay(`Splat! A ${rec.raw}, of all things!`, true);
      heroSlip();
      return;
    }
    case 'head': {
      /* the hero WEARS it — the sprite joins the hero's own container */
      await sleep(420);
      const worn = rec;
      worn.worn = true;
      S.gear.push(worn);
      propC.removeChild(worn.node);
      gearC.addChild(worn.node);
      worn.node.position.set(0, -(S.heroH + 4));
      spring(worn.spr.scale.x, worn.base * 0.72 * worn.sx, (v) => worn.spr.scale.set(v, Math.abs(v)),
        { k: 0.18, d: 0.55 });
      if (S.gear.length > 3) {
        const old = S.gear.shift();
        gearC.removeChild(old.node);
        S.props.delete(old.id);
        old.node.destroy({ children: true }); freeFrames(old.frames);
      }
      coachSay(`The ${rec.raw} is yours now — it rides along on your head!`);
      heroHop();
      return;
    }
    case 'material': {
      /* building stuff flies to the house plot and becomes the house */
      const tier = /straw|hay/.test(kind) ? 1 : /brick|stone/.test(kind) ? 3 : 2;
      const names = { 1: 'straw', 2: 'sticks', 3: 'brick' };
      spring(rec.node.x, S.pageBase + HOUSEX + 30, (v) => { rec.node.x = v; }, { k: 0.09, d: 0.6 });
      await sleep(520);
      setBuild(Math.max(tier, S.buildStage));
      poofProp(rec.id);
      coachSay(`Building stuff! The ${names[tier]} house takes shape.`);
      fxPuff(HOUSEX, GY - 60);
      heroHop();
      return;
    }
    case 'wolf': {
      coachSay('The Big Bad Wolf peeks out — huff incoming!', true);
      setWolf(S.wolf + 0.24);
      reactProp(rec.id);
      return;
    }
    case 'pal': {
      S.pigs++;
      coachSay(`A pig friend joins the trip! (${Math.min(S.pigs, 3)}/3 pals)`);
      heroHop();
      return;
    }
    default:
      return;
  }
}

/* ============================================================
   HERO — kid strokes baked into a jittering GPU sprite
   ============================================================ */
const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
let strokes = [], curStroke = null, selColor = CRAYONS[1], makerBusy = false;
let mctx = null, heroTex = null, heroSpr = null;

function sizeMaker() {
  const wpx = makerCv.clientWidth || 420, hpx = makerCv.clientHeight || 210;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  makerCv.width = Math.round(wpx * dpr); makerCv.height = Math.round(hpx * dpr);
  mctx = makerCv.getContext('2d');
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  replayMaker();
}
function replayMaker() {
  if (!mctx) return;
  const w = makerCv.clientWidth || 420, h = makerCv.clientHeight || 210;
  mctx.clearRect(0, 0, w, h);
  mctx.lineCap = mctx.lineJoin = 'round';
  for (const st of (curStroke ? strokes.concat([curStroke]) : strokes)) {
    mctx.strokeStyle = st.c; mctx.lineWidth = st.w; mctx.globalAlpha = 0.92;
    mctx.beginPath();
    st.pts.forEach(([x, y], i) => i ? mctx.lineTo(x, y) : mctx.moveTo(x, y));
    if (st.closed && st.pts.length > 2) mctx.closePath();
    mctx.stroke();
  }
  mctx.globalAlpha = 1;
}
function makerPos(e) {
  const b = makerCv.getBoundingClientRect();
  const w = makerCv.clientWidth || 420, h = makerCv.clientHeight || 210;
  return [(e.clientX - b.left) * w / b.width, (e.clientY - b.top) * h / b.height];
}
function clearMaker() { strokes = []; curStroke = null; replayMaker(); }

/* parametric "surprise" monster — emitted as strokes so the kid
   path and the show path build the hero the exact same way */
function surpriseStrokes() {
  const w = makerCv.clientWidth || 420, h = makerCv.clientHeight || 210;
  const r = rngOf(((Math.random() * 0x7ffffffe) | 0) + 7);
  const { rr, pick } = window.RH;
  const c = pick(r, [CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
  const lite = { '#FF6B57': '#FFC9BF', '#4FB06D': '#B7E6C3',
                 '#5DA9E9': '#C7E6FA', '#B565D8': '#DCC3F2' }[c];
  const cx = w / 2, cy = h / 2 + 12;
  const bw = rr(r, 110, 142), bh = rr(r, 92, 116);
  const st = [];
  const ell = (ex, ey, erx, ery, col, wd) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * 2 * i / 14;
      pts.push([ex + Math.cos(a) * erx * rr(r, 0.92, 1.08),
                ey + Math.sin(a) * ery * rr(r, 0.92, 1.08)]);
    }
    st.push({ c: col, w: wd, pts, closed: true });
  };
  ell(cx, cy, bw / 2, bh / 2, c, 11);                              /* body */
  st.push({ c, w: 7, pts: [[cx, cy - bh / 2 + 6], [cx - 7, cy - bh / 2 - 15], [cx + 5, cy - bh / 2 - 27]] });
  ell(cx + 5, cy - bh / 2 - 31, 7, 7, '#FFC53D', 8);               /* antenna ball */
  ell(cx - bw * 0.18, cy - bh * 0.16, 12, 14, '#FFFDF6', 6);       /* eyes */
  ell(cx + bw * 0.22, cy - bh * 0.12, 8.5, 10, '#FFFDF6', 5);
  ell(cx - bw * 0.17, cy - bh * 0.15, 4, 4.6, '#2B2118', 7);
  ell(cx + bw * 0.23, cy - bh * 0.11, 3.2, 3.8, '#2B2118', 6);
  ell(cx + 2, cy + bh * 0.2, bw * 0.24, bh * 0.17, lite, 8);       /* belly */
  const sm = [];
  for (let i = 0; i <= 9; i++) {
    const a = Math.PI * 0.18 + Math.PI * 0.64 * i / 9;
    sm.push([cx + 2 + Math.cos(a) * bw * 0.2, cy + 2 + Math.sin(a) * bh * 0.15]);
  }
  st.push({ c: '#2B2118', w: 4.5, pts: sm });
  ell(cx - bw * 0.4, cy + 2, 4.5, 4.5, '#FF6B57', 6);              /* cheeks */
  ell(cx + bw * 0.42, cy + 4, 3.8, 3.8, '#FF6B57', 6);
  ell(cx - bw * 0.26, cy + bh * 0.48, bw * 0.15, 7, '#6B4A2A', 7); /* feet */
  ell(cx + bw * 0.26, cy + bh * 0.48, bw * 0.15, 7, '#6B4A2A', 7);
  return st;
}
async function surpriseMe(fast, ep) {
  if (makerBusy) return;
  makerBusy = true;
  strokes = []; replayMaker();
  for (const st of surpriseStrokes()) {
    if (ep != null && !okEp(ep)) { makerBusy = false; return; }
    strokes.push(st); replayMaker();
    await sleep(fast ? 60 : 170);
  }
  makerBusy = false;
}

const COLORWORDS = { '#FF6B57': 'coral-red', '#FFC53D': 'sun-yellow',
  '#4FB06D': 'leaf-green', '#5DA9E9': 'sky-blue',
  '#B565D8': 'berry-purple', '#2B2118': 'inky-black' };
let heroColor = CRAYONS[1];
function heroDesc() {
  const name = (heroName.value || 'Pip').trim() || 'Pip';
  return `a kid-drawn crayon hero named "${name}" drawn in ` +
    `${COLORWORDS[heroColor] || 'crayon'} crayon`;
}

/* strokes[] → baked hero texture pair (2 frames for the boil) */
function buildHero() {
  if (!strokes.length) return false;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const st of strokes) for (const [x, y] of st.pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const sw = Math.max(1, x1 - x0), sh = Math.max(1, y1 - y0);
  if (sw * sh < 36) return false;
  const sc = Math.min(100 / sh, 116 / sw, 1.7);
  const pad = 14;
  const cw = Math.ceil(sw * sc + pad * 2), ch = Math.ceil(sh * sc + pad);

  const tally = {};
  strokes.forEach(st => tally[st.c] = (tally[st.c] || 0) + st.pts.length);
  heroColor = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || CRAYONS[1];

  freeFrames(heroTex);
  heroTex = [];
  for (let k = 0; k < 2; k++) {
    const cv = document.createElement('canvas');
    cv.width = cw * 1.6; cv.height = ch * 1.6;
    const ctx = cv.getContext('2d');
    ctx.setTransform(1.6, 0, 0, 1.6, 0, 0);
    ctx.lineCap = ctx.lineJoin = 'round';
    const jx = k ? 1.4 : 0, jy = k ? 1.1 : 0;
    const jr = rngOf(9000 + k);
    for (const st of strokes) {
      /* pale ink under-stroke = hand-drawn double line */
      for (const [pass, col, wd, al] of [['g', '#2B2118', st.w * sc * 1.7, 0.16],
                                         ['m', st.c, Math.max(2.2, st.w * sc), 0.95]]) {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.globalAlpha = al;
        ctx.beginPath();
        st.pts.forEach(([x, y], i) => {
          const px = (x - x0) * sc + pad + jx + (pass === 'g' ? (jr() - 0.5) * 2 : 0);
          const py = (y - y0) * sc + pad / 2 + jy + (pass === 'g' ? (jr() - 0.5) * 2 : 0);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        if (st.closed && st.pts.length > 2) ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    heroTex.push(PIXI.Texture.from(cv));
  }
  S.heroH = ch;
  if (!heroSpr) {
    heroSpr = new PIXI.Sprite(heroTex[0]);
    heroSpr.anchor.set(0.5, 1);
    heroIn.addChildAt(heroSpr, 0);
  } else heroSpr.texture = heroTex[0];
  heroSpr.visible = true;

  /* three orbiting dizzy stars (hidden until a gag) */
  dizzyC.removeChildren();
  for (let i = 0; i < 3; i++) {
    const s = new PIXI.Sprite(starTex());
    s.anchor.set(0.5); s.scale.set(0.55);
    const a = Math.PI * 2 * i / 3;
    s.position.set(Math.cos(a) * 30, Math.sin(a) * 10);
    dizzyC.addChild(s);
  }
  dizzyC.position.set(0, -(S.heroH + 18));
  dizzyC.visible = false;
  return true;
}

/* hero locomotion — the higher the goal, the farther right; floor at
   the "step into the story" spot so progress never walks him backward */
function heroTargetX() { return Math.max(170, 84 + S.goal * (HOUSEX - 150)); }
function setHeroX(xpx) {
  S.heroX = clamp(xpx, 50, VW - 60);
  S.walking = true;
  killTag('herox');
  spring(heroC.x || 84, S.heroX, (v) => { heroC.x = v; },
    { k: 0.07, d: 0.62, tag: 'herox', done: () => { S.walking = false; } });
}
function setGoal(p) {
  const t = clamp01(p);
  /* smooth + monotonic-ish: a fail beat may dip the bar a LITTLE,
     never teleport it backward (POLISH §7) */
  S.goal = t < S.goal ? Math.max(t, S.goal - 0.07) : t;
  goalFill.style.width = Math.round(S.goal * 100) + '%';
  setHeroX(heroTargetX());
  if (S.goal >= 0.82) setBuild(3);
  else if (S.goal >= 0.5) setBuild(2);
  else if (S.goal >= 0.28) setBuild(1);
}

/* ============================================================
   THE TICKER — wiggle, boil, bob, drift. All sprites, all GPU.
   ============================================================ */
let boilT = 0, boilFlip = 0, bobT = 0;
function tick(t) {
  const dt = Math.min(64, t.deltaMS);
  const now = performance.now();
  updateSprings(dt);

  /* sketch boil: swap every prop + background to its second
     baked frame ~2x a second — pure GPU texture assignment */
  boilT += dt;
  if (boilT > 470) {
    boilT = 0; boilFlip ^= 1;
    if (bgPair) {
      bgPair.node.children[0].alpha = boilFlip ? 0.12 : 1;
      bgPair.node.children[1].alpha = boilFlip ? 1 : 0;
    }
    for (const [, p] of S.props) p.spr.texture = p.frames[boilFlip];
    if (wolfRec) wolfRec.spr.texture = wolfRec.frames[boilFlip];
    if (heroSpr && heroTex) heroSpr.texture = heroTex[boilFlip];
  }

  /* every crayon prop wiggles like it is alive */
  for (const [, p] of S.props) {
    p.spr.rotation = Math.sin(now * 0.0021 + p.ph) * 0.024 * p.wiggle;
    if (!p.worn) p.node.y = GY + (p.cat === 'splashy' ? 12 : 4) + Math.sin(now * 0.0016 + p.ph) * 1.4;
  }

  /* hero walk bounce / ride gallop / gravity hops —
     feet live on the ground line except during a real arc */
  const sec = dt / 1000;
  if (S.vy !== 0 || S.lift > 0) {
    S.vy -= 2500 * sec;                        /* gravity */
    S.lift += S.vy * sec;
    if (S.lift <= 0) {                         /* ground clamp + one bounce */
      if (S.vy < -320) {
        S.vy = -S.vy * 0.28; S.lift = 0.4;
        fxPuff(heroC.x, GY - 2);
      } else { S.lift = 0; S.vy = 0; }
    }
  }
  heroC.y = GY - Math.max(0, S.lift);
  if ((S.walking || S.traveling) && !S.riding && !S.slipping) {
    bobT += dt * 0.012;
    heroIn.position.y = -Math.abs(Math.sin(bobT)) * 9;
    heroIn.rotation = Math.sin(bobT) * 0.06;
  } else if (S.riding) {
    heroIn.position.y = -Math.max(46, S.riding.spr.height * 0.6) - Math.abs(Math.sin(now * 0.012)) * 7;
    S.riding.spr.rotation = Math.sin(now * 0.02) * 0.05;
    /* the mount gallops under the hero — even while the strip pans */
    const want = panX + heroC.x + 8;
    S.riding.node.x += (want - S.riding.node.x) * Math.min(1, dt * 0.007);
    S.riding.x = S.riding.node.x;
  } else if (!S.slipping) {
    heroIn.position.y *= 0.72;                 /* settle back onto the ground */
    heroIn.rotation *= 0.8;
  }
  if (dizzyC.visible) dizzyC.rotation += 0.16;

  /* wolf breathes; the puffs live in fx */
  if (wolfRec) wolfC.y = GY + 4 + Math.sin(now * 0.0035) * 2.5;

  /* wolf-huff screen shake — rattles the whole stage container */
  if (shakeT > 0) {
    shakeT -= dt;
    const k = Math.max(0, shakeT) / 420;
    worldC.x = VW / 2 + (Math.random() - 0.5) * 2 * shakeMag * k;
    worldC.y = GY + (Math.random() - 0.5) * shakeMag * 0.7 * k;
  } else if (worldC.x !== VW / 2 || worldC.y !== GY) {
    worldC.x = VW / 2; worldC.y = GY;
  }

  /* weather particles */
  for (const p of S.particles) {
    const s = dt / 1000;
    if (p.firefly) {
      p.ph += s;
      p.spr.x += Math.sin(p.ph * 1.7) * 0.5;
      p.spr.y += Math.cos(p.ph * 1.3) * 0.4;
      p.spr.alpha = 0.45 + Math.sin(p.ph * 4) * 0.4;
    } else {
      p.spr.x += p.vx * s; p.spr.y += p.vy * s;
      if (p.vr) p.spr.rotation += p.vr * s;
      if (p.ph != null) p.spr.x += Math.sin(now * 0.002 + p.ph) * 0.4;
    }
    if (p.wrap) p.wrap(p);
  }
}

/* ============================================================
   DOM CHROME — coach, chips, did-you-mean, choices
   ============================================================ */
/* the story-brain's line types itself onto the card — like the
   flagship build — so each turn visibly "writes in" */
let typerId = 0;
function typewrite(text, ep) {
  const id = ++typerId;
  narrEl.textContent = '';
  const txt = document.createTextNode('');
  narrEl.appendChild(txt);
  let i = 0;
  (function step() {
    if (id !== typerId || (ep != null && !okEp(ep))) return;
    if (i >= text.length) return;
    txt.textContent += text[i++];
    setTimeout(step, text[i - 1] === ' ' ? 12 : 22);
  })();
}
function coachSay(t, uhoh) {
  coachEl.textContent = t;
  coachEl.style.color = uhoh ? '#D94F3D' : '';
}
function setObstacles(list) {
  obRow.textContent = '';
  (list || []).slice(0, 4).forEach((o) => {
    const c = document.createElement('span');
    c.textContent = 'watch out: ' + o;
    obRow.appendChild(c);
  });
}
function setChoices(list) {
  choicesEl.textContent = '';
  (list || []).slice(0, 4).forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = c;
    b.addEventListener('click', () => { blank.value = c; hideDym(); queueOrTurn(c); });
    choicesEl.appendChild(b);
  });
}
function hideDym() { dymEl.hidden = true; }
function showDym(word) {
  if (!word) { dymEl.hidden = true; return; }
  dymBtn.textContent = word;
  dymBtn.dataset.word = word;
  dymEl.hidden = false;
}
function setInputsEnabled(on) { blank.disabled = !on; goBtn.disabled = !on; }

function drawUnderline() {
  if (!underSvg) return;
  underSvg.setAttribute('viewBox', '0 0 300 10');
  underSvg.setAttribute('preserveAspectRatio', 'none');
  let d = 'M3 6';
  for (let x = 3; x < 290; x += 36) d += ` Q ${x + 18} ${x % 72 < 36 ? 1 : 9} ${x + 36} 6`;
  underSvg.innerHTML = '';
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  underSvg.appendChild(path);
}

/* did-you-mean fallback: edit-distance over sensible story words */
const SENSIBLE = ['straw', 'sticks', 'bricks', 'house', 'home', 'unicorn', 'banana',
  'peel', 'wolf', 'pig', 'bridge', 'boat', 'raft', 'ladder', 'torch', 'lantern',
  'cookie', 'umbrella', 'balloon', 'kite', 'mushroom', 'flower', 'tree', 'bush',
  'rock', 'key', 'door', 'hat', 'log', 'plank', 'stones', 'tunnel', 'puddle',
  'slime', 'soap', 'toaster', 'piano', 'fridge', 'sock', 'run', 'hide', 'build',
  'jump', 'swim', 'dig', 'climb', 'inside', 'sleep', 'dance', 'sing', 'gather'];
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
  if (!w || w.length < 3 || SENSIBLE.includes(w)) return null;
  let best = null, bd = 3;
  for (const s of SENSIBLE) { const d = lev(w, s); if (d < bd) { bd = d; best = s; } }
  return bd <= 2 && best !== w ? best : null;
}

/* tiny kindness gate — the system prompt is the real guard */
const NOT_KIND = /(?:^|[^a-z])(damn|hell|stupid|idiot|dumb|shut up|hate you|kill|die|poop|fart|butt|ugly)(?:[^a-z]|$)/i;
function kindCheck(word) {
  if (NOT_KIND.test(word)) {
    coachSay("Hmm — let's keep our story words kind and silly!", true);
    blank.value = '';
    blank.focus({ preventScroll: true });
    return false;
  }
  return true;
}

/* ============================================================
   THE REAL LLM — one story turn through ../shared/llm.js
   ============================================================ */
const llm = new StoryLLM({
  mode: 'remote',
  onStatus(st) {
    if (st.waiting) { latChip.hidden = false; latChip.textContent = 'waiting for memory headroom…'; }
    else if (!st.failed) { latChip.hidden = false; latChip.textContent = 'asking the story-brain…'; }
  },
});
const latHist = [];

async function takeTurn(word) {
  word = String(word || '').trim().slice(0, 28);
  if (S.busy || !S.started) return;
  if (!word) { coachSay('Type a little word first — try "straw" or "run"!'); return; }
  if (!kindCheck(word)) return;
  const ep = S.epoch;
  S.busy = true;
  setInputsEnabled(false);
  hideDym();
  blank.value = '';
  latChip.hidden = false;
  latChip.textContent = 'asking the story-brain…';

  /* SPEC guardrail: check machine headroom before the call */
  try { await llm.waitForHeadroom(4, 8000); } catch { /* proceed anyway */ }
  if (ep !== S.epoch) { S.busy = false; return; }

  let gm = null;
  try {
    gm = await llm.next({ goal: GOAL, history: S.history.slice(-4), playerText: word, hero: heroDesc() });
  } catch (e) { gm = null; }
  if (ep !== S.epoch) { S.busy = false; return; }
  if (!gm) { latChip.hidden = true; setInputsEnabled(true); S.busy = false; return; }

  /* --- latency + mode chips (on every call, per spec) --- */
  const meta = gm._meta || {};
  const ms = meta.ms || 0;
  if (meta.source === 'offline') {
    latChip.textContent = 'demo mode · canned narrator';
    latChip.classList.add('demo');
    modeChip.textContent = 'demo mode';
  } else {
    latChip.classList.remove('demo');
    const who = meta.mode === 'local' ? 'local model' : 'GLM';
    latChip.textContent = `${who} answered in ${(ms / 1000).toFixed(1)}s`;
    modeChip.textContent = 'live LLM';
    latHist.push(ms);
  }

  /* --- narrative + obstacles + choices (textContent: kid-safe) --- */
  if (gm.narrative) typewrite(gm.narrative, ep);
  setObstacles(gm.obstacles);
  setChoices(gm.choices);
  S.history.push(`"${word}" -> ${(gm.narrative || '').slice(0, 90)}`);
  S.words.push(word);

  /* --- FORWARD TRAVEL: the next stretch of the journey bakes onto the
     strip and the world pans left into it while the hero walks --- */
  bakeScene(gm.scene_seed);

  /* scene props the baker could not label float in as word-tags,
     anchored to the page they're arriving with */
  S.ambient.forEach((id) => poofProp(id));
  S.ambient = [];
  (gm.scene_seed.props || []).slice(0, 4).forEach((k, i) => {
    if (window.resolveKind(k).def !== 'doodle') return;   /* known kinds baked in */
    const p = spawnProp(k, 0.16 + i * 0.26, { quiet: true });
    S.ambient.push(p.id);
  });

  /* typed-word props spawn onto the NEW page right away — the pan
     carries them onstage — but their gags wait for the world to land */
  const gaggable = [];
  for (const pr of (gm.props || [])) {
    if (!okEp(ep)) break;
    const act = (pr.action || 'spawn').toLowerCase();
    if (act === 'remove') { const id = findProp(pr.kind); if (id) poofProp(id); continue; }
    if (act === 'react') {
      const id = findProp(pr.kind);
      if (id) reactProp(id); else spawnProp(pr.kind, pr.x);
      continue;
    }
    const exist = findProp(pr.kind);
    if (exist) { reactProp(exist); gaggable.push({ rec: S.props.get(exist), fresh: false }); }
    else gaggable.push({ rec: spawnProp(pr.kind, pr.x), fresh: true });
  }

  /* gags fire once the strip settles — hero + prop share the frame */
  for (let i = 0; i < 16 && S.traveling && okEp(ep); i++) await sleep(110);

  const hasRide = (gm.props || []).some((pp) =>
    ((window.PROPDEF[window.resolveKind(pp.kind).def] || {}).cat === 'ride'));
  if (S.riding && !hasRide) dismount();
  for (const g of gaggable) {
    if (!okEp(ep)) break;
    const rec = g.rec;
    if (!S.props.has(rec.id)) continue;
    const gaggy = rec.cat !== 'structure' && rec.cat !== 'scenery' &&
                  rec.cat !== 'crossing' && rec.cat !== 'weather' &&
                  rec.cat !== 'item' && rec.cat !== 'light';
    if ((gaggy && g.fresh) || rec.cat === 'wolf' || rec.cat === 'pal')
      await applyProp(rec);
    await sleep(140);
  }

  /* silly → the story already slapped the hero; extra slip if the
     narration says so and no gag fired yet */
  if (!gm.success && !S.slipping &&
      /slip|trip|bonk|splat|oops|fell|crash/i.test(gm.narrative || ''))
    setTimeout(heroSlip, 350);

  /* --- did you mean (LLM field, else local near-miss guess) --- */
  if (gm.did_you_mean) showDym(gm.did_you_mean);
  else if (!gm.success && wordLike(word)) showDym(localGuess(word));
  else hideDym();

  /* --- goal + wolf pressure --- */
  const gained = Math.max(0, (gm.goal_progress || 0) - S.goal);
  setGoal(gm.goal_progress);
  if (gm.success) heroHop();
  const wolfy = /wolf|huff|puff|blow/i.test(
    (gm.narrative || '') + ' ' + (gm.obstacles || []).join(' '));
  let dw = 0.05 + (gm.success ? 0 : 0.1) + (gm.obstacles || []).length * 0.03 +
           (wolfy ? 0.14 : 0) - gained * 0.3;
  setWolf(S.wolf + dw);

  /* --- huff & puff threshold --- */
  if (S.wolf >= 0.92 && okEp(ep)) await huffPuff(ep);

  /* --- win first, then any word the kid queued during the transition --- */
  S.busy = false;
  const queued = S.queued; S.queued = null;
  if (S.goal >= 0.985 && okEp(ep)) { winSeq(); return; }
  if (!S.demoOn) { setInputsEnabled(true); blank.focus({ preventScroll: true }); }
  else setInputsEnabled(false);
  if (queued && okEp(ep)) takeTurn(queued);
}
function submitWord() {
  if (!S.started) return;
  queueOrTurn(blank.value);
}
/* a word typed while a scene is still traveling/gagging gets queued,
   not swallowed (POLISH §3) */
function queueOrTurn(word) {
  word = String(word || '').trim().slice(0, 28);
  if (!word) { coachSay('Type a little word first — try "straw" or "run"!'); return; }
  if (S.ended) { coachSay('That story is told — press "Draw a new hero" to start again!'); blank.value = ''; return; }
  if (S.busy) {
    S.queued = word;
    coachSay(`"${word}" — got it! That happens next.`);
    blank.value = '';
    return;
  }
  takeTurn(word);
}

/* ============================================================
   WIN — dash into the brick house + star shower
   ============================================================ */
async function winSeq() {
  S.busy = true;
  setInputsEnabled(false);
  coachSay('Run! The brick house door is open!');
  killTag('herox');
  const from = heroC.x, to = HOUSEX - 40;
  spring(from, to, (v) => { heroC.x = v; S.heroX = v; S.walking = true; },
    { k: 0.06, d: 0.6, done: () => { S.walking = false; } });
  for (let i = 0; i < 9; i++) {
    setTimeout(() => {
      const s = new PIXI.Sprite(starTex());
      s.anchor.set(0.5);
      s.position.set(to - 60 + Math.random() * 170, 90 + Math.random() * 150);
      s.scale.set(0.2);
      fxC.addChild(s);
      spring(0.2, 0.9, (v) => s.scale.set(v), { k: 0.16, d: 0.5 });
      spring(1, 0, (v) => { s.alpha = v; },
        { k: 0.12, d: 0.8, delay: 620, done: () => { fxC.removeChild(s); s.destroy(); } });
    }, i * 90);
  }
  await sleep(1200);
  recap.textContent = '';
  S.words.slice(-10).forEach((w) => {
    const c = document.createElement('span');
    c.textContent = w;
    recap.appendChild(c);
  });
  const name = (heroName.value || 'Pip').trim() || 'Pip';
  endTitle.textContent = 'The brick house holds!';
  endBlurb.textContent = 'The wolf huffed and puffed and… gave up and went ' +
    'home for cocoa. ' + name + ' did that!';
  slipsEl.textContent =
    `${S.words.length} story word${S.words.length === 1 ? '' : 's'}` +
    (S.slips ? ` · ${S.slips} silly slip${S.slips === 1 ? '' : 's'} — dusted off every time!`
             : ' · not one slip!');
  endOv.hidden = false;
  requestAnimationFrame(() => endOv.classList.add('show'));
  S.ended = true;               /* frees the watch-run loop, story's done */
}

/* ============================================================
   START / RESET
   ============================================================ */
function startStory() {
  S.started = true;
  makerOv.classList.remove('show');
  setTimeout(() => { makerOv.hidden = true; }, 320);
  typewrite(
    'Three little pigs need to reach the strong brick house before the wolf ' +
    'huffs and puffs. Type what your hero does!');
  coachSay('Try: gather straw — or anything silly!');
  setChoices(['gather straw', 'find sticks', 'look for bricks']);
  setInputsEnabled(true);
  modeChip.textContent = 'your hero is in!';
  setHeroX(170);                            /* step into the story */
  blank.focus({ preventScroll: true });
}
function clearStage() {
  for (const [id] of [...S.props]) {
    const p = S.props.get(id);
    S.props.delete(id);
    if (p.worn) gearC.removeChild(p.node); else propC.removeChild(p.node);
    p.node.destroy({ children: true }); freeFrames(p.frames);
  }
  S.props.clear(); S.ambient = []; S.gear = []; S.riding = null; S.house = null;
  gearC.removeChildren();
  for (const p of S.particles) { fxC.removeChild(p.spr); p.spr.destroy(); }
  S.particles = [];
}
function resetGame(toMaker) {
  S.epoch++;
  S.busy = false; S.demoOn = false; S.ended = false;
  S.history = []; S.words = []; S.slips = 0; S.pigs = 0;
  S.goal = 0; S.wolf = 0.14; S.buildStage = 0;
  S.slipping = false; S.walking = false;
  S.lift = 0; S.vy = 0; S.queued = null;
  clearStage();
  resetWorld();
  bakeScene({ biome: 'meadow',
    seed: ((Math.random() * 0x7ffffffe) | 0) + 1,
    palette: 'warm', props: ['fence', 'flower'] });
  heroIn.rotation = 0; heroIn.scale.set(1, 1); heroIn.position.y = 0;
  heroC.x = 84; S.heroX = 84; heroC.y = GY;
  setGoal(0); setWolf(0.14);
  setObstacles([]); setChoices([]); hideDym();
  narrEl.textContent = 'Draw your hero to open the storybook…';
  coachSay('The crayons are waiting!');
  endOv.classList.remove('show'); endOv.hidden = true;
  stopBtn.hidden = true; stopBtn.style.display = 'none';
  S.started = false;
  setInputsEnabled(false);
  modeChip.textContent = 'draw your hero!';
  if (toMaker) {
    makerOv.hidden = false;
    requestAnimationFrame(() => { makerOv.classList.add('show'); sizeMaker(); });
  }
}

/* ============================================================
   WATCH IT PLAY — scripted words through the REAL llm
   ============================================================ */
const DEMO_WORDS = ['gather straw', 'sticks', 'unicorn', 'banana peel', 'bricks', 'brick house', 'hide inside'];
async function startDemo() {
  if (S.demoOn) return;
  const ep = ++S.epoch;
  S.demoOn = true;
  stopBtn.hidden = false; stopBtn.style.display = 'inline-flex';
  endOv.classList.remove('show'); endOv.hidden = true;
  clearStage();
  S.history = []; S.words = []; S.slips = 0; S.pigs = 0;
  S.goal = 0; S.wolf = 0.14; S.buildStage = 0;
  S.lift = 0; S.vy = 0; S.queued = null; S.slipping = false; S.ended = false;
  resetWorld();
  bakeScene({ biome: 'meadow',
    seed: ((Math.random() * 0x7ffffffe) | 0) + 1,
    palette: 'warm', props: ['fence', 'flower'] });
  setGoal(0); setWolf(0.14);
  setInputsEnabled(false);

  /* resource guardrail: a whole scripted LLM journey is a heavy op */
  latChip.hidden = false;
  latChip.textContent = 'checking memory headroom…';
  const headroom = await llm.waitForHeadroom(4).catch(() => false);
  if (!okEp(ep)) return;
  if (!headroom) coachSay('The machine is busy — the show may be slow!', true);

  /* the show paints a hero first — live, in crayon strokes */
  makerOv.hidden = false;
  makerOv.classList.add('show');
  coachSay('The show paints a hero first…');
  await sleep(280); if (!okEp(ep)) return;
  await surpriseMe(true, ep); if (!okEp(ep)) return;
  buildHero();
  await sleep(380); if (!okEp(ep)) return;
  S.started = true;
  startStory();
  await sleep(420); if (!okEp(ep)) return;

  for (const word of DEMO_WORDS) {
    if (!okEp(ep) || !S.demoOn) return;
    while (S.busy && okEp(ep)) await sleep(200);
    if (!okEp(ep) || !S.demoOn) return;
    await sleep(520); if (!okEp(ep) || !S.demoOn) return;
    /* type it like a kid */
    blank.value = '';
    for (const ch of word) {
      if (!okEp(ep) || !S.demoOn) return;
      blank.value += ch;
      await sleep(85 + Math.random() * 95);
    }
    await sleep(380); if (!okEp(ep) || !S.demoOn) return;
    takeTurn(word);
    while (S.busy && okEp(ep) && !S.ended) await sleep(200);
    if (S.goal >= 0.985 || S.ended) break;
  }
  while (S.busy && okEp(ep) && !S.ended) await sleep(200);
  if (okEp(ep)) {
    S.demoOn = false;
    stopBtn.hidden = true; stopBtn.style.display = 'none';
    setInputsEnabled(S.started && !S.ended);
  }
}
function stopDemo() {
  if (!S.demoOn) return;
  S.epoch++;
  S.demoOn = false;
  makerBusy = false;
  S.queued = null;
  stopBtn.hidden = true; stopBtn.style.display = 'none';
  S.busy = false;
  if (S.started) {
    setInputsEnabled(true);
    coachSay('You take over — type a word!');
  }
}
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
    swatchBox.querySelectorAll('.swatch').forEach((s) => s.classList.remove('sel'));
    b.classList.add('sel');
  });
  swatchBox.appendChild(b);
});
makerCv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  makerCv.setPointerCapture(e.pointerId);
  curStroke = { c: selColor, w: 12, pts: [makerPos(e)], closed: false };
});
makerCv.addEventListener('pointermove', (e) => {
  if (!curStroke) return;
  const [x, y] = makerPos(e);
  const pts = curStroke.pts, l = pts[pts.length - 1];
  if (Math.hypot(x - l[0], y - l[1]) < 3) return;
  pts.push([x, y]);
  replayMaker();
});
function endStroke() {
  if (!curStroke) return;
  const p = curStroke.pts;
  if (p.length > 6) {
    const [x0, y0] = p[0], [x1, y1] = p[p.length - 1];
    if (Math.hypot(x1 - x0, y1 - y0) < 18) curStroke.closed = true;
  }
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
    coachSay('Draw a hero first — or press "Surprise me"!', true);
    return;
  }
  startStory();
});
blank.addEventListener('input', hideDym);
blank.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
});
goBtn.addEventListener('click', submitWord);
dymBtn.addEventListener('click', () => {
  blank.value = dymBtn.dataset.word || '';
  hideDym();
  queueOrTurn(dymBtn.dataset.word);
});
stopBtn.addEventListener('click', stopDemo);
watchBtn.addEventListener('click', startDemo);
watchBtn2.addEventListener('click', startDemo);
watchAgain.addEventListener('click', () => { resetGame(false); startDemo(); });
againBtn.addEventListener('click', () => { resetGame(true); });
tapType.addEventListener('click', () => blank.focus({ preventScroll: true }));
document.addEventListener('keydown', (e) => {
  if (S.demoOn || e.metaKey || e.ctrlKey || e.altKey) return;
  if (S.started && makerOv.hidden && !makerOv.classList.contains('show') &&
      document.activeElement !== blank && /^[a-zA-Z ]$/.test(e.key))
    blank.focus({ preventScroll: true });
});

/* ---------- go ---------- */
function initMaker() { sizeMaker(); }
drawUnderline();
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', boot);
else
  boot();

window.__lat = latHist;   /* for the README latency report */
/* verification hook (harmless): lets a harness watch the journey move */
window.__probe = () => ({
  started: S.started, busy: S.busy, demoOn: S.demoOn,
  goal: S.goal, wolf: S.wolf, words: S.words.length, slips: S.slips,
  props: S.props.size, page: S.pageBase / VW, panX, traveling: S.traveling,
  heroX: heroC ? heroC.x : 0, heroLift: S.lift, riding: !!S.riding,
  heroVisible: !!(heroSpr && heroSpr.visible),
});
})();
