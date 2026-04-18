# style_pixel_unified

**风格定位：** 统一 16-bit 像素风（类 Stardew Valley / Chrono Trigger），16×16 基础 tile。
**适用场景：** 怀旧 RPG、资源易找（itch.io 大把 CC0 像素包）、性能友好。
**重点：** 整包强制一致的像素尺寸和调色板——不许混入手绘素材。

## 文件
- `terrain.svg` — 16×16 像素瓦片布局（草 + 土 + 石三段过渡，有散乱像素做软接缝）
- `character_archer.svg` — 兜帽弓箭手（绿袍 + 长弓 + 背后箭袋，侧影好辨）
- `monster_goblin.svg` — 哥布林（尖耳 + 大黄眼 + 獠牙 + 生锈匕首）
- `ui_frame.svg` — 像素木框 + 铁角板 + 铆钉 + 像素 HP/MP 条 + 金币图标

## 来源 / LICENSE
- 原创 SVG 矢量（shape-rendering=crispEdges 模拟像素），作者 ArtDesigner。
- **LICENSE:** CC0。
- **推荐替换来源（若采用此风格正式化）：**
  - itch.io: "16×16 Fantasy RPG Tileset" by Pixel Frog (CC0)
  - opengameart.org: "LPC" 系列（CC-BY-SA 3.0，需署名）
  - itch.io: "Ninja Adventure Asset Pack" (CC-BY 4.0)

## 注意
项目现有 `demo/assets/characters/lpc_*.png` 是 LPC 像素风——如 Leo 选此包，**直接复用已有 LPC**，再补一套怪物/UI 即可，工作量最小。
