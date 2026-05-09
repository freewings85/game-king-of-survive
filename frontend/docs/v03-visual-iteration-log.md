# V03 Visual Iteration Log

Reference image:

```text
candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png
```

Rule for future work:

After every meaningful V03 visual/gameplay iteration, update this file with:

- the commit or work-in-progress label
- the screenshots reviewed
- what moved closer to the reference
- what is still far away
- the next iteration direction

Passing `npm run verify:v03` is not enough. The gate proves structure and baseline behavior; this log records visual distance from the target.

## 2026-05-10 Current Baseline

Related commits:

- `61a07f3 feat(frontend): deepen v03 engine demo visuals`
- `5db2a31 feat(frontend): add class-specific demo gear`
- `8b4a137 feat(editor): preview maps with v03 renderer`
- `ca77407 feat(frontend): bind v03 shell to shared config`
- `505529e test(frontend): gate v03 early combat pacing`
- `65f365c feat(cocos): load v03 bridge resources`

Reviewed screenshots:

- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/v03-shell-framework.png`
- `can_delete/v03-gate/editor-standard-map.png`

What improved:

- The WebGL demo now has real 2.5D depth, tile layers, wall height, prop shadows, a phone HUD, class gear, skill beams, XP drops, safe zone, rival cue, and early combat pacing.
- The V03 shell now shows the same 3 classes, 9 skin swatches, 3 skills, and standard map data as the runtime config.
- The editor preview uses the shared V03 renderer and current map data instead of a fixed fake preview.
- Cocos now has shared JSON loading and a map runtime component scaffold.

What is still far from the reference:

- Character art is still blocky procedural geometry. The reference has illustrated, readable heroes with faces, clothing, armor, hands, weapons, and strong silhouettes.
- Zombies are still primitive cylinders/boxes. The reference zombies have hunched posture, heads, arms, clothes, skin variation, animation potential, and readable threat direction.
- Skill effects are structurally correct but not art-directed enough. The reference has brighter muzzle flashes, bullet trails, explosion cores, electric arcs, and glow shapes with impact readability.
- Ground and props are too grid-like and clean. The reference uses painterly cracked asphalt, debris scatter, grass tufts, rusted cars, crates, barrels, and edge wear.
- Phone UI is functional but not polished enough. The reference has a heavier device frame, circular minimap, icon buttons, layered skill buttons, and tighter HUD styling.
- The Cocos slice is not yet a real playable scene/build in Cocos Creator or WeChat DevTools.

Current visual distance:

```text
Structure: medium-close
Gameplay readability: medium
Art quality: far
Character/zombie asset quality: far
Skill FX quality: medium-far
Phone UI polish: medium-far
Production mini-game readiness: far
```

Next iteration direction:

1. Replace primitive hero/zombie geometry in the WebGL reference with higher-fidelity stylized silhouettes: heads, hair/hoods, shoulders, hands, armor plates, weapon profiles, and zombie posture variation.
2. Upgrade skill FX first because it has high player-facing impact: muzzle flashes, fan volley bullet sprites, BOOM explosion shock ring, ARC branching lightning with glow.
3. Push ground art closer to the reference: cracked asphalt chunks, non-uniform tile edges, debris clusters, grass tufts, rust stains, and darker vignette.
4. Improve phone UI composition: circular minimap, skill buttons with icon art, smaller readable HUD clusters, and stronger frame depth.
5. In parallel, continue turning `cocos-v03-demo/` into a real Cocos scene so the improved target can move into the production engine.

## 2026-05-10 Character Silhouette Pass

Related work:

- WebGL reference WIP after `290a7d5`

Reviewed screenshot:

- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- The Ranger now has a more readable silhouette: hair block, eye band, hands, shoulder armor, backpack, cloak, and longer weapon profile.
- Zombies now read less like plain boxes: hunched torso, rag layer, forward arms, jaw block, claws, brighter eyes, and varied scale.
- Skill FX now has visible projectile tips and muzzle flash, so FAN/weapon fire reads more like active combat instead of static tan beams.
- The gate now records `silhouettePartCount`, `zombieDetailPartCount`, and `fxTipCount`, which prevents future visual passes from accidentally dropping these details.

What is still far from the reference:

- The assets are still procedural low-poly blocks. The reference has illustrated characters with expressive faces, hair shapes, cloth folds, gloves, boots, and deliberate weapon silhouettes.
- Zombies still lack strong undead personality: no torn clothing shapes beyond simple blocks, no curved spine, no hands/fingers, no readable bite/skin damage.
- FX is brighter but still not art-directed enough: no fan bullet sprites, no impact sparks, no electric branching for ARC in the main phone shot, no BOOM shock ring in live combat.
- The ground still looks like a uniform grid. The reference has painterly asphalt variation, rubble, grass tufts, rust stains, and debris clusters that break the tile pattern.

Next iteration direction:

1. Replace more box geometry with silhouette-focused primitives: wedge shoulders, hood/hair shapes, boots, gloves, curved zombie arms, and larger asymmetric zombie heads.
2. Add live skill-specific FX states: FAN bullet sprites, BOOM ring/explosion on hit, ARC branching lightning in the playable phone view.
3. Add ground detail decals: crack lines, rubble clusters, grass tufts, oil/rust stains, and tile edge noise around the player area.
4. Move phone HUD toward the reference: circular minimap, icon-like skill buttons, and a heavier device/frame treatment.

## 2026-05-10 FX And Ground Detail Pass

Related work:

- WebGL reference WIP after `5808717`

Reviewed screenshot:

- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- FAN now has visible bullet/projectile tips in addition to beam streaks, closer to the reference's readable bullet volley.
- The playable scene now tracks dedicated FX readiness: `fanRoundCount`, `boomRingReady`, and `arcBranchCount`.
- Ground tiles now have generated cracks and grass tufts, reducing the overly clean grid feel.
- The gate now records `groundDetailCount`, so the wasteland detail layer cannot silently disappear.

What is still far from the reference:

- The live phone screenshot still only proves the active FAN view. BOOM explosion and ARC branching need dedicated visual review states or screenshots.
- Ground detail is present but still procedural and sparse compared with the reference's painterly asphalt, rubble, stains, tufts, and worn object edges.
- Bullet and muzzle FX remain simple geometry, not sprite-like painted effects with warm cores, glow falloff, and impact sparks.
- The phone UI and minimap are still much simpler than the reference.

Next iteration direction:

1. Add deterministic review states/screenshots for ARC, BOOM, and FAN so each skill can be compared against the reference panels.
2. Add live impact effects: hit sparks, BOOM shock ring/explosion core, ARC branching in the active phone screenshot.
3. Increase prop/ground art density around the player without blocking readability: rubble chips, rust marks, oil stains, grass clumps, and broken asphalt plates.
4. Start a phone UI pass: circular minimap and icon-based skill buttons matching the reference composition.

## 2026-05-10 Skill Review Screenshot Pass

Related work:

- WebGL reference WIP after `1b3874a`

Reviewed screenshots:

- `can_delete/v03-gate/engine-demo-skill-arc.png`
- `can_delete/v03-gate/engine-demo-skill-boom.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`

What moved closer:

- ARC, BOOM, and FAN now each have a deterministic review screenshot, matching the reference image's separate skill panels more closely as a review workflow.
- ARC shows branching blue links between zombies.
- BOOM shows an orange shock ring around the target area.
- FAN shows multiple projectile tips in a spread pattern.
- The verifier now checks each skill independently instead of relying only on the active phone screenshot.

What is still far from the reference:

- FX shapes are still simple geometry. The reference uses painted bullets, warm muzzle cores, explosion debris, electric glow, and richer impact contrast.
- ARC branches need more jagged lightning shape and brighter glow.
- BOOM needs an explosion core, sparks, smoke/dust, and radial debris, not only a flat ring.
- FAN bullets need sprite-like projectile bodies with stronger warm trails and target impact points.

Next iteration direction:

1. Add skill-specific painted-style primitives: bullet capsules with hot cores, BOOM core/spark shards, ARC segmented lightning branches.
2. Add impact feedback on zombies: hit flashes, brief scale pulse, damage sparks at contact points.
3. Make the skill review screenshots part of visual comparison after every FX pass.
4. Start the phone UI pass once FX readability is closer to the reference.

## 2026-05-10 FX Art Direction Pass

Related work:

- WebGL reference WIP after `4400c59`

Reviewed screenshots:

- `can_delete/v03-gate/engine-demo-skill-arc.png`
- `can_delete/v03-gate/engine-demo-skill-boom.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- FAN now has warm projectile trails behind the bullet bodies, so the spread reads more like a skill volley instead of isolated dots.
- BOOM now has a hot center, smoke ring, and radial sparks around the target, closer to the reference's explosive impact panel.
- ARC now has a secondary glow layer behind the branch links, making the electric skill more readable in the review shot.
- The verifier now records and gates `fanTrailCount`, `boomSparkCount`, and `arcGlowCount`, so the richer FX layers are treated as required progress.

