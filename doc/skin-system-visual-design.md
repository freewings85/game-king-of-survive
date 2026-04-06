# 皮肤系统视觉设计方案

> 版本: v1.0 | 日期: 2026-04-06 | 作者: Artist

---

## 一、设计目标

当前角色使用 Canvas 2D 矢量绘制（战士/法师/斥候各有独立造型），皮肤系统需要在保留职业辨识度的基础上，通过**配色替换 + 特效叠加 + 局部造型变体**实现视觉差异化，且不依赖外部图片资源，保持轻量化。

---

## 二、皮肤层级体系

### 2.1 皮肤品质分级

| 品质 | 名称 | 视觉变化范围 | 边框色 | 背景色 |
|------|------|-------------|--------|--------|
| C | 普通 | 仅配色替换 | `#aaaaaa` | `#333333` |
| B | 精良 | 配色替换 + 描边光效 | `#4488ff` | `#1a2a44` |
| A | 史诗 | 配色替换 + 粒子特效 + 造型微调 | `#cc66ff` | `#2a1a3a` |
| S | 传说 | 全新配色 + 粒子特效 + 造型变体 + 专属光环 | `#ffaa00` | `#3a2a10` |

### 2.2 皮肤视觉组成层

每个皮肤由以下视觉层叠加渲染（从底层到顶层）：

```
Layer 0: 光环层 (aura)        — S级专属，角色脚下的循环动画
Layer 1: 身体层 (body)        — 主体造型，受配色方案控制
Layer 2: 装饰层 (accessory)   — 武器/护甲/披风的颜色与造型变体
Layer 3: 特效层 (particle)    — A/S级，环绕粒子或拖尾效果
Layer 4: 边框层 (outline)     — B级以上，发光描边
```

---

## 三、现有皮肤视觉规格

### 3.1 职业基础色 (Default 皮肤)

| 职业 | 身体主色 | 装饰色 | 眼睛色 | 角色标识色(characters.json) |
|------|---------|--------|--------|--------------------------|
| 战士 warrior | `#b44` | `#d93` (肩甲) / `#888` (盾) | `#fff` | `#f44` |
| 法师 mage | `#728` | `#5a3d7a` (兜帽) / `#c6f` (法球) | `#f0f` | `#a4f` |
| 斥候 scout | `#3a6` | `#2a5030` (斗篷) / `#a86` (弓) | `#8f8` | `#4f4` |

### 3.2 已注册皮肤配色方案

#### 原色系皮肤 (C级 - 配色替换)

| skinId | 皮肤名 | 适用职业 | 身体主色 | 装饰色 | 高光色 |
|--------|--------|---------|---------|--------|--------|
| `warrior_red` | 烈焰战士 | warrior | `#cc2222` | `#ff6633` | `#ffaa44` |
| `warrior_blue` | 寒冰战士 | warrior | `#2244aa` | `#4488dd` | `#88ccff` |
| `forest_green` | 翠林迷彩 | 通用 | `#2a6633` | `#44aa55` | `#88dd77` |

#### 主题系皮肤 (B级 - 配色 + 描边光效)

| skinId | 皮肤名 | 身体主色 | 装饰色 | 光效描边色 | 描边宽度 |
|--------|--------|---------|--------|-----------|---------|
| `flame_red` | 炎之纹章 | `#aa2200` | `#ff4400` | `#ff6622` | 2px |
| `ice_blue` | 冰霜之心 | `#1144aa` | `#2266cc` | `#66bbff` | 2px |
| `shadow_purple` | 暗影紫雾 | `#3a1155` | `#6622aa` | `#9944ff` | 2px |

#### 稀有皮肤 (A级 - 配色 + 粒子特效)

| skinId | 皮肤名 | 身体主色 | 装饰色 | 粒子颜色 | 粒子类型 | 粒子数量 |
|--------|--------|---------|--------|---------|---------|---------|
| `cherry_blossom` | 樱花绽放 | `#cc6688` | `#ff88aa` | `#ffaacc` | 花瓣飘落 | 6 |
| `ocean_wave` | 海浪潮涌 | `#1155aa` | `#2288cc` | `#44ccff` | 水滴环绕 | 5 |
| `autumn_leaf` | 秋叶知秋 | `#aa6622` | `#cc8833` | `#ffaa33` | 枫叶飘落 | 6 |

