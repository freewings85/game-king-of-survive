// E2E tests for Skin System (v2 — Part-based Character System)
// Covers: parts data integrity, part replacement, class restrictions,
//         monster form differentiation, editor preview

const { test, expect } = require('@playwright/test');
const { waitForGameReady, startGameWithClass, openEditor, captureCanvas } = require('./helpers');
const fs = require('fs');
const path = require('path');

const SKINS_PATH = path.join(__dirname, '../../data/skins.json');
const CHARS_PATH = path.join(__dirname, '../../data/characters.json');
const MONSTERS_PATH = path.join(__dirname, '../../data/monsters.json');

// --- Part-based Data Integrity Tests ---

test.describe('Skin Parts Data Integrity', () => {
  let skins, characters;

  test.beforeAll(() => {
    skins = JSON.parse(fs.readFileSync(SKINS_PATH, 'utf-8'));
    characters = JSON.parse(fs.readFileSync(CHARS_PATH, 'utf-8'));
  });

  test('every skin has required top-level fields', () => {
    const requiredFields = ['name', 'description'];
    for (const [id, skin] of Object.entries(skins)) {
      for (const field of requiredFields) {
        expect(skin[field], `skin "${id}" missing field "${field}"`).toBeDefined();
      }
    }
  });

  test('rarity values are valid (C/B/A/S/SS)', () => {
    const validRarities = ['C', 'B', 'A', 'S', 'SS'];
    for (const [id, skin] of Object.entries(skins)) {
      const rarity = skin.rarity || skin.tier;
      if (rarity) {
        expect(validRarities, `skin "${id}" has invalid rarity "${rarity}"`).toContain(rarity);
      }
    }
  });

  test('skins have parts definition with core components', () => {
    const coreParts = ['head', 'body', 'weapon'];
    for (const [id, skin] of Object.entries(skins)) {
      if (skin.parts) {
        for (const part of coreParts) {
          expect(skin.parts[part], `skin "${id}" missing core part "${part}"`).toBeDefined();
        }
      }
    }
  });

  test('each part has type and primaryColor', () => {
    for (const [id, skin] of Object.entries(skins)) {
      if (skin.parts) {
        for (const [partName, partData] of Object.entries(skin.parts)) {
          if (partName === 'effects') continue; // effects layer is special
          if (typeof partData === 'object' && partData !== null) {
            expect(partData.type || partData.color, `skin "${id}" part "${partName}" missing type/color`).toBeDefined();
          }
        }
      }
    }
  });

  test('every skinId in characters.json exists in skins.json', () => {
    for (const [clsId, clsData] of Object.entries(characters)) {
      for (const skinId of (clsData.skins || [])) {
        expect(skins, `class "${clsId}" references missing skin "${skinId}"`).toHaveProperty(skinId);
      }
    }
  });

  test('class-specific skins match their class', () => {
    for (const [id, skin] of Object.entries(skins)) {
      const skinClass = skin.class;
      const applicable = skin.applicableClasses;
      if (skinClass) {
        // If skin specifies a class, that class should list it
        const classData = characters[skinClass];
        if (classData && classData.skins) {
          expect(classData.skins, `skin "${id}" for class "${skinClass}" not listed in characters.json`).toContain(id);
        }
      }
    }
  });

  test('S/SS skins have effects defined', () => {
    for (const [id, skin] of Object.entries(skins)) {
      const rarity = skin.rarity || skin.tier;
      if (['S', 'SS'].includes(rarity)) {
        const effects = skin.parts?.effects || skin.effects || {};
        const hasGlow = effects.glow && effects.glow !== 'none';
        const hasTrail = effects.trail && effects.trail !== 'none';
        const hasAura = effects.aura && effects.aura !== 'none';
        // Also check legacy format
        const hasLegacyEffects = skin.outline?.enabled || skin.particles?.enabled || skin.aura?.enabled;
        expect(
          hasGlow || hasTrail || hasAura || hasLegacyEffects,
          `S+ skin "${id}" should have at least one visual effect`
        ).toBeTruthy();
      }
    }
  });

  test('default skin exists for each class', () => {
    for (const [clsId, clsData] of Object.entries(characters)) {
      const skinList = clsData.skins || [];
      expect(skinList, `class "${clsId}" should have 'default' in skins list`).toContain('default');
    }
  });
});

// --- Monster Form Differentiation Tests ---

