import { JsonAsset, resources } from 'cc';
import type { V03ClassId, V03SkillId } from './V03Config';
import type { V03MapData } from './V03MapContract';

export interface V03RuntimeJson {
  schemaVersion: 'v03-runtime-config-1';
  source: string;
  classes: Record<V03ClassId, {
    id: V03ClassId;
    name: string;
    role: string;
    mark: string;
    body: string;
    accent: string;
    emissive: string;
    skins: string[];
    moveSpeed: number;
    contactDamage: number;
  }>;
  skills: Record<V03SkillId, {
    id: V03SkillId;
    name: string;
    color: string;
    pulse: number;
    spread: number;
    damage: number;
    targets: number;
    range: number;
  }>;
  tuning: {
    player: {
      hp: number;
      rangerFireCooldown: number;
      defaultFireCooldown: number;
      hitCooldown: number;
    };
    zombie: {
      fastHp: number;
      normalHp: number;
      levelHpGrowth: number;
      fastSpeed: number;
      normalSpeed: number;
      respawnRadiusX: number;
      respawnRadiusZ: number;
    };
    progression: {
      killXp: number;
      pickupXp: number;
      levelHealOnKill: number;
      levelHealOnPickup: number;
      aliveDropPerKills: number;
      minAlive: number;
    };
  };
}

export interface V03BridgeData {
  runtime: V03RuntimeJson;
  map: V03MapData;
}

function loadJsonAsset<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    resources.load(path, JsonAsset, (error, asset) => {
      if (error || !asset) {
        reject(error || new Error(`Missing JSON asset: ${path}`));
        return;
      }
      resolve(asset.json as T);
    });
  });
}

export async function loadV03BridgeData(): Promise<V03BridgeData> {
  const [runtime, map] = await Promise.all([
    loadJsonAsset<V03RuntimeJson>('config/v03-runtime-config'),
    loadJsonAsset<V03MapData>('config/v03-standard-map')
  ]);
  validateV03BridgeData(runtime, map);
  return { runtime, map };
}

export function validateV03BridgeData(runtime: V03RuntimeJson, map: V03MapData): void {
  const classIds = Object.keys(runtime.classes).sort().join(',');
  const skillIds = Object.keys(runtime.skills).sort().join(',');
  if (runtime.schemaVersion !== 'v03-runtime-config-1') {
    throw new Error(`Unexpected runtime schema: ${runtime.schemaVersion}`);
  }
  if (classIds !== 'guardian,ranger,tech') {
    throw new Error(`Unexpected class ids: ${classIds}`);
  }
  if (skillIds !== 'arc,boom,fan') {
    throw new Error(`Unexpected skill ids: ${skillIds}`);
  }
  if (map.schemaVersion !== 'v03-map-1' || map.visualProfile !== 'zombie-br-v03') {
    throw new Error(`Unexpected map profile: ${map.schemaVersion}/${map.visualProfile}`);
  }
  if (map.cols !== 26 || map.rows !== 22 || map.tiles.length !== 572) {
    throw new Error(`Unexpected V03 arena size: ${map.cols}x${map.rows}`);
  }
  if (map.structures.length < 20 || map.zombieEntries.length < 4 || map.rewardPoints.length < 8) {
    throw new Error('V03 map does not meet the combat layout gate');
  }
}
