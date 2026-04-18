const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8090/survivor.html?debug=1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { console.log('[pageerror]', e.message); errs.push(e.message); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__spriteDebug, { timeout: 8000 });
  await page.evaluate(() => {
    var o = document.getElementById('login-overlay'); if (o) o.classList.add('hidden');
  });
  await page.evaluate(() => document.fonts.ready);
  await sleep(600);

  await page.evaluate(() => window.__spriteDebug.enterOfflineDemo('mage'));
  await sleep(1500);
  await page.evaluate(() => {
    window._gameAPI.tutorialDone = true;
    var p = window._gameAPI.player;
    if (p) { p.hp = 99999; p.maxHp = 99999; p.speed = 600; }
  });
  await sleep(1500);

  // Wait for decor to finish loading
  await sleep(1500);

  // === Check collider AABBs exist ===
  const colliders = await page.evaluate(() => {
    var d = window._gameAPI.decorItems || [];
    var counts = {};
    d.forEach(it => { counts[it.name] = (counts[it.name] || 0) + 1; });
    return { total: d.length, byName: counts };
  });
  console.log('[decor-counts]', JSON.stringify(colliders));

  // === Test: teleport player next to a house, try to move through it ===
  const colTest = await page.evaluate(() => {
    var g = window._gameAPI;
    // Find a house decor
    var decor = g.decorItems || [];
    var house = null;
    for (var i = 0; i < decor.length; i++) if (decor[i].name === 'house') { house = decor[i]; break; }
    if (!house) return { err: 'no house in map' };
    // Teleport player west of house
    g.player.x = house.x - 80;
    g.player.y = house.y;
    return { px: g.player.x, py: g.player.y, hx: house.x, hy: house.y };
  });
  console.log('[collision-setup]', JSON.stringify(colTest));
  await sleep(200);

  // Drive player right via joystick for 2s
  await page.evaluate(() => {
    var c = document.getElementById('c');
    var r = c.getBoundingClientRect();
    // Tap bottom-left for joystick, then drag right
    var sx = r.left + r.width * 0.12, sy = r.top + r.height * 0.85;
    var t1 = new Touch({ identifier: 1, target: c, clientX: sx, clientY: sy });
    c.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], changedTouches: [t1] }));
    var t2 = new Touch({ identifier: 1, target: c, clientX: sx + 80, clientY: sy });
    c.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], changedTouches: [t2] }));
  });
  await sleep(2000);

  const afterMove = await page.evaluate(() => {
    var g = window._gameAPI;
    var decor = g.decorItems || [];
    var house = null;
    for (var i = 0; i < decor.length; i++) if (decor[i].name === 'house') { house = decor[i]; break; }
    // Check if player is still west of house (collision blocked them)
    return {
      px: g.player.x, py: g.player.y,
      houseX: house ? house.x : 0,
      houseY: house ? house.y : 0,
      blocked: house ? g.player.x < house.x : false
    };
  });
  console.log('[after-drive-right]', JSON.stringify(afterMove));
  await page.screenshot({ path: '/tmp/decor_01_house_blocked.png' });

  // Release joystick
  await page.evaluate(() => {
    var c = document.getElementById('c');
    c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [] }));
  });

  // === Survival test: let AI run 90s and see if player stays alive (with buff HP) ===
  await page.evaluate(() => {
    var g = window._gameAPI;
    g.player.hp = 99999; g.player.maxHp = 99999;
    g.player.x = g.WORLD_W / 2; g.player.y = g.WORLD_H / 2;
  });
  await sleep(200);
  const before = await page.evaluate(() => ({
    t: Math.floor(window._gameAPI.gameTimer),
    alive: window._gameAPI.player.alive !== false
  }));
  console.log('[90s-before]', JSON.stringify(before));
  await sleep(30000); // 30s sample
  const after30 = await page.evaluate(() => {
    var g = window._gameAPI;
    var stuckBots = (g.offlineBots || []).filter(b => b.alive && (b._stuckTimer || 0) > 0.9).length;
    return {
      t: Math.floor(g.gameTimer),
      alive: g.player.alive !== false,
      hp: g.player.hp,
      stuckBots: stuckBots,
      aliveBots: (g.offlineBots || []).filter(b => b.alive).length,
      aliveMobs: (g.offlineEnemies || []).filter(e => e.alive && e.hostile).length
    };
  });
  console.log('[30s-after]', JSON.stringify(after30));
  await page.screenshot({ path: '/tmp/decor_02_30s_survival.png' });

  // FPS sample
  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);

  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
