# Map Editor UI Assets

**风格：** HoMM3 饱和卡通 + 羊皮纸暖色 (warm parchment)
**用途：** `demo/map_editor.html` 的面板、按钮、卡片、图钉

## 文件

| File | Content |
|------|---------|
| `editor_icons.svg`   | 12 个工具图标 32×32（brush/eraser/bucket/select/pan/pin/grid/undo/redo/save/load/export）|
| `palette_card.svg`   | Palette 卡片 3 态（default/hover/selected），64×80 |
| `pin_icons.svg`      | 5 个 special pin（spawn/storm/strategic/boss/mob），48×48 |
| `category_tabs.svg`  | 分类栏 3 tabs（Tiles / Buildings / Pins），128×48 |
| `editor_ui.json`     | 汇总索引 + 主题色板 |

## 主题色板（`editor_ui.json.theme`）

```
bg          #2a1a08  深棕
panel       #3a2814  面板底
border      #1e1208  轮廓
accentGold  #ffd700  金高亮（选中 / 重点）
accentWarm  #ffd966  暖金（hover）
text        #f0e8c8  米白文字
textDim     #a89878  次级文字
selected    #ffecb0  选中背景
```

## 用法（Developer 参考）

### 工具栏

```html
<button class="tool" data-tool="brush">
  <svg><use href="#icon-brush"/></svg>
</button>
```

或直接 drawImage：

```js
// 取 brush icon (index 0)
ctx.drawImage(iconsImg, 0*32, 16, 32, 32, x, y, 32, 32);
```

### Palette 卡片

每个 tile / structure 一张卡片：

```
┌─ card_selected.png (边框金色+4角宝石)
│ ┌────────────┐
│ │  tile/png  │ ← 40×40 内嵌 tile 或 sprite 缩略图
│ └────────────┘
│  "Swamp Mud"  ← label 条（#5a3a0a 底 + 米白字）
└─
```

### Pin 图标

放置在地图上标识 special 点（hover 时显示 tooltip）。

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
