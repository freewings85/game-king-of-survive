import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '..');

const bosses = ['stone_giant','shadow_mage','berserker','frost_dragon','rot_troll'];

let sheetsHtml = '';
let silHtml = '';
for (const b of bosses) {
  sheetsHtml += `<div style="display:inline-block;vertical-align:top;margin:0 12px 12px 0">
    <div style="font-size:12px;color:#ffd87a;margin-bottom:4px;font-family:monospace">${b}</div>
    <img src="boss_${b}.png" style="background:#4a8a22;border:1px solid #333;image-rendering:pixelated">
    <div style="font-size:9px;color:#888;margin-top:2px">boss_${b}.png 512×768</div>
  </div>`;
  silHtml += `<div style="display:inline-block;margin:0 8px"><canvas id="sil_${b}" width="384" height="384" style="image-rendering:pixelated;background:#4a8a22;border:1px solid #333"></canvas><div style="font-size:10px;color:#ccc;margin-top:2px">${b}</div></div>`;
}

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:18px 0 6px;font-size:14px}
</style></head><body>
<h2>All 5 bosses — full sheets (4×6, 128px frames)</h2>
<div>${sheetsHtml}</div>
<h2>Silhouette test (row 2 col 0 = down walk frame 0, zoomed 3×)</h2>
<div>${silHtml}</div>
<script>
async function zoom(src, id){
  const img=new Image(); img.src=src;
  await new Promise(r=>img.onload=r);
  const c=document.getElementById(id); const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img, 0, 2*128, 128, 128, 0, 0, 384, 384);
}
(async()=>{
  ${bosses.map(b => `await zoom('boss_${b}.png','sil_${b}');`).join('\n  ')}
  window.__ready=true;
})();
</script>
</body></html>`;

const p = path.join(PACK, '_qa_bosses.html');
fs.writeFileSync(p, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2200, height: 1400 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready === true, { timeout: 5000 });
await page.screenshot({ path: path.join(PACK, '_qa_bosses.png'), fullPage: true });
console.log('qa bosses:', path.join(PACK, '_qa_bosses.png'));
await browser.close();
