# Central Landmarks — Map Asset Pack

**风格：** HoMM3 饱和卡通（延续 `style_homm3_bright`）
**用途：** 手工地图中心的超级地标，提供远望识别度和记忆点。

## 文件

| File | Size | Description |
|------|------|-------------|
| `crystal_sanctum.svg` | **384×512** | 水晶圣殿 v2 — 主塔 + 4 卫星尖塔 + 星形大理石底座 + 发光光晕 + SVG 动画闪烁 |

## 技术细节

- 矢量 SVG，无位图依赖，编辑器/游戏可直接 `<img>` 或 drawImage 使用
- **内建动画**：主顶星芒脉动、4 尖塔星光闪烁、漂浮水晶碎片上下飘动、主光晕呼吸
- 所有 stroke 保持饱和深色轮廓（HoMM3 轮廓美学）
- 锚点：**底部中心** `(192, 498)`
- 底座为 256px 跨度的 8 角星大理石平台 + 64px 半径金色内圈，远望识别度极高

## 用法（Developer 参考）

```js
const img = new Image();
img.src = 'assets/maps/landmarks/crystal_sanctum.svg';
// 世界坐标 (wx, wy) = 地标底部中心
ctx.drawImage(img, wx - 192, wy - 498, 384, 512);
```

## 建议游戏侧配合（Leo 要求）

- 地标周围 300px **禁止障碍物生成**（确保远望可见）
- 玩家进入 500px 半径时屏幕微亮（"接近感"反馈）

## LICENSE

原创，CC0（本项目内自由使用，不限商用）。
Author: ArtDesigner (GameDev team) — 2026-04-20
