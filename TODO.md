# TODO — cocos-v03-demo 2D 路线整改

> 方向已定：**纯 2D 俯视吸血鬼幸存者风格**（不做伪 2.5D，不做真 3D）。本文档列出当前 `cocos-v03-demo/` 的核心问题与对应修复方案。

---

## 一、当前问题诊断

### 1. 项目存在两套互不兼容的 V03 实现

- **文档化方案**（`cocos-v03-demo/README.md` 描述的"3D 网格 + 正交斜视"）：`V03SceneBootstrap` / `V03MapRuntime` / `V03ContactShadowRuntime` / `V03VisualRuntime` / `V03ArtSpriteRuntime` / `V03BattleDirector` / `V03MapContract` / `V03VisualContract` —— 共 8 个文件，使用 `MeshRenderer + primitives.box` 在 X-Z 平面铺真 3D 地面、Vec3(x, y, z) 三轴定位、摄像机 `lookAt`。**实际启动流程里没人调用，是死代码**。
- **实际跑起来的方案**（`BootstrapMain.ts` → `ActorSpawner.ts` → `WastelandTerrain.ts`）：摄像机正面平视、所有节点强制 `Layers.Enum.UI_2D`、通过 `Canvas` 走 UI 渲染管线、Sprite + UITransform、position 就是屏幕像素坐标。

文档说 A，代码跑 B，新人/AI 第一眼必然读错方向。这是项目所有混乱的根源。

### 2. 锚点全错——角色"飘"的最直接原因

`ActorSpawner.spawnHero` / `spawnZombies` / `spawnProps` 调用了 `setContentSize`，但**没设 `setAnchorPoint`**。Cocos UITransform 默认锚点是 `(0.5, 0.5)`（中心），等于把角色"肚脐眼"对准 position —— 脚陷地里、头浮空中。

后果：代码处处是补丁——
- 影子靠 `yOffset = -spriteH * 0.4` 推到脚底（ActorSpawner line 428）
- HP bar 靠 `* 0.55` 推到头顶（line 300, 346）
- 这些数字一旦改 sprite 大小就要重调

### 3. 没有 Y-sort（深度排序）

怪和玩家都挂在 `worldLayer` 下，渲染顺序 = `addChild` 顺序（兄弟顺序）。UI_2D 层不看 z 值。后果：
- 怪走到玩家"屏幕下方"时**不会被玩家挡住**
- 玩家走到树/障碍物后面永远看不到遮挡
- 画面像一坨贴纸平摊在屏幕上，毫无空间感

影子目前能在角色下面**完全是因为 `spawnHero` 里先 spawn 影子再 spawn 角色**的隐式顺序耦合，任何重排都会让影子穿到角色头上。

### 4. 摄像机不跟随，世界 = 一个屏幕

- 摄像机固定在 `(0, 0, 1000)`，从来不动
- 玩家被 clamp 在 `±HERO_SCREEN_HALF_W/H = ±195/±422` 屏幕半尺寸内（line 896-897）
- 怪从屏幕边刷出，但屏幕本身就是世界的全部

吸血鬼幸存者类游戏的核心体验是"无尽地图 + 摄像机跟人 + 怪从视野外追来"，**当前实现把核心机制做错了**。`updateMinimap` 注释还自欺欺人说"camera follows hero in vampire-survivors style"，相机根本没跟随。

### 5. 屏幕震动破坏世界根

`updateShake` 直接修改 `worldLayer.setPosition`（line 634-645）。意味着 worldLayer 的位置被 shake 占用，未来加摄像机跟随会和震屏直接打架。

### 6. HP bar / 影子是角色子节点，被父级 scale 污染

`updateHero` 用 `setScale(sxFinal, sy, 1)` 做 squash-stretch 动画 + `setScale(-1, ...)` 翻转面向。HP bar 是角色子节点 → **跟着翻转和形变**。影子虽是兄弟节点幸免，但仍不规范。

### 7. 美术 vs 地面视角割裂

注释自己说漏嘴（line 338）："3/4 view sprites must not rotate (would go upside-down)"。美术按 3/4 视角画（带透视、看到角色侧面 + 顶部），但地面是纯顶视平铺贴图，摄像机是正面平视——**三种视角拼贴**。这也是"飘"感的次要来源。

### 8. 其它

- `BootstrapMain` line 50-57 使用私有 API `internal.dynamicAtlasManager`，Cocos 升级会爆
- `paintFrame` 系列函数（line 333-545）CPU 跑像素循环画 disc/ring/glyph，启动卡 200ms+，应换 PNG 资源
- 整个项目程序化建场景，没用 `.scene` 文件、没用 prefab，等于把 Cocos 当 Sprite 渲染器，未来策划无法在编辑器调

---

## 二、修复方案（按优先级）

### P0 — 必须修，做完"飘"感消失、核心玩法成立

#### Step 1：锚点统一改 `(0.5, 0)` 并删除所有 yOffset 补丁

文件：`cocos-v03-demo/assets/scripts/ActorSpawner.ts`

- `spawnHero`（line 283-284）：`setContentSize` 后加 `tr.setAnchorPoint(0.5, 0)`
- `spawnZombies`（line 334-336）：同上
- `spawnProps`（line 267-268）：同上（小心 prop 类型，桶可能想要 (0.5, 0.5)，按视觉判断）
- 删除影子 `yOffset = -spriteH * 0.4`（line 428），改为 `node.setPosition(pos[0], pos[1], 0)`
- 删除 HP bar `hero.contentSize[1] * 0.55`（line 300、line 346），改为 `+ contentSize[1]`（头顶上方）

