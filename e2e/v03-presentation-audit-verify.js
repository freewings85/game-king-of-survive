const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const auditPath = path.join(repoRoot, 'frontend/docs/v03-first-playable-presentation-audit.md');
const packagePath = path.join(repoRoot, 'package.json');
const audit = fs.readFileSync(auditPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredText = [
  'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png',
  'This audit is not a completion claim',
  'Prompt-To-Artifact Checklist',
  'npm run verify:v03',
  'node e2e/v03-contract-verify.js',
  'node e2e/v03-engine-proof-verify.js',
  'node e2e/v03-cocos-bridge-verify.js',
  'node e2e/v03-cocos-scene-assembly-verify.js',
  'node e2e/v03-visual-audit-verify.js',
  'node e2e/v03-presentation-audit-verify.js',
  'cocos-v03-demo/settings/v03-scene-assembly-manifest.json',
  'source-manifest-only',
  'Art quality: far',
  'No real Cocos Creator scene has been opened',
  'No WeChat Mini Game build or device preview exists',
  'procedural geometry',
  'not pixel-level similarity'
];

requiredText.forEach((text) => {
  assert(audit.includes(text), `Presentation audit must include: ${text}`);
});

[
  'can_delete/v03-gate/engine-demo-mobile.png',
  'can_delete/v03-gate/engine-demo-landscape-phone.png',
  'can_delete/v03-gate/engine-demo-class-guardian.png',
  'can_delete/v03-gate/engine-demo-class-tech.png',
  'can_delete/v03-gate/engine-demo-class-ranger.png',
  'can_delete/v03-gate/engine-demo-skill-fan.png',
  'can_delete/v03-gate/engine-demo-skill-boom.png',
  'can_delete/v03-gate/engine-demo-skill-arc.png',
  'can_delete/v03-gate/editor-standard-map.png',
  'can_delete/v03-gate/runtime-contract-map-mobile.png',
  'can_delete/v03-gate/engine-proof-cocos-route.png',
  'can_delete/v03-gate/v03-shell-framework.png'
].forEach((screenshot) => {
  assert(audit.includes(screenshot), `Presentation audit must cite screenshot ${screenshot}`);
});

[
  'modular frontend',
  'Map editor reuses game rendering',
  'Clear class/skin/skill visuals',
  'Wasteland map and prop layer',
  'Painterly ground integration',
  'Prop authored-depth layers',
  'Lighting and material integration',
  'Painterly card depth layer',
  'Zombie/class visual readability',
  'Skills and combat FX',
  'Smooth early combat pacing',
  'Engine route proof',
  'Cocos production path',
  'Visual iteration discipline',
  'Staged rollback points'
].forEach((requirement) => {
  assert(audit.includes(requirement), `Presentation audit must map requirement: ${requirement}`);
});

[
  'activeGearCount >= 5',
  'contractPropCount >= 18',
  'contractTileCount >= 500',
  'groundDetailCount >= 220',
  'propWearCount >= 80',
  'propShapeCount >= 85',
  'propBreakCount >= 80',
  'propSpriteCoverCount >= 18',
  'propSpriteCoverKinds >= 6',
  'propSpriteCoverUsesAsset',
  'propSpriteBodyHiddenCount >= 47',
  'globalLightCount >= 8',
  'objectRimCount >= 60',
  'materialBlendCount >= 70',
  "engineRecommendation === 'cocos-creator-3.x'",
  'groundWashLayerCount >= 3',
  'groundTileBlendCount >= 572',
  'safeZonePainterlyLayerCount >= 2',
  'safeZonePainterlyUsesTexture',
  'painterlyCardCount >= 40',
  'heroPainterlyCardCount >= 2',
  'zombiePainterlyCardCount >= 10',
  'zombiePainterlyUsesSpriteAsset',
  'zombieSpriteBodyHiddenForAll',
  'zombieSpriteBodyHiddenCount >= 240',
  'skillPainterlyCardCount >= 30',
  'skillPainterlyUsesSpriteAsset',
  'activePainterlyClass: ranger',
  'activePainterlySkin: 2',
  'activePainterlySkinColor: #283746',
  'activePainterlyStyle: hood-rifle',
  'activePainterlyUsesSpriteAsset',
  'activePainterlyUsesUnitSpriteAsset',
  'activePainterlyUnitSpriteVariant: ranger-2',
  'combatFocusDisplayed',
  'combatFocusStyle: hood-rifle',
  'combatFocusClassId: ranger',
  'combatFocusSkinVariant: ranger-2',
  'combatFocusUsesSpriteAsset',
  'combatFocusSkillCount: 3',
  'combatFocusRect <= 180x128',
  'classStripRect <= 126x118',
  'classSkinSpriteVariantCount >= 9',
  'activePainterlySkinSpriteVariant: ranger-2',
  'class-review painterly style matching the class showcase styles for Guardian, Tech, and Ranger',
  'classShowcaseDisplayed',
  '3 variant showcase skin thumbnails with 1 active thumbnail',
  'shield-armor',
  'coil-screen',
  'hood-rifle',
  'silhouettePartCount >= 75',
  'zombieDetailPartCount >= 285',
  'zombieVariantCount >= 3',
  'unitDecalCount >= 48',
  'fxCardCount >= 16',
  'shotsFired >= 5',
  'damageDealt >= 80',
  'kills >= 1',
  'xpDropped >= 1'
].forEach((gate) => {
  assert(audit.includes(gate), `Presentation audit must cite gate ${gate}`);
});

const verifyScript = packageJson.scripts && packageJson.scripts['verify:v03'];
assert(verifyScript, 'package.json must define verify:v03');
[
  'node e2e/v03-contract-verify.js',
  'node e2e/v03-cocos-bridge-verify.js',
  'node e2e/v03-cocos-scene-assembly-verify.js',
  'node e2e/v03-visual-audit-verify.js',
  'node e2e/v03-presentation-audit-verify.js'
].forEach((command) => {
  assert(verifyScript.includes(command), `verify:v03 must include ${command}`);
});

console.log(JSON.stringify({
  presentationAudit: true,
  reference: 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png',
  screenshots: 11,
  mappedRequirements: 13,
  gates: 44,
  completionClaim: false
}, null, 2));
