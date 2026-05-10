# Night session log — 2026-05-10 (Leo asleep, Claude PM driving)

> Leo went to sleep saying "接通 java 后端，并且游戏效果达到 candidate_pics 中的效果".
> Cron `*/5 * * * *` runs `/loop` style monitor; each tick I make smallest meaningful
> commit and report status. This file = morning summary so Leo can scan in 60s.

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
