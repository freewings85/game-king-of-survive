const { chromium } = require('playwright');

const baseUrl = process.env.KOS_BASE_URL || 'http://localhost:8081';

function fail(message, detail) {
  console.error(message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exitCode = 1;
}

async function collectErrors(page) {
  const logs = [];
  page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => logs.push({ type: 'pageerror', text: err.message }));
  return logs;
}

async function verifyContractRuntime(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    deviceScaleFactor: 2
  });
  const logs = await collectErrors(page);
  await page.goto(`${baseUrl}/frontend/index.html?map=v03_contract`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(700);
  await page.locator('#btn-guest').click();
  await page.waitForFunction(() => window._gameAPI && window._gameAPI.state === 'playing' && window._gameAPI.offlineMode, null, { timeout: 8000 });
  const info = await page.evaluate(() => {
    const map = window.__MAP_DATA && window.__MAP_DATA();
    const checks = window.KOS_MAP_CONTRACT && map ? window.KOS_MAP_CONTRACT.getQualityChecks(map) : [];
    return {
      hasContract: !!window.KOS_MAP_CONTRACT,
      mapName: map && map.name,
      schemaVersion: map && map.schemaVersion,
      visualProfile: map && map.visualProfile,
      gameplayProfile: map && map.gameplayProfile && map.gameplayProfile.mode,
      structures: map && map.structures && map.structures.length,
      rewardPoints: map && map.rewardPoints && map.rewardPoints.length,
      zombieEntries: map && map.zombieEntries && map.zombieEntries.length,
      allQualityOk: checks.length > 0 && checks.every((check) => check.ok),
      gameState: window._gameAPI && window._gameAPI.state,
      offlineMode: window._gameAPI && window._gameAPI.offlineMode,
      playerSpawn: window._gameAPI && window._gameAPI.player && { x: window._gameAPI.player.x, y: window._gameAPI.player.y },
      waveSpawnPoints: window._gameAPI && window._gameAPI.waveSpawnPoints && window._gameAPI.waveSpawnPoints.length,
      brStructures: window._gameAPI && window._gameAPI.brStructures && window._gameAPI.brStructures.length,
      canvas: { width: c.width, height: c.height }
    };
  });
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  if (errors.length || !info.hasContract || !info.allQualityOk || info.schemaVersion !== 'v03-map-1' || info.gameState !== 'playing' || !info.offlineMode || info.waveSpawnPoints < 4 || info.brStructures < 18) {
    fail('V03 contract runtime verification failed', { info, errors });
  }
  await page.close();
  return info;
}

async function verifyEditor(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  const logs = await collectErrors(page);
  await page.goto(`${baseUrl}/frontend/editor/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('#autoStandard').click();
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => ({
    hasStandardize: typeof window.KOS_MAP_CONTRACT.standardizeMap === 'function',
    qualityRows: document.querySelectorAll('#qualityList .quality').length,
    warnRows: document.querySelectorAll('#qualityList .quality.warn').length,
    status: document.getElementById('statusText').textContent
  }));
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  if (errors.length || !info.hasStandardize || info.qualityRows !== 8 || info.warnRows !== 0) {
    fail('V03 editor verification failed', { info, errors });
  }
  await page.close();
  return info;
}

async function verifyEngineDemo(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    deviceScaleFactor: 2
  });
  const logs = await collectErrors(page);
  await page.goto(`${baseUrl}/frontend/engine-demo/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('[data-class="ranger"]').click();
  await page.locator('#skinRow i').nth(2).click();
  await page.locator('[data-skill="fan"]').click();
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => ({
    className: document.getElementById('className').textContent,
    activeClass: document.querySelector('#classButtons .active').dataset.class,
    activeSkill: document.querySelector('#skillPanel .active').dataset.skill,
    activeSkin: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeSkin,
    activeSkinColor: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeSkinColor,
    contractMapName: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractMapName,
    contractPropCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractPropCount,
    contractQualityOk: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractQualityOk,
    hasWebgl: !!engineCanvas.getContext('webgl2') || !!engineCanvas.getContext('webgl'),
    canvas: { width: engineCanvas.width, height: engineCanvas.height }
  }));
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  if (errors.length || !info.hasWebgl || info.activeClass !== 'ranger' || info.activeSkill !== 'fan' || info.activeSkin !== 2 || !info.contractQualityOk || info.contractPropCount < 18) {
    fail('V03 engine demo verification failed', { info, errors });
  }
  await page.close();
  return info;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const result = {
    runtime: await verifyContractRuntime(browser),
    editor: await verifyEditor(browser),
    engineDemo: await verifyEngineDemo(browser)
  };
  await browser.close();
  if (!process.exitCode) console.log(JSON.stringify(result, null, 2));
})();
