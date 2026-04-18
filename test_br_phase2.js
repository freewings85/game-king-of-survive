// Developer self-test: BR chicken-mode Phase 2
const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8090/survivor.html?debug=1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 14'];
  const ctx = await browser.newContext({ ...iPhone });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { console.log('[pageerror]', e.message); errs.push(e.message); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__spriteDebug, { timeout: 8000 });
  await page.evaluate(() => {
    var o = document.getElementById('login-overlay'); if (o) o.classList.add('hidden');
  });
  await page.evaluate(() => document.fonts.ready);
  await sleep(800);

  await page.evaluate(() => window.__spriteDebug.enterOfflineDemo('mage'));
  await sleep(1500);
  await page.evaluate(() => {
    var c = document.getElementById('c');
    var r = c.getBoundingClientRect();
    var tx = r.left + r.width / 2, ty = r.top + r.height * 0.72;
    c.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: c, clientX: tx, clientY: ty })], changedTouches: [new Touch({ identifier: 1, target: c, clientX: tx, clientY: ty })] }));
    c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [new Touch({ identifier: 1, target: c, clientX: tx, clientY: ty })] }));
  });
  await sleep(1500);
  await page.evaluate(() => {
    var p = window._gameAPI.player;
    if (p) { p.hp = 99999; p.maxHp = 99999; }
  });
  await sleep(500);
  await page.screenshot({ path: '/tmp/br2_01_start.png' });

  const startState = await page.evaluate(() => {
    var g = window._gameAPI;
    var bots = g.offlineBots || [];
    var cx = g.WORLD_W / 2, cy = g.WORLD_H / 2;
    return {
      alivePlayers: (g.player && g.player.alive !== false ? 1 : 0) + bots.filter(b=>b.alive).length,
      botPositions: bots.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), d: Math.round(Math.sqrt((b.x-cx)*(b.x-cx)+(b.y-cy)*(b.y-cy))), alive: b.alive, class: b.playerClass })),
      stormRadius: Math.round(g.stormZone.radius),
      stormShrinkDelay: g.stormZone._shrinkDelay,
      stormShrinkRate: g.stormZone.shrinkRate,
      kills: g.kills,
      gameTime: Math.floor(g.gameTimer || 0)
    };
  });
  console.log('[start]', JSON.stringify(startState));

  // Let 15s pass, bots should have moved toward center
  for (let i = 0; i < 6; i++) {
    await sleep(2500);
    const tick = await page.evaluate(() => {
      var g = window._gameAPI;
      var bots = g.offlineBots || [];
      var cx = g.WORLD_W / 2, cy = g.WORLD_H / 2;
      var avgDist = bots.filter(b=>b.alive).reduce((s,b) => s + Math.sqrt((b.x-cx)*(b.x-cx)+(b.y-cy)*(b.y-cy)), 0) / Math.max(1, bots.filter(b=>b.alive).length);
      return {
        t: Math.floor(g.gameTimer),
        alive: (g.player.alive!==false?1:0) + bots.filter(b=>b.alive).length,
        avgDistToCenter: Math.round(avgDist),
        stormR: Math.round(g.stormZone.radius),
        kills: g.kills
      };
    });
    console.log(`[t=${tick.t}s]`, JSON.stringify(tick));
  }
  await page.screenshot({ path: '/tmp/br2_02_converging.png' });

  // Check BR UI asset readiness
  const brui = await page.evaluate(() => {
    // Try reading the top-level vars
    var has = typeof window.BR_UI !== 'undefined';
    return { has: has };
  });
  // HOMM3_ART exposure worked before; BR_UI was not exposed — use DOM heuristic
  const hudReadyPx = await page.evaluate(() => {
    var c = document.getElementById('c');
    var g = c.getContext('2d');
    // Sample center of top HUD bar for non-black content
    var data = g.getImageData(20, 20, c.width-40, 60);
    var nonBlack = 0, total = 0;
    for (var i = 0; i < data.data.length; i += 4) {
      total++;
      if (data.data[i] + data.data[i+1] + data.data[i+2] > 50) nonBlack++;
    }
    return { contentPct: (nonBlack / total * 100).toFixed(1) };
  });
  console.log('[hud-content]', JSON.stringify(hudReadyPx));

  // Force player outside storm to test warning bar + sound
  await page.evaluate(() => {
    var p = window._gameAPI.player;
    var s = window._gameAPI.stormZone;
    p.x = s.centerX + s.radius + 50; p.y = s.centerY;
  });
  await sleep(800);
  await page.screenshot({ path: '/tmp/br2_03_storm.png' });

  // FPS
  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);

  // Kill all bots — to trigger victory
  await page.evaluate(() => {
    var bots = window._gameAPI.offlineBots;
    for (var i = 0; i < bots.length; i++) { bots[i].alive = false; }
  });
  await sleep(2000);
  const end = await page.evaluate(() => ({
    state: window._gameAPI.state,
    victoryWin: window.victoryWin  // not exposed; will be undefined
  }));
  console.log('[end]', JSON.stringify(end));
  await page.screenshot({ path: '/tmp/br2_04_victory.png' });

  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
