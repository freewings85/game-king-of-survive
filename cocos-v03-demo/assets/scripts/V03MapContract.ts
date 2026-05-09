export type V03TileId = 'ash' | 'road' | 'cracked-road' | 'dead-grass';
export type V03PropId = 'wreck-car' | 'concrete-wall' | 'supply-crate' | 'burn-barrel' | 'roadblock';
export type V03PinId = 'player-spawn' | 'zombie-entry' | 'reward-point' | 'rival-spawn';

export interface V03MapEntity {
  id: string;
  type: V03PropId | V03PinId;
  x: number;
  y: number;
  rotation?: number;
}

export interface V03MapData {
  schemaVersion: 'v03-map-1';
  visualProfile: 'zombie-br-v03';
  gameplayProfile: 'zombie-battle-royale';
  cols: number;
  rows: number;
  tileSize: number;
  tiles: V03TileId[];
  entities: V03MapEntity[];
}

export function getEntryPins(map: V03MapData): V03MapEntity[] {
  return map.entities.filter((entity) => entity.type === 'zombie-entry');
}

export function getRewardPins(map: V03MapData): V03MapEntity[] {
  return map.entities.filter((entity) => entity.type === 'reward-point');
}

export function getPlayerSpawn(map: V03MapData): V03MapEntity | undefined {
  return map.entities.find((entity) => entity.type === 'player-spawn');
}

export function getBlockingProps(map: V03MapData): V03MapEntity[] {
  return map.entities.filter((entity) =>
    entity.type === 'wreck-car' ||
    entity.type === 'concrete-wall' ||
    entity.type === 'supply-crate' ||
    entity.type === 'burn-barrel' ||
    entity.type === 'roadblock'
  );
}
