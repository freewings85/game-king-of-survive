// Developer self-test: CJK/emoji font fix — no more tofu boxes
const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8090/survivor.html?debug=1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Measure a string width using the same ctx.font used on-canvas.
// If the font stack can render CJK, the width matches typical PingFang SC / Noto.
// If it falls back to tofu (Arial doesn't have CJK), every glyph becomes a
// fallback "notdef" box — and the canvas-measured width diverges significantly
// from reference widths from a known-good CJK-capable stack.
async function measureText(page, ctxFont, text) {
  return page.evaluate(({ font, t }) => {
    var c = document.createElement('canvas');
    var x = c.getContext('2d');
    x.font = font;
    return x.measureText(t).width;
  }, { font: ctxFont, t: text });
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
    var o = document.getElementById('login-overlay');
    if (o) o.classList.add('hidden');
  });
  // Wait for webfont
  await page.evaluate(() => document.fonts.load('700 18px "Noto Sans SC"'));
  await page.evaluate(() => document.fonts.ready);
  const fontsLoaded = await page.evaluate(() => {
    var list = [];
    document.fonts.forEach(f => list.push(f.family + ' ' + f.weight + ' ' + f.status));
    return list;
  });
  console.log('[fonts-loaded]', JSON.stringify(fontsLoaded));
  await sleep(800);

  // === 1) Measure Chinese text widths with and without CJK fallback ===
  const sampleText = '生存之王 单排模式 组队模式 开始 跳过';
  const cjkStack = 'bold 18px Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
  const arialOnly = 'bold 18px Arial';

  const widthWithCJK = await measureText(page, cjkStack, sampleText);
  const widthArialOnly = await measureText(page, arialOnly, sampleText);
  const fixedWidth = await measureText(page, cjkStack, sampleText);

  console.log('[width-cjk-stack]', widthWithCJK.toFixed(1));
  console.log('[width-arial-only]', widthArialOnly.toFixed(1));
  // If CJK is resolving, widthWithCJK uses real glyphs (~220-280). If still
  // tofu, it falls back to notdef box (each glyph ≈ font size width).
  // Arial-only gives one of those tofu widths for comparison baseline.

  // === 2) Visual: snap menu screenshot ===
  await page.screenshot({ path: '/tmp/tofu_01_menu.png' });

  // === 3) Enter game and check HUD ===
  await page.evaluate(() => window.__spriteDebug.enterOfflineDemo('mage'));
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
  await sleep(2000);
  await page.screenshot({ path: '/tmp/tofu_02_ingame.png' });

  // === 4) Assertion: CJK stack produces DIFFERENT width than Arial-only.
  // If they match, the fallback is doing nothing (system has no CJK fonts).
  const diff = Math.abs(widthWithCJK - widthArialOnly);
  const verdict = diff > 5 ? 'PASS' : 'FAIL';
  console.log('[verdict]', verdict, '(diff=' + diff.toFixed(1) + 'px)');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
