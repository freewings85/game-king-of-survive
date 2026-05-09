# Mini Game Engine Decision

## Decision

Use Cocos Creator 3.x for the production WeChat Mini Game client.

The current Three.js demo remains the visual and interaction reference. It proves the target look, but it should not become the final mini-game runtime.

## Why Cocos Creator

- It has an official WeChat Mini Game build path that generates the WeChat project output and can launch WeChat DevTools.
- It handles WeChat-specific asset loading, remote assets, cache versioning, package constraints, and platform lifecycle better than a browser-only stack.
- It supports the V03 target: orthographic 2.5D/3D scenes, shadows, prefabs, particles, animation, materials, UI, TypeScript components, and mobile performance tooling.
- It lets the map editor and game share data contracts while the actual rendering and object lifecycle move into a real game engine.

## Alternatives

- LayaAir 3.x is the closest backup. It also supports WeChat Mini Game publishing and 3D, but choosing it would still mean building a large custom JS game stack around the existing prototype.
- Three.js is useful for fast visual proof. The WeChat-specific Three.js adapter ecosystem is behind current upstream Three.js versions, so final production would carry extra compatibility and resource-pipeline risk.
- A custom WebGL engine is not appropriate for this project. The hard problems are game feel, art direction, mobile performance, asset workflow, and WeChat packaging, not raw rendering primitives.

## Current Demo Boundary

Playable visual proof:

```text
http://localhost:8081/frontend/engine-demo/index.html
```

Cocos vertical slice scaffold:

```text
cocos-v03-demo/
```

The Cocos slice should match the WebGL demo before the old HTML runtime receives more visual work.

## First Cocos Gate

- Portrait phone viewport.
- One wasteland arena from the shared map contract.
- One playable survivor with two skins.
- Three zombie pressure types.
- Drag movement.
- Auto-fire.
- XP pickup and level feedback.
- Safe zone visual.
- HP, XP, LV, ALIVE, and skill buttons.
- WeChat Mini Game preview build that stays under the main-package limit by using remote or bundled asset strategy intentionally.

## Official References

- Cocos Creator WeChat Mini Game publishing: https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-wechatgame.html
- Cocos Engine repository and platform support: https://github.com/cocos/cocos-engine
- LayaAir release settings and WeChat Mini Game publishing: https://www.layaair.com/3.x/doc-en/released/generalSetting/readme.html
- LayaAir WeChat Mini Game subpackage notes: https://layaair.com/3.0/doc-en/released/miniGame/wechat/readme.html
