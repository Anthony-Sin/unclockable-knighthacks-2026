/* ============================================================
   Node-Doodle Pigs — app.js   (v3 · 04-konva)
   Engine: Konva 9.3.16 (vendored, MIT — https://konvajs.org)

   Differentiator: EVERY doodle is a live scene-graph node. The
   kid's crayon strokes become Konva.Line nodes in a mini maker
   stage, then become the hero Group on the big Stage — which
   walks, rides, slips and dances under a 5-layer scene graph
   (sky/ground world, house plot, props, actors, fx). Hover any
   prop and a Konva.Label name chip pops — everything is a node.
   Story beats come from the REAL LLM through ../shared/llm.js.
   ============================================================ */
'use strict';

function boot() {
  /* ---------- element handles ---------- */
  const $ = (id) => document.getElementById(id);
  const stageEl   = $('stage'),    host     = $('konvaHost');
  const goalFill  = $('goalFill'), goalPig  = $('goalPig');
  const wolfFill  = $('wolfFill'), wolfMood = $('wolfMood');
  const lineChip  = $('lineChip'), msChip   = $('msChip');
  const stopBtn   = $('stopBtn');
  const makerOv   = $('makerOverlay'), makerHost = $('makerHost');
  const swatchBox = $('swatches');
  const doneBtn   = $('doneBtn'),   surpriseBtn = $('surpriseBtn');
  const clearBtn  = $('clearBtn'),  watchBtn    = $('watchBtn');
  const endOv     = $('endOverlay'), winTitle = $('winTitle');
  const recapEl   = $('recap');
  const againBtn  = $('againBtn'),  watchAgain  = $('watchAgainBtn');
  const narrEl    = $('narrative'), obRow     = $('obstacles');
  const blank     = $('blank'),     goBtn     = $('goBtn');
  const coachEl   = $('coach');
  const dymEl     = $('dym'),       dymBtn    = $('dymBtn');
  const choicesEl = $('choices'),   tapType   = $('tapType');
  const underSvg  = $('underSvg');

  if (!window.Konva || !window.StoryLLM || !window.SK || !window.PROPS || !window.WORLD) {
    narrEl.textContent = 'Something did not load — check vendor/konva.min.js and friends.';
    return;
  }

  const INK = SK.INK;
  const GOAL = 'The Three Little Pigs — help the pig friends gather ' +
    'materials, build houses, and reach the strong brick house before ' +
    'the Big Bad Wolf huffs and puffs.';

  /* ---------- tiny helpers ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndi = (a, b) => Math.floor(rnd(a, b + 1));
  const pickA = (arr) => arr[(Math.random() * arr.length) | 0];
  const flatOf = (pts) => pts.flatMap((p) => [p[0], p[1]]);

  /* Konva tween → Promise. Always resolves — even if the node is destroyed
   * mid-flight (Stop button, culling) — so awaits can never wedge the game. */
  function tw(node, cfg) {
    return new Promise((res) => {
      let done = false;
      const fin = () => { if (!done) { done = true; res(); } };
      setTimeout(fin, ((cfg && cfg.duration) || 0) * 1000 + 140);
      try {
        new Konva.Tween(Object.assign({ node, onFinish: fin }, cfg)).play();
      } catch (e) { fin(); }
    });
  }

  /* ============================================================
     THE STAGE — a forward-scrolling journey inside a camera group
       worldLayer
        └─ cam (Group, x = -camX — the WHOLE journey in world coords)
           ├─ scenesG  scenery strips — one Group per accepted turn
           ├─ buildG   the house under construction
           ├─ propsG   spawned interactive props
           ├─ actorsG  wolf, pig friends, the hero
           └─ fxW      dust puffs, twinkles (world-space)
         fxLayer       name chips (screen-space)
     The world grows one stage-width per turn; the camera chases the hero.
     ============================================================ */
  let W = 800, H = 460, gy = 368;
  const stage = new Konva.Stage({ container: host, width: W, height: H });
  const worldLayer = new Konva.Layer();
  const fxLayer    = new Konva.Layer({ listening: false });
  stage.add(worldLayer, fxLayer);
  const cam     = new Konva.Group({ name: 'camera' });
  const scenesG = new Konva.Group({ name: 'scenes' });
  const buildG  = new Konva.Group({ name: 'build' });
  const propsG  = new Konva.Group({ name: 'props' });
  const actorsG = new Konva.Group({ name: 'actors' });
  const fxW     = new Konva.Group({ name: 'fxW', listening: false });
  cam.add(scenesG, buildG, propsG, actorsG, fxW);
  worldLayer.add(cam);
  /* journey geometry: the world is N stage-widths long and grows on the
   * right every accepted turn — the hero walks W px per beat */
  let worldW = 0;                                // total journey length (px)
  const sections = [];                           // {g, ss, x0}
  const secX = () => Math.max(0, worldW - W);    // newest stretch's world x
  /* the camera chases the hero's RENDERED position (heroG.x), not the
   * logical destination — otherwise its lerp outruns the eased walk
   * tween and the hero slides off the left edge of the frame */
  const camTarget = () =>
    clamp(heroG.x() - W * .34, 0, Math.max(0, worldW - W));

  /* ============================================================
     GAME STATE
     ============================================================ */
  const S = {
    started: false, busy: false, epoch: 0, demoOn: false,
    history: [], words: [], slips: 0,
    goal: 0, wolf: .14, heroX: 70, camX: 0, pushX: 0, turns: 0, buildStage: 0,
    riding: null, slipping: false, walking: false, dizzy: false,
    gear: [],
    sceneSeed: ((Math.random() * 0x7ffffffe) | 0) + 1,
    heroColor: '#FF6B57',
  };
  const okEp = (ep) => ep === S.epoch;
  const liveProps = [];          // {kind, raw, node, wx, yOff, bob, follower, gear}
  const followers = [];          // pig friends trailing the hero
  const latHist = [];
  let houseNode = null, curScene = null, headroomOK = false;

  /* ============================================================
     WORLD SECTIONS — every LLM scene_seed grows the NEXT stretch of
     the journey one stage-width past the current frontier. The hero
     then walks into it while the camera pans the whole world left.
     ============================================================ */
  const DEFAULT_SCENE = { biome: 'meadow', seed: S.sceneSeed, palette: 'warm',
                          props: ['flower', 'mushroom'] };
  function addSection(ss) {
    ss = ss || DEFAULT_SCENE;
    const x0 = worldW;
    const g = new Konva.Group({ x: x0, y: 0, name: 'section' });
    scenesG.add(g);
    gy = WORLD.render(g, W, H, ss);                // sketch fills 0..W local
    sections.push({ g, ss, x0 });
    worldW = x0 + W;
    curScene = ss;
    /* the building site rides the frontier — the house always stands
     * ahead in the newest stretch so the hero walks TOWARD it */
    if (houseNode) houseNode.position({ x: houseWX(), y: gy + 2 });
    /* stretches far behind the camera get torn down (node budget) */
    while (sections.length > 3 && sections[0].x0 < S.camX - W * .25) {
      hideChip();
      sections.shift().g.destroy();
    }
    return g;
  }
  const houseWX = () => worldW - W * .2;           // ~80% into the newest stretch
  const HOUSE_NAMES = { 1: 'straw', 2: 'stick', 3: 'brick' };
  function setBuild(st) {
    st = Math.max(0, Math.min(3, st | 0));
    if (st <= S.buildStage && houseNode) { S.buildStage = Math.max(S.buildStage, st); return; }
    S.buildStage = Math.max(S.buildStage, st);
    if (houseNode) { houseNode.destroy(); houseNode = null; }
    const kind = S.buildStage ? HOUSE_NAMES[S.buildStage] + ' house' : null;
    if (!kind) return;
    houseNode = PROPS.build(kind, S.sceneSeed + 31);
    houseNode.position({ x: houseWX(), y: gy + 2 });
    houseNode.scale({ x: .01, y: .01 });
    buildG.add(houseNode);
    tw(houseNode, { scaleX: 1.1, scaleY: 1.1, duration: .55, easing: Konva.Easings.BackEaseOut });
  }
  function scatterHouse() {
    if (!houseNode) return;
    houseNode.children.slice().forEach((c) => {
      tw(c, { x: c.x() + rnd(-110, 110), y: c.y() - rnd(30, 110),
              rotation: rnd(-260, 260), opacity: 0,
              duration: .55, easing: Konva.Easings.EaseIn });
    });
  }

  /* ============================================================
     THE WOLF — a real prop node stalking the hero in world coords.
     It creeps up from behind; the idle loop keeps it slinking forward.
     ============================================================ */
  const wolfG = PROPS.build('wolf', 4242);
  wolfG.scale({ x: 1.15, y: 1.15 });
  actorsG.add(wolfG);
  const wolfX = () => heroG.x() - W * .68 + S.wolf * W * .46;
  function setWolf(v) {
    S.wolf = clamp01(v);
    wolfFill.style.width = Math.round(S.wolf * 100) + '%';
    wolfMood.textContent =
      S.wolf > .9 ? 'PUFFING!!' : S.wolf > .68 ? 'HUFFY!' :
      S.wolf > .42 ? 'getting huffy' : S.wolf > .2 ? 'sniffing…' : 'far away';
  }

  /* ============================================================
     THE HERO — the kid's strokes, replayed as Konva.Line nodes
     ============================================================ */
  const heroG = new Konva.Group({ x: S.heroX, y: gy });   // world coords: feet ON the ground line
  const heroInk = new Konva.Group();
  const dizzyG = new Konva.Group({ y: -112, visible: false });
  heroG.add(heroInk); heroG.add(dizzyG);
  actorsG.add(heroG);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * 2 * i / 3;
    const st = SK.star(Math.cos(a) * 26, Math.sin(a) * 10, 8, 3.6, 5,
      { r: SK.rng(500 + i), strokeWidth: 1.4 });
    dizzyG.add(st);
  }

  /* name-chip hover: walk the graph up to the node tagged 'prop' */
  let chip = null, chipProp = null, chipTimer = 0;
  function propAncestor(n) {
    while (n && n !== stage && !n.getAttr('prop')) n = n.getParent();
    return (n && n.getAttr && n.getAttr('prop')) ? n : null;
  }
  function hideChip() {
    chipProp = null;
    if (chip) { const c = chip; chip = null; tw(c, { opacity: 0, duration: .15 })
      .then(() => c.destroy()); }
  }
  function showChip(node) {
    if (chipProp === node) return;
    hideChip();
    chipProp = node;
    const name = node.name() || node.getAttr('kind') || 'thing';
    const c = SK.nameChip(name);
    const r = node.getClientRect({ relativeTo: stage });
    c.position({ x: clamp(r.x + r.width / 2, 70, W - 70), y: Math.max(58, r.y - 10) });
    c.opacity(0);
    fxLayer.add(c);
    chip = c;
    tw(c, { opacity: 1, duration: .18 });
  }
  stage.on('mouseover', (e) => {
    const p = propAncestor(e.target);
    clearTimeout(chipTimer);
    if (p) { showChip(p); host.style.cursor = 'pointer'; }
  });
  stage.on('mouseout', (e) => {
    const p = propAncestor(e.target);
    host.style.cursor = '';
    if (p && p === chipProp)
      chipTimer = setTimeout(() => { if (chipProp === p) hideChip(); }, 60);
  });
  host.addEventListener('mouseleave', hideChip);

  /* ============================================================
     PROPS — spawned physically from gm.props[] into the newest
     stretch of world. Gravity rules: ground props drop out of the
     sketch-sky and settle with one small bounce, fliers swoop in
     and bob on the breeze, heavy things wait overhead for the bonk.
     ============================================================ */
  const MAX_PROPS = 12;
  let propSeq = 0;
  function spawnProp(rawKind, xFrac, o = {}) {
    const kind = PROPS.norm(rawKind);
    const node = PROPS.build(rawKind, (S.sceneSeed ^ (++propSeq * 7919)) >>> 0);
    const flier = PROPS.FLIER.has(kind);
    const heavy = PROPS.HEAVY.has(kind);
    const wx = secX() + W * (.14 + clamp(xFrac == null ? .5 : xFrac, 0, 1) * .72);
    const p = {
      kind, raw: String(rawKind || kind), node, wx,
      yOff: flier ? -rnd(90, 150) : 0,
      bob: rnd(0, Math.PI * 2),
      follower: 0, gear: false,
    };
    node.scale({ x: .01, y: .01 });
    propsG.add(node);
    if (flier) {
      /* swoops down in from ahead, then rides the air */
      node.position({ x: wx + 130, y: gy + p.yOff - 80 });
      tw(node, { x: wx, y: gy + p.yOff, rotation: rnd(-8, 8),
                 duration: .7, easing: Konva.Easings.EaseOut });
    } else if (heavy && !o.quiet) {
      /* parked overhead — the bonk gag sends it down onto the hero */
      node.position({ x: wx, y: gy - 205 });
    } else {
      /* drops and settles: gravity down, one small bounce, dust puff */
      node.position({ x: wx, y: gy - rnd(110, 175) });
      tw(node, { y: gy, duration: heavy ? .4 : .55,
                 easing: heavy ? Konva.Easings.EaseIn : Konva.Easings.BounceEaseOut })
        .then(() => {
          if (!p.node.getStage()) return;
          if (heavy) { worldShake(3); fxPuff(node.x(), gy - 8, '#CBC2B0', true); }
          else fxPuff(node.x(), gy - 3, '#E8DCC0');
        });
    }
    liveProps.push(p);
    const sc = o.quiet ? rnd(.6, .75) : rnd(.95, 1.12);
    tw(node, { scaleX: sc, scaleY: sc, duration: .5, easing: Konva.Easings.BackEaseOut });
    /* stage tidy-up: poof the oldest plain prop past the cap */
    const plain = liveProps.filter((q) => !q.follower && !q.gear);
    if (plain.length > MAX_PROPS) poofProp(plain[0]);
    return p;
  }
  function findProp(rawKind) {
    const kind = PROPS.norm(rawKind);
    return liveProps.find((p) => p.kind === kind && !p.gear && !p.follower) || null;
  }
  function removeFromList(p) {
    const i = liveProps.indexOf(p); if (i >= 0) liveProps.splice(i, 1);
    const j = followers.indexOf(p); if (j >= 0) followers.splice(j, 1);
    const k = S.gear.indexOf(p); if (k >= 0) S.gear.splice(k, 1);
  }
  function poofProp(p) {
    if (!p) return;
    removeFromList(p);
    tw(p.node, { scaleX: .01, scaleY: .01, rotation: 30, duration: .3,
                 easing: Konva.Easings.EaseIn })
      .then(() => p.node.destroy());
  }
  function destroyProp(p) { if (!p) return; removeFromList(p); p.node.destroy(); }
  function reactProp(p) {
    if (!p) return;
    /* a little hop + wiggle — every reaction reads on stage */
    tw(p.node, { y: gy + (p.yOff || 0) - 16, duration: .16, easing: Konva.Easings.EaseOut })
      .then(() => tw(p.node, { y: gy + (p.yOff || 0), duration: .3,
                     easing: Konva.Easings.BounceEaseOut }));
    tw(p.node, { rotation: -10, duration: .14 })
      .then(() => tw(p.node, { rotation: 8, duration: .14 }))
      .then(() => tw(p.node, { rotation: 0, duration: .3, easing: Konva.Easings.ElasticEaseOut }));
  }

  /* ---------- fx: dust puffs & win twinkles (world-space nodes) ---------- */
  function fxPuff(x, y, col, big) {
    const n = big ? 5 : 3, r = SK.rng(rndi(1, 9999));
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n + .4;
      const c = SK.circle(0, 0, big ? 11 : 7,
        { r, fill: col || '#E8DCC0', stroke: 'none', strokeWidth: 0 });
      c.position({ x, y });
      fxW.add(c);
      tw(c, { x: x + Math.cos(a) * 48, y: y + Math.sin(a) * 34 - 18,
              opacity: 0, duration: .8, easing: Konva.Easings.EaseOut })
        .then(() => c.destroy());
    }
  }
  function twinkle(x, y) {
    const st = SK.star(0, 0, rnd(9, 14), 4, 5, { r: SK.rng(rndi(1, 9999)), strokeWidth: 1.6 });
    st.position({ x, y }); st.scale({ x: .01, y: .01 });
    fxW.add(st);
    tw(st, { scaleX: 1, scaleY: 1, rotation: 90, duration: .4, easing: Konva.Easings.BackEaseOut })
      .then(() => tw(st, { opacity: 0, y: y - 26, duration: .5 }))
      .then(() => st.destroy());
  }
  function worldShake(px) {
    [worldLayer, fxLayer].forEach((l, i) => {
      setTimeout(() => {
        l.x(px);
        setTimeout(() => { l.x(-px); setTimeout(() => l.x(0), 60); }, 60);
      }, i * 40);
    });
  }

  /* ============================================================
     GAGS — comedy hung on real nodes
     ============================================================ */
  function coachSay(t, uhoh) {
    coachEl.textContent = t;
    coachEl.classList.toggle('uhoh', !!uhoh);
  }
  const setLine = (t) => { lineChip.textContent = t; };
  /* CSS display rules beat the [hidden] attribute — control chips by style */
  const showMs = (on) => { msChip.hidden = !on; msChip.style.display = on ? 'inline-block' : 'none'; };
  const showStop = (on) => { stopBtn.hidden = !on; stopBtn.style.display = on ? 'flex' : 'none'; };
  function showDizzy(on) {
    S.dizzy = on;
    dizzyG.visible(on);
    if (on) dizzyG.opacity(1);
    else tw(dizzyG, { opacity: 0, duration: .25 });
  }

  function gagName(kind, p) {
    if (kind === 'trampoline') return 'bounce';
    if (kind === 'wolf') return 'wolf';
    if (kind === 'pig') return 'pig';
    if (/^(.+ )?house$|^house$/.test(kind) ||
        /^(straw|sticks|bricks)$/.test(kind)) return 'material';
    if (PROPS.HEAVY.has(kind)) return 'bonk';
    if (PROPS.RIDE.has(kind)) return 'ride';
    if (kind === 'cake' || kind === 'snack' || kind === 'cookie jar') return 'eat';
    if (kind === 'sock') return 'wear';
    if (PROPS.SILLY.has(kind)) return 'slip';
    return 'plain';
  }

  async function applyGag(p, ep, force) {
    const g = force || gagName(p.kind, p);
    switch (g) {
      case 'ride': {
        /* scoot the mount under the hero, hop on, gallop up the trail */
        S.riding = p;
        p.yOff = 0;
        tw(p.node, { x: S.heroX - 6, y: gy, duration: .4, easing: Konva.Easings.EaseInOut });
        coachSay(`You hop on the ${p.raw} — giddyup!`);
        await sleep(380); if (!okEp(ep)) return;
        const h = Math.min(90, p.node.getClientRect({ relativeTo: cam }).height * .75);
        await tw(heroInk, { y: -h, duration: .34, easing: Konva.Easings.BackEaseOut });
        if (!okEp(ep)) { heroInk.y(0); return; }
        tw(p.node, { rotation: -6, duration: .16 })
          .then(() => tw(p.node, { rotation: 0, duration: .28 }));
        const nx = clamp(S.heroX + 190, 60, worldW - 40);
        S.heroX = nx;
        tw(p.node, { x: nx, duration: .9, easing: Konva.Easings.StrongEaseInOut });
        await tw(heroG, { x: nx, duration: .9, easing: Konva.Easings.StrongEaseInOut });
        if (!okEp(ep)) { heroInk.y(0); S.riding = null; return; }
        await tw(heroInk, { y: 0, duration: .3, easing: Konva.Easings.BounceEaseOut });
        S.riding = null;
        return;
      }
      case 'slip': {
        tw(p.node, { x: S.heroX + 44, y: gy, duration: .3 });
        p.yOff = 0;
        await sleep(320); if (!okEp(ep)) return;
        coachSay(`Whoops — a ${p.raw}! Right under your feet!`, true);
        setLine('Slip! Spin! Splat! …all better now.');
        S.slipping = true; S.slips++;
        showDizzy(true);
        const slipReset = () => {
          heroInk.rotation(0); heroInk.y(0); heroInk.scaleY(1);
          S.slipping = false;
        };
        /* up — the little "whoa" hop */
        tw(heroInk, { rotation: 380, duration: 1.0, easing: Konva.Easings.EaseInOut });
        await tw(heroInk, { y: -20, duration: .3, easing: Konva.Easings.EaseOut });
        if (!okEp(ep)) { slipReset(); return; }
        /* down — gravity slam, squash flat on the path, dust + stars */
        tw(heroInk, { scaleY: .5, duration: .18, easing: Konva.Easings.EaseIn });
        await tw(heroInk, { y: 8, duration: .26, easing: Konva.Easings.EaseIn });
        if (!okEp(ep)) { slipReset(); return; }
        fxPuff(S.heroX + 44, gy - 6, '#E8DCC0', true);
        worldShake(3);
        await sleep(430); if (!okEp(ep)) { slipReset(); return; }
        /* dust off — spring back to feet, stars fade */
        tw(heroInk, { scaleY: 1, duration: .55, easing: Konva.Easings.ElasticEaseOut });
        await tw(heroInk, { y: -14, duration: .24, easing: Konva.Easings.EaseOut });
        if (!okEp(ep)) { slipReset(); return; }
        await tw(heroInk, { y: 0, rotation: 360, duration: .3,
                            easing: Konva.Easings.BounceEaseOut });
        heroInk.rotation(0); heroInk.y(0);
        showDizzy(false);
        S.slipping = false;
        return;
      }
      case 'bonk': {
        /* heavy thing drops from the sky — thump! */
        p.node.position({ x: S.heroX + 26, y: gy - 200 });
        tw(p.node, { scaleX: 1, scaleY: 1, duration: .25 });
        await sleep(300); if (!okEp(ep)) return;
        coachSay(`Bonk! A falling ${p.raw}!`, true);
        S.slips++;
        await tw(p.node, { y: gy - 46, duration: .3, easing: Konva.Easings.EaseIn });
        if (!okEp(ep)) return;
        worldShake(4);
        fxPuff(S.heroX + 26, gy - 40, '#CBC2B0', true);
        showDizzy(true);
        tw(heroInk, { scaleY: .55, duration: .12 });
        await sleep(200);
        tw(heroInk, { scaleY: 1, duration: .6, easing: Konva.Easings.ElasticEaseOut });
        tw(p.node, { y: gy, x: S.heroX + 86, rotation: -12, duration: .5,
                     easing: Konva.Easings.BounceEaseOut });
        await sleep(700); if (!okEp(ep)) { showDizzy(false); return; }
        showDizzy(false);
        return;
      }
      case 'eat': {
        tw(p.node, { x: S.heroX + 40, y: gy - 46, duration: .35 });
        coachSay(`Yum — the ${p.raw} disappears fast!`);
        await sleep(380); if (!okEp(ep)) return;
        tw(heroInk, { scaleX: 1.16, duration: .12 });
        await tw(p.node, { x: S.heroX + 6, y: gy - 58, scaleX: .05, scaleY: .05,
                           duration: .28, easing: Konva.Easings.EaseIn });
        destroyProp(p);
        tw(heroInk, { scaleX: 1, duration: .55, easing: Konva.Easings.ElasticEaseOut });
        return;
      }
      case 'wear': {
        /* the prop literally re-parents INTO the hero group — a hat! */
        await sleep(300); if (!okEp(ep)) return;
        const lx = p.node.x() - heroG.x(), ly = p.node.y() - heroG.y();
        p.node.moveTo(heroG);
        p.node.position({ x: lx, y: ly });
        p.gear = true;
        S.gear.push(p);
        coachSay(`The ${p.raw} is yours now — it rides along as a hat!`);
        await tw(p.node, { x: 0, y: -118, scaleX: .55, scaleY: .55, rotation: -6,
                           duration: .5, easing: Konva.Easings.BackEaseOut });
        if (S.gear.length > 3) poofProp(S.gear.shift());
        return;
      }
      case 'material': {
        /* building stuff scoots to the house plot and becomes wall */
        const tier = /brick/.test(p.kind) ? 3 : /stick/.test(p.kind) ? 2 : 1;
        tw(p.node, { x: houseWX() - 30, y: gy, duration: .55, easing: Konva.Easings.EaseInOut });
        await sleep(560); if (!okEp(ep)) return;
        setBuild(tier);
        coachSay(`Building stuff! The ${HOUSE_NAMES[S.buildStage]} house takes shape.`);
        fxPuff(houseWX() - 30, gy - 50, '#E8DCC0', true);
        tw(p.node, { scaleX: .05, scaleY: .05, opacity: 0, duration: .3 })
          .then(() => destroyProp(p));
        await heroHop(ep);
        return;
      }
      case 'wolf': {
        destroyProp(p);                      // our actor wolf IS the wolf node
        coachSay('The Big Bad Wolf peeks out — huff incoming!', true);
        setWolf(S.wolf + .24);
        return;
      }
      case 'pig': {
        /* a pig friend joins — it becomes a follower node in actorsG */
        if (followers.length >= 3) { reactProp(p); return; }
        const px = p.node.x(), py = p.node.y();
        p.node.moveTo(actorsG);
        p.node.position({ x: px, y: py });
        p.node.scale({ x: .62, y: .62 });
        p.follower = followers.length + 1;
        followers.push(p);
        coachSay(`A pig friend joins the trip! (${followers.length}/3 pals)`);
        await heroHop(ep);
        return;
      }
      case 'bounce': {
        tw(p.node, { x: S.heroX + 30, duration: .3 });
        await sleep(300); if (!okEp(ep)) return;
        coachSay('Boing! Boing! Best shortcut ever!');
        tw(p.node, { scaleY: .6, duration: .14 })
          .then(() => tw(p.node, { scaleY: 1, duration: .22, easing: Konva.Easings.ElasticEaseOut }));
        await tw(heroInk, { y: -110, duration: .4, easing: Konva.Easings.EaseOut });
        await tw(heroInk, { y: 0, duration: .4, easing: Konva.Easings.BounceEaseOut });
        return;
      }
      default: {
        /* sensible, quiet props: the hero gives a happy hop */
        await heroHop(ep);
        return;
      }
    }
  }
  async function heroHop(ep) {
    await tw(heroInk, { y: -26, duration: .26, easing: Konva.Easings.EaseOut });
    if (!okEp(ep)) { heroInk.y(0); return; }
    await tw(heroInk, { y: 0, duration: .3, easing: Konva.Easings.BounceEaseOut });
  }
  async function heroSlipBare(ep) {           // silly word, no prop to blame
    S.slipping = true; S.slips++;
    showDizzy(true);
    const slipReset = () => {
      heroInk.rotation(0); heroInk.y(0); heroInk.scaleY(1);
      S.slipping = false;
    };
    tw(heroInk, { rotation: 372, duration: .95, easing: Konva.Easings.EaseInOut });
    await tw(heroInk, { y: -16, duration: .3, easing: Konva.Easings.EaseOut });
    if (!okEp(ep)) { slipReset(); return; }
    tw(heroInk, { scaleY: .5, duration: .16, easing: Konva.Easings.EaseIn });
    await tw(heroInk, { y: 7, duration: .24, easing: Konva.Easings.EaseIn });
    if (!okEp(ep)) { slipReset(); return; }
    fxPuff(S.heroX + 30, gy - 6, '#E8DCC0', true);
    worldShake(3);
    await sleep(400); if (!okEp(ep)) { slipReset(); return; }
    tw(heroInk, { scaleY: 1, duration: .5, easing: Konva.Easings.ElasticEaseOut });
    await tw(heroInk, { y: -12, duration: .22, easing: Konva.Easings.EaseOut });
    if (!okEp(ep)) { slipReset(); return; }
    await tw(heroInk, { y: 0, rotation: 0, duration: .28,
                        easing: Konva.Easings.BounceEaseOut });
    heroInk.rotation(0); heroInk.y(0);
    showDizzy(false);
    S.slipping = false;
  }

  /* ---------- the huff & puff — the wolf rocks the WHOLE stage ---------- */
  async function huffPuff(ep) {
    coachSay('The wolf huffs… and PUFFS!', true);
    setLine('Huff! Puff! Hold onto your doodles!');
    await tw(wolfG, { scaleX: 1.55, scaleY: 1.4, duration: .45, easing: Konva.Easings.EaseOut });
    if (!okEp(ep)) { tw(wolfG, { scaleX: 1.15, scaleY: 1.15, duration: .3 }); return; }
    tw(wolfG, { scaleX: 1.05, scaleY: 1.2, duration: .3 });
    const wy = gy - 66, r = SK.rng(rndi(1, 9999));
    for (let i = 0; i < 4; i++) {
      const c = SK.ellipse(0, 0, 15 + i * 4, 10 + i * 3,
        { r, fill: '#EFE4D0', strokeWidth: 1.6 });
      c.position({ x: wolfG.x() + 52 + i * 12, y: wy - 8 + i * 9 });
      fxW.add(c);
      tw(c, { x: houseWX() + 60, y: wy - 14 + i * 5, scaleX: 2.4, scaleY: 2.2, opacity: 0,
              duration: 1.05 + i * .16, easing: Konva.Easings.EaseIn })
        .then(() => c.destroy());
    }
    worldShake(5);
    S.pushX = 22;                              // the gust shoves the whole stage, then decays
    await sleep(720); if (!okEp(ep)) return;
    if (S.buildStage > 0 && S.buildStage < 3) {
      scatterHouse();
      await sleep(620); if (!okEp(ep)) return;
      const st = Math.max(0, S.buildStage - 1);
      if (houseNode) { houseNode.destroy(); houseNode = null; }
      S.buildStage = 0;
      setBuild(st);                              // rebuild one tier weaker
      setGoal(S.goal - .06, true);               // a small, honest fail-beat dip
      coachSay('Whoosh! The weak house blew to bits. Stronger stuff needed!', true);
    } else if (S.buildStage >= 3) {
      tw(buildG, { x: 5, duration: .07 })
        .then(() => tw(buildG, { x: -4, duration: .07 }))
        .then(() => tw(buildG, { x: 0, duration: .07 }));
      coachSay('The brick house does NOT budge. Not one brick!');
      fxPuff(houseWX(), gy - 90, '#EFE4D0');
    }
    tw(wolfG, { scaleX: 1.15, scaleY: 1.15, duration: .5, easing: Konva.Easings.ElasticEaseOut });
    setWolf(.45);                             // he needs a breather
  }

  /* ============================================================
     HUD — goal bar, wolf meter, chips
     ============================================================ */
  /* goal bar climbs smoothly (CSS spring) and monotonic — the only dip
   * allowed is an explicit fail beat (the wolf's huff wrecking a house) */
  function setGoal(p, allowDip) {
    S.goal = allowDip ? clamp01(p) : Math.max(S.goal, clamp01(p));
    const pct = Math.round(S.goal * 100);
    goalFill.style.width = pct + '%';
    goalPig.style.left = pct + '%';
    goalPig.style.transform = `translateX(${-pct}%)`;
    if (S.goal >= .82) setBuild(3); else if (S.goal >= .5) setBuild(2);
    else if (S.goal >= .28) setBuild(1);
  }
  function setChips(list) {
    choicesEl.innerHTML = '';
    (list || []).slice(0, 4).forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice';
      b.textContent = c;
      b.addEventListener('click', () => { blank.value = c; takeTurn(c); });
      choicesEl.appendChild(b);
    });
  }
  function showDym(word) {
    if (!word) { dymEl.hidden = true; return; }
    dymBtn.textContent = word;
    dymBtn.dataset.word = word;
    dymEl.hidden = false;
  }
  function setInputs(on) {
    blank.disabled = !on; goBtn.disabled = !on;
  }

  /* ============================================================
     DID YOU MEAN — local edit-distance guess (LLM field first)
     ============================================================ */
  const DYM_WORDS = ['straw','sticks','bricks','house','home','unicorn','banana','peel',
    'wolf','pig','bridge','boat','raft','ladder','torch','lantern','cookie','cake',
    'umbrella','balloon','kite','mushroom','flower','tree','bush','rock','key','door',
    'sword','wand','shield','map','drum','bell','gift','star','crown','hat','vine',
    'log','plank','stones','tunnel','trampoline','puddle','slime','soap','toaster',
    'piano','anvil','fridge','sock','run','hide','build','jump','swim','dig','climb',
    'inside','sleep','dance','sing','gather','cross','river'];
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

  /* kid-safety gate — the stage never sends unkind words upstream */
  const NOT_KIND = /(?:^|[^a-z])(damn|hell|stupid|idiot|dumb|shut up|hate you|kill|die|poop|fart|butt|ugly)(?:[^a-z]|$)/i;
  function kindCheck(word) {
    if (NOT_KIND.test(word)) {
      coachSay("Hmm — let's keep our story words kind and silly!", true);
      return false;
    }
    return true;
  }

  /* ============================================================
     THE LLM LOOP
     ============================================================ */
  const llm = new StoryLLM({
    mode: 'remote',
    onStatus(st) {
      if (st.waiting) { setLine('waiting for a little memory room…'); }
      else if (st.failed) { setLine('the story-brain hiccuped — trying a helper…'); }
    },
  });

  async function ensureHeadroom() {
    if (headroomOK) return true;
    showMs(true);
    msChip.textContent = 'checking memory…';
    try { headroomOK = await llm.waitForHeadroom(4, 10000); }
    catch (e) { headroomOK = false; }
    if (!headroomOK) coachSay('The computer is a bit full — the story may move slowly.', true);
    return headroomOK;
  }

  function latShow(meta) {
    showMs(true);
    const ms = meta && meta.ms ? meta.ms : 0;
    if (!meta || meta.source === 'offline') {
      msChip.textContent = 'demo mode · offline narrator';
      msChip.classList.add('off');
      return;
    }
    msChip.classList.remove('off');
    const who = meta.mode === 'local' ? 'local model' : 'GLM';
    msChip.textContent = `${who} answered in ${(ms / 1000).toFixed(1)}s`;
    latHist.push(ms);
  }

  let queuedWord = null;                       // one turn may wait out a transition
  async function takeTurn(wordParam) {
    const word = String(wordParam != null ? wordParam : blank.value).trim().slice(0, 28);
    if (!word) { if (S.started && !S.busy) coachSay('Type a little word first — try "straw" or be silly!'); return; }
    if (S.busy || !S.started) {
      /* a word typed mid-animation waits politely for the stage to settle */
      if (word && S.started && !S.demoOn) queuedWord = word;
      return;
    }
    if (!kindCheck(word)) { blank.value = ''; return; }
    const ep = S.epoch;
    S.busy = true;
    setInputs(false);
    blank.value = '';
    showDym(null);
    stageEl.classList.add('thinking');
    setLine('asking the story-brain…');
    showMs(true);
    msChip.textContent = 'asking the story-brain…';

    await ensureHeadroom();
    if (!okEp(ep)) { S.busy = false; return; }

    let gm = null;
    try {
      gm = await llm.next({ goal: GOAL, history: S.history.slice(-4),
                            playerText: word, hero: heroDesc() });
    } catch (e) { gm = null; }
    stageEl.classList.remove('thinking');
    if (!okEp(ep)) { S.busy = false; return; }
    if (!gm) {
      setLine('the story hiccuped — try another word!');
      coachSay('The story hiccuped — try another word!', true);
      S.busy = false; setInputs(true);
      return;
    }

    latShow(gm._meta);
    if (gm._meta && gm._meta.source === 'offline')
      setLine('demo mode — the canned narrator is answering');

    /* --- narrative + obstacles (textContent — always kid-safe) --- */
    if (gm.narrative) narrEl.textContent = gm.narrative;
    obRow.innerHTML = '';
    (gm.obstacles || []).slice(0, 4).forEach((o) => {
      const c = document.createElement('span');
      c.className = 'obstacle';
      c.textContent = 'watch out: ' + o;
      obRow.appendChild(c);
    });
    S.history.push(`${word} -> ${(gm.narrative || '').slice(0, 90)}`);
    S.words.push({ word, silly: !gm.success });
    setChips(gm.choices);

    /* --- THE JOURNEY MOVES FORWARD: the reply's scene_seed grows the
       NEXT stretch one stage-width ahead, then the hero walks into it
       while the camera pans the whole world underfoot --- */
    S.sceneSeed = gm.scene_seed.seed || S.sceneSeed;
    addSection(gm.scene_seed);
    S.turns++;
    const dest = Math.min(secX() + W * .34, worldW - 30);
    S.heroX = dest;
    S.walking = true;
    setLine('onward! the next stretch unrolls…');
    await tw(heroG, { x: dest, duration: S.demoOn ? .9 : 1.15,
                      easing: Konva.Easings.EaseInOut });
    S.walking = false;
    heroInk.rotation(0); heroInk.y(0);          // ground clamp after travel
    if (!okEp(ep)) { S.busy = false; return; }

    /* --- typed-word props: physical spawns + gags --- */
    let spawnedAny = false, gagRun = false;
    for (const pr of (gm.props || [])) {
      if (!okEp(ep)) break;
      const kind = PROPS.norm(pr.kind);
      if (pr.action === 'remove') {
        const p = findProp(kind); if (p) poofProp(p);
        continue;
      }
      if (pr.action === 'react') {
        const p = findProp(kind);
        if (p) reactProp(p); else spawnProp(kind, pr.x, { quiet: true });
        continue;
      }
      /* spawn */
      if (kind === 'wolf') {                       // wolf = the actor, not a prop
        coachSay('The Big Bad Wolf peeks out — huff incoming!', true);
        setWolf(S.wolf + .24);
        continue;
      }
      const exist = findProp(kind);
      if (exist) { reactProp(exist); continue; }
      const p = spawnProp(kind, pr.x);
      spawnedAny = true;
      const gag = gagName(kind, p);
      /* silly turns turn ANY new prop into a slip gag */
      const want = gag === 'plain' && !gm.success ? 'slip' : gag;
      if (want !== 'plain') {
        gagRun = true;
        await sleep(360); if (!okEp(ep)) break;
        await applyGag(p, ep, want);
      }
      await sleep(120);
    }
    /* silly word with nothing spawned → trip on thin air */
    if (!gm.success && !gagRun && okEp(ep)) await heroSlipBare(ep);
    if (gm.success && !spawnedAny) await heroHop(ep);

    /* --- did you mean --- */
    showDym(gm.did_you_mean || localDym(word));

    /* --- goal + wolf pressure ---
     * the LLM's goal_progress is the story's estimate, but every
     * accepted turn also means a whole world-section genuinely
     * traveled — floor the bar at distance-walked so the journey
     * always closes (≥.9 by word 8, arrival by word 9) */
    const gained = Math.max(0, (gm.goal_progress || 0) - S.goal);
    setGoal(Math.max(gm.goal_progress || 0, Math.min(.985, S.turns * .115)));
    const wolfy = /wolf|huff|puff|blow/i.test(
      (gm.narrative || '') + ' ' + (gm.obstacles || []).join(' '));
    let dw = .05 + (gm.success ? 0 : .10) + (gm.obstacles || []).length * .03 - gained * .35;
    if (wolfy) dw += .14;
    setWolf(S.wolf + dw);

    if (S.wolf >= .92 && okEp(ep)) await huffPuff(ep);

    /* --- win --- */
    if (S.goal >= .98 && okEp(ep)) { await winSeq(ep); return; }
    S.busy = false;
    if (!S.demoOn) {
      setInputs(true);
      blank.focus({ preventScroll: true });
      if (queuedWord) { const q = queuedWord; queuedWord = null; takeTurn(q); }
    }
  }
  function submitWord() { takeTurn(); }

  /* ============================================================
     WIN
     ============================================================ */
  async function winSeq(ep) {
    setBuild(3);
    coachSay('Run! The brick house door is open!');
    setLine('inside — quick! the wolf is coming!');
    const tx = houseWX() - 56;
    S.heroX = tx; S.walking = true;
    await tw(heroG, { x: tx, duration: 1.1, easing: Konva.Easings.StrongEaseInOut });
    S.walking = false;
    if (!okEp(ep)) return;
    for (let i = 0; i < 8; i++)
      setTimeout(() => twinkle(houseWX() - 60 + rnd(-50, 90), gy - rnd(70, 160)), i * 90);
    await tw(heroInk, { scaleX: .01, duration: .45, easing: Konva.Easings.EaseIn });  // squeezes inside!
    if (!okEp(ep)) { heroInk.scaleX(1); return; }
    await sleep(400);
    const sillyN = S.words.filter((w) => w.silly).length;
    winTitle.textContent =
      `Your hero made it in ${S.words.length} word${S.words.length === 1 ? '' : 's'}` +
      (sillyN ? ` — with ${sillyN} silly slip${sillyN === 1 ? '' : 's'}!` : ' — no slips at all!');
    recapEl.innerHTML = '';
    const line = document.createElement('p');
    line.appendChild(document.createTextNode('Your story words: '));
    S.words.slice(-12).forEach((w, i) => {
      const b = document.createElement('b');
      b.textContent = w.word;
      line.appendChild(b);
      if (i < Math.min(12, S.words.length) - 1)
        line.appendChild(document.createTextNode(' · '));
    });
    recapEl.appendChild(line);
    if (latHist.length) {
      const avg = Math.round(latHist.reduce((a, b) => a + b, 0) / latHist.length / 100) / 10;
      const p2 = document.createElement('p');
      const b2 = document.createElement('b');
      b2.textContent = `the real story-brain answered every beat (avg ${avg}s)`;
      p2.appendChild(b2);
      p2.appendChild(document.createTextNode(' — the pigs are safe in the brick house!'));
      recapEl.appendChild(p2);
    }
    endOv.hidden = false;
    requestAnimationFrame(() => endOv.classList.add('show'));
    S.busy = false;
  }

  /* ============================================================
     BEAT 0 — THE MAKER (a second tiny Konva stage)
     Every crayon stroke = a real Konva.Line node.
     ============================================================ */
  const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  let selColor = CRAYONS[1], mStrokes = [], curStroke = null, curLine = null, makerBusy = false;

  const mStage = new Konva.Stage({ container: makerHost, width: 320, height: 230 });
  const paperLayer = new Konva.Layer({ listening: false });
  const drawLayer = new Konva.Layer();
  mStage.add(paperLayer, drawLayer);

  function sizeMaker() {
    const w = Math.max(280, makerHost.clientWidth || 420);
    const h = Math.max(220, makerHost.clientHeight || 230);
    mStage.size({ width: w, height: h });
    paperLayer.destroyChildren();
    paperLayer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: '#FFFDF6' }));
    const r = SK.rng(11);
    for (let y = 44; y < h - 10; y += 44)
      paperLayer.add(SK.line(14, y, w - 14, y, { r, stroke: '#EFE3C8', strokeWidth: 1.5, amp: .6 }));
    /* a little doodled sun in the corner, for courage */
    paperLayer.add(SK.circle(w - 30, 26, 12, { r, stroke: '#FFD56E', strokeWidth: 2.4 }));
  }
  function clearMaker() {
    mStrokes = []; curStroke = null; curLine = null;
    drawLayer.destroyChildren();
  }
  function mPos(e) {
    mStage.setPointersPositions(e.evt || e);
    return mStage.getPointerPosition();
  }
  function beginStroke(e) {
    if (makerBusy || curStroke) return;
    e.evt && e.evt.preventDefault && e.evt.preventDefault();
    const p = mPos(e);
    if (!p) return;
    curStroke = { c: selColor, w: 11, pts: [p.x, p.y], closed: false };
    curLine = new Konva.Line({
      points: [p.x, p.y, p.x + .1, p.y], stroke: selColor, strokeWidth: 11,
      lineCap: 'round', lineJoin: 'round', tension: .4, listening: false,
    });
    drawLayer.add(curLine);
    const move = (ev) => {
      if (!curStroke) return;
      mStage.setPointersPositions(ev);
      const q = mStage.getPointerPosition();
      if (!q) return;
      const pts = curStroke.pts, n = pts.length;
      if (Math.hypot(q.x - pts[n - 2], q.y - pts[n - 1]) < 3) return;
      pts.push(q.x, q.y);
      curLine.points(pts);
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      endStroke(ev);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  function endStroke() {
    if (!curStroke) return;
    const pts = curStroke.pts;
    if (pts.length < 8) {                       /* a tap = a crayon dot */
      curLine.destroy();
      drawLayer.add(new Konva.Circle({
        x: pts[0], y: pts[1], radius: 5.5, fill: curStroke.c, listening: false }));
      mStrokes.push({ c: curStroke.c, w: 11, pts: pts.slice(), closed: false });
    } else {
      const n = pts.length;
      if (Math.hypot(pts[n - 2] - pts[0], pts[n - 1] - pts[1]) < 18 && n > 20) {
        curStroke.closed = true;
        curLine.closed(true);
      }
      mStrokes.push(curStroke);
    }
    curStroke = null; curLine = null;
  }
  mStage.on('pointerdown', beginStroke);

  /* "Surprise me" — programmatic monster drawn the same way a kid would */
  function surpriseStrokes() {
    const w = mStage.width(), h = mStage.height();
    const r = SK.rng(rndi(1, 0x7ffffffe));
    const c = pickA([CRAYONS[1], CRAYONS[3], CRAYONS[4], CRAYONS[5]]);
    const lite = { '#FF6B57': '#FFC9BF', '#4FB06D': '#B7E6C3',
                   '#5DA9E9': '#C7E6FA', '#B565D8': '#DCC3F2' }[c] || '#FFE3D6';
    const cx = w / 2, cy = h / 2 + 14;
    const bw = r.rr(110, 142), bh = r.rr(92, 114);
    const out = [];
    const ell = (ex, ey, rx, ry, n, jit) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * 2 * i / n;
        pts.push([ex + Math.cos(a) * rx + r.rr(-jit, jit),
                  ey + Math.sin(a) * ry + r.rr(-jit, jit)]);
      }
      return pts;
    };
    const zig = (ex, ey, rx, ry, col, wd) => {              /* crayon fill scribble */
      for (let y = -ry + 8; y < ry - 4; y += 12) {
        const half = rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)));
        if (half < 6) continue;
        const pts = [];
        for (let x = -half; x <= half; x += 9)
          pts.push([ex + x, ey + y + Math.sin(x * .3) * 3]);
        out.push({ c: col, pts: flatOf(pts), w: wd, closed: false });
      }
    };
    out.push({ c, pts: flatOf(ell(cx, cy, bw / 2, bh / 2, 26, 2)), w: 10, closed: true });
    zig(cx, cy + 8, bw * .4, bh * .34, lite, 8);
    out.push({ c, pts: flatOf([[cx, cy - bh / 2 + 5], [cx - 8, cy - bh / 2 - 16], [cx + 5, cy - bh / 2 - 30]]), w: 7, closed: false });
    out.push({ c: '#FFC53D', pts: flatOf(ell(cx + 5, cy - bh / 2 - 34, 8, 8, 12, 1.5)), w: 8, closed: true });
    [[cx - bw * .18, cy - bh * .18, 13, 15], [cx + bw * .22, cy - bh * .14, 9, 11]]
      .forEach(([ex, ey, rx, ry], i) => {
        zig(ex, ey, rx * .8, ry * .8, '#FFFDF6', 7);
        out.push({ c: INK, pts: flatOf(ell(ex + 3, ey + 1, 4, 4.5, 10, 1)), w: 9, closed: true });
        out.push({ c: INK, pts: flatOf(ell(ex, ey, rx, ry, 16, 2)), w: 5, closed: true });
      });
    const sm = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * .18 + Math.PI * .64 * i / 14;
      sm.push([cx + 2 + Math.cos(a) * bw * .22, cy + 6 + Math.sin(a) * bh * .16]);
    }
    out.push({ c: INK, pts: flatOf(sm), w: 6, closed: false });
    out.push({ c: '#FF6B57', pts: flatOf(ell(cx - bw * .4, cy + 2, 5, 4, 10, 1.5)), w: 6, closed: true });
    out.push({ c: '#FF6B57', pts: flatOf(ell(cx + bw * .42, cy + 4, 4, 3.5, 10, 1.5)), w: 6, closed: true });
    out.push({ c: '#6B4A2A', pts: flatOf(ell(cx - bw * .26, cy + bh * .47, bw * .15, 8, 12, 2)), w: 8, closed: true });
    out.push({ c: '#6B4A2A', pts: flatOf(ell(cx + bw * .26, cy + bh * .47, bw * .15, 8, 12, 2)), w: 8, closed: true });
    return out;
  }
  async function surpriseMe(fast, ep) {
    if (makerBusy) return;
    makerBusy = true;
    clearMaker();
    for (const st of surpriseStrokes()) {
      if (ep != null && !okEp(ep)) { makerBusy = false; return; }
      mStrokes.push(st);
      const line = new Konva.Line({
        points: st.pts, stroke: st.c, strokeWidth: st.w, closed: !!st.closed,
        lineCap: 'round', lineJoin: 'round', tension: .4, listening: false,
      });
      drawLayer.add(line);
      await sleep(fast ? 55 : 140);
    }
    makerBusy = false;
  }

  /* the kid's strokes → a normalized hero group (feet at y=0) */
  function buildHero() {
    if (!mStrokes.length) return false;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const st of mStrokes)
      for (let i = 0; i < st.pts.length; i += 2) {
        x0 = Math.min(x0, st.pts[i]); x1 = Math.max(x1, st.pts[i]);
        y0 = Math.min(y0, st.pts[i + 1]); y1 = Math.max(y1, st.pts[i + 1]);
      }
    const w = Math.max(10, x1 - x0), h = Math.max(10, y1 - y0);
    if (w * h < 90) return false;
    const k = Math.min(96 / w, 104 / h, 1.8);
    const cx = (x0 + x1) / 2;
    heroInk.destroyChildren();
    const rj = SK.rng(rndi(1, 99999));
    mStrokes.forEach((st, i) => {
      const pts = [];
      for (let j = 0; j < st.pts.length; j += 2)
        pts.push((st.pts[j] - cx) * k, (st.pts[j + 1] - y1) * k);
      if (pts.length < 4) pts.push(pts[0] + 1.5, pts[1] + 1.5);
      /* pale ink ghost pass under each crayon line = hand-drawn double stroke */
      const gp = pts.map((v, j2) => v + (j2 % 2 ? rj.rr(-1.6, 1.6) : rj.rr(-1.6, 1.6)));
      heroInk.add(new Konva.Line({
        points: gp, stroke: INK, strokeWidth: Math.max(2, st.w * k * 1.4),
        closed: !!st.closed, tension: .4, opacity: .15,
        lineCap: 'round', lineJoin: 'round', listening: false,
      }));
      const ln = new Konva.Line({
        points: pts.slice(), stroke: st.c, strokeWidth: Math.max(2.6, st.w * k),
        closed: !!st.closed, tension: .4, lineCap: 'round', lineJoin: 'round',
        listening: false,
      });
      ln.setAttr('bpts', pts);                  // base points for the boil wobble
      heroInk.add(ln);
    });
    /* dominant color → hero's name for the LLM */
    const tally = {};
    mStrokes.forEach((st) => { tally[st.c] = (tally[st.c] || 0) + st.pts.length; });
    S.heroColor = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || CRAYONS[1];
    /* pop onto the stage */
    heroInk.scale({ x: .01, y: .01 });
    tw(heroInk, { scaleX: 1, scaleY: 1, duration: .5, easing: Konva.Easings.BackEaseOut });
    return true;
  }
  const COLORWORDS = { '#FF6B57': 'coral-red', '#FFC53D': 'sun-yellow',
    '#4FB06D': 'leaf-green', '#5DA9E9': 'sky-blue',
    '#B565D8': 'berry-purple', '#2B2118': 'inky-black' };
  const heroDesc = () =>
    `a kid-drawn doodle hero in ${COLORWORDS[S.heroColor] || 'crayon'} crayon`;

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
    setLine('off we go! type a word to steer the story');
    setChips(['gather straw', 'find sticks', 'look for bricks', 'unicorn']);
    setInputs(true);
    tapCheck();
    blank.focus({ preventScroll: true });
  }
  /* wipe the journey back to the spawn meadow (keeps the drawn hero) */
  function resetWorld() {
    [...liveProps].forEach((p) => p.node.destroy());
    liveProps.length = 0; followers.length = 0; S.gear = [];
    if (houseNode) { houseNode.destroy(); houseNode = null; }
    scenesG.destroyChildren(); sections.length = 0;
    fxW.destroyChildren();
    hideChip();
    worldW = 0;
    S.history = []; S.words = []; S.slips = 0; S.turns = 0;
    queuedWord = null;
    S.goal = 0; S.wolf = .14; S.buildStage = 0;
    S.riding = null; S.slipping = false; S.walking = false;
    S.camX = 0; S.pushX = 0; S.heroX = W * .3;
    cam.x(0);
    heroInk.position({ x: 0, y: 0 }); heroInk.rotation(0);
    heroInk.scale({ x: 1, y: 1 });
    heroG.position({ x: S.heroX, y: gy });
    showDizzy(false); dizzyG.opacity(1);
    addSection(DEFAULT_SCENE);                  // the spawn stretch
    setGoal(0); setWolf(.14); wolfG.x(wolfX());
  }
  function resetGame(toMaker) {
    S.epoch++;
    S.busy = false; S.demoOn = false; S.started = false;
    headroomOK = false;
    resetWorld();
    heroInk.destroyChildren();
    narrEl.textContent = 'First, draw your hero…';
    obRow.innerHTML = ''; setChips([]); showDym(null);
    coachSay('The crayons are waiting!');
    setLine('Draw your hero to begin!');
    showMs(false); msChip.classList.remove('off');
    setInputs(false);
    endOv.classList.remove('show'); endOv.hidden = true;
    showStop(false);
    if (toMaker) {
      clearMaker();                             /* fresh page for the new hero */
      makerOv.hidden = false;
      requestAnimationFrame(() => { makerOv.classList.add('show'); sizeMaker(); });
    } else startStory();
  }
  function tapCheck() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    tapType.style.display = (coarse && S.started) ? 'block' : 'none';
  }

  /* ============================================================
     WATCH IT PLAY — the WHOLE journey through the real LLM
     ============================================================ */
  const DEMO_WORDS = ['gather straw', 'find sticks', 'unicorn', 'cross the river',
    'banana peel', 'gather bricks', 'build a house', 'hide inside'];
  const EXTRA_WORDS = ['more bricks', 'fix the walls', 'the brick house', 'lock the door',
    'run inside', 'safe at home', 'close the windows', 'home sweet home'];
  async function startDemo() {
    const ep = ++S.epoch;
    S.demoOn = true;
    showStop(true);
    endOv.classList.remove('show'); endOv.hidden = true;
    heroInk.scale({ x: 1, y: 1 }); heroInk.rotation(0); heroInk.y(0);   // back on stage
    setInputs(false);
    coachSay('The show paints a hero first…');

    showMs(true);
    msChip.textContent = 'checking memory…';
    const hr = await llm.waitForHeadroom(4, 12000).catch(() => false);
    if (!okEp(ep)) return;
    headroomOK = hr;
    if (!hr) coachSay('The machine is busy — the show may be slow!', true);

    if (!heroInk.children.length) {
      makerOv.hidden = false;
      requestAnimationFrame(() => makerOv.classList.add('show'));
      await sleep(280); if (!okEp(ep)) return;
      await surpriseMe(true, ep); if (!okEp(ep)) return;
      if (!buildHero()) { S.demoOn = false; showStop(false); return; }
      await sleep(320); if (!okEp(ep)) return;
    }
    if (!S.started) startStory();
    setInputs(false);
    await sleep(420); if (!okEp(ep)) return;

    const queue = DEMO_WORDS.concat(EXTRA_WORDS);
    for (let i = 0; i < queue.length; i++) {
      if (!okEp(ep) || !S.demoOn) return;
      if (S.goal >= .98) break;
      const word = queue[i];
      while (S.busy && okEp(ep)) await sleep(160);
      if (!okEp(ep) || !S.demoOn) return;
      blank.value = '';
      for (const ch of word) {                    /* type it like a kid */
        if (!okEp(ep) || !S.demoOn) return;
        blank.value += ch;
        await sleep(75 + Math.random() * 95);
      }
      await sleep(360); if (!okEp(ep) || !S.demoOn) return;
      await takeTurn(word);
      if (S.goal >= .98) break;
      await sleep(550);
    }
    while (S.busy && okEp(ep)) await sleep(160);
    if (okEp(ep)) {
      S.demoOn = false;
      showStop(false);
      if (S.goal < .98) { setInputs(true); coachSay('Your turn — type a word!'); }
    }
  }
  function stopDemo() {
    S.epoch++;
    S.demoOn = false;
    makerBusy = false;
    showStop(false);
    stageEl.classList.remove('thinking');
    /* halt cleanly mid-anything: unkink the hero, unblock the loop */
    S.walking = false; S.slipping = false; S.riding = null;
    heroInk.rotation(0); heroInk.y(0); heroInk.scale({ x: 1, y: 1 });
    heroG.y(gy);                                // feet back on the ground line
    showDizzy(false);
    S.busy = false;
    if (S.started) {
      setInputs(true);
      coachSay('You take over — type a word!');
    }
  }
  /* the v3 dashboard drives every variant's iframe via these globals */
  window.watchItPlay = startDemo;
  window.stopWatch = stopDemo;

  /* ============================================================
     MASTER LOOP — camera pan, hero bob, wolf stalk, flier bob,
     off-screen cull, followers, and the hand-drawn "boil"
     ============================================================ */
  let boilTick = 0;
  const idleAnim = new Konva.Animation((frame) => {
    const t = frame.time;
    /* the camera chases the hero — every walk pans the whole journey */
    const ct = camTarget();
    S.camX += (ct - S.camX) * .13;
    if (Math.abs(ct - S.camX) < .15) S.camX = ct;
    S.pushX *= .88; if (Math.abs(S.pushX) < .2) S.pushX = 0;   // huff shove decays
    cam.x(-S.camX + S.pushX);
    /* hero walk bounce / idle breathe (never during a slip or a ride) */
    if (S.walking && !S.slipping && !S.riding) {
      heroInk.y(-Math.abs(Math.sin(t * .014)) * 10);
      heroInk.rotation(Math.sin(t * .014) * 5);
    } else if (!S.slipping && !S.riding && !S.busy) {
      heroInk.y(Math.sin(t * .004) * 2.2);
      heroInk.rotation(Math.sin(t * .004) * 1.4);
    }
    /* dizzy stars orbit */
    if (S.dizzy) dizzyG.rotation((t * .25) % 360);
    /* the wolf slinks along behind — always stalking, never teleporting */
    wolfG.x(wolfG.x() + (wolfX() - wolfG.x()) * .07);
    wolfG.y(gy + 2 + Math.sin(t * .0035) * 3);
    /* pig friends trail the hero, bobbing along */
    followers.forEach((p, i) => {
      const tx = heroG.x() - 46 * (i + 1) - 10;
      p.node.x(p.node.x() + (tx - p.node.x()) * .045);
      p.node.y(gy + Math.sin(t * .008 + i * 1.7) * 3.5);
    });
    /* fliers bob on the breeze; props long behind us leave the stage */
    for (let i = liveProps.length - 1; i >= 0; i--) {
      const p = liveProps[i];
      if (p.follower || p.gear) continue;
      if (p.yOff < 0) p.node.y(gy + p.yOff + Math.sin(t * .0032 + p.bob) * 8);
      if (p.node.x() < S.camX - 180) destroyProp(p);
    }
    /* hand-drawn "boil": re-jitter hero strokes every few frames */
    if (++boilTick % 14 === 0) {
      heroInk.children.forEach((ln) => {
        const b = ln.getAttr('bpts');
        if (!b) return;
        ln.points(b.map((v) => v + rnd(-.55, .55)));
      });
    }
  }, worldLayer);
  idleAnim.start();

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
  clearBtn.addEventListener('click', clearMaker);
  surpriseBtn.addEventListener('click', () => surpriseMe(false));
  doneBtn.addEventListener('click', () => {
    if (makerBusy) return;
    if (!buildHero()) {
      coachSay('Draw a hero first — or press "Surprise me"!', true);
      makerHost.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' },
         { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' },
         { transform: 'translateX(0)' }],
        { duration: 280, easing: 'ease-out' });
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
    takeTurn(dymBtn.dataset.word);
  });
  stopBtn.addEventListener('click', stopDemo);
  watchBtn.addEventListener('click', startDemo);
  watchAgain.addEventListener('click', () => {
    /* keep the hero — straight into another show */
    endOv.classList.remove('show'); endOv.hidden = true;
    resetWorld();
    narrEl.textContent = 'The show starts over — watch the sketch regrow!';
    startDemo();
  });
  againBtn.addEventListener('click', () => { resetGame(true); });
  tapType.addEventListener('click', () => blank.focus({ preventScroll: false }));
  document.addEventListener('keydown', (e) => {
    if (S.demoOn || e.metaKey || e.ctrlKey || e.altKey) return;
    if (S.started && makerOv.hidden && !makerOv.classList.contains('show') &&
        document.activeElement !== blank && /^[a-zA-Z ]$/.test(e.key))
      blank.focus({ preventScroll: true });
  });

  /* squiggly crayon underline beneath the input */
  if (underSvg) {
    underSvg.setAttribute('viewBox', '0 0 100 10');
    underSvg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = 'M0 6';
    for (let x = 0; x < 100; x += 8) d += ` Q ${x + 4} ${x % 16 ? 1 : 9} ${x + 8} 6`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#FF6B57');
    path.setAttribute('stroke-width', '2.4');
    path.setAttribute('stroke-linecap', 'round');
    underSvg.appendChild(path);
  }

  /* ---------- sizing ---------- */
  function resize() {
    const oldW = W;
    W = Math.max(360, host.clientWidth || 800);
    H = Math.max(300, host.clientHeight || 460);
    stage.size({ width: W, height: H });
    if (sections.length && W !== oldW) {
      /* reflow the journey: re-sketch every stretch at the new width */
      const k = W / oldW;
      sections.forEach((s) => {
        s.x0 *= k; s.g.x(s.x0);
        gy = WORLD.render(s.g, W, H, s.ss);
      });
      worldW *= k;
      S.heroX *= k; S.camX *= k;
      for (const p of liveProps)
        if (!p.follower && !p.gear) p.node.x(p.node.x() * k);
    }
    gy = H * WORLD.groundFrac;
    heroG.position({ x: S.heroX, y: gy });
    wolfG.y(gy + 2);
    for (const p of liveProps)
      if (!p.follower && !p.gear) p.node.y(gy + p.yOff);
    if (houseNode) houseNode.position({ x: houseWX(), y: gy + 2 });
  }
  let rsz;
  window.addEventListener('resize', () => {
    clearTimeout(rsz);
    rsz = setTimeout(() => { resize(); sizeMaker(); }, 160);
  });

  /* ---------- init ---------- */
  resize();
  sizeMaker();
  resetWorld();                // spawn meadow + hero at trail head
  setInputs(false);
  showMs(false);               // CSS display beats [hidden] — hide chips properly
  showStop(false);
  tapCheck();
  if (/#watch/.test(location.hash)) setTimeout(startDemo, 400);
  window.__lat = latHist;      // for the README latency report
  window.__dbg = () => ({      // for headless verification runs
    heroX: Math.round(S.heroX), camX: Math.round(S.camX), worldW,
    heroGX: Math.round(heroG.x()),
    heroScreenX: Math.round(heroG.x() - S.camX + S.pushX),
    turns: S.turns, goal: S.goal, wolf: S.wolf, sections: sections.length,
    props: liveProps.length, heroKids: heroInk.children.length,
    heroOnStage: !!(heroG.getStage()), walking: S.walking, busy: S.busy,
  });
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
