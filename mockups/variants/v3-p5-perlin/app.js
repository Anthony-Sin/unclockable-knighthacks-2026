/* ==========================================================================
   Fill the Tale — Living Forest edition
   Variant 3 of 7 · all visuals are generated live by p5.js (perlin noise).
   No images, no sprites: rolling noise hills, drifting blob clouds, firefly
   particles, wobbly trees, and a breathing blob hero the kid designs.
   The story is a JOURNEY through five generated scene types:
     forest clearing -> drizzly field -> riverbank -> cave mouth -> home meadow
   and each typed word spawns a real prop that acts out the sentence.
   ========================================================================== */
'use strict';

/* ============================ story data (beats 1-5) ============================ */

// Each beat: sentence around the blank, its scene index, the hero rig, and a
// table of "sensible" words. Each sensible word names the prop that will
// literally appear in the scene and do the work.
const BEATS = [
  {
    before: 'Pip needs to get through the forest! But the path is blocked — Pip needs a ',
    after: ' to cross.',
    hints: 'bridge · log · vine · banana peel',
    rig: 'cross',
    gagRig: 'tumble',
    good: {
      'bridge':          { how: 'span'  },
      'log':             { how: 'span'  },
      'plank':           { how: 'span'  },
      'board':           { how: 'span'  },
      'vine':            { how: 'swing' },
      'rope':            { how: 'swing' },
      'boat':            { how: 'boat'  },
      'raft':            { how: 'boat'  },
      'stepping stones': { how: 'stones'},
      'stones':          { how: 'stones'},
    },
    cheers: ['Across! Nice work!', 'Pip made it over the creek!', 'Easy peasy crossing!'],
  },
  {
    before: 'It started to rain! The hero grabs a ',
    after: '.',
    hints: 'umbrella · leaf umbrella · paper bag',
    rig: 'grab',
    gagRig: 'soggy',
    good: {
      'umbrella':       { wear: 'over' },
      'leaf umbrella':  { wear: 'over' },
      'leaf':           { wear: 'over' },
      'big leaf':       { wear: 'over' },
      'newspaper':      { wear: 'over' },
      'mushroom hat':   { wear: 'hat'  },
      'mushroom':       { wear: 'hat'  },
      'hat':            { wear: 'hat'  },
      'rain hat':       { wear: 'hat'  },
      'hood':           { wear: 'hat'  },
    },
    cheers: ['Dry as a biscuit!', 'Pip is snug and dry!', 'Rain, rain, go away!'],
  },
  {
    before: 'A wide river! The hero rides the ',
    after: ' across.',
    hints: 'boat · duck · unicorn · toaster',
    rig: 'ride',
    gagRig: 'splash',
    good: {
      'boat':     { v: 'boat'    },
      'raft':     { v: 'raft'    },
      'canoe':    { v: 'boat'    },
      'duck':     { v: 'duck'    },
      'unicorn':  { v: 'unicorn' },
      'fish':     { v: 'fish'    },
      'big fish': { v: 'fish'    },
      'turtle':   { v: 'turtle'  },
      'log':      { v: 'log'     },
      'lily pad': { v: 'lily'    },
    },
    cheers: ['WHEEE! Across the river!', 'Splish splash — made it!', 'What a ride!'],
  },
  {
    before: 'The cave is dark! The hero lights a ',
    after: '.',
    hints: 'lantern · firefly jar · soggy match',
    rig: 'light',
    gagRig: 'fizzle',
    good: {
      'lantern':       { prop: 'lantern'   },
      'torch':         { prop: 'torch'     },
      'candle':        { prop: 'candle'    },
      'flashlight':    { prop: 'flashlight'},
      'match':         { prop: 'match'     },
      'sparkler':      { prop: 'sparkler'  },
      'firefly jar':   { prop: 'jar', swarm: true },
      'fireflies':     { prop: 'jar', swarm: true },
      'firefly':       { prop: 'jar', swarm: true },
      'lightning bug': { prop: 'jar', swarm: true },
    },
    cheers: ['Let there be light!', 'Pip can see again!', 'So glowy!'],
  },
  {
    before: 'Home! The hero opens the ',
    after: '.',
    hints: 'door · cookie jar · slime',
    rig: 'open',
    gagRig: 'startle',
    good: {
      'door':        { prop: 'door'   },
      'front door':  { prop: 'door'   },
      'key':         { prop: 'key'    },
      'gate':        { prop: 'gate'   },
      'window':      { prop: 'window' },
      'cookie jar':  { prop: 'jar'    },
      'jar':         { prop: 'jar'    },
      'lid':         { prop: 'jar'    },
    },
    cheers: ['Home sweet home!'],
  },
];

// Silly words are silly everywhere — the gag RIG comes from the current beat,
// and the typed word still spawns as a real prop underfoot/overhead.
const SILLY = {
  'banana peel': {}, 'banana': {}, 'soap': {}, 'slime': {}, 'goo': {},
  'mud': {}, 'lava': {}, 'fire': {}, 'ghost': {}, 'spider': {},
  'stinky sock': {}, 'sock': {}, 'homework': {}, 'math': {}, 'broccoli': {},
  'paper bag': {}, 'toast': {}, 'toaster': {}, 'fridge': {}, 'soggy match': {},
  'wet sock': {},
};

const GAG_MSG = {
  tumble:  w => `Whoopsie-daisy! Pip slipped on the ${w}!`,
  soggy:   w => `A soggy ${w}?! That is NOT going to keep Pip dry.`,
  splash:  w => `A ${w} can't float! GLUG GLUG GLUG…`,
  fizzle:  w => `The ${w} went fizz… fizz… PFFFT. Still dark!`,
  startle: w => `A ${w} is not a door! Pip fainted on the doorstep.`,
};

const RETRY_LINES = [
  'Pip dusted off. Try a nicer word!',
  'Pip is okay! Pick a word that helps the story.',
  'Silly! Try one of the hint words.',
  'Again, again! Give Pip a better word.',
];

// Scripted hands-free chapter: 5 sensible words + a soggy fail in the rain.
const DEMO_WORDS = ['bridge', 'paper bag', 'leaf umbrella', 'duck', 'firefly jar', 'cookie jar'];

const SQUISH_WORDS = ['barely wobbly', 'a little jiggly', 'nice & jiggly', 'super squishy', 'MAXIMUM WOBBLE'];

/* ============================ tiny utils ============================ */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack  = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalizeWord(raw) {
  return raw.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
}

// small edit-distance for "did you mean…?" spelling help
function editDist(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
                         d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function closestSensible(word) {
  let best = null, bestD = 99;
  for (const key of Object.keys(BEATS[game.idx].good)) {
    const d = editDist(word, key);
    if (d < bestD) { bestD = d; best = key; }
  }
  const limit = best.length <= 4 ? 1 : 2;
  return bestD <= limit ? best : null;
}

/* ============================ game state ============================ */

const game = {
  phase: 'maker',     // 'maker' | 'await' | 'anim' | 'done'
  idx: 0,             // which beat we're on (0..4)
  chosen: [],         // accepted words
  auto: false,        // hands-free demo running
  stopDemo: false,
};
let demoResolve = null;

// The kid's customized blob — drawn live on stage while they tweak it.
const heroSpec = { col: '#7CC57C', belly: '#CDEFD3', squish: 0.15, eyes: 'one', gear: 'horns' };

const hero = {
  u: 0.5, dir: 1,
  x: 0, y: 0,
  rot: 0, sx: 1, sy: 1,
  mood: 'idle',       // idle | happy | scared | flat | dizzy
  lookX: 0,
  stars: 0,
  squishSeed: Math.random() * 100,
};

/* ============================ DOM helpers ============================ */

const $ = id => document.getElementById(id);
let els = {};

function cacheEls() {
  els = {
    wrap: $('canvasWrap'), noP5: $('noP5'),
    sentenceLine: $('sentenceLine'), pipSays: $('pipSays'),
    hintWords: $('hintWords'), tellBtn: $('tellBtn'),
    progress: $('progress'), seedNum: $('seedNum'),
    forestBtn: $('forestBtn'), demoBtn: $('demoBtn'), demoLabel: $('demoLabel'),
    sentenceCard: $('sentenceCard'), payoff: $('payoff'),
    recapList: $('recapList'), gemLetter: $('gemLetter'), gemLine: $('gemLine'),
    againBtn: $('againBtn'), bloomBtn: $('bloomBtn'),
    makerCard: $('makerCard'), swatches: $('swatches'),
    squishRange: $('squishRange'), squishWord: $('squishWord'),
    eyeRow: $('eyeRow'), gearRow: $('gearRow'),
    surpriseBtn: $('surpriseBtn'), startBtn: $('startBtn'),
    dymRow: $('dymRow'), dymChip: $('dymChip'),
  };
}

function say(msg, cls) {
  els.pipSays.textContent = msg;
  els.pipSays.className = 'pip-says' + (cls ? ' ' + cls : '');
}

function hideDym() { els.dymRow.hidden = true; }
function showDym(word) {
  els.dymChip.textContent = word;
  els.dymChip.onclick = () => {
    const input = $('wordInput');
    if (input) input.value = word;
    hideDym();
    submitWord(word);
  };
  els.dymRow.hidden = false;
}

function renderSentence(wordInBlank) {
  const s = BEATS[game.idx];
  const inputHTML = wordInBlank != null
    ? `<span class="blank-word">${wordInBlank}</span>`
    : `<input id="wordInput" type="text" maxlength="24" placeholder="your word" autocomplete="off" spellcheck="false">`;
  els.sentenceLine.innerHTML =
    `${s.before}<span class="blank-slot" id="blankSlot">${inputHTML}</span>${s.after}`;
  els.hintWords.textContent = s.hints;
  hideDym();
  const input = $('wordInput');
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submitWord(); });
    input.addEventListener('input', () => {
      input.style.minWidth = Math.max(140, input.value.length * 16 + 40) + 'px';
      hideDym();
    });
  }
}

function renderProgress() {
  els.progress.innerHTML = BEATS.map((_, i) => {
    const cls = i < game.chosen.length ? 'done'
      : (game.phase !== 'maker' && game.phase !== 'done' && i === game.idx ? 'now' : '');
    return `<span class="pdot ${cls}">${i + 1}</span>`;
  }).join('');
}

function setInputEnabled(on) {
  els.tellBtn.disabled = !on;
  const input = $('wordInput');
  if (input) { input.disabled = !on; if (on) input.focus(); }
}

/* ============================ beat 0: hero maker ============================ */

function wireMaker() {
  els.swatches.querySelectorAll('.swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      els.swatches.querySelectorAll('.swatch').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      heroSpec.col = btn.dataset.col;
      heroSpec.belly = btn.dataset.belly;
      startAnim('pop', {}, null);
    });
  });

  const squishLabel = v => SQUISH_WORDS[clamp(Math.floor((v - 1) / 2.5), 0, 4)];
  els.squishRange.addEventListener('input', () => {
    const v = +els.squishRange.value;
    heroSpec.squish = 0.04 + (v - 1) * (0.26 / 9);   // noise amount of the blob outline
    els.squishWord.textContent = squishLabel(v);
  });

  els.eyeRow.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      els.eyeRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      heroSpec.eyes = btn.dataset.eye;
      startAnim('pop', {}, null);
    });
  });
  els.gearRow.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      els.gearRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      heroSpec.gear = btn.dataset.gear;
      startAnim('pop', {}, null);
    });
  });

  els.surpriseBtn.addEventListener('click', () => { surpriseHero(); });
  els.startBtn.addEventListener('click', () => { startAdventure(); });
}

function surpriseHero() {
  const sw = pick([...els.swatches.querySelectorAll('.swatch')]);
  sw.click();
  const eyes = pick(['one', 'two', 'sleepy']);
  const gears = pick(['sprout', 'horns', 'antennae', 'ears', 'bald']);
  els.eyeRow.querySelector(`[data-eye="${eyes}"]`).click();
  els.gearRow.querySelector(`[data-gear="${gears}"]`).click();
  els.squishRange.value = 1 + Math.floor(Math.random() * 10);
  els.squishRange.dispatchEvent(new Event('input'));
  hero.squishSeed = Math.random() * 100;
  startAnim('pop', {}, null);
}

function startAdventure() {
  els.makerCard.hidden = true;
  els.sentenceCard.hidden = false;
  game.idx = 0;
  game.phase = 'await';
  hero.u = 0.2;
  renderSentence();
  renderProgress();
  setInputEnabled(!game.auto);
  say('Pip is wobbling with excitement. Type a word!');
  startAnim('pop', {}, null);
}

/* ============================ word flow ============================ */

const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

