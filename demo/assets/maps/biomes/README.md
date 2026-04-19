# Biome Tilesets — 4 variants

**风格：** HoMM3 饱和卡通（延续 `style_homm3_bright`）
**用途：** 4 种生物群系分区，使地图视觉差异明显、易识别。

## 文件

每个群系 = 1 个 SVG atlas + 1 个 JSON 元数据。

| Biome | Atlas | Size | Tiles |
|-------|-------|------|-------|
| 沼泽 Swamp   | `biome_swamp.svg`  | 256×128 | 8 (4 base + 4 accent) |
| 沙漠 Desert  | `biome_desert.svg` | 256×128 | 8 |
| 废墟 Ruins   | `biome_ruins.svg`  | 256×128 | 8 |
| 雪原 Snow    | `biome_snow.svg`   | 256×128 | 8 |

布局：4 列 × 2 行，每格 64×64。Row 0 = 基础地面变体，Row 1 = 点缀/障碍物。

## Tile 属性（JSON 中）

- `walkable`: 能否通行
- `speedMult`: 可选，移动速度系数（沼泽泥泞 0.7、冰面 1.15 滑行、废墟瓦砾 0.85 等）

## 配色要点（v2 — 2026-04-20 Leo 色差校准）

四群系主色拉开距离，远看可一眼辨认：

- **沼泽 SWAMP**：`#2d5a3d` 深沼绿底 + `#4a7a5a` 苔藓亮 + `#1a3a2a` 烂泥深 + `#6b8ea0` 蓝灰水面（+ 黑 `#1a0e04` 枯木）
- **沙漠 DESERT**：`#d4a24a` 沙黄 + `#a06c2a` 深沙/骸骨 + `#8a4a1a` 石 + `#2d6a38` 仙人掌
- **废墟 RUINS**：`#6a6a5a` 灰石 + `#4a5a4a` 苔藓 + `#2a2a2a` 裂缝
- **雪原 SNOW**：`#e8f0f5` 雪白 + `#b8d4e0` 淡冰蓝 + `#c8dce8` 冰裂纹 + `#2d4a3a` 常青绿

四群系 + 现有 `style_homm3_bright` 的草地/土路组合，共 **5 种地形**（草地作为"平原"第 5 种）。

## 用法（Developer 参考）

```js
const biome = await fetch('assets/maps/biomes/biome_swamp.json').then(r=>r.json());
const img = new Image();
img.src = 'assets/maps/biomes/' + biome.image;

// 画第 3 个 tile (swamp_water_pool, col=3,row=0)
const t = biome.tiles.find(x=>x.name==='swamp_water_pool');
ctx.drawImage(img, t.col*64, t.row*64, 64, 64, destX, destY, 64, 64);
```

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
