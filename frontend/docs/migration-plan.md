# Frontend Migration Plan

目标：把 `demo/survivor.html` 的单文件前端逐步迁移到 `frontend/`，同时保持每一步都能运行、能回滚、能截图验收。

## 当前阶段

`frontend/index.html` 是新的前端入口。

第一阶段只做低风险拆分：

- `frontend/styles/base.css`：从旧 HTML 抽出的页面和登录层样式。
- `frontend/src/login.js`：从旧 HTML 抽出的登录/注册逻辑。
- `frontend/src/legacy-game.js`：暂时承载旧的游戏主循环、渲染、玩法、输入和 QA hook。
- `frontend/src/theme/zombie-theme.js`：第三版视觉目标的主题常量入口，后续 worker 只往这里收敛颜色、比例和层级。

旧入口 `demo/survivor.html` 暂时保留为回滚基线。

## 迁移原则

1. 每次只迁移一个边界清楚的模块。
2. 迁移后新入口 `frontend/index.html` 必须能进局。
3. 不在迁移任务里顺手改玩法，玩法和结构变更分开提交。
4. 资源路径继续以 `demo/` 为基准，直到资源目录整体迁移。
5. QA 以新入口为主，旧入口只用于回归对照。

## 推荐迁移顺序

1. Theme：颜色、比例、描边、角色层级。
2. Render Zombies：`drawEnemySprite`。
3. Render Survivors：`drawCharacterSprite` 和皮肤表现。
4. Skill FX：散射、穿透、爆裂、闪电链、XP 磁场。
5. HUD：顶部信息、小地图、升级卡、技能按钮。
6. Early Game Tuning：开局尸群、升级节奏、Rival 出场。
7. Data Adapters：职业、技能、皮肤数据读取。

## 第三版视觉目标

候选图：`candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`

验收重点：

- 手机比例下角色和怪物不过大。
- 玩家、僵尸、敌人、技能、XP 一眼可分。
- 战士/法师/斥候有同一套末日幸存者语言。
- 技能效果清楚但不遮屏。
- 皮肤是可读变体，不是额外噪声。
