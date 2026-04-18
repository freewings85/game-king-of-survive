// Developer self-test: autotile seams + 3-class sprite split
const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8090/survivor.html?debug=1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function capture(label, page) {
  await sleep(400);
  await page.screenshot({ path: `/tmp/autotile_${label}.png` });
}

(async () => {
  const browser = await chromium.launch();
  const iPhone = devices['iPhone 14'];
  const ctx = await browser.newContext({ ...iPhone });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__spriteDebug, { timeout: 8000 });

  await page.evaluate(() => {
    var o = document.getElementById('login-overlay'); if (o) o.classList.add('hidden');
  });
  await sleep(400);

  for (const cls of ['warrior', 'mage', 'scout']) {
    await page.evaluate((c) => window.__spriteDebug.enterOfflineDemo(c), cls);
    await sleep(1500);
    // Dismiss tutorial
    await page.evaluate(() => {
      var c = document.getElementById('c');
      var r = c.getBoundingClientRect();
      c.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: c, clientX: r.left+r.width/2, clientY: r.top+r.height*0.72 })], changedTouches: [new Touch({ identifier: 1, target: c, clientX: r.left+r.width/2, clientY: r.top+r.height*0.72 })] }));
      c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [new Touch({ identifier: 1, target: c, clientX: r.left+r.width/2, clientY: r.top+r.height*0.72 })] }));
    });
    await sleep(1500);
    await page.evaluate(() => {
      var p = window._gameAPI.player;
      if (p) { p.hp = 99999; p.maxHp = 99999; }
    });
    await sleep(2000); // let assets settle
    await capture(cls + '_01_center', page);

    // Verify the correct sheet loaded per class
    const sheetInfo = await page.evaluate(() => {
      var d = window.__spriteDebug;
      return {
        loaded: d.getLoadedSheets ? d.getLoadedSheets() : null,
      };
    });
    console.log(`[${cls}] loaded-sheets:`, JSON.stringify(sheetInfo));
  }

  // Final: check autotile seam coverage — force a tile grid walk
  const tileStats = await page.evaluate(() => {
    var A = window._gameAPI.HOMM3_ART;
    if (!A || !A.tilesetMeta) return null;
    return {
      hasSeams: !!(A.tilesetMeta.seams && A.tilesetMeta.seams.grass_dirt),
      seamKeys: Object.keys(A.tilesetMeta.seams.grass_dirt).sort((a,b)=>+a-+b),
      variantCounts: {
        grass: A.tilesetMeta.variants.grass.length,
        dirt: A.tilesetMeta.variants.dirt.length,
        stone: A.tilesetMeta.variants.stone.length
      }
    };
  });
  console.log('[tileset-schema]', JSON.stringify(tileStats));

  // Walk player to a dirt/stone patch corner by scanning biome grid
  const seamCheck = await page.evaluate(() => {
    // Count how many visible tiles ended up as seams vs plain by sampling pixel cols
    var c = document.getElementById('c');
    var g = c.getContext('2d');
    // Sample a 200×200 patch in the gameplay area and count dirt-ish pixels
    var data = g.getImageData(c.width/2 - 100, c.height/2 - 100, 200, 200);
    var brown = 0, greens = 0, total = 0;
    for (var i = 0; i < data.data.length; i += 4) {
      var r = data.data[i], gr = data.data[i+1], b = data.data[i+2];
      total++;
      if (r > 90 && r > gr && gr > b && b < 80) brown++; // dirt-ish
      if (gr > r && gr > b && gr > 70) greens++;
    }
    return { greenPct: (greens/total*100).toFixed(1), dirtPct: (brown/total*100).toFixed(1) };
  });
  console.log('[pixel-mix]', JSON.stringify(seamCheck));

  // FPS
  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, start = performance.now();
    function tick() { n++; if (performance.now() - start >= 1500) return res((n / ((performance.now() - start) / 1000)).toFixed(1)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  console.log('[fps]', fps);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
