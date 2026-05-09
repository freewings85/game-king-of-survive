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
- `assets/scripts/V03Config.ts`: class, skill, and tuning data ported from the browser reference.
- `assets/scripts/V03MapContract.ts`: Cocos-side map contract shape.
- `assets/resources/config/v03-vertical-slice.json`: data-only slice target for designers and programmers.

## Acceptance

The first Cocos commit is acceptable when a phone recording visibly beats the old HTML runtime and matches the WebGL reference in depth, shadows, readable silhouettes, class identity, skill effects, and mobile HUD spacing.
