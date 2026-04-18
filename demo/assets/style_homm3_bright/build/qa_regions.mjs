// QA for Step 1.5: show each region pool + a mock clustered map.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '..');

const idx = JSON.parse(fs.readFileSync(path.join(PACK, 'decor', 'index.json'), 'utf8'));
const byName = Object.fromEntries(idx.items.map(it => [it.name, it]));

// Region cards
function regionCard(region) {
  const names = idx.regions[region];
  const tiles = names.map(n => {
    const it = byName[n];
    return `<div style="display:inline-block;vertical-align:bottom;margin:2px;background:#4a8a22;padding:4px;text-align:center;border-radius:4px">
      <img src="${it.file}" style="image-rendering:pixelated">
      <div style="font-size:9px;color:#ccc;margin-top:2px;font-family:monospace">${it.name}</div>
    </div>`;
  }).join('');
  return `<h2>Region pool: ${region}</h2><div>${tiles}</div>`;
}

// Mock cluster world: 3 regions visible
const W = 16, H = 10;
// Forest cluster centered at (3,3)
// Stones cluster at (12,2)
// Village cluster at (5,7)
function seededRnd(s) {
  let t = s >>> 0;
  return () => { t += 0x6D2B79F5; let r = t; r = Math.imul(r ^ (r >>> 15), r | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
const placements = [];
function scatterRegion(cx, cy, radius, pool, count, seed) {
  const rnd = seededRnd(seed);
  for (let i = 0; i < count; i++) {
    // random within circle
    let r = Math.sqrt(rnd()) * radius;
    let ang = rnd() * Math.PI * 2;
    let x = cx + Math.cos(ang) * r;
    let y = cy + Math.sin(ang) * r;
    const name = pool[Math.floor(rnd() * pool.length)];
    placements.push({ x, y, name });
  }
}
// Forest (top-left)
scatterRegion(3.2, 3.5, 2.6, idx.regions.forest, 14, 101);
// Stones (top-right)
scatterRegion(12.5, 2.8, 2.0, idx.regions.stones, 9, 202);
// Village (bottom-center)
scatterRegion(6.5, 7.2, 2.4, idx.regions.village, 8, 303);
// Scatter sparse flavor
scatterRegion(9, 4, 3.5, idx.regions.scatter, 4, 404);

// Render placements into HTML (sort by y so south occludes north)
placements.sort((a, b) => a.y - b.y);
let sceneHtml = `<div style="position:relative;width:${W*64}px;height:${H*64}px;background:#5ca226;overflow:hidden">`;
// dirt paths between regions (narrow)
sceneHtml += `<div style="position:absolute;left:0;top:${4.5*64}px;width:100%;height:40px;background:#a87236;opacity:0.9"></div>`;
sceneHtml += `<div style="position:absolute;left:${7*64}px;top:0;width:40px;height:100%;background:#a87236;opacity:0.9"></div>`;
for (const p of placements) {
  const it = byName[p.name]; if (!it) continue;
  const px = p.x * 64 - it.w / 2;
  const py = p.y * 64 - it.h + 8;
  sceneHtml += `<img src="${it.file}" style="position:absolute;left:${px}px;top:${py}px;width:${it.w}px;height:${it.h}px;image-rendering:pixelated">`;
}
sceneHtml += `</div>`;

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:18px 0 6px;font-size:14px}
</style></head><body>
${regionCard('forest')}
${regionCard('stones')}
${regionCard('village')}
${regionCard('scatter')}
<h2>Mock clustered map — 3 regions (forest top-left · stones top-right · village bottom) with dirt path grid</h2>
${sceneHtml}
<p style="color:#aaa;font-size:12px">Pick region type per cluster; draw 8-15 items from that region's pool inside a radius. Leave ≥200px gaps between regions for walkable lanes (shown here as dirt cross).</p>
</body></html>`;

const p = path.join(PACK, '_qa_regions.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(PACK, '_qa_regions.png'), fullPage: true });
console.log('qa regions:', path.join(PACK, '_qa_regions.png'));
await browser.close();
