/* ============================================================
   Sketch-DOM Pigs — world.js
   Seeded procedural terrain: every turn GROWS the world — each
   scene_seed re-sketches a fresh 960-wide "section" appended to
   the right of the last one (world coords, ground top y=430).
   The camera pans right-to-right across the panorama, so the
   journey reads as continuous forward travel, not a repaint.
   ============================================================ */
'use strict';
(function () {

const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#2B2118';
const GROUND_Y = 430;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[(r() * arr.length) | 0];
const rr = (r, a, b) => a + r() * (b - a);

function G(cls) {
  const g = document.createElementNS(SVGNS, 'g');
  if (cls) g.setAttribute('class', cls);
  return g;
}
function O(seed, extra) {
  return Object.assign({ stroke: INK, strokeWidth: 2.4, roughness: 2, seed }, extra);
}
function solid(seed, color, extra) {
  return O(seed, Object.assign({ fill: color, fillStyle: 'solid' }, extra));
}
function hatch(seed, color, extra) {
  return O(seed, Object.assign({ fill: color, fillStyle: 'hachure',
    hachureGap: 6, fillWeight: 1.4 }, extra));
}
function smil(g, attrs) {
  const a = document.createElementNS(SVGNS, 'animateTransform');
  for (const k in attrs) a.setAttribute(k, attrs[k]);
  g.appendChild(a);
  return g;
}

/* ---------- palettes ---------- */
const PALETTES = {
  warm:  { sky: '#BFE6F2', sun: '#FFC53D', moon: null, cloud: '#FFFDF6',
           hill1: '#9ED6A8', hill2: '#7CC78F', ground: '#F1DFB8', tuft: '#4FB06D',
           rain: '#5DA9E9', water: '#8fd0f5', cave: '#6E5A78', dark: '#4a3b52' },
  cool:  { sky: '#CDEAF5', sun: '#FFE08A', moon: null, cloud: '#F4FBFF',
           hill1: '#8FC7B4', hill2: '#6FB3A0', ground: '#E8DCC0', tuft: '#3E8E5A',
           rain: '#4a90c9', water: '#7cc4ee', cave: '#5d5470', dark: '#443c55' },
  dusk:  { sky: '#F8C8A6', sun: '#FF9C5A', moon: null, cloud: '#FFE3C9',
           hill1: '#C99A7C', hill2: '#B08562', ground: '#EACFA0', tuft: '#7a9b58',
           rain: '#b98d6f', water: '#e0a97e', cave: '#6b4a63', dark: '#4e3548' },
  night: { sky: '#46557F', sun: null, moon: '#FFE9A8', cloud: '#5d6c99',
           hill1: '#4E6B62', hill2: '#3F5C54', ground: '#7d7358', tuft: '#39584d',
           rain: '#9db8e8', water: '#5b7dbb', cave: '#3a3450', dark: '#2c2740' },
};

/* ---------- sky ---------- */
function drawSky(rs, layer, ss, pal, r) {
  layer.appendChild(rs.rectangle(-4, -4, 968, 440,
    solid((ss.seed ^ 11) || 1, pal.sky, { stroke: 'none', roughness: .6 })));

  if (pal.sun) {
    const sx = ss.palette === 'dusk' ? 800 : 830;
    const sy = ss.palette === 'dusk' ? 110 : 80;
    const sunG = G('sunnode');
    sunG.appendChild(rs.circle(sx, sy, 46, solid(ss.seed ^ 21, pal.sun)));
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * i / 4;
      sunG.appendChild(rs.line(sx + Math.cos(a) * 32, sy + Math.sin(a) * 32,
        sx + Math.cos(a) * 44, sy + Math.sin(a) * 44,
        O((ss.seed ^ 31) + i, { stroke: pal.sun, strokeWidth: 4 })));
    }
    layer.appendChild(sunG);
  }
  if (pal.moon) {
    const moonG = G('moonnode');
    moonG.appendChild(rs.circle(830, 80, 40, solid(ss.seed ^ 22, pal.moon)));
    moonG.appendChild(rs.circle(818, 72, 8, O(ss.seed ^ 23, { stroke: '#e8ce7e', strokeWidth: 2 })));
    moonG.appendChild(rs.circle(842, 90, 6, O(ss.seed ^ 24, { stroke: '#e8ce7e', strokeWidth: 2 })));
    layer.appendChild(moonG);
    /* stars */
    for (let i = 0; i < 14; i++) {
      const x = rr(r, 20, 940), y = rr(r, 16, 220);
      layer.appendChild(rs.circle(x, y, rr(r, 1.6, 3),
        solid((ss.seed ^ 41) + i, '#FFE9A8', { stroke: 'none' })));
    }
  }

  /* drifting clouds — SMIL animateTransform, additive to base position */
  const nCloud = ss.biome === 'rain' || ss.biome === 'storm' ? 4 : 3;
  for (let i = 0; i < nCloud; i++) {
    const cx = rr(r, 90, 870), cy = rr(r, 40, 130), sc = rr(r, .7, 1.2);
    const cg = G('cloudnode');
    cg.setAttribute('transform', `translate(${cx} ${cy}) scale(${sc})`);
    const dark = ss.biome === 'storm' || ss.biome === 'rain';
    const cf = dark ? (ss.palette === 'night' ? '#3d4a6e' : '#B8B2C4') : pal.cloud;
    cg.appendChild(rs.ellipse(0, 0, 70, 30, solid((ss.seed ^ 51) + i, cf)));
    cg.appendChild(rs.ellipse(-28, 8, 40, 22, solid((ss.seed ^ 61) + i, cf)));
    cg.appendChild(rs.ellipse(28, 8, 44, 24, solid((ss.seed ^ 71) + i, cf)));
    smil(cg, { attributeName: 'transform', type: 'translate', additive: 'sum',
               values: '0 0; 30 0; 0 0', dur: `${rr(r, 26, 44)}s`,
               repeatCount: 'indefinite' });
    layer.appendChild(cg);
  }
}

/* ---------- terrain ---------- */
function drawTerrain(rs, layer, ss, pal, r) {
  /* rolling hills */
  layer.appendChild(rs.path('M-4 432 C140 360 300 352 470 402 C600 438 800 380 964 408 L964 432 Z',
    hatch(ss.seed ^ 101, pal.hill1, { roughness: 1.4 })));
  layer.appendChild(rs.path('M-4 432 C180 392 360 388 540 412 C700 432 840 400 964 416 L964 432 Z',
    hatch(ss.seed ^ 111, pal.hill2, { roughness: 1.4 })));

  /* ground band + squiggly top edge */
  layer.appendChild(rs.rectangle(-4, 428, 968, 116,
    solid(ss.seed ^ 121, pal.ground, { stroke: 'none', roughness: .8 })));
  layer.appendChild(rs.curve([[0, 431], [160, 427], [340, 433], [520, 428], [700, 433], [860, 429], [960, 431]],
    O(ss.seed ^ 131, { stroke: pal.groundLine || '#c9ac77', strokeWidth: 3, roughness: 2.4 })));

  /* grass tufts */
  for (let i = 0; i < 12; i++) {
    const x = rr(r, 20, 940), y = rr(r, 448, 520);
    const tg = G('tuft');
    tg.appendChild(rs.line(x, y, x - 4, y - 9, O((ss.seed ^ 141) + i, { stroke: pal.tuft, strokeWidth: 2.5 })));
    tg.appendChild(rs.line(x, y, x + 1, y - 11, O((ss.seed ^ 151) + i, { stroke: pal.tuft, strokeWidth: 2.5 })));
    tg.appendChild(rs.line(x, y, x + 6, y - 8, O((ss.seed ^ 161) + i, { stroke: pal.tuft, strokeWidth: 2.5 })));
    layer.appendChild(tg);
  }

  /* dashed trail — the path the hero is walking, always onward */
  layer.appendChild(rs.curve(
    [[6, 472], [190, 477], [380, 471], [560, 478], [740, 471], [954, 475]],
    O(ss.seed ^ 601, { stroke: '#c9ac77', strokeWidth: 4, roughness: 1.6,
                       strokeLineDash: [3, 15], strokeLineCap: 'round' })));

  /* trail post at the left edge of each stretch — "this way →" */
  const sp = G('trailpost');
  sp.setAttribute('transform', 'translate(52 430)');
  sp.appendChild(rs.line(0, 2, 0, -62, O(ss.seed ^ 611, { stroke: '#8A5A30', strokeWidth: 7 })));
  sp.appendChild(rs.polygon([[0, -64], [40, -55], [0, -42]],
    solid(ss.seed ^ 621, pick(r, ['#FF6B57', '#5DA9E9', '#FFC53D']))));
  layer.appendChild(sp);

  /* biome dressing */
  const b = ss.biome;
  if (b === 'meadow' || b === 'village') {
    for (let i = 0; i < 5; i++) {
      const x = rr(r, 60, 900), y = rr(r, 470, 520);
      layer.appendChild(rs.line(x, y, x, y - 12, O((ss.seed ^ 171) + i, { stroke: '#3E8E5A', strokeWidth: 2.5 })));
      layer.appendChild(rs.circle(x, y - 16, 5,
        solid((ss.seed ^ 181) + i, pick(r, ['#FF6B57', '#FFC53D', '#B565D8']))));
    }
  }
  if (b === 'forest') {
    for (let i = 0; i < 4; i++) {
      const x = 90 + i * 240 + rr(r, -30, 30);
      const tg = G('bgpine'); tg.setAttribute('transform', `translate(${x} 436)`);
      tg.appendChild(rs.rectangle(-6, -18, 12, 18, solid((ss.seed ^ 191) + i, '#8A5A30')));
      tg.appendChild(rs.polygon([[0, -92], [-30, -44], [30, -44]], solid((ss.seed ^ 201) + i, '#3E8E5A')));
      tg.appendChild(rs.polygon([[0, -72], [-36, -22], [36, -22]], solid((ss.seed ^ 211) + i, '#4FB06D')));
      layer.appendChild(tg);
    }
  }
  if (b === 'village') {
    for (let i = 0; i < 3; i++) {
      const x = 140 + i * 300 + rr(r, -20, 20);
      const hg = G('bghouse'); hg.setAttribute('transform', `translate(${x} 428)`);
      hg.appendChild(rs.rectangle(-34, -52, 68, 52, solid((ss.seed ^ 221) + i, pick(r, ['#FFF3DC', '#FFE3C9', '#F1DFB8']))));
      hg.appendChild(rs.polygon([[-42, -52], [0, -82], [42, -52]], solid((ss.seed ^ 231) + i, '#FF6B57')));
      hg.appendChild(rs.rectangle(-8, -24, 16, 24, solid((ss.seed ^ 241) + i, '#8A4B2C')));
      layer.appendChild(hg);
    }
    /* picket fence */
    for (let i = 0; i < 16; i++)
      layer.appendChild(rs.line(30 + i * 58, 452, 30 + i * 58, 432,
        O((ss.seed ^ 251) + i, { stroke: '#FFFDF6', strokeWidth: 5 })));
  }
  if (b === 'cave') {
    const arch = G('cavearch');
    arch.appendChild(rs.path('M-4 -4 H964 V300 C880 160 720 60 480 56 C240 60 80 160 -4 300 Z',
      solid(ss.seed ^ 261, pal.dark, { roughness: 1.6 })));
    /* stalactites */
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 150 + rr(r, -20, 20);
      arch.appendChild(rs.polygon([[x, 60 + rr(r, -8, 12)], [x - 13, 62], [x + 13, 62]],
        solid((ss.seed ^ 271) + i, pal.cave)));
    }
    layer.appendChild(arch);
    layer.appendChild(rs.ellipse(480, 470, 700, 60,
      solid(ss.seed ^ 281, 'rgba(58,47,38,.18)', { stroke: 'none' })));
  }
  if (b === 'river') {
    /* river band + bobbing wave lines */
    const wg = G('riverband');
    wg.appendChild(rs.rectangle(-4, 452, 968, 92,
      solid(ss.seed ^ 291, pal.water, { stroke: 'none', roughness: .7 })));
    for (let i = 0; i < 3; i++) {
      const y = 468 + i * 26;
      const wave = G('waveline');
      wave.appendChild(rs.path(
        `M-60 ${y} Q-30 ${y - 8} 0 ${y} T60 ${y} T120 ${y} T180 ${y} T240 ${y} T300 ${y} T360 ${y} T420 ${y} T480 ${y} T540 ${y} T600 ${y} T660 ${y} T720 ${y} T780 ${y} T840 ${y} T900 ${y} T960 ${y} T1020 ${y}`,
        O((ss.seed ^ 301) + i, { stroke: '#fff', strokeWidth: 3.5, roughness: 1.2 })));
      smil(wave, { attributeName: 'transform', type: 'translate',
                   values: '0 0; 60 0; 0 0', dur: `${5 + i * 2}s`,
                   repeatCount: 'indefinite' });
      wg.appendChild(wave);
    }
    layer.appendChild(wg);
    /* banks */
    layer.appendChild(rs.ellipse(60, 458, 160, 26, solid(ss.seed ^ 311, pal.ground)));
    layer.appendChild(rs.ellipse(900, 458, 160, 26, solid(ss.seed ^ 312, pal.ground)));
  }

  return layer;
}

