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
const cocosArt = readJson('cocos-v03-demo/assets/resources/config/v03-art-assets.json');
const firstPlayableChecklist = readJson('cocos-v03-demo/settings/v03-first-playable-checklist.json');
const resourceBridgeSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03ResourceBridge.ts'), 'utf8');
const mapRuntimeSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03MapRuntime.ts'), 'utf8');
const battleDirectorSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03BattleDirector.ts'), 'utf8');
const sceneBootstrapSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03SceneBootstrap.ts'), 'utf8');
const artSpriteRuntimeSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03ArtSpriteRuntime.ts'), 'utf8');
const contactShadowRuntimeSource = fs.readFileSync(path.join(repoRoot, 'cocos-v03-demo/assets/scripts/V03ContactShadowRuntime.ts'), 'utf8');
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
assert(cocosArt.schemaVersion === 'v03-art-assets-1', 'Cocos art asset schema mismatch');
assert(cocosArt.reference === 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png', 'Cocos art assets must cite target reference');
assert(cocosArt.assets.length >= 48, 'Cocos art bridge needs imported V03 PNG assets');
assert(cocosArt.counts.portraits >= 12, 'Cocos art bridge needs class portrait assets');
assert(cocosArt.counts.units >= 18, 'Cocos art bridge needs idle and attack class/skin unit sprite assets');
assert(cocosArt.counts.zombies >= 9, 'Cocos art bridge needs idle, hit, and walk zombie card assets');
assert(cocosArt.counts.skills >= 3, 'Cocos art bridge needs skill card assets');
assert(cocosArt.counts.props >= 6, 'Cocos art bridge needs prop cover assets');
['hero-guardian-0-isometric', 'hero-guardian-0-attack-isometric', 'hero-guardian-1-isometric', 'hero-guardian-1-attack-isometric', 'hero-guardian-2-isometric', 'hero-guardian-2-attack-isometric', 'hero-tech-0-isometric', 'hero-tech-0-attack-isometric', 'hero-tech-1-isometric', 'hero-tech-1-attack-isometric', 'hero-tech-2-isometric', 'hero-tech-2-attack-isometric', 'hero-ranger-0-isometric', 'hero-ranger-0-attack-isometric', 'hero-ranger-1-isometric', 'hero-ranger-1-attack-isometric', 'hero-ranger-2-isometric', 'hero-ranger-2-attack-isometric', 'zombie-card-brute', 'zombie-card-brute-hit', 'zombie-card-brute-walk', 'zombie-card-crawler', 'zombie-card-crawler-hit', 'zombie-card-crawler-walk', 'zombie-card-hooded', 'zombie-card-hooded-hit', 'zombie-card-hooded-walk', 'skill-card-arc', 'skill-card-boom', 'skill-card-fan', 'prop-cover-wreck', 'prop-cover-wall', 'prop-cover-crate', 'prop-cover-barrel', 'prop-cover-tires', 'prop-cover-debris'].forEach((id) => {
  const asset = cocosArt.assets.find((item) => item.id === id);
  assert(asset, `Cocos art manifest must include ${id}`);
  assert(asset.resourcePath.startsWith(`art/v03/${asset.group}/`), `Cocos art manifest resource path must be under art/v03 for ${id}`);
  assert(asset.spriteFramePath === `${asset.resourcePath}/spriteFrame`, `Cocos art manifest must include spriteFramePath for ${id}`);
  assert(fs.existsSync(path.join(repoRoot, asset.file)), `Cocos art file must exist for ${id}`);
});
assert(resourceBridgeSource.includes("resources.load(path, JsonAsset"), 'Cocos bridge must load resources JsonAsset files');
assert(resourceBridgeSource.includes("'config/v03-runtime-config'"), 'Cocos bridge must load runtime config JSON');
assert(resourceBridgeSource.includes("'config/v03-standard-map'"), 'Cocos bridge must load standard map JSON');
assert(resourceBridgeSource.includes("'config/v03-art-assets'"), 'Cocos bridge must load art asset manifest JSON');
assert(resourceBridgeSource.includes('validateV03ArtAssetManifest'), 'Cocos bridge must validate art asset manifest JSON');
assert(mapRuntimeSource.includes("@ccclass('V03MapRuntime')"), 'Cocos map runtime component is missing');
assert(mapRuntimeSource.includes('buildFromMap(map: V03MapData)'), 'Cocos map runtime must build from bridge map data');
assert(mapRuntimeSource.includes('map.tiles.forEach'), 'Cocos map runtime must instantiate tiles');
assert(mapRuntimeSource.includes('map.structures.forEach'), 'Cocos map runtime must instantiate props');
assert(mapRuntimeSource.includes('map.zombieEntries'), 'Cocos map runtime must expose zombie entries');
assert(mapRuntimeSource.includes('map.rewardPoints'), 'Cocos map runtime must expose reward points');
assert(contactShadowRuntimeSource.includes("@ccclass('V03ContactShadowRuntime')"), 'Cocos contact shadow runtime component is missing');
assert(contactShadowRuntimeSource.includes('buildFromMap(map: V03MapData)'), 'Contact shadow runtime must build from map data');
assert(contactShadowRuntimeSource.includes('map.spawnPoints[0]'), 'Contact shadow runtime must create player spawn shadow');
assert(contactShadowRuntimeSource.includes('map.zombieEntries.forEach'), 'Contact shadow runtime must create zombie entry shadows');
assert(contactShadowRuntimeSource.includes('map.structures'), 'Contact shadow runtime must create prop shadows from structures');
assert(contactShadowRuntimeSource.includes('primitives.box({ width, height: 0.012, length: depth })'), 'Contact shadow runtime must create flat shadow meshes');
assert(contactShadowRuntimeSource.includes('propShadows'), 'Contact shadow runtime must report prop shadow stats');
assert(battleDirectorSource.includes('public mapRuntime: V03MapRuntime'), 'Battle director must expose V03MapRuntime');
assert(battleDirectorSource.includes('this.mapRuntime.buildFromMap(this.bridgeData.map)'), 'Battle director must build map runtime from bridge data');
assert(battleDirectorSource.includes('public contactShadowRuntime: V03ContactShadowRuntime'), 'Battle director must expose V03ContactShadowRuntime');
assert(battleDirectorSource.includes('this.contactShadowRuntime.buildFromMap(this.bridgeData.map)'), 'Battle director must build contact shadows from map data');
assert(battleDirectorSource.includes('loadV03ArtAssetManifest'), 'Battle director must load Cocos art asset manifest');
assert(battleDirectorSource.includes('public artSpriteRuntime: V03ArtSpriteRuntime'), 'Battle director must expose V03ArtSpriteRuntime');
assert(battleDirectorSource.includes('this.artSpriteRuntime.buildFromManifest(this.artManifest, this.bridgeData.map)'), 'Battle director must build art sprites from manifest and map data');
assert(sceneBootstrapSource.includes("@ccclass('V03SceneBootstrap')"), 'Cocos scene bootstrap component is missing');
assert(sceneBootstrapSource.includes('buildRuntimeScene()'), 'Scene bootstrap must expose buildRuntimeScene');
assert(sceneBootstrapSource.includes('Camera.ProjectionType.ORTHO'), 'Scene bootstrap must create an orthographic camera');
assert(sceneBootstrapSource.includes("this.ensurePath('World/GroundTiles')"), 'Scene bootstrap must create ground tile root');
assert(sceneBootstrapSource.includes("this.ensurePath('World/ContactShadows')"), 'Scene bootstrap must create contact shadow root');
assert(sceneBootstrapSource.includes("this.ensurePath('Actors/VisualActors')"), 'Scene bootstrap must create visual actor root');
assert(sceneBootstrapSource.includes("this.ensurePath('FX/VisualFX')"), 'Scene bootstrap must create visual FX root');
assert(sceneBootstrapSource.includes('director.mapRuntime = mapRuntime'), 'Scene bootstrap must wire map runtime into battle director');
assert(sceneBootstrapSource.includes('director.contactShadowRuntime = contactShadowRuntime'), 'Scene bootstrap must wire contact shadow runtime into battle director');
assert(sceneBootstrapSource.includes('director.visualRuntime = visualRuntime'), 'Scene bootstrap must wire visual runtime into battle director');
assert(sceneBootstrapSource.includes('director.artSpriteRuntime = artSpriteRuntime'), 'Scene bootstrap must wire art sprite runtime into battle director');
assert(sceneBootstrapSource.includes('director.statusLabel = statusLabel'), 'Scene bootstrap must wire status label into battle director');
assert(artSpriteRuntimeSource.includes("@ccclass('V03ArtSpriteRuntime')"), 'Cocos art sprite runtime component is missing');
assert(artSpriteRuntimeSource.includes('buildFromManifest(manifest: V03ArtAssetManifest, map?: V03MapData)'), 'Art sprite runtime must build from art manifest and map data');
assert(artSpriteRuntimeSource.includes('resources.load(spriteFramePath, SpriteFrame'), 'Art sprite runtime must load Cocos SpriteFrame resources');
assert(artSpriteRuntimeSource.includes('node.addComponent(Sprite)'), 'Art sprite runtime must create Sprite components');
assert(artSpriteRuntimeSource.includes("asset.spriteFramePath || `${asset.resourcePath}/spriteFrame`"), 'Art sprite runtime must use manifest sprite frame path');
assert(artSpriteRuntimeSource.includes('map.spawnPoints[0]'), 'Art sprite runtime must bind unit and skill sprites to map spawn points');
assert(artSpriteRuntimeSource.includes('unitVariantIndex(asset.id)'), 'Art sprite runtime must separate class/skin unit sprite placements');
assert(artSpriteRuntimeSource.includes('map.zombieEntries'), 'Art sprite runtime must bind zombie sprites to map entry points');
assert(artSpriteRuntimeSource.includes('structuresForPropAsset(map, asset.id)'), 'Art sprite runtime must bind prop sprites to map structures');
assert(artSpriteRuntimeSource.includes('.slice(0, 6)'), 'Art sprite runtime must support multiple prop instances per asset family');
assert(artSpriteRuntimeSource.includes('node.setScale(new Vec3(placement.scale, placement.scale, 1))'), 'Art sprite runtime must apply per-group sprite scaling');
assert(artSpriteRuntimeSource.includes('node.setSiblingIndex(placement.depthIndex)'), 'Art sprite runtime must depth-sort runtime sprites');
assert(artSpriteRuntimeSource.includes('mapBoundSprites'), 'Art sprite runtime must report map-bound sprite count');
assert(artSpriteRuntimeSource.includes('propInstances'), 'Art sprite runtime must report prop instance count');
assert(artSpriteRuntimeSource.includes('depthSortedSprites'), 'Art sprite runtime must report depth-sorted sprite count');
assert(artSpriteRuntimeSource.includes('scaledSprites'), 'Art sprite runtime must report scaled sprite count');
assert(visualRuntimeSource.includes("@ccclass('V03VisualRuntime')"), 'Cocos visual runtime component is missing');
assert(visualRuntimeSource.includes('buildVisualContract(classId: V03ClassId'), 'Cocos visual runtime must build from visual contract data');
assert(visualRuntimeSource.includes('V03_REQUIRED_GLOBAL_LIGHT_LAYERS'), 'Cocos visual runtime must consume global light layer contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_HERO_GEAR'), 'Cocos visual runtime must consume hero gear contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_MATERIAL_BLEND_LAYERS'), 'Cocos visual runtime must consume material blend layer contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PAINTERLY_CARD_LAYERS'), 'Cocos visual runtime must consume painterly card layer contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_HERO_SKIN_SPRITES'), 'Cocos visual runtime must consume hero skin sprite contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_HERO_UNIT_SPRITES'), 'Cocos visual runtime must consume hero unit sprite contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_ZOMBIE_CARD_SPRITES'), 'Cocos visual runtime must consume zombie card sprite contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_SKILL_CARD_SPRITES'), 'Cocos visual runtime must consume skill card sprite contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_OBJECT_RIM_LAYERS'), 'Cocos visual runtime must consume object rim layer contract');
assert(visualRuntimeSource.includes('V03_ZOMBIE_VARIANTS'), 'Cocos visual runtime must consume zombie variant contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_UNIT_DECALS'), 'Cocos visual runtime must consume unit decal contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_GROUND_LAYERS'), 'Cocos visual runtime must consume prop ground layer contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_WEAR_DECALS'), 'Cocos visual runtime must consume prop wear decal contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_SHAPE_BLOCKS'), 'Cocos visual runtime must consume prop shape block contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_BREAK_SHAPES'), 'Cocos visual runtime must consume prop break shape contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_PROP_COVER_SPRITES'), 'Cocos visual runtime must consume prop cover sprite contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_GROUND_WASH_LAYERS'), 'Cocos visual runtime must consume ground wash layer contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_SAFE_ZONE_LAYERS'), 'Cocos visual runtime must consume safe zone layer contract');
assert(visualRuntimeSource.includes('V03_REQUIRED_FX_LAYERS'), 'Cocos visual runtime must consume FX layer contract');
assert(visualRuntimeSource.includes('heroGear'), 'Cocos visual runtime must report hero gear stats');
assert(visualRuntimeSource.includes('zombieVariants'), 'Cocos visual runtime must report zombie variant stats');
assert(visualRuntimeSource.includes('unitDecals'), 'Cocos visual runtime must report unit decal stats');
assert(visualRuntimeSource.includes('propGroundLayers'), 'Cocos visual runtime must report prop ground layer stats');
assert(visualRuntimeSource.includes('propWearDecals'), 'Cocos visual runtime must report prop wear decal stats');
assert(visualRuntimeSource.includes('propShapeBlocks'), 'Cocos visual runtime must report prop shape block stats');
assert(visualRuntimeSource.includes('propBreakShapes'), 'Cocos visual runtime must report prop break shape stats');
assert(visualRuntimeSource.includes('propCoverSprites'), 'Cocos visual runtime must report prop cover sprite stats');
assert(visualRuntimeSource.includes('groundWashLayers'), 'Cocos visual runtime must report ground wash layer stats');
assert(visualRuntimeSource.includes('safeZoneLayers'), 'Cocos visual runtime must report safe zone layer stats');
assert(visualRuntimeSource.includes('globalLightLayers'), 'Cocos visual runtime must report global light layer stats');
assert(visualRuntimeSource.includes('objectRimLayers'), 'Cocos visual runtime must report object rim layer stats');
assert(visualRuntimeSource.includes('materialBlendLayers'), 'Cocos visual runtime must report material blend layer stats');
assert(visualRuntimeSource.includes('painterlyCardLayers'), 'Cocos visual runtime must report painterly card layer stats');
assert(visualRuntimeSource.includes('heroSkinSprites'), 'Cocos visual runtime must report hero skin sprite stats');
assert(visualRuntimeSource.includes('heroUnitSprites'), 'Cocos visual runtime must report hero unit sprite stats');
assert(visualRuntimeSource.includes('zombieCardSprites'), 'Cocos visual runtime must report zombie card sprite stats');
assert(visualRuntimeSource.includes('skillCardSprites'), 'Cocos visual runtime must report skill card sprite stats');
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
['prop-jagged-cap', 'prop-missing-corner', 'prop-broken-hood', 'prop-chipped-side'].forEach((shape) => {
  assert(visualContractSource.includes(shape), `Visual contract must include prop break shape ${shape}`);
  assert(visualContractDoc.includes(shape), `Visual contract doc must include prop break shape ${shape}`);
});
['prop-cover-wreck', 'prop-cover-wall', 'prop-cover-crate', 'prop-cover-barrel', 'prop-cover-tires', 'prop-cover-debris'].forEach((sprite) => {
  assert(visualContractSource.includes(sprite), `Visual contract must include prop cover sprite ${sprite}`);
  assert(visualContractDoc.includes(sprite), `Visual contract doc must include prop cover sprite ${sprite}`);
});
['ground-wash-combat-asphalt', 'ground-wash-road-dust', 'ground-wash-rust-edge'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include ground wash layer ${layer}`);
  assert(visualContractDoc.includes(layer), `Visual contract doc must include ground wash layer ${layer}`);
});
['safe-zone-painterly-haze', 'safe-zone-painterly-edge'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include safe zone layer ${layer}`);
  assert(visualContractDoc.includes(layer), `Visual contract doc must include safe zone layer ${layer}`);
});
['stage-warm-focus', 'stage-cool-depth', 'stage-rim-light', 'stage-edge-darkening', 'stage-diagonal-shadow'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include global light layer ${layer}`);
  assert(visualContractDoc.includes(layer), `Visual contract doc must include global light layer ${layer}`);
});
['object-warm-rim', 'object-cool-rim', 'object-dark-side', 'object-weapon-rim', 'object-head-rim'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include object rim layer ${layer}`);
  assert(visualContractDoc.includes(layer), `Visual contract doc must include object rim layer ${layer}`);
});
['material-warm-blend', 'material-cool-blend', 'material-dark-blend', 'material-prop-blend', 'material-unit-blend'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include material blend layer ${layer}`);
  assert(visualContractDoc.includes(layer), `Visual contract doc must include material blend layer ${layer}`);
});
['hero-card', 'rival-card', 'zombie-variant-card', 'skill-fx-card', 'hit-feedback-card'].forEach((layer) => {
  assert(visualContractSource.includes(layer), `Visual contract must include painterly card layer ${layer}`);
  assert(visualContractDoc.includes(layer), `Visual contract doc must include painterly card layer ${layer}`);
});
[
  'class-skin-guardian-0',
  'class-skin-guardian-1',
  'class-skin-guardian-2',
  'class-skin-tech-0',
  'class-skin-tech-1',
  'class-skin-tech-2',
  'class-skin-ranger-0',
  'class-skin-ranger-1',
  'class-skin-ranger-2'
].forEach((sprite) => {
  assert(visualContractSource.includes(sprite), `Visual contract must include hero skin sprite ${sprite}`);
  assert(visualContractDoc.includes(sprite), `Visual contract doc must include hero skin sprite ${sprite}`);
});
[
  'hero-guardian-0-isometric',
  'hero-guardian-0-attack-isometric',
  'hero-guardian-1-isometric',
  'hero-guardian-1-attack-isometric',
  'hero-guardian-2-isometric',
  'hero-guardian-2-attack-isometric',
  'hero-tech-0-isometric',
  'hero-tech-0-attack-isometric',
  'hero-tech-1-isometric',
  'hero-tech-1-attack-isometric',
  'hero-tech-2-isometric',
  'hero-tech-2-attack-isometric',
  'hero-ranger-0-isometric',
  'hero-ranger-0-attack-isometric',
  'hero-ranger-1-isometric',
  'hero-ranger-1-attack-isometric',
  'hero-ranger-2-isometric',
  'hero-ranger-2-attack-isometric'
].forEach((sprite) => {
  assert(visualContractSource.includes(sprite), `Visual contract must include hero unit sprite ${sprite}`);
  assert(visualContractDoc.includes(sprite), `Visual contract doc must include hero unit sprite ${sprite}`);
});
['zombie-card-brute', 'zombie-card-brute-hit', 'zombie-card-brute-walk', 'zombie-card-crawler', 'zombie-card-crawler-hit', 'zombie-card-crawler-walk', 'zombie-card-hooded', 'zombie-card-hooded-hit', 'zombie-card-hooded-walk'].forEach((sprite) => {
  assert(visualContractSource.includes(sprite), `Visual contract must include zombie card sprite ${sprite}`);
  assert(visualContractDoc.includes(sprite), `Visual contract doc must include zombie card sprite ${sprite}`);
});
['skill-card-arc', 'skill-card-boom', 'skill-card-fan'].forEach((sprite) => {
  assert(visualContractSource.includes(sprite), `Visual contract must include skill card sprite ${sprite}`);
  assert(visualContractDoc.includes(sprite), `Visual contract doc must include skill card sprite ${sprite}`);
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
['V03SceneBootstrap', 'V03BattleDirector', 'V03MapRuntime', 'V03ContactShadowRuntime', 'V03VisualRuntime', 'V03ArtSpriteRuntime'].forEach((component) => {
  assert(firstPlayableChecklist.componentBindings.some((binding) => binding.component === component), `First playable checklist must bind ${component}`);
});
['Guardian.prefab', 'TechEngineer.prefab', 'Ranger.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.hero.some((item) => item.endsWith(prefab)), `First playable checklist must include hero prefab ${prefab}`);
});
['ClassSkinGuardian0.prefab', 'ClassSkinGuardian1.prefab', 'ClassSkinGuardian2.prefab', 'ClassSkinTech0.prefab', 'ClassSkinTech1.prefab', 'ClassSkinTech2.prefab', 'ClassSkinRanger0.prefab', 'ClassSkinRanger1.prefab', 'ClassSkinRanger2.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.hero.some((item) => item.endsWith(prefab)), `First playable checklist must include hero skin prefab ${prefab}`);
});
['Brute.prefab', 'Crawler.prefab', 'Hooded.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.zombie.some((item) => item.endsWith(prefab)), `First playable checklist must include zombie prefab ${prefab}`);
});
['ZombieCardBrute.prefab', 'ZombieCardCrawler.prefab', 'ZombieCardHooded.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.zombie.some((item) => item.endsWith(prefab)), `First playable checklist must include zombie card prefab ${prefab}`);
});
['FanBulletCard.prefab', 'FanImpactMark.prefab', 'BoomShockRing.prefab', 'BoomDebrisCard.prefab', 'ArcBranchLink.prefab', 'ArcNodeRing.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.fx.some((item) => item.endsWith(prefab)), `First playable checklist must include FX prefab ${prefab}`);
});
['SkillCardArc.prefab', 'SkillCardBoom.prefab', 'SkillCardFan.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.fx.some((item) => item.endsWith(prefab)), `First playable checklist must include skill card prefab ${prefab}`);
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
['PropJaggedCap.prefab', 'PropMissingCorner.prefab', 'PropBrokenHood.prefab', 'PropChippedSide.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include map break prefab ${prefab}`);
});
['PropCoverWreck.prefab', 'PropCoverWall.prefab', 'PropCoverCrate.prefab', 'PropCoverBarrel.prefab', 'PropCoverTires.prefab', 'PropCoverDebris.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include map cover sprite prefab ${prefab}`);
});
['GroundWashCombatAsphalt.prefab', 'GroundWashRoadDust.prefab', 'GroundWashRustEdge.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include ground wash prefab ${prefab}`);
});
['SafeZonePainterlyHaze.prefab', 'SafeZonePainterlyEdge.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include safe zone prefab ${prefab}`);
});
['StageWarmFocus.prefab', 'StageCoolDepth.prefab', 'StageRimLight.prefab', 'StageEdgeDarkening.prefab', 'StageDiagonalShadow.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include global light prefab ${prefab}`);
});
['ObjectWarmRim.prefab', 'ObjectCoolRim.prefab', 'ObjectDarkSide.prefab', 'ObjectWeaponRim.prefab', 'ObjectHeadRim.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include object rim prefab ${prefab}`);
});
['MaterialWarmBlend.prefab', 'MaterialCoolBlend.prefab', 'MaterialDarkBlend.prefab', 'MaterialPropBlend.prefab', 'MaterialUnitBlend.prefab'].forEach((prefab) => {
  assert(firstPlayableChecklist.prefabs.map.some((item) => item.endsWith(prefab)), `First playable checklist must include material blend prefab ${prefab}`);
});
['heroGear', 'zombieVariants', 'unitDecals', 'propGroundLayers', 'propWearDecals', 'propShapeBlocks', 'propBreakShapes', 'propCoverSprites', 'groundWashLayers', 'safeZoneLayers', 'globalLightLayers', 'objectRimLayers', 'materialBlendLayers', 'painterlyCardLayers', 'heroSkinSprites', 'zombieCardSprites', 'skillCardSprites', 'fxLayers', 'reviewScreenshots'].forEach((coverage) => {
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