function classify(word) {
  const beat = BEATS[game.idx];
  if (has(beat.good, word)) return { kind: 'good', word, conf: beat.good[word] };
  if (has(SILLY, word)) return { kind: 'silly', word };
  if (word.endsWith('s') && word.length > 1) {            // lazy plural rescue
    const sing = word.slice(0, -1);
    if (has(beat.good, sing)) return { kind: 'good', word: sing, conf: beat.good[sing] };
    if (has(SILLY, sing)) return { kind: 'silly', word: sing };
  }
  const close = closestSensible(word);
  if (close) return { kind: 'close', word, close };
  return { kind: 'unknown', word };
}

function submitWord(forced) {
  if (game.phase !== 'await') return;
  const input = $('wordInput');
  const raw = forced != null ? forced : (input ? input.value : '');
  const word = normalizeWord(raw);
  const slot = $('blankSlot');

  if (!word || !/^[a-z][a-z' -]*$/.test(word)) {
    if (slot) { slot.classList.remove('shake'); void slot.offsetWidth; slot.classList.add('shake'); }
    say(word ? 'Hmm… that looks like squiggles, not a word!' : 'Type a word into the blank first!');
    return;
  }

  const r = classify(word);
  const beat = BEATS[game.idx];
  game.phase = 'anim';
  setInputEnabled(false);
  hideDym();
  renderSentence(word);

  if (r.kind === 'good') {
    say('Here we go…');
    spawnWordProp(beat.rig, r.word, r.conf);
    startAnim(beat.rig, { word: r.word, conf: r.conf }, onGoodDone.bind(null, r.word));
  } else if (r.kind === 'silly') {
    const rig = beat.gagRig;
    say(GAG_MSG[rig](r.word), 'silly');
    spawnWordProp(rig, r.word, {});
    startAnim(rig, { word: r.word }, onSillyDone);
  } else if (r.kind === 'close') {
    say(`Hmm… "${word}"? Pip almost heard it.`);
    startAnim('wobble', {}, onWobbleDone);
    showDym(r.close);                       // "did you mean …?" chip accepts the fix
  } else {
    say(`Hmm… is "${word}" a word? Pip is puzzled.`);
    startAnim('wobble', {}, onWobbleDone);
  }
}

// the typed word becomes a REAL prop in the scene
function spawnWordProp(rig, word, conf) {
  const p = { word, born: millis(), life: 6000, dir: hero.dir };
  if (rig === 'cross') {
    p.how = conf.how;
    const g = world.scenes[0].gap;
    if (conf.how === 'span')   { p.u = (g.u0 + g.u1) / 2; p.life = 9000; }
    if (conf.how === 'boat')   { p.u = (g.u0 + g.u1) / 2; p.water = true; p.life = 9000; }
    if (conf.how === 'swing')  { p.u = (g.u0 + g.u1) / 2; p.life = 9000; }
    if (conf.how === 'stones') { p.u = (g.u0 + g.u1) / 2; p.life = 9000; }
  } else if (rig === 'grab') {
    p.attach = conf.wear === 'over' ? 'over' : 'hat'; p.life = 5200;
  } else if (rig === 'ride') {
    p.v = conf.v; p.ride = true; p.u = world.scenes[2].river.u0 - 0.04; p.water = true; p.life = 99999;
  } else if (rig === 'light') {
    p.attach = 'hand'; p.light = conf.prop; p.life = 99999;
    if (conf.swarm) { p.attach = null; p.u = hero.u + 0.08; p.ground = true; world.swarmBorn = millis(); }
  } else if (rig === 'open') {
    if (conf.prop === 'door') return null;          // the house door IS the prop
    p.openWhat = conf.prop; p.u = 0.63; p.ground = true; p.life = 99999;
    if (conf.prop === 'key') { p.attach = 'hand'; p.ground = false; }
  } else {
    // gag props land right in front of / on top of poor Pip
    if (rig === 'soggy') { p.attach = 'head'; p.life = 6000; }
    else if (rig === 'splash') { p.sinkProp = true; p.life = 6000; }
    else { p.u = hero.u + hero.dir * 0.055; p.ground = true; p.life = 6000; }
  }
  p.scene = world.cur;                    // props fade away with their journey area
  props.push(p);
  return p;
}

function onGoodDone(word) {
  game.chosen.push(word);
  say(pick(BEATS[game.idx].cheers), 'happy');
  if (game.chosen.length >= BEATS.length) {
    finishChapter();
    return;
  }
  game.idx++;
  game.phase = 'travel';                    // crossfade to the next journey area
  startAnim('travel', {}, () => {
    game.phase = 'await';
    renderSentence();
    renderProgress();
    setInputEnabled(!game.auto);
    afterAnim();
  });
  renderProgress();
}

function onSillyDone() {
  game.phase = 'await';
  renderSentence();
  setInputEnabled(!game.auto);
  say(pick(RETRY_LINES));
  afterAnim();
}

function onWobbleDone() {
  game.phase = 'await';
  const dymShown = !els.dymRow.hidden ? els.dymChip.textContent : null;
  renderSentence();
  setInputEnabled(!game.auto);
  if (dymShown) {
    showDym(dymShown);                    // the "did you mean?" chip survives the wobble
    say('Tap the chip to use that word, or type a new one!');
  } else {
    say('Try one of the hint words — or another real word!');
  }
  afterAnim();
}

function afterAnim() {
  if (game.auto && demoResolve) { const r = demoResolve; demoResolve = null; r(); }
}

/* ============================ chapter end ============================ */

function finishChapter() {
  game.phase = 'done';
  renderProgress();
  bloomForest();

  const first = game.chosen[0];
  els.gemLetter.textContent = first[0].toUpperCase();
  els.gemLine.textContent = `${first[0].toUpperCase()} is for ${cap(first)}!`;
  els.recapList.innerHTML = game.chosen.map((w, i) => {
    const s = BEATS[i];
    return `<li>${s.before}<b>${w}</b>${s.after}</li>`;
  }).join('');

  setTimeout(() => {
    els.sentenceCard.hidden = true;
    els.payoff.hidden = false;
    els.payoff.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1500);
  say('Chapter written! The meadow bloomed for you!', 'happy');
  if (game.auto && demoResolve) { const r = demoResolve; demoResolve = null; r(); }
}

function cap(w) { return w[0].toUpperCase() + w.slice(1); }

function resetChapter(toMaker) {
  game.idx = 0;
  game.chosen = [];
  anim = null;
  props = [];
  hero.rot = 0; hero.sx = hero.sy = 1;
  hero.stars = 0; hero.mood = 'idle';
  hero.u = 0.5;
  world.cur = 0; world.prev = -1; world.blend = 1;
  world.lit = 0; world.doorOpen = 0; world.swarmBorn = 0; world.bloomed = false;
  els.payoff.hidden = true;
  if (toMaker) {
    game.phase = 'maker';
    els.sentenceCard.hidden = true;
    els.makerCard.hidden = false;
  } else {
    game.phase = 'await';
    els.makerCard.hidden = true;
    els.sentenceCard.hidden = false;
    hero.u = 0.2;
    renderSentence();
    setInputEnabled(!game.auto);
    say('Pip is wobbling with excitement. Type a word!');
  }
  renderProgress();
}

/* ============================ auto demo ============================ */

async function typeWordIntoInput(w) {
  const input = $('wordInput');
  if (!input) return;
  input.value = '';
  for (const ch of w) {
    if (game.stopDemo) return;
    input.value += ch;
    input.dispatchEvent(new Event('input'));
    await sleep(85);
  }
}

function setDemoBtn(playing) {
  els.demoLabel.textContent = playing ? 'Stop the show' : 'Watch it play';
  els.demoBtn.classList.toggle('playing', playing);
}

async function runDemo() {
  if (game.auto) { game.stopDemo = true; return; }   // acts as STOP while playing
  game.auto = true; game.stopDemo = false;
  setDemoBtn(true);
  say('Storybook auto-play! Watch Pip go…', 'happy');

  if (game.phase === 'maker') {                      // auto-make the hero first
    await sleep(400);
    surpriseHero();
    await sleep(900);
    if (game.stopDemo) { endDemo(); return; }
    startAdventure();
  } else {
    resetChapter(false);
  }
  setInputEnabled(false);

  await sleep(900);
  for (const w of DEMO_WORDS) {
    if (game.stopDemo || game.phase === 'done') break;
    await typeWordIntoInput(w);
    if (game.stopDemo) break;
    await sleep(350);
    submitWord(w);
    await new Promise(r => { demoResolve = r; });    // sketch hands control back
    await sleep(500);
  }
  endDemo();
}

function endDemo() {
  game.auto = false; game.stopDemo = false;
  setDemoBtn(false);
  if (game.phase === 'await') {
    setInputEnabled(true);
    say('Your turn! Type a word for the blank.');
  }
}

/* ==========================================================================
   THE LIVING FOREST — everything below runs inside the p5 sketch.
   ========================================================================== */

const INK = '#2B2118';
const PETAL_COLS = ['#FF8FAB', '#B565D8', '#FFC53D', '#FFFDF6', '#FF6B57', '#5DA9E9'];

const world = {
  seed: 1,
  scenes: [],          // one generated scene per beat (5 journey areas)
  cur: 0, prev: -1, blend: 1, blendT0: 0,
  clouds: [], flies: [], petals: [],
  rainDrops: [],
  lit: 0,              // cave light glow amount 0..1
  litT0: 0,
  doorOpen: 0,
  swarmBorn: 0,
  bloomed: false,
};
let W = 960, H = 540;
let anim = null;
let props = [];
let fx = [];
let comics = [];
let skyBufs = {};      // per-scene cached sky gradients

/* ---------- world generation (re-rolled per seed) ---------- */

function makeHills(R, bases, amps) {
  return bases.map((b, i) => ({
    base: b, amp: amps[i], f: [0.0024, 0.0014, 0.0009][i],
    o: R() * 900, morph: [0.0009, 0.0013, 0.0017][i],
  }));
}

function regrowForest(seed) {
  world.seed = seed;
  if (typeof noiseSeed === 'function') noiseSeed(seed);
  if (typeof randomSeed === 'function') randomSeed(seed);
  const R = mulberry32(seed);
  world.bloomed = false; world.lit = 0; world.doorOpen = 0; world.swarmBorn = 0;
  props = []; fx = []; comics = [];
  skyBufs = {};
  hero.squishSeed = R() * 100;
  world.cur = 0; world.prev = -1; world.blend = 1;

  const nTrees = () => 1 + Math.floor(R() * 3);
  const mkTrees = n => Array.from({ length: n }, () => ({
    layer: R() < 0.4 ? 1 : 2, u: 0.06 + R() * 0.88,
    s: 0.7 + R() * 0.6, ph: R() * 10, apples: R() < 0.5,
  }));
  const mkFlowers = n => Array.from({ length: n }, () => ({
    u: 0.04 + R() * 0.92, h: 14 + R() * 16,
    col: PETAL_COLS[Math.floor(R() * PETAL_COLS.length)],
    s: 0.7 + R() * 0.7, ph: R() * 10, born: -1,
  }));

  // ---- the five journey areas, all generated from the one seed ----
  world.scenes = [
    { // 0 · forest clearing — a creek cuts the path
      name: 'forest',
      skyA: '#C9ECFF', skyB: '#FFF3DC', sun: '#FFC53D',
      hillCols: ['#A8D8AE', '#7CC98C', '#4FB06D'],
      hills: makeHills(R, [0.52, 0.64, 0.80], [0.085, 0.105, 0.13]),
      gap: { u0: 0.56, u1: 0.74, depth: 96 },
      trees: mkTrees(nTrees() + 2), flowers: mkFlowers(11 + Math.floor(R() * 6)),
      cloudsAmt: 1,
    },
    { // 1 · drizzly field — soft grey rain, puddles
      name: 'drizzle',
      skyA: '#B8CCD8', skyB: '#EAE3D2', sun: null,
      hillCols: ['#9CBE9D', '#74A97B', '#4A9360'],
      hills: makeHills(R, [0.50, 0.63, 0.79], [0.07, 0.09, 0.11]),
      rain: true, puddles: true,
      trees: mkTrees(1), flowers: mkFlowers(6),
      cloudsAmt: 1.4,
    },
    { // 2 · riverbank — wide wobbly river to ride across
      name: 'river',
      skyA: '#BFE7F5', skyB: '#FDEFD2', sun: '#FFC53D',
      hillCols: ['#A8D8AE', '#83C489', '#4FA96B'],
      hills: makeHills(R, [0.50, 0.60, 0.78], [0.08, 0.08, 0.10]),
      river: { u0: 0.46, u1: 0.80, level: 0.72 },
      reeds: true,
      trees: mkTrees(2), flowers: mkFlowers(9),
      cloudsAmt: 1,
    },
    { // 3 · cave mouth — dark rocks, needs light
      name: 'cave',
      skyA: '#7E7B9E', skyB: '#A793A8', sun: null,
      hillCols: ['#6E6A8E', '#565173', '#3E3C55'],
      hills: makeHills(R, [0.54, 0.66, 0.82], [0.07, 0.09, 0.10]),
      cave: { u: 0.74 },
      dark: true, rocks: true,
      trees: [], flowers: mkFlowers(4),
      cloudsAmt: 0.5,
    },
    { // 4 · home meadow — warm sunset, little cottage
      name: 'home',
      skyA: '#FFC08A', skyB: '#FFF0C9', sun: '#FF9E57',
      hillCols: ['#B7D78F', '#8BC178', '#57A85C'],
      hills: makeHills(R, [0.52, 0.64, 0.80], [0.08, 0.10, 0.12]),
      house: { u: 0.78 },
      trees: mkTrees(1), flowers: mkFlowers(12),
      cloudsAmt: 0.8,
    },
  ];

  // shared ambience
  world.clouds = Array.from({ length: 4 }, () => ({
    u: R(), y: 0.08 + R() * 0.22, s: 0.7 + R() * 0.9,
    speed: 0.006 + R() * 0.010, ph: R() * 20,
  }));
  world.flies = Array.from({ length: 14 }, () => ({
    u: R(), v: 0.45 + R() * 0.45, ph: R() * 20, sp: 0.4 + R() * 0.8,
  }));
  world.petals = Array.from({ length: 12 }, () => ({
    u: R(), v: R() * 0.8, ph: R() * 20,
    col: pick(PETAL_COLS), s: 0.6 + R() * 0.8,
  }));
  world.rainDrops = Array.from({ length: 80 }, () => ({
    u: R(), v: R(), len: 10 + R() * 14, sp: 0.55 + R() * 0.4,
  }));
  // the firefly swarm (support character) — born when the jar is opened
  world.swarm = Array.from({ length: 8 }, (_, i) => ({
    ph: i * 1.7 + R(), rad: 46 + R() * 46, sp: 0.7 + R() * 0.7, off: R() * 20,
  }));

  if (els.seedNum) els.seedNum.textContent = '#' + String(seed).padStart(5, '0');
}

function bloomForest() {
  if (world.bloomed || typeof millis !== 'function') return;
  world.bloomed = true;
  const R = mulberry32(world.seed * 7919 + 13);
  const sc = world.scenes[4];
  const now = millis();
  for (let i = 0; i < 16; i++) {
    sc.flowers.push({
      u: 0.03 + R() * 0.94, h: 16 + R() * 20,
      col: PETAL_COLS[Math.floor(R() * PETAL_COLS.length)],
      s: 0.9 + R() * 0.8, ph: R() * 10, born: now + i * 90,
    });
  }
  for (let i = 0; i < 6; i++) {
    world.flies.push({ u: R(), v: 0.45 + R() * 0.45, ph: R() * 20, sp: 0.4 + R() * 0.8 });
  }
  for (let i = 0; i < 34; i++) {
    fx.push({
      type: 'petal', x: Math.random() * W, y: -20 - Math.random() * 140,
      vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 50,
      g: 0, life: 4 + Math.random() * 2, t0: millis(),
      col: pick(PETAL_COLS), ph: Math.random() * 10, s: 0.8 + Math.random() * 0.9,
    });
  }
  comic('BLOOM!', W * 0.5, H * 0.3, '#FF8FAB', 44);
}

/* ---------- scene helpers ---------- */

function fadeOf(i) {          // how visible scene i's features are right now
  if (i === world.cur) return world.blend;
  if (i === world.prev) return 1 - world.blend;
  return 0;
}

function advanceScene() {
  world.prev = world.cur;
  world.cur = Math.min(game.idx, world.scenes.length - 1);
  world.blend = 0;
  world.blendT0 = millis();
}

function sceneHillY(si, l, x) {
  const sc = world.scenes[si];
  const h = sc.hills[l];
  const n = noise(x * h.f + h.o, h.o * 0.37 + millis() * h.morph * 0.001);
  let y = H * h.base + (n - 0.5) * 2 * H * h.amp;
  if (l === 2 && sc.gap) y += gapDip(sc.gap, x);
  return y;
}

function gapDip(g, x) {
  const x0 = g.u0 * W, x1 = g.u1 * W;
  if (x <= x0 || x >= x1) return 0;
  const k = (x - x0) / (x1 - x0);
  return g.depth * Math.pow(Math.sin(Math.PI * k), 0.8);
}

function hillY(l, x) {        // blended front-to-back terrain during crossfade
  if (world.prev < 0) return sceneHillY(world.cur, l, x);
  return lerp(sceneHillY(world.prev, l, x), sceneHillY(world.cur, l, x), world.blend);
}
function hillSlope(l, x) { return (hillY(l, x + 3) - hillY(l, x - 3)) / 6; }
function groundY(x) { return hillY(2, x); }
function gapEdgeY(g) { return (sceneHillY(0, 2, g.u0 * W - 4) + sceneHillY(0, 2, g.u1 * W + 4)) / 2; }

/* ---------- hero animation rig ---------- */

function startAnim(name, params, onDone) {
  anim = { name, t0: millis(), params: params || {}, onDone, fired: {} };
  const p = anim.params;
  const g = world.scenes[0].gap;
  const rv = world.scenes[2].river;

  if (name === 'cross') {
    p.u0 = hero.u;
    p.uEdge = g.u0 - 0.02;
    p.uFar = g.u1 + 0.06;
  }
  if (name === 'grab')   { p.u0 = hero.u; }
  if (name === 'ride')   { p.u0 = hero.u; p.uBank = rv.u0 - 0.03; p.uFar = rv.u1 + 0.05; }
  if (name === 'light')  { p.u0 = hero.u; }
  if (name === 'open')   { p.u0 = hero.u; p.uDoor = world.scenes[4].house.u - 0.06; }
  if (name === 'travel') { advanceScene(); p.u0 = hero.u; }
  if (name === 'tumble') {
    p.downDir = hillSlope(2, hero.x) > 0 ? 1 : -1;
    p.u0 = hero.u;
  }
  if (name === 'soggy' || name === 'fizzle' || name === 'startle' || name === 'wobble') p.u0 = hero.u;
  if (name === 'splash') { p.u0 = hero.u; p.uBank = rv.u0 - 0.03; }
}

function once(key) {
  if (anim.fired[key]) return false;
  anim.fired[key] = true; return true;
}

const DURS = {
  pop: 600, cross: 3400, grab: 2200, ride: 4200, light: 2400, open: 3400,
  travel: 1600, tumble: 2900, soggy: 2700, splash: 3400, fizzle: 2700,
  startle: 2700, wobble: 1100, dust: 1200,
};
const dur = n => DURS[n] || 1500;

function updateAnim() {
  if (!anim) return;
  const p = clamp((millis() - anim.t0) / dur(anim.name), 0, 1);
  const P = anim.params;
  const x = hero.x, gy = groundY(x);
  hero.y = gy - 4;
  const g = world.scenes[0].gap;
  const rv = world.scenes[2].river;
  const waterY = H * rv.level;

  switch (anim.name) {

    case 'pop': {                                      // hero-maker boing
      const q = easeOutBack(p);
      hero.sy = lerp(0.2, 1, q); hero.sx = lerp(1.4, 1, q);
      hero.mood = 'happy';
      break;
    }

    case 'travel': {                                   // crossfade + hop to new area
      world.blend = easeInOutQuad(p);
      hero.u = lerp(P.u0, 0.2, easeInOutQuad(p));
      hero.y = gy - Math.abs(Math.sin(p * Math.PI * 2)) * 34;
      hero.mood = 'happy';
      break;
    }

    /* ---------- beat 1: cross the creek ---------- */
    case 'cross': {
      const how = P.conf.how;
      const walkEnd = 0.28, crossEnd = 0.82;
      const topY = gapEdgeY(g);
      if (p < walkEnd) {                               // hop to the bank
        const q = easeInOutQuad(p / walkEnd);
        hero.u = lerp(P.u0, P.uEdge, q);
        hero.y = gy - Math.abs(Math.sin(p * Math.PI * 6)) * 22;
        hero.mood = 'happy';
      } else if (p < crossEnd) {                       // get across (by prop!)
        const q = easeInOutQuad((p - walkEnd) / (crossEnd - walkEnd));
        hero.u = lerp(P.uEdge, P.uFar, q);
        const overGap = hero.u > g.u0 && hero.u < g.u1;
        if (how === 'boat') {                          // float on the creek water
          if (overGap) {
            hero.y = topY + g.depth * 0.62 + Math.sin(q * 14) * 4;
            if (once('row')) comic('ROW ROW!', hero.x, topY - 130, '#5DA9E9', 34);
          } else hero.y = gy - Math.abs(Math.sin(q * Math.PI * 2)) * 16;
        } else if (how === 'swing') {                  // vine pendulum whoosh
          hero.y = overGap ? topY - 6 + Math.sin(q * Math.PI) * 74 : gy - 4;
          hero.rot = Math.cos(q * Math.PI) * 0.35;
          if (once('whee')) comic('WHEEE!', hero.x, topY - 160, '#4FB06D', 40);
        } else if (how === 'stones') {                 // hop stone to stone
          const hops = Math.sin(q * Math.PI * 3);
          hero.y = (overGap ? topY + g.depth * 0.62 - 14 : gy) - Math.abs(hops) * 34;
          if (Math.abs(hops) < 0.1 && once('tap' + Math.floor(q * 3))) spawnPuff(hero.x, hero.y + 40, 2);
        } else {                                       // walk across bridge/log
          hero.y = (overGap ? topY : gy) - 8 - Math.abs(Math.sin(q * Math.PI * 4)) * 12;
        }
        hero.mood = 'happy';
      } else {                                         // land on the far bank
        const q = (p - crossEnd) / (1 - crossEnd);
        hero.u = P.uFar + 0.01;
        hero.y = gy - Math.sin(q * Math.PI) * 40;
        hero.sy = 1 + Math.sin(q * Math.PI) * 0.2;
        if (once('land')) { spawnPuff(hero.x, gy, 5); comic('ACROSS!', hero.x, gy - 150, '#4FB06D', 40); }
      }
      break;
    }

    /* ---------- beat 2: grab cover in the rain ---------- */
    case 'grab': {
      if (p < 0.35) {                                  // joyful hop to grab it
        hero.y = gy - Math.sin((p / 0.35) * Math.PI) * 56;
        hero.mood = 'happy';
      } else {                                         // smug under cover
        hero.sy = 1 + Math.sin(p * Math.PI * 4) * 0.05;
        hero.mood = 'happy';
        if (once('snug')) comic('SNUG!', hero.x, gy - 160, '#5DA9E9', 40);
        if (Math.random() < 0.25) spawnRainPing(hero.x + (Math.random() - 0.5) * 90, hero.y - 96);
      }
      break;
    }

    /* ---------- beat 3: ride the river ---------- */
    case 'ride': {
      const mountAt = 0.2, farAt = 0.85;
      const rideProp = props.find(pr => pr.ride);
      if (p < mountAt) {                               // hop to the bank
        const q = easeInOutQuad(p / mountAt);
        hero.u = lerp(P.u0, P.uBank, q);
        hero.y = gy - Math.abs(Math.sin(p * Math.PI * 4)) * 24;
        hero.mood = 'happy';
      } else if (p < farAt) {                          // ride across the water
        const q = easeInOutQuad((p - mountAt) / (farAt - mountAt));
        hero.u = lerp(P.uBank, P.uFar, q);
        const overWater = hero.u > rv.u0 && hero.u < rv.u1;
        hero.y = overWater
          ? waterY - 52 + Math.sin(q * 16) * 5
          : groundY(hero.x) - 4;
        hero.rot = Math.sin(q * 10) * 0.06;
        if (rideProp) { rideProp.u = hero.u; rideProp.y = hero.y + 44; }
        if (overWater && Math.random() < 0.3) spawnWake(hero.x - 30, waterY + 2);
        if (P.word === 'duck' && once('quack')) comic('QUACK!', hero.x, waterY - 170, '#FFC53D', 42);
        if (P.word === 'unicorn' && once('neigh')) comic('NEIGH!', hero.x, waterY - 170, '#B565D8', 42);
        if (P.word === 'unicorn' && Math.random() < 0.35) spawnSparkle(hero.x - 30, hero.y - 20);
        if (!['duck', 'unicorn'].includes(P.word) && once('whee')) comic('WHEEE!', hero.x, waterY - 170, '#5DA9E9', 40);
        hero.mood = 'happy';
      } else {                                         // dismount on the far bank
        const q = (p - farAt) / (1 - farAt);
        hero.u = P.uFar + 0.02;
        hero.y = gy - Math.sin(q * Math.PI) * 36;
        if (rideProp) rideProp.beached = true;
        if (once('off')) { spawnPuff(hero.x, gy, 5); comic('MADE IT!', hero.x, gy - 150, '#4FB06D', 40); }
      }
      break;
    }

    /* ---------- beat 4: light the cave ---------- */
    case 'light': {
      if (p < 0.25) {                                  // strike it!
        hero.y = gy - Math.sin((p / 0.25) * Math.PI) * 30;
        hero.mood = 'happy';
      } else {
        world.lit = easeOutCubic((p - 0.25) / 0.5);    // glow swells through the dark
        hero.mood = 'happy';
        if (once('glow')) comic('TA-DA!', hero.x, gy - 170, '#FFC53D', 42);
        if (P.conf.swarm && once('free')) comic('the fireflies are free!', hero.x, gy - 200, '#FFE08A', 26);
        if (Math.random() < 0.3) spawnSparkle(hero.x + (Math.random() - 0.5) * 80, hero.y - 60);
      }
      break;
    }

    /* ---------- beat 5: open home ---------- */
    case 'open': {
      const walkEnd = 0.5;
      if (p < walkEnd) {                               // hop to the front door
        const q = easeInOutQuad(p / walkEnd);
        hero.u = lerp(P.u0, P.uDoor, q);
        hero.y = gy - Math.abs(Math.sin(p * Math.PI * 5)) * 22;
        hero.mood = 'happy';
      } else {                                         // the door swings open!
        const q = (p - walkEnd) / (1 - walkEnd);
        world.doorOpen = easeOutCubic(Math.min(q * 1.6, 1));
        hero.y = gy - Math.abs(Math.sin(q * Math.PI * 3)) * 26;
        if (once('home')) {
          comic('HOME!', hero.x, gy - 180, '#FF6B57', 46);
          for (let i = 0; i < 20; i++) spawnConfetti(hero.x + 60, gy - 60);
        }
        hero.mood = 'happy';
      }
      break;
    }

    /* ---------- fail gags ---------- */
    case 'tumble': {                                   // banana-peel classic
      const down = P.downDir;
      if (p < 0.15) {
        hero.u = P.u0 + down * 0.035 * easeOutCubic(p / 0.15);
        hero.rot = -0.3 * down; hero.mood = 'scared';
        if (once('skid')) comic('!!', hero.x, gy - 160, '#FF6B57', 44);
      } else if (p < 0.72) {
        const q = (p - 0.15) / 0.57;
        hero.u = clamp(P.u0 + down * (0.035 + 0.16 * easeInOutQuad(q)), 0.07, 0.93);
        hero.rot = down * q * Math.PI * 4.5;
        hero.y = gy - Math.abs(Math.sin(q * Math.PI * 3)) * 22;
        hero.sx = hero.sy = 1 + Math.sin(q * Math.PI * 6) * 0.08;
        hero.mood = 'dizzy';
        if (Math.random() < 0.3) spawnPuff(hero.x, gy - 6, 1);
      } else if (once('splat')) {
        comic('SPLAT!', hero.x, gy - 150, '#FF6B57', 46);
        spawnPuff(hero.x, gy, 10);
        hero.sy = 0.24; hero.sx = 1.6; hero.rot = 0;
        hero.mood = 'flat'; hero.stars = 1;
        hero.y = gy - 12;
      }
      break;
    }

    case 'soggy': {                                    // soggy bag / toast in the rain
      if (p < 0.2) {
        hero.mood = 'scared';
        hero.rot = Math.sin(p * 40) * 0.1;
        if (once('plop')) comic('PLOP', hero.x, gy - 160, '#8a7457', 38);
      } else if (p < 0.62) {                           // droop… droop…
        const q = (p - 0.2) / 0.42;
        hero.sy = lerp(1, 0.3, easeInOutQuad(q));
        hero.sx = lerp(1, 1.5, easeInOutQuad(q));
        hero.y = gy - 10;
        hero.mood = 'dizzy';
        if (Math.random() < 0.3) spawnRainPing(hero.x + (Math.random() - 0.5) * 70, hero.y - 70);
      } else {
        hero.mood = 'flat'; hero.stars = 1;
        if (once('squelch')) comic('SQUELCH', hero.x, gy - 140, '#5DA9E9', 40);
      }
      break;
    }

    case 'splash': {                                   // rode a TOASTER into the river
      const sinkP = props.find(pr => pr.sinkProp);
      if (p < 0.2) {                                   // hop hopefully toward it
        const q = easeInOutQuad(p / 0.2);
        hero.u = lerp(P.u0, P.uBank, q);
        hero.y = gy - Math.abs(Math.sin(p * Math.PI * 3)) * 22;
        hero.mood = 'happy';
      } else if (p < 0.5) {                            // mount… and GLUG
        const q = (p - 0.2) / 0.3;
        hero.u = P.uBank + 0.02;
        hero.y = lerp(groundY(hero.x) - 4, waterY - 18, easeInOutQuad(q));
        hero.mood = 'scared';
        if (sinkP) { sinkP.sinkY = q * 60; }
        if (once('glug')) {
          comic('GLUG!', hero.x, waterY - 140, '#5DA9E9', 46);
          for (let i = 0; i < 12; i++) spawnSplash(hero.x + (Math.random() - 0.5) * 60, waterY);
        }
        if (Math.random() < 0.6) spawnSplash(hero.x + (Math.random() - 0.5) * 50, waterY);
      } else if (p < 0.8) {                            // scramble back to the bank
        const q = easeInOutQuad((p - 0.5) / 0.3);
        hero.u = lerp(P.uBank + 0.02, P.uBank - 0.05, q);
        hero.y = lerp(waterY - 18, groundY(hero.x) - 4, q);
        hero.rot = Math.sin(p * 30) * 0.15;
        if (Math.random() < 0.4) spawnSplash(hero.x, waterY);
      } else {
        hero.sy = 0.3; hero.sx = 1.5; hero.rot = 0;
        hero.mood = 'flat'; hero.stars = 1;
        if (once('drip')) comic('*drip drip*', hero.x, gy - 140, '#5DA9E9', 30);
      }
      break;
    }

    case 'fizzle': {                                   // soggy match in the dark cave
      if (p < 0.4) {                                   // hopeful spark…
        hero.mood = 'happy';
        if (Math.random() < 0.5) spawnSparkle(hero.x + hero.dir * 40, hero.y - 60);
        if (once('fizz')) comic('fizz… fizz…', hero.x, gy - 150, '#FFC53D', 30);
      } else if (p < 0.55) {                           // PFFFT. out.
        hero.mood = 'scared';
        if (once('pffft')) {
          comic('PFFFT', hero.x, gy - 160, '#8a7457', 42);
          for (let i = 0; i < 6; i++) spawnSteam(hero.x + (Math.random() - 0.5) * 50, gy - 40);
        }
      } else {                                         // faint flat in the dark
        const q = Math.min((p - 0.55) / 0.16, 1);
        hero.rot = lerp(0, hero.dir * 0.5 * Math.PI * 0.92, easeInOutQuad(q));
        hero.sy = lerp(1, 0.3, q); hero.sx = lerp(1, 1.4, q);
        hero.mood = 'flat'; hero.stars = Math.min(1, (p - 0.55) / 0.3);
        hero.y = gy - 8;
      }
      break;
    }

    case 'startle': {                                  // leap back, wobble, faint
      if (p < 0.22) {
        const q = p / 0.22;
        hero.u = P.u0 - hero.dir * 0.045 * Math.sin(q * Math.PI);
        hero.y = gy - Math.sin(q * Math.PI) * 64;
        hero.rot = -0.25 * hero.dir;
        hero.mood = 'scared';
        if (once('eep')) comic('EEEP!', hero.x, gy - 170, '#B565D8', 42);
      } else if (p < 0.55) {
        hero.rot = Math.sin((p - 0.22) * 40) * 0.14;
        hero.mood = 'scared';
      } else {
        const q = Math.min((p - 0.55) / 0.16, 1);
        hero.rot = lerp(0, hero.dir * 0.5 * Math.PI * 0.92, easeInOutQuad(q));
        hero.sy = lerp(1, 0.3, q); hero.sx = lerp(1, 1.4, q);
        hero.mood = 'flat'; hero.stars = Math.min(1, (p - 0.55) / 0.3);
        hero.y = gy - 8;
        if (once('thud')) { spawnPuff(hero.x, gy, 7); comic('THUD', hero.x, gy - 140, '#8a7457', 38); }
      }
      break;
    }

    case 'wobble': {                                   // "is that a word?"
      hero.rot = Math.sin(p * Math.PI * 7) * 0.16 * (1 - p);
      hero.sx = 1 + Math.sin(p * Math.PI * 7) * 0.06 * (1 - p);
      hero.mood = 'scared';
      if (once('huh')) comic('HUH?', hero.x, gy - 150, '#8a7457', 36);
      break;
    }

    case 'dust': {                                     // recover from a fail
      const q = easeOutBack(Math.min(p, 1));
      hero.sy = lerp(0.26, 1, q);
      hero.sx = lerp(1.55, 1, q);
      hero.rot = lerp(hero.rot, 0, 0.2);
      hero.stars = Math.max(0, 1 - p * 1.6);
      hero.mood = p > 0.6 ? 'idle' : 'dizzy';
      if (once('poof')) { spawnPuff(hero.x - 30, gy - 20, 5); spawnPuff(hero.x + 30, gy - 20, 5); }
      if (once('ok')) comic('*dust dust*', hero.x, gy - 150, '#8a7457', 28);
      break;
    }
  }

  if (p >= 1) endAnim();
}

function endAnim() {
  const done = anim.onDone, name = anim.name;
  anim = null;
  if (['tumble', 'soggy', 'splash', 'fizzle', 'startle'].includes(name)) {
    startAnim('dust', {}, done);                       // dust off, THEN call onDone
    return;
  }
  hero.rot = 0; hero.sx = hero.sy = 1;
  hero.stars = 0; hero.mood = 'idle';
  if (done) done();
}

/* ---------- fx particles ---------- */

function spawnPuff(x, y, n) {
  for (let i = 0; i < n; i++) {
    fx.push({ type: 'puff', x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 14,
      vx: (Math.random() - 0.5) * 26, vy: -14 - Math.random() * 20, g: -8,
      life: 0.9 + Math.random() * 0.5, t0: millis(), s: 8 + Math.random() * 14 });
  }
}
function spawnCrumb(x, y) {
  fx.push({ type: 'crumb', x, y, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 40,
    g: 220, life: 0.9, t0: millis(), s: 3 + Math.random() * 3 });
}
function spawnSteam(x, y) {
  fx.push({ type: 'steam', x, y, vx: (Math.random() - 0.5) * 14, vy: -40 - Math.random() * 26,
    g: -6, life: 1.1, t0: millis(), s: 8 + Math.random() * 8 });
}
function spawnSplash(x, y) {
  fx.push({ type: 'splash', x, y, vx: (Math.random() - 0.5) * 70, vy: -60 - Math.random() * 80,
    g: 300, life: 0.8, t0: millis(), s: 3 + Math.random() * 4 });
}
function spawnWake(x, y) {
  fx.push({ type: 'wake', x, y, vx: -14, vy: 0, g: 0, life: 0.9, t0: millis(), s: 6 + Math.random() * 10 });
}
function spawnSparkle(x, y) {
  fx.push({ type: 'sparkle', x, y, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 16,
    g: -2, life: 0.9, t0: millis(), s: 5 + Math.random() * 6 });
}
function spawnRainPing(x, y) {
  fx.push({ type: 'ping', x, y, vx: 0, vy: 0, g: 0, life: 0.5, t0: millis(), s: 6 });
}
function spawnConfetti(x, y) {
  fx.push({ type: 'confetti', x, y, vx: (Math.random() - 0.5) * 120, vy: -80 - Math.random() * 90,
    g: 200, life: 1.4 + Math.random() * 0.6, t0: millis(),
    col: pick(PETAL_COLS), ph: Math.random() * 10, s: 0.7 + Math.random() * 0.7 });
}
function comic(str, x, y, col, size) {
  comics.push({ str, x, y, col, size: size || 36, t0: millis(), life: 1.5, rot: (Math.random() - 0.5) * 0.22 });
}

/* ============================ drawing ============================ */

function setup() {
  cacheEls();
  const c = createCanvas(els.wrap.clientWidth, els.wrap.clientHeight);
  c.parent(els.wrap);
  W = width; H = height;
  regrowForest(Math.floor(Math.random() * 90000) + 1000);
  renderProgress();
  wireMaker();
  wireUi();
}

function windowResized() {
  resizeCanvas(els.wrap.clientWidth, els.wrap.clientHeight);
  W = width; H = height;
  skyBufs = {};
}

function draw() {
  const t = millis() / 1000;
  drawSky();
  drawSunAndClouds(t);
  drawHills(t);
  drawSceneFeatures(t);      // creek water, river, cave mouth, house, rain tint
  updateAnim();
  idlePhysics(t);
  drawProps(t, 'under');     // bridge, rideables, sinking toasters go UNDER Pip
  drawCaveDark(t);           // darkness + lantern glow
  drawHero(t);
  drawProps(t, 'over');      // umbrellas, peels, gag props go OVER Pip
  drawFx(t);
  drawRain(t);               // rain streaks fall over everything
  drawFireflies(t);          // ambient + the firefly-jar swarm
  drawComics(t);
  props = props.filter(pr => millis() - pr.born < pr.life);
}

function drawSky() {
  const drawGrad = (key, cA, cB) => {
    if (!skyBufs[key] || skyBufs[key].width !== W || skyBufs[key].height !== H) {
      const buf = createGraphics(W, H);
      for (let y = 0; y < H; y++) {
        const k = y / H;
        buf.stroke(lerpColor(color(cA), color(cB), Math.pow(k, 1.4)));
        buf.line(0, y, W, y);
      }
      skyBufs[key] = buf;
    }
    return skyBufs[key];
  };
  if (world.prev >= 0) {
    const sP = world.scenes[world.prev], sC = world.scenes[world.cur];
    image(drawGrad('p' + world.prev, sP.skyA, sP.skyB), 0, 0);
    drawingContext.globalAlpha = world.blend;
    image(drawGrad('c' + world.cur, sC.skyA, sC.skyB), 0, 0);
    drawingContext.globalAlpha = 1;
  } else {
    const sC = world.scenes[world.cur];
    image(drawGrad('c' + world.cur, sC.skyA, sC.skyB), 0, 0);
  }
}

function drawSunAndClouds(t) {
  // each scene's sun fades with that scene
  for (const si of [world.prev, world.cur]) {
    if (si < 0) continue;
    const sc = world.scenes[si], f = fadeOf(si);
    if (f <= 0.01) continue;
    drawingContext.globalAlpha = f;
    if (sc.sun) {
      push();
      translate(W * 0.86, H * 0.16);
      rotate(t * 0.06);
      stroke('#F0A63A'); strokeWeight(6); strokeCap(ROUND);
      for (let i = 0; i < 8; i++) { rotate(Math.PI / 4); line(0, 52, 0, 68); }
      noStroke(); fill(sc.sun);
      circle(0, 0, 78);
      fill('#FFE08A'); circle(-10, -10, 40);
      pop();
    }
    // blob clouds, tinted by the scene
    for (const c of world.clouds) {
      const x = (((c.u + t * c.speed) % 1.2) - 0.1) * W;
      const y = c.y * H;
      const w = 74 * c.s, wob = noise(c.ph, t * 0.3) * 8 - 4;
      const cc = sc.name === 'drizzle' ? color(225, 229, 233, 235) : color(255, 253, 246, 235);
      fill(cc); noStroke();
      ellipse(x, y, w * 1.5, w * 0.62 + wob);
      ellipse(x - w * 0.55, y + w * 0.12, w * 0.8, w * 0.45);
      ellipse(x + w * 0.55, y + w * 0.1, w * 0.85, w * 0.5);
      ellipse(x + w * 0.1, y - w * 0.24, w * 0.75, w * 0.5 + wob * 0.6);
    }
    drawingContext.globalAlpha = 1;
  }
}

function drawHills(t) {
  for (let l = 0; l < 3; l++) {
    // layer color crossfades between the two scenes' palettes
    const colA = world.prev >= 0 ? world.scenes[world.prev].hillCols[l] : world.scenes[world.cur].hillCols[l];
    const colB = world.scenes[world.cur].hillCols[l];
    fill(world.prev >= 0 ? lerpColor(color(colA), color(colB), world.blend) : color(colB));
    noStroke();
    beginShape();
    vertex(0, H);
    for (let x = 0; x <= W; x += 14) vertex(x, hillY(l, x));
    vertex(W, H);
    endShape(CLOSE);
    if (l === 1) for (const si of [world.prev, world.cur]) if (si >= 0) drawTrees(si, 1, t);
    if (l === 2) {
      for (const si of [world.prev, world.cur]) if (si >= 0) {
        drawTrees(si, 2, t);
        drawFlowers(si, t);
      }
      drawGrass(t);
    }
  }
}

function drawTrees(si, layer, t) {
  const sc = world.scenes[si], f = fadeOf(si);
  if (f <= 0.01) return;
  drawingContext.globalAlpha = f;
  for (const tr of sc.trees) {
    if (tr.layer !== layer) continue;
    const x = tr.u * W, gy = sceneHillY(si, layer, x), s = tr.s;
    const sway = noise(tr.ph, t * 0.4) * 0.06 - 0.03;
    push();
    translate(x, gy); rotate(sway); scale(s);
    stroke(INK); strokeWeight(4.5); fill('#8A5A3B');
    rect(-9, -64, 18, 66, 8);
    fill(sc.name === 'cave' ? '#4A4468' : '#3E9A5C');
    const wob = noise(tr.ph + 5, t * 0.5) * 6;
    ellipse(0, -96, 92 + wob, 76);
    ellipse(-34, -72, 56, 48);
    ellipse(34, -74, 60, 50);
    ellipse(6, -116, 50, 40);
    if (tr.apples) {
      noStroke(); fill('#FF6B57');
      circle(-18, -86, 11); circle(22, -96, 11); circle(2, -70, 10);
    }
    pop();
  }
  drawingContext.globalAlpha = 1;
}

function drawFlowers(si, t) {
  const sc = world.scenes[si], f = fadeOf(si);
  if (f <= 0.01) return;
  drawingContext.globalAlpha = f;
  for (const fl of sc.flowers) {
    const x = fl.u * W, gy = sceneHillY(si, 2, x);
    let sc2 = fl.s;
    if (fl.born > 0) {
      const k = clamp((millis() - fl.born) / 500, 0, 1);
      if (k <= 0) continue;
      sc2 *= easeOutBack(k);
    }
    push();
    translate(x, gy); scale(sc2);
    rotate(noise(fl.ph, t * 0.6) * 0.14 - 0.07);
    stroke('#2E7D4A'); strokeWeight(3); strokeCap(ROUND);
    line(0, 0, 0, -fl.h);
    translate(0, -fl.h - 4);
    stroke(INK); strokeWeight(2.6); fill(fl.col);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 - Math.PI / 2;
      circle(Math.cos(a) * 7, Math.sin(a) * 7, 9);
    }
    fill('#FFC53D'); circle(0, 0, 7);
    pop();
  }
  drawingContext.globalAlpha = 1;
}

function drawGrass(t) {
  stroke('#2E7D4A'); strokeWeight(3); strokeCap(ROUND); noFill();
  for (let i = 0; i < 9; i++) {
    const x = ((i * 0.121 + world.seed % 7 * 0.03) % 1) * W;
    const gy = hillY(2, x);
    const sw = noise(i * 3.7, t * 0.7) * 4;
    line(x, gy, x - 4 + sw, gy - 12);
    line(x + 5, gy, x + 6 + sw, gy - 16);
    line(x + 10, gy, x + 13 + sw, gy - 11);
  }
}

/* ---------- per-scene signature features ---------- */

function drawSceneFeatures(t) {
  for (const si of [world.prev, world.cur]) {
    if (si < 0) continue;
    const sc = world.scenes[si], f = fadeOf(si);
    if (f <= 0.01) continue;
    if (sc.gap)    drawCreek(sc, si, t, f);
    if (sc.river)  drawRiver(sc, t, f);
    if (sc.cave)   drawCave(sc, si, t, f);
    if (sc.house)  drawHouse(sc, si, t, f);
    if (sc.puddles) drawPuddles(sc, si, t, f);
    if (sc.reeds)  drawReeds(sc, si, t, f);
  }
}

function drawCreek(sc, si, t, f) {
  const g = sc.gap;
  const x0 = g.u0 * W, x1 = g.u1 * W;
  const topY = gapEdgeY(g);
  const wy = topY + g.depth * 0.62;
  drawingContext.globalAlpha = f;
  // shadowed soil inside the notch
  noStroke(); fill(43, 33, 24, 60);
  beginShape();
  for (let x = x0; x <= x1; x += 10) vertex(x, sceneHillY(si, 2, x) - 10);
  for (let x = x1; x >= x0; x -= 10) vertex(x, sceneHillY(si, 2, x) + 4);
  endShape(CLOSE);
  // creek water with a wobbly perlin surface, pooled to the notch floor
  fill('#5DA9E9');
  beginShape();
  for (let x = x0 + 6; x <= x1 - 6; x += 10)
    vertex(x, wy + noise(x * 0.03, t * 0.8) * 8 - 4);
  for (let x = x1 - 6; x >= x0 + 6; x -= 10)
    vertex(x, sceneHillY(si, 2, x) - 2);
  endShape(CLOSE);
  noFill(); stroke('#BFE4FF'); strokeWeight(3);
  for (let i = 0; i < 3; i++) {
    const yy = wy + 6 + i * 8;
    arc(lerp(x0, x1, 0.3 + i * 0.2), yy, 40, 10, 0.15, Math.PI - 0.15);
  }
  drawingContext.globalAlpha = 1;
}

function drawRiver(sc, t, f) {
  const r = sc.river;
  const x0 = r.u0 * W, x1 = r.u1 * W;
  const wy = H * r.level;
  drawingContext.globalAlpha = f;
  // banks
  noStroke(); fill('#E3C98F');
  ellipse(x0, wy + 10, 60, 30); ellipse(x1, wy + 10, 60, 30);
  // the wobbly water body
  fill('#5DA9E9');
  beginShape();
  for (let x = x0; x <= x1; x += 12)
    vertex(x, wy + noise(x * 0.02, t * 0.7) * 10 - 5);
  vertex(x1, H + 10); vertex(x0, H + 10);
  endShape(CLOSE);
  // drifting ripple arcs
  noFill(); stroke('#BFE4FF'); strokeWeight(3); strokeCap(ROUND);
  for (let i = 0; i < 5; i++) {
    const xw = x0 + ((i * 0.23 + t * 0.05) % 1) * (x1 - x0);
    arc(xw, wy + 14 + (i % 3) * 12, 46, 10, 0.15, Math.PI - 0.15);
  }
  drawingContext.globalAlpha = 1;
}

function drawReeds(sc, si, t, f) {
  const r = sc.river;
  drawingContext.globalAlpha = f;
  stroke('#2E7D4A'); strokeWeight(4); strokeCap(ROUND);
  for (const u of [r.u0 - 0.02, r.u1 + 0.015]) {
    for (let i = 0; i < 3; i++) {
      const x = u * W + i * 8 - 8;
      const gy = sceneHillY(si, 2, x);
      const sw = noise(i * 4 + u, t * 0.8) * 6;
      line(x, gy, x + sw, gy - 34 - i * 6);
      noStroke(); fill('#8A5A3B');
      ellipse(x + sw, gy - 38 - i * 6, 7, 18);
      stroke('#2E7D4A');
    }
  }
  noStroke();
  drawingContext.globalAlpha = 1;
}

function drawPuddles(sc, si, t, f) {
  drawingContext.globalAlpha = f * 0.8;
  noStroke(); fill('#7FB6D9');
  for (const u of [0.3, 0.62, 0.85]) {
    const x = u * W, gy = sceneHillY(si, 2, x);
    ellipse(x, gy + 4, 90, 16);
    fill('#BFE4FF'); ellipse(x - 12, gy + 1, 30, 6);
    fill('#7FB6D9');
  }
  drawingContext.globalAlpha = 1;
}

function drawCave(sc, si, t, f) {
  const cx = sc.cave.u * W;
  const gy = sceneHillY(si, 2, cx);
  drawingContext.globalAlpha = f;
  // rocky arch — layered noise-y blobs
  stroke(INK); strokeWeight(5);
  fill('#4A4468');
  ellipse(cx, gy - 90, 260, 240);
  fill('#3B3757');
  ellipse(cx + 10, gy - 70, 170, 170);
  // the black mouth
  noStroke(); fill('#14111F');
  ellipse(cx + 14, gy - 56, 130, 118);
  // chunky rocks sprinkled around
  stroke(INK); strokeWeight(4); fill('#565173');
  for (const off of [-150, -110, 120, 165]) {
    const x = cx + off, yy = sceneHillY(si, 2, x);
    ellipse(x, yy - 8, 46 + (off % 3) * 6, 30);
  }
  drawingContext.globalAlpha = 1;
}

function drawHouse(sc, si, t, f) {
  const hx = sc.house.u * W;
  const gy = sceneHillY(si, 2, hx);
  drawingContext.globalAlpha = f;
  push();
  translate(hx, gy);
  stroke(INK); strokeWeight(5); strokeJoin(ROUND);
  // cottage body + roof
  fill('#FFF3DC'); rect(-70, -110, 140, 112, 8);
  fill('#FF6B57');
  beginShape();
  vertex(-84, -104); vertex(0, -168); vertex(84, -104); endShape(CLOSE);
  // chimney + lazy smoke
  fill('#8A5A3B'); rect(34, -158, 20, 44, 4);
  noStroke(); fill(255, 253, 246, 180);
  const puffT = (t % 3) / 3;
  circle(44, -166 - puffT * 30, 12 + puffT * 10);
  stroke(INK); strokeWeight(4);
  // window
  fill('#FFE08A'); circle(-38, -70, 30);
  line(-38, -85, -38, -55); line(-53, -70, -23, -70);
  // warm light behind the door, revealed as it opens
  noStroke(); fill(255, 197, 61, 200 * world.doorOpen);
  rect(-28, -104, 52, 104, 8);
  // the door itself, swinging on its hinge
  push();
  translate(-26, 0);
  scale(1 - world.doorOpen * 0.92, 1);           // fake hinge swing
  stroke(INK); strokeWeight(4.5); fill('#8A5A3B');
  rect(0, -102, 48, 102, 8);
  noStroke(); fill('#FFC53D'); circle(36, -52, 8);
  pop();
  pop();
  drawingContext.globalAlpha = 1;
}

/* ---------- cave darkness + lantern glow ---------- */

function drawCaveDark(t) {
  let caveFade = 0;
  if (world.prev >= 0 && world.scenes[world.prev].dark) caveFade += 1 - world.blend;
  if (world.scenes[world.cur].dark) caveFade += world.blend;
  if (caveFade <= 0.01) return;
  const dim = caveFade * (1 - world.lit * 0.82);      // light word punches through
  if (dim > 0.02) {
    noStroke(); fill(18, 14, 38, 200 * dim);
    rect(0, 0, W, H);
  }
  if (world.lit > 0.02) {                              // warm glow around the hero
    for (let i = 6; i >= 1; i--) {
      noStroke();
      fill(255, 214, 120, 22 * world.lit);
      circle(hero.x, hero.y - 46, i * 70 * world.lit);
    }
  }
}

/* ---------- props (typed words made real) ---------- */

// props drawn UNDER the hero: things Pip stands/rides on or sinks into
const underProp = pr => pr.ride || pr.sinkProp || pr.how === 'span' || pr.how === 'stones' ||
                        (pr.water && pr.how === 'boat');

function propXY(pr) {
  const g = world.scenes[0].gap;
  const topY = g ? gapEdgeY(g) : 0;
  if (pr.attach === 'over')  return [hero.x, hero.y - 116];
  if (pr.attach === 'hat')   return [hero.x, hero.y - 88];
  if (pr.attach === 'head')  return [hero.x, hero.y - 92 + Math.min(34, (millis() - pr.born) / 8)];
  if (pr.attach === 'hand')  return [hero.x + hero.dir * 46, hero.y - 50];
  if (pr.ride && pr.beached) return [pr.u * W, groundY(pr.u * W) - 8];
  if (pr.ride) {
    const x = pr.u * W;
    return [x, (anim && anim.name === 'ride' && pr.y) ? pr.y - 10 : H * world.scenes[2].river.level - 8];
  }
  if (pr.sinkProp) return [world.scenes[2].river.u0 * W + 20, H * world.scenes[2].river.level - 10 + (pr.sinkY || 0)];
  if (pr.water && pr.how === 'boat' && anim && anim.name === 'cross') return [hero.x, hero.y + 40];
  const x = pr.u * W;
  if (pr.water && pr.how === 'boat') return [x, topY + g.depth * 0.62 - 6];   // floats on the creek
  if (pr.how === 'span')  return [x, topY + 2];                              // lays across the rim
  if (pr.how === 'swing') return [x, topY + g.depth * 0.55];                 // vine hangs into the gap
  if (pr.how === 'stones') return [x, topY + g.depth * 0.62 - 8];            // stones poke out of the water
  return [x, groundY(x)];
}

function drawProps(t, layer) {
  for (const pr of props) {
    if ((layer === 'under') !== underProp(pr)) continue;
    const [x, y] = propXY(pr);
    const popK = easeOutBack(clamp((millis() - pr.born) / 350, 0, 1));
    const fade = (pr.life > 9000 ? 1 : clamp((pr.life - (millis() - pr.born)) / 500, 0, 1))
               * fadeOf(pr.scene);
    if (fade <= 0.01) continue;
    push();
    translate(x, y);
    scale(popK);
    drawingContext.globalAlpha = fade;
    drawPropShape(pr, t);
    drawingContext.globalAlpha = 1;
    pop();
  }
}

function drawPropShape(pr, t) {
  const w = pr.word;
  stroke(INK); strokeWeight(4); strokeJoin(ROUND); strokeCap(ROUND);
  switch (true) {

    /* ===== beat 1 crossing props ===== */
    case w === 'bridge' || w === 'plank' || w === 'board': {
      const g = world.scenes[0].gap;
      const span = (g.u1 - g.u0) * W + 30;
      fill('#8A5A3B'); rect(-span / 2, -14, span, 14, 7);
      fill('#C89B6D');
      for (let i = -2; i <= 2; i++) rect(i * span / 5 - 9, -20, 18, 8, 4);
      noStroke(); fill('#6E452E');
      for (let i = -2; i <= 2; i++) circle(i * span / 5, -7, 3);
      break;
    }
    case w === 'log' && pr.how === 'span': {
      const g = world.scenes[0].gap;
      const span = (g.u1 - g.u0) * W + 26;
      fill('#8A5A3B'); rect(-span / 2, -18, span, 18, 9);
      fill('#C89B6D'); ellipse(-span / 2, -9, 18, 17);
      noFill(); stroke('#6E452E'); strokeWeight(3);
      ellipse(-span / 2, -9, 10, 9);
      break;
    }
    case w === 'vine' || w === 'rope': {
      // hangs from above the gap; Pip swings on it
      noFill(); stroke('#2E7D4A'); strokeWeight(6);
      const sway = Math.sin(t * 1.6) * 0.14;
      const px = Math.sin(sway) * 90;
      beginShape();
      vertex(0, -230);
      quadraticVertex(px * 0.4, -110, px, -8);
      endShape();
      stroke('#4FB06D'); strokeWeight(4);
      line(px - 4, -60, px - 14, -44);
      line(px + 2, -90, px + 16, -76);
      fill('#4FB06D'); noStroke();
      ellipse(px, -4, 22, 12);
      break;
    }
    case (w === 'boat' || w === 'raft') && pr.how === 'boat': {
      fill('#8A5A3B');
      beginShape();
      vertex(-46, -14); vertex(46, -14); vertex(34, 6); vertex(-34, 6);
      endShape(CLOSE);
      fill('#C89B6D'); rect(-38, -18, 76, 7, 4);
      if (w === 'raft') { noFill(); stroke('#6E452E'); for (let i = -1; i <= 1; i++) line(i * 24, -18, i * 24, -11); }
      else { stroke(INK); line(30, -18, 44, -44); line(44, -44, 52, -38); }
      break;
    }
    case w === 'stepping stones' || (w === 'stones' && pr.how === 'stones'): {
      const g = world.scenes[0].gap;
      const x0 = -((g.u1 - g.u0) * W) / 2;
      fill('#9A938A');
      for (let i = 0; i < 3; i++) {
        const sx = x0 + (i + 0.5) * ((g.u1 - g.u0) * W) / 3;
        ellipse(sx, 4, 46, 20);
      }
      noStroke(); fill('#BDB6AC');
      for (let i = 0; i < 3; i++) {
        const sx = x0 + (i + 0.5) * ((g.u1 - g.u0) * W) / 3;
        ellipse(sx - 6, -1, 20, 7);
      }
      break;
    }

    /* ===== beat 2 rain gear ===== */
    case w === 'umbrella': {
      fill('#FF6B57');
      arc(0, 0, 110, 80, Math.PI, 0, CHORD);
      noFill(); stroke(INK); strokeWeight(4);
      for (let i = -2; i <= 2; i++) line(0, -2, i * 27, -36 + Math.abs(i) * 9);
      line(0, -2, 0, 44);
      arc(0, 44, 16, 16, 0, Math.PI);
      fill('#FFC53D'); noStroke(); circle(0, -44, 8);
      break;
    }
    case w === 'leaf umbrella' || w === 'leaf' || w === 'big leaf': {
      fill('#4FB06D');
      push();
      rotate(-0.12);
      ellipse(0, -12, 120, 52);
      stroke('#2E7D4A'); strokeWeight(3.5); noFill();
      line(-56, -12, 56, -12);
      for (let i = -2; i <= 2; i++) line(i * 20, -12, i * 20 + 10, -28);
      pop();
      stroke('#2E7D4A'); strokeWeight(4); noFill();
      line(0, 8, 0, 40);
      break;
    }
    case w === 'newspaper': {
      fill('#FFFDF6');
      push(); rotate(-0.06);
      rect(-52, -10, 104, 26, 4);
      noStroke(); fill('#8a7457');
      for (let i = 0; i < 4; i++) rect(-44, -4 + i * 5, 56, 2.5, 1);
      fill(INK); rect(-44, -8, 30, 4, 2);
      pop();
      break;
    }
    case w === 'mushroom hat' || w === 'mushroom': {
      fill('#FF6B57');
      arc(0, 6, 92, 66, Math.PI, 0, CHORD);
      fill('#FFF3DC'); rect(-26, 4, 52, 10, 5);
      noStroke(); fill('#FFFDF6');
      circle(-20, -16, 12); circle(10, -26, 9); circle(28, -10, 8);
      break;
    }
    case w === 'hat' || w === 'rain hat' || w === 'hood': {
      fill('#FFC53D');
      arc(0, 6, 84, 56, Math.PI, 0, CHORD);
      rect(-50, 2, 100, 10, 5);
      break;
    }

    /* ===== beat 3 rideables ===== */
    case pr.v === 'boat': {
      fill('#8A5A3B');
      beginShape();
      vertex(-58, -16); vertex(58, -16); vertex(42, 10); vertex(-42, 10);
      endShape(CLOSE);
      fill('#C89B6D'); rect(-48, -22, 96, 8, 4);
      stroke(INK); line(0, -22, 0, -66);
      fill('#FF6B57'); triangle(0, -66, 34, -46, 0, -30);
      break;
    }
    case pr.v === 'raft': {
      fill('#8A5A3B');
      for (let i = -1; i <= 1; i++) rect(-50, i * 10 - 4, 100, 9, 4);
      noFill(); stroke('#6E452E'); strokeWeight(3);
      line(-30, -14, -30, 14); line(30, -14, 30, 14);
      break;
    }
    case pr.v === 'duck': {
      // the rideable blob-duck — support character #1
      fill('#FFC53D');
      ellipse(0, -12, 96, 52);
      circle(38, -52, 44);
      fill('#FF9B3D'); ellipse(60, -48, 26, 14);
      noStroke(); fill(INK); circle(44, -58, 5);
      fill('#FFFDF6'); circle(45.5, -60, 2);
      stroke(INK); noFill(); strokeWeight(4);
      arc(-18, -20, 34, 24, Math.PI * 0.15, Math.PI * 0.85);
      fill('#FFC53D'); stroke(INK);
      triangle(-46, -20, -62, -34, -48, -6);      // tail
      break;
    }
    case pr.v === 'unicorn': {
      // rideable unicorn — support character #2
      fill('#FFFDF6');
      ellipse(0, -22, 104, 52);
      ellipse(44, -56, 34, 44);                    // head/chest
      fill('#FF8FAB');                             // mane
      ellipse(28, -66, 18, 46);
      ellipse(44, -84, 22, 16);
      fill('#FFC53D');                             // horn
      triangle(50, -94, 60, -124, 66, -90);
      line(-30, 4, -30, 14); line(30, 4, 30, 14);  // legs (under hero)
      noStroke(); fill(INK); circle(52, -62, 5);
      fill('#B565D8');                             // tail
      ellipse(-54, -30, 16, 34);
      break;
    }
    case pr.v === 'fish': {
      fill('#5DA9E9');
      ellipse(0, -10, 104, 48);
      triangle(-44, -10, -72, -30, -72, 8);
      noStroke(); fill(INK); circle(30, -18, 5);
      noFill(); stroke('#3E7FB8'); strokeWeight(3);
      arc(0, -10, 60, 30, 0.3, Math.PI - 0.3);
      break;
    }
    case pr.v === 'turtle': {
      fill('#2E7D4A'); arc(0, -4, 92, 58, Math.PI, 0, CHORD);
      fill('#4FB06D');
      ellipse(54, -12, 26, 18);
      ellipse(-30, -2, 16, 10); ellipse(30, -2, 16, 10);
      noStroke(); fill('#FFFDF6'); circle(58, -14, 5);
      fill(INK); circle(59, -14, 2.5);
      noFill(); stroke('#1E5631'); strokeWeight(3);
      arc(-16, -16, 22, 16, 0.2, Math.PI - 0.2);
      arc(12, -20, 26, 18, 0.2, Math.PI - 0.2);
      break;
    }
    case pr.v === 'log': {
      fill('#8A5A3B'); rect(-52, -18, 104, 20, 10);
      fill('#C89B6D'); ellipse(-52, -8, 18, 18);
      noFill(); stroke('#6E452E'); strokeWeight(3); ellipse(-52, -8, 9, 9);
      break;
    }
    case pr.v === 'lily': {
      fill('#4FB06D');
      arc(0, 0, 100, 34, 0.1, Math.PI * 1.9, CHORD);
      fill('#FF8FAB');
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        ellipse(Math.cos(a) * 10, -14 + Math.sin(a) * 6, 12, 20);
      }
      fill('#FFC53D'); circle(0, -12, 9);
      break;
    }

    /* ===== beat 4 light props ===== */
    case pr.light === 'lantern': {
      fill('#8A5A3B'); rect(-14, -44, 28, 40, 6);
      noFill(); stroke(INK); arc(0, -44, 22, 18, Math.PI, 0);
      fill(255, 214, 120, 230); ellipse(0, -24, 16, 24);
      noStroke(); fill('#FFE08A'); circle(0, -24, 10);
      break;
    }
    case pr.light === 'torch': {
      fill('#8A5A3B'); rect(-6, -34, 12, 44, 5);
      noStroke();
      const fl = Math.sin(t * 9) * 3;
      fill('#FF6B57'); ellipse(0, -46, 26, 34 + fl);
      fill('#FFC53D'); ellipse(0, -44, 16, 22 + fl);
      fill('#FFF3DC'); ellipse(0, -42, 7, 10);
      break;
    }
    case pr.light === 'candle': {
      fill('#FFF3DC'); rect(-9, -34, 18, 40, 5);
      fill('#FF8FAB'); rect(-9, -20, 18, 6, 3);
      noStroke();
      const fl = Math.sin(t * 9) * 2;
      fill('#FFC53D'); ellipse(0, -44, 12, 20 + fl);
      fill('#FFF3DC'); ellipse(0, -42, 5, 8);
      break;
    }
    case pr.light === 'flashlight': {
      fill('#5DA9E9'); rect(-30, -22, 44, 20, 8);
      fill('#FFC53D'); rect(12, -26, 12, 28, 4);
      noStroke(); fill(255, 214, 120, 140);
      triangle(24, -24, 24, 0, 90, 44);
      break;
    }
    case pr.light === 'match': {
      fill('#C89B6D'); rect(-4, -40, 8, 50, 4);
      noStroke();
      const fl = Math.sin(t * 9) * 2;
      fill('#FF6B57'); ellipse(0, -48, 14, 20 + fl);
      fill('#FFC53D'); ellipse(0, -46, 8, 12);
      break;
    }
    case pr.light === 'sparkler': {
      fill('#8a7457'); rect(-3, -30, 6, 44, 3);
      noStroke(); fill('#FFC53D');
      for (let i = 0; i < 6; i++) {
        const a = t * 3 + i;
        circle(Math.cos(a) * 14, -38 + Math.sin(a * 1.3) * 12, 4);
      }
      fill('#FFF3DC'); circle(0, -36, 7);
      break;
    }
    case pr.light === 'jar' && !pr.attach: {
      // the firefly jar — releases the swarm (support character #3)
      fill(255, 253, 246, 120);
      rect(-26, -52, 52, 56, 10);
      fill('#8A5A3B'); rect(-30, -60, 60, 12, 6);
      noStroke(); fill(255, 214, 120, 220);
      const fl = Math.sin(t * 4) * 4;
      circle(-8, -30, 7 + fl); circle(10, -20, 6 - fl); circle(4, -38, 5);
      // lid tips open as the swarm escapes
      if (world.swarmBorn) {
        stroke(INK); strokeWeight(4); fill('#8A5A3B');
        push(); translate(-30, -60); rotate(-0.5); rect(0, -2, 60, 12, 6); pop();
      }
      break;
    }

    /* ===== beat 5 home props ===== */
    case pr.openWhat === 'key': {
      fill('#FFC53D');
      circle(-20, -56, 26);
      rect(-10, -60, 52, 9, 4);
      rect(30, -51, 8, 10, 2); rect(40, -51, 8, 10, 2);
      noStroke(); fill(INK); circle(-20, -56, 8);
      break;
    }
    case pr.openWhat === 'jar': {
      fill(255, 253, 246, 150);
      rect(-30, -56, 60, 60, 12);
      fill('#B565D8'); rect(-34, -66, 68, 12, 6);
      noStroke(); fill('#C89B6D');
      for (let i = 0; i < 4; i++) circle(-14 + i * 10, -26 - (i % 2) * 14, 14);
      fill('#8A5A3B'); circle(-14, -26, 3); circle(-4, -40, 3); circle(6, -26, 3);
      break;
    }
    case pr.openWhat === 'gate': {
      fill('#C89B6D');
      for (let i = -2; i <= 2; i++) rect(i * 18 - 5, -60, 10, 62, 4);
      rect(-44, -44, 88, 7, 3); rect(-44, -18, 88, 7, 3);
      break;
    }
    case pr.openWhat === 'window': {
      fill('#FFE08A'); rect(-32, -70, 64, 52, 8);
      noFill(); stroke(INK);
      line(0, -70, 0, -18); line(-32, -44, 32, -44);
      break;
    }

    /* ===== silly props (the gags are REAL objects too) ===== */
    case w === 'banana peel' || w === 'banana': {
      fill('#FFC53D');
      arc(0, -2, 56, 30, 0, Math.PI, CHORD);
      triangle(-4, -14, -26, -34, -10, -8);
      triangle(4, -14, 26, -34, 10, -8);
      triangle(-2, -12, -4, -38, 8, -12);
      break;
    }
    case w === 'soap': {
      fill('#BFE4FF'); rect(-34, -22, 68, 22, 10);
      noStroke(); fill('#FFFDF6');
      circle(-14, -30, 12); circle(4, -36, 9); circle(18, -28, 7);
      break;
    }
    case w === 'slime' || w === 'goo': {
      fill('#7ED957'); arc(0, 0, 96, 52, Math.PI, 0, CHORD);
      noStroke(); fill('#A8EC8C');
      ellipse(-16, -14, 26, 14); ellipse(18, -8, 18, 10);
      break;
    }
    case w === 'mud': {
      fill('#8A5A3B'); arc(0, 0, 100, 40, Math.PI, 0, CHORD);
      noStroke(); fill('#6E452E'); ellipse(-10, -8, 44, 12); ellipse(24, -4, 30, 9);
      break;
    }
    case w === 'lava' || w === 'fire': {
      fill('#FF6B57'); arc(0, 0, 100, 44, Math.PI, 0, CHORD);
      noStroke();
      fill('#FFC53D'); triangle(-20, -6, -8, -34, 2, -6);
      fill('#FF9B3D'); triangle(4, -6, 16, -42, 28, -6);
      fill('#FFE08A'); triangle(-4, -6, 4, -24, 12, -6);
      break;
    }
    case w === 'ghost': {
      fill('#FFFDF6');
      const wob = Math.sin(t * 6) * 4;
      beginShape();
      vertex(-26, 0); vertex(-26, -34);
      bezierVertex(-26, -58, 26, -58, 26, -34);
      vertex(26, 0);
      for (let i = 0; i < 4; i++) vertex(26 - 13 * (i + 0.5), -8 - wob * (i % 2 ? 1 : -1));
      endShape(CLOSE);
      noStroke(); fill(INK);
      ellipse(-9, -36, 8, 12); ellipse(9, -36, 8, 12); ellipse(0, -22, 10, 14);
      break;
    }
    case w === 'spider': {
      fill(INK); ellipse(0, -20, 34, 28); circle(0, -38, 18);
      noFill(); stroke(INK); strokeWeight(3.5);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++)
        line(s * 14, -22, s * (30 + i * 6), -30 + i * 10);
      noStroke(); fill('#FFFDF6'); circle(-4, -40, 5); circle(5, -40, 5);
      break;
    }
    case w === 'homework' || w === 'math': {
      fill('#FFFDF6'); rect(-30, -44, 60, 44, 4);
      noStroke(); fill('#8a7457');
      textAlign(CENTER, CENTER); textFont('Patrick Hand'); textSize(15);
      text('1+1=?', 0, -30); text('2+2=?', 0, -14);
      break;
    }
    case w === 'stinky sock' || w === 'sock' || w === 'wet sock': {
      fill('#7CC57C');
      beginShape();
      vertex(-14, -44); vertex(14, -44); vertex(14, -18);
      vertex(30, -8); vertex(24, 0); vertex(-6, 0); vertex(-14, -8);
      endShape(CLOSE);
      noFill(); stroke('#2E7D4A'); strokeWeight(3);
      arc(36, -30, 14, 14, -1.2, 1.2); arc(44, -16, 20, 20, -1.2, 1.2);
      break;
    }
    case w === 'broccoli': {
      fill('#2E7D4A'); rect(-6, -20, 12, 20, 5);
      fill('#4FB06D'); circle(-14, -28, 24); circle(14, -28, 24); circle(0, -38, 28);
      break;
    }
    case w === 'paper bag': {
      fill('#C89B6D');
      push(); rotate(Math.sin(t * 2) * 0.05);
      rect(-30, -52, 60, 54, 6);
      noStroke(); fill('#8a7457');
      rect(-24, -44, 30, 5, 2); rect(-24, -34, 42, 4, 2);
      fill('#A87F54'); rect(-30, -52, 60, 10, 6);   // folded top
      pop();
      break;
    }
    case w === 'toast': {
      fill('#C89B6D');
      beginShape();
      vertex(-26, 0); vertex(-26, -34);
      bezierVertex(-26, -52, 26, -52, 26, -34);
      vertex(26, 0); endShape(CLOSE);
      fill('#E8B45C'); noStroke();
      beginShape();
      vertex(-20, -4); vertex(-20, -32);
      bezierVertex(-20, -44, 20, -44, 20, -32);
      vertex(20, -4); endShape(CLOSE);
      break;
    }
    case w === 'toaster': {
      fill('#9A938A'); rect(-36, -36, 72, 38, 8);
      fill(INK); rect(-22, -40, 44, 6, 3);          // slot
      fill('#C89B6D'); rect(-18, -46, 36, 10, 4);   // toast peeking out
      noStroke(); fill(INK); circle(28, -10, 6);
      break;
    }
    case w === 'fridge': {
      fill('#BFE4FF'); rect(-30, -78, 60, 80, 8);
      noFill(); stroke(INK); line(-30, -46, 30, -46);
      line(22, -70, 22, -54); line(22, -38, 22, -20);
      break;
    }
    case w === 'soggy match': {
      fill('#C89B6D'); rect(-4, -40, 8, 50, 4);
      noStroke(); fill('#8a7457'); ellipse(0, -46, 12, 10);   // dead head, no flame
      noFill(); stroke('#5DA9E9'); strokeWeight(3);
      line(-14, -56, -8, -50); line(14, -58, 8, -50);
      break;
    }
    default: {
      // any other accepted word: a little story tag planted in the scene
      fill('#FFFDF6'); rect(-44, -34, 88, 34, 9);
      noStroke(); fill(INK);
      textAlign(CENTER, CENTER); textFont('Patrick Hand');
      textSize(Math.min(17, 120 / Math.max(w.length, 5)));
      text(w, 0, -18);
      break;
    }
  }
}

