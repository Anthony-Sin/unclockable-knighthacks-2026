#!/usr/bin/env node
/* b5-render-live.mjs — headless-Chromium probes for the wave-5 render angles
   on the live :8791 server. Same governance as test/qe-runner.mjs:
   .chromium.lock serialization, load1<10 / MemAvail>2.5GB launch gate,
   one niced browser, SwiftShader only (no Vulkan).

   Checks: cornerHold freeze (crowd wall-clock, sprites frozen, no births),
   hitFx ink-burst spam, mitt under 0×0/4096²/ctx-missing-API pressure,
   shadowMap.needsUpdate cadence, entrance camera (NaN report evidence).

   Run: node .teamwork/qe/b5-render-live.mjs  → JSON to
   .teamwork/qe/b5-render-live.json */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync,
  rmSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', 'spatial-objects');
const OUT_DIR = HERE;
const LOCK = join(OUT_DIR, '.chromium.lock');
const CHROMIUM = '/usr/bin/chromium';
const URL_ = 'http://127.0.0.1:8791/boxing.html?notrack=1&coach=1';

const require = createRequire(join(ROOT, 'package.json'));
const _pp = require('puppeteer-core');
const puppeteer = _pp.default || _pp;
const { waitForResources, memAvailMB } =
  await import(join(ROOT, 'test', 'qe-resources.mjs'));

const out = { tool: 'b5-render-live', url: URL_,
  startedAt: new Date().toISOString(), gate: null, checks: [], aborted: null,
  events: { pageerrors: [], consoleErrors: [], consoleBenign: [],
    httpStatus: [], requestfailed: [] } };
/* coach endpoints legitimately 4xx/5xx offline (no API key on :8791) — the
   console "Failed to load resource" line is expected noise, not a defect */
const BENIGN_CONSOLE = /coach|favicon|net::ERR_CONNECTION_REFUSED.*api|status of 50[01]/i;
const check = (name, pass, detail = '') =>
  out.checks.push({ name, pass: !!pass, detail: String(detail).slice(0, 400) });
const log = (...a) => console.log('[b5-live]', ...a);

/* governance (verbatim shape from qe-runner) */
async function acquireLock() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (;;) {
    let stale = true;
    if (existsSync(LOCK)) {
      try {
        const { pid, ts } = JSON.parse(readFileSync(LOCK, 'utf8'));
        const alive = pid && (() => { try { process.kill(pid, 0); return true; } catch { return false; } })();
        if (alive && Date.now() - ts < 15 * 60 * 1000) stale = false;
      } catch { }
      if (stale) { try { unlinkSync(LOCK); } catch { } }
    }
    if (!stale) { log('lock held — waiting 3s'); await delay(3000); continue; }
    try {
      writeFileSync(LOCK, JSON.stringify({ pid: process.pid, ts: Date.now() }), { flag: 'wx' });
      return;
    } catch { await delay(250); }
  }
}
const releaseLock = () => { try { unlinkSync(LOCK); } catch { } };
function niceChromium() {
  const p = join(tmpdir(), `b5-nice-chromium-${process.pid}.sh`);
  writeFileSync(p, `#!/bin/sh\nexec nice -n 10 ${CHROMIUM} "$@"\n`, { mode: 0o755 });
  return p;
}

