// Render pipeline: SVG → PNG via playwright headless Chromium.
// Usage: node demo/assets/style_homm3_bright/build/render.mjs [target]
// target = tileset | mage | orc | ui | decor | all (default: all)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TILES, mageFrame, orcFrame, uiFrameFull, treeBig, treeSmall, rock, house, fence, crate, fenceCluster, treeDense, treeDensePine, treeDenseAutumn, rockSpiky, rockFlat, fenceLong, houseThatch, brokenWall, stonePile, treeRow, autotileGrassDirt, autotileGrassStone, warriorFrame, scoutFrame, goblinFrame, slimeFrame, wolfFrame, skeletonFrame, trollFrame, stoneGiantFrame, shadowMageFrame, berserkerFrame, frostDragonFrame, rotTrollFrame } from './svgs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK_DIR = path.resolve(__dirname, '..');
const target = process.argv[2] || 'all';

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 2048, height: 2048 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const jobs = [];

  if (target === 'all' || target === 'tileset')  jobs.push(() => buildTileset(page));
  if (target === 'all' || target === 'mage')     jobs.push(() => buildMage(page));
  if (target === 'all' || target === 'orc')      jobs.push(() => buildOrc(page));
  if (target === 'all' || target === 'ui')       jobs.push(() => buildUI(page));
  if (target === 'all' || target === 'decor')    jobs.push(() => buildDecor(page));
  if (target === 'all' || target === 'warrior')  jobs.push(() => buildChar(page, 'warrior', warriorFrame));
  if (target === 'all' || target === 'scout')    jobs.push(() => buildChar(page, 'scout',   scoutFrame));
  if (target === 'all' || target === 'mobs')     jobs.push(() => buildMobs(page));
  if (target === 'all' || target === 'boss')     jobs.push(() => buildBoss(page));
  if (target === 'all' || target === 'bosses')   jobs.push(() => buildBosses(page));

  for (const j of jobs) await j();

  await browser.close();
  console.log('[render] done');
}

// Render a single SVG string and return a Buffer of the PNG.
async function renderSvg(page, svg, w, h) {
  // Wrap svg in a page with no padding, clip body to SVG size, then screenshot the element.
  const html = `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent}
    svg{display:block}
  </style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const el = await page.$('svg');
  return await el.screenshot({ omitBackground: true, type: 'png' });
}

// Composite many rendered SVGs into one sheet using page canvas.
async function composite(page, cells, cellW, cellH, cols) {
  const rows = Math.ceil(cells.length / cols);
  const W = cols * cellW, H = rows * cellH;
  // Pre-rasterize each cell SVG to PNG buffer.
  const dataURLs = [];
  for (const cellSvg of cells) {
    const buf = await renderSvg(page, cellSvg, cellW, cellH);
    dataURLs.push('data:image/png;base64,' + buf.toString('base64'));
  }
  // Fresh page with just the canvas; compose via evaluate (no window-global race).
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`
  );
  const outDataURL = await page.evaluate(async ({ urls, cellW, cellH, cols }) => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < urls.length; i++) {
      const img = new Image();
      img.src = urls[i];
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const r = Math.floor(i / cols), c = i % cols;
      ctx.drawImage(img, c * cellW, r * cellH);
    }
    return canvas.toDataURL('image/png');
  }, { urls: dataURLs, cellW, cellH, cols });
  return Buffer.from(outDataURL.replace(/^data:image\/png;base64,/, ''), 'base64');
}

async function writeFile(rel, buf) {
  const abs = path.join(PACK_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
  console.log(`  wrote ${rel} (${(buf.length / 1024).toFixed(1)} KB)`);
}
async function writeJSON(rel, obj) {
  const abs = path.join(PACK_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(obj, null, 2));
  console.log(`  wrote ${rel}`);
}

function blank64() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"></svg>`;
}

