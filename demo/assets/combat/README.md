# Combat FX Pack — Round 5 BotAI 地图交互视觉配合

**风格：** HoMM3 饱和卡通 + 战斗加强对比
**用途：** 让 bot 在地图上的行为有视觉反馈 — capture/rival/nemesis 一眼识别

## 文件

| File | Size | Purpose |
|------|------|---------|
| `capture_bar.svg` | 144×96 | 据点进度条 4 态（蓝=我方 / 红=敌方 / 金=无主 / 脉冲=争夺）|
| `rival_trail.svg` | 128×32 | Rival 追踪红色拖尾粒子 4 帧 |
| `nemesis_aura.svg` | 160×160 | Nemesis 燃烧光环（12 火舌 + 脉动红晕 + 骷髅警示，内建 SVG animate）|
| `state_floats.svg` | 192×192 | 状态浮字 6 条（CAPTURING / CAPTURED / HATRED+1 / RAGE / NEMESIS / RIVALRY ENDED）|
| `combat_fx.json` | — | 全部元数据 + 动画参数 + 使用建议 |

## 快速接入指引（Developer）

### 1. Capture 进度条

```js
const cfx = await fetch('assets/combat/combat_fx.json').then(r=>r.json());
const barImg = new Image(); barImg.src = 'assets/combat/capture_bar.svg';

// 选 row 按 faction
function drawCaptureBar(point, ctx) {
  const row = point.contested ? 3
            : point.owner === 'player' ? 0
            : point.owner === 'enemy'  ? 1 : 2;
  const srcY = 4 + row * 24;  // rowOffsetY=24, padding=8/2=4
  // 底层 bar
  ctx.drawImage(barImg, 8, srcY, 128, 16, point.x - 64, point.y - 40, 128, 16);
  // 上面按进度叠加自绘 fill（颜色取 cfx.captureBar.rows[row].color）
  const cfg = cfx.captureBar.rows[row];
  ctx.fillStyle = cfg.color;
  ctx.fillRect(point.x - 62, point.y - 38, 124 * point.progress, 12);
}
```

### 2. Rival 拖尾

```js
// 每 50ms 在 rival 脚下 push 1 颗粒子
if (bot.isRival && now - bot._lastTrail > 50) {
  particles.push({ x: bot.x, y: bot.y, born: now });
  bot._lastTrail = now;
}
// 渲染
for (const p of particles) {
  const age = now - p.born;
  if (age > 480) continue;
  const frameIdx = Math.min(3, Math.floor(age / 120));
  ctx.drawImage(trailImg, frameIdx*32, 0, 32, 32, p.x-16, p.y-16, 32, 32);
}
```

### 3. Nemesis 光环

```js
// 光环 svg 本身含 animate，无需每帧逻辑。只需持续 drawImage。
if (bot.isNemesis) {
  ctx.drawImage(auraImg, bot.x - 80, bot.y - 72, 160, 160);  // +8 往下偏，在脚底
}
```

### 4. 状态浮字

选 row 按 state，位置在角色头顶（screenY - 48），每帧 float up + fade out：

```js
const row = stateIdxByName(state);  // 0..5
const t = (now - label.born) / label.duration;
const yOffset = -48 + t * 22;
const alpha = t > 0.84 ? (1 - (t-0.84)/0.16) : 1;
const scale = t < 0.1 ? 0.4 + (t/0.1)*0.7 : (t < 0.16 ? 1.1 - (t-0.1)/0.06*0.1 : 1);
// drawImage with alpha + scale at (bot.x, bot.y + yOffset)
```

## 色板（与 JSON 同步）

| State       | Bar / Ribbon | Text   |
|-------------|--------------|--------|
| Player      | `#7ac4f0` 蓝 | `#fff` |
| Enemy       | `#ff7a5a` 红 | `#fff` |
| Neutral     | `#ffd700` 金 | `#2a1a04` |
| Contested   | 混色脉冲     | `#fff` |
| HATRED +1   | `#ff7a5a` 红 | `#fff` |
| RAGE!       | `#ffb060` 橙 | `#fff` |
| NEMESIS     | `#c0a0ff` 紫 | `#fff` |
| RIVALRY END | `#9ae06a` 绿 | `#fff` |

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
