const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const logPath = path.join(repoRoot, 'frontend/docs/v03-visual-iteration-log.md');
const referencePath = 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png';
const text = fs.readFileSync(logPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(text.includes(referencePath), 'Visual iteration log must name the V03 reference image');
assert(text.includes('can_delete/v03-gate/engine-demo-mobile.png'), 'Visual iteration log must cite the current engine demo screenshot');
assert(text.includes('What is still far from the reference'), 'Visual iteration log must record remaining visual gaps');
assert(text.includes('Current visual distance'), 'Visual iteration log must include a current distance assessment');
assert(text.includes('Next iteration direction'), 'Visual iteration log must define the next visual iteration');
assert(text.includes('Art quality: far'), 'Visual iteration log must explicitly acknowledge the current art-quality gap');
assert(text.includes('Every meaningful visual iteration must record this comparison'), 'Visual iteration log must make comparison discipline explicit');
assert(text.includes('In-match painterly style sync'), 'Visual iteration log must record the latest visual iteration focus');
assert(text.includes('Mobile combat focus frame'), 'Visual iteration log must record the latest mobile composition pass');
assert(text.includes('Class focus sprite asset pass'), 'Visual iteration log must record the latest sprite asset pass');
assert(text.includes('In-match hero sprite card pass'), 'Visual iteration log must record the latest in-match sprite pass');
assert(text.includes('Zombie sprite card pass'), 'Visual iteration log must record the latest zombie sprite pass');
assert(text.includes('Skill sprite card pass'), 'Visual iteration log must record the latest skill sprite pass');
assert(text.includes('Class skin sprite variant pass'), 'Visual iteration log must record the latest skin sprite pass');
assert(text.includes('Cocos sprite asset contract sync'), 'Visual iteration log must record the latest Cocos sprite contract sync');
assert(text.includes('Ranger unit sprite separation pass'), 'Visual iteration log must record the latest Ranger unit sprite pass');
assert(text.includes('Zombie sprite body cleanup pass'), 'Visual iteration log must record the latest zombie sprite body cleanup pass');
assert(text.includes('Compact combat focus pass'), 'Visual iteration log must record the latest compact combat focus pass');
assert(text.includes('Compact class dock pass'), 'Visual iteration log must record the latest compact class dock pass');
assert(text.includes('Prop sprite cover pass'), 'Visual iteration log must record the latest prop sprite cover pass');
assert(text.includes('Cocos prop cover sprite contract sync'), 'Visual iteration log must record the latest Cocos prop cover contract sync');
assert(text.includes('Prop cover bitmap asset pass'), 'Visual iteration log must record the latest prop cover bitmap asset pass');
assert(text.includes('Prop sprite body cleanup pass'), 'Visual iteration log must record the latest prop sprite body cleanup pass');
assert(text.includes('Secondary prop bitmap asset pass'), 'Visual iteration log must record the latest secondary prop bitmap asset pass');
assert(text.includes('Painterly ground integration pass'), 'Visual iteration log must record the latest painterly ground integration pass');
assert(text.includes('Painterly safe-zone edge pass'), 'Visual iteration log must record the latest painterly safe-zone edge pass');
assert(text.includes('Cocos route engine proof pass'), 'Visual iteration log must record the latest engine route proof pass');
assert(text.includes('Cocos engine proof manifest sync'), 'Visual iteration log must record the latest Cocos engine proof manifest sync');
assert(text.includes('Cocos runtime scene bootstrap pass'), 'Visual iteration log must record the latest Cocos runtime scene bootstrap pass');
assert(text.includes('Cocos V03 art asset bridge pass'), 'Visual iteration log must record the latest Cocos art asset bridge pass');
assert(text.includes('Cocos sprite runtime adapter pass'), 'Visual iteration log must record the latest Cocos sprite runtime adapter pass');
assert(text.includes('Cocos map-bound sprite placement pass'), 'Visual iteration log must record the latest Cocos map-bound sprite placement pass');
assert(text.includes('Cocos multi-instance sprite depth pass'), 'Visual iteration log must record the latest Cocos multi-instance sprite depth pass');
assert(text.includes('Cocos contact shadow runtime pass'), 'Visual iteration log must record the latest Cocos contact shadow runtime pass');
assert(text.includes('Full class unit sprite pass'), 'Visual iteration log must record the latest full class unit sprite pass');
assert(text.includes('Portrait-backed unit sprite repair pass'), 'Visual iteration log must record the latest portrait-backed unit sprite repair pass');

console.log(JSON.stringify({
  reference: referencePath,
  hasCurrentScreenshot: true,
  hasGapAssessment: true,
  hasNextIteration: true
}, null, 2));
