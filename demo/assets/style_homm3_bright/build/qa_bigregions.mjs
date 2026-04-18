// QA for HoMM3-scale region filling: show the 3 new fillers + a
// large-region mock with ~40 items/region to validate Leo's dense
// "≥1/4 screen" goal. World sized to mobile 390×844 stretched.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(__dirname, '..');
const idx = JSON.parse(fs.readFileSync(path.join(PACK, 'decor', 'index.json'), 'utf8'));
const byName = Object.fromEntries(idx.items.map(it => [it.name, it]));

function seededRnd(s) {
  let t = s >>> 0;
  return () => { t += 0x6D2B79F5; let r = t; r = Math.imul(r ^ (r >>> 15), r | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

// Build one large region: sqrt-distributed points in a circle.
function region(cx, cy, radius, pool, n, seed) {
  const rnd = seededRnd(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(rnd()) * radius;
    const ang = rnd() * Math.PI * 2;
    out.push({
      x: cx + Math.cos(ang) * r,
      y: cy + Math.sin(ang) * r,
      name: pool[Math.floor(rnd() * pool.length)],
      jitter: (rnd() - 0.5) * 6,
    });
  }
  return out;
}

// World mock — larger than screen, 4 big regions + scatter
const W = 1400, H = 900;
const placements = [
  ...region(350, 260, 220, idx.regions.forest,  42, 101),
  ...region(1050, 260, 170, idx.regions.stones,  22, 202),
  ...region(350, 670, 200, idx.regions.village, 14, 303),
  ...region(1050, 670, 180, idx.regions.ruins,  18, 404),
];
// Sort by y for south-over-north draw order
placements.sort((a, b) => a.y - b.y);

// Region outlines (dashed) for QA clarity
const outlines = [
  { cx: 350,  cy: 260, r: 220, tag: 'forest',  col: '#5ca226' },
  { cx: 1050, cy: 260, r: 170, tag: 'stones',  col: '#b8b0a0' },
  { cx: 350,  cy: 670, r: 200, tag: 'village', col: '#f4d42a' },
  { cx: 1050, cy: 670, r: 180, tag: 'ruins',   col: '#6a4a20' },
];

let outlineHtml = outlines.map(o =>
  `<div style="position:absolute;left:${o.cx - o.r}px;top:${o.cy - o.r}px;width:${o.r*2}px;height:${o.r*2}px;border:2px dashed ${o.col};border-radius:50%;opacity:0.6;pointer-events:none"></div>` +
  `<div style="position:absolute;left:${o.cx - 40}px;top:${o.cy + o.r + 6}px;width:80px;text-align:center;color:${o.col};font:bold 14px sans-serif;text-shadow:0 0 4px #000;pointer-events:none">${o.tag} r=${o.r}</div>`
).join('');

let decorHtml = '';
for (const p of placements) {
  const it = byName[p.name]; if (!it) continue;
  const px = p.x - it.w / 2 + p.jitter;
  const py = p.y - it.h + 8 + p.jitter;
  decorHtml += `<img src="${it.file}" style="position:absolute;left:${px}px;top:${py}px;width:${it.w}px;height:${it.h}px;image-rendering:pixelated">`;
}

// card view for the 3 new fillers
const cards = ['broken_wall', 'stone_pile', 'tree_row'].map(n => {
  const it = byName[n];
  return `<div style="display:inline-block;vertical-align:bottom;margin:8px;background:#4a8a22;padding:6px;border-radius:4px;text-align:center">
    <img src="${it.file}" style="image-rendering:pixelated;background:#5ca226">
    <div style="font-size:11px;color:#ffd87a;margin-top:4px;font-family:monospace">${it.name} (${it.w}×${it.h})</div>
    <div style="font-size:9px;color:#888">${it.hardBarrier ? '⛔ hardBarrier' : 'decor'}</div>
  </div>`;
}).join('');

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:16px 0 8px;font-size:14px}
.world{position:relative;width:${W}px;height:${H}px;background:#5ca226;overflow:hidden;border:2px solid #333}
</style></head><body>

<h2>3 new "dense terrain" fillers</h2>
<div>${cards}</div>

<h2>HoMM3-scale region mock — 1400×900 world, 4 big regions (radius 170-220px)</h2>
<p style="color:#aaa;font-size:12px">Forest 42 items · Stones 22 · Village 14 · Ruins 18. Each region comfortably fills ≥1/4 of a mobile viewport (390×844 overlay shown at bottom-right corner for scale). Items are jittered ±6px per placement; edges naturally feather out. Dashed circles are QA overlays, not rendered in-game.</p>
<div class="world">
  ${decorHtml}
  ${outlineHtml}
  <div style="position:absolute;right:10px;bottom:10px;width:195px;height:422px;border:2px dashed #ff3a3a;opacity:0.5;pointer-events:none"></div>
  <div style="position:absolute;right:14px;bottom:440px;color:#ff3a3a;font:bold 11px monospace;text-shadow:0 0 3px #000;pointer-events:none">iPhone 14 viewport (half-scale)</div>
</div>
</body></html>`;

const p = path.join(PACK, '_qa_bigregions.html');
fs.writeFileSync(p, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W + 40, height: H + 600 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(PACK, '_qa_bigregions.png'), fullPage: true });
console.log('qa bigregions:', path.join(PACK, '_qa_bigregions.png'));
await browser.close();
