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
