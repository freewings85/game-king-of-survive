const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.KOS_BASE_URL || 'http://localhost:8081';
const artifactDir = process.env.KOS_V03_ARTIFACT_DIR || path.join(process.cwd(), 'can_delete', 'v03-gate');

fs.mkdirSync(artifactDir, { recursive: true });

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
      hasV03Config: !!window.KOS_V03_CONFIG,
      mapName: map && map.name,
      schemaVersion: map && map.schemaVersion,
      visualProfile: map && map.visualProfile,
      gameplayProfile: map && map.gameplayProfile && map.gameplayProfile.mode,
      cols: map && map.cols,
      rows: map && map.rows,
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
  if (errors.length || !info.hasContract || !info.hasV03Config || !info.allQualityOk || info.schemaVersion !== 'v03-map-1' || info.cols !== 26 || info.rows !== 22 || info.gameState !== 'playing' || !info.offlineMode || info.waveSpawnPoints < 4 || info.brStructures < 18) {
    fail('V03 contract runtime verification failed', { info, errors });
  }
  info.screenshot = path.join(artifactDir, 'runtime-contract-map-mobile.png');
  await page.screenshot({ path: info.screenshot, fullPage: true });
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
    mapSize: document.getElementById('mapSize').value,
    previewUsesMap: window.__V03_EDITOR_STATE && window.__V03_EDITOR_STATE.previewUsesMap,
    previewTileCount: window.__V03_EDITOR_STATE && window.__V03_EDITOR_STATE.previewTileCount,
    previewPropCount: window.__V03_EDITOR_STATE && window.__V03_EDITOR_STATE.previewPropCount,
    previewZombieEntries: window.__V03_EDITOR_STATE && window.__V03_EDITOR_STATE.previewZombieEntries,
    previewRewardPoints: window.__V03_EDITOR_STATE && window.__V03_EDITOR_STATE.previewRewardPoints,
    status: document.getElementById('statusText').textContent
  }));
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  if (errors.length || !info.hasStandardize || info.qualityRows !== 8 || info.warnRows !== 0 || info.mapSize !== '26x22' || !info.previewUsesMap || info.previewTileCount !== 572 || info.previewPropCount < 20 || info.previewZombieEntries < 4 || info.previewRewardPoints < 8) {
    fail('V03 editor verification failed', { info, errors });
  }
  info.screenshot = path.join(artifactDir, 'editor-standard-map.png');
  await page.screenshot({ path: info.screenshot, fullPage: true });
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
  await page.waitForTimeout(3800);
  const info = await page.evaluate(() => ({
    className: document.getElementById('className').textContent,
    activeClass: document.querySelector('#classButtons .active').dataset.class,
    activeSkill: document.querySelector('#skillPanel .active').dataset.skill,
    activeSkin: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeSkin,
    activeSkinColor: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeSkinColor,
    activeGearClass: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeGearClass,
    activeGearCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeGearCount,
    hp: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.hp,
    level: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.level,
    xp: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.xp,
    kills: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.kills,
    shotsFired: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.shotsFired,
    damageDealt: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.damageDealt,
    xpDropped: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.xpDropped,
    livingZombieCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.livingZombieCount,
    visibleGemCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.visibleGemCount,
    silhouettePartCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.silhouettePartCount,
    zombieDetailPartCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.zombieDetailPartCount,
    zombieVariantCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.zombieVariantCount,
    unitDecalCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.unitDecalCount,
    propWearCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.propWearCount,
    propShapeCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.propShapeCount,
    propBreakCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.propBreakCount,
    globalLightCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.globalLightCount,
    objectRimCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.objectRimCount,
    materialBlendCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.materialBlendCount,
    painterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.painterlyCardCount,
    heroPainterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.heroPainterlyCardCount,
    zombiePainterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.zombiePainterlyCardCount,
    skillPainterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.skillPainterlyCardCount,
    activePainterlyClass: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlyClass,
    activePainterlySkin: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlySkin,
    activePainterlySkinColor: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlySkinColor,
    activePainterlyStyle: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlyStyle,
    combatFocusDisplayed: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusDisplayed,
    combatFocusStyle: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusStyle,
    combatFocusSkillCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusSkillCount,
    combatFocusActiveSkillCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusActiveSkillCount,
    fxTipCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fxTipCount,
    fanRoundCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanRoundCount,
    fanTrailCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanTrailCount,
    fanBulletCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanBulletCardCount,
    fanImpactMarkCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanImpactMarkCount,
    groundDetailCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.groundDetailCount,
    boomRingReady: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.boomRingReady,
    boomSparkCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.boomSparkCount,
    arcBranchCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.arcBranchCount,
    arcGlowCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.arcGlowCount,
    impactSparkCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.impactSparkCount,
    fxCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fxCardCount,
    hitPulseCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.hitPulseCount,
    hasMiniMap: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.hasMiniMap,
    miniMapZombieDots: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.miniMapZombieDots,
    iconSkillButtons: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.iconSkillButtons,
    hasV03Config: !!window.KOS_V03_CONFIG,
    contractMapName: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractMapName,
    contractPropCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractPropCount,
    contractTileCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractTileCount,
    contractZombieEntryCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractZombieEntryCount,
    contractRewardPointCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractRewardPointCount,
    contractQualityOk: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.contractQualityOk,
    rivalVisible: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.rivalVisible,
    safeZoneScale: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.safeZoneScale,
    hasWebgl: !!engineCanvas.getContext('webgl2') || !!engineCanvas.getContext('webgl'),
    canvas: { width: engineCanvas.width, height: engineCanvas.height }
  }));
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  if (errors.length || !info.hasWebgl || !info.hasV03Config || info.activeClass !== 'ranger' || info.activeGearClass !== 'ranger' || info.activeGearCount < 5 || info.activeSkill !== 'fan' || info.activeSkin !== 2 || info.activePainterlyClass !== 'ranger' || info.activePainterlySkin !== 2 || info.activePainterlySkinColor !== '#283746' || info.activePainterlyStyle !== 'hood-rifle' || !info.combatFocusDisplayed || info.combatFocusStyle !== 'hood-rifle' || info.combatFocusSkillCount !== 3 || info.combatFocusActiveSkillCount !== 1 || info.hp <= 0 || info.shotsFired < 5 || info.damageDealt < 80 || info.kills < 1 || info.xpDropped < 1 || info.livingZombieCount < 8 || info.visibleGemCount < 8 || info.silhouettePartCount < 75 || info.zombieDetailPartCount < 285 || info.zombieVariantCount < 3 || info.unitDecalCount < 48 || info.propWearCount < 80 || info.propShapeCount < 85 || info.propBreakCount < 80 || info.globalLightCount < 8 || info.objectRimCount < 60 || info.materialBlendCount < 70 || info.painterlyCardCount < 40 || info.heroPainterlyCardCount < 2 || info.zombiePainterlyCardCount < 10 || info.skillPainterlyCardCount < 30 || info.fxTipCount < 3 || info.fanRoundCount < 6 || info.fanTrailCount < 6 || info.fanBulletCardCount < 6 || info.fanImpactMarkCount < 3 || info.impactSparkCount < 1 || info.fxCardCount < 16 || info.groundDetailCount < 220 || !info.hasMiniMap || info.miniMapZombieDots < 3 || info.iconSkillButtons < 3 || !info.boomRingReady || !info.contractQualityOk || info.contractPropCount < 18 || info.contractTileCount < 500 || info.contractZombieEntryCount < 4 || info.contractRewardPointCount < 8 || !info.rivalVisible || !(info.safeZoneScale > 0.7 && info.safeZoneScale <= 1)) {
    fail('V03 engine demo verification failed', { info, errors });
  }
  info.screenshot = path.join(artifactDir, 'engine-demo-mobile.png');
  await page.screenshot({ path: info.screenshot, fullPage: true });
  await page.close();
  return info;
}

