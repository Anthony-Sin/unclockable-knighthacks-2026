#!/usr/bin/env node
/* b5-render-node.mjs — node-level probes for the wave-5 render angles.
   Real THREE r170 (node_modules == vendored), real modules under test.
   Run: node .teamwork/qe/b5-render-node.mjs   → JSON to stdout. */
import * as THREE from '../../spatial-objects/node_modules/three/build/three.module.js';
import { buildScene } from '../../spatial-objects/shared/boxing/scene.js';
import { makeFx } from '../../spatial-objects/shared/boxing/fx.js';
import { entranceSign } from '../../spatial-objects/shared/boxing/entrance.js';
import * as mitt from '../../spatial-objects/shared/boxing/mitts/classic.js';
import { setTimeout as delay } from 'node:timers/promises';

const out = { tool: 'b5-render-node', startedAt: new Date().toISOString(), checks: [] };
const check = (name, pass, detail = '') =>
  out.checks.push({ name, pass: !!pass, detail: String(detail).slice(0, 300) });

const FIGHT = { phase: 'fighting', npc: { action: 'idle' } };

/* ---------- 1 · cornerHold freeze: crowd wall-clock, hit-state settles ---- */
{
  const w = buildScene(THREE);
  const crowd = w.ring.crowd;
  const yOf = i => crowd.instanceMatrix.array[i * 16 + 13];
  // warm up real frames first (crowdFrame parity + wallT0 init)
  for (let i = 0; i < 6; i++) { w.update(1 / 60, { fight: FIGHT }); await delay(8); }

  /* frozen frames: freeze the wall clock exactly — update(0) must move the
     crowd ONLY by real elapsed time, nothing per-call. Then release the
     clock: 150ms of real hold must visibly advance the bob. (parity: crowd
     rewrites on every OTHER call — call in pairs so a write lands in each
     window.) */
  const realNow = performance.now.bind(performance);
  const frozenAt = realNow();          // freeze at NOW — restoring must not
  let frozen = 0;                      // leave wallT0 ahead of the real clock
  try {
    performance.now = () => frozenAt;
    w.update(0, { fight: FIGHT }); w.update(0, { fight: FIGHT });   // absorb wdt clamp
    const s0 = yOf(0) + yOf(37) + yOf(101);
    w.update(0, { fight: FIGHT }); w.update(0, { fight: FIGHT });
    const s1 = yOf(0) + yOf(37) + yOf(101);
    frozen = s1;
    check('freeze: crowd static while wall clock frozen (no per-call drift)',
      s1 === s0, `Σy ${s0}→${s1}`);
  } finally { performance.now = realNow; }
  await delay(150);
  w.update(0, { fight: FIGHT }); w.update(0, { fight: FIGHT });
  const s2 = yOf(0) + yOf(37) + yOf(101);
  check('freeze: crowd keeps animating wall-clock during dt=0',
    Math.abs(s2 - frozen) > 1e-4, `Σy ${frozen.toFixed(5)}→${s2.toFixed(5)} after 150ms real hold`);

  /* hit jolt must SETTLE during the freeze, not hold a displaced rope pose:
     bump jolt via an event on a live frame, then hold dt=0 — the rope keeps
     oscillating on wall time (sample across the 26rad/s cycle) and decays
     back to rest inside ~1s instead of freezing mid-shake. */
  w.update(1 / 60, { fight: FIGHT, events: ['player-hit'] });
  const rope = w.ring.ropes[0], y0 = rope.userData.y0;
  let maxOff = 0;
  for (let i = 0; i < 14; i++) {
    await delay(80); w.update(0, { fight: FIGHT });
    maxOff = Math.max(maxOff, Math.abs(rope.position.y - y0));
  }
  const settled = Math.abs(rope.position.y - y0);
  check('freeze: rope jolt oscillates then settles during hold',
    maxOff > .005 && settled < .002, `peakOff=${maxOff.toFixed(4)} settled=${settled.toFixed(4)}`);

  /* telegraph glow stuck mid-charge when the hold starts must ease out —
     simulate windup on a live frame, then hold. */
  const HOT = { phase: 'fighting', npc: { action: 'windup' } };
  for (let i = 0; i < 10; i++) { w.update(1 / 60, { fight: HOT }); await delay(8); }
  const spot = w.ring.spot, hot = spot.intensity;
  for (let i = 0; i < 12; i++) { await delay(40); w.update(0, { fight: FIGHT }); }
  const cold = spot.intensity;
  check('freeze: telegraph spot eases back during hold',
    hot > cold && Math.abs(cold - 90) < 30, `spot ${hot.toFixed(1)}→${cold.toFixed(1)}`);

  /* payoff deferral: a 'ko' event on a FROZEN frame must not birth confetti
     that survives the hold — it fires on the first live frame instead. */
  w.update(0, { fight: { phase: 'npcdown', npc: { action: 'down' } }, events: ['ko'] });
  check('freeze: ko event on dt=0 births no confetti mid-freeze',
    !w.scene.children.find(o => o.isInstancedMesh && o.count === 90).visible, '');
  w.update(1 / 60, { fight: { phase: 'npcdown', npc: { action: 'down' } } });
  check('freeze: deferred payoff fires on first live frame',
    w.scene.children.find(o => o.isInstancedMesh && o.count === 90).visible, '');
  // and while frozen, confetti positions must not advance
  const confetti = w.scene.children.find(o => o.isInstancedMesh && o.count === 90);
  const cy = () => confetti.instanceMatrix.array[13];
  w.update(1 / 60, { fight: FIGHT }); await delay(20);
  const c0 = cy(); w.update(0, { fight: FIGHT }); w.update(0, { fight: FIGHT });
  check('freeze: live confetti does not advance under dt=0', cy() === c0, `y=${cy()}`);

  w.dispose(); w.dispose();   // idempotent
  check('scene dispose idempotent', true, 'two calls, no throw');
}

