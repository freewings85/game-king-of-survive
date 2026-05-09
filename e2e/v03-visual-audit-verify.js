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

console.log(JSON.stringify({
  reference: referencePath,
  hasCurrentScreenshot: true,
  hasGapAssessment: true,
  hasNextIteration: true
}, null, 2));
