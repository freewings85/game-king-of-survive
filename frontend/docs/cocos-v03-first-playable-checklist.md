# Cocos V03 First Playable Checklist

Structured source:

```text
cocos-v03-demo/settings/v03-first-playable-checklist.json
```

Scene assembly source:

```text
cocos-v03-demo/settings/v03-scene-assembly-manifest.json
```

The checklist defines the minimum Cocos scene structure needed before the Cocos slice can replace the WebGL reference for mobile review.
The assembly manifest is `source-manifest-only`: it describes the required `V03Battle.scene` layout, bindings, prefab names, screenshots, and runtime gate, but it is not a real Cocos Creator scene asset yet.

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
- `V03SceneBootstrap` on `Root`, able to create the required camera, world, actor, FX, and UI roots when the hand-authored scene asset is not available yet.
- `V03MapRuntime` on `World`, wired to ground, prop, spawn, and reward roots.
- `V03ContactShadowRuntime` on `World`, wired to contact shadow roots and able to create shadow meshes from player spawn, zombie entries, and prop structures.
- `V03VisualRuntime` on `Actors`, wired to visual actor and FX roots and backed by `V03VisualContract`.
- `V03ArtSpriteRuntime` on `Actors`, wired to the imported V03 art manifest and able to create Sprite nodes from `spriteFramePath` entries, then bind unit, zombie, prop, and skill sprites to map spawn points, zombie entries, structures, and combat anchors with per-group scale and depth ordering.

## Prefab Targets

Required prefab groups:

- Heroes: Guardian, Tech Engineer, Ranger, plus the nine class skin sprite prefabs ClassSkinGuardian0-2, ClassSkinTech0-2, and ClassSkinRanger0-2.
- Zombies: Brute, Crawler, Hooded, plus ZombieCardBrute, ZombieCardCrawler, and ZombieCardHooded.
- Map: wreck car, wall, crate, barrel, barricade, XP shard, prop oil stain, prop rust stain, prop rubble chip, prop shadow blob, prop edge highlight, prop dark panel, prop scratch stack, prop glass card, prop hazard band, prop light block, prop shadow block, prop cool rim, prop rim frame, prop jagged cap, prop missing corner, prop broken hood, prop chipped side, PropCoverWreck, PropCoverWall, PropCoverCrate, PropCoverBarrel, PropCoverTires, PropCoverDebris, GroundWashCombatAsphalt, GroundWashRoadDust, GroundWashRustEdge, SafeZonePainterlyHaze, SafeZonePainterlyEdge, stage warm focus, stage cool depth, stage rim light, stage edge darkening, stage diagonal shadow, object warm rim, object cool rim, object dark side, object weapon rim, object head rim, material warm blend, material cool blend, material dark blend, material prop blend, material unit blend, painterly hero/rival/zombie/skill/hit cards.
- FX: FAN bullet/impact, BOOM shock/debris, ARC branch/node, plus SkillCardArc, SkillCardBoom, and SkillCardFan.
- UI: top HUD, minimap, move stick, skill button, class panel.

These names are placeholders until real Cocos prefabs exist, but the structure is intentional. Real asset work should replace these prefabs without changing the scene contract.

The Cocos resource bridge also loads `assets/resources/config/v03-art-assets.json`, which maps imported PNGs under `assets/resources/art/v03/` to stable resource paths and `spriteFramePath` entries for portraits, the Ranger unit sprite, zombie cards, skill cards, and prop cover sprites.

The checklist also requires visual contract coverage for `heroSkinSprites`, `zombieCardSprites`, `skillCardSprites`, `propCoverSprites`, `groundWashLayers`, and `safeZoneLayers` so the Cocos slice keeps pace with the current WebGL V03 reference.

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

`e2e/v03-cocos-bridge-verify.js` validates that this checklist covers the scene, nodes, components, prefabs, visual contract coverage, screenshots, and runtime gate. `e2e/v03-cocos-scene-assembly-verify.js` cross-checks the scene assembly manifest against this checklist and keeps the current Cocos gap explicit.
