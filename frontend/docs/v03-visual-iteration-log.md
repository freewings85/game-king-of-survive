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

## 2026-05-10 Cocos Scene Assembly Manifest Pass

Related work:

- WIP after `330f1e1`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `cocos-v03-demo/settings/v03-scene-assembly-manifest.json`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/v03-first-playable-presentation-audit.md`
- `frontend/docs/cocos-v03-first-playable-checklist.md`

What moved closer:

- The Cocos production path now has a machine-checkable scene assembly manifest for `V03Battle.scene`, instead of only scattered script/checklist notes.
- The manifest names the phone viewports, root nodes, runtime scripts, shared JSON data sources, hero/zombie/map/FX/UI prefabs, visual layer coverage, acceptance screenshots, and early combat gate.
- The verifier cross-checks the manifest against the first-playable checklist, so future Cocos work has a concrete target when authoring the real scene in Cocos Creator 3.8.x.
- The presentation audit now cites the manifest explicitly, keeping the current Cocos gap visible in each review.

What is still far from the reference:

- This is still `source-manifest-only`; no real Cocos Creator `.scene` file, prefab asset, WeChat build, or device screenshot exists yet.
- The manifest does not improve the on-screen art by itself. It only reduces production ambiguity before the next implementation pass.
- The WebGL reference remains procedural and still falls short of the target image's painterly characters, zombie poses, material transitions, and production FX.

Next iteration direction:

1. Use this manifest as the contract for authoring the real Cocos scene when Cocos Creator is available.
2. Continue whole-screen visual passes against the target image, with each pass updating this log before commit.
3. Prioritize larger framework-level visual gains next: authored character/zombie silhouettes, richer skill sprite cards, and real Cocos scene assembly over isolated small count increases.

## 2026-05-10 Painterly Card Layer Pass

Related work:

- WIP after `1eefaa5`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`
- `can_delete/v03-gate/engine-demo-skill-boom.png`
- `can_delete/v03-gate/engine-demo-skill-arc.png`

What moved closer:

- The WebGL demo now adds runtime canvas-texture billboard cards over heroes, the rival, zombies, muzzle flashes, projectile cards, explosion debris, arc nodes, and hit cards.
- This starts moving the presentation away from pure low-poly blocks and toward the target image's phone-scale illustrated sprite/card treatment.
- The verifier now gates `painterlyCardCount`, `heroPainterlyCardCount`, `zombiePainterlyCardCount`, and `skillPainterlyCardCount`, so this layer is a required part of the V03 visual framework.
- The Cocos visual contract now names `painterlyCardLayers`, so the layer has to become real sprite/prefab work in the mini-game path instead of staying WebGL-only.

What is still far from the reference:

- The card art is generated at runtime and still rough; it is not final hand-painted character, zombie, weapon, skin, or skill art.
- The cards sit on top of procedural geometry, so animation, pose language, and material transitions are still weaker than the target image.
- Cocos still needs real sprite/prefab equivalents for this card layer before the WeChat Mini Game path can be considered visually proven.

Next iteration direction:

1. Improve the card art silhouettes for each class/skin and zombie variant, especially heads, hands, weapons, clothing tears, and edge lighting.
2. Replace runtime generated cards with authored sprite assets once the shape language is approved.
3. Add screenshot comparison discipline after each card pass, focusing on the whole phone frame rather than isolated object counts.

## 2026-05-10 Class And Skin Painterly Card Pass

Related work:

- WIP after `2a32be4`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- The active player painterly card now regenerates from the selected class, skin index, skin color, and accent color instead of staying as a fixed Tech-style overlay.
- The Ranger review path now proves that the in-match card layer follows `activePainterlyClass: ranger`, `activePainterlySkin: 2`, and `activePainterlySkinColor: #283746`.
- The landscape phone review is now fixed to the same Ranger skin 2 state as the portrait gate, so the main comparison screenshot no longer drifts back to the default Tech class.
- The generated card has class-specific marks for Guardian shield, Tech coil, and Ranger hood/rifle/cape, which moves the field presentation closer to the target image's profession/skin readability.

What is still far from the reference:

- The class cards are still generated canvas art, not authored final assets with strong faces, clothing folds, weapon polish, or skin-specific costume shapes.
- Skin differences currently affect color and value treatment more than silhouette; the target image implies stronger costume/gear changes.
- Cocos still has the contract for card layers, but not real imported sprite/prefab assets.

Next iteration direction:

1. Push skin differences beyond color: add skin-specific costume panels, hair/hood variants, weapon trims, and backpack/cape shapes.
2. Add deterministic screenshots for Guardian and Tech painterly cards, not only Ranger, so all three professions can be visually compared against the target.
3. Start replacing generated card shapes with authored bitmap assets once the class/skin direction stabilizes.

## 2026-05-10 Class Review Screenshot Pass

Related work:

- WIP after `6be92f6`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- Guardian, Tech, and Ranger now each have deterministic review screenshots generated by `npm run verify:v03`.
- Each class review checks that the selected class, skin index, gear class, and painterly card class/skin state all match the screenshot being captured.
- The class-review gate makes it harder for future visual work to improve only the active Ranger path while regressing Guardian or Tech readability.

What is still far from the reference:

- The three class views still use generated canvas cards and procedural geometry; they are review scaffolds, not final character art.
- The target image's class/skin panels imply stronger hand-authored costumes, weapons, poses, and portrait-level polish than this pass provides.
- These screenshots are WebGL reference captures; Cocos still needs real class-prefab screenshots once the mini-game scene exists.

Next iteration direction:

1. Add skin-specific silhouette changes inside the class review shots, not only color changes.
2. Strengthen Guardian shield mass, Tech device glow, and Ranger rifle/hood shape until all three are readable at phone scale without relying on HUD text.
3. Mirror the same three-class screenshot requirement in Cocos once Cocos Creator is available.

## 2026-05-10 Class Showcase Review Pass

Related work:

- WIP after `3fa601d`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

What moved closer:

- Class review screenshots now use `?review=class`, which shows a dedicated class showcase layer with the active class mark, class name, role, skin swatches, and skill icons.
- The background battle remains present but is visually reduced, so the class/skin/skill information is easier to compare against the target image's class/skin/skill composition.
- The gate now checks `classShowcaseDisplayed`, class showcase title, skin count, selected class, selected skin, gear class, and painterly card state together.

What is still far from the reference:

- The showcase is still UI/composition scaffolding. The target image has more authored character art, richer class poses, and production-quality skin/skill panels.
- The showcase does not yet include full-body isolated class art or individual skin thumbnails.
- Cocos still needs equivalent class showcase screenshots after the real scene and prefabs exist.

Next iteration direction:

