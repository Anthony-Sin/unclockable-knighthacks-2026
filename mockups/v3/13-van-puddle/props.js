/* props.js — the hand-rolled prop catalog (zero dependencies).
 *
 * Every prop is { w, h, cat, draw(ctx, w, h, r, word) }: it sketches itself
 * into a w×h box (feet anchored at the bottom) with SK wobble strokes.
 * `cat` drives the comedy: ride / slip / bonk / eat / wear / material /
 * wolf / pig / plain.
 *
 * The LLM may emit ANY word — resolveKind() maps it to a catalog def, and
 * unknown words get the 'doodle' fallback that hand-letters the word itself.
 */
'use strict';
(function () {
const SK = window.SK;
const INK = SK.INK;

/* ---------- tiny shared bits ---------- */
function leafBlob(ctx, x, y, rx, ry, r, col) {
  SK.ellipse(ctx, x, y, rx, ry,
    { r, fill: col, hatch: true, hatchGap: 6, strokeWidth: 2.4 });
}
function eye(ctx, x, y, rad, r) {
  SK.circle(ctx, x, y, rad, { r, fill: INK, stroke: 'none' });
}
function whiteEye(ctx, x, y, rx, ry, r) {
  SK.ellipse(ctx, x, y, rx, ry, { r, fill: '#FFFDF6', strokeWidth: 2.4 });
  eye(ctx, x + rx * .25, y + 1, Math.min(rx, ry) * .45, r);
}
function puffCloud(ctx, cx, cy, s, r, col) {
  SK.ellipse(ctx, cx - 18 * s, cy + 5 * s, 17 * s, 10 * s, { r, fill: col, strokeWidth: 2 });
  SK.ellipse(ctx, cx, cy - 2 * s, 23 * s, 14 * s, { r, fill: col, strokeWidth: 2.2 });
  SK.ellipse(ctx, cx + 19 * s, cy + 5 * s, 15 * s, 9 * s, { r, fill: col, strokeWidth: 2 });
}
function door(ctx, x, y, w, h, r, col) {
  SK.rect(ctx, x, y - h, w, h, { r, fill: col, hatch: true, hatchGap: 5, strokeWidth: 2.4 });
  SK.circle(ctx, x + w - 8, y - h / 2, 3.4, { r, fill: '#FFC53D', strokeWidth: 1.4 });
}
function win(ctx, x, y, s, r) {
  SK.rect(ctx, x, y, s, s, { r, fill: '#FFF6C9', strokeWidth: 2.2 });
  SK.line(ctx, x + s / 2, y + 2, x + s / 2, y + s - 2, { r, strokeWidth: 1.6 });
  SK.line(ctx, x + 2, y + s / 2, x + s - 2, y + s / 2, { r, strokeWidth: 1.6 });
}

/* ============================================================
   THE PROP CATALOG — draw(ctx, w, h, r, word), feet at y=h-8
   ============================================================ */
const PROPS = {

/* ---------------- the three houses ---------------- */
strawhouse: { w: 300, h: 240, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8, hw = 210, hh = 130, top = y - hh;
  SK.poly(ctx, [[cx - hw/2, y], [cx - hw/2 - 8, top + 30], [cx - 40, top - 24],
    [cx + 46, top - 26], [cx + hw/2 + 8, top + 30], [cx + hw/2, y]],
    { r, fill: '#F2D488', hatch: true, hatchGap: 8, hatchAngle: -48, strokeWidth: 3.2 });
  for (let i = 0; i < 14; i++) {
    const tx = cx + r.rr(-hw/2, hw/2), ty = r.rr(top + 10, y - 10);
    SK.line(ctx, tx, ty, tx + r.rr(-12, 12), ty - r.rr(8, 20), { r, stroke: '#D9A94B', strokeWidth: 2 });
  }
  SK.curve(ctx, [[cx - hw/2 - 10, top + 24], [cx - 40, top - 20], [cx + 46, top - 22], [cx + hw/2 + 10, top + 22]],
    { r, stroke: '#E8B94B', strokeWidth: 11 });
  SK.curve(ctx, [[cx - hw/2 - 10, top + 24], [cx - 40, top - 20], [cx + 46, top - 22], [cx + hw/2 + 10, top + 22]],
    { r, stroke: INK, strokeWidth: 2.4 });
  SK.circle(ctx, cx + 56, top + 52, 16, { r, fill: '#FFF6C9', strokeWidth: 2.4 });
  door(ctx, cx - 52, y, 56, 66, r, '#D9B078');
}},

stickhouse: { w: 300, h: 250, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8, hw = 220, hh = 138, top = y - hh;
  SK.rect(ctx, cx - hw/2, top, hw, hh, { r, fill: '#C9A06B', strokeWidth: 3 });
  for (let i = 0; i < 5; i++) {
    const ly = top + 16 + i * 26;
    SK.line(ctx, cx - hw/2 - 8, ly, cx + hw/2 + 8, ly + r.rr(-3, 3), { r, stroke: '#8A5E2E', strokeWidth: 7 });
    SK.circle(ctx, cx - hw/2 - 8, ly, 6, { r, fill: '#D9A96B', strokeWidth: 1.6 });
    SK.circle(ctx, cx + hw/2 + 8, ly + 2, 6, { r, fill: '#D9A96B', strokeWidth: 1.6 });
  }
  SK.poly(ctx, [[cx - hw/2 - 24, top + 4], [cx - 4, top - 58], [cx + hw/2 + 20, top + 2]],
    { r, fill: '#A9713F', hatch: true, hatchGap: 6, hatchAngle: -35, strokeWidth: 3 });
  for (let i = 0; i < 4; i++)
    SK.line(ctx, cx - hw/2 + 20 + i * 52, top, cx - hw/2 + 62 + i * 52, top - 40,
      { r, stroke: '#6B4A2A', strokeWidth: 3.6 });
  win(ctx, cx + 38, top + 40, 46, r);
  door(ctx, cx - 76, y, 58, 84, r, '#8A5E2E');
}},

brickhouse: { w: 320, h: 270, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8, hw = 230, hh = 150, top = y - hh;
  SK.rect(ctx, cx - hw/2, top, hw, hh, { r, fill: '#E0664F', hatch: true, hatchGap: 9, hatchAngle: -32, strokeWidth: 3.4 });
  for (let row = 0; row < 6; row++) {
    const by = top + 14 + row * 24;
    SK.line(ctx, cx - hw/2 + 2, by, cx + hw/2 - 2, by, { r, stroke: '#A8434F', strokeWidth: 1.8 });
    const off = (row % 2) * 20;
    for (let bxi = 0; bxi < 5; bxi++)
      SK.line(ctx, cx - hw/2 + 22 + off + bxi * 42, by, cx - hw/2 + 22 + off + bxi * 42, by + 24,
        { r, stroke: '#A8434F', strokeWidth: 1.6 });
  }
  SK.poly(ctx, [[cx - hw/2 - 22, top + 2], [cx, top - 54], [cx + hw/2 + 22, top + 2]],
    { r, fill: '#6E6478', hatch: true, hatchGap: 6, hatchAngle: -45, strokeWidth: 3.2 });
  SK.rect(ctx, cx + 60, top - 66, 34, 58, { r, fill: '#C9553F', strokeWidth: 2.4 });
  SK.curve(ctx, [[cx + 76, top - 74], [cx + 62, top - 94], [cx + 84, top - 110]], { r, stroke: '#C9BEC8', strokeWidth: 5 });
  SK.curve(ctx, [[cx + 84, top - 114], [cx + 74, top - 128], [cx + 92, top - 140]], { r, stroke: '#C9BEC8', strokeWidth: 4 });
  win(ctx, cx - 86, top + 40, 44, r);
  win(ctx, cx + 42, top + 40, 44, r);
  SK.path(ctx, [[cx - 26, y], [cx - 26, y - 78], [cx, y - 96], [cx + 26, y - 78], [cx + 26, y]],
    { r, fill: '#6B4A2A', strokeWidth: 3 });
  SK.circle(ctx, cx + 14, y - 40, 3.6, { r, fill: '#FFC53D', strokeWidth: 1.4 });
}},

