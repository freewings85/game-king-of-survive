// Visual QA: loads all generated PNGs into a single page, screenshots it.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '..');

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:20px 0 8px;font-size:14px}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end}
.cell{background:#000;border:1px solid #333;padding:4px;text-align:center;font-size:10px;color:#bbb}
img{display:block}
.sheet{border:1px solid #333;background:#000}
.big{background:#2a4a1a}
</style></head><body>
<h2>Tileset (6×2 · 64px)</h2>
<img class="sheet" src="tileset.png">
<h2>Player · Mage sheet (4 dirs × 4 walk, attack 3, death 3)</h2>
<img class="sheet" src="player_mage.png" style="background:#2a4a1a">
<h2>Monster · Orc sheet (4 dirs × 4 walk)</h2>
<img class="sheet" src="monster_orc.png" style="background:#6a4018">
<h2>UI 9-slice</h2>
<div class="row">
  <div class="cell">full<br><img src="ui_frame_full.png"></div>
  <div class="cell">tl<br><img src="ui9/tl.png"></div>
  <div class="cell">t<br><img src="ui9/t.png"></div>
  <div class="cell">tr<br><img src="ui9/tr.png"></div>
  <div class="cell">l<br><img src="ui9/l.png"></div>
  <div class="cell">c<br><img src="ui9/c.png"></div>
  <div class="cell">r<br><img src="ui9/r.png"></div>
  <div class="cell">bl<br><img src="ui9/bl.png"></div>
  <div class="cell">b<br><img src="ui9/b.png"></div>
  <div class="cell">br<br><img src="ui9/br.png"></div>
</div>
<h2>Decorations</h2>
<div class="row big">
  <div class="cell">tree_big<br><img src="decor/tree_big.png"></div>
  <div class="cell">tree_small<br><img src="decor/tree_small.png"></div>
  <div class="cell">rock<br><img src="decor/rock.png"></div>
  <div class="cell">house<br><img src="decor/house.png"></div>
  <div class="cell">fence<br><img src="decor/fence.png"></div>
  <div class="cell">crate<br><img src="decor/crate.png"></div>
</div>
</body></html>`;

const p = path.join(PACK, '_qa_preview.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1600 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(PACK, '_qa_preview.png'), fullPage: true });
console.log('qa preview:', path.join(PACK, '_qa_preview.png'));
await browser.close();
