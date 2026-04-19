# Water / River & Bridges

**风格：** HoMM3 饱和卡通（延续 `style_homm3_bright`）
**用途：** 天然分隔物 — 玩家必须走桥过河，战术地形。

## Autotile: `river_autotile.svg`

- 256×256 atlas，4×4 grid，每格 64×64，共 16 块
- 4-bit NESW mask（N=1, E=2, S=4, W=8），布局：`col = mask & 3, row = mask >> 2`
- 见 `river_autotile.json` 的 `tiles[]` 映射
- 覆盖：pond / 4 caps / 4 elbows / 2 straights / 4 T / 1 cross
- `walkable: false`（必须走桥）

### Autotile 逻辑（Developer 参考）

```js
// 遍历每个 water tile, 计算 mask
function maskOf(x, y, isWater) {
  let m = 0;
  if (isWater(x, y-1)) m |= 1;  // N
  if (isWater(x+1, y)) m |= 2;  // E
  if (isWater(x, y+1)) m |= 4;  // S
  if (isWater(x-1, y)) m |= 8;  // W
  return m;
}
const tile = atlas.tiles[mask];  // col/row already computed
ctx.drawImage(img, tile.col*64, tile.row*64, 64, 64, px, py, 64, 64);
```

## Bridges

| File | Size | Tiles |
|------|------|-------|
| `bridge_stone.svg` | 128×64 | horizontal (col 0) + vertical (col 1)，64×64 each |
| `bridge_wood.svg`  | 128×64 | horizontal (col 0) + vertical (col 1)，64×64 each |

石桥：灰石拱 + 金边护栏，厚重；木桥：木板 + 绳索护栏 + 铆钉，轻便。
桥 tile 本身 `walkable: true`，放在 water tile 上覆盖。

```js
// horizontal water crossing
ctx.drawImage(bridgeImg, 0, 0, 64, 64, worldX, worldY, 64, 64);
// vertical water crossing
ctx.drawImage(bridgeImg, 64, 0, 64, 64, worldX, worldY, 64, 64);
```

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
