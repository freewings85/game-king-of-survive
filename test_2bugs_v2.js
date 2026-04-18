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
    if (p) { p.hp = 99999; p.maxHp = 99999; }
  });
  await sleep(2000);

  // === Bug 1: kill 10 mobs → kills/killStreak/maxStreak stay 0, farm++ ===
  // Relocate all bots to a far corner so they don't interfere with player's auto-attack
  // BUT keep them alive — making all bots dead triggers victory → state=gameOver.
  await page.evaluate(() => {
    var g = window._gameAPI;
    g.offlineBots.forEach((b, i) => {
      b.x = g.WORLD_W - 100;
      b.y = 100 + i * 30;
      b.factionId = 0; // same as player so player ignores them
    });
  });
  const before = await page.evaluate(() => ({
    kills: window._gameAPI.kills,
    killStreak: window.__spriteDebug ? (window._gameAPI.player._streakTimer != null ? 'unknown' : null) : null,
    farm: window._gameAPI.player._farmKills || 0
  }));
  console.log('[before-mob-kills]', JSON.stringify(before));
  // Spawn 10 mobs near player and kill them via direct hp=0
  const killResult = await page.evaluate(async () => {
    var g = window._gameAPI;
    var killedCount = 0;
    // Kill existing mobs via player damage event — need to route through player attack
    // Easier: take 10 live mobs and set hp=1, then rely on player auto-attack
    var mobs = g.offlineEnemies.filter(e => e.alive && e.hostile && !e.bossTypeId);
    for (var i = 0; i < Math.min(10, mobs.length); i++) {
      // Move mob next to player
      mobs[i].x = g.player.x + 40 + i * 6;
      mobs[i].y = g.player.y;
      mobs[i].hp = 1;
    }
    return { setup: Math.min(10, mobs.length) };
  });
  console.log('[setup-mob-kills]', JSON.stringify(killResult));
  await sleep(5000);
  const afterMobs = await page.evaluate(() => {
    // killStreak isn't exposed; check the display pulse instead
    return {
      kills: window._gameAPI.kills,
      playerKills: window._gameAPI.player.kills,
      farm: window._gameAPI.player._farmKills || 0
    };
  });
  console.log('[after-mob-kills]', JSON.stringify(afterMobs));
  // EXPECT: kills=0, farm>=10

  // === Bug 1 continued: now kill 1 bot → kills should ++ ===
  await page.evaluate(() => {
    var g = window._gameAPI;
    var bots = g.offlineBots;
    bots[0].x = g.player.x + 60;
    bots[0].y = g.player.y;
    bots[0].hp = 1;
    bots[0].factionId = 99; // hostile to player
  });
  await sleep(5000);
  const afterBot = await page.evaluate(() => {
    var g = window._gameAPI;
    var b = g.offlineBots[0];
    return {
      kills: g.kills,
      playerKills: g.player.kills,
      farm: g.player._farmKills || 0,
      botAlive: b.alive,
      botHp: b.hp,
      botIsBot: b.isBot,
      botFaction: b.factionId,
      playerX: Math.round(g.player.x),
      botX: Math.round(b.x)
    };
  });
  console.log('[after-bot-kill]', JSON.stringify(afterBot));
  // EXPECT: kills=1, farm unchanged

  // === Bug 2: region sizes ===
  const regions = await page.evaluate(() => {
    var r = window._gameAPI.decorRegions || [];
    return r.map(rg => ({ type: rg.type, r: Math.round(rg.radius) }));
  });
  console.log('[regions]', JSON.stringify(regions));
  console.log('[region-count]', regions.length);

  // Each region area vs viewport area
  const viewport = await page.evaluate(() => ({ W: window._gameAPI.W, H: window._gameAPI.H }));
  console.log('[viewport]', JSON.stringify(viewport));
  const viewportArea = viewport.W * viewport.H;
  const quarterThreshold = viewportArea / 4;
  regions.forEach(rg => {
    const area = Math.PI * rg.r * rg.r;
    const pct = (area / viewportArea * 100).toFixed(1);
    console.log(`[region ${rg.type}] r=${rg.r} area=${Math.round(area)} (${pct}% of viewport, target ≥25%)`);
  });

  await page.screenshot({ path: '/tmp/2bugs_01_region_overview.png' });

  // Teleport to a big region and screenshot
  await page.evaluate(() => {
    var g = window._gameAPI;
    var rs = g.decorRegions;
    // Find largest region
    var biggest = rs.reduce((a, b) => (a.radius > b.radius ? a : b), rs[0]);
    g.player.x = biggest.cx; g.player.y = biggest.cy;
  });
  await sleep(400);
  await page.screenshot({ path: '/tmp/2bugs_02_inside_region.png' });

  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);
  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
