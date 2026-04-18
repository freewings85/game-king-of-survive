// Developer self-test: homm3_bright art integration
const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8090/survivor.html?debug=1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 14'];
  const ctx = await browser.newContext({ ...iPhone });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('[console.err]', msg.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__spriteDebug, { timeout: 8000 });

  await page.evaluate(() => {
    var o = document.getElementById('login-overlay');
    if (o) o.classList.add('hidden');
  });
  await sleep(500);
  await page.screenshot({ path: '/tmp/art_00_menu.png' });

  await page.evaluate(() => window.__spriteDebug.enterOfflineDemo('mage'));
  await sleep(1500);

  // Dismiss tutorial — click canvas where the skip button is, then also flip state flag
  await page.evaluate(() => {
    if (typeof window.tutorialActive !== 'undefined') window.tutorialActive = false;
    var g = window._gameAPI;
    if (g && g.player) g.player._tutorialSeen = true;
    // The tutorial skip button is drawn on canvas — dispatch a click at its position
    var c = document.getElementById('c');
    var r = c.getBoundingClientRect();
    var tx = r.left + r.width / 2;
    var ty = r.top + r.height * 0.72;
    c.dispatchEvent(new MouseEvent('click', { clientX: tx, clientY: ty, bubbles: true }));
    c.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: c, clientX: tx, clientY: ty })], changedTouches: [new Touch({ identifier: 1, target: c, clientX: tx, clientY: ty })] }));
    c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [new Touch({ identifier: 1, target: c, clientX: tx, clientY: ty })] }));
  });
  await sleep(1500);

  // Buff player
  await page.evaluate(() => {
    var p = window._gameAPI && window._gameAPI.player;
    if (p) { p.hp = 99999; p.maxHp = 99999; p.speed = 600; }
  });

  // Wait for tileset / sprite / decor async loads
  await sleep(2000);

  const readiness = await page.evaluate(() => {
    var A = window._gameAPI && window._gameAPI.HOMM3_ART;
    var readyDecor = 0, totalDecor = 0;
    if (A && A.decorImgs) {
      for (var k in A.decorImgs) { totalDecor++; if (A.decorImgs[k]._ready) readyDecor++; }
    }
    return {
      tilesetReady: !!(A && A.tilesetReady),
      monsterReady: !!(A && A.monsterReady),
      ui9Ready: !!(A && A.ui9Ready),
      decorReady: readyDecor, decorTotal: totalDecor,
      tileCount: A && A.tilesetMeta ? A.tilesetMeta.tiles.length : 0,
      decorItems: (window._gameAPI && window._gameAPI.decorItems || []).length
    };
  });
  console.log('[asset-readiness]', JSON.stringify(readiness));

  // Assets live on window via script; _gameAPI didn't expose HOMM3_ART
  // Re-check through a functional side-channel: draw result
  await sleep(800);
  await page.screenshot({ path: '/tmp/art_01_gameplay_center.png' });

  // Walk to upper-left corner to verify tileset clamps at world edge
  await page.evaluate(() => {
    var p = window._gameAPI.player;
    if (p) { p.x = 120; p.y = 120; }
  });
  await sleep(400);
  await page.screenshot({ path: '/tmp/art_02_topleft.png' });

  // Walk to bottom-right corner
  await page.evaluate(() => {
    var p = window._gameAPI.player;
    var W = window._gameAPI.WORLD_W, H = window._gameAPI.WORLD_H;
    if (p) { p.x = W - 120; p.y = H - 120; }
  });
  await sleep(400);
  await page.screenshot({ path: '/tmp/art_03_botright.png' });

  // Back to center, capture with orcs
  await page.evaluate(() => {
    var p = window._gameAPI.player;
    p.x = window._gameAPI.WORLD_W / 2;
    p.y = window._gameAPI.WORLD_H / 2;
  });
  await sleep(500);
  await page.screenshot({ path: '/tmp/art_04_center_final.png' });

  // Pixel-level sanity: sample a patch in the middle of the gameplay zone.
  // Pure color fill (old aurora+vignette) was uniformly dark; tileset = varied greens.
  const sample = await page.evaluate(() => {
    var c = document.getElementById('c');
    var g = c.getContext('2d');
    var data = g.getImageData(c.width / 2 - 50, c.height / 2 - 50, 100, 100);
    var hues = 0, greens = 0, darks = 0;
    for (var i = 0; i < data.data.length; i += 4) {
      var r = data.data[i], g2 = data.data[i+1], b = data.data[i+2];
      if (g2 > r && g2 > b && g2 > 60) greens++;
      if (r + g2 + b < 80) darks++;
      hues++;
    }
    return { greenPct: (greens/hues*100).toFixed(1), darkPct: (darks/hues*100).toFixed(1) };
  });
  console.log('[center-pixels]', JSON.stringify(sample));

  // FPS rough check — count frames in 1.5s via rAF hook
  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() {
      n++;
      if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1));
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
