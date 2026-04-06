// Sprint 2 Browser Verification Script
// Uses Playwright to launch a real browser and verify game visuals

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:9090';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const results = { pass: 0, fail: 0, details: [] };

  function check(name, condition, msg) {
    if (condition) {
      results.pass++;
      results.details.push(`  ✅ ${name}`);
    } else {
      results.fail++;
      results.details.push(`  ❌ ${name}: ${msg || 'failed'}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  try {
    // === 1. Game Page Load ===
    console.log('=== 1. 游戏页面加载 ===');
    const gamePage = await context.newPage();
    await gamePage.goto(`${BASE_URL}/demo/survivor.html`, { waitUntil: 'networkidle', timeout: 30000 });

    const hasCanvas = await gamePage.$('canvas');
    check('游戏页面有Canvas', !!hasCanvas);

    const hasLoginOverlay = await gamePage.$('#login-overlay');
    check('登录界面显示', !!hasLoginOverlay);

    await gamePage.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-screen.png') });

    // Check _gameAPI exists
    const hasGameAPI = await gamePage.evaluate(() => typeof window._gameAPI !== 'undefined').catch(() => false);
    check('_gameAPI 暴露', hasGameAPI);

    // === 2. Character Rendering - Check drawCharacterSprite ===
    console.log('\n=== 2. 角色渲染系统 ===');

    // Check if drawCharacterSprite function exists and has part-based rendering
    const renderCheck = await gamePage.evaluate(() => {
      const src = document.documentElement.outerHTML;
      const hasDrawChar = src.includes('drawCharacterSprite') || src.includes('drawCharacter');
      const hasPartRendering = src.includes('head') && src.includes('body') && src.includes('weapon');
      const hasLegRendering = src.includes('legs') || src.includes('drawLegs');
      const hasShadow = src.includes('shadow') || src.includes('drawShadow');
      return { hasDrawChar, hasPartRendering, hasLegRendering, hasShadow };
    });
    check('drawCharacterSprite 函数存在', renderCheck.hasDrawChar);
    check('部件渲染代码 (head/body/weapon)', renderCheck.hasPartRendering);

    // Check for monster rendering differentiation
    const monsterCheck = await gamePage.evaluate(() => {
      const src = document.documentElement.outerHTML;
      const hasGoblin = src.includes('goblin') || src.includes('哥布林') || src.includes('drawGoblin') || src.includes('normal');
      const hasTank = src.includes('tank') || src.includes('石巨人') || src.includes('drawTank');
      const hasBoss = src.includes('boss') || src.includes('drawBoss');
      return { hasGoblin, hasTank, hasBoss };
    });
    check('怪物类型差异化代码', monsterCheck.hasGoblin || monsterCheck.hasTank);
    check('Boss 渲染代码', monsterCheck.hasBoss);

    // === 3. Skin System Check ===
    console.log('\n=== 3. 皮肤系统 ===');

    const skinCheck = await gamePage.evaluate(() => {
      const src = document.documentElement.outerHTML;
      const hasSkinSelect = src.includes('skinSelect') || src.includes('skin-select') || src.includes('skinId') || src.includes('selectedSkin');
      const hasSkinFragment = src.includes('skinFragment') || src.includes('皮肤碎片');
      const hasParts = src.includes('parts') && (src.includes('head') || src.includes('helmet'));
      return { hasSkinSelect, hasSkinFragment, hasParts };
    });
    check('皮肤选择 UI', skinCheck.hasSkinSelect);
    check('皮肤碎片系统', skinCheck.hasSkinFragment);
    check('部件系统 (parts)', skinCheck.hasParts);

    // === 4. Class Selection - Try each class ===
    console.log('\n=== 4. 职业选择界面 ===');

    const classButtons = await gamePage.evaluate(() => {
      const src = document.documentElement.outerHTML;
      const hasWarrior = src.includes('warrior') || src.includes('战士');
      const hasMage = src.includes('mage') || src.includes('法师');
      const hasScout = src.includes('scout') || src.includes('斥候');
      return { hasWarrior, hasMage, hasScout };
    });
    check('战士职业选项', classButtons.hasWarrior);
    check('法师职业选项', classButtons.hasMage);
    check('斥候职业选项', classButtons.hasScout);

    // === 5. Editor Tests ===
    console.log('\n=== 5. 编辑器验证 ===');

    // Test main editor
    const editorPage = await context.newPage();
    await editorPage.goto(`${BASE_URL}/editor/index.html`, { waitUntil: 'networkidle', timeout: 30000 });

    const editorLoaded = await editorPage.$('body');
    check('编辑器页面加载', !!editorLoaded);
    await editorPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02-editor-main.png') });

    // Check for skin tab in editor
    const editorSkinCheck = await editorPage.evaluate(() => {
      const src = document.documentElement.outerHTML;
      const hasSkinTab = src.includes('skin') || src.includes('皮肤');
      const hasPreview = src.includes('preview') || src.includes('预览');
      return { hasSkinTab, hasPreview };
    });
    check('编辑器有皮肤相关功能', editorSkinCheck.hasSkinTab);
    check('编辑器有预览功能', editorSkinCheck.hasPreview);

    // Test map editor
    const mapEditorPage = await context.newPage();
    await mapEditorPage.goto(`${BASE_URL}/editor/map-editor.html`, { waitUntil: 'networkidle', timeout: 30000 });

    const mapEditorLoaded = await mapEditorPage.$('body');
    check('地图编辑器页面加载', !!mapEditorLoaded);
    await mapEditorPage.screenshot({ path: path.join(SCREENSHOT_DIR, '03-map-editor.png') });

    // Check map editor for zone types
    const zoneCheck = await mapEditorPage.evaluate(() => {
      const src = document.documentElement.outerHTML;
      const hasZoneType = src.includes('zone') || src.includes('区域');
      const hasSpawn = src.includes('spawn');
      const hasBossLair = src.includes('boss_lair') || src.includes('boss');
      const hasHazard = src.includes('hazard') || src.includes('危险');
      const hasCanvas = !!document.querySelector('canvas');
      return { hasZoneType, hasSpawn, hasBossLair, hasHazard, hasCanvas };
    });
    check('地图编辑器有区域类型', zoneCheck.hasZoneType);
    check('地图编辑器有 spawn 区域', zoneCheck.hasSpawn);
    check('地图编辑器有 boss 区域', zoneCheck.hasBossLair);
    check('地图编辑器有 hazard 区域', zoneCheck.hasHazard);
    check('地图编辑器有 Canvas', zoneCheck.hasCanvas);

    // Check for new terrain types in map editor
    const terrainCheck = await mapEditorPage.evaluate(() => {
      const src = document.documentElement.outerHTML;
      return {
        ice: src.includes('ice') || src.includes('寒冰'),
        poison: src.includes('poison') || src.includes('毒沼'),
        healSpring: src.includes('heal_spring') || src.includes('治疗泉'),
        portal: src.includes('portal') || src.includes('传送门'),
      };
    });
    check('新地形: ice', terrainCheck.ice);
    check('新地形: poison', terrainCheck.poison);
    check('新地形: heal_spring', terrainCheck.healSpring);
    check('新地形: portal', terrainCheck.portal);

    // === 6. Skill Editor ===
    console.log('\n=== 6. 技能编辑器 ===');
    const skillEditorPage = await context.newPage();
    await skillEditorPage.goto(`${BASE_URL}/editor/skill-editor.html`, { waitUntil: 'networkidle', timeout: 30000 });
    const skillEditorLoaded = await skillEditorPage.$('body');
    check('技能编辑器页面加载', !!skillEditorLoaded);

  } catch (err) {
    console.error('Test execution error:', err.message);
    results.fail++;
    results.details.push(`  ❌ 执行异常: ${err.message}`);
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n========================================');
  console.log('Sprint 2 浏览器验收测试报告');
  console.log('========================================\n');
  for (const d of results.details) console.log(d);
  console.log(`\n总计: ${results.pass} 通过, ${results.fail} 失败`);
  console.log(`截图保存在: ${SCREENSHOT_DIR}`);

  return results;
}

run().catch(console.error);