/* ---------- Pip: the kid-designed wobble blob ---------- */

function idlePhysics(t) {
  hero.x = hero.u * W;
  hero.lookX = (noise(9.7, t * 0.25) - 0.5) * 2;
  if (!anim) {
    const gy = groundY(hero.x);
    const breathe = Math.sin(t * 1.9) * 0.03;
    hero.sy = 1 + breathe;
    hero.sx = 1 - breathe * 0.7;
    hero.y = gy - 4;
  }
}

function drawHero(t) {
  const x = hero.x, y = hero.y;
  const airK = clamp(1 - (groundY(x) - y) / 120, 0.25, 1);
  noStroke(); fill(43, 33, 24, 34 * airK);
  ellipse(x + 6, groundY(x) + 6, 92 * airK * hero.sx, 18 * airK);

  push();
  translate(x, y);
  rotate(hero.rot);
  scale(hero.sx, hero.sy);

  // squishy body: a circle deformed by 3-D perlin noise — the Squish-o-meter
  // sets heroSpec.squish = how far the noise pushes the outline around
  fill(heroSpec.col); stroke(INK); strokeWeight(5); strokeJoin(ROUND);
  beginShape();
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const r = 46 * (1 + heroSpec.squish * noise(Math.cos(a) * 1.3 + hero.squishSeed,
                                              Math.sin(a) * 1.3 + hero.squishSeed, t * 0.7)
                    - heroSpec.squish * 0.5);
    vertex(Math.cos(a) * r, Math.sin(a) * r * 0.94 - 34);
  }
  endShape(CLOSE);

  // belly patch
  noStroke(); fill(heroSpec.belly);
  ellipse(0, -4, 52, 34);

  drawGear(t);
  drawFace(t);

  // stubby feet
  fill(shade(heroSpec.col)); stroke(INK); strokeWeight(4);
  ellipse(-16, 8, 24, 12);
  ellipse(16, 8, 24, 12);
  pop();

  // dizzy stars after a wipeout
  if (hero.stars > 0.03) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * Math.PI * 2 / 3;
      push();
      translate(x + Math.cos(a) * 46, y - 92 + Math.sin(a) * 14);
      rotate(a * 0.7);
      drawingContext.globalAlpha = hero.stars;
      fill('#FFC53D'); stroke(INK); strokeWeight(2.5);
      star(0, 0, 5, 12, 4);
      pop();
    }
    drawingContext.globalAlpha = 1;
  }
}

