import { _decorator, Component, Node, resources, Sprite, SpriteFrame, Vec3 } from 'cc';
import type { V03MapData, V03MapPoint, V03PropKind, V03Structure } from './V03MapContract';
import type { V03ArtAssetEntry, V03ArtAssetManifest } from './V03ResourceBridge';

const { ccclass, property } = _decorator;

export interface V03ArtSpriteRuntimeStats {
  spriteNodes: number;
  portraits: number;
  units: number;
  zombies: number;
  skills: number;
  props: number;
  mapBoundSprites: number;
}

@ccclass('V03ArtSpriteRuntime')
export class V03ArtSpriteRuntime extends Component {
  @property(Node)
  public actorRoot: Node | null = null;

  @property(Node)
  public fxRoot: Node | null = null;

  @property(Node)
  public propRoot: Node | null = null;

  @property(Node)
  public uiRoot: Node | null = null;

  public readonly stats: V03ArtSpriteRuntimeStats = {
    spriteNodes: 0,
    portraits: 0,
    units: 0,
    zombies: 0,
    skills: 0,
    props: 0,
    mapBoundSprites: 0
  };

  private readonly worldWidth = 12;
  private readonly worldDepth = 10;

  public async buildFromManifest(manifest: V03ArtAssetManifest, map?: V03MapData): Promise<V03ArtSpriteRuntimeStats> {
    this.clearRuntimeNodes();
    this.resetStats();
    await Promise.all(manifest.assets.map((asset, index) => this.addSpriteAsset(asset, index, map)));
    return { ...this.stats };
  }

  private clearRuntimeNodes(): void {
    [this.actorRoot, this.fxRoot, this.propRoot, this.uiRoot].forEach((root) => {
      if (!root) return;
      root.children
        .filter((child) => child.name.startsWith('art-sprite-'))
        .forEach((child) => child.destroy());
    });
  }

  private resetStats(): void {
    this.stats.spriteNodes = 0;
    this.stats.portraits = 0;
    this.stats.units = 0;
    this.stats.zombies = 0;
    this.stats.skills = 0;
    this.stats.props = 0;
    this.stats.mapBoundSprites = 0;
  }

  private async addSpriteAsset(asset: V03ArtAssetEntry, index: number, map?: V03MapData): Promise<void> {
    const parent = this.parentForGroup(asset.group);
    if (!parent) {
      return;
    }

    const node = new Node(`art-sprite-${asset.id}`);
    const placement = this.positionForAsset(asset, index, map);
    node.setPosition(placement.position);
    parent.addChild(node);

    const sprite = node.addComponent(Sprite);
    sprite.spriteFrame = await this.loadSpriteFrame(asset);
    this.stats.spriteNodes += 1;
    this.stats[asset.group] += 1;
    if (placement.mapBound) {
      this.stats.mapBoundSprites += 1;
    }
  }

  private parentForGroup(group: V03ArtAssetEntry['group']): Node | null {
    if (group === 'portraits') return this.uiRoot;
    if (group === 'skills') return this.fxRoot;
    if (group === 'props') return this.propRoot;
    return this.actorRoot;
  }

  private positionForAsset(asset: V03ArtAssetEntry, index: number, map?: V03MapData): { position: Vec3; mapBound: boolean } {
    const lane = index % 6;
    const row = Math.floor(index / 6);
    if (asset.group === 'portraits') {
      return { position: new Vec3(lane * 56, -row * 64, 0), mapBound: false };
    }
    if (!map) {
      return { position: this.fallbackPosition(asset, lane, row), mapBound: false };
    }
    if (asset.group === 'units') {
      const spawn = map.spawnPoints[0] || map.stormCenter;
      return { position: this.mapPointToWorld(map, spawn, 1.05), mapBound: true };
    }
    if (asset.group === 'zombies') {
      const zombieIndex = Math.max(0, this.zombieIndex(asset.id));
      const entry = map.zombieEntries[zombieIndex % map.zombieEntries.length] || map.stormCenter;
      return { position: this.mapPointToWorld(map, entry, 0.92), mapBound: true };
    }
    if (asset.group === 'props') {
      const structure = this.structureForPropAsset(map, asset.id);
      if (structure) {
        return { position: this.structureToWorld(map, structure, 0.72), mapBound: true };
      }
    }
    if (asset.group === 'skills') {
      const spawn = map.spawnPoints[0] || map.stormCenter;
      const base = this.mapPointToWorld(map, spawn, 0.26);
      base.x += (lane - 1) * 0.42;
      base.z -= 0.72 + row * 0.1;
      return { position: base, mapBound: true };
    }
    return { position: this.fallbackPosition(asset, lane, row), mapBound: false };
  }

  private fallbackPosition(asset: V03ArtAssetEntry, lane: number, row: number): Vec3 {
    if (asset.group === 'skills') return new Vec3(lane * 0.38 - 0.4, 0.2, -0.8 - row * 0.08);
    if (asset.group === 'props') return new Vec3(lane * 0.42 - 1.1, 0.45, 1.15 + row * 0.16);
    if (asset.group === 'zombies') return new Vec3(lane * 0.42 - 0.5, 0.84, 0.45 + row * 0.14);
    return new Vec3(0, 1.05, -0.45);
  }

  private mapPointToWorld(map: V03MapData, point: V03MapPoint, y: number): Vec3 {
    return new Vec3(
      (point.x / map.width - 0.5) * this.worldWidth,
      y,
      (point.y / map.height - 0.5) * this.worldDepth
    );
  }

  private structureToWorld(map: V03MapData, structure: V03Structure, y: number): Vec3 {
    return this.mapPointToWorld(map, {
      x: structure.x + structure.w / 2,
      y: structure.y + structure.h / 2
    }, y);
  }

  private structureForPropAsset(map: V03MapData, id: string): V03Structure | undefined {
    const kindByAsset: Record<string, V03PropKind[]> = {
      'prop-cover-wreck': ['wreck_car'],
      'prop-cover-wall': ['wall', 'building'],
      'prop-cover-crate': ['crate'],
      'prop-cover-barrel': ['barrel'],
      'prop-cover-tires': ['tires'],
      'prop-cover-debris': ['debris', 'barricade']
    };
    const kinds = kindByAsset[id] || [];
    return map.structures.find((structure) => kinds.includes(structure.kind));
  }

  private zombieIndex(id: string): number {
    if (id.includes('brute')) return 0;
    if (id.includes('crawler')) return 1;
    if (id.includes('hooded')) return 2;
    return 0;
  }

  private loadSpriteFrame(asset: V03ArtAssetEntry): Promise<SpriteFrame> {
    const spriteFramePath = asset.spriteFramePath || `${asset.resourcePath}/spriteFrame`;
    return new Promise((resolve, reject) => {
      resources.load(spriteFramePath, SpriteFrame, (error, spriteFrame) => {
        if (error || !spriteFrame) {
          reject(error || new Error(`Missing sprite frame: ${spriteFramePath}`));
          return;
        }
        resolve(spriteFrame);
      });
    });
  }
}
