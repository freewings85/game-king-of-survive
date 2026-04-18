// Archetype head icons (experiment A UX patch).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  archetypeAssassin, archetypeBruiser, archetypeGlasscannon,
  archetypeTank, archetypeSpeedster, archetypeSharpshooter, archetypeDuelist,
} from '../style_homm3_bright/build/svgs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

async function renderSvg(page, svg) {
  const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const el = await page.$('svg');
  return await el.screenshot({ omitBackground: true, type: 'png' });
}

const jobs = [
  { id: 'assassin',     fn: archetypeAssassin,     label: '刺客',   color: '#6a2e9a' },
  { id: 'bruiser',      fn: archetypeBruiser,      label: '重装',   color: '#c87030' },
  { id: 'glasscannon',  fn: archetypeGlasscannon,  label: '炮手',   color: '#c42020' },
  { id: 'tank',         fn: archetypeTank,         label: '坦克',   color: '#4a6a8a' },
  { id: 'speedster',    fn: archetypeSpeedster,    label: '疾风',   color: '#2a9aca' },
  { id: 'sharpshooter', fn: archetypeSharpshooter, label: '神射',   color: '#3a8a28' },
  { id: 'duelist',      fn: archetypeDuelist,      label: '决斗者', color: '#c89a28' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });

console.log('[archetype] rendering …');
for (const j of jobs) {
  const buf = await renderSvg(page, j.fn());
  fs.writeFileSync(path.join(OUT, `${j.id}.png`), buf);
  console.log(`  ${j.id}.png: ${(buf.length / 1024).toFixed(1)} KB`);
}

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({
  style: 'homm3_bright',
  size: { w: 24, h: 24 },
  usage: 'Float above bot head (offset y=-36px from bot center). ' +
         'Draw at native 24px on mobile, or scale 1.5x (36px) on tablet. ' +
         'Replaces or complements "[刺客]" text label.',
  archetypes: jobs.map(j => ({
    id: j.id, label: j.label, color: j.color, file: `${j.id}.png`,
  })),
}, null, 2));
console.log('  index.json');

await browser.close();
console.log('[archetype] done');
