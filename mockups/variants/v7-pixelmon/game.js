/* =========================================================================
 * game.js — "Fill the Tale — Pixel Woods edition"
 * -------------------------------------------------------------------------
 * Beat 0 : the hero maker — a REAL 12x12 pixel painter (click/drag, 6-color
 *          palette, mirror-symmetry toggle, eraser) + name-seeded
 *          "Surprise me!" monster.
 * Beats 1-5 : type words into story blanks -> a hardcoded reaction table
 *          spawns real code-drawn props in the world (bridge over the ditch,
 *          umbrella in the rain, rideable boat/unicorn across the river,
 *          lantern in the dark cave, the home door). Silly words spawn real
 *          props too — the banana peel literally appears underfoot — then
 *          the signature gag: the hero pixel-explodes into its own cells,
 *          reassembles, and blinks dizzy stars.
 * Support : a pixel firefly hovers ahead and blinks the way to the next area.
 * ===================================================================== */
(function () {
  'use strict';

  const P = window.PixelPal;
  const $ = (s) => document.querySelector(s);

  /* ------------------------------ DOM refs ----------------------------- */

  const stageCard = $('#stageCard');
  const sceneCanvas = $('#sceneCanvas');
  const heroCanvas = $('#heroCanvas');
  const fxCanvas = $('#fxCanvas');
  const sctx = sceneCanvas.getContext('2d');
  const hctx = heroCanvas.getContext('2d');
  const fctx = fxCanvas.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  hctx.imageSmoothingEnabled = false;
  fctx.imageSmoothingEnabled = false;

  const areaTag = $('#areaTag');
  const seedTag = $('#seedTag');
  const nameTag = $('#nameTag');

  const makerCard = $('#makerCard');
  const makerMsg = $('#makerMsg');
  const paintCanvas = $('#paintCanvas');
  const pctx = paintCanvas.getContext('2d');
  const swatchBox = $('#swatches');
  const mirrorToggle = $('#mirrorToggle');
  const clearBtn = $('#clearBtn');
  const nameInput = $('#nameInput');
  const surpriseBtn = $('#surpriseBtn');
  const startBtn = $('#startBtn');

  const taleCard = $('#taleCard');
  const sPre = $('#sPre');
  const sPost = $('#sPost');
  const wordInput = $('#wordInput');
  const chipsBox = $('#chips');
  const feedback = $('#feedback');
  const spellRow = $('#spellRow');
  const spellBtn = $('#spellBtn');
  const goBtn = $('#goBtn');
  const choiceRow = $('#choiceRow');
  const keepBtn = $('#keepBtn');
  const retryBtn = $('#retryBtn');
  const pipsBox = $('#pips');

  const demoBtn = $('#demoBtn');
  const demoCard = $('.demo-card');
  const endingCard = $('#endingCard');
  const recap = $('#recap');
  const gemLetter = $('#gemLetter');
  const againBtn = $('#againBtn');
  const easelBtn = $('#easelBtn');

  const CS = 16;              // hero canvas: 12 cells x 16px = 192px
  const HERO_NATIVE = 24;     // hero displays 24 scene-px tall/wide
  const SW = 144, SH = 84;    // scene native size

  /* ------------------------------ content ------------------------------ */

  // THE REACTION TABLE — hardcoded per beat, per spec.
  // sensible: word -> prop key. silly: word -> {prop, gag}.
  const BEATS = [
    {
      area: 'woods',
      pre: (n) => `${n} needs to get through the forest! But the path is blocked — ${n} needs a`,
      post: ' to cross',
      chips: ['bridge', 'log', 'banana peel'],
      sensible: {
        bridge: 'bridge', log: 'log', plank: 'log', board: 'log',
        vine: 'vine', rope: 'vine', boat: 'boat',
        stones: 'stones', 'stepping stones': 'stones',
      },
      silly: {
        'banana peel': 'peel', banana: 'peel', peel: 'peel',
        soap: 'soap', 'bar of soap': 'soap', ice: 'ice', 'ice cube': 'ice',
        skates: 'soap', 'roller skates': 'soap', slippers: 'soap',
      },
      gag: 'slip',
    },
    {
      area: 'drizzle',
      pre: (n) => `It started to rain! ${n} grabs a`,
      post: '',
      chips: ['umbrella', 'hat', 'paper bag'],
      sensible: {
        umbrella: 'umbrella', hat: 'hat', cap: 'hat', hood: 'hat',
        leaf: 'leaf', 'big leaf': 'leaf', 'giant leaf': 'leaf',
        raincoat: 'poncho', poncho: 'poncho', coat: 'poncho',
      },
      silly: {
        'paper bag': 'bag', bag: 'bag', 'paper sack': 'bag',
        toast: 'toast', 'soggy toast': 'toast', waffle: 'toast',
        newspaper: 'bag', cardboard: 'bag',
      },
      gag: 'soggy',
    },
    {
      area: 'river',
      pre: (n) => `A wide river! ${n} rides the`,
      post: ' across',
      chips: ['boat', 'unicorn', 'anvil'],
      sensible: {
        boat: 'boat', canoe: 'boat', ship: 'boat', kayak: 'boat',
        raft: 'raft', duck: 'duck', swan: 'swan',
        fish: 'fish', 'big fish': 'fish', whale: 'whale',
        turtle: 'turtle', unicorn: 'unicorn',
      },
      silly: {
        anvil: 'anvil', piano: 'anvil', safe: 'anvil',
        toaster: 'toaster', fridge: 'fridge', refrigerator: 'fridge',
        'kitchen sink': 'anvil', sink: 'anvil',
      },
      gag: 'sink',
    },
    {
      area: 'cave',
      pre: (n) => `The cave is dark! ${n} lights a`,
      post: '',
      chips: ['lantern', 'firefly', 'pickle'],
      sensible: {
        lantern: 'lantern', lamp: 'lantern', torch: 'torch',
        candle: 'candle', match: 'torch', flashlight: 'torch',
        firefly: 'firefly', 'glow worm': 'worm', worm: 'worm',
        star: 'star', 'fallen star': 'star',
      },
      silly: {
        pickle: 'pickle', 'wet sock': 'sock', sock: 'sock',
        cheese: 'cheese', spaghetti: 'cheese', 'old cheese': 'cheese',
      },
      gag: 'fizzle',
    },
    {
      area: 'home',
      pre: (n) => `Home at last! ${n} opens the`,
      post: '',
      chips: ['door', 'cookie jar', 'monster'],
      sensible: {
        door: 'door', gate: 'door', handle: 'door', doorknob: 'door',
        key: 'key', 'cookie jar': 'jar', cookiejar: 'jar',
        cookie: 'jar', 'jar of cookies': 'jar',
      },
      silly: {
        monster: 'eyes', dragon: 'eyes', ghost: 'eyes',
        'a monster': 'eyes', 'the monster': 'eyes', zombie: 'eyes',
      },
      gag: 'scare',
    },
  ];

  const AREA_IDS = BEATS.map((b) => b.area);

  const GOOD_LINES = [
    'Yes! A {w} pops into the world — real pixels!',
    'Nice word! The {w} appears!',
    'Hooray for "{w}"! There it is!',
    'The story heard "{w}" — look, it came true!',
  ];

  const SILLY_LINES = {
    slip:   'Whoops! A {w} really appeared — right underfoot!',
    soggy:  'Oh no — a soggy {w} is NOT good rain gear!',
    sink:   'A {w}?! That is MUCH too heavy to ride!',
    fizzle: 'A {w}? That is not a light, it just goes fizz.',
    scare:  'Eep! There is something behind that door!',
  };

  const RECOVER_LINES = {
    slip:   'lands flat — and bursts into pixels!',
    soggy:  'drips and droops. Soggy!',
    sink:   'glug glug glug...',
    fizzle: 'spark... fizzle... darkness.',
    scare:  'jumped right out of its pixels!',
  };

  /* ------------------------------- state ------------------------------- */

  const state = {
    // painter
    grid: new Array(144).fill(null),
    tool: '#FF6B57',
    mirror: true,
    painting: false,
    seeded: false,          // true if current hero came from "surprise me"
    // hero
    cells: [],              // [{x,y,c}] shown on stage
    name: 'Pip',
    seed: P.fnv1a('pal:pip'),
    seedHex: '00000000',
    // scene
    areaIdx: 0,
    sceneA: null, sceneB: null, blend: 1, // blend=1 -> fully sceneB
    props: [],              // spawned world props {key,x,y,age,...}
    worn: null,             // prop worn by hero (umbrella etc) {key,dx,dy}
    // hero transform
    hx: 22, hy: 62,         // feet position in scene px
    heroT: { x: 0, y: 0, r: 0, sx: 1, sy: 1 },
    cellMod: null,
    // cave light
    darkness: 0,
    light: { x: 0, y: 0, r: 0 },
    doorway: null,
    // firefly
    fly: { x: 40, y: 40, tx: 40, ty: 40, glow: 0.6, ph: 0 },
    // fx
    dizzy: 0,               // seconds of dizzy-stars remaining
    // flow
    started: false,
    idx: 0,
    filled: [],
    busy: false,
    done: false,
    demo: false,
    demoStop: false,
    pendingResolve: null,
    lineCounter: 0,
  };

  const anims = [];   // {t0, dur, fn, res}
  const parts = [];   // fx particles (scene coords)
  const drops = [];   // rain drops (scene coords)

  /* ------------------------------ helpers ------------------------------ */

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeOutBack = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const nz = (i, f) => { const v = Math.sin(i * 127.1 + f * 311.7) * 43758.5453; return v - Math.floor(v); };

  function animate(dur, fn) {
    return new Promise((res) => anims.push({ t0: performance.now(), dur, fn, res }));
  }

  function resetHeroT() {
    const H = state.heroT;
    H.x = 0; H.y = 0; H.r = 0; H.sx = 1; H.sy = 1;
  }

  function say(text, tone) {
    // route to whichever card is showing: maker message or tale feedback
    if (taleCard.hidden || taleCard.style.display === 'none') {
      makerMsg.className = 'hint maker-msg' + (tone ? ' ' + tone : '');
      makerMsg.textContent = text;
      void makerMsg.offsetWidth;
      makerMsg.classList.add('pop');
      return;
    }
    feedback.className = 'feedback' + (tone ? ' ' + tone : '');
    feedback.textContent = text;
    void feedback.offsetWidth;
    feedback.classList.add('pop');
  }

  function wobbleInput() {
    wordInput.classList.remove('wobble');
    void wordInput.offsetWidth;
    wordInput.classList.add('wobble');
  }

  function curBeat() { return BEATS[state.idx]; }

  /* ============================ PIXEL PAINTER ========================== */

  const PAINT_COLORS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  const PCELL = 20; // paint canvas backing px per cell (240/12)

  function paintCell(gx, gy, color) {
    state.grid[gy * 12 + gx] = color;
    if (state.mirror) state.grid[gy * 12 + (11 - gx)] = color;
    syncHeroCells();
    drawPainter();
  }

  function drawPainter() {
    pctx.clearRect(0, 0, 240, 240);
    // checkerboard "paper" so empty cells still read as a grid
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        pctx.fillStyle = (x + y) % 2 ? '#FBF2DE' : '#FFFDF6';
        pctx.fillRect(x * PCELL, y * PCELL, PCELL, PCELL);
      }
    }
    // painted cells
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        const c = state.grid[y * 12 + x];
        if (!c) continue;
        pctx.fillStyle = c;
        pctx.fillRect(x * PCELL, y * PCELL, PCELL, PCELL);
      }
    }
    // grid lines
    pctx.strokeStyle = 'rgba(43,33,24,0.18)';
    pctx.lineWidth = 1;
    for (let i = 0; i <= 12; i++) {
      pctx.beginPath(); pctx.moveTo(i * PCELL + .5, 0); pctx.lineTo(i * PCELL + .5, 240); pctx.stroke();
      pctx.beginPath(); pctx.moveTo(0, i * PCELL + .5); pctx.lineTo(240, i * PCELL + .5); pctx.stroke();
    }
    // mirror divider hint
    if (state.mirror) {
      pctx.strokeStyle = 'rgba(93,169,233,0.8)';
      pctx.setLineDash([4, 3]);
      pctx.lineWidth = 2;
      pctx.beginPath(); pctx.moveTo(120, 0); pctx.lineTo(120, 240); pctx.stroke();
      pctx.setLineDash([]);
    }
  }

  function syncHeroCells() {
    const cells = [];
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) {
        const c = state.grid[y * 12 + x];
        if (c) cells.push({ x, y, c });
      }
    state.cells = cells;
  }

  function paintedCount() { return state.grid.filter(Boolean).length; }

  function paintEvent(e) {
    const r = paintCanvas.getBoundingClientRect();
    const gx = Math.floor(((e.clientX - r.left) / r.width) * 12);
    const gy = Math.floor(((e.clientY - r.top) / r.height) * 12);
    if (gx < 0 || gx > 11 || gy < 0 || gy > 11) return;
    paintCell(gx, gy, state.tool === 'erase' ? null : state.tool);
  }

  function buildSwatches() {
    swatchBox.innerHTML = '';
    for (const c of PAINT_COLORS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (state.tool === c ? ' sel' : '');
      b.style.background = c;
      b.setAttribute('aria-label', 'paint ' + c);
      b.addEventListener('click', () => { state.tool = c; buildSwatches(); });
      swatchBox.appendChild(b);
    }
    const er = document.createElement('button');
    er.type = 'button';
    er.className = 'swatch eraser' + (state.tool === 'erase' ? ' sel' : '');
    er.setAttribute('aria-label', 'eraser');
    er.addEventListener('click', () => { state.tool = 'erase'; buildSwatches(); });
    swatchBox.appendChild(er);
  }

  // "Surprise me!" — name-seeded monster into the painter (editable after!)
  function surprise(name, announce) {
    const pal = P.generatePal(name);
    state.grid.fill(null);
    for (const c of pal.cells) state.grid[c.y * 12 + c.x] = c.c;
    state.seeded = true;
    state.seed = pal.seed;
    state.seedHex = pal.seedHex;
    state.name = pal.name;
    nameInput.value = pal.name;
    nameTag.textContent = pal.name;
    seedTag.textContent = `seed #${pal.seedHex}`;
    syncHeroCells();
    drawPainter();
    reseedScenes();
    if (announce) say(`Meet ${pal.name} — grown from the name itself!`, 'yay');
  }

  /* ============================ SCENE / PROPS ========================== */

  function reseedScenes() {
    state.sceneA = null;
    state.sceneB = P.generateScene(AREA_IDS[state.areaIdx], state.seed);
    state.blend = 1;
    areaTag.textContent = P.AREAS[state.areaIdx].label;
  }

  function spawnProp(key, x, y, extra) {
    const p = Object.assign({ key, x, y, age: 0 }, extra || {});
    state.props.push(p);
    return p;
  }

  function clearProps() {
    state.props.length = 0;
    state.worn = null;
  }

  function drawProps(t) {
    for (const p of state.props) {
      const pop = easeOutBack(Math.min(1, p.age / 0.38));
      if (pop <= 0) continue;
      sctx.save();
      sctx.translate(p.x, p.y);
      sctx.scale(pop, pop);
      P.drawProp(sctx, p.key, p.dx0 || 0, p.dy0 || 0, p, t);
      sctx.restore();
    }
    if (state.worn) {
      const w = state.worn;
      P.drawProp(sctx, w.key, Math.round(state.hx + w.dx), Math.round(state.hy + w.dy), w, t);
    }
    // doorway: drawn every frame in the home area so the door can swing
    if (state.sceneB && state.sceneB.house && state.doorway) {
      const h = state.sceneB.house;
      P.drawProp(sctx, 'doorway', h.doorX, h.doorY, state.doorway, t, h);
    }
  }

  /* -------------------------- cave darkness ---------------------------- */

  const darkCanvas = document.createElement('canvas');
  darkCanvas.width = SW; darkCanvas.height = SH;
  const dctx = darkCanvas.getContext('2d');

  function paintDarkness() {
    if (state.darkness <= 0.01) return;
    dctx.clearRect(0, 0, SW, SH);
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = `rgba(16,9,34,${state.darkness})`;
    dctx.fillRect(0, 0, SW, SH);
    // punch light holes: always a faint bubble around the hero,
    // plus the big hole once a light word lands
    dctx.globalCompositeOperation = 'destination-out';
    const heroGlow = dctx.createRadialGradient(state.hx, state.hy - 11, 1, state.hx, state.hy - 11, 11);
    heroGlow.addColorStop(0, 'rgba(0,0,0,0.55)');
    heroGlow.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = heroGlow;
    dctx.beginPath(); dctx.arc(state.hx, state.hy - 11, 11, 0, Math.PI * 2); dctx.fill();
    const L = state.light;
    if (L.r > 1) {
      const g = dctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, L.r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.75, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath(); dctx.arc(L.x, L.y, L.r, 0, Math.PI * 2); dctx.fill();
    }
    dctx.globalCompositeOperation = 'source-over';
    sctx.drawImage(darkCanvas, 0, 0);
  }

  /* ========================== FIREFLY (support) ======================== */

  // scene coords -> stage px helpers
  let scX = 1, scY = 1;
  const SX = (v) => v * scX;
  const SY = (v) => v * scY;

  function drawFirefly(t) {
    const f = state.fly;
    // ease toward target
    f.x = lerp(f.x, f.tx, 0.06);
    f.y = lerp(f.y, f.ty, 0.06);
    const bobY = Math.sin(t * 2.6 + f.ph) * 2;
    const blink = 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.2 + f.ph * 3));
    const glow = f.glow * blink;
    const x = SX(f.x), y = SY(f.y + bobY);

    // glow halo (soft, on the pixel layer it reads as a sparkle aura)
    const gr = SX(7) * (0.6 + glow);
    const g = fctx.createRadialGradient(x, y, 0, x, y, gr);
    g.addColorStop(0, `rgba(255,230,109,${0.5 * glow})`);
    g.addColorStop(1, 'rgba(255,230,109,0)');
    fctx.fillStyle = g;
    fctx.fillRect(x - gr, y - gr, gr * 2, gr * 2);

    // tiny body: wings + dark head + glowing abdomen
    const u = scX; // 1 scene px in stage px
    fctx.fillStyle = 'rgba(255,253,246,0.75)';
    fctx.fillRect(Math.round(x - 2.5 * u), Math.round(y - 2 * u), Math.max(1, Math.round(1.6 * u)), Math.max(1, Math.round(1 * u)));
    fctx.fillRect(Math.round(x + 1 * u), Math.round(y - 2 * u), Math.max(1, Math.round(1.6 * u)), Math.max(1, Math.round(1 * u)));
    fctx.fillStyle = '#2B2118';
    fctx.fillRect(Math.round(x - 1 * u), Math.round(y - 1 * u), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(1 * u)));
    fctx.fillStyle = `rgba(255,230,109,${0.55 + 0.45 * blink})`;
    fctx.fillRect(Math.round(x - 1 * u), Math.round(y), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(2 * u)));
    // sparkle cross on bright frames
    if (blink > 0.85) {
      fctx.fillStyle = 'rgba(255,243,196,0.8)';
      fctx.fillRect(Math.round(x - 3 * u), Math.round(y), Math.max(1, Math.round(1 * u)), Math.max(1, Math.round(1 * u)));
      fctx.fillRect(Math.round(x + 3 * u), Math.round(y), Math.max(1, Math.round(1 * u)), Math.max(1, Math.round(1 * u)));
    }
  }

  // normal hover spot: ahead-right of the hero
  function flyHome() {
    state.fly.tx = Math.min(130, state.hx + 16);
    state.fly.ty = state.hy - 18;
  }

  async function flyAhead(x, y, dur) {
    state.fly.tx = x; state.fly.ty = y;
    state.fly.glow = 1.6; // excited blink
    await wait(dur);
    state.fly.glow = 0.9;
  }

  /* --------------------------- fx particles ---------------------------- */

  function sizeFx() {
    fxCanvas.width = stageCard.clientWidth;
    fxCanvas.height = stageCard.clientHeight;
    scX = fxCanvas.width / SW;
    scY = fxCanvas.height / SH;
    heroCanvas.style.width = `${HERO_NATIVE * scX}px`;
    heroCanvas.style.height = `${HERO_NATIVE * scY}px`;
  }

  function spawnParts(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = (opts.up ? -Math.PI * (0.15 + Math.random() * 0.7) : Math.random() * Math.PI * 2);
      const sp = (opts.sp || 24) * (0.4 + Math.random());
      parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up ? 10 : 0),
        grav: opts.grav != null ? opts.grav : 60,
        life: 0, max: (opts.max || 0.9) * (0.7 + Math.random() * 0.6),
        c: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        sz: opts.sz || 1,
        sway: opts.sway || 0,
      });
    }
  }

  function puffDust() {
    spawnParts(state.hx, state.hy - 2, 14, { up: true, sp: 16, grav: 40, max: 0.8, sz: 1,
      colors: ['#C9B896', '#A58C6B', '#FFF3D9', '#8A7457'] });
  }

  function splashAt(x, y, n) {
    spawnParts(x, y, n, { up: true, sp: 30, grav: 90, max: 0.9, sz: 1,
      colors: ['#BFEBFF', '#5DA9E9', '#FFFDF6', '#3E7CC0'] });
  }

  function confetti() {
    const cols = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8', '#FF8FB1'];
    for (let i = 0; i < 80; i++) {
      parts.push({
        x: Math.random() * SW, y: -6 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 8, vy: 10 + Math.random() * 14,
        grav: 14, life: 0, max: 2.4 + Math.random(),
        c: cols[Math.floor(Math.random() * cols.length)],
        sz: 1 + Math.floor(Math.random() * 2),
        sway: 8 + Math.random() * 10,
      });
    }
  }

  function drawFx(dt, t) {
    fctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    // ---- rain (drizzle area only) ----
    const sc = state.sceneB;
    if (sc && sc.rain) {
      if (!drops.length) for (let i = 0; i < 46; i++)
        drops.push({ x: Math.random() * SW, y: Math.random() * SH, sp: 42 + Math.random() * 26 });
      const cover = state.worn; // umbrella & friends keep the hero dry
      for (const d of drops) {
        d.y += d.sp * dt;
        if (d.y > state.sceneB.groundY + 8) { d.y = -4; d.x = Math.random() * SW; }
        // drops vanish over the hero's cover
        if (cover && Math.abs(d.x - (state.hx + cover.dx + 8)) < 9 &&
            d.y > state.hy + cover.dy - 2 && d.y < state.hy - 2) continue;
        fctx.fillStyle = 'rgba(190,215,235,0.75)';
        fctx.fillRect(Math.round(SX(d.x)), Math.round(SY(d.y)), Math.max(1, Math.round(scX)), Math.max(2, Math.round(1.5 * scY)));
      }
    }

    // ---- particles ----
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life > p.max) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt + (p.sway ? Math.sin(p.life * 6 + i) * p.sway * dt : 0);
      p.y += p.vy * dt;
      fctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      fctx.fillStyle = p.c;
      fctx.fillRect(Math.round(SX(p.x)), Math.round(SY(p.y)), Math.max(1, Math.round(p.sz * scX)), Math.max(1, Math.round(p.sz * scY)));
    }
    fctx.globalAlpha = 1;

    drawFirefly(t);
    drawDizzy(dt, t);
  }

  // blinking dizzy stars circling the hero's head after a gag
  function drawDizzy(dt, t) {
    if (state.dizzy <= 0) return;
    state.dizzy -= dt;
    const cx = SX(state.hx), cy = SY(state.hy - HERO_NATIVE + 3);
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * Math.PI * 2) / 3;
      const x = cx + Math.cos(a) * SX(9);
      const y = cy + Math.sin(a) * SY(3);
      const tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 2);
      fctx.fillStyle = `rgba(255,197,61,${0.55 + 0.45 * tw})`;
      const u = Math.max(1, Math.round(scX));
      fctx.fillRect(Math.round(x), Math.round(y - u), u, u * 3);
      fctx.fillRect(Math.round(x - u), Math.round(y), u * 3, u);
    }
  }

  /* --------------------------- hero animations ------------------------- */

  function hopAnim(big) {
    return animate(620, (e) => {
      const H = state.heroT;
      if (e < 0.18) {
        const k = e / 0.18;
        H.sy = 1 - 0.28 * k; H.sx = 1 + 0.26 * k;
      } else if (e < 0.78) {
        const k = (e - 0.18) / 0.6;
        H.y = -Math.sin(Math.PI * k) * (big ? 14 : 9);
        H.sy = 1 + 0.16 * Math.sin(Math.PI * k);
        H.sx = 1 - 0.10 * Math.sin(Math.PI * k);
      } else {
        const k = (e - 0.78) / 0.22;
        H.sy = 0.8 + 0.2 * k - 0.10 * Math.sin(Math.PI * k);
        H.sx = 1.15 - 0.15 * k;
      }
    }).then(resetHeroT);
  }

  // hero walks/slides to scene x (with a happy bob)
  function walkTo(x, dur, bobAmp) {
    const x0 = state.hx;
    const amp = bobAmp != null ? bobAmp : 1.4;
    return animate(dur, (e) => {
      state.hx = lerp(x0, x, easeInOut(e));
      state.heroT.y = -Math.abs(Math.sin(e * Math.PI * 4)) * amp;
    }).then(() => { state.heroT.y = 0; });
  }

  // THE SIGNATURE GAG: burst into your own cells, hang scattered, fly home.
  function explodeGag() {
    if (!state.cells.length) return Promise.resolve();
    const dirs = state.cells.map((c, i) => ({
      a: nz(i, 1.7) * Math.PI * 2,
      d: 24 + nz(i, 2.3) * 62,
      j1: nz(i, 3.1) * 6.28,
    }));
    state.cellMod = (c, i, t) => {
      const e = state._exE || 0;
      const d = dirs[i % dirs.length];
      let ox = 0, oy = 0, a = 1;
      if (e < 0.40) {
        const o = easeOut(e / 0.40);
        ox = Math.cos(d.a) * d.d * o;
        oy = Math.sin(d.a) * d.d * o + 60 * o * o;
        a = 1 - 0.25 * o;
      } else if (e < 0.58) {
        ox = Math.cos(d.a) * d.d + Math.sin(t * 30 + d.j1) * 2;
        oy = Math.sin(d.a) * d.d + 60 + Math.cos(t * 26 + d.j1) * 2;
        a = 0.75;
      } else {
        const k = easeInOut((e - 0.58) / 0.42);
        ox = Math.cos(d.a) * d.d * (1 - k);
        oy = (Math.sin(d.a) * d.d + 60) * (1 - k);
        a = 0.75 + 0.25 * k;
      }
      return { dx: ox, dy: oy, a };
    };
    return animate(1650, (e) => { state._exE = e; })
      .then(() => { state.cellMod = null; state._exE = 0; puffDust(); });
  }

  function flipGag() {
    return animate(820, (e) => {
      const H = state.heroT;
      if (e < 0.4) {
        const k = e / 0.4;
        H.r = -170 * easeOutBack(k);
        H.y = -Math.sin(Math.PI * k) * 12;
      } else {
        const k = (e - 0.4) / 0.6;
        H.r = -170 * (1 - easeInOut(k));
        H.y = -Math.sin(Math.PI * k) * 6;
      }
    }).then(resetHeroT);
  }

  function victorySpin() {
    return animate(1300, (e) => {
      const H = state.heroT;
      H.r = 360 * easeInOut(e);
      H.sy = 1 + 0.15 * Math.sin(4 * Math.PI * e);
      H.y = -Math.sin(Math.PI * Math.min(1, e * 1.4)) * 10;
      if (Math.random() < 0.3)
        spawnParts(state.hx + (Math.random() - 0.5) * 20, state.hy - Math.random() * 24, 1,
          { up: true, sp: 8, grav: -8, max: 0.7, sz: 1, colors: ['#FFC53D', '#FFF3C4', '#FFFDF6'] });
    }).then(resetHeroT);
  }

  /* --------------------------- word logic ------------------------------ */

  function classify(raw) {
    const w = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!w) return { type: 'nonword', w };
    const beat = curBeat();
    if (beat.sensible[w]) return { type: 'good', w, prop: beat.sensible[w] };
    if (beat.silly[w]) return { type: 'silly', w, prop: beat.silly[w], gag: beat.gag };
    // close miss -> did-you-mean (only against sensible words)
    const guess = closest(w, Object.keys(beat.sensible));
    if (guess) return { type: 'miss', w, guess };
    // plausible-but-unknown word -> kind nudge, no advancement
    if (/^[a-z]+(?: [a-z]+)?$/.test(w) && w.length >= 3 && /[aeiouy]/.test(w) && !/(.)\1\1/.test(w))
      return { type: 'unknown', w };
    return { type: 'nonword', w };
  }

  function editDist(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  function closest(w, keys) {
    let best = null, bestD = 99;
    for (const k of keys) {
      const kk = k.replace(/\s/g, '');
      const ww = w.replace(/\s/g, '');
      let d = editDist(ww, kk);
      if (kk.startsWith(ww) && ww.length >= 3) d = Math.min(d, 1); // prefix = very close
      if (d < bestD) { bestD = d; best = k; }
    }
    const limit = w.length <= 5 ? 1 : 2;
    return bestD <= limit ? best : null;
  }

  function hideSpell() { spellRow.hidden = true; }

  function offerSpell(guess) {
    spellBtn.textContent = guess;
    spellRow.hidden = false;
    spellBtn.onclick = () => {
      if (state.busy || state.done) return;
      hideSpell();
      wordInput.value = guess;
      submitWord();
    };
  }

  /* ============================ BEAT PAYOFFS =========================== */

  const GAP = { x0: 78, x1: 106 };
  const RIV = { x0: 34, x1: 122 };

  // where a crossing prop sits & how the hero crosses it
  function crossPlan(propKey, p) {
    const gy = 62;
    switch (propKey) {
      case 'bridge': return { approachX: GAP.x0 - 6, landX: GAP.x1 + 6, yAt: () => gy - 1 };
      case 'log':    return { approachX: GAP.x0 - 4, landX: GAP.x1 + 4, yAt: () => gy - 2 };
      case 'stones': return { approachX: GAP.x0 - 4, landX: GAP.x1 + 4,
                       yAt: (x) => { const u = Math.max(0, Math.min(1, (x - GAP.x0) / (GAP.x1 - GAP.x0)));
                         return gy + 4 - Math.abs(Math.sin(u * Math.PI * 3)) * 2; } };
      case 'vine':   return { approachX: GAP.x0 - 2, landX: GAP.x1 + 2,
                       yAt: (x) => { const u = Math.max(0, Math.min(1, (x - GAP.x0) / (GAP.x1 - GAP.x0)));
                         return 59 + Math.sin(u * Math.PI) * 7; } };
      case 'boat':   return { ride: true, mountX: GAP.x0 - 2, dismountX: GAP.x1 + 4 };
      default:       return { approachX: GAP.x0 - 6, landX: GAP.x1 + 6, yAt: () => gy };
    }
  }

  async function crossGap(plan) {
    if (plan.ride) return; // handled by ride logic
    await walkTo(plan.approachX, 700);
    const x0 = plan.approachX, x1 = plan.landX;
    await animate(1400, (e) => {
      state.hx = lerp(x0, x1, e);
      state.hy = plan.yAt(state.hx);
      state.heroT.y = -Math.abs(Math.sin(e * Math.PI * 5)) * 1.6;
    });
    state.hy = 62;
    state.heroT.y = 0;
  }

  // hero hops onto a rideable, it carries them to `toX`, hero hops off at `offX`
  async function rideAcross(prop, toX, offX, mountDy) {
    await walkTo(prop.x - 10, 650);
    // mount hop
    const hx0 = state.hx, hy0 = state.hy;
    await animate(500, (e) => {
      state.hx = lerp(hx0, prop.x + (prop.mountDx || 6), easeInOut(e));
      state.hy = lerp(hy0, prop.y + mountDy, e) - Math.sin(Math.PI * e) * 9;
    });
    state.hx = prop.x + (prop.mountDx || 6);
    state.hy = prop.y + mountDy;
    prop.trot = true;
    // the ride itself
    const px0 = prop.x, py0 = prop.y;
    await animate(2100, (e) => {
      const k = easeInOut(e);
      prop.x = lerp(px0, toX, k);
      prop.y = py0 + Math.sin(e * Math.PI * 7) * 0.6; // bobbing on water
      state.hx = prop.x + (prop.mountDx || 6);
      state.hy = prop.y + mountDy;
    });
    prop.trot = false;
    // dismount hop to the far bank
    const dx0 = state.hx, dy0 = state.hy;
    await animate(520, (e) => {
      state.hx = lerp(dx0, offX, easeInOut(e));
      state.hy = lerp(dy0, 62, e) - Math.sin(Math.PI * e) * 10;
    });
    state.hx = offX; state.hy = 62;
  }

  // ----- per-beat success scripts: spawn the prop + play the payoff -----
  async function playSensible(word, propKey) {
    const beat = curBeat();
    const n = state.name;

    if (beat.area === 'woods') {
      let prop;
      if (propKey === 'bridge') prop = spawnProp('bridge', GAP.x0 - 3, 58);
      else if (propKey === 'log') prop = spawnProp('log', GAP.x0 - 1, 58);
      else if (propKey === 'stones') prop = spawnProp('stones', GAP.x0 + 1, 66);
      else if (propKey === 'vine') prop = spawnProp('vine', GAP.x0 - 1, 59, { w: GAP.x1 - GAP.x0 + 2 });
      else if (propKey === 'boat') prop = spawnProp('boat', GAP.x0 + 2, 68);
      spawnParts(GAP.x0 + 14, 58, 8, { up: true, sp: 14, grav: 40, max: 0.6, sz: 1, colors: ['#FFF3C4', '#FFC53D', '#FFFDF6'] });
      say(GOOD_LINES[state.lineCounter++ % GOOD_LINES.length].replace('{w}', word).replace('{n}', n), 'yay');
      const plan = crossPlan(propKey, prop);
      if (plan.ride) {
        prop.mountDx = 8;
        await rideAcross(prop, GAP.x1 - 16, GAP.x1 + 5, 6);
      } else {
        await crossGap(plan);
      }
      await hopAnim();
      return;
    }

    if (beat.area === 'drizzle') {
      // worn rain gear pops onto the hero
      const pos = { umbrella: [-8, -27], hat: [-6, -23], leaf: [-5, -24], poncho: [-6, -23] };
      const [dx, dy] = pos[propKey] || [-7, -24];
      state.worn = { key: propKey, dx, dy, age: 0 };
      spawnParts(state.hx, state.hy - 22, 10, { up: true, sp: 16, grav: 30, max: 0.7, sz: 1, colors: ['#FFF3C4', '#BFEBFF', '#FFFDF6'] });
      say(GOOD_LINES[state.lineCounter++ % GOOD_LINES.length].replace('{w}', word).replace('{n}', n), 'yay');
      await hopAnim();
      await wait(350);
      return;
    }

    if (beat.area === 'river') {
      const mounts = {
        boat:  { y: 55, mdx: 8, mdy: 6 }, raft: { y: 59, mdx: 9, mdy: 0 },
        duck:  { y: 57, mdx: 4, mdy: 5 }, swan: { y: 57, mdx: 4, mdy: 5 },
        fish:  { y: 58, mdx: 6, mdy: 2 }, whale: { y: 55, mdx: 8, mdy: 3 },
        turtle:{ y: 58, mdx: 5, mdy: 0 }, unicorn: { y: 50, mdx: 8, mdy: 5 },
      };
      const m = mounts[propKey] || mounts.boat;
      const tint = propKey === 'swan' ? { tint: '#FFFDF6', tintD: '#D8D3C8' } : {};
      const prop = spawnProp(propKey, RIV.x0 + 4, m.y, Object.assign({ mountDx: m.mdx }, tint));
      splashAt(RIV.x0 + 8, 62, 12);
      say(GOOD_LINES[state.lineCounter++ % GOOD_LINES.length].replace('{w}', word).replace('{n}', n), 'yay');
      if (propKey === 'unicorn')
        say(`A UNICORN! ${n} rides the most magical word in the woods!`, 'yay');
      await rideAcross(prop, RIV.x1 - 16, RIV.x1 + 7, m.mdy);
      splashAt(RIV.x1 - 6, 63, 8);
      await hopAnim();
      return;
    }

    if (beat.area === 'cave') {
      const pos = { lantern: [10, -11], torch: [9, -13], candle: [11, -9], worm: [10, -4], star: [4, -26], firefly: [0, 0] };
      let lx, ly;
      if (propKey === 'firefly') {
        // the support character itself flares up — no prop needed
        state.fly.glow = 3.2;
        state.fly.tx = state.hx + 10; state.fly.ty = state.hy - 14;
        lx = () => state.fly.x; ly = () => state.fly.y;
      } else {
        const [dx, dy] = pos[propKey] || [10, -11];
        spawnProp(propKey, state.hx + dx, state.hy + dy);
        lx = () => state.hx + dx + 4; ly = () => state.hy + dy + 4;
      }
      say(propKey === 'firefly'
        ? `The little firefly flares up — it knew the way all along!`
        : GOOD_LINES[state.lineCounter++ % GOOD_LINES.length].replace('{w}', word).replace('{n}', n), 'yay');
      // light radius grows, cave revealed
      await animate(1400, (e) => {
        const k = easeOut(e);
        state.light.x = typeof lx === 'function' ? lx() : lx;
        state.light.y = typeof ly === 'function' ? ly() : ly;
        state.light.r = 4 + 46 * k;
      });
      await hopAnim();
      return;
    }

    if (beat.area === 'home') {
      const h = state.sceneB.house;
      state.doorway = state.doorway || { open: 0 };
      await walkTo(h.doorX - 8, 900);
      if (propKey === 'key') {
        const key = spawnProp('key', state.hx - 18, state.hy - 20);
        await animate(900, (e) => {
          key.x = lerp(state.hx - 18, h.doorX - 2, easeInOut(e));
          key.y = lerp(state.hy - 20, h.doorY + 6, e) - Math.sin(e * Math.PI) * 8;
        });
        propRemove(key);
        spawnParts(h.doorX + 4, h.doorY + 8, 10, { up: true, sp: 12, grav: 30, max: 0.7, sz: 1, colors: ['#FFC53D', '#FFF3C4'] });
        say(`The key flies in — click! The door swings open!`, 'yay');
      } else if (propKey === 'jar') {
        const jar = spawnProp('jar', h.doorX - 16, h.doorY + 6);
        say(`A cookie jar on the doorstep! It pops open — cookies for everyone!`, 'yay');
        await wait(500);
        jar.open = 1;
        spawnParts(h.doorX - 10, h.doorY + 4, 14, { up: true, sp: 18, grav: 60, max: 0.9, sz: 1, colors: ['#B8763F', '#FFC53D', '#FFF3C4'] });
        await hopAnim();
      } else {
        say(GOOD_LINES[state.lineCounter++ % GOOD_LINES.length].replace('{w}', word).replace('{n}', n), 'yay');
      }
      // door swings open + hero steps inside
      await animate(700, (e) => { state.doorway.open = easeInOut(e); });
      const hx0 = state.hx;
      await animate(800, (e) => {
        state.hx = lerp(hx0, h.doorX + 4, easeInOut(e));
      });
      heroCanvas.style.opacity = '0';
      await wait(150);
      return;
    }
  }

  function propRemove(p) {
    const i = state.props.indexOf(p);
    if (i >= 0) state.props.splice(i, 1);
  }

  // ----- silly gags: the word REALLY spawns, then the crash -----
  async function playSilly(word, propKey, gag) {
    const n = state.name;
    say(SILLY_LINES[gag].replace('{w}', word).replace('{n}', n), 'oops');

    if (gag === 'slip') {
      // the peel (or soap/ice) literally appears underfoot
      spawnProp(propKey, state.hx + 2, state.hy - 2);
      await wait(650);
      await flipGag();                    // legs over head
      say(`${n} ${RECOVER_LINES.slip}`, 'oops');
      await explodeGag();                 // SPLAT — signature pixel-burst
      state.dizzy = 1.8;
      return;
    }

    if (gag === 'soggy') {
      // soggy thing plops onto the hero's head
      const pos = { bag: [-5, -25], toast: [-4, -26] };
      const [dx, dy] = pos[propKey] || [-5, -25];
      const worn = { key: propKey, dx, dy, age: 0 };
      state.worn = worn;
      await animate(1100, (e) => {
        const H = state.heroT;
        const droop = Math.sin(Math.PI * Math.min(1, e * 1.3));
        H.sy = 1 - 0.3 * droop; H.sx = 1 + 0.2 * droop;
        H.y = 2 * droop;
        H.x = Math.sin(e * 26) * 2 * (1 - e); // sad little shiver
      });
      resetHeroT();
      say(`${n} ${RECOVER_LINES.soggy}`, 'oops');
      state.dizzy = 1.6;
      await wait(500);
      // shake it off — prop flips away
      const wdx = worn.dx, wdy = worn.dy;
      await animate(500, (e) => { worn.dx = wdx + e * 16; worn.dy = wdy + e * e * 18; });
      state.worn = null;
      return;
    }

    if (gag === 'sink') {
      // the heavy thing pops into the hero's arms, then both go GLUG
      const held = spawnProp(propKey, state.hx - 4, state.hy - 26);
      await wait(600);
      const hy0 = state.hy, py0 = held.y;
      await animate(1100, (e) => {
        const k = easeInOut(e);
        state.hy = hy0 + 20 * k;          // dragged under the water
        held.y = py0 + 20 * k;
        heroCanvas.style.opacity = String(1 - 0.55 * k); // submerged look
        if (e > 0.3 && Math.random() < 0.3)
          spawnParts(state.hx + (Math.random() - 0.5) * 8, 62, 1,
            { up: true, sp: 10, grav: -20, max: 0.9, sz: 1, colors: ['#BFEBFF', '#FFFDF6'] });
      });
      splashAt(state.hx, 62, 16);
      propRemove(held);                    // the anvil is gone forever. RIP.
      say(`${n} ${RECOVER_LINES.sink}`, 'oops');
      // hero bobs back up, gasping
      await animate(900, (e) => {
        state.hy = 62 + 20 * (1 - easeOut(e));
        heroCanvas.style.opacity = String(0.45 + 0.55 * easeOut(e));
        state.heroT.sy = 1 + 0.2 * Math.sin(e * Math.PI * 3);
      });
      resetHeroT(); state.hy = 62;
      heroCanvas.style.opacity = '1';
      state.dizzy = 1.8;
      return;
    }

    if (gag === 'fizzle') {
      // not-a-light pops up, sparks bravely, dies
      const prop = spawnProp(propKey, state.hx + 10, state.hy - 18);
      await animate(1200, (e) => {
        if (Math.random() < 0.35)
          spawnParts(prop.x + 4 + (Math.random() - 0.5) * 6, prop.y + 2, 1,
            { up: true, sp: 12, grav: 50, max: 0.4, sz: 1,
              colors: ['#FFF3C4', '#FFC53D', '#8A8177'] });
        if (e > 0.5) prop.y += 0.25;      // it sags, defeated
      });
      say(`${n} ${RECOVER_LINES.fizzle}`, 'oops');
      state.dizzy = 1.4;
      await wait(500);
      return;
    }

    if (gag === 'scare') {
      // the door creaks open a crack — TWO GLOWING EYES look back
      state.doorway = state.doorway || { open: 0 };
      await walkTo(state.sceneB.house.doorX - 12, 800);
      await animate(700, (e) => { state.doorway.open = easeInOut(e) * 0.3; });
      state.doorway.eyes = true;
      await wait(550);
      say(`${n} ${RECOVER_LINES.scare}`, 'oops');
      await explodeGag();                  // scared right out of its pixels!
      state.dizzy = 1.8;
      await animate(500, (e) => { state.doorway.open = 0.3 * (1 - e); });
      state.doorway.eyes = false;
      return;
    }
  }

  /* ------------------------------ flow --------------------------------- */

  function renderSentence() {
    const b = curBeat();
    sPre.textContent = `${b.pre(state.name)} `;
    sPost.textContent = b.post;
    wordInput.value = '';
    wordInput.style.width = '';
    hideSpell();
    chipsBox.innerHTML = '';
    for (const w of b.chips) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'word-chip';
      btn.textContent = w;
      btn.addEventListener('click', () => {
        if (state.busy || state.done || state.demo) return;
        wordInput.value = w;
        submitWord();
      });
      chipsBox.appendChild(btn);
    }
    renderPips();
  }

  function renderPips() {
    pipsBox.innerHTML = '';
    for (let i = 0; i < BEATS.length; i++) {
      const d = document.createElement('span');
      d.className = 'pip';
      if (state.filled[i]) d.classList.add(state.filled[i].silly ? 'silly' : 'good');
      else if (i === state.idx && !state.done) d.classList.add('now');
      pipsBox.appendChild(d);
    }
  }

  function waitForChoice() {
    choiceRow.hidden = false;
    goBtn.disabled = true;
    return new Promise((res) => { state.pendingResolve = res; });
  }

  function resolveChoice(choice) {
    if (!state.pendingResolve) return;
    const r = state.pendingResolve;
    state.pendingResolve = null;
    choiceRow.hidden = true;
    goBtn.disabled = false;
    r(choice);
  }

  async function submitWord(fromDemo) {
    if (state.busy || state.done || (state.demo && !fromDemo)) return;
    hideSpell();
    const r = classify(wordInput.value);
    const typed = wordInput.value.trim();

    if (r.type === 'nonword') {
      say(typed ? `Hmm... is "${typed}" a word? Try again!` : 'Type a word in the blank first!', '');
      wobbleInput();
      return;
    }
    if (r.type === 'miss') {
      say(`So close! "${r.w}" almost spells a story word...`, '');
      offerSpell(r.guess);
      wobbleInput();
      return;
    }
    if (r.type === 'unknown') {
      say(`Hmm, the tale doesn't know what to do with "${r.w}" here — try a word below!`, '');
      wobbleInput();
      return;
    }

    state.busy = true;
    const n = state.name;

    if (r.type === 'good') {
      await playSensible(r.w, r.prop);
      state.filled.push({ w: r.w, silly: false });
      return finishSubmit();
    }

    // silly word -> the comedic fail with a REAL spawned prop
    await playSilly(r.w, r.prop, r.gag);
    say(`Phew — ${n} shakes off the pixels. Keep the silly word, or try another?`, '');

    let choice;
    if (state.demo) { await wait(650); choice = 'keep'; }
    else choice = await waitForChoice();

    if (choice === 'retry') {
      state.busy = false;
      wordInput.value = '';
      if (!state.demo) wordInput.focus();
      return;
    }
    state.filled.push({ w: r.w, silly: true });
    finishSubmit();
  }

  function finishSubmit() {
    state.idx++;
    wordInput.value = '';
    if (state.idx >= BEATS.length) { state.busy = false; finishChapter(); return; }
    // stay busy while the world travels to the next area
    travelTo(state.idx).then(() => {
      state.busy = false;
      if (!state.demo) wordInput.focus();
    });
  }

  // firefly blinks ahead, hero walks off, scene crossfades to the next area
  async function travelTo(idx) {
    state.areaIdx = idx;
    renderPips();
    if (idx >= BEATS.length) return;

    // firefly leads the way
    flyAhead(128, 20, 480);

    // hero walks offstage right
    await walkTo(152, 850, 1.8);

    // swap areas behind a crossfade
    state.sceneA = state.sceneB;
    state.sceneB = P.generateScene(AREA_IDS[idx], state.seed);
    state.blend = 0;
    areaTag.textContent = P.AREAS[idx].label;
    clearProps();
    state.worn = null;
    if (AREA_IDS[idx] === 'home') state.doorway = { open: 0 };

    state.hx = -10;
    state.hy = 62;
    state.fly.x = -6; state.fly.y = 18;

    await animate(650, (e) => {
      state.blend = easeInOut(e);
      // darkness ramps in only for the cave
      state.darkness = AREA_IDS[idx] === 'cave' ? 0.92 * easeInOut(e) : 0;
      state.light.r = 0;
    });
    if (AREA_IDS[idx] !== 'cave') state.darkness = 0;

    // firefly + hero re-enter from the left
    state.fly.tx = 34; state.fly.ty = 40;
    await walkTo(22, 750, 1.8);
    flyHome();
    if (state.idx < BEATS.length) renderSentence();
  }

  async function finishChapter() {
    state.done = true;
    renderPips();
    taleCard.style.display = 'none';
    demoCard.style.display = 'none';
    heroCanvas.style.opacity = '1';
    state.darkness = 0;

    gemLetter.textContent = state.name[0].toUpperCase();
    recap.innerHTML = '';
    state.filled.forEach((f, i) => {
      const b = BEATS[i];
      const li = document.createElement('li');
      if (f.silly) li.className = 'silly-word';
      li.innerHTML = `${b.pre(state.name)} <span class="w"></span>${b.post}.${f.silly ? '<span class="tag">silly!</span>' : ''}`;
      li.querySelector('.w').textContent = f.w;
      recap.appendChild(li);
    });
    endingCard.hidden = false;

    confetti();
    // hero pops back out the door for the victory spin
    const hx0 = state.hx;
    const doorX = state.sceneB.house ? state.sceneB.house.doorX : 106;
    heroCanvas.style.opacity = '1';
    await animate(450, (e) => { state.hx = lerp(hx0 > doorX ? doorX + 4 : hx0, doorX - 14, easeOut(e)); });
    await victorySpin();
  }

  // world reset: back to the Green Woods, hero at the left edge, no props
  function resetWorld() {
    state.areaIdx = 0;
    state.sceneA = null;
    state.sceneB = P.generateScene(AREA_IDS[0], state.seed);
    state.blend = 1;
    areaTag.textContent = P.AREAS[0].label;
    clearProps();
    state.doorway = null;
    state.darkness = 0;
    state.light.r = 0;
    state.dizzy = 0;
    state.cellMod = null;
    resetHeroT();
    state.hx = 22; state.hy = 62;
    heroCanvas.style.opacity = '1';
    flyHome();
  }

  function resetChapter() {
    if (state.pendingResolve) resolveChoice('retry');
    state.idx = 0;
    state.filled = [];
    state.done = false;
    state.busy = false;
    resetWorld();
    endingCard.hidden = true;
    taleCard.style.display = '';
    demoCard.style.display = '';
    hideSpell();
    renderSentence();
  }

  /* --------------------------- story start ----------------------------- */

  function startStory() {
    if (paintedCount() < 4) {
      say('Paint at least a few pixels first — or press "Surprise me!"', '');
      makerCard.classList.remove('shake');
      void makerCard.offsetWidth;
      makerCard.classList.add('shake');
      return false;
    }
    state.name = (nameInput.value.trim() || 'Pip');
    nameTag.textContent = state.name;
    if (!state.seeded) { // hand-painted hero gets a seed from the painting itself
      const sig = state.grid.map((c, i) => (c ? i : 0)).join(',');
      state.seed = P.fnv1a('paint:' + sig);
      state.seedHex = state.seed.toString(16).padStart(8, '0');
      seedTag.textContent = `seed #${state.seedHex}`;
    }
    syncHeroCells();
    state.started = true;
    makerCard.hidden = true;
    taleCard.hidden = false;
    resetChapter();
    say('The story begins! Type a word — or click a chip — to fill the blank.', '');
    if (!state.demo) wordInput.focus();
    return true;
  }

  /* ------------------------------ auto-demo ---------------------------- */

  async function typeInto(word) {
    wordInput.value = '';
    wordInput.classList.add('typing');
    for (const ch of word) {
      if (state.demoStop) break;
      wordInput.value += ch;
      wordInput.style.width = Math.max(5.5, wordInput.value.length + 1) + 'ch';
      await wait(60 + Math.random() * 45);
    }
    wordInput.classList.remove('typing');
    await wait(380);
  }

  function setDemoUI(on) {
    document.body.classList.toggle('demo-mode', on);
    for (const el of [wordInput, nameInput, goBtn, surpriseBtn, startBtn, keepBtn, retryBtn, clearBtn])
      el.disabled = on;
    paintCanvas.classList.toggle('locked', on);
    chipsBox.style.pointerEvents = on ? 'none' : '';
    demoBtn.textContent = on ? 'Stop the show' : 'Watch it play';
    demoBtn.classList.toggle('watching', on);
  }

  const DEMO_WORDS = ['banana peel', 'umbrella', 'unicorn', 'lantern', 'cookie jar'];
  const DEMO_NAMES = ['Ziggy', 'Bloop', 'Momo', 'Zorp', 'Waffles', 'Noodle'];

  async function runDemo() {
    if (state.busy || state.demo) return;
    state.demo = true;
    state.demoStop = false;
    setDemoUI(true);

    // ---- beat 0: auto-paint a monster, cell by cell ----
    makerCard.hidden = false;
    taleCard.hidden = true;
    endingCard.hidden = true;
    state.started = false;
    const demoName = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
    nameInput.value = demoName;
    resetWorld();
    say('Watch closely — the game paints a monster, then plays the chapter!', '');
    const pal = P.generatePal(demoName);
    state.grid.fill(null);
    drawPainter();
    syncHeroCells();
    // reveal cells in a seeded-but-shuffled order, with tiny pops
    const order = pal.cells.map((c, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const i of order) {
      if (state.demoStop) break;
      const c = pal.cells[i];
      state.grid[c.y * 12 + c.x] = c.c;
      if (state.mirror) state.grid[c.y * 12 + (11 - c.x)] = c.c;
      drawPainter();
      syncHeroCells();
      await wait(14);
    }
    state.seeded = true; state.seed = pal.seed; state.seedHex = pal.seedHex;
    state.name = pal.name; nameTag.textContent = pal.name;
    seedTag.textContent = `seed #${pal.seedHex}`;
    reseedScenes();
    await wait(420);

    if (!state.demoStop && startStory()) {
      // ---- beats 1-5: scripted words, incl. one silly fail ----
      while (state.idx < BEATS.length && !state.demoStop) {
        const word = DEMO_WORDS[state.idx] || curBeat().chips[0];
        await typeInto(word);
        if (state.demoStop) break;
        await submitWord(true);
        await wait(300);
      }
    }

    state.demo = false;
    state.demoStop = false;
    setDemoUI(false);
    if (state.pendingResolve) resolveChoice('retry');
    if (!state.done && state.started) wordInput.disabled = false;
  }

  function stopDemo() {
    state.demoStop = true;
    if (state.pendingResolve) resolveChoice('retry');
  }

  /* ------------------------------ main loop ---------------------------- */

  let lastT = performance.now();
  let lastFrameAt = performance.now();
  function frame(now) {
    lastFrameAt = now;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const t = now / 1000;

    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      let e = (now - a.t0) / a.dur;
      if (e > 1 || state.demoStop) e = 1; // stop button fast-forwards anims
      a.fn(e, t);
      if (e === 1) { anims.splice(i, 1); a.res(); }
    }

    // props age (pop-in)
    for (const p of state.props) p.age += dt;
    if (state.worn) state.worn.age = (state.worn.age || 0) + dt;

    // ---- paint the world ----
    if (state.sceneA && state.blend < 1) {
      P.drawScene(sctx, state.sceneA, t);
      sctx.save();
      sctx.globalAlpha = state.blend;
      P.drawScene(sctx, state.sceneB, t);
      sctx.restore();
    } else if (state.sceneB) {
      P.drawScene(sctx, state.sceneB, t);
    } else {
      sctx.clearRect(0, 0, SW, SH);
    }
    drawProps(t);
    paintDarkness();

    // ---- hero ----
    const H = state.heroT;
    const idle = Math.sin(t * 2.4) * 1.2;                 // gentle bob
    const cx = (state.hx - HERO_NATIVE / 2) * scX;
    const cy = (state.hy - HERO_NATIVE + 1 + idle * 0.4) * scY;
    heroCanvas.style.transform =
      `translate(${cx}px,${cy}px) translate(${H.x * scX}px,${H.y * scY}px) rotate(${H.r}deg) scale(${H.sx},${H.sy})`;
    const dim = state.darkness > 0.01 ? (state.light.r > 12 ? 0.12 : 0.5) : 0;
    heroCanvas.style.filter =
      `brightness(${1 - dim}) drop-shadow(4px 6px 0 rgba(43,33,24,0.28))`;
    const mod = state.cellMod ? (c, i) => state.cellMod(c, i, t) : null;
    P.drawPal(hctx, state.cells, CS, mod, t);

    drawFx(dt, t);
    scheduleNext();
  }

  // single-flight rAF scheduling: at most one pending frame, ever
  let rafPending = false;
  function scheduleNext() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame((t) => { rafPending = false; frame(t); });
  }

  /* ------------------------------- wiring ------------------------------ */

  // painter events
  paintCanvas.addEventListener('pointerdown', (e) => {
    if (state.demo || paintCanvas.classList.contains('locked')) return;
    state.painting = true;
    paintCanvas.setPointerCapture(e.pointerId);
    paintEvent(e);
  });
  paintCanvas.addEventListener('pointermove', (e) => { if (state.painting) paintEvent(e); });
  paintCanvas.addEventListener('pointerup', () => { state.painting = false; });
  paintCanvas.addEventListener('pointercancel', () => { state.painting = false; });

  mirrorToggle.addEventListener('change', () => { state.mirror = mirrorToggle.checked; drawPainter(); });
  clearBtn.addEventListener('click', () => {
    if (state.demo) return;
    state.grid.fill(null);
    state.seeded = false;
    seedTag.textContent = 'hand-painted';
    syncHeroCells();
    drawPainter();
  });
  surpriseBtn.addEventListener('click', () => {
    if (state.demo) return;
    const nm = nameInput.value.trim() || P.PAL_NAMES[Math.floor(Math.random() * P.PAL_NAMES.length)];
    surprise(nm, true);
  });
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
  nameInput.addEventListener('blur', () => {
    const v = nameInput.value.trim() || 'Pip';
    state.name = v;
    nameTag.textContent = v;
    if (state.seeded) surprise(v, false); // reseed to match the typed name
  });
  startBtn.addEventListener('click', () => { if (!state.demo) startStory(); });

  goBtn.addEventListener('click', () => submitWord());
  wordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitWord(); });
  wordInput.addEventListener('input', () => {
    hideSpell();
    wordInput.style.width = Math.max(5.5, wordInput.value.length + 1) + 'ch';
  });
  keepBtn.addEventListener('click', () => resolveChoice('keep'));
  retryBtn.addEventListener('click', () => resolveChoice('retry'));

  demoBtn.addEventListener('click', () => { state.demo ? stopDemo() : runDemo(); });
  againBtn.addEventListener('click', () => {
    resetChapter();
    say('New chapter, same hero! Fill the blanks.', '');
    wordInput.focus();
  });
  easelBtn.addEventListener('click', () => {
    // back to the easel: keep the painting, reset the tale
    resetChapter();
    state.started = false;
    makerCard.hidden = false;
    taleCard.hidden = true;
    say('Tweak your hero, then start the story again!', '');
    makerCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  window.addEventListener('resize', sizeFx);
  window.addEventListener('load', sizeFx);

  /* -------------------------------- init ------------------------------- */

  buildSwatches();
  drawPainter();
  sizeFx();
  reseedScenes();
  state.fly.ph = Math.random() * 6;
  flyHome();
  // a blank-hero ghost on stage until the kid paints: seed a faint default?
  // No — the stage starts empty; the painter fills it. That's the point.
  say('First, paint your hero in the maker card!', '');
  scheduleNext();
  // rAF can stall on hidden tabs & headless renderers — a watchdog timer
  // keeps the story moving so the show never freezes mid-word.
  setInterval(() => {
    const now = performance.now();
    if (now - lastFrameAt > 350) frame(now);
  }, 250);
})();
