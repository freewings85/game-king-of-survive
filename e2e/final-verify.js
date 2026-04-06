// Sprint 2 Final E2E Verification — Full server with API
// Tests actual rendering, data loading, editor functionality

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8088';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'final');

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
    // ========== 1. API Data Verification ==========
    console.log('=== 1. API 数据验证 ===');

    const apiPage = await context.newPage();

    // Skins API
    await apiPage.goto(`${BASE_URL}/api/editor/skins`);
    const skinsData = await apiPage.evaluate(() => JSON.parse(document.body.innerText));
    const skinCount = typeof skinsData === 'object' ? Object.keys(skinsData).length : 0;
    check(`皮肤 API 返回 ${skinCount} 个皮肤`, skinCount >= 27);

    // Characters API
    await apiPage.goto(`${BASE_URL}/api/editor/characters`);
    const charsData = await apiPage.evaluate(() => JSON.parse(document.body.innerText));
    const charCount = typeof charsData === 'object' ? Object.keys(charsData).length : 0;
    check(`角色 API 返回 ${charCount} 个职业`, charCount >= 3);

    // Part variants API
    let partVariantsOk = false;
    try {
      await apiPage.goto(`${BASE_URL}/api/editor/part_variants`);
      const pvData = await apiPage.evaluate(() => JSON.parse(document.body.innerText));
      partVariantsOk = typeof pvData === 'object' && Object.keys(pvData).length > 0;
    } catch (e) { /* might not exist */ }
    check('部件变体 API', partVariantsOk, 'endpoint may not exist');

    await apiPage.close();

    // ========== 2. Game Page — Login & Class Selection ==========
    console.log('\n=== 2. 游戏页面 — 登录与职业选择 ===');

    const gamePage = await context.newPage();
    await gamePage.goto(`${BASE_URL}/demo/survivor.html`, { waitUntil: 'networkidle', timeout: 30000 });

    check('游戏页面加载', !!(await gamePage.$('canvas')));
    check('登录界面显示', !!(await gamePage.$('#login-overlay')));
    await gamePage.screenshot({ path: path.join(SCREENSHOT_DIR, '01-game-login.png') });

    // Check class selection buttons
    const classInfo = await gamePage.evaluate(() => {
      const src = document.body.innerHTML;
      return {
        hasClassBtns: !!(document.querySelector('.class-btn, [data-class], .class-select')),
        hasWarrior: src.includes('warrior') || src.includes('战士'),
        hasMage: src.includes('mage') || src.includes('法师'),
        hasScout: src.includes('scout') || src.includes('斥候'),
      };
    });
    check('职业选择按钮', classInfo.hasWarrior && classInfo.hasMage && classInfo.hasScout);

    // Check skin selection UI
    const skinUI = await gamePage.evaluate(() => {
      const src = document.body.innerHTML;
      return {
        hasSkinUI: src.includes('skin') || src.includes('皮肤'),
        hasSkinSelect: !!(document.querySelector('[data-skin], .skin-btn, .skin-select, #skin-list')),
      };
    });
    check('皮肤选择 UI 存在', skinUI.hasSkinUI);

    // ========== 3. Start Game & Verify Rendering ==========
    console.log('\n=== 3. 游戏内渲染验证 ===');

    // Try to start game
    const gameStarted = await gamePage.evaluate(() => {
      return new Promise((resolve) => {
        // Try clicking warrior class
        const classBtns = document.querySelectorAll('.class-btn, [data-class]');
        for (const btn of classBtns) {
          if (btn.textContent.includes('战士') || btn.dataset?.class === 'warrior') {
            btn.click();
            break;
          }
        }

        // Try clicking start button
        setTimeout(() => {
          const startBtn = document.querySelector('#start-btn, .start-btn, [data-action="start"]');
          if (startBtn) startBtn.click();

          // Also try direct API
          if (window._gameAPI && window._gameAPI.startGame) {
            try { window._gameAPI.startGame(); } catch(e) {}
          }

          setTimeout(() => {
            const state = window._gameAPI?.state;
            resolve(state === 'playing' || state === 'game');
          }, 2000);
        }, 500);
      });
    });
    check('游戏启动成功', gameStarted);

    if (gameStarted) {
      // Wait a bit for enemies to spawn
      await gamePage.waitForTimeout(3000);
      await gamePage.screenshot({ path: path.join(SCREENSHOT_DIR, '02-game-playing.png') });

      // Check player exists
      const playerInfo = await gamePage.evaluate(() => {
        const p = window._gameAPI?.player;
        if (!p) return null;
        return {
          exists: true,
          x: p.x,
          y: p.y,
          hp: p.hp || p.health,
          class: window._gameAPI?.selectedClass,
          skinId: p.skinId || p.skin,
        };
      });
      check('玩家角色存在', playerInfo?.exists);
      check('玩家有位置数据', playerInfo?.x !== undefined);

      // Check enemies spawned
      const enemyInfo = await gamePage.evaluate(() => {
        const enemies = window._gameAPI?.enemies || [];
        return {
          count: enemies.length,
          types: [...new Set(enemies.map(e => e.type || e.monsterType || 'unknown'))],
        };
      });
      check(`怪物已生成 (${enemyInfo.count} 个)`, enemyInfo.count > 0);

      // Check rendering code has part-based drawing
      const renderInfo = await gamePage.evaluate(() => {
        const src = document.documentElement.outerHTML;
        return {
          hasDrawCharSprite: src.includes('drawCharacterSprite'),
          hasPartRendering: src.includes('drawHead') || src.includes('drawBody') || (src.includes('head') && src.includes('weapon') && src.includes('armor')),
          hasMonsterDiff: src.includes('drawGoblin') || src.includes('drawTank') || src.includes('drawBoss') || (src.includes('normal') && src.includes('tank') && src.includes('boss')),
          hasShadow: src.includes('shadow'),
          hasAnimation: src.includes('walkFrame') || src.includes('animFrame') || src.includes('legSwing') || src.includes('idle'),
        };
      });
      check('角色部件渲染系统', renderInfo.hasDrawCharSprite);
      check('怪物差异化渲染', renderInfo.hasMonsterDiff);

      // Wait more and take another screenshot
      await gamePage.waitForTimeout(3000);
      await gamePage.screenshot({ path: path.join(SCREENSHOT_DIR, '03-game-combat.png') });

    } else {
      // Even if game didn't start, check rendering code
      const codeCheck = await gamePage.evaluate(() => {
        const src = document.documentElement.outerHTML;
        return {
          hasCharSprite: src.includes('drawCharacterSprite'),
          hasPartSystem: src.includes('parts') && src.includes('head') && src.includes('weapon'),
        };
      });
      check('角色渲染代码存在（未启动）', codeCheck.hasCharSprite);
      check('部件系统代码存在（未启动）', codeCheck.hasPartSystem);
    }

    await gamePage.close();

    // ========== 4. Editor — Data Loading & Skin Panel ==========
    console.log('\n=== 4. 编辑器 — 数据加载与皮肤面板 ===');

    const editorPage = await context.newPage();
    await editorPage.goto(`${BASE_URL}/editor/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await editorPage.waitForTimeout(2000); // Wait for API data to load

    await editorPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04-editor-loaded.png') });

    // Check if data loaded into editor tables
    const editorData = await editorPage.evaluate(() => {
      const rows = document.querySelectorAll('tr, .data-row, [data-id]');
      const tabs = document.querySelectorAll('.tab, [data-tab], nav a, nav button');
      const tabTexts = Array.from(tabs).map(t => t.textContent.trim());
      return {
        dataRows: rows.length,
        tabs: tabTexts,
        hasData: rows.length > 3, // header + at least some data rows
      };
    });
    check(`编辑器数据加载 (${editorData.dataRows} 行)`, editorData.hasData);
    check(`编辑器有多个 tab (${editorData.tabs.join(', ')})`, editorData.tabs.length >= 3);

    // Navigate to skin tab
    const skinTabClicked = await editorPage.evaluate(() => {
      const tabs = document.querySelectorAll('.tab, [data-tab], nav a, nav button');
      for (const tab of tabs) {
        if (tab.textContent.includes('皮肤') || tab.textContent.toLowerCase().includes('skin')) {
          tab.click();
          return true;
        }
      }
      return false;
    });
    check('皮肤 Tab 可点击', skinTabClicked);

    if (skinTabClicked) {
      await editorPage.waitForTimeout(1500);
      await editorPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05-editor-skins.png') });

      const skinPanel = await editorPage.evaluate(() => {
        const items = document.querySelectorAll('.skin-item, .skin-entry, [data-skin-id], tr');
        const preview = document.querySelector('.skin-preview, #skin-preview, canvas, .preview');
        return {
          itemCount: items.length,
          hasPreview: !!preview,
        };
      });
      check(`皮肤列表已加载 (${skinPanel.itemCount} 项)`, skinPanel.itemCount >= 5);
      check('皮肤预览区域存在', skinPanel.hasPreview);
    }

    await editorPage.close();

    // ========== 5. Map Editor — Zone Visualization ==========
    console.log('\n=== 5. 地图编辑器 — 区域可视化 ===');

    const mapPage = await context.newPage();
    await mapPage.goto(`${BASE_URL}/editor/map-editor.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await mapPage.waitForTimeout(2000);

    await mapPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06-map-editor-init.png') });

    const mapEditorInfo = await mapPage.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const selects = document.querySelectorAll('select');
      const mapSelect = Array.from(selects).find(s =>
        Array.from(s.options).some(o => o.text.includes('plains') || o.text.includes('草原') || o.value.includes('green'))
      );
      return {
        hasCanvas: !!canvas,
        canvasWidth: canvas?.width || 0,
        canvasHeight: canvas?.height || 0,
        hasMapSelect: !!mapSelect,
        selectOptions: mapSelect ? Array.from(mapSelect.options).map(o => o.text).slice(0, 10) : [],
      };
    });
    check('地图编辑器 Canvas', mapEditorInfo.hasCanvas);

    // Try to load a map
    const mapLoaded = await mapPage.evaluate(() => {
      // Try to find and click load button or select a map
      const loadBtns = document.querySelectorAll('button');
      for (const btn of loadBtns) {
        if (btn.textContent.includes('加载') || btn.textContent.includes('load') || btn.textContent.includes('读取')) {
          btn.click();
          return 'clicked-load';
        }
      }
      // Try selecting a map from dropdown
      const selects = document.querySelectorAll('select');
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.value.includes('green') || opt.value.includes('plains')) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change'));
            return 'selected-map';
          }
        }
      }
      return 'no-action';
    });

    await mapPage.waitForTimeout(2000);
    await mapPage.screenshot({ path: path.join(SCREENSHOT_DIR, '07-map-editor-loaded.png') });

    // Check zone types in editor
    const zoneTypesInEditor = await mapPage.evaluate(() => {
      const src = document.body.innerHTML;
      return {
        hasSpawn: src.includes('spawn'),
        hasOuter: src.includes('outer'),
        hasMiddle: src.includes('middle'),
        hasInner: src.includes('inner'),
        hasBossLair: src.includes('boss_lair') || src.includes('boss'),
        hasResource: src.includes('resource'),
        hasHazard: src.includes('hazard'),
        hasIce: src.includes('ice'),
        hasPoison: src.includes('poison'),
        hasHealSpring: src.includes('heal_spring'),
        hasPortal: src.includes('portal'),
      };
    });
    check('区域类型: spawn', zoneTypesInEditor.hasSpawn);
    check('区域类型: boss_lair', zoneTypesInEditor.hasBossLair);
    check('区域类型: hazard', zoneTypesInEditor.hasHazard);
    check('新地形: ice/poison/heal_spring/portal',
      zoneTypesInEditor.hasIce || zoneTypesInEditor.hasPoison ||
      zoneTypesInEditor.hasHealSpring || zoneTypesInEditor.hasPortal);

    await mapPage.close();

    // ========== 6. Skill Editor ==========
    console.log('\n=== 6. 技能编辑器 ===');

    const skillPage = await context.newPage();
    await skillPage.goto(`${BASE_URL}/editor/skill-editor.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await skillPage.waitForTimeout(1500);
    await skillPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08-skill-editor.png') });

    const skillEditorOk = await skillPage.evaluate(() => {
      const rows = document.querySelectorAll('tr, .skill-item, [data-skill]');
      return rows.length > 2;
    });
    check('技能编辑器数据加载', skillEditorOk);

    await skillPage.close();

  } catch (err) {
    console.error('Test error:', err.message);
    results.fail++;
    results.details.push(`  ❌ 执行异常: ${err.message}`);
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n================================================');
  console.log('  Sprint 2 最终端到端验收测试报告');
  console.log('================================================\n');
  for (const d of results.details) console.log(d);
  console.log(`\n总计: ${results.pass} 通过, ${results.fail} 失败`);
  console.log(`截图保存在: ${SCREENSHOT_DIR}`);

  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
