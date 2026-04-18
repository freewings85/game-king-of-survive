import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

const idx = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));

let nativeRow = '';
let zoomRow = '';
let stagedRow = '';
for (const a of idx.archetypes) {
  nativeRow += `<div class="cell"><img src="${a.file}"><div class="lbl">${a.id}<br>${a.label}</div></div>`;
  zoomRow += `<div class="cell"><img src="${a.file}" style="width:72px;height:72px"><div class="lbl">${a.label} ×3</div></div>`;
  stagedRow += `<div class="bot">
    <div class="icon"><img src="${a.file}"></div>
    <div class="name" style="color:${a.color}">[${a.label}]</div>
    <div class="bot-body">bot</div>
  </div>`;
}

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:18px 0 8px;font-size:14px}
.row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}
.cell{background:#4a8a22;border:1px solid #333;padding:6px;text-align:center;border-radius:4px}
.lbl{font-size:9px;color:#ddd;margin-top:4px;font-family:monospace;line-height:1.3}
.bot{display:inline-block;vertical-align:top;margin:10px 4px;width:72px;text-align:center}
.icon img{width:24px;height:24px;margin:0 auto;display:block}
.name{font-size:10px;font-weight:bold;margin-top:2px;text-shadow:0 0 2px #000;font-family:monospace}
.bot-body{width:28px;height:28px;border-radius:50%;background:#8a5a20;border:2px solid #1a1a22;margin:2px auto 0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px}
.board{background:linear-gradient(#4a8a22,#3a6e18);padding:10px;border-radius:6px}
</style></head><body>

<h2>Archetype icons — native 24×24</h2>
<div class="row">${nativeRow}</div>

<h2>Zoomed 3× (readability at far camera distance)</h2>
<div class="row">${zoomRow}</div>

<h2>Mock head-HUD — icon + Chinese label above bot sprite</h2>
<div class="board">${stagedRow}</div>

<h2>Usage hint</h2>
<p style="color:#aaa;font-size:12px;max-width:800px;line-height:1.5">
Float 24×24 icon at bot.center.y − 36px (above nameplate). Either replace the current "[刺客]" text label, OR stack icon above and keep label below for extra emphasis. Icon backing color matches the bot's archetype tint so players can still spot it peripherally.
</p>

</body></html>`;

const p = path.join(OUT, '_qa.html');
fs.writeFileSync(p, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '_qa.png'), fullPage: true });
console.log('qa:', path.join(OUT, '_qa.png'));
await browser.close();