/* ---------- 2 · fx pool freeze ------------------------------------------ */
{
  const scene = new THREE.Scene();
  const fx = makeFx(THREE, scene, null);
  const pos = new THREE.Vector3(0, 1.2, 0);
  fx.burst(pos, { color: 'blood', n: 12 });
  const sprites = scene.children.filter(o => o.isSprite);
  const on = sprites.filter(s => s.visible);
  const p0 = on.map(s => [s.position.x, s.position.y, s.position.z, s.material.opacity]);
  fx.update(0); fx.update(0);                      // frozen frames
  const p1 = on.map(s => [s.position.x, s.position.y, s.position.z, s.material.opacity]);
  check('fx: sprites fully frozen under dt=0 (no drift)',
    JSON.stringify(p0) === JSON.stringify(p1), `${on.length} live sprites`);
  const nStains0 = scene.children.filter(o => o.isMesh && o.visible).length;
  fx.update(0);
  check('fx: no sprite/stain born under dt=0',
    scene.children.filter(o => o.isMesh && o.visible).length === nStains0, '');
  fx.update(1 / 60);                                // resumes
  check('fx: sprites resume falling after freeze',
    on.some((s, i) => s.position.y !== p1[i][1]), '');
  await delay(900); fx.update(1.5);                 // giant dt drains all
  check('fx: pool fully drains on huge dt',
    sprites.every(s => !s.visible), '');
  fx.dispose();
  check('fx dispose empties scene', scene.children.length === 0, `${scene.children.length} left`);
}

