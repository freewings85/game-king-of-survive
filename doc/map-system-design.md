# 地图系统设计方案 v1.0

> 作者：GameDesigner | 日期：2026-04-06

---

## 一、设计目标

将当前地图从"平坦空地+全局刷怪"升级为**分区化、功能明确、策略丰富**的战场。参考王者荣耀/LOL的地图设计思路，让玩家在不同区域有不同的体验和决策。

---

## 二、地图分区体系

### 2.1 通用分区模板

所有地图共享以下**六大功能区域**，具体形状和面积根据地图主题调整：

| 区域类型 | 英文标识 | 功能定位 | 占地比例 |
|---------|---------|---------|---------|
| 出生安全区 | `spawn_safe` | 玩家复活/初始区域，无怪物，短暂无敌 | 5-8% |
| 外围猎场 | `outer_farm` | 低级怪密集，适合前期刷经验 | 25-30% |
| 野区丛林 | `jungle` | 中等难度，固定刷怪营地，有草丛掩护 | 20-25% |
| 河道/通道 | `river` | 连接各区域的狭窄地带，有宝藏怪出没 | 8-12% |
| 精英领地 | `elite_zone` | 高难度精英怪，高收益 | 15-20% |
| Boss巢穴 | `boss_lair` | 地图中央或特殊位置，Boss定期刷新 | 5-8% |

### 2.2 地形元素

每个区域可包含以下地形元素：

| 地形 | 标识 | 效果 |
|-----|------|-----|
| 草丛 | `brush` | 进入后对远处敌人隐身，离开后0.5秒显形 |
| 障碍物/墙壁 | `wall` | 不可通行，阻挡弹道 |
| 高地 | `elevation` | 站在高地向低地攻击+10%伤害 |
| 窄道 | `chokepoint` | 狭窄通路，适合伏击，限制走位 |
| 恢复泉 | `heal_spring` | 站在范围内每秒恢复2%最大HP |
| 危险地带 | `hazard_terrain` | 如岩浆/毒沼，每秒扣1%最大HP |

### 2.3 以"绿野平原"为模板的标准布局

```
+--------------------------------------------------+
|  [spawn_safe]    [outer_farm - 北]   [spawn_safe] |
|      NW              N                   NE       |
|                                                   |
| [outer_farm]   [jungle-NW]  [jungle-NE]  [outer] |
|     W        ___草丛___  ___草丛___        E      |
|             |  营地A  |  |  营地B  |              |
|  [river-W]  |_________|  |_________|  [river-E]   |
|    ~~~~      \                  /      ~~~~       |
|     ~~~~      \  [boss_lair]  /      ~~~~         |
|      ~~~~      \   中央Boss  /      ~~~~          |
|    ~~~~        /  __________  \      ~~~~         |
|   ~~~~        /  |elite_zone|  \      ~~~~        |
|  [river-W]   /   |  精英领地 |   \   [river-E]    |
|             |  营地C  |  |  营地D  |              |
|  [outer_farm]___草丛___|___草丛___  [outer_farm]  |
|     W                                     E       |
|                                                   |
|  [spawn_safe]    [outer_farm - 南]   [spawn_safe] |
|      SW              S                   SE       |
+--------------------------------------------------+
```

**关键设计要点：**
- 4个角落为出生安全区（多人对战时分散出生）
- 外围一圈为低级猎场，新手友好
- 中间层为野区丛林，有固定营地和草丛
- 河道贯穿左右，连接上下区域，是争夺要道
- 中央偏上为Boss巢穴，中央偏下为精英领地
- 对称设计保证公平性

---

## 三、刷怪规则设计

### 3.1 区域怪物分配

