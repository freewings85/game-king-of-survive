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

  const regions = await page.evaluate(() => {
    var r = window._gameAPI.decorRegions || [];
    return r.map(rg => ({ cx: Math.round(rg.cx), cy: Math.round(rg.cy), r: Math.round(rg.radius), type: rg.type }));
  });
  console.log('[regions]', JSON.stringify(regions));
  console.log('[region-count]', regions.length);

  // Verify corridor: min distance between any two regions (center-to-center minus radii)
  let minGap = Infinity;
  for (let i = 0; i < regions.length; i++) {
    for (let j = i+1; j < regions.length; j++) {
      const a = regions[i], b = regions[j];
      const d = Math.sqrt((a.cx-b.cx)**2 + (a.cy-b.cy)**2);
      const gap = d - a.r - b.r;
      if (gap < minGap) minGap = gap;
    }
  }
  console.log('[min-corridor]', minGap);

  // Verify spawn not in region
  const spawnInRegion = await page.evaluate(() => {
    var g = window._gameAPI;
    var sx = g.WORLD_W / 2, sy = g.WORLD_H / 2;
    var rs = g.decorRegions || [];
    for (var i = 0; i < rs.length; i++) {
      var d = Math.sqrt((sx-rs[i].cx)**2 + (sy-rs[i].cy)**2);
      if (d < rs[i].radius) return { inside: true, region: i };
    }
    return { inside: false };
  });
  console.log('[spawn-check]', JSON.stringify(spawnInRegion));

  // Decor summary
  const decor = await page.evaluate(() => {
    var d = window._gameAPI.decorItems || [];
    var byName = {}, byRegion = 0, sparse = 0;
    d.forEach(it => {
      byName[it.name] = (byName[it.name] || 0) + 1;
      if (it.regionId >= 0) byRegion++; else sparse++;
    });
    return { total: d.length, byName, byRegion, sparse };
  });
  console.log('[decor-summary]', JSON.stringify(decor));

  await page.screenshot({ path: '/tmp/regions_01_center.png' });

  // Walk camera to TL and BR to see different regions
  await page.evaluate(() => {
    var g = window._gameAPI;
    g.player.x = 200; g.player.y = 200;
  });
  await sleep(300);
  await page.screenshot({ path: '/tmp/regions_02_TL.png' });

  await page.evaluate(() => {
    var g = window._gameAPI;
    g.player.x = g.WORLD_W - 200; g.player.y = g.WORLD_H - 200;
  });
  await sleep(300);
  await page.screenshot({ path: '/tmp/regions_03_BR.png' });

  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);
  console.log('[errors]', errs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
