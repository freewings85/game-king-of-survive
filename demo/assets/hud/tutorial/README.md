# First-run Tutorial — 3-slide overlay

**R5m Fix 3 配合** — 解决"新手第一局太茫然"

## Files

| File | Size | Focus |
|------|------|-------|
| `tutorial_1_joystick.svg` | 640×360 | 摇杆移动：spotlight 高亮左下摇杆 + 4 方向箭头 + 拖动轨迹 |
| `tutorial_2_autoattack.svg` | 640×360 | 自动攻击：玩家（蓝剑士）+ 敌人（红）+ 攻击射线 + 金色攻击范围圈 + -15 伤害浮字 |
| `tutorial_3_altar.svg` | 640×360 | 击破祭坛：小祭坛（石基座 + 金柱 + 顶星）+ 3 传说技能卡 + 奖励列表 + 点击继续 |
| `tutorial.json` | — | 元数据 + 接入流程 + localStorage gate |

## 设计要点

- 所有文字**双语**（ASCII + 中文），解决 Playwright 无 CJK 字体的 tofu + 真机中文显示
- 右上"STEP N/3"金色徽章 + 底部 3 颗进度点（当前帧金色，其他暗）
- 左侧聚焦演示（不遮盖左下摇杆 / 右下按钮 的 UI 互动区）
- 右侧 300×180/210 信息卡 + 3px 金色边框

## 接入流程（Developer）

```js
// 加载时判断
if (localStorage.getItem('tutorial_seen') !== '1') {
  showTutorial();  // 加 game.paused = true
}

function showTutorial() {
  let slide = 0;
  const imgs = [img1, img2, img3];
  function drawSlide() {
    ctx.drawImage(imgs[slide], 0, 0, canvas.width, canvas.height);
  }
  function advance() {
    slide++;
    if (slide >= 3) {
      localStorage.setItem('tutorial_seen', '1');
      game.paused = false;
      return;
    }
    drawSlide();
    setTimeout(advance, 3000);
  }
  canvas.addEventListener('touchstart', advance, { once: false });
  drawSlide();
  setTimeout(advance, 3000);
}
```

## 未来扩展

- `tutorial_4_rivals.svg` —— 介绍 rival/nemesis 系统（R5 后续加）
- `tutorial_5_bridges.svg` —— lane_b 地图"必须走桥"（首次进 lane_b 触发）

## LICENSE

原创，CC0。Author: ArtDesigner (GameDev team) — 2026-04-20