What is still far from the reference:

- The effects are still procedural primitives, not painted sprite sheets with soft alpha, debris silhouettes, impact flashes, and color falloff.
- FAN lacks target impact sparks and muzzle flare shape variation.
- BOOM needs stronger dust/debris, screen-space heat, and an expanding ring that feels less flat.
- ARC needs jagged segmented lightning, branching forks, and hit flashes on multiple zombies.
- The phone UI, character art, and zombie art still lag far behind the target image's illustrated finish.

Next iteration direction:

1. Add hit feedback on zombies for all skills: flash material, small impact sparks, and brief scale/knockback pulse.
2. Replace more FX primitives with layered sprite-like planes so the look moves toward painted game art.
3. Start the phone UI pass: circular minimap, icon-like skill buttons, tighter HUD, and stronger device frame.
4. Keep comparing the review screenshots against the target image after each visual pass before moving on.

## 2026-05-10 Mobile HUD And Hit Feedback Pass

Related work:

- WebGL reference WIP after `f6ba52d`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-skill-arc.png`
- `can_delete/v03-gate/engine-demo-skill-boom.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`

What moved closer:

- The phone HUD now has a circular minimap, player/rival/zombie/loot dots, a safe-zone ring, smaller utility buttons, and more target-like circular skill buttons.
- Skill buttons now carry icon-like visual marks instead of plain text-only circles.
- The portrait camera is pulled back so the combat scene reads less oversized and shows more arena context.
- Weapon hits now spawn short-lived impact sparks and apply a hit pulse to zombies, so combat has contact feedback instead of only beams passing through targets.
- The verifier now gates `impactSparkCount`, `hitPulseCount`, `hasMiniMap`, `miniMapZombieDots`, and `iconSkillButtons`.

What is still far from the reference:

- The UI is structurally closer, but the reference has a polished phone frame, compact landscape composition, better icon art, and layered HUD shadows.
- Characters and zombies are still low-poly procedural shapes rather than illustrated sprites/models with expressive faces, clothing, gear, and pose language.
- Impact effects are visible but still geometric; the reference needs painted flashes, debris chips, smoke, and stronger color falloff.
- The scene still lacks enough hand-authored ground/prop art variation around the player compared with the target.

Next iteration direction:

1. Build a stronger phone/device frame and landscape-oriented review state, because the target image's main gameplay panel is landscape.
2. Push hit feedback toward painted layers: muzzle burst cards, target flash planes, debris chips, and zombie damage tint.
3. Improve hero/zombie silhouettes next, especially faces, hair/hood shapes, boots, gloves, weapons, and torn clothing.
4. Keep the Cocos path active after the WebGL target gets closer, since the final mini-game engine remains Cocos Creator 3.x.

## 2026-05-10 Landscape Phone Review Pass

Related work:

- WebGL reference WIP after `96e7630`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- A deterministic landscape phone screenshot now exists, matching the reference image's main gameplay panel much better than the portrait-only review.
- Landscape mode adds a rounded phone frame, side notch, right-top circular minimap, right-bottom skill buttons, and left joystick composition.
- The landscape review hides the class strip so the combat surface reads more like an in-match phone UI.
- The verifier now gates the landscape frame radius, minimap size, hidden class strip, clear skill button placement, WebGL rendering, combat damage, and visible hit sparks.

What is still far from the reference:

- The main gap is now asset finish rather than layout: heroes and zombies are still primitive low-poly bodies instead of illustrated, readable units.
- The target has a richer cracked asphalt/painterly prop field; the current map is more modular and tiled.
- The target phone panel has more polished icon art and dense but clean HUD layering.
- The landscape review currently proves layout and combat readability, not production WeChat/Cocos build quality.

Next iteration direction:

1. Use `engine-demo-landscape-phone.png` as the primary visual comparison screenshot for the target gameplay panel.
2. Start a character/zombie asset pass: larger heads, faces, hair/hoods, boots, gloves, weapon silhouettes, torn clothing, and damage-color variation.
3. Add painted-style impact cards and muzzle flashes in the landscape review so bullets, explosions, and arcs read closer to the reference.
4. Keep portrait screenshots as small-program ergonomics checks, but judge art direction mainly against the landscape target panel.

## 2026-05-10 Unit Readability Pass

Related work:

- WebGL reference WIP after `4df5a63`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- Player/rival silhouettes gained more readable unit details: boots, face shadow, eyes, hair spikes, gloves, and a stronger weapon stock.
- Zombies gained undead-specific details: boots, teeth, skull patches, fingers, and torn hanging cloth.
- The verifier threshold moved from `silhouettePartCount >= 35` to `>= 60` and from `zombieDetailPartCount >= 120` to `>= 200`; the current run reports 68 and 230.
- In the landscape review, the unit field now reads a little closer to the reference's crowd of distinct zombies surrounding a hero.

What is still far from the reference:

- The target still has hand-authored illustrated characters with expression, clothing folds, armor design, weapons, and strong color grouping; this pass is still procedural geometry.
- Zombie posture needs more variety: crawlers, bent backs, different heads, torn shirts, backpacks, exposed bones, and skin-color variation.
- The hero needs class-specific silhouettes to be much stronger: Guardian shield mass, Tech device glow, Ranger rifle/hood profile.
- Unit animation is still basic movement and scale pulse, not real attack/recoil/hit/death animation.

Next iteration direction:

1. Add class-specific hero silhouettes that are visible in the landscape gameplay panel, not only in the class strip.
2. Add zombie variants with different heads, cloth colors, hunched angles, and threat poses.
3. Push weapon/fire animation with muzzle cards and brief recoil so the hero action reads like the reference.
4. After another WebGL visual pass, start mapping these unit requirements into Cocos prefab/component expectations.

## 2026-05-10 Class And Zombie Variant Pass

Related work:

- WebGL reference WIP after `ce06b39`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- Class gear now has stronger in-combat silhouettes: Guardian gets a heavier shield/pauldrons, Tech gets a backpack device/dish/antenna, and Ranger gets a hood, scope, cape tip, and stronger long-rifle profile.
- Zombies now spawn as three deterministic variants: brute, crawler, and hooded. The crowd reads less cloned in the landscape phone review.
- The verifier now gates `activeGearCount >= 5`, `silhouettePartCount >= 75`, `zombieDetailPartCount >= 245`, and `zombieVariantCount >= 3`; the current run reports 5, 86, 253, and 3.
- The landscape phone screenshot now has clearer hero-vs-horde shape contrast.

What is still far from the reference:

- The visual language is still procedural low-poly. The reference relies on painted sprite/model surfaces, outlines, readable faces, hair, armor, cloth folds, and richer color accents.
- Zombie variants need stronger gameplay silhouettes: crawler should be visibly low, brute should feel wider/heavier, hooded should read as a different threat at small scale.
- Class gear is more visible, but the class fantasy is not yet as strong as the reference's three class groups and skill-card presentation.
- Cocos still only has bridge/runtime scaffolding for this direction, not prefab-quality translated assets.

Next iteration direction:

1. Add painted-style 2D planes/cards on top of the low-poly units: face highlights, armor decals, torn-cloth panels, and weapon/muzzle cards.
2. Give zombie variants stronger scale/posture differences and color accents while preserving combat readability.
3. Add a Cocos visual contract note for required class gear and zombie variant components so this work can migrate out of the WebGL reference.
4. Continue using the landscape phone screenshot as the main target comparison for gameplay art direction.

## 2026-05-10 Unit Decal Layer Pass

Related work:

- WebGL reference WIP after `c28ea21`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- Units now have a lightweight painted/decal layer over the low-poly bodies: face highlights, armor edge lines, class gear marks, zombie wound patches, rot patches, and torn-cloth color panels.
- The visual gate now records `unitDecalCount`; the current run reports 52 decal-layer pieces.
- `zombieDetailPartCount` rose to 293 while the screenshots remain readable, so the extra detail is not only hidden behind counters.
- The portrait review shows clearer armor/cloth/rot contrast around the player and nearby zombies.

What is still far from the reference:

- These are still geometric decals. The reference uses proper painted sprite/model textures, outlines, soft shading, and expressive faces.
- Decals need more art direction: controlled palettes per zombie variant, class-specific iconography, and cleaner silhouette accents.
- Skill FX still needs painted muzzle/impact cards to match the target's bullets, explosions, and electric arcs.
- The Cocos runtime does not yet encode this decal/component requirement.

Next iteration direction:

1. Add painted-style muzzle and impact cards so attacks feel closer to the reference, not just the unit bodies.
2. Create a Cocos visual contract document covering required hero gear, zombie variants, decal layers, and FX layers.
3. Start translating the WebGL reference expectations into Cocos prefab/component names even before final assets exist.
4. Keep screenshots as the source of truth: counters prevent regression but visual comparison decides direction.

## 2026-05-10 FX Card Layer Pass

Related work:

- WebGL reference WIP after `b14fdb9`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-skill-boom.png`
- `can_delete/v03-gate/engine-demo-skill-arc.png`