cottage: { w: 270, h: 230, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8, hw = 190, hh = 120, top = y - hh;
  SK.rect(ctx, cx - hw/2, top, hw, hh, { r, fill: '#FFF1D6', hatch: true, hatchGap: 9, hatchAngle: -30, strokeWidth: 3 });
  SK.poly(ctx, [[cx - hw/2 - 18, top + 2], [cx, top - 56], [cx + hw/2 + 18, top + 2]],
    { r, fill: '#E86A4E', hatch: true, hatchGap: 6, hatchAngle: -40, strokeWidth: 3 });
  door(ctx, cx - 26, y, 52, 70, r, '#8A5E2E');
  win(ctx, cx + 42, top + 36, 40, r);
  SK.curve(ctx, [[cx + hw/4, top - 40], [cx + hw/4 - 8, top - 58], [cx + hw/4 + 6, top - 72]],
    { r, stroke: '#C9BEC8', strokeWidth: 4 });
}},

tent: { w: 230, h: 160, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.poly(ctx, [[cx - 95, y], [cx, y - 130], [cx + 95, y]],
    { r, fill: '#FF9E57', hatch: true, hatchGap: 8, strokeWidth: 3 });
  SK.poly(ctx, [[cx - 30, y], [cx, y - 78], [cx + 30, y]],
    { r, fill: '#C9553F', strokeWidth: 2.4 });
  SK.line(ctx, cx, y - 130, cx, y - 146, { r, strokeWidth: 2.4 });
  SK.poly(ctx, [[cx, y - 146], [cx + 26, y - 140], [cx, y - 132]],
    { r, fill: '#FFC53D', strokeWidth: 2 });
}},

/* ---------------- materials ---------------- */
strawpile: { w: 190, h: 120, cat: 'material', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 34, 82, 40, { r, fill: '#F2D488', hatch: true, hatchGap: 7, hatchAngle: -50, strokeWidth: 3 });
  for (let i = 0; i < 12; i++) {
    const tx = cx + r.rr(-70, 70), ty = y - r.rr(6, 62);
    SK.line(ctx, tx, ty, tx + r.rr(-13, 13), ty - r.rr(6, 16), { r, stroke: '#D9A94B', strokeWidth: 1.8 });
  }
}},

hay: { w: 170, h: 120, cat: 'material', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 66, y - 78, 132, 78, { r, fill: '#F2D488', hatch: true, hatchGap: 8, hatchAngle: -55, strokeWidth: 3, bow: 5 });
  SK.line(ctx, cx - 66, y - 40, cx + 66, y - 44, { r, stroke: '#C9A23F', strokeWidth: 3 });
  SK.line(ctx, cx - 22, y - 78, cx - 22, y, { r, stroke: '#C9A23F', strokeWidth: 3 });
  SK.line(ctx, cx + 22, y - 78, cx + 22, y, { r, stroke: '#C9A23F', strokeWidth: 3 });
}},

stickpile: { w: 200, h: 110, cat: 'material', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  /* pyramid of logs: 3 on the bottom row, 2, then 1 on top */
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3 - row; i++) {
      const lx = cx - 74 + i * 52 + row * 26, ly = y - row * 22;
      SK.rect(ctx, lx, ly - 16, 62, 18, { r, fill: '#A9713F', strokeWidth: 2.4, bow: 3 });
      SK.circle(ctx, lx + 4, ly - 7, 6, { r, fill: '#D9A96B', strokeWidth: 1.4 });
    }
  }
}},

brickpile: { w: 190, h: 110, cat: 'material', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3 - row; i++) {
      const bx = cx - 78 + i * 54 + row * 27, by = y - row * 26;
      SK.rect(ctx, bx, by - 24, 50, 24, { r, fill: '#E0664F', hatch: true, hatchGap: 6, strokeWidth: 2.4, bow: 3 });
    }
  }
}},

stones: { w: 200, h: 90, cat: 'material', draw(ctx, w, h, r) {
  const y = h - 8;
  for (let i = 0; i < 4; i++)
    SK.ellipse(ctx, 30 + i * 48 + r.rr(-6, 6), y - r.rr(14, 34), r.rr(22, 30), r.rr(12, 18),
      { r, fill: '#B9AFA0', hatch: true, hatchGap: 6, strokeWidth: 2.4 });
}},

log: { w: 190, h: 80, cat: 'material', draw(ctx, w, h, r) {
  const y = h - 8;
  SK.rect(ctx, 20, y - 44, 150, 40, { r, fill: '#A9713F', hatch: true, hatchGap: 7, hatchAngle: -20, strokeWidth: 2.8, bow: 4 });
  SK.circle(ctx, 24, y - 24, 19, { r, fill: '#D9A96B', strokeWidth: 2.4 });
  SK.circle(ctx, 24, y - 24, 9, { r, strokeWidth: 1.6 });
}},

plank: { w: 170, h: 90, cat: 'material', draw(ctx, w, h, r) {
  const y = h - 8;
  SK.rect(ctx, 18, y - 56, 134, 22, { r, fill: '#C9A06B', hatch: true, hatchGap: 6, hatchAngle: -15, strokeWidth: 2.4, bow: 3 });
  SK.rect(ctx, 30, y - 30, 134, 22, { r, fill: '#B98A4F', hatch: true, hatchGap: 6, hatchAngle: -15, strokeWidth: 2.4, bow: 3 });
  SK.circle(ctx, 28, y - 45, 2.6, { r, fill: INK, stroke: 'none' });
  SK.circle(ctx, 142, y - 45, 2.6, { r, fill: INK, stroke: 'none' });
}},

/* ---------------- nature ---------------- */
tree: { w: 190, h: 210, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 9, y - 52, 18, 56, { r, fill: '#8A5E2E', hatch: true, hatchGap: 5, strokeWidth: 2.6 });
  leafBlob(ctx, cx - 26, y - 84, 34, 30, r, '#58BC7B');
  leafBlob(ctx, cx + 28, y - 88, 32, 28, r, '#4FB06D');
  leafBlob(ctx, cx, y - 118, 40, 34, r, '#7CC97F');
}},

pinetree: { w: 160, h: 210, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 8, y - 30, 16, 34, { r, fill: '#8A5E2E', strokeWidth: 2.4 });
  for (const [ty, tw] of [[y - 40, 110], [y - 86, 82], [y - 126, 52]])
    SK.tri(ctx, cx, ty, tw, 56, { r, fill: '#3E8F57', hatch: true, hatchGap: 6, strokeWidth: 2.6, amp: 1 });
}},

bush: { w: 150, h: 90, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  leafBlob(ctx, cx - 26, y - 24, 30, 24, r, '#4FB06D');
  leafBlob(ctx, cx + 26, y - 22, 28, 22, r, '#58BC7B');
  leafBlob(ctx, cx, y - 38, 32, 26, r, '#6FC07C');
  for (let i = 0; i < 4; i++)
    SK.circle(ctx, cx + r.rr(-34, 34), y - r.rr(16, 44), 4, { r, fill: '#FF6B57', strokeWidth: 1.2 });
}},

flower: { w: 90, h: 120, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.curve(ctx, [[cx, y], [cx + 4, y - 34], [cx - 2, y - 60]], { r, stroke: '#3E8F57', strokeWidth: 3 });
  SK.ellipse(ctx, cx + 12, y - 26, 12, 6, { r, fill: '#4FB06D', strokeWidth: 1.8 });
  for (let p = 0; p < 5; p++) {
    const a = Math.PI * 2 * p / 5 - Math.PI / 2;
    SK.ellipse(ctx, cx - 2 + Math.cos(a) * 13, y - 72 + Math.sin(a) * 13, 10, 8,
      { r, fill: r.pick(['#FF6B57', '#F58ACB', '#B565D8', '#FF9E57']), strokeWidth: 1.8 });
  }
  SK.circle(ctx, cx - 2, y - 72, 9, { r, fill: '#FFC53D', strokeWidth: 2 });
}},

mushroom: { w: 110, h: 100, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 11, y - 34, 22, 34, { r, fill: '#FFF1D6', strokeWidth: 2.4 });
  SK.path(ctx, [[cx - 40, y - 30], [cx - 34, y - 62], [cx, y - 74], [cx + 34, y - 62], [cx + 40, y - 30]],
    { r, fill: '#FF6B57', hatch: true, hatchGap: 6, strokeWidth: 2.6 });
  SK.circle(ctx, cx - 14, y - 52, 4.4, { r, fill: '#FFFDF6', stroke: 'none' });
  SK.circle(ctx, cx + 10, y - 58, 3.6, { r, fill: '#FFFDF6', stroke: 'none' });
  SK.circle(ctx, cx + 22, y - 42, 3, { r, fill: '#FFFDF6', stroke: 'none' });
}},

