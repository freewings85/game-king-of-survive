export type V03ClassId = 'guardian' | 'engineer' | 'ranger';
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
    body: '#2f4050',
    accent: '#f0b35a',
    emissive: '#ffd166',
    moveSpeed: 112,
    contactDamage: 0.78,
    skins: ['#2f4050', '#6b4b3e', '#243447']
  },
  engineer: {
    id: 'engineer',
    name: 'Engineer',
    mark: 'E',
    body: '#303644',
    accent: '#44d7b6',
    emissive: '#5fffe1',
    moveSpeed: 104,
    contactDamage: 0.88,
    skins: ['#303644', '#2f5f56', '#503f58']
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    mark: 'R',
    body: '#2e3b2f',
    accent: '#ff6b6b',
    emissive: '#ff8f70',
    moveSpeed: 126,
    contactDamage: 1,
    skins: ['#2e3b2f', '#5b3a33', '#283746']
  }
};

export const V03_SKILLS: Record<V03SkillId, V03SkillDef> = {
  arc: {
    id: 'arc',
    name: 'ARC',
    color: '#62e5ff',
    pulse: '#c9fbff',
    range: 5.8,
    damage: 16,
    targets: 3,
    spread: 0.18
  },
  boom: {
    id: 'boom',
    name: 'BOOM',
    color: '#ffbd58',
    pulse: '#fff0a6',
    range: 4.8,
    damage: 28,
    targets: 1,
    spread: 0.42
  },
  fan: {
    id: 'fan',
    name: 'FAN',
    color: '#c084fc',
    pulse: '#f0d6ff',
    range: 5.2,
    damage: 11,
    targets: 5,
    spread: 0.75
  }
};

export const V03_TUNING = {
  playerHp: 120,
  fireCooldown: 0.44,
  pickupMagnetRange: 2.4,
  pickupCollectRange: 0.42,
  levelXp: [6, 14, 24, 38],
  safeZoneStartRadius: 11.5,
  safeZoneShrinkPerSecond: 0.015
};
