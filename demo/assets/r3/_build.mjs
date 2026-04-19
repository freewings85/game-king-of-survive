// Round 3 asset builder (H: rival/nemesis, I: synergy auras, K: kill juice).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  rivalBadge, nemesisBadge, rivalPulseRing, nemesisPulseRing,
  synergyAuraFire, synergyAuraFrost, synergyAuraLightning, synergyAuraVenom, synergyAuraHoly,
  killShatter, comboFrame, rivalSlainBanner, nemesisSlainBanner, bossSlainBanner,
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

console.log('[r3] rendering rival/nemesis …');
await emit(page, 'rival_badge.png',         rivalBadge());
await emit(page, 'nemesis_badge.png',       nemesisBadge());
await emit(page, 'rival_pulse_ring.png',    rivalPulseRing());
await emit(page, 'nemesis_pulse_ring.png',  nemesisPulseRing());

console.log('[r3] rendering synergy auras …');
await emit(page, 'synergy_aura_fire.png',      synergyAuraFire());
await emit(page, 'synergy_aura_frost.png',     synergyAuraFrost());
await emit(page, 'synergy_aura_lightning.png', synergyAuraLightning());
await emit(page, 'synergy_aura_venom.png',     synergyAuraVenom());
await emit(page, 'synergy_aura_holy.png',      synergyAuraHoly());

console.log('[r3] rendering kill juice …');
await emit(page, 'kill_shatter.png',     killShatter());
await emit(page, 'combo_frame.png',      comboFrame());
await emit(page, 'rival_slain_banner.png',   rivalSlainBanner());
await emit(page, 'nemesis_slain_banner.png', nemesisSlainBanner());
await emit(page, 'boss_slain_banner.png',    bossSlainBanner());

const meta = {
  style: 'homm3_bright',
  round: 3,
  rival: {
    badge: {
      file: 'rival_badge.png', w: 24, h: 24,
      usage: 'Float at bot.center.y − 44px (above archetype icon). Keep 1Hz alpha pulse 0.6 → 1.0 for menace.',
    },
    pulseRing: {
      file: 'rival_pulse_ring.png', w: 80, h: 80,
      usage: 'Draw centered on rival bot at its ground position. Scale 1.0 → 1.15 at 1Hz with alpha 0.55 → 0.85 to pulse.',
      anchor: { x: 40, y: 40 },
    },
    minimapDot: { color: '#ff4040', blinkHz: 2 },
    banner: { file: 'rival_slain_banner.png', w: 512, h: 96 },
  },
  nemesis: {
    badge: {
      file: 'nemesis_badge.png', w: 24, h: 24,
      usage: 'Replace rival badge once promoted. Pair with purple ring + "NEMESIS" text.',
    },
    pulseRing: {
      file: 'nemesis_pulse_ring.png', w: 80, h: 80,
      usage: 'Draw centered on nemesis bot. Pulse slightly slower (0.8Hz) and larger scale (1.0 → 1.2) — feels heavier.',
      anchor: { x: 40, y: 40 },
    },
    minimapDot: { color: '#c490e8', blinkHz: 2 },
    banner: { file: 'nemesis_slain_banner.png', w: 512, h: 96 },
  },
  synergyAuras: {
    size: { w: 80, h: 80 },
    anchor: { x: 40, y: 40 },
    usage: 'Blit centered on player sprite when any synergy is active. Additive blend or normal at alpha 0.75. Rotate slowly (6s/rev) for ambient motion.',
    variants: {
      fire:      { file: 'synergy_aura_fire.png',      keywords: ['fire','burn','explosive','ignite'] },
      frost:     { file: 'synergy_aura_frost.png',     keywords: ['frost','ice','chill','freeze'] },
      lightning: { file: 'synergy_aura_lightning.png', keywords: ['lightning','shock','chain','storm'] },
      venom:     { file: 'synergy_aura_venom.png',     keywords: ['poison','venom','dot','bleed'] },
      holy:      { file: 'synergy_aura_holy.png',      keywords: ['holy','heal','regen','divine','buff'] },
    },
  },
  killJuice: {
    shatter: {
      file: 'kill_shatter.png', w: 64, h: 64,
      usage: 'Spawn on victim position at kill event. Scale 0.6 → 1.6 over 280ms with alpha 1 → 0. Rotate ±45° random.',
      anchor: { x: 32, y: 32 },
    },
    comboFrame: {
      file: 'combo_frame.png', w: 120, h: 40,
      usage: 'Top-left HUD (x=12, y=56). Developer draws the live ×N number overlay inside the ×N slot region at x=74, y=28.',
      numberOverlay: { x: 66, y: 8, w: 48, h: 24, fontPx: 22, color: '#fff6a8' },
    },
    bossBanner:    { file: 'boss_slain_banner.png',    w: 512, h: 96 },
    rivalBanner:   { file: 'rival_slain_banner.png',   w: 512, h: 96 },
    nemesisBanner: { file: 'nemesis_slain_banner.png', w: 512, h: 96 },
    bannerUsage: 'Center horizontally, y=120. 800ms flow: scale 0.6 → 1.0 (ease-out 140ms), hold 520ms, fade-out 140ms.',
  },
};
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(meta, null, 2));
console.log('  index.json');

await browser.close();
console.log('[r3] done');