rock: { w: 130, h: 90, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.poly(ctx, [[cx - 52, y], [cx - 46, y - 40], [cx - 12, y - 58], [cx + 34, y - 48], [cx + 50, y - 16], [cx + 44, y]],
    { r, fill: '#B9AFA0', hatch: true, hatchGap: 7, strokeWidth: 2.8 });
  SK.line(ctx, cx - 20, y - 40, cx + 8, y - 46, { r, stroke: '#8B8378', strokeWidth: 2 });
}},

/* ---------------- crossings & rides ---------------- */
bridge: { w: 300, h: 120, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.path(ctx, [[cx - 140, y - 20], [cx - 70, y - 56], [cx + 70, y - 56], [cx + 140, y - 20]],
    { r, stroke: '#8A5E2E', strokeWidth: 9 });
  SK.path(ctx, [[cx - 140, y - 44], [cx - 70, y - 80], [cx + 70, y - 80], [cx + 140, y - 44]],
    { r, stroke: '#8A5E2E', strokeWidth: 5 });
  for (let i = 0; i < 7; i++) {
    const bx = cx - 112 + i * 37;
    SK.line(ctx, bx, y - 62 + Math.abs(bx - cx) * .1, bx, y - 34 + Math.abs(bx - cx) * .18,
      { r, stroke: '#6B4A2A', strokeWidth: 3.4 });
  }
  SK.line(ctx, cx - 140, y - 44, cx - 140, y, { r, stroke: '#6B4A2A', strokeWidth: 4 });
  SK.line(ctx, cx + 140, y - 44, cx + 140, y, { r, stroke: '#6B4A2A', strokeWidth: 4 });
}},

boat: { w: 240, h: 140, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.path(ctx, [[cx - 100, y - 52], [cx + 100, y - 52], [cx + 66, y], [cx - 66, y]],
    { r, fill: '#A9713F', hatch: true, hatchGap: 7, strokeWidth: 3.2 });
  SK.line(ctx, cx - 10, y - 52, cx - 10, y - 116, { r, stroke: '#6B4A2A', strokeWidth: 4 });
  SK.poly(ctx, [[cx - 6, y - 114], [cx + 62, y - 66], [cx - 6, y - 62]],
    { r, fill: '#FFFDF6', hatch: true, hatchGap: 6, strokeWidth: 2.4 });
}},

raft: { w: 220, h: 80, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  for (let i = 0; i < 5; i++)
    SK.rect(ctx, cx - 100 + i * 40, y - 34 + r.rr(-2, 2), 36, 30,
      { r, fill: i % 2 ? '#B98A4F' : '#C9A06B', strokeWidth: 2.2, bow: 3 });
  SK.line(ctx, cx - 104, y - 20, cx + 104, y - 22, { r, stroke: '#8A5E2E', strokeWidth: 3 });
}},

ladder: { w: 100, h: 220, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.line(ctx, cx - 28, y, cx - 34, y - 196, { r, stroke: '#8A5E2E', strokeWidth: 6 });
  SK.line(ctx, cx + 28, y, cx + 34, y - 196, { r, stroke: '#8A5E2E', strokeWidth: 6 });
  for (let i = 0; i < 6; i++) {
    const ry = y - 28 - i * 32;
    SK.line(ctx, cx - 31 + i * .8, ry, cx + 31 - i * .8, ry - 2, { r, stroke: '#A9713F', strokeWidth: 5 });
  }
}},

unicorn: { w: 260, h: 210, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 84, 74, 44, { r, fill: '#FFFDF6', hatch: true, hatchGap: 8, hatchAngle: -30, strokeWidth: 3 });
  for (const lx of [-48, -20, 22, 50])
    SK.line(ctx, cx + lx, y - 48, cx + lx + r.rr(-3, 3), y - 2, { r, stroke: '#EDE3CE', strokeWidth: 8 });
  for (const lx of [-48, -20, 22, 50])
    SK.line(ctx, cx + lx, y - 48, cx + lx + r.rr(-3, 3), y - 2, { r, stroke: INK, strokeWidth: 1.8 });
  /* neck + head */
  SK.curve(ctx, [[cx + 52, y - 104], [cx + 76, y - 128], [cx + 88, y - 148]], { r, stroke: '#FFFDF6', strokeWidth: 24 });
  SK.ellipse(ctx, cx + 96, y - 152, 26, 18, { r, fill: '#FFFDF6', strokeWidth: 2.8 });
  SK.poly(ctx, [[cx + 84, y - 168], [cx + 92, y - 200], [cx + 102, y - 170]],
    { r, fill: '#FFC53D', strokeWidth: 2.4 });
  /* mane + tail in berry/coral */
  SK.curve(ctx, [[cx + 64, y - 128], [cx + 50, y - 148], [cx + 58, y - 168], [cx + 46, y - 156]],
    { r, stroke: '#B565D8', strokeWidth: 6 });
  SK.curve(ctx, [[cx - 72, y - 96], [cx - 96, y - 84], [cx - 92, y - 60], [cx - 104, y - 48]],
    { r, stroke: '#F58ACB', strokeWidth: 6 });
  eye(ctx, cx + 104, y - 156, 3, r);
  SK.circle(ctx, cx + 118, y - 146, 2.4, { r, fill: INK, stroke: 'none' });
  /* saddle */
  SK.rect(ctx, cx - 24, y - 122, 52, 26, { r, fill: '#FF6B57', strokeWidth: 2.4, bow: 4 });
}},

pony: { w: 240, h: 190, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 78, 68, 40, { r, fill: '#C9A06B', hatch: true, hatchGap: 8, strokeWidth: 3 });
  for (const lx of [-44, -18, 20, 46])
    SK.line(ctx, cx + lx, y - 44, cx + lx, y - 2, { r, stroke: '#A9713F', strokeWidth: 8 });
  SK.curve(ctx, [[cx + 46, y - 96], [cx + 66, y - 118], [cx + 78, y - 134]], { r, stroke: '#C9A06B', strokeWidth: 20 });
  SK.ellipse(ctx, cx + 86, y - 138, 22, 16, { r, fill: '#C9A06B', strokeWidth: 2.6 });
  SK.poly(ctx, [[cx + 76, y - 150], [cx + 80, y - 168], [cx + 90, y - 152]], { r, fill: '#C9A06B', strokeWidth: 2.2 });
  SK.curve(ctx, [[cx + 56, y - 116], [cx + 48, y - 132], [cx + 56, y - 148]], { r, stroke: '#6B4A2A', strokeWidth: 6 });
  SK.curve(ctx, [[cx - 66, y - 88], [cx - 88, y - 76], [cx - 84, y - 54]], { r, stroke: '#6B4A2A', strokeWidth: 6 });
  eye(ctx, cx + 92, y - 142, 3, r);
}},

dragon: { w: 260, h: 200, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 66, 72, 42, { r, fill: '#4FB06D', hatch: true, hatchGap: 7, strokeWidth: 3 });
  SK.ellipse(ctx, cx + 4, y - 58, 44, 24, { r, fill: '#B7E6C3', strokeWidth: 2.2 });
  SK.curve(ctx, [[cx + 50, y - 84], [cx + 74, y - 110], [cx + 88, y - 124]], { r, stroke: '#4FB06D', strokeWidth: 20 });
  SK.ellipse(ctx, cx + 96, y - 128, 24, 16, { r, fill: '#4FB06D', strokeWidth: 2.6 });
  for (const hx of [-8, 10])
    SK.tri(ctx, cx + 96 + hx, y - 140, 8, 12, { r, fill: '#FFC53D', strokeWidth: 1.8 });
  whiteEye(ctx, cx + 102, y - 130, 6, 7, r);
  /* wing */
  SK.poly(ctx, [[cx - 40, y - 92], [cx - 10, y - 150], [cx + 30, y - 96], [cx + 12, y - 100]],
    { r, fill: '#B565D8', hatch: true, hatchGap: 6, strokeWidth: 2.6 });
  /* tail */
  SK.curve(ctx, [[cx - 66, y - 70], [cx - 104, y - 56], [cx - 96, y - 30]], { r, stroke: '#4FB06D', strokeWidth: 12 });
  SK.tri(ctx, cx - 98, y - 26, 16, 16, { r, fill: '#FFC53D', strokeWidth: 2 });
  for (const lx of [-40, -8, 24, 52])
    SK.line(ctx, cx + lx, y - 32, cx + lx, y - 2, { r, stroke: '#3E8F57', strokeWidth: 8 });
  /* friendly smoke puffs */
  SK.circle(ctx, cx + 122, y - 138, 5, { r, stroke: '#C9BEC8', strokeWidth: 2 });
  SK.circle(ctx, cx + 132, y - 146, 3.6, { r, stroke: '#C9BEC8', strokeWidth: 1.8 });
}},

