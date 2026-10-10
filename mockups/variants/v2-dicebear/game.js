/* ============================================================
   Fill the Tale — Monster Maker edition
   Engine: vendored DiceBear (@dicebear/core + @dicebear/bottts)
   The hero + every "pal" are procedural avatars: same seed =
   same monster. The world is a paper-craft sticker diorama and
   every typed word spawns a real SVG prop (or a real monster).
   ============================================================ */
import { PROPS, PAL_ACC } from './props.js';

/* ---------- DiceBear (dynamic import → graceful failure) ---------- */
let DB = null;
try {
  const core = await import('@dicebear/core');
  const bottts = await import('@dicebear/bottts');
  DB = { createAvatar: core.createAvatar, style: bottts };
} catch (err) {
  console.error('DiceBear failed to load:', err);
}

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const diorama = $('diorama'), propLayer = $('propLayer'), caveDark = $('caveDark');
const heroWrap = $('heroWrap'), heroEl = $('hero'), speechEl = $('speech');
const nameInput = $('nameInput'), surpriseBtn = $('surpriseBtn'), seedNote = $('seedNote');
const beatTag = $('beatTag'), sentPre = $('sentPre'), sentPost = $('sentPost');
const blankInput = $('blankInput'), goBtn = $('goBtn'), demoBtn = $('demoBtn');
const feedbackEl = $('feedback'), dymZone = $('dymZone');
const storyLines = $('storyLines'), gemRow = $('gemRow');
const ending = $('ending'), endGem = $('endGem'), endSub = $('endSub');
const wordRecap = $('wordRecap'), sillyRecap = $('sillyRecap');
const sigAvatar = $('sigAvatar'), sigName = $('sigName'), againBtn = $('againBtn');

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const stripArt = (w) => w.replace(/^(a|an|the|some|my|one|two|three)\s+/, '');
const W = () => diorama.clientWidth;
const H = () => diorama.clientHeight;
const rand = (a) => a[Math.floor(Math.random() * a.length)];