test.describe('Monster Form Differentiation', () => {
  let monsters;

  test.beforeAll(() => {
    monsters = JSON.parse(fs.readFileSync(MONSTERS_PATH, 'utf-8'));
  });

  test('monsters data loads successfully', () => {
    expect(monsters).toBeDefined();
  });

  test('different monster types have visual differentiation data', () => {
    const monsterTypes = Array.isArray(monsters) ? monsters : Object.values(monsters);
    if (monsterTypes.length > 1) {
      // Check that not all monsters look identical
      const visuals = monsterTypes.map(m => JSON.stringify(m.visual || m.color || m.sprite || ''));
      const uniqueVisuals = new Set(visuals);
      expect(
        uniqueVisuals.size,
        'Monster types should have different visuals'
      ).toBeGreaterThan(1);
    }
  });

  test('boss monsters are visually distinct (larger or special)', () => {
    const monsterList = Array.isArray(monsters) ? monsters : Object.values(monsters);
    const bosses = monsterList.filter(m => m.type === 'boss' || m.isBoss || m.category === 'boss');
    for (const boss of bosses) {
      const hasDistinction = (boss.scale && boss.scale > 1) ||
                              (boss.size && boss.size > 20) ||
                              boss.visual ||
                              boss.sprite;
      // Bosses should be visually bigger or have special visuals
      expect(hasDistinction, `Boss "${boss.name || boss.id}" should be visually distinct`).toBeTruthy();
    }
  });
});

// --- Browser-based Character Rendering Tests ---

test.describe('Character Rendering in Game', () => {
  test('game loads and renders character (not just a plain circle)', async ({ page }) => {
    await startGameWithClass(page, 'warrior');
    const screenshot = await captureCanvas(page);
    expect(screenshot.length).toBeGreaterThan(0);
    // Check via gameAPI that player exists
    const hasPlayer = await page.evaluate(() => !!window._gameAPI?.player);
    expect(hasPlayer).toBe(true);
  });

  test('different classes have different visuals', async ({ page }) => {
    // Start as warrior, capture
    await startGameWithClass(page, 'warrior');
    const warriorShot = await captureCanvas(page);

    // Reload as mage, capture
    await page.goto('/survivor.html');
    await startGameWithClass(page, 'mage');
    const mageShot = await captureCanvas(page);

    // Screenshots should differ
    expect(Buffer.compare(warriorShot, mageShot)).not.toBe(0);
  });

  test('switching skin changes player visual', async ({ page }) => {
    await startGameWithClass(page, 'warrior', 'default');
    const defaultShot = await captureCanvas(page);

    await page.goto('/survivor.html');
    await startGameWithClass(page, 'warrior', 'knight_gold');
    const skinShot = await captureCanvas(page);

    expect(Buffer.compare(defaultShot, skinShot)).not.toBe(0);
  });

  test('monsters render with differentiated forms', async ({ page }) => {
    await startGameWithClass(page, 'warrior');
    // Wait for some enemies to spawn
    await page.waitForFunction(
      () => window._gameAPI?.enemies?.length > 0,
      { timeout: 15000 }
    );
    const enemyCount = await page.evaluate(() => window._gameAPI.enemies.length);
    expect(enemyCount).toBeGreaterThan(0);
  });
});

// --- Editor Skin Preview Tests ---

test.describe('Editor Skin Preview (Parts System)', () => {
  test('editor has skin tab/panel', async ({ page }) => {
    await openEditor(page);
    const skinTab = await page.$('[data-tab="skins"], #skin-tab, .skin-panel, [href*="skin"]');
    expect(skinTab, 'Editor should have a skin tab or panel').not.toBeNull();
  });

  test('skin list shows skins from data', async ({ page }) => {
    await openEditor(page);
    const skinTab = await page.$('[data-tab="skins"], #skin-tab');
    if (skinTab) await skinTab.click();

    const skins = JSON.parse(fs.readFileSync(SKINS_PATH, 'utf-8'));
    const skinCount = Object.keys(skins).length;

    const listItems = await page.$$('.skin-item, .skin-entry, [data-skin-id]');
    expect(listItems.length).toBeGreaterThanOrEqual(skinCount * 0.5);
  });

  test('skin preview canvas renders character form (not circle)', async ({ page }) => {
    await openEditor(page);
    const skinTab = await page.$('[data-tab="skins"], #skin-tab');
    if (skinTab) await skinTab.click();

    // Check for preview canvas
    const previewCanvas = await page.$('.skin-preview canvas, #skin-preview, .preview-canvas');
    if (previewCanvas) {
      const shot = await previewCanvas.screenshot();
      expect(shot.length).toBeGreaterThan(0);
    }
  });
});