duck: { w: 140, h: 120, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 30, 48, 28, { r, fill: '#FFC53D', hatch: true, hatchGap: 6, strokeWidth: 2.8 });
  SK.circle(ctx, cx + 38, y - 62, 20, { r, fill: '#FFC53D', strokeWidth: 2.6 });
  SK.poly(ctx, [[cx + 54, y - 64], [cx + 76, y - 58], [cx + 54, y - 52]], { r, fill: '#FF9E57', strokeWidth: 2 });
  eye(ctx, cx + 42, y - 66, 3, r);
  SK.curve(ctx, [[cx - 10, y - 38], [cx + 14, y - 44], [cx + 30, y - 36]], { r, stroke: '#E8A020', strokeWidth: 3 });
}},

fish: { w: 150, h: 100, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 36, 52, 26, { r, fill: '#FF9E57', hatch: true, hatchGap: 6, strokeWidth: 2.8 });
  SK.poly(ctx, [[cx - 48, y - 36], [cx - 76, y - 54], [cx - 76, y - 18]], { r, fill: '#E8803F', strokeWidth: 2.4 });
  SK.poly(ctx, [[cx - 4, y - 62], [cx + 14, y - 78], [cx + 30, y - 60]], { r, fill: '#E8803F', strokeWidth: 2.2 });
  eye(ctx, cx + 30, y - 40, 3.4, r);
  SK.arc(ctx, cx + 48, y - 34, 8, 6, Math.PI * .2, Math.PI * .8, { r, strokeWidth: 2 });
}},

turtle: { w: 180, h: 110, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 30, 58, 30, { r, fill: '#4FB06D', hatch: true, hatchGap: 7, strokeWidth: 3 });
  SK.ellipse(ctx, cx, y - 36, 36, 20, { r, stroke: '#2E7A46', strokeWidth: 2 });
  SK.circle(ctx, cx + 62, y - 34, 15, { r, fill: '#7CC97F', strokeWidth: 2.4 });
  eye(ctx, cx + 66, y - 38, 2.6, r);
  for (const lx of [-36, -8, 20, 46])
    SK.line(ctx, cx + lx, y - 10, cx + lx, y, { r, stroke: '#3E8F57', strokeWidth: 7 });
}},

/* ---------------- the cast ---------------- */
wolf: { w: 280, h: 210, cat: 'wolf', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx - 10, y - 74, 78, 44, { r, fill: '#8B93A8', hatch: true, hatchGap: 7, strokeWidth: 3 });
  for (const lx of [-64, -34, 16, 44])
    SK.line(ctx, cx + lx, y - 40, cx + lx, y - 2, { r, stroke: '#6E768C', strokeWidth: 9 });
  /* big fluffy tail */
  SK.curve(ctx, [[cx - 84, y - 80], [cx - 120, y - 96], [cx - 116, y - 60], [cx - 130, y - 76]],
    { r, stroke: '#8B93A8', strokeWidth: 14 });
  /* head + snout + ears */
  SK.ellipse(ctx, cx + 74, y - 108, 36, 30, { r, fill: '#8B93A8', strokeWidth: 3 });
  SK.poly(ctx, [[cx + 92, y - 114], [cx + 128, y - 104], [cx + 92, y - 94]], { r, fill: '#8B93A8', strokeWidth: 2.6 });
  SK.circle(ctx, cx + 126, y - 104, 6, { r, fill: INK, stroke: 'none' });
  SK.tri(ctx, cx + 60, y - 134, 20, 22, { r, fill: '#8B93A8', strokeWidth: 2.4 });
  SK.tri(ctx, cx + 84, y - 138, 20, 24, { r, fill: '#8B93A8', strokeWidth: 2.4 });
  whiteEye(ctx, cx + 82, y - 114, 7, 8, r);
  /* huffy breath */
  SK.circle(ctx, cx + 140, y - 100, 5, { r, stroke: '#C9BEC8', strokeWidth: 2 });
  SK.circle(ctx, cx + 152, y - 96, 4, { r, stroke: '#C9BEC8', strokeWidth: 1.8 });
}},

pig: { w: 180, h: 140, cat: 'pig', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 48, 62, 40, { r, fill: '#FF9EBB', hatch: true, hatchGap: 8, strokeWidth: 3 });
  for (const lx of [-36, -10, 18, 44])
    SK.line(ctx, cx + lx, y - 16, cx + lx, y, { r, stroke: '#F58ACB', strokeWidth: 7 });
  SK.circle(ctx, cx + 56, y - 60, 24, { r, fill: '#FF9EBB', strokeWidth: 2.8 });
  SK.ellipse(ctx, cx + 74, y - 56, 12, 9, { r, fill: '#FFC9D9', strokeWidth: 2.2 });
  SK.circle(ctx, cx + 71, y - 56, 1.8, { r, fill: INK, stroke: 'none' });
  SK.circle(ctx, cx + 77, y - 56, 1.8, { r, fill: INK, stroke: 'none' });
  SK.tri(ctx, cx + 44, y - 82, 16, 16, { r, fill: '#FF9EBB', strokeWidth: 2.2 });
  SK.tri(ctx, cx + 62, y - 84, 16, 18, { r, fill: '#FF9EBB', strokeWidth: 2.2 });
  eye(ctx, cx + 60, y - 64, 2.8, r);
  SK.arc(ctx, cx - 62, y - 52, 10, 10, Math.PI * .3, Math.PI * 1.8, { r, stroke: '#F58ACB', strokeWidth: 2.6 });
}},

/* ---------------- sky things ---------------- */
sunprop: { w: 130, h: 130, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    SK.line(ctx, cx + Math.cos(a) * 38, cy + Math.sin(a) * 38,
      cx + Math.cos(a) * (50 + r.rr(0, 8)), cy + Math.sin(a) * (50 + r.rr(0, 8)),
      { r, stroke: '#F0A428', strokeWidth: 3 });
  }
  SK.circle(ctx, cx, cy, 30, { r, fill: '#FFC53D', hatch: true, hatchGap: 5, hatchAngle: 40, strokeWidth: 3 });
  SK.arc(ctx, cx, cy + 6, 12, 9, Math.PI * .15, Math.PI * .85, { r, strokeWidth: 2.2 });
  eye(ctx, cx - 9, cy - 6, 2.6, r); eye(ctx, cx + 9, cy - 6, 2.6, r);
}},

raincloud: { w: 170, h: 150, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  puffCloud(ctx, cx, y - 100, 1.3, r, '#C9D2E0');
  for (const rx of [-34, 0, 34])
    SK.line(ctx, cx + rx, y - 66, cx + rx - 8, y - 30, { r, stroke: '#7FB8E8', strokeWidth: 3 });
}},

starprop: { w: 120, h: 130, cat: 'plain', draw(ctx, w, h, r) {
  SK.star(ctx, w / 2, h / 2, 44, 18, 5, { r, fill: '#FFC53D', strokeWidth: 2.8 });
  SK.arc(ctx, w / 2, h / 2 + 4, 10, 8, Math.PI * .15, Math.PI * .85, { r, strokeWidth: 2 });
  eye(ctx, w / 2 - 8, h / 2 - 6, 2.2, r); eye(ctx, w / 2 + 8, h / 2 - 6, 2.2, r);
}},

moon: { w: 120, h: 130, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, cy = h / 2;
  SK.arc(ctx, cx, cy, 38, 38, Math.PI * .3, Math.PI * 1.7, { r, stroke: '#F4E9C8', strokeWidth: 12 });
  SK.arc(ctx, cx + 8, cy, 34, 34, Math.PI * .35, Math.PI * 1.65, { r, stroke: INK, strokeWidth: 2 });
}},

