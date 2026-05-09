export type V03ClassId = 'guardian' | 'tech' | 'ranger';
export type V03SkillId = 'arc' | 'boom' | 'fan';

export interface V03ClassDef {
  id: V03ClassId;
  name: string;
  mark: string;
  body: string;
  accent: string;
  emissive: string;
  moveSpeed: number;
  contactDamage: number;
  skins: string[];
}

export interface V03SkillDef {
  id: V03SkillId;
  name: string;
  color: string;
  pulse: string;
  range: number;
  damage: number;
  targets: number;
  spread: number;
}

export const V03_CLASSES: Record<V03ClassId, V03ClassDef> = {
  guardian: {
    id: 'guardian',
    name: 'Guardian',
    mark: 'G',
    body: '#3c3430',
    accent: '#e95b45',
    emissive: '#5a1109',
    moveSpeed: 2.45,
    contactDamage: 5,
    skins: ['#332d2a', '#62645e', '#7d4f58']
  },
  tech: {
    id: 'tech',
    name: 'Tech Engineer',
    mark: 'T',
    body: '#243436',
    accent: '#4ec9ff',
    emissive: '#0d4d66',
    moveSpeed: 2.75,
    contactDamage: 8,
    skins: ['#193743', '#2f6068', '#7b315d']
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    mark: 'R',
    body: '#2e3b2f',
    accent: '#78d66a',
    emissive: '#184a15',
    moveSpeed: 3.1,
    contactDamage: 8,
    skins: ['#314027', '#5a5534', '#283746']
  }
};

export const V03_SKILLS: Record<V03SkillId, V03SkillDef> = {
  arc: {
    id: 'arc',
    name: 'ARC',
    color: '#4ec9ff',
    pulse: 4.5,
    range: 6.2,
    damage: 8,
    targets: 2,
    spread: 0.85
  },
  boom: {
    id: 'boom',
    name: 'BOOM',
    color: '#ff8b3d',
    pulse: 2.4,
    range: 5.4,
    damage: 13,
    targets: 1,
    spread: 1.15
  },
  fan: {
    id: 'fan',
    name: 'FAN',
    color: '#f4c95a',
    pulse: 6,
    range: 5.8,
    damage: 4,
    targets: 5,
    spread: 1.8
  }
};

export const V03_TUNING = {
  playerHp: 100,
  rangerFireCooldown: 0.34,
  defaultFireCooldown: 0.42,
  hitCooldown: 0.42,
  pickupMagnetRange: 2.4,
  pickupCollectRange: 0.42,
  killXp: 10,
  pickupXp: 4,
  levelHealOnKill: 12,
  levelHealOnPickup: 10,
  aliveDropPerKills: 4,
  minAlive: 2,
  safeZoneStartRadius: 11.5,
  safeZoneShrinkPerSecond: 0.015
};