What moved closer:

- Attacks now have a second FX art layer beyond beams and small sparks: muzzle cards, impact cards, BOOM debris/smoke cards, and ARC node rings.
- BOOM reads closer to the reference's explosion panel because the target area has a visible orange ring, debris shards, and smoke-like cards.
- ARC reads closer to the reference's electric panel because targets now get blue node rings in addition to branch/glow links.
- The verifier now records `fxCardCount`; current runs report 9 in the main FAN state, 13 in BOOM review, and 11 in ARC review.

What is still far from the reference:

- The cards are still simple procedural planes. The reference needs authored sprite shapes, soft alpha, impact lighting, dust, and directional debris.
- FAN still needs stronger bullet body art and impact points like the reference's volley panel.
- FX timing is readable but not animated with authored anticipation/impact/fade sequences.
- The Cocos bridge does not yet encode these FX-layer requirements.

Next iteration direction:

1. Add a Cocos visual contract for hero gear, zombie variants, unit decals, and FX card layers so the WebGL reference can be migrated coherently.
2. Improve FAN specifically with painted bullet cards, warm trails, and target impact marks.
3. Add stronger dust/smoke layers for BOOM without obscuring the playfield.
4. Keep landscape screenshot review as the primary visual target for combat readability.

## 2026-05-10 Cocos Visual Contract Pass