async function verifyEngineSkillReview(browser, skill) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    deviceScaleFactor: 2
  });
  const logs = await collectErrors(page);
  await page.goto(`${baseUrl}/frontend/engine-demo/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('[data-class="ranger"]').click();
  await page.locator('#skinRow i').nth(2).click();
  await page.locator(`[data-skill="${skill}"]`).click();
  await page.waitForTimeout(2600);
  const info = await page.evaluate(() => ({
    activeSkill: document.querySelector('#skillPanel .active').dataset.skill,
    shotsFired: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.shotsFired,
    damageDealt: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.damageDealt,
    fxTipCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fxTipCount,
    fanRoundCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanRoundCount,
    fanTrailCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanTrailCount,
    fanBulletCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanBulletCardCount,
    fanImpactMarkCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fanImpactMarkCount,
    boomRingReady: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.boomRingReady,
    boomSparkCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.boomSparkCount,
    arcBranchCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.arcBranchCount,
    arcGlowCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.arcGlowCount,
    impactSparkCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.impactSparkCount,
    fxCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.fxCardCount,
    hitPulseCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.hitPulseCount,
    painterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.painterlyCardCount,
    skillPainterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.skillPainterlyCardCount,
    hasWebgl: !!engineCanvas.getContext('webgl2') || !!engineCanvas.getContext('webgl')
  }));
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  const skillOk = (
    (skill === 'fan' && info.fanRoundCount >= 6 && info.fanTrailCount >= 6 && info.fanBulletCardCount >= 6 && info.fanImpactMarkCount >= 3) ||
    (skill === 'boom' && info.boomRingReady === true && info.fxTipCount >= 1 && info.boomSparkCount >= 6) ||
    (skill === 'arc' && info.arcBranchCount >= 1 && info.arcGlowCount >= 1)
  );
  if (errors.length || !info.hasWebgl || info.activeSkill !== skill || info.shotsFired < 3 || info.damageDealt < 30 || info.impactSparkCount < 1 || info.fxCardCount < 3 || info.painterlyCardCount < 40 || info.skillPainterlyCardCount < 30 || !skillOk) {
    fail(`V03 ${skill} review verification failed`, { info, errors });
  }
  info.screenshot = path.join(artifactDir, `engine-demo-skill-${skill}.png`);
  await page.screenshot({ path: info.screenshot, fullPage: true });
  await page.close();
  return info;
}

async function verifyEngineClassReview(browser, classId, skinIndex) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    deviceScaleFactor: 2
  });
  const logs = await collectErrors(page);
  await page.goto(`${baseUrl}/frontend/engine-demo/index.html?review=class`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(({ targetClass, targetSkin }) => {
    document.querySelector(`[data-class="${targetClass}"]`).click();
    document.querySelectorAll('#skinRow i')[targetSkin].click();
    document.querySelector('[data-skill="fan"]').click();
  }, { targetClass: classId, targetSkin: skinIndex });
  await page.waitForTimeout(1800);
  const info = await page.evaluate(() => ({
    className: document.getElementById('className').textContent,
    activeClass: document.querySelector('#classButtons .active').dataset.class,
    activeSkill: document.querySelector('#skillPanel .active').dataset.skill,
    activeSkin: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeSkin,
    activeSkinColor: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeSkinColor,
    activeGearClass: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeGearClass,
    activeGearCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activeGearCount,
    activePainterlyClass: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlyClass,
    activePainterlySkin: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlySkin,
    activePainterlySkinColor: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlySkinColor,
    activePainterlyStyle: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlyStyle,
    activePainterlyStyleMatchesShowcase: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlyStyleMatchesShowcase,
    combatFocusDisplayed: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusDisplayed,
    combatFocusStyle: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusStyle,
    combatFocusSkillCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusSkillCount,
    combatFocusActiveSkillCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.combatFocusActiveSkillCount,
    heroPainterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.heroPainterlyCardCount,
    painterlyCardCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.painterlyCardCount,
    classShowcaseVisible: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseVisible,
    classShowcaseTitle: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseTitle,
    classShowcaseSkinCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseSkinCount,
    classShowcaseThumbCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseThumbCount,
    classShowcaseActiveThumbs: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseActiveThumbs,
    classShowcaseVariantCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseVariantCount,
    classShowcaseStyle: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseStyle,
    classShowcaseStyleCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.classShowcaseStyleCount,
    classShowcaseDisplayed: getComputedStyle(document.getElementById('classShowcase')).display === 'grid',
    zombieVariantCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.zombieVariantCount,
    livingZombieCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.livingZombieCount,
    hasWebgl: !!engineCanvas.getContext('webgl2') || !!engineCanvas.getContext('webgl')
  }));
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  const expectedStyle = { guardian: 'shield-armor', tech: 'coil-screen', ranger: 'hood-rifle' }[classId];
  if (errors.length || !info.hasWebgl || info.activeClass !== classId || info.activeGearClass !== classId || info.activePainterlyClass !== classId || info.activeSkin !== skinIndex || info.activePainterlySkin !== skinIndex || info.activePainterlySkinColor !== info.activeSkinColor || info.activePainterlyStyle !== expectedStyle || !info.activePainterlyStyleMatchesShowcase || !info.combatFocusDisplayed || info.combatFocusStyle !== expectedStyle || info.combatFocusSkillCount !== 3 || info.combatFocusActiveSkillCount !== 1 || info.activeGearCount < 3 || info.heroPainterlyCardCount < 2 || info.painterlyCardCount < 40 || !info.classShowcaseVisible || !info.classShowcaseDisplayed || info.classShowcaseTitle !== info.className || info.classShowcaseSkinCount !== 3 || info.classShowcaseThumbCount !== 3 || info.classShowcaseActiveThumbs !== 1 || info.classShowcaseVariantCount !== 3 || info.classShowcaseStyle !== expectedStyle || info.classShowcaseStyleCount !== 1 || info.zombieVariantCount < 3 || info.livingZombieCount < 8) {
    fail(`V03 ${classId} class review verification failed`, { info, errors });
  }
  info.screenshot = path.join(artifactDir, `engine-demo-class-${classId}.png`);
  await page.screenshot({ path: info.screenshot, fullPage: true });
  await page.close();
  return info;
}

async function verifyEngineLandscapeReview(browser) {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390, isMobile: true, hasTouch: true },
    deviceScaleFactor: 2
  });
  const logs = await collectErrors(page);
  await page.goto(`${baseUrl}/frontend/engine-demo/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => {
    document.querySelector('[data-class="ranger"]').click();
    document.querySelectorAll('#skinRow i')[2].click();
    document.querySelector('[data-skill="fan"]').click();
  });
  await page.waitForTimeout(3200);
  const info = await page.evaluate(() => {
    const shell = document.querySelector('.demo-shell').getBoundingClientRect();
    const mini = document.getElementById('miniMap').getBoundingClientRect();
    const skills = Array.from(document.querySelectorAll('#skillPanel .skill')).map((el) => el.getBoundingClientRect());
    const classStrip = document.querySelector('.class-strip');
    return {
      activeSkill: document.querySelector('#skillPanel .active').dataset.skill,
      activeClass: document.querySelector('#classButtons .active').dataset.class,
      activePainterlyClass: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlyClass,
      activePainterlySkin: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.activePainterlySkin,
      shotsFired: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.shotsFired,
      damageDealt: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.damageDealt,
      impactSparkCount: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.impactSparkCount,
      hasMiniMap: window.__V03_ENGINE_DEMO_STATE && window.__V03_ENGINE_DEMO_STATE.hasMiniMap,
      miniMapSize: Math.round(Math.min(mini.width, mini.height)),
      classStripHidden: classStrip && getComputedStyle(classStrip).display === 'none',
      shellRounded: Number(getComputedStyle(document.querySelector('.demo-shell')).borderTopLeftRadius.replace('px', '')),
      skillButtonsClear: skills.length === 3 && skills.every((rect) => rect.width >= 60 && rect.height >= 60 && rect.left > shell.width * 0.58 && rect.bottom <= shell.bottom - 18),
      shell: { width: Math.round(shell.width), height: Math.round(shell.height) },
      hasWebgl: !!engineCanvas.getContext('webgl2') || !!engineCanvas.getContext('webgl')
    };
  });
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  if (errors.length || !info.hasWebgl || info.activeSkill !== 'fan' || info.activeClass !== 'ranger' || info.activePainterlyClass !== 'ranger' || info.activePainterlySkin !== 2 || info.shotsFired < 4 || info.damageDealt < 60 || info.impactSparkCount < 1 || !info.hasMiniMap || info.miniMapSize < 96 || !info.classStripHidden || info.shellRounded < 28 || !info.skillButtonsClear) {
    fail('V03 landscape engine review verification failed', { info, errors });
  }
  info.screenshot = path.join(artifactDir, 'engine-demo-landscape-phone.png');
  await page.screenshot({ path: info.screenshot, fullPage: true });
  await page.close();
  return info;
}

