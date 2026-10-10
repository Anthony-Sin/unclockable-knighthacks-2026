/* ============================================================
   Sketch-DOM Pigs — props.js
   Prop builders for the rough.js SVG engine. Every builder
   returns a real <g class="art art-KIND"> node: addressable,
   animatable, removable. Local coords: (0,0) = bottom-center
   of the prop; draw upward into negative y. Box ≈ 140 x 112.
   ============================================================ */
'use strict';
(function () {

const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#2B2118';

function G(cls) {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'art ' + (cls || ''));
  return g;
}
/* standard sketch options for one shape */
function O(s, extra) {
  return Object.assign({
    stroke: INK, strokeWidth: 2.6, roughness: 1.9, seed: s,
  }, extra);
}
function fill(s, color, extra) {
  return O(s, Object.assign({ fill: color, fillStyle: 'hachure',
    hachureGap: 5, fillWeight: 1.4 }, extra));
}
function solid(s, color, extra) {
  return O(s, Object.assign({ fill: color, fillStyle: 'solid' }, extra));
}

/* ============================================================
   THE PROP LIBRARY — window.SKETCH_PROPS[kind](rs, seed) -> <g>
   ============================================================ */
const SKETCH_PROPS = {

  /* ---------- three-little-pigs cast ---------- */

  pig(rs, s) {
    const g = G('art-pig');
    g.appendChild(rs.ellipse(0, -34, 76, 58, fill(s, '#FFC9BF', { roughness: 2 })));
    g.appendChild(rs.polygon([[-28, -58], [-38, -78], [-14, -66]], solid(s + 1, '#FFC9BF')));
    g.appendChild(rs.polygon([[28, -58], [38, -78], [14, -66]], solid(s + 2, '#FFC9BF')));
    g.appendChild(rs.ellipse(0, -32, 24, 17, solid(s + 3, '#FF9C86')));
    g.appendChild(rs.circle(-4.5, -32, 3.4, solid(s + 4, INK)));
    g.appendChild(rs.circle(4.5, -32, 3.4, solid(s + 5, INK)));
    g.appendChild(rs.circle(-15, -44, 6, solid(s + 6, INK)));
    g.appendChild(rs.circle(15, -44, 6, solid(s + 7, INK)));
    g.appendChild(rs.curve([[38, -30], [50, -36], [46, -46], [38, -42]], O(s + 8, { strokeWidth: 3 })));
    g.appendChild(rs.line(-20, -6, -20, 0, O(s + 9, { strokeWidth: 5 })));
    g.appendChild(rs.line(20, -6, 20, 0, O(s + 10, { strokeWidth: 5 })));
    return g;
  },

  wolfprop(rs, s) {
    const g = G('art-wolfprop');
    g.appendChild(rs.ellipse(0, -36, 70, 60, fill(s, '#8D7B68', { roughness: 2 })));
    g.appendChild(rs.polygon([[-24, -62], [-34, -88], [-8, -70]], solid(s + 1, '#8D7B68')));
    g.appendChild(rs.polygon([[24, -62], [34, -88], [8, -70]], solid(s + 2, '#8D7B68')));
    g.appendChild(rs.ellipse(18, -30, 30, 22, solid(s + 3, '#B3A48D')));
    g.appendChild(rs.circle(28, -32, 7, solid(s + 4, INK)));
    g.appendChild(rs.circle(-12, -46, 6.5, solid(s + 5, INK)));
    g.appendChild(rs.circle(12, -46, 6.5, solid(s + 6, INK)));
    g.appendChild(rs.line(-17, -54, -7, -51, O(s + 7, { strokeWidth: 3 })));
    g.appendChild(rs.line(7, -51, 17, -54, O(s + 8, { strokeWidth: 3 })));
    g.appendChild(rs.line(-18, -8, -18, 0, O(s + 9, { strokeWidth: 5 })));
    g.appendChild(rs.line(14, -8, 14, 0, O(s + 10, { strokeWidth: 5 })));
    return g;
  },

  unicorn(rs, s) {
    const g = G('art-unicorn');
    g.appendChild(rs.ellipse(-6, -42, 84, 44, fill(s, '#FFFDF6', { roughness: 2 })));
    g.appendChild(rs.line(-30, -24, -32, 0, O(s + 1, { strokeWidth: 5 })));
    g.appendChild(rs.line(-10, -22, -11, 0, O(s + 2, { strokeWidth: 5 })));
    g.appendChild(rs.line(12, -23, 13, 0, O(s + 3, { strokeWidth: 5 })));
    g.appendChild(rs.line(30, -25, 32, 0, O(s + 4, { strokeWidth: 5 })));
    g.appendChild(rs.curve([[24, -58], [32, -76], [40, -88]], O(s + 5, { stroke: '#FFFDF6', strokeWidth: 16, roughness: 2 })));
    g.appendChild(rs.ellipse(42, -92, 34, 24, fill(s + 6, '#FFFDF6', { roughness: 2 })));
    g.appendChild(rs.polygon([[38, -102], [46, -128], [52, -102]], solid(s + 7, '#FFC53D')));
    g.appendChild(rs.curve([[26, -70], [30, -86], [26, -100]], O(s + 8, { stroke: '#B565D8', strokeWidth: 5, roughness: 2.4 })));
    g.appendChild(rs.curve([[30, -66], [38, -80], [34, -96]], O(s + 9, { stroke: '#FF6B57', strokeWidth: 4, roughness: 2.4 })));
    g.appendChild(rs.circle(48, -94, 6, solid(s + 10, INK)));
    g.appendChild(rs.curve([[-46, -50], [-60, -44], [-58, -26], [-52, -34]], O(s + 11, { stroke: '#B565D8', strokeWidth: 5, roughness: 2.2 })));
    g.appendChild(rs.ellipse(56, -84, 8, 6, solid(s + 12, '#FF9C86')));
    return g;
  },

  horse(rs, s) {
    const g = SKETCH_PROPS.unicorn(rs, s);
    /* lose the horn: cover it with a mane tuft */
    g.appendChild(rs.curve([[36, -104], [46, -118], [54, -102]], O(s + 20, { stroke: '#8A5A30', strokeWidth: 9, roughness: 2.4 })));
    return g;
  },

  dragon(rs, s) {
    const g = G('art-dragon');
    g.appendChild(rs.ellipse(-4, -38, 80, 52, fill(s, '#4FB06D', { roughness: 2 })));
    g.appendChild(rs.polygon([[24, -66], [34, -92], [44, -66]], solid(s + 1, '#4FB06D')));
    g.appendChild(rs.ellipse(40, -84, 32, 26, solid(s + 2, '#7CC78F')));
    g.appendChild(rs.polygon([[30, -96], [34, -110], [40, -96]], solid(s + 3, '#FFC53D')));
    g.appendChild(rs.polygon([[44, -98], [50, -112], [54, -96]], solid(s + 4, '#FFC53D')));
    g.appendChild(rs.circle(46, -88, 5.5, solid(s + 5, INK)));
    g.appendChild(rs.curve([[-42, -44], [-58, -40], [-62, -22]], O(s + 6, { stroke: '#3E8E5A', strokeWidth: 5 })));
    g.appendChild(rs.polygon([[-64, -22], [-58, -12], [-52, -22]], solid(s + 7, '#3E8E5A')));
    g.appendChild(rs.line(-22, -14, -24, 0, O(s + 8, { strokeWidth: 5 })));
    g.appendChild(rs.line(14, -14, 16, 0, O(s + 9, { strokeWidth: 5 })));
    g.appendChild(rs.polygon([[52, -74], [60, -72], [54, -66]], solid(s + 10, '#FF6B57')));
    return g;
  },

  /* ---------- small critters ---------- */

  bird(rs, s) {
    const g = G('art-bird');
    g.appendChild(rs.ellipse(0, -46, 44, 34, fill(s, '#5DA9E9', { roughness: 2 })));
    g.appendChild(rs.circle(14, -58, 15, solid(s + 1, '#5DA9E9')));
    g.appendChild(rs.polygon([[26, -58], [38, -54], [26, -50]], solid(s + 2, '#FFC53D')));
    g.appendChild(rs.circle(17, -60, 4.5, solid(s + 3, INK)));
    g.appendChild(rs.line(-8, -28, -10, -12, O(s + 4, { strokeWidth: 3 })));
    g.appendChild(rs.line(6, -28, 8, -12, O(s + 5, { strokeWidth: 3 })));
    g.appendChild(rs.curve([[-22, -46], [-32, -56], [-36, -44]], O(s + 6, { strokeWidth: 3 })));
    return g;
  },

  duck(rs, s) {
    const g = G('art-duck');
    g.appendChild(rs.ellipse(-4, -30, 56, 36, fill(s, '#FFC53D', { roughness: 2 })));
    g.appendChild(rs.circle(20, -56, 18, solid(s + 1, '#FFC53D')));
    g.appendChild(rs.polygon([[34, -56], [50, -51], [34, -46]], solid(s + 2, '#FF6B57')));
    g.appendChild(rs.circle(23, -60, 4.5, solid(s + 3, INK)));
    g.appendChild(rs.ellipse(-8, -30, 18, 11, O(s + 4, { stroke: '#E8A93D' })));
    return g;
  },

  frog(rs, s) {
    const g = G('art-frog');
    g.appendChild(rs.ellipse(0, -30, 60, 40, fill(s, '#4FB06D', { roughness: 2 })));
    g.appendChild(rs.circle(-16, -56, 11, solid(s + 1, '#4FB06D')));
    g.appendChild(rs.circle(16, -56, 11, solid(s + 2, '#4FB06D')));
    g.appendChild(rs.circle(-16, -57, 5, solid(s + 3, INK)));
    g.appendChild(rs.circle(16, -57, 5, solid(s + 4, INK)));
    g.appendChild(rs.arc(0, -34, 30, 20, Math.PI * .15, Math.PI * .85, false, O(s + 5, { strokeWidth: 3 })));
    return g;
  },

  cat(rs, s) {
    const g = G('art-cat');
    g.appendChild(rs.ellipse(0, -30, 52, 46, fill(s, '#E8A93D', { roughness: 2 })));
    g.appendChild(rs.polygon([[-18, -52], [-24, -72], [-6, -58]], solid(s + 1, '#E8A93D')));
    g.appendChild(rs.polygon([[18, -52], [24, -72], [6, -58]], solid(s + 2, '#E8A93D')));
    g.appendChild(rs.circle(-10, -36, 5, solid(s + 3, INK)));
    g.appendChild(rs.circle(10, -36, 5, solid(s + 4, INK)));
    g.appendChild(rs.polygon([[-3, -28], [3, -28], [0, -23]], solid(s + 5, '#FF9C86')));
    g.appendChild(rs.curve([[26, -18], [44, -22], [42, -40]], O(s + 6, { strokeWidth: 4 })));
    return g;
  },

  bunny(rs, s) {
    const g = G('art-bunny');
    g.appendChild(rs.ellipse(-12, -68, 10, 34, solid(s, '#FFFDF6')));
    g.appendChild(rs.ellipse(12, -68, 10, 34, solid(s + 1, '#FFFDF6')));
    g.appendChild(rs.ellipse(0, -32, 46, 44, fill(s + 2, '#FFFDF6', { roughness: 2 })));
    g.appendChild(rs.circle(-9, -36, 4.5, solid(s + 3, INK)));
    g.appendChild(rs.circle(9, -36, 4.5, solid(s + 4, INK)));
    g.appendChild(rs.circle(0, -26, 5, solid(s + 5, '#FF9C86')));
    return g;
  },

  bee(rs, s) {
    const g = G('art-bee');
    g.appendChild(rs.ellipse(0, -52, 44, 32, fill(s, '#FFC53D', { roughness: 2 })));
    g.appendChild(rs.line(-8, -66, -8, -40, O(s + 1, { strokeWidth: 5 })));
    g.appendChild(rs.line(6, -66, 6, -40, O(s + 2, { strokeWidth: 5 })));
    g.appendChild(rs.ellipse(-12, -72, 22, 12, O(s + 3, { stroke: '#BFE8FF', fill: '#EAF7FF', fillStyle: 'solid' })));
    g.appendChild(rs.ellipse(12, -72, 22, 12, O(s + 4, { stroke: '#BFE8FF', fill: '#EAF7FF', fillStyle: 'solid' })));
    g.appendChild(rs.circle(16, -54, 4.5, solid(s + 5, INK)));
    return g;
  },

  butterfly(rs, s) {
    const g = G('art-butterfly');
    g.appendChild(rs.ellipse(-20, -56, 30, 40, solid(s, '#B565D8')));
    g.appendChild(rs.ellipse(20, -56, 30, 40, solid(s + 1, '#FF6B57')));
    g.appendChild(rs.ellipse(-16, -24, 22, 22, solid(s + 2, '#FF9C86')));
    g.appendChild(rs.ellipse(16, -24, 22, 22, solid(s + 3, '#FFC53D')));
    g.appendChild(rs.line(0, -74, 0, -12, O(s + 4, { strokeWidth: 6 })));
    g.appendChild(rs.curve([[-2, -74], [-8, -86], [-14, -88]], O(s + 5, { strokeWidth: 2.5 })));
    g.appendChild(rs.curve([[2, -74], [8, -86], [14, -88]], O(s + 6, { strokeWidth: 2.5 })));
    return g;
  },

  snail(rs, s) {
    const g = G('art-snail');
    g.appendChild(rs.ellipse(8, -14, 56, 22, solid(s, '#D9A569')));
    g.appendChild(rs.circle(-16, -40, 26, fill(s + 1, '#C98A54', { roughness: 2 })));
    g.appendChild(rs.circle(-16, -40, 13, O(s + 2, { stroke: '#8A5A30' })));
    g.appendChild(rs.line(24, -22, 30, -44, O(s + 3, { strokeWidth: 3.5 })));
    g.appendChild(rs.line(34, -22, 40, -44, O(s + 4, { strokeWidth: 3.5 })));
    g.appendChild(rs.circle(30, -47, 5, solid(s + 5, INK)));
    g.appendChild(rs.circle(40, -47, 5, solid(s + 6, INK)));
    return g;
  },

  /* ---------- journey props ---------- */

  bridge(rs, s) {
    const g = G('art-bridge');
    g.appendChild(rs.path('M-80 0 Q0 -78 80 0 L80 10 L-80 10 Z',
      fill(s, '#C98A54', { fillStyle: 'solid', roughness: 2 })));
    g.appendChild(rs.path('M-80 0 Q0 -78 80 0', O(s + 1, { strokeWidth: 4 })));
    g.appendChild(rs.line(-52, -26, -52, 8, O(s + 2)));
    g.appendChild(rs.line(-26, -40, -26, 9, O(s + 3)));
    g.appendChild(rs.line(0, -44, 0, 10, O(s + 4)));
    g.appendChild(rs.line(26, -40, 26, 9, O(s + 5)));
    g.appendChild(rs.line(52, -26, 52, 8, O(s + 6)));
    return g;
  },

  boat(rs, s) {
    const g = G('art-boat');
    g.appendChild(rs.path('M-64 -24 L64 -24 L46 0 L-46 0 Z', fill(s, '#C98A54', { fillStyle: 'solid' })));
    g.appendChild(rs.line(0, -24, 0, -92, O(s + 1, { strokeWidth: 4 })));
    g.appendChild(rs.polygon([[2, -88], [44, -38], [2, -38]], solid(s + 2, '#FF6B57')));
    g.appendChild(rs.polygon([[-2, -82], [-30, -42], [-2, -42]], solid(s + 3, '#FFFDF6')));
    return g;
  },

  raft(rs, s) {
    const g = G('art-raft');
    for (let i = 0; i < 4; i++)
      g.appendChild(rs.line(-52, -6 - i * 8, 52, -8 - i * 8, O(s + i, { stroke: '#A9713F', strokeWidth: 7 })));
    g.appendChild(rs.line(-30, -4, -30, -34, O(s + 5, { strokeWidth: 3 })));
    g.appendChild(rs.line(30, -4, 30, -34, O(s + 6, { strokeWidth: 3 })));
    return g;
  },

  ladder(rs, s) {
    const g = G('art-ladder');
    g.appendChild(rs.line(-22, 0, -16, -110, O(s, { stroke: '#A9713F', strokeWidth: 7 })));
    g.appendChild(rs.line(22, 0, 16, -110, O(s + 1, { stroke: '#A9713F', strokeWidth: 7 })));
    for (let i = 0; i < 4; i++)
      g.appendChild(rs.line(-19 - i * .6, -20 - i * 24, 19 + i * .6, -21 - i * 24, O(s + 2 + i, { strokeWidth: 4.5 })));
    return g;
  },

  vine(rs, s) {
    const g = G('art-vine');
    g.appendChild(rs.curve([[0, 0], [-14, -34], [12, -62], [-4, -108]],
      O(s, { stroke: '#3E8E5A', strokeWidth: 6, roughness: 2.4 })));
    g.appendChild(rs.ellipse(-16, -40, 20, 11, solid(s + 1, '#4FB06D')));
    g.appendChild(rs.ellipse(14, -66, 20, 11, solid(s + 2, '#4FB06D')));
    g.appendChild(rs.ellipse(-10, -92, 18, 10, solid(s + 3, '#4FB06D')));
    return g;
  },

  log(rs, s) {
    const g = G('art-log');
    g.appendChild(rs.rectangle(-60, -36, 104, 34, solid(s, '#A9713F')));
    g.appendChild(rs.circle(48, -19, 17, solid(s + 1, '#D9A569')));
    g.appendChild(rs.circle(48, -19, 9, O(s + 2)));
    g.appendChild(rs.line(-46, -28, -10, -28, O(s + 3, { stroke: '#7d4f27', strokeWidth: 3 })));
    g.appendChild(rs.line(-50, -14, -18, -14, O(s + 4, { stroke: '#7d4f27', strokeWidth: 3 })));
    return g;
  },

  plank(rs, s) {
    const g = G('art-plank');
    const r = rs.rectangle(-62, -26, 124, 22, solid(s, '#C98A54'));
    r.setAttribute('transform', 'rotate(-5 0 -15)');
    g.appendChild(r);
    g.appendChild(rs.line(-48, -18, 40, -24, O(s + 1, { stroke: '#8a5a30', strokeWidth: 2.5 })));
    return g;
  },

  stones(rs, s) {
    const g = G('art-stones');
    g.appendChild(rs.ellipse(-38, -12, 44, 22, solid(s, '#B8B2A6')));
    g.appendChild(rs.ellipse(6, -16, 48, 26, solid(s + 1, '#CDC7BA')));
    g.appendChild(rs.ellipse(46, -10, 36, 18, solid(s + 2, '#B8B2A6')));
    return g;
  },

  tunnel(rs, s) {
    const g = G('art-tunnel');
    g.appendChild(rs.path('M-52 0 V-40 C-52 -84 52 -84 52 -40 V0 Z',
      fill(s, '#8d7b68', { fillStyle: 'solid' })));
    g.appendChild(rs.path('M-32 0 V-38 C-32 -62 32 -62 32 -38 V0 Z',
      solid(s + 1, '#3a2f26')));
    g.appendChild(rs.line(-44, -52, -30, -52, O(s + 2, { stroke: '#6d5c49', strokeWidth: 3 })));
    g.appendChild(rs.line(30, -52, 44, -52, O(s + 3, { stroke: '#6d5c49', strokeWidth: 3 })));
    return g;
  },

  trampoline(rs, s) {
    const g = G('art-trampoline');
    g.appendChild(rs.line(-36, -30, -48, 0, O(s, { strokeWidth: 6 })));
    g.appendChild(rs.line(36, -30, 48, 0, O(s + 1, { strokeWidth: 6 })));
    g.appendChild(rs.ellipse(0, -34, 100, 28, solid(s + 2, '#5DA9E9')));
    g.appendChild(rs.ellipse(0, -35, 72, 16, solid(s + 3, INK)));
    return g;
  },

  /* ---------- slip + splat gags ---------- */

  bananaPeel(rs, s) {
    const g = G('art-bananaPeel');
    g.appendChild(rs.path('M0 -42 C-28 -38 -46 -20 -52 -4 C-30 -12 -16 -14 0 -14 C16 -14 30 -12 52 -4 C46 -20 28 -38 0 -42 Z',
      fill(s, '#FFC53D', { fillStyle: 'solid' })));
    g.appendChild(rs.path('M0 -42 C-4 -58 2 -70 12 -74 C6 -62 6 -52 8 -42',
      solid(s + 1, '#FFE08A')));
    g.appendChild(rs.circle(0, -22, 6, solid(s + 2, '#E8A93D')));
    return g;
  },

  soap(rs, s) {
    const g = G('art-soap');
    g.appendChild(rs.rectangle(-40, -34, 80, 32, solid(s, '#BFE8FF')));
    g.appendChild(rs.circle(28, -46, 11, solid(s + 1, '#FFFDF6')));
    g.appendChild(rs.circle(44, -34, 7, solid(s + 2, '#FFFDF6')));
    g.appendChild(rs.circle(-30, -44, 6, solid(s + 3, '#FFFDF6')));
    g.appendChild(rs.line(-24, -20, 20, -20, O(s + 4, { stroke: '#2f7fb8', strokeWidth: 3 })));
    return g;
  },

  ice(rs, s) {
    const g = G('art-ice');
    const r = rs.rectangle(-28, -54, 56, 50, solid(s, '#BFE8FF'));
    r.setAttribute('transform', 'rotate(-7 0 -30)');
    g.appendChild(r);
    g.appendChild(rs.line(-16, -42, 0, -46, O(s + 1, { stroke: '#fff', strokeWidth: 5 })));
    g.appendChild(rs.line(-12, -26, 12, -32, O(s + 2, { stroke: '#fff', strokeWidth: 5 })));
    return g;
  },

  slime(rs, s) {
    const g = G('art-slime');
    g.appendChild(rs.path('M-52 -12 C-56 -38 -30 -44 -20 -34 C-14 -56 24 -56 30 -34 C46 -42 56 -24 50 -10 C44 0 -44 2 -52 -12 Z',
      fill(s, '#7CC78F', { fillStyle: 'solid' })));
    g.appendChild(rs.circle(-18, -20, 5, solid(s + 1, '#3E8E5A')));
    g.appendChild(rs.circle(14, -24, 6, solid(s + 2, '#3E8E5A')));
    g.appendChild(rs.circle(0, -12, 4, solid(s + 3, '#3E8E5A')));
    return g;
  },

  puddle(rs, s) {
    const g = G('art-puddle');
    g.appendChild(rs.ellipse(0, -6, 96, 18, solid(s, '#8fd0f5')));
    g.appendChild(rs.ellipse(-14, -7, 40, 8, O(s + 1, { stroke: '#fff', strokeWidth: 2.5 })));
    g.appendChild(rs.circle(40, -18, 5, solid(s + 2, '#8fd0f5')));
    return g;
  },

  /* ---------- building materials ---------- */

  straw(rs, s) {
    const g = G('art-straw');
    g.appendChild(rs.path('M-46 0 C-52 -34 -20 -58 0 -58 C22 -58 52 -32 46 0 Z',
      fill(s, '#FFC53D', { hachureGap: 4, roughness: 2.2 })));
    for (let i = 0; i < 6; i++) {
      const x = -32 + i * 13;
      g.appendChild(rs.line(x, -4, x + 8, -44 - (i % 3) * 6, O(s + 1 + i, { stroke: '#E8A93D', strokeWidth: 3 })));
    }
    return g;
  },

  sticks(rs, s) {
    const g = G('art-sticks');
    g.appendChild(rs.line(-46, -6, 40, -30, O(s, { stroke: '#8A5A30', strokeWidth: 9 })));
    g.appendChild(rs.line(-40, -22, 46, -4, O(s + 1, { stroke: '#A9713F', strokeWidth: 9 })));
    g.appendChild(rs.line(-44, -14, 30, -44, O(s + 2, { stroke: '#6B4A2A', strokeWidth: 8 })));
    g.appendChild(rs.line(-10, -10, 46, -38, O(s + 3, { stroke: '#8A5A30', strokeWidth: 8 })));
    return g;
  },

  bricks(rs, s) {
    const g = G('art-bricks');
    g.appendChild(rs.rectangle(-46, -22, 42, 20, solid(s, '#C96F3F')));
    g.appendChild(rs.rectangle(2, -22, 42, 20, solid(s + 1, '#D97B4A')));
    g.appendChild(rs.rectangle(-22, -44, 42, 20, solid(s + 2, '#C96F3F')));
    g.appendChild(rs.line(-25, -12, -25, -2, O(s + 3, { strokeWidth: 2 })));
    g.appendChild(rs.line(23, -12, 23, -2, O(s + 4, { strokeWidth: 2 })));
    return g;
  },

  /* ---------- rain gear & lights ---------- */

  umbrella(rs, s) {
    const g = G('art-umbrella');
    g.appendChild(rs.path('M-56 -48 C-56 -96 56 -96 56 -48 C46 -58 38 -58 32 -48 C22 -58 12 -58 4 -48 C-6 -58 -16 -58 -24 -48 C-32 -58 -42 -58 -56 -48 Z',
      fill(s, '#FF6B57', { fillStyle: 'solid' })));
    g.appendChild(rs.line(0, -48, 0, -6, O(s + 1, { strokeWidth: 4.5 })));
    g.appendChild(rs.arc(8, -6, 16, 12, Math.PI, Math.PI * 2, false, O(s + 2, { strokeWidth: 4 })));
    g.appendChild(rs.circle(0, -98, 5, solid(s + 3, '#FFC53D')));
    return g;
  },

  lantern(rs, s) {
    const g = G('art-lantern');
    g.appendChild(rs.ellipse(0, -46, 34, 52, solid(s, '#FFC53D')));
    g.appendChild(rs.ellipse(0, -46, 18, 34, solid(s + 1, '#FFE08A')));
    g.appendChild(rs.arc(0, -72, 18, 12, Math.PI, Math.PI * 2, false, O(s + 2, { strokeWidth: 3.5 })));
    g.appendChild(rs.line(-20, -70, 20, -70, O(s + 3, { strokeWidth: 4 })));
    g.appendChild(rs.line(-20, -22, 20, -22, O(s + 4, { strokeWidth: 4 })));
    return g;
  },

  torch(rs, s) {
    const g = G('art-torch');
    g.appendChild(rs.line(0, 0, 0, -52, O(s, { stroke: '#8A5A30', strokeWidth: 8 })));
    g.appendChild(rs.path('M0 -92 C-14 -78 -12 -60 0 -54 C12 -60 14 -78 0 -92 Z',
      solid(s + 1, '#FF6B57')));
    g.appendChild(rs.path('M0 -80 C-6 -72 -6 -62 0 -58 C6 -62 6 -72 0 -80 Z',
      solid(s + 2, '#FFC53D')));
    return g;
  },

  candle(rs, s) {
    const g = G('art-candle');
    g.appendChild(rs.rectangle(-10, -44, 20, 44, solid(s, '#FFF3DC')));
    g.appendChild(rs.path('M0 -64 C-7 -56 -6 -48 0 -45 C6 -48 7 -56 0 -64 Z', solid(s + 1, '#FFC53D')));
    g.appendChild(rs.ellipse(0, -2, 40, 10, solid(s + 2, '#B8B2A6')));
    return g;
  },

  /* ---------- treasures & treats ---------- */

  key(rs, s) {
    const g = G('art-key');
    g.appendChild(rs.circle(-28, -30, 16, O(s, { stroke: '#FFC53D', strokeWidth: 7 })));
    g.appendChild(rs.line(-14, -30, 44, -30, O(s + 1, { stroke: '#FFC53D', strokeWidth: 7 })));
    g.appendChild(rs.line(30, -30, 30, -16, O(s + 2, { stroke: '#FFC53D', strokeWidth: 7 })));
    g.appendChild(rs.line(42, -30, 42, -12, O(s + 3, { stroke: '#FFC53D', strokeWidth: 7 })));
    return g;
  },

  cookieJar(rs, s) {
    const g = G('art-cookieJar');
    g.appendChild(rs.path('M-32 0 C-40 -24 -40 -60 -24 -66 L24 -66 C40 -60 40 -24 32 0 Z',
      solid(s, '#BFE8FF')));
    g.appendChild(rs.rectangle(-30, -80, 60, 16, solid(s + 1, '#FF6B57')));
    g.appendChild(rs.circle(-10, -30, 8, solid(s + 2, '#C98A54')));
    g.appendChild(rs.circle(10, -42, 8, solid(s + 3, '#C98A54')));
    g.appendChild(rs.circle(6, -18, 8, solid(s + 4, '#C98A54')));
    return g;
  },

  cookie(rs, s) {
    const g = G('art-cookie');
    g.appendChild(rs.circle(0, -30, 28, fill(s, '#D9A569', { fillStyle: 'solid' })));
    g.appendChild(rs.circle(-8, -36, 4, solid(s + 1, '#6B4A2A')));
    g.appendChild(rs.circle(9, -26, 4, solid(s + 2, '#6B4A2A')));
    g.appendChild(rs.circle(-2, -20, 4, solid(s + 3, '#6B4A2A')));
    g.appendChild(rs.circle(10, -40, 3.4, solid(s + 4, '#6B4A2A')));
    return g;
  },

  apple(rs, s) {
    const g = G('art-apple');
    g.appendChild(rs.circle(-9, -28, 22, solid(s, '#FF6B57')));
    g.appendChild(rs.circle(9, -28, 22, solid(s + 1, '#FF6B57')));
    g.appendChild(rs.line(0, -44, 4, -58, O(s + 2, { stroke: '#6B4A2A', strokeWidth: 4 })));
    g.appendChild(rs.ellipse(14, -54, 16, 8, solid(s + 3, '#4FB06D')));
    return g;
  },

  gift(rs, s) {
    const g = G('art-gift');
    g.appendChild(rs.rectangle(-34, -44, 68, 44, solid(s, '#B565D8')));
    g.appendChild(rs.rectangle(-40, -56, 80, 14, solid(s + 1, '#8E4DAF')));
    g.appendChild(rs.line(0, -56, 0, 0, O(s + 2, { stroke: '#FFC53D', strokeWidth: 7 })));
    g.appendChild(rs.circle(-10, -62, 9, O(s + 3, { stroke: '#FFC53D', strokeWidth: 4 })));
    g.appendChild(rs.circle(10, -62, 9, O(s + 4, { stroke: '#FFC53D', strokeWidth: 4 })));
    return g;
  },

  star(rs, s) {
    const g = G('art-star');
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + Math.PI * i / 5;
      const r = i % 2 ? 16 : 38;
      pts.push([Math.cos(a) * r, -48 + Math.sin(a) * r]);
    }
    g.appendChild(rs.polygon(pts, fill(s, '#FFC53D', { fillStyle: 'solid' })));
    return g;
  },

  crown(rs, s) {
    const g = G('art-crown');
    g.appendChild(rs.polygon([[-36, 0], [-36, -36], [-18, -20], [0, -48], [18, -20], [36, -36], [36, 0]],
      solid(s, '#FFC53D')));
    g.appendChild(rs.circle(0, -30, 6, solid(s + 1, '#FF6B57')));
    g.appendChild(rs.circle(-20, -18, 4, solid(s + 2, '#5DA9E9')));
    g.appendChild(rs.circle(20, -18, 4, solid(s + 3, '#5DA9E9')));
    return g;
  },

  hat(rs, s) {
    const g = G('art-hat');
    g.appendChild(rs.path('M-26 -18 C-26 -52 26 -52 26 -18 Z', solid(s, '#5DA9E9')));
    g.appendChild(rs.ellipse(0, -16, 92, 20, solid(s + 1, '#5DA9E9')));
    g.appendChild(rs.rectangle(-16, -26, 32, 8, solid(s + 2, '#FFC53D')));
    return g;
  },

  balloon(rs, s) {
    const g = G('art-balloon');
    g.appendChild(rs.ellipse(0, -74, 44, 52, fill(s, '#FF6B57', { fillStyle: 'solid' })));
    g.appendChild(rs.polygon([[-6, -48], [6, -48], [0, -40]], solid(s + 1, '#FF6B57')));
    g.appendChild(rs.curve([[0, -40], [-8, -24], [4, -10], [0, 0]], O(s + 2, { strokeWidth: 2.5 })));
    return g;
  },

  kite(rs, s) {
    const g = G('art-kite');
    g.appendChild(rs.polygon([[0, -104], [34, -68], [0, -34], [-34, -68]], solid(s, '#FF6B57')));
    g.appendChild(rs.line(0, -104, 0, -34, O(s + 1, { strokeWidth: 2 })));
    g.appendChild(rs.line(-34, -68, 34, -68, O(s + 2, { strokeWidth: 2 })));
    g.appendChild(rs.curve([[0, -34], [-10, -18], [6, -8], [0, 0]], O(s + 3, { strokeWidth: 2.5 })));
    return g;
  },

  /* ---------- heavy bonkers ---------- */

  toaster(rs, s) {
    const g = G('art-toaster');
    g.appendChild(rs.rectangle(-34, -52, 68, 52, solid(s, '#B8B2A6')));
    g.appendChild(rs.rectangle(-24, -56, 48, 8, solid(s + 1, INK)));
    g.appendChild(rs.rectangle(-16, -70, 32, 16, solid(s + 2, '#D9A569')));
    g.appendChild(rs.circle(24, -26, 6, solid(s + 3, '#FF6B57')));
    g.appendChild(rs.line(-20, -34, 12, -34, O(s + 4, { stroke: '#8f897c', strokeWidth: 3 })));
    return g;
  },

  piano(rs, s) {
    const g = G('art-piano');
    g.appendChild(rs.rectangle(-52, -58, 104, 58, solid(s, INK)));
    g.appendChild(rs.rectangle(-46, -34, 92, 20, solid(s + 1, '#FFFDF6')));
    for (let i = 0; i < 5; i++)
      g.appendChild(rs.rectangle(-38 + i * 17, -34, 9, 12, solid(s + 2 + i, INK)));
    return g;
  },

  anvil(rs, s) {
    const g = G('art-anvil');
    g.appendChild(rs.path('M-54 -58 L20 -58 C34 -58 44 -48 54 -44 L40 -34 L16 -34 C14 -20 20 -12 26 -6 L-30 -6 C-22 -14 -20 -24 -22 -34 L-54 -40 Z',
      solid(s, '#6E6E7A')));
    g.appendChild(rs.rectangle(-32, -8, 60, 8, solid(s + 1, '#55555F')));
    return g;
  },

  fridge(rs, s) {
    const g = G('art-fridge');
    g.appendChild(rs.rectangle(-26, -104, 52, 104, solid(s, '#BFE8FF')));
    g.appendChild(rs.line(-26, -66, 26, -66, O(s + 1, { strokeWidth: 3 })));
    g.appendChild(rs.line(16, -88, 16, -76, O(s + 2, { strokeWidth: 5 })));
    g.appendChild(rs.line(16, -56, 16, -40, O(s + 3, { strokeWidth: 5 })));
    g.appendChild(rs.circle(-8, -86, 6, solid(s + 4, '#FF6B57')));
    return g;
  },

  tv(rs, s) {
    const g = G('art-tv');
    g.appendChild(rs.rectangle(-44, -66, 88, 60, solid(s, '#8d7b68')));
    g.appendChild(rs.rectangle(-34, -56, 56, 40, solid(s + 1, '#BFE8FF')));
    g.appendChild(rs.line(-20, -66, -34, -88, O(s + 2, { strokeWidth: 3 })));
    g.appendChild(rs.line(-18, -66, -4, -88, O(s + 3, { strokeWidth: 3 })));
    g.appendChild(rs.circle(32, -28, 4, solid(s + 4, INK)));
    g.appendChild(rs.circle(32, -44, 4, solid(s + 5, INK)));
    return g;
  },

  sock(rs, s) {
    const g = G('art-sock');
    g.appendChild(rs.path('M-14 -72 L14 -72 L14 -28 C30 -20 30 -2 10 0 L-16 0 C-26 -8 -24 -22 -14 -26 Z',
      solid(s, '#B565D8')));
    g.appendChild(rs.rectangle(-16, -74, 32, 10, solid(s + 1, '#FFC53D')));
    g.appendChild(rs.line(-14, -12, 8, -12, O(s + 2, { stroke: '#8E4DAF', strokeWidth: 3 })));
    return g;
  },

  homework(rs, s) {
    const g = G('art-homework');
    g.appendChild(rs.rectangle(-36, -52, 72, 52, solid(s, '#FFFDF6')));
    g.appendChild(rs.line(-26, -40, 26, -40, O(s + 1, { stroke: '#9b8b72', strokeWidth: 3 })));
    g.appendChild(rs.line(-26, -30, 26, -30, O(s + 2, { stroke: '#9b8b72', strokeWidth: 3 })));
    g.appendChild(rs.line(-26, -20, 14, -20, O(s + 3, { stroke: '#9b8b72', strokeWidth: 3 })));
    g.appendChild(rs.curve([[-26, -10], [-10, -16], [6, -8]], O(s + 4, { stroke: '#FF6B57', strokeWidth: 3 })));
    return g;
  },

  /* ---------- nature ---------- */

  mushroom(rs, s) {
    const g = G('art-mushroom');
    g.appendChild(rs.path('M-46 -44 C-46 -88 46 -88 46 -44 C46 -36 -46 -36 -46 -44 Z',
      solid(s, '#FF6B57')));
    g.appendChild(rs.path('M-14 -40 L-10 0 L10 0 L14 -40 Z', solid(s + 1, '#FFF3DC')));
    g.appendChild(rs.circle(-20, -60, 7, solid(s + 2, '#FFFDF6')));
    g.appendChild(rs.circle(14, -66, 9, solid(s + 3, '#FFFDF6')));
    g.appendChild(rs.circle(28, -50, 5, solid(s + 4, '#FFFDF6')));
    return g;
  },

  flower(rs, s) {
    const g = G('art-flower');
    g.appendChild(rs.line(0, 0, 0, -44, O(s, { stroke: '#3E8E5A', strokeWidth: 4 })));
    g.appendChild(rs.ellipse(-10, -18, 18, 9, solid(s + 1, '#4FB06D')));
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * i / 3;
      g.appendChild(rs.ellipse(Math.cos(a) * 16, -56 + Math.sin(a) * 16, 16, 12,
        solid(s + 2 + i, i % 2 ? '#FF6B57' : '#FF9C86')));
    }
    g.appendChild(rs.circle(0, -56, 10, solid(s + 9, '#FFC53D')));
    return g;
  },

  tree(rs, s) {
    const g = G('art-tree');
    g.appendChild(rs.rectangle(-9, -46, 18, 46, solid(s, '#8A5A30')));
    g.appendChild(rs.ellipse(0, -70, 74, 58, fill(s + 1, '#4FB06D', { roughness: 2.2 })));
    g.appendChild(rs.circle(-16, -74, 8, solid(s + 2, '#3E8E5A')));
    g.appendChild(rs.circle(18, -62, 7, solid(s + 3, '#3E8E5A')));
    return g;
  },

  pine(rs, s) {
    const g = G('art-pine');
    g.appendChild(rs.rectangle(-7, -20, 14, 20, solid(s, '#8A5A30')));
    g.appendChild(rs.polygon([[0, -104], [-34, -52], [34, -52]], solid(s + 1, '#3E8E5A')));
    g.appendChild(rs.polygon([[0, -82], [-40, -26], [40, -26]], solid(s + 2, '#4FB06D')));
    return g;
  },

  bush(rs, s) {
    const g = G('art-bush');
    g.appendChild(rs.path('M-46 0 C-52 -24 -32 -34 -20 -28 C-16 -46 16 -46 20 -28 C34 -34 52 -22 46 0 Z',
      solid(s, '#4FB06D')));
    g.appendChild(rs.circle(-20, -16, 5, solid(s + 1, '#FF6B57')));
    g.appendChild(rs.circle(14, -20, 5, solid(s + 2, '#FFC53D')));
    return g;
  },

  rock(rs, s) {
    const g = G('art-rock');
    g.appendChild(rs.path('M-50 0 C-56 -30 -30 -52 0 -50 C34 -48 56 -28 50 0 Z',
      fill(s, '#B8B2A6', { fillStyle: 'solid' })));
    g.appendChild(rs.line(-28, -30, -12, -40, O(s + 1, { stroke: '#8f897c', strokeWidth: 3 })));
    g.appendChild(rs.line(6, -22, 24, -30, O(s + 2, { stroke: '#8f897c', strokeWidth: 3 })));
    return g;
  },

  /* ---------- wearables & magic ---------- */

  sword(rs, s) {
    const g = G('art-sword');
    g.appendChild(rs.polygon([[0, -104], [-10, -88], [-5, -30], [5, -30], [10, -88]], solid(s, '#BFE8FF')));
    g.appendChild(rs.line(-22, -28, 22, -28, O(s + 1, { stroke: '#FFC53D', strokeWidth: 7 })));
    g.appendChild(rs.line(0, -28, 0, -8, O(s + 2, { stroke: '#8A5A30', strokeWidth: 8 })));
    g.appendChild(rs.circle(0, -4, 6, solid(s + 3, '#FFC53D')));
    return g;
  },

  wand(rs, s) {
    const g = G('art-wand');
    g.appendChild(rs.line(-10, 0, 14, -74, O(s, { stroke: '#6B4A2A', strokeWidth: 6 })));
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + Math.PI * i / 5;
      const r = i % 2 ? 6 : 15;
      pts.push([16 + Math.cos(a) * r, -82 + Math.sin(a) * r]);
    }
    g.appendChild(rs.polygon(pts, solid(s + 1, '#FFC53D')));
    return g;
  },

  shield(rs, s) {
    const g = G('art-shield');
    g.appendChild(rs.path('M-30 -78 L30 -78 L30 -38 C30 -14 0 0 0 0 C0 0 -30 -14 -30 -38 Z',
      fill(s, '#5DA9E9', { fillStyle: 'solid' })));
    g.appendChild(rs.line(0, -78, 0, -8, O(s + 1, { stroke: '#2f7fb8', strokeWidth: 3 })));
    g.appendChild(rs.line(-30, -50, 30, -50, O(s + 2, { stroke: '#2f7fb8', strokeWidth: 3 })));
    return g;
  },

  map(rs, s) {
    const g = G('art-map');
    g.appendChild(rs.path('M-44 -64 C-30 -72 -16 -60 0 -66 C16 -72 30 -60 44 -66 L44 -14 C30 -8 16 -20 0 -14 C-16 -8 -30 -20 -44 -14 Z',
      solid(s, '#FFF3DC')));
    g.appendChild(rs.curve([[-30, -56], [-10, -40], [8, -50], [28, -30]],
      O(s + 1, { stroke: '#c96f3f', strokeWidth: 2.5 })));
    g.appendChild(rs.circle(28, -30, 7, O(s + 2, { stroke: '#FF6B57', strokeWidth: 3 })));
    g.appendChild(rs.line(24, -26, 32, -34, O(s + 3, { stroke: '#FF6B57', strokeWidth: 3 })));
    return g;
  },

  drum(rs, s) {
    const g = G('art-drum');
    g.appendChild(rs.rectangle(-38, -48, 76, 46, solid(s, '#FF6B57')));
    g.appendChild(rs.ellipse(0, -48, 76, 18, solid(s + 1, '#FFF3DC')));
    g.appendChild(rs.line(-30, -44, 30, -6, O(s + 2, { stroke: '#FFC53D', strokeWidth: 3 })));
    g.appendChild(rs.line(30, -44, -30, -6, O(s + 3, { stroke: '#FFC53D', strokeWidth: 3 })));
    return g;
  },

  bell(rs, s) {
    const g = G('art-bell');
    g.appendChild(rs.path('M-28 -6 C-28 -34 -16 -52 0 -52 C16 -52 28 -34 28 -6 Z',
      fill(s, '#FFC53D', { fillStyle: 'solid' })));
    g.appendChild(rs.circle(0, -58, 7, solid(s + 1, '#FFC53D')));
    g.appendChild(rs.circle(0, -2, 8, solid(s + 2, '#E8A93D')));
    return g;
  },

  chest(rs, s) {
    const g = G('art-chest');
    g.appendChild(rs.rectangle(-42, -38, 84, 38, solid(s, '#A9713F')));
    g.appendChild(rs.path('M-42 -38 C-42 -62 42 -62 42 -38 Z', solid(s + 1, '#C98A54')));
    g.appendChild(rs.rectangle(-8, -44, 16, 18, solid(s + 2, '#FFC53D')));
    g.appendChild(rs.circle(0, -35, 3.4, solid(s + 3, INK)));
    return g;
  },

  door(rs, s) {
    const g = G('art-door');
    g.appendChild(rs.path('M-26 0 V-58 C-26 -88 26 -88 26 -58 V0 Z',
      fill(s, '#8A4B2C', { fillStyle: 'solid' })));
    g.appendChild(rs.circle(14, -30, 4.5, solid(s + 1, '#FFC53D')));
    g.appendChild(rs.line(-18, -70, 18, -70, O(s + 2, { stroke: '#6B3A20', strokeWidth: 3 })));
    return g;
  },

  mailbox(rs, s) {
    const g = G('art-mailbox');
    g.appendChild(rs.line(0, 0, 0, -42, O(s, { stroke: '#8A5A30', strokeWidth: 6 })));
    g.appendChild(rs.path('M-28 -42 L-28 -66 C-28 -82 28 -82 28 -66 L28 -42 Z',
      solid(s + 1, '#5DA9E9')));
    g.appendChild(rs.line(14, -66, 14, -86, O(s + 2, { strokeWidth: 3 })));
    g.appendChild(rs.rectangle(10, -90, 14, 10, solid(s + 3, '#FF6B57')));
    return g;
  },

  house(rs, s) {
    const g = G('art-house');
    g.appendChild(rs.rectangle(-40, -62, 80, 62, solid(s, '#FFF3DC')));
    g.appendChild(rs.polygon([[-50, -62], [0, -98], [50, -62]], solid(s + 1, '#FF6B57')));
    g.appendChild(rs.rectangle(-10, -26, 20, 26, solid(s + 2, '#8A4B2C')));
    g.appendChild(rs.circle(20, -44, 9, solid(s + 3, '#BFE8FF')));
    return g;
  },

  /* ---------- generic fallback: a sign with the word on it ---------- */

  doodad(rs, s, label) {
    const g = G('art-doodad');
    g.appendChild(rs.line(-18, 0, -18, -56, O(s, { stroke: '#8A5A30', strokeWidth: 6 })));
    g.appendChild(rs.line(18, 0, 18, -56, O(s + 1, { stroke: '#8A5A30', strokeWidth: 6 })));
    g.appendChild(rs.rectangle(-52, -94, 104, 42, solid(s + 2, '#FFF3DC')));
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', 0); t.setAttribute('y', -66);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', "'Patrick Hand', cursive");
    t.setAttribute('font-size', '20');
    t.setAttribute('fill', INK);
    t.textContent = (label || 'thing').slice(0, 12);
    g.appendChild(t);
    return g;
  },
};

