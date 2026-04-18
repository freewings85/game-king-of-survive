// BR UI elements: storm warning bar, rank crowns, killfeed card.
// Renders SVGs via playwright to PNG (reuses homm3_bright style).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

// ── SVG sources ──────────────────────────────────────────────
function stormBar() {
  // 512×48 horizontal bar, red pulsing gradient, skull + chevron arrows
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 48" width="512" height="48">
    <defs>
      <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#5a0a0a" stop-opacity="0"/>
        <stop offset="15%"  stop-color="#c41a1a" stop-opacity="0.8"/>
        <stop offset="50%"  stop-color="#ff3a3a" stop-opacity="1"/>
        <stop offset="85%"  stop-color="#c41a1a" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#5a0a0a" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#ff6a6a" stop-opacity="0.9"/>
        <stop offset="50%"  stop-color="#c41a1a" stop-opacity="1"/>
        <stop offset="100%" stop-color="#5a0a0a" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect width="512" height="48" fill="#1a0404"/>
    <rect width="512" height="48" fill="url(#sg)"/>
    <rect x="0" y="0" width="512" height="6" fill="url(#sg2)"/>
    <rect x="0" y="42" width="512" height="6" fill="url(#sg2)"/>
    <g fill="#fff6a8" opacity="0.9">
      <polygon points="36,24 48,14 48,34"/>
      <polygon points="60,24 72,14 72,34"/>
      <polygon points="464,24 452,14 452,34"/>
      <polygon points="488,24 476,14 476,34"/>
    </g>
    <g transform="translate(256,24)">
      <ellipse cx="0" cy="-2" rx="14" ry="13" fill="#f0ecdc" stroke="#2a0404" stroke-width="1.5"/>
      <ellipse cx="-5" cy="-3" rx="3" ry="4" fill="#1a1a1a"/>
      <ellipse cx="5" cy="-3" rx="3" ry="4" fill="#1a1a1a"/>
      <polygon points="0,2 -3,7 3,7" fill="#1a1a1a"/>
      <rect x="-6" y="9" width="2" height="3" fill="#1a1a1a"/>
      <rect x="-2" y="9" width="2" height="3" fill="#1a1a1a"/>
      <rect x="2" y="9" width="2" height="3" fill="#1a1a1a"/>
    </g>
    <text x="100" y="30" font-family="serif" font-size="16" fill="#fff6a8" font-weight="bold">STORM CLOSING</text>
    <text x="380" y="30" font-family="serif" font-size="16" fill="#fff6a8" font-weight="bold">STORM CLOSING</text>
  </svg>`;
}

function crown(tier) {
  // 64×64. tier: 'gold' | 'silver' | 'bronze'
  const palettes = {
    gold:   { a: '#fff6a8', b: '#f4d42a', c: '#8a5a0a', gem: '#c41a1a', label: '1' },
    silver: { a: '#f0f4f8', b: '#b8bcc4', c: '#4a4e54', gem: '#2a5ac8', label: '2' },
    bronze: { a: '#f4c48a', b: '#c48844', c: '#5a3414', gem: '#2a8a2a', label: '3' },
  };
  const p = palettes[tier];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs>
      <linearGradient id="cg_${tier}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.a}"/>
        <stop offset="50%" stop-color="${p.b}"/>
        <stop offset="100%" stop-color="${p.c}"/>
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="54" rx="18" ry="3" fill="#000" opacity="0.35"/>
    <path d="M12 44 L52 44 L50 32 L42 38 L36 20 L32 34 L28 20 L22 38 L14 32 Z" fill="url(#cg_${tier})" stroke="${p.c}" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="12" y="44" width="40" height="6" fill="${p.b}" stroke="${p.c}" stroke-width="1.2"/>
    <circle cx="32" cy="28" r="3.5" fill="${p.gem}" stroke="${p.c}" stroke-width="1"/>
    <circle cx="22" cy="38" r="2" fill="${p.gem}" stroke="${p.c}" stroke-width="0.8"/>
    <circle cx="42" cy="38" r="2" fill="${p.gem}" stroke="${p.c}" stroke-width="0.8"/>
    <circle cx="32" cy="47" r="1.5" fill="${p.gem}"/>
    <text x="32" y="60" text-anchor="middle" font-family="serif" font-size="10" fill="${p.c}" font-weight="bold">#${p.label}</text>
  </svg>`;
}

