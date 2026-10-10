/* ============================================================
   The Three Little Pigs · Zdog Diorama — world.js
   Rebuilds the whole lazy-susan diorama from each LLM scene_seed:
   {biome, seed, palette, props[]}.

   ZWORLD.build(ctx, ss) where ctx = {
     puck     : Anchor at disc center — the physical platform (rebuilt)
     ring     : Anchor on the disc-top — SCENERY props (rebuilt)
     sky      : Anchor in camera space (sun/clouds — they do NOT spin)
     setSky() : paints the CSS gradient behind the canvas
   }
   (ctx.propsRing is NOT touched — live props survive scene re-growth)
   Returns {clouds, drops, bolt} — the little bits app.js animates.
   ============================================================ */
'use strict';
(function () {
const Z = window.Zdog;
const P = () => window.ZPROP;
const TAU = Z.TAU;

/* design space: 560 x 400 zdog units (app.js zooms to fit) */
const DISC_R = 165;
const BASE_H = 26;    // dirt puck
const TOP_H = 12;     // grass skin
const TOP_Y = -(BASE_H / 2 + TOP_H / 2);   // grass skin center, platform-local
const SURF_Y = TOP_Y - TOP_H / 2;          // walkable surface = grass top face

const PALETTES = {
  warm: {
    skyT: '#BFE6FB', skyB: '#FFF3D2', sun: '#FFC53D', rays: '#F0A428',
    moon: null, star: null,
    grassTop: '#6FC07C', grassEdge: '#4E9A60', dirt: '#8A5E2E', dirtDark: '#6E4520',
    hill: '#8ED1A1', scatter: ['#4FB06D', '#5FBF7B'], flower: ['#FF6B57', '#F58ACB', '#B565D8'],
    cloud: '#FFFDF6',
  },
  cool: {
    skyT: '#AFD6F2', skyB: '#EAF6FF', sun: '#FFE49A', rays: '#EFC25D',
    moon: null, star: null,
    grassTop: '#7FBFA6', grassEdge: '#5E9A82', dirt: '#7A6248', dirtDark: '#5E4A36',
    hill: '#9FD0C0', scatter: ['#3E8F57', '#57A86E'], flower: ['#5DA9E9', '#B565D8', '#FF9EBB'],
    cloud: '#F4FAFC',
  },
  dusk: {
    skyT: '#F7B98A', skyB: '#FCE3C2', sun: '#FF9E57', rays: '#E8742E',
    moon: null, star: null,
    grassTop: '#A8977E', grassEdge: '#7E6E5A', dirt: '#7A5A3E', dirtDark: '#5E422C',
    hill: '#C9A0B8', scatter: ['#96789E', '#7A5E8E'], flower: ['#FFB45E', '#FF8A6B'],
    cloud: '#F4C9B0',
  },
  night: {
    skyT: '#33395E', skyB: '#7E7E9E', sun: null, rays: null,
    moon: '#F4E9C8', star: '#FFF6C9',
    grassTop: '#5E7A6E', grassEdge: '#465E54', dirt: '#4E4238', dirtDark: '#3A3028',
    hill: '#565B7E', scatter: ['#44604F', '#565B7E'], flower: ['#B565D8', '#8FA8D8'],
    cloud: '#8A94B8',
  },
};
const BIOMES = ['meadow', 'forest', 'rain', 'river', 'cave', 'village', 'storm'];

/* ---------------------------------------------------------------- */
function cloudModel(parent, r, x, y, z, s, col) {
  const a = new Z.Anchor({ addTo: parent, translate: { x, y, z } });
  const ZP = P();
  ZP.dot(a, 26 * s, col, -18 * s, 6 * s);
  ZP.dot(a, 38 * s, col, 0, -4 * s);
  ZP.dot(a, 24 * s, col, 20 * s, 8 * s);
  ZP.ell(a, 60 * s, 14 * s, col, { y: 12 * s, s: 0 });
  return a;
}

function buildPlatform(ctx, pal, r) {
  const ZP = P();
  const g = ctx.puck;
  /* dirt puck + grass skin — the lazy susan itself */
  ZP.cyl(g, DISC_R * 2, BASE_H, pal.dirt,
    { y: 0, front: pal.dirt, rear: pal.dirtDark, s: 3 });
  ZP.cyl(g, DISC_R * 2 - 8, TOP_H, pal.grassEdge,
    { y: TOP_Y, front: pal.grassTop, rear: pal.grassEdge, s: 3 });
  /* pebble rim, seeded */
  for (let i = 0; i < 10; i++) {
    const a = r() * TAU, rad = DISC_R - 8;
    ZP.dot(g, r() < 0.5 ? 4 : 6, pal.dirtDark,
      Math.cos(a) * rad, SURF_Y, Math.sin(a) * rad);
  }
  /* winding dotted path across the disc — part of the turntable,
     so it slowly sweeps around with the spin */
  for (let i = 0; i < 9; i++) {
    const t = i / 8, ang = -0.9 + t * 1.8, rad = DISC_R * (0.28 + t * 0.5);
    ZP.ell(g, 10, 10, '#E4CE9E',
      { x: Math.sin(ang) * rad, y: SURF_Y + 1, z: Math.cos(ang) * rad,
        rot: { x: TAU / 4 }, s: 0 });
  }
}

/* place a model on the disc-top ring at angle/radius (spin-local).
   userData.fs = the settled scale — app.js uses it for the grow-in pop */
function plant(ctx, anchor, ang, rad, scale = 1) {
  anchor.translate = {
    x: Math.sin(ang) * rad, y: SURF_Y + 1, z: Math.cos(ang) * rad };
  anchor.scale = scale;
  anchor.userData = { fs: scale };
  ctx.ring.addChild(anchor);
}

function buildScatter(ctx, pal, r, biome, seed) {
  const ZP = P();
  const onDisc = (k, ang, rad, s) => plant(ctx, ZP.build(k, seed ^ 51), ang, rad, s);
  const tuft = (ang, rad) => {
    const t = new Z.Anchor();
    ZP.dot(t, 3.4, pal.scatter[0], -5, -6);
    ZP.dot(t, 3.4, pal.scatter[0], 4, -8);
    ZP.cone(t, 6, 12, pal.scatter[0], { y: 0 });
    plant(ctx, t, ang, rad);
  };
  const ringAng = () => r() * TAU;
  const ringRad = (a, b) => r() * (b - a) + a;

  switch (biome) {
    case 'forest': {
      for (let i = 0; i < 6; i++)
        onDisc(r() < 0.55 ? 'pine' : 'tree', ringAng(), ringRad(60, 132), r() * 0.5 + 0.75);
      for (let i = 0; i < 7; i++) tuft(ringAng(), ringRad(30, 140));
      break;
    }
    case 'rain': {
      for (let i = 0; i < 3; i++)
        onDisc('puddle', ringAng(), ringRad(50, 120), r() * 0.4 + 0.8);
      for (let i = 0; i < 4; i++) tuft(ringAng(), ringRad(40, 130));
      onDisc('umbrella', ringAng(), ringRad(70, 110), 0.9);
      break;
    }
    case 'river': {
      /* a stream crossing the disc: flat blue ribbon + reeds + boat */
      const rb = new Z.Anchor();
      ZP.ell(rb, 110, 56, '#8FD0F2', { rot: { x: TAU / 4 }, s: 0 });
      ZP.ell(rb, 84, 34, '#A8DCF5', { y: -1, rot: { x: TAU / 4 }, s: 0 });
      plant(ctx, rb, ringAng() * 0.5, 0);
      for (let i = 0; i < 5; i++) {
        const rd = new Z.Anchor();
        ZP.cyl(rd, 3.4, 22, '#3E8F57', { y: -11 });
        ZP.ell(rd, 5, 10, '#8A5E2E', { y: -24, s: 2 });
        plant(ctx, rd, ringAng(), ringRad(95, 140));
      }
      onDisc('boat', ringAng(), ringRad(20, 60), 0.8);
      break;
    }
    case 'cave': {
      for (let i = 0; i < 4; i++)
        onDisc('rock', ringAng(), ringRad(60, 135), r() * 0.7 + 0.9);
      for (let i = 0; i < 5; i++) {          // little stalagmites
        const st = new Z.Anchor();
        ZP.cone(st, 14, 30, '#8B8378', { y: 0 });
        ZP.cone(st, 9, 20, '#9D9389', { x: 10, y: 0 });
        plant(ctx, st, ringAng(), ringRad(40, 120), r() * 0.4 + 0.7);
      }
      for (let i = 0; i < 3; i++) onDisc('torch', ringAng(), ringRad(80, 130), 0.85);
      break;
    }
    case 'village': {
      for (let i = 0; i < 3; i++)
        onDisc('house', -0.9 + i * 0.9, ringRad(85, 115), r() * 0.3 + 0.62);
      for (let i = 0; i < 4; i++) onDisc('flower', ringAng(), ringRad(40, 140), 0.9);
      break;
    }
    case 'storm': {
      for (let i = 0; i < 3; i++)
        onDisc('pine', ringAng(), ringRad(80, 135), r() * 0.4 + 0.7);
      for (let i = 0; i < 3; i++)
        onDisc('rock', ringAng(), ringRad(50, 130), r() * 0.5 + 0.7);
      break;
    }
    case 'meadow':
    default: {
      for (let i = 0; i < 3; i++)
        onDisc('tree', ringAng(), ringRad(80, 135), r() * 0.5 + 0.8);
      for (let i = 0; i < 6; i++)
        onDisc('flower', ringAng(), ringRad(45, 140), r() * 0.3 + 0.8);
      for (let i = 0; i < 6; i++) tuft(ringAng(), ringRad(30, 140));
    }
  }
}

/* sky bits live in CAMERA space (ctx.sky) — they never spin */
function buildSky(ctx, pal, r, biome, seed) {
  const ZP = P();
  const sky = ctx.sky;
  const out = { clouds: [], drops: [], bolt: null };

  if (pal.sun) {
    const sx = -195 + r() * 40, sy = -140 + r() * 20;
    const sun = new Z.Anchor({ addTo: sky, translate: { x: sx, y: sy, z: -60 } });
    ZP.dot(sun, 46, pal.sun, 0, 0);
    for (let i = 0; i < 8; i++) {
      const a = (TAU * i) / 8;
      ZP.flat(sun, [
        { x: Math.cos(a) * 32, y: Math.sin(a) * 32 },
        { x: Math.cos(a) * 42, y: Math.sin(a) * 42 }],
        { c: pal.rays, s: 4 });
    }
  }
  if (pal.moon) {
    const mx = 165, my = -138;
    const moon = new Z.Anchor({ addTo: sky, translate: { x: mx, y: my, z: -70 } });
    ZP.dot(moon, 40, pal.moon, 0, 0);
    ZP.dot(moon, 34, pal.skyT, 10, -6, 6);           // bite → crescent
    for (let i = 0; i < 16; i++)
      ZP.dot(sky, r() < 0.5 ? 2.4 : 3.6, pal.star,
        (r() * 2 - 1) * 250, -170 + r() * 90, -80 - r() * 30);
  }

  const nClouds = biome === 'storm' ? 4 : biome === 'rain' ? 4 : 2;
  for (let i = 0; i < nClouds; i++) {
    const dark = biome === 'storm' || biome === 'rain';
    const c = cloudModel(sky, r,
      -220 + r() * 440, -150 + r() * 60, -50 - r() * 60,
      r() * 0.45 + 0.7, dark ? '#A8B4C4' : pal.cloud);
    c.userData = { drift: 6 + r() * 10 };
    out.clouds.push(c);
  }

  if (biome === 'rain' || biome === 'storm') {
    for (let i = 0; i < 22; i++) {
      const d = ZP.flat(sky, [{ x: 0, y: 0 }, { x: -3, y: 12 }],
        { c: '#7FB8E8', s: 3.4,
          x: (r() * 2 - 1) * 230, y: -130 + r() * 160, z: -30 - r() * 40 });
      d.userData = { v: 130 + r() * 90 };
      out.drops.push(d);
    }
  }
  if (biome === 'storm') {
    out.bolt = ZP.flat(sky,
      [{ x: 0, y: -70 }, { x: -12, y: -34 }, { x: 2, y: -34 }, { x: -14, y: 0 }],
      { c: '#FFC53D', s: 6, x: 120, y: -60, z: -40 });
  }
  return out;
}

/* ---------------------------------------------------------------- */
function empty(a) { a.children.slice().forEach((c) => c.remove()); }

/* ctx = {puck, ring, sky, setSky} */
function build(ctx, ss) {
  const ZP = P();
  const biome = BIOMES.includes(ss.biome) ? ss.biome : 'meadow';
  const pal = PALETTES[ss.palette] || PALETTES.warm;
  const r = ZP.mulberry32((ss.seed | 0) || 1);

  empty(ctx.puck); empty(ctx.ring); empty(ctx.sky);
  ctx.setSky(pal.skyT, pal.skyB, biome);

  buildPlatform(ctx, pal, r);
  buildScatter(ctx, pal, ZP.mulberry32(((ss.seed | 0) || 1) + 909), biome,
    (ss.seed | 0) || 1);
  const skyBits = buildSky(ctx, pal, ZP.mulberry32(((ss.seed | 0) || 1) + 414),
    biome, (ss.seed | 0) || 1);

  /* scene_seed.props[] — scenery props planted on the disc */
  (ss.props || []).slice(0, 6).forEach((k, i) => {
    const pr = ZP.mulberry32(((ss.seed | 0) || 1) + i * 61 + 5);
    const node = ZP.build(k, ((ss.seed | 0) || 1) + i * 977);
    const ang = (i + 0.5) / Math.min(6, ss.props.length) * TAU + pr() * 0.5;
    plant(ctx, node, ang, 55 + pr() * 75, pr() * 0.25 + 0.62);
  });

  return skyBits;
}

window.ZWORLD = { build, PALETTES, BIOMES, DISC_R, TOP_Y, SURF_Y, plant, empty };
})();
