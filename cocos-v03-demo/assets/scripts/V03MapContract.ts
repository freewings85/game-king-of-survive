export type V03TileId = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type V03PropKind =
  'wreck_car' |
  'crate' |
  'barricade' |
  'debris' |
  'fence' |
  'wall' |
  'building' |
  'gas_station' |
  'barrel' |
  'tires' |
  'blood_mark';

export interface V03MapPoint {
  x: number;
  y: number;
  kind?: string;
  name?: string;
  tier?: string;
  xp?: number;
}

export interface V03Structure {
  kind: V03PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  gameplay: string;
}

export interface V03MapData {
  schemaVersion: 'v03-map-1';
  visualProfile: 'zombie-br-v03';
  gameplayProfile: {
    mode: 'zombie-battle-royale';
    earlyLoopSeconds: number;
    camera: string;
    renderProfile: string;
  };
  cols: number;
  rows: number;
  tileSize: number;
  width: number;
  height: number;
  tiles: V03TileId[];
  structures: V03Structure[];
  spawnPoints: V03MapPoint[];
  zombieEntries: V03MapPoint[];
  rewardPoints: V03MapPoint[];
  rivalPoints: V03MapPoint[];
  bossPoints: V03MapPoint[];
  stormCenter: V03MapPoint;
}

export function getEntryPins(map: V03MapData): V03MapPoint[] {
  return map.zombieEntries;
}

export function getRewardPins(map: V03MapData): V03MapPoint[] {
  return map.rewardPoints;
}

export function getPlayerSpawn(map: V03MapData): V03MapPoint | undefined {
  return map.spawnPoints[0];
}

export function getBlockingProps(map: V03MapData): V03Structure[] {
  return map.structures.filter((structure) =>
    structure.gameplay === 'cover' ||
    structure.gameplay === 'cover_loot' ||
    structure.gameplay === 'hard_blocker' ||
    structure.gameplay === 'soft_blocker'
  );
}
