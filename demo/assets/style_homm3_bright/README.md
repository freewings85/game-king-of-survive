# style_homm3_bright — Full Game Pack

**风格定位：** 英雄无敌3 饱和卡通手绘。草绿 + 土黄 + 金边 + 暖红。
**Leo 已于 2026-04-18 选定为项目正式美术方向。**

## 文件清单（给 Developer 接入用）

### 地表 Tileset
- `tileset.png` (384×128, 6×2 grid, 64px tile)
- `tileset.json` — atlas 元数据
- 12 块：grass×2 / dirt×2 / stone×2 / grass↔dirt 四向接缝 + grass↔stone 东/南接缝

### 玩家角色 Sprite Sheet
- `player_mage.png` (256×384, 4×6 grid, 64×64 frame)
- `player_mage.json` — 动画元数据（兼容项目既有 LPC 格式）
- 布局：
  - row 0..3 = walk U / L / D / R，每行 4 帧
  - row 4 = attack（3 帧，col 0..2；col 3 为空帧）
  - row 5 = death（3 帧，col 0..2；col 3 为空帧）
- 动画参数（见 JSON）：
  - walk: 10 fps, rowFromDir=true
  - attack: 12 fps, rowBase=4, rowFromDir=false（共享动画，任何方向触发同一套）
  - death: 8 fps, rowBase=5, loop=false

### 怪物 Sprite Sheet
- `monster_orc.png` (256×256, 4×4 grid, 64×64 frame)
- `monster_orc.json` — 只有 walk（4 方向 × 4 帧，8 fps）

### UI 9-slice
- `ui_frame_full.png` (192×192) — 完整参考图
- `ui9/tl.png, t.png, tr.png, l.png, c.png, r.png, bl.png, b.png, br.png` — 9 块 64×64 切片
- `ui9/meta.json`
- 用法：`cornerSize=16` 推荐值；角块保持不拉伸，`t/b/l/r` 横向或纵向拉伸，`c` 双向拉伸填充中间。

### 装饰物
- `decor/tree_big.png` (128×128)
- `decor/tree_small.png` (64×64)
- `decor/rock.png` (64×64)
- `decor/house.png` (128×128)
- `decor/fence.png` (64×64)
- `decor/crate.png` (64×64)
- `decor/index.json` — 每项含 `anchor`（底中点，用于贴地）和 `collider`（碰撞矩形，比贴图小）。

## 可视化 QA
- `_qa_preview.png` — 全素材一张预览，直接看。
- `_qa_preview.html` — 同源 HTML，本地开浏览器。

## 生成 / 再生
所有资产由 `build/render.mjs` 从参数化 SVG (`build/svgs.mjs`) 通过 playwright 光栅化。
重新生成全部：
```
node demo/assets/style_homm3_bright/build/render.mjs all
```
单独生成：`tileset` / `mage` / `orc` / `ui` / `decor`。
更新可视化：`node demo/assets/style_homm3_bright/build/qa_preview.mjs`

## 来源 / LICENSE
- 原创参数化 SVG → PNG，作者 ArtDesigner (Claude-assisted)。
- **LICENSE: CC0 (Public Domain)** — 项目内自由修改、商用、重分发。
- 无第三方贴图依赖。

## 注意 / 后续
- 目前锯齿偏"矢量干净"，如果 Leo 要更手绘感，后续可以：
  1. 用 AI（Midjourney "HoMM3 painterly illustration, warm parchment UI"）重出角色；
  2. 给 SVG 加 `filter` 高斯模糊 + 提高细节密度（现有管线只需改 svgs.mjs）；
  3. 替换为 opengameart CC-BY "HoMM-style" 贴图，记得写入 CREDITS。
- 当前调色板统一，不要混入其他风格包的素材。