firefly: { w: 110, h: 110, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, cy = h / 2;
  SK.circle(ctx, cx, cy, 24, { r, stroke: '#E8F75E', strokeWidth: 3 });
  SK.ellipse(ctx, cx - 8, cy - 8, 10, 6, { r, fill: '#FFFDF6', strokeWidth: 1.8 });
  SK.ellipse(ctx, cx + 8, cy - 8, 10, 6, { r, fill: '#FFFDF6', strokeWidth: 1.8 });
  SK.ellipse(ctx, cx, cy + 4, 10, 14, { r, fill: '#8A5E2E', strokeWidth: 2.2 });
  SK.circle(ctx, cx, cy + 14, 5, { r, fill: '#E8F75E', strokeWidth: 1.6 });
}},

/* ---------------- wearables / gear ---------------- */
umbrella: { w: 170, h: 170, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.line(ctx, cx, y - 6, cx, y - 118, { r, stroke: '#8A5E2E', strokeWidth: 5 });
  SK.arc(ctx, cx, y - 4, 12, 10, Math.PI * .15, Math.PI * .95, { r, stroke: '#8A5E2E', strokeWidth: 4 });
  SK.path(ctx, [[cx - 78, y - 96], [cx - 56, y - 142], [cx, y - 152], [cx + 56, y - 142], [cx + 78, y - 96]],
    { r, fill: '#FF6B57', hatch: true, hatchGap: 7, strokeWidth: 3 });
  for (const sx of [-52, -26, 0, 26, 52])
    SK.line(ctx, cx, y - 148, cx + sx, y - 98, { r, stroke: '#C9553F', strokeWidth: 1.8 });
  SK.circle(ctx, cx, y - 154, 4, { r, fill: '#FFC53D', strokeWidth: 1.6 });
}},

hat: { w: 150, h: 100, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 14, 66, 14, { r, fill: '#8A5E2E', strokeWidth: 2.6 });
  SK.path(ctx, [[cx - 34, y - 16], [cx - 30, y - 64], [cx + 30, y - 64], [cx + 34, y - 16]],
    { r, fill: '#A9713F', hatch: true, hatchGap: 6, strokeWidth: 2.8 });
  SK.line(ctx, cx - 32, y - 34, cx + 32, y - 34, { r, stroke: '#FF6B57', strokeWidth: 7 });
}},

leaf: { w: 130, h: 110, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.path(ctx, [[cx - 46, y - 20], [cx - 20, y - 72], [cx + 30, y - 70], [cx + 48, y - 30], [cx + 10, y - 12]],
    { r, fill: '#4FB06D', hatch: true, hatchGap: 6, hatchAngle: -55, strokeWidth: 2.8 });
  SK.curve(ctx, [[cx - 40, y - 22], [cx, y - 40], [cx + 40, y - 34]], { r, stroke: '#2E7A46', strokeWidth: 2.2 });
  SK.line(ctx, cx - 44, y - 18, cx - 56, y + 4, { r, stroke: '#8A5E2E', strokeWidth: 3 });
}},

newspaper: { w: 150, h: 110, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.poly(ctx, [[cx - 64, y - 70], [cx + 40, y - 78], [cx + 64, y - 22], [cx - 40, y - 12]],
    { r, fill: '#FFFDF6', strokeWidth: 2.6 });
  for (let i = 0; i < 4; i++)
    SK.line(ctx, cx - 46 + i * 4, y - 58 + i * 10, cx + 34 + i * 3, y - 64 + i * 10, { r, stroke: '#8B8378', strokeWidth: 1.8 });
  SK.rect(ctx, cx - 56, y - 62, 26, 20, { r, fill: '#C9D2E0', strokeWidth: 1.6 });
}},

bucket: { w: 120, h: 110, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.poly(ctx, [[cx - 42, y - 74], [cx + 42, y - 74], [cx + 32, y], [cx - 32, y]],
    { r, fill: '#B9C4D4', hatch: true, hatchGap: 6, strokeWidth: 2.8 });
  SK.arc(ctx, cx, y - 74, 40, 40, Math.PI * 1.05, Math.PI * 1.95, { r, stroke: '#6E768C', strokeWidth: 3 });
  SK.line(ctx, cx - 44, y - 74, cx + 44, y - 74, { r, stroke: '#6E768C', strokeWidth: 4 });
}},

paperbag: { w: 120, h: 120, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.poly(ctx, [[cx - 42, y], [cx - 46, y - 84], [cx + 42, y - 88], [cx + 44, y]],
    { r, fill: '#D9B98A', hatch: true, hatchGap: 7, strokeWidth: 2.8 });
  SK.line(ctx, cx - 46, y - 70, cx + 44, y - 74, { r, stroke: '#B98A4F', strokeWidth: 2.4 });
  SK.circle(ctx, cx - 12, y - 44, 5, { r, strokeWidth: 2 });
  SK.circle(ctx, cx + 14, y - 44, 5, { r, strokeWidth: 2 });
}},

lantern: { w: 110, h: 150, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.arc(ctx, cx, y - 118, 16, 14, Math.PI * 1.05, Math.PI * 1.95, { r, stroke: '#5A5F6E', strokeWidth: 3 });
  SK.rect(ctx, cx - 30, y - 108, 60, 88, { r, fill: '#FFE9A0', hatch: true, hatchGap: 7, strokeWidth: 2.8 });
  SK.rect(ctx, cx - 36, y - 116, 72, 12, { r, fill: '#5A5F6E', strokeWidth: 2.2 });
  SK.rect(ctx, cx - 36, y - 22, 72, 12, { r, fill: '#5A5F6E', strokeWidth: 2.2 });
  SK.circle(ctx, cx, y - 62, 12, { r, fill: '#FFC53D', strokeWidth: 2 });
}},

torch: { w: 80, h: 160, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.line(ctx, cx, y, cx + 4, y - 100, { r, stroke: '#8A5E2E', strokeWidth: 8 });
  SK.poly(ctx, [[cx - 16, y - 100], [cx - 10, y - 140], [cx + 4, y - 152], [cx + 16, y - 132], [cx + 12, y - 100]],
    { r, fill: '#FF9E57', hatch: true, hatchGap: 5, strokeWidth: 2.6 });
  SK.poly(ctx, [[cx - 7, y - 104], [cx - 3, y - 128], [cx + 6, y - 136], [cx + 9, y - 120], [cx + 7, y - 104]],
    { r, fill: '#FFC53D', stroke: 'none' });
}},

candle: { w: 80, h: 120, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 14, y - 62, 28, 62, { r, fill: '#FFF1D6', strokeWidth: 2.6 });
  SK.line(ctx, cx, y - 62, cx, y - 74, { r, stroke: '#6B4A2A', strokeWidth: 2.4 });
  SK.ellipse(ctx, cx, y - 84, 8, 13, { r, fill: '#FFC53D', strokeWidth: 2.2 });
  SK.ellipse(ctx, cx, y - 82, 3.5, 6.5, { r, fill: '#FF9E57', stroke: 'none' });
}},

matchstick: { w: 70, h: 110, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.line(ctx, cx, y - 10, cx + 8, y - 78, { r, stroke: '#D9B078', strokeWidth: 6 });
  SK.circle(ctx, cx + 9, y - 84, 9, { r, fill: '#FF6B57', strokeWidth: 2.4 });
  SK.ellipse(ctx, cx + 9, y - 98, 7, 11, { r, fill: '#FFC53D', strokeWidth: 2 });
}},

key: { w: 140, h: 80, cat: 'plain', draw(ctx, w, h, r) {
  const cy = h / 2;
  SK.circle(ctx, 34, cy, 22, { r, stroke: '#E8A020', strokeWidth: 7 });
  SK.line(ctx, 56, cy, 126, cy, { r, stroke: '#E8A020', strokeWidth: 7 });
  SK.line(ctx, 108, cy, 108, cy + 18, { r, stroke: '#E8A020', strokeWidth: 6 });
  SK.line(ctx, 124, cy, 124, cy + 14, { r, stroke: '#E8A020', strokeWidth: 6 });
}},

wand: { w: 130, h: 130, cat: 'wear', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.line(ctx, cx - 30, y - 8, cx + 30, y - 96, { r, stroke: '#6B4A2A', strokeWidth: 6 });
  SK.star(ctx, cx + 32, y - 104, 22, 9, 5, { r, fill: '#FFC53D', strokeWidth: 2.4 });
  SK.circle(ctx, cx + 56, y - 118, 2.6, { r, fill: '#B565D8', stroke: 'none' });
  SK.circle(ctx, cx + 14, y - 122, 2.2, { r, fill: '#5DA9E9', stroke: 'none' });
}},

