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

function flattenScenePaths(rootNodes) {
  const paths = new Set();
  rootNodes.forEach((node) => {
    paths.add(node.path);
    (node.children || []).forEach((child) => {
      paths.add(`${node.path}/${child}`);
    });
  });
  return paths;
}

function basenameList(items) {
  return items.map((item) => item.split('/').pop());
}

function assertIncludesAll(items, required, label) {
  required.forEach((item) => {
    assert(items.includes(item), `${label} must include ${item}`);
  });
}

const manifest = readJson('cocos-v03-demo/settings/v03-scene-assembly-manifest.json');
const checklist = readJson('cocos-v03-demo/settings/v03-first-playable-checklist.json');
const presentationAudit = readText('frontend/docs/v03-first-playable-presentation-audit.md');
const firstPlayableDoc = readText('frontend/docs/cocos-v03-first-playable-checklist.md');

assert(manifest.scene === 'V03Battle.scene', 'Scene assembly manifest must target V03Battle.scene');
assert(manifest.status === 'source-manifest-only', 'Scene assembly manifest must remain explicit about source-only status');
assert(manifest.creatorRequired === '3.8.x', 'Scene assembly manifest must target Cocos Creator 3.8.x');
assert(manifest.targetPlatform === 'WeChat Mini Game', 'Scene assembly manifest must target WeChat Mini Game');
assert(manifest.reference === 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png', 'Scene assembly manifest must cite the V03 target image');
assert(manifest.reviewSource === 'frontend/engine-demo/index.html', 'Scene assembly manifest must cite the WebGL review source');
assert(manifest.engineProofSource === 'frontend/engine-proof/index.html', 'Scene assembly manifest must cite the engine proof source');
assert(manifest.engineProofManifest === 'settings/v03-engine-proof-manifest.json', 'Scene assembly manifest must cite the engine proof manifest');
assert(manifest.orientation === checklist.orientation, 'Scene assembly manifest orientation must match checklist');
assert(manifest.viewports.portrait === '390x844', 'Scene assembly manifest must include portrait phone viewport');
assert(manifest.viewports.landscapeReview === '844x390', 'Scene assembly manifest must include landscape review viewport');

const scenePaths = flattenScenePaths(manifest.rootNodes);
assertIncludesAll(
  [...scenePaths],
  [
    'Root',
    'CameraRig/MainCamera',
    'World',
    'World/GroundTiles',
    'World/RoadMarks',
    'World/Props',
    'World/SpawnPins',
    'World/RewardPins',
    'Actors',
    'Actors/Player',
    'Actors/Zombies',
    'Actors/Projectiles',
    'Actors/Pickups',
    'FX',
    'FX/SkillBeams',
    'FX/SkillBursts',
    'FX/HitFlashes',
    'FX/CardLayers',
    'UI',
    'UI/TopHud',
    'UI/MiniMap',
    'UI/MoveStick',
    'UI/SkillButtons',
    'UI/ClassPanel'
  ],
  'Scene assembly node paths'
);

checklist.requiredNodes.forEach((node) => {
  assert(scenePaths.has(node), `Scene assembly manifest must cover checklist node ${node}`);
});

[
  ['Root', 'V03BattleDirector'],
  ['World', 'V03MapRuntime'],
  ['Actors', 'V03VisualRuntime'],
  ['CameraRig/MainCamera', 'Camera']
].forEach(([nodePath, component]) => {
  const node = manifest.rootNodes.find((item) => item.path === nodePath);
  assert(node, `Scene assembly manifest must include node ${nodePath}`);
  assert((node.components || []).includes(component), `Node ${nodePath} must bind ${component}`);
});

assertIncludesAll(
  manifest.dataSources,
  [
    'assets/resources/config/v03-runtime-config.json',
    'assets/resources/config/v03-standard-map.json'
  ],
  'Scene assembly data sources'
);

assertIncludesAll(
  manifest.scripts,
  [
    'assets/scripts/V03BattleDirector.ts',
    'assets/scripts/V03ResourceBridge.ts',
    'assets/scripts/V03MapRuntime.ts',
    'assets/scripts/V03VisualRuntime.ts',
    'assets/scripts/V03VisualContract.ts'
  ],
  'Scene assembly scripts'
);

assertIncludesAll(manifest.prefabGroups.hero, basenameList(checklist.prefabs.hero), 'Hero prefabs');
assertIncludesAll(manifest.prefabGroups.zombie, basenameList(checklist.prefabs.zombie), 'Zombie prefabs');
assertIncludesAll(manifest.prefabGroups.fx, basenameList(checklist.prefabs.fx), 'FX prefabs');
assertIncludesAll(manifest.prefabGroups.ui, basenameList(checklist.prefabs.ui), 'UI prefabs');

const manifestMapPrefabs = [...manifest.prefabGroups.mapCore, ...manifest.prefabGroups.mapDetail];
assertIncludesAll(manifestMapPrefabs, basenameList(checklist.prefabs.map), 'Map prefabs');

assertIncludesAll(
  manifest.prefabGroups.mapDetail,
  [
    'PropOilStain.prefab',
    'PropEdgeHighlight.prefab',
    'PropLightBlock.prefab',
    'PropJaggedCap.prefab',
    'PropCoverWreck.prefab',
    'PropCoverBarrel.prefab',
    'GroundWashCombatAsphalt.prefab',
    'SafeZonePainterlyHaze.prefab',
    'StageWarmFocus.prefab',
    'ObjectWarmRim.prefab',
    'MaterialWarmBlend.prefab'
  ],
  'Detailed map prefabs'
);

assertIncludesAll(manifest.visualLayerCoverage, checklist.visualContractCoverage, 'Visual layer coverage');
assertIncludesAll(manifest.acceptanceScreenshots, checklist.acceptanceScreenshots, 'Acceptance screenshots');

assert(manifest.runtimeGate.durationSeconds >= 120, 'Scene assembly runtime gate must require a two minute run');
assert(manifest.runtimeGate.targetFps >= 30, 'Scene assembly runtime gate must target 30 FPS');
assert(manifest.runtimeGate.offlineConfig === true, 'Scene assembly runtime gate must support offline config');
assert(manifest.runtimeGate.wechatMiniGame === true, 'Scene assembly runtime gate must target WeChat Mini Game');
assert(manifest.runtimeGate.earlyCombat.shotsFired >= 5, 'Scene assembly early combat must require five shots');
assert(manifest.runtimeGate.earlyCombat.damageDealt >= 80, 'Scene assembly early combat must require damage dealt');
assert(manifest.runtimeGate.earlyCombat.kills >= 1, 'Scene assembly early combat must require a kill');
assert(manifest.runtimeGate.earlyCombat.xpDropped >= 1, 'Scene assembly early combat must require XP drops');

[
  'Cocos Creator scene asset has not been authored in this environment',
  'WeChat Mini Game build has not been exported',
  'Real prefab art must replace manifest placeholder names'
].forEach((gap) => {
  assert(manifest.knownGaps.includes(gap), `Scene assembly manifest must keep known gap: ${gap}`);
});

[
  'cocos-v03-demo/settings/v03-scene-assembly-manifest.json',
  'source-manifest-only',
  'V03Battle.scene'
].forEach((text) => {
  assert(presentationAudit.includes(text), `Presentation audit must mention ${text}`);
  assert(firstPlayableDoc.includes(text), `First playable doc must mention ${text}`);
});

console.log(JSON.stringify({
  sceneAssemblyManifest: true,
  scene: manifest.scene,
  nodes: scenePaths.size,
  scripts: manifest.scripts.length,
  prefabs: Object.values(manifest.prefabGroups).flat().length,
  visualCoverage: manifest.visualLayerCoverage.length,
  screenshots: manifest.acceptanceScreenshots.length,
  sourceOnly: manifest.status === 'source-manifest-only'
}, null, 2));