function shade(hexCol) {   // slightly darker body color for the feet
  const c = color(hexCol);
  return color(red(c) * 0.78, green(c) * 0.78, blue(c) * 0.78);
}

function drawGear(t) {
  stroke(INK); strokeWeight(4); strokeCap(ROUND);
  const wob = Math.sin(t * 3) * 2;
  switch (heroSpec.gear) {
    case 'sprout':
      noFill(); stroke('#2E7D4A');
      line(0, -76, wob, -94);
      fill('#4FB06D'); noStroke();
      ellipse(wob - 8, -94, 16, 9); ellipse(wob + 8, -96, 16, 9);
      break;
    case 'antennae':
      noFill(); stroke(INK); strokeWeight(3.5);
      line(-14, -72, -22 - wob, -98); line(14, -72, 22 + wob, -98);
      fill('#FFC53D'); stroke(INK); strokeWeight(3);
      circle(-22 - wob, -100, 12); circle(22 + wob, -100, 12);
      break;
    case 'horns':
      fill('#FFC53D'); stroke(INK); strokeWeight(4);
      triangle(-20, -72, -14, -94, -4, -74);
      triangle(20, -72, 14, -94, 4, -74);
      break;
    case 'ears':
      fill(heroSpec.col); stroke(INK); strokeWeight(4);
      push(); translate(-38, -64); rotate(0.5 + wob * 0.02);
      ellipse(0, 0, 20, 36); pop();
      push(); translate(38, -64); rotate(-0.5 - wob * 0.02);
      ellipse(0, 0, 20, 36); pop();
      break;
    case 'bald': default:
      break;
  }
}