// ── TILESET (autotile) ──────────────────────────────────────
// Layout (8 cols × 5 rows, 64px tile = 512×320):
//   row 0: grass0 grass1 dirt0 dirt1 stone0 stone1 _ _
//   row 1: gd_0..gd_7     (grass→dirt autotile, masks 0..7)
//   row 2: gd_8..gd_15    (grass→dirt autotile, masks 8..15)
//   row 3: gs_0..gs_7
//   row 4: gs_8..gs_15
async function buildTileset(page) {
  console.log('[tileset] …');
  const COLS = 8, ROWS = 5;
  const cells = new Array(COLS * ROWS).fill(null).map(() => blank64());
  const putAt = (col, row, svg) => { cells[row * COLS + col] = svg; };
  // Row 0: base variants
  putAt(0, 0, TILES.grass0());
  putAt(1, 0, TILES.grass1());
  putAt(2, 0, TILES.dirt0());
  putAt(3, 0, TILES.dirt1());
  putAt(4, 0, TILES.stone0());
  putAt(5, 0, TILES.stone1());
  // Rows 1-2: gd_0..gd_15
  for (let m = 0; m < 16; m++) {
    const row = 1 + Math.floor(m / 8);
    const col = m % 8;
    putAt(col, row, autotileGrassDirt(m));
  }
  // Rows 3-4: gs_0..gs_15
  for (let m = 0; m < 16; m++) {
    const row = 3 + Math.floor(m / 8);
    const col = m % 8;
    putAt(col, row, autotileGrassStone(m));
  }
  const sheet = await composite(page, cells, 64, 64, COLS);
  await writeFile('tileset.png', sheet);

  // Atlas JSON with new schema (variants + seams) + legacy tiles[] for back-compat.
  const atlas = {
    image: 'tileset.png',
    tileW: 64, tileH: 64, cols: COLS, rows: ROWS,
    maskBits: { N: 1, E: 2, S: 4, W: 8 },
    variants: {
      grass: [px(0, 0), px(1, 0)],
      dirt:  [px(2, 0), px(3, 0)],
      stone: [px(4, 0), px(5, 0)],
    },
    seams: {
      grass_dirt:  Object.fromEntries(
        Array.from({ length: 16 }, (_, m) => [String(m), px(m % 8, 1 + Math.floor(m / 8))])
      ),
      grass_stone: Object.fromEntries(
        Array.from({ length: 16 }, (_, m) => [String(m), px(m % 8, 3 + Math.floor(m / 8))])
      ),
    },
    // Legacy flat list (kept for f2fac0f integration; new consumers use `variants` + `seams`).
    tiles: (() => {
      const out = [];
      out.push({ id: 'grass0', col: 0, row: 0, px: { x: 0, y: 0, w: 64, h: 64 } });
      out.push({ id: 'grass1', col: 1, row: 0, px: { x: 64, y: 0, w: 64, h: 64 } });
      out.push({ id: 'dirt0',  col: 2, row: 0, px: { x: 128, y: 0, w: 64, h: 64 } });
      out.push({ id: 'dirt1',  col: 3, row: 0, px: { x: 192, y: 0, w: 64, h: 64 } });
      out.push({ id: 'stone0', col: 4, row: 0, px: { x: 256, y: 0, w: 64, h: 64 } });
      out.push({ id: 'stone1', col: 5, row: 0, px: { x: 320, y: 0, w: 64, h: 64 } });
      return out;
    })(),
    style: 'homm3_bright',
  };
  await writeJSON('tileset.json', atlas);
}

function px(col, row) {
  return { col, row, px: { x: col * 64, y: row * 64, w: 64, h: 64 } };
}

// ── MAGE SPRITE SHEET ───────────────────────────────────────
// Sheet layout (LPC-ish but simplified):
//   row 0: up    walk f0..f3 (cols 0..3)
//   row 1: left  walk f0..f3
//   row 2: down  walk f0..f3
//   row 3: right walk f0..f3
//   row 4: attack f0..f2 (cols 0..2; col 3 blank)
//   row 5: death  f0..f2 (cols 0..2; col 3 blank)
async function buildMage(page) {
  console.log('[mage] …');
  const dirs = ['U', 'L', 'D', 'R'];
  const cells = [];
  for (const d of dirs) {
    for (let f = 0; f < 4; f++) cells.push(mageFrame(d, 'walk', f));
  }
  for (let f = 0; f < 4; f++) cells.push(f < 3 ? mageFrame('D', 'attack', f) : blank64());
  for (let f = 0; f < 4; f++) cells.push(f < 3 ? mageFrame('D', 'death', f) : blank64());
  const sheet = await composite(page, cells, 64, 64, 4); // 4 cols x 6 rows = 256x384
  await writeFile('player_mage.png', sheet);
  await writeJSON('player_mage.json', mageAtlas());
}

