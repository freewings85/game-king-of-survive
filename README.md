# 生存之王 (King of Survive)

多人联机竞技生存游戏 + Java Spring Boot 后端。

## 游戏概述

玩家注册登录后进入游戏，选择单排或组队模式。打怪升级获取技能，消灭敌对阵营所有玩家即为胜利。

## 核心玩法

### 游戏模式

- **组队模式 (4v4)**：4 人一队（绿色 vs 红色），两队对抗
  - 同队友方不可攻击（友伤免疫）
  - 当己方全部 4 人阵亡，团队判负
  - 玩家阵亡后可观战队友
  - **团队胜利后触发魔山 Boss 战**：全队一起挑战，击杀获得 500 金币 + 皮肤碎片
- **单排模式 (8人混战)**：8 名玩家各自为战，最后存活者获胜（吃鸡）

### 完整游戏流程

1. **注册/登录** → 访问 `http://localhost:8080`，输入昵称注册
2. **自动签到** → 每日签到奖励（7天循环：金币/经验/皮肤碎片）
3. **选择模式** → 单排（8人混战）或 组队（4v4）
4. **选择角色** → 3 个职业（战士/法师/射手）各有被动技能
5. **选择地图** → 按段位解锁不同地图（绿野平原/暗影森林/熔岩峡谷等）
6. **PvE 阶段** → 打怪升级，选择技能，逐步变强
7. **PvP 对抗** → 消灭所有敌对玩家
   - 30 秒后若仅剩 ≤3 人存活，触发风暴缩圈逼迫决战
8. **胜利/失败** →
   - 组队胜利：触发魔山 Boss 战，击杀获得大量奖励
   - 单排胜利：大吉大利，今晚吃鸡
   - 失败：获得击杀和波次奖励金币
9. **积分结算** → 段位升降

### 战斗机制

- **自动攻击**：自动攻击最近的敌人（怪物和敌方玩家）
- **鼠标/触屏控制**：移动方向
- **技能系统**：升级时从 3 个随机技能中选 1 个
- **新手保护**：开局 5 秒 50% 减伤
- **复活机制**：首次死亡可花费金币原地复活（3 秒无敌 + 清除附近怪物）
- **Bot AI**：
  - 追踪范围 800px，攻击范围 450px
  - 18 伤害 / 0.7 秒冷却
  - 智能走位：躲避风暴、追杀弱敌

### 最终 Boss "魔山"

- **组队模式专属**：团队胜利后自动召唤
- 2000+ HP，随游戏时长持续增强（+10%/分钟）
- 多阶段攻击模式
- 击杀奖励：500 金币 + 皮肤碎片

### 地图系统

- 5 张地图：绿野平原、暗影森林、熔岩峡谷、冰霜荒原、迷雾沼泽
- 不同形状（矩形/六边形/圆形/菱形）
- 世界大小 2400×2400 像素，相机跟随玩家
- 不同区域刷怪速度和类型不同（中心高危高奖、边缘安全低奖）
- 风暴缩圈：30 秒后当存活人数 ≤3 时激活，60→100 px/s 加速收缩

### 角色成长

- **局内成长**：打怪升级 → 选技能 → 变强（30+ 种技能）
- **局外成长**：积分累计 → 段位提升（青铜→白银→黄金→铂金→钻石→大师）
- **永久强化**：金币购买体质/力量/速度/暴击等永久加成
- **皮肤系统**：纯装饰，通过签到/魔山掉落/碎片合成获取

## 技术架构