| 区域 | 刷怪类型 | 怪物等级 | 刷怪密度 | 刷新间隔 |
|------|---------|---------|---------|---------|
| `spawn_safe` | **无怪物** | - | 0 | - |
| `outer_farm` | normal(50%), swarm(30%), fast(20%) | 地图minLv ~ minLv+2 | 高 (1.3x) | 5秒 |
| `jungle` | fast(30%), normal(25%), ranged(25%), tank(20%) | minLv+1 ~ minLv+4 | 中 (1.0x) | 8秒 |
| `river` | treasure(40%), fast(40%), swarm(20%) | minLv ~ minLv+3 | 低 (0.6x) | 12秒 |
| `elite_zone` | miniBoss(30%), tank(30%), ranged(25%), fast(15%) | minLv+3 ~ maxLv | 中高 (1.2x) | 10秒 |
| `boss_lair` | boss(固定), miniBoss(护卫) | maxLv | 固定 | 见Boss规则 |

### 3.2 固定营地（Spawn Camps）规则

每张地图设置 **6-8个固定营地**，分布在jungle和elite_zone中：

#### 营地模板

| 营地类型 | 怪物组成 | 首次刷新 | 重生冷却 | 最大重生次数 | 奖励特色 |
|---------|---------|---------|---------|------------|---------|
| 小型营地 | 2 normal + 1 fast | 10秒 | 25秒 | 无限 | 基础经验 |
| 中型营地 | 1 tank + 2 ranged + 1 fast | 15秒 | 35秒 | 无限 | 中等经验 |
| 精英营地 | 1 miniBoss + 2 tank | 30秒 | 60秒 | 5次 | 高经验+金币 |
| 宝藏营地 | 1 treasure + 2 swarm(护卫) | 20秒 | 45秒 | 3次 | 大量金币 |
| Boss营地 | 1 boss + 2 miniBoss | 60秒 | 120秒 | 1次 | 顶级奖励 |
| 伏击营地 | 4 fast + 2 swarm | 15秒 | 30秒 | 无限 | 中等经验(密集) |

### 3.3 动态刷怪（Trickle + Wave）规则

在固定营地之外，每个区域还有**动态刷怪**：

**Trickle（涓流刷怪）：**
- 每个区域独立计时，按区域的 `spawnRate` 和 `trickleInterval` 刷怪
- 怪物类型按区域分配表随机选取
- 全图同时存活怪物上限：**50**（从当前35提升）
- 单区域存活上限：按区域面积比例分配

**Wave（波次刷怪）：**
- 全图波次计时器不变，但波次怪物**按区域分散生成**
- 波次怪物的60%生成在玩家所在区域及相邻区域
- 波次怪物的40%随机分布在其他区域
- Boss波次时，Boss固定在 `boss_lair` 生成

### 3.4 难度梯度曲线

游戏时间推进，刷怪规则动态调整：

| 阶段 | 时间 | 特征 |
|------|------|------|
| 早期 | 0-60秒 | 仅 outer_farm 和部分 jungle 有怪，引导玩家熟悉 |
| 中前期 | 60-120秒 | 全区域激活，river开始出现treasure |
| 中期 | 120-240秒 | elite_zone 精英怪增多，营地全部激活 |
| 后期 | 240-360秒 | 全图怪物等级+2，刷新加速20% |
| 终局 | 360秒+ | Boss营地激活，缩圈开始，怪物向安全区集中 |

### 3.5 区域感知刷怪（Zone-Aware Spawning）

**核心改进：** 当前刷怪是全局的，需要改为区域感知：

```
怪物生成位置选择逻辑：
1. 确定目标区域（根据刷怪类型和当前阶段）
2. 在区域bounds内随机选点
3. 检查是否与障碍物重叠 → 重选
4. 检查是否在玩家视野外（至少200px） → 优先视野外
5. 检查区域存活上限 → 超限则跳过
6. 生成怪物，等级取区域monsterLevel范围内随机值
```

---

## 四、各地图分区方案

### 4.1 绿野平原（Bronze入门图）

- **设计理念：** 对称简洁，教学友好
- **分区：** 4个角落安全区 → 外围猎场环 → 4个丛林营地 → 中央河道 → 1个Boss点
- **特色：** 草丛少，视野开阔，适合新手
- **营地数：** 6个（4小型 + 1宝藏 + 1Boss）

