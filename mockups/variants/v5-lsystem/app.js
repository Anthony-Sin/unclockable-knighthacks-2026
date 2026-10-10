/* Fill the Tale — Garden Glade edition (variant v5 · L-systems)
   Kid grows a sprout-hero from a seed, then types words into story
   blanks; each word LITERALLY GROWS a prop in the world — "bridge"
   grows a woven branch-bridge, "beanstalk" a climbable stalk,
   "firefly" a swarm that lights the hollow-log cave. Silly words
   spawn gag props (banana peel sprouts, thorny weed tangles).
   Everything is hardcoded front-end; the plants are procedural
   (lsystem.js — Coding Train style turtle L-systems).          */

(function () {
  'use strict';

  var VIEW_W = 1160, WORLD_W = 2900, WORLD_H = 540, GROUND_Y = 428;

  /* world zones: garden glade -> drizzle patch -> pond -> hollow log -> home */
  var ZONES = [
    { heroX: 380,  cam: 0,    objX: 585,  bugX: 470 },   // glade + the gap
    { heroX: 890,  cam: 335,  objX: 985,  bugX: 960 },   // drizzle patch
    { heroX: 1400, cam: 830,  objX: 1520, bugX: 1360 },  // pond bank
    { heroX: 1990, cam: 1150, objX: 2150, bugX: 1940 },  // inside the hollow log
    { heroX: 2490, cam: 1560, objX: 2665, bugX: 2580 }   // home garden
  ];
  var GAP  = { x0: 522, x1: 662, land: 706 };
  var POND = { x0: 1430, x1: 1780, land: 1766 };
  var CAVE_OUT = 2372;
  var TREE_X = 2665;

  /* ---------------- story data ---------------- */
  var BEATS = [
    { pre: 'Pip needs to get through the garden! But the path is broken — Pip needs a',
      post: 'to cross.', cheer: 'over we go!', hints: 'bridge · vine · beanstalk · log',
      table: { 'bridge': 'bridge', 'plank': 'log', 'log': 'log', 'board': 'log',
        'branch': 'log', 'stick': 'log', 'vine': 'vine', 'rope': 'vine', 'swing': 'vine',
        'ivy': 'vine', 'beanstalk': 'stalk', 'bean': 'stalk', 'stalk': 'stalk',
        'ladder': 'stalk', 'stairs': 'stalk', 'steps': 'stalk',
        'stone': 'step', 'rock': 'step', 'pad': 'step', 'stepping stone': 'step',
        'flower': 'step' },
      fallback: 'bridge' },
    { pre: 'It started to drizzle! Pip grabs a',
      post: 'for cover.', cheer: 'dry as a biscuit!', hints: 'umbrella · leaf · mushroom · flower',
      table: { 'umbrella': 'leaf', 'leaf': 'leaf', 'big leaf': 'leaf', 'branch': 'leaf',
        'parasol': 'leaf', 'mushroom': 'shroom', 'toadstool': 'shroom', 'shroom': 'shroom',
        'hat': 'shroom', 'cap': 'shroom', 'flower': 'flower', 'sunflower': 'flower',
        'daisy': 'flower', 'bloom': 'flower', 'blossom': 'flower' },
      fallback: 'leaf' },
    { pre: 'A wide pond! Pip rides the',
      post: 'across.', cheer: 'smooth sailing!', hints: 'boat · lily pad · duck · unicorn',
      table: { 'boat': 'raft', 'raft': 'raft', 'canoe': 'raft', 'kayak': 'raft',
        'lily pad': 'raft', 'lilypad': 'raft', 'pad': 'raft', 'leaf': 'raft', 'log': 'raft',
        'duck': 'swan', 'swan': 'swan', 'goose': 'swan', 'bird': 'swan', 'ducky': 'swan',
        'fish': 'fish', 'goldfish': 'fish', 'whale': 'fish', 'shark': 'fish',
        'dolphin': 'fish', 'trout': 'fish', 'unicorn': 'uni', 'dragon': 'uni',
        'pony': 'uni', 'horse': 'uni', 'pegasus': 'uni', 'turtle': 'swan' },
      fallback: 'raft' },
    { pre: 'The hollow log is dark! Pip lights a',
      post: '.', cheer: 'let there be light!', hints: 'lantern · firefly · torch · candle',
      table: { 'firefly': 'flies', 'fireflies': 'flies', 'lightning bug': 'flies',
        'lightning bugs': 'flies', 'beetle': 'flies', 'lantern': 'shroom',
        'mushroom': 'shroom', 'glow mushroom': 'shroom', 'lamp': 'shroom',
        'lightbulb': 'shroom', 'torch': 'torch', 'candle': 'torch', 'light': 'torch',
        'match': 'torch', 'bonfire': 'torch', 'flower': 'torch', 'sunflower': 'torch' },
      fallback: 'shroom' },
    { pre: 'Home at last! Pip opens the',
      post: '.', cheer: 'home sweet home!', hints: 'door · key · cookie jar · gate',
      table: { 'door': 'door', 'gate': 'door', 'doorway': 'door', 'hatch': 'door',
        'flap': 'door', 'key': 'key', 'golden key': 'key', 'flower key': 'key',
        'cookie jar': 'jar', 'cookie': 'jar', 'jar': 'jar', 'treat jar': 'jar' },
      fallback: 'door' }
  ];

  /* silly words -> gag props (work at any beat; the funny word becomes canon) */
  var GAG_WORDS = {
    'banana': 'slip', 'banana peel': 'slip', 'peel': 'slip', 'pants': 'slip',
    'ice': 'slip', 'roller skates': 'slip', 'marbles': 'slip',
    'weed': 'weed', 'weeds': 'weed', 'thorn': 'weed', 'thorns': 'weed',
    'bramble': 'weed', 'poison ivy': 'weed', 'cactus': 'weed', 'sticker bush': 'weed',
    'toaster': 'sploosh', 'fridge': 'sploosh', 'refrigerator': 'sploosh',
    'piano': 'sploosh', 'anvil': 'sploosh', 'sink': 'sploosh', 'bathtub': 'sploosh',
    'tv': 'sploosh', 'television': 'sploosh', 'washing machine': 'sploosh',
    'paper bag': 'soggy', 'bag': 'soggy', 'toast': 'soggy', 'cardboard': 'soggy',
    'newspaper': 'soggy', 'homework': 'soggy', 'tissue': 'soggy', 'paper': 'soggy',
    'sparkler': 'fizzle', 'firework': 'fizzle', 'firecracker': 'fizzle',
    'soda': 'fizzle', 'kazoo': 'fizzle', 'wet socks': 'fizzle',
    'bee': 'bees', 'bees': 'bees', 'wasp': 'bees', 'hornet': 'bees',
    'sock': 'stink', 'stinky sock': 'stink', 'skunk': 'stink', 'garbage': 'stink',
    'trash': 'stink', 'diaper': 'stink', 'gym sock': 'stink', 'old cheese': 'stink',
    'ghost': 'scare', 'zombie': 'scare', 'monster': 'scare', 'spider': 'scare',
    'vampire': 'scare', 'bat': 'scare', 'witch': 'scare',
    'test': 'bonk', 'chores': 'bonk', 'dentist': 'bonk', 'broccoli': 'bonk',
    'alarm clock': 'bonk', 'taxes': 'bonk',
    'mud': 'mud', 'quicksand': 'mud', 'swamp': 'mud', 'muck': 'mud',
    'lava': 'hot', 'volcano': 'hot', 'soup': 'hot', 'hot sauce': 'hot', 'fire': 'hot'
  };

  /* generic kid dictionary — real words that aren't scripted get the
     beat's default prop with an "improvise" caption */
  var GOOD_WORDS = {};
  ('apple berry sandwich cookie pancake cupcake pie plum grape pasta noodles pizza ' +
   'acorn seed sprout fern moon star cloud sun hill butterfly rainbow blanket pillow ' +
   'teddy snowman snowflake pebble twig clover tulip muffin donut bagel pretzel pickle ' +
   'chicken friend buddy pal kite ball balloon wagon train dog cat frog bear fox owl ' +
   'robot carrot potato pumpkin watermelon strawberry cake bicycle tricycle sled ship ' +
   'submarine camel elephant giraffe penguin hedgehog squirrel bunny rabbit deer ' +
   'raccoon boulder hammock puddle mushroom toadstool dragon bee ladybug beetle snail ' +
   'worm acorn dandelion rose daisy buttercup fern moss pebble brook breeze meadow').split(/\s+/)
   .forEach(function (w) { if (!GAG_WORDS[w]) GOOD_WORDS[w] = 1; });
  GOOD_WORDS['ladybug'] = 1; GOOD_WORDS['dandelion'] = 1; GOOD_WORDS['buttercup'] = 1;

  /* ---------------- dom ---------------- */
  var stage      = document.getElementById('stage');
  var world      = document.getElementById('world');
  var pan        = document.getElementById('pan');
  var groundCv   = document.getElementById('groundCv');
  var backBox    = document.getElementById('plantsBack');
  var frontBox   = document.getElementById('plantsFront');
  var props      = document.getElementById('props');
  var pip        = document.getElementById('pip');
  var pipMove    = document.getElementById('pipMove');
  var sayEl      = document.getElementById('say');
  var sayText    = document.getElementById('sayText');
  var confetti   = document.getElementById('confetti');
  var stopBtn    = document.getElementById('stopBtn');
  var hintChip   = document.getElementById('hintChip');
  var makerOv    = document.getElementById('makerOv');
  var makerCard  = document.getElementById('makerCard');
  var makerTitle = document.getElementById('makerTitle');
  var makerWrap  = document.getElementById('makerWrap');
  var readyRow   = document.getElementById('readyRow');
  var growBtn    = document.getElementById('growBtn');
  var surpriseBtn= document.getElementById('surpriseBtn');
  var watchBtn   = document.getElementById('watchBtn');
  var colorChips = document.getElementById('colorChips');
  var topChips   = document.getElementById('topChips');
  var faceChips  = document.getElementById('faceChips');
  var seedDot    = document.getElementById('seedDot');
  var sproutSpot = document.getElementById('sproutSpot');
  var heroPrev   = document.getElementById('heroPrev');
  var bug        = document.getElementById('bug');
  var bugGlow    = document.getElementById('bugGlow');
  var waypoint   = document.getElementById('waypoint');
  var rainLayer  = document.getElementById('rainLayer');
  var caveBack   = document.getElementById('caveBack');
  var caveDim    = document.getElementById('caveDim');
  var fliesBox   = document.getElementById('fireflies');
  var endOv      = document.getElementById('endOverlay');
  var blankWrap  = document.getElementById('blankWrap');
  var sentPre    = document.getElementById('sentPre');
  var sentPost   = document.getElementById('sentPost');
  var lineNum    = document.getElementById('lineNum');
  var hintLine   = document.getElementById('hintLine');
  var wordBubble = document.getElementById('wordBubble');
  var meanChip   = document.getElementById('meanChip');
  var meanBtn    = document.getElementById('meanBtn');
  var stamp      = document.getElementById('stamp');
  var reseedBtn  = document.getElementById('reseedBtn');
  var watchChip  = document.getElementById('watchChip');
  var recapBox   = document.getElementById('recap');
  var againBtn   = document.getElementById('againBtn');
  var newGardenBtn = document.getElementById('newGardenBtn');
  var gemChip    = document.getElementById('gemChip');
  var input      = null, goBtn = null;

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- state ---------------- */
  var state = 'maker';         // maker | writing | reacting | advancing | done
  var li = 0;                  // line index
  var written = [];            // {pre, word, post, silly}
  var plants = [];             // live plant objects
  var runId = 0;
  var seed = (Math.random() * 1e9) >>> 0;
  var pipX = ZONES[0].heroX;
  var submitWord = '';
  var doorEl = null;           // the doorzone on the home tree
  var maker = { color: 'coral', top: 'sprout', face: 'smile', state: 'choose' };

  function after(ms, fn) { var id = runId; setTimeout(function () { if (id === runId) fn(); }, ms); }

  /* ---------------- tiny sounds ---------------- */
  var AC = null;
  function audio() {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      return AC;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    var ac = audio(); if (!ac) return;
    try {
      var t = ac.currentTime + (when || 0);
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.13, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* silent */ }
  }
  function sfxGood()  { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.11, 'triangle', 0.14, i * 0.07); }); }
  function sfxWobble(){ tone(220, 0.12, 'sine', 0.1); tone(196, 0.14, 'sine', 0.09, 0.09); }
  function sfxBoing() { tone(340, 0.34, 'sawtooth', 0.09, 0, 70); tone(160, 0.2, 'triangle', 0.1, 0.05, 90); }
  function sfxGrow()  { [392, 494, 587, 740].forEach(function (f, i) { tone(f, 0.09, 'sine', 0.06, i * 0.11); }); }
  function sfxWin()   { [523, 659, 784, 1046, 1318, 1568].forEach(function (f, i) { tone(f, 0.14, 'triangle', 0.14, i * 0.09); }); }
  function sfxWrite() { tone(659, 0.08, 'triangle', 0.11); tone(880, 0.1, 'triangle', 0.1, 0.06); }
  function sfxSplash(){ tone(300, 0.2, 'sine', 0.12, 0, 90); tone(520, 0.1, 'triangle', 0.09, 0.08); }
  function sfxCreak() { tone(140, 0.5, 'sawtooth', 0.06, 0, 220); }
  function sfxBug()   { tone(1200, 0.06, 'sine', 0.05); tone(1400, 0.06, 'sine', 0.05, 0.08); }

  /* ---------------- fit & camera ---------------- */
  function fit() {
    var s = stage.clientWidth / VIEW_W;
    world.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  var camX = 0;
  function setCam(x, instant) {
    camX = Math.max(0, Math.min(WORLD_W - VIEW_W, x));
    if (instant) pan.classList.add('instant');
    pan.style.transform = 'translateX(' + (-camX) + 'px)';
    if (instant) requestAnimationFrame(function () { pan.classList.remove('instant'); });
  }

  /* ---------------- world painting ---------------- */
  function paintWorld(rand) {
    var c = groundCv, ctx = c.getContext('2d');
    c.width = WORLD_W; c.height = WORLD_H;
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);

    /* sky tints per zone (canvas gradient under it all) */
    var sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#CDE8F7'); sky.addColorStop(1, '#EAF6E9');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WORLD_W, GROUND_Y + 10);
    ctx.fillStyle = 'rgba(140,160,170,.28)'; ctx.fillRect(700, 0, 560, GROUND_Y);   // drizzle gray
    ctx.fillStyle = 'rgba(70,80,95,.34)';  ctx.fillRect(1840, 0, 520, GROUND_Y);   // cave gloom
    ctx.fillStyle = 'rgba(255,214,140,.30)'; ctx.fillRect(2360, 0, 540, GROUND_Y); // home gold

    /* far hill band, continuous */
    ctx.beginPath();
    ctx.moveTo(-20, GROUND_Y - 64 + rand() * 10);
    for (var x = 0; x <= WORLD_W + 40; x += 130) {
      ctx.quadraticCurveTo(x + 35 + rand() * 30, GROUND_Y - 88 - rand() * 26,
                           x + 130, GROUND_Y - 66 + rand() * 16);
    }
    ctx.lineTo(WORLD_W + 20, WORLD_H); ctx.lineTo(-20, WORLD_H); ctx.closePath();
    ctx.fillStyle = '#B9E3B4'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2B2118'; ctx.stroke();
    ctx.fillStyle = 'rgba(70,80,95,.3)'; ctx.fillRect(1840, 200, 520, WORLD_H);   // gloom hills
    ctx.fillStyle = 'rgba(140,160,170,.18)'; ctx.fillRect(700, 200, 560, WORLD_H);

    /* near ground band, continuous underneath everything */
    ctx.beginPath();
    ctx.moveTo(-20, GROUND_Y + rand() * 8);
    for (x = 0; x <= WORLD_W + 40; x += 140) {
      ctx.quadraticCurveTo(x + 40 + rand() * 40, GROUND_Y - 18 - rand() * 14,
                           x + 140, GROUND_Y + rand() * 10);
    }
    ctx.lineTo(WORLD_W + 20, WORLD_H); ctx.lineTo(-20, WORLD_H); ctx.closePath();
    ctx.fillStyle = '#58BC7B'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2B2118'; ctx.stroke();

    /* stitched seam */
    ctx.beginPath();
    ctx.moveTo(-20, GROUND_Y + 16);
    for (x = 0; x <= WORLD_W + 40; x += 140) {
      ctx.quadraticCurveTo(x + 40, GROUND_Y - 4, x + 140, GROUND_Y + 16);
    }
    ctx.setLineDash([13, 12]);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(138,94,46,.55)';
    ctx.stroke(); ctx.setLineDash([]);

    /* zone ground tints */
    ctx.fillStyle = 'rgba(120,150,160,.22)'; ctx.fillRect(700, GROUND_Y - 10, 560, WORLD_H - GROUND_Y); // damp
    ctx.fillStyle = '#4A3423'; ctx.fillRect(1840, GROUND_Y - 4, 520, WORLD_H - GROUND_Y + 4);          // cave dirt
    ctx.fillStyle = 'rgba(255,220,150,.22)'; ctx.fillRect(2360, GROUND_Y - 8, 540, WORLD_H - GROUND_Y);// home warm

    /* --- the ravine (beat 1's broken path) --- */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(GAP.x0, GROUND_Y - 30);
    ctx.lineTo(GAP.x0 + 14, GROUND_Y + 96);
    ctx.quadraticCurveTo((GAP.x0 + GAP.x1) / 2, GROUND_Y + 118, GAP.x1 - 14, GROUND_Y + 96);
    ctx.lineTo(GAP.x1, GROUND_Y - 30);
    ctx.lineTo(GAP.x1 - 8, GROUND_Y + 4);
    ctx.lineTo(GAP.x0 + 8, GROUND_Y + 4);
    ctx.closePath();
    ctx.fillStyle = '#3A2A1C'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#2B2118'; ctx.stroke();
    // little stream at the bottom
    ctx.beginPath();
    ctx.moveTo(GAP.x0 + 22, GROUND_Y + 88);
    ctx.quadraticCurveTo(GAP.x0 + 46, GROUND_Y + 78, GAP.x0 + 68, GROUND_Y + 90);
    ctx.quadraticCurveTo(GAP.x0 + 92, GROUND_Y + 100, GAP.x1 - 24, GROUND_Y + 88);
    ctx.strokeStyle = '#5DA9E9'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    // crumbly edges
    ctx.fillStyle = '#C08A4B';
    [[GAP.x0 - 6, 12], [GAP.x1 - 8, 10], [GAP.x0 + 4, 8]].forEach(function (r) {
      ctx.beginPath(); ctx.ellipse(r[0], GROUND_Y + 6, r[1], 6, 0, 0, Math.PI * 2); ctx.fill();
    });

    /* --- the pond --- */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(POND.x0 - 30, GROUND_Y + 6);
    for (x = POND.x0 - 30; x <= POND.x1 + 30; x += 60) {
      ctx.quadraticCurveTo(x + 30, GROUND_Y - 6 - rand() * 8, x + 60, GROUND_Y + 6);
    }
    ctx.lineTo(POND.x1 + 30, GROUND_Y + 92);
    ctx.quadraticCurveTo((POND.x0 + POND.x1) / 2, GROUND_Y + 108, POND.x0 - 30, GROUND_Y + 92);
    ctx.closePath();
    var wg = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 100);
    wg.addColorStop(0, '#8FD4F0'); wg.addColorStop(1, '#4E97CF');
    ctx.fillStyle = wg; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#2B2118'; ctx.stroke();
    // wave squiggles
    ctx.strokeStyle = 'rgba(255,253,246,.65)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    for (var wv = 0; wv < 4; wv++) {
      var wy = GROUND_Y + 26 + wv * 16;
      ctx.beginPath();
      ctx.moveTo(POND.x0 + 24 + rand() * 30, wy);
      for (x = POND.x0 + 24; x <= POND.x1 - 20; x += 70) {
        ctx.quadraticCurveTo(x + 18, wy - 7, x + 35, wy);
        ctx.moveTo(x + 35, wy);
      }
      ctx.stroke();
    }
    // two painted mini pads
    [[1520, 470], [1690, 484]].forEach(function (pp) {
      ctx.beginPath(); ctx.ellipse(pp[0], pp[1], 20, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4FB06D'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#2B2118'; ctx.stroke();
    });
    ctx.restore();

    /* --- home garden fence + stepping stones --- */
    ctx.fillStyle = '#FFFDF6'; ctx.strokeStyle = '#2B2118'; ctx.lineWidth = 2.5;
    for (x = 2460; x <= 2880; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y - 34); ctx.lineTo(x + 7, GROUND_Y - 42);
      ctx.lineTo(x + 14, GROUND_Y - 34); ctx.lineTo(x + 14, GROUND_Y + 4);
      ctx.lineTo(x, GROUND_Y + 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(2452, GROUND_Y - 18); ctx.lineTo(2890, GROUND_Y - 18);
    ctx.lineWidth = 5; ctx.strokeStyle = '#2B2118'; ctx.stroke();
    for (var s = 0; s < 5; s++) {
      ctx.beginPath();
      ctx.ellipse(2420 + s * 46, GROUND_Y + 40 + (s % 2) * 10, 13, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#D9C4A3'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#2B2118'; ctx.stroke();
    }

    /* dirt clearings where Pip stands */
    [380, 890, 1400, 1990, 2490].forEach(function (hx) {
      ctx.beginPath();
      ctx.ellipse(hx + 10, GROUND_Y + 34, 110, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#EED9A8'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#C08A4B'; ctx.stroke();
    });

    /* speckles */
    for (var i = 0; i < 60; i++) {
      var px = rand() * WORLD_W, py = GROUND_Y + 22 + rand() * (WORLD_H - GROUND_Y - 38);
      ctx.beginPath();
      ctx.ellipse(px, py, 2.5 + rand() * 4, 1.8 + rand() * 2.4, rand() * 3, 0, Math.PI * 2);
      ctx.fillStyle = rand() > 0.5 ? 'rgba(62,143,87,.5)' : 'rgba(192,138,75,.45)';
      ctx.fill();
    }
  }

  /* ---------------- forest / garden building ---------------- */
  function clearPlants() {
    backBox.innerHTML = ''; frontBox.innerHTML = '';
    plants = [];
  }

  function addPlant(type, bx, by, scale, layer, rand, delay, growMs, patch) {
    var spec = LSYS.SPECS[type](rand);
    if (growMs) spec.growMs = growMs;
    if (patch) for (var k in patch) spec[k] = patch[k];
    var p = LSYS.makePlant(spec, rand, scale);
    p.baseX = bx; p.baseY = by; p.layer = layer;
    p.topWorld = by - p.oy + p.topY;
    p.startAt = performance.now() + (delay || 0);
    p.done = false;
    if (patch && patch.noSway) p.noSway = true;
    if (patch && patch.flip) {
      var w = document.createElement('div');
      w.className = 'flipx';
      w.style.left = (bx - p.ox) + 'px';
      w.style.top = (by - p.oy) + 'px';
      w.style.width = p.el.style.width; w.style.height = p.el.style.height;
      w.style.transformOrigin = p.ox + 'px ' + p.oy + 'px';
      w.style.transform = 'scaleX(-1)';
      w.appendChild(p.el);
      (layer === 'back' ? backBox : frontBox).appendChild(w);
      p.wrap = w;
    } else {
      p.el.style.left = (bx - p.ox) + 'px';
      p.el.style.top = (by - p.oy) + 'px';
      (layer === 'back' ? backBox : frontBox).appendChild(p.el);
    }
    plants.push(p);
    return p;
  }

  function buildWorld(newSeed) {
    seed = newSeed >>> 0;
    var rand = LSYS.rng(seed);
    clearPlants();
    paintWorld(rand);
    var order = [];

    /* zone 0 — sunny glade */
    for (var i = 0; i < 3; i++) {
      var pick = rand();
      order.push({ t: pick < 0.6 ? 'tree' : (pick < 0.85 ? 'pine' : 'bush'),
        x: 90 + rand() * 140 + i * 180, y: GROUND_Y + 2 + rand() * 6,
        s: 0.55 + rand() * 0.25, layer: 'back' });
    }
    order.push({ t: 'hedge', x: GAP.x0 - 16, y: GROUND_Y + 10, s: 0.55, layer: 'front' });
    order.push({ t: 'hedge', x: GAP.x1 + 14, y: GROUND_Y + 10, s: 0.5, layer: 'front' });
    for (i = 0; i < 4; i++) {
      var ft = rand();
      order.push({ t: ft < 0.5 ? 'fern' : (ft < 0.78 ? 'flower' : 'tuft'),
        x: 60 + rand() * 620, y: GROUND_Y + 28 + rand() * 26,
        s: 0.45 + rand() * 0.3, layer: 'front' });
    }

    /* zone 1 — drizzle patch (mushrooms + wet ferns) */
    order.push({ t: 'tree', x: 800 + rand() * 60, y: GROUND_Y + 4, s: 0.6 + rand() * 0.2, layer: 'back' });
    order.push({ t: 'pine', x: 1120 + rand() * 60, y: GROUND_Y + 4, s: 0.6 + rand() * 0.2, layer: 'back' });
    for (i = 0; i < 4; i++) {
      order.push({ t: rand() < 0.55 ? 'fern' : 'shroombrella',
        x: 730 + rand() * 520, y: GROUND_Y + 26 + rand() * 26,
        s: 0.34 + rand() * 0.22, layer: 'front' });
    }
    order.push({ t: 'glowshroom', x: 1180 + rand() * 60, y: GROUND_Y + 30, s: 0.6, layer: 'front',
                 patch: { capGlow: false } });

    /* zone 2 — pond banks */
    [1408, 1442, 1796, 1830].forEach(function (rx) {
      order.push({ t: 'reed', x: rx + rand() * 16 - 8, y: GROUND_Y + 26 + rand() * 8,
                   s: 0.6 + rand() * 0.25, layer: 'front' });
    });
    order.push({ t: 'bush', x: 1350 + rand() * 40, y: GROUND_Y + 14, s: 0.5, layer: 'back' });
    order.push({ t: 'bush', x: 1850 + rand() * 40, y: GROUND_Y + 14, s: 0.5, layer: 'back' });

    /* zone 3 — outside the hollow log */
    order.push({ t: 'fern', x: 1846 + rand() * 30, y: GROUND_Y + 26, s: 0.55, layer: 'front',
                 patch: { leafPalette: ['#2F7A47', '#3E8F57'] } });
    order.push({ t: 'weed', x: 2340 + rand() * 30, y: GROUND_Y + 24, s: 0.5, layer: 'front' });
    order.push({ t: 'fern', x: 2400 + rand() * 30, y: GROUND_Y + 26, s: 0.5, layer: 'front' });

    /* zone 4 — home garden */
    order.push({ t: 'hometree', x: TREE_X, y: GROUND_Y + 4, s: 1.0, layer: 'back', growMs: 2800 });
    for (i = 0; i < 5; i++) {
      order.push({ t: 'flower', x: 2420 + rand() * 220, y: GROUND_Y + 30 + rand() * 18,
                   s: 0.42 + rand() * 0.2, layer: 'front' });
    }
    order.push({ t: 'bush', x: 2770 + rand() * 60, y: GROUND_Y + 12, s: 0.55, layer: 'front' });

    /* grass tufts everywhere */
    for (i = 0; i < 16; i++) {
      var tx = 30 + rand() * (WORLD_W - 60);
      if (tx > POND.x0 - 40 && tx < POND.x1 + 40) continue;
      if (tx > GAP.x0 - 30 && tx < GAP.x1 + 30) continue;
      order.push({ t: 'tuft', x: tx, y: GROUND_Y + 40 + rand() * 30,
                   s: 0.5 + rand() * 0.5, layer: 'front' });
    }

    order.forEach(function (o, i) {
      addPlant(o.t, o.x, o.y, o.s, o.layer, rand, 100 + i * 110, o.growMs, o.patch);
    });
    buildDoor();
    sfxGrow();
  }

  /* the door on the home tree — grows when the story reaches it */
  function buildDoor() {
    if (doorEl) doorEl.remove();
    doorEl = document.createElement('div');
    doorEl.className = 'doorzone';
    doorEl.style.left = (TREE_X - 48) + 'px';
    doorEl.style.top = (GROUND_Y - 124) + 'px';
    doorEl.innerHTML = '<div class="doorlight"></div><div class="doorpanel"></div>';
    props.appendChild(doorEl);
  }

  /* rAF painter: grows any plant whose clock is ticking */
  function raf() {
    requestAnimationFrame(raf);
    var now = performance.now();
    for (var i = 0; i < plants.length; i++) {
      var p = plants[i];
      if (p.done || !p.startAt || now < p.startAt) continue;
      var t = (now - p.startAt) / p.growMs;
      if (reduced || t >= 1) {
        LSYS.paintPlant(p, 1);
        p.done = true;
        if (!p.noSway) p.el.classList.add('sway');
      } else {
        LSYS.paintPlant(p, t);
      }
    }
  }
  requestAnimationFrame(raf);

  function plantNear(x, types) {
    var best = null, bd = 1e9;
    for (var i = 0; i < plants.length; i++) {
      var p = plants[i];
      if (types.indexOf(p.specName) < 0) continue;
      var d = Math.abs(p.baseX - x);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function shakePlant(p) {
    if (!p) return;
    p.el.classList.remove('shake');
    void p.el.offsetWidth;
    p.el.classList.add('shake');
    setTimeout(function () { p.el.classList.remove('shake'); }, 750);
  }
  /* world position of a plant's extreme op (tip of post, bottom of vine) */
  function opPos(p, want) {
    var best = null, by = want === 'top' ? 1e9 : -1e9;
    for (var i = 0; i < p.ops.length; i++) {
      var o = p.ops[i];
      var ys = o.t === 'seg' ? [o.y1, o.y2] : [o.y];
      var xs = o.t === 'seg' ? [o.x1, o.x2] : [o.x];
      for (var k = 0; k < ys.length; k++) {
        if ((want === 'top' && ys[k] < by) || (want === 'bottom' && ys[k] > by)) {
          by = ys[k]; best = { x: xs[k], y: ys[k] };
        }
      }
    }
    if (!best) best = { x: 0, y: 0 };
    return { x: p.baseX + best.x, y: p.baseY + best.y };
  }

  /* ---------------- props (spawned actors) ---------------- */
  var PEEL = '<svg viewBox="0 0 64 44"><path d="M32 36 Q26 18 12 14 Q22 28 24 38 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>' +
    '<path d="M32 36 Q38 16 52 12 Q44 28 40 38 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>' +
    '<path d="M32 36 Q30 22 32 8 Q38 22 36 36 Z" fill="#FFD75E" stroke="#2B2118" stroke-width="3"/>' +
    '<ellipse cx="32" cy="38" rx="9" ry="4.5" fill="#E8A93D" stroke="#2B2118" stroke-width="3"/></svg>';
  var GHOST = '<svg viewBox="0 0 70 80"><path d="M35 6 C16 6 10 24 10 40 L10 70 L19 62 L27 70 L35 62 L43 70 L51 62 L60 70 L60 40 C60 24 54 6 35 6 Z" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="27" cy="34" r="5" fill="#2B2118"/><circle cx="44" cy="34" r="5" fill="#2B2118"/>' +
    '<ellipse cx="36" cy="48" rx="6" ry="8" fill="#2B2118"/></svg>';
  var APPLE = '<svg viewBox="0 0 40 44"><path d="M20 12 Q18 4 26 3" fill="none" stroke="#8A5E2E" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M20 10 C8 8 4 18 6 28 C8 38 14 42 20 42 C26 42 32 38 34 28 C36 18 32 8 20 10 Z" fill="#FF6B57" stroke="#2B2118" stroke-width="3"/>' +
    '<path d="M26 2 Q34 -2 37 5 Q31 8 26 2" fill="#4FB06D" stroke="#2B2118" stroke-width="2.5"/></svg>';
  var PAPER = '<svg viewBox="0 0 44 50"><path d="M6 4 L32 4 L38 12 L38 46 L6 46 Z" fill="#FFFDF6" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M32 4 L32 12 L38 12" fill="#EAF4FD" stroke="#2B2118" stroke-width="2.5"/>' +
    '<path d="M11 18 L31 18 M11 25 L31 25 M11 32 L26 32" stroke="#5DA9E9" stroke-width="3" stroke-linecap="round"/></svg>';
  var BEE = '<svg viewBox="0 0 34 30"><ellipse cx="15" cy="8" rx="8" ry="5.5" fill="#FFFDF6" stroke="#2B2118" stroke-width="2.5"/>' +
    '<ellipse cx="16" cy="17" rx="12" ry="9" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>' +
    '<path d="M10 9 L10 25 M18 8 L18 26" stroke="#2B2118" stroke-width="3.5"/>' +
    '<circle cx="25" cy="14" r="2" fill="#2B2118"/></svg>';
  var MUD = '<svg viewBox="0 0 120 40"><ellipse cx="60" cy="26" rx="54" ry="13" fill="#8A5E2E" stroke="#2B2118" stroke-width="3"/>' +
    '<circle cx="34" cy="14" r="6" fill="#8A5E2E" stroke="#2B2118" stroke-width="2.5"/>' +
    '<circle cx="86" cy="10" r="4.5" fill="#8A5E2E" stroke="#2B2118" stroke-width="2.5"/>' +
    '<ellipse cx="56" cy="24" rx="16" ry="4" fill="#A9713C"/></svg>';
  var HOT = '<svg viewBox="0 0 130 44"><ellipse cx="65" cy="28" rx="58" ry="14" fill="#E5484D" stroke="#2B2118" stroke-width="3"/>' +
    '<ellipse cx="65" cy="28" rx="40" ry="9" fill="#FF6B57"/>' +
    '<path d="M38 20 Q44 10 40 4 M62 20 Q68 8 62 2 M88 20 Q94 10 88 4" fill="none" stroke="#FFB3A8" stroke-width="4" stroke-linecap="round"/></svg>';
  var BAG = '<svg viewBox="0 0 60 62"><path d="M10 14 L50 14 L54 56 Q32 62 8 56 Z" fill="#D9B98A" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M10 14 Q16 4 30 6 Q44 4 50 14" fill="#C8A06E" stroke="#2B2118" stroke-width="3"/>' +
    '<circle cx="24" cy="34" r="3" fill="#2B2118"/><circle cx="38" cy="34" r="3" fill="#2B2118"/>' +
    '<path d="M24 44 Q31 40 38 44" stroke="#2B2118" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';
  var TOASTER = '<svg viewBox="0 0 90 70"><rect x="8" y="18" width="74" height="46" rx="12" fill="#B8C4CC" stroke="#2B2118" stroke-width="3.5"/>' +
    '<rect x="24" y="12" width="42" height="10" rx="5" fill="#8FA1AC" stroke="#2B2118" stroke-width="3"/>' +
    '<circle cx="70" cy="40" r="6" fill="#FFC53D" stroke="#2B2118" stroke-width="3"/>' +
    '<path d="M16 30 L40 30 M16 40 L36 40" stroke="#8FA1AC" stroke-width="3" stroke-linecap="round"/></svg>';
  var ANVIL = '<svg viewBox="0 0 90 60"><path d="M6 16 L66 16 L58 30 L74 30 L74 44 L30 44 L30 34 L12 34 Z" fill="#5B6670" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<rect x="34" y="44" width="34" height="10" fill="#454E57" stroke="#2B2118" stroke-width="3"/></svg>';
  var PUDDLE = '<svg viewBox="0 0 130 36"><ellipse cx="65" cy="20" rx="60" ry="14" fill="#6FB8E8" stroke="#2B2118" stroke-width="3"/>' +
    '<ellipse cx="50" cy="18" rx="18" ry="5" fill="#9CD4F2"/></svg>';
  var MATCH = '<svg viewBox="0 0 30 70"><rect x="12" y="18" width="6" height="46" rx="3" fill="#D9B98A" stroke="#2B2118" stroke-width="2.5"/>' +
    '<circle cx="15" cy="14" r="8" fill="#FF6B57" stroke="#2B2118" stroke-width="3"/></svg>';
  var KEY = '<svg viewBox="0 0 50 30"><circle cx="12" cy="15" r="9" fill="none" stroke="#2B2118" stroke-width="5"/>' +
    '<circle cx="12" cy="15" r="9" fill="none" stroke="#FFC53D" stroke-width="2.5"/>' +
    '<path d="M21 15 L46 15 M38 15 L38 23 M46 15 L46 21" stroke="#2B2118" stroke-width="8" stroke-linecap="round" fill="none"/>' +
    '<path d="M21 15 L46 15 M38 15 L38 23 M46 15 L46 21" stroke="#FFC53D" stroke-width="4" stroke-linecap="round" fill="none"/></svg>';
  var SWAN = '<svg viewBox="0 0 150 92"><path d="M20 62 Q8 58 6 44 Q20 50 30 48" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>' +
    '<ellipse cx="70" cy="62" rx="52" ry="24" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>' +
    '<path d="M104 56 Q122 40 116 22 Q114 12 122 10 Q134 8 134 20 Q134 30 126 34 Q134 44 128 54 Z" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M133 16 L144 20 L134 24 Z" fill="#FF8A3D" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="124" cy="19" r="2.6" fill="#2B2118"/>' +
    '<path d="M44 60 Q70 44 96 58 Q78 72 50 70 Z" fill="#EAF4FD" stroke="#2B2118" stroke-width="3"/></svg>';
  var FISH = '<svg viewBox="0 0 150 82"><path d="M8 42 Q30 16 30 42 Q30 66 8 42 Z" fill="#FF8A3D" stroke="#2B2118" stroke-width="3.5"/>' +
    '<ellipse cx="88" cy="42" rx="56" ry="32" fill="#FFB13D" stroke="#2B2118" stroke-width="3.5"/>' +
    '<path d="M60 22 Q70 8 86 14 M60 62 Q70 76 86 70" fill="#FF8A3D" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="118" cy="34" r="5.5" fill="#2B2118"/><circle cx="120" cy="32" r="1.8" fill="#FFFDF6"/>' +
    '<path d="M126 48 Q134 54 126 58" fill="none" stroke="#2B2118" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M64 30 Q74 40 64 50 M84 26 Q94 40 84 54" fill="none" stroke="#E8912E" stroke-width="3" stroke-linecap="round"/></svg>';
  var UNI = '<svg viewBox="0 0 160 112"><path d="M30 78 L26 106 M48 80 L48 106 M96 80 L96 106 M114 78 L118 106" stroke="#FFFDF6" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M30 78 L26 106 M48 80 L48 106 M96 80 L96 106 M114 78 L118 106" stroke="#2B2118" stroke-width="13" stroke-linecap="round" opacity=".9" fill="none" stroke-dasharray="0"/>' +
    '<g><ellipse cx="72" cy="64" rx="46" ry="26" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>' +
    '<path d="M104 54 Q116 30 136 26 Q144 24 144 34 Q144 44 132 48 L118 52 Z" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M140 28 L152 10 L146 30 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="134" cy="36" r="3" fill="#2B2118"/>' +
    '<path d="M112 34 Q118 20 130 16 M108 42 Q114 26 124 22" stroke="#B565D8" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 54 Q14 46 12 60 Q22 66 30 62" fill="#B565D8" stroke="#2B2118" stroke-width="3"/>' +
    '<ellipse cx="72" cy="52" rx="10" ry="5" fill="#FFC53D" opacity=".5"/></g></svg>';
  var JAR = '<svg viewBox="0 0 80 90"><path d="M18 24 L62 24 L68 70 Q64 84 40 84 Q16 84 12 70 Z" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<rect x="16" y="10" width="48" height="16" rx="8" fill="#B565D8" stroke="#2B2118" stroke-width="3.5"/>' +
    '<circle cx="30" cy="46" r="6" fill="#C0764B" stroke="#2B2118" stroke-width="2.5"/>' +
    '<circle cx="48" cy="56" r="6" fill="#C0764B" stroke="#2B2118" stroke-width="2.5"/>' +
    '<circle cx="34" cy="66" r="5" fill="#C0764B" stroke="#2B2118" stroke-width="2.5"/>' +
    '<circle cx="30" cy="45" r="1.4" fill="#2B2118"/><circle cx="48" cy="55" r="1.4" fill="#2B2118"/></svg>';
  var LID = '<svg viewBox="0 0 50 20"><rect x="2" y="2" width="46" height="16" rx="8" fill="#B565D8" stroke="#2B2118" stroke-width="3"/></svg>';

  function spawnProp(html, x, y, w, cls) {
    var d = document.createElement('div');
    d.className = 'prop ' + (cls || '');
    d.innerHTML = html;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    if (w) d.style.width = w + 'px';
    props.appendChild(d);
    return d;
  }
  function puff(x, y, n, color, spread) {
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      var ang = Math.random() * Math.PI * 2;
      var d = (spread || 60) * (0.4 + Math.random() * 0.8);
      var s = 6 + Math.random() * 9;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.width = s + 'px'; p.style.height = s * 0.7 + 'px';
      p.style.background = color || '#E8DCC3';
      p.style.borderRadius = '50%';
      p.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * d - 30) + 'px');
      confetti.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 900); })(p);
    }
  }
  var CONF = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  function burst(x, y, n, spread) {
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      var ang = Math.random() * Math.PI * 2;
      var d = (spread || 80) * (0.45 + Math.random() * 0.8);
      var s = 5 + Math.random() * 7;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.width = s + 'px'; p.style.height = s * (Math.random() > .5 ? 1 : .5) + 'px';
      p.style.background = CONF[i % CONF.length];
      p.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
      p.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * d - 34) + 'px');
      p.style.setProperty('--rot', (Math.random() * 260 - 130) + 'deg');
      confetti.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 900); })(p);
    }
  }
  function sparkleTrail(x, y) {
    var p = document.createElement('i');
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.width = '8px'; p.style.height = '8px';
    p.style.background = '#FFC53D';
    p.style.borderRadius = '50%';
    p.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px');
    p.style.setProperty('--dy', (-20 - Math.random() * 30) + 'px');
    p.style.setProperty('--rot', '90deg');
    confetti.appendChild(p);
    setTimeout(function () { p.remove(); }, 900);
  }

  /* ---------------- Pip helpers ---------------- */
  function pipTransform(x, y) {
    return 'translate(' + (x - 48) + 'px,' + (y - 104) + 'px)';
  }
  function setPipX(x, ms) {
    pipX = x;
    pip.style.transitionDuration = (ms || 400) + 'ms';
    pip.style.transform = pipTransform(x, GROUND_Y);
    setTimeout(function () { pip.style.transitionDuration = '400ms'; }, ms || 400);
  }
  function walkPip(x, ms, done) {
    var id = runId;
    pipMove.classList.add('walking');
    setPipX(x, ms);
    setTimeout(function () {
      if (id !== runId) return;
      pipMove.classList.remove('walking');
      if (done) done();
    }, ms + 60);
  }
  /* rAF flight along an arbitrary path t-> {x,y}; extra(t) syncs props */
  function flyPip(pathFn, ms, extra, done) {
    var t0 = performance.now(), id = runId;
    pip.style.transition = 'none';
    function fr(now) {
      if (id !== runId) return;
      var t = Math.min(1, (now - t0) / ms);
      var p = pathFn(t);
      pipX = p.x;
      pip.style.transform = pipTransform(p.x, p.y);
      if (extra) extra(t);
      if (t < 1) requestAnimationFrame(fr);
      else { pip.style.transition = ''; if (done) done(); }
    }
    requestAnimationFrame(fr);
  }
  function pipFace(f) { pip.setAttribute('data-face', f); }
  function say(txt, ms) {
    sayText.textContent = txt;
    sayEl.classList.add('show');
    clearTimeout(sayEl._t);
    sayEl._t = setTimeout(function () { sayEl.classList.remove('show'); }, ms || 1600);
  }
  function anim(cls, ms) {
    pipMove.classList.remove(cls);
    void pipMove.offsetWidth;
    pipMove.classList.add(cls);
    setTimeout(function () { pipMove.classList.remove(cls); }, ms || 1200);
  }

  /* ---------------- Bitsy the ladybug ---------------- */
  var bugX = -100, bugY = -100;
  function bugTo(x, y, fly) {
    bugX = x; bugY = y;
    if (fly) { bug.classList.add('fly'); sfxBug(); setTimeout(function () { bug.classList.remove('fly'); }, 850); }
    bug.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    bugGlow.style.transform = 'translate(' + (x - 24) + 'px,' + (y - 26) + 'px)';
  }
  function bugPerch(zi) {
    bugTo(ZONES[zi].bugX, GROUND_Y - 20, true);
  }
  function bugEek() {
    bug.classList.remove('eek'); void bug.offsetWidth; bug.classList.add('eek');
    setTimeout(function () { bug.classList.remove('eek'); }, 1600);
  }
  function pointWay(zi) {
    waypoint.style.transform = 'translate(' + (ZONES[zi].objX - 15) + 'px,' + (GROUND_Y - 52) + 'px)';
    waypoint.classList.add('on');
  }

  /* ---------------- the hero maker ---------------- */
  var SEEDS = {
    coral: { body: '#FF8A7A', belly: '#FFD9D3', dark: '#E2604F', seedc: '#FF6B57' },
    sun:   { body: '#FFC53D', belly: '#FFECC0', dark: '#D99F1B', seedc: '#FFC53D' },
    leaf:  { body: '#7CC97F', belly: '#D9F2DC', dark: '#4F9E57', seedc: '#4FB06D' },
    sky:   { body: '#7FB8EC', belly: '#D9EAFC', dark: '#4A87C7', seedc: '#5DA9E9' },
    berry: { body: '#C492E8', belly: '#EFDDFB', dark: '#9A5CC4', seedc: '#B565D8' }
  };
  var TOPS = {
    sprout: '<path d="M60 26 Q59 14 60 6" stroke="#3E8F57" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<path d="M59 16 Q44 4 34 12 Q44 22 58 20 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="3"/>' +
            '<path d="M61 14 Q76 2 86 10 Q76 20 62 18 Z" fill="#58BC7B" stroke="#2B2118" stroke-width="3"/>',
    bud:    '<path d="M60 26 Q59 16 61 10" stroke="#3E8F57" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<circle cx="62" cy="9" r="9.5" fill="#B565D8" stroke="#2B2118" stroke-width="3.5"/>' +
            '<circle cx="59" cy="6" r="2.6" fill="#EFDDFB"/>' +
            '<path d="M64 17 Q74 14 78 20" stroke="#3E8F57" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    bloom:  '<path d="M60 26 Q59 16 60 10" stroke="#3E8F57" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<g fill="#FF6B57" stroke="#2B2118" stroke-width="2.5">' +
            '<ellipse cx="60" cy="2" rx="5.5" ry="4"/><ellipse cx="68" cy="8" rx="5.5" ry="4" transform="rotate(72 68 8)"/>' +
            '<ellipse cx="65" cy="17" rx="5.5" ry="4" transform="rotate(144 65 17)"/>' +
            '<ellipse cx="55" cy="17" rx="5.5" ry="4" transform="rotate(216 55 17)"/>' +
            '<ellipse cx="52" cy="8" rx="5.5" ry="4" transform="rotate(288 52 8)"/></g>' +
            '<circle cx="60" cy="10" r="4.5" fill="#FFC53D" stroke="#2B2118" stroke-width="2.5"/>'
  };
  function faceGroups(style) {
    var norm;
    if (style === 'sleepy') {
      norm = '<path d="M40 48 Q50 55 60 48" stroke="#2B2118" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
             '<path d="M78 51 Q85 56 92 51" stroke="#2B2118" stroke-width="3" fill="none" stroke-linecap="round"/>' +
             '<path d="M37 44 L33 41 M57 45 L60 42" stroke="#2B2118" stroke-width="2.5" stroke-linecap="round"/>' +
             '<circle cx="36" cy="63" r="5" fill="#FF6B57" opacity=".5"/>' +
             '<circle cx="93" cy="65" r="4" fill="#FF6B57" opacity=".45"/>' +
             '<path d="M56 68 Q62 73 68 68" stroke="#2B2118" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    } else if (style === 'star') {
      norm = '<path d="M50 36 L53.5 45 63 45.5 55.5 51.5 57.5 61 50 55.5 42.5 61 44.5 51.5 37 45.5 46.5 45 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="2.2" stroke-linejoin="round"/>' +
             '<circle cx="84" cy="50" r="8" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>' +
             '<circle cx="86" cy="51" r="3.6" fill="#2B2118"/>' +
             '<circle cx="36" cy="63" r="5" fill="#FF6B57" opacity=".5"/>' +
             '<ellipse cx="62" cy="70" rx="6.5" ry="7" fill="#2B2118"/>';
    } else { // smile
      norm = '<circle cx="50" cy="46" r="14" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>' +
             '<circle cx="54" cy="48" r="6" fill="#2B2118"/>' +
             '<circle cx="56.5" cy="45.5" r="2" fill="#FFFDF6"/>' +
             '<circle cx="84" cy="51" r="8" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>' +
             '<circle cx="86" cy="52" r="3.6" fill="#2B2118"/>' +
             '<circle cx="36" cy="63" r="5" fill="#FF6B57" opacity=".5"/>' +
             '<circle cx="93" cy="65" r="4" fill="#FF6B57" opacity=".45"/>' +
             '<path d="M52 69 Q62 77 74 68" stroke="#2B2118" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    }
    return '<g class="face f-norm">' + norm + '</g>' +
      '<g class="face f-happy">' +
        '<path d="M38 46 Q50 36 62 46" stroke="#2B2118" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M76 51 Q84 44 92 51" stroke="#2B2118" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="36" cy="63" r="5" fill="#FF6B57" opacity=".55"/>' +
        '<circle cx="93" cy="65" r="4" fill="#FF6B57" opacity=".5"/>' +
        '<path d="M50 66 Q62 86 76 66 Z" fill="#2B2118"/>' +
        '<path d="M58 75 Q64 80 70 73 Q63 77 58 75" fill="#FF8A7A"/></g>' +
      '<g class="face f-dizzy">' +
        '<g stroke="#2B2118" stroke-width="4" stroke-linecap="round">' +
          '<path d="M42 40 L58 54 M58 40 L42 54"/><path d="M78 46 L91 57 M91 46 L78 57"/></g>' +
        '<circle cx="36" cy="63" r="5" fill="#FF6B57" opacity=".5"/>' +
        '<path d="M50 71 Q55 66 60 71 T70 71 T80 71" stroke="#2B2118" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>' +
      '<g class="face f-scared">' +
        '<circle cx="50" cy="46" r="15" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>' +
        '<circle cx="52" cy="48" r="4" fill="#2B2118"/>' +
        '<circle cx="84" cy="51" r="9.5" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>' +
        '<circle cx="86" cy="52" r="3" fill="#2B2118"/>' +
        '<ellipse cx="62" cy="72" rx="8" ry="9" fill="#2B2118"/></g>';
  }
  function heroSVG() {
    var c = SEEDS[maker.color];
    return '<svg class="herosvg" width="96" height="104" viewBox="0 0 120 128"><g filter="url(#wob)">' +
      '<ellipse cx="44" cy="112" rx="11" ry="8" fill="' + c.dark + '" stroke="#2B2118" stroke-width="3.5"/>' +
      '<ellipse cx="76" cy="112" rx="11" ry="8" fill="' + c.dark + '" stroke="#2B2118" stroke-width="3.5"/>' +
      '<path d="M22 62 Q8 62 7 76 Q18 82 26 72 Z" fill="' + c.dark + '" stroke="#2B2118" stroke-width="3"/>' +
      '<path d="M98 62 Q112 62 113 76 Q102 82 94 72 Z" fill="' + c.dark + '" stroke="#2B2118" stroke-width="3"/>' +
      '<path d="M18 66 C14 34 40 18 62 17 C88 15 106 40 102 70 C99 98 78 110 58 110 C36 110 21 94 18 66 Z" fill="' + c.body + '" stroke="#2B2118" stroke-width="4"/>' +
      '<ellipse cx="61" cy="84" rx="21" ry="18" fill="' + c.belly + '" stroke="#2B2118" stroke-width="3"/>' +
      TOPS[maker.top] + faceGroups(maker.face) + '</g></svg>';
  }

  /* maker chips */
  var TOP_ICONS = {
    sprout: '<svg viewBox="0 0 24 24"><path d="M12 22 Q12 14 12 8" stroke="#3E8F57" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M11 12 Q5 6 2 9 Q6 15 11 14 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="1.6"/><path d="M13 11 Q19 5 22 8 Q18 14 13 13 Z" fill="#58BC7B" stroke="#2B2118" stroke-width="1.6"/></svg>',
    bud: '<svg viewBox="0 0 24 24"><path d="M12 22 Q12 16 12 12" stroke="#3E8F57" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="7" r="5" fill="#B565D8" stroke="#2B2118" stroke-width="1.8"/></svg>',
    bloom: '<svg viewBox="0 0 24 24"><path d="M12 22 Q12 16 12 13" stroke="#3E8F57" stroke-width="2.5" fill="none" stroke-linecap="round"/><g fill="#FF6B57" stroke="#2B2118" stroke-width="1.4"><circle cx="12" cy="4" r="3"/><circle cx="17" cy="8" r="3"/><circle cx="15" cy="14" r="3"/><circle cx="9" cy="14" r="3"/><circle cx="7" cy="8" r="3"/></g><circle cx="12" cy="9" r="2.4" fill="#FFC53D" stroke="#2B2118" stroke-width="1.4"/></svg>'
  };
  var FACE_ICONS = {
    smile: '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.6" fill="#FFFDF6" stroke="#2B2118" stroke-width="1.6"/><circle cx="10" cy="10" r="1.5" fill="#2B2118"/><circle cx="17" cy="9" r="2.6" fill="#FFFDF6" stroke="#2B2118" stroke-width="1.6"/><circle cx="18" cy="10" r="1.2" fill="#2B2118"/><path d="M8 15 Q12 19 17 15" stroke="#2B2118" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    sleepy: '<svg viewBox="0 0 24 24"><path d="M5 9 Q8 12 12 9 M15 10 Q18 12 21 10" stroke="#2B2118" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M9 16 Q12 18.5 15 16" stroke="#2B2118" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M8 4 L9.4 8 13.5 8.2 10.3 10.8 11.4 15 8 12.5 4.6 15 5.7 10.8 2.5 8.2 6.6 8 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="1.4"/><circle cx="17" cy="9" r="2.8" fill="#FFFDF6" stroke="#2B2118" stroke-width="1.6"/><circle cx="18" cy="10" r="1.2" fill="#2B2118"/><ellipse cx="13" cy="17" rx="3" ry="2.4" fill="#2B2118"/></svg>'
  };
  function buildChips() {
    colorChips.innerHTML = ''; topChips.innerHTML = ''; faceChips.innerHTML = '';
    Object.keys(SEEDS).forEach(function (id) {
      var b = document.createElement('button');
      b.className = 'chip swatch' + (maker.color === id ? ' sel' : '');
      b.type = 'button'; b.title = id;
      b.style.background = SEEDS[id].seedc;
      b.setAttribute('aria-label', 'seed color ' + id);
      b.addEventListener('click', function () { maker.color = id; refreshMaker(); });
      colorChips.appendChild(b);
    });
    Object.keys(TOP_ICONS).forEach(function (id) {
      var b = document.createElement('button');
      b.className = 'chip' + (maker.top === id ? ' sel' : '');
      b.type = 'button'; b.title = id;
      b.innerHTML = TOP_ICONS[id];
      b.setAttribute('aria-label', 'sprout top ' + id);
      b.addEventListener('click', function () { maker.top = id; refreshMaker(); });
      topChips.appendChild(b);
    });
    Object.keys(FACE_ICONS).forEach(function (id) {
      var b = document.createElement('button');
      b.className = 'chip' + (maker.face === id ? ' sel' : '');
      b.type = 'button'; b.title = id;
      b.innerHTML = FACE_ICONS[id];
      b.setAttribute('aria-label', 'face ' + id);
      b.addEventListener('click', function () { maker.face = id; refreshMaker(); });
      faceChips.appendChild(b);
    });
  }
  function refreshMaker() {
    buildChips();
    seedDot.style.background = SEEDS[maker.color].seedc;
  }

  function growHero(fast) {
    if (maker.state !== 'choose') return;
    maker.state = 'growing';
    audio();
    seedDot.classList.add('dropin');
    after(fast ? 260 : 560, function () {
      seedDot.classList.add('buried');
      sfxGrow();
      var rand = LSYS.rng((seed ^ 0x51A7) >>> 0);
      var sp = LSYS.SPECS.sprout(rand);
      sp.bloomPalette = [SEEDS[maker.color].body, SEEDS[maker.color].dark];
      sp.growMs = fast ? 800 : 1600;
      var p = LSYS.makePlant(sp, rand, 0.9);
      p.el.style.left = (75 - p.ox) + 'px';
      p.el.style.top = (112 - p.oy) + 'px';
      p.startAt = performance.now();
      sproutSpot.appendChild(p.el);
      maker.sprout = p;
      var pw = setInterval(function () {
        var t = (performance.now() - p.startAt) / p.growMs;
        if (t >= 1 || reduced) { LSYS.paintPlant(p, 1); clearInterval(pw); }
        else LSYS.paintPlant(p, t);
      }, 30);
      after(fast ? 900 : 1800, function () {
        heroPrev.innerHTML = heroSVG();
        heroPrev.classList.add('out');
        p.el.style.transition = 'opacity .5s';
        p.el.style.opacity = '0';
        sfxGood();
        after(700, function () {
          maker.state = 'ready';
          makerCard.classList.add('grown');
          makerTitle.innerHTML = 'Your sprout-friend is ready!';
          readyRow.hidden = false;
          growBtn.textContent = 'Start the story';
        });
      });
    });
  }

  function surpriseMe() {
    var cs = Object.keys(SEEDS), ts = Object.keys(TOP_ICONS), fs = Object.keys(FACE_ICONS);
    maker.color = cs[(Math.random() * cs.length) | 0];
    maker.top = ts[(Math.random() * ts.length) | 0];
    maker.face = fs[(Math.random() * fs.length) | 0];
    refreshMaker();
  }

  function startStory() {
    if (maker.state !== 'ready') return;
    maker.state = 'story';
    makerOv.classList.remove('show');
    setTimeout(function () { makerOv.hidden = true; }, 380);
    pipMove.innerHTML = heroSVG();
    pip.style.opacity = '1';
    pipFace('norm');
    state = 'writing';
    hintChip.style.opacity = '1';
    anim('joy', 900);
    say('hi! let\'s go!', 1400);
    bugPerch(0); pointWay(0);
    loadSentence();
  }

  /* ---------------- rain + cave + fireflies ---------------- */
  var rainBuilt = false;
  function rainOn() {
    if (!rainBuilt) {
      rainBuilt = true;
      for (var i = 0; i < 30; i++) {
        var d = document.createElement('i');
        d.style.left = (Math.random() * 100) + '%';
        d.style.setProperty('--dur', (0.7 + Math.random() * 0.7) + 's');
        d.style.setProperty('--d', (Math.random() * 1.2) + 's');
        rainLayer.appendChild(d);
      }
    }
    rainLayer.classList.add('on');
  }
  function rainOff() { rainLayer.classList.remove('on'); }

  function lightCave() {
    caveBack.classList.add('lit');
    caveDim.classList.add('lit');
  }
  function spawnFireflies(n) {
    fliesBox.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var f = document.createElement('i');
      f.style.left = (6 + Math.random() * 88) + '%';
      f.style.top = (10 + Math.random() * 80) + '%';
      f.style.setProperty('--ax', (Math.random() * 90 - 45) + 'px');
      f.style.setProperty('--ay', (Math.random() * 60 - 30) + 'px');
      f.style.setProperty('--bx', (Math.random() * 100 - 50) + 'px');
      f.style.setProperty('--by', (Math.random() * 70 - 35) + 'px');
      f.style.setProperty('--cx', (Math.random() * 80 - 40) + 'px');
      f.style.setProperty('--cy', (Math.random() * 60 - 30) + 'px');
      f.style.setProperty('--t', (4 + Math.random() * 4) + 's');
      f.style.setProperty('--d', (Math.random() * 2) + 's');
      fliesBox.appendChild(f);
    }
  }

  /* ---------------- gag props ---------------- */
  var GAG_SAY = {
    slip: 'Whoops! Banana peel!',
    weed: 'Thorny weed! Wiggle out!',
    sploosh: 'Sploosh! Right in the drink!',
    soggy: 'A soggy paper bag. Yuck!',
    fizzle: 'Fzzt… a dud!',
    mud: 'Squish! Mud pie!',
    hot: 'Hot hot hot feet!',
    scare: 'Eep! A ghost!',
    bonk: 'Bonk! Right on the noggin!',
    stink: 'Pee-yew! Stinky!',
    bees: 'B-b-b-bees!'
  };

  var GAGS = {
    slip: function (done) {
      var fern = plantNear(pipX, ['fern', 'bush']);
      var pe = spawnProp(PEEL, pipX + 34, GROUND_Y + 16, 54, 'pop');
      pipFace('dizzy'); anim('slipping', 1300);
      say(GAG_SAY.slip, 1700); sfxBoing(); bugEek();
      shakePlant(fern);
      puff(pipX + 40, GROUND_Y + 10, 8, '#E8DCC3', 70);
      after(1350, function () { pe.classList.add('fade'); pipFace('norm'); anim('dustoff', 700); });
      after(2000, function () { pe.remove(); done(); });
    },
    weed: function (done) {   // a thorny weed sprouts and tangles Pip — wiggle out!
      var rand = LSYS.rng((seed ^ 0x9E3779B9) >>> 0);
      var v = addPlant('weed', pipX + 12, GROUND_Y + 28, 1.1, 'front', rand, 40, 800, { noSway: true });
      pipFace('dizzy'); anim('tangled', 1500);
      say(GAG_SAY.weed, 1700); sfxBoing(); bugEek();
      after(1500, function () {
        pipFace('norm'); anim('wiggleout', 1400);
        v.el.style.transition = 'opacity .7s, transform .7s';
        v.el.style.opacity = '0'; v.el.style.transform = 'rotate(24deg)';
      });
      after(2300, function () {
        if (v.wrap) v.wrap.remove(); else v.el.remove();
        var ix = plants.indexOf(v); if (ix >= 0) plants.splice(ix, 1);
        done();
      });
    },
    sploosh: function (done) { // a heavy thing plops into a pop-up puddle
      var heavy = /anvil|piano/.test(submitWord) ? ANVIL : TOASTER;
      var pud = spawnProp(PUDDLE, pipX + 40, GROUND_Y + 22, 130, 'pop');
      var obj = spawnProp(heavy, pipX + 62, GROUND_Y - 160, 84, '');
      obj.style.transition = 'transform .5s cubic-bezier(.5,0,.9,.6)';
      requestAnimationFrame(function () {
        obj.style.transform = 'translateY(' + (GROUND_Y - (GROUND_Y - 160) + 8) + 'px) rotate(14deg)';
      });
      after(500, function () {
        sfxSplash();
        puff(pipX + 105, GROUND_Y + 20, 12, '#6FB8E8', 80);
        puff(pipX + 105, GROUND_Y + 10, 6, '#FFFDF6', 60);
        pipFace('dizzy'); anim('splashwet', 1200);
        say(GAG_SAY.sploosh, 1700); bugEek();
        obj.style.transition = 'transform .6s ease-in, opacity .6s';
        obj.style.transform = 'translateY(30px) rotate(20deg) scale(.8)';
        obj.style.opacity = '0';
      });
      after(1700, function () { pipFace('norm'); anim('dustoff', 700); pud.classList.add('fade'); });
      after(2200, function () { pud.remove(); obj.remove(); done(); });
    },
    soggy: function (done) {   // a droopy paper bag flops onto Pip's head
      var b = spawnProp(BAG, pipX - 12, GROUND_Y - 200, 58, '');
      b.style.transition = 'transform .55s cubic-bezier(.5,0,.9,.6)';
      requestAnimationFrame(function () {
        b.style.transform = 'translateY(104px)';   // lands on Pip's head
      });
      after(560, function () {
        b.style.transform = 'translateY(104px) rotate(18deg)';  // soggy droop
        pipFace('dizzy'); anim('soggy', 1400);
        say(GAG_SAY.soggy, 1700); sfxBoing(); bugEek();
        puff(pipX, GROUND_Y - 70, 6, '#9CC8E8', 50);
      });
      after(1600, function () {
        pipFace('norm'); anim('dustoff', 700);
        b.style.transition = 'transform .5s ease-in, opacity .4s';
        b.style.transform = 'translate(60px, 40px) rotate(70deg)';
        b.style.opacity = '0';
      });
      after(2200, function () { b.remove(); done(); });
    },
    fizzle: function (done) {  // a match that just won't light
      var m = spawnProp(MATCH, pipX + 22, GROUND_Y - 96, 30, 'pop');
      pipFace('scared'); say(GAG_SAY.fizzle, 1700); sfxWobble();
      for (var i = 0; i < 3; i++)
        (function (k) { after(350 + k * 380, function () {
          puff(pipX + 38, GROUND_Y - 92, 5, '#FFC53D', 36); tone(900, .05, 'square', .06);
        }); })(i);
      after(1450, function () {
        puff(pipX + 38, GROUND_Y - 92, 8, '#B8B0A4', 40);   // smoke
        m.classList.add('fade'); pipFace('norm'); anim('dustoff', 700); bugEek();
      });
      after(2100, function () { m.remove(); done(); });
    },
    mud: function (done) {
      var m = spawnProp(MUD, pipX - 60, GROUND_Y + 22, 120, 'pop');
      pipFace('dizzy'); anim('sink', 1200);
      say(GAG_SAY.mud, 1700); sfxBoing(); bugEek();
      puff(pipX, GROUND_Y + 16, 10, '#8A5E2E', 60);
      after(1250, function () { anim('dustoff', 800); pipFace('norm'); m.classList.add('fade'); });
      after(1950, function () { m.remove(); done(); });
    },
    hot: function (done) {
      var h = spawnProp(HOT, pipX - 65, GROUND_Y + 24, 130, 'pop');
      pipFace('scared'); anim('hotfeet', 1500);
      say(GAG_SAY.hot, 1700); sfxBoing(); bugEek();
      for (var i = 0; i < 3; i++)
        (function (k) { after(300 + k * 400, function () { puff(pipX, GROUND_Y + 4, 5, '#FFFDF6', 50); }); })(i);
      after(1550, function () { pipFace('norm'); anim('dustoff', 700); h.classList.add('fade'); });
      after(2100, function () { h.remove(); done(); });
    },
    scare: function (done) {
      var g = spawnProp(GHOST, pipX - 110, GROUND_Y - 96, 66, 'pop');
      var bush = plantNear(pipX - 140, ['bush', 'fern']);
      pipFace('scared'); say(GAG_SAY.scare, 1700); sfxBoing(); bugEek();
      anim('dashl', 500);
      setPipX(Math.max(60, pipX - 150), 450);
      after(500, function () { shakePlant(bush); });
      after(900, function () { g.classList.add('floatoff'); });
      after(1500, function () { setPipX(pipX + 150, 600); pipFace('norm'); anim('dustoff', 700); });
      after(2200, function () { g.remove(); done(); });
    },
    bonk: function (done) {
      var tall = null, ty = 1e9;
      plants.forEach(function (p) {
        if (p.layer === 'back' && p.topWorld < ty) { ty = p.topWorld; tall = p; }
      });
      var isPaper = /test|chores|dentist|homework|taxes|alarm/.test(submitWord);
      var ox = tall ? tall.baseX - 20 : pipX + 40;
      var oy = tall ? (tall.topWorld || 60) + 8 : 40;
      var a = spawnProp(isPaper ? PAPER : APPLE, ox, oy, 40, '');
      var dx = pipX - 20 - ox, dy = (GROUND_Y - 92) - oy;
      a.style.transition = 'transform .55s cubic-bezier(.5,0,.9,.6), opacity .3s';
      requestAnimationFrame(function () {
        a.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(240deg)';
      });
      after(560, function () {
        pipFace('dizzy'); anim('bonked', 1100);
        say(GAG_SAY.bonk, 1700); sfxBoing(); bugEek();
        puff(pipX, GROUND_Y - 96, 7, '#E8DCC3', 50);
        a.style.transition = 'transform .5s ease-in, opacity .35s .35s';
        a.style.transform = 'translate(' + (dx + 30) + 'px,' + (dy + 92) + 'px) rotate(430deg)';
        a.style.opacity = '0';
      });
      after(1800, function () { pipFace('norm'); anim('dustoff', 700); });
      after(2100, function () { a.remove(); done(); });
    },
    stink: function (done) {
      pipFace('dizzy'); anim('faint', 1500);
      say(GAG_SAY.stink, 1700); sfxBoing(); bugEek();
      for (var i = 0; i < 4; i++)
        (function (k) { after(150 + k * 260, function () { puff(pipX + (k % 2 ? 26 : -18), GROUND_Y - 30 - k * 18, 5, '#A8D08D', 46); }); })(i);
      after(1600, function () { pipFace('norm'); anim('dustoff', 800); });
      after(2100, done);
    },
    bees: function (done) {
      var ring = document.createElement('div');
      ring.className = 'beering';
      ring.style.left = pipX + 'px'; ring.style.top = (GROUND_Y - 70) + 'px';
      for (var i = 0; i < 3; i++) {
        var b = document.createElement('div');
        b.className = 'bee b' + i;
        b.innerHTML = BEE;
        ring.appendChild(b);
      }
      props.appendChild(ring);
      pipFace('scared'); anim('duckspin', 1600);
      say(GAG_SAY.bees, 1700); sfxBoing(); bugEek();
      after(1650, function () { ring.classList.add('fade'); pipFace('norm'); anim('dustoff', 700); });
      after(2200, function () { ring.remove(); done(); });
    }
  };

  /* ---------------- beat reactions: words that GROW ---------------- */
  function crossArc(landX, peak, ms, done) {
    var x0 = pipX;
    flyPip(function (t) {
      return { x: x0 + (landX - x0) * t,
               y: GROUND_Y - Math.sin(Math.PI * t) * peak };
    }, ms, null, done);
  }
  function sagCross(landX, sag, ms, done) {
    var x0 = pipX;
    flyPip(function (t) {
      return { x: x0 + (landX - x0) * t,
               y: GROUND_Y + Math.sin(Math.PI * t) * sag };
    }, ms, null, done);
  }

  var REACTS = {
    /* ---- beat 0: cross the broken path ---- */
    '0.bridge': function (w, done) {
      say('a branch-bridge weaves itself!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0xB8126E) >>> 0);
      addPlant('bridgehalf', GAP.x0 + 8, GROUND_Y + 2, 1.0, 'front', rand, 60, 1600, { noSway: true });
      addPlant('bridgehalf', GAP.x1 - 8, GROUND_Y + 2, 1.0, 'front', rand, 200, 1600, { flip: true, noSway: true });
      addPlant('bridgehalf', GAP.x0 + 10, GROUND_Y + 8, 0.72, 'front', rand, 420, 1400, { noSway: true });
      addPlant('bridgehalf', GAP.x1 - 10, GROUND_Y + 8, 0.72, 'front', rand, 560, 1400, { flip: true, noSway: true });
      pipFace('happy');
      after(1900, function () {
        anim('walking', 1300);
        sagCross(GAP.land, 30, 1300, function () { pipFace('happy'); anim('joy', 700); after(500, done); });
      });
    },
    '0.log': function (w, done) {
      say('a fallen branch lands — thunk!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x106) >>> 0);
      addPlant('logbridge', GAP.x0 + 4, GROUND_Y + 2, 1.0, 'front', rand, 60, 1300, { noSway: true });
      addPlant('logbridge', GAP.x0 + 6, GROUND_Y + 12, 0.7, 'front', rand, 350, 1100, { noSway: true });
      pipFace('happy');
      after(1500, function () {
        puff(GAP.x1 - 14, GROUND_Y + 14, 7, '#E8DCC3', 50); tone(120, .18, 'sine', .13);
        anim('walking', 1200);
        sagCross(GAP.land, 14, 1200, function () { anim('joy', 700); after(500, done); });
      });
    },
    '0.vine': function (w, done) {
      say('a swing-vine curls down!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x7A31E5) >>> 0);
      var post = addPlant('post', GAP.x1 + 14, GROUND_Y + 6, 0.85, 'front', rand, 60, 1100, { noSway: true });
      after(1150, function () {
        var tip = opPos(post, 'top');
        var vine = addPlant('hangvine', tip.x, tip.y, 1.0, 'front', rand, 0, 1300, { noSway: true });
        after(1400, function () {
          var grab = opPos(vine, 'bottom');
          puff(grab.x, grab.y, 6, '#7CC97F', 40);
          var x0 = pipX, landX = GAP.land + 8;
          pipFace('scared'); sfxBoing();
          vine.el.classList.add('vineswing');
          flyPip(function (t) {
            var e = t * t * (3 - 2 * t);
            return { x: x0 + (landX - x0) * e,
                     y: GROUND_Y - Math.sin(Math.PI * e) * 120 };
          }, 1150, function (t) {
            vine.el.style.transform = 'rotate(' + (Math.sin(t * Math.PI) * 26 - 8) + 'deg)';
          }, function () {
            vine.el.style.transform = 'rotate(0deg)';
            pipFace('happy'); anim('joy', 700);
            after(500, done);
          });
        });
      });
    },
    '0.stalk': function (w, done) {
      say('a beanstalk shoots up — timber!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0xB3A5) >>> 0);
      var st = addPlant('stalk', GAP.x0 + 10, GROUND_Y + 4, 0.9, 'front', rand, 60, 1900, { noSway: true });
      pipFace('scared');
      after(2000, function () {
        st.el.classList.remove('sway');
        void st.el.offsetWidth;
        st.el.classList.add('tipover');
        tone(160, .4, 'sawtooth', .08, 0, 80);
        after(850, function () {
          puff(GAP.x1 + 6, GROUND_Y + 6, 8, '#E8DCC3', 60);
          pipFace('happy'); anim('walking', 1200);
          sagCross(GAP.land, 4, 1200, function () { anim('joy', 700); after(500, done); });
        });
      });
    },
    '0.step': function (w, done) {
      say('Pip improvises a stepping pad!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x57E9) >>> 0);
      var mid = (GAP.x0 + GAP.x1) / 2;
      addPlant('lilypad', mid, GROUND_Y + 100, 0.55, 'front', rand, 60, 900);
      pipFace('happy');
      after(1000, function () {
        var x0 = pipX, padY = GROUND_Y + 76;
        flyPip(function (t) {
          if (t < 0.5) {
            var u = t * 2;
            return { x: x0 + (mid - x0) * u, y: GROUND_Y - Math.sin(Math.PI * u) * 60 + (padY - GROUND_Y) * u };
          }
          var v = (t - 0.5) * 2;
          return { x: mid + (GAP.land - mid) * v,
                   y: padY - Math.sin(Math.PI * v) * 70 - (padY - GROUND_Y) * v };
        }, 1300, null, function () { anim('joy', 700); after(500, done); });
      });
    },

    /* ---- beat 1: shelter from the drizzle ---- */
    '1.leaf': function (w, done) {
      say('a giant leaf unfurls — thunk!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x1EAF) >>> 0);
      var um = addPlant('leafumbrella', pipX + 56, GROUND_Y + 26, 0.85, 'front', rand, 40, 1300);
      pipFace('happy'); anim('joy', 800);
      after(1400, function () {
        var top = opPos(um, 'top');
        puff(top.x, top.y + 8, 8, '#9CC8E8', 60);   // rain beads bounce off
        after(400, function () { puff(top.x + 10, top.y + 6, 6, '#9CC8E8', 50); });
      });
      after(2400, function () { pipFace('norm'); done(); });
    },
    '1.shroom': function (w, done) {
      say('a toadstool pops open — plop!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0xCA9) >>> 0);
      addPlant('shroombrella', pipX + 52, GROUND_Y + 26, 0.9, 'front', rand, 40, 1200);
      pipFace('happy'); anim('joy', 800);
      after(2200, function () { pipFace('norm'); done(); });
    },
    '1.flower': function (w, done) {
      say('a flower parasol blooms!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0xF10A) >>> 0);
      addPlant('flower', pipX + 54, GROUND_Y + 26, 1.3, 'front', rand, 40, 1500);
      pipFace('happy'); anim('joy', 800);
      after(2300, function () { pipFace('norm'); done(); });
    },

    /* ---- beat 2: ride the pond ---- */
    '2.raft': function (w, done) {
      say('a lily pad grows raft-sized!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x9AD) >>> 0);
      var pad = addPlant('lilypad', 1520, GROUND_Y + 46, 1.0, 'front', rand, 40, 1100, { noSway: true });
      pipFace('happy');
      after(1200, function () {
        var x0 = pipX;
        flyPip(function (t) { return { x: x0 + (1530 - x0) * t, y: GROUND_Y - Math.sin(Math.PI * t) * 60 + 2 * t }; },
          600, null, function () {
            pad.el.style.transition = 'transform 1.7s cubic-bezier(.45,.1,.3,1)';
            requestAnimationFrame(function () {
              pad.el.style.transform = 'translateX(170px)';
            });
            var hx = 1530;
            flyPip(function (t) {
              return { x: hx + 170 * t, y: GROUND_Y + 2 + Math.sin(t * Math.PI * 3) * 4 };
            }, 1700, null, function () {
              flyPip(function (t) {
                return { x: 1700 + (POND.land - 1700) * t, y: GROUND_Y + 2 - Math.sin(Math.PI * t) * 70 - 2 * t };
              }, 600, null, function () {
                pad.el.style.transition = 'opacity .5s'; pad.el.style.opacity = '0';
                after(600, function () { if (pad.wrap) pad.wrap.remove(); var ix = plants.indexOf(pad); if (ix >= 0) plants.splice(ix, 1); });
                anim('joy', 700); after(500, done);
              });
            });
          });
      });
    },
    '2.swan': function (w, done) {
      say('a swan glides over — all aboard!', 1700);
      var sw = spawnProp(SWAN, POND.x0 - 170, GROUND_Y - 58, 150, 'slideable bobbing');
      sfxGood();
      requestAnimationFrame(function () { sw.style.transform = 'translateX(190px)'; });
      after(900, function () {
        var x0 = pipX;
        flyPip(function (t) { return { x: x0 + (1495 - x0) * t, y: GROUND_Y - Math.sin(Math.PI * t) * 60 - 34 * t }; },
          600, null, function () {
            var hx = 1495;
            sw.style.transition = 'transform 1.9s cubic-bezier(.45,.1,.3,1)';
            requestAnimationFrame(function () { sw.style.transform = 'translateX(430px)'; });
            flyPip(function (t) {
              return { x: hx + 200 * t, y: GROUND_Y - 34 + Math.sin(t * Math.PI * 3) * 5 };
            }, 1900, null, function () {
              flyPip(function (t) {
                return { x: 1695 + (POND.land - 1695) * t, y: GROUND_Y - 34 - Math.sin(Math.PI * t) * 60 + 34 * t };
              }, 550, null, function () {
                sw.style.transform = 'translateX(700px)';
                sw.classList.add('fade');
                after(900, function () { sw.remove(); });
                anim('joy', 700); after(500, done);
              });
            });
          });
      });
    },
    '2.fish': function (w, done) {
      say('a giant goldfish leaps — hold on!', 1700);
      var fs = spawnProp(FISH, POND.x0 + 15, GROUND_Y - 44, 140, 'bobbing');
      sfxGood();
      after(500, function () {
        var x0 = pipX;
        flyPip(function (t) { return { x: x0 + (1500 - x0) * t, y: GROUND_Y - Math.sin(Math.PI * t) * 60 - 30 * t }; },
          550, null, function () {
            var legs = [[1500, 1580], [1580, 1660], [1660, 1740]];
            var k = 0;
            function leap() {
              if (k >= legs.length) {
                flyPip(function (t) {
                  return { x: 1740 + (POND.land - 1740) * t, y: GROUND_Y - 20 - Math.sin(Math.PI * t) * 60 + 20 * t };
                }, 500, null, function () {
                  fs.classList.add('fade'); after(500, function () { fs.remove(); });
                  anim('joy', 700); after(500, done);
                });
                return;
              }
              var a = legs[k][0], b = legs[k][1];
              flyPip(function (t) {
                return { x: a + (b - a) * t, y: GROUND_Y - 20 - Math.sin(Math.PI * t) * 90 };
              }, 620, function (t) {
                fs.style.left = (a + (b - a) * t - 65) + 'px';
                fs.style.top = (GROUND_Y - 70 - Math.sin(Math.PI * t) * 90) + 'px';
                fs.style.transform = 'rotate(' + (Math.sin(t * Math.PI) * 30 - 8) + 'deg)';
              }, function () { k++; leap(); });
            }
            leap();
          });
      });
    },
    '2.uni': function (w, done) {
      say('a unicorn trots on the water — of course!', 1900);
      var un = spawnProp(UNI, POND.x0 - 190, GROUND_Y - 92, 160, 'slideable bobbing');
      sfxGood();
      requestAnimationFrame(function () { un.style.transform = 'translateX(210px)'; });
      after(950, function () {
        var x0 = pipX;
        flyPip(function (t) { return { x: x0 + (1485 - x0) * t, y: GROUND_Y - Math.sin(Math.PI * t) * 60 - 52 * t }; },
          600, null, function () {
            var hx = 1485;
            un.style.transition = 'transform 1.8s cubic-bezier(.45,.1,.3,1)';
            requestAnimationFrame(function () { un.style.transform = 'translateX(480px)'; });
            var steps = 0;
            var spk = setInterval(function () {
              sparkleTrail(1495 + steps * 26, GROUND_Y + 6); steps++;
              if (steps > 13) clearInterval(spk);
            }, 130);
            flyPip(function (t) {
              return { x: hx + 210 * t, y: GROUND_Y - 52 + Math.sin(t * Math.PI * 4) * 4 };
            }, 1800, null, function () {
              flyPip(function (t) {
                return { x: 1695 + (POND.land - 1695) * t, y: GROUND_Y - 52 - Math.sin(Math.PI * t) * 60 + 52 * t };
              }, 550, null, function () {
                un.style.transform = 'translateX(760px)';
                un.classList.add('fade');
                after(900, function () { un.remove(); });
                anim('joy', 700); after(500, done);
              });
            });
          });
      });
    },

    /* ---- beat 3: light the hollow log ---- */
    '3.flies': function (w, done) {
      say('a twinkle parade flutters in!', 1700); sfxGrow();
      spawnFireflies(14);
      pipFace('happy');
      after(900, function () {
        lightCave(); sfxGood();
        burst(pipX + 100, GROUND_Y - 100, 10, 60);
      });
      after(2200, function () { pipFace('norm'); done(); });
    },
    '3.shroom': function (w, done) {
      say('lantern mushrooms glow to life!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x610B) >>> 0);
      addPlant('glowshroom', pipX + 62, GROUND_Y + 24, 1.0, 'front', rand, 40, 1400);
      addPlant('glowshroom', pipX + 120, GROUND_Y + 28, 0.7, 'front', rand, 300, 1200);
      pipFace('happy');
      after(1500, function () { lightCave(); sfxGood(); });
      after(2400, function () { pipFace('norm'); done(); });
    },
    '3.torch': function (w, done) {
      say('a fire-flower flares up!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x70C4) >>> 0);
      var tch = addPlant('torch', pipX + 58, GROUND_Y + 24, 1.0, 'front', rand, 40, 1200);
      pipFace('happy');
      after(1300, function () {
        var tip = opPos(tch, 'top');
        var g = document.createElement('div');
        g.className = 'bugglow on';
        g.style.width = '150px'; g.style.height = '150px';
        g.style.transform = 'translate(' + (tip.x - 75) + 'px,' + (tip.y - 60) + 'px)';
        props.appendChild(g);
        lightCave(); sfxGood();
      });
      after(2300, function () { pipFace('norm'); done(); });
    },

    /* ---- beat 4: open the way home ---- */
    '4.door': function (w, done) {
      say('a door grows right out of the bark!', 1700); sfxCreak();
      doorEl.classList.add('grown');
      after(900, function () {
        doorEl.classList.add('open'); sfxGood();
        walkPip(TREE_X - 30, 900, function () {
          anim('enterdoor', 1000); pipFace('happy');
          after(1000, done);
        });
      });
    },
    '4.key': function (w, done) {
      say('a golden key-flower grows!', 1700); sfxGrow();
      var rand = LSYS.rng((seed ^ 0xE77) >>> 0);
      var kf = addPlant('flower', pipX + 60, GROUND_Y + 24, 1.0, 'front', rand, 40, 1300,
                        { bloomPalette: ['#FFC53D', '#FFE9AE'] });
      after(1400, function () {
        var tip = opPos(kf, 'top');
        var ky = spawnProp(KEY, tip.x - 20, tip.y - 10, 50, 'pop');
        sfxGood();
        after(600, function () {
          ky.style.transition = 'transform 1s cubic-bezier(.45,.1,.3,1)';
          requestAnimationFrame(function () {
            ky.style.transform = 'translate(' + (TREE_X - 8 - (tip.x - 20)) + 'px,' +
                                 (GROUND_Y - 60 - (tip.y - 10)) + 'px) rotate(90deg)';
          });
          after(1050, function () {
            ky.classList.add('fade');
            doorEl.classList.add('grown'); sfxCreak();
            after(600, function () {
              doorEl.classList.add('open'); sfxGood();
              ky.remove();
              walkPip(TREE_X - 30, 900, function () {
                anim('enterdoor', 1000); pipFace('happy');
                after(1000, done);
              });
            });
          });
        });
      });
    },
    '4.jar': function (w, done) {
      say('a cookie jar, right on the doorstep!', 1700);
      var j = spawnProp(JAR, TREE_X - 96, GROUND_Y - 76, 72, 'pop');
      var lid = spawnProp(LID, TREE_X - 92, GROUND_Y - 78, 46, 'pop');
      walkPip(TREE_X - 78, 700, function () {
        pipFace('happy');
        lid.style.transition = 'transform .6s var(--spring), opacity .5s';
        requestAnimationFrame(function () {
          lid.style.transform = 'translate(30px,-70px) rotate(40deg)';
          lid.style.opacity = '0';
        });
        sfxGood();
        burst(TREE_X - 62, GROUND_Y - 80, 12, 60);
        say('mm! cookie-powered courage!', 1600);
        after(900, function () {
          doorEl.classList.add('grown');
          after(700, function () {
            doorEl.classList.add('open'); sfxCreak();
            anim('enterdoor', 1000);
            setPipX(TREE_X - 30, 500);
            after(1000, function () { j.remove(); lid.remove(); done(); });
          });
        });
      });
    }
  };

  /* after a silly word, the story still limps forward — funny version canon */
  var CONT = {
    0: function (done) {
      say('a scrappy branch grows anyway!', 1600); sfxGrow();
      var rand = LSYS.rng((seed ^ 0x5C4A) >>> 0);
      addPlant('logbridge', GAP.x0 + 4, GROUND_Y + 2, 1.0, 'front', rand, 40, 900, { noSway: true });
      after(1050, function () {
        anim('walking', 1200);
        sagCross(GAP.land, 16, 1200, function () { pipFace('norm'); done(); });
      });
    },
    1: function (done) {
      say('soggy… but a leaf helps!', 1500); sfxGrow();
      var rand = LSYS.rng((seed ^ 0xA11E) >>> 0);
      addPlant('leafumbrella', pipX + 56, GROUND_Y + 26, 0.7, 'front', rand, 40, 900);
      after(1400, function () { pipFace('norm'); done(); });
    },
    2: function (done) {
      say('a lily pad drifts over to help!', 1600); sfxGrow();
      var rand = LSYS.rng((seed ^ 0xDA11) >>> 0);
      var pad = addPlant('lilypad', 1520, GROUND_Y + 46, 1.0, 'front', rand, 40, 900, { noSway: true });
      after(1100, function () {
        var x0 = pipX;
        flyPip(function (t) { return { x: x0 + (1530 - x0) * t, y: GROUND_Y - Math.sin(Math.PI * t) * 55 + 2 * t }; },
          550, null, function () {
            pad.el.style.transition = 'transform 1.6s cubic-bezier(.45,.1,.3,1)';
            requestAnimationFrame(function () { pad.el.style.transform = 'translateX(170px)'; });
            flyPip(function (t) {
              return { x: 1530 + 140 * t, y: GROUND_Y + 2 + Math.sin(t * Math.PI * 2) * 4 };
            }, 1600, null, function () {
              flyPip(function (t) {
                return { x: 1670 + (POND.land - 1670) * t, y: GROUND_Y + 2 - Math.sin(Math.PI * t) * 60 - 2 * t };
              }, 550, null, function () {
                pad.el.style.transition = 'opacity .5s'; pad.el.style.opacity = '0';
                after(500, function () { var ix = plants.indexOf(pad); if (ix >= 0) plants.splice(ix, 1); pad.el.remove(); });
                pipFace('norm'); done();
              });
            });
          });
      });
    },
    3: function (done) {
      say('Bitsy glows the way through!', 1700);
      bugGlow.classList.add('on');
      bugTo(pipX + 80, GROUND_Y - 60, true);
      var rand = LSYS.rng((seed ^ 0xB1B2) >>> 0);
      addPlant('glowshroom', pipX + 60, GROUND_Y + 24, 0.8, 'front', rand, 200, 1000);
      after(1300, function () { lightCave(); });
      after(2200, function () { pipFace('norm'); done(); });
    },
    4: function (done) {
      say('the door gives up and opens!', 1600);
      doorEl.classList.add('grown'); sfxCreak();
      after(800, function () {
        doorEl.classList.add('open'); sfxGood();
        walkPip(TREE_X - 30, 800, function () {
          anim('enterdoor', 1000); pipFace('happy');
          after(1000, done);
        });
      });
    }
  };

  /* ---------------- word logic ---------------- */
  function lev(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var row = [], i, j;
    for (j = 0; j <= n; j++) row[j] = j;
    for (i = 1; i <= m; i++) {
      var prev = row[0]; row[0] = i;
      for (j = 1; j <= n; j++) {
        var t = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = t;
      }
    }
    return row[n];
  }
  function closestWord(w) {
    var keys = [];
    var t = BEATS[li].table;
    for (var k in t) keys.push(k);
    for (var g in GAG_WORDS) keys.push(g);
    for (var d in GOOD_WORDS) keys.push(d);
    var best = null, bd = 1e9;
    for (var i = 0; i < keys.length; i++) {
      var kk = keys[i];
      if (Math.abs(kk.length - w.length) > 2) continue;
      var dd = lev(w, kk);
      if (dd < bd) { bd = dd; best = kk; }
    }
    var thresh = w.length >= 5 ? 2 : 1;
    return bd <= thresh ? best : null;
  }
  function hideMean() { meanChip.hidden = true; }
  function offerMean(w) {
    var cand = closestWord(w);
    if (!cand) return false;
    meanBtn.textContent = cand;
    meanChip.hidden = false;
    return true;
  }

  function wobble(msg) {
    blankWrap.classList.remove('wobble');
    void blankWrap.offsetWidth;
    blankWrap.classList.add('wobble');
    wordBubble.textContent = msg;
    wordBubble.classList.remove('pop');
    void wordBubble.offsetWidth;
    wordBubble.classList.add('pop');
    sfxWobble();
    pipFace('scared');
    setTimeout(function () { if (state === 'writing') pipFace('norm'); }, 700);
  }

  function submit() {
    if (state !== 'writing') return;
    var w = input.value.trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
    if (!w) { wobble('Type a word first!'); return; }
    submitWord = w;
    hideMean();
    var beat = BEATS[li];
    var react = beat.table[w];
    var gag = GAG_WORDS[w];
    if (react) {
      state = 'reacting';
      stampWord(w, false);
      written.push({ pre: beat.pre, post: beat.post, word: w, silly: false });
      sfxGood();
      REACTS[li + '.' + react](w, function () { CONT_ADV(); });
    } else if (gag) {
      state = 'reacting';
      stampWord(w, true);
      written.push({ pre: beat.pre, post: beat.post, word: w, silly: true });
      GAGS[gag](function () { CONT[li](CONT_ADV); });
    } else if (GOOD_WORDS[w]) {
      state = 'reacting';
      stampWord(w, false);
      written.push({ pre: beat.pre, post: beat.post, word: w, silly: false });
      say('Pip improvises with a ' + w + '!', 1500);
      sfxGood();
      REACTS[li + '.' + beat.fallback](w, function () { CONT_ADV(); });
    } else if (offerMean(w)) {
      wobble('Hmm, close!');
    } else {
      wobble('Is \u2018' + w + '\u2019 a real word? Try again!');
    }
  }

  /* reaction finished -> walk to the next zone, then next sentence */
  function CONT_ADV() {
    if (state === 'done') return;
    li++;
    if (li >= BEATS.length) { finishChapter(); return; }
    state = 'advancing';
    var z = ZONES[li];
    if (li === 1) { /* keep raining while we walk in */ }
    else rainOff();
    setCam(z.cam);
    bugPerch(li);
    var dist = Math.abs(z.heroX - pipX);
    var ms = Math.max(700, Math.min(1500, dist * 2.6));
    if (li === 1) rainOn();
    walkPip(z.heroX, ms, function () {
      if (state === 'done') return;
      state = 'writing';
      pointWay(li);
      loadSentence();
    });
  }

  function stampWord(w, silly) {
    sfxWrite();
    blankWrap.innerHTML = '<span class="wrote' + (silly ? ' silly' : '') + '">' +
      w.replace(/</g, '&lt;') + '</span>';
    stamp.classList.remove('show');
    void stamp.offsetWidth;
    stamp.classList.add('show');
  }

  function loadSentence() {
    var s = BEATS[li];
    sentPre.textContent = s.pre + ' ';
    sentPost.textContent = ' ' + s.post;
    lineNum.textContent = li + 1;
    hintLine.textContent = 'Try: ' + s.hints + ' — or any word you like!';
    if (li === 1) say('drip… drop… uh oh.', 1400);
    if (li === 3) say('it is VERY dark in here…', 1600);
    blankWrap.classList.remove('written', 'wobble');
    blankWrap.innerHTML =
      '<input id="wordInput" type="text" maxlength="16" autocomplete="off" ' +
      'autocorrect="off" autocapitalize="none" spellcheck="false" placeholder="type a word">' +
      '<button class="gobtn" id="goBtn" type="button">Write it!</button>';
    input = document.getElementById('wordInput');
    goBtn = document.getElementById('goBtn');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      e.stopPropagation();
    });
    goBtn.addEventListener('click', function () { submit(); });
    focusInput();
  }

  function focusInput() {
    try { input && input.focus({ preventScroll: true }); } catch (e) { if (input) input.focus(); }
  }

  /* ---------------- finale ---------------- */
  function finishChapter() {
    state = 'done';
    hintChip.style.opacity = '0';
    rainOff();
    waypoint.classList.remove('on');
    bugTo(2420, GROUND_Y - 20, true);
    var rand = LSYS.rng((seed ^ 0xB5297A4D) >>> 0);
    addPlant('party', 2400, GROUND_Y + 4, 0.9, 'back', rand, 300, 3200);
    sfxWin();
    pip.style.opacity = '1';
    pip.style.transform = pipTransform(2450, GROUND_Y);
    pip.style.transition = '';
    pipX = 2450;
    pipMove.classList.remove('walking');
    pipFace('happy'); anim('joy', 1200);
    gemChip.hidden = false;
    burst(pipX, GROUND_Y - 130, 22, 110);
    after(1500, function () { burst(2400, GROUND_Y - 230, 18, 100); });
    after(3400, showPayoff);
  }

  function showPayoff() {
    recapBox.innerHTML = '';
    written.forEach(function (ln) {
      var d = document.createElement('div');
      d.className = 'reline';
      d.innerHTML = ln.pre + ' <b class="' + (ln.silly ? 'sillyw' : '') + '">' +
        ln.word.replace(/</g, '&lt;') + '</b>' + ln.post +
        (ln.silly ? '<span class="sillytag">silly!</span>' : '');
      recapBox.appendChild(d);
    });
    endOv.hidden = false;
    requestAnimationFrame(function () { endOv.classList.add('show'); });
  }

  /* ---------------- reset ---------------- */
  function resetGame(reseed) {
    runId++;
    stopAuto();
    endOv.classList.remove('show');
    setTimeout(function () { endOv.hidden = true; }, 320);
    li = 0; written = []; submitWord = '';
    pipFace('norm');
    pip.style.opacity = '1';
    pipMove.innerHTML = heroSVG();
    pipMove.className = 'pipmove';
    pipMove.classList.remove('walking');
    pip.style.transition = 'none';
    pipX = ZONES[0].heroX;
    pip.style.transform = pipTransform(pipX, GROUND_Y);
    requestAnimationFrame(function () { pip.style.transition = ''; });
    props.innerHTML = '';
    fliesBox.innerHTML = '';
    bugGlow.classList.remove('on');
    caveBack.classList.remove('lit'); caveDim.classList.remove('lit');
    rainOff();
    gemChip.hidden = true;
    hintChip.style.opacity = '1';
    waypoint.classList.remove('on');
    doorEl = null;
    // rebuild the whole garden so grown word-props clear too
    buildWorld(reseed ? (Math.random() * 1e9) >>> 0 : seed);
    setCam(0, true);
    var id = runId;
    setTimeout(function () {
      if (id !== runId) return;
      state = 'writing';
      bugPerch(0); pointWay(0);
      loadSentence();
    }, 450);
  }

  /* ---------------- auto-demo ("Watch it play") ---------------- */
  var auto = { on: false, t: null, ai: 0, ci: 0, lastLi: -1 };
  var DEMO = [ ['bridg'], ['toast'], ['glorp', 'duck'], ['firefly'], ['door'] ];
  // 'bridg' -> "did you mean bridge?" (auto-accepts), 'toast' -> soggy fail,
  // 'glorp' -> not-a-word wobble, then 'duck' rides across

  function startAuto() {
    if (auto.on) return;
    auto.on = true; auto.ai = 0; auto.ci = 0; auto.lastLi = -1;
    stopBtn.classList.add('show');
    if (maker.state === 'choose') {
      surpriseMe();
      growHero(true);
      schedule(2300);
      return;
    }
    if (maker.state === 'growing') { schedule(1200); return; }
    if (maker.state === 'ready') { startStory(); schedule(900); return; }
    if (state === 'done') { stopAuto(); return; }
    schedule(600);
  }
  function stopAuto() {
    auto.on = false;
    clearTimeout(auto.t);
    stopBtn.classList.remove('show');
  }
  function schedule(ms) { clearTimeout(auto.t); auto.t = setTimeout(autoStep, ms); }
  function autoStep() {
    if (!auto.on) return;
    if (maker.state === 'growing') { schedule(1000); return; }
    if (maker.state === 'ready') { startStory(); schedule(900); return; }
    if (maker.state === 'choose') { surpriseMe(); growHero(true); schedule(2400); return; }
    if (state === 'done') { stopAuto(); return; }
    if (state !== 'writing') { schedule(420); return; }
    if (!meanChip.hidden) {           // take the "did you mean" offer
      meanBtn.click(); schedule(600); return;
    }
    if (auto.lastLi !== li) { auto.lastLi = li; auto.ai = 0; auto.ci = 0; }
    var tries = DEMO[Math.min(li, DEMO.length - 1)];
    var word = tries[Math.min(auto.ai, tries.length - 1)];
    if (auto.ci < word.length) {
      input.value = word.slice(0, ++auto.ci);
      schedule(95 + Math.random() * 150);
    } else {
      auto.ci = 0;
      submit();
      if (state === 'writing') auto.ai++;   // wobble -> next try
      else auto.ai = 0;
      schedule(850);
    }
  }

  /* ---------------- events ---------------- */
  growBtn.addEventListener('click', function () {
    if (maker.state === 'ready') startStory();
    else growHero(false);
  });
  surpriseBtn.addEventListener('click', function () {
    if (maker.state !== 'choose') return;
    surpriseMe();
    growHero(false);
  });
  watchBtn.addEventListener('click', startAuto);
  watchChip.addEventListener('click', startAuto);
  stopBtn.addEventListener('click', function () { stopAuto(); focusInput(); });
  meanBtn.addEventListener('click', function () {
    if (state !== 'writing') return;
    input.value = meanBtn.textContent;
    hideMean();
    submit();
  });
  againBtn.addEventListener('click', function () { resetGame(false); });
  newGardenBtn.addEventListener('click', function () { resetGame(true); });
  reseedBtn.addEventListener('click', function () {
    if (state === 'maker') { buildWorld((Math.random() * 1e9) >>> 0); return; }
    resetGame(true);
  });
  stage.addEventListener('pointerdown', function () {
    if (auto.on) stopAuto();
    if (state === 'writing') focusInput();
  });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (auto.on && e.key !== 'Tab') stopAuto();
    if (maker.state !== 'story' || !input) return;
    if (document.activeElement !== input && state === 'writing') {
      if (/^[a-zA-Z ]$/.test(e.key)) {
        if (input.value.length < 16) { input.value += e.key; focusInput(); }
      } else if (e.key === 'Backspace') {
        input.value = input.value.slice(0, -1); focusInput(); e.preventDefault();
      } else if (e.key === 'Enter') {
        submit();
      }
    }
  });

  /* ---------------- init ---------------- */
  fit();
  pip.style.opacity = '0';
  pip.style.transform = pipTransform(ZONES[0].heroX, GROUND_Y);
  buildWorld(seed);
  buildChips();
  seedDot.style.background = SEEDS[maker.color].seedc;
  hintChip.style.opacity = '0';
})();
