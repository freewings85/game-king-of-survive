import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;

const html = `<!doctype html><html><head><style>
body{margin:0;background:#181c22;color:#eee;font-family:sans-serif;padding:16px}
h2{color:#ffd87a;margin:18px 0 8px;font-size:14px}
p{color:#aaa;font-size:12px;margin:4px 0 8px;line-height:1.5;max-width:800px}
.row{display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap;margin-bottom:8px}
.cell{background:#23272f;border:1px solid #333;padding:10px;text-align:center;border-radius:4px}
.cap{font-size:10px;color:#ddd;margin-top:6px;font-family:monospace;line-height:1.3}

/* Mock stage — a bot with rival/nemesis ring + badge above nameplate */
.stage{background:linear-gradient(#4a8a22,#3a6e18);padding:32px;border-radius:6px;display:inline-block}
.bot{position:relative;display:inline-block;width:140px;height:140px;margin:0 20px;vertical-align:top}
.ring{position:absolute;left:30px;top:30px;width:80px;height:80px}
.badge{position:absolute;left:58px;top:-4px;width:24px;height:24px;z-index:3}
.arche{position:absolute;left:58px;top:22px;width:24px;height:24px;z-index:3}
.name{position:absolute;left:0;right:0;top:50px;text-align:center;font-size:11px;color:#fff;text-shadow:0 0 3px #000;font-weight:bold}
.body{position:absolute;left:56px;top:72px;width:28px;height:28px;border-radius:50%;background:#8a5a20;border:2px solid #1a1a22}

/* Synergy aura stage */
.auraSt{background:linear-gradient(#3a6018,#1a3008);padding:16px;border-radius:6px;display:flex;gap:18px;flex-wrap:wrap}
.auraCell{position:relative;width:100px;height:100px;text-align:center}
.auraCell .aimg{position:absolute;left:10px;top:10px;width:80px;height:80px}
.auraCell .player{position:absolute;left:36px;top:36px;width:28px;height:28px;border-radius:50%;background:#c8a868;border:2px solid #1a1a22;z-index:2}
.auraCell .lbl{position:absolute;bottom:-14px;left:0;right:0;font-size:10px;color:#ddd;font-family:monospace}

/* Combo frame mock — with live number burned in */
.comboWrap{position:relative;display:inline-block}
.comboWrap img{display:block}
.comboNum{position:absolute;right:10px;top:4px;width:48px;height:32px;display:flex;align-items:center;justify-content:center;font-family:Georgia, serif;font-weight:bold;font-size:22px;color:#fff6a8;text-shadow:0 0 4px #000}

/* Shatter scale preview */
.shatScale{display:flex;gap:24px;align-items:center;background:#23272f;padding:16px;border-radius:4px}

/* Banner row */
.banner{display:block;margin:8px 0}
</style></head><body>

<h2>Experiment H — Rival &amp; Nemesis</h2>
<p>Pulse ring + badge sit above the bot. Badge replaces/stacks with archetype icon. Developer pulses ring alpha 0.55 → 0.85 at 1Hz.</p>
<div class="stage">
  <div class="bot">
    <img class="ring" src="rival_pulse_ring.png">
    <img class="badge" src="rival_badge.png">
    <div class="name" style="color:#ff8080">RIVAL · 刺客</div>
    <div class="body"></div>
  </div>
  <div class="bot">
    <img class="ring" src="nemesis_pulse_ring.png">
    <img class="badge" src="nemesis_badge.png">
    <div class="name" style="color:#d8a8ff">NEMESIS · 重装</div>
    <div class="body"></div>
  </div>
</div>

<h2>Experiment H — Badges at native 24px</h2>
<div class="row">
  <div class="cell"><img src="rival_badge.png"><div class="cap">rival_badge<br>24×24 1Hz pulse</div></div>
  <div class="cell"><img src="nemesis_badge.png"><div class="cap">nemesis_badge<br>24×24 0.8Hz pulse</div></div>
  <div class="cell"><img src="rival_pulse_ring.png"><div class="cap">rival ring 80×80</div></div>
  <div class="cell"><img src="nemesis_pulse_ring.png"><div class="cap">nemesis ring 80×80</div></div>
</div>

<h2>Experiment I — Synergy auras (80×80, anchor=center, alpha ~0.75)</h2>
<p>Draw centered on player sprite while a synergy is active. Each synergy category has its own tint so players can read "what's charged" at a glance even from across the map.</p>
<div class="auraSt">
  <div class="auraCell"><img class="aimg" src="synergy_aura_fire.png"><div class="player"></div><div class="lbl">fire · 红橙</div></div>
  <div class="auraCell"><img class="aimg" src="synergy_aura_frost.png"><div class="player"></div><div class="lbl">frost · 冰白</div></div>
  <div class="auraCell"><img class="aimg" src="synergy_aura_lightning.png"><div class="player"></div><div class="lbl">lightning · 电蓝</div></div>
  <div class="auraCell"><img class="aimg" src="synergy_aura_venom.png"><div class="player"></div><div class="lbl">venom · 毒紫绿</div></div>
  <div class="auraCell"><img class="aimg" src="synergy_aura_holy.png"><div class="player"></div><div class="lbl">holy · 圣金</div></div>
</div>

<h2>Experiment K — Combo counter (top-left HUD, 120×40)</h2>
<p>Static frame; Developer draws live ×N number into the right slot. Preview below shows ×7 overlay.</p>
<div class="row">
  <div class="cell">
    <div class="comboWrap">
      <img src="combo_frame.png">
      <div class="comboNum">×7</div>
    </div>
    <div class="cap">COMBO ×7 (live)</div>
  </div>
  <div class="cell"><img src="combo_frame.png"><div class="cap">frame alone (×N slot placeholder)</div></div>
</div>

<h2>Experiment K — Kill shatter burst (64×64, scale 0.6→1.6 over 280ms)</h2>
<div class="shatScale">
  <div class="cell" style="background:#3a2410"><img src="kill_shatter.png" style="width:38px;height:38px"><div class="cap">0.6× (spawn)</div></div>
  <div class="cell" style="background:#3a2410"><img src="kill_shatter.png"><div class="cap">1.0× (mid)</div></div>
  <div class="cell" style="background:#3a2410"><img src="kill_shatter.png" style="width:102px;height:102px;opacity:0.4"><div class="cap">1.6× (fade)</div></div>
</div>

<h2>Experiment K — Kill banners (512×96, center x, y=120)</h2>
<img class="banner" src="rival_slain_banner.png">
<img class="banner" src="nemesis_slain_banner.png">
<img class="banner" src="boss_slain_banner.png">

<h2>Usage summary</h2>
<p>
Rival badge: float at bot.center.y − 44px, above archetype icon. Pulse 1Hz alpha 0.6→1.0.<br>
Rival ring: draw centered at bot ground position. Scale 1.0→1.15, alpha 0.55→0.85 at 1Hz.<br>
Nemesis ring: slower 0.8Hz, larger 1.0→1.2 — feels heavier on promotion.<br>
Synergy aura: blit centered on player, alpha 0.75, rotate 6s/rev. Pick variant by synergy keyword.<br>
Combo frame: fixed HUD at (12,56). Developer draws live ×N. Hide when COMBO &lt; 2.<br>
Kill shatter: spawn at victim, 280ms expand + fade; rotate ±45° random.<br>
Kill banner: center x, y=120; scale 0.6→1.0 140ms, hold 520ms, fade 140ms.
</p>

</body></html>`;

const p = path.join(OUT, '_qa.html');
fs.writeFileSync(p, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 1800 } });
await page.goto('file://' + p, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '_qa.png'), fullPage: true });
console.log('qa:', path.join(OUT, '_qa.png'));
await browser.close();