### 4.2 暗影森林（Bronze进阶图）

- **设计理念：** 大量草丛，强调视野博弈
- **分区：** 入口安全区 → 外围稀疏林 → 密林丛林区(多草丛) → 树冠河道 → 深处精英区 → 古树Boss巢穴
- **特色：** 草丛覆盖率高达40%，伏击营地多
- **营地数：** 8个（3小型 + 2伏击 + 1精英 + 1宝藏 + 1Boss）

### 4.3 熔岩峡谷（Bronze挑战图）

- **设计理念：** 环形地图，危险地形多
- **分区：** 边缘安全区 → 岩石猎场 → 岩洞丛林 → 熔岩河(hazard河道) → 火山口Boss区
- **特色：** 河道是熔岩河，站立扣血；圆形地图无死角
- **营地数：** 6个（2小型 + 2中型 + 1精英 + 1Boss）

### 4.4 冰霜荒原（Silver）

- **设计理念：** 暴风雪机制，移速debuff
- **特色：** hazard区域会降低移速15%，草丛被雪覆盖（进入才能发现）
- **营地数：** 7个

### 4.5 迷雾沼泽（Silver）

- **设计理念：** 视野极度受限，探索感强
- **特色：** 全图迷雾，仅照亮周围250px；沼泽地形减速
- **营地数：** 7个

### 4.6 龙脊山脉（Silver）

- **设计理念：** 高低差地形，垂直策略
- **特色：** 大量高地地形，高打低有伤害加成；龙巢Boss区
- **营地数：** 8个

### 4.7 天空竞技场（Gold）

- **设计理念：** 紧凑高强度PvE
- **特色：** 地图偏小，刷怪密度极高，elite_zone占比大
- **营地数：** 6个（高难度为主）

### 4.8 虚空深渊（Gold）

- **设计理念：** 极端环境，步步危机
- **特色：** hazard地形覆盖率高，虚空裂隙随机传送
- **营地数：** 8个

### 4.9 永恒之地（Gold终局图）

- **设计理念：** 全要素汇聚的终极地图
- **特色：** 包含所有地形类型，最高难度，双Boss机制
- **营地数：** 10个（含2个Boss营地）

---

## 五、数据结构扩展

### 5.1 Zone 结构升级

```json
{
  "name": "西部丛林",
  "type": "jungle",
  "bounds": { "x": 100, "y": 400, "width": 300, "height": 400 },
  "monsterLevel": [2, 5],
  "spawnRate": 1.0,
  "maxAlive": 8,
  "activateTime": 0,
  "monsterWeights": {
    "fast": 30,
    "normal": 25,
    "ranged": 25,
    "tank": 20
  },
  "terrainFeatures": [
    { "type": "brush", "x": 150, "y": 450, "width": 80, "height": 60 },
    { "type": "brush", "x": 250, "y": 600, "width": 60, "height": 80 }
  ]
}
```

新增字段说明：
- `maxAlive`: 该区域最大同时存活怪物数
- `activateTime`: 该区域开始刷怪的游戏时间（秒），用于控制难度梯度
- `monsterWeights`: 该区域各怪物类型的权重分配
- `terrainFeatures`: 区域内的地形元素列表

### 5.2 Terrain Feature 结构

```json
{
  "type": "brush|wall|elevation|chokepoint|heal_spring|hazard_terrain",
  "x": 150,
  "y": 450,
  "width": 80,
  "height": 60,
  "shape": "rect|circle",
  "effect": {
    "stealth": true,
    "damagePerSec": 0,
    "healPerSec": 0,
    "speedModifier": 1.0,
    "visionBlock": false,
    "projectileBlock": false
  }
}
```

### 5.3 SpawnCamp 结构保持兼容

现有的 `spawnCamps` 结构已经很完善，只需新增一个字段：

