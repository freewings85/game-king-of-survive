# Update — 2026-05-12 (Leo playtest pivot)

## TL;DR

- 🛑 **昨晚 baseline 21 张 view angle 全错**: 我做的 PM gate 只比了 painterly 质感, 没核 view angle. Target (candidate_pics/...03) 是 3/4 isometric, 我们 baseline 是 top-down 90°. Leo 实测说"角色倒立、怪物飘"反馈正确, 这是根因.
- ✅ **Phase 2a 已 commit + push** (`8cc05c7`): hero/zombie/prop 全部缩 ~50%; 加 prop 圆形碰撞 (桶/车/沙袋挡路); 阴影 alpha 加深 + 锚到脚底. **不修 view angle**, 只缓解"太大 + 飘"症状.
- ✅ **Tester 通路就绪** (`7b91add` + `8b3397a`): `scripts/build-and-publish.bat` 跑通 Cocos CLI build → 镜像 `docs/` → push. 我自己从 WSL 调 `cmd.exe /C` 跑.
- ⏳ **ZombieArtist brick #8 进行中**: 3/4 view 重做 9 张 (hero idle/walk/shoot + brute/runner/crawler 各 idle/walk). 已 WORKING, 预估 1-2h.

## 你醒来要做的唯一一件事 (30 秒)

**开启 GitHub Pages** — 一次性, 之后所有刷新自动:
1. https://github.com/freewings85/game-king-of-survive/settings/pages
2. Source: `Deploy from a branch` → Branch: `main` → Folder: `/docs` → **Save**

之后 tester URL 永久:
**https://freewings85.github.io/game-king-of-survive/**

每次我跑完 `scripts/build-and-publish.bat`, 这 URL 自动刷新 (~1min 后).

## 视觉验收硬指标 (写进我的长期记忆, 以后不再漏)

1. **角色必须"走"不能"飘"** — walk 帧切换 + 阴影 + 碰撞, 缺一不可
2. **最终对照 candidate_pics/...03-classes-skills-skins.png** 5 大块 (HP 条 / 技能按钮 / 摇杆 / minimap / 角色姿势比例), 不达标不交付

## 今晚 commits (新→旧)

| Commit | What |
|---|---|
| `8b3397a` | chore(build): build-and-publish.bat + docs/README.md (one-click pages instr) |
| `7b91add` | build(web-mobile): refresh tester bundle (含 Phase 2a) |
| `8cc05c7` | feat(cocos): Phase 2a — shrink + prop collision + shadow-at-feet |
| `f2b73ac` | chore: save Cocos editor-imported .meta + settings/v2 snapshot |

## 风险 / 已知坑

- **Brick #8 也可能漏角度** — 我现在改了规格, 明确写"必须能看到角色的脸 + 脚底贴近图底"才算合规. 落盘后我会自己 Read 每张 + Read target 对比, 不合规直接退回. Self-check 表 ≠ PASS.
- **Phase 2a 没解决"飘"的根本** — view angle 错, 缩小+阴影只是缓解. Brick #8 + walk 帧动画 (后续 Phase 2c) 才是根治.
- **WSL interop** 我手动用 sudo 注册了 binfmt_misc (跨 reboot 会失效). 如果 reboot 后再用, 可能要你在 `/etc/wsl.conf` 加 `[interop]\nenabled=true` 持久化.

---

# Night session log — 2026-05-10 (Leo asleep, Claude PM driving)

> Leo went to sleep saying "接通 java 后端，并且游戏效果达到 candidate_pics 中的效果".
> Cron `*/5 * * * *` runs `/loop` style monitor; each tick I make smallest meaningful
> commit and report status. This file = morning summary so Leo can scan in 60s.

## TL;DR

