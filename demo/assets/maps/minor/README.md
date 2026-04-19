# Minor Landmarks — 每群系记忆点

**风格：** HoMM3 饱和卡通
**用途：** 每个生物群系塞 1-2 个 "让玩家记住那片区域" 的小地标

## 清单

| Biome | Atlas | Sprite 0 | Sprite 1 |
|-------|-------|----------|----------|
| 沼泽 | `swamp_minor.svg`  | `witch_hut` 鸡脚巫婆屋（发光窗 + 挂骷髅 + 烟囱冒烟） | `mushroom_ring` 蘑菇圈（魔法光环 + 8 蘑菇 + 萤火虫）|
| 沙漠 | `desert_minor.svg` | `pyramid` 金字塔（金顶 + 阴影面 + 入口 + 象形文字）   | `dino_skeleton` 巨龙骸骨（头骨 + 肋骨 + 尾椎）|
| 废墟 | `ruins_minor.svg`  | `broken_bridge` 断桥（两端残墙 + 吊索 + 坠落石块 + 深渊）| `stone_head` 摩艾巨石像（鼻/眼/苔藓）|
| 雪原 | `snow_minor.svg`   | `frozen_dragon` 冰封巨龙化石（冰块 + 头骨 + 肋骨 + 冰柱）| `bear_den` 北极熊巢穴（雪丘 + 洞口发光眼 + 脚印 + 骨头）|

所有 sprite 128×128，锚点**底部中心** `(64, 124)`，两个 sprite 合为一张 256×128 atlas。

## 用法

```js
const pack = await fetch('assets/maps/minor/minor_landmarks.json').then(r=>r.json());
const swamp = pack.files.find(f=>f.biome==='swamp');
const img = new Image();
img.src = 'assets/maps/minor/' + swamp.image;
const w = pack.spriteW, h = pack.spriteH, a = pack.anchor;

const hut = swamp.sprites[0];  // witch_hut
ctx.drawImage(img, hut.col*w, hut.row*h, w, h, wx-a.x, wy-a.y, w, h);
```

## 设计建议（Developer / Level Designer）

- `mushroom_ring` 可当作 **buff 区**（进圈回血/加速）
- `bear_den` 可当作 **怪物刷新点**
- `frozen_dragon` 可作 **任务彩蛋**（击破后给金币/道具）
- `pyramid` / `stone_head` / `witch_hut` 建议只放 1 个 / 群系，保持记忆点独特
- `broken_bridge` 天然把两片区域分隔，配合河流使用

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