```json
{
  "id": "jungle_camp_nw",
  "zoneRef": "西部丛林",
  ... (现有字段不变)
}
```

`zoneRef` 关联到所属区域，方便查询。

---

## 六、与缩圈系统的联动

当前已有 Storm 缩圈系统，需要与分区联动：

1. **缩圈优先压缩外围区域** — outer_farm 最先被圈外覆盖
2. **安全区内刷怪加密** — 缩圈后存活区域的刷怪密度自动提升
3. **被缩圈覆盖的营地停止刷新** — 节省性能
4. **圈外怪物获得移速加成** — 被圈外逼入的怪物会追向安全区

---

## 七、实施建议

### 优先级排序

| 优先级 | 内容 | 工作量评估 |
|-------|------|-----------|
| P0 | Zone结构升级 + 区域感知刷怪 | 后端重构SpawnSystem |
| P0 | 绿野平原完整分区数据 | 数据配置 |
| P1 | 地形元素渲染（草丛、墙壁） | 前端+后端 |
| P1 | 剩余8张地图分区数据 | 数据配置 |
| P2 | 高地/恢复泉等高级地形 | 前后端 |
| P2 | 缩圈联动 | 后端 |

### 给 Developer 的关键改动点

1. **SpawnSystem.java** — 核心改造：刷怪逻辑从全局改为按Zone分区执行
2. **MapData.java** — 扩展Zone和TerrainFeature的数据结构
3. **GameSimulation.java** — 碰撞检测需要支持墙壁/地形
4. **前端渲染** — 需要绘制草丛、墙壁、高地等地形元素
5. **data/maps/*.json** — 所有地图JSON需要更新分区数据

---

## 八、绿野平原完整分区数据示例

作为第一张实施的参考，附完整JSON片段（见附录或由Developer落地时细化）。

核心zone列表：
```json
[
  { "name": "西北安全区", "type": "spawn_safe", "bounds": {"x":0,"y":0,"w":200,"h":200}, "monsterLevel":[1,1], "spawnRate":0, "maxAlive":0, "activateTime":999 },
  { "name": "北部猎场", "type": "outer_farm", "bounds": {"x":200,"y":0,"w":800,"h":200}, "monsterLevel":[1,3], "spawnRate":1.3, "maxAlive":8, "activateTime":0, "monsterWeights":{"normal":50,"swarm":30,"fast":20} },
  { "name": "西部丛林", "type": "jungle", "bounds": {"x":0,"y":300,"w":400,"h":400}, "monsterLevel":[2,5], "spawnRate":1.0, "maxAlive":6, "activateTime":0, "monsterWeights":{"fast":30,"normal":25,"ranged":25,"tank":20} },
  { "name": "东部丛林", "type": "jungle", "bounds": {"x":800,"y":300,"w":400,"h":400}, "monsterLevel":[2,5], "spawnRate":1.0, "maxAlive":6, "activateTime":0, "monsterWeights":{"fast":30,"normal":25,"ranged":25,"tank":20} },
  { "name": "中央河道", "type": "river", "bounds": {"x":400,"y":250,"w":400,"h":100}, "monsterLevel":[1,4], "spawnRate":0.6, "maxAlive":3, "activateTime":60, "monsterWeights":{"treasure":40,"fast":40,"swarm":20} },
  { "name": "精英领地", "type": "elite_zone", "bounds": {"x":350,"y":700,"w":500,"h":300}, "monsterLevel":[4,7], "spawnRate":1.2, "maxAlive":6, "activateTime":120, "monsterWeights":{"miniBoss":30,"tank":30,"ranged":25,"fast":15} },
  { "name": "Boss巢穴", "type": "boss_lair", "bounds": {"x":500,"y":450,"w":200,"h":200}, "monsterLevel":[5,7], "spawnRate":0, "maxAlive":3, "activateTime":300 }
]
```

---

*方案完成，请 @PM @Developer @Testor 评审。有问题随时讨论。*
