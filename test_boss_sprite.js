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
  await sleep(1200);
  await page.evaluate(() => {
    window._gameAPI.tutorialDone = true;
    var p = window._gameAPI.player;
    if (p) { p.hp = 99999; p.maxHp = 99999; }
  });
  await sleep(1500);

  // Wait for boss assets
  await sleep(2000);
  const bossAssets = await page.evaluate(() => {
    var A = window._gameAPI.HOMM3_ART;
    var out = {};
    Object.keys(A.bossImgs || {}).forEach(k => {
      out[k] = { imgReady: A.bossImgs[k].ready, metaLoaded: !!A.bossMetas[k] };
    });
    return out;
  });
  console.log('[boss-assets]', JSON.stringify(bossAssets));

  // Iterate each species: force a spawn directly in front of player
  const speciesIds = ['stone_giant', 'shadow_mage', 'berserker', 'frost_dragon', 'rot_troll'];
  for (const id of speciesIds) {
    await page.evaluate((sid) => {
      var g = window._gameAPI;
      // Remove any live boss
      var mobs = g.offlineEnemies;
      for (var i = 0; i < mobs.length; i++) if (mobs[i].type === 'boss') mobs[i].alive = false;
      // Spawn a boss right next to player using internal spawn helper
      // Can't call private fn; manipulate by pushing raw
      var p = g.player;
      var newBoss = {
        x: p.x + 160, y: p.y,
        hp: 2000, maxHp: 2000,
        speed: 20, radius: 60, type: 'boss', color: '#882222',
        alive: true, _angle: 0, _moveTimer: 0, hostile: true,
        bossTypeId: sid, bossTypeName: sid
      };
      mobs.push(newBoss);
    }, id);
    await sleep(800);
    await page.screenshot({ path: `/tmp/boss_${id}.png` });
    console.log(`[${id}] shot`);
  }

  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
