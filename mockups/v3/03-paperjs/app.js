/* ============================================================
   app.js — "The Three Little Pigs" · Paper.js vector edition
   Game loop + hero maker (beat 0) + real-LLM glue.
   All art lives in world.js — this file owns DOM + LLM turns.
   ============================================================ */
'use strict';

/* ---------- element handles ---------- */
const stageEl    = document.getElementById('stage');
const worldCv    = document.getElementById('worldCv');
const makerOv    = document.getElementById('makerOverlay');
const makerCv    = document.getElementById('makerCv');
const swatchBox  = document.getElementById('swatches');
const doneBtn    = document.getElementById('doneBtn');
const surpriseBtn= document.getElementById('surpriseBtn');
const clearBtn   = document.getElementById('clearBtn');
const watchBtn   = document.getElementById('watchBtn');
const stopBtn    = document.getElementById('stopBtn');
const endOv      = document.getElementById('endOverlay');
const againBtn   = document.getElementById('againBtn');
const wordInput  = document.getElementById('wordInput');
const goBtn      = document.getElementById('goBtn');
const coachEl    = document.getElementById('coach');
const narrativeEl= document.getElementById('narrative');
const storyLines = document.getElementById('storyLines');
const obstacleRow= document.getElementById('obstacleRow');
const choiceRow  = document.getElementById('choiceRow');
const dymEl      = document.getElementById('dym');
const dymBtn     = document.getElementById('dymBtn');
const goalFill   = document.getElementById('goalFill');
const goalPig    = document.getElementById('goalPig');
const wolfFill   = document.getElementById('wolfFill');
const wolfChip   = document.getElementById('wolfChip');
const latChip    = document.getElementById('latChip');
const modeBadge  = document.getElementById('modeBadge');
const recapEl    = document.getElementById('recap');
const endSub     = document.getElementById('endSub');
const makerNote  = document.getElementById('makerNote');
const titleSquig = document.getElementById('titleSquiggle');

const GOAL = 'The Three Little Pigs — help the pig friends gather materials, build houses, and reach the strong brick house before the Big Bad Wolf huffs and puffs.';

/* ---------- game state ---------- */
const llm = new StoryLLM({ mode: 'remote', maxTokens: 640, onStatus: onLlmStatus });
let busy = false, started = false, demoOn = false, epoch = 0;
let headroomOK = false, queuedWord = null;
let shownGoal = 0;           // smoothed goal display (never teleports)
const history = [];          // "word -> narrative" snippets for context
const latencies = [];
const wordsTyped = [];
let heroDesc = '';

/* ============================================================
   BEAT 0 — HERO MAKER (a second Paper.js scope: real paths!)
   The kid draws strokes; on "Done" they are exported as raw
   segments and simplify()-ed inside the world into a puppet.
   ============================================================ */