1. Add fuller isolated class art inside the showcase, using the same generated card language but with less combat occlusion.
2. Add per-skin silhouette accents so the three swatches represent different looks, not only palette choices.
3. Mirror this class showcase requirement in the Cocos first-playable checklist when real Cocos screenshots become possible.

## 2026-05-10 Showcase Skin Thumbnail Pass

Related work:

- WIP after `e10ff65`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

What moved closer:

- The class showcase now includes three skin thumbnail cards in addition to color swatches, so skin review is no longer only a row of abstract dots.
- Each thumbnail inherits the selected class accent and that skin's palette, and the active skin thumbnail gets the same gold selection treatment as the active swatch.
- The verifier now checks 3 showcase skin thumbnails and exactly 1 active thumbnail for every class review screenshot.

What is still far from the reference:

- The thumbnails are CSS-generated silhouettes, not final hand-authored skin portraits.
- Skin differences still need stronger costume/gear silhouette changes, not only palette and selection treatment.
- Cocos still needs real sprite/prefab equivalents for these skin thumbnails.

Next iteration direction:

1. Make each skin thumbnail carry a distinct costume silhouette: helmet/hood shape, cape/backpack, shoulder armor, and weapon trim.
2. Add a Cocos checklist item for class showcase thumbnails once the Cocos scene work resumes.
3. Keep the three-class screenshots as the comparison surface for class/skin readability.

## 2026-05-10 Showcase Skin Silhouette Variant Pass

Related work:

- WIP after `ebdcb7f`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

What moved closer:

- Showcase skin thumbnails now carry three distinct silhouette variants instead of using one identical body shape for every skin.
- The variants change body width, head/helmet shape, side gear, and accent placement while preserving the current class palette.
- The verifier now checks `classShowcaseVariantCount === 3`, keeping the thumbnail row from regressing to same-shape color swatches.

What is still far from the reference:

- These are still CSS-generated mini silhouettes, not finished skin artwork.
- The variants are generic across classes; Guardian, Tech, and Ranger need class-specific skin costume language next.
- Cocos still needs real skin thumbnail sprites/prefabs rather than CSS-only review assets.

Next iteration direction:

1. Make the three skin variants class-aware: Guardian shield plates, Tech coils/screens, Ranger hood/cape/rifle trims.
2. Add larger isolated class art to the showcase so the selected skin is readable beyond the thumbnail row.
3. Mirror the variant requirement in Cocos once the Cocos scene uses authored UI prefabs.

## 2026-05-10 Class-Specific Skin Thumbnail Pass

Related work:

- WIP after `cd2e039`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

What moved closer:

- Showcase skin thumbnails now receive class-specific equipment language: Guardian uses `shield-armor`, Tech uses `coil-screen`, and Ranger uses `hood-rifle`.
- The verifier checks the expected class style and requires all three thumbnails in a class review to share that class style while still preserving three skin variants.
- The thumbnail row now communicates both skin variation and class fantasy, closer to the target image's combined class/skin presentation.

What is still far from the reference:

- The equipment language is still CSS-generated and symbolic; it is not final hand-painted class skin art.
- The full selected hero in the battle view still needs stronger class-specific costume detail.
- Cocos has not yet imported equivalent UI sprites or prefab variants.

Next iteration direction:

1. Move class-specific skin language from thumbnails into the selected player card and in-match model.
2. Add authored bitmap placeholders for the three class skin rows once the generated direction stabilizes.
3. Mirror `shield-armor`, `coil-screen`, and `hood-rifle` in the Cocos visual contract.

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

## 2026-05-10 WebGL Prop Wear Decal Pass

Related work:

- WebGL reference WIP after `2be9c22`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- Wreck cars now have dark hood panels, glass cards, headlights, edge highlights, and scratch stacks.
- Walls now have front edge highlights, dark vertical cracks, and lighter scratch marks.
- Crates, barrels, tires, and debris now carry readable wear decals instead of relying only on clean box/cylinder materials.
- The verifier now requires `propWearCount >= 80`; the current WebGL reference reports `propWearCount: 133`.
- This makes the prop layer feel more like authored battle-royale cover instead of placeholder geometry.

What is still far from the reference:

- These are still geometry decals, not hand-painted textures with brush variation.
- The target image has stronger global value grouping, rim lighting, and chunkier prop silhouettes.
- Cocos visual contract does not yet require the new prop-wear decal categories.
- The mobile screenshot is closer in prop density, but the overall illustration quality still depends on stronger lighting/material treatment.

Next iteration direction:

1. Mirror prop-wear decal categories into the Cocos visual contract/checklist if they remain mandatory for the final look.
2. Add stronger silhouette shaping and large readable value blocks to cars/walls so they read more like the target image at phone scale.
3. Improve scene lighting contrast and rim color without reducing zombie/player readability.

## 2026-05-10 Cocos Prop Wear Contract Sync

Related work:

- Cocos bridge/checklist WIP after `866159d`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`

What moved closer:

- The prop wear categories added in WebGL are now required by the Cocos visual contract.
- Cocos runtime stats now distinguish `propWearDecals` from `propGroundLayers`, matching the target's need for both grounded props and authored prop faces.
- The first-playable checklist now names edge highlight, dark panel, scratch stack, glass card, and hazard band prefabs.
- The Cocos bridge verifier now fails if prop-wear categories are missing from source, docs, or checklist coverage.

What is still far from the reference:

- This remains a contract sync, not final authored Cocos art.
- The target image still has richer hand-painted prop silhouettes, stronger light direction, and better material separation than the current WebGL reference.
- The real Cocos scene/prefabs have not been opened or captured in this environment.

Next iteration direction:

1. Continue visual work in WebGL by improving large prop silhouettes and value grouping.
2. Keep Cocos contract/checklist synchronized whenever a WebGL visual layer becomes mandatory.
3. Capture real Cocos phone screenshots once Cocos Creator is available.

## 2026-05-10 WebGL Prop Shape Value Pass

Related work:

- WebGL reference WIP after `db98602`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- Wreck cars, walls, crates, barrels, and debris now have larger light/shadow blocks instead of relying only on small scratches.
- Cars and walls gained cool rim strips and frame blocks so their silhouettes read more clearly at phone scale.
- The verifier now requires `propShapeCount >= 85`; the current WebGL reference reports `propShapeCount: 113`.
- Mobile combat readability remained intact: player, zombies, safe zone, minimap, joystick, and skill buttons are still visible in the reviewed screenshot.

What is still far from the reference:

- The target image still has stronger hand-painted shape language; the current scene is more readable but still visibly low-poly.
- Walls are clearer but still too rectangular and uniform compared with the broken, chunky cover in the reference.
- Cars need more distinctive damaged silhouettes, especially warped hoods, broken roof shapes, and asymmetric side panels.
- The overall scene still needs better global lighting direction and material grouping to reach the reference's depth.

Next iteration direction:

1. Break up large wall and car silhouettes with non-uniform chunks while keeping collision/cover simple.
2. Add a global lighting/value pass that strengthens foreground/background separation without hurting combat clarity.
3. Sync any mandatory prop shape categories into the Cocos visual contract if they survive another WebGL review.

## 2026-05-10 Cocos Prop Shape Contract Sync

Related work:

- Cocos bridge/checklist WIP after `347f81b`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`

