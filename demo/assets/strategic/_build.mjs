// Strategic-point assets builder for experiment C.
// Renders SVGs → PNGs under demo/assets/strategic/.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  strategicWatchtower, strategicTemple, strategicCamp,
  captureBarFrame, captureBarFillNeutral, captureBarFillTeam1, captureBarFillTeam2,
} from '../style_homm3_bright/build/svgs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

async function renderSvg(page, svg) {
  const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const el = await page.$('svg');
  return await el.screenshot({ omitBackground: true, type: 'png' });
}

async function emit(page, name, svg) {
  const buf = await renderSvg(page, svg);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`  ${name}: ${(buf.length / 1024).toFixed(1)} KB`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 400 } });

console.log('[strategic] rendering …');
await emit(page, 'watchtower.png',   strategicWatchtower());
await emit(page, 'temple.png',       strategicTemple());
await emit(page, 'camp.png',         strategicCamp());
await emit(page, 'capture_bar.png',  captureBarFrame());
await emit(page, 'capture_fill_neutral.png', captureBarFillNeutral());
await emit(page, 'capture_fill_team1.png',   captureBarFillTeam1());
await emit(page, 'capture_fill_team2.png',   captureBarFillTeam2());

// 9-slice the capture bar frame (cornerSize=8, the gold corners).
{
  const full = await renderSvg(page, captureBarFrame());
  const dataURL = 'data:image/png;base64,' + full.toString('base64');
  await page.setContent(`<!doctype html><html><body><canvas id="c" width="192" height="32"></canvas></body></html>`);
  const slices = await page.evaluate(async (url) => {
    const img = new Image(); img.src = url;
    await new Promise(r => img.onload = r);
    const ctx = document.getElementById('c').getContext('2d');
    const cs = 8;
    const fullW = 192, fullH = 32;
    const rects = [
      [0,0,cs,cs],           [cs,0,fullW-cs*2,cs],           [fullW-cs,0,cs,cs],
      [0,cs,cs,fullH-cs*2],  [cs,cs,fullW-cs*2,fullH-cs*2],  [fullW-cs,cs,cs,fullH-cs*2],
      [0,fullH-cs,cs,cs],    [cs,fullH-cs,fullW-cs*2,cs],    [fullW-cs,fullH-cs,cs,cs],
    ];
    const names = ['tl','t','tr','l','c','r','bl','b','br'];
    const out = {};
    const cvs = document.getElementById('c');
    for (let i = 0; i < 9; i++) {
      const [x,y,w,h] = rects[i];
      cvs.width = w; cvs.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      out[names[i]] = cvs.toDataURL('image/png');
    }
    return out;
  }, dataURL);
  fs.mkdirSync(path.join(OUT, 'capture_bar9'), { recursive: true });
  for (const [k, v] of Object.entries(slices)) {
    const b64 = v.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(OUT, 'capture_bar9', `${k}.png`), Buffer.from(b64, 'base64'));
  }
}

// Metadata JSON so Developer can look up anchor, collider, capture-glow offsets.
const meta = {
  style: 'homm3_bright',
  points: {
    watchtower: {
      file: 'watchtower.png', w: 64, h: 128,
      anchor: { x: 32, y: 124 },
      collider: { x: 14, y: 88, w: 36, h: 36 },
      captureGlow: { cx: 32, cy: 122, rx: 26, ry: 6 },
      tagline: 'vision radius +120%, enemy silhouettes through decor',
      recommendedBuff: 'vision',
    },
    temple: {
      file: 'temple.png', w: 64, h: 128,
      anchor: { x: 32, y: 124 },
      collider: { x: 8, y: 100, w: 48, h: 22 },
      captureGlow: { cx: 32, cy: 122, rx: 28, ry: 6.5 },
      tagline: 'steady +2 hp/s regen while within radius',
      recommendedBuff: 'regen',
    },
    camp: {
      file: 'camp.png', w: 64, h: 128,
      anchor: { x: 32, y: 124 },
      collider: { x: 6, y: 88, w: 52, h: 34 },
      captureGlow: { cx: 32, cy: 122, rx: 30, ry: 7 },
      tagline: 'enemies within 600px pinged on minimap for 30s',
      recommendedBuff: 'radar',
    },
  },
  captureBar: {
    frame: { file: 'capture_bar.png', w: 192, h: 32 },
    nineSlice: { dir: 'capture_bar9/', cornerSize: 8 },
    fillTextures: {
      neutral: 'capture_fill_neutral.png',
      team1:   'capture_fill_team1.png',
      team2:   'capture_fill_team2.png',
    },
    fillInset: { x: 6, y: 6, w: 180, h: 16 },
    usage: 'Tile fill texture horizontally inside fillInset at current progress percentage.',
  },
};
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(meta, null, 2));
console.log('  index.json');

await browser.close();
console.log('[strategic] done');