function drawFace(t) {
  const m = hero.mood;
  const scared = m === 'scared';
  if (m === 'flat' || m === 'dizzy') {          // X X dizzy eyes + wavy mouth
    stroke(INK); strokeWeight(4); strokeCap(ROUND);
    line(-18, -56, -6, -46); line(-18, -46, -6, -56);
    line(6, -56, 18, -46);  line(6, -46, 18, -56);
    noFill();
    beginShape();
    for (let i = -3; i <= 3; i++) vertex(i * 6, -18 + (i % 2 ? -3 : 3));
    endShape();
    return;
  }
  const px = hero.lookX * 5;
  if (heroSpec.eyes === 'one') {
    fill('#FFFDF6'); stroke(INK); strokeWeight(4.5);
    circle(0, -50, scared ? 42 : 36);
    noStroke(); fill(INK);
    circle(px, -48, scared ? 9 : 12);
    fill('#FFFDF6'); circle(px + 4, -52, 4);
  } else if (heroSpec.eyes === 'two') {
    fill('#FFFDF6'); stroke(INK); strokeWeight(4);
    circle(-15, -50, scared ? 26 : 22);
    circle(15, -50, scared ? 26 : 22);
    noStroke(); fill(INK);
    circle(-15 + px * 0.6, -49, scared ? 7 : 9);
    circle(15 + px * 0.6, -49, scared ? 7 : 9);
    fill('#FFFDF6'); circle(-13 + px * 0.6, -52, 3); circle(17 + px * 0.6, -52, 3);
  } else {                                       // sleepy lids
    fill('#FFFDF6'); stroke(INK); strokeWeight(4);
    circle(-15, -50, 22); circle(15, -50, 22);
    noStroke(); fill(INK);
    circle(-15 + px * 0.5, -47, 8); circle(15 + px * 0.5, -47, 8);
    // droopy lids
    fill(heroSpec.col); stroke(INK); strokeWeight(3.5);
    arc(-15, -50, 24, 24, Math.PI, 0, CHORD);
    arc(15, -50, 24, 24, Math.PI, 0, CHORD);
  }
  // mouth
  noFill(); stroke(INK); strokeWeight(4); strokeCap(ROUND);
  if (scared) {
    fill(INK); ellipse(0, -20, 12, 16);
  } else if (m === 'happy') {
    arc(0, -28, 30, 20, 0.25, Math.PI - 0.25);
    noStroke(); fill('#FFFDF6'); rect(-4, -20, 9, 8, 2);
  } else {
    arc(0, -26, 24, 14, 0.3, Math.PI - 0.3);
  }
  noStroke(); fill(255, 143, 171, 110);
  circle(-28, -34, 12); circle(28, -34, 12);
}