function mageAtlas() {
  return {
    image: 'player_mage.png',
    frameW: 64, frameH: 64,
    sheetCols: 4, sheetRows: 6,
    directionOrder: ['up', 'left', 'down', 'right'],
    anims: {
      walk:   { rowBase: 0, rowFromDir: true,  frames: 4, fps: 10, skipFrame0: false },
      attack: { rowBase: 4, rowFromDir: false, frames: 3, fps: 12, skipFrame0: false },
      death:  { rowBase: 5, rowFromDir: false, frames: 3, fps: 8,  skipFrame0: false, loop: false },
    },
    previewFrame: { row: 2, col: 0 },
    style: 'homm3_bright',
  };
}

// Shared builder for any mage-layout character (4×4 walk + attack 3 + death 3).
async function buildChar(page, name, frameFn) {
  console.log(`[${name}] …`);
  const dirs = ['U', 'L', 'D', 'R'];
  const cells = [];
  for (const d of dirs) {
    for (let f = 0; f < 4; f++) cells.push(frameFn(d, 'walk', f));
  }
  for (let f = 0; f < 4; f++) cells.push(f < 3 ? frameFn('D', 'attack', f) : blank64());
  for (let f = 0; f < 4; f++) cells.push(f < 3 ? frameFn('D', 'death', f) : blank64());
  const sheet = await composite(page, cells, 64, 64, 4);
  await writeFile(`player_${name}.png`, sheet);
  await writeJSON(`player_${name}.json`, {
    image: `player_${name}.png`,
    frameW: 64, frameH: 64,
    sheetCols: 4, sheetRows: 6,
    directionOrder: ['up', 'left', 'down', 'right'],
    anims: {
      walk:   { rowBase: 0, rowFromDir: true,  frames: 4, fps: 10, skipFrame0: false },
      attack: { rowBase: 4, rowFromDir: false, frames: 3, fps: 12, skipFrame0: false },
      death:  { rowBase: 5, rowFromDir: false, frames: 3, fps: 8,  skipFrame0: false, loop: false },
    },
    previewFrame: { row: 2, col: 0 },
    style: 'homm3_bright',
  });
}

// ── ORC SPRITE SHEET ────────────────────────────────────────
async function buildOrc(page) {
  console.log('[orc] …');
  const dirs = ['U', 'L', 'D', 'R'];
  const cells = [];
  for (const d of dirs) {
    for (let f = 0; f < 4; f++) cells.push(orcFrame(d, f));
  }
  const sheet = await composite(page, cells, 64, 64, 4); // 4 cols x 4 rows = 256x256
  await writeFile('monster_orc.png', sheet);
  await writeJSON('monster_orc.json', {
    image: 'monster_orc.png',
    frameW: 64, frameH: 64, sheetCols: 4, sheetRows: 4,
    directionOrder: ['up', 'left', 'down', 'right'],
    anims: { walk: { rowBase: 0, rowFromDir: true, frames: 4, fps: 8, skipFrame0: false } },
    previewFrame: { row: 2, col: 0 },
    style: 'homm3_bright',
  });
}

// ── UI 9-SLICE ──────────────────────────────────────────────
async function buildUI(page) {
  console.log('[ui] …');
  const full = uiFrameFull();
  const fullPng = await renderSvg(page, full, 192, 192);
  await writeFile('ui_frame_full.png', fullPng);

  // Slice into 9 × 64×64 PNGs using page.evaluate (no window globals race).
  const dataURL = 'data:image/png;base64,' + fullPng.toString('base64');
  await page.setContent(`<!doctype html><html><body><canvas id="c" width="64" height="64"></canvas></body></html>`);
  const slices = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const ctx = document.getElementById('c').getContext('2d');
    const names = ['tl','t','tr','l','c','r','bl','b','br'];
    const out = {};
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(img, c * 64, r * 64, 64, 64, 0, 0, 64, 64);
      out[names[r * 3 + c]] = document.getElementById('c').toDataURL('image/png');
    }
    return out;
  }, dataURL);
  for (const [k, v] of Object.entries(slices)) {
    const b64 = v.replace(/^data:image\/png;base64,/, '');
    await writeFile(`ui9/${k}.png`, Buffer.from(b64, 'base64'));
  }
  await writeJSON('ui9/meta.json', {
    slices: ['tl','t','tr','l','c','r','bl','b','br'],
    sliceW: 64, sliceH: 64,
    usage: '9-slice: stretch edges+center, keep corners fixed. cornerSize=16 recommended.',
    style: 'homm3_bright',
  });
}

