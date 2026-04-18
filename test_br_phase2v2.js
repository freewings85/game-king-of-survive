// Self-test: BR + MOBA (Phase 2 v2) — mobs continuous, bots farm, 4v4 mode
const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8090/survivor.html?debug=1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runMode(page, mode) {
  await page.evaluate((m) => {
    window._gameAPI.gameMode = m;
    window.__spriteDebug.enterOfflineDemo('mage');
  }, mode);
  await sleep(1200);
  // Force tutorial skip via _gameAPI hook
  await page.evaluate(() => {
    window._gameAPI.tutorialDone = true;
    var p = window._gameAPI.player;
    if (p) { p.hp = 99999; p.maxHp = 99999; }
  });
  await sleep(400);
}

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
  await sleep(600);

  // === Solo mode ===
  await runMode(page, 'solo');
  await sleep(2500);
  const solo = await page.evaluate(() => {
    var g = window._gameAPI;
    var bots = g.offlineBots || [];
    var mobs = g.offlineEnemies || [];
    return {
      mode: window.gameMode || 'n/a',
      playerFaction: g.player && g.player.factionId,
      botFactions: bots.map(b => b.factionId),
      aliveMobs: mobs.filter(e => e.alive && e.hostile).length,
      bossAlive: mobs.filter(e => e.alive && (e.type === 'boss' || e.type === 'miniBoss')).length,
      alivePlayers: (g.player.alive !== false ? 1 : 0) + bots.filter(b=>b.alive).length
    };
  });
  console.log('[solo-init]', JSON.stringify(solo));
  await page.screenshot({ path: '/tmp/brv2_01_solo_start.png' });

  // Let 10s pass for bots to farm
  await sleep(10000);
  const solo10 = await page.evaluate(() => {
    var g = window._gameAPI;
    var bots = g.offlineBots || [];
    var mobs = g.offlineEnemies || [];
    var farmingBots = bots.filter(b => b.alive && b._aiState === 'farm').length;
    var engaging = bots.filter(b => b.alive && b._aiState === 'engage').length;
    var pushing = bots.filter(b => b.alive && b._aiState === 'push').length;
    return {
      t: Math.floor(g.gameTimer),
      aliveMobs: mobs.filter(e => e.alive && e.hostile).length,
      farmingBots, engaging, pushing,
      bossAlive: mobs.filter(e => e.alive && e.type === 'boss').length,
      kills: g.kills
    };
  });
  console.log('[solo-10s]', JSON.stringify(solo10));
  await page.screenshot({ path: '/tmp/brv2_02_solo_10s.png' });

  // Force boss spawn immediately by pushing timer to 0
  await page.evaluate(() => {
    // Reach into window via _gameAPI? No direct handle. Use debug route:
    // just let it run and poll. First boss at 120s is too slow for headless test.
    // We'll fast-forward gameTime via the player HP trick won't work.
    // Instead we exploit: bots farm fast → eventually boss timer hits.
  });
  await sleep(15000);
  const solo25 = await page.evaluate(() => {
    var mobs = window._gameAPI.offlineEnemies || [];
    return {
      t: Math.floor(window._gameAPI.gameTimer),
      aliveMobs: mobs.filter(e => e.alive && e.hostile).length,
      alivePlayers: (window._gameAPI.player.alive !== false ? 1 : 0) + (window._gameAPI.offlineBots || []).filter(b=>b.alive).length,
      kills: window._gameAPI.kills
    };
  });
  console.log('[solo-25s]', JSON.stringify(solo25));
  await page.screenshot({ path: '/tmp/brv2_03_solo_mid.png' });

  // === Team mode ===
  await page.evaluate(() => { window._gameAPI.state = 'menu'; });
  await sleep(500);
  await runMode(page, 'team');
  await sleep(3000);
  const team = await page.evaluate(() => {
    var g = window._gameAPI;
    var bots = g.offlineBots || [];
    return {
      mode: window.gameMode,
      playerFaction: g.player.factionId,
      botFactions: bots.map(b => b.factionId),
      team1Count: bots.filter(b => b.factionId === 1).length + 1, // +player
      team2Count: bots.filter(b => b.factionId === 2).length
    };
  });
  console.log('[team]', JSON.stringify(team));
  await page.screenshot({ path: '/tmp/brv2_04_team.png' });

  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);
  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