Related work:

- Cocos contract WIP after `238b3b4`

Reviewed artifacts:

- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `frontend/docs/cocos-v03-visual-contract.md`
- `e2e/v03-cocos-bridge-verify.js`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- The WebGL reference expectations are now named for Cocos migration: hero class gear, zombie variants, unit decals, FX layers, and required review screenshots.
- `V03VisualContract.ts` gives Cocos-side names for Guardian/Tech/Ranger gear, `brute/crawler/hooded` zombies, decal layers, and FAN/BOOM/ARC FX layers.
- `e2e/v03-cocos-bridge-verify.js` now gates the visual contract alongside runtime config, map data, resource bridge, map runtime, and battle director wiring.
- This reduces the risk that future Cocos prefab work rebuilds only the gameplay shell and loses the visual direction established in WebGL.

What is still far from the reference:

- The contract does not create Cocos prefabs yet; it only names and verifies the required visual surface.
- Cocos still cannot be built here because Cocos Creator is not installed in this environment.
- Final mini-game quality still depends on turning these names into real Cocos nodes, materials, sprite atlases, animation clips, and WeChat-device verification.

Next iteration direction:

1. Start a Cocos prefab/component scaffold that consumes `V03VisualContract.ts` names for hero gear, zombie variants, decal layers, and FX layers.
2. Keep the WebGL reference evolving visually, but make every new major visual layer translatable to Cocos contract names.
3. Add FAN-specific bullet/impact card improvements next, because FAN is the default gameplay screenshot and closest to the reference's main phone panel.

