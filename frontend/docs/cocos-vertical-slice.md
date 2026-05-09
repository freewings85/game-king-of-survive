# Cocos V03 Vertical Slice

This is the build target for the first Cocos Creator 3.x implementation. The current Three.js demo remains the visual and interaction reference until the Cocos slice can replace it on mobile.

## Success Criteria

- Portrait phone gameplay at 390x844 and common Android aspect ratios.
- Orthographic 2.5D camera with real height, shadows, props, XP pickups, and clear zombie silhouettes.
- One arena map using wasteland props: wreck cars, walls, crates, barricades, barrels, road tiles, reward points, and zombie entries.
- Three class identities matching the V03 direction: Guardian, Tech Engineer, Ranger.
- Three skill patterns matching the current demo contract: ARC chain beam, BOOM heavy burst, FAN spread cleanup.
- Early loop runs for at least two minutes without visual clutter: drag movement, zombie chase, auto-fire, XP pickup, level feedback, HP pressure, and readable survival count.
- Data boundaries are stable enough for the map editor to export the same map entities consumed by the game.

## Scene Layout

```text
V03Battle.scene
  CameraRig
    MainCamera
    FollowTarget
  World
    GroundTiles
    RoadMarks
    Props
    SpawnPins
    RewardPins
  Actors
    Player
    Zombies
    Projectiles
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

## Component Boundary

- `BattleDirector`: owns match state, timers, wave pressure, survival count, and level progression.
- `PlayerController`: reads touch input, applies class speed, rotates the player, and exposes weapon origin.
- `AutoFireSystem`: selects nearest targets by skill config and emits beam/burst FX.
- `ZombieSpawner`: loads zombie entries from map data and keeps pressure around the player.
- `PickupSystem`: handles XP drop, magnet movement, collection, and level-up feedback.
- `MapRuntime`: loads editor map JSON and instantiates Cocos prefabs for tiles, props, pins, and blockers.
- `HudPresenter`: renders HP, XP, level, survival count, skill selection, class, and skin swatches.

## Shared Config

Current reference config lives in:

- `frontend/engine-demo/v03-config.js`
- `frontend/src/map-contract.js`

Cocos should port these fields first:

- class visual identity: `mark`, `body`, `accent`, `emissive`, `skins`
- class gameplay identity: `moveSpeed`, `contactDamage`
- skill identity: `color`, `pulse`, `spread`, `damage`, `targets`, `range`
- early tuning: player HP, fire cooldown, zombie HP/speed, XP rewards, alive count pacing
- map runtime contract: tile definitions, wasteland prop definitions, gameplay pins, quality gates, `schemaVersion`, `visualProfile`, and `gameplayProfile`

## Map Contract

The editor and future runtime must consume the same map contract. The current browser contract is exposed as `window.KOS_MAP_CONTRACT` and provides:

- `createMap(cols, rows)`
- `normalizeMap(input)`
- `getQualityChecks(map)`
- `stampExport(map)`
- `tileDefs`, `propDefs`, `pinDefs`

The editor uses this contract before drawing, standardizing, and exporting maps. Cocos should mirror this shape instead of inventing a second map schema.

## First Commit Gate

The first Cocos slice is acceptable when it can be recorded on a phone viewport and visibly matches the current playable WebGL demo in these areas:

- 3D depth and shadow readability
- class/skill switching
- drag movement
- auto-fire against chasing zombies
- XP and level feedback
- no overlap between class panel, skill buttons, and top HUD

The WebGL demo is allowed to stay in the repo as a regression reference until the Cocos slice passes this gate.