#### 传说皮肤 (S级 - 全套特效)

| skinId | 皮肤名 | 身体主色 | 装饰色 | 粒子色 | 光环色 | 光环半径 |
|--------|--------|---------|--------|--------|--------|---------|
| `knight_gold` | 黄金圣骑 | `#aa8822` | `#ffcc44` | `#ffe866` | `#ffdd44` | radius * 3.0 |
| `ninja_shadow` | 暗影忍者 | `#1a1a2e` | `#333355` | `#6644aa` | `#442266` | radius * 2.5 |
| `starlight` | 星辰之光 | `#2233aa` | `#4466dd` | `#aaccff` | `#6688ff` | radius * 3.0 |
| `neon_cyber` | 霓虹机甲 | `#0a0a1a` | `#00ffaa` | `#00ff88` | `#00ffcc` | radius * 2.8 |
| `royal_gold` | 皇家金铠 | `#886622` | `#ddaa33` | `#ffcc00` | `#ffbb22` | radius * 3.0 |
| `mage_purple` | 大魔导师 | `#44226a` | `#8844cc` | `#cc88ff` | `#9955dd` | radius * 2.8 |

---

## 四、视觉特效规格

### 4.1 描边光效 (B级以上)

```javascript
// 伪代码示例
ctx.shadowColor = skin.outlineColor;
ctx.shadowBlur = skin.tier === 'S' ? 12 : (skin.tier === 'A' ? 8 : 5);
ctx.strokeStyle = skin.outlineColor;
ctx.lineWidth = skin.outlineWidth || 2;
// 绘制角色轮廓后 stroke
```

- 光效脉动: `alpha = 0.6 + 0.4 * sin(gameTime * 3)`
- B级: shadowBlur = 5, 纯静态描边
- A级: shadowBlur = 8, 脉动描边
- S级: shadowBlur = 12, 强脉动 + 颜色呼吸

### 4.2 粒子特效 (A级以上)

#### 花瓣飘落 (cherry_blossom / autumn_leaf)

```
粒子数量: 6
运动轨迹: 螺旋下落, angle += gameTime * 1.5 + i * PI*2/count
分布半径: radius * 1.5 ~ radius * 2.5
粒子大小: radius * 0.08 ~ 0.12
透明度: 0.3 + 0.4 * sin(gameTime * 2 + i)
形状: 小椭圆 (花瓣) / 三角形 (枫叶)
```

#### 水滴环绕 (ocean_wave)

```
粒子数量: 5
运动轨迹: 正弦波环绕, 匀速旋转
分布半径: radius * 1.2 ~ radius * 2.0
粒子大小: radius * 0.06 ~ 0.10
透明度: 0.4 + 0.3 * sin(gameTime * 3)
形状: 圆形 (水滴)
```

#### 星光闪烁 (starlight / neon_cyber)

```
粒子数量: 8
运动轨迹: 随机闪烁位置, 每0.5s重新定位
分布半径: radius * 1.0 ~ radius * 3.0
粒子大小: radius * 0.04 ~ 0.08
透明度: 随机 0.2 ~ 1.0, 闪烁频率 = gameTime * 6
形状: 星形 (5角) / 圆点
```

### 4.3 光环特效 (S级专属)

```
渲染层级: 最底层 (Layer 0), 在角色身体之下
形状: 圆形渐变
内径: radius * 0.5
外径: skin.auraRadius (见上表)
颜色: 中心 skin.auraColor alpha=0.3 → 边缘 alpha=0
旋转: angle += gameTime * 1.0
附加: 2条交叉光带, 宽度=外径*0.1, 随角度旋转
脉动: 外径 *= 1.0 + 0.08 * sin(gameTime * 2)
```

---

## 五、皮肤数据格式规格