// ── DECOR ──────────────────────────────────────────────────
async function buildDecor(page) {
  console.log('[decor] …');
  const items = [
    { name: 'tree_big',          size: 128, svg: treeBig() },
    { name: 'tree_small',        size: 64,  svg: treeSmall() },
    { name: 'tree_dense',        size: 64,  svg: treeDense() },
    { name: 'tree_dense_pine',   size: 64,  svg: treeDensePine(),   tag: 'forest' },
    { name: 'tree_dense_autumn', size: 64,  svg: treeDenseAutumn(), tag: 'forest' },
    { name: 'rock',              size: 64,  svg: rock() },
    { name: 'rock_spiky',        size: 64,  svg: rockSpiky(),       tag: 'stones' },
    { name: 'rock_flat',         size: 64,  svg: rockFlat(),        tag: 'stones' },
    { name: 'house',             size: 128, svg: house() },
    { name: 'house_thatch',      size: 128, svg: houseThatch(),     tag: 'village' },
    { name: 'fence',             size: 64,  svg: fence() },
    { name: 'fence_cluster',     size: 64,  svg: fenceCluster() },
    { name: 'fence_long',        size: 128, svg: fenceLong(),       tag: 'village', wide: true },
    { name: 'broken_wall',       size: 128, svg: brokenWall(),      tag: 'ruins',   wide: true },
    { name: 'stone_pile',        size: 64,  svg: stonePile(),       tag: 'stones' },
    { name: 'tree_row',          size: 128, svg: treeRow(),         tag: 'forest',  wide: true },
    { name: 'crate',             size: 64,  svg: crate() },
  ];
  for (const it of items) {
    const W = it.wide ? it.size * 2 : it.size;
    const H = it.size;
    const buf = await renderSvg(page, it.svg, W, H);
    await writeFile(`decor/${it.name}.png`, buf);
  }
  // Step 1.5 region tags — Developer picks items from these pools
  // when building forest / stones / village clusters.
  //   forest:  tree_dense, tree_dense_pine, tree_dense_autumn, tree_big, tree_small
  //   stones:  rock, rock_spiky, rock_flat
  //   village: house, house_thatch, fence_cluster, fence_long, fence
  //   scatter: crate, tree_small, fence (non-barrier flavor)
  const REGION = {
    tree_big: 'forest', tree_small: 'scatter',
    tree_dense: 'forest', tree_dense_pine: 'forest', tree_dense_autumn: 'forest', tree_row: 'forest',
    rock: 'stones', rock_spiky: 'stones', rock_flat: 'stones', stone_pile: 'stones',
    house: 'village', house_thatch: 'village',
    fence: 'scatter', fence_cluster: 'village', fence_long: 'village',
    broken_wall: 'ruins',
    crate: 'scatter',
  };
  const hardBarrierSet = new Set([
    'house', 'house_thatch', 'rock', 'rock_spiky', 'rock_flat', 'stone_pile',
    'fence_cluster', 'fence_long', 'tree_dense', 'tree_dense_pine', 'tree_dense_autumn',
    'tree_row', 'broken_wall',
  ]);

  await writeJSON('decor/index.json', {
    style: 'homm3_bright',
    regions: {
      forest:  ['tree_dense', 'tree_dense_pine', 'tree_dense_autumn', 'tree_row', 'tree_big', 'tree_small'],
      stones:  ['rock', 'rock_spiky', 'rock_flat', 'stone_pile'],
      village: ['house', 'house_thatch', 'fence_cluster', 'fence_long', 'fence'],
      ruins:   ['broken_wall', 'rock', 'rock_flat', 'fence_cluster', 'stone_pile'],
      scatter: ['crate', 'tree_small', 'fence'],
    },
    items: items.map(it => {
      const W = it.wide ? it.size * 2 : it.size;
      const H = it.size;
      const hardBarrier = hardBarrierSet.has(it.name);
      let collider;
      if (it.name === 'tree_big')              collider = { x: W/2 - 8,  y: H - 20, w: 16, h: 14 };
      else if (it.name === 'tree_small')       collider = { x: W/2 - 5,  y: H - 14, w: 10, h: 10 };
      else if (it.name === 'tree_dense')       collider = { x: 4,        y: 8,      w: 56, h: 48 };
      else if (it.name === 'tree_dense_pine')  collider = { x: 6,        y: 14,     w: 52, h: 44 };
      else if (it.name === 'tree_dense_autumn')collider = { x: 4,        y: 8,      w: 56, h: 48 };
      else if (it.name === 'house')            collider = { x: 14,       y: 40,     w: 100, h: 70 };
      else if (it.name === 'house_thatch')     collider = { x: 18,       y: 54,     w: 92, h: 62 };
      else if (it.name === 'rock')             collider = { x: 10,       y: 18,     w: 44, h: 32 };
      else if (it.name === 'rock_spiky')       collider = { x: 14,       y: 10,     w: 36, h: 44 };
      else if (it.name === 'rock_flat')        collider = { x: 4,        y: 36,     w: 58, h: 22 };
      else if (it.name === 'fence')            collider = { x: 12,       y: 22,     w: 40, h: 30 };
      else if (it.name === 'fence_cluster')    collider = { x: 2,        y: 26,     w: 60, h: 30 };
      else if (it.name === 'fence_long')       collider = { x: 2,        y: 26,     w: 124, h: 30 };
      else if (it.name === 'broken_wall')      collider = { x: 4,        y: 14,     w: 120, h: 44 };
      else if (it.name === 'stone_pile')       collider = { x: 8,        y: 20,     w: 50, h: 34 };
      else if (it.name === 'tree_row')         collider = { x: 6,        y: 14,     w: 116, h: 42 };
      else if (it.name === 'crate')            collider = { x: 12,       y: 18,     w: 40, h: 36 };
      else collider = null;
      return {
        name: it.name,
        file: `decor/${it.name}.png`,
        w: W, h: H,
        anchor: { x: W / 2, y: H - 4 },
        collider,
        hardBarrier,
        region: REGION[it.name] || 'scatter',
      };
    }),
  });
}