/* ---------------- food & treasure ---------------- */
cookiejar: { w: 140, h: 150, cat: 'eat', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 60, 52, 52, { r, fill: '#C7E6FA', fillOpacity: .6, strokeWidth: 3 });
  SK.rect(ctx, cx - 40, y - 122, 80, 16, { r, fill: '#8A5E2E', strokeWidth: 2.4 });
  SK.circle(ctx, cx, y - 124, 7, { r, fill: '#6B4A2A', strokeWidth: 1.8 });
  for (const [ox, oy] of [[-20, -46], [8, -62], [24, -38], [-6, -30]])
    SK.circle(ctx, cx + ox, y + oy, 12, { r, fill: '#C9A06B', strokeWidth: 2 });
  for (const [ox, oy] of [[-20, -46], [8, -62], [24, -38], [-6, -30]]) {
    SK.circle(ctx, cx + ox - 3, y + oy - 3, 1.8, { r, fill: '#6B4A2A', stroke: 'none' });
    SK.circle(ctx, cx + ox + 4, y + oy + 3, 1.8, { r, fill: '#6B4A2A', stroke: 'none' });
  }
}},

gift: { w: 140, h: 130, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 52, y - 78, 104, 78, { r, fill: '#5DA9E9', hatch: true, hatchGap: 8, strokeWidth: 3 });
  SK.line(ctx, cx, y - 78, cx, y, { r, stroke: '#FFC53D', strokeWidth: 9 });
  SK.line(ctx, cx - 52, y - 44, cx + 52, y - 44, { r, stroke: '#FFC53D', strokeWidth: 9 });
  SK.arc(ctx, cx - 14, y - 90, 14, 10, Math.PI * .9, Math.PI * 2.1, { r, stroke: '#FFC53D', strokeWidth: 5 });
  SK.arc(ctx, cx + 14, y - 90, 14, 10, Math.PI * .9, Math.PI * 2.1, { r, stroke: '#FFC53D', strokeWidth: 5 });
}},

chest: { w: 180, h: 140, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 74, y - 66, 148, 66, { r, fill: '#A9713F', hatch: true, hatchGap: 7, strokeWidth: 3 });
  SK.path(ctx, [[cx - 74, y - 66], [cx - 70, y - 104], [cx + 70, y - 104], [cx + 74, y - 66]],
    { r, fill: '#8A5E2E', hatch: true, hatchGap: 6, strokeWidth: 3 });
  SK.rect(ctx, cx - 12, y - 74, 24, 22, { r, fill: '#E8A020', strokeWidth: 2.4 });
  for (const gx of [-36, 8]) {
    SK.circle(ctx, cx + gx, y - 62, 5, { r, fill: '#FFC53D', stroke: 'none' });
    SK.circle(ctx, cx + gx + 12, y - 58, 4, { r, fill: '#5DA9E9', stroke: 'none' });
  }
}},

/* ---------------- slips & sillies ---------------- */
peel: { w: 120, h: 90, cat: 'slip', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 12, 16, 10, { r, fill: '#FFE08A', strokeWidth: 2.4 });
  for (const [a, len] of [[-.5, 44], [-2.2, 40], [2.6, 42]]) {
    const ex = cx + Math.cos(a) * len, ey = y - 12 + Math.sin(a) * len * .7 - 12;
    SK.path(ctx, [[cx, y - 14], [cx + Math.cos(a) * len * .5, y - 26], [ex, ey]],
      { r, stroke: '#FFC53D', strokeWidth: 9 });
    SK.path(ctx, [[cx, y - 14], [cx + Math.cos(a) * len * .5, y - 26], [ex, ey]],
      { r, stroke: INK, strokeWidth: 2 });
  }
  SK.line(ctx, cx, y - 18, cx + 3, y - 34, { r, stroke: '#8A5E2E', strokeWidth: 4 });
}},

soap: { w: 130, h: 90, cat: 'slip', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 48, y - 34, 96, 32, { r, fill: '#C7E6FA', hatch: true, hatchGap: 7, strokeWidth: 2.8, bow: 8 });
  for (const [ox, oy, rr2] of [[-30, -48, 8], [0, -56, 11], [30, -46, 7], [16, -38, 5]])
    SK.circle(ctx, cx + ox, y + oy, rr2, { r, fill: '#EAF6FF', strokeWidth: 1.8 });
}},

slime: { w: 170, h: 80, cat: 'slip', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.path(ctx, [[cx - 76, y - 4], [cx - 60, y - 34], [cx - 26, y - 26], [cx - 10, y - 46],
    [cx + 24, y - 38], [cx + 52, y - 30], [cx + 76, y - 6], [cx - 76, y - 4]],
    { r, fill: '#9BE26B', fillOpacity: .85, hatch: true, hatchGap: 8, strokeWidth: 2.8 });
  SK.circle(ctx, cx - 20, y - 52, 8, { r, fill: '#9BE26B', strokeWidth: 2 });
  SK.circle(ctx, cx + 40, y - 44, 5, { r, fill: '#9BE26B', strokeWidth: 1.8 });
  SK.circle(ctx, cx + 4, y - 24, 4, { r, fill: '#6FBF44', stroke: 'none' });
}},

mud: { w: 180, h: 70, cat: 'slip', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 12, 82, 22, { r, fill: '#8A5E2E', hatch: true, hatchGap: 8, hatchAngle: -10, strokeWidth: 2.8 });
  SK.ellipse(ctx, cx - 20, y - 14, 30, 8, { r, fill: '#6B4A2A', stroke: 'none' });
  SK.ellipse(ctx, cx + 36, y - 10, 22, 6, { r, fill: '#6B4A2A', stroke: 'none' });
  SK.circle(ctx, cx - 66, y - 30, 5, { r, fill: '#8A5E2E', strokeWidth: 1.8 });
  SK.circle(ctx, cx + 70, y - 26, 4, { r, fill: '#8A5E2E', strokeWidth: 1.8 });
}},

puddle: { w: 190, h: 60, cat: 'slip', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 8, 88, 18, { r, fill: '#8FD0F2', hatch: true, hatchGap: 8, hatchAngle: 0, strokeWidth: 2.6 });
  SK.line(ctx, cx - 40, y - 10, cx - 8, y - 12, { r, stroke: '#C4E7FB', strokeWidth: 3 });
  SK.line(ctx, cx + 16, y - 8, cx + 52, y - 10, { r, stroke: '#C4E7FB', strokeWidth: 2.4 });
}},

toaster: { w: 140, h: 110, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 56, y - 66, 112, 66, { r, fill: '#B9C4D4', hatch: true, hatchGap: 7, strokeWidth: 3, bow: 6 });
  SK.line(ctx, cx - 30, y - 66, cx - 30, y - 78, { r, stroke: INK, strokeWidth: 5 });
  SK.line(ctx, cx + 10, y - 66, cx + 10, y - 78, { r, stroke: INK, strokeWidth: 5 });
  SK.rect(ctx, cx - 40, y - 90, 20, 14, { r, fill: '#D9B078', strokeWidth: 2 });
  SK.rect(ctx, cx, y - 90, 20, 14, { r, fill: '#D9B078', strokeWidth: 2 });
  SK.line(ctx, cx + 62, y - 52, cx + 72, y - 52, { r, stroke: '#5A5F6E', strokeWidth: 4 });
}},

fridge: { w: 160, h: 210, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 66, y - 190, 132, 190, { r, fill: '#C7E6FA', hatch: true, hatchGap: 9, strokeWidth: 3.4, bow: 4 });
  SK.line(ctx, cx - 66, y - 120, cx + 66, y - 120, { r, strokeWidth: 2.6 });
  SK.line(ctx, cx + 44, y - 172, cx + 44, y - 138, { r, stroke: '#5A8FB8', strokeWidth: 6 });
  SK.line(ctx, cx + 44, y - 100, cx + 44, y - 60, { r, stroke: '#5A8FB8', strokeWidth: 6 });
  SK.rect(ctx, cx - 50, y - 100, 26, 20, { r, fill: '#FF6B57', strokeWidth: 1.8 });
  SK.circle(ctx, cx + 20, y - 160, 8, { r, fill: '#FFC53D', strokeWidth: 1.8 });
}},

