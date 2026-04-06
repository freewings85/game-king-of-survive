// E2E tests for Map Zone System
// Covers: zone data integrity, zone rendering, editor integration

const { test, expect } = require('@playwright/test');
const { openEditor } = require('./helpers');
const fs = require('fs');
const path = require('path');

const MAPS_DIR = path.join(__dirname, '../../data/maps');

// --- Zone Data Integrity Tests ---

test.describe('Map Zone Data Integrity', () => {
  let maps;
  const validZoneTypes = ['spawn', 'outer', 'middle', 'inner', 'boss_lair', 'resource', 'hazard'];
  const validShapes = ['circle', 'rect'];

  test.beforeAll(() => {
    maps = {};
    const files = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, file), 'utf-8'));
      maps[file] = data;
    }
  });

  test('all maps have zones defined', () => {
    for (const [file, map] of Object.entries(maps)) {
      expect(map.zones, `map "${file}" should have zones array`).toBeDefined();
      expect(Array.isArray(map.zones), `map "${file}" zones should be an array`).toBe(true);
      expect(map.zones.length, `map "${file}" should have at least 1 zone`).toBeGreaterThan(0);
    }
  });

  test('each zone has required fields', () => {
    const requiredFields = ['type'];
    for (const [file, map] of Object.entries(maps)) {
      for (const zone of (map.zones || [])) {
        for (const field of requiredFields) {
          expect(zone[field], `zone in "${file}" missing "${field}"`).toBeDefined();
        }
      }
    }
  });

  test('zone types are valid', () => {
    for (const [file, map] of Object.entries(maps)) {
      for (const zone of (map.zones || [])) {
        if (zone.type) {
          expect(
            validZoneTypes,
            `zone type "${zone.type}" in "${file}" is not a standard type`
          ).toContain(zone.type);
        }
      }
    }
  });

  test('every map has a spawn zone', () => {
    for (const [file, map] of Object.entries(maps)) {
      const hasSpawn = (map.zones || []).some(z => z.type === 'spawn');
      expect(hasSpawn, `map "${file}" should have at least one spawn zone`).toBe(true);
    }
  });

  test('zone shapes are valid and have correct geometry fields', () => {
    for (const [file, map] of Object.entries(maps)) {
      for (const zone of (map.zones || [])) {
        if (zone.shape) {
          expect(validShapes, `invalid shape "${zone.shape}" in "${file}"`).toContain(zone.shape);
          if (zone.shape === 'circle') {
            expect(zone.center, `circle zone in "${file}" needs center`).toBeDefined();
            expect(zone.radius, `circle zone in "${file}" needs radius`).toBeDefined();
          } else if (zone.shape === 'rect') {
            expect(zone.bounds, `rect zone in "${file}" needs bounds`).toBeDefined();
          }
        }
      }
    }
  });

  test('monster level ranges are valid', () => {
    for (const [file, map] of Object.entries(maps)) {
      for (const zone of (map.zones || [])) {
        if (zone.monsterLevelRange) {
          expect(zone.monsterLevelRange.length).toBe(2);
          expect(zone.monsterLevelRange[0]).toBeLessThanOrEqual(zone.monsterLevelRange[1]);
          expect(zone.monsterLevelRange[0]).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  test('spawn rates are non-negative', () => {
    for (const [file, map] of Object.entries(maps)) {
      for (const zone of (map.zones || [])) {
        if (zone.spawnRate !== undefined) {
          expect(zone.spawnRate, `negative spawnRate in "${file}"`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test('boss_lair zones have boss in allowedMonsters', () => {
    for (const [file, map] of Object.entries(maps)) {
      for (const zone of (map.zones || [])) {
        if (zone.type === 'boss_lair' && zone.allowedMonsters) {
          expect(
            zone.allowedMonsters,
            `boss_lair in "${file}" should allow boss monsters`
          ).toContain('boss');
        }
      }
    }
  });

  test('difficulty progression: inner zones have higher level than outer', () => {
    for (const [file, map] of Object.entries(maps)) {
      const outerZones = (map.zones || []).filter(z => z.type === 'outer' && z.monsterLevelRange);
      const innerZones = (map.zones || []).filter(z => z.type === 'inner' && z.monsterLevelRange);

      if (outerZones.length > 0 && innerZones.length > 0) {
        const maxOuterLevel = Math.max(...outerZones.map(z => z.monsterLevelRange[1]));
        const minInnerLevel = Math.min(...innerZones.map(z => z.monsterLevelRange[0]));
        expect(
          minInnerLevel,
          `inner zones in "${file}" should be harder than outer`
        ).toBeGreaterThanOrEqual(maxOuterLevel - 2); // allow some overlap
      }
    }
  });
});

// --- Editor Zone Tests ---

test.describe('Editor Zone Integration', () => {
  test('editor loads map list', async ({ page }) => {
    await openEditor(page, '/editor/map-editor.html');
    // Check for map selection UI
    const mapSelect = await page.$('select, [data-maps], .map-list');
    expect(mapSelect, 'Editor should have map selection UI').not.toBeNull();
  });

  test('editor shows zone visualization on canvas', async ({ page }) => {
    await openEditor(page, '/editor/map-editor.html');
    const canvas = await page.$('canvas');
    expect(canvas, 'Map editor should have a canvas').not.toBeNull();
  });
});