## 2026-05-10 Cocos Visual Runtime Scaffold Pass

Related work:

- Cocos scaffold WIP after `470abd5`

Reviewed artifacts:

- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/assets/scripts/V03BattleDirector.ts`
- `e2e/v03-cocos-bridge-verify.js`
- `cocos-v03-demo/README.md`

What moved closer:

- Cocos now has a `V03VisualRuntime` component that consumes `V03VisualContract.ts` and builds placeholder nodes for hero gear, zombie variants, unit decals, and skill FX layers.
- `V03BattleDirector` exposes `public visualRuntime: V03VisualRuntime` and builds it with the current class/skill selection, so the visual contract is part of the slice flow rather than a standalone document.
- The Cocos bridge verifier now checks `visualRuntime: true` in addition to runtime config, map bridge, map runtime, and visual contract coverage.
- This creates a replaceable prefab/component structure for real Cocos assets while preserving the WebGL target's visual layers.

What is still far from the reference:

- The Cocos visual runtime builds placeholder boxes, not final sprites/models/materials/animations.
- It still cannot be run in Cocos Creator here because the editor executable is not available.
- The actual WeChat mini-game needs device screenshots and performance checks once Cocos prefabs replace placeholders.

Next iteration direction:

1. Add a Cocos-side first playable scene/prefab checklist that maps each runtime node group to required prefab assets.
2. Continue improving FAN bullets and impact marks in the WebGL landscape review, then mirror the named layer in `V03VisualContract.ts` if the structure changes.
3. When Cocos Creator is available, instantiate `V03BattleDirector`, `V03MapRuntime`, and `V03VisualRuntime` in a scene and verify it visually.

## 2026-05-10 FAN Bullet Card Pass

Related work:

- WebGL reference WIP after `197229e`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`

