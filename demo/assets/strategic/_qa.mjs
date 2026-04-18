import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:18px 0 8px;font-size:14px}
.row{display:flex;gap:20px;align-items:flex-end}
.card{background:#4a8a22;border:1px solid #333;padding:8px;border-radius:4px;text-align:center;min-width:80px}
.card img{image-rendering:pixelated}
.cap{font-size:10px;color:#ddd;margin-top:4px;font-family:monospace}
.teamglow-t1{background:radial-gradient(ellipse at center 88%, rgba(42,90,200,0.55) 0 35%, transparent 70%), #4a8a22}
.teamglow-t2{background:radial-gradient(ellipse at center 88%, rgba(196,26,26,0.55) 0 35%, transparent 70%), #4a8a22}
.barrow{display:flex;gap:8px;align-items:center;margin:6px 0}
.capbar-wrap{position:relative;width:192px;height:32px}
.capbar-wrap img.frame{position:absolute;left:0;top:0}
.capbar-wrap .fill{position:absolute;left:6px;top:6px;height:16px}
</style></head><body>

<h2>Strategic points — base sprites (64×128)</h2>
<div class="row">
  <div class="card"><img src="watchtower.png"><div class="cap">watchtower</div><div class="cap" style="color:#9fd8ff">vision +120%</div></div>
  <div class="card"><img src="temple.png"><div class="cap">temple</div><div class="cap" style="color:#c8e4ff">regen +2 hp/s</div></div>
  <div class="card"><img src="camp.png"><div class="cap">camp</div><div class="cap" style="color:#ff9a6a">enemy radar 30s</div></div>
</div>

<h2>Captured state (Developer tints captureGlow by team)</h2>
<div class="row">
  <div class="card teamglow-t1"><img src="watchtower.png"><div class="cap">team 1 (blue) tower</div></div>
  <div class="card teamglow-t2"><img src="temple.png"><div class="cap">team 2 (red) temple</div></div>
  <div class="card teamglow-t1"><img src="camp.png"><div class="cap">team 1 camp</div></div>
</div>

<h2>Capture bar — frame + fill textures</h2>
<div class="barrow"><img src="capture_bar.png"><div class="cap">frame alone (192×32)</div></div>
<div class="barrow">
  <div class="capbar-wrap">
    <div class="fill" style="width:45px;background:url(capture_fill_team1.png) repeat-x"></div>
    <img class="frame" src="capture_bar.png">
  </div>
  <div class="cap">team 1 · 25%</div>
</div>
<div class="barrow">
  <div class="capbar-wrap">
    <div class="fill" style="width:108px;background:url(capture_fill_team2.png) repeat-x"></div>
    <img class="frame" src="capture_bar.png">
  </div>
  <div class="cap">team 2 · 60%</div>
</div>
<div class="barrow">
  <div class="capbar-wrap">
    <div class="fill" style="width:180px;background:url(capture_fill_neutral.png) repeat-x"></div>
    <img class="frame" src="capture_bar.png">
  </div>
  <div class="cap">neutral · 100%</div>
</div>

<h2>9-slice pieces (cornerSize=8)</h2>
<div class="row">
  <div class="card"><img src="capture_bar9/tl.png"><div class="cap">tl</div></div>
  <div class="card"><img src="capture_bar9/t.png"><div class="cap">t</div></div>
  <div class="card"><img src="capture_bar9/tr.png"><div class="cap">tr</div></div>
  <div class="card"><img src="capture_bar9/l.png"><div class="cap">l</div></div>
  <div class="card"><img src="capture_bar9/c.png"><div class="cap">c</div></div>
  <div class="card"><img src="capture_bar9/r.png"><div class="cap">r</div></div>
  <div class="card"><img src="capture_bar9/bl.png"><div class="cap">bl</div></div>
  <div class="card"><img src="capture_bar9/b.png"><div class="cap">b</div></div>
  <div class="card"><img src="capture_bar9/br.png"><div class="cap">br</div></div>
</div>

</body></html>`;

const p = path.join(OUT, '_qa.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '_qa.png'), fullPage: true });
console.log('qa:', path.join(OUT, '_qa.png'));
await browser.close();
