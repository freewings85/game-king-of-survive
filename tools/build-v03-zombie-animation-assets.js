const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'frontend/engine-demo/assets/zombies');
const variants = ['brute', 'crawler', 'hooded'];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 560 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><canvas id="c" width="420" height="560"></canvas>');

  for (const variant of variants) {
    const sourcePath = path.join(outDir, `zombie-card-${variant}.png`);
    const sourceDataUrl = `data:image/png;base64,${fs.readFileSync(sourcePath).toString('base64')}`;
    const dataUrl = await page.evaluate(async ({ sourceDataUrl, variant }) => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = sourceDataUrl;
      });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(variant === 'crawler' ? -12 : 10, variant === 'brute' ? 8 : 0);
      ctx.rotate(variant === 'hooded' ? -0.035 : 0.035);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.globalCompositeOperation = 'screen';
      const flash = ctx.createRadialGradient(220, 250, 12, 220, 250, 125);
      flash.addColorStop(0, 'rgba(255,232,156,0.82)');
      flash.addColorStop(0.28, 'rgba(255,86,54,0.42)');
      flash.addColorStop(1, 'rgba(255,86,54,0)');
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255,232,156,0.86)';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(88, 210);
      ctx.lineTo(335, 165);
      ctx.moveTo(105, 286);
      ctx.lineTo(318, 248);
      ctx.stroke();

      return canvas.toDataURL('image/png');
    }, { sourceDataUrl, variant });
    fs.writeFileSync(
      path.join(outDir, `zombie-card-${variant}-hit.png`),
      Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')
    );
  }
  await browser.close();
  console.log('Built 3 V03 zombie hit-frame assets.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