function killfeedCard() {
  // 192×64 semi-transparent dark card, subtle gold trim.
  // Will be used as 9-slice source; corner size = 16.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 64" width="192" height="64">
    <defs>
      <linearGradient id="kcBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#1a1a22" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#05060a" stop-opacity="0.92"/>
      </linearGradient>
      <linearGradient id="kcGold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"  stop-color="#8a5a0a"/>
        <stop offset="50%" stop-color="#f4d42a"/>
        <stop offset="100%" stop-color="#8a5a0a"/>
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="184" height="56" rx="8" fill="url(#kcBg)" stroke="url(#kcGold)" stroke-width="1.5"/>
    <rect x="8" y="8" width="176" height="48" rx="6" fill="none" stroke="#3a2e12" stroke-width="0.8" stroke-dasharray="2 3"/>
    <circle cx="20" cy="32" r="10" fill="none" stroke="#f4d42a" stroke-width="1" opacity="0.6"/>
    <!-- skull mini -->
    <g transform="translate(20,32)">
      <ellipse cx="0" cy="-1" rx="6" ry="5.5" fill="#d4c8a8" stroke="#1a1a1a" stroke-width="0.8"/>
      <ellipse cx="-2.2" cy="-1" rx="1.2" ry="1.5" fill="#1a1a1a"/>
      <ellipse cx="2.2" cy="-1" rx="1.2" ry="1.5" fill="#1a1a1a"/>
      <polygon points="0,1.5 -1.3,3.5 1.3,3.5" fill="#1a1a1a"/>
    </g>
    <text x="38" y="29" font-family="monospace" font-size="12" fill="#fff6a8">&lt;killer&gt;</text>
    <line x1="38" y1="34" x2="154" y2="34" stroke="#f4d42a" stroke-width="0.6" opacity="0.5"/>
    <text x="38" y="48" font-family="monospace" font-size="11" fill="#e8c89a">killed &lt;victim&gt;</text>
  </svg>`;
}

// ── Render to PNG ────────────────────────────────────────────
async function renderSvg(page, svg, w, h) {
  const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const el = await page.$('svg');
  return await el.screenshot({ omitBackground: true, type: 'png' });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 512 } });

async function emit(name, svg, w, h) {
  const buf = await renderSvg(page, svg, w, h);
  const p = path.join(OUT, name);
  fs.writeFileSync(p, buf);
  console.log(`  ${name}: ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('[ui_br] rendering …');
await emit('storm_bar.png',       stormBar(),      512, 48);
await emit('crown_gold.png',      crown('gold'),   64, 64);
await emit('crown_silver.png',    crown('silver'), 64, 64);
await emit('crown_bronze.png',    crown('bronze'), 64, 64);
await emit('killfeed_card.png',   killfeedCard(),  192, 64);

// killfeed 9-slice: slice 192×64 into 3×3 with cornerSize=16
// slices: tl/t/tr/l/c/r/bl/b/br
{
  const full = await renderSvg(page, killfeedCard(), 192, 64);
  const dataURL = 'data:image/png;base64,' + full.toString('base64');
  await page.setContent(`<!doctype html><html><body><canvas id="c" width="192" height="64"></canvas></body></html>`);
  const slices = await page.evaluate(async (url) => {
    const img = new Image(); img.src = url;
    await new Promise(r => img.onload = r);
    const ctx = document.getElementById('c').getContext('2d');
    const names = ['tl','t','tr','l','c','r','bl','b','br'];
    const cs = 16;       // corner size
    const fullW = 192, fullH = 64;
    const midW = fullW - cs * 2, midH = fullH - cs * 2;
    const rects = [
      [0,0,cs,cs],        [cs,0,midW,cs],        [fullW-cs,0,cs,cs],
      [0,cs,cs,midH],     [cs,cs,midW,midH],     [fullW-cs,cs,cs,midH],
      [0,fullH-cs,cs,cs], [cs,fullH-cs,midW,cs], [fullW-cs,fullH-cs,cs,cs],
    ];
    const out = {};
    const cvs = document.getElementById('c');
    for (let i = 0; i < 9; i++) {
      const [x,y,w,h] = rects[i];
      cvs.width = w; cvs.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      out[names[i]] = { data: cvs.toDataURL('image/png'), w, h };
    }
    return out;
  }, dataURL);
  fs.mkdirSync(path.join(OUT, 'killfeed9'), { recursive: true });
  for (const [k, v] of Object.entries(slices)) {
    const b64 = v.data.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(OUT, 'killfeed9', `${k}.png`), Buffer.from(b64, 'base64'));
  }
  fs.writeFileSync(path.join(OUT, 'killfeed9', 'meta.json'), JSON.stringify({
    slices: ['tl','t','tr','l','c','r','bl','b','br'],
    cornerSize: 16,
    fullW: 192, fullH: 64,
    usage: '9-slice. Corners fixed 16px, edges stretch (t/b horizontally, l/r vertically), c fills.',
    style: 'homm3_bright',
  }, null, 2));
  console.log('  killfeed9/*.png + meta.json');
}

await browser.close();
console.log('[ui_br] done');
