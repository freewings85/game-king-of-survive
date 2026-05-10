# M2-X Cocos Web Build Runbook (Leo / Windows host)

> 给 Leo 在 Windows host 端跑真 Cocos Creator GUI build 用. WSL 端 Developer 不能装/触发 Cocos GUI, 只能产 Python preview, 已被 Director 否决.
>
> 此 runbook 跑通后 = M2-X 解锁 = Playtester 改用真 Cocos engine 截图重评 M2-1B/C/2A 视觉。

---

## 0. 先决条件

- Windows host 上装好 **Cocos Creator 3.8.x** (建议 3.8.5 以上, 跟 cocos-v03-demo `creatorRequired` 一致)
  - 下载需登录账号: https://www.cocos.com/creator-download
  - 装完启动一次 Editor 验证 license
- Node 18+ (Cocos Build 内部需要)
- Chrome 或 Edge (浏览器跑 web-mobile build)
- (可选, 出截图用) Node + `npx playwright` 或 `npx puppeteer`

---

## 1. 打开工程

```text
File → Open Project → 选 <repo>/cocos-v03-demo/
```

首次打开等 Cocos Editor:
- import `assets/` (会扫所有 PNG 生成 .meta 文件)
- compile `assets/scripts/*.ts` (会把 BootstrapMain / ActorSpawner / WastelandTerrain / SceneConfigLoader 注册到 Component menu)
- 索引 `assets/resources/` (config/m2-visual-scene.json 会被识别为 JsonAsset)

**验证编译过**: Cocos Editor 底部 Console 没红色 error, Component menu 里能看到 "BootstrapMain". 如果 Console 报 import error, 大概率是 `'cc'` package 版本不一致 — 关掉 Editor, 删 `cocos-v03-demo/temp/` 重启.

---

## 2. 创建入口 Scene

参考 `cocos-v03-demo/settings/m2-x-scene-template.json` (目标 hierarchy 模板).

5 步 GUI 操作:

1. Asset 面板右键 `assets/` → `Create → Folder` 命名 `scenes` (如已存在跳过)
2. `assets/scenes` 右键 → `Create → Scene` → 名 `V03Battle`
3. 双击 `V03Battle.scene` 打开
4. Hierarchy 面板右键 Scene root → `Create → Empty Node`, 改名 `BootstrapHost`
5. 选中 `BootstrapHost` → Inspector → `Add Component` → 搜 `BootstrapMain` → 添加
   - Inspector 里能看到 `Target Width: 390 / Target Height: 844 / Max Device Pixel Ratio: 2` (默认值 OK, 不改)

`Ctrl+S` 保存。

**验证**: `assets/scenes/V03Battle.scene` 文件大小非 0, `assets/scenes/V03Battle.scene.meta` 自动生成.

---

## 3. 预览跑通 (Editor 内)

```text
Project → Project Settings → General → Start Scene = V03Battle
File → 顶部预览栏 → 选 Browser → 点 Preview ▶
```

会在浏览器打开 `http://localhost:7456/` 跑 dev preview.

**期待画面** (依据 `m2-visual-scene.json` v3 当前 working tree 状态):
- 390×844 portrait 画布, 暗调末日地表
- Hero @ 屏幕中下偏左, 朝右上 30° 射击, muzzle cone + burst
- 8 zombies horde 扇面 (3 Clint silhouette + 5 Riley silhouette) 在 hero 前方
- 7 props 街景: WreckTank 中央 (黑铁锈红 tint) / WreckGreen 远端 / 2 sandbag / 2 barrel / oil splat 左下
- VFX: 5 fan bullets / 2 spark clusters / 4-node lightning chain
- HUD 6 件: 圆 portrait + HP/Armor/EXP bar / 圆 minimap / joystick / 3 真彩 skill discs