/* ---------- 3 · entranceSign: garbage in, enum out ----------------------- */
{
  const ENUM = new Set(['hype', 'ready', 'point', 'victory', 'wave', 'idle']);
  const cases = [null, undefined, 42, 'x', {}, { hands: null }, { hands: 'no' },
    { hands: [null, undefined, 0] }, { hands: [{ kind: 'palm' }, { kind: NaN }] },
    { hands: [{ kind: 'other', nExt: NaN }] }, { hands: [{ kind: 'other', nExt: 2 }] },
    { hands: new Array(50).fill({ kind: 'fist' }) },
    { hands: [{ kind: '__proto__', nExt: 2 }, { kind: 'palm', side: 'x' }] }];
  let bad = 0;
  for (const c of cases) { try { if (!ENUM.has(entranceSign(c))) bad++; } catch { bad++; } }
  for (let i = 0; i < 500; i++) {
    const hands = Array.from({ length: (Math.random() * 4) | 0 }, () => ({
      kind: ['palm', 'fist', 'point', 'other', 'junk', undefined][(Math.random() * 6) | 0],
      nExt: [0, 1, 2, NaN, 'x', {}][(Math.random() * 6) | 0] }));
    if (!ENUM.has(entranceSign({ hands }))) bad++;
  }
  check('entranceSign: 500+ garbage inputs all land in the enum', bad === 0, `${bad} escapes`);
}

/* ---------- 4 · mitt under context pressure ----------------------------- */
{
  /* stub ctx: records ops, state vars, save/restore depth; faults at call N */
  const mkCtx = (failAt = -1) => {
    let calls = 0, depth = 0, maxDepth = 0;
    const st = { calls, depth: () => depth, maxDepth: () => maxDepth,
      globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1,
      threw: false, ops: [] };
    const ctx = new Proxy({}, {
      get(t, k) {
        if (k === '__st') return st;
        if (k === 'roundRect') return t.__rr ??= function () { };
        if (typeof k !== 'string') return undefined;
        if (k === 'save') return () => { depth++; maxDepth = Math.max(maxDepth, depth); st.ops.push('save'); };
        if (k === 'restore') return () => { depth--; st.ops.push('restore'); };
        if (k === 'canvas') return { width: 300, height: 300 };
        return function () {
          st.ops.push(k);
          if (++calls === failAt) { st.threw = true; throw new Error('ctx boom@' + k); }
        };
      },
      set(t, k, v) { return true; },
    });
    return ctx;
  };

  let fails = 0, notes = [];
  // fault inject at EVERY ctx call index — save/restore must balance
  for (const variant of ['plain', 'arm', 'lm']) {
    for (let at = 1; at < 150; at++) {
      const ctx = mkCtx(at);
      const o = variant === 'arm' ? { arm: { x: 10, y: 10 } }
        : variant === 'lm' ? { lm: Array.from({ length: 21 }, (_, i) => ({ x: i * 3, y: i * 2 })) } : {};
      try { mitt.draw(ctx, { x: 100, y: 100, size: 60, ang: .3 }, o); }
      catch { /* throw is allowed — leaked state is not */ }
      if (ctx.__st.depth() !== 0) { fails++; notes.push(`${variant}@${at}:depth${ctx.__st.depth()}`); if (fails > 4) break; }
    }
  }
  check('mitt: save/restore depth 0 after throw at every one of ~150 ops ×3 paths',
    fails === 0, notes.join(';') || 'clean');

  // missing roundRect → falls back to rect and completes
  {
    const ctx = mkCtx(); let usedRect = false;
    const spy = new Proxy(ctx, { get(t, k) { if (k === 'roundRect') return undefined;
      if (k === 'rect') return () => { usedRect = true; }; return t[k]; } });
    mitt.draw(spy, { x: 50, y: 50, size: 40, ang: 0 }, {});
    check('mitt: no roundRect → rect fallback, draw completes', usedRect, '');
  }
  // missing ctx entirely → no-op, no throw
  {
    let threw = false;
    try { mitt.draw(null, { x: 1, y: 1, size: 10, ang: 0 }, {});
      mitt.draw(undefined, null, {}); mitt.draw(0, { x: 0, y: 0 }, {});
      mitt.draw({ save: 'not-a-fn' }, { x: 1, y: 1 }, {}); } catch { threw = true; }
    check('mitt: gutted/null ctx is a no-op, never throws', !threw, '');
  }
  // hostile everything
  {
    const ctx = mkCtx(); let threw = false;
    try {
      for (const [p, o] of [
        [{ x: NaN, y: 0, size: 60, ang: 0 }, {}],
        [{ x: 1e308, y: -1e308, size: 60, ang: Infinity }, {}],
        [{ x: 0, y: 0, size: -9, ang: NaN }, { cap: 0, dim: 99, squash: 40 }],
        [{ x: 0, y: 0, size: 60, ang: 0 }, { arm: { x: Infinity, y: 0 } }],
        [{ x: 0, y: 0, size: 60, ang: 0 }, { lm: [{ x: 0, y: 0 }] }],
        [{ x: 0, y: 0, size: 60, ang: 0 }, { lm: Array.from({ length: 21 }, () => ({ x: 1e305, y: 0 })) }],
        [{ x: 0, y: 0, size: 1e308, ang: 0 }, {}],
        [{ x: 40, y: 40, size: 60, ang: 0 }, null],          // explicit null opts
        [{ x: 40, y: 40, size: 60, ang: 0 }, 42],           // primitive opts
        [{ x: 40, y: 40, size: 60, ang: 0 }],               // opts omitted
      ]) mitt.draw(ctx, p, o);
    } catch (e) { threw = e; }
    check('mitt: hostile pos/opts battery → no throw, balanced ctx',
      !threw && ctx.__st.depth() === 0, threw ? String(threw) : '');
  }
}

