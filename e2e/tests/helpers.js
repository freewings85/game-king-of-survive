// Shared test helpers for King of Survive E2E tests

/**
 * Wait for game page to fully load and expose _gameAPI
 */
async function waitForGameReady(page) {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => window._gameAPI !== undefined, { timeout: 10000 });
}

/**
 * Start a game with the given class and optional skin
 */
async function startGameWithClass(page, className, skinId) {
  await page.goto('/survivor.html');
  await waitForGameReady(page);

  // Select class
  await page.evaluate((cls) => {
    const buttons = document.querySelectorAll('[data-class]');
    for (const btn of buttons) {
      if (btn.dataset.class === cls) btn.click();
    }
  }, className);

  // Select skin if provided
  if (skinId) {
    await page.evaluate((sid) => {
      const skinBtns = document.querySelectorAll('[data-skin]');
      for (const btn of skinBtns) {
        if (btn.dataset.skin === sid) btn.click();
      }
    }, skinId);
  }

  // Click start
  await page.evaluate(() => {
    const startBtn = document.querySelector('#start-btn, [data-action="start"]');
    if (startBtn) startBtn.click();
    else if (window._gameAPI && window._gameAPI.startGame) window._gameAPI.startGame();
  });

  // Wait for game state
  await page.waitForFunction(() => window._gameAPI && window._gameAPI.state === 'playing', { timeout: 10000 });
}

/**
 * Navigate to the editor page
 */
async function openEditor(page, editorPath) {
  await page.goto(editorPath || '/editor/index.html');
  await page.waitForLoadState('networkidle');
}

/**
 * Take a screenshot of the canvas for visual comparison
 */
async function captureCanvas(page) {
  const canvas = await page.$('canvas');
  if (!canvas) throw new Error('No canvas found');
  return canvas.screenshot();
}

module.exports = {
  waitForGameReady,
  startGameWithClass,
  openEditor,
  captureCanvas,
};
