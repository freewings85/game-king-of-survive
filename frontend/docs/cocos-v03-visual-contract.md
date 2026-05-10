# Cocos V03 Visual Contract

Reference target:

```text
candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png
```

Primary review screenshots:

- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`
- `can_delete/v03-gate/engine-demo-skill-boom.png`
- `can_delete/v03-gate/engine-demo-skill-arc.png`

The WebGL demo is the current visual target reference. Cocos Creator 3.x remains the intended WeChat mini-game engine. Cocos prefabs/components must preserve these visual layers when the reference moves out of WebGL.

## Hero Classes

Required class silhouettes:

- `guardian`: heavy shield, shield core, wide pauldrons.
- `tech`: coil device, backpack screen, dish node, antenna.
- `ranger`: hood, long rifle, scope, cape tip, cape stripe.

The class should read from the in-match phone view, not only from class buttons or cards.

## Zombie Variants

Required enemy variants:

- `brute`: wider/heavier body language and exposed rib/shoulder damage.
- `crawler`: lower, more hunched posture with longer reaching arms.
- `hooded`: hood/head silhouette and backpack or cloth mass.

Variants must keep the same combat contract but should be readable at phone scale.

## Unit Decals

Required decal layers:

- `face-highlight`
- `armor-edge`
- `class-gear-mark`
- `wound-patch`
- `rot-patch`
- `torn-cloth-panel`

These are the bridge from procedural low-poly shapes toward the reference image's illustrated units.

## Prop Ground Layers

Required prop-ground integration layers:

- `prop-oil-stain`
- `prop-rust-stain`
- `prop-rubble-chip`
- `prop-shadow-blob`

These layers keep cars, walls, barrels, crates, tires, and debris from looking pasted onto the tile map.

## Prop Wear Decals

Required prop-wear decal layers:

- `prop-edge-highlight`
- `prop-dark-panel`
- `prop-scratch-stack`
- `prop-glass-card`
- `prop-hazard-band`

These layers preserve the WebGL reference's authored cover readability: wreck cars need windows, headlights, edge highlights, and scratches; walls and crates need readable cracks and worn corners; barrels need hazard bands.

## Prop Shape Blocks

Required prop shape/value layers:

- `prop-light-block`
- `prop-shadow-block`
- `prop-cool-rim`
- `prop-rim-frame`

These layers are the larger value shapes that make wreck cars, walls, crates, barrels, and debris read as chunky cover on a phone screen instead of flat clean geometry.

## Prop Break Shapes

Required prop break/silhouette layers:

- `prop-jagged-cap`
- `prop-missing-corner`
- `prop-broken-hood`
- `prop-chipped-side`

These layers keep wreck cars, walls, crates, and barrels from reverting to clean boxes when the WebGL reference is rebuilt as Cocos prefabs.

## Prop Cover Sprites

Required prop cover sprite families:

- `prop-cover-wreck`
- `prop-cover-wall`
- `prop-cover-crate`
- `prop-cover-barrel`
- `prop-cover-tires`
- `prop-cover-debris`

These cover sprites preserve the current WebGL pass where wreck cars, tall walls, crates, barrels, tires, and debris receive painterly overlay cards above their functional collision roots. In Cocos they should become real sprite/prefab layers such as `PropCoverWreck`, `PropCoverWall`, `PropCoverCrate`, `PropCoverBarrel`, `PropCoverTires`, and `PropCoverDebris`, not only extra box geometry.

## Ground Wash Layers

Required painterly ground integration layers:

- `ground-wash-combat-asphalt`
- `ground-wash-road-dust`
- `ground-wash-rust-edge`

These layers preserve the WebGL reference's painterly ground pass that reduces visible tile seams while keeping the standard map contract intact. In Cocos they should become large translucent ground sprite/prefab layers such as `GroundWashCombatAsphalt`, `GroundWashRoadDust`, and `GroundWashRustEdge`.

## Safe-Zone Layers

Required painterly safe-zone boundary layers:

- `safe-zone-painterly-haze`
- `safe-zone-painterly-edge`

These layers preserve the WebGL reference's shrinking battle boundary as an illustrated storm edge instead of a clean geometric ring. In Cocos they should become translucent sprite/prefab layers such as `SafeZonePainterlyHaze` and `SafeZonePainterlyEdge`.

## Global Light Layers

Required global lighting/value layers:

- `stage-warm-focus`
- `stage-cool-depth`
- `stage-rim-light`
- `stage-edge-darkening`
- `stage-diagonal-shadow`

These layers keep the phone battle readable by separating the central fight from the darker wasteland edges and by preserving the WebGL reference's warm/cool depth cues.

## Object Rim Layers

Required per-object rim/highlight layers:

- `object-warm-rim`
- `object-cool-rim`
- `object-dark-side`
- `object-weapon-rim`
- `object-head-rim`

These layers keep heroes, zombies, weapons, and major props separated from the ground after global lighting is applied.

## Material Blend Layers

Required material blend layers:

- `material-warm-blend`
- `material-cool-blend`
- `material-dark-blend`
- `material-prop-blend`
- `material-unit-blend`

These layers soften hard object rim strips so hero, zombie, weapon, wall, car, crate, and barrel highlights feel integrated with their base materials.

## Painterly Card Layers

Required sprite/card layers:

- `hero-card`
- `rival-card`
- `zombie-variant-card`
- `skill-fx-card`
- `hit-feedback-card`

These layers preserve the WebGL reference's runtime canvas-texture card pass in Cocos. They should become real sprites or billboard prefabs, not only low-poly boxes.

## Sprite Asset Families

Required hero skin sprites:

- `class-skin-guardian-0`
- `class-skin-guardian-1`
- `class-skin-guardian-2`
- `class-skin-tech-0`
- `class-skin-tech-1`
- `class-skin-tech-2`
- `class-skin-ranger-0`
- `class-skin-ranger-1`
- `class-skin-ranger-2`

Required in-match unit sprites:

- `hero-guardian-0-isometric`
- `hero-guardian-0-attack-isometric`
- `hero-guardian-1-isometric`
- `hero-guardian-1-attack-isometric`
- `hero-guardian-2-isometric`
- `hero-guardian-2-attack-isometric`
- `hero-tech-0-isometric`
- `hero-tech-0-attack-isometric`
- `hero-tech-1-isometric`
- `hero-tech-1-attack-isometric`
- `hero-tech-2-isometric`
- `hero-tech-2-attack-isometric`
- `hero-ranger-0-isometric`
- `hero-ranger-0-attack-isometric`
- `hero-ranger-1-isometric`
- `hero-ranger-1-attack-isometric`
- `hero-ranger-2-isometric`
- `hero-ranger-2-attack-isometric`

Required zombie card sprites:

- `zombie-card-brute`
- `zombie-card-brute-hit`
- `zombie-card-brute-walk`
- `zombie-card-crawler`
- `zombie-card-crawler-hit`
- `zombie-card-crawler-walk`
- `zombie-card-hooded`
- `zombie-card-hooded-hit`
- `zombie-card-hooded-walk`

Required skill card sprites:

- `skill-card-arc`
- `skill-card-boom`
- `skill-card-fan`

Cocos must preserve these asset family names when replacing the WebGL PNG placeholders with real sprites, billboards, or prefab-backed renderers. This keeps the class/skin, zombie, and skill art direction from silently collapsing back to procedural boxes.

## Skill FX

Required FX layers:

- `fan`: muzzle card, bullet card, warm trail, impact card.
- `boom`: muzzle card, explosion core, shock ring, debris card, smoke card.
- `arc`: muzzle card, branch link, glow link, node ring, impact card.

FX must remain readable over the wasteland map and must not hide enemies, pickups, minimap, joystick, or skill buttons.

## Verification

`e2e/v03-cocos-bridge-verify.js` checks that the Cocos visual contract source exists and contains the required class gear, zombie variants, unit decals, prop-ground layers, prop-wear decals, prop shape blocks, prop break shapes, prop cover sprites, ground wash layers, safe-zone layers, global light layers, object rim layers, material blend layers, painterly card layers, hero skin sprites, zombie card sprites, skill card sprites, FX layers, and review screenshot names.