What moved closer:

- FAN now has dedicated bullet cards in addition to capsule rounds and warm trails, so the volley reads more like the reference's fan bullet panel.
- FAN targets now receive impact rings, making the hit points clearer in the main mobile screenshot and the FAN review screenshot.
- The verifier now gates `fanBulletCardCount >= 6`, `fanImpactMarkCount >= 3`, and a higher `fxCardCount`; the current run reports 7, 7, and 23 in the main FAN state.
- The landscape phone review remains readable after the extra FAN layers.

What is still far from the reference:

- FAN bullets are still procedural cards, not authored bullet sprites with soft glow and shaded metal.
- Impact rings need richer spark/debris breakup and better directional marks on zombie bodies.
- The WebGL reference has improved, but the final Cocos implementation still needs real prefab assets and Cocos-device screenshots.

Next iteration direction:

1. Add a Cocos-side first playable checklist for scene setup and prefab asset names.
2. Improve wasteland ground/prop painterly details around the player so the map surface catches up with units and FX.
3. When Cocos Creator is available, verify that the visual runtime scaffold can be instantiated in a real scene.

## 2026-05-10 Cocos First Playable Checklist Pass

Related work:

- Cocos planning WIP after `19a000e`

Reviewed artifacts:

- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-first-playable-checklist.md`
- `e2e/v03-cocos-bridge-verify.js`
- `cocos-v03-demo/README.md`

What moved closer:

- The Cocos target now has a structured first-playable checklist covering `V03Battle.scene`, phone viewports, required scene nodes, component bindings, prefab names, visual contract coverage, acceptance screenshots, and runtime gates.
- The checklist explicitly names hero, zombie, map, FX, and UI prefab targets, including FAN bullet/impact, BOOM shock/debris, and ARC branch/node prefabs.
- The Cocos bridge verifier now gates `firstPlayableChecklist: true`, so scene planning is checked together with map/runtime/visual contract coverage.
- This makes the next Cocos step concrete: create the scene and replace checklist prefab names with real Cocos assets.

What is still far from the reference:

- The checklist is not a scene file and does not prove Cocos rendering yet.
- Cocos Creator is still unavailable in this environment, so no `.scene` asset, phone build, or WeChat DevTools run has been produced.
- The final art gap remains: real sprites/models/materials/animations are still needed.

Next iteration direction:

1. Improve wasteland ground/prop painterly detail in the WebGL reference so the map surface catches up with units and FX.
2. If Cocos Creator becomes available, instantiate the required scene nodes and bind `V03BattleDirector`, `V03MapRuntime`, and `V03VisualRuntime`.
3. Keep Cocos checklist and visual contract synchronized whenever the WebGL visual direction changes.

## 2026-05-10 Wasteland Ground Detail Pass

Related work:

- WebGL reference WIP after `6f8d155`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- Ground tiles now include oil stains, rust stains, and small rubble chips in addition to cracks and grass tufts.
- The wasteland surface reads less like a clean grid and more like the reference image's cracked, dirty arena floor.
- `groundDetailCount` increased from 91 to 160, and the verifier threshold moved from 80 to 145.
- The added detail does not visibly block hero, zombie, pickups, minimap, joystick, or skill buttons in the reviewed screenshots.

What is still far from the reference:

- The surface is still procedural; the reference has authored asphalt plates, painterly wear, and stronger prop-ground integration.
- Props still need painted edge wear, rust streaks, and debris clusters around cars/walls/barrels.
- Cocos map runtime still uses placeholder boxes for props and does not yet generate this richer ground detail layer.

Next iteration direction:

1. Add prop-adjacent debris/rust clusters around wreck cars, walls, and barrels in the WebGL reference.
2. Mirror the ground detail expectations in the Cocos visual/scene checklist if the layer becomes a required runtime surface.
3. Continue checking that extra map detail does not reduce phone-scale combat readability.

## 2026-05-10 Prop Ground Integration Pass

Related work:

- WebGL reference WIP after `bae0731`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

What moved closer:

- Wreck cars, walls, crates, barrels, tires, and debris now add local oil/rust stains and rubble chips around their bases.
- Props feel less pasted onto the tile map and more embedded in the wasteland surface.
- `groundDetailCount` increased from 160 to 238, and the verifier threshold moved from 145 to 220.
- The extra prop-edge details do not obscure characters, XP shards, the safe zone, minimap, joystick, or skill buttons in the reviewed screenshots.

What is still far from the reference:

- Prop wear is still procedural. The reference has authored rust streaks, broken asphalt plates, and hand-placed debris clusters.
- Cocos map runtime does not yet generate prop-adjacent scatter; the Cocos checklist names map prefabs but not this exact detail layer.
- The WebGL reference still lacks full hand-painted prop textures.

Next iteration direction:

1. Mirror prop-ground scatter in the Cocos first-playable checklist or visual contract if it becomes mandatory for the final look.
2. Add stronger authored-looking prop wear decals to wreck cars and walls.
3. Keep phone-scale readability as the constraint for any further map detail.

## 2026-05-10 Cocos Prop Ground Layer Contract Pass

Related work:

- Cocos bridge/checklist WIP after `8f3bc32`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/assets/scripts/V03BattleDirector.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`
- `frontend/docs/cocos-v03-first-playable-checklist.md`

What moved closer:

- Prop-ground scatter is now a named Cocos visual contract instead of only a WebGL implementation detail.
- The Cocos runtime placeholder now reports prop-ground layer coverage beside hero gear, zombie variants, unit decals, and FX layers.
- The first-playable checklist now names oil stain, rust stain, rubble chip, and shadow blob prefabs, which keeps the future Cocos scene aligned with the target's grounded wasteland look.
- The Cocos bridge verifier now fails if these layers disappear from source, docs, or checklist coverage.

What is still far from the reference:

- This pass does not produce a real Cocos scene, authored prefab, or phone build.
- The Cocos runtime still uses placeholder boxes for visual-contract coverage.
- The reference image's depth comes from authored lighting, painterly textures, contact shadows, and shape language; this pass only locks the required layer names and acceptance gates.

Next iteration direction:

1. Build a stronger authored-looking prop wear/decal pass in the WebGL reference so wreck cars, walls, barrels, crates, and debris move closer to the target image's illustrated depth.
2. When Cocos Creator is available, replace placeholder prop-ground boxes with actual prefabs and capture `cocos-v03-phone-portrait.png` / `cocos-v03-phone-landscape.png`.
3. Continue comparing every visual pass against the target image and record the remaining gap before moving to the next pass.