What moved closer:

- The large prop value blocks added in WebGL are now named in the Cocos visual contract.
- Cocos runtime stats now separate `propShapeBlocks` from `propWearDecals` and `propGroundLayers`, matching the target's need for clear cover silhouettes, surface wear, and ground contact.
- The first-playable checklist now names light block, shadow block, cool rim, and rim frame prefabs.
- The Cocos bridge verifier now fails if these shape/value categories disappear from source, docs, or checklist coverage.

What is still far from the reference:

- This pass does not author the real Cocos prefabs; it only prevents the required visual layer from being omitted later.
- The target image still needs more asymmetric damaged silhouettes and better global lighting than the current WebGL reference.
- Cocos Creator is still unavailable in this environment, so no real Cocos phone screenshots have been captured.

Next iteration direction:

1. Continue in WebGL with asymmetric broken car/wall silhouette chunks.
2. Use the Cocos contract as the required implementation list when real prefabs are authored.
3. Keep recording target-image gaps after each visual pass.

## 2026-05-10 WebGL Broken Prop Silhouette Pass

Related work:

- WebGL reference WIP after `3f75de0`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- Wreck cars now have asymmetric broken hood, roof, side, and jagged edge chunks.
- Walls now have uneven broken top caps and missing-corner chunks, which makes cover read less like clean rectangular boxes.
- Crates and barrels picked up smaller chipped silhouette pieces so the prop layer is less uniform.
- The verifier now requires `propBreakCount >= 80`; the current WebGL reference reports `propBreakCount: 96`.
- The reviewed phone screenshot still keeps player, zombies, pickups, minimap, joystick, and skill buttons readable.

What is still far from the reference:

- The target image uses authored, painterly silhouettes; the current pass still uses geometric chunks.
- Broken wall tops are more interesting, but they need better material blending and stronger directional lighting.
- Cars still need a more iconic wreck profile: collapsed roof, exposed wheel wells, and more irregular side panels.
- The total scene remains low-poly relative to the reference image's illustrated polish.

Next iteration direction:

1. Sync broken prop silhouette categories into the Cocos contract if this layer remains mandatory.
2. Add a global lighting/value pass for foreground/background separation and stronger rim direction.
3. Continue replacing clean primitive shapes with larger authored-looking forms before doing more small details.

## 2026-05-10 Cocos Prop Break Contract Sync

Related work:

- Cocos bridge/checklist WIP after `a68f3d4`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`

What moved closer:

- Broken prop silhouettes are now a named Cocos visual contract rather than a WebGL-only implementation detail.
- Cocos runtime stats now separate `propBreakShapes` from prop ground, wear, and value-block layers.
- The first-playable checklist now names jagged cap, missing corner, broken hood, and chipped side prefabs.
- The Cocos bridge verifier now fails if broken silhouette categories disappear from source, docs, or checklist coverage.

What is still far from the reference:

- The real Cocos prefab art still has not been authored or captured.
- The target image's broken shapes have painterly edges and lighting integration; this pass only locks the required category names.
- The next WebGL visual gap is global lighting and foreground/background separation.

Next iteration direction:

1. Add a global lighting/value pass in WebGL to separate actors, props, and ground more like the target image.
2. Keep Cocos contract/checklist synchronized only for layers that survive WebGL review.
3. Replace placeholder Cocos boxes with authored prefabs when Cocos Creator becomes available.

## 2026-05-10 WebGL Global Lighting Value Pass

Related work:

- WebGL reference WIP after `3d93402`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- The arena now has a warm combat focus, cool enemy-depth wash, safe-zone rim light, four edge darkening layers, and two diagonal shadow bands.
- The added value layers push the background down and make the central fight read more clearly on the phone screenshot.
- The verifier now requires `globalLightCount >= 8`; the current WebGL reference reports `globalLightCount: 9`.
- Player, zombies, pickups, minimap, joystick, and skill buttons remain readable in the reviewed phone screenshot.

What is still far from the reference:

- The target image has more integrated hand-painted lighting on every unit and prop; this pass is still a ground/value overlay.
- Props and actors need stronger per-object rim direction to fully match the target's depth.
- The lighting is improved but still does not create the reference image's painterly material transitions.
- Cocos contract/checklist does not yet require these global value layers.

Next iteration direction:

1. Sync global lighting/value categories into the Cocos contract if this layer remains mandatory.
2. Add per-object rim/highlight direction to hero, zombies, and major props.
3. Continue checking screenshots after each pass so lighting does not reduce combat readability.

## 2026-05-10 Cocos Global Lighting Contract Sync

Related work:

- Cocos bridge/checklist WIP after `a390f48`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`

What moved closer:

- The WebGL global value pass is now represented in the Cocos visual contract.
- Cocos runtime stats now report `globalLightLayers` separately from prop detail and FX layers.
- The first-playable checklist now names stage warm focus, cool depth, rim light, edge darkening, and diagonal shadow prefabs.
- The Cocos bridge verifier now fails if these global lighting categories disappear from source, docs, or checklist coverage.

What is still far from the reference:

- This pass still does not author real Cocos lighting/prefabs or capture Cocos phone screenshots.
- The target image needs per-object lighting integration on heroes, zombies, props, and FX, not only global stage layers.
- Cocos Creator remains unavailable in this environment, so the contract is the strongest enforceable artifact for now.

Next iteration direction:

1. Add per-object rim/highlight direction to hero, zombies, and major props in WebGL.
2. Keep the lighting contract aligned with any WebGL layers that remain mandatory after screenshot review.
3. Replace placeholder Cocos lighting nodes with real authored prefabs when Cocos Creator is available.

## 2026-05-10 WebGL Object Rim Highlight Pass

Related work:

- WebGL reference WIP after `0f3ff13`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- Hero, rival, zombies, wreck cars, walls, crates, and barrels now have object-level warm rim, cool rim, or dark-side strips.
- Characters separate more clearly from the wasteland floor in the phone screenshot, especially around shoulders, heads, weapons, and zombie torsos.
- Major cover objects now share the same directional lighting language as the global stage pass.
- The verifier now requires `objectRimCount >= 60`; the current WebGL reference reports `objectRimCount: 97`.
- Early combat remained stable: HP, shots, damage, kill, XP, minimap, and skill review gates still pass.

What is still far from the reference:

- The target image has painterly per-object light transitions; the current rim pass still uses simple geometry strips.
- Some highlights are readable but not yet blended into the materials.
- Player, zombie, and prop lighting is now directionally clearer, but full hand-painted polish still requires authored textures or richer material work.

