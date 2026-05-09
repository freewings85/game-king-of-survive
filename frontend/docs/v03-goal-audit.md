# V03 Goal Audit

Current objective:

Move `game-king-of-survive` toward the mobile zombie battle royale target shown in `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png`, including a modular frontend, a map editor that reuses game rendering, clear class/skin/skill visuals, a wasteland prop layer, smooth early combat pacing, and staged commits for rollback.

This audit is not a completion claim. It lists the current evidence and the remaining gaps.

## Evidence Checklist

| Requirement | Current artifact | Verification |
| --- | --- | --- |
| Visual target reference | `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png` | Manually reviewed against generated screenshots. |
| Modular frontend entries | `frontend/index.html`, `frontend/editor/index.html`, `frontend/engine-demo/index.html`, `frontend/v03-shell/index.html` | `npm run verify:v03` opens the runtime, editor, WebGL demo, and V03 shell. |
| Shared V03 runtime config | `frontend/src/v03-runtime-config.js` | `e2e/v03-contract-verify.js` and `e2e/v03-cocos-bridge-verify.js` assert config presence and class/skill ids. |
| Shared map contract | `frontend/src/map-contract.js` | Gate checks `schemaVersion: v03-map-1`, `visualProfile: zombie-br-v03`, 26x22 arena, 28 structures, 4 zombie entries, 8 reward points. |
| Map editor reuses game rendering | `frontend/editor/editor.js`, `frontend/src/render/map.js`, `frontend/src/render/props.js`, `frontend/src/render/v03-scene.js` | Gate checks `previewUsesMap: true`, `previewTileCount: 572`, `previewPropCount: 28`. |
| Clear class/skin/skill visual concept | `frontend/v03-shell/`, `frontend/engine-demo/` | Gate checks 3 class cards, 3 skill cards, 9 skin swatches, shared ids `guardian/tech/ranger` and `arc/boom/fan`. |
| WebGL 2.5D depth reference | `frontend/engine-demo/app.js` | Gate checks WebGL, contract tile layer, props, class gear, safe zone, rival, and mobile screenshot. |
| Wasteland prop layer | `frontend/src/map-contract.js`, `frontend/src/render/props.js`, `frontend/engine-demo/app.js` | Gate checks structure count and rendered prop counts in editor/demo/shell. |
| Smooth early combat pacing reference | `frontend/engine-demo/app.js` | Gate waits 3.8s and requires shots, damage, kill, XP drop, HP > 0, living zombies, and visible gems. |
| Cocos production engine decision | `frontend/docs/mini-game-engine-decision.md`, `frontend/docs/engine-evaluation.md` | Documented recommendation: Cocos Creator 3.x. |
| Cocos data bridge | `cocos-v03-demo/assets/resources/config/*.json`, `tools/export-v03-cocos-config.js` | `npm run verify:v03` runs `e2e/v03-cocos-bridge-verify.js`. |
| Staged rollback points | Git commits from `f9f97ee` onward | `git log --oneline` shows separate commits for Cocos scaffold, bridge, visual demo, editor preview, arena size, pacing, shell config. |

## Current Gaps

- The final production engine slice is not yet runnable in Cocos Creator in this environment. `cocos-v03-demo/` has data, scripts, and gates, but no verified Cocos scene opened in Cocos Creator or exported WeChat Mini Game build.
- The legacy browser runtime at `/frontend/index.html?map=v03_contract` passes contract and gameplay boot checks, but its in-game visual quality is still below the WebGL reference and the candidate image.
- The WebGL reference uses procedural primitives. It communicates depth, layout, skills, classes, and pacing, but it does not yet provide production-ready animated character/zombie assets.
- The V03 shell and editor are landscape desktop review surfaces. The phone-oriented playable reference is `frontend/engine-demo/`; the final phone client should be the Cocos vertical slice.
- Current automated visual gates verify structure and screenshots, but do not perform pixel-level art-direction comparison against the candidate image.
- Visual progress must be reviewed against `candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png` after every meaningful iteration and recorded in `frontend/docs/v03-visual-iteration-log.md`.

## Next Recommended Work

1. Install/open Cocos Creator 3.8.x and turn `cocos-v03-demo/` into an actual Cocos scene with a phone preview.
2. Implement Cocos `MapRuntime`, player movement, zombie pressure, auto-fire, XP pickups, and HUD using the exported V03 config JSON.
3. Add a Cocos/WeChat preview gate: build output exists, package strategy documented, and a phone recording/screenshot matches the WebGL reference.
4. Keep `/frontend/engine-demo/index.html` as the visual and pacing reference until the Cocos slice is visibly better.
5. Only after the Cocos slice passes the gate, migrate or retire the legacy browser runtime.

## Verification Command

```text
npm run verify:v03
```

This command currently covers:

- contract runtime boot
- editor standardization and map-backed preview
- WebGL mobile visual/pacing reference
- V03 framework shell
- Cocos data bridge consistency
