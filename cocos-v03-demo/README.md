# Cocos V03 Demo Scaffold

This directory is the production-engine starting point for the V03 zombie battle royale target.

It is intentionally separate from the current browser prototype:

- `frontend/engine-demo/` is the playable Three.js visual reference.
- `frontend/src/map-contract.js` and `frontend/src/v03-runtime-config.js` are the shared data references.
- `cocos-v03-demo/` is where the Cocos Creator 3.x vertical slice should be built.

## Required Tooling

Install Cocos Creator 3.8.x, then create/open a Cocos project at this directory.

This environment currently does not include the Cocos Creator executable, so the demo source is scaffolded but not built here.

## Target

Build a real WeChat Mini Game vertical slice:

- Portrait 390x844 baseline.
- Orthographic 2.5D camera.
- One wasteland arena.
- Guardian/Ranger/Engineer identity data.
- ARC/BOOM/FAN skill data.
- Low-poly player, zombies, walls, cars, crates, barrels, XP shards, and safe zone ring.
- Touch drag movement, zombie chase, auto-fire, XP pickup, level feedback, and HUD.

## Suggested Cocos Scene

```text
V03Battle.scene
  CameraRig
    MainCamera
    FollowTarget
  World
    Ground
    Props
    SpawnPins
    RewardPins
  Actors
    Player
    Zombies
    Pickups
  FX
    SkillBeams
    SkillBursts
    HitFlashes
  UI
    TopHud
    MoveStick
    SkillButtons
    ClassPanel
```

## Source Files

- `assets/scripts/V03BattleDirector.ts`: first-playable component boundary and loop notes.
- `assets/scripts/V03MapRuntime.ts`: converts exported V03 map data into Cocos tile, prop, and gameplay pin nodes.
- `assets/scripts/V03VisualContract.ts`: names the required class gear, zombie variants, unit decals, FX layers, and review screenshots from the WebGL target.
- `assets/scripts/V03VisualRuntime.ts`: builds placeholder Cocos nodes from the visual contract so prefab work can replace structure without losing the target layers.
- `assets/scripts/V03Config.ts`: typed class, skill, and tuning defaults ported from the browser reference.
- `assets/scripts/V03MapContract.ts`: Cocos-side map contract shape.
- `assets/scripts/V03ResourceBridge.ts`: loads generated JSON from Cocos `resources/config`.
- `assets/resources/config/v03-runtime-config.json`: generated runtime config bridge from `frontend/src/v03-runtime-config.js`.
- `assets/resources/config/v03-standard-map.json`: generated standard V03 map bridge from `frontend/src/map-contract.js`.
- `assets/resources/config/v03-vertical-slice.json`: data-only slice target for designers and programmers.
- `settings/v03-engine-proof-manifest.json`: Cocos-side mapping from the browser engine proof to the production render route.
- `settings/v03-first-playable-checklist.json`: structured first-playable scene, prefab, screenshot, and runtime gate checklist.

Regenerate the bridge files from the repo root:

```text
npm run export:cocos-v03
```

Verify the browser reference and Cocos bridge stay in sync:

```text
npm run verify:v03
```

## Acceptance

The first Cocos commit is acceptable when a phone recording visibly beats the old HTML runtime and matches the WebGL reference in depth, shadows, readable silhouettes, class identity, skill effects, and mobile HUD spacing.
