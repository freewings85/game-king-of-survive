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

## Skill FX

Required FX layers:

- `fan`: muzzle card, bullet card, warm trail, impact card.
- `boom`: muzzle card, explosion core, shock ring, debris card, smoke card.
- `arc`: muzzle card, branch link, glow link, node ring, impact card.

FX must remain readable over the wasteland map and must not hide enemies, pickups, minimap, joystick, or skill buttons.

## Verification

`e2e/v03-cocos-bridge-verify.js` checks that the Cocos visual contract source exists and contains the required class gear, zombie variants, unit decals, prop-ground layers, prop-wear decals, FX layers, and review screenshot names.