/* ---------- animated weather (SMIL, lives behind props) ---------- */
function drawWeather(rs, layer, ss, pal, r) {
  const b = ss.biome;
  if (b === 'rain' || b === 'storm') {
    for (let i = 0; i < 16; i++) {
      const x = rr(r, 10, 950), y = rr(r, 100, 400);
      const rg = G('raindrop');
      rg.appendChild(rs.line(x, y, x - 7, y + 18,
        O((ss.seed ^ 401) + i, { stroke: pal.rain, strokeWidth: 3, roughness: .8 })));
      smil(rg, { attributeName: 'transform', type: 'translate',
                 from: '0 -30', to: '0 40', dur: `${rr(r, .7, 1.1)}s`,
                 begin: `${-rr(r, 0, 1)}s`, repeatCount: 'indefinite' });
      layer.appendChild(rg);
    }
    /* puddles */
    for (let i = 0; i < 3; i++)
      layer.appendChild(rs.ellipse(rr(r, 100, 860), rr(r, 490, 520), rr(r, 40, 80), 12,
        solid((ss.seed ^ 411) + i, pal.water, { stroke: 'none' })));
  }
  if (b === 'storm') {
    /* lightning */
    layer.appendChild(rs.path('M700 90 L672 160 L700 158 L668 240',
      O(ss.seed ^ 421, { stroke: '#FFE08A', strokeWidth: 7, roughness: 2.6 })));
    /* wind swirls */
    for (let i = 0; i < 3; i++) {
      const y = 150 + i * 110;
      const sw = G('windswirl');
      sw.appendChild(rs.curve(
        [[0, y], [120, y - 20], [240, y + 14], [380, y - 8], [520, y + 10]],
        O((ss.seed ^ 431) + i, { stroke: '#B8B2C4', strokeWidth: 4, roughness: 2.2 })));
      smil(sw, { attributeName: 'transform', type: 'translate',
                 from: '-560 0', to: '1000 0', dur: `${rr(r, 6, 9)}s`,
                 begin: `${-rr(r, 0, 6)}s`, repeatCount: 'indefinite' });
      layer.appendChild(sw);
    }
  }
  if (b === 'night' || ss.palette === 'night') {
    /* fireflies */
    for (let i = 0; i < 6; i++) {
      const f = G('firefly');
      f.appendChild(rs.circle(rr(r, 60, 900), rr(r, 300, 420), 3.4,
        solid((ss.seed ^ 441) + i, '#FFE9A8', { stroke: 'none' })));
      smil(f, { attributeName: 'transform', type: 'translate',
                values: '0 0; 14 -10; -8 8; 0 0', dur: `${rr(r, 4, 7)}s`,
                repeatCount: 'indefinite' });
      layer.appendChild(f);
    }
  }
  return layer;
}

