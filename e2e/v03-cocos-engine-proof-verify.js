const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const manifest = readJson('cocos-v03-demo/settings/v03-engine-proof-manifest.json');
const sceneManifest = readJson('cocos-v03-demo/settings/v03-scene-assembly-manifest.json');
const firstPlayableChecklist = readJson('cocos-v03-demo/settings/v03-first-playable-checklist.json');
const engineDecision = readText('frontend/docs/mini-game-engine-decision.md');
const engineEvaluation = readText('frontend/docs/engine-evaluation.md');
const presentationAudit = readText('frontend/docs/v03-first-playable-presentation-audit.md');
const packageJson = readJson('package.json');

assert(manifest.schemaVersion === 'v03-engine-proof-1', 'Engine proof manifest schema mismatch');
assert(manifest.status === 'source-manifest-only', 'Engine proof manifest must be explicit about source-only status');
assert(manifest.targetEngine === 'cocos-creator-3.x', 'Engine proof manifest must target Cocos Creator');
assert(manifest.creatorRequired === '3.8.x', 'Engine proof manifest must target Cocos Creator 3.8.x');
assert(manifest.targetPlatform === 'WeChat Mini Game', 'Engine proof manifest must target WeChat Mini Game');
assert(manifest.reference === 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png', 'Engine proof manifest must cite the V03 target image');
assert(manifest.browserProof === 'frontend/engine-proof/index.html', 'Engine proof manifest must cite the browser proof page');
assert(manifest.browserProofScreenshot === 'can_delete/v03-gate/engine-proof-cocos-route.png', 'Engine proof manifest must cite the proof screenshot');
assert(manifest.artManifest === 'assets/resources/config/v03-art-assets.json', 'Engine proof manifest must cite the Cocos art asset manifest');
assert(manifest.productionRenderRoute === 'orthographic-2.5d-sprite-billboard-plus-prop-depth', 'Engine proof manifest must lock the render route');
assert(manifest.cocosScene === sceneManifest.scene && manifest.cocosScene === firstPlayableChecklist.scene, 'Engine proof scene must match the Cocos scene manifests');

['V03SceneBootstrap', 'V03BattleDirector', 'V03MapRuntime', 'V03VisualRuntime', 'V03ResourceBridge', 'V03VisualContract'].forEach((component) => {
  assert(manifest.requiredComponents.includes(component), `Engine proof manifest must include component ${component}`);
  assert(sceneManifest.scripts.some((script) => script.includes(component)), `Scene manifest must include script ${component}`);
});

const layerIds = manifest.proofLayers.map((layer) => layer.id);
[
  'orthographic-2.5d-camera',
  'billboard-character-sprites',
  'prop-depth-roots',
  'painterly-ground-splats',
  'safe-zone-storm-layers',
  'skill-fx-cards',
  'mobile-combat-hud'
].forEach((layer) => {
  assert(layerIds.includes(layer), `Engine proof manifest must include layer ${layer}`);
});

[
  'usesOrthographicCamera',
  'billboardSpriteCount >= 8',
  'propDepthLayerCount >= 4',
  'groundSplatCount >= 5',
  'stormLayerCount >= 2',
  'skillFxLayerCount >= 5',
  'skillButtonsClear'
].forEach((gate) => {
  assert(manifest.proofLayers.some((layer) => layer.browserGate === gate), `Engine proof manifest must map browser gate ${gate}`);
});

assert(manifest.runtimeGate.durationSeconds >= 120, 'Engine proof runtime gate must require a two minute run');
assert(manifest.runtimeGate.targetFps >= 30, 'Engine proof runtime gate must target 30 FPS');
assert(manifest.runtimeGate.maxMainPackageMb <= 4, 'Engine proof runtime gate must keep WeChat main package budget');
assert(manifest.runtimeGate.wechatMiniGame === true, 'Engine proof runtime gate must target WeChat Mini Game');
assert(manifest.runtimeGate.offlineConfig === true, 'Engine proof runtime gate must keep offline config');
assert(manifest.runtimeGate.portraitViewport === '390x844', 'Engine proof runtime gate must keep portrait viewport');

[
  'cocos-v03-demo/settings/v03-engine-proof-manifest.json',
  'orthographic-2.5d-sprite-billboard-plus-prop-depth',
  'frontend/engine-proof/index.html'
].forEach((text) => {
  assert(engineDecision.includes(text) || engineEvaluation.includes(text) || presentationAudit.includes(text), `Docs must mention ${text}`);
});

[
  'node e2e/v03-engine-proof-verify.js',
  'node e2e/v03-cocos-engine-proof-verify.js'
].forEach((command) => {
  assert(packageJson.scripts['verify:v03'].includes(command), `verify:v03 must include ${command}`);
  assert(presentationAudit.includes(command), `Presentation audit must mention ${command}`);
});

console.log(JSON.stringify({
  cocosEngineProof: true,
  targetEngine: manifest.targetEngine,
  renderRoute: manifest.productionRenderRoute,
  proofLayers: manifest.proofLayers.length,
  runtimeGate: manifest.runtimeGate
}, null, 2));