anvil: { w: 170, h: 120, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.poly(ctx, [[cx - 76, y - 66], [cx - 20, y - 66], [cx - 20, y - 40], [cx + 20, y - 40], [cx + 20, y - 66], [cx + 60, y - 66], [cx + 76, y - 52], [cx + 44, y - 40], [cx + 30, y - 40], [cx + 30, y - 18], [cx + 44, y], [cx - 44, y], [cx - 30, y - 18], [cx - 30, y - 40]],
    { r, fill: '#6E768C', hatch: true, hatchGap: 7, strokeWidth: 3 });
}},

piano: { w: 190, h: 140, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 82, y - 96, 164, 96, { r, fill: '#4A3A30', hatch: true, hatchGap: 8, strokeWidth: 3.2 });
  SK.rect(ctx, cx - 74, y - 62, 148, 34, { r, fill: '#FFFDF6', strokeWidth: 2.4 });
  for (let i = 0; i < 8; i++)
    SK.line(ctx, cx - 60 + i * 18, y - 62, cx - 60 + i * 18, y - 30, { r, strokeWidth: 1.6 });
  for (const bx of [-46, -10, 26])
    SK.rect(ctx, cx + bx, y - 62, 9, 18, { r, fill: INK, stroke: 'none' });
  SK.curve(ctx, [[cx - 40, y - 106], [cx - 30, y - 114], [cx - 20, y - 106]], { r, stroke: '#FFC53D', strokeWidth: 2.4 });
  SK.curve(ctx, [[cx + 20, y - 106], [cx + 30, y - 114], [cx + 40, y - 106]], { r, stroke: '#FFC53D', strokeWidth: 2.4 });
}},

tv: { w: 150, h: 140, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.line(ctx, cx - 16, y - 96, cx - 40, y - 130, { r, stroke: '#5A5F6E', strokeWidth: 3 });
  SK.line(ctx, cx + 16, y - 96, cx + 40, y - 130, { r, stroke: '#5A5F6E', strokeWidth: 3 });
  SK.circle(ctx, cx - 42, y - 132, 4, { r, fill: '#5A5F6E', stroke: 'none' });
  SK.circle(ctx, cx + 42, y - 132, 4, { r, fill: '#5A5F6E', stroke: 'none' });
  SK.rect(ctx, cx - 62, y - 96, 124, 96, { r, fill: '#8B93A8', hatch: true, hatchGap: 8, strokeWidth: 3 });
  SK.rect(ctx, cx - 48, y - 84, 80, 64, { r, fill: '#C7E6FA', strokeWidth: 2.4 });
  SK.curve(ctx, [[cx - 40, y - 62], [cx - 20, y - 50], [cx - 2, y - 64]], { r, stroke: '#8FD0F2', strokeWidth: 3 });
  SK.circle(ctx, cx + 48, y - 70, 6, { r, fill: '#FFC53D', strokeWidth: 2 });
  SK.circle(ctx, cx + 48, y - 50, 6, { r, fill: '#FF6B57', strokeWidth: 2 });
}},

sock: { w: 110, h: 130, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.path(ctx, [[cx - 18, y - 108], [cx + 26, y - 108], [cx + 26, y - 46], [cx + 44, y - 28],
    [cx + 40, y - 6], [cx + 8, y - 4], [cx - 14, y - 20], [cx - 18, y - 44], [cx - 18, y - 108]],
    { r, fill: '#E8DDF5', hatch: true, hatchGap: 7, strokeWidth: 2.8 });
  SK.line(ctx, cx - 18, y - 92, cx + 26, y - 92, { r, stroke: '#B565D8', strokeWidth: 5 });
  SK.line(ctx, cx - 18, y - 78, cx + 26, y - 78, { r, stroke: '#B565D8', strokeWidth: 3 });
}},

toast: { w: 110, h: 110, cat: 'eat', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.path(ctx, [[cx - 38, y], [cx - 38, y - 62], [cx - 34, y - 92], [cx - 12, y - 96],
    [cx - 6, y - 88], [cx + 6, y - 88], [cx + 12, y - 96], [cx + 34, y - 92], [cx + 38, y - 62], [cx + 38, y]],
    { r, fill: '#E8B94B', hatch: true, hatchGap: 6, strokeWidth: 2.8 });
  SK.rect(ctx, cx - 26, y - 60, 52, 44, { r, fill: '#D9A94B', stroke: 'none' });
  SK.circle(ctx, cx - 8, y - 40, 4, { r, fill: '#FFF6C9', stroke: 'none' });
}},

pickle: { w: 80, h: 140, cat: 'eat', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 60, 26, 62, { r, fill: '#6FA84E', hatch: true, hatchGap: 6, hatchAngle: -70, strokeWidth: 3 });
  for (let i = 0; i < 6; i++)
    SK.circle(ctx, cx + r.rr(-12, 12), y - r.rr(20, 100), 3.2, { r, fill: '#8FCB6E', strokeWidth: 1.4 });
}},

sponge: { w: 120, h: 90, cat: 'bonk', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.rect(ctx, cx - 48, y - 58, 96, 58, { r, fill: '#FFE08A', hatch: true, hatchGap: 8, strokeWidth: 2.8, bow: 7 });
  for (let i = 0; i < 7; i++)
    SK.circle(ctx, cx + r.rr(-34, 34), y - r.rr(12, 46), r.rr(3, 6), { r, fill: '#E8C24B', stroke: 'none' });
}},

barrel: { w: 130, h: 130, cat: 'ride', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 58, 50, 60, { r, fill: '#A9713F', hatch: true, hatchGap: 7, strokeWidth: 3 });
  SK.line(ctx, cx - 48, y - 84, cx + 48, y - 84, { r, stroke: '#5A5F6E', strokeWidth: 4 });
  SK.line(ctx, cx - 50, y - 34, cx + 50, y - 34, { r, stroke: '#5A5F6E', strokeWidth: 4 });
  for (const lx of [-20, 0, 20])
    SK.line(ctx, cx + lx, y - 116, cx + lx, y, { r, stroke: '#8A5E2E', strokeWidth: 2 });
}},

nest: { w: 140, h: 90, cat: 'plain', draw(ctx, w, h, r) {
  const cx = w / 2, y = h - 8;
  SK.ellipse(ctx, cx, y - 20, 58, 22, { r, fill: '#B98A4F', hatch: true, hatchGap: 5, hatchAngle: -30, strokeWidth: 2.6 });
  SK.ellipse(ctx, cx, y - 28, 44, 14, { r, fill: '#6B4A2A', strokeWidth: 2 });
  for (const ex of [-18, 2, 20])
    SK.ellipse(ctx, cx + ex, y - 36, 12, 15, { r, fill: '#C7E6FA', strokeWidth: 2 });
}},

/* ---------------- the catch-all doodle: ANY word gets a sketch ---------------- */
doodle: { w: 190, h: 160, cat: 'plain', draw(ctx, w, h, r, word) {
  const cx = w / 2, y = h - 8;
  /* a friendly mystery blob */
  SK.ellipse(ctx, cx, y - 62, 66, 52, { r, fill: '#DCC3F2', hatch: true, hatchGap: 7, strokeWidth: 3 });
  whiteEye(ctx, cx - 20, y - 72, 10, 12, r);
  whiteEye(ctx, cx + 22, y - 70, 8, 10, r);
  SK.arc(ctx, cx, y - 52, 16, 12, Math.PI * .2, Math.PI * .8, { r, strokeWidth: 3 });
  /* question-spark antennae */
  SK.line(ctx, cx - 6, y - 112, cx - 10, y - 130, { r, strokeWidth: 2.4 });
  SK.line(ctx, cx + 8, y - 112, cx + 14, y - 128, { r, strokeWidth: 2.4 });
  SK.text(ctx, '?', cx - 11, y - 140, { size: 20, fill: '#B565D8' });
  SK.text(ctx, '?', cx + 16, y - 138, { size: 16, fill: '#5DA9E9' });
  /* sparkle frame */
  SK.star(ctx, cx - 66, y - 116, 9, 4, 5, { r, fill: '#FFC53D', strokeWidth: 1.4 });
  SK.star(ctx, cx + 70, y - 30, 7, 3, 5, { r, fill: '#FF9EBB', strokeWidth: 1.2 });
  /* the word itself, hand-lettered inside */
  SK.text(ctx, String(word || 'thing').slice(0, 16), cx, y - 60,
    { size: 19, weight: 700, fill: INK });
}},
};

