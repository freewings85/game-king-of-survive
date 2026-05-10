const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'frontend/engine-demo/assets/units');

const classes = {
  guardian: {
    accent: '#ff8b3d',
    skins: ['#3b2d28', '#4a3a32', '#2f3130'],
    hood: '#211a17',
    gear: 'shield'
  },
  tech: {
    accent: '#4ec9ff',
    skins: ['#193743', '#223f46', '#2f3f4a'],
    hood: '#111b20',
    gear: 'coil'
  },
  ranger: {
    accent: '#7cff4f',
    skins: ['#253820', '#314127', '#283746'],
    hood: '#182318',
    gear: 'rifle'
  }
};

function drawUnit(ctx, spec, skin, skinIndex) {
  const w = 449;
  const h = 620;
  ctx.clearRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.48, 12, w * 0.5, h * 0.54, w * 0.48);
  glow.addColorStop(0, `${spec.accent}52`);
  glow.addColorStop(0.42, `${skin}5c`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(w * 0.50, h * 0.89, w * 0.28, h * 0.045, -0.03, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#070909';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(w * 0.33, h * 0.55);
  ctx.lineTo(w * 0.25, h * 0.78);
  ctx.moveTo(w * 0.56, h * 0.55);
  ctx.lineTo(w * 0.72, h * 0.78);
  ctx.stroke();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.33);
  ctx.lineTo(w * 0.61, h * 0.29);
  ctx.lineTo(w * 0.68, h * 0.65);
  ctx.lineTo(w * 0.44, h * 0.79);
  ctx.lineTo(w * 0.24, h * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = spec.hood;
  ctx.beginPath();
  ctx.moveTo(w * 0.37, h * 0.20);
  ctx.lineTo(w * 0.51, h * 0.09);
  ctx.lineTo(w * 0.68, h * 0.23);
  ctx.lineTo(w * 0.63, h * 0.37);
  ctx.lineTo(w * 0.41, h * 0.37);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d4a065';
  ctx.beginPath();
  ctx.ellipse(w * 0.52, h * 0.29, w * 0.075, h * 0.060, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = spec.accent;
  ctx.lineWidth = 12;
  ctx.globalAlpha = 0.86;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.42);
  ctx.lineTo(w * 0.61, h * 0.37);
  ctx.moveTo(w * 0.38, h * 0.50);
  ctx.lineTo(w * 0.62, h * 0.58);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#0b0d0d';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.44);
  ctx.lineTo(w * 0.16, h * 0.62);
  ctx.moveTo(w * 0.63, h * 0.43);
  ctx.lineTo(w * 0.82, h * 0.54);
  ctx.stroke();

  ctx.strokeStyle = '#d8a36c';
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.62);
  ctx.lineTo(w * 0.14, h * 0.69);
  ctx.moveTo(w * 0.82, h * 0.54);
  ctx.lineTo(w * 0.88, h * 0.50);
  ctx.stroke();

  if (spec.gear === 'shield') {
    ctx.fillStyle = '#283332';
    ctx.beginPath();
    ctx.moveTo(w * 0.13, h * 0.42);
    ctx.lineTo(w * 0.30, h * 0.48);
    ctx.lineTo(w * 0.27, h * 0.72);
    ctx.lineTo(w * 0.15, h * 0.82);
    ctx.lineTo(w * 0.05, h * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 8;
    ctx.stroke();
  } else if (spec.gear === 'coil') {
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(w * 0.29, h * 0.43, 38 + skinIndex * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${spec.accent}80`;
    ctx.beginPath();
    ctx.arc(w * 0.29, h * 0.43, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#0b0d0d';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h * 0.46);
    ctx.lineTo(w * 0.96, h * 0.31);
    ctx.stroke();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w * 0.58, h * 0.47);
    ctx.lineTo(w * 0.93, h * 0.34);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,231,166,0.78)';
  ctx.beginPath();
  ctx.ellipse(w * 0.50, h * 0.24, w * 0.035, h * 0.011, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,220,150,0.70)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.35);
  ctx.lineTo(w * 0.61, h * 0.30);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(3,5,4,0.54)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.30, h * 0.63);
  ctx.lineTo(w * 0.48, h * 0.77);
  ctx.lineTo(w * 0.67, h * 0.63);
  ctx.stroke();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 449, height: 620 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><canvas id="c" width="449" height="620"></canvas>');
  for (const [classId, spec] of Object.entries(classes)) {
    for (let skinIndex = 0; skinIndex < spec.skins.length; skinIndex += 1) {
      const drawUnitSource = drawUnit.toString();
      const dataUrl = await page.evaluate(({ spec, skin, skinIndex, drawUnitSource }) => {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        const renderUnit = new Function('ctx', 'spec', 'skin', 'skinIndex', `(${drawUnitSource})(ctx, spec, skin, skinIndex);`);
        renderUnit(ctx, spec, skin, skinIndex);
        return canvas.toDataURL('image/png');
      }, { spec, skin: spec.skins[skinIndex], skinIndex, drawUnitSource });
      const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(outDir, `hero-${classId}-${skinIndex}-isometric.png`), buffer);
    }
  }
  await browser.close();
  console.log('Built 9 V03 isometric unit assets.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
