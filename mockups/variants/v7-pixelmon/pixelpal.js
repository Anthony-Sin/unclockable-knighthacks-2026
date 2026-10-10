/* =========================================================================
 * pixelpal.js — seeded pixel-art engine
 * -------------------------------------------------------------------------
 * "Fill the Tale — Pixel Woods edition"
 *
 * Three jobs:
 *   1. SEEDED MONSTER — a name -> FNV-1a hash -> mulberry32 PRNG -> 6x12
 *      mirrored "space-invader" pixel blob. Same name, same pal, forever.
 *      (Spiritual ancestor: github.com/e1ven/Robohash — text in, creature
 *      out. Hand-rolled here, ~0 deps.)
 *   2. SEEDED SCENES — one generator per story area, each with its own
 *      palette: Green Woods -> Grey Drizzle -> Blue River -> Purple Cave ->
 *      Golden Home. Chunky hills, twinkling stars, parallax pixel clouds.
 *   3. PROP SPRITES — every story prop (bridge, umbrella, boat, unicorn,
 *      lantern, key, door, cookie jar, banana peel, anvil...) is composed
 *      from code as chunky 1px-aligned rects. No image assets at all.
 * ===================================================================== */
(function (root) {
  'use strict';

  /* ---------------------------- seeded randomness ---------------------- */

  // FNV-1a 32-bit string hash — stable across browsers/platforms.
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // mulberry32 — tiny fast PRNG, deterministic float stream in [0,1).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Convenience wrapper around one PRNG stream.
  function rngFrom(seed) {
    const f = mulberry32(seed >>> 0);
    return {
      f,
      int: (n) => Math.floor(f() * n),
      range: (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(f() * arr.length)],
      chance: (p) => f() < p,
    };
  }

  /* ------------------------------ palettes ----------------------------- */

  const INK = '#2B2118';   // deep warm outline/pupil ink (matches page ink)
  const EYE = '#FFFDF6';   // warm white eye shine

  // Kid-bright body palettes for the "surprise me" monsters.
  const PALETTES = [
    { name: 'coral',   body: '#FF6B57', shade: '#D84E3C', belly: '#FFC53D', accent: '#4FB06D' },
    { name: 'leaf',    body: '#4FB06D', shade: '#3C8D57', belly: '#FFF0B8', accent: '#FF6B57' },
    { name: 'sky',     body: '#5DA9E9', shade: '#4487C7', belly: '#FFC53D', accent: '#FF6B57' },
    { name: 'berry',   body: '#B565D8', shade: '#9348B8', belly: '#FFC53D', accent: '#5DA9E9' },
    { name: 'sun',     body: '#FFC53D', shade: '#E0A32A', belly: '#FF8F6B', accent: '#B565D8' },
    { name: 'bubble',  body: '#FF8FB1', shade: '#E06E93', belly: '#FFF0B8', accent: '#5DA9E9' },
    { name: 'pumpkin', body: '#F08C3B', shade: '#CC7030', belly: '#FFE08A', accent: '#4FB06D' },
    { name: 'lagoon',  body: '#45C2B0', shade: '#33A090', belly: '#FFE08A', accent: '#FF6B57' },
  ];

  /* --------------------------- pal generation -------------------------- */

  const PAL_W = 12;
  const PAL_H = 12;
  const HALF = 6; // randomize the left 6 columns, mirror onto the right

  // Row-tuned fill density: sparse head/feet, chunky middle.
  function rowDensity(y) {
    if (y <= 1) return 0.34;
    if (y <= 3) return 0.55;
    if (y <= 8) return 0.60;
    if (y <= 10) return 0.44;
    return 0.36;
  }

  function countMask(mask) {
    let n = 0;
    for (let y = 0; y < PAL_H; y++)
      for (let x = 0; x < PAL_W; x++) if (mask[y][x]) n++;
    return n;
  }

  function rollMask(R) {
    const mask = [];
    for (let y = 0; y < PAL_H; y++) {
      mask.push(new Array(PAL_W).fill(false));
      const d = rowDensity(y);
      for (let x = 0; x < HALF; x++) {
        const on = R.f() < d + (x === 5 ? 0.20 : x >= 3 ? 0.06 : 0);
        mask[y][x] = on;
        mask[y][PAL_W - 1 - x] = on; // X-mirror — the whole trick!
      }
    }
    return mask;
  }

  const EYE_STYLES = ['big', 'tall', 'mono', 'wide'];

  // name -> {cells:[{x,y,c}], seed, seedHex, colors}. Deterministic.
  function generatePal(name) {
    const clean = (String(name || '').trim() || 'Pip');
    const seed = fnv1a('pal:' + clean.toLowerCase());
    const R = rngFrom(seed);
    const colors = R.pick(PALETTES);

    let mask = null;
    for (let tries = 0; tries < 10; tries++) {
      mask = rollMask(R);
      const n = countMask(mask);
      if (n >= 46 && n <= 116) break;
    }

    const eyeY = 3 + R.int(2);
    const style = R.pick(EYE_STYLES);
    const pupil = R.pick(['in', 'down', 'left', 'right']);
    const eyeRects = [];
    if (style === 'big') {
      eyeRects.push({ x0: 3, y0: eyeY, w: 2, h: 2 }, { x0: 7, y0: eyeY, w: 2, h: 2 });
    } else if (style === 'tall') {
      eyeRects.push({ x0: 3, y0: eyeY - 1, w: 2, h: 3 }, { x0: 7, y0: eyeY - 1, w: 2, h: 3 });
    } else if (style === 'wide') {
      eyeRects.push({ x0: 2, y0: eyeY, w: 2, h: 2 }, { x0: 8, y0: eyeY, w: 2, h: 2 });
    } else {
      eyeRects.push({ x0: 4, y0: eyeY, w: 4, h: 2 });
    }
    for (const r of eyeRects) {
      for (let y = r.y0; y < r.y0 + r.h && y < PAL_H; y++)
        for (let x = r.x0; x < r.x0 + r.w && x < PAL_W; x++)
          mask[y][x] = true;
    }

    const hasAntenna = R.chance(0.62);
    const doubleHorn = hasAntenna && R.chance(0.35);
    const hasCheeks = R.chance(0.55);
    const hasFangs = R.chance(0.45);
    const hasBelly = R.chance(0.65);
    const mouthY = Math.min(eyeY + 3, 8);

    const cells = [];
    const set = (x, y, c) => cells.push({ x, y, c });

    for (let y = 0; y < PAL_H; y++) {
      for (let x = 0; x < PAL_W; x++) {
        if (!mask[y][x]) continue;
        let c = colors.body;
        if (y >= 9) c = colors.shade;
        if (hasBelly && y >= mouthY + 1 && y <= 10 && x >= 4 && x <= 7) c = colors.belly;
        set(x, y, c);
      }
    }

    for (const r of eyeRects) {
      for (let y = r.y0; y < r.y0 + r.h; y++) {
        for (let x = r.x0; x < r.x0 + r.w; x++) {
          let c = EYE;
          const innerX = r.x0 + r.w / 2 <= PAL_W / 2 ? r.x0 + r.w - 1 : r.x0;
          const isPupil =
            r.h === 3 ? (y === r.y0 + 1 && (pupil === 'left' ? x === r.x0 : x === r.x0 + r.w - 1))
            : pupil === 'down' ? (y === r.y0 + r.h - 1)
            : pupil === 'left' ? (x === r.x0 && y === r.y0 + r.h - 1)
            : pupil === 'right' ? (x === r.x0 + r.w - 1 && y === r.y0 + r.h - 1)
            : (x === innerX && y === r.y0 + r.h - 1);
          if (r.w === 4) {
            if (x >= 5 && x <= 6 && y === r.y0 + r.h - 1) c = INK;
          } else if (isPupil) c = INK;
          set(x, y, c);
        }
      }
    }

    if (hasAntenna) {
      set(5, 0, colors.accent); set(6, 0, colors.accent);
      if (doubleHorn) { set(4, 0, colors.accent); set(7, 0, colors.accent); }
    }
    if (hasCheeks && mask[Math.min(eyeY + 2, 9)]) {
      set(2, Math.min(eyeY + 2, 9), colors.accent);
      set(9, Math.min(eyeY + 2, 9), colors.accent);
    }
    if (hasFangs && mask[mouthY]) {
      set(4, mouthY, EYE); set(7, mouthY, EYE);
    }

    return {
      name: clean,
      seed,
      seedHex: seed.toString(16).padStart(8, '0'),
      w: PAL_W, h: PAL_H,
      colors,
      cells,
      eyeStyle: style,
    };
  }

  /* ============================ SCENE GENERATOR =========================
   * One deterministic scene per story area. Everything laid out in native
   * 144x84 "pixels"; CSS upscales with image-rendering:pixelated.
   * ==================================================================== */

  const AREAS = [
    { id: 'woods',   label: 'Green Woods'  },
    { id: 'drizzle', label: 'Grey Drizzle' },
    { id: 'river',   label: 'Blue River'   },
    { id: 'cave',    label: 'Purple Cave'  },
    { id: 'home',    label: 'Golden Home'  },
  ];

  const AREA_SALT = { woods: 0xA11, drizzle: 0xB22, river: 0xC33, cave: 0xD44, home: 0xE55 };

  // ridge = clamped random walk of column heights (chunky 2px columns)
  function ridge(R, w, base, amp, step) {
    const cols = [];
    let h = base;
    for (let x = 0; x < w; x++) {
      h += R.int(step * 2 + 1) - step;
      if (h < base - amp) h = base - amp;
      if (h > base + amp) h = base + amp;
      cols.push(h);
    }
    return cols;
  }

  function genSky(R, sets) {
    const sky = R.pick(sets);
    const stars = [];
    const n = R.range(10, 18);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: R.int(144), y: R.int(22),
        ph: R.f() * Math.PI * 2, sp: 1.2 + R.f() * 2.4,
        warm: R.chance(0.45),
      });
    }
    const clouds = [];
    const nC = R.range(3, 5);
    for (let i = 0; i < nC; i++) {
      const rows = [];
      for (let dy = -2; dy <= 2; dy++) {
        const len = (3 - Math.abs(dy)) * R.range(3, 5);
        if (len > 2) rows.push({ dy, x0: -Math.floor(len / 2) + R.int(3) - 1, len });
      }
      clouds.push({
        x: R.int(184), y: R.range(5, 24), rows,
        sp: 0.8 + R.f() * 2.2,           // drift speed (parallax)
        shade: R.chance(0.4),            // some clouds shaded grey
      });
    }
    return { sky, stars, clouds };
  }

  function genFlowers(R, n, groundY, cols) {
    const out = [];
    for (let i = 0; i < n; i++)
      out.push({ x: R.range(3, 140), y: groundY + R.range(3, 9), c: R.pick(cols) });
    return out;
  }

  function genTrees(R, n, groundY, dark, mid) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        x: R.range(8, 132), y: groundY,
        h: R.range(9, 15), w: R.range(9, 15),
        dark, mid,
      });
    }
    return out.sort((a, b) => a.w - b.w); // paint small ones first (depth)
  }

  function generateScene(areaId, heroSeed) {
    const R = rngFrom((heroSeed ^ (AREA_SALT[areaId] || 0x777) * 0x9E37) >>> 0);
    const W = 144, H = 84, gy = 62;
    const sc = {
      id: areaId, w: W, h: H, groundY: gy,
      sky: null, bandTop: Math.floor(gy * 0.42), bandMid: Math.floor(gy * 0.78),
      stars: [], clouds: [], hillsB: null, hillsF: null,
      trees: [], flowers: [],
      grass: '#66B971', grassD: '#4E9A5F', earth: '#8A6748', earthD: '#775539',
      gap: null, river: null, puddles: null, rain: false,
      cave: false, stal: [], crystals: [], glowDots: [],
      house: null, orb: null,
    };

    if (areaId === 'woods') {
      const s = genSky(R, [{ bands: ['#8FC7E8', '#BCE3C8', '#E4F6D4'], orb: 'sun' }]);
      Object.assign(sc, s);
      sc.orb = { x: R.range(96, 128), y: R.range(6, 14), kind: 'sun' };
      sc.hillsB = { cols: ridge(R, 72, 24, 10, 2), c: '#9CCFA6' };
      sc.hillsF = { cols: ridge(R, 72, 14, 8, 2), c: '#57A86B' };
      sc.trees = genTrees(R, R.range(3, 4), gy, '#2F7A4A', '#4FB06D');
      sc.flowers = genFlowers(R, R.range(8, 13), gy, ['#FF6B57', '#FFC53D', '#B565D8', '#FF8FB1', '#FFFDF6']);
      sc.gap = { x0: 78, x1: 106, waterY: gy + 15 }; // the blocked path!
    }

    if (areaId === 'drizzle') {
      const s = genSky(R, [{ bands: ['#8D9DAF', '#AEBCC7', '#CBD3D6'], orb: 'none' }]);
      Object.assign(sc, s);
      sc.stars = s.stars.slice(0, 5);         // a few faint stars behind clouds
      for (const c of sc.clouds) c.shade = true;
      sc.hillsB = { cols: ridge(R, 72, 22, 9, 2), c: '#8AA493' };
      sc.hillsF = { cols: ridge(R, 72, 13, 7, 2), c: '#5E8A68' };
      sc.grass = '#5C9563'; sc.grassD = '#48794F'; sc.earth = '#7A5C42'; sc.earthD = '#644A34';
      sc.trees = genTrees(R, 2, gy, '#35684A', '#4E8A62');
      sc.rain = true;
      // seeded puddles on the grass
      sc.puddles = [];
      for (let i = 0; i < 4; i++)
        sc.puddles.push({ x: R.range(8, 120), y: gy + R.range(4, 10), w: R.range(7, 14) });
    }

    if (areaId === 'river') {
      const s = genSky(R, [{ bands: ['#7FB6E4', '#A9D2F0', '#DDF1FB'], orb: 'sun' }]);
      Object.assign(sc, s);
      sc.orb = { x: R.range(10, 30), y: R.range(6, 13), kind: 'sun' };
      sc.hillsB = { cols: ridge(R, 72, 22, 10, 2), c: '#8FC9A0' };
      sc.hillsF = { cols: ridge(R, 72, 13, 7, 2), c: '#57A86B' };
      // wide river splits the ground: near bank | water | far bank
      sc.river = { x0: 34, x1: 122, y: gy - 1 };
      sc.flowers = genFlowers(R, 4, gy, ['#FF6B57', '#FFFDF6']);
      sc.flowers = sc.flowers.filter(f => f.x < sc.river.x0 - 4 || f.x > sc.river.x1 + 2);
      sc.trees = [{ x: 128, y: gy, h: 12, w: 12, dark: '#2F7A4A', mid: '#4FB06D' }];
    }

    if (areaId === 'cave') {
      sc.cave = true;
      sc.stal = [];                    // stalactites hanging from the ceiling
      for (let i = 0; i < 7; i++)
        sc.stal.push({ x: R.range(6, 138), len: R.range(5, 16), w: R.range(3, 6) });
      sc.crystals = [];                // glowing crystal clusters on the floor
      const ccols = ['#B565D8', '#5DA9E9', '#8FD6C9', '#D98AE0'];
      for (let i = 0; i < 6; i++)
        sc.crystals.push({ x: R.range(6, 132), y: gy + R.range(4, 10), h: R.range(3, 8), c: R.pick(ccols) });
      sc.glowDots = [];                // sleepy ember dots floating in the dark
      for (let i = 0; i < 9; i++)
        sc.glowDots.push({ x: R.int(144), y: R.range(10, 56), ph: R.f() * 6.28, c: R.pick(ccols) });
      sc.ceilB = { cols: ridge(R, 72, 16, 8, 2), c: '#3B2A58' };
      sc.ceilF = { cols: ridge(R, 72, 26, 10, 2), c: '#2A1C42' };
      sc.floorC = '#4A3560'; sc.floorD = '#38264E';
    }

    if (areaId === 'home') {
      const s = genSky(R, [{ bands: ['#F2A65E', '#FFC98B', '#FFE9BE'], orb: 'sunset' }]);
      Object.assign(sc, s);
      sc.orb = { x: R.range(18, 40), y: R.range(36, 44), kind: 'sunset', big: true };
      sc.hillsB = { cols: ridge(R, 72, 20, 9, 2), c: '#E5A95F' };
      sc.hillsF = { cols: ridge(R, 72, 12, 7, 2), c: '#D1914C' };
      sc.grass = '#DCB066'; sc.grassD = '#C49A52'; sc.earth = '#96684A'; sc.earthD = '#7D563C';
      sc.trees = genTrees(R, 1, gy, '#A2662F', '#D88F3F');
      if (sc.trees[0]) sc.trees[0].x = R.range(8, 40);
      sc.flowers = genFlowers(R, R.range(6, 9), gy, ['#FFF3C4', '#FF8F6B', '#FFFDF6', '#B565D8']);
      // the little home with the door that opens (door drawn by prop)
      sc.house = { x: 102, y: 30, doorX: 118, doorY: 46, doorW: 9, doorH: 16 };
    }

    return sc;
  }

  /* --------------------------- scene painter --------------------------- */

  function drawOrb(ctx, sc) {
    if (!sc.orb) return;
    const o = sc.orb;
    if (o.kind === 'sun') {
      ctx.fillStyle = '#FFDE6B';
      ctx.fillRect(o.x + 1, o.y, 5, 7); ctx.fillRect(o.x, o.y + 1, 7, 5);
      ctx.fillStyle = '#FFF3C4'; ctx.fillRect(o.x + 2, o.y + 2, 3, 3);
    } else if (o.kind === 'moon') {
      ctx.fillStyle = '#FFF6DA';
      ctx.fillRect(o.x + 1, o.y, 5, 7); ctx.fillRect(o.x, o.y + 1, 7, 5);
      ctx.fillStyle = 'rgba(160,150,190,0.5)'; ctx.fillRect(o.x + 4, o.y + 1, 2, 2);
    } else if (o.kind === 'sunset') {
      // fat low sun sinking into the hills
      ctx.fillStyle = '#FF9B4F';
      ctx.fillRect(o.x + 2, o.y, 10, 12);
      ctx.fillRect(o.x, o.y + 2, 14, 8);
      ctx.fillStyle = '#FFC53D'; ctx.fillRect(o.x + 4, o.y + 3, 6, 5);
    }
  }

  function drawStars(ctx, sc, t) {
    for (const s of sc.stars) {
      const a = 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = s.warm ? '#FFE9A8' : '#FFFDF6';
      ctx.fillRect(s.x, s.y, 1, 1);
      if (a > 0.82) {
        ctx.globalAlpha = a * 0.5;
        ctx.fillRect(s.x - 1, s.y, 1, 1); ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1); ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(ctx, sc, t) {
    const W = sc.w;
    for (const c of sc.clouds) {
      const cx = W - ((c.x + t * c.sp) % (W + 56)) + 20;
      ctx.fillStyle = c.shade ? 'rgba(200,208,214,0.9)' : 'rgba(255,253,246,0.92)';
      for (const r of c.rows) ctx.fillRect(Math.round(cx + r.x0), c.y + r.dy, r.len, 1);
      ctx.fillStyle = 'rgba(120,140,170,0.22)';
      for (const r of c.rows) if (r.dy === 2) ctx.fillRect(Math.round(cx + r.x0), c.y + r.dy, r.len, 1);
    }
  }

  function drawHills(ctx, sc) {
    const gy = sc.groundY;
    for (const h of [sc.hillsB, sc.hillsF]) {
      if (!h) continue;
      ctx.fillStyle = h.c;
      for (let i = 0; i < h.cols.length; i++)
        ctx.fillRect(i * 2, gy - h.cols[i], 2, h.cols[i]);
    }
  }

  function drawTree(ctx, tr) {
    const x = tr.x, base = tr.y;
    // trunk
    ctx.fillStyle = '#5C422C';
    ctx.fillRect(x - 1, base - 5, 3, 5);
    // stepped canopy blob
    ctx.fillStyle = tr.dark;
    const w = tr.w;
    ctx.fillRect(x - (w >> 1) + 2, base - tr.h - 2, w - 4, 2);
    ctx.fillStyle = tr.mid;
    ctx.fillRect(x - (w >> 1), base - tr.h, w, tr.h - 6);
    ctx.fillRect(x - (w >> 1) + 1, base - tr.h - 1, w - 2, 1);
    ctx.fillStyle = tr.dark;
    ctx.fillRect(x - (w >> 1), base - 7, w, 2);
    // shine fleck
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x - (w >> 1) + 2, base - tr.h + 1, 2, 2);
  }

  function drawGround(ctx, sc) {
    const { w: W, h: H, groundY: gy } = sc;
    if (sc.river) {
      // near bank
      ctx.fillStyle = sc.grass; ctx.fillRect(0, gy, sc.river.x0, 7);
      ctx.fillStyle = sc.earth; ctx.fillRect(0, gy + 7, sc.river.x0, H - gy - 7);
      // far bank
      ctx.fillStyle = sc.grass; ctx.fillRect(sc.river.x1, gy, W - sc.river.x1, 7);
      ctx.fillStyle = sc.earth; ctx.fillRect(sc.river.x1, gy + 7, W - sc.river.x1, H - gy - 7);
      ctx.fillStyle = sc.grassD;
      ctx.fillRect(0, gy + 7, sc.river.x0, 2); ctx.fillRect(sc.river.x1, gy + 7, W - sc.river.x1, 2);
      // water
      ctx.fillStyle = '#5DA9E9'; ctx.fillRect(sc.river.x0, sc.river.y, sc.river.x1 - sc.river.x0, H - sc.river.y);
      ctx.fillStyle = '#3E7CC0'; ctx.fillRect(sc.river.x0, sc.river.y + 12, sc.river.x1 - sc.river.x0, H - sc.river.y - 12);
      ctx.fillStyle = '#2E5E96'; ctx.fillRect(sc.river.x0, H - 4, sc.river.x1 - sc.river.x0, 4);
      return;
    }
    const gx0 = sc.gap ? sc.gap.x0 : -1;
    const gx1 = sc.gap ? sc.gap.x1 : -1;
    ctx.fillStyle = sc.grass;
    ctx.fillRect(0, gy, W, 6);
    ctx.fillStyle = sc.grassD; ctx.fillRect(0, gy + 6, W, 4);
    ctx.fillStyle = sc.earth; ctx.fillRect(0, gy + 10, W, H - gy - 13);
    ctx.fillStyle = sc.earthD; ctx.fillRect(0, H - 3, W, 3);
    if (sc.gap) {
      // carve the ditch: dark hole + crumbled walls + trickle of water
      ctx.fillStyle = '#241A12';
      ctx.fillRect(gx0, gy, gx1 - gx0, H - gy);
      ctx.fillStyle = sc.earthD;
      ctx.fillRect(gx0, gy, 2, H - gy); ctx.fillRect(gx1 - 2, gy, 2, H - gy);
      ctx.fillStyle = '#5DA9E9';
      ctx.fillRect(gx0 + 2, sc.gap.waterY, gx1 - gx0 - 4, 3);
      ctx.fillStyle = '#3E7CC0';
      ctx.fillRect(gx0 + 2, sc.gap.waterY + 3, gx1 - gx0 - 4, 2);
      // crumbled edge bits
      ctx.fillStyle = sc.grass;
      ctx.fillRect(gx0 - 2, gy + 4, 2, 2); ctx.fillRect(gx1, gy + 4, 2, 2);
    }
  }

  function drawWaterWaves(ctx, sc, t) {
    if (sc.river) {
      const { x0, x1, y } = sc.river;
      for (let x = x0 + 1; x < x1 - 1; x += 2) {
        const yy = y + 1 + Math.round(Math.sin(x * 0.45 + t * 2.2) * 1);
        ctx.fillStyle = '#BFEBFF';
        ctx.fillRect(x, yy, 2, 1);
      }
      // drifting foam specks
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 8; i++) {
        const fx = x0 + ((i * 37 + t * (4 + i)) % (x1 - x0));
        ctx.fillRect(Math.round(fx), y + 5 + (i * 3) % 10, 1, 1);
      }
    }
    if (sc.gap) {
      const { x0, x1, waterY } = sc.gap;
      for (let x = x0 + 3; x < x1 - 3; x += 3) {
        const yy = waterY + Math.round(Math.sin(x * 0.7 + t * 2.6) * 0.6);
        ctx.fillStyle = '#BFEBFF';
        ctx.fillRect(x, yy, 1, 1);
      }
    }
  }

  function drawHouse(ctx, sc) {
    const h = sc.house;
    if (!h) return;
    const x = h.x, y = h.y;
    // stepped triangle roof
    ctx.fillStyle = '#B5533C';
    for (let i = 0; i < 8; i++) {
      const w = 8 + i * 4;
      ctx.fillRect(Math.round(h.doorX + h.doorW / 2 - w / 2 + 1), y + i * 2, w, 2);
    }
    ctx.fillStyle = '#8A6748'; // chimney
    ctx.fillRect(x + 26, y + 2, 5, 10);
    ctx.fillStyle = '#5C422C'; ctx.fillRect(x + 26, y + 2, 5, 1);
    // walls with plank seams
    ctx.fillStyle = '#D99B60'; ctx.fillRect(x, y + 16, 38, sc.groundY - y - 16 + 4);
    ctx.fillStyle = '#C68A52';
    for (let px = x + 7; px < x + 38; px += 8) ctx.fillRect(px, y + 16, 1, sc.groundY - y - 16 + 4);
    ctx.fillStyle = '#8A6748';
    ctx.fillRect(x, y + 15, 38, 2);           // eave
    ctx.fillRect(x, sc.groundY + 3, 38, 2);   // base
    // lit window with cross frame
    ctx.fillStyle = '#5C422C'; ctx.fillRect(x + 5, y + 22, 9, 9);
    ctx.fillStyle = '#FFE08A'; ctx.fillRect(x + 6, y + 23, 7, 7);
    ctx.fillStyle = '#5C422C';
    ctx.fillRect(x + 9, y + 23, 1, 7); ctx.fillRect(x + 6, y + 26, 7, 1);
    // door opening is drawn by the 'doorway' prop (game.js) so it can swing
  }

  function drawCave(ctx, sc, t) {
    const { w: W, h: H, groundY: gy } = sc;
    ctx.fillStyle = '#241A38'; ctx.fillRect(0, 0, W, H);
    // rock strata hint stripes
    ctx.fillStyle = '#2C2044';
    for (let y = 8; y < gy; y += 9) ctx.fillRect(0, y, W, 1);
    // ceiling ridges hanging down
    for (const c of [sc.ceilB, sc.ceilF]) {
      ctx.fillStyle = c.c;
      for (let i = 0; i < c.cols.length; i++)
        ctx.fillRect(i * 2, 0, 2, c.cols[i]);
    }
    // stalactites: stepped triangles
    ctx.fillStyle = '#33234E';
    for (const s of sc.stal) {
      for (let i = 0; i < s.len; i++) {
        const w = Math.max(1, Math.round(s.w * (1 - i / s.len)));
        ctx.fillRect(s.x - (w >> 1), 10 + i, w, 1);
      }
    }
    // floor
    ctx.fillStyle = sc.floorC; ctx.fillRect(0, gy, W, 8);
    ctx.fillStyle = sc.floorD; ctx.fillRect(0, gy + 8, W, H - gy - 8);
    ctx.fillStyle = '#2C1E40'; ctx.fillRect(0, H - 3, W, 3);
    // glowing crystals (they catch the dark even before the lantern)
    for (const c of sc.crystals) {
      const tw = 0.7 + 0.3 * Math.sin(t * 2 + c.x);
      ctx.globalAlpha = tw;
      ctx.fillStyle = c.c;
      ctx.fillRect(c.x, c.y - c.h, 2, c.h);
      ctx.fillRect(c.x - 1, c.y - c.h + 1, 4, c.h - 2);
      ctx.fillRect(c.x + 3, c.y - c.h + 2, 1, 2);
      ctx.globalAlpha = tw * 0.5;
      ctx.fillRect(c.x - 2, c.y - 1, 7, 1);
      ctx.globalAlpha = 1;
    }
    // drifting ember dots
    for (const g of sc.glowDots) {
      const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.4 + g.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = g.c;
      ctx.fillRect(g.x, g.y + Math.round(Math.sin(t * 0.8 + g.ph) * 2), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawScene(ctx, sc, t) {
    const { w: W, groundY: gy } = sc;
    if (sc.cave) { drawCave(ctx, sc, t); return; }

    ctx.fillStyle = sc.sky.bands[0]; ctx.fillRect(0, 0, W, sc.bandTop);
    ctx.fillStyle = sc.sky.bands[1]; ctx.fillRect(0, sc.bandTop, W, sc.bandMid - sc.bandTop);
    ctx.fillStyle = sc.sky.bands[2]; ctx.fillRect(0, sc.bandMid, W, gy - sc.bandMid);

    drawOrb(ctx, sc);
    drawStars(ctx, sc, t);
    drawClouds(ctx, sc, t);
    drawHills(ctx, sc);

    drawGround(ctx, sc);
    drawWaterWaves(ctx, sc, t);

    for (const tr of sc.trees) drawTree(ctx, tr);

    if (sc.puddles) {
      for (const p of sc.puddles) {
        ctx.fillStyle = '#7FA8C8'; ctx.fillRect(p.x, p.y, p.w, 2);
        ctx.fillStyle = '#A8CCE4'; ctx.fillRect(p.x + 1, p.y, Math.max(1, p.w - 4), 1);
      }
    }

    for (const fl of sc.flowers) {
      ctx.fillStyle = '#3C8D57'; ctx.fillRect(fl.x, fl.y + 1, 1, 2);
      ctx.fillStyle = fl.c; ctx.fillRect(fl.x - 1, fl.y, 3, 1);
    }

    drawHouse(ctx, sc);
  }

  /* ============================ PROP SPRITES ============================
   * Every prop is composed from code: chunky 1px-aligned rects, no assets.
   * drawProp(ctx, key, x, y, p, t) — p carries live params (open, trot...).
   * ==================================================================== */

  const WOOD = '#8A6748', WOOD_D = '#5C422C', WOOD_L = '#B8905E';
  const GOLD = '#FFC53D', BREAD = '#E8A74F', IRON = '#6B7280', IRON_D = '#4B5563';

  // r = chunky rect painter bound to an origin
  function rp(ctx, x, y) {
    return (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, w, h); };
  }

  const PROPS = {

    /* ---- beat 1: cross the gap ---------------------------------------- */
    bridge(r) { // 34x8
      for (let i = 0; i < 34; i += 5) r(i, 0, 1, 2, WOOD_D);   // rail posts
      r(0, 1, 34, 1, WOOD_D);                                   // rope rail
      r(0, 2, 34, 2, WOOD);                                     // deck
      for (let i = 0; i < 34; i += 4) r(i, 2, 1, 2, WOOD_L);    // plank stripes
      r(1, 4, 1, 4, WOOD_D); r(16, 4, 1, 4, WOOD_D); r(32, 4, 1, 4, WOOD_D); // legs
    },
    log(r) { // 20x8
      r(4, 0, 14, 1, WOOD_D); r(2, 1, 17, 1, WOOD_D);
      r(1, 2, 19, 4, WOOD);
      r(3, 2, 15, 1, WOOD_L);                                   // sunlit top
      r(1, 6, 19, 1, WOOD_D); r(3, 7, 15, 1, WOOD_D);
      r(0, 3, 1, 2, WOOD_D);                                    // left end cap
      r(2, 3, 1, 2, '#E8CD9E');                                 // ring
      for (let i = 5; i < 19; i += 5) r(i, 4, 3, 1, WOOD_D);    // bark notches
    },
    vine(r, p, t, ctx, x, y) { // procedural drape between two anchors
      const x0 = 0, x1 = p.w || 30, sag = 7;
      for (let i = 0; i <= x1; i += 2) {
        const yy = Math.round(Math.sin((i / x1) * Math.PI) * sag);
        r(i, yy, 2, 1, '#3C8D57');
        if (i % 6 === 0) r(i + 1, yy - 1, 1, 1, '#4FB06D');     // leaf flecks
        if (i % 10 === 5) r(i, yy + 1, 1, 2, '#3C8D57');        // dangling bits
      }
      r(0, 0, 2, 2, '#2F7A4A'); r(x1 - 1, 0, 2, 2, '#2F7A4A');  // anchor tufts
    },
    stones(r) { // 28x4 — stepping stones sitting in the ditch water
      for (const s of [0, 10, 20]) {
        r(s + 1, 0, 6, 1, '#9BA3A8');
        r(s, 1, 8, 2, '#8A9299');
        r(s + 1, 3, 6, 1, '#6E767D');
        r(s + 2, 1, 2, 1, '#C9CFD4'); // shine
      }
    },

    /* ---- beat 2: rain gear (worn — drawn relative to the hero) -------- */
    umbrella(r) { // 16x11
      r(7, 0, 2, 2, '#D84E3C');                                 // cap knob
      r(3, 1, 10, 1, '#FF6B57');
      r(1, 2, 14, 1, '#FF6B57');
      r(0, 3, 16, 1, '#FF6B57');                                // canopy
      for (let i = 0; i < 16; i += 3) r(i, 4, 2, 1, '#D84E3C'); // scallops
      r(7, 4, 1, 6, INK);                                       // stick
      r(8, 9, 2, 1, INK);                                       // hook
    },
    hat(r) { // 12x5
      r(3, 0, 6, 2, GOLD);
      r(2, 2, 8, 1, GOLD);
      r(3, 2, 6, 1, '#FF6B57');                                 // band
      r(0, 3, 12, 1, '#E0A32A');                                // brim
      r(1, 4, 10, 1, '#E0A32A');
    },
    leaf(r) { // 11x7 — a giant leaf held like an umbrella
      r(4, 0, 3, 1, '#4FB06D');
      r(2, 1, 7, 1, '#4FB06D');
      r(1, 2, 9, 2, '#4FB06D');
      r(2, 4, 7, 1, '#3C8D57');
      r(4, 2, 1, 3, '#2F7A4A');                                 // vein
      r(7, 5, 3, 1, '#2F7A4A');                                 // stem
      r(9, 6, 2, 1, '#2F7A4A');
    },
    poncho(r) { // 12x7 — drapes over the hero's top rows
      r(4, 0, 4, 1, '#5DA9E9');
      r(2, 1, 8, 2, '#5DA9E9');
      r(1, 3, 10, 2, '#4487C7');
      r(0, 5, 12, 2, '#4487C7');
      r(5, 1, 2, 2, '#FFFDF6');                                 // hood opening
    },

    /* ---- beat 3: rideables -------------------------------------------- */
    boat(r) { // 24x10
      r(11, 0, 1, 6, WOOD_D);                                   // mast
      r(12, 1, 5, 1, '#FFFDF6'); r(12, 2, 7, 1, '#FFFDF6');     // sail
      r(12, 3, 5, 1, '#FFFDF6'); r(12, 4, 3, 1, '#FFFDF6');
      r(2, 1, 4, 1, '#FFE9B8'); r(4, 2, 4, 1, '#FFE9B8');       // lil flag sail
      r(0, 6, 24, 2, WOOD);                                     // hull
      r(2, 8, 20, 1, WOOD_D); r(4, 9, 16, 1, WOOD_D);
      for (let i = 3; i < 22; i += 5) r(i, 6, 1, 2, WOOD_L);    // plank marks
    },
    raft(r) { // 22x5 — three logs lashed together
      for (let i = 0; i < 3; i++) {
        r(1, i * 2 - (i === 2 ? 1 : 0), 20, 1, i % 2 ? WOOD : WOOD_L);
      }
      r(0, 0, 22, 1, WOOD_D); r(0, 4, 22, 1, WOOD_D);
      r(4, 0, 1, 5, WOOD_D); r(17, 0, 1, 5, WOOD_D);            // lashings
    },
    duck(r, p) { // 15x9
      const B = (p && p.tint) || '#FFC53D', BD = (p && p.tintD) || '#E0A32A';
      r(9, 0, 4, 1, B); r(8, 1, 6, 2, B);                       // head
      r(11, 1, 1, 1, INK);                                      // eye
      r(14, 1, 2, 1, '#FF8F3B'); r(14, 2, 1, 1, '#FF8F3B');     // beak
      r(8, 3, 3, 2, B);                                         // neck
      r(1, 5, 11, 3, B); r(0, 4, 3, 2, B);                      // body + tail
      r(3, 8, 8, 1, BD);                                        // belly shade
      r(5, 6, 4, 1, BD);                                        // wing mark
    },
    swan(r, p, t) { // a duck in formal wear (white tint + longer neck vibe)
      PROPS.duck(r, Object.assign({ tint: '#FFFDF6', tintD: '#D8D3C8' }, p), t);
      r(8, -1, 2, 1, '#FFFDF6'); // taller neck
      r(11, 1, 1, 1, '#FF8F3B'); // beak tip
    },
    fish(r, p) { // 18x8
      const B = (p && p.tint) || '#F0924F', BD = (p && p.tintD) || '#D1703A';
      r(0, 2, 3, 4, BD); r(1, 1, 1, 6, BD);                     // tail
      r(3, 1, 12, 6, B);                                        // body
      r(15, 3, 2, 2, B);                                        // snout
      r(13, 2, 1, 1, INK);                                      // eye
      r(7, 0, 5, 1, BD);                                        // dorsal fin
      r(5, 4, 8, 1, BD);                                        // belly stripe
    },
    whale(r, p) { // 24x10 — big friendly blue
      const B = '#5DA9E9', BD = '#4487C7';
      r(0, 3, 18, 6, B); r(2, 2, 14, 1, B);                     // body
      r(18, 1, 3, 2, BD); r(20, 0, 3, 2, BD); r(21, 3, 2, 3, BD); // tail fluke
      r(2, 9, 13, 1, BD);                                       // belly
      r(4, 5, 1, 1, INK);                                       // eye
      r(8, 1, 1, 1, '#DDF1FB');                                 // spout base
      r(7, 0, 1, 1, '#DDF1FB'); r(9, 0, 1, 1, '#DDF1FB');       // spout tips
      r(4, 7, 4, 1, BD);                                        // smile-ish line
    },
    turtle(r) { // 17x8
      r(4, 0, 7, 1, '#3C8D57');
      r(2, 1, 11, 2, '#4FB06D');                                // shell dome
      r(1, 3, 13, 3, '#3C8D57');
      r(4, 2, 2, 2, '#8FD97B'); r(8, 2, 2, 2, '#8FD97B');       // shell plates
      r(14, 3, 3, 2, '#8FD97B'); r(15, 3, 1, 1, INK);           // head + eye
      r(0, 4, 2, 1, '#8FD97B');                                 // tail
      r(3, 6, 3, 2, '#2F7A4A'); r(10, 6, 3, 2, '#2F7A4A');      // flippers
    },
    unicorn(r, p, t) { // 26x15 — THE rideable star. Trotting leg frames!
      const W = '#FFFDF6', M = '#FF8FB1', G = GOLD, H = '#E8B0C8';
      const trot = p && p.trot;
      const f = trot ? Math.floor(t * 9) % 2 : 0;
      // horn (2-step diagonal) + ear + head
      r(21, 0, 2, 1, G); r(20, 1, 2, 1, G);
      r(17, 2, 2, 2, W);
      r(18, 3, 5, 2, W); r(22, 4, 3, 2, W);                     // head + muzzle
      r(21, 3, 1, 1, INK);                                      // eye
      r(15, 4, 4, 4, W);                                        // neck
      r(14, 3, 2, 5, M);                                        // mane stripe
      r(3, 6, 13, 5, W);                                        // body
      r(12, 5, 4, 2, M);                                        // mane over withers
      r(0, 5, 3, 3, M); r(0, 8, 2, 2, M);                       // tail
      r(1, 4, 2, 1, M);
      // legs: 4 columns, lengths swap when trotting
      const legs = f ? [[4, 3], [7, 4], [13, 4], [16, 3]]
                     : [[4, 4], [7, 3], [13, 3], [16, 4]];
      for (const [lx, ll] of legs) {
        r(lx, 11, 2, ll, W);
        r(lx, 11 + ll, 2, 1, H);                                // hoof
      }
      // pink blazed forehead + flank heart-ish spot
      r(19, 5, 1, 1, M); r(7, 8, 2, 2, M);
    },

    /* ---- beat 4: lights ------------------------------------------------ */
    lantern(r, p, t) { // 8x11 — flame flickers inside the cage
      r(3, 0, 2, 1, IRON_D); r(2, 1, 4, 1, IRON_D);             // handle + cap
      r(1, 2, 6, 7, IRON);                                      // cage
      const fl = Math.sin(t * 11) > 0 ? 1 : 0;
      r(2, 3 + fl, 4, 4 - fl, '#FFE08A');                       // glow
      r(3, 4, 2, 2, '#FFF6DA');                                 // hot core
      r(1, 2, 1, 7, IRON_D); r(6, 2, 1, 7, IRON_D);             // frame ribs
      r(1, 9, 6, 2, IRON_D);                                    // base
    },
    torch(r, p, t) { // 6x11 — wrapped stick with a lean flame
      const lean = Math.sin(t * 9) > 0.3 ? 1 : 0;
      r(1 + lean, 0, 3, 2, '#FF9B4F');                          // flame
      r(2, 1, 2, 1, '#FFE08A');
      r(1, 2, 4, 2, '#B5533C');                                 // head wrap
      r(2, 4, 2, 7, WOOD_D);                                    // stick
      r(2, 8, 2, 1, WOOD_L);                                    // grip band
    },
    candle(r, p, t) { // 5x9
      const lean = Math.sin(t * 10) > 0.2 ? 1 : 0;
      r(1 + lean, 0, 3, 2, '#FF9B4F'); r(2 + lean, 0, 1, 1, '#FFE08A');
      r(2, 2, 1, 1, INK);                                       // wick
      r(1, 3, 4, 5, '#FFF0C8');                                 // wax body
      r(4, 4, 1, 2, '#E8D8A8');                                 // drips
      r(0, 8, 6, 1, GOLD);                                      // saucer
    },
    worm(r, p, t) { // 9x5 — glow-worm curls up glowing
      const g = '#B8F06A';
      const sq = [0, 1, 0, -1][Math.floor(t * 3) % 4];          // wriggle
      r(0, 3, 2, 2, g); r(2, 2 + sq, 2, 2, g); r(4, 3, 2, 2, g);
      r(6, 2 - sq, 2, 2, g); r(8, 1, 1, 2, '#D8F79B');          // head
      r(8, 0, 1, 1, '#FFFDF6');                                 // glow tip
    },
    star(r, p, t) { // 7x7 — a fallen star on a stick, twinkles
      const tw = Math.sin(t * 6) > 0 ? '#FFF3C4' : GOLD;
      r(3, 0, 1, 2, tw); r(1, 2, 5, 1, tw); r(2, 3, 3, 2, tw);
      r(1, 5, 2, 1, tw); r(4, 5, 2, 1, tw);
      r(3, 6, 1, 1, '#E0A32A');
    },

    /* ---- beat 5: home props -------------------------------------------- */
    key(r, p, t) { // 10x6 — floats/spins toward the door
      const bob = Math.round(Math.sin(t * 4) * 1);
      r(0, 1 + bob, 1, 3, GOLD); r(1, 0 + bob, 3, 1, GOLD);     // ring
      r(3, 1 + bob, 1, 3, GOLD); r(1, 3 + bob, 2, 1, GOLD);
      r(4, 1 + bob, 6, 2, GOLD);                                // shaft
      r(8, 3 + bob, 1, 2, GOLD); r(6, 3 + bob, 1, 1, GOLD);     // teeth
      r(1, 1 + bob, 2, 2, '#FFE9A8');                           // ring shine
    },
    jar(r, p) { // 12x12 — cookie jar; lid pops when open
      const open = (p && p.open) || 0;
      const lidY = -Math.round(open * 5);
      // cookies visible through the glass
      r(2, 5, 3, 3, '#B8763F'); r(7, 6, 3, 3, '#B8763F'); r(4, 8, 3, 3, '#B8763F');
      r(3, 6, 1, 1, '#5C422C'); r(8, 7, 1, 1, '#5C422C'); r(5, 9, 1, 1, '#5C422C'); // chips
      // glass body
      r(1, 3, 10, 9, 'rgba(207,232,240,0.55)');
      r(1, 3, 1, 9, '#9CC8D8'); r(10, 3, 1, 9, '#9CC8D8');
      r(1, 11, 10, 1, '#9CC8D8');
      r(2, 4, 2, 1, '#EAF6FA');                                 // glass shine
      // lid (slides up when open)
      r(0, 1 + lidY, 12, 2, '#FF6B57');
      r(4, 0 + lidY, 4, 1, '#D84E3C');
    },

    /* ---- doorway (the house's door; opens for the finale) --------------- */
    doorway(r, p, t, ctx, x, y, h) { // drawn at house.doorX/doorY
      const open = (p && p.open) || 0;
      const dw = h.doorW, dh = h.doorH;
      r(-1, -1, dw + 2, 1, '#5C422C');                          // lintel
      r(-1, -1, 1, dh + 2, '#5C422C'); r(dw, -1, 1, dh + 2, '#5C422C');
      if (open > 0.05) {                                        // warm inside
        r(0, 0, dw, dh, '#FFE08A');
        r(1, 1, dw - 2, dh - 2, '#FFDF7E');
        ctx.globalAlpha = open * 0.5;                           // light spill
        r(-4, dh - 4, dw + 8, 4, '#FFE9A8');
        ctx.globalAlpha = 1;
      } else {
        r(0, 0, dw, dh, '#3A2A20');                             // dark inside
      }
      if (p && p.eyes) {                                        // silly scare!
        r(1, 6, 2, 2, '#FFDE6B'); r(5, 6, 2, 2, '#FFDE6B');
        r(1, 6, 1, 1, INK); r(6, 6, 1, 1, INK);
      }
      const pw = Math.max(1, Math.round(dw * (1 - open)));      // swinging panel
      r(dw - pw, 0, pw, dh, '#7A5230');                         // hinges right
      if (pw > 4) { r(dw - pw + 1, Math.floor(dh / 2), 1, 2, GOLD); } // knob
      r(dw - pw, 0, pw, 1, '#96683C');                          // panel top edge
    },

    /* ---- silly props (they REALLY spawn — that's the joke) -------------- */
    peel(r) { // 10x7 — the classic three-point banana peel
      r(4, 2, 2, 2, '#FFC53D');
      r(1, 0, 2, 4, '#FFC53D'); r(0, 3, 2, 3, '#FFC53D');       // left arm
      r(4, 0, 1, 3, '#FFE08A');                                 // middle arm
      r(7, 0, 2, 4, '#FFC53D'); r(8, 3, 2, 3, '#FFC53D');       // right arm
      r(1, 0, 1, 1, '#E0A32A'); r(8, 0, 1, 1, '#E0A32A');       // brown tips
      r(3, 5, 4, 1, '#E0A32A');                                 // base
    },
    soap(r, p, t) { // 10x6 — slippery bar + bubbles
      r(0, 2, 8, 3, '#B8E8F0'); r(1, 1, 6, 1, '#B8E8F0');
      r(1, 2, 4, 1, '#EAFBFF');                                 // shine
      r(8, 0, 2, 2, '#DFF4FA'); r(9, 3, 1, 1, '#DFF4FA');       // bubbles
    },
    ice(r) { // 11x5 — a treacherous ice puddle
      r(0, 2, 11, 2, '#CFE8F7'); r(2, 1, 7, 1, '#CFE8F7');
      r(2, 2, 4, 1, '#FFFDF6');                                 // glare
      r(5, 3, 3, 1, '#9CC8E8');                                 // crack
      r(1, 4, 8, 1, '#A8D0EA');
    },
    bag(r) { // 10x10 — soggy paper bag over the head
      r(1, 0, 7, 1, '#A88B5C');                                 // folded rim
      r(0, 1, 10, 8, '#C9A86B');
      r(2, 3, 1, 1, '#A88B5C'); r(6, 4, 1, 1, '#A88B5C');       // creases
      r(4, 6, 1, 1, '#A88B5C');
      r(1, 9, 8, 1, '#A88B5C');                                 // soggy bottom
      r(3, 8, 4, 1, '#B8946A');                                 // droop
    },
    toast(r, p, t) { // 9x9 — soggy toast, droops as it rains
      const droop = p && p.soggy ? Math.min(2, (p.soggy | 0)) : 0;
      r(1, 0, 7, 2, '#B8763F');                                 // crust top
      r(0, 2, 9, 6, '#B8763F');
      r(1, 2, 7, 5, BREAD);                                     // soft middle
      r(2, 4, 2, 1, '#C98A4F'); r(5, 5, 2, 1, '#C98A4F');       // crumbs
      r(0, 7, 3, 1 + droop, '#8A6748');                         // soggy sag
      r(6, 7, 3, 1 + droop, '#8A6748');
    },
    anvil(r) { // 13x9 — extremely not a flotation device
      r(0, 0, 13, 3, IRON);                                     // top face
      r(0, 0, 2, 2, IRON_D);                                    // horn step
      r(4, 3, 5, 3, IRON_D);                                    // waist
      r(2, 6, 9, 2, IRON);                                      // base
      r(2, 8, 9, 1, IRON_D);
      r(10, 1, 2, 1, '#9BA3A8');                                // shine
    },
    toaster(r) { // 11x9 — chrome box with doomed toast
      r(2, 0, 3, 1, BREAD); r(6, 0, 3, 1, BREAD);               // toast popping
      r(1, 1, 9, 1, IRON_D);                                    // slots
      r(0, 2, 10, 6, '#D8D3C8');
      r(1, 3, 8, 1, '#B8B3A8');                                 // shine line
      r(10, 3, 1, 2, IRON_D);                                   // lever
      r(1, 8, 2, 1, IRON_D); r(7, 8, 2, 1, IRON_D);             // feet
    },
    fridge(r) { // 11x15 — way too big to ride
      r(0, 0, 11, 14, '#D8E0E8');
      r(0, 5, 11, 1, IRON_D);                                   // freezer split
      r(8, 2, 1, 2, IRON_D); r(8, 7, 1, 3, IRON_D);             // handles
      r(1, 1, 3, 2, '#FFFDF6');                                 // magnet
      r(1, 14, 2, 1, IRON_D); r(8, 14, 2, 1, IRON_D);           // feet
    },
    pickle(r) { // 8x10 — a pickle is not a lamp
      r(2, 0, 4, 1, '#5E8F3E');
      r(1, 1, 6, 8, '#5E8F3E');
      r(1, 9, 6, 1, '#4A7330');
      r(2, 3, 1, 1, '#8FBC5E'); r(5, 5, 1, 1, '#8FBC5E');       // bumps
      r(3, 7, 1, 1, '#8FBC5E'); r(4, 1, 1, 1, '#4A7330');
    },
    sock(r) { // 9x9 — a wet sock, definitely not a light
      r(2, 0, 4, 1, '#C9B896');
      r(1, 1, 6, 4, '#E8E0D0');                                 // leg
      r(2, 2, 4, 1, '#FF6B57');                                 // stripe
      r(1, 5, 3, 2, '#E8E0D0');                                 // heel bend
      r(1, 6, 7, 2, '#E8E0D0');                                 // foot
      r(6, 7, 2, 1, '#C9B896');                                 // toe
    },
    cheese(r) { // 11x8 — aromatic wedge, zero lumens
      r(2, 1, 6, 1, GOLD); r(1, 2, 8, 1, GOLD);
      r(0, 3, 11, 4, GOLD);
      r(2, 4, 1, 1, '#D89B2A'); r(6, 5, 2, 1, '#D89B2A');       // holes
      r(4, 2, 1, 1, '#D89B2A'); r(8, 4, 1, 1, '#D89B2A');
      r(0, 7, 11, 1, '#E0A32A');
    },
  };

  // Called by the game: draws prop `key` at scene coords with params p.
  // `extra` is forwarded to props that need context (doorway <- the house).
  function drawProp(ctx, key, x, y, p, t, extra) {
    const fn = PROPS[key];
    if (!fn) return;
    fn(rp(ctx, Math.round(x), Math.round(y)), p, t, ctx, x, y, extra);
  }

  /* ------------------------------ pal painter -------------------------- */

  // Draw pal cells; mod(cell,i,t) can override dx/dy/c/a/s per cell/frame.
  function drawPal(ctx, cells, cellSize, mod, t) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      let dx = 0, dy = 0, col = cell.c, a = 1, s = 1;
      if (mod) {
        const m = mod(cell, i, t);
        if (m) {
          if (m.dx) dx = m.dx;
          if (m.dy) dy = m.dy;
          if (m.c) col = m.c;
          if (m.a != null) a = m.a;
          if (m.s != null) s = m.s;
        }
      }
      const sz = cellSize * s;
      const off = (cellSize - sz) / 2;
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.fillRect(
        Math.round(cell.x * cellSize + dx + off),
        Math.round(cell.y * cellSize + dy + off),
        Math.max(1, Math.round(sz)),
        Math.max(1, Math.round(sz))
      );
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------ name list ---------------------------- */

  const PAL_NAMES = [
    'Bloop', 'Ziggy', 'Momo', 'Fizz', 'Noodle', 'Sprout', 'Waffles', 'Bean',
    'Gizmo', 'Dot', 'Biscuit', 'Puddles', 'Zorp', 'Tilly', 'Mango', 'Fig',
    'Pesto', 'Wobbles', 'Cricket', 'Marble', 'Tater', 'Plum', 'Scooter', 'Juniper',
  ];

  /* ------------------------------- export ------------------------------ */

  const api = {
    INK, EYE, PAL_W, PAL_H,
    fnv1a, mulberry32, rngFrom,
    generatePal, PAL_NAMES,
    AREAS, generateScene, drawScene,
    drawProp, PROPS,
    drawPal,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PixelPal = api;
})(typeof window !== 'undefined' ? window : globalThis);