预期：角色"站"在 position 坐标点上，影子贴脚底，HP bar 在头顶。

#### Step 2：每帧 Y-sort

文件：`ActorSpawner.ts` 的 `update` 末尾。

```ts
const kids = this.worldLayer.children;
kids.sort((a, b) => b.position.y - a.position.y);
kids.forEach((n, i) => n.setSiblingIndex(i));
```

注意排除"地面 tile 层"（应作为独立子节点不参与排序，或始终 setSiblingIndex(0)）。

#### Step 3：摄像机跟随玩家 + 删屏幕 clamp

文件：`BootstrapMain.ts`（摄像机）+ `ActorSpawner.ts`（删 clamp）。

- 删除 line 896-897 的 `HERO_SCREEN_HALF_W/H` clamp
- 改为按"地图边界" clamp（例如 4000×4000）
- 摄像机每帧 `cameraNode.position = playerNode.position`（保持 z 不变）
- 怪刷新逻辑（`updateSpawn` line 1101-1125）：从"屏幕外圆周"改为"摄像机视野外圆周"

预期：玩家始终在屏幕中央，世界向后滚动，怪从摄像机外追来。

#### Step 4：Shake 改为修改摄像机偏移

`updateShake`（line 634）改为修改 `camera.node.position` 的 shake 偏移量，不要动 `worldLayer`。

---

### P1 — 架构清理，做完项目方向清晰

#### Step 5：删除 V03* 死代码

删除以下 8 个文件及其 `.meta`：
- `V03SceneBootstrap.ts` / `V03MapRuntime.ts` / `V03ContactShadowRuntime.ts`
- `V03VisualRuntime.ts` / `V03ArtSpriteRuntime.ts` / `V03BattleDirector.ts`
- `V03MapContract.ts` / `V03VisualContract.ts`
- 更新 `cocos-v03-demo/README.md` 删掉所有 V03* / "2.5D" / "ortho 斜视" 描述
- 明确写"2D 俯视吸血鬼幸存者风格"

#### Step 6：HP bar / 影子从角色子节点剥离

改为挂在 `worldLayer` 下作为独立节点，注册到一个 `attachments` map，每帧同步：
- `hpBar.position = playerPos + (0, height)`
- `shadow.position = playerPos`

角色 sprite 上做的 scale 动画就不会污染 HP bar 和影子。

#### Step 7：地面视觉打磨

目标：让"地面看起来像地面"，不是"一张大壁纸"。
- 加角色脚底深色椭圆接触阴影（改完锚点后 `spawnContactShadow` 会一下子生效）
- 地面 tile 间随机点缀（裂纹、油渍、深色 patch），避免大片单色
- 地图边界加暗化 / 围墙 / 警戒带，明确"世界范围"
- vignette（`attachVignette` 已存在）调强，强化"中心明、边缘暗"

---

### P2 — 长期改进，可以以后做

#### Step 8：去私有 API 依赖

`BootstrapMain` line 50-57 的 `internal.dynamicAtlasManager` 改为公开 API，或接受锁定 Cocos 3.8.x 版本（在 `package.json` 写死）。

#### Step 9：程序化贴图换成 PNG 资源

`paintFrame` 系列函数（line 333-545）画的 disc / ring / glyph 改为美术出 PNG。CPU 像素循环节省启动时间。

#### Step 10：BootstrapMain → 正经场景

短期保留程序化建场景，长期把 HUD / 地图 / 角色拆成 prefab，让策划/美术能在 Cocos Creator 编辑器里直接调。

---

## 三、执行节奏建议

| 顺序 | 步骤 | 预期效果 | 估时 |
|---|---|---|---|
| 1 | 锚点 + 删 yOffset 补丁 | 角色站在 position 上，不飘 | 30 分钟 |
| 2 | Y-sort | 怪挡玩家 / 玩家挡怪，画面有空间 | 30 分钟 |
| 3 | 摄像机跟随 + 删 clamp + 调整刷怪 | 世界变大，怪从屏幕外追来 | 1-2 小时 |
| 4 | Shake 改摄像机 | 跟随和震屏不打架 | 15 分钟 |
| 5 | 删 V03* 死代码 + 更新 README | 项目方向清晰 | 30 分钟 |
| 6 | HP bar/影子剥离 | 动画不污染 UI | 30 分钟 |
| 7 | 地面视觉打磨 | 看起来像地面 | 1-2 小时 |

**Step 1-4 是核心**，一个晚上能做完，做完游戏感受会有质变。Step 5-7 是清理和打磨，可分多次提交。Step 8-10 排期靠后。

---

## 四、验收标准

每一步做完都要满足：
- 浏览器（`python3 dev-server.py 8080` → `localhost:8080/...`）能正常跑、不报红
- 玩家能用键盘 WASD / 触屏摇杆移动
- 怪能追玩家、自动开火能命中
- 视觉上角色"脚踩地面"、有遮挡关系、摄像机跟人走
- HP bar 在头顶不变形，影子贴脚底不偏移

每个 commit 必须独立可玩（CLAUDE.md 硬约束："每 commit 必须能玩"）。