/* ---------- 5.5 · NaN-time camera through game.step (game.js is read-only —
     this is report-evidence, not an in-boundary fix) --------------------- */
{
  try {
    const { createGame } = await import('../../spatial-objects/shared/boxing/game.js');
    const cam = { position: new THREE.Vector3(), aspect: 16 / 9,
      lookAt() { }, rotateZ() { }, rotateY() { }, rotateX() { }, updateProjectionMatrix() { } };
    const world = buildScene(THREE);
    const game = await createGame({ THREE, cam, world, manifest: { candidates: [] } });
    for (let i = 0; i < 10; i++) game.step(1 / 60, { hands: [] }, null, {});
    const before = [cam.position.x, cam.position.y, cam.position.z];
    game.step(NaN, { hands: [] }, null, {});            // ONE poisoned frame
    const nanNow = [cam.position.x, cam.position.y, cam.position.z];
    for (let i = 0; i < 10; i++) game.step(1 / 60, { hands: [] }, null, {});
    const after = [cam.position.x, cam.position.y, cam.position.z];
    const defect = !nanNow.every(Number.isFinite) || !after.every(Number.isFinite);
    out.checks.push({ name: 'REPORT-EVIDENCE game.js: one NaN dt → camera forever NaN',
      pass: true, defect,
      detail: `before=${before.map(v => v.toFixed(2))} nanFrame=${nanNow.map(v => String(v).slice(0, 6))} after10=${after.map(v => String(v).slice(0, 6))}` });
  } catch (e) {
    check('game.js NaN-camera probe ran', false, String(e).slice(0, 200));
  }
}

/* ---------- 5 · buildScene with a gutted renderer ------------------------ */
{
  let threw = false;
  try { const w = buildScene(THREE, {}); w.dispose(); } catch (e) { threw = e; }
  check('buildScene(THREE, {}) — stub renderer must not throw', !threw, threw ? String(threw) : '');
  try { const w = buildScene(THREE, null); w.dispose(); } catch (e) { threw = e; }
  check('buildScene(THREE, null) ok', !threw, threw ? String(threw) : '');
}

out.finishedAt = new Date().toISOString();
out.pass = out.checks.filter(c => c.pass).length;
out.fail = out.checks.length - out.pass;
console.log(JSON.stringify(out, null, 1));
process.exit(out.fail ? 1 : 0);
