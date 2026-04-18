import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

const html = `<!doctype html><html><head><style>
body{margin:0;background:#101418;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:16px 0 8px;font-size:14px}
.bar{background:linear-gradient(#2a5a22,#4a8a22);padding:12px;border-radius:6px}
.row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.card{background:#1a1a22;padding:6px;text-align:center;font-size:10px;color:#bbb}
.killfeed{background:url('../style_homm3_bright/_qa_preview.png') no-repeat;background-size:cover;background-position:0 -300px;padding:16px;border-radius:6px;min-height:200px}
</style></head><body>

<h2>Storm warning bar (512×48, horizontal)</h2>
<div class="bar"><img src="storm_bar.png"></div>

<h2>Rank crowns (gold/silver/bronze)</h2>
<div class="row">
  <div class="card"><img src="crown_gold.png"><div>crown_gold</div></div>
  <div class="card"><img src="crown_silver.png"><div>crown_silver</div></div>
  <div class="card"><img src="crown_bronze.png"><div>crown_bronze</div></div>
</div>

<h2>Killfeed card (192×64, 9-slice source)</h2>
<div class="killfeed">
  <img src="killfeed_card.png"><br><br>
  <img src="killfeed_card.png"><br><br>
  <img src="killfeed_card.png">
</div>

<h2>9-slice pieces</h2>
<div class="row">
  <div class="card"><img src="killfeed9/tl.png"><div>tl</div></div>
  <div class="card"><img src="killfeed9/t.png"><div>t</div></div>
  <div class="card"><img src="killfeed9/tr.png"><div>tr</div></div>
  <div class="card"><img src="killfeed9/l.png"><div>l</div></div>
  <div class="card"><img src="killfeed9/c.png"><div>c</div></div>
  <div class="card"><img src="killfeed9/r.png"><div>r</div></div>
  <div class="card"><img src="killfeed9/bl.png"><div>bl</div></div>
  <div class="card"><img src="killfeed9/b.png"><div>b</div></div>
  <div class="card"><img src="killfeed9/br.png"><div>br</div></div>
</div>

</body></html>`;

const p = path.join(OUT, '_qa.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '_qa.png'), fullPage: true });
console.log('qa:', path.join(OUT, '_qa.png'));
await browser.close();