// ── SMALL MOBS ──────────────────────────────────────────────
// 4×5 grid, 64×64 frames = 256×320.
//   rows 0-3: U/L/D/R walk × 4 frames each
//   row 4:    death × 3 frames (col 3 blank)
async function buildMobs(page) {
  const mobs = [
    { name: 'goblin',   fn: goblinFrame },
    { name: 'slime',    fn: slimeFrame },
    { name: 'wolf',     fn: wolfFrame },
    { name: 'skeleton', fn: skeletonFrame },
  ];
  for (const m of mobs) {
    console.log(`[mob:${m.name}] …`);
    const cells = [];
    const dirs = ['U', 'L', 'D', 'R'];
    for (const d of dirs) for (let f = 0; f < 4; f++) cells.push(m.fn(d, 'walk', f));
    for (let f = 0; f < 4; f++) cells.push(f < 3 ? m.fn('D', 'death', f) : blank64());
    const sheet = await composite(page, cells, 64, 64, 4);
    await writeFile(`mob_${m.name}.png`, sheet);
    await writeJSON(`mob_${m.name}.json`, {
      image: `mob_${m.name}.png`,
      frameW: 64, frameH: 64,
      sheetCols: 4, sheetRows: 5,
      directionOrder: ['up', 'left', 'down', 'right'],
      anims: {
        walk:  { rowBase: 0, rowFromDir: true,  frames: 4, fps: 8, skipFrame0: false },
        death: { rowBase: 4, rowFromDir: false, frames: 3, fps: 8, skipFrame0: false, loop: false },
      },
      previewFrame: { row: 2, col: 0 },
      style: 'homm3_bright',
      kind: 'small_mob',
    });
  }
}

