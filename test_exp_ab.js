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
    if (p) { p.hp = 99999; p.maxHp = 100; p.hp = 30; } // start damaged to verify heal
  });
  await sleep(1500);

  // === Experiment A verification: bot archetypes ===
  const archetypes = await page.evaluate(() => {
    var bots = window._gameAPI.offlineBots || [];
    return bots.map(b => ({ name: b.name, arch: b.archetype, archName: b.archetypeName, hp: b.hp, spd: b.speed, dmg: b.attackDamage, cd: b.attackCooldown.toFixed(2) }));
  });
  console.log('[bot-archetypes]');
  archetypes.forEach(a => console.log('  ', JSON.stringify(a)));
  // Check uniqueness — should see multiple different archetypes
  const uniqArch = new Set(archetypes.map(a => a.arch)).size;
  console.log('[unique-archetype-count]', uniqArch, '/ 7 bots');

  // === Experiment A: force level up and check synergy preview ===
  // Set up player with Lv3 attack_up + Lv3 attack_speed → next pick should trigger berserker evolution
  await page.evaluate(() => {
    window._gameAPI.skillLevels = window._gameAPI.skillLevels || {};
    window.skillLevels = window.skillLevels || {};
    // Manipulate via sneaky: call forceLevelUp multiple times with manual skillLevels
    window._gameAPI.state = 'playing';
  });
  // skillLevels isn't exposed via API — use internal hooks
  await page.evaluate(() => {
    // Access via __spriteDebug which has hooks
    // We'll just call forceLevelUp 3 times for attack_up, then 3 for attack_speed via applySkill
    // But applySkill isn't exposed either. Just forceLevelUp and accept random picks.
    window.__spriteDebug.forceLevelUp();
  });
  await sleep(600);
  const levelUpState = await page.evaluate(() => ({
    state: window._gameAPI.state,
    level: window._gameAPI.playerLevel
  }));
  console.log('[levelup]', JSON.stringify(levelUpState));
  await page.screenshot({ path: '/tmp/expAB_01_levelup.png' });

  // === Experiment B: PVP kill → 30% heal ===
  await page.evaluate(() => { window._gameAPI.state = 'playing'; });
  await sleep(400);
  await page.evaluate(() => {
    var g = window._gameAPI;
    g.player.hp = 30; g.player.maxHp = 100;
    // Teleport a bot next to player, hostile, 1 hp
    var b = g.offlineBots[0];
    b.x = g.player.x + 60; b.y = g.player.y; b.hp = 1; b.factionId = 99;
  });
  await sleep(2500);
  const afterPvp = await page.evaluate(() => ({
    hp: Math.round(window._gameAPI.player.hp),
    kills: window._gameAPI.kills,
    botAlive: window._gameAPI.offlineBots[0].alive
  }));
  console.log('[after-pvp]', JSON.stringify(afterPvp));
  await page.screenshot({ path: '/tmp/expAB_02_pvpheal.png' });

  // === Experiment B: boss kill → XP shard ===
  await page.evaluate(() => {
    var g = window._gameAPI;
    // Force-spawn a weak boss near player
    var mobs = g.offlineEnemies;
    mobs.push({
      x: g.player.x + 70, y: g.player.y, hp: 1, maxHp: 100,
      speed: 10, radius: 40, type: 'boss', color: '#882222',
      alive: true, _angle: 0, _moveTimer: 0, hostile: true,
      bossTypeId: 'stone_giant', bossTypeName: '石巨人'
    });
  });
  const bossXpBefore = await page.evaluate(() => window._gameAPI.playerLevel);
  await sleep(2500);
  const bossXpAfter = await page.evaluate(() => ({
    level: window._gameAPI.playerLevel,
    mobs: window._gameAPI.offlineEnemies.filter(m => m.bossTypeId && m.alive).length
  }));
  console.log('[boss-kill]', 'lvl', bossXpBefore, '→', JSON.stringify(bossXpAfter));
  await page.screenshot({ path: '/tmp/expAB_03_bosskill.png' });

  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);
  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