/* ============================================================
   Kind normalization — LLM says "banana peel", DOM says bananaPeel
   ============================================================ */
const ALIASES = {
  'banana': 'bananaPeel', 'peel': 'bananaPeel', 'banana peel': 'bananaPeel',
  'ice cube': 'ice', 'icecube': 'ice', 'iceberg': 'ice',
  'mud': 'puddle', 'puddles': 'puddle', 'water': 'puddle',
  'jelly': 'slime', 'jello': 'slime', 'goo': 'slime', 'blob': 'slime',
  'hay': 'straw', 'haystack': 'straw', 'straw pile': 'straw',
  'stick': 'sticks', 'wood': 'sticks', 'lumber': 'sticks', 'twigs': 'sticks',
  'brick': 'bricks', 'brick pile': 'bricks', 'stone': 'bricks',
  'pony': 'horse', 'stallion': 'horse', 'unicorn': 'unicorn', 'pegasus': 'unicorn',
  'wolf': 'wolfprop', 'big bad wolf': 'wolfprop', 'wolfy': 'wolfprop',
  'piggy': 'pig', 'piglet': 'pig', 'pigs': 'pig', 'hog': 'pig',
  'rabbit': 'bunny', 'hare': 'bunny', 'kitty': 'cat', 'kitten': 'cat',
  'puppy': 'dog', 'frog': 'frog', 'toad': 'frog',
  'canoe': 'boat', 'ship': 'boat', 'sailboat': 'boat', 'raft': 'raft',
  'rope': 'vine', 'ivy': 'vine',
  'lamp': 'lantern', 'flashlight': 'lantern', 'light': 'lantern',
  'tv': 'tv', 'television': 'tv', 'telly': 'tv',
  'cookies': 'cookie', 'biscuit': 'cookie', 'cookie jar': 'cookieJar', 'jar': 'cookieJar',
  'cake': 'cookie', 'cupcake': 'cookie', 'donut': 'cookie', 'pie': 'apple',
  'berries': 'apple', 'fruit': 'apple', 'snack': 'cookie',
  'paper': 'homework', 'book': 'homework', 'homework': 'homework',
  'piano': 'piano', 'keyboard': 'piano',
  'boulder': 'rock', 'stone rock': 'rock',
  'sapling': 'pine', 'pine': 'pine', 'pine tree': 'pine', 'christmas tree': 'pine',
  'flowers': 'flower', 'tulip': 'flower', 'daisy': 'flower',
  'shrub': 'bush', 'bushes': 'bush',
  'sword': 'sword', 'blade': 'sword', 'wand': 'wand', 'magic wand': 'wand',
  'staff': 'wand', 'shield': 'shield', 'armor': 'shield',
  'crown': 'crown', 'tiara': 'crown', 'hat': 'hat', 'cap': 'hat',
  'balloons': 'balloon', 'kite': 'kite',
  'bridge': 'bridge', 'ladder': 'ladder', 'stairs': 'ladder', 'steps': 'ladder',
  'tunnel': 'tunnel', 'cave': 'tunnel', 'log': 'log', 'plank': 'plank',
  'board': 'plank', 'stones': 'stones', 'stepping stones': 'stones',
  'trampoline': 'trampoline', 'bouncer': 'trampoline',
  'toaster': 'toaster', 'anvil': 'anvil', 'fridge': 'fridge',
  'refrigerator': 'fridge', 'freezer': 'fridge', 'sock': 'sock',
  'soap': 'soap', 'soap bar': 'soap', 'mushroom': 'mushroom', 'toadstool': 'mushroom',
  'tree': 'tree', 'oak': 'tree', 'door': 'door', 'gate': 'door',
  'key': 'key', 'chest': 'chest', 'treasure': 'chest', 'treasure chest': 'chest',
  'gift': 'gift', 'present': 'gift', 'star': 'star', 'map': 'map',
  'drum': 'drum', 'bell': 'bell', 'mailbox': 'mailbox', 'mail': 'mailbox',
  'house': 'house', 'cottage': 'house', 'hut': 'house',
  'bird': 'bird', 'duck': 'duck', 'cat': 'cat', 'dog': 'cat', 'bee': 'bee',
  'butterfly': 'butterfly', 'snail': 'snail', 'umbrella': 'umbrella',
  'torch': 'torch', 'candle': 'candle', 'dragon': 'dragon',
  'unicorn ride': 'unicorn',
};

