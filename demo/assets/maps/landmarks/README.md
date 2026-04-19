# Central Landmarks — Map Asset Pack

**风格：** HoMM3 饱和卡通（延续 `style_homm3_bright`）
**用途：** 手工地图中心的超级地标，提供远望识别度和记忆点。

## 文件

| File | Size | Description |
|------|------|-------------|
| `crystal_sanctum.svg` | 256×320 | 水晶圣殿 — 紫水晶主塔 + 金基座 + 石阶 + 翠绿光晕 |

## 技术细节

- 矢量 SVG，无位图依赖，编辑器/游戏可直接 `<img>` 或 drawImage 使用
- 所有 stroke 保持饱和深色轮廓，对应 HoMM3 轮廓美学
- 底部有椭圆阴影，锚点建议放在 **底部中心**（x=128, y=298）

## 用法（Developer 参考）

```js
const img = new Image();
img.src = 'assets/maps/landmarks/crystal_sanctum.svg';
// 世界坐标 (wx, wy) = 地标底部中心
ctx.drawImage(img, wx - 128, wy - 298, 256, 320);
```

## LICENSE

原创，CC0（本项目内自由使用，不限商用）。
Author: ArtDesigner (GameDev team) — 2026-04-20