Next iteration direction:

1. Sync object rim/highlight categories into the Cocos contract if this layer remains mandatory.
2. Improve material blending so rim/highlight shapes feel less like attached strips.
3. Start shifting from individual visual layers toward a fuller first-playable presentation pass once Cocos scene authoring is available.

## 2026-05-10 Cocos Object Rim Contract Sync

Related work:

- Cocos bridge/checklist WIP after `8c6d08f`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`

What moved closer:

- Object-level rim/highlight layers are now part of the Cocos visual contract.
- Cocos runtime stats now report `objectRimLayers` separately from global lighting and prop detail layers.
- The first-playable checklist now names warm rim, cool rim, dark side, weapon rim, and head rim prefabs.
- The Cocos bridge verifier now fails if object rim categories disappear from source, docs, or checklist coverage.

What is still far from the reference:

- This is still a contract sync, not real Cocos authored lighting.
- The target image's highlights are blended into painterly materials; the current WebGL pass uses simple geometry strips.
- Cocos Creator is still unavailable here, so no real Cocos phone screenshots verify these layers yet.

Next iteration direction:

1. Improve material blending in WebGL so rim/highlight strips feel less attached.
2. Move toward a consolidated first-playable presentation pass once Cocos scene authoring is possible.
3. Keep every mandatory visual layer represented in the Cocos contract until real prefabs replace placeholders.

## 2026-05-10 WebGL Material Blend Pass

Related work:

- WebGL reference WIP after `a7c35cb`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`

What moved closer:

- Hero, zombies, wreck cars, walls, crates, and barrels now have low-opacity warm/cool/dark material transition bands.
- The transition bands soften the previous rim/highlight strips and make the lighting feel less detached from the base geometry.
- The verifier now requires `materialBlendCount >= 70`; the current WebGL reference reports `materialBlendCount: 80`.
- The phone screenshot still keeps player, zombies, pickups, minimap, joystick, and skill buttons readable.

What is still far from the reference:

- The target image's material transitions are painted into the forms; the current pass still uses flat transparent geometry.
- Some character highlights are improved but can become too bright in dense combat clusters.
- The scene is closer in directional lighting, but it still lacks true brush texture and material-specific shading.

Next iteration direction:

1. Sync material blend categories into the Cocos contract if this layer remains mandatory.
2. Tune blend strength by object type so hero/zombie highlights do not overpower combat readability.
3. Move toward a consolidated first-playable presentation pass that audits the whole screen instead of single visual layers.

## 2026-05-10 Cocos Material Blend Contract Sync

Related work:

- Cocos bridge/checklist WIP after `1d28488`

Reviewed artifacts:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`

What moved closer:

- Material blend layers are now part of the Cocos visual contract, not only the WebGL reference.
- Cocos runtime stats now report `materialBlendLayers` separately from object rim and global lighting layers.
- The first-playable checklist now names warm, cool, dark, prop, and unit material blend prefabs.
- The Cocos bridge verifier now fails if material blend categories disappear from source, docs, or checklist coverage.

What is still far from the reference:

- The real Cocos material blending and authored prefab art are still not created.
- The target image uses painted texture transitions; this contract only names the layer family that must exist.
- No Cocos phone screenshots are available in this environment.

Next iteration direction:

1. Tune blend strength by object type in WebGL if highlights become too bright in dense combat.
2. Start a consolidated first-playable presentation audit that reviews all required visual layers together.
3. Replace Cocos placeholder boxes with real authored materials and prefabs when Cocos Creator is available.

## 2026-05-10 In-match painterly style sync

Related work:

- WebGL reference WIP after `963ebaa`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`
- `e2e/v03-presentation-audit-verify.js`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-landscape-phone.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

Current visual distance:

- Art quality: far.
- The current game is still a procedural WebGL prototype with layered cards and geometry; the V03 reference is a compact painterly mobile composition with authored character, skin, skill, and UI art.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- The in-match hero painterly card now follows the same class style vocabulary as the class showcase: Guardian uses shield/armor reads, Tech uses coil/screen reads, and Ranger uses hood/rifle reads.
- Runtime state now exposes `activePainterlyStyle`, and the gate requires Ranger skin 2 to report `activePainterlyStyle: hood-rifle`.
- The class review gate now checks that the in-match painterly card style matches the class showcase style for Guardian, Tech, and Ranger.

What is still far from the reference:

- The main character is still a small procedural card, not a hand-authored skin silhouette with the physical volume shown in the V03 reference.
- The screen composition still lacks the target image's compact 2.5D staging, stronger foreground/background separation, and polished skill-callout artwork.
- Skill effects and zombie silhouettes still read as generated placeholders compared with the reference's painted visual hierarchy.

Next iteration direction:

1. Build a larger mobile-first combat presentation frame that gives the player, zombies, skill cards, and class/skin UI the same first-read priority as the V03 reference.
2. Replace the highest-impact procedural hero/zombie cards with authored or generated sprite sheets before spending more time on minor geometry details.
3. Keep the comparison gate tied to the reference screenshot, current screenshots, the remaining gap, and the next iteration direction after each visual pass.

## 2026-05-10 Mobile combat focus frame

Related work:

- WebGL reference WIP after `bbdd486`
- `frontend/engine-demo/index.html`
- `frontend/engine-demo/styles.css`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`

Reviewed screenshots:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

Current visual distance:

- Art quality: far.
- This pass improves mobile composition and first-read hierarchy, but the reference still has much stronger authored illustration, 2.5D staging, and polished skill/skin presentation.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Portrait mobile now has a combat focus frame with a larger class/skin portrait, current skin label, and three skill icons, so class/skin/skill information is visible without opening a separate review mode.
- The player character is scaled up slightly and the portrait camera is tighter, increasing character and zombie read size in the phone screenshot.
- Runtime gates now require `combatFocusDisplayed`, `combatFocusStyle: hood-rifle`, and `combatFocusSkillCount: 3`; class review gates require the focus frame to match Guardian, Tech, and Ranger style state.

What is still far from the reference:

- The combat focus frame still uses CSS/procedural portrait construction instead of real character skin art.
- The main battle view still lacks target-level foreground depth and authored zombie silhouette variation.
- Skill icons are clearer, but they are not yet large illustrated skill effect cards like the target concept.

Next iteration direction:

1. Replace the procedural focus portrait with generated or authored class/skin sprites for Guardian, Tech, and Ranger.
2. Add a foreground combat depth pass so zombies, pickups, and prop silhouettes have the same layered 2.5D read as the V03 reference.
3. Turn skill icons into larger illustrated skill cards only after the hero/zombie read is strong enough in the phone screenshot.

## 2026-05-10 Class focus sprite asset pass

Related work:

- WebGL reference WIP after `783b5b1`
- `frontend/engine-demo/assets/portraits/class-focus-guardian.png`
- `frontend/engine-demo/assets/portraits/class-focus-tech.png`
- `frontend/engine-demo/assets/portraits/class-focus-ranger.png`
- `frontend/engine-demo/styles.css`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/assets/portraits/class-focus-guardian.png`
- `frontend/engine-demo/assets/portraits/class-focus-tech.png`
- `frontend/engine-demo/assets/portraits/class-focus-ranger.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

Current visual distance:

- Art quality: closer for the focus portrait, still far for the full combat screen.
- The focus portrait now uses generated painterly class art, but the world characters, zombies, and skill cards remain procedural.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- The mobile combat focus portrait now uses real transparent PNG sprite assets instead of CSS-only silhouette construction.
- Guardian, Tech, and Ranger each have a distinct bust read: shield armor, blue tech coil/screen gear, and hood/rifle scout gear.
- Runtime gates now require `combatFocusClassId: ranger` and `combatFocusUsesSpriteAsset`, and class review gates require the sprite-backed focus frame to follow Guardian, Tech, and Ranger state.

What is still far from the reference:

- Only the UI focus portrait has painterly class art; the playable 3D character and zombies still look like low-poly procedural units.
- The sprite sheet covers classes, not all skin variants yet.
- Skill icons are still simple UI shapes rather than high-impact illustrated skill effect cards.

Next iteration direction:

1. Split or extend the sprite asset strategy into skin-specific portraits so all 9 class/skin combinations have authored reads.
2. Bring the same sprite-backed visual quality into the main player card and zombie cards.
3. Start a skill-card art pass after the class/skin portrait set is complete.

## 2026-05-10 In-match hero sprite card pass

Related work:

- WebGL reference WIP after `ea99c39`
- `frontend/engine-demo/assets/portraits/class-focus-guardian.png`
- `frontend/engine-demo/assets/portraits/class-focus-tech.png`
- `frontend/engine-demo/assets/portraits/class-focus-ranger.png`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/assets/portraits/class-focus-guardian.png`
- `frontend/engine-demo/assets/portraits/class-focus-tech.png`
- `frontend/engine-demo/assets/portraits/class-focus-ranger.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

Current visual distance:

- Art quality: closer for the hero read, still far for the full combat screen.
- The in-match player card now shares the same sprite-backed class assets as the UI focus portrait, but zombies, skills, and all skin variants remain below target quality.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- The central in-match hero painterly card now uses the class PNG assets for Guardian, Tech, and Ranger instead of the older procedural hero card texture.
- Runtime gates now require `activePainterlyUsesSpriteAsset` in both the main Ranger review and Guardian/Tech/Ranger class reviews.
- The UI focus portrait and in-world hero card now share the same asset family, making the selected class more consistent across the screen.

What is still far from the reference:

- The sprite asset is still a class-level portrait, not 9 distinct skin-specific poses.
- The 3D body underneath remains low-poly and can visually conflict with the painterly portrait card.
- Zombies and skill effects still use procedural cards, so the screen is not yet consistently painterly.

Next iteration direction:

1. Build skin-specific sprite variants for all 9 class/skin combinations and route `activeSkin` to those assets.
2. Replace zombie painterly cards with authored zombie sprites so the enemy horde has the same art quality as the hero.
3. Revisit the 3D body/card blend once the hero and zombie cards share the same asset style.

## 2026-05-10 Zombie sprite card pass

Related work:

- WebGL reference WIP after `b4b5401`
- `frontend/engine-demo/assets/zombies/zombie-card-brute.png`
- `frontend/engine-demo/assets/zombies/zombie-card-crawler.png`
- `frontend/engine-demo/assets/zombies/zombie-card-hooded.png`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/assets/zombies/zombie-card-brute.png`
- `frontend/engine-demo/assets/zombies/zombie-card-crawler.png`
- `frontend/engine-demo/assets/zombies/zombie-card-hooded.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`

Current visual distance:

- Art quality: closer for hero/enemy combat readability, still far for full target composition.
- The enemy cards now share a generated painterly asset family with the hero card, but the low-poly bodies, skill cards, and skin variants are still not target quality.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Standard, crawler, and hooded zombie painterly cards now use transparent PNG sprite assets instead of procedural canvas silhouettes.
- Runtime gates now require `zombiePainterlyUsesSpriteAsset` in the main review and class reviews.
- The central combat cluster reads more consistently because player and zombie cards are both sprite-backed.
- Zombie card scale and opacity were reduced after screenshot review so the horde supports the hero read instead of overwhelming it.

What is still far from the reference:

- The sprite cards are not yet tuned per on-screen scale, so dense combat can still look visually busy.
- The actual 3D zombie bodies remain low-poly placeholders under the painterly cards.
- Skill effects still use procedural cards, so the screen is only partially converted to authored/painterly assets.

Next iteration direction:

1. Generate or author skill-card assets for ARC, BOOM, and FAN.
2. Extend the class sprite set to all 9 class/skin combinations after combat readability stabilizes.
3. Revisit 3D body visibility and sprite/card blend after hero, zombie, and skill assets share the same style.

## 2026-05-10 Skill sprite card pass

Related work:

- WebGL reference WIP after `264f91a`
- `frontend/engine-demo/assets/skills/skill-card-arc.png`
- `frontend/engine-demo/assets/skills/skill-card-boom.png`
- `frontend/engine-demo/assets/skills/skill-card-fan.png`
- `frontend/engine-demo/app.js`
- `frontend/engine-demo/styles.css`
- `e2e/v03-contract-verify.js`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/assets/skills/skill-card-arc.png`
- `frontend/engine-demo/assets/skills/skill-card-boom.png`
- `frontend/engine-demo/assets/skills/skill-card-fan.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-skill-arc.png`
- `can_delete/v03-gate/engine-demo-skill-boom.png`
- `can_delete/v03-gate/engine-demo-skill-fan.png`

Current visual distance:

- Art quality: closer for the full hero/zombie/skill visual system, still not target-quality across all skins and map objects.
- Skill cards now use generated painterly assets, but the moment-to-moment projectile geometry and some UI framing remain procedural.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- ARC, BOOM, and FAN now have transparent PNG skill assets used by in-match painterly skill cards.
- The bottom skill buttons, combat focus skill strip, and class showcase skill strip reuse the same skill asset family.
- Runtime gates now require `skillPainterlyUsesSpriteAsset` so skill cards cannot silently fall back to procedural textures.

What is still far from the reference:

- Skill card assets are now painterly, but the actual projectile trails and hit marks are still procedural beams and simple cards.
- UI placement is improved but still more like a prototype overlay than the target's fully art-directed mobile composition.
- Class skin variants still reuse class-level portrait assets.

Next iteration direction:

1. Build skin-specific class portraits for all 9 class/skin combinations.
2. Replace the most visible projectile trails and impact marks with sprite-backed assets.
3. Audit the full phone screenshot against the V03 reference before widening to Cocos prefab equivalents.

## 2026-05-10 Class skin sprite variant pass

Related work:

- WebGL reference WIP after `3528e27`
- `frontend/engine-demo/assets/portraits/class-skin-guardian-0.png`
- `frontend/engine-demo/assets/portraits/class-skin-guardian-1.png`
- `frontend/engine-demo/assets/portraits/class-skin-guardian-2.png`
- `frontend/engine-demo/assets/portraits/class-skin-tech-0.png`
- `frontend/engine-demo/assets/portraits/class-skin-tech-1.png`
- `frontend/engine-demo/assets/portraits/class-skin-tech-2.png`
- `frontend/engine-demo/assets/portraits/class-skin-ranger-0.png`
- `frontend/engine-demo/assets/portraits/class-skin-ranger-1.png`
- `frontend/engine-demo/assets/portraits/class-skin-ranger-2.png`
- `frontend/engine-demo/app.js`
- `frontend/engine-demo/styles.css`
- `e2e/v03-contract-verify.js`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `frontend/engine-demo/assets/portraits/class-skin-guardian-0.png`
- `frontend/engine-demo/assets/portraits/class-skin-tech-1.png`
- `frontend/engine-demo/assets/portraits/class-skin-ranger-2.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `can_delete/v03-gate/engine-demo-class-guardian.png`
- `can_delete/v03-gate/engine-demo-class-tech.png`
- `can_delete/v03-gate/engine-demo-class-ranger.png`

Current visual distance:

- Art quality: closer for class/skin readability, still far for true skin-specific illustration.
- The current variants are tint/contrast branches from the class portraits, not fully unique poses or costumes.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- All 9 class/skin combinations now have routable sprite assets instead of only 3 class-level portraits.
- Focus portrait and in-match hero card now follow `activeSkin`; Ranger skin 2 reports `activePainterlySkinSpriteVariant: ranger-2` and `combatFocusSkinVariant: ranger-2`.
- Runtime gates now require `classSkinSpriteVariantCount >= 9`, so future changes cannot collapse the skin asset set back to 3 class portraits.

What is still far from the reference:

- The skin variants still need hand-authored or generated costume differences, not only palette shifts.
- Main 3D bodies still do not reflect the selected skin beyond material color.
- Cocos prefab equivalents for the 9 skin variants still have not been authored or previewed.

Next iteration direction:

1. Generate or author truly distinct skin costumes for the highest-priority class, likely Ranger first because the mobile gate uses Ranger skin 2.
2. Route selected skin state into 3D gear/material differences beyond the painterly card.
3. Mirror the 9-skin asset contract into the Cocos visual checklist once WebGL review stabilizes.

## 2026-05-10 Cocos sprite asset contract sync

Related work:

- Cocos contract WIP after `6248440`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `frontend/docs/cocos-v03-visual-contract.md`
- `frontend/docs/cocos-v03-first-playable-checklist.md`
- `e2e/v03-cocos-bridge-verify.js`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `frontend/engine-demo/assets/portraits/class-skin-ranger-2.png`
- `frontend/engine-demo/assets/zombies/zombie-card-brute.png`
- `frontend/engine-demo/assets/skills/skill-card-arc.png`

Current visual distance:

- Art quality: far for the real mini-game engine because this pass is a Cocos contract/checklist sync, not a true Cocos Creator scene preview.
- The WebGL reference now has sprite families for skins, zombies, and skills, but the Cocos side still represents them as runtime placeholder boxes until real sprites or prefabs are authored.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- The Cocos visual contract now names the 9 hero skin sprite assets, 3 zombie card sprite assets, and 3 skill card sprite assets.
- `V03VisualRuntime` reports `heroSkinSprites`, `zombieCardSprites`, and `skillCardSprites`, so the Cocos bridge can detect whether those families are still represented.
- The first playable checklist now requires matching prefab slots, which keeps future Cocos work aligned with the current V03 WebGL visual target.

What is still far from the reference:

- There is still no real Cocos Creator-authored prefab set for the sprite families.
- There is still no device or WeChat Mini Game screenshot proving Cocos reaches the target image's illustrated depth.
- The highest-value art gap remains true costume and gear differences for selected skins, especially Ranger skin 2.

Next iteration direction:

1. Author or generate a Ranger-first true skin costume pass with distinct silhouette, gear, and material differences.
2. Mirror the selected skin into in-match 3D gear/materials, not only portrait cards.
3. Build a real Cocos preview slice once the WebGL reference has a stronger target-level costume pass.

## 2026-05-10 Ranger unit sprite separation pass

Related work:

- WebGL reference WIP after `692c237`
- `frontend/engine-demo/assets/units/hero-ranger-2-isometric.png`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`
- `frontend/docs/v03-first-playable-presentation-audit.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `frontend/engine-demo/assets/portraits/class-skin-ranger-2.png`
- `frontend/engine-demo/assets/units/hero-ranger-2-isometric.png`

Current visual distance:

- Art quality: closer for the main in-match Ranger read because the battlefield no longer uses the large half-body portrait as the combat unit.
- The phone screenshot now separates HUD/focus portrait art from the in-world unit sprite, which is closer to the target image's phone battle composition.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Ranger skin 2 now has a dedicated transparent in-match unit sprite asset.
- The old low-poly player body is hidden when a unit sprite is active, removing doubled blocky geometry from the hero read.
- Runtime gates now require `activePainterlyUsesUnitSpriteAsset` and `activePainterlyUnitSpriteVariant: ranger-2`, so the battlefield cannot silently fall back to the portrait-only card.

What is still far from the reference:

- The Ranger unit is still closer to a high-detail character card than a fully camera-matched top-down Cocos unit.
- Zombies and props still mix painterly cards with low-poly geometry, so the whole scene has not reached the target image's unified illustrated depth.
- The phone HUD and class panel still occupy more visual weight than the target battle screenshot.

Next iteration direction:

1. Create matching in-match unit sprites for the highest-visibility zombie variants or shrink/simplify hero/zombie cards together for consistent phone-scale composition.
2. Tune the mobile HUD/focus frame so the battle area has more room and reads closer to the target phone screenshot.
3. Start Cocos prefab authoring once the WebGL unit/card scale is stable.

## 2026-05-10 Zombie sprite body cleanup pass

Related work:

