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

async function drawUnit(ctx, spec, skin, skinIndex, portraitDataUrl, frame) {
  const w = 449;
  const h = 620;
  ctx.clearRect(0, 0, w, h);

  const portrait = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = portraitDataUrl;
  });

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.45, 12, w * 0.5, h * 0.53, w * 0.49);
  glow.addColorStop(0, `${spec.accent}52`);
  glow.addColorStop(0.42, `${skin}5c`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(w * 0.50, h * 0.89, w * 0.28, h * 0.045, -0.03, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.98;
  const portraitScale = spec.gear === 'shield' ? 0.70 : 0.73;
  const drawW = portrait.width * portraitScale;
  const drawH = portrait.height * portraitScale;
  const attackOffset = frame === 'attack' ? 12 : 0;
  const drawX = (w - drawW) / 2 + (spec.gear === 'shield' ? -18 : spec.gear === 'rifle' ? 12 : 0) + attackOffset;
  const drawY = 30 + skinIndex * 2 - (frame === 'attack' ? 6 : 0);
  ctx.shadowColor = `${spec.accent}55`;
  ctx.shadowBlur = 18;
  ctx.drawImage(portrait, drawX, drawY, drawW, drawH);
  ctx.restore();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(7,9,9,0.84)';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(w * 0.37 + attackOffset * 0.15, h * 0.62);
  ctx.lineTo(w * 0.30, h * 0.82);
  ctx.moveTo(w * 0.56 + attackOffset * 0.18, h * 0.62);
  ctx.lineTo(w * 0.68 + attackOffset * 0.08, h * 0.82);
  ctx.stroke();

  ctx.strokeStyle = `${spec.accent}dd`;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.37 + attackOffset * 0.15, h * 0.62);
  ctx.lineTo(w * 0.31, h * 0.79);
  ctx.moveTo(w * 0.56 + attackOffset * 0.18, h * 0.62);
  ctx.lineTo(w * 0.66 + attackOffset * 0.08, h * 0.79);
  ctx.stroke();

  if (spec.gear === 'shield') {
    ctx.fillStyle = 'rgba(40,51,50,0.88)';
    ctx.beginPath();
    ctx.moveTo(w * 0.11, h * 0.46);
    ctx.lineTo(w * 0.31, h * 0.52);
    ctx.lineTo(w * 0.28, h * 0.77);
    ctx.lineTo(w * 0.15, h * 0.87);
    ctx.lineTo(w * 0.04, h * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 8;
    ctx.stroke();
  } else if (spec.gear === 'coil') {
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w * 0.76, h * 0.30, 30 + skinIndex * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${spec.accent}80`;
    ctx.beginPath();
    ctx.arc(w * 0.76, h * 0.30, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#0b0d0d';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(w * 0.52 + attackOffset * 0.12, h * 0.50);
    ctx.lineTo(w * 0.94 + attackOffset * 0.10, h * 0.38);
    ctx.stroke();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.55 + attackOffset * 0.12, h * 0.51);
    ctx.lineTo(w * 0.91 + attackOffset * 0.10, h * 0.40);
    ctx.stroke();
  }

  if (frame === 'attack') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `${spec.accent}dd`;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h * 0.53);
    ctx.lineTo(w * 0.94, h * 0.43);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,239,166,0.90)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.73, h * 0.47);
    ctx.lineTo(w * 0.98, h * 0.41);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(3,5,4,0.54)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.27, h * 0.72);
  ctx.lineTo(w * 0.48, h * 0.86);
  ctx.lineTo(w * 0.70, h * 0.72);
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
      const portraitPath = path.join(repoRoot, 'frontend/engine-demo/assets/portraits', `class-skin-${classId}-${skinIndex}.png`);
      const portraitDataUrl = `data:image/png;base64,${fs.readFileSync(portraitPath).toString('base64')}`;
      const dataUrl = await page.evaluate(async ({ spec, skin, skinIndex, drawUnitSource, portraitDataUrl }) => {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        const renderUnit = new Function('ctx', 'spec', 'skin', 'skinIndex', 'portraitDataUrl', 'frame', `return (${drawUnitSource})(ctx, spec, skin, skinIndex, portraitDataUrl, frame);`);
        await renderUnit(ctx, spec, skin, skinIndex, portraitDataUrl, 'idle');
        return canvas.toDataURL('image/png');
      }, { spec, skin: spec.skins[skinIndex], skinIndex, drawUnitSource, portraitDataUrl });
      const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(outDir, `hero-${classId}-${skinIndex}-isometric.png`), buffer);
      const attackDataUrl = await page.evaluate(async ({ spec, skin, skinIndex, drawUnitSource, portraitDataUrl }) => {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        const renderUnit = new Function('ctx', 'spec', 'skin', 'skinIndex', 'portraitDataUrl', 'frame', `return (${drawUnitSource})(ctx, spec, skin, skinIndex, portraitDataUrl, frame);`);
        await renderUnit(ctx, spec, skin, skinIndex, portraitDataUrl, 'attack');
        return canvas.toDataURL('image/png');
      }, { spec, skin: spec.skins[skinIndex], skinIndex, drawUnitSource, portraitDataUrl });
      const attackBuffer = Buffer.from(attackDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      fs.writeFileSync(path.join(outDir, `hero-${classId}-${skinIndex}-attack-isometric.png`), attackBuffer);
    }
  }
  await browser.close();
  console.log('Built 18 V03 isometric unit animation assets.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
