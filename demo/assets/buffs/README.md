# Buff Auras — 玩家状态光环

**风格：** HoMM3 饱和卡通 + 与 `r3/synergy_aura_*.png` 同尺寸同锚点便于统一渲染
**尺寸约定：** 80×80，锚点中心 (40, 40)

## 当前清单

| File | Trigger | Frames | Description |
|------|---------|--------|-------------|
| `newborn_shield.svg` | arena_a 开局 ≤ 20s | 1 (with SVG animate) | v1 — 推荐用 fade atlas 代替 |
| `newborn_shield_fade.svg` | 同上 | **5 (400×80 atlas)** | **静态** 5 帧渐弱 — FPS 友好 |
| `altar_master.svg` | 击破祭坛后 5min | 1 (static) | "圣堂之主" 金+紫皇家光环（中心王冠）|
| `slow_debuff_aura.svg` | 敌人被减速 | 1 (static) | 紫雾 + 锁链 + 慢时钟，贴敌人脚下 |
| `divine_shield_flash.svg` | Healer 每次受击 | 1 (static) | **神佑瞬闪** 0.3s 金六角盾 + 12 放射 + 绿十字 |

## ⚡ 性能要点（R5e Fix 1 配合）

**SVG `<animate>` 标签每帧会触发浏览器重新渲染 SVG DOM**，Developer 每次 `drawImage(svgImg, ...)` 都要付出**重光栅化的代价** — 是 FPS 杀手。

解决方案：
1. ✅ 所有**长时间显示的 buff 光环**改为静态 SVG（本目录的 fade atlas + altar_master）
2. ✅ Developer 在 `_preloadBuffs()` 里把 SVG 一次性 rasterise 到 offscreen canvas
3. ✅ 后续每帧只画 canvas（零 SVG 开销），代码驱动 alpha / rotation 做动画
4. ⚠️ 仅允许 SVG animate 的：一次性爆炸（altar_shatter）、瞬间效果（debris）— 这些持续时间短，总成本可忽略

## 接入（Developer — 推荐流程）

```js
// Preload：光栅化一次
const buffAtlas = {};
(function() {
  const cfg = ... // 从 buffs.json 加载
  ['newborn_shield_fade.svg', 'altar_master.svg'].forEach(file => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      buffAtlas[file] = c;  // cached bitmap
    };
    img.src = 'assets/buffs/' + file;
  });
})();

// Render 循环：
function drawPlayerBuffs(ctx, player) {
  // 新生庇护 fade
  if (player.newbornShieldT > 0) {
    const t = player.newbornShieldT;
    const f = t >= 15 ? 0 : t >= 10 ? 1 : t >= 5 ? 2 : t >= 2 ? 3 : 4;
    const atlas = buffAtlas['newborn_shield_fade.svg'];
    if (atlas) ctx.drawImage(atlas, f*80, 0, 80, 80, player.x-40, player.y-40, 80, 80);
  }
  // 圣堂之主
  if (player.altarMasterT > 0) {
    const atlas = buffAtlas['altar_master.svg'];
    if (atlas) {
      ctx.save();
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(performance.now() * 0.003);
      ctx.drawImage(atlas, player.x-40, player.y-40, 80, 80);
      ctx.restore();
    }
  }
}
```

## 减伤时间表（newbornShieldFade）

| t 剩余 | 帧 | 减伤 | 视觉 |
|--------|-----|------|------|
| 20 → 15s | 0 | **50%** | 满环 + 盾牌 + 粒子 |
| 15 → 10s | 1 | 30% | 满环 + 盾牌（无粒子）|
| 10 → 5s  | 2 | 15% | 小环 + 4 盾牌 |
| 5  → 2s  | 3 | 0%  | 微弱 + 2 盾牌 |
| 2  → 0s  | 4 | 0%  | 闪烁 + 孤盾牌 |

## 扩展规划

保留位：`rage_aura` / `regen_aura` / `vision_aura` / `rampage_aura` —— 新增时走同规格 80×80 静态 SVG + atlas（如有渐变）。

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