/* ---------- fx, rain, fireflies, comics ---------- */

function drawFx() {
  const now = millis();
  fx = fx.filter(pt => (now - pt.t0) / 1000 < pt.life);
  for (const pt of fx) {
    const age = (now - pt.t0) / 1000;
    const k = age / pt.life;
    const dt = 1 / 60;
    pt.vy += pt.g * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    push();
    translate(pt.x, pt.y);
    if (pt.type === 'puff' || pt.type === 'steam') {
      noStroke();
      fill(pt.type === 'steam' ? color(200, 220, 230, 200 * (1 - k))
                               : color(230, 220, 200, 190 * (1 - k)));
      circle(0, 0, pt.s * (1 + k * 1.6));
    } else if (pt.type === 'crumb') {
      noStroke(); fill(200, 155, 109, 255 * (1 - k));
      circle(0, 0, pt.s * 2);
    } else if (pt.type === 'splash') {
      noStroke(); fill(93, 169, 233, 230 * (1 - k));
      circle(0, 0, pt.s * 2);
    } else if (pt.type === 'wake') {
      noFill(); stroke(191, 228, 255, 200 * (1 - k)); strokeWeight(3);
      arc(0, 0, pt.s * (1 + k * 2.4), pt.s * 0.5, 0.2, Math.PI - 0.2);
    } else if (pt.type === 'sparkle') {
      rotate(age * 4);
      noStroke(); fill(255, 197, 61, 240 * (1 - k));
      star(0, 0, pt.s * 0.4, pt.s, 4);
    } else if (pt.type === 'ping') {
      noFill(); stroke(191, 228, 255, 220 * (1 - k)); strokeWeight(2.5);
      arc(0, 0, pt.s * (1 + k * 2), pt.s * 0.6, Math.PI, 0);
    } else if (pt.type === 'confetti' || pt.type === 'petal') {
      rotate(age * 3 + pt.ph);
      noStroke(); fill(pt.col); drawingContext.globalAlpha = 1 - k;
      ellipse(0, 0, 11 * pt.s, 7 * pt.s);
      drawingContext.globalAlpha = 1;
    }
    pop();
  }
}

