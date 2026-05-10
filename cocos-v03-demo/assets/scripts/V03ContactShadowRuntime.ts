import {
  _decorator,
  Color,
  Component,
  Material,
  MeshRenderer,
  Node,
  Vec3,
  primitives,
  utils
} from 'cc';
import type { V03MapData, V03MapPoint, V03Structure } from './V03MapContract';

const { ccclass, property } = _decorator;

export interface V03ContactShadowRuntimeStats {
  shadows: number;
  playerShadows: number;
  zombieShadows: number;
  propShadows: number;
}

@ccclass('V03ContactShadowRuntime')
export class V03ContactShadowRuntime extends Component {
  @property(Node)
  public shadowRoot: Node | null = null;

  public readonly stats: V03ContactShadowRuntimeStats = {
    shadows: 0,
    playerShadows: 0,
    zombieShadows: 0,
    propShadows: 0
  };

  private readonly worldWidth = 12;
  private readonly worldDepth = 10;
  private materialCache: Material | null = null;

  public buildFromMap(map: V03MapData): V03ContactShadowRuntimeStats {
    this.ensureRoot();
    this.shadowRoot!.removeAllChildren();
    this.resetStats();
    this.buildPlayerShadow(map);
    this.buildZombieShadows(map);
    this.buildPropShadows(map);
    return { ...this.stats };
  }

  private ensureRoot(): void {
    if (!this.shadowRoot) {
      this.shadowRoot = new Node('ContactShadows');
      this.node.addChild(this.shadowRoot);
    }
  }

  private resetStats(): void {
    this.stats.shadows = 0;
    this.stats.playerShadows = 0;
    this.stats.zombieShadows = 0;
    this.stats.propShadows = 0;
  }

  private buildPlayerShadow(map: V03MapData): void {
    const spawn = map.spawnPoints[0] || map.stormCenter;
    this.addShadow('player-contact-shadow', this.mapPointToWorld(map, spawn, 0.018), 0.72, 0.42);
    this.stats.playerShadows += 1;
  }

  private buildZombieShadows(map: V03MapData): void {
    map.zombieEntries.forEach((entry, index) => {
      this.addShadow(`zombie-contact-shadow-${index}`, this.mapPointToWorld(map, entry, 0.016), 0.56, 0.34);
      this.stats.zombieShadows += 1;
    });
  }

  private buildPropShadows(map: V03MapData): void {
    map.structures
      .filter((structure) => this.isShadowCaster(structure))
      .slice(0, 24)
      .forEach((structure, index) => {
        const position = this.structureToWorld(map, structure, 0.014);
        const width = Math.max(0.26, structure.w / map.width * this.worldWidth * 1.18);
        const depth = Math.max(0.20, structure.h / map.height * this.worldDepth * 1.18);
        this.addShadow(`prop-contact-shadow-${index}-${structure.kind}`, position, width, depth);
        this.stats.propShadows += 1;
      });
  }

  private addShadow(name: string, position: Vec3, width: number, depth: number): void {
    const node = new Node(name);
    const renderer = node.addComponent(MeshRenderer);
    renderer.mesh = utils.createMesh(primitives.box({ width, height: 0.012, length: depth }));
    renderer.material = this.getShadowMaterial();
    node.setPosition(position);
    this.shadowRoot!.addChild(node);
    this.stats.shadows += 1;
  }

  private isShadowCaster(structure: V03Structure): boolean {
    return structure.gameplay === 'cover' ||
      structure.gameplay === 'cover_loot' ||
      structure.gameplay === 'hard_blocker' ||
      structure.gameplay === 'soft_blocker';
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

  private getShadowMaterial(): Material {
    if (this.materialCache) {
      return this.materialCache;
    }
    const material = new Material();
    material.initialize({ effectName: 'builtin-standard' });
    material.setProperty('mainColor', Color.fromHEX(new Color(), '#10140f'));
    this.materialCache = material;
    return material;
  }
}
