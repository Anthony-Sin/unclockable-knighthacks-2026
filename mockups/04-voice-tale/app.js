/* Read It Aloud — voice mockup for "Pip & the Storywood"
 *
 * The mic path is REAL: getUserMedia + AnalyserNode draw the live waveform
 * and detect voice level. The recognition itself is hardcoded — it stands in
 * for read-aloud speech AI like Google's Read Along / the Web Speech API.
 * Two no-mic paths are built in: "Let Pip read it" (auto-demo) and
 * "Pretend mode" (tap when you've said it).
 */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);

/* ---------- story data ---------- */

const BEATS = [
  { word: 'moon',   pre: 'Pip found a shiny',       post: 'stone.', gem: 'M', gemColor: '#FFC53D', scene: 'moon',   praise: 'Nice reading!',  page: 'Page 1 of 4' },
  { word: 'bridge', pre: 'Pip tiptoes over the',    post: '',       gem: 'B', gemColor: '#5DA9E9', scene: 'bridge', praise: 'You did it!',    page: 'Page 2 of 4' },
  { word: 'dance',  pre: 'The fireflies start to',  post: '',       gem: 'D', gemColor: '#B565D8', scene: 'dance',  praise: 'Great job!',     page: 'Page 3 of 4' },
  { word: 'home',   pre: 'Pip scampers all the way',post: '',       gem: 'H', gemColor: '#FF6B57', scene: 'home',   praise: 'So brave!',      page: 'Page 4 of 4' },
];

const VOICE_NEED_MS = 1700;   // ~1.5–2s of detected voice triggers the mock recognition
const MAX_LISTEN_MS = 12000;  // safety: never leave the mic on forever
const FAKE_VOICE_MS = 2000;   // auto-demo "Pip reads" duration
const THINK_MS = 1000;        // simulated "Listening…" AI pause
const CHIP_MS = 1600;         // how long the recognition chip shows

const TDOTS = '<span class="tdots"><i></i><i></i><i></i></span>';
const COLORS = ['#FFC53D', '#FF6B57', '#4FB06D', '#5DA9E9', '#B565D8'];

/* ---------- elements ---------- */

const hero = $('#hero'), game = $('#game'), foot = $('#foot');
const startBtn = $('#startBtn');
const storybook = $('#storybook'), controls = $('#controls'), payoff = $('#payoff');
const sentence = $('#sentence'), pageLabel = $('#pageLabel');
const dots = $('#dots'), gemsEarned = $('#gemsEarned');
const sceneSvg = $('#sceneSvg');
const orb = $('#micOrb'), canvas = $('#wave'), orbCaption = $('#orbCaption');
const micNote = $('#micNote');
const autoBtn = $('#autoBtn'), pretendBtn = $('#pretendBtn');
const stageText = $('#stageText'), stageSub = $('#stageSub');
const chip = $('#chip'), chipWord = $('#chipWord'), chipSub = $('#chipSub');
const gemRow = $('#gemRow'), againBtn = $('#againBtn');

const cctx = canvas.getContext('2d');

/* ---------- state ---------- */

let idx = 0;
let state = 'idle';           // idle | live | think | chip | done
let micOff = false;
let earned = [];

let stream = null, actx = null, analyser = null;
let buf = null;
let raf = 0;
let voiceMs = 0, lastT = 0, listenStart = 0, downAt = 0;
let fakeMode = false, fakeT = 0, fakeStart = 0;
let thinkTimer = 0, chipTimer = 0;

/* ---------- small builders ---------- */

