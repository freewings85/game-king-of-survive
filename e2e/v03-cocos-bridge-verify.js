const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function loadBrowserGlobal(relativePath, globalName) {
  const filePath = path.join(repoRoot, relativePath);
  const context = {
    window: {},
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: relativePath });
  if (!context.window[globalName]) {
    throw new Error(`${globalName} was not exported by ${relativePath}`);
  }
  return context.window[globalName];
}

function numberToHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const sourceConfig = loadBrowserGlobal('frontend/src/v03-runtime-config.js', 'KOS_V03_CONFIG');
const sourceContract = loadBrowserGlobal('frontend/src/map-contract.js', 'KOS_MAP_CONTRACT');
const cocosConfig = readJson('cocos-v03-demo/assets/resources/config/v03-runtime-config.json');
const cocosMap = readJson('cocos-v03-demo/assets/resources/config/v03-standard-map.json');
const firstPlayableChecklist = readJson('cocos-v03-demo/settings/v03-first-playable-checklist.json');
const resourceBridgeSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03ResourceBridge.ts'), 'utf8');
const mapRuntimeSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03MapRuntime.ts'), 'utf8');
const battleDirectorSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03BattleDirector.ts'), 'utf8');
const visualContractSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03VisualContract.ts'), 'utf8');
const visualRuntimeSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03VisualRuntime.ts'), 'utf8');
const visualContractDoc = fs.readFileSync(path.join(repoRoot, 'frontend/docs/cocos-v03-visual-contract.md'), 'utf8');
const firstPlayableDoc = fs.readFileSync(path.join(repoRoot, 'frontend/docs/cocos-v03-first-playable-checklist.md'), 'utf8');

const sourceClassIds = Object.keys(sourceConfig.classDefs).sort();
const cocosClassIds = Object.keys(cocosConfig.classes).sort();
assert(JSON.stringify(cocosClassIds) === JSON.stringify(sourceClassIds), 'Cocos runtime class ids are out of sync');

sourceClassIds.forEach((id) => {
  const source = sourceConfig.classDefs[id];
  const target = cocosConfig.classes[id];
  assert(target.name === source.name, `${id} name mismatch`);
  assert(target.mark === source.mark, `${id} mark mismatch`);
  assert(target.body === numberToHex(source.body), `${id} body color mismatch`);
  assert(target.accent === numberToHex(source.accent), `${id} accent color mismatch`);
  assert(target.emissive === numberToHex(source.emissive), `${id} emissive color mismatch`);
  assert(JSON.stringify(target.skins) === JSON.stringify(source.skins), `${id} skins mismatch`);
});

const sourceSkillIds = Object.keys(sourceConfig.skillDefs).sort();
const cocosSkillIds = Object.keys(cocosConfig.skills).sort();
assert(JSON.stringify(cocosSkillIds) === JSON.stringify(sourceSkillIds), 'Cocos runtime skill ids are out of sync');

sourceSkillIds.forEach((id) => {
  const source = sourceConfig.skillDefs[id];
  const target = cocosConfig.skills[id];
  assert(target.color === numberToHex(source.color), `${id} color mismatch`);
  assert(target.damage === source.damage, `${id} damage mismatch`);
  assert(target.targets === source.targets, `${id} targets mismatch`);
  assert(target.range === source.range, `${id} range mismatch`);
  assert(target.spread === source.spread, `${id} spread mismatch`);
});

