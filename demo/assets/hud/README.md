# HUD — Screen-space UI sprites

**风格：** HoMM3 饱和卡通 + 强对比 HUD
**用途：** 屏幕空间 overlay（方向指引、状态徽章等）

## 当前清单

| File | Size | Purpose |
|------|------|---------|
| `direction_arrow.svg` | 144×48 | 3 态方位箭头（金/红/蓝 — 神圣/危险/中性）|
| `hud.json` | — | 元数据 + drawImage 示例 |

## Direction Arrow 使用

```js
const hudCfg = await fetch('assets/hud/hud.json').then(r=>r.json());
const arrImg = new Image(); arrImg.src = 'assets/hud/direction_arrow.svg';

function drawArrow(ctx, screenX, screenY, angleRad, variantName) {
  const v = hudCfg.directionArrow.variants.find(x => x.name === variantName);
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(angleRad - Math.PI/2);  // svg points up; rotate to target
  ctx.drawImage(arrImg, v.idx*48, 0, 48, 48, -24, -24, 48, 48);
  ctx.restore();
}

// 指向祭坛（世界坐标 altarX, altarY）
const dx = altarX - player.x, dy = altarY - player.y;
const angle = Math.atan2(dy, dx);
// 锁到屏幕边缘（离 player 视角 40% 屏距）
const cx = canvas.width/2, cy = canvas.height/2;
const edgeDist = Math.min(cx, cy) - 48;
drawArrow(ctx, cx + Math.cos(angle)*edgeDist, cy + Math.sin(angle)*edgeDist, angle, 'holy');
```

## 优先级规则

同一画面最多 2 个箭头：
- `danger` 永远显示（rival 1200px 内 / 风暴最后 30s / boss 出现）
- `holy`（祭坛）优先度低，仅在没 danger 且祭坛开启时显示
- `neutral`（最近 strat）固定显示小一号（scale 0.8）

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