/* ---------- the huffy wolf (peeker at the left edge) ---------- */
function drawWolf(rs, wolfG) {
  wolfG.innerHTML = '';
  const g = G('wolfbody');
  /* body tucked half off-frame; wolfPos slides him in */
  g.appendChild(rs.ellipse(-10, -46, 110, 84, hatch(9001, '#8D7B68', { roughness: 2 })));
  g.appendChild(rs.polygon([[-38, -84], [-50, -118], [-18, -96]], solid(9002, '#8D7B68')));
  g.appendChild(rs.polygon([[2, -88], [12, -122], [28, -94]], solid(9003, '#8D7B68')));
  /* snout with huff cheeks */
  g.appendChild(rs.ellipse(34, -52, 44, 32, solid(9004, '#B3A48D')));
  const cheeks = G('cheeks');
  cheeks.appendChild(rs.ellipse(40, -46, 22, 14, O(9005, { stroke: '#8a7a68', strokeWidth: 2.5 })));
  g.appendChild(cheeks);
  g.appendChild(rs.circle(50, -56, 8, solid(9006, INK)));
  /* grumpy eyes + brows */
  g.appendChild(rs.circle(-8, -70, 7, solid(9007, INK)));
  g.appendChild(rs.circle(18, -72, 7, solid(9008, INK)));
  g.appendChild(rs.line(-16, -84, -2, -78, O(9009, { strokeWidth: 4 })));
  g.appendChild(rs.line(10, -80, 26, -86, O(9010, { strokeWidth: 4 })));
  /* paws over the edge */
  g.appendChild(rs.ellipse(-34, -8, 26, 14, solid(9011, '#B3A48D')));
  g.appendChild(rs.ellipse(22, -8, 26, 14, solid(9012, '#B3A48D')));
  wolfG.appendChild(g);
}

