const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.KOS_BASE_URL || 'http://localhost:8081';
const artifactDir = process.env.KOS_V03_ARTIFACT_DIR || path.join(process.cwd(), 'can_delete', 'v03-gate');

fs.mkdirSync(artifactDir, { recursive: true });

function fail(message, detail) {
  console.error(message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    deviceScaleFactor: 2
  });
  const logs = [];
  page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => logs.push({ type: 'pageerror', text: err.message }));
  await page.goto(`${baseUrl}/frontend/engine-proof/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => window.__V03_ENGINE_PROOF_STATE && window.__V03_ENGINE_PROOF_STATE.billboardSpriteCount >= 8, null, { timeout: 8000 });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const state = window.__V03_ENGINE_PROOF_STATE;
    const shell = document.querySelector('.proof-shell').getBoundingClientRect();
    const canvas = document.getElementById('proofCanvas');
    const skills = Array.from(document.querySelectorAll('.skills button')).map((button) => button.getBoundingClientRect());
    return {
      ...state,
      shell: { width: Math.round(shell.width), height: Math.round(shell.height) },
      canvas: { width: canvas.width, height: canvas.height },
      skillButtonsClear: skills.length === 3 && skills.every((rect) => rect.width >= 64 && rect.height >= 64),
      loadoutVisible: getComputedStyle(document.querySelector('.loadout')).display !== 'none'
    };
  });
  const errors = logs.filter((log) => log.type === 'pageerror' || log.type === 'error');
  if (errors.length || info.engineRecommendation !== 'cocos-creator-3.x' || !info.hasWebgl || !info.usesOrthographicCamera || info.billboardSpriteCount < 8 || info.spriteAssetCount < 8 || info.propDepthLayerCount < 4 || info.groundSplatCount < 5 || info.stormLayerCount < 2 || info.skillFxLayerCount < 5 || !info.skillButtonsClear || !info.loadoutVisible || info.targetReference !== 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png') {
    await browser.close();
    fail('V03 engine proof verification failed', { info, errors });
  }
  info.screenshot = path.join(artifactDir, 'engine-proof-cocos-route.png');
  await page.screenshot({ path: info.screenshot, fullPage: true });
  await browser.close();
  console.log(JSON.stringify(info, null, 2));
})();