window.PROPS = PROPS;

/* ============================================================
   KIND RESOLVER — arbitrary LLM word → catalog def + gag class
   ============================================================ */
const KIND_ALIASES = {
  'straw house': 'strawhouse', 'house of straw': 'strawhouse', 'hay house': 'strawhouse',
  'straw hut': 'strawhouse', 'hut': 'strawhouse',
  'stick house': 'stickhouse', 'house of sticks': 'stickhouse', 'wood house': 'stickhouse',
  'wooden house': 'stickhouse', 'twig house': 'stickhouse', 'log cabin': 'stickhouse', 'cabin': 'stickhouse',
  'brick house': 'brickhouse', 'house of bricks': 'brickhouse', 'brick home': 'brickhouse',
  'strong house': 'brickhouse', 'safe house': 'brickhouse',
  'house': 'cottage', 'cottage': 'cottage', 'home': 'cottage', 'birdhouse': 'cottage',
  'tent': 'tent', 'teepee': 'tent', 'wall': 'cottage', 'brick wall': 'brickhouse',
  'door': 'cottage', 'shelter': 'cottage',
  /* the wolf & pigs */
  'wolf': 'wolf', 'big bad wolf': 'wolf', 'the wolf': 'wolf', 'bad wolf': 'wolf',
  'pig': 'pig', 'piggy': 'pig', 'little pig': 'pig', 'piglet': 'pig', 'friend': 'pig',
  'pig friend': 'pig', 'sibling': 'pig', 'brother': 'pig', 'sister': 'pig',
  /* materials */
  'straw': 'strawpile', 'straw pile': 'strawpile', 'hay': 'hay', 'haystack': 'strawpile',
  'hay bale': 'hay', 'bale': 'hay',
  'stick': 'stickpile', 'sticks': 'stickpile', 'twigs': 'stickpile', 'twig': 'stickpile',
  'wood': 'stickpile', 'sticks pile': 'stickpile', 'pile of sticks': 'stickpile',
  'firewood': 'stickpile', 'lumber': 'stickpile', 'branches': 'stickpile',
  'brick': 'brickpile', 'bricks': 'brickpile', 'brick pile': 'brickpile',
  'pile of bricks': 'brickpile', 'red bricks': 'brickpile',
  'log': 'log', 'plank': 'plank', 'board': 'plank',
  'stone': 'stones', 'stones': 'stones', 'stepping stones': 'stones', 'rock pile': 'stones',
  'rock': 'rock', 'boulder': 'rock',
  /* crossings & rides */
  'bridge': 'bridge', 'rope bridge': 'bridge', 'ladder': 'ladder',
  'boat': 'boat', 'sailboat': 'boat', 'rowboat': 'boat', 'ship': 'boat', 'canoe': 'boat',
  'kayak': 'boat', 'raft': 'raft', 'barrel': 'barrel',
  'duck': 'duck', 'fish': 'fish', 'big fish': 'fish', 'turtle': 'turtle', 'tortoise': 'turtle',
  'unicorn': 'unicorn', 'pegasus': 'unicorn', 'pony': 'pony', 'horse': 'pony',
  'dragon': 'dragon', 'dinosaur': 'dragon', 'dino': 'dragon',
  /* weather & sky */
  'rain': 'raincloud', 'rain cloud': 'raincloud', 'cloud': 'raincloud', 'storm cloud': 'raincloud',
  'sun': 'sunprop', 'moon': 'moon', 'star': 'starprop', 'stars': 'starprop',
  'shooting star': 'starprop', 'balloon': 'starprop', 'firefly': 'firefly',
  'fireflies': 'firefly', 'lightning bug': 'firefly',
  /* gear */
  'umbrella': 'umbrella', 'rain hat': 'hat', 'hat': 'hat', 'cap': 'hat',
  'leaf': 'leaf', 'leaf hat': 'leaf', 'newspaper': 'newspaper', 'paper': 'newspaper',
  'mushroom': 'mushroom', 'toadstool': 'mushroom', 'bucket': 'bucket', 'pail': 'bucket',
  'paper bag': 'paperbag', 'bag': 'paperbag', 'sack': 'paperbag',
  'lantern': 'lantern', 'lamp': 'lantern', 'torch': 'torch', 'candle': 'candle',
  'match': 'matchstick', 'matches': 'matchstick', 'flashlight': 'lantern', 'light': 'lantern',
  'wand': 'wand', 'magic wand': 'wand', 'key': 'key',
  /* slips & sillies */
  'banana peel': 'peel', 'banana': 'peel', 'peel': 'peel', 'soap': 'soap',
  'ice': 'soap', 'ice cube': 'soap', 'slime': 'slime', 'slime puddle': 'slime',
  'glue': 'slime', 'mud': 'mud', 'mud puddle': 'mud', 'puddle': 'puddle', 'pond': 'puddle',
  'toaster': 'toaster', 'fridge': 'fridge', 'refrigerator': 'fridge',
  'anvil': 'anvil', 'piano': 'piano', 'tv': 'tv', 'television': 'tv',
  'toast': 'toast', 'sponge': 'sponge', 'sock': 'sock', 'pickle': 'pickle',
  /* nature & items */
  'tree': 'tree', 'pine': 'pinetree', 'pine tree': 'pinetree', 'oak': 'tree', 'bush': 'bush',
  'flower': 'flower', 'flowers': 'flower', 'nest': 'nest',
  'cookie jar': 'cookiejar', 'cookie': 'cookiejar', 'cookies': 'cookiejar', 'jar': 'cookiejar',
  'snack': 'cookiejar', 'gift': 'gift', 'present': 'gift',
  'treasure': 'chest', 'treasure chest': 'chest', 'chest': 'chest',
};

/* words we treat as slippery no matter what */
const SLIP_KINDS = new Set(['peel', 'soap', 'slime', 'mud', 'puddle']);
const SILLY_KINDS = new Set(['toast', 'sponge', 'sock', 'pickle', 'doodle', 'toaster',
  'fridge', 'anvil', 'piano', 'tv']);

function stripArt(w) {
  return w.replace(/^(a|an|the|some|my|our|your|his|her|its|one|two|three|big|little|small)\s+/i, '');
}
function resolveKind(raw) {
  const w = String(raw || '').toLowerCase().trim().replace(/[\s_-]+/g, ' ').replace(/[^\w ']/g, '');
  if (!w) return { def: 'doodle', word: raw || 'thing' };
  if (KIND_ALIASES[w]) return { def: KIND_ALIASES[w], word: w };
  const clean = stripArt(w);
  if (KIND_ALIASES[clean]) return { def: KIND_ALIASES[clean], word: w };
  const sing = clean.replace(/s$/, '');
  if (KIND_ALIASES[sing]) return { def: KIND_ALIASES[sing], word: w };
  for (const key of Object.keys(KIND_ALIASES)) {
    if (clean.endsWith(' ' + key) || clean === key || sing === key || sing.endsWith(' ' + key))
      return { def: KIND_ALIASES[key], word: w };
  }
  if (/straw|hay/.test(w) && /house|home|hut/.test(w)) return { def: 'strawhouse', word: w };
  if (/stick|wood|twig|log/.test(w) && /house|home|cabin/.test(w)) return { def: 'stickhouse', word: w };
  if (/brick|stone|strong/.test(w) && /house|home|wall/.test(w)) return { def: 'brickhouse', word: w };
  if (/wolf/.test(w)) return { def: 'wolf', word: w };
  if (/pig/.test(w)) return { def: 'pig', word: w };
  if (/house|home/.test(w)) return { def: 'cottage', word: w };
  return { def: 'doodle', word: w };   /* ANY word still draws something */
}

/* gag class for a raw LLM kind-word */
function propClass(raw) {
  const res = resolveKind(raw);
  const def = PROPS[res.def];
  return (def && def.cat) || 'plain';
}
function propScale(def, W) {
  const base = def.w > 280 ? .62 : def.w > 170 ? .78 : def.w > 110 ? .9 : 1;
  return base * Math.max(.78, Math.min(1.12, W / 900));
}

window.resolveKind = resolveKind;
window.propClass = propClass;
window.propScale = propScale;
window.SLIP_KINDS = SLIP_KINDS;
window.SILLY_KINDS = SILLY_KINDS;
})();
