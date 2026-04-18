// QA for Step 1 barriers: preview fence_cluster & tree_dense
// placed in a simulated "street" layout with colliders outlined.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '..');

const idx = JSON.parse(fs.readFileSync(path.join(PACK, 'decor', 'index.json'), 'utf8'));

let cards = '';
for (const it of idx.items) {
  const c = it.collider;
  const colliderRect = c
    ? `<div style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;box-sizing:border-box;border:1.5px solid ${it.hardBarrier ? '#ff3a3a' : '#6aaaff'};background:${it.hardBarrier ? 'rgba(255,58,58,0.15)' : 'rgba(106,170,255,0.1)'}"></div>`
    : '';
  cards += `<div style="display:inline-block;vertical-align:top;margin:8px;background:#4a8a22;padding:4px;text-align:center">
    <div style="position:relative;width:${it.w}px;height:${it.h}px;margin:0 auto">
      <img src="decor/${it.name}.png" style="display:block;image-rendering:pixelated">
      ${colliderRect}
    </div>
    <div style="font-size:10px;color:${it.hardBarrier ? '#ffd87a' : '#aaa'};margin-top:2px;font-family:monospace">${it.name}${it.hardBarrier ? ' ⛔' : ''}</div>
  </div>`;
}

// build a small "street layout" sample: walkable dirt path + houses/fences/dense trees flanking
const W = 10, H = 7;
const map = [];
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    // horizontal path at y=3
    row.push(y === 3 ? 'path' : 'grass');
  }
  map.push(row);
}
// barriers scatter along both sides of the path
const placements = [
  { x: 1, y: 1, name: 'house' },
  { x: 7, y: 1, name: 'house' },
  { x: 4, y: 0, name: 'tree_dense' },
  { x: 4, y: 6, name: 'tree_dense' },
  { x: 2, y: 5, name: 'fence_cluster' },
  { x: 7, y: 5, name: 'fence_cluster' },
  { x: 1, y: 6, name: 'rock' },
  { x: 8, y: 0, name: 'rock' },
  { x: 5, y: 3, name: 'crate' },  // on path, non-barrier
  { x: 3, y: 4, name: 'tree_small' }, // non-barrier
];

let sceneHtml = '';
sceneHtml += `<div style="position:relative;width:${W*64}px;height:${H*64}px;background:#5ca226">`;
// path tiles
for (let x = 0; x < W; x++) {
  sceneHtml += `<div style="position:absolute;left:${x*64}px;top:${3*64}px;width:64px;height:64px;background:#a87236"></div>`;
}
// decor
for (const p of placements) {
  const it = idx.items.find(i => i.name === p.name);
  if (!it) continue;
  const px = p.x * 64 + (64 - it.w) / 2;
  const py = p.y * 64 + (64 - it.h) / 2;
  sceneHtml += `<img src="decor/${it.name}.png" style="position:absolute;left:${px}px;top:${py}px;width:${it.w}px;height:${it.h}px;image-rendering:pixelated">`;
  if (it.collider) {
    const cx = px + it.collider.x, cy = py + it.collider.y;
    sceneHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${it.collider.w}px;height:${it.collider.h}px;box-sizing:border-box;border:1px dashed ${it.hardBarrier ? '#ff3a3a' : '#6aaaff'};opacity:0.6"></div>`;
  }
}
sceneHtml += `</div>`;

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:18px 0 6px;font-size:14px}
</style></head><body>
<h2>Decor cards (⛔ = hardBarrier; red = blocking collider, blue = non-blocking)</h2>
<div>${cards}</div>
<h2>Street layout sample — dirt path lane with houses/dense-trees/fence-clusters flanking</h2>
${sceneHtml}
<p style="color:#aaa;font-size:12px">Player should be able to walk east-west along the dirt path freely. North-south movement is blocked by houses, dense trees, and fence clusters (red colliders). crate on the path is currently marked non-barrier so it doesn't block the lane.</p>
</body></html>`;

const p = path.join(PACK, '_qa_barriers.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(PACK, '_qa_barriers.png'), fullPage: true });
console.log('qa barriers:', path.join(PACK, '_qa_barriers.png'));
await browser.close();