- WebGL reference WIP after `3cb22a5`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`
- `frontend/docs/v03-first-playable-presentation-audit.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`
- `frontend/engine-demo/assets/zombies/zombie-card-brute.png`
- `frontend/engine-demo/assets/zombies/zombie-card-crawler.png`
- `frontend/engine-demo/assets/zombies/zombie-card-hooded.png`

Current visual distance:

- Art quality: closer for enemy readability because zombie sprite cards now drive the visible enemy bodies instead of being mixed with blocky low-poly zombie geometry.
- The phone combat cluster is more consistent with the target image's illustrated horde direction, but the map props and enemy/unit scale still need composition tuning.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Zombie low-poly body meshes are hidden when a matching zombie sprite asset exists.
- Runtime gates now require `zombieSpriteBodyHiddenForAll` and `zombieSpriteBodyHiddenCount >= 240`, so the horde cannot silently return to visible blocky geometry under the sprite cards.
- Combat behavior remains backed by the same zombie roots, movement, hit pulses, HP, and defeat logic.

What is still far from the reference:

- The zombie card assets are still reused from card-style sprites and are not yet fully camera-matched per horde distance.
- Major map props remain low-poly with painterly overlays, so the scene still mixes rendering languages.
- The phone HUD/focus layer still takes more visual area than the target phone battle frame.

Next iteration direction:

1. Tune zombie and hero unit card scale/opacity together from the latest phone screenshot.
2. Move the biggest map props toward sprite/painterly cover assets or hide their clean-box geometry where overlays are sufficient.
3. Reduce the mobile focus panel footprint after the combat cluster scale stabilizes.

## 2026-05-10 Compact combat focus pass

Related work:

- WebGL reference WIP after `64d3c3c`
- `frontend/engine-demo/styles.css`
- `e2e/v03-contract-verify.js`
- `frontend/docs/v03-first-playable-presentation-audit.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- Art quality: closer for phone composition because the class/skin/skill focus panel now uses a compact footprint instead of blocking the central combat cluster.
- The focus panel still exists for review and class/skin readability, but the battle area has more visible map and horde space, closer to the target phone screenshot.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- The portrait focus card was reduced from a large card to a compact tactical panel.
- Runtime gates now require `combatFocusRect <= 180x128`, so the mobile review cannot silently return to the earlier oversized overlay.
- The same focus data remains visible: class, skin variant, sprite-backed portrait, and three skill chips.

What is still far from the reference:

- The bottom class strip is still a prototype control surface and uses more space than a production mini-game HUD.
- The minimap and utility stack still look more UI-prototype than final target art.
- The map props still need a sprite/painterly cover pass to match the new hero/zombie unit direction.

Next iteration direction:

1. Reduce or restyle the bottom class strip during combat so the target phone frame reads as gameplay first.
2. Start a sprite/painterly pass for major map props, especially wreck cars and tall walls.
3. Keep the focus panel compact while tuning skill button and minimap polish.

## 2026-05-10 Compact class dock pass

Related work:

- WebGL reference WIP after `778c089`
- `frontend/engine-demo/styles.css`
- `e2e/v03-contract-verify.js`
- `frontend/docs/v03-first-playable-presentation-audit.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- Art quality: closer for mobile composition because the bottom class/skin control now behaves more like a compact debug dock and less like a large card.
- The class dock still exposes class and skin switching for review, but it consumes less of the lower-left battle field.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- The class strip width, padding, skin dots, and class buttons were reduced for portrait phone review.
- Runtime gates now require `classStripRect <= 126x118`, preventing the control from returning to the larger prototype footprint.
- The landscape phone review still hides the class strip entirely, preserving the target phone battle-frame direction.

What is still far from the reference:

- The class dock is still visible in portrait gameplay review; production should likely move this to pre-match or a small menu.
- Skill buttons and minimap still need final art-direction polish.
- Major map props remain the largest source of low-poly visual mismatch after the unit sprite passes.

Next iteration direction:

1. Start the major map prop sprite/painterly cover pass, focusing on wreck cars and tall wall silhouettes.
2. Keep gameplay controls compact and move class switching out of the main combat surface later.
3. Mirror prop sprite-cover requirements into the Cocos visual contract after WebGL review stabilizes.

## 2026-05-10 Prop sprite cover pass

Related work:

- WebGL reference WIP after `749bd3a`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`
- `frontend/docs/v03-first-playable-presentation-audit.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- Art quality: closer for the wasteland layer because wreck cars, tall walls, and crates now receive painterly sprite cover cards on top of their functional low-poly roots.
- The approach keeps cover/collision structure intact while moving the visible read toward the target image's illustrated props.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Major map prop families now use transparent painterly cover cards: `wreck`, `wall`, and `crate`.
- Runtime gates now require `propSpriteCoverCount >= 12` and `propSpriteCoverKinds >= 3`, so the cover pass cannot disappear silently.
- The prop cover cards reuse the same billboard/painterly rendering path as heroes, zombies, and skills.

What is still far from the reference:

- The prop cards are procedural painterly covers, not final authored bitmap assets.
- Some lower-priority props, barrels, tires, and debris still rely mostly on low-poly geometry.
- Cocos visual contract does not yet include prop sprite cover families.

Next iteration direction:

1. Review phone screenshot scale for prop covers and tune opacity/size so they support combat instead of creating noise.
2. Extend cover cards or generated bitmap assets to barrels, tires, and debris if they remain visibly geometric.
3. Mirror prop sprite cover coverage into the Cocos visual contract/checklist after WebGL scale stabilizes.

## 2026-05-10 Cocos prop cover sprite contract sync

Related work:

- Follow-up to `2aff8ea`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/assets/scripts/V03VisualRuntime.ts`
- `cocos-v03-demo/settings/v03-first-playable-checklist.json`
- `cocos-v03-demo/settings/v03-scene-assembly-manifest.json`
- `frontend/docs/cocos-v03-visual-contract.md`
- `frontend/docs/cocos-v03-first-playable-checklist.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- This is not a new rendered-art pass; it is a migration guard so the WebGL prop cover direction cannot be lost when the mini-game path moves into Cocos Creator.
- The current phone screenshot is still visibly below the reference in authored map asset quality, but the Cocos contract now names the missing sprite family explicitly.

What moved closer:

- Cocos now requires `prop-cover-wreck`, `prop-cover-wall`, and `prop-cover-crate` alongside the older prop wear, shape, and break layers.
- First-playable checklist and scene assembly manifest now include `PropCoverWreck.prefab`, `PropCoverWall.prefab`, and `PropCoverCrate.prefab`.
- Visual coverage now includes `propCoverSprites`, and the scene assembly gate reports 73 prefabs and 17 visual coverage families.

What is still far from the reference:

- These are still source-level contracts and placeholder Cocos runtime boxes, not real Cocos Creator sprite prefabs.
- The WebGL pass still uses procedural cover textures; final quality needs authored bitmap assets with consistent perspective, lighting, alpha, and scale.
- Barrels, tires, and debris are still less illustrated than the target.

Next iteration direction:

1. Create authored or generated prop cover bitmap assets for wreck, wall, and crate rather than relying on procedural canvas textures.
2. Use those assets in the WebGL reference first, then mirror asset names and prefab requirements into Cocos.
3. Extend the same treatment to barrels, tires, and debris once the three major cover families look good at phone scale.

## 2026-05-10 Prop cover bitmap asset pass

Related work:

- Follow-up to `c97574a`
- `frontend/engine-demo/assets/props/prop-cover-wreck.png`
- `frontend/engine-demo/assets/props/prop-cover-wall.png`
- `frontend/engine-demo/assets/props/prop-cover-crate.png`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`
- `frontend/docs/v03-first-playable-presentation-audit.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- The map prop layer is closer to the reference because wreck cars, walls, and crates now use generated bitmap cover assets instead of only procedural canvas paint.
- The phone screenshot now has more authored material detail in the lower combat field, especially the wreck car silhouette and rusted panels.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Added transparent PNG cover assets for `wreck`, `wall`, and `crate`.
- Runtime gates now require `propSpriteCoverUsesAsset`, so the project cannot silently fall back to generated canvas-only covers.
- Prop cover sizes were tuned so the assets read more like the object body and less like small decals.

What is still far from the reference:

- The asset overlays still sit on top of low-poly roots; walls and crates can still read partly as pasted surfaces rather than fully authored props.
- The generated PNG assets are not final art-direction-locked Cocos prefabs.
- Barrels, tires, debris, and ground material still need the same bitmap-asset treatment.

Next iteration direction:

1. Convert wall and crate from overlay-first presentation into fuller asset-bodied props, reducing visible low-poly backing where it hurts the read.
2. Add bitmap cover assets for barrels, tires, and debris after the main three prop families stabilize.
3. Mirror actual bitmap asset names into the Cocos visual contract once WebGL scale and perspective are final.

## 2026-05-10 Prop sprite body cleanup pass

Related work:

- Follow-up to `146c4c0`
- `frontend/engine-demo/app.js`
- `e2e/v03-contract-verify.js`
- `frontend/docs/v03-first-playable-presentation-audit.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- The prop layer is closer because wreck, wall, and crate bitmap assets now take visual priority instead of sitting on top of fully visible low-poly bodies.
- The phone screenshot reads less like procedural blocks with decals, especially around the lower wreck car and tall wall props.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Core low-poly bodies for covered wrecks, walls, and crates are hidden when bitmap cover assets are available.
- Runtime gates now require `propSpriteBodyHiddenCount >= 34`, making the cleanup measurable rather than subjective.
- Contact shadows, debris, scatter, and supporting rim/break layers remain, so the props do not become flat ungrounded sprites.

