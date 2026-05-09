# AGENTS.md — game-king-of-survive

> 给 codex 用的项目指南。**先读 `README.md` 和 `HANDOVER.md`**，再看 `CLAUDE.md`（claude / codex 共用规则都在那）。

## 🗑️ 一次性产出物 → 全部进 `can_delete/`（强制规则）

为保持仓库根干净，**任何**一次性的 playtest 截图、smoke / debug / eval 脚本、临时 sketch、评估报告 —— 一律写到 `can_delete/` 下面。**禁止直接往项目根写 png / jpg / `_qa_*` / `test_*` / `_pt_*` 之类临时产物**。

`can_delete/` 已经 gitignore，里面随便写不污染历史。清理时 `rm -rf can_delete/*`。

详细规则、保留位置、例外清单见 `CLAUDE.md` 顶部那段。