async function verifyV03Shell(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  const logs = await collectErrors(page);
  await page.goto(`${baseUrl}/frontend/v03-shell/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('.classCard').nth(2).click();
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => ({
    classCards: document.querySelectorAll('.classCard').length,
    skillCards: document.querySelectorAll('.skillCard').length,
    activeClass: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.activeClass,
    usesSharedConfig: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.usesSharedConfig,
    usesMapContract: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.usesMapContract,
    classIds: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.classIds,
    skillIds: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.skillIds,
    skinCount: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.skinCount,
    previewTileCount: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.previewTileCount,
    previewPropCount: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.previewPropCount,
    previewZombieEntries: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.previewZombieEntries,
    previewRewardPoints: window.__V03_SHELL_STATE && window.__V03_SHELL_STATE.previewRewardPoints
  }));
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  const expectedClasses = JSON.stringify(['guardian', 'tech', 'ranger']);
  const expectedSkills = JSON.stringify(['arc', 'boom', 'fan']);
  if (errors.length || info.classCards !== 3 || info.skillCards !== 3 || !info.usesSharedConfig || !info.usesMapContract || JSON.stringify(info.classIds) !== expectedClasses || JSON.stringify(info.skillIds) !== expectedSkills || info.activeClass !== 'ranger' || info.skinCount < 9 || info.previewTileCount !== 572 || info.previewPropCount < 20 || info.previewZombieEntries < 4 || info.previewRewardPoints < 8) {
    fail('V03 shell verification failed', { info, errors });
  }
  info.screenshot = path.join(artifactDir, 'v03-shell-framework.png');
  await page.screenshot({ path: info.screenshot, fullPage: true });
  await page.close();
  return info;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const result = {
    runtime: await verifyContractRuntime(browser),
    editor: await verifyEditor(browser),
    engineDemo: await verifyEngineDemo(browser),
    classGuardian: await verifyEngineClassReview(browser, 'guardian', 0),
    classTech: await verifyEngineClassReview(browser, 'tech', 1),
    classRanger: await verifyEngineClassReview(browser, 'ranger', 2),
    skillArc: await verifyEngineSkillReview(browser, 'arc'),
    skillBoom: await verifyEngineSkillReview(browser, 'boom'),
    skillFan: await verifyEngineSkillReview(browser, 'fan'),
    landscapePhone: await verifyEngineLandscapeReview(browser),
    shell: await verifyV03Shell(browser)
  };
  await browser.close();
  if (!process.exitCode) console.log(JSON.stringify(result, null, 2));
})();
