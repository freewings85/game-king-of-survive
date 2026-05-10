# cocos-v03-demo CONTRACT

> 本文件是 cocos-v03-demo/ 唯一的硬约束。任何 commit 在合并前必须自检每条都过。违反 = PM 退回。
>
> 目标终点: `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
> 引擎锁: Cocos Creator 3.x 2D / 2.5D, 微信小游戏 + 移动端发布
> 当前阶段: M1 程序化路线 (Cocos runtime API), 不依赖 .scene 文件

---

## 1. 平台 / 渲染预算

| 项 | 上限 | 说明 |
|---|---|---|
| 目标分辨率基线 | 390 × 844 portrait | 微信小游戏标配, 16:9 ~ 19.5:9 兼容 |
| Device Pixel Ratio | ≤ 2 | 高 DPR 设备强制 cap, 防 fillrate 爆炸 |
| 单张 sprite 贴图 | ≤ 512 × 512 px | 大背景拆 tile, 不允许 1024+ 的怪物/英雄图 |
| 同屏 sprite (Draw 节点) | ≤ 80 | 含怪物 / 子弹 / pickup / FX / decor; 超出走对象池剔除 |
| 同屏粒子总数 | ≤ 200 | 命中 / 火 / 闪电统一走精简 emitter |
| 同屏动态光 (fake-light radial) | ≤ 6 | 多余靠 baked decal 顶 |
| 目标帧率 | 60 fps 桌面 / 30+ fps 手机 | 微信开发者工具 + 真机 各跑一遍 |

## 2. 渲染策略 (fake everything, 禁真 3D / 真光照)

- **2D / 2.5D Sprite + Orthographic Camera**, 角色 isometric pose, 不开真 3D mesh / PBR / skinned mesh.
- **假光 (fake-light)**:
  - radial gradient sprite (alpha) + multiply / screen blend, 当点光源 (玩家 muzzle / 火堆 / 路灯)
  - 全局色调走 ColorGrading PostProcess (末日青绿 / 暖色篝火对比)
  - bloom 走 Cocos 内置 PostProcess, 强度低 (避免糊成一片)
- **假阴影 (contact-shadow)**:
  - 角色 / 道具脚下贴一张 radial dark decal (alpha 0.3-0.5), 跟随 transform
  - 禁止真阴影 / shadow map / projector
- **景深/雾**: 用 1-2 张半透 fog overlay sprite, 手 K alpha; 禁 SSR / 真 fog
- **颜色基调**: 青灰 / 焦黑 / 锈红主调, 高光留给玩家 muzzle 和 pickup (黄 / 青蓝)

## 3. 资产硬规则 (gamedemo-vis 教训, 不可破)

1. **角色 / 怪物 / 道具 / 建筑 sprite 必须真 CC0 / CC-BY / CC-BY-SA pack**
   - 推荐源: Kenney.nl / OpenGameArt (Riley Gombart / Calciumtrice / LPC) / itch.io (筛 CC0 tag)
2. **禁止程序画角色/怪物/道具 sprite** (canvas drawRect/drawCircle/Graphics 都禁), 即使临时占位也不行
3. **禁止 generated frame 当生产美术** (旧 build-v03-zombie-animation-assets.js / build-v03-unit-assets.js 那类 prototype 脚本产出的 PNG 不算合规, 必须 CC0 替换)
4. **FX 工具贴图例外**: radial gradient / soft mask / fog overlay / contact shadow decal 这类纯 alpha mask 可以程序生成 (`Texture2D` + 像素填充), 因为它们不是"角色美术"
5. **入 commit 必须先在 `cocos-v03-demo/CREDITS.md` 加条目**:
   - 来源 URL + author + license + 用途 + 本仓库放置路径
   - 没记录 = 不许 commit
6. **license 兼容矩阵**:
   - CC0 ✅ 任意使用
   - CC-BY ✅ 必须在 CREDITS.md 标注作者
   - CC-BY-SA ✅ 同上, 衍生作品需同 license (本项目接受)
   - GPL / 商业 / license 不明 ❌
7. **采购流程** (Leo 拍板):
   - Developer 找 3 个候选 pack → 列覆盖率 + 风格匹配度提案给 Director
   - Director 拍板 → 写 CREDITS.md → 群里 ack → 才能 import

## 4. 代码 / 工程规范

- **入口**: `assets/scripts/BootstrapMain.ts` (M1 阶段唯一入口, 程序化建场景)
- **目录约定**:
  ```
  cocos-v03-demo/
    assets/
      scripts/        # TS 源码
      resources/
        art/v03/      # 图集 (角色 / 怪 / 道具 / FX)
        config/       # 数值 / 关卡 JSON
    CREDITS.md        # 资产来源台账 (强制)
    CONTRACT.md       # 本文件
    can_delete/       # M1 的截图 / 调试 frame, 不入 git
  ```
- **TS / 模块**: Cocos Creator 3.x ESM, 用 `@cc/*` 装饰器, 不引 Node-only 包
- **不许引** Three.js / 真 3D mesh / raw HTML canvas 做生产渲染
- **commit 规范**: 每 commit 必须能在 Cocos preview / 微信开发者工具加载不报错; 30 分钟无 commit 拆任务; commit msg = `feat/fix/refactor: 一句 why`
- **不写无用注释 / 不写半成品 commit**

## 5. 完工自检表 (报到 PM 前必须填)

| 维度 | 标杆 (candidate_pics 那张) | 我的 | 评估 |
|---|---|---|---|
| 整体色调 | 末日青绿 + 暖光对比 | | |
| 体积感 / 假光 | radial light + contact shadow 清晰 | | |
| 角色识别度 | 3 职业 silhouette 一眼分得出 | | |
| 怪物多样性 | 至少 3 种轮廓 | | |
| 性能 | 桌面 60 / 手机 30+ | | |
| license | 全 CC0 / CC-BY, CREDITS.md 同步 | | |

**截图至少 3 张** (主视图 + 关键细节 zoom 2 张), 路径 `can_delete/shots/<milestone>-*.png`

没自检表 + 没截图 → PM 退回。

## 6. M1 scope (本周锁死)

- 1 张真 Cocos Creator scene (程序化构建, 不要 .scene 文件)
- 1 hero + 5 zombie 走动 (sprite 走 Director 拍板的 CC0 pack)
- radial gradient 假光 + contact shadow decal
- 微信开发者工具能 load 跑 30s 不崩
- **不接** 选卡 / PvP / 技能数值 / HUD 全套, 这些后续 M 处理

旧 codex 桥接 9 个 .ts + 老 portraits/units/props PNG 的去留, 由 Director 在 M1 sprite pack 拍板时一并裁决。本 contract 不预设它们留还是砍。