**对照参考图**:
- `can_delete/shots/m2-1c-prop-pass-01-overview.png` (Python preview 的同 JSON 渲染, **不作 Cocos engine output 替代**, 仅作 hierarchy / 配色 / 摆位是否对得上的草图)
- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png` (north star)

如果画面跟 Python preview 大致同位 / 同色, 走第 4 步 build. 如果有显著缺失 (zombie 没出, prop 没出, HUD 缺), Console 抓错回 Group Chat, **不要硬 build**.

---

## 4. Web Mobile Build

```text
Project → Build → New Build Task → 平台选 Web Mobile
```

参数:

| 字段 | 值 | 说明 |
|---|---|---|
| Build Path | `<repo>/cocos-v03-demo/build/` | 默认即可 |
| Start Scene | `V03Battle` | 跟 Project Settings 一致 |
| Render Pipeline | `builtin-forward` | Cocos 默认, 不改 |
| Resolution | `390 × 844` portrait | 跟 BootstrapMain 默认值对齐 |
| Inline All Spriteframes | ✓ on | 减小请求数 (M2-X 阶段图少, 不分包) |
| MD5 Cache | ✓ on | 给浏览器缓存 fingerprint |
| Source Maps | ✓ on (debug) | 出问题能 trace ts |

点 `Build`. 等编译完成 (首次 60s 左右).

**输出路径**: `cocos-v03-demo/build/web-mobile/`
- `index.html` — entry
- `assets/` — 打包后 sprite + json + script bundle
- `cocos-js/` — Cocos engine runtime
- `application.js` — game entry

---

## 5. 浏览器跑 + 截图

### 5a. 起 local server (必须, 浏览器不能直接 file:// 加载)

```bash
cd <repo>/cocos-v03-demo/build/web-mobile
python3 -m http.server 8080
# 或 npx serve -p 8080
```

### 5b. Chrome / Edge 打开 `http://localhost:8080/`

DevTools 切到 mobile preview, 选 iPhone 12 (390×844) 或自定义 390×844 portrait.

期待画面同第 3 步预览, 但这次是 build 出来的 web-mobile bundle 跑.

### 5c. 自动截图 (Director 要的 m2-x-cocos-web-* 三张)

用 Playwright (推荐, 也兼容 puppeteer):

```bash
cd <repo>
npx --yes playwright install chromium  # 首次
node - <<'EOF'
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  // wait for BootstrapMain.start() async to finish (load JsonAsset + 8 zombie SpriteFrames)
  await page.waitForTimeout(2500);

  await page.screenshot({
    path: 'can_delete/shots/m2-x-cocos-web-01-canvas.png',
    fullPage: false,
  });

  // zoom into combat area (mid-bottom 50% of canvas)
  await page.screenshot({
    path: 'can_delete/shots/m2-x-cocos-web-02-horde-vfx-zoom.png',
    clip: { x: 50, y: 380, width: 340, height: 340 },
  });

  // zoom into HUD strips + prop band
  await page.screenshot({
    path: 'can_delete/shots/m2-x-cocos-web-03-prop-street-context.png',
    fullPage: true,
  });

  await browser.close();
})();
EOF
```

期望产物:

```
can_delete/shots/m2-x-cocos-web-01-canvas.png         (390×844 整屏)
can_delete/shots/m2-x-cocos-web-02-horde-vfx-zoom.png (combat zoom)
can_delete/shots/m2-x-cocos-web-03-prop-street-context.png (full page incl. HUD)
```

---

## 6. 落盘 + 报告

把 3 张截图发回 Group Chat, Director + Playtester 基于真 Cocos engine 输出重评 body type / horde / VFX / prop 街景 / UI.

不要 commit `build/` 目录 (大量产物, 应在 `.gitignore`). 如果 `cocos-v03-demo/.gitignore` 没排 `build/` 和 `temp/`, Developer 后续补一个 commit.

---

## 7. 失败兜底

| 症状 | 可能原因 | 处理 |
|---|---|---|
| Editor 打开报 `cc` import 失败 | Cocos 版本不匹配 | 用 3.8.5+ 重试; `npm view @cocos/creator-types` 现 latest 3.8.7 |
| Component menu 找不到 BootstrapMain | TS 编译失败 | Console 找红色 error; 多半是 `'cc'` 子模块名变更 — 截 error 回 Chat |
| Preview 黑屏 | resources.load 找不到 config/m2-visual-scene | 检查 `assets/resources/config/m2-visual-scene.json.meta` 是否生成; 重启 Editor |
| 8 zombies 只出 5 (riley) | Clint pack 路径未识别 | `assets/resources/art/v03/zombie2/clint-*.png.meta` 缺; 让 Editor 重 reimport `assets/resources/art/v03/zombie2/` |
| Web build 体积 > 4MB (微信硬限) | sprite 没压缩 | Build 设 `Compress Texture = on`; 或后续 M2-X' 单独优化, 当前阶段先跑通 |

报错截 Console + 发 Chat, 不在 WSL 端伪造通过.
