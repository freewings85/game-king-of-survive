# Round 1 — 改进计划

基于3个玩家角色的反馈，本轮聚焦 P0 + 部分 P1 问题。

## 本轮改进项

### 1. [P0] Canvas 响应式缩放（手机适配）
- **问题**: 800x600 Canvas 在手机上溢出，摇杆/技能面板/小地图全在屏幕外
- **方案**: 添加 viewport meta + CSS 等比缩放 canvas 到视口宽度
- **文件**: `demo/survivor.html`
- **预期**: 手机打开后 canvas 等比缩小到屏幕内，所有UI可见

### 2. [P0] 修复属性面板数值公式
- **问题**: 面板maxHP=139 vs 实际=392（缺少职业baseHP 350）；移速三职业都是152.3
- **方案**: `calculateDerivedStats` 预览时叠加职业 baseHP/baseATK/baseSpeed
- **文件**: `demo/survivor.html` (drawCharSelect 相关)
- **预期**: 面板显示 "maxHP: 392" 与游戏内一致

### 3. [P0] INT 加点可视化
- **问题**: 法师加5点INT，面板五项数值不变
- **方案**: INT 影响攻击力（INT * growthCoeff * 0.5 → ATK加成），面板实时反映
- **文件**: `demo/survivor.html` + `demo/rpg-engine.js`
- **预期**: 法师加INT后面板攻击力增加

### 4. [P1] 术语中文化
- **问题**: DPS/ULT/Wave/PvP 等术语新手看不懂
- **方案**: DPS→"秒伤"，ULT→"大招"，Wave X→"第X波"，PvP免疫→"新手保护"
- **文件**: `demo/survivor.html`
- **预期**: 界面无英文术语

### 5. [P1] 结算页修复
- **问题**: "大吉大利"胜利但排名第5矛盾；金币不同步
- **方案**: 排行明确标注"按击杀排名"；同步顶栏金币
- **文件**: `demo/survivor.html`
- **预期**: 结算数据自洽

## 暂不处理（下轮）
- 升级暂停选技能（改动较大，需要服务端配合）
- 新手教程系统（需要设计教程流程）
- 竖屏专用布局