function normalizeKind(raw) {
  const k = String(raw || '').toLowerCase().trim().replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');
  if (!k) return null;
  if (SKETCH_PROPS[k]) return k;
  if (ALIASES[k]) return ALIASES[k];
  const squash = k.replace(/ /g, '');
  if (SKETCH_PROPS[squash]) return squash;
  if (ALIASES[squash]) return ALIASES[squash];
  /* singular/plural */
  if (k.endsWith('s') && SKETCH_PROPS[k.slice(0, -1)]) return k.slice(0, -1);
  return 'doodad';
}

/* gag classification — what the prop DOES to the hero */
const RIDE_RE  = /unicorn|horse|pony|dragon|bike|bicycle|scooter|skateboard|broom|carpet|dolphin|whale|camel|elephant|llama|ostrich/;
const SLIP_RE  = /banana|peel|soap|ice|slime|puddle|mud|oil|slick|jelly|jello|butter|skate/;
const BONK_RE  = /anvil|piano|fridge|toaster|tv|television|safe|boulder|wrecking|piano/;
const MAT_RE   = /^(straw|hay|haystack|sticks?|wood|lumber|twigs|bricks?|stone)$/;
const EAT_RE   = /cookie|apple|cake|pie|donut|pickle|jam|berry|berries|cupcake|candy|snack|sandwich|pizza|taco/;
const WEAR_RE  = /hat|crown|umbrella|wand|sword|shield|torch|lantern|balloon|kite|mask|cape|map/;
const FLYK_RE  = /bird|bee|butterfly|duck|owl|bat|dragonfly|balloon|kite/;
const WOLF_RE  = /wolf/;
const PIG_RE   = /pig|hog|swine/;

function classify(rawKind) {
  const k = String(rawKind || '').toLowerCase();
  if (WOLF_RE.test(k)) return 'wolf';
  if (PIG_RE.test(k)) return 'pig';
  if (MAT_RE.test(k)) return 'material';
  if (RIDE_RE.test(k)) return 'ride';
  if (SLIP_RE.test(k)) return 'slip';
  if (BONK_RE.test(k)) return 'bonk';
  if (EAT_RE.test(k)) return 'eat';
  if (WEAR_RE.test(k)) return 'wear';
  if (FLYK_RE.test(k)) return 'fly';
  return 'plain';
}

window.SKETCH_PROPS = SKETCH_PROPS;
window.propKind = normalizeKind;
window.propClass = classify;

})();
