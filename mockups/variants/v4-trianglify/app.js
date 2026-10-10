/* Fill the Tale — Crystal Caves edition · variant V4
   Engine: Trianglify (github.com/qrohlf/trianglify) via CDN + vendored fallback.
   Everything in the world is low-poly: the sky is one big faceted gradient mesh,
   hills and cave walls are zigzag silhouettes clipped over trianglify meshes,
   the hero is a kid-built triangulated blob, and typed words spawn faceted props.
   Signature gag: silly words SHATTER the hero into its own triangle shards,
   which then reassemble with dizzy stars. All logic is hardcoded front-end. */

(function () {
  'use strict';

  /* ================= seeded rng ================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ================= color helpers ================= */
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(c) {
    return '#' + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join('');
  }
  function mix(a, b, t) {
    var ca = hex2rgb(a), cb = hex2rgb(b);
    return rgb2hex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
  }
  function shade(hex, amt) { return mix(hex, amt > 0 ? '#FFFFFF' : '#000000', Math.abs(amt)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ================= triangulation engine =================
     Primary: trianglify().polys (v4 API — polys are {vertexIndices,...}).
     Last resort: hand-rolled jittered grid so the page still draws
     triangles if every script source fails.                          */
  function triPolys(w, h, cell, variance, rng, points) {
    if (window.trianglify) {
      var opts = {
        width: w, height: h,
        cellSize: cell,
        variance: variance,
        seed: 'seed-' + Math.floor(rng() * 1e9),
        xColors: 'random'
      };
      if (points) opts.points = points;
      var pattern = window.trianglify(opts);
      return pattern.polys.map(function (poly) {
        return poly.vertexIndices.map(function (vi) { return pattern.points[vi]; });
      });
    }
    var polys = [], step = cell, pts = [];
    for (var y = -step; y < h + step; y += step) {
      var row = [];
      for (var x = -step; x < w + step; x += step) {
        row.push([x + (rng() - 0.5) * step * variance, y + (rng() - 0.5) * step * variance]);
      }
      pts.push(row);
    }
    for (var r = 0; r < pts.length - 1; r++) {
      for (var c = 0; c < pts[r].length - 1; c++) {
        var a = pts[r][c], b = pts[r][c + 1], d = pts[r + 1][c], e = pts[r + 1][c + 1];
        if (rng() > 0.5) { polys.push([a, b, e]); polys.push([a, e, d]); }
        else { polys.push([a, b, d]); polys.push([b, e, d]); }
      }
    }
    return polys;
  }
  function polyStr(poly) {
    return poly.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  }
  function centroid(poly) {
    var x = 0, y = 0;
    for (var i = 0; i < poly.length; i++) { x += poly[i][0]; y += poly[i][1]; }
    return [x / poly.length, y / poly.length];
  }
  function shrinkPoly(poly, f) {
    var c = centroid(poly);
    return poly.map(function (p) { return [c[0] + (p[0] - c[0]) * f, c[1] + (p[1] - c[1]) * f]; });
  }

  /* shorthand for prop-building: inked polygon */
  function T(pts, fill, opt) {
    opt = opt || {};
    return '<polygon points="' + pts + '" fill="' + fill + '"' +
      (opt.ink === false ? '' : ' stroke="#2B2118" stroke-width="' + (opt.w || 3) + '" stroke-linejoin="round"') +
      (opt.o != null ? ' opacity="' + opt.o + '"' : '') +
      (opt.cls ? ' class="' + opt.cls + '"' : '') + '/>';
  }
  function R(x, y, w, h, rx, fill, opt) {
    opt = opt || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' +
      (opt.ink === false ? '' : ' stroke="#2B2118" stroke-width="' + (opt.w || 3) + '"') +
      (opt.o != null ? ' opacity="' + opt.o + '"' : '') +
      (opt.cls ? ' class="' + opt.cls + '"' : '') + '/>';
  }
  function C(cx, cy, r, fill, opt) {
    opt = opt || {};
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' +
      (opt.ink === false ? '' : ' stroke="#2B2118" stroke-width="' + (opt.w || 3) + '"') +
      (opt.o != null ? ' opacity="' + opt.o + '"' : '') +
      (opt.cls ? ' class="' + opt.cls + '"' : '') + '/>';
  }
  function P(d, fill, opt) {
    opt = opt || {};
    return '<path d="' + d + '" fill="' + fill + '"' +
      (opt.ink === false ? '' : ' stroke="#2B2118" stroke-width="' + (opt.w || 3) + '" stroke-linejoin="round"') +
      (opt.sc ? ' stroke-linecap="round"' : '') +
      (opt.o != null ? ' opacity="' + opt.o + '"' : '') +
      (opt.cls ? ' class="' + opt.cls + '"' : '') + '/>';
  }

  /* ================= tiny sounds ================= */
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
      g.gain.exponentialRampToValueAtTime(vol || 0.14, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* silent */ }
  }
  function sfxType()    { tone(700 + Math.random() * 250, 0.05, 'triangle', 0.1); }
  function sfxSubmit()  { tone(520, 0.09, 'triangle', 0.13); tone(780, 0.08, 'triangle', 0.1, 0.06); }
  function sfxHop()     { tone(330, 0.22, 'sine', 0.16, 0, 880); }
  function sfxShatter() {
    for (var i = 0; i < 7; i++) tone(1400 + Math.random() * 1600, 0.09, 'triangle', 0.09, i * 0.045);
    tone(240, 0.3, 'sawtooth', 0.06, 0, 90);
  }
  function sfxAssemble(){ for (var i = 0; i < 5; i++) tone(600 + i * 160, 0.07, 'triangle', 0.09, i * 0.07); }
  function sfxSplash()  { tone(500, 0.3, 'sine', 0.14, 0, 120); tone(900, 0.15, 'triangle', 0.08, 0.05, 300); }
  function sfxFizzle()  { for (var i = 0; i < 6; i++) tone(1600 + Math.random() * 800, 0.05, 'sawtooth', 0.05, i * 0.06); tone(300, 0.35, 'sine', 0.06, 0.2, 90); }
  function sfxSoggy()   { tone(300, 0.35, 'sine', 0.12, 0, 80); tone(200, 0.3, 'sine', 0.1, 0.2, 60); }
  function sfxGlow()    { tone(660, 0.3, 'sine', 0.1, 0, 990); tone(990, 0.4, 'sine', 0.08, 0.15, 1320); }
  function sfxDoor()    { tone(180, 0.5, 'sawtooth', 0.07, 0, 320); tone(700, 0.15, 'triangle', 0.1, 0.45); }
  function sfxHoot()    { tone(392, 0.14, 'sine', 0.09); tone(392, 0.2, 'sine', 0.09, 0.22); }
  function sfxWobble()  { tone(500, 0.12, 'sine', 0.09); tone(380, 0.16, 'sine', 0.09, 0.1); }
  function sfxWin()     { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.13, 'triangle', 0.15, i * 0.09); }); }
  function sfxOops()    { tone(700, 0.12, 'sine', 0.11, 0, 500); tone(500, 0.18, 'sine', 0.1, 0.1, 330); }

  /* ================= the five journey areas =================
     Re-paletted AND re-triangulated per area and per replay. */
  var AREAS = [
    { /* 0 — beat 1 */
      name: 'Emerald Forest', kind: 'forest',
      sky: ['#8FD6E8', '#DDF3E4'], horizon: '#FFF3D6',
      hills: [['#4E9E8C', '#2F7A68'], ['#7CC7A8', '#4E9E8C']],
      ground: '#BEE3CE', cloud: '#FFFDF6',
      sun: ['#FFE08A', '#F5A623'],
      deco: ['#3E8E72', '#5FAE8D', '#2F7A68'],
      gem: ['#9BD8E8', '#B7A8EA', '#FFC53D']
    },
    { /* 1 — beat 2 */
      name: 'Misty Rain', kind: 'rain',
      sky: ['#9FB4CC', '#D9E2EC'], horizon: '#F2E8D8',
      hills: [['#6E89A8', '#4F6B8C'], ['#8FA9C4', '#6E89A8']],
      ground: '#C2D4E0', cloud: '#EAF0F6',
      sun: ['#FFF1C4', '#EBCB8B'],
      deco: ['#5B7A9E', '#7793B5', '#4F6B8C'],
      gem: ['#A8DCF2', '#9BD8E8', '#FFF1C4']
    },
    { /* 2 — beat 3 */
      name: 'Sapphire River', kind: 'river',
      sky: ['#8EC9EF', '#DCEFFB'], horizon: '#FFF3D6',
      hills: [['#5E93C9', '#3D6FA3'], ['#7FB0DC', '#5E93C9']],
      ground: '#B9D9EC', cloud: '#FFFDF6',
      sun: ['#FFE08A', '#F5A623'],
      water: ['#5DA9E9', '#2F6FA3'],
      deco: ['#3D6FA3', '#5E93C9', '#2F6FA3'],
      gem: ['#A8DCF2', '#9BD8E8', '#B7A8EA']
    },
    { /* 3 — beat 4 */
      name: 'Amethyst Cave', kind: 'cave',
      sky: ['#4A3570', '#2E2050'], horizon: '#3B2B62',
      hills: [['#6B4FA3', '#483274'], ['#8A6FC2', '#6B4FA3']],
      ground: '#5A4488', cloud: '#5A4488',
      sun: ['#B7A8EA', '#8A6FC2'],   /* a pale crystal moon */
      deco: ['#7C5BB5', '#9B7BD0', '#5A4488'],
      gem: ['#A8DCF2', '#FFC53D', '#FF8FB5', '#9BE8C9']
    },
    { /* 4 — beat 5 */
      name: 'Golden Home', kind: 'home',
      sky: ['#FFCE8A', '#FFE9C4'], horizon: '#FFF6E0',
      hills: [['#E8A35E', '#C47B3F'], ['#F2BE7E', '#E8A35E']],
      ground: '#F6D8A0', cloud: '#FFF6EA',
      sun: ['#FF9E6E', '#E8483F'],
      deco: ['#C47B3F', '#E8A35E', '#A86434'],
      gem: ['#FFC53D', '#FF8FB5', '#A8DCF2']
    }
  ];

  /* ================= hero maker options ================= */
  var HUES = [
    { name: 'Amethyst', light: '#E2C9F7', dark: '#9B5BD6', edge: '#6E3AA8', accent: '#FFC53D' },
    { name: 'Lagoon',   light: '#B0E9F2', dark: '#3FA7CE', edge: '#237A9E', accent: '#FFC53D' },
    { name: 'Emerald',  light: '#B6EBC9', dark: '#4FB06D', edge: '#2F7A48', accent: '#FF6B57' },
    { name: 'Rose',     light: '#FFC9C0', dark: '#F2604F', edge: '#B93B2E', accent: '#5DA9E9' },
    { name: 'Topaz',    light: '#FFE3A1', dark: '#F0A83B', edge: '#B5761F', accent: '#B565D8' }
  ];
  var FACET_LEVELS = [
    { name: 'Chunky',  nb: 14, grid: 3 },
    { name: 'Crisp',   nb: 22, grid: 4 },
    { name: 'Sparkly', nb: 32, grid: 6 }
  ];
  var HORN_STYLES = [
    { name: 'Crystal horns', id: 'horns' },
    { name: 'Pointy ears',   id: 'ears' },
    { name: 'Sprout',        id: 'sprout' },
    { name: 'Bald',          id: 'none' }
  ];
  var EYE_STYLES = [
    { name: 'Googly', id: 'googly' },
    { name: 'Twins',  id: 'twins' },
    { name: 'Starry', id: 'starry' }
  ];

  var heroCfg = { facets: 1, hue: 0, horns: 'horns', eyes: 'googly', seed: 1 };

  /* ================= story data: the five beats ================= */
  var BEATS = [
    {
      area: 0,
      pre: 'Pip needs to get through the forest! But the path is blocked — Pip needs a',
      post: 'to cross.',
      guide: 'A cracked gap in the path! What could carry me over?',
      sensible: {
        'bridge':          { prop: 'bridge',  act: 'cross', line: 'A crystal bridge! Facets click into place!' },
        'log':             { prop: 'log',     act: 'cross', line: 'Clunk! A sturdy crystal log!' },
        'vine':            { prop: 'vine',    act: 'cross', line: 'Pip swings over on the vine! Whoo!' },
        'plank':           { prop: 'plank',   act: 'cross', line: 'Plank down — tippy-toe across!' },
        'board':           { prop: 'plank',   act: 'cross', line: 'Board down — over we go!' },
        'stepping stones': { prop: 'stones',  act: 'cross', line: 'Hop, hop, hop across the stones!' },
        'stones':          { prop: 'stones',  act: 'cross', line: 'Hop, hop, hop across the stones!' },
        'boat':            { prop: 'leafboat',act: 'cross', line: 'A little leaf-boat ferries Pip over!' }
      },
      silly: {
        'banana peel': { prop: 'peel',     spot: 'feet', line: 'A banana peel?! Crack-tastrophe!' },
        'anvil':       { prop: 'anvil',    spot: 'feet', line: 'An ANVIL? It just goes clunk.' },
        'piano':       { prop: 'piano',    spot: 'gap',  line: 'A piano fills the gap… terribly.' },
        'homework':    { prop: 'homework', spot: 'feet', line: 'Homework cannot carry a hero!' }
      },
      ideas: [['bridge', 0], ['log', 0], ['vine', 0], ['banana peel', 1]]
    },
    {
      area: 1,
      pre: 'Uh oh — fat crystal rain! Quick, Pip grabs a',
      post: 'to stay dry.',
      guide: 'Brrr, rain! What can I hold over my head?',
      sensible: {
        'umbrella':  { prop: 'umbrella',  act: 'cover', line: 'Tilt it just right — nice and dry!' },
        'leaf':      { prop: 'leafbrelly',act: 'cover', line: 'One giant leaf does the trick!' },
        'hat':       { prop: 'hat',       act: 'cover', line: 'A very dashing rain hat!' },
        'newspaper': { prop: 'newspaper', act: 'cover', line: 'Yesterday\u2019s news, today\u2019s roof!' },
        'mushroom':  { prop: 'shroom',    act: 'cover', line: 'A mushroom umbrella — forest style!' }
      },
      silly: {
        'paper bag': { prop: 'bag',   spot: 'head', line: 'A paper bag?! Soggy in seconds!' },
        'toast':     { prop: 'toast', spot: 'head', line: 'Toast?! Now it\u2019s just soggy toast.' },
        'sieve':     { prop: 'sieve', spot: 'head', line: 'A sieve! The rain goes RIGHT through!' },
        'colander':  { prop: 'sieve', spot: 'head', line: 'A colander! Full of holes!' },
        'spaghetti': { prop: 'noodle',spot: 'head', line: 'Wet noodles on his head. Delicious.' }
      },
      ideas: [['umbrella', 0], ['leaf', 0], ['hat', 0], ['paper bag', 1]]
    },
    {
      area: 2,
      pre: 'A wide, glittering river! Pip rides the',
      post: 'across.',
      guide: 'That water is FAST. I need something — or someone — to ride!',
      sensible: {
        'boat':    { prop: 'boat',    act: 'ride', line: 'Gem-boat ahoy! Smooth sailing!' },
        'raft':    { prop: 'raft',    act: 'ride', line: 'A wobbly little raft — hang on!' },
        'duck':    { prop: 'duck',    act: 'ride', line: 'A crystal duck! Quack express!' },
        'fish':    { prop: 'fish',    act: 'ride', line: 'A giant friendly fish — hold the fins!' },
        'unicorn': { prop: 'unicorn', act: 'ride', line: 'A CRYSTAL UNICORN! Best day ever!' }
      },
      silly: {
        'anvil':   { prop: 'anvil',   spot: 'water', line: 'An anvil?! Straight to the bottom!' },
        'toaster': { prop: 'toaster', spot: 'water', line: 'A toaster?! It cannot float. Or toast.' },
        'fridge':  { prop: 'fridge',  spot: 'water', line: 'A fridge?! Glug glug glug.' },
        'piano':   { prop: 'piano',   spot: 'water', line: 'A piano! It sinks in D minor.' }
      },
      ideas: [['boat', 0], ['duck', 0], ['unicorn', 0], ['anvil', 1]]
    },
    {
      area: 3,
      pre: 'The cave is dark as a pocket! Pip lights a',
      post: 'to find the way through.',
      guide: 'So dark! What glows around here?',
      sensible: {
        'lantern':   { prop: 'lantern',   act: 'light', line: 'The lantern gem glows warm!' },
        'torch':     { prop: 'torch',     act: 'light', line: 'A crackling crystal torch!' },
        'fireflies': { prop: 'fireflies', act: 'light', line: 'Fireflies! A living lantern!' },
        'firefly':   { prop: 'fireflies', act: 'light', line: 'One firefly calls all its friends!' },
        'candle':    { prop: 'candle',    act: 'light', line: 'A brave little candle flame!' },
        'glow gem':  { prop: 'glowgem',   act: 'light', line: 'A glow gem! The cave sparkles back!' }
      },
      silly: {
        'wet match': { prop: 'match',  spot: 'hand', line: 'A wet match! Fizzle, fizzle, nothing.' },
        'banana':    { prop: 'banana', spot: 'hand', line: 'A banana is many things. A lamp is not one.' },
        'sock':      { prop: 'sock',   spot: 'hand', line: 'A sock?! It only glows with smell.' },
        'sponge':    { prop: 'sponge', spot: 'hand', line: 'A sponge. Great for baths, bad for light.' }
      },
      ideas: [['lantern', 0], ['torch', 0], ['fireflies', 0], ['wet match', 1]]
    },
    {
      area: 4,
      pre: 'Home sweet home! Pip opens the',
      post: 'and slips inside.',
      guide: 'Almost bedtime! What opens the way in?',
      sensible: {
        'door':       { prop: 'door',      act: 'enter', line: 'Creak — in we go!' },
        'key':        { prop: 'key',       act: 'enter', line: 'Click! The crystal key works!' },
        'cookie jar': { prop: 'cookiejar', act: 'enter', line: 'One cookie for the road — then inside!' },
        'handle':     { prop: 'door',      act: 'enter', line: 'Turn the handle — home!' },
        'doorknob':   { prop: 'door',      act: 'enter', line: 'Turn the knob — home!' }
      },
      silly: {
        'toilet':    { prop: 'toilet',   spot: 'door', line: 'A TOILET on the doorstep?! Who put that there!' },
        'underwear': { prop: 'undies',   spot: 'door', line: 'Underwear?! Pip cracked to pieces!' },
        'homework':  { prop: 'homework', spot: 'door', line: 'Homework at HOME? Double disaster!' },
        'window':    { prop: 'window',   spot: 'door', line: 'That window is painted on! Bonk!' }
      },
      ideas: [['door', 0], ['key', 0], ['cookie jar', 0], ['toilet', 1]]
    }
  ];

  /* scripted words for "Watch it play" — sensible picks plus two big fails */
  var SCRIPT = [
    ['banana peel', 'bridge'],
    ['leaf'],
    ['anvil', 'unicorn'],
    ['torch'],
    ['door']
  ];

  /* ================= dom ================= */
  var stage     = document.getElementById('stage');
  var backdrop  = document.getElementById('backdrop');
  var propsBack = document.getElementById('propsBack');
  var rainFx    = document.getElementById('rainFx');
  var caveDark  = document.getElementById('caveDark');
  var owl       = document.getElementById('owl');
  var owlWrap   = document.getElementById('owlWrap');
  var ride      = document.getElementById('ride');
  var pip       = document.getElementById('pip');
  var heroWrap  = document.getElementById('heroWrap');
  var heldProp  = document.getElementById('heldProp');
  var guide     = document.getElementById('guide');
  var guideName = document.getElementById('guideName');
  var guideText = document.getElementById('guideText');
  var cheer     = document.getElementById('cheer');
  var confetti  = document.getElementById('confetti');
  var beatChip  = document.getElementById('beatChip');
  var palChip   = document.getElementById('palChip');
  var mosaicBtn = document.getElementById('mosaicBtn');
  var hintChip  = document.getElementById('hintChip');
  var makerOv   = document.getElementById('makerOverlay');
  var endOv     = document.getElementById('endOverlay');
  var heroPrev  = document.getElementById('heroPreview');
  var startBtn  = document.getElementById('startBtn');
  var surpriseBtn = document.getElementById('surpriseBtn');
  var watchBtn  = document.getElementById('watchBtn');
  var stopBtn   = document.getElementById('stopBtn');
  var againBtn  = document.getElementById('againBtn');
  var reforgeBtn = document.getElementById('reforgeBtn');
  var watchAgain = document.getElementById('watchAgainBtn');
  var recapBox  = document.getElementById('recap');
  var gagsLine  = document.getElementById('gagsLine');
  var sentenceEl = document.getElementById('sentence');
  var blankEl   = document.getElementById('blank');
  var wordInput = document.getElementById('wordInput');
  var goBtn     = document.getElementById('goBtn');
  var didyouEl  = document.getElementById('didyou');
  var didyouBtn = document.getElementById('didyouBtn');
  var ideasEl   = document.getElementById('ideas');

  /* ================= state ================= */
  var state = 'maker';       // maker | playing | reacting | travel | done
  var bi = 0;                // beat index 0..4
  var chosen = [];           // {word, silly} every word written into the tale
  var sillyCount = 0;
  var gagTimers = [];
  var guideTimer = null;
  var heroSvg = null;
  var area = AREAS[0];
  var propSeq = 0;
  var HERO_LEFT = 14;        // % — start-of-area position
  var currentSuggest = null;

  function after(ms, fn) { var t = setTimeout(fn, ms); gagTimers.push(t); return t; }
  function clearTimers() { gagTimers.forEach(clearTimeout); gagTimers = []; clearTimeout(guideTimer); }

  /* ================= mosaic generation ================= */
  function zigzagPath(rng, yBase, amp, w, bottom, flatY) {
    var d = 'M0 ' + bottom + ' L0 ' + yBase.toFixed(1);
    var x = 0;
    while (x < w) {
      var nx = Math.min(w, x + 55 + rng() * 90);
      var ny = (flatY != null && nx <= 320) ? flatY + rng() * 8 - 4
                                          : yBase - rng() * amp;
      d += ' L' + nx.toFixed(1) + ' ' + ny.toFixed(1);
      x = nx;
    }
    d += ' L' + w + ' ' + bottom + ' Z';
    return d;
  }

  function crystalCluster(rng, kx, ky, cols, scale) {
    var out = ['<g stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round">'];
    var nShard = 1 + Math.floor(rng() * 3);
    for (var s = 0; s < nShard; s++) {
      var sw = (10 + rng() * 16) * scale, sh = (22 + rng() * 44) * scale;
      var ox = (s - (nShard - 1) / 2) * (sw * 1.15);
      var lean = (rng() - 0.5) * 0.5;
      var x0 = kx + ox, y0 = ky;
      var cc = cols[Math.floor(rng() * cols.length)];
      out.push('<polygon points="' + (x0 - sw / 2).toFixed(1) + ',' + y0.toFixed(1) + ' ' +
               (x0 + sw / 2).toFixed(1) + ',' + y0.toFixed(1) + ' ' +
               (x0 + sw * lean).toFixed(1) + ',' + (y0 - sh).toFixed(1) + '" fill="' + cc + '"/>');
      out.push('<polygon points="' + (x0 + sw / 2).toFixed(1) + ',' + y0.toFixed(1) + ' ' +
               (x0 + sw * lean).toFixed(1) + ',' + (y0 - sh).toFixed(1) + ' ' +
               (x0 + sw * 0.16).toFixed(1) + ',' + (y0 - sh * 0.45).toFixed(1) +
               '" fill="' + shade(cc, -0.22) + '" stroke="none"/>');
    }
    out.push('</g>');
    return out.join('');
  }

  function facetedTree(rng, tx, ty, scale, cols) {
    /* low-poly pine: stacked jittered triangles on a stubby trunk */
    var out = ['<g stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round">'];
    var trunkW = 10 * scale, trunkH = 16 * scale;
    out.push('<polygon points="' + (tx - trunkW / 2) + ',' + ty + ' ' + (tx + trunkW / 2) + ',' + ty + ' ' +
             (tx + trunkW / 2 - 2) + ',' + (ty - trunkH) + ' ' + (tx - trunkW / 2 + 2) + ',' + (ty - trunkH) + '" fill="#8A5E2E"/>');
    var layers = 3, w = 56 * scale, h = 30 * scale;
    for (var l = 0; l < layers; l++) {
      var ly = ty - trunkH - l * h * 0.62;
      var lw = w * (1 - l * 0.26);
      var jag = (rng() - 0.5) * 8;
      var c = cols[l % cols.length];
      out.push('<polygon points="' + (tx - lw / 2 + jag).toFixed(1) + ',' + ly.toFixed(1) + ' ' +
               (tx + lw / 2 + jag).toFixed(1) + ',' + ly.toFixed(1) + ' ' +
               (tx + (rng() - 0.5) * 10).toFixed(1) + ',' + (ly - h).toFixed(1) + '" fill="' + c + '"/>');
      /* a darker under-facet */
      out.push('<polygon points="' + (tx - lw / 2 + jag).toFixed(1) + ',' + ly.toFixed(1) + ' ' +
               tx.toFixed(1) + ',' + (ly - h * 0.35).toFixed(1) + ' ' +
               (tx + lw * 0.18 + jag).toFixed(1) + ',' + ly.toFixed(1) +
               '" fill="' + shade(c, -0.16) + '" stroke="none"/>');
    }
    out.push('</g>');
    return out.join('');
  }

  /* one backdrop build = one fresh trianglify mosaic in the area palette */
  function buildBackdrop(seed, areaIdx) {
    var rng = mulberry32(seed);
    var W = 800, H = 460;
    var out = [], defs = [];
    var a = area = AREAS[areaIdx];

    /* -- faceted sky: one big trianglify mesh on a vertical ramp -- */
    var skyPolys = triPolys(W, H, 66, 0.9, rng);
    out.push('<g>');
    for (var i = 0; i < skyPolys.length; i++) {
      var c = centroid(skyPolys[i]);
      var t = Math.min(1, Math.max(0, c[1] / H));
      var col = mix(a.sky[0], a.sky[1], t);
      if (c[1] > H * 0.62) col = mix(col, a.horizon, Math.min(1, (c[1] - H * 0.62) / (H * 0.38)) * 0.5);
      col = shade(col, (rng() - 0.5) * 0.07);
      out.push('<polygon points="' + polyStr(skyPolys[i]) + '" fill="' + col + '" stroke="rgba(255,253,246,.28)" stroke-width=".7"/>');
    }
    out.push('</g>');

    /* -- faceted sun/moon clipped to a disc -- */
    var sunX = 90 + rng() * 620, sunY = 58 + rng() * 62, sunR = 36 + rng() * 12;
    defs.push('<clipPath id="sunclip"><circle cx="' + sunX.toFixed(1) + '" cy="' + sunY.toFixed(1) + '" r="' + sunR.toFixed(1) + '"/></clipPath>');
    if (a.kind === 'cave') sunR = 30;                       /* small crystal moon */
    out.push('<circle cx="' + sunX + '" cy="' + sunY + '" r="' + (sunR + 5) + '" fill="#2B2118"/>');
    out.push('<g clip-path="url(#sunclip)">');
    var sunPolys = triPolys(W, H, 22, 1, rng);
    for (i = 0; i < sunPolys.length; i++) {
      c = centroid(sunPolys[i]);
      if (Math.hypot(c[0] - sunX, c[1] - sunY) > sunR + 12) continue;
      col = mix(a.sun[0], a.sun[1], Math.min(1, Math.max(0, (c[1] - sunY + sunR) / (sunR * 2))));
      col = shade(col, (rng() - 0.5) * 0.12);
      out.push('<polygon points="' + polyStr(shrinkPoly(sunPolys[i], 0.93)) + '" fill="' + col + '"/>');
    }
    out.push('</g>');
    if (a.kind === 'cave') {                                /* moon facet glint */
      out.push('<polygon points="' + (sunX - 8) + ',' + (sunY - 10) + ' ' + sunX + ',' + (sunY - 18) + ' ' + (sunX + 6) + ',' + (sunY - 8) + '" fill="rgba(255,253,246,.5)"/>');
    }

    /* -- faceted cloud puffs (skip in the cave — it has a roof) -- */
    if (a.kind !== 'cave') {
      var nClouds = a.kind === 'rain' ? 3 : 2;
      for (var ci = 0; ci < nClouds; ci++) {
        var cx = 100 + rng() * 600, cy = 62 + rng() * 74, rx = 46 + rng() * 30, ry = 15 + rng() * 9;
        defs.push('<clipPath id="cloud' + ci + '"><ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '"/></clipPath>');
        out.push('<g clip-path="url(#cloud' + ci + ')" opacity=".92">');
        var cp = triPolys(W, H, 20, 1, rng);
        for (i = 0; i < cp.length; i++) {
          c = centroid(cp[i]);
          var dx = (c[0] - cx) / rx, dy = (c[1] - cy) / ry;
          if (dx * dx + dy * dy > 1.2) continue;
          col = shade(a.cloud, -0.06 - rng() * 0.08 + dy * -0.05);
          if (a.kind === 'rain') col = shade(col, -0.18);   /* heavy grey bellies */
          out.push('<polygon points="' + polyStr(shrinkPoly(cp[i], 0.94)) + '" fill="' + col + '"/>');
        }
        out.push('</g>');
      }
    }

    /* -- polygonal hills / cave walls -- */
    var hillDefs;
    if (a.kind === 'cave') {
      hillDefs = [
        { base: 296, amp: 70, cols: a.hills[0], cell: 58, ink: 3, flat: null },
        { base: 352, amp: 50, cols: a.hills[1], cell: 46, ink: 3.5, flat: 370 }
      ];
    } else {
      hillDefs = [
        { base: 292, amp: 64, cols: a.hills[0], cell: 58, ink: 3, flat: null },
        { base: 348, amp: 52, cols: a.hills[1], cell: 46, ink: 3.5, flat: 370 }
      ];
    }
    for (var hI = 0; hI < hillDefs.length; hI++) {
      var hd = hillDefs[hI];
      var sil = zigzagPath(rng, hd.base, hd.amp, W, H + 4, hd.flat);
      defs.push('<clipPath id="hill' + hI + '"><path d="' + sil + '"/></clipPath>');
      out.push('<g clip-path="url(#hill' + hI + ')">');
      var hp = triPolys(W, H, hd.cell, 1, rng);
      for (i = 0; i < hp.length; i++) {
        c = centroid(hp[i]);
        if (c[1] < hd.base - hd.amp - 30) continue;
        var ht = Math.min(1, Math.max(0, (c[1] - (hd.base - hd.amp)) / (H - (hd.base - hd.amp))));
        col = mix(hd.cols[0], hd.cols[1], ht);
        col = shade(col, (rng() - 0.5) * 0.09);
        out.push('<polygon points="' + polyStr(hp[i]) + '" fill="' + col + '" stroke="rgba(255,253,246,.16)" stroke-width=".6"/>');
      }
      out.push('</g>');
      out.push('<path d="' + sil + '" fill="none" stroke="#2B2118" stroke-width="' + hd.ink + '" stroke-linejoin="round"/>');
    }

    /* -- per-area extras -- */
    if (a.kind === 'forest') {
      var nTrees = 4 + Math.floor(rng() * 3);
      for (i = 0; i < nTrees; i++) {
        var tx = 60 + rng() * 700;
        if (tx > 120 && tx < 330) continue;                 // keep Pip's patch clear
        out.push(facetedTree(rng, tx, 372 + rng() * 22, 0.7 + rng() * 0.7, a.deco));
      }
      /* the crack in the path — a zigzag stream-gap at x 405..555 */
      out.push('<g>' +
        '<path d="M405 372 L440 382 470 374 505 384 540 375 555 380 L555 452 405 452 Z" fill="#2B2118" opacity=".92"/>' +
        '<path d="M418 392 L450 402 492 394 540 402 L540 452 418 452 Z" fill="' + mix('#5DA9E9', '#2F6FA3', 0.4) + '"/>' +
        '</g>');
      /* stepping stream sparkle */
      for (i = 0; i < 6; i++) {
        var sx = 418 + rng() * 120, sy = 398 + rng() * 44;
        out.push('<polygon points="' + sx + ',' + sy + ' ' + (sx + 12) + ',' + (sy + 4) + ' ' + (sx + 4) + ',' + (sy + 10) +
                 '" fill="rgba(255,253,246,.5)"/>');
      }
    }

    if (a.kind === 'rain') {
      /* puddles: faceted flat ellipses on the lane */
      for (i = 0; i < 4; i++) {
        var px = 90 + rng() * 620, py = 388 + rng() * 40;
        if (px > 150 && px < 330) continue;
        out.push('<polygon points="' + (px - 34) + ',' + py + ' ' + px + ',' + (py - 8) + ' ' + (px + 38) + ',' + py + ' ' + px + ',' + (py + 8) +
                 '" fill="' + mix('#7FA8CC', '#5DA9E9', rng() * 0.5) + '" opacity=".55"/>');
      }
      /* soggy leaning trees */
      for (i = 0; i < 3; i++) {
        var tx2 = 80 + rng() * 680;
        if (tx2 > 120 && tx2 < 330) continue;
        out.push(facetedTree(rng, tx2, 374 + rng() * 20, 0.55 + rng() * 0.5, a.deco));
      }
    }

    if (a.kind === 'river') {
      /* bank on the left, wide trianglify water across the rest */
      out.push('<path d="M0 372 L300 372 L340 460 L0 460 Z" fill="' + a.ground + '" stroke="#2B2118" stroke-width="3"/>');
      var wp = triPolys(W, H, 40, 1, rng);
      defs.push('<clipPath id="waterclip"><path d="M292 360 Q 400 348 520 356 T 800 350 L800 460 292 460 Z"/></clipPath>');
      out.push('<path d="M292 360 Q 400 348 520 356 T 800 350 L800 460 292 460 Z" fill="#2B2118"/>');
      out.push('<g clip-path="url(#waterclip)">');
      for (i = 0; i < wp.length; i++) {
        c = centroid(wp[i]);
        if (c[0] < 270 || c[1] < 335) continue;
        var wt = Math.min(1, Math.max(0, (c[1] - 350) / 110));
        col = mix(a.water[0], a.water[1], wt);
        col = shade(col, (rng() - 0.5) * 0.1);
        out.push('<polygon points="' + polyStr(shrinkPoly(wp[i], 0.96)) + '" fill="' + col + '"/>');
      }
      /* sparkle facets on the surface */
      for (i = 0; i < 10; i++) {
        var wx = 330 + rng() * 440, wy = 368 + rng() * 60;
        out.push('<polygon points="' + wx + ',' + wy + ' ' + (wx + 16) + ',' + (wy + 5) + ' ' + (wx + 5) + ',' + (wy + 11) +
                 '" fill="rgba(255,253,246,.45)"/>');
      }
      out.push('</g>');
    }

    if (a.kind === 'cave') {
      /* stalactites from the top */
      var nStal = 5 + Math.floor(rng() * 4);
      for (i = 0; i < nStal; i++) {
        var stx = 30 + rng() * 740, stw = 24 + rng() * 30, sth = 60 + rng() * 90;
        var sc = a.hills[0][1];
        out.push('<polygon points="' + (stx - stw / 2) + ',0 ' + (stx + stw / 2) + ',0 ' + (stx + (rng() - 0.5) * 14) + ',' + sth +
                 '" fill="' + shade(sc, (rng() - 0.5) * 0.14) + '" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>');
      }
      /* gem clusters that glow once Pip has light — start dim */
      out.push('<g id="litgems" opacity=".28" style="transition:opacity 1.2s ease">');
      var nGems = 5 + Math.floor(rng() * 3);
      for (i = 0; i < nGems; i++) {
        var gx = 50 + rng() * 700;
        if (gx > 130 && gx < 320) continue;
        out.push(crystalCluster(rng, gx, 388 + rng() * 40, a.gem, 0.9 + rng() * 0.8));
      }
      /* a few wall-embedded gems */
      for (i = 0; i < 4; i++) {
        var gy2 = 60 + rng() * 200, gx2 = 60 + rng() * 680;
        var gc = a.gem[Math.floor(rng() * a.gem.length)];
        out.push('<polygon points="' + gx2 + ',' + gy2 + ' ' + (gx2 + 14) + ',' + (gy2 + 20) + ' ' + (gx2 - 6) + ',' + (gy2 + 26) +
                 '" fill="' + gc + '" opacity=".8" stroke="#2B2118" stroke-width="2"/>');
      }
      out.push('</g>');
    }

    if (a.kind === 'home') {
      /* a cozy faceted cottage at the right, door opening dark */
      var hx = 618, hy = 372;
      out.push('<g stroke="#2B2118" stroke-width="3" stroke-linejoin="round">');
      /* walls: two facets */
      out.push('<polygon points="' + (hx - 4) + ',' + hy + ' ' + (hx + 160) + ',' + hy + ' ' + (hx + 160) + ',' + (hy - 96) + ' ' + (hx - 4) + ',' + (hy - 96) + '" fill="#F2D8AE"/>');
      out.push('<polygon points="' + (hx - 4) + ',' + hy + ' ' + (hx + 78) + ',' + hy + ' ' + (hx + 78) + ',' + (hy - 96) + ' ' + (hx - 4) + ',' + (hy - 96) + '" fill="#E8C795"/>');
      /* roof: big triangle + snow-cap facet */
      out.push('<polygon points="' + (hx - 22) + ',' + (hy - 94) + ' ' + (hx + 178) + ',' + (hy - 94) + ' ' + (hx + 78) + ',' + (hy - 168) + '" fill="#C4623F"/>');
      out.push('<polygon points="' + (hx + 78) + ',' + (hy - 168) + ' ' + (hx + 178) + ',' + (hy - 94) + ' ' + (hx + 112) + ',' + (hy - 94) + '" fill="#A85138"/>');
      /* round window */
      out.push('<circle cx="' + (hx + 34) + '" cy="' + (hy - 62) + '" r="14" fill="#FFE9A8"/>');
      out.push('<path d="M' + (hx + 20) + ' ' + (hy - 62) + ' L' + (hx + 48) + ' ' + (hy - 62) + ' M' + (hx + 34) + ' ' + (hy - 76) + ' L' + (hx + 34) + ' ' + (hy - 48) + '" stroke="#2B2118" stroke-width="2.5" fill="none"/>');
      /* chimney + smoke triangles */
      out.push('<polygon points="' + (hx + 128) + ',' + (hy - 118) + ' ' + (hx + 148) + ',' + (hy - 118) + ' ' + (hx + 148) + ',' + (hy - 152) + ' ' + (hx + 128) + ',' + (hy - 152) + '" fill="#8A5E2E"/>');
      out.push('</g>');
      out.push('<g class="smoke" opacity=".7">');
      out.push('<polygon points="' + (hx + 138) + ',' + (hy - 160) + ' ' + (hx + 152) + ',' + (hy - 176) + ' ' + (hx + 130) + ',' + (hy - 184) + '" fill="#FFFDF6" opacity=".6"/>');
      out.push('<polygon points="' + (hx + 148) + ',' + (hy - 196) + ' ' + (hx + 160) + ',' + (hy - 212) + ' ' + (hx + 140) + ',' + (hy - 218) + '" fill="#FFFDF6" opacity=".4"/>');
      out.push('</g>');
      /* door frame + dark opening (the door prop animates over this) */
      out.push('<g id="doorway"><rect x="' + (hx + 96) + '" y="' + (hy - 78) + '" width="46" height="78" rx="4" fill="#2B2118"/></g>');
      /* welcome mat + stepping stones */
      out.push('<polygon points="' + (hx + 92) + ',' + hy + ' ' + (hx + 150) + ',' + hy + ' ' + (hx + 156) + ',' + (hy + 12) + ' ' + (hx + 86) + ',' + (hy + 12) + '" fill="#FF6B57" stroke="#2B2118" stroke-width="2.5"/>');
      for (i = 0; i < 3; i++) {
        var st2 = 480 + i * 44 + rng() * 10;
        out.push('<polygon points="' + st2 + ',' + (hy + 16) + ' ' + (st2 + 26) + ',' + (hy + 14) + ' ' + (st2 + 30) + ',' + (hy + 24) + ' ' + (st2 + 4) + ',' + (hy + 26) +
                 '" fill="' + shade('#B9A98F', (rng() - 0.5) * 0.2) + '" stroke="#2B2118" stroke-width="2"/>');
      }
    }

    /* scattered crystal shards on the ground in every area */
    var nCry = a.kind === 'cave' ? 0 : 3 + Math.floor(rng() * 3);
    var placed = [];
    for (i = 0; i < nCry; i++) {
      var kx = 40 + rng() * 720;
      if (kx > 90 && kx < 340) continue;
      if (a.kind === 'home' && kx > 580) continue;
      var ok = true;
      for (var pj = 0; pj < placed.length; pj++) if (Math.abs(placed[pj] - kx) < 60) { ok = false; break; }
      if (!ok) continue;
      placed.push(kx);
      out.push(crystalCluster(rng, kx, 374 + rng() * 32, a.gem, 0.8));
    }

    backdrop.innerHTML = '<defs>' + defs.join('') + '</defs>' + out.join('');
    palChip.textContent = a.name;
    stage.classList.toggle('is-rain', a.kind === 'rain');
    stage.classList.toggle('is-cave', a.kind === 'cave');
    caveDark.classList.toggle('on', a.kind === 'cave');
  }

  /* ================= hero: the kid-built crystal blob =================
     Boundary + interior points are scattered on a soft ellipse, triangulated
     by trianglify, and every triangle inside the blob becomes a shard.
     Every facet, eye, horn and foot shares class .shard so the signature
     shatter gag can fling each piece separately.                        */
  function buildHeroSVG(cfg, seed) {
    var rng = mulberry32(seed);
    var W = 160, H = 170;
    var cx = 80, cy = 88, rx = 56, ry = 56;
    var lvl = FACET_LEVELS[cfg.facets];
    var hue = HUES[cfg.hue];

    var pts = [];
    var NB = lvl.nb;
    for (var i = 0; i < NB; i++) {
      var ang = (i / NB) * Math.PI * 2;
      var jr = 0.94 + rng() * 0.12;
      pts.push([cx + Math.cos(ang) * rx * jr, cy + Math.sin(ang) * ry * jr]);
    }
    for (var gy = 0; gy < lvl.grid; gy++) {
      for (var gx = 0; gx < lvl.grid; gx++) {
        var px = cx - rx * 0.8 + gx * (rx * 1.6 / Math.max(1, lvl.grid - 1)) + (rng() - 0.5) * 22;
        var py = cy - ry * 0.8 + gy * (ry * 1.6 / Math.max(1, lvl.grid - 1)) + (rng() - 0.5) * 22;
        var ex = (px - cx) / rx, ey = (py - cy) / ry;
        if (ex * ex + ey * ey < 0.72) pts.push([px, py]);
      }
    }

    var polys = triPolys(W, H, 26, 1, rng, pts);
    var svg = [];

    /* chunky sticker silhouette behind the facets */
    var fp = pts[0], lp = pts[NB - 1];
    var smx = cx + ((fp[0] + lp[0]) / 2 - cx) * 1.055;
    var smy = cy + ((fp[1] + lp[1]) / 2 - cy) * 1.055;
    var outline = 'M' + smx.toFixed(1) + ' ' + smy.toFixed(1);
    for (i = 0; i < NB; i++) {
      var p = pts[i], pn = pts[(i + 1) % NB];
      var ox = cx + (p[0] - cx) * 1.055, oy = cy + (p[1] - cy) * 1.055;
      var mx = cx + ((p[0] + pn[0]) / 2 - cx) * 1.055;
      var my = cy + ((p[1] + pn[1]) / 2 - cy) * 1.055;
      outline += ' Q' + ox.toFixed(1) + ' ' + oy.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    outline += ' Z';
    svg.push('<path class="shard" d="' + outline + '" fill="' + hue.edge + '" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>');

    /* the facets themselves */
    svg.push('<g class="facets">');
    for (i = 0; i < polys.length; i++) {
      var poly = polys[i];
      var c = centroid(poly);
      var exx = (c[0] - cx) / rx, eyy = (c[1] - cy) / ry;
      if (exx * exx + eyy * eyy > 1.08) continue;
      var tt = Math.min(1, Math.max(0, (c[1] - cy + ry) / (ry * 2)));
      var col = mix(hue.light, hue.dark, tt);
      col = shade(col, (rng() - 0.5) * 0.14);
      if (rng() < 0.07) col = shade(hue.accent, 0.08);
      if (c[1] > cy + ry * 0.18 && Math.abs(c[0] - cx) < rx * 0.5) col = shade(col, 0.1);
      svg.push('<polygon class="shard" points="' + polyStr(shrinkPoly(poly, 0.9)) + '" fill="' + col + '" stroke="rgba(43,33,24,.22)" stroke-width=".6"/>');
    }
    svg.push('</g>');

    /* horns / ears / sprout — crystal body parts in the accent colour */
    var ac = hue.accent;
    if (cfg.horns === 'horns') {
      svg.push('<polygon class="shard" points="' + (cx - 30) + ',' + (cy - ry * 0.82) + ' ' + (cx - 44) + ',' + (cy - ry - 22) + ' ' + (cx - 14) + ',' + (cy - ry * 0.92) + '" fill="' + ac + '" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>');
      svg.push('<polygon class="shard" points="' + (cx + 16) + ',' + (cy - ry * 0.9) + ' ' + (cx + 40) + ',' + (cy - ry - 16) + ' ' + (cx + 34) + ',' + (cy - ry * 0.66) + '" fill="' + ac + '" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>');
    } else if (cfg.horns === 'ears') {
      svg.push('<polygon class="shard" points="' + (cx - 40) + ',' + (cy - ry * 0.7) + ' ' + (cx - 52) + ',' + (cy - ry - 26) + ' ' + (cx - 18) + ',' + (cy - ry * 0.9) + '" fill="' + hue.edge + '" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>');
      svg.push('<polygon class="shard" points="' + (cx - 38) + ',' + (cy - ry * 0.74) + ' ' + (cx - 45) + ',' + (cy - ry - 14) + ' ' + (cx - 24) + ',' + (cy - ry * 0.82) + '" fill="' + ac + '" stroke="none"/>');
      svg.push('<polygon class="shard" points="' + (cx + 40) + ',' + (cy - ry * 0.7) + ' ' + (cx + 52) + ',' + (cy - ry - 26) + ' ' + (cx + 18) + ',' + (cy - ry * 0.9) + '" fill="' + hue.edge + '" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>');
      svg.push('<polygon class="shard" points="' + (cx + 38) + ',' + (cy - ry * 0.74) + ' ' + (cx + 45) + ',' + (cy - ry - 14) + ' ' + (cx + 24) + ',' + (cy - ry * 0.82) + '" fill="' + ac + '" stroke="none"/>');
    } else if (cfg.horns === 'sprout') {
      for (var s = -1; s <= 1; s++) {
        svg.push('<polygon class="shard" points="' + (cx + s * 14 - 8) + ',' + (cy - ry * 0.86) + ' ' + (cx + s * 14 + 8) + ',' + (cy - ry * 0.86) + ' ' + (cx + s * 16) + ',' + (cy - ry - 14 - Math.abs(s) * -6) + '" fill="' + ac + '" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>');
      }
    }

    /* little triangle feet */
    svg.push('<polygon class="shard" points="' + (cx - 26) + ',' + (cy + ry * 0.94) + ' ' + (cx - 6) + ',' + (cy + ry * 0.94) + ' ' + (cx - 16) + ',' + (cy + ry + 16) + '" fill="' + hue.edge + '" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>');
    svg.push('<polygon class="shard" points="' + (cx + 6) + ',' + (cy + ry * 0.94) + ' ' + (cx + 26) + ',' + (cy + ry * 0.94) + ' ' + (cx + 16) + ',' + (cy + ry + 16) + '" fill="' + hue.edge + '" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>');

    /* face — smooth bits on purpose, cute contrast to the facets */
    svg.push('<g class="face">');
    if (cfg.eyes === 'googly') {
      svg.push('<g class="shard eye"><circle cx="' + (cx - 24) + '" cy="' + (cy - 16) + '" r="15" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>' +
               '<circle cx="' + (cx - 20) + '" cy="' + (cy - 14) + '" r="6.5" fill="#2B2118"/><circle cx="' + (cx - 17.5) + '" cy="' + (cy - 16.5) + '" r="2.2" fill="#FFFDF6"/></g>');
      svg.push('<g class="shard eye"><circle cx="' + (cx + 24) + '" cy="' + (cy - 13) + '" r="11" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>' +
               '<circle cx="' + (cx + 26.5) + '" cy="' + (cy - 11.5) + '" r="5" fill="#2B2118"/><circle cx="' + (cx + 28.5) + '" cy="' + (cy - 13.5) + '" r="1.8" fill="#FFFDF6"/></g>');
    } else if (cfg.eyes === 'twins') {
      for (var e2 = -1; e2 <= 1; e2 += 2) {
        svg.push('<g class="shard eye"><circle cx="' + (cx + e2 * 24) + '" cy="' + (cy - 15) + '" r="12.5" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.2"/>' +
                 '<circle cx="' + (cx + e2 * 24 + 2) + '" cy="' + (cy - 13) + '" r="5.5" fill="#2B2118"/><circle cx="' + (cx + e2 * 24 + 4) + '" cy="' + (cy - 15) + '" r="2" fill="#FFFDF6"/></g>');
      }
    } else { /* starry */
      for (var e3 = -1; e3 <= 1; e3 += 2) {
        var exx = cx + e3 * 24, eyy = cy - 15;
        svg.push('<g class="shard eye"><circle cx="' + exx + '" cy="' + eyy + '" r="13" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.2"/>' +
                 '<use href="#dstar" transform="translate(' + exx + ',' + eyy + ') scale(1.1)" fill="' + hue.accent + '" stroke="#2B2118" stroke-width="1.2"/></g>');
      }
    }
    svg.push('<polygon class="shard cheek" points="' + (cx - 42) + ',' + (cy + 8) + ' ' + (cx - 30) + ',' + (cy + 2) + ' ' + (cx - 33) + ',' + (cy + 15) + '" fill="#FF6B57" opacity=".5"/>');
    svg.push('<polygon class="shard cheek" points="' + (cx + 40) + ',' + (cy + 9) + ' ' + (cx + 30) + ',' + (cy + 2) + ' ' + (cx + 34) + ',' + (cy + 15) + '" fill="#FF6B57" opacity=".45"/>');
    svg.push('<path class="shard" d="M' + (cx - 10) + ' ' + (cy + 14) + ' Q' + cx + ' ' + (cy + 22) + ' ' + (cx + 12) + ' ' + (cy + 13) + '" stroke="#2B2118" stroke-width="3.5" fill="none" stroke-linecap="round"/>');
    svg.push('</g>');

    /* dizzy stars — orbiting until a fail gag calls them in */
    svg.push('<g class="dizzy" fill="#FFC53D" stroke="#2B2118" stroke-width="1.6">' +
      '<use href="#dstar" transform="translate(110,40)"/>' +
      '<use href="#dstar" transform="translate(68,18) scale(.8)"/>' +
      '<use href="#dstar" transform="translate(46,50) scale(.6)"/></g>');

    return '<svg class="herosvg" viewBox="0 0 ' + W + ' ' + H + '" aria-label="Pip, a crystal monster">' + svg.join('') + '</svg>';
  }

  function forgeHero() {
    heroWrap.innerHTML = buildHeroSVG(heroCfg, heroCfg.seed);
    heroSvg = heroWrap.querySelector('svg');
  }

  /* ================= Hoot, the faceted owl ================= */
  function buildOwlSVG() {
    var s = [];
    /* body: faceted hexagon */
    var body = [
      ['60,18 84,34 78,52 60,40', '#8A5E2E'],
      ['60,18 36,34 42,52 60,40', '#A9713C'],
      ['36,34 42,72 60,86 60,40', '#C08A4A'],
      ['84,34 78,72 60,86 60,40', '#8A5E2E'],
      ['42,72 60,86 78,72 60,58', '#E8C795']
    ];
    for (var i = 0; i < body.length; i++) {
      s.push('<polygon points="' + body[i][0] + '" fill="' + body[i][1] + '" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>');
    }
    /* ear tufts */
    s.push('<polygon points="40,26 32,4 54,16" fill="#8A5E2E" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>');
    s.push('<polygon points="80,26 88,4 66,16" fill="#8A5E2E" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>');
    /* wings */
    s.push('<polygon class="owlwing" points="36,38 14,52 38,66" fill="#6B4A2B" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>');
    s.push('<polygon class="owlwing" points="84,38 106,52 82,66" fill="#6B4A2B" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>');
    /* tail */
    s.push('<polygon points="52,84 60,98 68,84" fill="#6B4A2B" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>');
    /* eyes */
    s.push('<circle cx="48" cy="34" r="11" fill="#FFFDF6" stroke="#2B2118" stroke-width="2.5"/>');
    s.push('<circle cx="72" cy="34" r="11" fill="#FFFDF6" stroke="#2B2118" stroke-width="2.5"/>');
    s.push('<circle class="owlpup" cx="50" cy="36" r="4.5" fill="#2B2118"/>');
    s.push('<circle class="owlpup" cx="70" cy="36" r="4.5" fill="#2B2118"/>');
    s.push('<circle cx="51.5" cy="34.5" r="1.5" fill="#FFFDF6"/>');
    s.push('<circle cx="71.5" cy="34.5" r="1.5" fill="#FFFDF6"/>');
    /* beak */
    s.push('<polygon points="60,40 54,48 66,48" fill="#F5A623" stroke="#2B2118" stroke-width="2" stroke-linejoin="round"/>');
    return '<svg class="owlsvg" viewBox="0 0 120 108">' + s.join('') + '</svg>';
  }

  var OWL_PERCH = { left: 76, top: 10 };   // % of stage
  function owlPerch(instant) {
    if (instant) {
      owl.classList.add('notrans');
      owl.style.left = OWL_PERCH.left + '%';
      owl.style.top = OWL_PERCH.top + '%';
      void owl.offsetWidth;
      owl.classList.remove('notrans');
    } else {
      owl.style.left = OWL_PERCH.left + '%';
      owl.style.top = OWL_PERCH.top + '%';
    }
    owl.classList.remove('away');
  }
  function owlFliesAhead() {   /* glides off right — leads the way to the next area */
    sfxHoot();
    owl.classList.remove('notrans');
    owl.style.left = '112%';
    owl.style.top = '-16%';
    owl.classList.add('away');
  }
  function owlArrives() {      /* glides back in from the left to its new perch */
    owl.classList.add('notrans');
    owl.style.left = '-14%';
    owl.style.top = '-8%';
    void owl.offsetWidth;
    owl.classList.remove('notrans');
    owl.classList.remove('away');
    owl.style.left = OWL_PERCH.left + '%';
    owl.style.top = OWL_PERCH.top + '%';
    sfxHoot();
  }
  function owlRuffle() {
    owl.classList.remove('ruffle'); void owl.offsetWidth; owl.classList.add('ruffle');
  }

  /* ================= prop layer ================= */
  function heroCenterX() {
    var sr = stage.getBoundingClientRect();
    var pr = pip.getBoundingClientRect();
    return (pr.left - sr.left + pr.width * 0.5) / sr.width * 800;
  }

  /* spawn a world prop: svg fragment wrapped in a positioned group at (x,y),
     with an inner .pinner group so CSS transforms can animate the prop
     without clobbering its placement attribute. Each sub-shape pops in
     staggered — the "facets assemble" feel. */
  function spawnWorldProp(inner, x, y, cls) {
    var id = 'prop' + (++propSeq);
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
    g.setAttribute('class', 'prop ' + (cls || ''));
    g.id = id;
    g.innerHTML = '<g class="pinner">' + inner + '</g>';
    propsBack.appendChild(g);
    var shapes = g.querySelectorAll('polygon,path,circle,rect,ellipse,text');
    for (var i = 0; i < shapes.length; i++) {
      shapes[i].style.animationDelay = (i * 55) + 'ms';
      shapes[i].classList.add('tri-in');
    }
    sfxAssemble();
    return g;
  }

  function spawnHeldProp(inner, cls) {
    heldProp.innerHTML = '<svg viewBox="0 0 160 170" class="heldsvg ' + (cls || '') + '">' + inner + '</svg>';
    var shapes = heldProp.querySelectorAll('polygon,path,circle,rect,ellipse');
    for (var i = 0; i < shapes.length; i++) {
      shapes[i].style.animationDelay = (i * 55) + 'ms';
      shapes[i].classList.add('tri-in');
    }
    sfxAssemble();
  }

  /* ---------- prop artwork ---------- */
  var PROP_ART = {
    /* -- beat 1: things that cross a gap (drawn at gap x≈475,y≈380) -- */
    bridge: function () {
      var s = ['<polygon points="-92,20 -70,-14 70,-14 92,20" fill="#7FD6E8" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>'];
      for (var i = 0; i < 5; i++) {
        var x = -80 + i * 33;
        s.push('<polygon points="' + x + ',-12 ' + (x + 30) + ',-12 ' + (x + 26) + ',16 ' + (x - 4) + ',16" fill="' +
               shade('#9BE8F2', -i * 0.05) + '" stroke="#2B2118" stroke-width="2.5"/>');
      }
      s.push('<polygon points="-92,20 -70,-14 -66,16 -86,30" fill="#3FA7CE" stroke="#2B2118" stroke-width="3"/>');
      s.push('<polygon points="92,20 70,-14 66,16 86,30" fill="#3FA7CE" stroke="#2B2118" stroke-width="3"/>');
      s.push('<polygon points="-20,-12 8,-12 0,-40" fill="#A8DCF2" stroke="#2B2118" stroke-width="2.5"/>');
      s.push('<polygon points="30,-12 58,-12 44,-32" fill="#B7A8EA" stroke="#2B2118" stroke-width="2.5"/>');
      return s.join('');
    },
    log: function () {
      return '<polygon points="-84,-6 72,-14 78,8 -78,16" fill="#8A5E2E" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<polygon points="-84,-6 72,-14 70,-6 -80,2" fill="#A9713C" stroke="none"/>' +
             '<polygon points="72,-14 90,-6 92,4 78,8" fill="#D9B36C" stroke="#2B2118" stroke-width="3"/>' +
             '<polygon points="76,-10 86,-6 87,2 80,4" fill="#B98A44" stroke="#2B2118" stroke-width="2"/>' +
             '<polygon points="-40,-8 -34,-8 -30,12 -36,13" fill="#6B4A2B" stroke="none"/>' +
             '<polygon points="6,-11 12,-11 16,10 10,11" fill="#6B4A2B" stroke="none"/>';
    },
    vine: function () {
      var s = ['<path d="M0,-380 Q 18,-280 -6,-190 T 8,-60 Q 14,-10 0,10" fill="none" stroke="#2F7A48" stroke-width="7" stroke-linecap="round"/>'];
      for (var i = 0; i < 7; i++) {
        var ly = -330 + i * 52, lx = (i % 2 ? -14 : 12);
        s.push('<polygon points="0,' + ly + ' ' + (lx * 2.4) + ',' + (ly - 14) + ' ' + lx + ',' + (ly + 8) +
               '" fill="#4FB06D" stroke="#2B2118" stroke-width="2"/>');
      }
      s.push('<polygon points="0,10 -16,30 14,28" fill="#4FB06D" stroke="#2B2118" stroke-width="2.5"/>');
      return s.join('');
    },
    plank: function () {
      return '<polygon points="-92,-4 84,-12 90,2 -86,12" fill="#E8C795" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<polygon points="-92,-4 84,-12 82,-5 -88,3" fill="#F2D8AE" stroke="none"/>' +
             '<circle cx="-60" cy="0" r="2.6" fill="#2B2118"/><circle cx="60" cy="-4" r="2.6" fill="#2B2118"/>';
    },
    stones: function () {
      return '<polygon points="-58,4 -38,-14 -14,-6 -20,10 -50,12" fill="#9BD8E8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="-16,-8 8,-18 30,-8 22,8 -8,8" fill="#B7A8EA" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="38,-4 62,-14 78,-4 70,10 44,10" fill="#9BD8E8" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>';
    },
    leafboat: function () {
      return '<path d="M-70,-6 Q 0,26 70,-6 Q 30,10 0,10 Q -30,10 -70,-6 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<path d="M-70,-6 Q -20,-2 0,-2" fill="none" stroke="#2F7A48" stroke-width="3"/>' +
             '<polygon points="0,-2 4,-44 30,-10" fill="#7CC7A8" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>';
    },

    /* -- beat 2: head covers (held-prop layer, hero coords 0..160x170) -- */
    umbrella: function () {
      var s = ['<path d="M16,44 Q 80,-24 144,44 Q 116,30 98,40 Q 80,26 62,40 Q 44,30 16,44 Z" fill="#FF6B57" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>'];
      var cols = ['#FF6B57', '#FFC53D', '#FF8FB5', '#FFC53D'];
      for (var i = 0; i < 4; i++) {
        var x0 = 16 + i * 32;
        s.push('<polygon points="' + x0 + ',44 ' + (x0 + 32) + ',44 80,8" fill="' + cols[i] + '" opacity=".85" stroke="#2B2118" stroke-width="1.5"/>');
      }
      s.push('<path d="M80,8 L80,74" stroke="#2B2118" stroke-width="4" stroke-linecap="round"/>');
      s.push('<path d="M80,74 q0,10 -10,10" fill="none" stroke="#2B2118" stroke-width="4" stroke-linecap="round"/>');
      return s.join('');
    },
    leafbrelly: function () {
      return '<path d="M24,52 Q 80,-16 138,46 Q 84,58 24,52 Z" fill="#4FB06D" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<polygon points="42,48 80,2 74,44" fill="#7CC7A8" stroke="none"/>' +
             '<path d="M138,46 Q 148,50 146,58" fill="none" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/>' +
             '<path d="M80,40 L80,80" stroke="#2F7A48" stroke-width="4" stroke-linecap="round"/>';
    },
    hat: function () {
      return '<polygon points="34,34 126,34 116,44 44,44" fill="#5DA9E9" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="52,34 108,34 98,-2 62,-2" fill="#5DA9E9" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="52,34 80,34 76,-2 62,-2" fill="#8FC6F2" stroke="none"/>' +
             '<polygon points="44,16 116,16 112,24 48,24" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/>';
    },
    newspaper: function () {
      return '<polygon points="30,20 130,30 118,52 22,44" fill="#FFFDF6" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<path d="M36,26 L114,34 M34,32 L108,40 M32,38 L92,44" stroke="#B9A98F" stroke-width="2.5" fill="none"/>' +
             '<polygon points="96,26 128,29 124,38 94,35" fill="#D9C4A3" stroke="#2B2118" stroke-width="1.5"/>';
    },
    shroom: function () {
      return '<path d="M30,44 Q 40,0 80,-4 Q 122,0 130,44 Q 80,34 30,44 Z" fill="#F2604F" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<circle cx="58" cy="18" r="7" fill="#FFFDF6"/><circle cx="92" cy="12" r="5.5" fill="#FFFDF6"/><circle cx="104" cy="30" r="6" fill="#FFFDF6"/>' +
             '<path d="M74,44 L70,84 L88,84 L86,44" fill="#F2D8AE" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>';
    },

    /* -- beat 3: rideables (own layer, viewBox 0 0 240 150) -- */
    boat: function () {
      return '<path d="M16,74 L224,74 L196,118 L44,118 Z" fill="#3FA7CE" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>' +
             '<polygon points="16,74 120,74 120,118 44,118" fill="#6FC6E8" stroke="none"/>' +
             '<path d="M120,74 L120,16" stroke="#2B2118" stroke-width="5" stroke-linecap="round"/>' +
             '<polygon points="126,20 126,68 184,64" fill="#FFFDF6" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="114,20 114,68 66,64" fill="#B7A8EA" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="114,20 120,10 126,20" fill="#FFC53D" stroke="#2B2118" stroke-width="2.5"/>';
    },
    raft: function () {
      var s = [];
      for (var i = 0; i < 5; i++) {
        s.push('<polygon points="' + (40 + i * 32) + ',78 ' + (68 + i * 32) + ',78 ' + (70 + i * 32) + ',108 ' + (42 + i * 32) + ',108" fill="' +
               (i % 2 ? '#A9713C' : '#C08A4A') + '" stroke="#2B2118" stroke-width="3"/>');
      }
      s.push('<path d="M36,86 L206,86 M38,102 L204,102" stroke="#6B4A2B" stroke-width="4"/>');
      return s.join('');
    },
    duck: function () {
      return '<path d="M40,96 Q 30,58 78,52 Q 120,46 150,62 L150,44 Q 176,28 196,40 Q 214,50 200,66 L214,74 Q 200,82 178,80 Q 186,104 150,112 Q 70,124 40,96 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>' +
             '<polygon points="96,70 146,64 134,92 84,94" fill="#F0A83B" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<circle cx="182" cy="48" r="5" fill="#2B2118"/>' +
             '<polygon points="200,50 226,54 202,62" fill="#FF8A4F" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>';
    },
    fish: function () {
      return '<path d="M30,84 Q 90,38 176,70 L214,46 L206,84 L218,116 L172,98 Q 92,124 30,84 Z" fill="#5DA9E9" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>' +
             '<polygon points="60,78 110,62 140,80 96,96" fill="#8FC6F2" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<polygon points="120,56 148,42 152,62" fill="#3D6FA3" stroke="#2B2118" stroke-width="2.5"/>' +
             '<circle cx="56" cy="76" r="6" fill="#2B2118"/><circle cx="58" cy="74" r="2" fill="#FFFDF6"/>' +
             '<path d="M40,92 q8,6 16,2" fill="none" stroke="#2B2118" stroke-width="2.5" stroke-linecap="round"/>';
    },
    unicorn: function () {
      /* the crystal unicorn — lilac facets, sun-yellow crystal horn */
      return '<path d="M52,108 L58,66 Q 60,44 96,42 L168,42 Q 196,44 196,72 L200,100 L188,102 L184,76 L90,78 L84,110 Z" fill="#D9C9F2" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>' +
             '<polygon points="96,42 168,42 160,78 90,78" fill="#C3AEE8" stroke="none"/>' +
             '<polygon points="100,44 128,44 112,76 92,76" fill="#E7DBF7" stroke="none"/>' +
             '<path d="M168,44 Q 176,18 206,14 L226,20 Q 232,34 216,44 L196,56" fill="#D9C9F2" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>' +
             '<polygon points="206,14 216,-2 222,18" fill="#FFC53D" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="184,26 172,6 196,18" fill="#B7A8EA" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<circle cx="206" cy="30" r="4.5" fill="#2B2118"/>' +
             '<polygon points="222,28 236,32 224,38" fill="#C3AEE8" stroke="#2B2118" stroke-width="2.5"/>' +
             '<path d="M52,108 L52,132 M74,110 L74,132 M182,104 L182,132 M198,100 L198,130" stroke="#2B2118" stroke-width="7" stroke-linecap="round"/>' +
             '<path d="M52,108 L52,132 M74,110 L74,132 M182,104 L182,132 M198,100 L198,130" stroke="#B7A8EA" stroke-width="3.5" stroke-linecap="round"/>' +
             '<path d="M52,66 Q 30,64 26,88 Q 40,84 46,74" fill="#B7A8EA" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<use href="#dstar" transform="translate(120,58) scale(1.2)" fill="#FFC53D" stroke="#2B2118" stroke-width="1.5"/>' +
             '<use href="#dstar" transform="translate(148,66) scale(.9)" fill="#FF8FB5" stroke="#2B2118" stroke-width="1.2"/>';
    },

    /* -- beat 4: light sources (held-prop layer) -- */
    lantern: function () {
      return '<path d="M80,26 L80,34" stroke="#2B2118" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M62,44 Q 80,28 98,44" fill="none" stroke="#2B2118" stroke-width="4"/>' +
             '<polygon points="60,44 100,44 104,88 56,88" fill="#8A5E2E" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<polygon points="80,50 94,64 90,84 70,84 66,64" fill="#FFE9A8" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<polygon points="80,50 94,64 80,72 66,64" fill="#FFF6D8" stroke="none"/>' +
             '<polygon points="56,88 104,88 100,96 60,96" fill="#6B4A2B" stroke="#2B2118" stroke-width="3"/>';
    },
    torch: function () {
      return '<path d="M80,46 L80,96" stroke="#8A5E2E" stroke-width="8" stroke-linecap="round"/>' +
             '<path d="M80,46 L80,96" stroke="#A9713C" stroke-width="3" stroke-linecap="round"/>' +
             '<polygon points="80,14 96,34 88,50 72,50 64,34" fill="#FF8A3D" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="80,24 88,36 84,46 76,46 72,36" fill="#FFC53D" stroke="none"/>' +
             '<polygon points="80,4 86,18 74,18" fill="#FF6B57" stroke="#2B2118" stroke-width="2"/>';
    },
    fireflies: function () {
      var s = [];
      var spots = [[30, 40], [60, 22], [102, 30], [128, 52], [44, 66], [96, 62]];
      for (var i = 0; i < spots.length; i++) {
        s.push('<circle class="ffglow" cx="' + spots[i][0] + '" cy="' + spots[i][1] + '" r="10" fill="#FFE9A8" opacity=".35"/>');
        s.push('<polygon class="ff" points="' + spots[i][0] + ',' + (spots[i][1] - 5) + ' ' + (spots[i][0] + 5) + ',' + (spots[i][1] + 4) + ' ' + (spots[i][0] - 5) + ',' + (spots[i][1] + 4) +
               '" fill="#FFC53D" stroke="#2B2118" stroke-width="1.5"/>');
      }
      return s.join('');
    },
    candle: function () {
      return '<rect x="70" y="52" width="20" height="40" rx="4" fill="#FFFDF6" stroke="#2B2118" stroke-width="3"/>' +
             '<polygon points="70,62 80,58 80,72 70,74" fill="#F2D8AE" stroke="none"/>' +
             '<path d="M80,52 L80,44" stroke="#2B2118" stroke-width="3"/>' +
             '<polygon points="80,26 90,40 84,50 76,50 70,40" fill="#FFC53D" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>' +
             '<polygon points="80,34 85,42 81,47 76,44" fill="#FF8A3D" stroke="none"/>';
    },
    glowgem: function () {
      return '<polygon points="80,28 102,50 94,86 66,86 58,50" fill="#9BE8C9" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<path d="M58,50 L102,50 M80,28 L72,50 80,86 M80,28 L88,50 80,86" stroke="#2B2118" stroke-width="2" fill="none" opacity=".5"/>' +
             '<polygon points="68,38 78,32 74,44" fill="#FFFDF6" opacity=".8" stroke="none"/>';
    },

    /* -- silly props (world layer, drawn at their spot) -- */
    peel: function () {
      return '<path d="M0,0 Q -6,-22 -2,-34" fill="none" stroke="#2B2118" stroke-width="5" stroke-linecap="round"/>' +
             '<polygon points="0,0 -34,16 -44,6 -8,-6" fill="#FFC53D" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="0,0 34,16 44,6 8,-6" fill="#F0A83B" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="0,0 -8,26 8,26" fill="#FFE08A" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>';
    },
    anvil: function () {
      return '<polygon points="-44,-8 44,-8 30,4 -30,4" fill="#5A6472" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<polygon points="-30,4 30,4 22,26 -22,26" fill="#3E4652" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="-34,26 34,26 40,40 -40,40" fill="#5A6472" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="30,-8 58,-16 44,-8" fill="#5A6472" stroke="#2B2118" stroke-width="3"/>' +
             '<polygon points="-44,-8 -60,-14 -44,-2" fill="#5A6472" stroke="#2B2118" stroke-width="3"/>' +
             '<polygon points="-30,-6 -8,-6 -14,2 -34,2" fill="#8A94A2" stroke="none"/>';
    },
    piano: function () {
      var s = ['<polygon points="-70,-30 70,-30 70,26 -70,26" fill="#3E4652" stroke="#2B2118" stroke-width="4" stroke-linejoin="round"/>',
               '<polygon points="-70,-30 0,-30 -8,26 -70,26" fill="#5A6472" stroke="none"/>',
               '<rect x="-62" y="6" width="124" height="16" fill="#FFFDF6" stroke="#2B2118" stroke-width="2.5"/>'];
      for (var i = 0; i < 9; i++) {
        s.push('<rect x="' + (-54 + i * 13) + '" y="6" width="6" height="10" fill="#2B2118"/>');
      }
      s.push('<polygon points="-64,-30 -46,-46 -30,-30" fill="#3E4652" stroke="#2B2118" stroke-width="3"/>');
      return s.join('');
    },
    homework: function () {
      return '<polygon points="-34,-20 30,-28 38,12 -26,20" fill="#FFFDF6" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<path d="M-26,-8 L20,-14 M-24,-1 L26,-7 M-22,6 L22,0" stroke="#B9A98F" stroke-width="2" fill="none"/>' +
             '<polygon points="8,-32 40,-38 42,-30 10,-24" fill="#FF6B57" stroke="#2B2118" stroke-width="2"/>' +
             '<polygon points="40,-38 48,-40 44,-31" fill="#F2D8AE" stroke="#2B2118" stroke-width="2"/>';
    },
    toaster: function () {
      return '<rect x="-40" y="-26" width="80" height="52" rx="10" fill="#C7CCD4" stroke="#2B2118" stroke-width="3.5"/>' +
             '<rect x="-26" y="-34" width="18" height="10" rx="4" fill="#2B2118"/>' +
             '<rect x="8" y="-34" width="18" height="10" rx="4" fill="#2B2118"/>' +
             '<polygon points="-40,-6 0,-6 -8,26 -40,26" fill="#E8ECF2" stroke="none"/>' +
             '<circle cx="28" cy="12" r="6" fill="#FF6B57" stroke="#2B2118" stroke-width="2.5"/>' +
             '<polygon points="-18,-44 -8,-36 -26,-34" fill="#F2D8AE" stroke="#2B2118" stroke-width="2"/>' +
             '<polygon points="14,-46 26,-38 10,-35" fill="#F2D8AE" stroke="#2B2118" stroke-width="2"/>';
    },
    fridge: function () {
      return '<rect x="-34" y="-64" width="68" height="104" rx="8" fill="#BEE3CE" stroke="#2B2118" stroke-width="4"/>' +
             '<path d="M-34,-24 L34,-24" stroke="#2B2118" stroke-width="3"/>' +
             '<rect x="22" y="-52" width="6" height="18" rx="3" fill="#2B2118"/>' +
             '<rect x="22" y="-16" width="6" height="30" rx="3" fill="#2B2118"/>' +
             '<polygon points="-34,-64 0,-64 -12,40 -34,40" fill="#DDF3E4" stroke="none"/>' +
             '<use href="#dstar" transform="translate(-12,-44) scale(1.2)" fill="#FF8FB5" stroke="#2B2118" stroke-width="1.5"/>';
    },
    toilet: function () {
      return '<rect x="-8" y="-58" width="42" height="34" rx="6" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>' +
             '<path d="M-30,-10 Q -30,-30 0,-30 L30,-30 Q 34,-8 22,2 L-14,2 Q -30,0 -30,-10 Z" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5"/>' +
             '<ellipse cx="4" cy="-18" rx="18" ry="7" fill="#A8DCF2" stroke="#2B2118" stroke-width="2.5"/>' +
             '<path d="M-14,2 L-18,38 L18,38 L14,2" fill="#EAF0F6" stroke="#2B2118" stroke-width="3"/>' +
             '<rect x="24" y="-52" width="8" height="8" rx="2" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/>';
    },
    undies: function () {
      return '<path d="M-34,-16 L34,-16 L30,6 Q 14,26 0,10 Q -14,26 -30,6 Z" fill="#FFFDF6" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<path d="M-34,-16 L34,-16" stroke="#FF6B57" stroke-width="6"/>' +
             '<circle cx="-8" cy="-4" r="3.5" fill="#FF8FB5"/><circle cx="10" cy="-2" r="3.5" fill="#FF8FB5"/><circle cx="0" cy="8" r="3.5" fill="#FF8FB5"/>';
    },
    window: function () {
      return '<rect x="-34" y="-34" width="68" height="68" rx="6" fill="#A8DCF2" stroke="#2B2118" stroke-width="4"/>' +
             '<path d="M0,-34 L0,34 M-34,0 L34,0" stroke="#2B2118" stroke-width="3"/>' +
             '<polygon points="-34,-34 0,-34 -18,0 -34,0" fill="#D8F0FA" stroke="none"/>' +
             '<path d="M-14,10 L-4,-6 M2,16 L14,-2" stroke="#FFFDF6" stroke-width="3" stroke-linecap="round"/>';
    },

    /* -- beat 2 silly headgear (held layer) -- */
    bag: function () {
      return '<path d="M44,52 L44,10 Q 46,-6 80,-6 Q 116,-6 116,12 L114,54 Q 80,64 44,52 Z" fill="#C9A877" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<path d="M44,10 Q 60,22 80,20 M116,12 Q 100,24 80,20" fill="none" stroke="#A8845C" stroke-width="2.5"/>' +
             '<path d="M52,56 Q 60,70 56,84" fill="none" stroke="#A8845C" stroke-width="3" stroke-linecap="round"/>' +
             '<path d="M104,58 Q 110,74 104,88" fill="none" stroke="#A8845C" stroke-width="3" stroke-linecap="round"/>';
    },
    toast: function () {
      return '<path d="M50,44 L50,16 Q 50,2 66,4 Q 80,-8 96,4 Q 112,2 110,16 L110,46 Q 80,54 50,44 Z" fill="#E8C795" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<path d="M58,40 L58,18 Q 58,10 68,10 Q 80,0 92,10 Q 102,10 102,18 L102,40" fill="#C08A4A" stroke="#2B2118" stroke-width="2.5"/>' +
             '<path d="M60,50 Q 58,62 64,68 M100,50 Q 104,60 98,68" fill="none" stroke="#A8845C" stroke-width="3" stroke-linecap="round"/>';
    },
    sieve: function () {
      var s = ['<path d="M30,44 Q 80,-14 130,44 Q 80,56 30,44 Z" fill="#C7CCD4" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>'];
      for (var i = 0; i < 7; i++) {
        var hx = 44 + i * 12;
        s.push('<circle cx="' + hx + '" cy="' + (34 + (i % 2) * 6) + '" r="3" fill="#3E4652"/>');
      }
      s.push('<path d="M130,44 L152,54" stroke="#2B2118" stroke-width="5" stroke-linecap="round"/>');
      for (i = 0; i < 4; i++) {
        s.push('<path class="drip" d="M' + (52 + i * 16) + ',50 l0,18" stroke="#5DA9E9" stroke-width="3" stroke-linecap="round"/>');
      }
      return s.join('');
    },
    noodle: function () {
      return '<ellipse cx="80" cy="30" rx="46" ry="14" fill="#FFE08A" stroke="#2B2118" stroke-width="3"/>' +
             '<path d="M48,34 q-4,20 4,34 M66,40 q-6,22 2,38 M84,42 q-4,20 4,34 M104,40 q-2,18 4,30 M118,34 q0,16 6,26" fill="none" stroke="#F0C060" stroke-width="5" stroke-linecap="round"/>' +
             '<circle cx="80" cy="26" r="8" fill="#C0452F" stroke="#2B2118" stroke-width="2.5"/>' +
             '<circle cx="60" cy="30" r="6" fill="#C0452F" stroke="#2B2118" stroke-width="2.5"/>' +
             '<circle cx="100" cy="30" r="6" fill="#C0452F" stroke="#2B2118" stroke-width="2.5"/>';
    },

    /* -- beat 4 silly hand props (held layer) -- */
    match: function () {
      return '<path d="M64,84 L96,44" stroke="#E8C795" stroke-width="7" stroke-linecap="round"/>' +
             '<circle cx="98" cy="42" r="8" fill="#C0452F" stroke="#2B2118" stroke-width="2.5"/>' +
             '<path class="fizz" d="M98,30 q6,-8 0,-16 q-6,-8 0,-16" fill="none" stroke="#B9A98F" stroke-width="3" stroke-linecap="round"/>' +
             '<circle class="fizz" cx="108" cy="26" r="4" fill="#B9A98F" opacity=".7"/>' +
             '<circle class="fizz" cx="90" cy="18" r="3" fill="#B9A98F" opacity=".6"/>';
    },
    banana: function () {
      return '<path d="M54,66 Q 60,34 96,30 Q 108,30 104,42 Q 78,44 72,70 Q 60,76 54,66 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<path d="M58,62 Q 66,42 96,36" fill="none" stroke="#F0A83B" stroke-width="3"/>' +
             '<polygon points="102,36 108,32 104,42" fill="#6B4A2B" stroke="#2B2118" stroke-width="2"/>';
    },
    sock: function () {
      return '<path d="M64,34 L92,34 L92,58 Q 108,66 104,80 Q 96,92 80,86 Q 66,80 64,64 Z" fill="#B565D8" stroke="#2B2118" stroke-width="3.5" stroke-linejoin="round"/>' +
             '<path d="M64,34 L92,34 L92,44 L64,44" fill="#8A4FB0" stroke="none"/>' +
             '<path d="M64,50 L92,50 M64,60 L90,60" stroke="#8A4FB0" stroke-width="3"/>' +
             '<path class="fizz" d="M110,40 q6,-8 0,-16 M118,52 q6,-8 0,-16" fill="none" stroke="#7DAF62" stroke-width="3" stroke-linecap="round"/>';
    },
    sponge: function () {
      return '<rect x="52" y="34" width="58" height="40" rx="10" fill="#FFC53D" stroke="#2B2118" stroke-width="3.5"/>' +
             '<circle cx="66" cy="46" r="4" fill="#D9A020"/><circle cx="86" cy="54" r="5" fill="#D9A020"/><circle cx="98" cy="42" r="3.5" fill="#D9A020"/><circle cx="74" cy="64" r="3.5" fill="#D9A020"/>' +
             '<path d="M52,44 L110,44" stroke="#F0A83B" stroke-width="2"/>';
    },

    /* -- beat 5 (doorstep props, world layer) -- */
    door: function () {
      return '<g class="doorhinge">' +
             '<rect x="0" y="-78" width="46" height="78" rx="4" fill="#8A5E2E" stroke="#2B2118" stroke-width="3.5"/>' +
             '<rect x="6" y="-70" width="34" height="30" rx="3" fill="#A9713C" stroke="#2B2118" stroke-width="2"/>' +
             '<rect x="6" y="-34" width="34" height="30" rx="3" fill="#A9713C" stroke="#2B2118" stroke-width="2"/>' +
             '<circle cx="36" cy="-38" r="4" fill="#FFC53D" stroke="#2B2118" stroke-width="2"/></g>';
    },
    key: function () {
      return '<circle cx="-24" cy="-4" r="16" fill="none" stroke="#FFC53D" stroke-width="8"/>' +
             '<circle cx="-24" cy="-4" r="16" fill="none" stroke="#2B2118" stroke-width="2" opacity=".6"/>' +
             '<path d="M-10,-4 L44,-4" stroke="#FFC53D" stroke-width="9" stroke-linecap="round"/>' +
             '<path d="M28,-4 L28,10 M40,-4 L40,14" stroke="#FFC53D" stroke-width="8" stroke-linecap="round"/>' +
             '<path d="M-10,-4 L44,-4 M28,-4 L28,10 M40,-4 L40,14" stroke="#2B2118" stroke-width="2" fill="none" opacity=".5"/>' +
             '<use href="#dstar" transform="translate(-24,-28) scale(.9)" fill="#FFF6D8" stroke="#2B2118" stroke-width="1.2"/>';
    },
    cookiejar: function () {
      return '<path d="M-34,-20 L34,-20 L40,22 Q 40,38 0,38 Q -40,38 -40,22 Z" fill="#A8DCF2" stroke="#2B2118" stroke-width="3.5" opacity=".85"/>' +
             '<ellipse cx="0" cy="-22" rx="36" ry="10" fill="#5DA9E9" stroke="#2B2118" stroke-width="3"/>' +
             '<circle cx="0" cy="-38" r="8" fill="#FFC53D" stroke="#2B2118" stroke-width="2.5"/>' +
             '<circle cx="-12" cy="8" r="10" fill="#C08A4A" stroke="#2B2118" stroke-width="2.5"/>' +
             '<circle cx="12" cy="16" r="9" fill="#C08A4A" stroke="#2B2118" stroke-width="2.5"/>' +
             '<circle cx="-15" cy="6" r="1.8" fill="#2B2118"/><circle cx="-9" cy="12" r="1.8" fill="#2B2118"/><circle cx="12" cy="14" r="1.8" fill="#2B2118"/><circle cx="16" cy="19" r="1.8" fill="#2B2118"/>' +
             '<polygon points="-30,-14 -10,-14 -16,30 -32,28" fill="#FFFDF6" opacity=".5" stroke="none"/>';
    },
    chunk: function () {   // wildcard prop for unknown-but-wordy words
      return '<polygon points="-20,8 -8,-16 14,-10 22,10 0,18" fill="#B7A8EA" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>' +
             '<polygon points="-8,-16 14,-10 4,2" fill="#D9C9F2" stroke="none"/>' +
             '<polygon points="-20,8 0,18 -6,4" fill="#8A6FC2" stroke="none"/>';
    }
  };

  /* where each silly spot lives in world coords */
  function sillySpotXY(spot) {
    var hx = heroCenterX();
    if (spot === 'feet')  return [hx + 60, 366];
    if (spot === 'gap')   return [475, 380];
    if (spot === 'water') return [430, 372];
    if (spot === 'door')  return [660, 372];
    return [hx, 366];
  }

  /* ================= confetti / debris ================= */
  var CONF_COLORS = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  function burst(x, y, n, spread, colors) {
    var cs = colors || CONF_COLORS;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      var ang = Math.random() * Math.PI * 2;
      var d = (spread || 70) * (0.45 + Math.random() * 0.8);
      var size = 6 + Math.random() * 8;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.background = cs[i % cs.length];
      p.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * d - 30) + 'px');
      p.style.setProperty('--rot', (Math.random() * 340 - 170) + 'deg');
      confetti.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 950); })(p);
    }
  }
  function pipCenter() {
    var pr = pip.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return [pr.left - sr.left + pr.width / 2, pr.top - sr.top + pr.height * 0.45];
  }
  function burstAtPip(n, spread, colors) {
    var pc = pipCenter();
    burst(pc[0], pc[1], n, spread, colors);
  }

  /* ================= guide + cheer ================= */
  function showGuide(text, ms, who) {
    guideName.textContent = who || 'Pip';
    guideText.textContent = text;
    guide.classList.add('show');
    clearTimeout(guideTimer);
    guideTimer = setTimeout(hideGuide, ms || 3000);
  }
  function hideGuide() { guide.classList.remove('show'); }
  function popCheer(text) {
    cheer.textContent = text;
    cheer.classList.remove('pop');
    void cheer.offsetWidth;
    cheer.classList.add('pop');
  }

  /* ================= gag machinery ================= */
  function gag(cls, ms, then) {
    pip.classList.add(cls);
    after(ms, function () {
      pip.classList.remove(cls);
      if (then) then();
    });
  }
  function dizzy(on) {
    if (!heroSvg) return;
    var d = heroSvg.querySelector('.dizzy');
    if (d) d.classList.toggle('on', on);
  }
  function clearShards() {
    if (!heroSvg) return;
    heroSvg.classList.remove('reform');
    Array.prototype.forEach.call(heroSvg.querySelectorAll('.shard'), function (s) {
      s.style.transform = '';
      s.style.opacity = '';
    });
  }

  /* -- THE signature gag: the crystal hero shatters into its own triangles -- */
  function shatterHero(then) {
    if (!heroSvg) { then(); return; }
    var shards = heroSvg.querySelectorAll('.shard');
    sfxShatter();
    dizzy(true);
    owlRuffle();
    Array.prototype.forEach.call(shards, function (s) {
      var ang = Math.random() * Math.PI * 2;
      var dist = 34 + Math.random() * 80;
      var dx = Math.cos(ang) * dist;
      var dy = Math.sin(ang) * dist + 18;
      var rot = (Math.random() - 0.5) * 340;
      s.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + rot.toFixed(0) + 'deg)';
      s.style.opacity = '0.15';
    });
    var hue = HUES[heroCfg.hue];
    burstAtPip(10, 80, [hue.light, hue.dark, hue.edge, '#FFFDF6']);

    after(780, function () {
      heroSvg.classList.add('reform');          // springy trip back to whole
      Array.prototype.forEach.call(shards, function (s) {
        s.style.transform = '';
        s.style.opacity = '1';
      });
      after(640, function () {
        dizzy(false);
        heroSvg.classList.remove('reform');
        gag('gag-dustoff', 560, then);
      });
    });
  }

  /* ================= beat / area plumbing ================= */
  function setArea(areaIdx) {
    buildBackdrop(Math.floor(Math.random() * 1e9), areaIdx);
    propsBack.innerHTML = '';
    ride.innerHTML = '';
    ride.className = 'ride';
    ride.style.left = '';
    heldProp.innerHTML = '';
    pip.classList.remove('riding', 'entering', 'ridingmove', 'swingy');
    pip.style.bottom = '';
  }

  function setSentence(i) {
    var b = BEATS[i];
    sentenceEl.querySelector('.spre').textContent = b.pre;
    sentenceEl.querySelector('.spost').textContent = b.post ? ' ' + b.post : '';
    blankEl.className = 'blank';
    blankEl.innerHTML = '<i>&nbsp;</i>';
    wordInput.value = '';
    hideSuggest();
    beatChip.textContent = 'Beat ' + (i + 1) + ' of ' + BEATS.length;
    renderIdeas(i);
  }

  function renderIdeas(i) {
    ideasEl.innerHTML = '';
    BEATS[i].ideas.forEach(function (pair) {
      var w = pair[0], tricky = pair[1];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'idea' + (tricky ? ' tricky' : '');
      b.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 0 L14 14 L0 14 Z" fill="' +
        (tricky ? '#FF6B57' : '#B9A98F') + '" stroke="#2B2118" stroke-width="1.4" stroke-linejoin="round"' +
        (tricky ? '' : ' opacity=".6"') + '/></svg>' + esc(w);
      b.addEventListener('click', function () {
        if (auto.on) stopAuto();
        if (state !== 'playing') return;
        wordInput.value = w;
        wordInput.dispatchEvent(new Event('input'));
        submitWord();
      });
      ideasEl.appendChild(b);
    });
  }

  /* ---- travel: owl leads, Pip marches off, the world re-triangulates ---- */
  function travelTo(nextBeat, done) {
    state = 'travel';
    hideSuggest();
    owlFliesAhead();
    pip.classList.add('walking');
    pip.style.left = '94%';
    if (ride.innerHTML) ride.style.left = '96%';   /* rideable exits too */
    after(850, function () {
      stage.classList.add('shifting');
      after(280, function () {
        setArea(BEATS[nextBeat].area);
        pip.classList.add('notrans');
        pip.style.left = '-16%';
        void pip.offsetWidth;
        pip.classList.remove('notrans');
        after(120, function () {
          stage.classList.remove('shifting');
          pip.style.left = HERO_LEFT + '%';
          owlArrives();
          after(900, function () {
            pip.classList.remove('walking');
            bi = nextBeat;
            setSentence(bi);
            showGuide(BEATS[bi].guide, 3600);
            state = 'playing';
            focusInput();
            if (done) done();
          });
        });
      });
    });
  }

  /* ================= success acts ================= */
  function walkOff(then) {
    pip.classList.add('walking');
    pip.style.left = '76%';
    after(1150, function () {
      pip.classList.remove('walking');
      then();
    });
  }

  var ACTS = {
    /* beat 1 — prop spans the crack, Pip crosses over it */
    cross: function (entry, w) {
      var vine = entry.prop === 'vine';
      spawnWorldProp(PROP_ART[entry.prop](), 475, 380, 'at-gap' + (vine ? ' vine-prop' : ''));
      if (vine) pip.classList.add('swingy');
      after(650, function () {
        sfxHop();
        pip.classList.add('walking');
        pip.style.left = '76%';
        after(1250, function () {
          pip.classList.remove('walking', 'swingy');
          popCheer(entry.line);
          burstAtPip(8, 55);
          after(500, function () { travelTo(bi + 1); });
        });
      });
    },
    /* beat 2 — cover appears over Pip's head, rain beads off it */
    cover: function (entry, w) {
      spawnHeldProp(PROP_ART[entry.prop](), 'coverprop');
      sfxHop();
      gag('gag-hop', 720);
      after(950, function () {
        popCheer(entry.line);
        burstAtPip(8, 55);
        after(500, function () { walkOff(function () { travelTo(bi + 1); }); });
      });
    },
    /* beat 3 — rideable appears, Pip mounts and glides across the water */
    ride: function (entry, w) {
      var isUnicorn = entry.prop === 'unicorn';
      ride.innerHTML = '<svg viewBox="0 0 240 150" class="ridesvg">' + PROP_ART[entry.prop]() + '</svg>';
      ride.className = 'ride show' + (isUnicorn ? ' unicorn' : '');
      ride.style.left = (isUnicorn ? '24%' : '30%');   /* unicorn waits on the bank */
      var shapes = ride.querySelectorAll('polygon,path,circle,rect,ellipse,use');
      for (var i = 0; i < shapes.length; i++) {
        shapes[i].style.animationDelay = (i * 45) + 'ms';
        shapes[i].classList.add('tri-in');
      }
      sfxAssemble();
      if (isUnicorn) sfxGlow();
      /* Pip hops aboard */
      after(700, function () {
        pip.classList.add('walking');
        pip.style.left = '36%';
        after(950, function () {
          pip.classList.remove('walking');
          pip.classList.add('riding');
          gag('gag-hop', 700);
          popCheer(entry.line);
          after(700, function () {
            /* ride across together — ride and hero share the same glide */
            ride.classList.add('gliding');
            ride.style.left = '66%';
            pip.classList.add('ridingmove');
            pip.style.left = '78%';
            after(1700, function () { travelTo(bi + 1); });
          });
        });
      });
    },
    /* beat 4 — light source glows, the cave reveals its gems */
    light: function (entry, w) {
      /* held out to the side like a lantern arm */
      spawnHeldProp('<g transform="translate(38,4)">' + PROP_ART[entry.prop]() + '</g>', 'lightprop');
      sfxGlow();
      /* warm glow disc behind Pip + the embedded gems wake up */
      var hx = heroCenterX();
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML = '<defs><radialGradient id="lampg"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".8"/><stop offset=".6" stop-color="#FFE9A8" stop-opacity=".28"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>' +
                    '<circle class="glowc" cx="' + hx.toFixed(0) + '" cy="300" r="270" fill="url(#lampg)"/>';
      propsBack.appendChild(g);
      after(250, function () {
        caveDark.classList.remove('on');
        var gems = backdrop.querySelector('#litgems');
        if (gems) gems.setAttribute('opacity', '1');
      });
      gag('gag-hop', 720);
      after(1100, function () {
        popCheer(entry.line);
        burstAtPip(8, 55, ['#FFE9A8', '#FFC53D', '#FFFDF6']);
        after(600, function () { walkOff(function () { travelTo(bi + 1); }); });
      });
    },
    /* beat 5 — the door opens and Pip goes home */
    enter: function (entry, w) {
      sfxDoor();
      if (entry.prop === 'key') {
        /* a crystal key flips into the lock and turns */
        var kg = spawnWorldProp(PROP_ART.key(), 700, 330, 'keyfly');
        after(750, function () {
          kg.querySelector('.pinner').classList.add('twist');
          sfxDoor();
          after(700, function () { openDoorAndEnter(entry); });
        });
      } else if (entry.prop === 'cookiejar') {
        spawnWorldProp(PROP_ART.cookiejar(), 560, 360, '');
        after(700, function () {
          gag('gag-hop', 700);
          popCheer('Mmm, crystal crunchies!');
          after(900, function () { openDoorAndEnter(entry); });
        });
      } else {
        openDoorAndEnter(entry);
      }
    }
  };

  function openDoorAndEnter(entry) {
    /* the panel swings on its hinge over the dark doorway */
    var dg = spawnWorldProp(PROP_ART.door(), 714, 372, 'dooropen');
    after(120, function () {
      dg.querySelector('.doorhinge').classList.add('swing');
    });
    sfxDoor();
    after(400, function () {
      popCheer(entry.line);
      pip.classList.add('walking');
      pip.style.left = '82%';   /* right up to the doorway */
      after(1100, function () {
        pip.classList.remove('walking');
        pip.classList.add('entering');      // shrinks through the doorway
        after(700, function () { finishChapter(); });
      });
    });
  }

  /* ================= silly gag pipeline ================= */
  function sillyFail(entry, w) {
    /* the silly prop REALLY spawns — that's the whole joke */
    var hx = heroCenterX();
    if (entry.spot === 'head' || entry.spot === 'hand') {
      /* droopy nonsense lands right on Pip */
      var off = entry.spot === 'hand' ? '<g transform="translate(38,4)">' : '<g>';
      spawnHeldProp(off + PROP_ART[entry.prop]() + '</g>', 'sillyheld');
      after(500, function () {
        if (heldProp.firstChild) heldProp.firstChild.classList.add('droop');
      });
      sfxSoggy();
      if (entry.spot === 'hand') sfxFizzle();
    } else {
      var xy = sillySpotXY(entry.spot);
      var cls = 'silly-' + entry.prop;
      if (entry.spot === 'water') cls += ' plop-in';
      if (entry.spot === 'gap') cls += ' drop-in';
      var pg = spawnWorldProp(PROP_ART[entry.prop](), xy[0], xy[1], cls);
      if (entry.spot === 'water') {
        after(450, function () {
          pg.querySelector('.pinner').classList.add('sinking');
          sfxSplash();
          /* splash rings where it plopped */
          var rings = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          rings.innerHTML = '<ellipse class="ring r1" cx="' + xy[0] + '" cy="384" rx="30" ry="8" fill="none" stroke="#FFFDF6" stroke-width="3"/>' +
                            '<ellipse class="ring r2" cx="' + xy[0] + '" cy="384" rx="30" ry="8" fill="none" stroke="#FFFDF6" stroke-width="2"/>';
          propsBack.appendChild(rings);
        });
      }
      if (entry.spot === 'feet') {
        /* Pip steps right onto it — the peel/anvil/homework is underfoot */
        after(280, function () {
          pip.style.left = (parseFloat(pip.style.left || '14') + 5) + '%';
        });
      }
    }

    /* …then Pip loses it and SHATTERS into triangles */
    after(900, function () {
      popCheer(entry.line);
      shatterHero(function () {
        showGuide('Haha! Very funny. But I still need help — try another word!', 3600);
        blankEl.className = 'blank';
        blankEl.innerHTML = '<i>&nbsp;</i>';
        wordInput.value = '';
        state = 'playing';
        focusInput();
      });
    });
  }

  /* ================= word handling ================= */
  function normalizeWord(raw) {
    var w = raw.toLowerCase().trim()
      .replace(/[.!?,'"]+/g, '')
      .replace(/\s+/g, ' ');
    w = w.replace(/^(a|an|the|some|my)\s+/, '');
    return w;
  }

  function beatTable() { return BEATS[bi]; }
  function lookup(w) {
    var b = beatTable();
    if (b.sensible[w]) return { r: b.sensible[w], silly: false };
    if (b.silly[w]) return { r: b.silly[w], silly: true };
    var base = w;
    if (w.length > 3 && w.slice(-1) === 's') base = w.slice(0, -1);
    if (b.sensible[base]) return { r: b.sensible[base], silly: false };
    if (b.silly[base]) return { r: b.silly[base], silly: true };
    if (w.length > 4 && w.slice(-2) === 'es') {
      base = w.slice(0, -2);
      if (b.sensible[base]) return { r: b.sensible[base], silly: false };
      if (b.silly[base]) return { r: b.silly[base], silly: true };
    }
    return null;
  }

  function looksLikeWord(w) {
    return /^[a-z][a-z\-' ]*$/.test(w) && w.length >= 3 && /[aeiouy]/.test(w) && !/(.)\1{2,}/.test(w);
  }

  /* edit distance for "did you mean…?" */
  function editDist(a, b) {
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 3;
    var d = [];
    for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 0; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return d[m][n];
  }
  function nearestSensible(w) {
    var keys = Object.keys(beatTable().sensible);
    var best = null, bd = 99;
    keys.forEach(function (k) {
      var d = editDist(w, k);
      if (d < bd) { bd = d; best = k; }
    });
    var thresh = best && best.length >= 6 ? 2 : 1;
    return bd <= thresh ? best : null;
  }
  function showSuggest(word) {
    currentSuggest = word;
    didyouBtn.textContent = word;
    didyouEl.hidden = false;
  }
  function hideSuggest() {
    currentSuggest = null;
    didyouEl.hidden = true;
  }

  function submitWord() {
    if (state !== 'playing') return;
    var w = normalizeWord(wordInput.value);
    if (!w) {
      blankEl.classList.remove('shake'); void blankEl.offsetWidth; blankEl.classList.add('shake');
      return;
    }
    var hit = lookup(w);
    if (!hit) {
      var sugg = nearestSensible(w);
      if (sugg) {
        showSuggest(sugg);
        sfxWobble();
        showGuide('Hmm… did you mean "' + sugg + '"?', 3000);
        return;
      }
      hideSuggest();
      if (!looksLikeWord(w)) {
        /* gibberish: gentle wobble, no advancement */
        sfxWobble();
        gag('gag-wobble', 600);
        blankEl.classList.remove('shake'); void blankEl.offsetWidth; blankEl.classList.add('shake');
        showGuide('Is that a word? Hmm… try one of the sparkly ideas below!', 3200);
        return;
      }
      /* unknown-but-wordy: the world hears you — a mystery chunk appears */
      sfxWobble();
      spawnWorldProp(PROP_ART.chunk(), heroCenterX() + 70, 368, 'chunkprop');
      gag('gag-wobble', 600);
      blankEl.classList.remove('shake'); void blankEl.offsetWidth; blankEl.classList.add('shake');
      showGuide('A "' + w + '"? The ' + area.name.toLowerCase() + ' shrugs — try another!', 3200);
      return;
    }
    acceptWord(w, hit);
  }

  function acceptWord(w, hit) {
    state = 'reacting';
    hideSuggest();
    chosen.push({ word: w, silly: hit.silly });
    sfxSubmit();

    blankEl.classList.remove('typing', 'shake');
    blankEl.textContent = w;
    blankEl.classList.add('filled');
    blankEl.classList.toggle('silly', hit.silly);
    wordInput.value = '';
    wordInput.placeholder = 'type a word…';

    if (hit.silly) {
      sillyCount++;
      sillyFail(hit.r, w);
    } else {
      ACTS[hit.r.act](hit.r, w);
    }
  }

  /* Enter key submits from anywhere while playing */
  function maybeSubmitOnEnter(e) {
    if (e.key === 'Enter' && state === 'playing' && document.activeElement !== wordInput) {
      e.preventDefault();
      submitWord();
    }
  }

  /* ================= payoff ================= */
  function finishChapter() {
    state = 'done';
    stopAuto();
    sfxWin();
    burst(pipCenter()[0], pipCenter()[1] - 40, 26, 120);
    after(300, function () { burst(560, 240, 18, 90); });

    recapBox.innerHTML = '';
    chosen.forEach(function (c) {
      var chip = document.createElement('span');
      chip.className = 'rechip' + (c.silly ? ' silly' : '');
      chip.innerHTML = (c.silly
        ? '<svg viewBox="0 0 14 14"><path d="M7 0 L14 14 L0 14 Z" fill="#FF6B57"/></svg>'
        : '<svg viewBox="0 0 20 20"><path d="M4 10.5 L8.5 15 L16 5.5" fill="none" stroke="#4FB06D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>')
        + esc(c.word);
      recapBox.appendChild(chip);
    });
    gagsLine.textContent = sillyCount === 0
      ? 'Not a single shatter — Pip stayed in one piece the whole way home!'
      : sillyCount + ' shatter' + (sillyCount === 1 ? '' : 's') + ' along the way — and every facet got glued back on!';

    after(1100, function () {
      endOv.hidden = false;
      requestAnimationFrame(function () { endOv.classList.add('show'); });
    });
  }

  /* ================= input plumbing ================= */
  function focusInput() {
    try { wordInput.focus({ preventScroll: true }); } catch (e) { wordInput.focus(); }
  }

  wordInput.addEventListener('input', function () {
    if (state !== 'playing') { wordInput.value = wordInput.value.slice(0, 24); return; }
    var v = wordInput.value;
    if (v) {
      blankEl.classList.add('typing');
      blankEl.textContent = v;
    } else {
      blankEl.classList.remove('typing');
      blankEl.innerHTML = '<i>&nbsp;</i>';
    }
    hideSuggest();
    sfxType();
  });
  wordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submitWord(); }
  });
  goBtn.addEventListener('click', function () {
    submitWord();
    focusInput();
  });
  didyouBtn.addEventListener('click', function () {
    if (!currentSuggest || state !== 'playing') return;
    wordInput.value = currentSuggest;
    wordInput.dispatchEvent(new Event('input'));
    submitWord();
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (auto.on) stopAuto();   /* any real keypress hands control back */
    if (state === 'done' && e.key === 'Enter') { e.preventDefault(); againBtn.click(); return; }
    maybeSubmitOnEnter(e);
    /* keep focus friendly during play */
    if (/^[a-zA-Z ']$/.test(e.key) && document.activeElement !== wordInput && state === 'playing') {
      focusInput();
    }
  });

  /* ================= auto-play demo =================
     "Watch it play" forges a hero via Surprise me, then types a scripted
     chapter — a banana-peel shatter, an anvil splash, a unicorn ride. */
  var auto = { on: false, timer: null, wIdx: 0, char: 0 };

  function startAuto() {
    auto.on = true;
    stopBtn.classList.add('show');
    if (state === 'maker') {
      surpriseMe();
      scheduleAuto(650);   // admire the fresh hero a beat
      auto.phase = 'forge';
    } else if (state === 'done') {
      resetWorld();
      auto.phase = 'type';
      scheduleAuto(900);
    } else {
      auto.phase = 'type';
      scheduleAuto(500);
    }
    auto.wIdx = 0; auto.char = 0;
  }
  function stopAuto() {
    auto.on = false;
    clearTimeout(auto.timer);
    stopBtn.classList.remove('show');
  }
  function scheduleAuto(ms) {
    clearTimeout(auto.timer);
    auto.timer = setTimeout(autoStep, ms);
  }
  function autoStep() {
    if (!auto.on) return;
    if (auto.phase === 'forge') { auto.phase = 'type'; startJourney(); scheduleAuto(900); return; }
    if (state === 'done') { stopAuto(); return; }
    if (state !== 'playing') { scheduleAuto(340); return; }

    var script = SCRIPT[Math.min(bi, SCRIPT.length - 1)];
    var target = script[Math.min(auto.wIdx, script.length - 1)];
    var typed = wordInput.value;

    if (auto.char === 0 && typed === '') {
      auto.char = 1;
      scheduleAuto(480 + Math.random() * 320);   // a beat to "read" the sentence
      return;
    }
    if (typed.length < target.length) {
      if (typed.length > 0 && Math.random() < 0.06) {
        wordInput.value = typed.slice(0, -1);    // believable kid typo, fixed
      } else {
        wordInput.value = target.slice(0, typed.length + 1);
      }
      wordInput.dispatchEvent(new Event('input'));
      scheduleAuto(150 + Math.random() * 190);
      return;
    }
    submitWord();
    auto.char = 0;
    auto.wIdx = Math.min(auto.wIdx + 1, script.length - 1); // stay on last word of beat
    scheduleAuto(400);
  }
  /* when a new beat begins, the script pointer resets */
  function resetAutoBeat() { auto.wIdx = 0; auto.char = 0; }

  /* ================= hero maker (beat 0) ================= */
  function refreshPreview() {
    heroPrev.innerHTML = buildHeroSVG(heroCfg, heroCfg.seed);
  }
  function buildOptRow(el, items, get, set, renderLabel) {
    el.innerHTML = '';
    items.forEach(function (it, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt' + (get() === (it.id != null ? it.id : idx) ? ' on' : '');
      b.innerHTML = renderLabel(it, idx);
      b.addEventListener('click', function () {
        if (auto.on) stopAuto();
        set(it.id != null ? it.id : idx);
        audio();
        sfxType();
        refreshPreview();
        buildMakerOpts();
      });
      el.appendChild(b);
    });
  }
  function buildMakerOpts() {
    buildOptRow(document.getElementById('optFacets'), FACET_LEVELS,
      function () { return heroCfg.facets; },
      function (v) { heroCfg.facets = v; },
      function (it) {
        return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 L15 15 L1 15 Z" fill="none" stroke="#2B2118" stroke-width="1.6" stroke-linejoin="round"/>' +
          (it.grid > 3 ? '<path d="M8 1 L8 15 M4.5 8 L11.5 8" stroke="#2B2118" stroke-width="1"/>' : '') +
          (it.grid > 5 ? '<path d="M5.5 4.5 L10.5 4.5 M3 11.5 L13 11.5" stroke="#2B2118" stroke-width="1"/>' : '') +
          '</svg><span>' + it.name + '</span>';
      });
    buildOptRow(document.getElementById('optHues'), HUES,
      function () { return heroCfg.hue; },
      function (v) { heroCfg.hue = v; },
      function (it) {
        return '<span class="huechip" style="background:' + it.dark + '">' +
          '<svg viewBox="0 0 14 14"><path d="M7 1 L13 13 L1 13 Z" fill="' + it.light + '" stroke="#2B2118" stroke-width="1.2" stroke-linejoin="round"/></svg></span><span>' + it.name + '</span>';
      });
    buildOptRow(document.getElementById('optHorns'), HORN_STYLES,
      function () { return heroCfg.horns; },
      function (v) { heroCfg.horns = v; },
      function (it) {
        var g = {
          horns: '<path d="M3 13 L1 4 6 8 Z M13 13 L15 4 10 8 Z" fill="#FFC53D" stroke="#2B2118" stroke-width="1.2" stroke-linejoin="round"/>',
          ears: '<path d="M3 12 L2 3 8 8 Z M13 12 L14 3 8 8 Z" fill="#B565D8" stroke="#2B2118" stroke-width="1.2" stroke-linejoin="round"/>',
          sprout: '<path d="M5 12 L4 5 8 9 Z M11 12 L12 5 8 9 Z M8 12 L8 4" fill="#4FB06D" stroke="#2B2118" stroke-width="1.1" stroke-linejoin="round"/>',
          none: '<path d="M3 9 C 5 5, 11 5, 13 9" fill="none" stroke="#B9A98F" stroke-width="1.8" stroke-linecap="round"/>'
        }[it.id];
        return '<svg viewBox="0 0 16 16" aria-hidden="true">' + g + '</svg><span>' + it.name + '</span>';
      });
    buildOptRow(document.getElementById('optEyes'), EYE_STYLES,
      function () { return heroCfg.eyes; },
      function (v) { heroCfg.eyes = v; },
      function (it) {
        var g = {
          googly: '<circle cx="5" cy="8" r="4" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><circle cx="6.4" cy="8" r="1.8" fill="#2B2118"/><circle cx="12" cy="8" r="2.8" fill="#fff" stroke="#2B2118" stroke-width="1.3"/><circle cx="13" cy="8" r="1.3" fill="#2B2118"/>',
          twins: '<circle cx="5" cy="8" r="3.4" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><circle cx="6" cy="8" r="1.5" fill="#2B2118"/><circle cx="12" cy="8" r="3.4" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><circle cx="13" cy="8" r="1.5" fill="#2B2118"/>',
          starry: '<circle cx="5" cy="8" r="3.8" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><use href="#dstar" transform="translate(5,8) scale(.55)" fill="#FFC53D"/><circle cx="12.5" cy="8" r="3.8" fill="#fff" stroke="#2B2118" stroke-width="1.4"/><use href="#dstar" transform="translate(12.5,8) scale(.55)" fill="#FFC53D"/>'
        }[it.id];
        return '<svg viewBox="0 0 16 16" aria-hidden="true">' + g + '</svg><span>' + it.name + '</span>';
      });
  }
  function surpriseMe() {
    heroCfg.facets = Math.floor(Math.random() * FACET_LEVELS.length);
    heroCfg.hue = Math.floor(Math.random() * HUES.length);
    heroCfg.horns = HORN_STYLES[Math.floor(Math.random() * HORN_STYLES.length)].id;
    heroCfg.eyes = EYE_STYLES[Math.floor(Math.random() * EYE_STYLES.length)].id;
    heroCfg.seed = Math.floor(Math.random() * 1e9);
    buildMakerOpts();
    refreshPreview();
    sfxAssemble();
    /* preview does a mini shatter-and-reform to show off the mechanic */
    var svg = heroPrev.querySelector('svg');
    if (svg) {
      var shards = svg.querySelectorAll('.shard');
      Array.prototype.forEach.call(shards, function (s) {
        var ang = Math.random() * Math.PI * 2;
        var d = 10 + Math.random() * 26;
        s.style.transform = 'translate(' + (Math.cos(ang) * d).toFixed(1) + 'px,' + (Math.sin(ang) * d).toFixed(1) + 'px) rotate(' + ((Math.random() - 0.5) * 160).toFixed(0) + 'deg)';
        s.style.opacity = '.3';
      });
      setTimeout(function () {
        svg.classList.add('reform');
        Array.prototype.forEach.call(shards, function (s) { s.style.transform = ''; s.style.opacity = '1'; });
        setTimeout(function () { svg.classList.remove('reform'); }, 500);
      }, 260);
    }
  }

  /* ================= start / reset ================= */
  function startJourney() {
    audio();
    forgeHero();
    makerOv.classList.remove('show');
    hintChip.style.opacity = '0';
    setTimeout(function () { makerOv.hidden = true; }, 380);
    bi = 0; chosen = []; sillyCount = 0;
    setArea(0);
    setSentence(0);
    /* Pip walks in behind Hoot */
    pip.classList.add('notrans'); pip.style.left = '-16%'; void pip.offsetWidth;
    pip.classList.remove('notrans');
    pip.classList.add('walking');
    pip.style.left = HERO_LEFT + '%';
    owlArrives();
    after(900, function () {
      pip.classList.remove('walking');
      showGuide(BEATS[0].guide, 3800);
      state = 'playing';
      focusInput();
    });
  }

  function clearPipClasses() {
    pip.classList.remove('riding', 'entering', 'ridingmove', 'walking', 'swingy',
      'gag-hop', 'gag-wobble', 'gag-dustoff');
  }

  function resetWorld() {         // same hero, fresh world
    endOv.classList.remove('show');
    setTimeout(function () { endOv.hidden = true; }, 320);
    clearTimers();
    clearShards(); dizzy(false); hideGuide(); hideSuggest();
    clearPipClasses();
    bi = 0; chosen = []; sillyCount = 0;
    setArea(0);
    pip.classList.add('notrans'); pip.style.left = '-16%'; void pip.offsetWidth;
    pip.classList.remove('notrans');
    pip.classList.add('walking');
    pip.style.left = HERO_LEFT + '%';
    owlArrives();
    after(700, function () {
      pip.classList.remove('walking');
      setSentence(0);
      state = 'playing';
      focusInput();
    });
  }

  function backToMaker() {        // reforge
    endOv.classList.remove('show');
    setTimeout(function () { endOv.hidden = true; }, 320);
    clearTimers();
    clearShards(); dizzy(false); hideGuide(); hideSuggest();
    clearPipClasses();
    setArea(0);
    state = 'maker';
    makerOv.hidden = false;
    requestAnimationFrame(function () { makerOv.classList.add('show'); });
    refreshPreview();
  }

  startBtn.addEventListener('click', function () { if (auto.on) stopAuto(); startJourney(); });
  surpriseBtn.addEventListener('click', function () { if (auto.on) stopAuto(); audio(); surpriseMe(); });
  watchBtn.addEventListener('click', function () { audio(); startAuto(); });
  stopBtn.addEventListener('click', function () { stopAuto(); focusInput(); });
  againBtn.addEventListener('click', function () { if (auto.on) stopAuto(); resetWorld(); });
  reforgeBtn.addEventListener('click', function () { if (auto.on) stopAuto(); backToMaker(); });
  watchAgain.addEventListener('click', function () { startAuto(); });
  mosaicBtn.addEventListener('click', function () {
    if (state === 'travel' || state === 'reacting') return;
    setArea(bi < BEATS.length ? BEATS[bi].area : 0);
    popCheer('New world, same quest!');
    sfxAssemble();
  });
  stage.addEventListener('pointerdown', function (e) {
    if (auto.on) { stopAuto(); return; }
    if (state === 'playing' && !e.target.closest('button') && !e.target.closest('.overlay')) focusInput();
  });

  /* new beat → auto-typist starts that beat's script fresh */
  var _setSentence = setSentence;
  setSentence = function (i) { _setSentence(i); resetAutoBeat(); };

  /* ================= init ================= */
  heroCfg.seed = Math.floor(Math.random() * 1e9);
  owlWrap.innerHTML = buildOwlSVG();
  owlPerch(true);
  buildBackdrop(Math.floor(Math.random() * 1e9), 0);
  buildMakerOpts();
  refreshPreview();
  setSentence(0);
  /* deep link: open with #watch to jump straight into the hands-free demo */
  if (window.location.hash === '#watch') startAuto();
})();
