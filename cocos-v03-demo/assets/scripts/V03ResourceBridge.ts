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

export interface V03ArtAssetEntry {
  id: string;
  group: 'portraits' | 'units' | 'zombies' | 'skills' | 'props';
  source: string;
  resourcePath: string;
  spriteFramePath?: string;
  file: string;
}

export interface V03ArtAssetManifest {
  schemaVersion: 'v03-art-assets-1';
  source: string;
  target: string;
  reference: string;
  assets: V03ArtAssetEntry[];
  counts: Record<V03ArtAssetEntry['group'], number>;
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

export async function loadV03ArtAssetManifest(): Promise<V03ArtAssetManifest> {
  const manifest = await loadJsonAsset<V03ArtAssetManifest>('config/v03-art-assets');
  validateV03ArtAssetManifest(manifest);
  return manifest;
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

export function validateV03ArtAssetManifest(manifest: V03ArtAssetManifest): void {
  if (manifest.schemaVersion !== 'v03-art-assets-1') {
    throw new Error(`Unexpected art manifest schema: ${manifest.schemaVersion}`);
  }
  if (manifest.reference !== 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png') {
    throw new Error(`Unexpected art manifest reference: ${manifest.reference}`);
  }
  const requiredIds = [
    'hero-ranger-2-isometric',
    'zombie-card-brute',
    'zombie-card-crawler',
    'zombie-card-hooded',
    'skill-card-arc',
    'skill-card-boom',
    'skill-card-fan',
    'prop-cover-wreck',
    'prop-cover-wall',
    'prop-cover-crate'
  ];
  requiredIds.forEach((id) => {
    if (!manifest.assets.some((asset) => asset.id === id && asset.resourcePath.startsWith('art/v03/'))) {
      throw new Error(`Missing V03 art asset: ${id}`);
    }
  });
  if (manifest.counts.portraits < 12 || manifest.counts.props < 6 || manifest.counts.skills < 3 || manifest.counts.zombies < 3 || manifest.counts.units < 1) {
    throw new Error('V03 art manifest does not cover the required visual asset groups');
  }
}