What is still far from the reference:

- Wall and crate assets still need better matching perspective and bespoke silhouettes for each prop footprint.
- Barrels, tires, debris, and ground materials still rely mostly on procedural geometry and decals.
- Cocos still has contract placeholders for prop cover sprites rather than real Creator prefabs.

Next iteration direction:

1. Generate or author additional bitmap assets for barrels, tires, and debris so the surrounding map layer stops reading as mixed-quality art.
2. Tune wall/crate cover perspective and possibly add alternate wide/narrow wall cover variants.
3. Start replacing more remaining procedural prop details with asset-backed sprites only where they improve phone-scale readability.

## 2026-05-10 Secondary prop bitmap asset pass

Related work:

- Follow-up to `a11dcdb`
- `frontend/engine-demo/assets/props/prop-cover-barrel.png`
- `frontend/engine-demo/assets/props/prop-cover-tires.png`
- `frontend/engine-demo/assets/props/prop-cover-debris.png`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/settings/v03-scene-assembly-manifest.json`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- The wasteland prop field is closer to the reference because lower-priority props now share the same bitmap asset treatment as wreck cars, walls, and crates.
- Barrels and debris are visibly more authored in the phone screenshot, and the prop layer no longer mixes high-detail cars with mostly low-poly small clutter.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Added transparent PNG cover assets for `barrel`, `tires`, and `debris`.
- Runtime gates now require `propSpriteCoverCount >= 18`, `propSpriteCoverKinds >= 6`, and `propSpriteBodyHiddenCount >= 47`.
- Cocos visual contract, scene manifest, and first-playable checklist now include `PropCoverBarrel`, `PropCoverTires`, and `PropCoverDebris` prefab requirements.

What is still far from the reference:

- The map still needs a more unified ground material and fewer visibly square tile seams.
- Some wall/crate overlays still need better perspective variants for wide and narrow prop footprints.
- Cocos still has contract placeholders for these new prop cover sprites rather than imported Creator prefabs.

Next iteration direction:

1. Improve ground/tile integration so props sit in a painterly wasteland surface rather than on a visibly modular grid.
2. Add alternate wall/crate cover variants if repetition becomes too obvious in phone screenshots.
3. Start a Cocos Creator asset import plan once the WebGL reference prop set stabilizes.

## 2026-05-10 Painterly ground integration pass

Related work:

- Follow-up to `5a4efea`
- `frontend/engine-demo/app.js`
- `cocos-v03-demo/assets/scripts/V03VisualContract.ts`
- `cocos-v03-demo/settings/v03-scene-assembly-manifest.json`
- `frontend/docs/cocos-v03-visual-contract.md`

Reviewed screenshots and assets:

- `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`
- `can_delete/v03-gate/engine-demo-mobile.png`

Current visual distance:

- The ground is closer to the reference because the phone shot now has large painterly wash layers over the standard tile contract, reducing the obvious square-grid look.
- The map contract is still intact, but the player-facing scene reads more like a single wasteland surface with dust, asphalt, rust, cracks, and broad value patches.
- Every meaningful visual iteration must record this comparison before the next pass is considered accepted.

What moved closer:

- Added three large ground wash layers: `ground-wash-combat-asphalt`, `ground-wash-road-dust`, and `ground-wash-rust-edge`.
- Tile planes now overlap slightly so the standard map is still present but seams are less prominent.
- Runtime gates now require `groundWashLayerCount >= 3` and `groundTileBlendCount >= 572`.
- Cocos visual contract, scene manifest, and first-playable checklist now include `GroundWashCombatAsphalt`, `GroundWashRoadDust`, and `GroundWashRustEdge` prefab requirements.

What is still far from the reference:

- The ground wash is procedural canvas art, not a final authored wasteland tile/splat map.
- Some remaining tile geometry still reads modular near the bottom edge and under the UI.
- Cocos still has contract placeholders for ground wash prefabs rather than imported Creator assets.

Next iteration direction:

1. Add a stronger authored safe-zone/storm ground treatment so the purple ring reads like part of the scene rather than a geometric overlay.
2. Continue reducing visible tile repetition near camera edges without losing editor/map contract readability.
3. Prepare a Cocos asset import checklist for prop covers and ground wash sprites once the WebGL reference stabilizes.