function drawRain(t) {
  // drizzle only in the rainy scene, fading with it
  const sc = world.scenes[world.cur];
  let rainAmt = 0;
  if (world.prev >= 0 && world.scenes[world.prev].rain) rainAmt += 1 - world.blend;
  if (sc.rain) rainAmt += world.blend;
  if (rainAmt <= 0.02) return;
  drawingContext.globalAlpha = rainAmt;
  // grey wash + streaks
  noStroke(); fill(160, 175, 190, 26 * rainAmt);
  rect(0, 0, W, H);
  stroke(150, 180, 205, 170); strokeWeight(2.5); strokeCap(ROUND);
  for (const d of world.rainDrops) {
    const x = d.u * W;
    const y = ((d.v + t * d.sp) % 1.05) * H;
    line(x, y, x - 3, y + d.len);
  }
  drawingContext.globalAlpha = 1;
}

function drawFireflies(t) {
  // ambient drifting petals
  for (const pt of world.petals) {
    const drift = noise(pt.ph, t * 0.12) - 0.5;
    const x = (((pt.u + t * 0.012 + drift * 0.1) % 1.1) - 0.05) * W;
    const y = (((pt.v + t * 0.015) % 1.05)) * H * 0.9 + H * 0.05;
    push();
    translate(x, y); rotate(t * 0.8 + pt.ph);
    noStroke(); fill(pt.col + '');
    drawingContext.globalAlpha = 0.75;
    ellipse(0, 0, 9 * pt.s, 6 * pt.s);
    drawingContext.globalAlpha = 1;
    pop();
  }
  // ambient fireflies pulsing over the grass
  for (const f of world.flies) {
    const x = ((f.u + noise(f.ph, t * 0.1 * f.sp) * 0.3 - 0.15) % 1) * W;
    const y = H * f.v + (noise(f.ph + 9, t * 0.3) - 0.5) * 70;
    const glow = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 * f.sp + f.ph));
    noStroke();
    fill(255, 224, 138, 60 * glow); circle(x, y, 14);
    fill(255, 197, 61, 230 * glow); circle(x, y, 5.5);
  }
  // the swarm: once the jar is opened, these follow the hero forever
  if (world.swarmBorn) {
    const since = (millis() - world.swarmBorn) / 1000;
    for (const s of world.swarm) {
      const gather = easeOutCubic(clamp(since / 2 - s.off * 0.03, 0, 1));
      // from the jar spot -> orbiting the hero
      const jx = hero.x + 60, jy = hero.y - 40;
      const ox = hero.x + Math.cos(t * s.sp + s.ph) * s.rad;
      const oy = hero.y - 50 + Math.sin(t * s.sp * 1.3 + s.ph) * (s.rad * 0.5);
      const x = lerp(jx, ox, gather), y = lerp(jy, oy, gather);
      const glow = 0.5 + 0.5 * Math.sin(t * 3 * s.sp + s.ph);
      noStroke();
      fill(255, 224, 138, 90 * glow); circle(x, y, 18);
      fill(255, 197, 61, 250 * glow); circle(x, y, 7);
    }
  }
}

