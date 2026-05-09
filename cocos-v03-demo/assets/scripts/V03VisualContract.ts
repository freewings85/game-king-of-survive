export const V03_HERO_CLASSES = ['guardian', 'tech', 'ranger'] as const;

export const V03_REQUIRED_HERO_GEAR = {
  guardian: ['heavy-shield', 'shield-core', 'wide-pauldrons'],
  tech: ['coil-device', 'backpack-screen', 'dish-node', 'antenna'],
  ranger: ['hood', 'long-rifle', 'scope', 'cape-tip', 'cape-stripe']
} as const;

export const V03_ZOMBIE_VARIANTS = ['brute', 'crawler', 'hooded'] as const;

export const V03_REQUIRED_UNIT_DECALS = [
  'face-highlight',
  'armor-edge',
  'class-gear-mark',
  'wound-patch',
  'rot-patch',
  'torn-cloth-panel'
] as const;

export const V03_REQUIRED_PROP_GROUND_LAYERS = [
  'prop-oil-stain',
  'prop-rust-stain',
  'prop-rubble-chip',
  'prop-shadow-blob'
] as const;

export const V03_REQUIRED_PROP_WEAR_DECALS = [
  'prop-edge-highlight',
  'prop-dark-panel',
  'prop-scratch-stack',
  'prop-glass-card',
  'prop-hazard-band'
] as const;

export const V03_REQUIRED_PROP_SHAPE_BLOCKS = [
  'prop-light-block',
  'prop-shadow-block',
  'prop-cool-rim',
  'prop-rim-frame'
] as const;

export const V03_REQUIRED_PROP_BREAK_SHAPES = [
  'prop-jagged-cap',
  'prop-missing-corner',
  'prop-broken-hood',
  'prop-chipped-side'
] as const;

export const V03_REQUIRED_PROP_COVER_SPRITES = [
  'prop-cover-wreck',
  'prop-cover-wall',
  'prop-cover-crate'
] as const;

export const V03_REQUIRED_GLOBAL_LIGHT_LAYERS = [
  'stage-warm-focus',
  'stage-cool-depth',
  'stage-rim-light',
  'stage-edge-darkening',
  'stage-diagonal-shadow'
] as const;

export const V03_REQUIRED_OBJECT_RIM_LAYERS = [
  'object-warm-rim',
  'object-cool-rim',
  'object-dark-side',
  'object-weapon-rim',
  'object-head-rim'
] as const;

export const V03_REQUIRED_MATERIAL_BLEND_LAYERS = [
  'material-warm-blend',
  'material-cool-blend',
  'material-dark-blend',
  'material-prop-blend',
  'material-unit-blend'
] as const;

export const V03_REQUIRED_PAINTERLY_CARD_LAYERS = [
  'hero-card',
  'rival-card',
  'zombie-variant-card',
  'skill-fx-card',
  'hit-feedback-card'
] as const;

export const V03_REQUIRED_HERO_SKIN_SPRITES = [
  'class-skin-guardian-0',
  'class-skin-guardian-1',
  'class-skin-guardian-2',
  'class-skin-tech-0',
  'class-skin-tech-1',
  'class-skin-tech-2',
  'class-skin-ranger-0',
  'class-skin-ranger-1',
  'class-skin-ranger-2'
] as const;

export const V03_REQUIRED_ZOMBIE_CARD_SPRITES = [
  'zombie-card-brute',
  'zombie-card-crawler',
  'zombie-card-hooded'
] as const;

export const V03_REQUIRED_SKILL_CARD_SPRITES = [
  'skill-card-arc',
  'skill-card-boom',
  'skill-card-fan'
] as const;

export const V03_REQUIRED_FX_LAYERS = {
  fan: ['muzzle-card', 'bullet-card', 'warm-trail', 'impact-card'],
  boom: ['muzzle-card', 'explosion-core', 'shock-ring', 'debris-card', 'smoke-card'],
  arc: ['muzzle-card', 'branch-link', 'glow-link', 'node-ring', 'impact-card']
} as const;

export const V03_VISUAL_REVIEW_SCREENSHOTS = [
  'engine-demo-landscape-phone.png',
  'engine-demo-mobile.png',
  'engine-demo-skill-fan.png',
  'engine-demo-skill-boom.png',
  'engine-demo-skill-arc.png'
] as const;
