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
  await sleep(500);

  await page.evaluate(() => window.__spriteDebug.enterOfflineDemo('mage'));
  await sleep(1500);
  await page.evaluate(() => {
    window._gameAPI.tutorialDone = true;
    var p = window._gameAPI.player;
    if (p) { p.hp = 100; p.maxHp = 100; }
  });
  await sleep(2000);

  // Inspect points via _gameAPI expose (will need add)
  const pts = await page.evaluate(() => {
    // STRAT_POINTS isn't exposed; peek via window state if available
    return {
      hasPoints: typeof window.STRAT_POINTS !== 'undefined',
      // Can we find references to strategic points through any public hook?
    };
  });
  console.log('[strat-window]', JSON.stringify(pts));

  // Use debug path: attach test hook
  const captured = await page.evaluate(() => {
    // Access via global eval trick — call _gameAPI.player and inspect distance
    return { px: window._gameAPI.player.x, py: window._gameAPI.player.y };
  });
  console.log('[player-spawn]', JSON.stringify(captured));
  await page.screenshot({ path: '/tmp/expC_01_spawn.png' });

  // Move player toward one of the 3 points (they're at angle -π/2, π/6, 5π/6 around world center)
  await page.evaluate(() => {
    var g = window._gameAPI;
    // Watchtower at (W/2, H/2 - R); simulate going there
    var R = Math.min(g.WORLD_W, g.WORLD_H) * 0.28;
    g.player.x = g.WORLD_W / 2;
    g.player.y = g.WORLD_H / 2 - R;
  });
  await sleep(200);
  await page.screenshot({ path: '/tmp/expC_02_near_watchtower.png' });

  // Keep state playing + hp buffed during capture
  const ticker1 = setInterval(() => {
    page.evaluate(() => {
      var g = window._gameAPI;
      if (g.state === 'levelUp') { g.state = 'playing'; }
      g.player.hp = 99999; g.player.maxHp = 99999;
    }).catch(() => {});
  }, 200);
  await sleep(12000);
  clearInterval(ticker1);

  // Take screenshot after capture
  await page.screenshot({ path: '/tmp/expC_03_captured.png' });

  // Check hp went up if temple captured (we're at watchtower, so no regen buff). Move to temple.
  await page.evaluate(() => {
    var g = window._gameAPI;
    var R = Math.min(g.WORLD_W, g.WORLD_H) * 0.28;
    // temple at angle π/6 - π/2 = -π/3
    var ang = Math.PI * 2 / 3 - Math.PI / 2;
    g.player.x = g.WORLD_W / 2 + Math.cos(ang) * R;
    g.player.y = g.WORLD_H / 2 + Math.sin(ang) * R;
    g.player.hp = 50; g.player.maxHp = 100; // damaged to test regen
  });
  const ticker2 = setInterval(() => {
    page.evaluate(() => {
      var g = window._gameAPI;
      if (g.state === 'levelUp') { g.state = 'playing'; }
    }).catch(() => {});
  }, 200);
  await sleep(12000);
  clearInterval(ticker2);
  const afterTemple = await page.evaluate(() => ({
    hp: Math.round(window._gameAPI.player.hp),
    pts: (window._gameAPI.stratPoints || []).map(p => ({ type: p.type, progress: Math.round(p.progress), owner: p.owner, buffUntil: p.buffUntil, pX: Math.round(p.x), pY: Math.round(p.y) })),
    playerXY: { x: Math.round(window._gameAPI.player.x), y: Math.round(window._gameAPI.player.y) },
    gameTime: Math.floor(window._gameAPI.gameTimer),
    playerFaction: window._gameAPI.player.factionId
  }));
  console.log('[after-temple-10s]', JSON.stringify(afterTemple));
  await page.screenshot({ path: '/tmp/expC_04_temple.png' });

  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);
  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
