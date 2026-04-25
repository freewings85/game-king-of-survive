// R6-respawn verify (stop-go) — playwright drives mage solo 5 min, NON-invuln.
// Each phase = 10s walk + 20s stay (10 phases × 30s = 300s).
// Drives via window.__joystick.dx/dy (the QA hook); mousemove alone doesn't move the player.
// Reports: first level-up / kills / levelups / cards / n300 stats / first hit / storm.
// Verdicts: kills>=8 / lvl>=4 / cards>=2 / n300_median>=2 / errors==0 (PM brief).
import { chromium, devices } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
const URL = 'http://localhost:8081/demo/survivor.html?debug=1';
const OUT = '/tmp/pt_r6_5min_mage';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14'], hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('[con] ' + m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__spriteDebug && window.__joystick, { timeout: 10000 });
  await page.evaluate(() => { const o = document.getElementById('login-overlay'); if (o) o.classList.add('hidden'); });
  await sleep(300);
  await page.evaluate(() => window.__spriteDebug.enterOfflineDemo('mage'));
  await sleep(2500);

  // dismiss tutorial
  await page.evaluate(() => {
    const c = document.getElementById('c');
    for (let y = 470; y <= 560; y += 10)
      for (let x = 140; x <= 250; x += 20)
        c.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0 }));
  });
  await sleep(800);

  // NON-invuln. Activate joystick state for direct dx/dy injection.
  await page.evaluate(() => {
    window.__joystick.active = true;
    window.__joystick.touchId = -1;
    window.__joystick.dx = 0;
    window.__joystick.dy = 0;
  });

  const probe = () => page.evaluate(() => {
    const q = (window._survivorQuery && window._survivorQuery()) || {};
    const n300 = (q.enemies || []).filter(e => e.d < 300).length;
    const n150 = (q.enemies || []).filter(e => e.d < 150).length;
    return {
      gt: q.gameTime, state: q.state,
      lvl: q.playerLevel, xp: q.xp, xpToNext: q.xpToNextLevel,
      kills: q.kills, totalE: q.totalEnemies, n300, n150,
      hp: q.hp, maxHp: q.maxHp, px: q.px, py: q.py,
      pendingSkill: q.pendingSkillPoints, wave: q.wave,
    };
  });

  const PHASES = [
    [-1, -1, 'NW'], [+1, -1, 'NE'], [+1, +1, 'SE'], [-1, +1, 'SW'],
    [ 0,  0, 'center'],
    [-1,  0, 'W'], [+1, 0, 'E'], [0, -1, 'N'], [0, +1, 'S'],
    [ 0,  0, 'final-stop'],
  ];
  const WALK_MS = 10000, STAY_MS = 20000;

  let firstLvl2 = null, firstEnemyHit = null, firstStormHit = null;
  let prevHp = null, prevLevel = 1, levelUpStateSeen = false, cardsPicked = 0;
  const phaseSamples = {};
  const allN300 = [];
  const events = [];

  async function tick(label) {
    const snap = await probe();
    if (snap.lvl >= 2 && firstLvl2 === null) firstLvl2 = snap.gt;
    if (snap.lvl > prevLevel) {
      events.push({ t: snap.gt, kind: 'levelup', to: snap.lvl });
      prevLevel = snap.lvl;
    }
    if (snap.state === 'levelUp' && !levelUpStateSeen) levelUpStateSeen = true;
    if (snap.state === 'levelUp') {
      cardsPicked++;
      events.push({ t: snap.gt, kind: 'card-pick' });
      // dismiss
      await page.evaluate(() => {
        const c = document.getElementById('c');
        for (let x = 80; x <= 320; x += 20)
          for (let y = 380; y <= 560; y += 20)
            c.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0 }));
      });
    }
    if (prevHp !== null && snap.hp != null && snap.hp < prevHp - 0.5) {
      if (firstEnemyHit === null && snap.gt < 60) firstEnemyHit = snap.gt;
      if (firstStormHit === null && snap.gt > 60) firstStormHit = snap.gt;
    }
    prevHp = snap.hp;
    if (!phaseSamples[label]) phaseSamples[label] = [];
    phaseSamples[label].push({ gt: snap.gt, n300: snap.n300, n150: snap.n150, hp: snap.hp, kills: snap.kills, lvl: snap.lvl, px: snap.px, py: snap.py, wave: snap.wave });
    allN300.push(snap.n300);
    return snap;
  }

  for (const [dx, dy, label] of PHASES) {
    // === WALK 10s toward direction ===
    const walkStart = Date.now();
    while (Date.now() - walkStart < WALK_MS) {
      await page.evaluate(([dx, dy]) => {
        window.__joystick.active = true;
        window.__joystick.dx = dx; window.__joystick.dy = dy;
      }, [dx, dy]);
      await tick(label);
      await sleep(400);
    }

    // === STAY 20s (joystick zeroed, player stops, enemies catch up) ===
    await page.evaluate(() => { window.__joystick.dx = 0; window.__joystick.dy = 0; });
    const stayStart = Date.now();
    while (Date.now() - stayStart < STAY_MS) {
      await tick(label);
      await sleep(400);
    }
    // periodic screenshot at end of phase
    await page.screenshot({ path: `${OUT}/${label}.png` });
  }

  const final = await probe();
  const probes = await page.evaluate(() => ({
    wsTickCount: window._wsTickCount || 0,
    ringSpawnFired: window._ringSpawnFired || 0,
  }));

  // summarize
  const phaseSummary = {};
  for (const [k, arr] of Object.entries(phaseSamples)) {
    if (!arr.length) continue;
    const n300s = arr.map(s => s.n300);
    const last = arr[arr.length - 1];
    phaseSummary[k] = {
      samples: arr.length,
      n300_avg: (n300s.reduce((a, b) => a + b, 0) / arr.length).toFixed(2),
      n300_max: Math.max(...n300s),
      n300_med: median(n300s),
      endPos: last && [Math.round(last.px || 0), Math.round(last.py || 0)],
      endHp: last && Math.round(last.hp || 0),
      endKills: last && last.kills,
      endLvl: last && last.lvl,
      endWave: last && last.wave,
    };
  }
  const overallN300Med = median(allN300);

  const passKills = (final.kills || 0) >= 8;
  const passLvls = (final.lvl || 0) >= 4;
  const passCards = cardsPicked >= 2;
  const passN300 = overallN300Med >= 2;
  // R6-respawn F2: ws tick rate ~10/s × 300s = 3000 expected; threshold 100 = "actually running".
  const passWsTick = probes.wsTickCount > 100;
  const passRing = probes.ringSpawnFired > 5;
  // WebSocket 404 console error is environmental (no server backend); ignore it.
  const filteredErrs = errors.filter(e => !/WebSocket connection.*8081/.test(e));
  const passErr = filteredErrs.length === 0;

  const report = {
    errors: errors.length, errorMsgs: errors.slice(0, 5),
    filteredErrors: filteredErrs.length,
    probes,
    final,
    firstLvl2_at_s: firstLvl2,
    firstEnemyHit_at_s: firstEnemyHit,
    firstStormHit_at_s: firstStormHit,
    levelUpStateSeen, cardsPicked,
    overallN300Median: overallN300Med,
    phaseSummary,
    events,
    verdicts: {
      'kills>=8': { actual: final.kills, pass: passKills },
      'lvl>=4': { actual: final.lvl, pass: passLvls },
      'cards>=2': { actual: cardsPicked, pass: passCards },
      'n300_median>=2': { actual: overallN300Med, pass: passN300 },
      '_wsTickCount>100': { actual: probes.wsTickCount, pass: passWsTick },
      '_ringSpawnFired>5': { actual: probes.ringSpawnFired, pass: passRing },
      'errors==0(filtered)': { actual: filteredErrs.length, pass: passErr },
    },
    OVERALL: (passKills && passLvls && passCards && passN300 && passWsTick && passRing && passErr) ? 'PASS' : 'FAIL',
  };

  console.log('\n=== R6-respawn stop-go report ===\n');
  console.log(JSON.stringify(report, null, 2));
  writeFileSync('/tmp/r6_stopgo_report.json', JSON.stringify(report, null, 2));
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log('\nReport saved: /tmp/r6_stopgo_report.json + ' + OUT + '/report.json');

  await browser.close();
  process.exit(report.OVERALL === 'PASS' ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}
