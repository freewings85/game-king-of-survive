# Buff Auras — 玩家状态光环

**风格：** HoMM3 饱和卡通 + 与 `r3/synergy_aura_*.png` 同尺寸同锚点便于统一渲染
**尺寸约定：** 80×80，锚点中心 (40, 40)

## 当前清单

| File | Trigger | Description |
|------|---------|-------------|
| `newborn_shield.svg` | arena_a 开局 ≤ 20s | 金色保护光环（50% 减伤）— 双旋环 + 6 盾牌符文 + 漂浮光粒 |

## 接入（Developer）

```js
const buffCfg = await fetch('assets/buffs/buffs.json').then(r=>r.json());
const shieldImg = new Image();
shieldImg.src = 'assets/buffs/newborn_shield.svg';

// 在玩家渲染循环里，如果 player.newbornShieldT > 0：
const t = player.newbornShieldT;
let alpha = 1;
if (t < 3) {  // 最后 3 秒闪烁
  alpha = 0.5 + 0.5 * Math.sin(t * 12);
}
ctx.save();
ctx.globalAlpha = alpha;
ctx.drawImage(shieldImg, player.x - 40, player.y - 40, 80, 80);
ctx.restore();
```

渲染 z-order：tile < buff_aura < entity_sprite < floating_text（和 r3 synergy aura 相同）。

## 扩展规划（未来其他 buff）

本目录保留给其他 buff aura：
- `rage_aura.svg` — rival frenzy（红色）
- `regen_aura.svg` — 据点 temple 回血（绿色）
- `vision_aura.svg` — watchtower 视野（蓝色）
- `rampage_aura.svg` — kill streak（紫色）

添加新 aura 时 → 同目录加 svg + 追加 `buffs.json`，统一 80×80 规格。

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