### 5.1 皮肤配置 JSON Schema

建议新增 `data/skins.json`，每个皮肤的完整视觉数据：

```json
{
  "knight_gold": {
    "name": "黄金圣骑",
    "description": "闪耀的黄金圣骑士铠甲",
    "tier": "S",
    "applicableClasses": ["warrior", "scout", "mage"],
    "colors": {
      "body": "#aa8822",
      "accent": "#ffcc44",
      "highlight": "#ffe866",
      "eye": "#fff8cc"
    },
    "outline": {
      "enabled": true,
      "color": "#ffcc44",
      "width": 2,
      "shadowBlur": 12,
      "pulse": true
    },
    "particles": {
      "enabled": true,
      "type": "sparkle",
      "count": 8,
      "color": "#ffe866",
      "sizeRange": [0.04, 0.08],
      "radiusRange": [1.5, 3.0],
      "speed": 2.0,
      "alpha": [0.3, 0.9]
    },
    "aura": {
      "enabled": true,
      "color": "#ffdd44",
      "radiusMultiplier": 3.0,
      "rotationSpeed": 1.0,
      "pulse": true
    },
    "obtain": {
      "method": "craft",
      "cost": { "skinFragments": 50 }
    }
  }
}
```

### 5.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | Y | 皮肤中文名 |
| `description` | string | Y | 皮肤描述文本 |
| `tier` | enum | Y | 品质: `C` / `B` / `A` / `S` |
| `applicableClasses` | string[] | Y | 适用职业列表, `["warrior","mage","scout"]` 表示通用 |
| `colors.body` | hex | Y | 身体主色, 替换职业默认主色 |
| `colors.accent` | hex | Y | 装饰色, 替换肩甲/兜帽/斗篷色 |
| `colors.highlight` | hex | N | 高光色, 用于武器和特殊部位 |
| `colors.eye` | hex | N | 眼睛颜色 |
| `outline.enabled` | bool | Y | 是否启用描边光效 (B级以上=true) |
| `outline.color` | hex | N | 描边颜色 |
| `outline.width` | number | N | 描边宽度, 默认2 |
| `outline.shadowBlur` | number | N | 光晕强度 |
| `outline.pulse` | bool | N | 是否脉动 |
| `particles.enabled` | bool | Y | 是否启用粒子 (A级以上=true) |
| `particles.type` | enum | N | 粒子形状: `petal` / `droplet` / `sparkle` / `leaf` / `ring` |
| `particles.count` | number | N | 粒子数量 |
| `particles.color` | hex | N | 粒子颜色 |
| `particles.sizeRange` | [min,max] | N | 相对于radius的大小范围 |
| `particles.radiusRange` | [min,max] | N | 相对于radius的分布距离 |
| `particles.speed` | number | N | 运动速度系数 |
| `aura.enabled` | bool | Y | 是否启用光环 (S级=true) |
| `aura.color` | hex | N | 光环颜色 |
| `aura.radiusMultiplier` | number | N | 光环外径 = radius * 此值 |

---

## 六、渲染实现指南

### 6.1 drawCharacterSprite 改造方案

现有 `drawCharacterSprite(cx, cy, radius, classType, facingAngle, options)` 函数需要扩展 `options` 参数：

```javascript
options = {
  // 现有参数
  fury: false,
  shield: false,
  alpha: 1,
  isBot: false,
  color: '#4488ff',
  
  // 新增皮肤参数
  skinId: 'default',
  skinData: null  // 从 skins.json 加载的完整皮肤配置
};
```

### 6.2 渲染流程

```
1. 获取皮肤配置 skinData
2. 如果 skinData.aura.enabled → 绘制光环 (Layer 0)
3. 根据 skinData.colors 替换职业默认色
4. 调用原有职业绘制逻辑 (Layer 1 + Layer 2)
5. 如果 skinData.outline.enabled → 叠加描边光效 (Layer 4)
6. 如果 skinData.particles.enabled → 绘制粒子特效 (Layer 3)
```

### 6.3 性能约束

