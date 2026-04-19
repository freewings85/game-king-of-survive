# Mountains — 3 variants

**风格：** HoMM3 饱和卡通
**用途：** 不可通行的天然分隔物 + 地形记忆点

## Atlas: `mountains.svg`

- 384×128 atlas，3 列 × 1 行，每格 128×128
- 锚点：**底部中心** `(64, 124)` — 放置时将 sprite 底部中心对齐地图格子锚点

| Col | Name | Notes |
|-----|------|-------|
| 0 | `snowy_peak` | 单峰雪山，带雪冠 + 雪痕；适合雪原/平原 |
| 1 | `rocky_ridge` | 双峰岩岭 + 碎石 + 植被簇；适合废墟/平原/沙漠 |
| 2 | `volcano` | 活火山 + 熔岩口 + 流淌熔岩 + 烟雾；沙漠稀有记忆点，建议每张图只 1-2 个 |

## 用法

```js
const mtns = await fetch('assets/maps/mountains/mountains.json').then(r=>r.json());
const img = new Image();
img.src = 'assets/maps/mountains/' + mtns.image;

// 放置 rocky_ridge 在世界坐标 (wx, wy)
const v = mtns.variants[1];
ctx.drawImage(img,
  v.col*128, v.row*128, 128, 128,
  wx - mtns.anchor.x, wy - mtns.anchor.y, 128, 128);
```

## 碰撞

`walkable: false` — 所有 3 种都是障碍。建议碰撞盒用椭圆：
- 中心 `(anchor.x, anchor.y - 16)`
- 半径 `rx=56, ry=12`（吸附到 sprite 底部）

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
