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
import type { V03MapData, V03MapPoint, V03Structure, V03TileId } from './V03MapContract';

const { ccclass, property } = _decorator;

export interface V03MapRuntimeStats {
  tiles: number;
  props: number;
  zombieEntries: number;
  rewardPoints: number;
}

@ccclass('V03MapRuntime')
export class V03MapRuntime extends Component {
  @property(Node)
  public groundRoot: Node | null = null;

  @property(Node)
  public propRoot: Node | null = null;

  @property(Node)
  public pinRoot: Node | null = null;

  public readonly stats: V03MapRuntimeStats = {
    tiles: 0,
    props: 0,
    zombieEntries: 0,
    rewardPoints: 0
  };

  private readonly worldWidth = 12;
  private readonly worldDepth = 10;
  private materialCache = new Map<string, Material>();

  public buildFromMap(map: V03MapData): V03MapRuntimeStats {
    this.clearRuntimeNodes();
    this.ensureRoots();
    this.buildTiles(map);
    this.buildProps(map);
    this.buildPins(map);
    return { ...this.stats };
  }

  public mapPointToWorld(map: V03MapData, point: Pick<V03MapPoint, 'x' | 'y'>, y = 0): Vec3 {
    return new Vec3(
      (point.x / map.width - 0.5) * this.worldWidth,
      y,
      (point.y / map.height - 0.5) * this.worldDepth
    );
  }

  private clearRuntimeNodes(): void {
    [this.groundRoot, this.propRoot, this.pinRoot].forEach((root) => {
      if (root) {
        root.removeAllChildren();
      }
    });
    this.stats.tiles = 0;
    this.stats.props = 0;
    this.stats.zombieEntries = 0;
    this.stats.rewardPoints = 0;
  }

  private ensureRoots(): void {
    this.groundRoot = this.groundRoot || this.makeRoot('Ground');
    this.propRoot = this.propRoot || this.makeRoot('Props');
    this.pinRoot = this.pinRoot || this.makeRoot('GameplayPins');
  }

  private makeRoot(name: string): Node {
    const root = new Node(name);
    this.node.addChild(root);
    return root;
  }

  private buildTiles(map: V03MapData): void {
    const tileW = this.worldWidth / map.cols;
    const tileD = this.worldDepth / map.rows;
    map.tiles.forEach((tileId, index) => {
      const x = index % map.cols;
      const y = Math.floor(index / map.cols);
      const tile = this.makeBox(
        `tile-${x}-${y}`,
        tileW * 0.98,
        0.04,
        tileD * 0.98,
        this.tileColor(tileId)
      );
      tile.setPosition(
        (x + 0.5) / map.cols * this.worldWidth - this.worldWidth / 2,
        -0.02,
        (y + 0.5) / map.rows * this.worldDepth - this.worldDepth / 2
      );
      this.groundRoot!.addChild(tile);
      this.stats.tiles += 1;
    });
  }

  private buildProps(map: V03MapData): void {
    map.structures.forEach((structure, index) => {
      const size = this.structureSize(map, structure);
      const prop = this.makeBox(`prop-${index}-${structure.kind}`, size.x, size.y, size.z, structure.color);
      prop.setPosition(this.mapPointToWorld(map, {
        x: structure.x + structure.w / 2,
        y: structure.y + structure.h / 2
      }, size.y / 2));
      this.propRoot!.addChild(prop);
      this.stats.props += 1;
    });
  }

  private buildPins(map: V03MapData): void {
    this.addPinGroup(map, map.zombieEntries, 'zombie-entry', '#8da082');
    this.addPinGroup(map, map.rewardPoints, 'reward-point', '#7cff4f');
    this.addPinGroup(map, map.spawnPoints, 'spawn', '#42d9ff');
    this.addPinGroup(map, map.rivalPoints, 'rival', '#ff8b3d');
  }

  private addPinGroup(map: V03MapData, points: V03MapPoint[], name: string, color: string): void {
    points.forEach((point, index) => {
      const pin = this.makeBox(`${name}-${index}`, 0.18, 0.18, 0.18, color);
      pin.setPosition(this.mapPointToWorld(map, point, 0.12));
      this.pinRoot!.addChild(pin);
    });
    if (name === 'zombie-entry') {
      this.stats.zombieEntries = points.length;
    }
    if (name === 'reward-point') {
      this.stats.rewardPoints = points.length;
    }
  }

  private structureSize(map: V03MapData, structure: V03Structure): Vec3 {
    const w = Math.max(0.18, structure.w / map.width * this.worldWidth);
    const d = Math.max(0.18, structure.h / map.height * this.worldDepth);
    const tallKinds: Record<string, number> = {
      wall: 1.35,
      building: 1.1,
      gas_station: 0.86,
      wreck_car: 0.52,
      barrel: 0.54
    };
    return new Vec3(w, tallKinds[structure.kind] || 0.36, d);
  }

  private tileColor(tileId: V03TileId): string {
    const colors: Record<number, string> = {
      0: '#6b6248',
      1: '#655842',
      2: '#687069',
      3: '#314845',
      4: '#2f3432',
      5: '#44372a',
      6: '#4b504b'
    };
    return colors[tileId] || '#6b6248';
  }

  private makeBox(name: string, width: number, height: number, depth: number, color: string): Node {
    const node = new Node(name);
    const renderer = node.addComponent(MeshRenderer);
    renderer.mesh = utils.createMesh(primitives.box({ width, height, length: depth }));
    renderer.material = this.getMaterial(color);
    return node;
  }

  private getMaterial(hex: string): Material {
    if (this.materialCache.has(hex)) {
      return this.materialCache.get(hex)!;
    }
    const material = new Material();
    material.initialize({ effectName: 'builtin-standard' });
    material.setProperty('mainColor', Color.fromHEX(new Color(), hex));
    this.materialCache.set(hex, material);
    return material;
  }
}
