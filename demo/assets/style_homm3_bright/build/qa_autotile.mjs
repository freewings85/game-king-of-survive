// Visual QA for autotile: lays out a 4x4 demo grid for each biome pair
// showing all 16 mask variants with labels, plus a "continuous world"
// sample showing how they stitch.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '..');

const atlas = JSON.parse(fs.readFileSync(path.join(PACK, 'tileset.json'), 'utf8'));
const seams = atlas.seams;

function tileBg(sx, sy) {
  return `background-image:url(tileset.png);background-position:-${sx}px -${sy}px;background-size:auto;width:64px;height:64px;image-rendering:pixelated;`;
}

let gdGrid = '';
for (let m = 0; m < 16; m++) {
  const s = seams.grass_dirt[String(m)];
  gdGrid += `<div class="t"><div class="sprite" style="${tileBg(s.px.x, s.px.y)}"></div><div class="l">gd_${m}<br>${m.toString(2).padStart(4,'0')}</div></div>`;
}
let gsGrid = '';
for (let m = 0; m < 16; m++) {
  const s = seams.grass_stone[String(m)];
  gsGrid += `<div class="t"><div class="sprite" style="${tileBg(s.px.x, s.px.y)}"></div><div class="l">gs_${m}<br>${m.toString(2).padStart(4,'0')}</div></div>`;
}

// Build a 12×8 stitched map where a central blob of dirt meets grass.
// Terrain grid: 0=grass, 1=dirt
const W = 14, H = 10;
const map = [];
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    // big dirt circle in middle
    const cx = W/2, cy = H/2;
    const d = Math.hypot(x - cx, y - cy);
    let t = d < 3.2 ? 1 : 0;
    // small stone pond top-right
    if (Math.hypot(x - (W - 3), y - 2) < 1.6) t = 2;
    row.push(t);
  }
  map.push(row);
}

function tileAt(x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return 0; return map[y][x]; }

let stitched = '';
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = map[y][x];
    let bg;
    if (t === 0) {
      // grass base — pick a variant
      const v = atlas.variants.grass[(x + y) % 2];
      bg = tileBg(v.px.x, v.px.y);
    } else {
      // compute mask: which neighbors are GRASS (the "to" from the tile's perspective is the neighboring biome)
      // For seam lookup: tile is `from` biome, mask bits flag neighbors that are `to` biome.
      // If current is dirt, and a neighbor is grass, we want a "dirt→grass" seam — which we don't have.
      // Convention: seams are from grass's perspective. So when tile is dirt (or stone), we render the base tile.
      // Stitching only draws grass tiles with seam overlay toward dirt/stone neighbors.
      const v = t === 1 ? atlas.variants.dirt[(x + y) % 2] : atlas.variants.stone[(x + y) % 2];
      bg = tileBg(v.px.x, v.px.y);
    }
    // Overlay: if tile is grass AND a neighbor is dirt/stone, draw the appropriate seam tile instead.
    if (t === 0) {
      const n = tileAt(x, y - 1), e = tileAt(x + 1, y), s = tileAt(x, y + 1), w = tileAt(x - 1, y);
      const dirtMask = (n === 1 ? 1 : 0) | (e === 1 ? 2 : 0) | (s === 1 ? 4 : 0) | (w === 1 ? 8 : 0);
      const stoneMask = (n === 2 ? 1 : 0) | (e === 2 ? 2 : 0) | (s === 2 ? 4 : 0) | (w === 2 ? 8 : 0);
      if (stoneMask !== 0) {
        const sp = seams.grass_stone[String(stoneMask)];
        bg = tileBg(sp.px.x, sp.px.y);
      } else if (dirtMask !== 0) {
        const sp = seams.grass_dirt[String(dirtMask)];
        bg = tileBg(sp.px.x, sp.px.y);
      }
    }
    stitched += `<div class="wc" style="${bg};left:${x*64}px;top:${y*64}px"></div>`;
  }
}

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:20px 0 8px;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(8,80px);gap:4px}
.t{background:#000;padding:2px;text-align:center}
.sprite{width:64px;height:64px;margin:0 auto}
.l{font-size:9px;color:#bbb;margin-top:2px;line-height:1.2}
.world{position:relative;width:${W*64}px;height:${H*64}px;border:1px solid #333;margin:8px 0}
.wc{position:absolute}
</style></head><body>
<h2>Full atlas (512×320)</h2>
<img src="tileset.png" style="image-rendering:pixelated;border:1px solid #333">

<h2>Grass → Dirt (gd_0..gd_15)</h2>
<div class="grid">${gdGrid}</div>

<h2>Grass → Stone (gs_0..gs_15)</h2>
<div class="grid">${gsGrid}</div>

<h2>Continuous world stitch test (grass with dirt blob + stone pond, autotile seams applied)</h2>
<div class="world">${stitched}</div>
</body></html>`;

const p = path.join(PACK, '_qa_autotile.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 2000 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(PACK, '_qa_autotile.png'), fullPage: true });
console.log('qa autotile:', path.join(PACK, '_qa_autotile.png'));
await browser.close();
