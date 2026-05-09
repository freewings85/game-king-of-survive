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