const expectedMap = sourceContract.standardizeMap(sourceContract.createMap(26, 22));
assert(cocosMap.schemaVersion === 'v03-map-1', 'Cocos map schema mismatch');
assert(cocosMap.visualProfile === 'zombie-br-v03', 'Cocos map visual profile mismatch');
assert(cocosMap.cols === expectedMap.cols && cocosMap.rows === expectedMap.rows, 'Cocos map size mismatch');
assert(cocosMap.structures.length === expectedMap.structures.length, 'Cocos map structures mismatch');
assert(cocosMap.zombieEntries.length >= 4, 'Cocos map needs four zombie entries');
assert(cocosMap.rewardPoints.length >= 8, 'Cocos map needs eight reward points');
assert(cocosMap.rivalPoints.length >= 2, 'Cocos map needs two rival points');
assert(cocosMap.qualityChecks.every((check) => check.ok), 'Cocos map quality gate failed');
assert(resourceBridgeSource.includes("resources.load(path, JsonAsset"), 'Cocos bridge must load resources JsonAsset files');
assert(resourceBridgeSource.includes("'config/v03-runtime-config'"), 'Cocos bridge must load runtime config JSON');
assert(resourceBridgeSource.includes("'config/v03-standard-map'"), 'Cocos bridge must load standard map JSON');
assert(mapRuntimeSource.includes("@ccclass('V03MapRuntime')"), 'Cocos map runtime component is missing');
assert(mapRuntimeSource.includes('buildFromMap(map: V03MapData)'), 'Cocos map runtime must build from bridge map data');
assert(mapRuntimeSource.includes('map.tiles.forEach'), 'Cocos map runtime must instantiate tiles');
assert(mapRuntimeSource.includes('map.structures.forEach'), 'Cocos map runtime must instantiate props');
assert(mapRuntimeSource.includes('map.zombieEntries'), 'Cocos map runtime must expose zombie entries');
assert(mapRuntimeSource.includes('map.rewardPoints'), 'Cocos map runtime must expose reward points');
assert(battleDirectorSource.includes('public mapRuntime: V03MapRuntime'), 'Battle director must expose V03MapRuntime');
assert(battleDirectorSource.includes('this.mapRuntime.buildFromMap(this.bridgeData.map)'), 'Battle director must build map runtime from bridge data');
assert(visualRuntimeSource.includes("@ccclass('V03VisualRuntime')"), 'Cocos visual runtime component is missing');
assert(visualRuntimeSource.includes('buildVisualContract(classId: V03ClassId'), 'Cocos visual runtime must build from visual contract data');
assert(visualRuntimeSource.includes('V03_REQUIRED_HERO_GEAR'), 'Cocos visual runtime must consume hero gear contract');
assert(visualRuntimeSource.includes('V03_ZOMBIE_VARIANTS'), 'Cocos visual runtime must consume zombie variant contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_UNIT_DECALS'), 'Cocos visual runtime must consume unit decal contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_GROUND_LAYERS'), 'Cocos visual runtime must consume prop ground layer contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_WEAR_DECALS'), 'Cocos visual runtime must consume prop wear decal contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_SHAPE_BLOCKS'), 'Cocos visual runtime must consume prop shape block contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_FX_LAYERS'), 'Cocos visual runtime must consume FX layer contract');
assert(visualRuntimeSource.includes('heroGear'), 'Cocos visual runtime must report hero gear stats');
assert(visualRuntimeSource.includes('zombieVariants'), 'Cocos visual runtime must report zombie variant stats');
assert(visualRuntimeSource.includes('unitDecals'), 'Cocos visual runtime must report unit decal stats');
assert(visualRuntimeSource.includes('propGroundLayers'), 'Cocos visual runtime must report prop ground layer stats');
assert(visualRuntimeSource.includes('propWearDecals'), 'Cocos visual runtime must report prop wear decal stats');
assert(visualRuntimeSource.includes('propShapeBlocks'), 'Cocos visual runtime must report prop shape block stats');
assert(visualRuntimeSource.includes('fxLayers'), 'Cocos visual runtime must report FX layer stats');
assert(battleDirectorSource.includes('public visualRuntime: V03VisualRuntime'), 'Battle director must expose V03VisualRuntime');
assert(battleDirectorSource.includes('this.visualRuntime.buildVisualContract(this.classId, this.skillId)'), 'Battle director must build visual runtime from contract');
['guardian', 'tech', 'ranger'].forEach((id) => {
  assert(visualContractSource.includes(id), `Visual contract must include ${id}`);
});
['heavy-shield', 'coil-device', 'long-rifle', 'hood', 'scope', 'cape-stripe'].forEach((gear) => {
  assert(visualContractSource.includes(gear), `Visual contract must include hero gear ${gear}`);
});
['brute', 'crawler', 'hooded'].forEach((variant) => {
  assert(visualContractSource.includes(variant), `Visual contract must include zombie variant ${variant}`);
});
['face-highlight', 'armor-edge', 'wound-patch', 'rot-patch', 'torn-cloth-panel'].forEach((decal) => {
  assert(visualContractSource.includes(decal), `Visual contract must include unit decal ${decal}`);
});
['prop-oil-stain', 'prop-rust-stain', 'prop-rubble-chip', 'prop-shadow-blob'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include prop ground layer ${layer}`);
  assert(visualContractDoc.includes(layer), `Visual contract doc must include prop ground layer ${layer}`);
});
['prop-edge-highlight', 'prop-dark-panel', 'prop-scratch-stack', 'prop-glass-card', 'prop-hazard-band'].forEach((decal) => {
  assert(visualContractSource.includes(decal), `Visual contract must include prop wear decal ${decal}`);
  assert(visualContractDoc.includes(decal), `Visual contract doc must include prop wear decal ${decal}`);
});
['prop-light-block', 'prop-shadow-block', 'prop-cool-rim', 'prop-rim-frame'].forEach((block) => {
  assert(visualContractSource.includes(block), `Visual contract must include prop shape block ${block}`);
  assert(visualContractDoc.includes(block), `Visual contract doc must include prop shape block ${block}`);
});
['muzzle-card', 'bullet-card', 'explosion-core', 'shock-ring', 'debris-card', 'smoke-card', 'branch-link', 'glow-link', 'node-ring', 'impact-card'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include FX layer ${layer}`);
});
['engine-demo-landscape-phone.png', 'engine-demo-skill-fan.png', 'engine-demo-skill-boom.png', 'engine-demo-skill-arc.png'].forEach((screenshot) => {
  assert(visualContractSource.includes(screenshot), `Visual contract must include review screenshot ${screenshot}`);
  assert(visualContractDoc.includes(screenshot), `Visual contract doc must include review screenshot ${screenshot}`);
});
assert(firstPlayableChecklist.scene === 'V03Battle.scene', 'First playable checklist must target V03Battle.scene');
['CameraRig/MainCamera', 'World/GroundTiles', 'World/Props', 'Actors/Player', 'Actors/Zombies', 'FX/CardLayers', 'UI/MiniMap', 'UI/SkillButtons'].forEach((node) => {
  assert(firstPlayableChecklist.requiredNodes.includes(node), `First playable checklist must include node ${node}`);
});
['V03BattleDirector', 'V03MapRuntime', 'V03VisualRuntime'].forEach((component) => {
  assert(firstPlayableChecklist.componentBindings.some((binding) => binding.component === component), `First playable checklist must bind ${component}`);
});
['Guardian.prefab', 'TechEngineer.prefab', 'Ranger.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.hero.some((item) => item.endsWith(prefab)), `First playable checklist must include hero prefab ${prefab}`);
});
['Brute.prefab', 'Crawler.prefab', 'Hooded.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.zombie.some((item) => item.endsWith(prefab)), `First playable checklist must include zombie prefab ${prefab}`);
});
['FanBulletCard.prefab', 'FanImpactMark.prefab', 'BoomShockRing.prefab', 'BoomDebrisCard.prefab', 'ArcBranchLink.prefab', 'ArcNodeRing.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.fx.some((item) => item.endsWith(prefab)), `First playable checklist must include FX prefab ${prefab}`);
});
['PropOilStain.prefab', 'PropRustStain.prefab', 'PropRubbleChip.prefab', 'PropShadowBlob.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include map detail prefab ${prefab}`);
});
['PropEdgeHighlight.prefab', 'PropDarkPanel.prefab', 'PropScratchStack.prefab', 'PropGlassCard.prefab', 'PropHazardBand.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include map wear prefab ${prefab}`);
});
['PropLightBlock.prefab', 'PropShadowBlock.prefab', 'PropCoolRim.prefab', 'PropRimFrame.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include map shape prefab ${prefab}`);
});
['heroGear', 'zombieVariants', 'unitDecals', 'propGroundLayers', 'propWearDecals', 'propShapeBlocks', 'fxLayers', 'reviewScreenshots'].forEach((coverage) => {
  assert(firstPlayableChecklist.visualContractCoverage.includes(coverage), `First playable checklist must cover ${coverage}`);
});
['cocos-v03-phone-portrait.png', 'cocos-v03-phone-landscape.png', 'cocos-v03-skill-fan.png', 'cocos-v03-skill-boom.png', 'cocos-v03-skill-arc.png'].forEach((screenshot) => {
  assert(firstPlayableChecklist.acceptanceScreenshots.includes(screenshot), `First playable checklist must require ${screenshot}`);
  assert(firstPlayableDoc.includes(screenshot), `First playable doc must mention ${screenshot}`);
});
assert(firstPlayableChecklist.runtimeGate.durationSeconds >= 120, 'First playable runtime gate must cover a two minute run');
assert(firstPlayableChecklist.runtimeGate.targetFps >= 30, 'First playable runtime gate must target 30 FPS');
assert(firstPlayableChecklist.runtimeGate.wechatMiniGame === true, 'First playable runtime gate must target WeChat Mini Game');

console.log(JSON.stringify({
  classes: cocosClassIds,
  skills: cocosSkillIds,
  structures: cocosMap.structures.length,
  zombieEntries: cocosMap.zombieEntries.length,
  rewardPoints: cocosMap.rewardPoints.length,
  rivalPoints: cocosMap.rivalPoints.length,
  resourceBridge: true,
  mapRuntime: true,
  visualContract: true,
  visualRuntime: true,
  firstPlayableChecklist: true,
  qualityOk: cocosMap.qualityChecks.every((check) => check.ok)
}, null, 2));