- ✅ **Visual side closed**: 21 painterly assets PM-gated and wired (hero idle/walk/shoot, 3 zombie idle+attack, 3 skill icons, 4 props, portrait/minimap frame, 3 terrain tiles). Bricks #5 / #6 / #7 all delivered by ZombieArtist + integrated by me.
- ⏳ **Java server side ready, not yet started**: NetClient + ActorSpawner.enableNetwork() landed earlier; awaiting Leo to double-click `server/run-local.bat` (Windows-side; can't run from WSL).
- 🟢 ZombieArtist is on standby. Nothing for Leo to do in the bot chat unless you want more art.

## Commits this session (newest first)

| Commit | Track | What |
|---|---|---|
| `4b26740` | A-terrain | wire painterly asphalt-tile into terrain (brick #7 integration) |
| `833440b` | C-PASS#7 | brick #7 final — 3 painterly terrain tiles, baseline 21 locked |
| `e9f608b` | docs | NIGHT_LOG: brick #6 closed, brick #7 dispatched |
| `2724ca0` | C-step12b | hero frame-switch — idle/walk/shoot driven by movement+fire |
| `21b243d` | C-PASS#6 | brick #6 final — 5 combat frames, baseline 18 locked |
| `8a41a91` | docs | NIGHT_LOG refresh + brick #6 dispatched |
| `512362b` | C-step12 | brick #6 prep — frame-switch + tolerant load (zombie close to hero -> attack pose) |
| `9f324d6` | C-PASS#5 | brick #5 final — minimap-frame.png landed (baseline 13 total) |
| `86f7d23` | A-step4d | hero respawn (4s) + kill counter |
| `205f4e9` | B-step8b | render server projectiles in net mode |
| `5b3e5bd` | A-step1b | dynamic minimap — live hero+enemy dots |
| `fdeab6d` | A-step4c | hero HP bar overhead (visible HP feedback) |
| `af458ea` | A-step4b | hero contact damage (12 dmg, 0.6s iframe, screen shake) |
| `dd03b78` | B-step8  | Wire NetClient into ActorSpawner — network mode toggle |
| `5551738` | A-step5  | Atmospheric polish — vignette + horizon haze |
| `d8aad69` | A-step4  | Combat feedback — hit flash + HP bars + death fade |
| `9976b22` | B-step7  | Add NetClient.ts — WebSocket bridge |
| `40d18e9` | A-step3  | Swap 7 OGA stock props -> 4 painterly props |
| `c95e10f` | A-step2  | Wire painterly skill icons + portrait frame into HUD |
| `fe327d8` | M3-prep  | painterly baseline (11 sprites) + gameplay v1 |
| `f1af116` | M2-X     | Real Cocos engine build proof + M2-1B/C/2A asset baseline (earlier) |

**Total this session: 19 commits.** Baseline assets: **21** (3 hero + 6 zombie + 3 icon + 4 prop + 2 frame + 3 terrain). Brick #6 ✅ wired (hero+zombie frame-switch). Brick #7 ✅ landed + wired (asphalt-tile painterly tiling). Visual side closed for the night.

## Progress vs the two goals

### Goal 1 — visual to candidate_pics

- ✅ 11 painterly baseline assets all PM-gated vs candidate_pics, same tier
- ✅ All in-engine: hero v2, 3 zombie body silhouettes (brute/runner/crawler), 3 skill icons (fire/lightning/shield), 4 props (painterly), portrait frame
- ✅ HUD skill discs replaced (programmatic -> painterly)
- ✅ HUD portrait frame overlay (painterly metal ring)
- ✅ Combat feedback: hit flash + HP bars + death fade
- ✅ Vignette + horizon haze atmospheric polish
- ✅ minimap-frame.png landed + portrait-frame.png (brick #5)
- ✅ Brick #6 landed + wired (hero idle/walk/shoot + 3 zombie idle↔attack frame-switch active)
- ✅ Brick #7 landed + wired (3 painterly terrain tiles, asphalt tiles current floor)

### Goal 2 — Java server (multiplayer authoritative)

- ✅ NetClient.ts (~170 LOC) matches GameWebSocketHandler protocol (register/input/skill_choice + GameStateSnapshot decode)
- ✅ ActorSpawner.enableNetwork(url, playerId, name) — switches sim into "server authoritative" mode
- ✅ applySnapshot(snap) reconciles enemies (server pushes, client sync pos+hp)
- ⏳ Server not started in WSL (Windows-side Java; see "Leo TODO" below)
- ⏳ Pending Cocos preview test once server is up

## Leo TODO (morning)

1. **Start server**: double-click `server/run-local.bat`. Should print "Started KingOfSurviveApplication on port 8080" within 10s.
2. **Verify endpoint**: open browser to http://localhost:8080 — should NOT 404 (root may be 404 fine, only `/ws/game` matters).
3. **Try Cocos preview** (no code change needed for now — net mode is opt-in, default still local).
   * If you want to flip net mode, add a single call in `BootstrapMain.start` after `spawner.config = config`:
     ```ts
     spawner.enableNetwork('ws://localhost:8080/ws/game', 'leo-' + Date.now(), 'Leo');
     ```
   * Then re-Preview. Hero pos should come from server, zombies from server snapshot.
4. **ZombieArtist** is standby (delivered brick #5/6/7, baseline 21). Nothing required from you — re-dispatch only if you want more art.

## Risks / known gaps

- `tickDeathFadesOnly` in network mode keeps the local death-fade animation but server controls when zombies actually disappear (snap reconciliation removes ID). May double-fade visually if server kills too fast vs client tween. Acceptable for first run.
- Server's `enemy.type` -> client `bodyType` mapping is best-effort string match. Real server enemy types unknown until first connection — easy to refine.
- Net mode skips bullet rendering (server doesn't send projectiles in this snapshot path). Need follow-up commit to spawn local visual bullets from `snap.events` once server is reachable.
- WeChat mini-game build untested (all current work is web-mobile preview).

## Cron status

Job `943163b8`, every 5 min, session-only, 7-day expiry. Will keep running until I exit.
ZombieArtist (KoS-v2 group, codex bot) is the only other active actor.

## ZombieArtist activity

- Last brick: #5 (portrait-frame.png ✅, minimap-frame.png ⏳)
- Last group message: 13:23:25 WORKING marker (~2h ago when this was written)
- PTY idleMs: 0s consistently — bot is producing, just slow this round
- I haven't catch'd it because idleMs<60s = "not stuck per rule"
