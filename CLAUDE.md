# Claude Code 项目指南

> 本文件给所有在 game-king-of-survive 项目里启动的 Claude Code session 用。**读这个文件前先读 README.md 和 HANDOVER.md**。

---

## 🗑️ 一次性产出物 → 全部进 `can_delete/`（强制规则）

**目的**：保持仓库根目录干净，让人和 PR review 一眼能看出"哪些是产品代码、哪些是丢得起的实验"。

**必须放进 `can_delete/` 的东西**：
- playtest 截图（`*.png` / `*.jpg`）—— 任何 puppeteer/playwright/headless 跑出来的可视化产物
- 一次性 smoke / debug / eval 脚本 —— `_qa_*.mjs` / `_pt_*.mjs` / `test_*.js` / `r2_*.js` / `critic_*.js` / `run_*.js` 之类前缀
- 临时 sketch（手写的 markdown 笔记、scratch 方案图、AB 对比 collage）
- 评估报告 / round_eval 结果

**绝对不许**：直接往项目根写截图、scratch 脚本或 markdown 草稿。`can_delete/` 是收容站。

**保留位置（不要扔到 `can_delete/`）**：
- `candidate_pics/` —— 美术参考方向（codex pitch，长期保留）
- `demo/assets/` —— 运行时需要的游戏 asset
- `qa/`、`review_screenshots/`、`round*_eval/` —— 已经有约定结构的评审存档（看 HANDOVER 决定何时归档/清理）
- 项目级文档：`README.md` / `HANDOVER.md` / `CLAUDE.md` / `AGENTS.md` / `prd.json`

**`can_delete/` 已 gitignore**，里面写啥都不会污染 git。需要清理时一句 `rm -rf can_delete/*`。

---

## 必读文档（按顺序）

1. **`README.md`** — 项目架构 / 启动 / QA / 项目结构
2. **`HANDOVER.md`** — ⭐ **当前的开发任务交接 brief**，包含：
   - 大方向决策（survivor.io 路线 + 60% 重写）
   - 旧 GameDev 团队清理步骤
   - 新 3 bot 团队 system prompt（GameDirector / GameDeveloper / GamePlaytester）
   - 15 条工作原则
   - 边界 / 升级规则 / 验收里程碑
3. **`/mnt/e/Documents/github/chatagentteam/README.md`** — AI 团队基础设施
4. **`/mnt/e/Documents/github/chatagentteam/docs/CREDENTIALS.md`** — VPS / token 凭据
5. **`.claude/PLAYTEST_BASELINE.md`** — ⚠️ **已作废**，读完知道为什么不要用即可，**不要依据它建新基线**

---

## 当前阶段（2026-04-25 起）

进入团队重建期 + 题材重写期。

**新路线一句话**：8 人同图 PvE + PvP 杂交（"Battle of Survivors"）—— 怪海 + 真人双威胁、自动攻击 + 选卡升级、最后存活 1 人赢段位、一局 15-20 分钟。

- **重玩钩子分层**：**核心** = 玩法重玩性（8 人 × 怪海 × 选卡 三随机交叉）；**Meta** = 皮肤+段位（放大器，不是必需）
- **代码目标**：`demo/survivor.html` 14k → 8-10k（宁删勿加）
- **基线**：旧 `.claude/PLAYTEST_BASELINE.md` 全部作废，不要参考

砍 / 留 / 改清单 + 新团队 system prompt 全部在 **`HANDOVER.md`**。

---

## 给 Claude session 的硬约束

- **不主动 git push**，所有 push 必须 Leo 显式授权
- **不动 chatagentteam 基础设施代码**（只许通过 REST API 操作 bot）
- **不动 ClawBotTrading bot 或 btcauto 项目**（那是 Leo 的实盘交易系统）
- **不在 VPS 上做写操作**（默认只读看日志），写操作前问 Leo
- **不复活旧 baseline / stability table / variance memo 那套文档**（旧团队跑偏的根源）
- **不写无用注释 / 不写半成品 commit**（每 commit 必须能玩）

---

## 常用命令速查

```bash
# 起 dev server（保持开着，改 HTML/JSON 浏览器刷新即生效）
python3 dev-server.py 8080

# 一局 fun-eval（截图到 /tmp）
node _qa_funcheck.mjs

# 看 GameDev 群消息
curl -s -H "x-auth-token: 1qaz@WSX" \
  "http://149.62.44.29:5000/api/groups/25f6f111-eac4-4230-a32b-8ea19d8e60ec/messages?limit=20"

# 列本机 PTY session
curl http://127.0.0.1:18801/sessions
```

更多见 README.md 第九节「运维与日常」。