let browser = null, wrapper = null, abortTimer = null;
try {
  await acquireLock();
  const gate = await waitForResources({ timeoutMs: 120000, pollMs: 2000, log });
  out.gate = gate;
  wrapper = niceChromium();
  browser = await puppeteer.launch({
    executablePath: wrapper, headless: 'new',
    args: ['--no-sandbox', '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream', '--mute-audio',
      '--window-size=1600,900', '--use-gl=angle',
      '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  abortTimer = setInterval(() => {
    if (memAvailMB() < 1500 && !out.aborted) {
      out.aborted = 'resources';
      try { browser?.process()?.kill('SIGKILL'); } catch { }
    }
  }, 2000);

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  page.on('pageerror', e => out.events.pageerrors.push(String(e)));
  page.on('console', m => {
    const t = m.type(), txt = m.text();
    if (t === 'error' && !/^INFO:|XNNPACK|TensorFlow|GroupMarker/i.test(txt))
      (BENIGN_CONSOLE.test(txt) ? out.events.consoleBenign
        : out.events.consoleErrors).push(txt.slice(0, 200));
  });
  page.on('requestfailed', r => out.events.requestfailed.push(r.url().slice(0, 120)));
  page.on('response', r => {
    // coach endpoints legitimately 4xx/5xx offline — still recorded, not failed
    if (r.status() >= 400) out.events.httpStatus.push(`${r.status()} ${r.url().slice(0, 100)}`);
  });

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.__boxing && window.__boxing.fight', { timeout: 30000 });
  await page.waitForFunction(`window.__boxing.state.phase === 'fighting'`, { timeout: 30000 });
  check('boot → fighting phase reached (?notrack)', true,
    `gpu="${await page.evaluate(() => window.__boxing.gpuName)}" weak=${await page.evaluate(() => window.__boxing.weakGpu)}`);

  /* ---------- D · shadowMap.needsUpdate cadence ------------------------ */
  {
    await page.evaluate(() => {
      const B = window.__boxing, sm = B.ren.shadowMap;
      window.__sh = { sets: 0, f0: B.ren.info.render.frame };
      let cur = sm.needsUpdate;
      Object.defineProperty(sm, 'needsUpdate', {
        configurable: true,
        get: () => cur,
        set: v => { if (v === true) window.__sh.sets++; cur = v; },
      });
    });
    await delay(2500);
    const cad = await page.evaluate(() => ({
      sets: window.__sh.sets,
      frames: window.__boxing.ren.info.render.frame - window.__sh.f0,
      weak: window.__boxing.weakGpu }));
    const expect = cad.weak ? 1 / 3 : 1 / 2;
    const ratio = cad.sets / Math.max(1, cad.frames);
    check('shadowMap: needsUpdate fires ~every ' + (cad.weak ? '3rd' : '2nd') + ' frame',
      cad.sets > 0 && Math.abs(ratio - expect) < .09, `${cad.sets}/${cad.frames} = ${ratio.toFixed(3)}`);
    check('shadowMap: never every-frame, never frozen',
      cad.sets > cad.frames * .2 && cad.sets < cad.frames * .7, `${cad.sets} sets / ${cad.frames} frames`);
  }

  /* ---------- A · cornerHold freeze ----------------------------------- */
  /* events pushed into fight.state.events are eaten by the next live
     fight.step's entry-clear (fight.js:345 skips the clear only at dt=0) —
     so a REAL hit is needed for pre-hold sprites: throwPunch scripts a real
     swing through the fight AI. */
  const snap = () => page.evaluate(() => {
    const B = window.__boxing, S = B.scene;
    const crowd = S.children.find(o => o.isInstancedMesh && o.count === 150);
    const confetti = S.children.find(o => o.isInstancedMesh && o.count === 90);
    const sprites = S.children.filter(o => o.isSprite && o.visible)
      .map(s => [s.position.x, s.position.y, s.position.z, +s.material.opacity.toFixed(4)]);
    const cy = [];
    if (crowd) for (const i of [0, 37, 101]) cy.push(crowd.instanceMatrix.array[i * 16 + 13]);
    return { cy, nLive: sprites.length, sprites, confetti: confetti?.visible,
      phase: B.fight.state.phase, timeLeft: B.fight.state.timeLeft,
      hp: B.fight.state.player.hp, round: B.fight.state.round };
  });
  const inkBand = () => page.evaluate(() => {
    /* burst-center band (hitFx.y≈.5H): the telegraph chevron sits at .4H and
       is gated to phase 'fighting' anyway — during the hold (countdown) this
       band is ink-free unless the burst itself is drawing. */
    const hc = document.querySelector('#hands');
    const x = hc.getContext('2d');
    const y = Math.max(0, Math.round(hc.height * .5) - 3);
    const d = x.getImageData(0, y, hc.width, 6).data;
    let a = 0;
    for (let i = 3; i < d.length; i += 4) a += d[i];
    return a;
  });
  {
    // scripted hook lands on the player → real 'player-hit-taken' → real burst
    for (let i = 0; i < 12; i++) {
      const threw = await page.evaluate(() =>
        window.__boxing.fight.throwPunch('hook', 'left', 0.03));
      if (threw) break;
      await delay(300);
    }
    await page.waitForFunction(
      `window.__boxing.scene.children.filter(o=>o.isSprite&&o.visible).length>0`,
      { timeout: 6000 });
    const preHit = await snap();
    check('pre-hold: real hit spawned live fx sprites', preHit.nLive > 0, `${preHit.nLive} live`);
    // trigger the corner: hp ≤ 1/3 while fighting
    await page.evaluate(() => {
      const B = window.__boxing; B.fight.state.player.hp = B.fight.state.player.maxHp * .25; });
    await page.waitForFunction(`document.querySelector('[data-coach]').classList.contains('on')`, { timeout: 6000 });
    await delay(150);   // let the hold settle in
    const h0 = await snap();
    await delay(700);
    const h1 = await snap();
    check('cornerHold: card up, phase frozen in countdown',
      h0.phase === 'countdown' && h1.phase === 'countdown', `phase=${h1.phase}`);
    check('cornerHold: fight clock frozen (timeLeft identical)',
      h0.timeLeft === h1.timeLeft, `timeLeft=${h1.timeLeft} round=${h1.round}`);
    check('cornerHold: crowd keeps animating wall-clock',
      h0.cy.length === 3 && h1.cy.some((v, i) => Math.abs(v - h0.cy[i]) > 1e-4),
      `cy ${h0.cy.map(v => v.toFixed(4))} → ${h1.cy.map(v => v.toFixed(4))}`);
    check('cornerHold: fx sprites frozen — zero drift (pos+opacity bit-identical)',
      h0.nLive > 0 && JSON.stringify(h0.sprites) === JSON.stringify(h1.sprites),
      `${h0.nLive}→${h1.nLive} sprites held`);
    check('cornerHold: no confetti born during freeze',
      h0.confetti === false && h1.confetti === false, '');
    // signs must NOT pose during the hold (not over)
    const sign = await page.evaluate(() =>
      window.__boxing.game.step(0, { hands: [] }, null, { sign: 'victory', cornerHold: true }).entranceSign);
    check('cornerHold: sign poses suppressed mid-hold (not over)',
      sign === 'idle', `entranceSign=${sign}`);

    /* ---------- B · hitFx ink-burst spam — injected mid-hold ------------
       dt=0 skips the fight.step entry-clear, so pushes here are delivered by
       the very next rAF drain → out.events → drawOverlay → drawImpact. */
    const base = await inkBand();
    for (let i = 0; i < 30; i++) {
      await page.evaluate(i => {
        const B = window.__boxing;
        B.fight.state.lastBlow = {
          dmg: i % 2 ? 16 : 4,
          kind: i % 3 === 0 ? 'upper' : (i % 2 ? 'hook' : 'jab'),
          side: i % 2 ? 'left' : 'right' };
        B.fight.state.events.push('player-hit-taken');
      }, i);
      await delay(24);
    }
    const during = await inkBand();
    check('hitFx: ink burst visible under 30-hit heavy↔light spam',
      during > base + 800, `band αΣ ${base}→${during}`);
    const midHold = await snap();
    check('OBSERVE: hit events delivered during freeze DO birth sprites (injected path)',
      midHold.nLive >= h1.nLive, `live ${h1.nLive}→${midHold.nLive} — latent, unreachable in production`);
    await delay(1000);                                   // quiet period
    const after = await inkBand();
    check('hitFx: no ink ghost accumulation after bursts end',
      after <= base + 400, `band αΣ ${base}→${during}→${after}`);
    const finite = await page.evaluate(() => {
      const x = document.querySelector('#hands').getContext('2d');
      return Number.isFinite(x.globalAlpha) && x.globalAlpha === 1;
    });
    check('hitFx: ctx.globalAlpha restored to 1 after burst spam', finite, '');

    // release via the real skip button
    await page.evaluate(() => document.querySelector('[data-coachgo]').click());
    await page.waitForFunction(
      `window.__boxing.state.phase === 'fighting'`, { timeout: 15000 });
    check('cornerHold: release → countdown → fighting resumes', true, '');
    await delay(1500);
    const post = await snap();
    check('cornerHold: frozen sprites drain after release + time',
      post.nLive <= preHit.nLive + 30, `${post.nLive} live now (was ${preHit.nLive})`);
  }

  /* ---------- C · mitt under canvas pressure -------------------------- */
  {
    const r = await page.evaluate(async () => {
      const m = await import('./shared/boxing/mitts/classic.js');
      const res = { threw: [], ink: 0 };
      // 0×0 canvas
      const c0 = document.createElement('canvas'); c0.width = 0; c0.height = 0;
      const x0 = c0.getContext('2d');
      try { m.draw(x0, { x: 0, y: 0, size: 60, ang: 0 }, {}); } catch (e) { res.threw.push('0x0 ' + e); }
      // 4096² canvas with API gaps
      const c4 = document.createElement('canvas'); c4.width = 4096; c4.height = 4096;
      const x4 = c4.getContext('2d');
      x4.roundRect = undefined;                          // API absent
      x4.filter = 'blur(8px)';                           // filter present — mitt must not depend on it
      x4.font = '900 30px "NoSuchFontXYZ-404", sans-serif';   // font miss — harmless either way
      try { m.draw(x4, { x: 2048, y: 2048, size: 140, ang: .3 }, { kind: 'fist' }); }
      catch (e) { res.threw.push('4096 ' + e); }
      res.alpha = x4.globalAlpha; res.tf = '' + x4.getTransform();
      // adversarial battery on the real ctx
      const bad = [
        [{ x: NaN, y: 0, size: 60, ang: 0 }, {}],
        [{ x: 1e308, y: -1e308, size: 60, ang: Infinity }, {}],
        [{ x: 0, y: 0, size: -7, ang: 0 }, { cap: 0, dim: 3, squash: 9 }],
        [{ x: 2048, y: 2048, size: 140, ang: 0 }, { arm: { x: Infinity, y: 0 } }],
        [{ x: 2048, y: 2048, size: 140, ang: 0 },
          { lm: Array.from({ length: 21 }, () => ({ x: NaN, y: 0 })) }],
        [{ x: 2048, y: 2048, size: 140, ang: 0 },
          { lm: Array.from({ length: 21 }, (_, i) => ({ x: i * 1e305, y: 0 })) }],
      ];
      for (const [p, o] of bad) {
        try { m.draw(x4, p, o); } catch (e) { res.threw.push('adv ' + e); }
      }
      res.alpha2 = x4.globalAlpha; res.tf2 = '' + x4.getTransform();
      const d = x4.getImageData(1900, 1900, 400, 400).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) res.ink++;
      // hostile ctx: throw mid-path → state must still unwind clean
      const c2 = document.createElement('canvas'); c2.width = c2.height = 200;
      const x2 = c2.getContext('2d');
      res.tfBefore = '' + x2.getTransform(); res.alphaBefore = x2.globalAlpha;
      let n = 0; const orig = x2.stroke.bind(x2);
      x2.stroke = () => { if (++n === 6) throw new Error('boom'); orig(); };
      try { m.draw(x2, { x: 100, y: 100, size: 60, ang: 0 }, {}); }
      catch (e) { res.threwHostile = String(e).slice(0, 60); }
      res.alpha3 = x2.globalAlpha; res.tf3 = '' + x2.getTransform();
      return res;
    });
    check('mitt: 0×0 / 4096² / missing roundRect / filter → draws or no-ops, never throws',
      r.threw.length === 0, JSON.stringify(r.threw));
    check('mitt: ctx state clean after 4096² + adversarial draws',
      r.alpha === 1 && r.alpha2 === 1 && r.tf === r.tf2, `α=${r.alpha},${r.alpha2} tf=${r.tf2}`);
    check('mitt: mitt actually inked pixels on 4096²', r.ink > 2000, `ink=${r.ink}`);
    check('mitt: mid-path ctx throw unwinds save/alpha/transform',
      r.alpha3 === r.alphaBefore && r.tf3 === r.tfBefore,
      `threw="${r.threwHostile}" α=${r.alpha3} tf=${r.tf3}`);
  }

  /* ---------- E · entrance camera — rematch intro plays --------------- */
  {
    await page.evaluate(() => window.__boxing.game.reset());
    await delay(600);                                     // intro sweep runs
    const camOk = await page.evaluate(() => {
      const c = window.__boxing.cam.position;
      return Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z);
    });
    check('entrance: rematch intro camera track finite', camOk, '');
    // NaN-time camera — report-only evidence for game.js
    const nan = await page.evaluate(() => {
      const B = window.__boxing;
      B.game.step(NaN, { hands: [] }, null, {});
      const a = [B.cam.position.x, B.cam.position.y, B.cam.position.z];
      for (let i = 0; i < 8; i++) B.game.step(1 / 60, { hands: [] }, null, {});
      const b = [B.cam.position.x, B.cam.position.y, B.cam.position.z];
      return { a, b };
    });
    out.checks.push({ name: 'REPORT-EVIDENCE game.js: NaN dt → camera NaN forever (live)',
      pass: true, defect: !nan.a.every(Number.isFinite) || !nan.b.every(Number.isFinite),
      detail: `a=${nan.a.map(v => String(v).slice(0, 6))} b=${nan.b.map(v => String(v).slice(0, 6))}` });
    // reload so the page is left clean
    await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await delay(2000);
  }
} catch (e) {
  out.fatal = String(e);
  if (out.aborted) out.exitCode = 2; else out.exitCode = 1;
} finally {
  clearInterval(abortTimer);
  if (browser) { try { await Promise.race([browser.close(), delay(8000)]); } catch { try { browser.process()?.kill('SIGKILL'); } catch { } } }
  if (wrapper) { try { rmSync(wrapper); } catch { } }
  releaseLock();
}

out.finishedAt = new Date().toISOString();
out.pass = out.checks.filter(c => c.pass).length;
out.fail = out.checks.length - out.pass;
if (out.aborted) out.exitCode = 2;
else if (out.exitCode == null) {
  out.exitCode = (out.events.pageerrors.length ||
    out.events.consoleErrors.length || out.fail) ? 1 : 0;
}
writeFileSync(join(OUT_DIR, 'b5-render-live.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ pass: out.pass, fail: out.fail,
  pageerrors: out.events.pageerrors, consoleErrors: out.events.consoleErrors,
  httpStatus: out.events.httpStatus, requestfailed: out.events.requestfailed,
  aborted: out.aborted, fatal: out.fatal }, null, 1));
process.exit(out.exitCode);
