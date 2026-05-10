const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'frontend/engine-demo/assets');
const artRoot = path.join(repoRoot, 'cocos-v03-demo/assets/resources/art/v03');
const manifestPath = path.join(repoRoot, 'cocos-v03-demo/assets/resources/config/v03-art-assets.json');

const groups = {
  portraits: [
    'class-focus-guardian.png',
    'class-focus-ranger.png',
    'class-focus-tech.png',
    'class-skin-guardian-0.png',
    'class-skin-guardian-1.png',
    'class-skin-guardian-2.png',
    'class-skin-tech-0.png',
    'class-skin-tech-1.png',
    'class-skin-tech-2.png',
    'class-skin-ranger-0.png',
    'class-skin-ranger-1.png',
    'class-skin-ranger-2.png'
  ],
  units: [
    'hero-ranger-2-isometric.png'
  ],
  zombies: [
    'zombie-card-brute.png',
    'zombie-card-crawler.png',
    'zombie-card-hooded.png'
  ],
  skills: [
    'skill-card-arc.png',
    'skill-card-boom.png',
    'skill-card-fan.png'
  ],
  props: [
    'prop-cover-wreck.png',
    'prop-cover-wall.png',
    'prop-cover-crate.png',
    'prop-cover-barrel.png',
    'prop-cover-tires.png',
    'prop-cover-debris.png'
  ]
};

function copyAsset(group, fileName) {
  const source = path.join(sourceRoot, group, fileName);
  const targetDir = path.join(artRoot, group);
  const target = path.join(targetDir, fileName);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing source asset: ${source}`);
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(source, target);
  const resourcePath = `art/v03/${group}/${fileName.replace(/\.png$/, '')}`;
  return {
    id: fileName.replace(/\.png$/, ''),
    group,
    source: path.relative(repoRoot, source).replace(/\\/g, '/'),
    resourcePath,
    file: path.relative(repoRoot, target).replace(/\\/g, '/')
  };
}

const assets = Object.entries(groups).flatMap(([group, files]) => files.map((fileName) => copyAsset(group, fileName)));
const manifest = {
  schemaVersion: 'v03-art-assets-1',
  source: 'frontend/engine-demo/assets',
  target: 'cocos-v03-demo/assets/resources/art/v03',
  reference: 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png',
  assets,
  counts: Object.fromEntries(Object.keys(groups).map((group) => [
    group,
    assets.filter((asset) => asset.group === group).length
  ]))
};

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Exported ${assets.length} Cocos V03 art assets.`);
