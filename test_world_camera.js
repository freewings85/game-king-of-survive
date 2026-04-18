// Developer self-test: world=2x screen + camera follow
const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8090/survivor.html?debug=1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 14']; // 390x844 CSS, dpr 3
  const ctx = await browser.newContext({ ...iPhone });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__spriteDebug, { timeout: 8000 });

  await page.evaluate(() => {
    var o = document.getElementById('login-overlay');
    if (o) o.classList.add('hidden');
  });
  await sleep(500);

  await page.evaluate(() => window.__spriteDebug.enterOfflineDemo('mage'));
  await sleep(2000);
  // Dismiss tutorial if present
  await page.evaluate(() => {
    var btn = document.querySelector('#tutorial-skip, .tutorial-skip');
    if (btn) btn.click();
    if (window._gameAPI) window._gameAPI.tutorialSeen = true;
  });
  await sleep(1500);

  const dims = await page.evaluate(() => {
    return {
      W: window._gameAPI && window._gameAPI.W,
      H: window._gameAPI && window._gameAPI.H,
      WORLD_W: window._gameAPI && window._gameAPI.WORLD_W,
      WORLD_H: window._gameAPI && window._gameAPI.WORLD_H,
      px: window._gameAPI && window._gameAPI.player && window._gameAPI.player.x,
      py: window._gameAPI && window._gameAPI.player && window._gameAPI.player.y,
      camX: window._gameAPI && window._gameAPI.cameraX,
      camY: window._gameAPI && window._gameAPI.cameraY,
    };
  });
  console.log('[start]', JSON.stringify(dims));

  // Buff player so they don't die
  await page.evaluate(() => {
    var p = window._gameAPI && window._gameAPI.player;
    if (p) { p.hp = 99999; p.maxHp = 99999; p.speed = 1200; }
  });

  await page.screenshot({ path: '/tmp/world_01_start.png' });

  // Teleport player to each corner via _gameAPI and record camera clamp behavior
  async function goTo(x, y, label) {
    await page.evaluate(({ x, y }) => {
      var p = window._gameAPI && window._gameAPI.player;
      if (p) { p.x = x; p.y = y; }
    }, { x, y });
    await sleep(400);
    const s = await page.evaluate(() => ({
      px: window._gameAPI.player.x, py: window._gameAPI.player.y,
      camX: window._gameAPI.cameraX, camY: window._gameAPI.cameraY,
      WORLD_W: window._gameAPI.WORLD_W, WORLD_H: window._gameAPI.WORLD_H,
      W: window._gameAPI.W, H: window._gameAPI.H
    }));
    console.log(`[${label}]`, JSON.stringify(s));
    await page.screenshot({ path: `/tmp/world_${label}.png` });
    return s;
  }

  const center = await goTo(dims.WORLD_W/2, dims.WORLD_H/2, '02_center');
  const topLeft = await goTo(50, 50, '03_topleft');
  const topRight = await goTo(dims.WORLD_W - 50, 50, '04_topright');
  const botLeft = await goTo(50, dims.WORLD_H - 50, '05_botleft');
  const botRight = await goTo(dims.WORLD_W - 50, dims.WORLD_H - 50, '06_botright');

  // Try to walk past world edge via direct assign
  await page.evaluate(() => {
    var p = window._gameAPI && window._gameAPI.player;
    if (p) { p.x = 9999999; p.y = 9999999; }
  });
  // Run one physics tick via engine update — engine should clamp on next movement; force by using player input
  await sleep(500);
  const oob = await page.evaluate(() => ({
    px: window._gameAPI.player.x, py: window._gameAPI.player.y,
    WORLD_W: window._gameAPI.WORLD_W, WORLD_H: window._gameAPI.WORLD_H
  }));
  console.log('[07_oob_before_move]', JSON.stringify(oob));

  // Joystick drag right for 2 seconds, should clamp at WORLD_W - radius
  await page.evaluate(() => {
    var canvas = document.getElementById('c');
    var sx = 39, sy = 700;
    var t1 = new Touch({ identifier: 1, target: canvas, clientX: sx, clientY: sy });
    canvas.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], changedTouches: [t1] }));
    var t2 = new Touch({ identifier: 1, target: canvas, clientX: sx + 60, clientY: sy });
    canvas.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], changedTouches: [t2] }));
  });
  await sleep(2000);
  const moved = await page.evaluate(() => ({
    px: window._gameAPI.player.x, py: window._gameAPI.player.y,
    WORLD_W: window._gameAPI.WORLD_W, WORLD_H: window._gameAPI.WORLD_H,
    camX: window._gameAPI.cameraX
  }));
  console.log('[08_after_right_walk]', JSON.stringify(moved));
  await page.screenshot({ path: '/tmp/world_08_after_walk.png' });

  // Minimap visible?
  const mmCheck = await page.evaluate(() => {
    var c = document.getElementById('c');
    var ctx = c.getContext('2d');
    // Sample top-right area where minimap is
    var data = ctx.getImageData(c.width - 180, 50, 160, 120);
    var nonBlack = 0;
    for (var i = 0; i < data.data.length; i += 4) {
      if (data.data[i] + data.data[i+1] + data.data[i+2] > 30) nonBlack++;
    }
    return { nonBlackPct: (nonBlack / (data.data.length/4) * 100).toFixed(1) };
  });
  console.log('[minimap]', JSON.stringify(mmCheck));

  // Storm center
  const storm = await page.evaluate(() => ({
    active: window._gameAPI.stormZone && window._gameAPI.stormZone.active,
    cx: window._gameAPI.stormZone && window._gameAPI.stormZone.centerX,
    cy: window._gameAPI.stormZone && window._gameAPI.stormZone.centerY,
    r: window._gameAPI.stormZone && window._gameAPI.stormZone.radius
  }));
  console.log('[storm]', JSON.stringify(storm));

  // Check bot spawn distribution
  const bots = await page.evaluate(() => {
    var list = window._gameAPI.offlineBots || [];
    return list.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), alive: b.alive }));
  });
  console.log('[bots]', JSON.stringify(bots));

  console.log('[summary]', JSON.stringify({
    worldVsScreen: { wRatio: (dims.WORLD_W / dims.W).toFixed(2), hRatio: (dims.WORLD_H / dims.H).toFixed(2) }
  }));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
