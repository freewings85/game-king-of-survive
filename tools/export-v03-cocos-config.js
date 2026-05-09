const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'cocos-v03-demo/assets/resources/config');

function loadBrowserGlobal(filePath, globalName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = {
    window: {},
    console
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
  if (!context.window[globalName]) {
    throw new Error(`${globalName} was not exported by ${filePath}`);
  }
  return context.window[globalName];
}

function numberToHex(value) {
  if (typeof value !== 'number') {
    return value;
  }
  return `#${value.toString(16).padStart(6, '0')}`;
}

function normalizeRuntimeConfig(config) {
  const classes = {};
  Object.entries(config.classDefs).forEach(([id, def]) => {
    classes[id] = {
      ...def,
      id,
      body: numberToHex(def.body),
      accent: numberToHex(def.accent),
      emissive: numberToHex(def.emissive)
    };
  });

  const skills = {};
  Object.entries(config.skillDefs).forEach(([id, def]) => {
    skills[id] = {
      ...def,
      id,
      name: id.toUpperCase(),
      color: numberToHex(def.color)
    };
  });

  return {
    schemaVersion: 'v03-runtime-config-1',
    source: 'frontend/src/v03-runtime-config.js',
    classes,
    skills,
    tuning: config.demoTuning
  };
}

function buildStandardMap(contract) {
  const map = contract.standardizeMap(contract.createMap(26, 22));
  const checks = contract.getQualityChecks(map);
  return {
    schemaVersion: map.schemaVersion,
    source: 'frontend/src/map-contract.js',
    visualProfile: map.visualProfile,
    gameplayProfile: map.gameplayProfile,
    tileSize: map.tileSize,
    cols: map.cols,
    rows: map.rows,
    width: map.width,
    height: map.height,
    tiles: map.tiles,
    structures: map.structures,
    spawnPoints: map.spawnPoints,
    zombieEntries: map.zombieEntries,
    rewardPoints: map.rewardPoints,
    rivalPoints: map.rivalPoints,
    bossPoints: map.bossPoints,
    stormCenter: map.stormCenter,
    qualityChecks: checks
  };
}

function writeJson(fileName, value) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

const runtimeConfig = loadBrowserGlobal(
  path.join(repoRoot, 'frontend/src/v03-runtime-config.js'),
  'KOS_V03_CONFIG'
);
const mapContract = loadBrowserGlobal(
  path.join(repoRoot, 'frontend/src/map-contract.js'),
  'KOS_MAP_CONTRACT'
);

writeJson('v03-runtime-config.json', normalizeRuntimeConfig(runtimeConfig));
writeJson('v03-standard-map.json', buildStandardMap(mapContract));

console.log('Exported Cocos V03 config bridge.');
