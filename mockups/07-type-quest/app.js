/* Type the Tale — mockup 07
   Side-scrolling typing walk. Global keydown drives the letters;
   every system here is hardcoded front-end only. */

(function () {
  'use strict';

  /* ---------------- world data ---------------- */
  var WORLD_W = 2600;
  var WORDS = [
    { w: 'hop',    x: 470,  y: 369, cheer: 'hop! hop!' },
    { w: 'log',    x: 880,  y: 351, cheer: 'over the log!' },
    { w: 'bridge', x: 1340, y: 330, cheer: 'across the bridge!' },
    { w: 'moon',   x: 1790, y: 364, cheer: 'moon glow!' },
    { w: 'home',   x: 2210, y: 364, cheer: 'almost home!' }
  ];
  var START = { x: 96, y: 358 };
  var BOOK_STOP = { x: 2330, y: 348 };
  var PIP_BACK = 74;        // Pip stands this far behind the word's anchor x
  var WALK_MS = 1150;       // matches CSS transition on .pip / .layer
  var BUBBLE_LIFT = 165;    // bubbles float this high above the path

  // Story Guide lines shown after finishing word index N (hardcoded tutor).
  var GUIDE_AFTER = {
    0: 'That was your first word — nice typing!',
    2: 'You typed \u2018bridge\u2019 — bridges cross water!',
    3: 'You typed \u2018moon\u2019 — the moon glows at bedtime!'
  };

  // Kid-friendly letter hints when a key keeps missing.
  var LETTER_HINTS = {
    b: 'tall line with a belly', d: 'a belly with a tall line',
    e: 'a loop with a line',     g: 'a circle with a tail',
    h: 'tall line with a bump',  i: 'a line with a dot',
    l: 'one tall line',          m: 'two bumps',
    n: 'one bump',               o: 'a round circle',
    p: 'a line down with a balloon', r: 'a line with a little arm'
  };

  var RANKS = ['New Reader', 'Sound-Outer', 'Word Walker', 'Page Turner', 'Story Scout', 'Chapter Champ'];

  /* ---------------- dom ---------------- */
  var stage      = document.getElementById('stage');
  var bubblesBox = document.getElementById('bubbles');
  var pip        = document.getElementById('pip');
  var guide      = document.getElementById('guide');
  var guideText  = document.getElementById('guideText');
  var cheer      = document.getElementById('cheer');
  var confetti   = document.getElementById('confetti');
  var wordChip   = document.getElementById('wordChip');
  var starsBox   = document.getElementById('stars');
  var rankEl     = document.getElementById('rank');
  var hintChip   = document.getElementById('hintChip');
  var startOv    = document.getElementById('startOverlay');
  var endOv      = document.getElementById('endOverlay');
  var startBtn   = document.getElementById('startBtn');
  var againBtn   = document.getElementById('againBtn');
  var recapBox   = document.getElementById('recap');
  var slipsEl    = document.getElementById('slips');
  var tapType    = document.getElementById('tapType');
  var watchBtn   = document.getElementById('watchBtn');
  var watchAgain = document.getElementById('watchAgainBtn');
  var stopBtn    = document.getElementById('stopBtn');
  var ghost      = document.getElementById('ghost');
  var book       = document.getElementById('book');
  var layers     = Array.prototype.slice.call(document.querySelectorAll('.layer'));

  /* ---------------- state ---------------- */
  var state = 'idle';      // idle | typing | walking | done
  var wi = 0;              // word index
  var li = 0;              // letter index inside current word
  var camX = 0;
  var pipX = START.x, pipY = START.y;
  var misses = 0;
  var missStreak = 0;
  var buffer = [];         // letters typed early during a walk
  var guideTimer = null;
  var bubbles = [];        // {el, letters[]}

  /* ---------------- tiny sounds (WebAudio, optional) ---------------- */
  var AC = null;
  function audio() {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      return AC;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, when) {
    var ac = audio(); if (!ac) return;
    try {
      var t = ac.currentTime + (when || 0);
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.14, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* silent */ }
  }
  function sfxTick()  { tone(830, 0.07, 'triangle', 0.16); tone(1320, 0.06, 'sine', 0.09, 0.035); }
  function sfxSoft()  { tone(196, 0.14, 'sine', 0.11); }
  function sfxWord()  { [523, 659, 784].forEach(function (f, i) { tone(f, 0.1, 'triangle', 0.15, i * 0.07); }); }
  function sfxWin()   { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.13, 'triangle', 0.15, i * 0.09); }); }

  /* ---------------- build scene ---------------- */
  function buildStars() {
    starsBox.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 20 20');
      var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      u.setAttribute('href', '#star');
      u.setAttribute('class', 'st');
      s.appendChild(u);
      starsBox.appendChild(s);
    }
  }

  function buildBubbles() {
    bubblesBox.innerHTML = '';
    bubbles = WORDS.map(function (word, idx) {
      var el = document.createElement('div');
      el.className = 'wbubble upcoming';
      el.style.left = word.x + 'px';
      el.style.top = (word.y - BUBBLE_LIFT) + 'px';
      var letters = word.w.split('').map(function (ch) {
        var s = document.createElement('span');
        s.className = 'l';
        s.textContent = ch;
        el.appendChild(s);
        return s;
      });
      var check = document.createElement('span');
      check.className = 'check';
      check.innerHTML = '<svg viewBox="0 0 20 20"><path d="M4 10.5 L8.5 15 L16 5.5" fill="none" stroke="#FFFDF6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      el.appendChild(check);
      bubblesBox.appendChild(el);
      return { el: el, letters: letters };
    });
  }

  /* ---------------- camera + pip ---------------- */
  function stageW() { return stage.clientWidth; }

  function setCamera(target, snap) {
    var max = Math.max(0, WORLD_W - stageW());
    camX = Math.min(Math.max(target, 0), max);
    layers.forEach(function (ly) {
      if (snap) ly.classList.add('snap'); else ly.classList.remove('snap');
      var depth = parseFloat(ly.getAttribute('data-depth'));
      ly.style.transform = 'translate3d(' + (-camX * depth) + 'px,0,0)';
    });
    if (snap) requestAnimationFrame(function () {
      layers.forEach(function (ly) { ly.classList.remove('snap'); });
    });
  }

  function setPip(x, y, snap) {
    pipX = x; pipY = y;
    if (snap) pip.classList.add('snap');
    pip.style.transform = 'translate3d(' + (x - camX - 22) + 'px,' + (y - 97) + 'px,0)';
    if (snap) requestAnimationFrame(function () { pip.classList.remove('snap'); });
  }

  function cameraTargetFor(x) { return x - stageW() * 0.46; }

  window.addEventListener('resize', function () {
    setCamera(cameraTargetFor(currentFocusX()), true);
    setPip(pipX, pipY, true);
  });

  function currentFocusX() {
    if (state === 'idle') return START.x;
    if (wi < WORDS.length) return WORDS[wi].x;
    return BOOK_STOP.x;
  }

  /* ---------------- guide bubble ---------------- */
  function showGuide(text, ms) {
    guideText.textContent = text;
    guide.classList.add('show');
    clearTimeout(guideTimer);
    guideTimer = setTimeout(hideGuide, ms || 2800);
  }
  function hideGuide() { guide.classList.remove('show'); }

  /* ---------------- confetti ---------------- */
  var CONF_COLORS = ['#FF6B57', '#FFC53D', '#4FB06D', '#5DA9E9', '#B565D8'];
  function burst(x, y, n, spread) {
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      var ang = Math.random() * Math.PI * 2;
      var d = (spread || 70) * (0.45 + Math.random() * 0.8);
      var size = 5 + Math.random() * 6;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.width = size + 'px';
      p.style.height = size * (Math.random() > .5 ? 1 : .55) + 'px';
      p.style.background = CONF_COLORS[i % CONF_COLORS.length];
      p.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
      p.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * d - 28) + 'px');
      p.style.setProperty('--rot', (Math.random() * 260 - 130) + 'deg');
      confetti.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 900); })(p);
    }
  }
  function burstAtPip(n, spread) {
    burst(pipX - camX + 24, pipY - 80, n, spread);
  }

  /* ---------------- typing ---------------- */
  function activateWord() {
    var b = bubbles[wi];
    b.el.classList.remove('upcoming', 'done');
    b.el.classList.add('active');
    li = 0;
    missStreak = 0;
    b.letters.forEach(function (l, i) {
      l.classList.remove('typed', 'cur', 'oops');
      if (i === 0) l.classList.add('cur');
    });
    wordChip.textContent = 'Word ' + (wi + 1) + ' of ' + WORDS.length;
  }

  function handleLetter(k, silentWrong) {
    if (state !== 'typing') return;
    var word = WORDS[wi].w;
    var expected = word[li];
    var b = bubbles[wi];

    if (k === expected) {
      var el = b.letters[li];
      el.classList.remove('cur', 'oops');
      el.classList.add('typed');
      sfxTick();
      missStreak = 0;
      li++;
      if (li >= word.length) {
        wordComplete();
      } else {
        b.letters[li].classList.add('cur');
      }
    } else {
      var cur = b.letters[li];
      cur.classList.remove('oops');
      void cur.offsetWidth; // restart animation
      cur.classList.add('oops');
      clearTimeout(cur._oopsT);
      cur._oopsT = setTimeout(function () { cur.classList.remove('oops'); }, 500);
      if (!silentWrong) {
        sfxSoft();
        misses++;
        missStreak++;
        if (missStreak >= 2) {
          missStreak = 0;
          var hint = LETTER_HINTS[expected];
          showGuide('Stuck? Try \u2018' + expected + '\u2019' + (hint ? ' — ' + hint : '') + '!', 3400);
        }
      }
    }
  }

  function wordComplete() {
    state = 'walking';
    var w = WORDS[wi];
    var b = bubbles[wi];
    b.el.classList.remove('active');
    b.el.classList.add('done');

    // celebration: cheer text + confetti + sound + meter
    cheer.textContent = w.cheer;
    cheer.classList.remove('pop');
    void cheer.offsetWidth;
    cheer.classList.add('pop');
    burst(w.x - camX - 8, w.y - BUBBLE_LIFT + 10, 10, 60);
    sfxWord();
    setStars(wi + 1);

    var last = wi === WORDS.length - 1;
    var target = last ? BOOK_STOP : { x: WORDS[wi + 1].x - PIP_BACK, y: WORDS[wi + 1].y };

    setTimeout(function () {
      pip.classList.add('walking');
      setCamera(cameraTargetFor(target.x + PIP_BACK));
      setPip(target.x, target.y);

      // Story Guide line mid-walk (hardcoded tutor moment)
      var guideLine = GUIDE_AFTER[wi];
      if (guideLine && !last) {
        setTimeout(function () { showGuide(guideLine, 3000); }, 550);
      }
    }, 260);

    setTimeout(function () {
      pip.classList.remove('walking');
      arrive();
    }, 260 + WALK_MS + 60);
  }

  function arrive() {
    if (wi === WORDS.length - 1) { finishChapter(); return; }
    wi++;
    activateWord();
    state = 'typing';
    // replay anything the kid typed while Pip was still walking
    var queued = buffer; buffer = [];
    for (var i = 0; i < queued.length; i++) {
      var word = WORDS[wi].w;
      if (state === 'typing' && queued[i] === word[li]) {
        handleLetter(queued[i], true);
      }
    }
  }

  function setStars(n) {
    var uses = starsBox.querySelectorAll('.st');
    uses.forEach(function (u, i) {
      if (i < n) u.classList.add('on'); else u.classList.remove('on');
    });
    rankEl.textContent = RANKS[Math.min(n, RANKS.length - 1)];
  }

  /* ---------------- auto-play demo ----------------
     "Watch it play" types each word itself with a believable cadence:
     jittered per-letter timing, a beat before each new word, and an
     occasional neighboring-key slip that gets self-corrected.        */
  var auto = { on: false, timer: null, armed: false };

  var KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  function neighborKey(ch) {
    for (var r = 0; r < KEY_ROWS.length; r++) {
      var i = KEY_ROWS[r].indexOf(ch);
      if (i < 0) continue;
      var opts = [];
      if (i > 0) opts.push(KEY_ROWS[r][i - 1]);
      if (i < KEY_ROWS[r].length - 1) opts.push(KEY_ROWS[r][i + 1]);
      if (opts.length) return opts[Math.floor(Math.random() * opts.length)];
    }
    var rest = 'abcdefghijklmnopqrstuvwxyz'.replace(ch, '');
    return rest[Math.floor(Math.random() * rest.length)];
  }

  function startAuto() {
    if (state === 'idle') startGame();
    if (auto.on) return;
    auto.on = true;
    auto.armed = false;
    stopBtn.classList.add('show');
    scheduleAuto(650);
  }
  function stopAuto() {
    auto.on = false;
    auto.armed = false;
    clearTimeout(auto.timer);
    stopBtn.classList.remove('show');
  }
  function scheduleAuto(ms) {
    clearTimeout(auto.timer);
    auto.timer = setTimeout(autoStep, ms);
  }
  function autoStep() {
    if (!auto.on) return;
    if (state === 'done') { stopAuto(); return; }
    if (state !== 'typing') { scheduleAuto(300); return; } // wait out the walk
    // a small beat before starting each fresh word
    if (li === 0 && !auto.armed) {
      auto.armed = true;
      scheduleAuto(360 + Math.random() * 240);
      return;
    }
    auto.armed = false;
    var expected = WORDS[wi].w[li];
    if (Math.random() < 0.09) {
      // believable slip: hit a neighboring key, notice it, then fix it
      handleLetter(neighborKey(expected), false);
      scheduleAuto(620 + Math.random() * 340);
      return;
    }
    handleLetter(expected, false);
    scheduleAuto(170 + Math.random() * 230);
  }

  /* ---------------- payoff ---------------- */
  function finishChapter() {
    stopAuto();
    state = 'done';
    pip.classList.add('celebrate');
    book.classList.add('lit');
    sfxWin();
    burstAtPip(26, 120);
    setTimeout(function () { burst(BOOK_STOP.x - camX + 40, BOOK_STOP.y - 110, 20, 110); }, 250);

    // recap chips
    recapBox.innerHTML = '';
    WORDS.forEach(function (w) {
      var c = document.createElement('span');
      c.className = 'rechip';
      c.innerHTML = '<svg viewBox="0 0 20 20"><path d="M4 10.5 L8.5 15 L16 5.5" fill="none" stroke="#4FB06D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' + w.w;
      recapBox.appendChild(c);
    });
    slipsEl.textContent = misses === 0
      ? 'Perfect typing — not one slip!'
      : misses + ' little slip' + (misses === 1 ? '' : 's') + ' — and you kept going!';

    setTimeout(function () {
      pip.classList.remove('celebrate');
      endOv.hidden = false;
      requestAnimationFrame(function () { endOv.classList.add('show'); });
    }, 1100);
  }

  /* ---------------- start / reset ---------------- */
  function startGame() {
    if (state !== 'idle') return;
    audio(); // unlock sound inside the user gesture
    startOv.classList.remove('show');
    state = 'typing';
    hintChip.style.opacity = '0';
    setTimeout(function () { startOv.hidden = true; }, 380);
    activateWord();
    setCamera(cameraTargetFor(WORDS[0].x), false);
    setPip(WORDS[0].x - PIP_BACK, WORDS[0].y); // little hop toward word one
    pip.classList.add('walking');
    setTimeout(function () { pip.classList.remove('walking'); }, WALK_MS + 60);
    focusGhost();
  }

  function resetGame() {
    endOv.classList.remove('show');
    setTimeout(function () { endOv.hidden = true; }, 320);
    wi = 0; li = 0; misses = 0; missStreak = 0; buffer = [];
    hideGuide();
    book.classList.remove('lit');
    setStars(0);
    buildBubbles();
    pip.classList.remove('walking', 'celebrate');
    setCamera(cameraTargetFor(START.x + 200), true);
    setPip(START.x, START.y, true);
    setTimeout(function () {
      state = 'typing';
      activateWord();
      setCamera(cameraTargetFor(WORDS[0].x), false);
      setPip(WORDS[0].x - PIP_BACK, WORDS[0].y);
      pip.classList.add('walking');
      setTimeout(function () { pip.classList.remove('walking'); }, WALK_MS + 60);
    }, 420);
    focusGhost();
  }

  /* ---------------- input ---------------- */
  function focusGhost() {
    try { ghost.focus({ preventScroll: true }); } catch (e) { ghost.focus(); }
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;

    if (state === 'idle') {
      if (/^[a-zA-Z]$/.test(k)) {
        e.preventDefault();
        startGame();
        handleLetter(k.toLowerCase(), false); // the first key counts as a real letter
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (auto.on) stopAuto(); // any real key takes the demo back over
    if (state === 'done') {
      if (k === 'Enter') { e.preventDefault(); resetGame(); }
      return;
    }
    if (!/^[a-zA-Z]$/.test(k)) {
      if (k === ' ') e.preventDefault(); // no page scroll mid-walk
      return;
    }
    e.preventDefault();

    var letter = k.toLowerCase();
    if (state === 'typing') {
      handleLetter(letter, false);
    } else if (state === 'walking') {
      if (buffer.length < 8) buffer.push(letter);
    }
  });

  // mobile path: the hidden input delivers 'input' events instead of real keydowns
  ghost.addEventListener('input', function () {
    var v = ghost.value;
    ghost.value = '';
    if (!v) return;
    var ch = v.slice(-1).toLowerCase();
    if (!/^[a-z]$/.test(ch)) return;
    if (auto.on) stopAuto();
    if (state === 'idle') { startGame(); handleLetter(ch, false); return; }
    if (state === 'typing') handleLetter(ch, false);
    else if (state === 'walking' && buffer.length < 8) buffer.push(ch);
  });

  startBtn.addEventListener('click', startGame);
  watchBtn.addEventListener('click', startAuto);
  stopBtn.addEventListener('click', stopAuto);
  watchAgain.addEventListener('click', function () {
    resetGame();
    setTimeout(startAuto, 500); // let the reset settle, then replay
  });
  againBtn.addEventListener('click', resetGame);
  tapType.addEventListener('click', function () {
    if (state === 'idle') startGame();
    focusGhost();
  });
  stage.addEventListener('pointerdown', function () {
    if (state !== 'idle') focusGhost();
  });

  /* ---------------- init ---------------- */
  buildStars();
  buildBubbles();
  setStars(0);
  setCamera(cameraTargetFor(START.x + 200), true);
  setPip(START.x, START.y, true);
})();
