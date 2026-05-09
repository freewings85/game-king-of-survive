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

console.log(JSON.stringify({
  classes: cocosClassIds,
  skills: cocosSkillIds,
  structures: cocosMap.structures.length,
  zombieEntries: cocosMap.zombieEntries.length,
  rewardPoints: cocosMap.rewardPoints.length,
  rivalPoints: cocosMap.rivalPoints.length,
  qualityOk: cocosMap.qualityChecks.every((check) => check.ok)
}, null, 2));
