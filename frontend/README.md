# Frontend Entrypoints

Run the local static server from the repo root, then open these paths:

```text
python3 dev-server.py 8081
```

## Playable References

- `/frontend/engine-demo/index.html`
  - WebGL V03 target demo.
  - Current reference for 2.5D depth, shadows, class/skill identity, drag movement, zombie chase, auto-fire, XP pickup, and level feedback.
  - This is the visual/interaction bar for the Cocos Creator slice.

- `/frontend/index.html`
  - Current modularized game entry.
  - Still contains the legacy gameplay core under `frontend/src/legacy-game.js`.
  - Loads `frontend/src/map-contract.js` before the legacy core so editor-exported maps normalize to the same V03 schema at runtime.
  - Open `/frontend/index.html?map=v03_contract` to run the standard map generated directly from the shared contract.

- `/frontend/editor/index.html`
  - Current map editor entry.
  - Should converge on the same map entities and rendering rules used by the game runtime.
  - Uses `KOS_MAP_CONTRACT.standardizeMap()` for the standard wasteland battle royale layout and quality gates.

## Direction

- Mini-game engine decision: `frontend/docs/mini-game-engine-decision.md`
- Engine decision: `frontend/docs/engine-evaluation.md`
- Cocos vertical slice gate: `frontend/docs/cocos-vertical-slice.md`
- V03 class/skill/tuning config: `frontend/src/v03-runtime-config.js`

## Production Engine Scaffold

- `cocos-v03-demo/`
  - Cocos Creator 3.x vertical slice scaffold.
  - Use this as the production-engine starting point after installing Cocos Creator.
  - Runtime bridge files are generated with `npm run export:cocos-v03`.
  - The first Cocos demo should match `/frontend/engine-demo/index.html` before replacing the current browser runtime.

## Verification

```text
node e2e/v03-contract-verify.js
npm run verify:v03
```

This quick-starts the V03 contract runtime map, checks the editor standardization gate, and verifies the WebGL engine demo on a mobile viewport.
It writes visual review screenshots to `can_delete/v03-gate/`.
