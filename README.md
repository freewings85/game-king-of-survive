# 生存之王 (King of Survive)

多人联机竞技生存微信小游戏 + Java Spring 后端。

## 游戏概述

玩家进入地图后，打怪升级获取技能，消灭敌对阵营所有玩家即为胜利。胜利后可选择继续刷怪或挑战最终 Boss "魔山"，获得积分和皮肤碎片。

## 核心玩法

### 游戏模式
- **组队模式 (4v4)**：4 人一队，两队对抗
- **单排模式 (8×1)**：8 名玩家各自为战，最后存活者胜

### 游戏流程
1. **匹配/组队** → 选择地图 → 进入游戏
2. **PvE 阶段**：打地图上的怪物，获取经验和技能
3. **PvP 对抗**：消灭所有敌对阵营玩家
4. **胜利后**：
   - 可选择继续刷小怪获取额外积分
   - 可选择挑战最终 Boss "魔山"（随时间增强）
5. **结算**：积分 + 皮肤碎片（魔山掉落概率）

### 地图系统
- 按玩家等级分级（青铜、白银、黄金、铂金、钻石...）
- 每个等级有多张地图可选
- 地图形状不同，大小一致
- **地图大小**：约 3-4 个手机屏幕大小（2400×2400 像素），玩家通过移动/滑动探索
- **相机跟随**：视口跟随本地玩家，靠近边缘时视口滚动
- 不同区域刷怪速度不同
- 地图上有刷怪点（中心危险高奖励，边缘安全低奖励）

### 战斗规则
- **友方不可攻击**（组队模式下同队互相免伤）
- **敌对阵营可互相攻击**
- 自动攻击最近敌人（继承幸存者玩法）
- 技能通过升级选择获取

### 角色成长
- **局内成长**：打怪 → 升级 → 选技能 → 变强
- **局外成长**：积分累计 → 段位提升（类似英雄联盟）
- **皮肤系统**：纯装饰，不影响攻击力
  - 日常登录奖励
  - 魔山掉落皮肤碎片

### 最终 Boss "魔山"
- 胜利后可选挑战
- 随游戏时长持续增强
- 击杀后有概率获得皮肤碎片
- 按耗时计算额外积分

## 技术架构

```
game-king-of-survive/
├── client/                    # 微信小游戏前端
│   ├── game.js               # 游戏主逻辑（Canvas 渲染）
│   ├── game.json
│   ├── project.config.json
│   ├── js/
│   │   ├── core/             # 游戏核心引擎
│   │   │   ├── game-engine.js
│   │   │   ├── renderer.js
│   │   │   ├── input.js
│   │   │   └── camera.js
│   │   ├── entities/         # 游戏实体
│   │   │   ├── player.js
│   │   │   ├── enemy.js
│   │   │   ├── boss.js
│   │   │   └── projectile.js
│   │   ├── systems/          # 游戏系统
│   │   │   ├── skill-system.js
│   │   │   ├── combat.js
│   │   │   ├── spawn.js
│   │   │   └── map.js
│   │   ├── net/              # 网络通信
│   │   │   ├── websocket.js
│   │   │   └── protocol.js
│   │   └── ui/               # UI 界面
│   │       ├── hud.js
│   │       ├── lobby.js
│   │       ├── shop.js
│   │       └── result.js
│   └── assets/               # 资源文件
│       ├── images/
│       └── audio/
│
├── server/                    # Java Spring 后端
│   ├── pom.xml
│   └── src/main/java/com/kingofsurvive/
│       ├── KingOfSurviveApplication.java
│       ├── config/
│       │   ├── WebSocketConfig.java
│       │   └── SecurityConfig.java
│       ├── controller/
│       │   ├── AuthController.java
│       │   ├── MatchController.java
│       │   ├── RankController.java
│       │   └── ShopController.java
│       ├── service/
│       │   ├── GameRoomService.java
│       │   ├── MatchmakingService.java
│       │   ├── RankService.java
│       │   ├── SkinService.java
│       │   └── DailyRewardService.java
│       ├── model/
│       │   ├── Player.java
│       │   ├── GameRoom.java
│       │   ├── Rank.java
│       │   ├── Skin.java
│       │   └── MapConfig.java
│       ├── websocket/
│       │   ├── GameWebSocketHandler.java
│       │   └── GameProtocol.java
│       └── repository/
│           ├── PlayerRepository.java
│           └── RankRepository.java
│
├── demo/                      # 单机演示版（基于现有 survivor.html 迭代）
│   └── survivor.html
│
├── doc/                       # 设计文档
│   └── game-design.md
│
├── scripts/                   # AI 玩家 + 自动化脚本
│   ├── survivor_sim.js
│   ├── visual_player.py
│   ├── retention_analyst.py
│   └── feedback_to_stories.py
│
├── tests/                     # 测试文件
├── feedback/                  # AI 玩家反馈数据
├── prd.json                   # auto-developing 任务定义
└── CLAUDE.md                  # AI 开发规则
```

### 后端技术栈
- Java 17 + Spring Boot 3
- WebSocket (实时对战通信)
- MySQL (玩家数据、排名)
- Redis (匹配队列、房间状态)
- Spring Security (微信登录)

### 前端技术栈
- 微信小游戏 Canvas API
- WebSocket 客户端
- 基于现有 survivor.html 游戏引擎迭代

## 开发方法论

使用 auto-developing 框架进行迭代开发：
- AI 玩家持续后台运行，收集游戏体验反馈
- feedback_to_stories.py 将反馈转化为 prd.json 任务
- 每轮迭代实现 → 测试 → 提交 GitHub → 继续迭代

## 段位系统

| 段位 | 积分要求 | 地图等级 |
|------|---------|---------|
| 青铜 | 0-999 | Lv.1 地图 |
| 白银 | 1000-2499 | Lv.2 地图 |
| 黄金 | 2500-4999 | Lv.3 地图 |
| 铂金 | 5000-9999 | Lv.4 地图 |
| 钻石 | 10000-19999 | Lv.5 地图 |
| 大师 | 20000+ | 所有地图 |