/* ---------- the buildable house (ghost → straw → sticks → brick) ---------- */
function piece(cls) { return G('build-piece ' + cls); }

function renderBuild(rs, layer, stage, seed, offX) {
  layer.innerHTML = '';
  const hs = G('house-set');
  hs.setAttribute('transform', `translate(${(offX || 0) + 802} 430)`);

  /* ghost outline — always shows where the brick house will be */
  const ghost = G('ghosthouse');
  ghost.appendChild(rs.path('M-66 0 V-70 M-66 -70 L0 -116 L66 -70 M66 -70 V0 M-66 0 H66',
    O(seed ^ 501, { stroke: '#B8A98C', strokeWidth: 3, roughness: 1.4,
                    strokeLineDash: [7, 7] })));
  hs.appendChild(ghost);

  if (stage === 0) { layer.appendChild(hs); return hs; }

  const wallC = ['#FFE9B8', '#C98A54', '#C96F3F'][Math.min(stage, 3) - 1];

  /* roof */
  const roof = piece('bp-roof');
  if (stage === 1) {
    roof.appendChild(rs.polygon([[-74, -66], [0, -118], [74, -66]],
      hatch(seed ^ 511, '#FFC53D', { hachureGap: 4, roughness: 2.4 })));
  } else if (stage === 2) {
    roof.appendChild(rs.polygon([[-74, -66], [0, -116], [74, -66]],
      solid(seed ^ 512, '#8A5A30')));
    for (let i = 0; i < 4; i++)
      roof.appendChild(rs.line(-56 + i * 34, -76 - (i % 2) * 8, -34 + i * 34, -94 + (i % 2) * 6,
        O((seed ^ 513) + i, { stroke: '#6B4A2A', strokeWidth: 5 })));
  } else {
    roof.appendChild(rs.polygon([[-74, -66], [0, -116], [74, -66]],
      solid(seed ^ 514, '#8d4a3a')));
    roof.appendChild(rs.rectangle(30, -112, 18, 34, solid(seed ^ 515, '#B8B2A6')));
  }
  hs.appendChild(roof);

  /* walls — left and right are separate addressable pieces */
  const wl = piece('bp-wall-l');
  const wr = piece('bp-wall-r');
  wl.appendChild(rs.rectangle(-66, -66, 36, 66, hatch(seed ^ 521, wallC,
    stage === 1 ? { hachureGap: 4 } : { fillStyle: 'solid' })));
  wr.appendChild(rs.rectangle(30, -66, 36, 66, hatch(seed ^ 522, wallC,
    stage === 1 ? { hachureGap: 4 } : { fillStyle: 'solid' })));
  if (stage === 2) {
    for (let i = 0; i < 3; i++) {
      wl.appendChild(rs.line(-64, -56 + i * 20, -32, -52 + i * 20, O((seed ^ 523) + i, { stroke: '#7d4f27', strokeWidth: 3 })));
      wr.appendChild(rs.line(32, -52 + i * 20, 64, -56 + i * 20, O((seed ^ 527) + i, { stroke: '#7d4f27', strokeWidth: 3 })));
    }
  }
  if (stage === 3) {
    for (let i = 0; i < 3; i++) {
      wl.appendChild(rs.line(-66, -50 + i * 20, -30, -50 + i * 20, O((seed ^ 531) + i, { stroke: '#8a4b2c', strokeWidth: 2.5 })));
      wr.appendChild(rs.line(30, -50 + i * 20, 66, -50 + i * 20, O((seed ^ 534) + i, { stroke: '#8a4b2c', strokeWidth: 2.5 })));
    }
  }
  hs.appendChild(wl); hs.appendChild(wr);

  /* door */
  const dr = piece('bp-door');
  dr.appendChild(rs.path('M-16 0 V-44 C-16 -64 16 -64 16 -44 V0 Z',
    solid(seed ^ 541, stage === 3 ? '#5d3a20' : '#8A4B2C')));
  dr.appendChild(rs.circle(8, -26, 3.4, solid(seed ^ 542, '#FFC53D')));
  hs.appendChild(dr);

  /* window + deco bit (also scatterable) */
  const ms = piece('bp-misc');
  if (stage >= 2) {
    ms.appendChild(rs.circle(-46, -40, 10, solid(seed ^ 551, '#BFE8FF')));
    ms.appendChild(rs.line(-56, -40, -36, -40, O(seed ^ 552, { strokeWidth: 2.5 })));
  } else {
    ms.appendChild(rs.curve([[-56, -66], [-40, -74], [-20, -66]],
      O(seed ^ 553, { stroke: '#E8A93D', strokeWidth: 4 })));
  }
  hs.appendChild(ms);

  layer.appendChild(hs);
  return hs;
}