const M = new paper.PaperScope();
const CRAYONS = ['#2B2118', '#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
let selColor = CRAYONS[1], makerStrokes = [], curPath = null, makerBusy = false;

function makerInit() {
  M.setup(makerCv);
  resizeMaker();
  CRAYONS.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (i === 1 ? ' sel' : '');
    b.style.background = c;
    b.setAttribute('aria-label', 'crayon ' + c);
    b.addEventListener('click', () => {
      selColor = c;
      swatchBox.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
      b.classList.add('sel');
    });
    swatchBox.appendChild(b);
  });
}
function resizeMaker() {
  const w = Math.max(300, makerCv.clientWidth || 420), h = 264;
  M.activate();
  M.view.viewSize = new M.Size(w, h);
}
function makerPos(e) {
  const r = makerCv.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function paperSheet() {
  /* warm paper doodle sheet under the strokes */
  M.activate();
  const w = M.view.size.width, h = M.view.size.height;
  const sheet = new M.Path.Rectangle({ rectangle: [0, 0, w, h], fillColor: '#FFFDF6' });
  sheet.sendToBack();
  sheet.data = { sheet: true };
  /* faint ruled lines */
  for (let y = 44; y < h; y += 44) {
    const l = new M.Path({ segments: [[14, y], [w - 14, y]], strokeColor: '#EFE3C8', strokeWidth: 1.5 });
    l.data = { sheet: true };
  }
}
function clearMaker() {
  M.activate();
  M.project.activeLayer.removeChildren();
  makerStrokes = [];
  paperSheet();
}
function strokeMeta(p, color, w) { p.data.color = color; p.data.w = w; }

makerCv.addEventListener('pointerdown', (e) => {
  if (makerBusy) return;
  e.preventDefault();
  makerCv.setPointerCapture(e.pointerId);
  M.activate();
  const [x, y] = makerPos(e);
  curPath = new M.Path({ segments: [[x, y]], strokeColor: selColor,
    strokeWidth: 13, strokeCap: 'round', strokeJoin: 'round' });
  strokeMeta(curPath, selColor, 13);
});
makerCv.addEventListener('pointermove', (e) => {
  if (!curPath) return;
  const [x, y] = makerPos(e);
  const last = curPath.lastSegment.point;
  if (Math.hypot(x - last.x, y - last.y) > 3) curPath.add(new M.Point(x, y));
});
function endStroke() {
  if (!curPath) return;
  curPath.simplify(5);          // kid scribble -> smooth crayon line
  curPath.smooth();
  makerStrokes.push(curPath);
  curPath = null;
}
makerCv.addEventListener('pointerup', endStroke);
makerCv.addEventListener('pointercancel', endStroke);
clearBtn.addEventListener('click', clearMaker);

/* "Surprise me" — auto-draws a blob monster out of paper paths */
async function surpriseMe(fast) {
  if (makerBusy) return;
  makerBusy = true;
  clearMaker();
  const w = M.view.size.width, h = M.view.size.height;
  const cx = w / 2, cy = h / 2 + 16;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const c = CRAYONS[1 + ((Math.random() * 4) | 0)];
  const bw = rnd(110, 140), bh = rnd(96, 118);
  const mk = (build) => new Promise(res => {
    M.activate();
    const p = build();
    if (p) { makerStrokes.push(p); strokeMeta(p, p.strokeColor ? p.strokeColor.toCSS(true) : c, p.strokeWidth || 8); }
    setTimeout(res, fast ? 70 : 210);
  });
  await mk(() => new M.Path.Ellipse({ center: [cx, cy], radius: [bw / 2, bh / 2],
    strokeColor: c, strokeWidth: 11 }));
  await mk(() => {   /* antenna */
    const p = new M.Path({ segments: [[cx, cy - bh / 2 + 4], [cx - 8, cy - bh / 2 - 20], [cx + 5, cy - bh / 2 - 34]],
      strokeColor: c, strokeWidth: 7, strokeCap: 'round' });
    p.smooth(); return p;
  });
  await mk(() => new M.Path.Circle({ center: [cx + 5, cy - bh / 2 - 40], radius: 8,
    strokeColor: '#FFC53D', strokeWidth: 8 }));
  await mk(() => new M.Path.Ellipse({ center: [cx - bw * .18, cy - bh * .16], radius: [13, 15],
    strokeColor: INKC, strokeWidth: 4 }));
  await mk(() => new M.Path.Ellipse({ center: [cx + bw * .2, cy - bh * .13], radius: [9, 11],
    strokeColor: INKC, strokeWidth: 4 }));
  await mk(() => {                 /* smile */
    const p = new M.Path({
      segments: [[cx - bw * .3, cy + 8], [cx, cy + bh * .3], [cx + bw * .32, cy + 6]],
      strokeColor: INKC, strokeWidth: 5, strokeCap: 'round' });
    p.smooth(); return p;
  });
  await mk(() => {   /* feet */
    const p = new M.Path({ segments: [[cx - bw * .3, cy + bh / 2 - 2], [cx - bw * .3, cy + bh / 2 + 10]],
      strokeColor: INKC, strokeWidth: 9, strokeCap: 'round' });
    const p2 = new M.Path({ segments: [[cx + bw * .3, cy + bh / 2 - 2], [cx + bw * .3, cy + bh / 2 + 10]],
      strokeColor: INKC, strokeWidth: 9, strokeCap: 'round' });
    makerStrokes.push(p2); strokeMeta(p2, INKC, 9);
    return p;
  });
  makerBusy = false;
}
const INKC = '#2B2118';
surpriseBtn.addEventListener('click', () => surpriseMe(false));

/* Done -> export strokes to the world puppet */
function heroStrokeData() {
  return makerStrokes.map(p => ({
    segs: p.segments.map(s => [s.point.x, s.point.y,
      s.handleIn.x, s.handleIn.y, s.handleOut.x, s.handleOut.y]),
    color: p.data.color || INKC, w: p.data.w || 10, closed: p.closed
  }));
}
function finishMaker() {
  if (makerBusy) return;
  if (!makerStrokes.length) {
    coach('Draw a hero first — or press "Surprise me"!');
    makerCv.classList.remove('nope');
    void makerCv.offsetWidth;
    makerCv.classList.add('nope');
    return;
  }
  const colors = [...new Set(makerStrokes.map(p => p.data.color))];
  heroDesc = 'a kid-drawn crayon hero in ' + colors.slice(0, 3).join(' and ');
  PaperWorld.buildHero(heroStrokeData());
  makerOv.classList.remove('show');
  setTimeout(() => { makerOv.hidden = true; }, 320);
  startStory();
}
doneBtn.addEventListener('click', finishMaker);

/* ============================================================
   THE LOOP — typed word -> llm.next -> re-render + props
   ============================================================ */
function startStory() {
  if (started) return;
  started = true;
  wordInput.disabled = false; goBtn.disabled = false;
  wordInput.focus();
  ensureHeadroom();                            // warm the guardrail in the background
  addLine('storyteller', 'Once upon a time, three little pigs needed a safe brick house. Your hero is here to help them — what should happen first?');
  coach('Type a word — try "gather straw" or be silly and type "banana"!');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = ep => ep === epoch && demoOn !== 'dead';

function onLlmStatus(st) {
  if (st.waiting) latChip.textContent = 'waiting for memory room…';
}

async function ensureHeadroom() {
  if (headroomOK) return true;
  latChip.textContent = 'checking memory…';
  headroomOK = await llm.waitForHeadroom(4, 12000);   // spec: 4GB before heavy ops
  if (!headroomOK) coach('The computer is a bit full — the story may move slowly.');
  return headroomOK;
}

function setInputLive() {
  /* input stays enabled while busy so a kid's next word can QUEUE;
     it's only locked before the story starts, during the demo, or
     after the payoff overlay is up */
  const off = !started || demoOn === true || !endOv.hidden;
  wordInput.disabled = off; goBtn.disabled = off;
}

async function submitWord(word, ep) {
  word = (word || '').trim().slice(0, 24);
  if (!word) {
    if (started) coach('Type a word first — anything can happen!');
    return;
  }
  if (!started || !endOv.hidden) return;        // story over — no more turns
  if (busy) {                                   // mid-turn: queue the kid's word
    queuedWord = word;
    wordInput.value = '';
    coach(`"${word}" is next — one turn at a time!`);
    return;
  }
  busy = true;
  if (demoOn) { goBtn.disabled = true; wordInput.disabled = true; }
  wordInput.value = '';
  hideDym();
  coach('The Storywood is listening…');
  latChip.textContent = 'asking the storyteller…';
  latChip.classList.add('thinking');
  try {
    const gm = await llm.next({ goal: GOAL, history, playerText: word, hero: heroDesc });
    latChip.classList.remove('thinking');
    if (ep !== undefined && !ok(ep)) return;    // stopped while the model thought
    if (!gm) { coach('The story hiccuped — try another word!'); return; }

    /* honest chips — mode shows the REAL source of this beat,
       latency only on real calls (never fake "GLM answered") */
    const src = (gm._meta && gm._meta.source) || 'offline';
    const ms = (gm._meta && gm._meta.ms) || 0;
    modeBadge.hidden = false;
    if (src === 'remote') {
      latChip.textContent = `GLM answered in ${(ms / 1000).toFixed(1)}s`;
      modeBadge.textContent = 'live LLM · remote GLM';
      modeBadge.classList.add('live');
      latencies.push(ms);
    } else if (src === 'local') {
      latChip.textContent = `local model answered in ${(ms / 1000).toFixed(1)}s`;
      modeBadge.textContent = 'live LLM · local model';
      modeBadge.classList.add('live');
      latencies.push(ms);
    } else {
      latChip.textContent = 'offline narrator — no network call';
      modeBadge.textContent = 'demo mode · offline narrator';
      modeBadge.classList.remove('live');
    }

    await applyGM(gm, word, ep);
  } catch (e) {
    latChip.classList.remove('thinking');
    coach('The story hiccuped — try another word!');
  } finally {
    busy = false;
    const q = queuedWord; queuedWord = null;
    if (q && started && (ep === undefined || ok(ep))) submitWord(q, ep);
    else setInputLive();
  }
}

async function applyGM(gm, word, ep) {
  const alive = () => ep === undefined || ok(ep);
  wordsTyped.push(word);
  history.push(`${word} -> ${(gm.narrative || '').slice(0, 70)}`);
  if (history.length > 8) history.shift();

  /* narrative FIRST — freshest beat is always the most prominent */
  if (gm.narrative) addLine('storyteller', gm.narrative);

  /* obstacles -> chips (+ wolf pressure escalation) */
  obstacleRow.innerHTML = '';
  (gm.obstacles || []).forEach(o => {
    const chip = document.createElement('span');
    chip.className = 'obchip';
    chip.textContent = o;
    obstacleRow.appendChild(chip);
  });
  const wolfish = (gm.obstacles || []).some(o => /wolf|huff|puff|snarl|chase/i.test(o)) ||
                  /wolf|huff|puff/i.test(gm.narrative || '') ||
                  (gm.scene_seed && gm.scene_seed.biome === 'storm');
  const delta = (wolfish ? 26 : 8) + (gm.success ? 0 : 8) + Math.round((gm.goal_progress || 0) * 8);
  setWolfMeter(PaperWorld.wolfBump(delta));

  /* choice chips -> click to use (safe even mid-turn: queues) */
  choiceRow.innerHTML = '';
  (gm.choices || []).slice(0, 4).forEach(ch => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'choicechip';
    b.textContent = ch;
    b.addEventListener('click', () => { submitWord(ch); });
    choiceRow.appendChild(b);
  });

  /* the model uses success≈"story finished" — it says false on most turns.
     A FAIL beat is really a comedic one: a silly thing was typed, or the
     narrative literally says somebody slipped/bonked. */
  const silly = /banana|peel|toaster|slime|sock|fridge|jelly|mud|pants|glorp|pudding|spaghetti|homework|pickle|blob/i;
  const failBeat = gm.success === false &&
    (silly.test(word) ||
     /(you|pip|hero)[^.\n]{0,24}(slip|trip|bonk|tumble|faceplant|splat)|kersplat|kerplunk|whoops|oops!/i.test(gm.narrative || ''));

  /* smoothed goal — model gp is erratic & conservative, so an accepted turn
     paces the journey by a floor (story designed ~8 beats); fails dip a little */
  const raw = Math.max(0, Math.min(1, gm.goal_progress || 0));
  const floor = Math.min(.95, wordsTyped.length * .12);
  const eff = failBeat ? Math.max(shownGoal - .06, Math.min(raw, floor))
                       : Math.max(raw, floor);
  nudgeGoal(eff);
  coach(!failBeat ? pickCoach() : 'That was silly! Try again — what else could work?');

  /* house morphs in place while the world pans past it — and never un-builds */
  const st = eff < .12 ? (houseHint(word) || 0)
           : eff < .45 ? Math.max(1, houseHint(word) || 1)
           : eff < .78 ? Math.max(2, houseHint(word) || 2)
           : 3;
  if (st > PaperWorld.houseStage) PaperWorld.setHouse(st);
  if (!alive()) return;

  /* BEAT 1 — forward travel: the fresh section slides in, the hero walks ahead */
  await PaperWorld.travelTo(gm.scene_seed);
  if (!alive()) return;

  /* BEAT 2 — the word becomes a real thing, dropped in with physics */
  let firstSpawn = null, firstKind = '';
  for (const p of (gm.props || [])) {
    const g = PaperWorld.spawnProp(p.kind, p.action, p.x);
    if (g && !firstSpawn && p.action !== 'remove') { firstSpawn = g; firstKind = p.kind; }
  }
  if (!firstSpawn) {                       // every typed word MUST spawn a thing
    const g = PaperWorld.spawnProp(word, 'spawn', .45);
    if (g) { firstSpawn = g; firstKind = word; }
  }
  await sleep(650); if (!alive()) return;  // let it land before the hero notices

  /* BEAT 3 — the signature gag */
  if (firstSpawn) {
    const gag = PaperWorld.propGag(firstKind);
    if (gag === 'ride') { coach(`Your hero hops on the ${firstKind}!`); await PaperWorld.heroRide(firstSpawn); }
    else if (gag === 'slip' || failBeat) { coach(`Whoops — the ${firstKind} is slippery!`); await PaperWorld.heroSlip(); }
    else if (gag === 'eat') { coach('Snack break!'); await PaperWorld.heroEat(firstSpawn); }
    else if (gag === 'bounce') { coach('Boing!'); await PaperWorld.heroBounce(firstSpawn); }
    else await PaperWorld.heroHop(firstSpawn.position.x - 20);
  } else if (failBeat) {
    await PaperWorld.heroSlip();           // comedic fail even without a prop
  }
  if (!alive()) return;

  /* did_you_mean — LLM field, else local near-miss guess */
  const guess = gm.did_you_mean || localGuess(word);
  if (guess && guess !== word) showDym(guess);

  /* payoff: goal met — or the brick house is standing and the pigs are
     safe inside (the natural finale beat of this story) */
  if (shownGoal >= .9 || (shownGoal >= .75 && PaperWorld.houseStage === 3)) endStory();
}

/* the bar animates toward the target — no teleporting, no big raw swings */
let goalTween = null;
function nudgeGoal(target) {
  target = Math.max(0, Math.min(1, target));
  if (goalTween) clearInterval(goalTween);
  goalTween = setInterval(() => {
    const d = target - shownGoal;
    if (Math.abs(d) < .004) { shownGoal = target; clearInterval(goalTween); goalTween = null; }
    else shownGoal += d * .18;
    goalFill.style.width = (shownGoal * 100).toFixed(1) + '%';
    goalPig.style.left = (shownGoal * 100).toFixed(1) + '%';
  }, 50);
}

function houseHint(word) {
  if (/brick/.test(word)) return 3;
  if (/stick|wood|twig/.test(word)) return 2;
  if (/straw|hay|build|house/.test(word)) return 1;
  return 0;
}
function pickCoach() {
  return ['The pigs oink happily!', 'Nice word! The story grew.',
    'The wolf is sniffing around…', 'Keep going — the brick house is close!'][(Math.random() * 4) | 0];
}

/* ---------- wolf meter DOM ---------- */
function setWolfMeter(v) {
  wolfFill.style.width = Math.min(100, v) + '%';
  wolfFill.classList.toggle('hot', v >= 60);
  wolfChip.textContent = v >= 85 ? 'HUFFING!' : v >= 60 ? 'getting huffy' : v >= 30 ? 'sniffing' : 'far away';
}

/* ---------- house events -> funny lines ---------- */
PaperWorld.onHouseEvent = (ev, stage) => {
  const names = ['', 'straw', 'stick', 'brick'];
  if (ev === 'collapse') addLine('storyteller', `WHOOSH! The ${names[stage]} house blows flat as a pancake!`);
  if (ev === 'rebuilt') addLine('storyteller', `The pigs wipe their noses and rebuild — ${names[stage]} this time! Stronger!`);
  if (ev === 'huff-fail') addLine('storyteller', 'The wolf huffs and puffs — but the brick house just giggles. The wolf spins away, dizzy!');
  if (ev === 'morphed') addLine('storyteller', `The house smooths and swells into sturdy ${names[stage]}!`);
  setWolfMeter(PaperWorld.wolfLevel);
};

/* ---------- story log ---------- */
function addLine(who, text) {
  const p = document.createElement('p');
  p.className = 'line ' + who;
  p.textContent = text;                      // LLM text via textContent — safe
  storyLines.appendChild(p);
  while (storyLines.children.length > 7) storyLines.firstChild.remove();
  storyLines.scrollTop = storyLines.scrollHeight;
  /* #narrative always mirrors the freshest storyteller line — big and bold */
  if (who === 'storyteller') {
    narrativeEl.textContent = text;
    narrativeEl.classList.remove('fresh');
    void narrativeEl.offsetWidth;
    narrativeEl.classList.add('fresh');
  }
}
function coach(text) { coachEl.textContent = text; }

/* ---------- did-you-mean ---------- */
const VOCAB = ['straw', 'hay', 'sticks', 'wood', 'bricks', 'build', 'house', 'gather',
  'run', 'walk', 'hide', 'river', 'bridge', 'swim', 'cross', 'forest', 'unicorn',
  'banana', 'peel', 'cookie', 'cake', 'balloon', 'torch', 'flower', 'tree',
  'dig', 'climb', 'jump', 'help', 'wolf', 'pig', 'inside', 'fast', 'door', 'chimney'];
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function localGuess(word) {
  const w = normTxt(word);
  if (!w || w.length < 3 || VOCAB.includes(w)) return null;
  let best = null, bd = 3;
  VOCAB.forEach(v => { const d = lev(w, v); if (d < bd) { bd = d; best = v; } });
  return bd <= 2 ? best : null;
}
const normTxt = w => (w || '').toLowerCase().replace(/[^a-z]/g, '');
function showDym(word) {
  dymEl.hidden = false;
  dymBtn.textContent = word;
  dymBtn.onclick = () => { wordInput.value = word; hideDym(); submitWord(word); };
}
function hideDym() { dymEl.hidden = true; }

/* ---------- end overlay ---------- */
function endStory() {
  wordInput.disabled = true; goBtn.disabled = true;   // the book is closed — till replay
  PaperWorld.confetti(PaperWorld.scope.view.size.width * .78, 160);
  const real = latencies.length;
  const avg = real ? Math.round(latencies.reduce((a, b) => a + b, 0) / real / 100) / 10 : 0;
  endSub.textContent = real
    ? `Every beat was answered by the real model (avg ${avg}s). The pigs are safe in the brick house!`
    : 'The pigs are safe in the brick house!';
  recapEl.innerHTML = '';
  wordsTyped.forEach(w => {
    const s = document.createElement('span');
    s.className = 'recap-word'; s.textContent = w;
    recapEl.appendChild(s);
  });
  setTimeout(() => { endOv.hidden = false; endOv.classList.add('show'); }, 1400);
}
function resetGame() {
  epoch++; demoOn = false; busy = false; started = false; headroomOK = false;
  queuedWord = null; shownGoal = 0;
  if (goalTween) { clearInterval(goalTween); goalTween = null; }
  history.length = 0; latencies.length = 0; wordsTyped.length = 0;
  storyLines.innerHTML = ''; obstacleRow.innerHTML = ''; choiceRow.innerHTML = '';
  narrativeEl.textContent = '';
  modeBadge.hidden = true; modeBadge.classList.remove('live');
  latChip.textContent = 'the storyteller is listening';
  hideDym();
  goalFill.style.width = '0%'; goalPig.style.left = '0%';
  setWolfMeter(0);
  PaperWorld.setHouse(0);
  PaperWorld.renderScene({ biome: 'meadow', seed: (Math.random() * 1e6) | 0, palette: 'warm', props: [] });
  endOv.classList.remove('show'); endOv.hidden = true;
  makerOv.hidden = false;
  requestAnimationFrame(() => makerOv.classList.add('show'));
  wordInput.disabled = true; goBtn.disabled = true;
  coach('Draw your hero to begin!');
}
againBtn.addEventListener('click', () => { resetGame(); surpriseMe(true); });

/* ---------- input wiring ---------- */
goBtn.addEventListener('click', () => submitWord(wordInput.value));
wordInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); submitWord(wordInput.value); }
});
wordInput.addEventListener('input', hideDym);

