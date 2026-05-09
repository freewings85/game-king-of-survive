# Cocos V03 First Playable Checklist

Structured source:

```text
cocos-v03-demo/settings/v03-first-playable-checklist.json
```

The checklist defines the minimum Cocos scene structure needed before the Cocos slice can replace the WebGL reference for mobile review.

## Scene

Required scene:

```text
V03Battle.scene
```

Required node groups:

- `CameraRig`: camera and follow target.
- `World`: ground tiles, road marks, props, spawn pins, reward pins.
- `Actors`: player, zombies, projectiles, pickups.
- `FX`: skill beams, bursts, hit flashes, card layers.
- `UI`: top HUD, minimap, move stick, skill buttons, class panel.

## Components

Required component bindings:

- `V03BattleDirector` on `Root`, wired to `V03MapRuntime`, `V03VisualRuntime`, and `statusLabel`.
- `V03MapRuntime` on `World`, wired to ground, prop, spawn, and reward roots.
- `V03VisualRuntime` on `Actors`, wired to visual actor and FX roots and backed by `V03VisualContract`.

## Prefab Targets

Required prefab groups:

- Heroes: Guardian, Tech Engineer, Ranger.
- Zombies: Brute, Crawler, Hooded.
- Map: wreck car, wall, crate, barrel, barricade, XP shard, prop oil stain, prop rust stain, prop rubble chip, prop shadow blob.
- FX: FAN bullet/impact, BOOM shock/debris, ARC branch/node.
- UI: top HUD, minimap, move stick, skill button, class panel.

These names are placeholders until real Cocos prefabs exist, but the structure is intentional. Real asset work should replace these prefabs without changing the scene contract.

## Acceptance

The first Cocos playable slice must produce these screenshots or recordings:

- `cocos-v03-phone-portrait.png`
- `cocos-v03-phone-landscape.png`
- `cocos-v03-skill-fan.png`
- `cocos-v03-skill-boom.png`
- `cocos-v03-skill-arc.png`

Runtime gate:

- 120 second survival run.
- 30 FPS target on mid-range Android.
- WeChat Mini Game build.
- Offline config path works.

`e2e/v03-cocos-bridge-verify.js` validates that this checklist covers the scene, nodes, components, prefabs, visual contract coverage, screenshots, and runtime gate.