function lev(a, b) {                 // edit distance — for "did you mean…?"
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

const MASH = ['asdf','asdfg','asdfgh','asdfghjkl','qwerty','qwertyuiop','zxcv','zxcvbn',
  'zxcvbnm','xyz','poiuy','lkjh','hjkl','mnbv','qaz','wsx','edc','rfv','tgb','yhn','ujm',
  'abcde','abcdef','test','blah','aaaa','pppp','jkl','fdsa','qazwsx'];
function isWordLike(w) {
  if (!/^[a-z]+([ '-][a-z]+)*$/i.test(w)) return false;
  if (w.length < 2 || w.length > 24) return false;
  if (!/[aeiouy]/i.test(w)) return false;
  if (/(.)\1\1/i.test(w)) return false;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(w)) return false;
  if (MASH.includes(w)) return false;
  return true;
}

/* Look a word up in a beat table: exact, de-articled, singular. */
function lookup(word, table) {
  const clean = stripArt(word);
  const sing = clean.replace(/s$/, '');
  for (const [key, def] of Object.entries(table)) {
    if (clean === key || sing === key ||
        clean.endsWith(' ' + key) || sing.endsWith(' ' + key)) {
      return { key, def };
    }
  }
  return null;
}

/* ---------- maker option chips ---------- */
const BODY_COLORS = [
  ['ff6b57', 'Coral'], ['ffc53d', 'Sunny'], ['4fb06d', 'Leafy'],
  ['5da9e9', 'Sky'], ['b565d8', 'Berry'], ['00acc1', 'Teal'],
];
const OPTS = {
  eyes: [['bulging','Googly'],['happy','Happy'],['glow','Glowy'],['hearts','Hearts'],
         ['dizzy','Dizzy'],['shade01','Cool'],['round','Round'],['robocop','Robo']],
  top: [['antenna','Antenna'],['antennaCrooked','Wonky'],['horns','Horns'],['bulb01','Bulb'],
        ['glowingBulb01','Glowbulb'],['radar','Radar'],['lights','Lights'],['pyramid','Pyramid']],
  mouth: [['smile01','Smile'],['smile02','Big grin'],['bite','Chomp'],['grill01','Grill'],
          ['grill03','Robo'],['square01','Square']],
};
const MONSTER_NAMES = ['Pip','Ziggy','Beans','Noodle','Pickle','Momo','Sprout','Waffles',
  'Bongo','Pesto','Squiggle','Mochi','Zuzu','Crumb','Fig','Puddles'];

/* ---------- pals: generated DiceBear support characters ---------- */
const PAL_DEFS = {
  duck:    { base: 'ffc53d', eyes: ['happy'],   top: ['antenna'],        acc: 'beak'  },
  unicorn: { base: 'b565d8', eyes: ['happy'],   top: ['antenna'],        acc: 'horn'  },
  fish:    { base: '5da9e9', eyes: ['round'],   top: ['antennaCrooked'], acc: 'fin'   },
  turtle:  { base: '4fb06d', eyes: ['round'],   top: ['bulb01'],         acc: 'shell' },
  dragon:  { base: '4fb06d', eyes: ['glow'],    top: ['horns'],          acc: null    },
  firefly: { base: '546e7a', eyes: ['glow'],    top: ['glowingBulb01'],  acc: 'glow'  },
  any:     { base: null,     eyes: ['happy','round','bulging'], top: null, acc: 'floatRing' },
  huh:     { base: 'c9cfd6', eyes: ['dizzy','roundFrame01','sensor'], top: ['antennaCrooked'], acc: 'question' },
};
const PALETTE = BODY_COLORS.map(([c]) => c);

function seedColor(seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function avatar(opts) {
  return DB.createAvatar(DB.style, {
    topProbability: 100, sidesProbability: 100, mouthProbability: 100,
    ...opts,
  }).toString();
}
function heroSvg() {
  const opts = { seed: S.seed };
  opts.baseColor = S.picks.color ? [S.picks.color] : PALETTE;
  if (S.picks.eyes)  opts.eyes  = [S.picks.eyes];
  if (S.picks.top)   opts.top   = [S.picks.top];
  if (S.picks.mouth) opts.mouth = [S.picks.mouth];
  return avatar(opts);
}
function palSvg(word) {
  const def = PAL_DEFS[word] || PAL_DEFS.any;
  const opts = {
    seed: 'pal-' + word,
    baseColor: [def.base || seedColor('pal-' + word)],
    eyes: def.eyes || ['happy'],
    mouth: ['smile01'],
  };
  if (def.top) opts.top = def.top;
  if (def.acc === 'floatRing') opts.sides = ['round', 'square'];
  return avatar(opts);
}

/* ---------- state ---------- */
const S = {
  seed: 'monster-pip',
  name: 'Pip',
  hatched: false,
  picks: { color: null, eyes: null, top: null, mouth: null },
  bootSeed: 'monster-' + Math.random().toString(36).slice(2, 8),
  beat: 0, busy: false,
  pending: null,                  // word a fast typist queued mid-animation
  hx: 0, hy: 26,
  chosen: [], sillyWords: [],
  demo: false, demoStop: false,
};
window.S = S;                     // handy for debugging / tests
const GROUND = 26;

/* ============================================================
   THE JOURNEY — five beats, each with a word-reaction table.
   sensible: prop/pal spawns → success → story advances.
   silly:    a REAL prop spawns → comedy gag → try again.
   ============================================================ */
const BEATS = [
  {
    id: 'path', area: 'path', tag: 'beat 1 · the blocked path',
    pre: (n) => `${n} needs to get through the forest! But the path is blocked — ${n} needs a`,
    post: 'to cross.',
    hint: 'Try: bridge · log · vine · ladder · trampoline',
    sensible: {
      'bridge':          { prop: 'bridge', x: .24, b: .07, w: 280, act: 'cross' },
      'log':             { prop: 'log', x: .36, b: .16, w: 175, act: 'cross' },
      'plank':           { prop: 'plank', x: .37, b: .26, w: 175, act: 'cross', rot: -7 },
      'vine':            { prop: 'vine', x: .47, b: .36, w: 84, act: 'swing' },
      'rope':            { prop: 'vine', x: .47, b: .36, w: 84, act: 'swing' },
      'ladder':          { prop: 'ladder', x: .45, b: .09, w: 95, act: 'cross', rot: -7 },
      'tunnel':          { prop: 'tunnel', x: .40, b: .07, w: 155, act: 'cross' },
      'stepping stones': { prop: 'stones', x: .32, b: .09, w: 230, act: 'hop' },
      'stones':          { prop: 'stones', x: .32, b: .09, w: 230, act: 'hop' },
      'trampoline':      { prop: 'trampoline', x: .33, b: .07, w: 165, act: 'bounce' },
    },
    silly: {
      'banana peel': { prop: 'bananaPeel', gag: 'slip' },
      'banana':      { prop: 'bananaPeel', gag: 'slip' },
      'soap':        { prop: 'soap', gag: 'slip' },
      'ice':         { prop: 'iceCube', gag: 'slip' },
      'ice cube':    { prop: 'iceCube', gag: 'slip' },
      'butter':      { prop: 'slimeBlob', gag: 'slip' },
      'grease':      { prop: 'slimeBlob', gag: 'slip' },
      'slime':       { prop: 'slimeBlob', gag: 'stick' },
      'glue':        { prop: 'gluePuddle', gag: 'stick' },
      'mud':         { prop: 'slimeBlob', gag: 'stick' },
    },
    yay: ['Over we go!', 'Made it across!', 'Easy peasy!'],
  },
  {
    id: 'rain', area: 'rain', tag: 'beat 2 · the rainstorm',
    pre: (n) => `Oh no, it started to rain! ${n} grabs a`,
    post: '.',
    hint: 'Try: umbrella · raincoat · leaf · mushroom',
    sensible: {
      'umbrella':  { prop: 'umbrella', dx: -.03, dy: .40, w: 155, act: 'cover' },
      'raincoat':  { prop: 'raincoat', dx: -.02, dy: .10, w: 115, act: 'cover' },
      'hat':       { prop: 'hat', dx: .01, dy: .40, w: 130, act: 'cover' },
      'rain hat':  { prop: 'hat', dx: .01, dy: .40, w: 130, act: 'cover' },
      'leaf':      { prop: 'leaf', dx: -.01, dy: .40, w: 125, act: 'cover' },
      'newspaper': { prop: 'newspaper', dx: -.02, dy: .42, w: 140, act: 'cover' },
      'paper':     { prop: 'newspaper', dx: -.02, dy: .42, w: 140, act: 'cover' },
      'mushroom':  { prop: 'mushroom', dx: -.02, dy: .34, w: 125, act: 'cover' },
      'toadstool': { prop: 'mushroom', dx: -.02, dy: .34, w: 125, act: 'cover' },
      'bucket':    { prop: 'bucket', dx: .0, dy: .36, w: 110, act: 'cover' },
      'pail':      { prop: 'bucket', dx: .0, dy: .36, w: 110, act: 'cover' },
      'tent':      { prop: 'umbrella', dx: -.03, dy: .40, w: 155, act: 'cover' },
    },
    silly: {
      'paper bag':     { prop: 'paperBag', gag: 'soggy' },
      'bag':           { prop: 'paperBag', gag: 'soggy' },
      'toast':         { prop: 'toast', gag: 'soggy' },
      'box':           { prop: 'soggyBox', gag: 'soggy' },
      'cardboard box': { prop: 'soggyBox', gag: 'soggy' },
      'cardboard':     { prop: 'soggyBox', gag: 'soggy' },
      'sponge':        { prop: 'sponge', gag: 'soggy' },
      'sugar':         { prop: 'soggyBox', gag: 'soggy' },
    },
    yay: ['Nice and dry!', 'Rain? What rain?', 'Cozy!'],
  },
  {
    id: 'river', area: 'river', tag: 'beat 3 · the wide river',
    pre: (n) => `A wide river! ${n} rides the`,
    post: 'across.',
    hint: 'Try: boat · duck · unicorn · raft · fish',
    sensible: {
      'boat':      { prop: 'boat', x: .05, b: .09, w: 175, seat: 66 },
      'sailboat':  { prop: 'boat', x: .05, b: .09, w: 175, seat: 66 },
      'rowboat':   { prop: 'boat', x: .05, b: .09, w: 175, seat: 66 },
      'ship':      { prop: 'boat', x: .05, b: .09, w: 175, seat: 66 },
      'raft':      { prop: 'raft', x: .06, b: .10, w: 155, seat: 40 },
      'canoe':     { prop: 'canoe', x: .05, b: .11, w: 165, seat: 34 },
      'kayak':     { prop: 'canoe', x: .05, b: .11, w: 165, seat: 34 },
      'log':       { prop: 'log', x: .06, b: .12, w: 155, seat: 44 },
      'plank':     { prop: 'plank', x: .06, b: .14, w: 165, seat: 20 },
      'surfboard': { prop: 'surfboard', x: .06, b: .13, w: 165, seat: 20 },
      'surf board':{ prop: 'surfboard', x: .06, b: .13, w: 165, seat: 20 },
      'lily pad':  { prop: 'lilypad', x: .07, b: .11, w: 125, seat: 38 },
      'lilypad':   { prop: 'lilypad', x: .07, b: .11, w: 125, seat: 38 },
      'duck':      { pal: 'duck', seat: 86 },
      'unicorn':   { pal: 'unicorn', seat: 92 },
      'fish':      { pal: 'fish', seat: 74 },
      'big fish':  { pal: 'fish', seat: 74 },
      'turtle':    { pal: 'turtle', seat: 68 },
      'tortoise':  { pal: 'turtle', seat: 68 },
      'dragon':    { pal: 'dragon', seat: 88 },
    },
    /* any other animal word also spawns a pal — checked in code */
    silly: {
      'toaster':      { prop: 'toaster', gag: 'splash' },
      'fridge':       { prop: 'fridge', gag: 'splash' },
      'refrigerator': { prop: 'fridge', gag: 'splash' },
      'rock':         { prop: 'rock', gag: 'splash' },
      'stone':        { prop: 'rock', gag: 'splash' },
      'boulder':      { prop: 'rock', gag: 'splash' },
      'anchor':       { prop: 'anchor', gag: 'splash' },
      'piano':        { prop: 'piano', gag: 'splash' },
      'anvil':        { prop: 'anvil', gag: 'splash' },
      'brick':        { prop: 'brick', gag: 'splash' },
      'bricks':       { prop: 'brick', gag: 'splash' },
      'tv':           { prop: 'tv', gag: 'splash' },
      'television':   { prop: 'tv', gag: 'splash' },
      'computer':     { prop: 'tv', gag: 'splash' },
      'safe':         { prop: 'anvil', gag: 'splash' },
    },
    yay: ['All aboard!', 'Smooth sailing!', 'What a ride!'],
  },
  {
    id: 'cave', area: 'cave', tag: 'beat 4 · the dark cave',
    pre: (n) => `The cave is dark! ${n} lights a`,
    post: 'to see inside.',
    hint: 'Try: lantern · torch · firefly · flashlight',
    sensible: {
      'lantern':      { prop: 'lantern', dx: .15, dy: .05, w: 85, light: true },
      'torch':        { prop: 'torch', dx: .14, dy: .08, w: 62, light: true },
      'candle':       { prop: 'candle', dx: .15, dy: .05, w: 60, light: true },
      'flashlight':   { prop: 'flashlight', dx: .13, dy: .14, w: 120, light: true },
      'lamp':         { prop: 'lamp', dx: .15, dy: .03, w: 85, light: true },
      'match':        { prop: 'match', dx: .14, dy: .05, w: 45, light: true },
      'matches':      { prop: 'match', dx: .14, dy: .05, w: 45, light: true },
      'glowstick':    { prop: 'glowstick', dx: .13, dy: .10, w: 85, light: true },
      'glow stick':   { prop: 'glowstick', dx: .13, dy: .10, w: 85, light: true },
      'lightbulb':    { prop: 'bulbProp', dx: .14, dy: .10, w: 70, light: true },
      'light bulb':   { prop: 'bulbProp', dx: .14, dy: .10, w: 70, light: true },
      'bulb':         { prop: 'bulbProp', dx: .14, dy: .10, w: 70, light: true },
      'star':         { prop: 'starProp', dx: .14, dy: .26, w: 85, light: true },
      'firefly':      { pal: 'firefly', light: true },
      'fireflies':    { pal: 'firefly', light: true },
      'lightning bug':{ pal: 'firefly', light: true },
    },
    silly: {
      'ice cube':     { prop: 'iceCube', gag: 'fizzle' },
      'ice':          { prop: 'iceCube', gag: 'fizzle' },
      'snowball':     { prop: 'snowball', gag: 'fizzle' },
      'snow':         { prop: 'snowball', gag: 'fizzle' },
      'soggy match':  { prop: 'match', gag: 'fizzle' },
      'wet match':    { prop: 'match', gag: 'fizzle' },
      'wet noodle':   { prop: 'wetNoodle', gag: 'fizzle' },
      'noodle':       { prop: 'wetNoodle', gag: 'fizzle' },
      'spaghetti':    { prop: 'wetNoodle', gag: 'fizzle' },
    },
    yay: ['Let there be light!', 'Much better!', 'I can see!'],
  },
  {
    id: 'home', area: 'home', tag: 'beat 5 · home sweet home',
    pre: (n) => `Home at last! ${n} opens the`,
    post: '.',
    hint: 'Try: door · key · cookie jar · gift',
    sensible: {
      'door':           { door: true },
      'front door':     { door: true },
      'key':            { prop: 'key', pay: 'key' },
      'cookie jar':     { prop: 'cookieJar', pay: 'pop', pop: 'cookie' },
      'cookiejar':      { prop: 'cookieJar', pay: 'pop', pop: 'cookie' },
      'jar of cookies': { prop: 'cookieJar', pay: 'pop', pop: 'cookie' },
      'mailbox':        { prop: 'mailbox', pay: 'swing' },
      'mail box':       { prop: 'mailbox', pay: 'swing' },
      'gate':           { prop: 'gate', pay: 'swing' },
      'treasure chest': { prop: 'chest', pay: 'pop', pop: 'gem' },
      'chest':          { prop: 'chest', pay: 'pop', pop: 'gem' },
      'treasure':       { prop: 'chest', pay: 'pop', pop: 'gem' },
      'gift':           { prop: 'gift', pay: 'pop', pop: 'confetti' },
      'present':        { prop: 'gift', pay: 'pop', pop: 'confetti' },
    },
    silly: {
      'pickle jar':  { prop: 'pickleJar', gag: 'strain' },
      'pickles':     { prop: 'pickleJar', gag: 'strain' },
      'pickle':      { prop: 'pickleJar', gag: 'strain' },
      'glue':        { prop: 'gluePuddle', gag: 'stick' },
      'super glue':  { prop: 'gluePuddle', gag: 'stick' },
      'brick wall':  { prop: 'brick', gag: 'bonk' },
      'wall':        { prop: 'brick', gag: 'bonk' },
    },
    yay: ['Home sweet home!', 'We made it!', 'Ta-daa!'],
  },
];

/* Silly words that work in ANY beat — kids will try these everywhere. */
const GLOBAL_SILLY = {
  'poop':       { prop: 'stinkCloud', gag: 'eww' },
  'poopy':      { prop: 'stinkCloud', gag: 'eww' },
  'fart':       { prop: 'stinkCloud', gag: 'eww' },
  'booger':     { prop: 'stinkCloud', gag: 'eww' },
  'toilet':     { prop: 'stinkCloud', gag: 'eww' },
  'diaper':     { prop: 'stinkCloud', gag: 'eww' },
  'underwear':  { prop: 'stinkCloud', gag: 'eww' },
  'undies':     { prop: 'stinkCloud', gag: 'eww' },
  'sock':       { prop: 'stinkCloud', gag: 'eww' },
  'stinky sock':{ prop: 'stinkCloud', gag: 'eww' },
  'garbage':    { prop: 'stinkCloud', gag: 'eww' },
  'trash':      { prop: 'stinkCloud', gag: 'eww' },
  'skunk':      { prop: 'stinkCloud', gag: 'eww' },
  'burp':       { prop: 'stinkCloud', gag: 'eww' },
  'ghost':      { prop: 'ghostProp', gag: 'spook' },
  'spider':     { prop: 'ghostProp', gag: 'spook' },
  'zombie':     { prop: 'ghostProp', gag: 'spook' },
  'skeleton':   { prop: 'ghostProp', gag: 'spook' },
  'bat':        { prop: 'ghostProp', gag: 'spook' },
  'vampire':    { prop: 'ghostProp', gag: 'spook' },
  'mummy':      { prop: 'ghostProp', gag: 'spook' },
  'witch':      { prop: 'ghostProp', gag: 'spook' },
};

/* Animal words that spawn a generic monster pal in the river beat. */
const ANIMAL_WORDS = new Set(['whale','shark','dolphin','swan','frog','pony','horse',
  'seahorse','sea horse','otter','penguin','dinosaur','dino','seal','goose','cat','dog',
  'cow','pig','sheep','goat','llama','bear','bird','moose','beaver','snake','eel',
  'crocodile','alligator','hippo','octopus','squid','crab','whale shark','goldfish',
  'tadpole','newt','axolotl','narwhal','kraken','sea monster','monster']);

const START_X = () => W() * .09;
const FAR_X   = () => W() * .72;

/* ============================================================
   hero placement & travel (hero-wrap positioned in px)
   ============================================================ */
function heroHome(x = START_X(), y = GROUND) {
  S.hx = x; S.hy = y;
  heroWrap.style.left = x + 'px';
  heroWrap.style.bottom = y + 'px';
  heroWrap.style.transform = '';
}

async function moveHero(x, y, ms, { arc = 0, rot = 0, bob = 0 } = {}) {
  const x0 = S.hx, y0 = S.hy;
  const kf = [];
  if (arc) {
    kf.push(
      { left: x0 + 'px', bottom: y0 + 'px', transform: 'rotate(0deg)' },
      { left: (x0 + x) / 2 + 'px', bottom: Math.max(y0, y) + arc + 'px', transform: `rotate(${rot}deg)`, offset: .5 },
      { left: x + 'px', bottom: y + 'px', transform: 'rotate(0deg)' });
  } else {
    kf.push({ left: x0 + 'px', bottom: y0 + 'px', transform: 'rotate(0deg)' });
    if (bob) {
      const steps = 4;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        kf.push({ left: x0 + (x - x0) * t + 'px',
                  bottom: y0 + (y - y0) * t + (i % 2 ? bob : 0) + 'px',
                  transform: `rotate(${i % 2 ? 5 : -5}deg)` });
      }
    }
    kf.push({ left: x + 'px', bottom: y + 'px', transform: 'rotate(0deg)' });
  }
  const anim = heroWrap.animate(kf, { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
  try { await anim.finished; } catch (_) { /* cancelled */ }
  S.hx = x; S.hy = y;
  heroWrap.style.left = x + 'px';
  heroWrap.style.bottom = y + 'px';
  heroWrap.style.transform = '';
  anim.cancel();
}

/* glide a prop/pal sideways while the hero rides — same timing */
function glide(el, fromX, toX, ms) {
  const a = el.animate(
    [{ left: fromX + 'px' }, { left: toX + 'px' }],
    { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
  a.finished.then(() => { el.style.left = toX + 'px'; a.cancel(); }).catch(() => {});
  return a.finished.catch(() => {});
}

/* ---------- spawn helpers ---------- */
function spawnProp(id, { x = 0, b = GROUND, w = 110, z = 5, rot = 0 } = {}) {
  const d = document.createElement('div');
  d.className = 'prop';
  d.innerHTML = PROPS[id] || PROPS.puddle;
  d.style.left = x + 'px';
  d.style.bottom = b + 'px';
  d.style.width = w + 'px';
  d.style.zIndex = z;
  if (rot) d.style.setProperty('--rot', rot + 'deg');
  propLayer.appendChild(d);
  requestAnimationFrame(() => d.classList.add('in'));
  return d;
}

function spawnPal(word, { x = 0, b = GROUND, w = 130, z = 8 } = {}) {
  const key = PAL_DEFS[word] ? word : 'any';
  const def = PAL_DEFS[key];
  const el = document.createElement('div');
  el.className = 'pal';
  el.dataset.pal = key;
  el.innerHTML =
    `<div class="pal-face">${DB ? palSvg(word) : ''}</div>` +
    (def.acc && PAL_ACC[def.acc] ? `<div class="acc acc-${def.acc}">${PAL_ACC[def.acc]}</div>` : '') +
    `<span class="pal-tag">${esc(word)}</span>`;
  el.style.left = x + 'px';
  el.style.bottom = b + 'px';
  el.style.width = w + 'px';
  el.style.zIndex = z;
  propLayer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  return el;
}

function spawnOrb(x, y, r = 170) {
  const d = document.createElement('div');
  d.className = 'glow-orb';
  d.style.left = (x - r) + 'px';
  d.style.top = (y - r) + 'px';
  d.style.width = d.style.height = (r * 2) + 'px';
  propLayer.appendChild(d);
  requestAnimationFrame(() => d.classList.add('on'));
  return d;
}

function removeEl(el, fade = true) {
  if (!el) return;
  if (fade) {
    el.classList.add('out');
    setTimeout(() => el.remove(), 450);
  } else el.remove();
}
function clearProps() {
  [...propLayer.children].forEach((c) => removeEl(c));
}

function splashFx(x, y) {
  const d = document.createElement('div');
  d.className = 'splash-fx';
  d.innerHTML = '<i></i><i></i><i></i><i></i>';
  d.style.left = x + 'px';
  d.style.bottom = y + 'px';
  propLayer.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

function confetti(x, y, n = 16) {
  const colors = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.background = rand(colors);
    c.style.left = x + 'px';
    c.style.bottom = y + 'px';
    propLayer.appendChild(c);
    const dx = (Math.random() - .5) * 260;
    const dy = 60 + Math.random() * 180;
    const r = (Math.random() - .5) * 720;
    c.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * .7}px, ${-dy}px) rotate(${r / 2}deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${dx * 1.2}px, ${80}px) rotate(${r}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 600, easing: 'ease-out', fill: 'forwards' })
      .finished.then(() => c.remove()).catch(() => c.remove());
  }
}

/* ---------- speech + hero reaction classes ---------- */
let speechTimer = 0;
function showSpeech(text, uhoh = false, ms = 1600) {
  clearTimeout(speechTimer);
  // flip the bubble to the left when the hero is near the right edge
  const flip = S.hx > W() * .55;
  speechEl.style.right = flip ? 'auto' : '-64px';
  speechEl.style.left = flip ? '-64px' : 'auto';
  speechEl.classList.toggle('flip', flip);
  speechEl.textContent = text;
  speechEl.classList.toggle('uhoh', uhoh);
  speechEl.classList.add('show');
  speechTimer = setTimeout(() => speechEl.classList.remove('show'), ms);
}
async function heroAnim(cls, ms) {
  heroWrap.classList.add(cls);
  await sleep(ms);
  heroWrap.classList.remove(cls);
}

/* ---------- sentence / page ---------- */
function heroName() {
  const n = nameInput.value.trim();
  return n ? n[0].toUpperCase() + n.slice(1) : 'Pip';
}
function renderSentence({ keepInput = false } = {}) {
  const b = BEATS[S.beat];
  if (!b) return;
  beatTag.textContent = b.tag;
  sentPre.textContent = b.pre(heroName()) + ' ';
  sentPost.textContent = b.post;
  const old = sentPost.parentElement.querySelector('.filled-word');
  if (old) old.remove();
  if (!keepInput) {
    blankInput.style.display = '';
    blankInput.value = '';
    blankInput.style.width = '7ch';
  }
}
function setFeedback(t, kind = '') {
  feedbackEl.textContent = t;
  feedbackEl.className = 'feedback' + (kind ? ' ' + kind : '');
}
function hideDym() { dymZone.innerHTML = ''; }
function showDym(suggestion) {
  dymZone.innerHTML = '';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'dym-chip';
  b.innerHTML = `Did you mean <b>“${esc(suggestion)}”</b>? Tap it!`;
  b.addEventListener('click', () => {
    if (S.busy && !S.demo) return;
    hideDym();
    blankInput.value = suggestion;
    blankInput.style.width = Math.max(7, suggestion.length + 2) + 'ch';
    submitWord(suggestion);
  });
  dymZone.appendChild(b);
}
function fillSentence(word) {
  const span = document.createElement('span');
  span.className = 'filled-word';
  span.textContent = word;
  blankInput.style.display = 'none';
  sentPost.parentElement.insertBefore(span, sentPost);
}
function appendStoryLine(word) {
  const b = BEATS[S.beat];
  const ghost = storyLines.querySelector('.ghost-line');
  if (ghost) ghost.remove();
  const p = document.createElement('p');
  p.className = 'new-line';
  p.innerHTML = `${esc(b.pre(heroName()))} <span class="w">${esc(word)}</span> ${esc(b.post)}`;
  storyLines.appendChild(p);
}

/* ---------- gems ---------- */
const GEM_COLORS = ['#FFC53D', '#5DA9E9', '#FF6B57', '#4FB06D', '#B565D8'];
function gemSvg(color, letter = '') {
  return `<svg viewBox="0 0 26 26" width="26" height="26">
    <polygon points="13,1.5 24,9 13,24.5 2,9" fill="${color}" stroke="#2B2118" stroke-width="2" stroke-linejoin="round"/>
    <polyline points="2,9 24,9" stroke="#2B2118" stroke-width="1.4"/>
    ${letter ? `<text x="13" y="13" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="9" fill="#2B2118">${letter}</text>` : ''}
  </svg>`;
}
function buildGemRow() {
  gemRow.innerHTML = '';
  for (let i = 0; i < BEATS.length; i++) {
    const s = document.createElement('span');
    s.className = 'gem-slot';
    s.innerHTML = gemSvg(GEM_COLORS[i % GEM_COLORS.length]);
    gemRow.appendChild(s);
  }
}

/* ============================================================
   GAGS — the silly word REALLY spawns. That's the point.
   ============================================================ */
const GAG_SPEECH = {
  slip:   ['WHOOPSIE!', 'BANANA!!', 'WOOOAH!'],
  stick:  ['STUCK!', 'GLUE?!', 'MY FEET!'],
  soggy:  ['SOGGY!', 'MUSH!', 'DRIP DRIP!'],
  splash: ['SPLASH!', 'SINKER!', 'GLUG GLUG!'],
  fizzle: ['PFFFT!', 'FIZZLE!', 'WET?!'],
  strain: ['SO…TIGHT!', 'GRRR!', 'POP—OW!'],
  bonk:   ['BONK!', 'A WALL?!', 'OOF!'],
  eww:    ['EW EW EW!', 'STINKY!', 'MY NOSE!'],
  spook:  ['EEEK!', 'A GHOST!', 'SPOOKY!'],
};
const GAG_FEEDBACK = {
  slip:   'Right underfoot — {name} slipped and went SPLAT!',
  stick:  'Sticky! {name} was glued to the spot!',
  soggy:  'That went all soggy in the rain! {name} got soaked.',
  splash: 'That sinks like a rock! {name} nearly fell in!',
  fizzle: 'It fizzled right out! The cave is still dark.',
  strain: '{name} pulled and pulled… the lid popped off instead!',
  bonk:   'A wall! {name} ran right into it!',
  eww:    'STINKY word! {name} fainted from the smell!',
  spook:  'Spooky! {name} jumped right out of the story!',
};

async function runGag(gag, word) {
  const { gag: kind, prop } = gag;
  S.sillyWords.push(word);
  let p = null;
  const hx = S.hx, hb = S.hy;

  if (kind === 'slip' || kind === 'stick') {
    p = spawnProp(prop, { x: hx + W() * .05, b: GROUND, w: 95, z: 6 });
  } else if (kind === 'soggy') {
    p = spawnProp(prop, { x: hx - W() * .01, b: hb + H() * .40, w: 105, z: 12 });
  } else if (kind === 'splash') {
    p = spawnProp(prop, { x: W() * .30, b: H() * .52, w: 95, z: 6 });
  } else if (kind === 'fizzle') {
    p = spawnProp(prop, { x: hx + W() * .13, b: hb + H() * .08, w: 70, z: 33 });
  } else if (kind === 'strain') {
    p = spawnProp(prop, { x: hx + W() * .10, b: GROUND, w: 90, z: 6 });
  } else if (kind === 'bonk') {
    p = spawnProp(prop, { x: hx + W() * .17, b: GROUND, w: 110, z: 6 });
  } else if (kind === 'eww') {
    p = spawnProp(prop, { x: hx - W() * .05, b: hb + H() * .16, w: 150, z: 12 });
  } else if (kind === 'spook') {
    p = spawnProp(prop, { x: hx - W() * .02, b: hb + H() * .04, w: 95, z: 33 });
  }

  showSpeech(rand(GAG_SPEECH[kind]), true, 2200);
  setFeedback(GAG_FEEDBACK[kind].replace('{name}', heroName()) + ' Try again!', 'uhoh');

  if (kind === 'slip') {
    await moveHero(hx + W() * .06, hb, 300, { bob: 8 });      // step onto it
    await heroAnim('is-fail', 2500);                          // slip + splat + stars
  } else if (kind === 'stick') {
    await moveHero(hx + W() * .05, hb, 280, { bob: 8 });
    await heroAnim('is-stuck', 1400);                         // stretch…
    await heroAnim('is-fail', 1600);                          // …POP! backwards
  } else if (kind === 'soggy') {
    if (p) {
      await sleep(500);
      p.classList.add('drooped');                             // prop melts
      await heroAnim('is-wet', 1700);                         // hero droops, drips
      const pud = spawnProp('puddle', { x: hx - W() * .02, b: GROUND, w: 140, z: 4 });
      setTimeout(() => removeEl(pud), 2600);
    }
  } else if (kind === 'splash') {
    if (p) {
      const a = p.animate(
        [{ transform: 'translateY(0) rotate(0)' },
         { transform: `translateY(${H() * .40}px) rotate(160deg)` }],
        { duration: 700, easing: 'ease-in', fill: 'forwards' });
      await a.finished.catch(() => {});
      splashFx(W() * .30 - 12, H() * .10);
      removeEl(p);
      await heroAnim('is-wet', 1500);
    }
  } else if (kind === 'fizzle') {
    if (p) {
      await sleep(500);
      p.classList.add('fizzled');                             // spark → smoke
      splashFx(S.hx + W() * .14, S.hy + H() * .12);           // little puff ring
      await heroAnim('is-wobble', 900);
    }
  } else if (kind === 'strain') {
    await moveHero(hx + W() * .07, hb, 300, { bob: 6 });      // grab the jar
    await heroAnim('is-stuck', 1300);                         // pull pull pull…
    if (p) {                                                  // LID POPS
      p.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-16deg) translateY(-30px)' }],
        { duration: 260, easing: 'ease-out', fill: 'forwards' });
    }
    await heroAnim('is-fail', 1700);
  } else if (kind === 'bonk') {
    await moveHero(hx + W() * .15, hb, 260, { bob: 8 });      // charge at wall…
    await heroAnim('is-fail', 1900);                          // …bonk backwards
  } else if (kind === 'eww') {
    await sleep(350);
    await heroAnim('is-eww', 1500);                           // pinches nose, green
    await heroAnim('is-fail', 1900);                          // faint
  } else if (kind === 'spook') {
    if (p) p.classList.add('boo');
    await sleep(300);
    await heroAnim('is-spooked', 1200);                       // jump + shake
    await sleep(200);
    removeEl(p);
  }

  await sleep(300);
  if (p) removeEl(p);
  // dusted off — walk back to the start if the gags shoved us along
  if (S.hx > W() * .55) await moveHero(START_X(), S.hy, 600, { bob: 8 });
  blankInput.value = '';
  blankInput.style.width = '7ch';
  blankInput.focus({ preventScroll: true });
  await sleep(200);
}

/* A real monster pal wanders in, shrugs, and leaves — for real words
   that aren't in the table. The word still "spawns" something! */
async function confusedPal(word) {
  const z = diorama.dataset.area === 'cave' ? 33 : 8;   // stay visible in the dark
  const px = Math.min(S.hx + W() * .22, W() * .78);     // never spawn off-stage
  const pal = spawnPal('huh', { x: px, b: GROUND, w: 105, z });
  pal.querySelector('.pal-tag').textContent = word;
  showSpeech('Huh?', true, 1500);
  setFeedback(`A ${word}? ${heroName()} isn't sure that helps. Try the hint!`, 'uhoh');
  pal.classList.add('shrug');
  await sleep(1500);
  const a = pal.animate(
    [{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(160px) rotate(6deg)', opacity: 0 }],
    { duration: 800, easing: 'ease-in', fill: 'forwards' });
  await a.finished.catch(() => {});
  removeEl(pal, false);
  blankInput.select();
}

/* ============================================================
   SUCCESSES — prop/pal spawns, hero uses it, story advances.
   ============================================================ */
async function crossThePath(def) {
  const propEl = spawnProp(def.prop, {
    x: W() * def.x, b: H() * def.b, w: def.w, z: 5, rot: def.rot || 0,
  });
  await sleep(550);
  const end = W() * .74;
  if (def.act === 'swing') {
    await moveHero(W() * .44, S.hy, 350, { bob: 8 });
    // grab + pendulum swing
    const a = heroWrap.animate([
      { left: W() * .44 + 'px', bottom: S.hy + 'px', transform: 'rotate(0)' },
      { left: W() * .52 + 'px', bottom: S.hy + 70 + 'px', transform: 'rotate(24deg)', offset: .35 },
      { left: W() * .60 + 'px', bottom: S.hy + 60 + 'px', transform: 'rotate(-18deg)', offset: .7 },
      { left: end + 'px', bottom: S.hy + 'px', transform: 'rotate(0)' },
    ], { duration: 1100, easing: 'ease-in-out', fill: 'forwards' });
    await a.finished.catch(() => {});
    S.hx = end; heroWrap.style.left = end + 'px'; a.cancel();
  } else if (def.act === 'bounce') {
    await moveHero(W() * .36, S.hy, 320, { bob: 8 });
    await moveHero(end, S.hy, 900, { arc: 150, rot: -14 });
    heroWrap.classList.add('is-squish');
    setTimeout(() => heroWrap.classList.remove('is-squish'), 400);
  } else if (def.act === 'hop') {
    for (const fx of [.40, .52, .64, .74]) {
      await moveHero(W() * fx, S.hy, 300, { arc: 34 });
    }
  } else { // 'cross' — up and over on the prop
    await moveHero(W() * .36, S.hy, 380, { bob: 8 });
    await moveHero(end, S.hy, 950, { arc: 85, rot: -8 });
  }
  removeEl(propEl);
}

async function coverFromRain(def) {
  const px = S.hx + W() * def.dx;
  const py = S.hy + H() * def.dy;
  const propEl = spawnProp(def.prop, { x: px, b: py, w: def.w, z: 12 });
  await sleep(550);
  const end = W() * .72;
  // hero waddles; the cover follows overhead
  glide(propEl, px, end + W() * def.dx, 1300);
  await moveHero(end, S.hy, 1300, { bob: 10 });
  removeEl(propEl);
}

async function rideTheRiver(def) {
  let rideEl, seat = def.seat || 40;
  if (def.pal) {
    rideEl = spawnPal(def.pal === 'any' ? lastWord : def.pal,
      { x: W() * .20, b: H() * .08, w: 130, z: 8 });
    rideEl.classList.add('swim');
  } else {
    rideEl = spawnProp(def.prop, { x: W() * def.x, b: H() * def.b, w: def.w, z: 8 });
    rideEl.classList.add('swim');
  }
  showSpeech('All aboard!', false, 1200);
  await sleep(650);
  // hop on
  const rideX = W() * .20;
  const seatY = H() * .10 + seat;
  await moveHero(rideX + 10, seatY, 500, { arc: 60 });
  heroWrap.classList.add('is-riding');
  // glide across together
  const endRide = W() * .66;
  glide(rideEl, parseFloat(rideEl.style.left), endRide, 2100);
  await moveHero(endRide + 10, seatY, 2100);
  // hop off onto the far bank
  heroWrap.classList.remove('is-riding');
  await moveHero(W() * .80, GROUND, 480, { arc: 55 });
  // pal waves goodbye / prop drifts off
  if (rideEl) {
    const a = rideEl.animate(
      [{ transform: 'translateX(0) rotate(0)', opacity: 1 },
       { transform: 'translateX(220px) rotate(8deg)', opacity: 0 }],
      { duration: 900, easing: 'ease-in', fill: 'forwards' });
    await a.finished.catch(() => {});
    removeEl(rideEl, false);
  }
}

async function lightTheCave(def) {
  let lx, ly, lightEl = null;
  if (def.pal) {                                     // firefly pal!
    lightEl = spawnPal('firefly', { x: S.hx + W() * .18, b: S.hy + H() * .42, w: 95, z: 33 });
    lightEl.classList.add('hover');
    lx = S.hx + W() * .18 + 48; ly = S.hy + H() * .42 + 60;
  } else {
    lightEl = spawnProp(def.prop, { x: S.hx + W() * def.dx, b: S.hy + H() * def.dy, w: def.w, z: 33 });
    lx = S.hx + W() * def.dx + def.w * .5; ly = S.hy + H() * def.dy + def.w * .55;
  }
  await sleep(500);
  // spotlight punches through the dark (screen-blend orb over the dark layer)
  const orb = spawnOrb(lx, H() - ly - 20, 175);      // top = H - bottom
  showSpeech(rand(BEATS[3].yay), false, 1400);
  await sleep(800);
  // walk deeper in — light comes along
  const nx = W() * .62;
  if (lightEl) glide(lightEl, parseFloat(lightEl.style.left), nx + W() * (def.dx || .18), 1400);
  const orb2 = orb.animate(
    [{ left: orb.style.left, top: orb.style.top },
     { left: (nx + W() * .16 - 175) + 'px', top: orb.style.top }],
    { duration: 1400, easing: 'ease-in-out', fill: 'forwards' });
  await moveHero(nx, S.hy, 1400, { bob: 10 });
  await orb2.finished.catch(() => {});
  removeEl(orb); if (lightEl && !def.pal) removeEl(lightEl);
  if (def.pal && lightEl) {                          // firefly flutters on ahead
    const a = lightEl.animate(
      [{ transform: 'translate(0,0)', opacity: 1 },
       { transform: 'translate(140px,-60px)', opacity: 0 }],
      { duration: 800, easing: 'ease-in', fill: 'forwards' });
    a.finished.then(() => removeEl(lightEl, false)).catch(() => {});
  }
}

async function openTheHome(def, word) {
  // aim for the real cottage door wherever it landed in the layout
  const cot = diorama.querySelector('.cottage');
  const dio = diorama.getBoundingClientRect();
  const doorCX = cot
    ? cot.getBoundingClientRect().left - dio.left + cot.getBoundingClientRect().width * .5
    : W() * .66;                                   // door center-x in diorama px
  const doorY = GROUND;
  let propEl = null;

  if (def.prop) {
    propEl = spawnProp(def.prop, { x: W() * .30, b: GROUND, w: 110, z: 6 });
    await sleep(500);
    // the payoff beat: key flies, jar pops cookies, gate swings…
    if (def.pay === 'key') {
      const a = propEl.animate(
        [{ left: W() * .30 + 'px', bottom: GROUND + 'px', transform: 'rotate(0)' },
         { left: (doorCX - 30) + 'px', bottom: GROUND + 70 + 'px', transform: 'rotate(380deg)' }],
        { duration: 900, easing: 'ease-in-out', fill: 'forwards' });
      await a.finished.catch(() => {});
      removeEl(propEl);
    } else if (def.pay === 'swing') {
      propEl.animate(
        [{ transform: 'perspective(500px) rotateY(0)' },
         { transform: 'perspective(500px) rotateY(-70deg)' }],
        { duration: 700, easing: 'ease-out', fill: 'forwards' });
      await sleep(700);
      // stays open — it earned its spot on the page
    } else if (def.pay === 'pop') {
      propEl.classList.add('wiggle');
      await sleep(650);
      // cookies / gems / confetti burst out
      const popKind = def.pop;
      for (let i = 0; i < 5; i++) {
        const mini = document.createElement('div');
        mini.className = 'prop mini-pop';
        mini.innerHTML = popKind === 'cookie' ? PROPS.cookie
          : popKind === 'gem' ? gemSvg(rand(GEM_COLORS)) : PROPS.cookie;
        mini.style.left = W() * .33 + 'px';
        mini.style.bottom = GROUND + 60 + 'px';
        mini.style.width = '34px';
        mini.style.zIndex = 7;
        propLayer.appendChild(mini);
        mini.animate([
          { transform: 'translate(0,0) scale(.4)', opacity: 0 },
          { transform: `translate(${(i - 2) * 46}px, ${60 + i * 12}px) scale(1)`, opacity: 1, offset: .5 },
          { transform: `translate(${(i - 2) * 62}px, ${-30}px) scale(1)`, opacity: 0 },
        ], { duration: 900 + i * 90, easing: 'ease-out', fill: 'forwards', delay: i * 60 })
          .finished.then(() => mini.remove()).catch(() => mini.remove());
      }
      confetti(W() * .36, GROUND + 80, 14);
      await sleep(800);
      removeEl(propEl);
    }
  }

  // the cottage door swings open + warm light
  const glow = document.createElement('div');
  glow.className = 'door-light';
  glow.style.left = (doorCX - 55) + 'px';
  glow.style.bottom = doorY + 'px';
  propLayer.appendChild(glow);
  requestAnimationFrame(() => glow.classList.add('on'));
  const openDoor = spawnProp('doorOpen', { x: doorCX - 46, b: doorY, w: 92, z: 7 });
  showSpeech(rand(BEATS[4].yay), false, 1400);
  confetti(doorCX + 20, doorY + 90, 18);
  await sleep(700);

  // hero hops home and shrinks into the doorway
  await moveHero(doorCX - 24, doorY, 800, { bob: 10 });
  const a = heroWrap.animate(
    [{ transform: 'scale(1)', opacity: 1 },
     { transform: 'scale(.45) translateY(30px)', opacity: .9 }],
    { duration: 600, easing: 'ease-in', fill: 'forwards' });
  await a.finished.catch(() => {});
  a.cancel();
}

/* ============================================================
   word pipeline
   ============================================================ */
let lastWord = '';

function suggest(word, table) {
  const clean = stripArt(word);
  let best = null, bestD = 99;
  for (const key of Object.keys(table)) {
    const d = Math.min(lev(clean, key), lev(clean.replace(/s$/, ''), key));
    const ok = d <= 1 || (d <= 2 && key.length >= 5 && clean.length >= 4);
    if (ok && d < bestD) { bestD = d; best = key; }
  }
  return best;
}

async function submitWord(raw) {
  const word = norm(raw);
  hideDym();
  if (!word) { setFeedback('Type a word first!', 'uhoh'); blankInput.focus(); return 'empty'; }
  const beat = BEATS[S.beat];
  if (!beat) return 'done';
  S.busy = true; goBtn.disabled = true;
  lastWord = word;
  let result = 'retry';

  try {
  const sillyHit = lookup(word, beat.silly) || lookup(word, GLOBAL_SILLY);
  const senseHit = !sillyHit && lookup(word, beat.sensible);
  const animalHit = !sillyHit && !senseHit && beat.id === 'river' &&
    ANIMAL_WORDS.has(stripArt(word)) ? { key: word, def: { pal: 'any', seat: 82 } } : null;

  if (sillyHit) {
    await runGag(sillyHit.def, word);
  } else if (senseHit || animalHit) {
    const hit = senseHit || animalHit;
    const canon = stripArt(word);
    S.chosen[S.beat] = canon;
    fillSentence(canon);
    showSpeech(rand(beat.yay), false, 1600);
    setFeedback('Yes! Right into the story it goes!', 'yay');
    await runSuccess(beat, hit.def);
    appendStoryLine(canon);
    gemRow.children[S.beat]?.classList.add('won');
    S.beat++;
    result = 'advanced';
    if (S.beat < BEATS.length) {
      await travelToNextArea();
      renderSentence();
      setFeedback('Psst… ' + BEATS[S.beat].hint, '');
      blankInput.focus({ preventScroll: true });
    } else {
      await finishChapter();
    }
  } else {
    const sug = suggest(word, beat.sensible);
    if (sug) {
      showDym(sug);
      await heroAnim('is-wobble', 800);
      setFeedback('Hmm, close! Did your fingers slip?', 'uhoh');
      blankInput.select();
    } else if (!isWordLike(word)) {
      showSpeech('Is that a word?', true, 1500);
      setFeedback('Hmm, that looks made-up. Try a real word!', 'uhoh');
      await heroAnim('is-wobble', 900);
      blankInput.select();
    } else {
      await confusedPal(word);
    }
  }
  } finally {
    S.busy = false;
    goBtn.disabled = S.demo;
    // an eager click mid-animation queued a word — run it now
    if (S.pending != null && !S.demo) {
      const p = S.pending; S.pending = null;
      submitWord(p);
    }
  }
  return result;
}

async function runSuccess(beat, def) {
  if (beat.id === 'path') await crossThePath(def);
  else if (beat.id === 'rain') await coverFromRain(def);
  else if (beat.id === 'river') await rideTheRiver(def);
  else if (beat.id === 'cave') await lightTheCave(def);
  else if (beat.id === 'home') await openTheHome(def, lastWord);
  heroWrap.classList.add('is-happy');
  await sleep(900);
  heroWrap.classList.remove('is-happy');
}

/* ---------- area travel ---------- */
async function travelToNextArea() {
  const next = BEATS[S.beat];
  // lock the box while the world swaps so a fast typist's word can't be wiped
  blankInput.disabled = true;
  // scamper off the right edge while the world swaps
  const a = moveHero(W() + 90, S.hy, 700);
  await sleep(320);
  diorama.dataset.area = next.area;
  clearProps();
  await a;
  // pop in from the left
  heroWrap.style.transition = 'none';
  heroHome(-140);
  await sleep(30);
  await moveHero(START_X(), GROUND, 650, { bob: 12 });
  await sleep(150);
  if (!S.demo) blankInput.disabled = false;
}

/* ---------- ending ---------- */
function seedLetter() {
  let h = 0;
  for (const c of S.seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'ABCDEFGHJKLMNPQRSTUVWXYZ'[h % 24];
}
async function finishChapter() {
  setFeedback('Chapter complete!', 'yay');
  await sleep(900);
  endGem.innerHTML = gemSvg(GEM_COLORS[0], seedLetter())
    .replace('width="26" height="26"', 'width="96" height="96"');
  endSub.textContent = `${heroName()} collected a letter-gem for the bedtime story.`;
  wordRecap.innerHTML = S.chosen.map((w) => `<span class="w-chip">${esc(w)}</span>`).join('');
  const sillyUniq = [...new Set(S.sillyWords)];
  sillyRecap.innerHTML = sillyUniq.length
    ? `<span class="silly-label">Bonus giggles:</span>` +
      sillyUniq.map((w) => `<span class="w-chip silly-chip">${esc(w)}</span>`).join('')
    : '';
  sigAvatar.innerHTML = DB ? heroSvg() : '';
  sigName.textContent = heroName();
  ending.classList.remove('hidden');
}

function resetChapter() {
  S.beat = 0;
  S.pending = null;
  S.chosen = []; S.sillyWords = [];
  storyLines.innerHTML = '<p class="ghost-line">Your story words land here…</p>';
  buildGemRow();
  ending.classList.add('hidden');
  diorama.dataset.area = 'path';
  clearProps();
  hideDym();
  heroHome();
  renderSentence();
}

/* ============================================================
   MONSTER MAKER
   ============================================================ */
function hatch(name) {
  S.hatched = true;
  const n = (name || nameInput.value.trim());
  S.name = n || 'Pip';
  S.seed = n ? 'monster-' + n.toLowerCase() : S.bootSeed;
  const egg = $('egg');
  if (egg) {
    egg.classList.add('crack');
    setTimeout(() => {
      heroEl.innerHTML = DB ? heroSvg() : '<p class="ghost-line">?</p>';
      heroWrap.classList.add('is-born');
      setTimeout(() => heroWrap.classList.remove('is-born'), 650);
    }, 380);
  } else {
    heroEl.innerHTML = DB ? heroSvg() : '';
    heroWrap.classList.add('is-born');
    setTimeout(() => heroWrap.classList.remove('is-born'), 650);
  }
  // unlock the story (never mid-demo — controls stay locked while it plays)
  if (blankInput.disabled && !S.demo) {
    blankInput.disabled = false;
    goBtn.disabled = false;
    setFeedback('Type a word in the blank — or a very silly one!', '');
    setTimeout(() => blankInput.focus({ preventScroll: true }), 700);
  }
  seedNote.innerHTML = n
    ? `<b>“${esc(S.name)}”</b> hatched! The same name always grows the same monster.`
    : 'A mystery monster hatched! Give it a name.';
  renderSentence({ keepInput: true });
}

function refreshHero() {
  if (!S.hatched || !DB) return;
  heroEl.innerHTML = heroSvg();
}

function buildChips() {
  // body colors
  const cc = $('colorChips');
  BODY_COLORS.forEach(([hex, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.title = label;
    b.dataset.val = hex;
    b.style.background = '#' + hex;
    b.innerHTML = `<span class="sr">${label}</span>`;
    b.addEventListener('click', () => pickOpt('color', hex, b, cc));
    cc.appendChild(b);
  });
  // part chips
  for (const [group, items] of Object.entries(OPTS)) {
    const box = $(group + 'Chips');
    items.forEach(([id, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip opt-chip';
      b.dataset.val = id;
      b.textContent = label;
      b.addEventListener('click', () => pickOpt(group, id, b, box));
      box.appendChild(b);
    });
  }
}
function pickOpt(group, val, btn, box, force = false) {
  if (S.demo && !force) return;
  const cur = S.picks[group];
  if (cur === val) {                          // toggle off → back to seed-random
    S.picks[group] = null;
    btn.classList.remove('sel');
  } else {
    S.picks[group] = val;
    [...box.children].forEach((c) => c.classList.remove('sel'));
    btn.classList.add('sel');
  }
  if (!S.hatched) hatch();
  else { refreshHero(); popHero(); }
}
function popHero() {
  heroWrap.classList.remove('is-born');
  void heroWrap.offsetWidth;
  heroWrap.classList.add('is-born');
  setTimeout(() => heroWrap.classList.remove('is-born'), 550);
}

let nameTimer = 0;
nameInput.addEventListener('input', () => {
  if (S.demo) return;
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    if (nameInput.value.trim()) hatch();   // re-seed + re-render live
  }, 380);
});

surpriseBtn.addEventListener('click', () => {
  if (S.demo) return;
  const n = rand(MONSTER_NAMES);
  nameInput.value = n;
  S.picks = { color: null, eyes: null, top: null, mouth: null };
  document.querySelectorAll('.opt-chip.sel, .swatch.sel').forEach((c) => c.classList.remove('sel'));
  hatch(n);
  popHero();
  showSpeech(`I'm ${n}!`, false, 1300);
});

/* ============================================================
   WATCH IT PLAY — hands-free auto demo (stoppable)
   ============================================================ */
const DEMO_SCRIPT = [
  ['bridg'],                       // → "did you mean bridge?" chip moment
  ['paper bag', 'umbrella'],       // soggy gag → success
  ['toaster', 'unicorn'],          // splash gag → monster pal ride
  ['firefly'],                     // glow pal lights the cave
  ['cookie jar'],                  // payoff + ending
];
const DEMO_NAME = 'Ziggy';

async function demoSleep(ms) {
  const step = 80;
  for (let t = 0; t < ms; t += step) {
    if (S.demoStop) return;
    await sleep(Math.min(step, ms - t));
  }
}
async function typeInto(input, word, cps = 95) {
  input.value = '';
  input.style.width = '7ch';
  for (const ch of word) {
    if (S.demoStop) return;
    input.value += ch;
    input.style.width = Math.max(7, input.value.length + 2) + 'ch';
    await demoSleep(cps + Math.random() * 70);
  }
}

async function runDemo() {
  if (S.demo || S.busy) return;
  S.demo = true; S.demoStop = false;
  demoBtn.textContent = 'Stop the show';
  demoBtn.classList.add('demo-running');
  goBtn.disabled = true;
  blankInput.disabled = true;

  // fresh chapter
  resetChapter();
  nameInput.value = '';
  setFeedback('Watch — the story plays itself!', '');

  // 1) auto-make a hero: type a name (deterministic seed) + pick two chips
  await demoSleep(400);
  for (const ch of DEMO_NAME) {
    if (S.demoStop) break;
    nameInput.value += ch;
    await demoSleep(120);
  }
  await demoSleep(200);
  // force-pick a body color + headgear like a kid would
  pickOpt('color', BODY_COLORS[2][0], $('colorChips').children[2], $('colorChips'), true);
  await demoSleep(250);
  pickOpt('top', OPTS.top[2][0], $('topChips').children[2], $('topChips'), true);
  if (S.demoStop) return stopDemo();
  hatch(DEMO_NAME);
  await demoSleep(1100);

  // 2) play the scripted chapter
  for (const group of DEMO_SCRIPT) {
    if (S.demoStop || S.beat >= BEATS.length) break;
    for (const word of group) {
      if (S.demoStop || S.beat >= BEATS.length) break;
      await demoSleep(500);
      await typeInto(blankInput, word);
      if (S.demoStop) break;
      await demoSleep(350);
      const r = await submitWord(blankInput.value);
      // a "did you mean…?" chip appeared? tap it like a kid would
      if (r === 'retry' && dymZone.firstChild && !S.demoStop) {
        await demoSleep(800);
        dymZone.firstChild.click();
        await dymWait();
      }
      if (r === 'advanced') break;
      // fail/gag → same beat, loop types the retry word
      await demoSleep(300);
    }
  }

  stopDemo();
}
async function dymWait() {           // let the dym submission finish
  while (S.busy && !S.demoStop) await demoSleep(120);
}

function stopDemo() {
  S.demo = false; S.demoStop = false;
  demoBtn.textContent = 'Watch it play';
  demoBtn.classList.remove('demo-running');
  goBtn.disabled = !S.hatched;
  blankInput.disabled = !S.hatched;
  if (S.beat < BEATS.length) setFeedback('Your turn — take it from here!', '');
}
demoBtn.addEventListener('click', () => {
  if (S.demo) { S.demoStop = true; } else runDemo();
});

/* ---------- wiring ---------- */
blankInput.addEventListener('input', () => {
  blankInput.style.width = Math.max(7, blankInput.value.length + 2) + 'ch';
});
function trySubmit() {
  if (S.demo || !S.hatched) return;
  if (S.busy) { S.pending = blankInput.value; return; }  // queue for the finally
  submitWord(blankInput.value);
}
blankInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') trySubmit();
});
goBtn.addEventListener('click', trySubmit);
againBtn.addEventListener('click', () => {
  resetChapter();
  setFeedback('Same monster, brand-new chapter!', '');
  blankInput.focus({ preventScroll: true });
});

/* ---------- boot ---------- */
buildChips();
buildGemRow();
heroHome();
renderSentence();
beatTag.textContent = 'make your monster first';
setFeedback('Hatch a monster to start the story!', '');