function drawComics() {
  const now = millis();
  comics = comics.filter(c => (now - c.t0) / 1000 < c.life);
  for (const c of comics) {
    const age = (now - c.t0) / 1000;
    const popK = easeOutBack(clamp(age / 0.28, 0, 1));
    const fadeK = clamp((c.life - age) / 0.4, 0, 1);
    push();
    translate(c.x, c.y - age * 26);
    rotate(c.rot);
    scale(popK);
    drawingContext.globalAlpha = fadeK;
    textAlign(CENTER, CENTER);
    textFont('Fredoka'); textStyle(BOLD); textSize(c.size);
    stroke('#FFFDF6'); strokeWeight(8); fill(c.col);
    text(c.str, 0, 0);
    noStroke(); fill(c.col);
    text(c.str, 0, 0);
    pop();
  }
  drawingContext.globalAlpha = 1;
  textStyle(NORMAL);
}

function star(x, y, r1, r2, n) {
  beginShape();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r2 : r1;
    const a = (i * Math.PI) / n - Math.PI / 2;
    vertex(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  endShape(CLOSE);
}

/* ============================ UI wiring ============================ */

function wireUi() {
  els.tellBtn.addEventListener('click', () => submitWord());
  els.forestBtn.addEventListener('click', () => {
    regrowForest(Math.floor(Math.random() * 90000) + 1000);
    resetChapter(game.phase === 'maker');
    comic('new forest!', W * 0.5, H * 0.3, '#4FB06D', 40);
  });
  els.demoBtn.addEventListener('click', runDemo);       // toggles play/stop
  els.againBtn.addEventListener('click', () => resetChapter(true));   // new chapter: back to the maker
  els.bloomBtn.addEventListener('click', () => {
    regrowForest(Math.floor(Math.random() * 90000) + 1000);
    resetChapter(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (location.hash === '#demo') setTimeout(() => { if (!game.auto) runDemo(); }, 1200);
}

/* ---------- p5 fallback: if the CDN didn't load ---------- */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof p5 === 'undefined') {
      cacheEls();
      els.noP5.hidden = false;
      const s = $('seedNum'); if (s) s.textContent = '#zzz';
    }
  }, 2500);
});