- 粒子数量: 单个角色最多 8 个, 全屏最多 80 个粒子
- 光环渐变: 使用预计算的 radialGradient, 不要每帧创建
- shadowBlur: 仅对本地玩家和视野内玩家启用, 远处玩家降级为纯色描边
- Bot 玩家: 默认不渲染 A/S 级特效, 仅应用配色

---

## 七、UI 界面设计

### 7.1 皮肤选择界面

```
┌─────────────────────────────────┐
│  ◀  皮肤商店  ▶                  │
├─────────────────────────────────┤
│                                 │
│    ┌─────┐  ┌─────┐  ┌─────┐  │
│    │     │  │     │  │     │  │
│    │ 预览 │  │ 预览 │  │ 预览 │  │
│    │ 动画 │  │ 动画 │  │ 动画 │  │
│    │     │  │     │  │     │  │
│    └──┬──┘  └──┬──┘  └──┬──┘  │
│    皮肤名    皮肤名    皮肤名   │
│    ★★☆☆    ★★★☆    ★★★★   │
│                                 │
│  ┌─────────────────────────┐   │
│  │    选中皮肤大图预览       │   │
│  │    (带完整特效动画)       │   │
│  │    角色缓慢旋转展示       │   │
│  └─────────────────────────┘   │
│                                 │
│  皮肤名称: 黄金圣骑             │
│  品质: ★★★★ 传说               │
│  碎片: 23/50                    │
│                                 │
│  [ 装备 ]    [ 合成 ]           │
└─────────────────────────────────┘
```

### 7.2 皮肤预览卡片规格

| 属性 | 数值 |
|------|------|
| 卡片尺寸 | 120 x 160 px |
| 预览区域 | 100 x 100 px (居中) |
| 角色预览大小 | radius = 30 px |
| 预览动画 | 角色原地旋转, 周期 4s |
| 品质边框宽度 | 2px, 颜色随品质 |
| 名称字体 | 14px, 白色 |
| 品质标识 | 星星数量 (C=1, B=2, A=3, S=4), 颜色随品质 |

### 7.3 大图预览规格

| 属性 | 数值 |
|------|------|
| 预览区域 | 280 x 200 px |
| 角色大小 | radius = 50 px |
| 旋转速度 | 2π / 4s |
| 背景 | 径向渐变, 中心皮肤品质色, 边缘 `#111` |
| 特效完整展示 | 所有层级全部渲染 |

---

## 八、皮肤获取途径视觉提示

| 获取方式 | 图标 | 颜色标识 |
|---------|------|---------|
| 默认拥有 | — | 无特殊标识 |
| 碎片合成 | 🔧 | 品质边框色 |
| 成就解锁 | 🏆 | `#ffcc00` |
| 赛季奖励 | 👑 | `#ff6600` |

未拥有皮肤卡片: 灰度显示 (filter: grayscale(0.8)), 叠加锁图标。

---

## 九、交付清单

| 交付物 | 格式 | 状态 |
|--------|------|------|
| 皮肤视觉设计方案 (本文档) | Markdown | ✅ 完成 |
| 皮肤 JSON 数据格式定义 | JSON Schema | ✅ 完成 (见第五节) |
| 各品质配色表 | 表格 | ✅ 完成 (见第三节) |
| 特效参数规格 | 详细参数 | ✅ 完成 (见第四节) |
| UI 布局规格 | 线框图 | ✅ 完成 (见第七节) |
| `data/skins.json` 数据文件 | JSON | 待 Developer 对接后输出 |

---

## 十、给 Developer 的对接说明

1. **改造 `drawCharacterSprite`**: 在现有职业绘制逻辑外包裹皮肤层, 通过 `skinData.colors` 替换硬编码颜色值
2. **新增 `data/skins.json`**: 按第五节 Schema 定义, 我会提供完整数据文件
3. **服务端 `SkinInfo` 扩展**: 当前 model 只有 id/name/description, 需要扩展视觉相关字段或前端直接读取 skins.json
4. **性能注意**: Bot 玩家降级渲染, 仅应用配色不渲染粒子/光环