// ── BOSS TROLL ──────────────────────────────────────────────
// 4×6 grid, 128×128 frames = 512×768.
async function buildBoss(page) {
  console.log('[boss:troll] …');
  const cells = [];
  const dirs = ['U', 'L', 'D', 'R'];
  for (const d of dirs) for (let f = 0; f < 4; f++) cells.push(trollFrame(d, 'walk', f));
  for (let f = 0; f < 4; f++) cells.push(f < 3 ? trollFrame('D', 'attack', f) : blank128());
  for (let f = 0; f < 4; f++) cells.push(f < 3 ? trollFrame('D', 'death', f)  : blank128());
  const sheet = await composite(page, cells, 128, 128, 4);
  await writeFile('boss_troll.png', sheet);
  await writeJSON('boss_troll.json', {
    image: 'boss_troll.png',
    frameW: 128, frameH: 128,
    sheetCols: 4, sheetRows: 6,
    directionOrder: ['up', 'left', 'down', 'right'],
    anims: {
      walk:   { rowBase: 0, rowFromDir: true,  frames: 4, fps: 6,  skipFrame0: false },
      attack: { rowBase: 4, rowFromDir: false, frames: 3, fps: 8,  skipFrame0: false },
      death:  { rowBase: 5, rowFromDir: false, frames: 3, fps: 6,  skipFrame0: false, loop: false },
    },
    previewFrame: { row: 2, col: 0 },
    style: 'homm3_bright',
    kind: 'boss',
    collider: { x: 32, y: 64, w: 64, h: 56 },
    anchor:   { x: 64, y: 112 },
  });
}

function blank128() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"></svg>`;
}

// ── FIVE BOSSES ────────────────────────────────────────────
// IDs match Developer's BOSS_TYPES: stone_giant, shadow_mage,
// berserker, frost_dragon, rot_troll. Same 4×6 grid as boss_troll.
async function buildBosses(page) {
  const bosses = [
    { id: 'stone_giant',  fn: stoneGiantFrame,  accent: '#4a6a8a' },
    { id: 'shadow_mage',  fn: shadowMageFrame,  accent: '#c83af0' },
    { id: 'berserker',    fn: berserkerFrame,   accent: '#c41a1a' },
    { id: 'frost_dragon', fn: frostDragonFrame, accent: '#6aaacc' },
    { id: 'rot_troll',    fn: rotTrollFrame,    accent: '#9adf3c' },
  ];
  for (const b of bosses) {
    console.log(`[boss:${b.id}] …`);
    const cells = [];
    const dirs = ['U', 'L', 'D', 'R'];
    for (const d of dirs) for (let f = 0; f < 4; f++) cells.push(b.fn(d, 'walk', f));
    for (let f = 0; f < 4; f++) cells.push(f < 3 ? b.fn('D', 'attack', f) : blank128());
    for (let f = 0; f < 4; f++) cells.push(f < 3 ? b.fn('D', 'death', f)  : blank128());
    const sheet = await composite(page, cells, 128, 128, 4);
    await writeFile(`boss_${b.id}.png`, sheet);
    await writeJSON(`boss_${b.id}.json`, {
      image: `boss_${b.id}.png`,
      frameW: 128, frameH: 128,
      sheetCols: 4, sheetRows: 6,
      directionOrder: ['up', 'left', 'down', 'right'],
      anims: {
        walk:   { rowBase: 0, rowFromDir: true,  frames: 4, fps: 6,  skipFrame0: false },
        attack: { rowBase: 4, rowFromDir: false, frames: 3, fps: 8,  skipFrame0: false },
        death:  { rowBase: 5, rowFromDir: false, frames: 3, fps: 6,  skipFrame0: false, loop: false },
      },
      previewFrame: { row: 2, col: 0 },
      style: 'homm3_bright',
      kind: 'boss',
      bossId: b.id,
      accentColor: b.accent,
      collider: { x: 32, y: 64, w: 64, h: 56 },
      anchor:   { x: 64, y: 112 },
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
