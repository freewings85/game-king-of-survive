import { _decorator, Component, Node, resources, Sprite, SpriteFrame, Vec3 } from 'cc';
import type { V03ArtAssetEntry, V03ArtAssetManifest } from './V03ResourceBridge';

const { ccclass, property } = _decorator;

export interface V03ArtSpriteRuntimeStats {
  spriteNodes: number;
  portraits: number;
  units: number;
  zombies: number;
  skills: number;
  props: number;
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
    props: 0
  };

  public async buildFromManifest(manifest: V03ArtAssetManifest): Promise<V03ArtSpriteRuntimeStats> {
    this.clearRuntimeNodes();
    this.resetStats();
    await Promise.all(manifest.assets.map((asset, index) => this.addSpriteAsset(asset, index)));
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
  }

  private async addSpriteAsset(asset: V03ArtAssetEntry, index: number): Promise<void> {
    const parent = this.parentForGroup(asset.group);
    if (!parent) {
      return;
    }

    const node = new Node(`art-sprite-${asset.id}`);
    node.setPosition(this.positionForAsset(asset, index));
    parent.addChild(node);

    const sprite = node.addComponent(Sprite);
    sprite.spriteFrame = await this.loadSpriteFrame(asset);
    this.stats.spriteNodes += 1;
    this.stats[asset.group] += 1;
  }

  private parentForGroup(group: V03ArtAssetEntry['group']): Node | null {
    if (group === 'portraits') return this.uiRoot;
    if (group === 'skills') return this.fxRoot;
    if (group === 'props') return this.propRoot;
    return this.actorRoot;
  }

  private positionForAsset(asset: V03ArtAssetEntry, index: number): Vec3 {
    const lane = index % 6;
    const row = Math.floor(index / 6);
    if (asset.group === 'portraits') return new Vec3(lane * 56, -row * 64, 0);
    if (asset.group === 'skills') return new Vec3(lane * 0.38 - 0.4, 0.2, -0.8 - row * 0.08);
    if (asset.group === 'props') return new Vec3(lane * 0.42 - 1.1, 0.45, 1.15 + row * 0.16);
    if (asset.group === 'zombies') return new Vec3(lane * 0.42 - 0.5, 0.84, 0.45 + row * 0.14);
    return new Vec3(0, 1.05, -0.45);
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
