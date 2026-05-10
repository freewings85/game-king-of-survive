# cocos-v03-demo Asset Credits

> 任何 commit 引入新 sprite / 音频 / 字体 前, **必须**先在此文件加条目. 没记录 = 不许 commit.
> 详细规则见 `CONTRACT.md` §3.

---

## Procedural FX (program-generated, no external source)

CONTRACT §3.4 允许程序生成的 FX 工具贴图 (radial gradient / soft mask / fog overlay / contact shadow decal / 末日地表 noise tile). 这些不算"角色美术", 不需要外部 license.

当前 runtime 生成器:
- `assets/scripts/BootstrapMain.ts` — radial light alpha (256²) / contact shadow alpha (128²)
- `assets/scripts/WastelandTerrain.ts` — 暗灰沥青破路 noise tile (512², CONTRACT §1 边界内) 含裂纹 / 污渍 / 锈红 / 烧痕图层

## Imported Assets (M1)

### Hero — Riley Gombart "Animated Top Down Survivor Player"
- **path**:
  - `assets/resources/art/v03/hero/survivor-idle.png` (313×207, 37KB)
  - `assets/resources/art/v03/hero/survivor-shoot.png` (312×206, 37KB)
  - `assets/resources/art/v03/hero/survivor-feet-walk.png` (172×124, 9.6KB)
- **source**: https://opengameart.org/content/animated-top-down-survivor-player
- **download**: https://opengameart.org/sites/default/files/Top_Down_Survivor_2.zip (md5 `19ba320f2bb099b0f2c601f8ad019f48`)
- **author**: Riley Gombart
- **license**: **CC-BY 3.0** — 必须保留作者署名 (本文件 + 游戏内 credits 屏)
- **selected**: rifle/idle/survivor-idle_rifle_0 + rifle/shoot/survivor-shoot_rifle_0 + feet/walk/survivor-walk_0
- **usage**: M1 hero 静态 layout (idle 主姿态 + shoot muzzle 帧 + 脚步备料), 后续 M2 补全多帧动画

### Zombie — Riley Gombart "Animated Top Down Zombie"
- **path**:
  - `assets/resources/art/v03/zombie/zombie-idle.png` (241×222, 43KB)
  - `assets/resources/art/v03/zombie/zombie-move.png` (~288×311, 47KB)
  - `assets/resources/art/v03/zombie/zombie-attack.png` (318×294, 43KB)
- **source**: https://opengameart.org/content/animated-top-down-zombie
- **download**: https://opengameart.org/sites/default/files/tds_zombie.zip (md5 `689c0247884c56a8e7b3931bb1901c5c`)
- **author**: Riley Gombart (ChessMasterRiley)
- **license**: **CC0** (Public Domain, 无署名义务但本文件保留来源作为台账)
- **selected**: skeleton-idle_0 + skeleton-move_8 + skeleton-attack_4
- **usage**:
  - M1: 5 个 zombie 实例复用 3 帧, 用 scale / tint / 朝向 / 间距制造压迫感, 不做"复制粘贴队列"
  - M2-1A: 扩到 8 个实例 (Riley 单 silhouette body type, 真 silhouette 多样性 deferred to M2-2 作为阻断项)

### Props — Kenney "Top-down Tanks" (M1x baseline + M2-1A 扩容)
- **path** (M1x baseline, 3 件):
  - `assets/resources/art/v03/props/wreck-tank.png` (625B, source `PNG/Tanks/tankBeige.png`, 运行时 tint 灰棕表达"锈废战车残骸")
  - `assets/resources/art/v03/props/barrel-rust.png` (686B, source `PNG/Obstacles/barrelGrey_sde_rust.png`)
  - `assets/resources/art/v03/props/sandbag.png` (647B, source `PNG/Obstacles/sandbagBrown.png`)
- **path** (M2-1A 街景密度扩容, +4 件):
  - `assets/resources/art/v03/props/tank-green.png` (609B, source `PNG/Tanks/tankGreen.png`, 远端第二辆 wreck landmark, tint 暗绿橄榄)
  - `assets/resources/art/v03/props/barrel-red.png` (1099B, source `PNG/Obstacles/barrelRed_up.png`, 中央红桶, 不 tint, 给暗调街景一个亮点)
  - `assets/resources/art/v03/props/sandbag-beige.png` (650B, source `PNG/Obstacles/sandbagBeige.png`, 玩家左下第二沙袋堆, 不 tint)
  - `assets/resources/art/v03/props/oil-splat.png` (2172B, source `PNG/Obstacles/oil.png`, 中央地面油渍背景 prop, tint 沙土暖色)
- **source**: https://kenney.nl/assets/top-down-tanks
- **download**: https://kenney.nl/media/pages/assets/top-down-tanks/800ff1ded5-1677699019/kenney_top-down-tanks.zip (md5 `f0c3eeecf6fb2345d4d1b8ca63f8db1c`)
- **author**: Kenney Vleugels (www.kenney.nl)
- **license**: **CC0** (Public Domain, 无署名义务但本文件保留)
- **usage**:
  - M1x baseline: 3 件 cover/landmark — wreck tank 中左 / sandbag 玩家右下 / rust barrel 玩家右侧脚下
  - M2-1A: 同 author 同 pack 加 4 件凑到 7 件街景级密度, 同时把现有 3 件重新摆位 (wreck tank 从 (-200,-110) 移到 (-110,-60) 中央偏左, 不再边角露一下); 风格统一不混源

## Quarantined (legacy, NOT in M1)

旧 generated PNG (origin: 旧 codex `build-v03-zombie-animation-assets.js` / `build-v03-unit-assets.js` 等脚本程序产出, license/审美双不合规) 已移至:
- `can_delete/legacy-art/v03/` — portraits / props / skills / units / zombies 全部子目录

源 ZIP 备份 (大文件不入 git):
- `can_delete/legacy-art/v03-source-zips/` — Top_Down_Survivor.zip + tds_zombie.zip + 解包临时目录

## License 兼容性确认

| 资产 | License | 兼容本项目商用发布 (微信小游戏) | 署名要求 |
|---|---|---|---|
| Riley Gombart Survivor | CC-BY 3.0 | ✅ | ✅ 必须 (CREDITS + 游戏内) |
| Riley Gombart Zombie | CC0 | ✅ | 无义务 (仍记录) |
| Kenney Top-down Tanks (props) | CC0 | ✅ | 无义务 (仍记录) |
| Procedural FX / Terrain / HUD | N/A | ✅ | N/A |
