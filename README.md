# 生存之王 / King of Survive

手机端 2D 俯视吃鸡 + MOBA + 大秘境的 demo 项目。一个 HTML 文件 + AI 团队迭代驱动开发。

> 这份 README 是「上手即维护」级文档：覆盖架构、玩法、本地启动、QA、AI 迭代流程、项目结构。新人按此文档应能：① 看懂一个 HTML 文件如何成为完整游戏；② 本机起服务玩一把；③ 跑 playwright 自测；④ 跟 GameDev AI 团队协作派活；⑤ 知道当前的稳态评分基线和迭代节奏。

---

## 目录

- [一、它是什么](#一它是什么)
- [二、快速启动](#二快速启动)
- [三、架构](#三架构)
- [四、游戏设计概览](#四游戏设计概览)
- [五、地图系统](#五地图系统)
- [六、QA 与 Playwright 测试](#六qa-与-playwright-测试)
- [七、AI 团队迭代流程（当前开发模式）](#七ai-团队迭代流程当前开发模式)
- [八、项目结构](#八项目结构)
- [九、运维与日常](#九运维与日常)
- [十、词汇表](#十词汇表)

---

## 一、它是什么

### 核心定位
- **平台**：手机浏览器（iPhone 14 viewport 为基准），单 HTML 启动
- **玩法**：BR 吃鸡（8 人混战 / 4v4 团战）+ 局内 MOBA 风格成长 + 大秘境 PvE
- **目标**：达到「朋友能玩两把不腻」的 demo（路线图目标 A），**不是**长期运营级产品
- **关键文件**：`demo/survivor.html`（**14059 行**单文件游戏，含全部逻辑/UI/渲染/AI bot/网络）

### 当前状态（2026-04-25）
- 156 commits，HEAD `c9cfdc7`
- 稳态评分 **7.0 ± 0.25 / 10**（band [6.75, 7.25]，记录在 `.claude/PLAYTEST_BASELINE.md`）
- 3 张手工地图 + 4 个职业 + 5 个 Boss + 每日挑战
- 进入「打磨 + 巩固」阶段（Phase 2 完，Phase 3 待启）

### 为什么单 HTML
- demo 阶段简单粗暴最快出迭代
- 一个文件 = 一次 git checkout 复现完整游戏（playwright 自测 / bisect 友好）
- 缺点：14k 行编辑搜索不便；接受作为 demo 范围内的代价

---

## 二、快速启动

### 依赖
- Python 3.11+（自带 dev server）
- Node 18+（playwright 自测）
- 浏览器（Chrome 或手机模拟器）

```bash
# 1. clone
git clone git@github.com:freewings85/game-king-of-survive.git
cd game-king-of-survive

# 2. 起 dev server（8080 端口）
python3 dev-server.py 8080

# 3. 浏览器打开
#    桌面: http://localhost:8080/demo/survivor.html
#    手机模拟: http://localhost:8080/demo/survivor.html?debug=1
#    指定地图: ?map=arena_a / ?map=lane_b / ?map=arena_c
```

### 一键 playwright 自测（验证装好 + 能跑）

```bash
npm install                    # 装 playwright
node _qa_funcheck.mjs          # 跑一个标准 fun-eval 局，输出截图到 /tmp
```

### 进入地图编辑器（可视化编辑 JSON 地图）
```
http://localhost:8080/demo/map_editor.html
```

---

## 三、架构

```
┌──────────────────────────────────────────────────────────────┐
│                        浏览器（玩家）                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  demo/survivor.html  (14059 行单文件)                 │   │
│  │   - 登录 / 角色选择 / 地图选择 / 局内全在一个 HTML 里  │   │
│  │   - Canvas 2D 渲染 + 触屏摇杆                         │   │
│  │   - 7 个 bot AI（lane_b 4v4 时是 7 队友，arena 是对手）│   │
│  │   - 内置 mock 网络（WebSocket 可选，单机为主）         │   │
│  └────────────────────┬─────────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────────┘
                        │ HTTP（拉地图/角色/技能数据）
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              dev-server.py  (Python :8080)                    │
│   - 静态文件服务（demo/ + 资源）                                │
│   - Mock API：/api/editor/maps, /api/editor/characters 等       │
│   - 地图 CRUD（map_editor 用）                                  │
│   - 替代生产 Spring Boot 后端（demo 阶段够用）                   │
└──────────────────────────────────────────────────────────────┘
                        ↑
                        │ （生产时换成）
                        │
┌──────────────────────────────────────────────────────────────┐
│              server/  (Spring Boot 1.8 - 未启用)              │
│   - 完整账号 / 房间 / 网络匹配的 Java 后端骨架                  │
│   - 当前 demo 阶段不用，单机本地玩为主                          │
└──────────────────────────────────────────────────────────────┘
```

### 关键文件

| 块 | 路径 | 用途 |
|---|---|---|
| **游戏前端** | `demo/survivor.html` | **唯一真相**。14k 行，所有 gameplay 在这里。改这个文件就是改游戏 |
| **地图编辑器** | `demo/map_editor.html` | 可视化画地图，存到 `data/maps/*.json`，dev-server 提供 CRUD API |
| **辅助资源** | `demo/assets/` | sprite / tileset / 音效 / UI 9-slice 等。子目录按风格 / 类别分 |
| **数据 JSON** | `data/*.json`、`demo/maps/*.json` | 角色 / 技能 / 怪物 / 升级曲线 / 皮肤 / 地图布局 |
| **dev server** | `dev-server.py` | 静态服务 + mock API |
| **生产后端骨架** | `server/` | Spring Boot Java 1.8（demo 阶段未启用） |
| **QA 脚本** | `_qa_*.mjs`、`_play_*.mjs` | playwright 自测，~60 个 |
| **AI 迭代基础设施** | `.claude/` | 15 个 skills + Stop hook + baseline 文件 |

### 数据流（一局游戏）

```
1. 浏览器加载 survivor.html
2. fetch /api/editor/characters → /api/editor/skills → /api/editor/maps  (dev-server mock)
3. 玩家点「开始」→ 选职业 → 选地图（或每日挑战 = arena_a + mage 直入）
4. survivor.html 内部: loadMapLayout(map.json) → 构建 spawnZones / mapBoundary / decor
5. 7 个 bot AI 生成 → game loop 启动 → canvas 渲染 + 输入处理
6. 局结束 → death recap / victory ceremony → 回菜单
```

---

## 四、游戏设计概览

> 完整设计在历史 commits + `doc/` 下的 PRD。这里只列当前实现到的部分。

### 模式
| 模式 | 人数 | 描述 |
|---|---|---|
| **单排 Solo** | 8 人 FFA | 风暴缩圈，最后存活者赢 |
| **组队 Team** | 4v4 | 阵营对抗，团灭判负，胜方触发魔山 Boss |
| **大秘境 Dungeon** | 1-4 PvE | 词缀 + 进度条 + 限时 + Boss，钥石升级 |
| **每日挑战** | 1 人 | mage + arena_a + 60s 速通（R5ag 上线） |

### 职业（4 + 1 实验）
| 职业 | 定位 |
|---|---|
| **mage** | 远程 AOE，脆 |
| **warrior** | 近战高 HP，主力 |
| **scout** | 高速突进 |
| **healer** | 治疗 + 5s 神佑护盾（R5x→R5z 大量调过） |
| **assassin** | 仅 arena_a 上线（lane_b 用 solo-fallback） |

### 地图（3 张手工 + 1 默认）
| ID | 名 | 模式 | 大小 |
|---|---|---|---|
| `default.json` | 王冠之岛 | 通用 | — |
| `arena_a.json` | 王者竞技场 | FFA 8 人 | 2560×2560 |
| `lane_b.json` | 三线峡谷 | 4v4 MOBA | — |
| `arena_c.json` | 冰封之巅 (Frozen Peaks) | FFA（mage / warrior / scout / healer 白名单） | — |

### Boss（5 个 sprite + 数据）
- `frost_dragon` / `berserker` / `lich_lord` / `volcano_titan` / `shadow_wyvern`
- 数据在 `demo/assets/style_homm3_bright/boss_*.json`

### 美术风格
- 当前主用 `style_homm3_bright`（英雄无敌3 饱和卡通风）
- 候选未启用：`style_painted_dark` / `style_ink_wash` / `style_pixel_unified`（保留）

---

## 五、地图系统

> 重大决策：**地图是手工设计 + JSON 数据驱动**，**不再程序生成**（Leo 反复反馈：「地图是核心问题」，HoMM3 式手工地标 > 随机散布）。

### 地图 JSON Schema（精简）

```json
{
  "name": "王者竞技场",
  "version": 1,
  "tileSize": 64,
  "cols": 40,
  "rows": 40,
  "width": 2560,
  "height": 2560,
  "layout": "ffa-arena",
  "biomes": [
    { "name": "中央祭坛", "region": { "x": 832, "y": 832, "w": 896, "h": 896 } }
  ],
  "spawnZones": [...],
  "decor": [...],
  "landmarks": [...]
}
```

### 编辑流程

```
1. 启 dev-server (python3 dev-server.py 8080)
2. 浏览器开 http://localhost:8080/demo/map_editor.html
3. 选地图 / 新建 → 拖块 → 保存
4. dev-server PUT /api/editor/maps/{id} → 写到 demo/maps/{id}.json
5. 玩游戏 ?map={id} → 验证
6. git commit + ArtDesigner 配套出 sprite
```

### 在游戏里加新地图
1. `demo/maps/foo.json`（手画或编辑器导出）
2. 在 `demo/survivor.html` 里 `loadMapLayout('maps/foo.json')` 接入入口（菜单 / daily / 路由）
3. 跑 `?map=foo` 验证 spawn 不卡死、走位通畅
4. Testor 跑矩阵自测

---

## 六、QA 与 Playwright 测试

### 命名约定
- `_qa_*.mjs` — 单次诊断 / smoke / 矩阵跑
- `_play_*.mjs` — 长玩自测（多局）
- 名字带 round 标识：`_qa_r5x_*`、`_qa_r5af_*` 等，对应迭代轮次

### 常用测试

```bash
# 标准 fun-eval（一局，截图到 /tmp/）
node _qa_funcheck.mjs

# 卡死诊断（spawn 周围有什么挡路）
node _qa_stuck.mjs

# 矩阵 4 地图 × 4 职业（约 16 局）
node _qa_maps.mjs

# 当前轮次的 R5an gate（2 run × 52 局）
node _qa_r5an_matrix.mjs

# FPS 性能 profile
node _qa_perf_profile.mjs
```

### 基线文件
**`.claude/PLAYTEST_BASELINE.md`** — 当前稳态评分、kill metrics（每职业每地图 μ kills）、FPS 通过率、回归阈值（graduated coverage policy）、bisect 流程。

> 改 gameplay 前必读。任何 commit 让基线指标掉超阈值会被 Testor 自动 revert。

### 2-run 52-game gate（R5af 起强制）
- 任何 gameplay-affecting commit（含 docs 也跑维护版）
- 跑 2 次独立 52 局矩阵
- 综合分 ≥ 6.75（band 下限）才 PASS
- 单轮 hard-fail + 次轮 pass → 当 noise，不 revert

---

## 七、AI 团队迭代流程（当前开发模式）

> **这是当前开发模式的核心**。Leo 不直接写代码，由 chatagentteam 的 GameDev 群驱动 4 个 Claude bot 协作。

### 团队成员

| Bot | 角色 | system prompt 摘要 |
|---|---|---|
| **Developer** | 前端开发 | 收任务直接写代码 git commit；30 分钟无产出必拆分；不写无用注释 |
| **ArtDesigner** | 美术 / 地图素材 | HoMM3 风格，按优先级出地标 / tileset / 桥 / 山 / UI |
| **Testor** | 测试 | 跑 2-run 52 局 gate；单任务 30min 无输出必 @ 求援 |
| **Leo**（人类） | 产品 / 决策 | 试玩 + 路线决策 + 关键节点拍板 |

### 群 ID
- 群名 `GameDev`，id `25f6f111-eac4-4230-a32b-8ea19d8e60ec`
- 三个 bot 都是 `auto` 模式 + `pty` connection + 项目目录都设为 `/mnt/e/Documents/github/game-king-of-survive`
- 群和 bot 详情见 chatagentteam README 的「当前已部署环境」节

### 15 个 Claude Code Skills

放在 `.claude/skills/`，是命令式 prompt 模板：

| Skill | 用途 |
|---|---|
| `bug-report` | 标准化 bug 报告 |
| `bug-triage` | bug 优先级分类 |
| `code-review` | 自动化代码 review |
| `consistency-check` | gameplay 数值一致性检查 |
| `design-review` | 设计层面 review |
| `hotfix` | 紧急修复流程 |
| `perf-profile` | FPS / 性能 profile |
| `playtest-report` | 玩法报告模板 |
| `prototype` | 原型实验 |
| `quick-design` | 快速 1 页设计稿 |
| `regression-suite` | 回归矩阵 |
| `smoke-check` | 冒烟测试 |
| `ux-review` | UX 评审 |
| `asset-audit` | 美术资产盘点 |
| `asset-spec` | 美术规格说明 |

bot 在群里被 `@` 时可以触发：`/playtest-report`、`/perf-profile` 等。

### Stop hook 机制

`.claude/settings.json` 里写了 Stop hook：每轮 Claude 答完会 POST 到 `http://127.0.0.1:18800/hook`（chatagentteam 的 botermanager 在听），把回复推回 GameDev 群。

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "python3 -c '...POST to localhost:18800...'"
      }]
    }]
  }
}
```

> 这套 hook **是 chatagentteam botermanager 注入的**，不要手动改。坏了重启 botermanager 会重写。

### 迭代轮次命名（R5* 系列）
- `r5a` ... `r5z` ... `r5aa` ... `r5an`（当前）
- 每轮一个主题：r5x = healer HP 调；r5y = healer atk 调；r5af = 2-run gate 上线；r5ag = daily challenge；r5ah = arena_c 上线
- commit 前缀格式：`feat(r5xx)` / `fix(r5xx)` / `docs(r5xx)` / `art(R5xx Fix N)`

### 路线图
存在 Leo 的 memory：`/home/leo/.claude/projects/-mnt-e-Documents-github-btcauto/memory/game_kos_roadmap.md`
- Phase 1 视觉与空间 ✅
- Phase 2 吃鸡感 + 战斗手感 + 音效 ✅
- Phase 3 武器多样化 + 第二张 BR 地图 ⏸ 待启
- 当前在 Phase 2 → Phase 3 的「打磨/稳定」过渡期

### 给 GameDev 派活的方式

```bash
# 直接在 chatagentteam web UI 发消息（推荐）
# https://leopubproxy.duckdns.org:5443/

# 或 curl 模拟 Leo 发消息
curl -X POST -H "x-auth-token: 1qaz@WSX" -H "Content-Type: application/json" \
  -d '{"senderId":"48e69a69-df3a-470f-8b84-73163c982682","content":"@Developer 跑 fun-eval 出报告"}' \
  http://149.62.44.29:5000/api/groups/25f6f111-eac4-4230-a32b-8ea19d8e60ec/messages
```

---

## 八、项目结构

```
game-king-of-survive/
├── README.md                    本文件
├── pyproject.toml               Python 项目（dev-server + tests）
├── package.json                 npm（playwright 一项依赖）
├── dev-server.py                ★ 本地 dev server（Python http.server + mock API）
│
├── demo/                        ★ 游戏运行时入口
│   ├── survivor.html            ★★★ 14059 行游戏主文件（核心代码全在这）
│   ├── map_editor.html          ★ 可视化地图编辑器
│   ├── replay-viewer.html       回放查看器
│   ├── network-client.js        WebSocket client（联网模式可选）
│   ├── rpg-engine.js            轻量 RPG 引擎（部分逻辑）
│   ├── maps/                    ★ 地图 JSON
│   │   ├── default.json
│   │   ├── arena_a.json         FFA 圆形竞技场
│   │   ├── lane_b.json          4v4 三线 MOBA
│   │   ├── arena_c.json         Frozen Peaks
│   │   └── _gen_*.mjs           地图生成器脚本（一次性用）
│   ├── editor/                  老编辑器（map_editor.html 取代）
│   └── assets/                  ★ 美术 / 音效
│       ├── style_homm3_bright/  当前主风格（HoMM3 卡通）
│       ├── style_*/             候选风格（未启用）
│       ├── characters/          LPC 风格人物 sprite
│       ├── audio/               音效 / BGM
│       ├── hud/, buffs/, ui_br/, combat/  UI / VFX
│       └── maps/                地图地标素材
│
├── data/                        ★ 数据 JSON（dev-server 通过 /api/editor/* 提供）
│   ├── characters.json          角色定义
│   ├── skills.json              技能
│   ├── monsters.json            怪物
│   ├── evolution.json           进化树
│   ├── skins.json
│   ├── formulas.json            数值公式
│   └── xp_curve.json            经验曲线
│
├── server/                      ⚠️ Spring Boot 1.8 后端骨架（demo 阶段未启用）
│   ├── pom.xml
│   ├── src/main/                Java 业务代码
│   └── replays/                 回放存档
│
├── editor/                      ⚠️ 老 HTML 编辑器（保留参考）
├── client/                      ⚠️ 老 client 实验（不用）
├── doc/                         设计 PRD
│   ├── map-system-design.md
│   ├── rpg-core-system-prd.md
│   └── skin-*.md
├── docs/                        编辑器手册
│
├── _qa_*.mjs                    ★ ~60 个 playwright 自测脚本
├── _play_*.mjs                  长玩自测
├── scripts/                     Python 辅助（评估 / 模拟 / 玩家行为）
├── tests/                       pytest（少量）
├── e2e/                         e2e 测试
├── qa/                          QA 报告归档
│
├── .claude/                     ★ AI 团队基础设施
│   ├── settings.json            Stop hook 配置（被 botermanager 注入）
│   ├── PLAYTEST_BASELINE.md     ★★★ 稳态评分 + kill / FPS 阈值
│   ├── skills/                  15 个 Claude skill
│   └── scheduled_tasks.lock     cron 锁（运行中）
│
├── .gitignore
├── *.png / *.jpg                历史评测截图（很多，可清理）
└── 老评估 / 实验文件（critic_evaluation.js / r2_evaluation.js / round*_eval/ 等）
```

★★★ = 必看；★ = 常看；⚠️ = 不用但保留

---

## 九、运维与日常

### 日常开发

```bash
# 起服务（保持开着）
python3 dev-server.py 8080

# 改了 survivor.html → 浏览器刷新即可（无需重启）
# 改了地图 JSON → 刷新即可
# 改了数据 JSON → 刷新即可
```

### 跑一次 fun-eval

```bash
node _qa_funcheck.mjs
# 输出在 /tmp/game_*/ 下的 PNG 截图 + console log
```

### 跑 R5an 当前 gate

```bash
node _qa_r5an_matrix.mjs
# 输出 .r5aa_f1_logs/ 下的 json 报告
```

### 看团队进度

```bash
# 群消息
curl -s -H "x-auth-token: 1qaz@WSX" \
  "http://149.62.44.29:5000/api/groups/25f6f111-eac4-4230-a32b-8ea19d8e60ec/messages?limit=20" \
  | python3 -c "import json,sys;[print(f'[{m[\"created_at\"][11:19]}] {m[\"sender_name\"]}: {m[\"content\"][:120]}') for m in json.load(sys.stdin) if not m['content'].startswith('__WORKING__')]"

# git 最近 commit
git log --oneline -20
```

### bot 卡死处理

参见 chatagentteam README 第 6 节「日常运维 SOP」。简而言之：

```bash
# 列 PTY session
curl -s http://127.0.0.1:18801/sessions

# 杀卡死的（举例 Testor）
curl -X DELETE http://127.0.0.1:18801/sessions/Testor-5lme
# botermanager 30 秒内自动重建
```

### git push（需 Leo 授权）

仓库：`git@github.com:freewings85/game-king-of-survive.git`

```bash
git push origin main
```

> 历史习惯：bot **不主动 push**，只 commit；Leo 看完确认后手动 push 或要求 push。

---

## 十、词汇表

| 术语 | 含义 |
|---|---|
| **R5x / R5af / R5an ...** | 迭代轮次编号（R5 大循环里的字母子序列）。每轮一个主题 |
| **2-run gate** | 任何 gameplay 改动要跑 2 次独立 52 局矩阵，综合 ≥ 6.75 才 PASS |
| **stable band** | 稳态评分容忍区间，当前 7.0 ± 0.25 = [6.75, 7.25] |
| **graduated policy** | 回归触发阈值分级：≥95% pass / 90-95% warn / <90% hard-fail |
| **hard-fail** | 回归严重，自动 revert 触发 commit |
| **noise** | 单轮波动，次轮恢复 → 不 revert |
| **arena_a / lane_b / arena_c** | 三张手工地图：FFA 圆形 / 4v4 三线 / Frozen Peaks |
| **daily challenge** | 每日挑战，mage + arena_a + 60s |
| **HoMM3 style** | 当前主美术风格，英雄无敌3 饱和卡通 |
| **Stop hook** | Claude Code 每轮答完触发的 HTTP 回调，POST 到 botermanager 推回群里 |
| **GameDev 群** | chatagentteam 上的 AI 团队群，4 个 bot 协作 |
| **fun-eval** | `_qa_funcheck.mjs`，标准好玩度评估 |
| **kill μ** | 某地图 × 某职业 N 局的平均击杀数（baseline 关键指标） |
| **bisect** | 当 hard-fail 触发但最新 commit 是 docs-only 时，回溯找真正的 regression commit |

---

## 附：相关文档

- 设计 PRD：`doc/`
- 编辑器手册：`docs/`
- 评分基线（必读）：`.claude/PLAYTEST_BASELINE.md`
- chatagentteam README（理解 AI 团队基础设施）：`/mnt/e/Documents/github/chatagentteam/README.md`
- chatagentteam 凭据：`/mnt/e/Documents/github/chatagentteam/docs/CREDENTIALS.md`
- 路线图（在 Leo 的 memory 里）：`game_kos_roadmap.md`
- 项目主理人：Leo（`leo570787@gmail.com`）
