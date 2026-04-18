// Render pipeline: SVG → PNG via playwright headless Chromium.
// Usage: node demo/assets/style_homm3_bright/build/render.mjs [target]
// target = tileset | mage | orc | ui | decor | all (default: all)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TILES, mageFrame, orcFrame, uiFrameFull, treeBig, treeSmall, rock, house, fence, crate } from './svgs.mjs';

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

  if (target === 'all' || target === 'tileset') jobs.push(() => buildTileset(page));
  if (target === 'all' || target === 'mage')    jobs.push(() => buildMage(page));
  if (target === 'all' || target === 'orc')     jobs.push(() => buildOrc(page));
  if (target === 'all' || target === 'ui')      jobs.push(() => buildUI(page));
  if (target === 'all' || target === 'decor')   jobs.push(() => buildDecor(page));

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

// ── TILESET ──────────────────────────────────────────────────
async function buildTileset(page) {
  console.log('[tileset] …');
  const order = ['grass0','grass1','dirt0','dirt1','stone0','stone1','gd_E','gd_W','gd_N','gd_S','gs_E','gs_S'];
  const cells = order.map(id => TILES[id]());
  const sheet = await composite(page, cells, 64, 64, 6); // 6x2 grid → 384x128
  await writeFile('tileset.png', sheet);
  const atlas = {
    image: 'tileset.png',
    tileW: 64, tileH: 64, cols: 6, rows: 2,
    tiles: order.map((id, i) => ({
      id, col: i % 6, row: Math.floor(i / 6),
      px: { x: (i % 6) * 64, y: Math.floor(i / 6) * 64, w: 64, h: 64 },
    })),
    style: 'homm3_bright',
  };
  await writeJSON('tileset.json', atlas);
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
    { name: 'tree_big',   size: 128, svg: treeBig() },
    { name: 'tree_small', size: 64,  svg: treeSmall() },
    { name: 'rock',       size: 64,  svg: rock() },
    { name: 'house',      size: 128, svg: house() },
    { name: 'fence',      size: 64,  svg: fence() },
    { name: 'crate',      size: 64,  svg: crate() },
  ];
  for (const it of items) {
    const buf = await renderSvg(page, it.svg, it.size, it.size);
    await writeFile(`decor/${it.name}.png`, buf);
  }
  await writeJSON('decor/index.json', {
    style: 'homm3_bright',
    items: items.map(it => ({
      name: it.name, file: `decor/${it.name}.png`,
      w: it.size, h: it.size,
      // anchor at bottom-center for ground placement
      anchor: { x: it.size / 2, y: it.size - 4 },
      // collision rect (smaller than full sprite, for walking around tree trunks etc.)
      collider: it.name.startsWith('tree') ? { x: it.size / 2 - 6, y: it.size - 16, w: 12, h: 12 }
        : it.name === 'house' ? { x: 14, y: 40, w: 100, h: 70 }
        : it.name === 'rock' ? { x: 12, y: 20, w: 40, h: 28 }
        : it.name === 'fence' ? { x: 4, y: 20, w: 56, h: 32 }
        : it.name === 'crate' ? { x: 12, y: 18, w: 40, h: 36 }
        : null,
    })),
  });
}

function blank64() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"></svg>`;
}

main().catch(e => { console.error(e); process.exit(1); });
