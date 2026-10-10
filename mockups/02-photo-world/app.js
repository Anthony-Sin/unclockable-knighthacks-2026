/* Snap-a-World — mockup 02
 * Flow: camera/picker -> snap -> fake AI scan -> photo becomes a playable-looking
 * Storywood scene (real color sampling, fake detection) -> letter-gem reward.
 * Everything is hardcoded front-end; the only real math is canvas color sampling.
 */

(() => {
  'use strict';

  // ---------- elements ----------
  const $ = (id) => document.getElementById(id);
  const stages = {
    camera: $('stage-camera'),
    scan: $('stage-scan'),
    world: $('stage-world'),
  };
  const video = $('cam');
  const vf = $('vf');
  const vfMsg = $('vfMsg');
  const vfHint = $('vfHint');
  const flash = $('flash');
  const shutter = $('shutter');
  const picker = $('picker');
  const pickerNote = $('pickerNote');
  const pickInstead = $('pickInstead');
  const watchDemo = $('watchDemo');
  const backToCam = $('backToCam');
  const scanImg = $('scanImg');
  const scanline = $('scanline');
  const chipsBox = $('chips');
  const stepEls = Array.from(document.querySelectorAll('.step'));
  const worldNameEl = $('worldName');
  const worldEl = $('world');
  const worldPhoto = $('worldPhoto');
  const captionEl = $('caption');
  const gemPop = $('gemPop');
  const gemBody = $('gemBody');
  const gemLetter = $('gemLetter');
  const gemTag = $('gemTag');
  const againBtn = $('again');

  const SNAP_W = 960;
  const SNAP_H = 720;

  // ---------- fake "detection" data ----------

  const WORLDS = {
    dragon: {
      name: 'Welcome to Dragon Valley!',
      letter: 'D',
      gem: '#4FB06D',
      chips: [
        { t: 'dragon!', x: 48, y: 56 },
        { t: 'spiky spikes!', x: 46, y: 42 },
        { t: 'grass!', x: 20, y: 74 },
      ],
      line1: 'Pip stomped into Dragon Valley. Even the mountains smell like crayons here.',
    },
    house: {
      name: 'Welcome to Cozy Hollow!',
      letter: 'C',
      gem: '#FF6B57',
      chips: [
        { t: 'a house!', x: 50, y: 50 },
        { t: 'tiny door!', x: 50, y: 64 },
        { t: 'chimney!', x: 60, y: 35 },
      ],
      line1: 'Pip knocked on a door in Cozy Hollow. Somebody inside put the kettle on.',
    },
    sun: {
      name: 'Welcome to Sunny Meadows!',
      letter: 'S',
      gem: '#FFC53D',
      chips: [
        { t: 'sunshine!', x: 50, y: 42 },
        { t: 'fluffy cloud!', x: 28, y: 32 },
        { t: 'warm rays!', x: 62, y: 24 },
      ],
      line1: 'Pip squinted up at Sunny Meadows. The grass giggled in the warm breeze.',
    },
    sea: {
      name: 'Welcome to Bubble Bay!',
      letter: 'B',
      gem: '#5DA9E9',
      chips: [
        { t: 'water!', x: 48, y: 60 },
        { t: 'a boat!', x: 62, y: 40 },
        { t: 'splash!', x: 26, y: 76 },
      ],
      line1: 'Pip dipped a toe into Bubble Bay. The waves spelled his name in foam.',
    },
    pebble: {
      name: 'Welcome to Pebble Peaks!',
      letter: 'P',
      gem: '#B565D8',
      chips: [
        { t: 'mountain!', x: 50, y: 44 },
        { t: 'snowy top!', x: 62, y: 22 },
        { t: 'rocks!', x: 24, y: 74 },
      ],
      line1: 'Pip tiptoed into Pebble Peaks. The quiet rocks hummed a bedtime tune.',
    },
  };

  // ---------- state ----------

  let stream = null;
  let busy = false;
  let photoCanvas = null;    // the snapped/composited picture
  let worldKey = 'dragon';   // which fake detection we play
  let timers = [];

  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function goStage(name) {
    Object.values(stages).forEach((s) => s.classList.remove('is-active'));
    stages[name].classList.add('is-active');
  }

  // ---------- camera ----------

  async function initCamera() {
    picker.hidden = true;
    vf.classList.remove('picking');
    shutter.disabled = true;
    video.style.display = '';
    vfMsg.style.display = '';
    vfMsg.textContent = 'Waking up the camera\u2026';
    vfHint.textContent = 'Hold your drawing up to the camera';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      openPicker('This browser has no camera \u2014 pick a doodle instead!');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      video.srcObject = stream;
      video.play().catch(() => {}); // muted + playsinline; 'autoplay' attr is set too
      // wait for first frames, but never let a slow device hang the demo
      await new Promise((res) => {
        if (video.readyState >= 2) return res();
        video.onloadeddata = res;
        setTimeout(res, 1500);
      });
      vfMsg.style.display = 'none';
      shutter.disabled = false;
      vfHint.textContent = 'Hold your drawing up to the camera';
      backToCam.hidden = false;
    } catch (err) {
      stopStream();
      openPicker('Camera is resting. Pick a doodle instead!');
    }
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    video.srcObject = null;
  }

  function openPicker(note) {
    pickerNote.textContent = note;
    picker.hidden = false;
    vf.classList.add('picking');
    shutter.disabled = true;
    vfHint.textContent = 'Pick a doodle \u2014 it works just like a photo!';
    // hands-free default: first doodle is pre-selected, one tap runs the demo
    pickBtns.forEach((b, i) => b.classList.toggle('is-selected', i === 0));
  }

  function closePicker() {
    picker.hidden = true;
    vf.classList.remove('picking');
    if (stream) {
      shutter.disabled = false;
      vfHint.textContent = 'Hold your drawing up to the camera';
    }
  }

  // Grab a mirrored, cover-cropped 4:3 frame from the webcam.
  function captureVideo() {
    const c = document.createElement('canvas');
    c.width = SNAP_W; c.height = SNAP_H;
    const ctx = c.getContext('2d');
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const s = Math.max(SNAP_W / vw, SNAP_H / vh);
    const dw = vw * s, dh = vh * s;
    ctx.translate(SNAP_W, 0);
    ctx.scale(-1, 1); // mirror to match the preview
    ctx.drawImage(video, (SNAP_W - dw) / 2, (SNAP_H - dh) / 2, dw, dh);
    return c;
  }

  // Rasterize one of the SVG doodles onto a fake "photo of paper on a desk".
  function renderDoodle(svgEl) {
    return new Promise((resolve, reject) => {
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('width', '640');
      clone.setAttribute('height', '480');
      const xml = new XMLSerializer().serializeToString(clone);
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = SNAP_W; c.height = SNAP_H;
        const ctx = c.getContext('2d');
        // desk
        ctx.fillStyle = '#e3d7ba';
        ctx.fillRect(0, 0, SNAP_W, SNAP_H);
        // paper, slightly rotated
        ctx.save();
        ctx.translate(SNAP_W / 2, SNAP_H / 2);
        ctx.rotate(0.018);
        ctx.shadowColor = 'rgba(43,33,24,.35)';
        ctx.shadowBlur = 26;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#fffdf6';
        roundRect(ctx, -350, -262, 700, 524, 18);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.drawImage(img, -322, -240, 644, 480);
        ctx.restore();
        // soft vignette so it reads as a photo
        const v = ctx.createRadialGradient(
          SNAP_W / 2, SNAP_H / 2, SNAP_H / 3,
          SNAP_W / 2, SNAP_H / 2, SNAP_H * 0.85);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(70,50,20,.22)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, SNAP_W, SNAP_H);
        resolve(c);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- real color sampling (the not-fake part) ----------

  function sampleColors(canvas) {
    const S = 48;
    const s = document.createElement('canvas');
    s.width = S; s.height = S * 0.75;
    const ctx = s.getContext('2d');
    ctx.drawImage(canvas, 0, 0, s.width, s.height);
    const d = ctx.getImageData(0, 0, s.width, s.height).data;
    const rows = s.height;

    const avg = (r0, r1) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = Math.floor(r0 * rows); y < Math.floor(r1 * rows); y++) {
        for (let x = 0; x < s.width; x++) {
          const i = (y * s.width + x) * 4;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
      }
      return [r / n, g / n, b / n];
    };

    // dominant hue over the whole picture (saturation-weighted)
    let hh = new Array(36).fill(0);
    let totSat = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [h, sat] = rgbToHsv(d[i], d[i + 1], d[i + 2]);
      if (sat > 0.15) { hh[Math.floor(h / 10) % 36] += sat; totSat += sat; }
    }
    let domHue = -1, best = 0;
    hh.forEach((v, i) => { if (v > best) { best = v; domHue = i * 10 + 5; } });

    return {
      sky: avg(0, 0.3),
      ground: avg(0.72, 1),
      hue: domHue,
      meanSat: totSat / (d.length / 4),
    };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx];
  }

  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const hex = (h6) => [parseInt(h6.slice(1, 3), 16), parseInt(h6.slice(3, 5), 16), parseInt(h6.slice(5, 7), 16)];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  // Pick which pretend world the "AI" detected from the photo's dominant hue.
  // A mostly-colorless photo (plain paper, pencil sketch) lands in Pebble Peaks.
  function classify(sample) {
    if (sample.hue < 0 || sample.meanSat < 0.045) return 'pebble';
    const h = sample.hue;
    if (h >= 75 && h <= 175) return 'dragon';   // greens -> dragon country
    if (h > 175 && h <= 275) return 'sea';      // blues/purples -> bay
    return 'sun';                                // warm -> sunny meadows
  }

  // ---------- scan sequence ----------

  function startScan() {
    busy = true;
    scanImg.src = photoCanvas.toDataURL('image/jpeg', 0.88);
    chipsBox.innerHTML = '';
    scanline.classList.remove('done');
    stepEls.forEach((s) => s.classList.remove('is-doing', 'is-done'));
    goStage('scan');

    const sample = sampleColors(photoCanvas);
    const world = WORLDS[worldKey];

    // step toasts
    step(0, 0, 1150);
    step(1, 1150, 2250);
    step(2, 2250, 3200);

    // detection chips pop over the photo
    world.chips.forEach((chip, i) => {
      later(650 + i * 600, () => {
        const el = document.createElement('span');
        el.className = 'chip';
        el.textContent = chip.t;
        el.style.left = chip.x + '%';
        el.style.top = chip.y + '%';
        el.style.setProperty('--rot', (i % 2 ? 3 : -4) + 'deg');
        chipsBox.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
      });
    });

    later(3350, () => scanline.classList.add('done'));
    later(3650, () => buildWorld(sample, world));
  }

  function step(i, startMs, doneMs) {
    later(startMs, () => stepEls[i].classList.add('is-doing'));
    later(doneMs, () => {
      stepEls[i].classList.remove('is-doing');
      stepEls[i].classList.add('is-done');
    });
  }

  // ---------- build the payoff world ----------

  function buildWorld(sample, world) {
    // photo IS the backdrop
    worldPhoto.src = photoCanvas.toDataURL('image/jpeg', 0.88);

    // tint sky + hills from the photo's real colors (pastelized for kid-friendliness)
    const skyA = mix(sample.sky, hex('#8FC7EC'), 0.45);
    const skyB = mix(sample.sky, hex('#C7E6F9'), 0.6);
    const hillA = mix(sample.ground, hex('#7CBD6F'), 0.55);
    const hillB = mix(sample.ground, hex('#4F8F57'), 0.55);
    worldEl.style.setProperty('--skyTintA', rgba(skyA, 0.6));
    worldEl.style.setProperty('--skyTintB', rgba(skyB, 0.35));
    worldEl.style.setProperty('--hillA', rgb1(hillA));
    worldEl.style.setProperty('--hillB', rgb1(hillB));

    // world name, gem, first story line
    worldNameEl.textContent = world.name;
    gemBody.setAttribute('fill', world.gem);
    gemLetter.textContent = world.letter;
    gemTag.innerHTML = 'Letter gem &mdash; &ldquo;' + world.letter + '&rdquo;';
    captionEl.textContent = world.line1;

    gemPop.classList.remove('in');
    goStage('world');

    // letter-gem pops, then the caption advances
    later(900, () => gemPop.classList.add('in'));
    later(2100, () => {
      captionEl.classList.add('fading');
      later(280, () => {
        captionEl.textContent =
          'The \u201C' + world.letter + '\u201D gem hopped into Pip\u2019s pocket. The bedtime story grew a page!';
        captionEl.classList.remove('fading');
      });
    });
    busy = false;
  }

  const rgb1 = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

  // ---------- parallax ----------

  const LAYERS = [
    { el: worldPhoto, f: 10 },
    { el: document.querySelector('.l-sky'), f: 4 },
    { el: document.querySelector('.l-sun'), f: 16 },
    { el: document.querySelector('.l-cloud.c1'), f: 26 },
    { el: document.querySelector('.l-cloud.c2'), f: 34 },
    { el: document.querySelector('.l-hills'), f: 14 },
    { el: $('pip'), f: 42 },
    // gemPop deliberately excluded: its transform carries the pop-in scale
  ];

  worldEl.addEventListener('pointermove', (e) => {
    const r = worldEl.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    LAYERS.forEach(({ el, f }) => {
      if (!el || !f) return;
      el.style.transform = `translate(${(-nx * f).toFixed(1)}px, ${(-ny * f * 0.6).toFixed(1)}px)`;
    });
  });
  worldEl.addEventListener('pointerleave', () => {
    LAYERS.forEach(({ el }) => { if (el) el.style.transform = ''; });
  });

  // ---------- wire up ----------

  shutter.addEventListener('click', () => {
    if (busy || !stream) return;
    flash.classList.remove('go');
    void flash.offsetWidth; // restart the flash animation
    flash.classList.add('go');
    photoCanvas = captureVideo();
    // the "AI" guesses what it sees from the photo's dominant hue
    worldKey = classify(sampleColors(photoCanvas));
    stopStream();
    startScan();
  });

  // Turn a doodle SVG into a "photo" and run the whole scan -> world show.
  async function snapDoodle(svgEl, key) {
    if (busy) return;
    worldKey = key;
    try {
      photoCanvas = await renderDoodle(svgEl);
    } catch (e) {
      return; // extremely unlikely; never dead-end the demo
    }
    stopStream();
    picker.hidden = true;
    vf.classList.remove('picking');
    startScan();
  }

  pickInstead.addEventListener('click', () => {
    openPicker('Pick a doodle \u2014 it works just like a photo!');
  });

  // auto-demo: run the whole snap -> scan -> payoff sequence on a sample doodle
  const DOODLE_KEYS = ['dragon', 'house', 'sun'];
  watchDemo.addEventListener('click', () => {
    const key = DOODLE_KEYS[Math.floor(Math.random() * DOODLE_KEYS.length)];
    const svg = picker.querySelector('.pick[data-world="' + key + '"] svg');
    snapDoodle(svg, key);
  });

  backToCam.addEventListener('click', closePicker);

  const pickBtns = Array.from(picker.querySelectorAll('.pick'));
  pickBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      pickBtns.forEach((b) => b.classList.remove('is-selected'));
      snapDoodle(btn.querySelector('svg'), btn.dataset.world);
    });
  });

  againBtn.addEventListener('click', () => {
    clearTimers();
    gemPop.classList.remove('in');
    captionEl.classList.remove('fading');
    busy = false;
    goStage('camera');
    initCamera();
  });

  window.addEventListener('pagehide', stopStream);

  // boot
  initCamera();
})();
