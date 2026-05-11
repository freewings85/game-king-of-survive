# Tester guide

Live tester URL (after one-click Pages enable below):
**https://freewings85.github.io/game-king-of-survive/**

## First-time setup (Leo, 30 sec, one click)

1. https://github.com/freewings85/game-king-of-survive/settings/pages
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / **Folder**: `/docs` → **Save**

Done. After every build push, GitHub Pages auto-refreshes within ~1 min.

## Controls (mobile + desktop)

- **Move**: left virtual joystick (touch) or `WASD` (keyboard)
- **Auto-fire**: aims at nearest zombie, fires every 0.28s
- **Survive waves**: contact dmg 12 + 0.6s i-frame; respawn 4s after death

## What's known-broken (2026-05-12 playtest)

- View angle being reworked (ZombieArtist brick #8 in progress). Current build
  is **Phase 2a** — actors shrunk ~50%, prop collision added, shadow at feet.
  Still top-down sprite art; "走不飘" final fix lands with brick #8b/c.
- Java multiplayer server (`server/run-local.bat`) not started; net mode
  off by default → local sim only for now.

## Refresh build

From WSL (Claude):
```bash
cmd.exe /C scripts/build-and-publish.bat
```

From Windows: double-click `scripts/build-and-publish.bat`. Takes ~2 min.