function gemSVG(color, letter, size) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
    <path d="M20 3 L35 15 L28 37 L12 37 L5 15 Z" fill="${color}" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
    <path d="M5 15 L35 15" stroke="#2B2118" stroke-width="2"/>
    <text x="20" y="28" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="14" font-weight="700" fill="#2B2118">${letter}</text>
  </svg>`;
}

function dimSpan(text) {
  const s = document.createElement('span');
  s.className = 'w';
  s.textContent = text;
  return s;
}

function buildDots() {
  dots.innerHTML = '';
  BEATS.forEach((b, n) => {
    const d = document.createElement('span');
    d.className = 'dot' + (n < idx ? ' done' : n === idx ? ' now' : '');
    dots.appendChild(d);
  });
}

function renderEarned() {
  gemsEarned.innerHTML = earned.map((g) => gemSVG(g.gemColor, g.gem, 22)).join('');
}

/* ---------- beat flow ---------- */

function loadBeat() {
  const b = BEATS[idx];
  state = 'idle';

  sentence.innerHTML = '';
  if (b.pre) sentence.appendChild(dimSpan(b.pre + ' '));
  const pill = document.createElement('span');
  pill.className = 'pill';
  pill.id = 'pill';
  pill.setAttribute('aria-label', 'say: ' + b.word);
  [...b.word.toUpperCase()].forEach((ch) => {
    const l = document.createElement('span');
    l.className = 'ltr';
    l.textContent = ch;
    pill.appendChild(l);
  });
  sentence.appendChild(pill);
  if (b.post) sentence.appendChild(dimSpan(' ' + b.post));
  sentence.classList.remove('swap');
  void sentence.offsetWidth; // restart the pop animation
  sentence.classList.add('swap');

  pageLabel.textContent = b.page;
  buildDots();

  sceneSvg.dataset.scene = b.scene;
  sceneSvg.querySelectorAll('.scene').forEach((g) => {
    g.classList.toggle('on', g.id === 's-' + b.scene);
  });

  orb.className = 'orb' + (micOff ? ' off' : '');
  orbCaption.textContent = micOff
    ? 'Mic is sleeping — pretend mode below works great!'
    : 'Tap or hold the mic, then say the shiny word.';
  stageText.textContent = '';
  stageSub.textContent = '';
  chipSub.textContent = '';
  chip.classList.remove('show');
  autoBtn.classList.remove('dim');
  pretendBtn.classList.remove('dim');
}

function lockAltButtons() {
  autoBtn.classList.add('dim');
  pretendBtn.classList.add('dim');
}

/* ---------- mic path (real audio) ---------- */

async function startListening() {
  if (state !== 'idle' || micOff) {
    if (micOff) {
      orb.classList.add('shake');
      setTimeout(() => orb.classList.remove('shake'), 400);
    }
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    onMicDenied();
    return;
  }

  state = 'live';
  fakeMode = false;
  voiceMs = 0;
  lastT = performance.now();
  listenStart = lastT;
  lockAltButtons();

  orb.classList.add('live');
  orbCaption.textContent = 'Listening… say the shiny word!';
  stageText.innerHTML = 'Listening' + TDOTS;
  stageSub.textContent = 'Those squiggles are your real voice — the “who heard it” part is pretend.';

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (err) {
    onMicDenied();
    return;
  }

  // The user may have released / cancelled while the permission prompt was up.
  if (state !== 'live') { stopMic(); return; }

  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    const src = actx.createMediaStreamSource(stream);
    analyser = actx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    src.connect(analyser);
    buf = new Uint8Array(analyser.fftSize);
  } catch (err) {
    onMicDenied();
    return;
  }

  raf = requestAnimationFrame(tick);
}

function tick(now) {
  const dt = Math.min(64, now - lastT);
  lastT = now;

  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buf.length);

  if (rms > 0.04) {
    voiceMs += dt;
    if (voiceMs > 350) orbCaption.textContent = 'I hear you! Keep going…';
  } else {
    voiceMs = Math.max(0, voiceMs - dt * 1.5);
  }

  drawWave();

  if (voiceMs >= VOICE_NEED_MS || now - listenStart > MAX_LISTEN_MS) {
    finishListening();
    return;
  }
  raf = requestAnimationFrame(tick);
}

/* ---------- auto-demo path (fake voice, no mic) ---------- */

function startAutoDemo() {
  if (state !== 'idle') return;
  const b = BEATS[idx];
  state = 'live';
  fakeMode = true;
  fakeT = 0;
  fakeStart = performance.now();
  lockAltButtons();

  orb.classList.add('live');
  const pill = document.getElementById('pill');
  if (pill) pill.classList.add('reading');
  orbCaption.textContent = 'Pip is reading it for you…';
  stageText.innerHTML = 'Pip says' + TDOTS;
  stageSub.textContent = `“${b.word.toUpperCase()}!” — the auto-demo, no mic needed. Press it again on the next page.`;
  raf = requestAnimationFrame(fakeTick);
}

function fakeTick(now) {
  fakeT += 1;
  drawWave();
  if (now - fakeStart > FAKE_VOICE_MS) {
    finishListening();
    return;
  }
  raf = requestAnimationFrame(fakeTick);
}

/* ---------- pretend path (clearly labeled manual fallback) ---------- */

function pretendSaidIt() {
  if (state !== 'idle') return;
  state = 'think';
  lockAltButtons();
  orb.classList.add('thinking');
  orbCaption.textContent = 'You said it out loud — that’s the important part!';
  stageText.innerHTML = 'Listening' + TDOTS;
  stageSub.textContent = 'Pretend mode — we’ll just smile and nod here.';
  thinkTimer = setTimeout(showChip, THINK_MS - 150);
}

/* ---------- shared finish: simulated AI moment ---------- */

function finishListening() {
  if (state !== 'live') return;
  state = 'think';
  const wasFake = fakeMode;
  fakeMode = false;
  stopMic();
  orb.classList.remove('live');
  orb.classList.add('thinking');
  const pill = document.getElementById('pill');
  if (pill) pill.classList.remove('reading');

  orbCaption.textContent = 'Hmm, let me think…';
  stageText.innerHTML = 'Listening' + TDOTS;
  stageSub.textContent = wasFake
    ? 'Pip heard himself loud and clear.'
    : 'In the real game, speech AI like Google’s Read Along checks the word you read.';
  thinkTimer = setTimeout(showChip, THINK_MS);
}

function showChip() {
  if (state !== 'think') return;
  const b = BEATS[idx];
  state = 'chip';

  orb.classList.remove('thinking');
  orb.classList.add('done');
  chipWord.textContent = b.word;
  chip.classList.add('show');
  chipSub.textContent = `${b.praise} — demo result · real games use speech AI like Google’s Read Along`;
  stageText.textContent = 'You read it!';
  stageSub.textContent = '';
  orbCaption.textContent = 'A letter-gem for Pip!';

  earned.push(b);
  renderEarned();
  sparkles();

  chipTimer = setTimeout(() => {
    idx += 1;
    if (idx >= BEATS.length) showPayoff();
    else loadBeat();
  }, CHIP_MS);
}

/* ---------- payoff ---------- */

function showPayoff() {
  state = 'done';
  storybook.classList.add('hidden');
  controls.classList.add('hidden');
  payoff.classList.remove('hidden');
  gemRow.innerHTML = earned.map((g) => gemSVG(g.gemColor, g.gem, 60)).join('');
  confetti();
}

function resetGame() {
  idx = 0;
  earned = [];
  renderEarned();
  payoff.classList.add('hidden');
  storybook.classList.remove('hidden');
  controls.classList.remove('hidden');
  loadBeat();
}

/* ---------- waveform drawing (real + fake) ---------- */

function roundBar(x, y, w, h) {
  const r = Math.min(w / 2, h / 2);
  cctx.beginPath();
  cctx.moveTo(x + r, y);
  cctx.arcTo(x + w, y, x + w, y + h, r);
  cctx.arcTo(x + w, y + h, x, y + h, r);
  cctx.arcTo(x, y + h, x, y, r);
  cctx.arcTo(x, y, x + w, y, r);
  cctx.closePath();
}

function drawWave() {
  const W = canvas.width, H = canvas.height;
  cctx.clearRect(0, 0, W, H);
  const N = 18, bw = W / N;
  for (let i = 0; i < N; i++) {
    let v;
    if (fakeMode) {
      // playful synthesized voice for the auto-demo
      v = (Math.sin(fakeT * 0.11 + i * 0.9) * 0.5 + 0.5)
        * (0.3 + 0.7 * Math.abs(Math.sin(fakeT * 0.06 + i * 0.4)));
      v *= 0.9;
    } else if (buf) {
      const s = buf[Math.floor((i / N) * buf.length)];
      v = Math.min(1, (Math.abs(s - 128) / 128) * 3.4);
    } else {
      v = 0;
    }
    const bh = Math.max(4, v * H * 0.64);
    const x = i * bw + bw * 0.28;
    const y = (H - bh) / 2;
    cctx.fillStyle = COLORS[i % COLORS.length];
    roundBar(x, y, bw * 0.44, bh);
    cctx.fill();
  }
}

/* ---------- cleanup ---------- */

function stopMic() {
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (actx) {
    actx.close().catch(() => {});
    actx = null;
    analyser = null;
    buf = null;
  }
  cctx.clearRect(0, 0, canvas.width, canvas.height);
}

function onMicDenied() {
  micOff = true;
  state = 'idle';
  stopMic();
  orb.classList.remove('live');
  orb.classList.add('off');
  orbCaption.textContent = 'Mic is sleeping. Pretend mode works great!';
  micNote.textContent = 'Mic is off or blocked — no worries! Use pretend mode below, or let Pip read it.';
  micNote.classList.remove('hidden');
  stageText.textContent = '';
  stageSub.textContent = '';
  autoBtn.classList.remove('dim');
  pretendBtn.classList.remove('dim');
  pretendBtn.classList.add('pulse');
}

/* ---------- sparkles & confetti ---------- */

function sparkles() {
  const r = chip.getBoundingClientRect();
  const c = controls.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.style.left = (r.left - c.left + r.width / 2 - 7) + 'px';
    s.style.top = (r.top - c.top + 8) + 'px';
    s.style.setProperty('--dx', Math.random() * 150 - 75 + 'px');
    s.style.setProperty('--dy', (-30 - Math.random() * 70) + 'px');
    s.style.background = COLORS[i % COLORS.length];
    s.style.clipPath = 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)';
    controls.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

function confetti() {
  for (let i = 0; i < 28; i++) {
    const c = document.createElement('i');
    c.className = 'cf';
    c.style.left = (Math.random() * 96) + '%';
    c.style.background = COLORS[i % COLORS.length];
    c.style.animationDelay = (Math.random() * 0.55) + 's';
    c.style.transform = `rotate(${Math.random() * 180}deg)`;
    payoff.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

/* ---------- wiring ---------- */

// Press-and-hold AND tap-to-toggle both work.
orb.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (state === 'live' && !fakeMode) { finishListening(); return; } // second tap stops
  if (state !== 'idle') return;
  downAt = performance.now();
  startListening();
});

function releaseMic() {
  if (state !== 'live' || fakeMode || !downAt) return;
  const held = performance.now() - downAt;
  downAt = 0;
  // quick tap => keep listening (toggle mode); held => "on release" finish
  if (held >= 350) finishListening();
}
window.addEventListener('pointerup', releaseMic);
window.addEventListener('pointercancel', releaseMic);

// Keyboard activation (Enter/Space produce click with detail 0)
orb.addEventListener('click', (e) => {
  if (e.detail !== 0) return;
  if (state === 'idle') startListening();
  else if (state === 'live' && !fakeMode) finishListening();
});
orb.addEventListener('contextmenu', (e) => e.preventDefault());

autoBtn.addEventListener('click', startAutoDemo);
pretendBtn.addEventListener('click', pretendSaidIt);

startBtn.addEventListener('click', () => {
  hero.classList.add('hidden');
  game.classList.remove('hidden');
  foot.classList.remove('hidden');
  loadBeat();
});

againBtn.addEventListener('click', resetGame);

// Never leave the mic stream behind.
window.addEventListener('pagehide', stopMic);
window.addEventListener('beforeunload', stopMic);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  if (state === 'live') finishListening(); // resolves fake mode too
  else stopMic();
});

})();