/* ---------- public api ---------- */
window.SketchWorld = {
  GROUND_Y,
  SECTION_W: 960,
  mulberry32,
  PALETTES,
  /* draw a fresh 960-wide stretch of world at world-x `offX`.
     Nothing is wiped — sections accrete so the camera can pan
     a continuous panorama, exactly like the v1 crayon walk. */
  render(rs, layers, ss, offX = 0) {
    const pal = PALETTES[ss.palette] || PALETTES.warm;
    const r = mulberry32((ss.seed | 0) || 1);
    const sec = Math.round(offX / 960);
    const mk = (layer) => {
      const g = G('scenebit');
      g.setAttribute('transform', `translate(${offX} 0)`);
      g.dataset.sec = sec;
      layer.appendChild(g);
      return g;
    };
    drawSky(rs, mk(layers.sky), ss, pal, r);
    drawTerrain(rs, mk(layers.terrain), ss, pal, r);
    drawWeather(rs, mk(layers.fxback), ss, pal, r);
    return pal;
  },
  /* drop sections the journey has left far behind (DOM hygiene) */
  prune(layers, keepFromSec) {
    for (const l of [layers.sky, layers.terrain, layers.fxback])
      for (const c of [...l.children])
        if ((+c.dataset.sec || 0) < keepFromSec) c.remove();
  },
  clear(layers) {
    layers.sky.innerHTML = '';
    layers.terrain.innerHTML = '';
    layers.fxback.innerHTML = '';
  },
  drawWolf,
  renderBuild,
};

})();
