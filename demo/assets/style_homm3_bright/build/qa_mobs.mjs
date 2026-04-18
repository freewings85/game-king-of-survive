import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '..');

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:18px 0 6px;font-size:14px}
.sheet{border:1px solid #333;background:#4a8a22;display:inline-block;vertical-align:top;margin-right:12px}
.lbl{font-size:10px;color:#ccc;font-family:monospace;margin:4px 0 12px}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start}
canvas{image-rendering:pixelated;background:#4a8a22}
</style></head><body>

<h2>Small mobs — goblin · slime · wolf · skeleton (each 4×5, 64px frames)</h2>
<div class="row">
  <div>
    <img class="sheet" src="mob_goblin.png">
    <div class="lbl">mob_goblin.png 256×320</div>
  </div>
  <div>
    <img class="sheet" src="mob_slime.png">
    <div class="lbl">mob_slime.png 256×320</div>
  </div>
  <div>
    <img class="sheet" src="mob_wolf.png">
    <div class="lbl">mob_wolf.png 256×320</div>
  </div>
  <div>
    <img class="sheet" src="mob_skeleton.png">
    <div class="lbl">mob_skeleton.png 256×320</div>
  </div>
</div>

<h2>Boss troll (4×6, 128px frames)</h2>
<img class="sheet" src="boss_troll.png" style="background:#6a4018">
<div class="lbl">boss_troll.png 512×768 — row 0-3 walk U/L/D/R, row 4 attack, row 5 death</div>

<h2>Silhouette test (row 2 col 0, "down walk frame 0", zoomed 3×)</h2>
<div class="row" style="background:#4a8a22;padding:8px;border-radius:4px">
  <div><canvas id="g"  width="192" height="192"></canvas><div class="lbl">goblin</div></div>
  <div><canvas id="sl" width="192" height="192"></canvas><div class="lbl">slime</div></div>
  <div><canvas id="w"  width="192" height="192"></canvas><div class="lbl">wolf</div></div>
  <div><canvas id="sk" width="192" height="192"></canvas><div class="lbl">skeleton</div></div>
  <div><canvas id="t"  width="384" height="384"></canvas><div class="lbl">boss_troll</div></div>
</div>

<script>
async function zoom(src, id, sx, sy, sw, sh, dw, dh){
  const img=new Image(); img.src=src;
  await new Promise(r=>img.onload=r);
  const c=document.getElementById(id); const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}
(async()=>{
  await zoom('mob_goblin.png','g', 0, 2*64, 64, 64, 192, 192);
  await zoom('mob_slime.png','sl', 0, 2*64, 64, 64, 192, 192);
  await zoom('mob_wolf.png','w', 0, 2*64, 64, 64, 192, 192);
  await zoom('mob_skeleton.png','sk', 0, 2*64, 64, 64, 192, 192);
  await zoom('boss_troll.png','t', 0, 2*128, 128, 128, 384, 384);
  window.__ready=true;
})();
</script>
</body></html>`;

const p = path.join(PACK, '_qa_mobs.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1500 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready === true, { timeout: 5000 });
await page.screenshot({ path: path.join(PACK, '_qa_mobs.png'), fullPage: true });
console.log('qa mobs:', path.join(PACK, '_qa_mobs.png'));
await browser.close();