/* ============================================================
   WATCH IT PLAY — the whole journey through the REAL LLM
   ============================================================ */
const DEMO_WORDS = ['gather straw', 'build a house', 'unicorn', 'cross the river',
  'banana peel', 'gather bricks', 'build a brick house', 'hide inside'];

async function runDemo(ep) {
  try {
    for (let i = 0; i < DEMO_WORDS.length; i++) {
      if (!ok(ep) || !endOv.hidden) return;         // payoff reached — stop the show
      await sleep(650); if (!ok(ep)) return;
      /* never stack calls — wait until the last turn fully finished */
      while ((busy || queuedWord) && ok(ep)) await sleep(160);
      if (!ok(ep)) return;
      const word = DEMO_WORDS[i];
      for (const ch of word) {                     // type it like a kid
        if (!ok(ep)) return;
        wordInput.value += ch;
        await sleep(80 + Math.random() * 90);
      }
      await sleep(380); if (!ok(ep)) return;
      await submitWord(word, ep);
      while ((busy || queuedWord) && ok(ep)) await sleep(140);
      if (!ok(ep)) return;
      await sleep(500); if (!ok(ep)) return;
    }
  } finally {
    if (ok(ep)) { demoOn = false; stopBtn.classList.remove('show'); setInputLive(); }
  }
}
async function startDemo() {
  epoch++;
  const ep = epoch;
  demoOn = true;
  stopBtn.classList.add('show');
  await ensureHeadroom();                          // guardrail before a batch of calls
  if (!ok(ep)) return;
  if (!started || !PaperWorld.heroReady) {
    endOv.classList.remove('show'); endOv.hidden = true;
    makerOv.hidden = false;
    requestAnimationFrame(() => makerOv.classList.add('show'));
    await sleep(250); if (!ok(ep)) return;
    await surpriseMe(true); if (!ok(ep)) return;
    finishMaker();
    await sleep(400); if (!ok(ep)) return;
  }
  runDemo(ep);
}
function stopDemo() {
  epoch++;                     // kills every in-flight await loop + pending turn
  demoOn = false;
  queuedWord = null;
  stopBtn.classList.remove('show');
  makerBusy = false;
  latChip.classList.remove('thinking');
  setInputLive();
  coach('Demo stopped — your turn! Type a word.');
}
watchBtn.addEventListener('click', startDemo);
stopBtn.addEventListener('click', stopDemo);

/* the v3 dashboard drives every variant's iframe via these globals */
window.watchItPlay = startDemo;
window.stopWatch = stopDemo;

/* ---------- boot ---------- */
function boot() {
  PaperWorld.init(worldCv, stageEl);
  makerInit();
  clearMaker();
  setWolfMeter(0);
  /* title squiggle drawn with paper too */
  const S = new paper.PaperScope();
  const sq = document.createElement('canvas');
  sq.width = 500; sq.height = 32;
  titleSquig.replaceWith(sq);
  sq.className = 'squiggle';
  S.setup(sq);
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push([8 + i * 24, 10 + Math.sin(i * 1.15) * 5]);
  new S.Path({ segments: pts, strokeColor: '#FF6B57', strokeWidth: 7, strokeCap: 'round' }).smooth();

  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { PaperWorld.resize(); resizeMaker(); }, 180);
  });

  /* deep-link / headless hook: open with #watch to auto-run the demo */
  if (/#watch/.test(location.hash)) startDemo();
}
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