```
game-king-of-survive/
├── demo/                          # 游戏前端（单文件 Canvas 游戏引擎）
│   └── survivor.html              # 完整游戏 (~4600+ 行)
│
├── server/                        # Java Spring Boot 后端
│   ├── pom.xml                    # Maven 配置 (Spring Boot 2.7.18, Java 8)
│   └── src/main/java/com/kingofsurvive/
│       ├── KingOfSurviveApplication.java
│       ├── config/
│       │   ├── CorsConfig.java          # CORS 跨域配置
│       │   ├── WebConfig.java           # 静态资源服务 (/ → survivor.html)
│       │   └── WebSocketConfig.java     # WebSocket /ws/game
│       ├── controller/
│       │   ├── PlayerController.java    # 注册/查询/皮肤/签到
│       │   ├── RoomController.java      # 房间创建/加入/准备/开始
│       │   └── ScoreController.java     # 积分结算/排名
│       ├── service/
│       │   ├── PlayerService.java       # 等级/段位/皮肤/签到逻辑
│       │   ├── RoomService.java         # 房间管理 (8人/4v4)
│       │   ├── GameService.java         # 积分计算
│       │   └── DailyRewardService.java  # 7天签到奖励循环
│       ├── model/
│       │   ├── Player.java              # 玩家数据
│       │   ├── Room.java / RoomPlayer.java
│       │   ├── GameSession.java / GamePlayerState.java
│       │   ├── ScoreResult.java
│       │   └── DailyReward.java
│       ├── repository/
│       │   ├── PlayerRepository.java    # ConcurrentHashMap 存储
│       │   └── RoomRepository.java
│       └── websocket/
│           └── GameWebSocketHandler.java
│
├── scripts/                       # AI 玩家 + 自动化测试
│   ├── profile_simulator.py       # 8玩家全链路模拟 (注册→游戏→反馈)
│   ├── multiplayer_test.py        # 8人多模式测试 (solo/team)
│   ├── retention_analyst.py       # 留存率分析 (5轮测试)
│   └── visual_player.py           # 视觉/UI 质量测试
│
├── feedback/                      # AI 玩家测试报告
│   ├── profile_simulation_report.json   # 全链路模拟报告
│   ├── multiplayer_test_report.json     # 多人测试报告
│   └── retention_report.json            # 留存分析报告
│
└── README.md
```

### 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/players` | 注册玩家 |
| GET | `/api/players/{id}` | 查询玩家信息 |
| PUT | `/api/players/{id}/equip-skin` | 装备皮肤 |
| POST | `/api/players/{id}/claim-daily-reward` | 领取每日签到奖励 |
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms` | 查看房间列表 |
| POST | `/api/rooms/{id}/join` | 加入房间 |
| POST | `/api/rooms/{id}/ready` | 准备/取消准备 |
| PUT | `/api/rooms/{id}/map` | 选择地图 |
| POST | `/api/rooms/{id}/start` | 开始游戏 |
| POST | `/api/scores/calculate` | 积分结算 |
| GET | `/api/scores/rank/{playerId}` | 查询段位排名 |
| WS | `/ws/game` | 实时对战通信 |

### 技术栈

- **前端**：原生 Canvas API，单 HTML 文件，支持 PC/移动端
- **后端**：Java 8 + Spring Boot 2.7.18
- **通信**：REST API + WebSocket
- **存储**：内存 ConcurrentHashMap（可替换为 MySQL/Redis）
- **测试**：Playwright (Python) 自动化 AI 玩家

## 快速开始

```bash
# 1. 编译后端
cd server
mvn package -DskipTests

# 2. 启动服务器
java -jar target/king-of-survive-server-1.0.0-SNAPSHOT.jar

# 3. 打开浏览器
open http://localhost:8080
```

## AI 玩家模拟测试

```bash
# 8玩家×2模式全链路模拟
uv run python scripts/profile_simulator.py

# 8人多模式测试
uv run python scripts/multiplayer_test.py

# 留存率分析
uv run python scripts/retention_analyst.py
```

模拟器覆盖 8 种玩家画像（男/女 × 少年/青少年/青年/中年），每种画像有不同的操作风格和偏好，全流程测试注册→签到→皮肤→组队→游戏→结算→反馈。

## 段位系统

| 段位 | 积分要求 | 地图等级 |
|------|---------|---------|
| 青铜 | 0-999 | Lv.1 地图 |
| 白银 | 1000-2499 | Lv.2 地图 |
| 黄金 | 2500-4999 | Lv.3 地图 |
| 铂金 | 5000-9999 | Lv.4 地图 |
| 钻石 | 10000-19999 | Lv.5 地图 |
| 大师 | 20000+ | 所有地图 |
