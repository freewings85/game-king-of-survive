# Engine Evaluation For V03 Target

## Recommendation

Use Cocos Creator 3.x as the main production engine for the WeChat Mini Game version.

The current project is a Web/HTML canvas prototype. It is useful for gameplay validation, but it is not a WeChat Mini Game engine project and does not contain `game.js`, `game.json`, or `project.config.json`.

## Why Cocos

- Cocos Creator has an official WeChat Mini Game build path and can generate the WeChat game project files during build.
- It provides a mature mobile game workflow for scenes, components, cameras, atlases, particles, animation, prefabs, and asset management.
- It supports 2D and 3D rendering, which fits the V03 target: 2.5D top-down battle with real height, shadows, particles, and layered UI.
- It is a better long-term production fit than continuing to hand-roll rendering inside one HTML canvas file.

Current local proof:

```text
http://localhost:8081/frontend/engine-proof/index.html
```

This proof intentionally uses Three.js only as a fast browser stand-in for the Cocos render target. The route it validates is `orthographic-2.5d-sprite-billboard-plus-prop-depth`: authored sprites/billboards for characters and FX, simple 3D roots for prop depth and shadows, painterly ground splats, and layered storm boundaries.

The Cocos-side manifest for this route is:

```text
cocos-v03-demo/settings/v03-engine-proof-manifest.json
```

Official references:

- Cocos WeChat Mini Game publishing: https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-wechatgame.html
- Cocos particle system: https://docs.cocos.com/creator/3.8/manual/en/particle-system/
- Cocos skeletal animation: https://docs.cocos.com/creator/3.8/manual/en/animation/skeletal-animation.html

## Alternatives

LayaAir 3.x is the closest alternative if we want lower JS migration cost. It supports WeChat Mini Game publishing and has 2D/3D, particles, and TiledMap workflow. The risk is long-term maintainability and avoiding a second large hand-written JavaScript codebase.

Unity is too expensive for this project right now. It has the strongest visual pipeline, but migrating this JavaScript canvas prototype to Unity means a near rewrite in C# and a larger WeChat Mini Game package/performance risk.

Phaser/Pixi is good for fast browser prototypes, but not ideal as the production WeChat Mini Game foundation because WeChat runtime adaptation, asset caching, lifecycle, package constraints, and editor workflow become our responsibility.

## Demo

Run:

```text
http://localhost:8081/frontend/engine-demo/index.html
```

This demo uses Three.js/WebGL only as a local proof of the target visual language:

- orthographic 2.5D camera
- real 3D survivors and zombies
- height-based props and walls
- shadows
- XP pickups
- skill beams and orbiting effects
- mobile portrait HUD composition
- first playable loop: drag movement, zombie chase, auto-fire, XP collection, level feedback, and class/skill switching

It is not the final engine choice. The final implementation should be rebuilt in Cocos Creator after this visual direction is accepted.

## Migration Plan

1. Build a Cocos vertical slice: one map, one survivor class, three zombie types, auto-fire, XP pickups, skill buttons, and shrinking safe zone.
2. Reuse data concepts from this repo: characters, skills, monsters, maps, and progression JSON.
3. Rebuild rendering, input, UI, resources, and map loading as Cocos scenes/components.
4. Add WeChat Mini Game build verification early: package size, remote assets, cache, touch input, and real device FPS.
5. Only after the vertical slice matches V03, migrate remaining modes and editor workflow.
