import {
  _decorator,
  Color,
  Component,
  Material,
  MeshRenderer,
  Node,
  primitives,
  utils
} from 'cc';
import type { V03ClassId, V03SkillId } from './V03Config';
import {
  V03_REQUIRED_FX_LAYERS,
  V03_REQUIRED_HERO_GEAR,
  V03_REQUIRED_PROP_GROUND_LAYERS,
  V03_REQUIRED_PROP_WEAR_DECALS,
  V03_REQUIRED_UNIT_DECALS,
  V03_ZOMBIE_VARIANTS
} from './V03VisualContract';

const { ccclass, property } = _decorator;

export interface V03VisualRuntimeStats {
  heroGear: number;
  zombieVariants: number;
  unitDecals: number;
  propGroundLayers: number;
  propWearDecals: number;
  fxLayers: number;
}

@ccclass('V03VisualRuntime')
export class V03VisualRuntime extends Component {
  @property(Node)
  public actorRoot: Node | null = null;

  @property(Node)
  public fxRoot: Node | null = null;

  public readonly stats: V03VisualRuntimeStats = {
    heroGear: 0,
    zombieVariants: 0,
    unitDecals: 0,
    propGroundLayers: 0,
    propWearDecals: 0,
    fxLayers: 0
  };

  private materialCache = new Map<string, Material>();

  public buildVisualContract(classId: V03ClassId = 'ranger', skillId: V03SkillId = 'fan'): V03VisualRuntimeStats {
    this.ensureRoots();
    this.clearRuntimeNodes();
    this.buildHeroGear(classId);
    this.buildZombieVariants();
    this.buildUnitDecals();
    this.buildPropGroundLayers();
    this.buildPropWearDecals();
    this.buildFxLayers(skillId);
    return { ...this.stats };
  }

  private ensureRoots(): void {
    this.actorRoot = this.actorRoot || this.makeRoot('VisualActors');
    this.fxRoot = this.fxRoot || this.makeRoot('VisualFX');
  }

  private clearRuntimeNodes(): void {
    if (this.actorRoot) this.actorRoot.removeAllChildren();
    if (this.fxRoot) this.fxRoot.removeAllChildren();
    this.stats.heroGear = 0;
    this.stats.zombieVariants = 0;
    this.stats.unitDecals = 0;
    this.stats.propGroundLayers = 0;
    this.stats.propWearDecals = 0;
    this.stats.fxLayers = 0;
  }

  private makeRoot(name: string): Node {
    const root = new Node(name);
    this.node.addChild(root);
    return root;
  }

  private buildHeroGear(classId: V03ClassId): void {
    const gear = V03_REQUIRED_HERO_GEAR[classId];
    gear.forEach((gearName, index) => {
      const node = this.makeBox(`hero-${classId}-${gearName}`, 0.22 + index * 0.03, 0.16, 0.12, '#78d66a');
      node.setPosition(index * 0.28 - gear.length * 0.14, 0.65, 0);
      this.actorRoot!.addChild(node);
      this.stats.heroGear += 1;
    });
  }

  private buildZombieVariants(): void {
    V03_ZOMBIE_VARIANTS.forEach((variant, index) => {
      const width = variant === 'brute' ? 0.34 : variant === 'crawler' ? 0.24 : 0.28;
      const height = variant === 'crawler' ? 0.28 : 0.52;
      const node = this.makeBox(`zombie-${variant}`, width, height, 0.22, '#83936f');
      node.setPosition(index * 0.42 - 0.42, height / 2, 0.55);
      this.actorRoot!.addChild(node);
      this.stats.zombieVariants += 1;
    });
  }

  private buildUnitDecals(): void {
    V03_REQUIRED_UNIT_DECALS.forEach((decal, index) => {
      const node = this.makeBox(`unit-decal-${decal}`, 0.16, 0.025, 0.08, index % 2 ? '#dce9a0' : '#ff8b3d');
      node.setPosition(index * 0.18 - 0.45, 0.98, -0.22);
      this.actorRoot!.addChild(node);
      this.stats.unitDecals += 1;
    });
  }

  private buildPropGroundLayers(): void {
    V03_REQUIRED_PROP_GROUND_LAYERS.forEach((layer, index) => {
      const node = this.makeBox(`prop-ground-${layer}`, 0.22 + index * 0.04, 0.015, 0.12, index % 2 ? '#8b4a25' : '#22201a');
      node.setPosition(index * 0.24 - 0.36, 0.035, 0.95);
      this.actorRoot!.addChild(node);
      this.stats.propGroundLayers += 1;
    });
  }

  private buildPropWearDecals(): void {
    V03_REQUIRED_PROP_WEAR_DECALS.forEach((decal, index) => {
      const color = index % 3 === 0 ? '#f0d189' : index % 3 === 1 ? '#15110d' : '#86d7ff';
      const node = this.makeBox(`prop-wear-${decal}`, 0.18 + index * 0.035, 0.02, 0.055, color);
      node.setPosition(index * 0.22 - 0.44, 0.32 + (index % 2) * 0.08, 1.18);
      this.actorRoot!.addChild(node);
      this.stats.propWearDecals += 1;
    });
  }

  private buildFxLayers(skillId: V03SkillId): void {
    const layers = V03_REQUIRED_FX_LAYERS[skillId];
    layers.forEach((layer, index) => {
      const color = skillId === 'arc' ? '#8be9ff' : skillId === 'boom' ? '#ff8b3d' : '#f4c95a';
      const node = this.makeBox(`fx-${skillId}-${layer}`, 0.20 + index * 0.025, 0.02, 0.08, color);
      node.setPosition(index * 0.24 - layers.length * 0.12, 0.18, -0.65);
      this.fxRoot!.addChild(node);
      this.stats.fxLayers += 1;
    });
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
