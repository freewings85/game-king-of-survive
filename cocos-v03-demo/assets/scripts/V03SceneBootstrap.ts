import { _decorator, Camera, Component, Label, Node, Vec3 } from 'cc';
import { V03BattleDirector } from './V03BattleDirector';
import { V03MapRuntime } from './V03MapRuntime';
import { V03VisualRuntime } from './V03VisualRuntime';

const { ccclass } = _decorator;

export interface V03SceneBootstrapStats {
  nodes: number;
  components: number;
  usesOrthographicCamera: boolean;
  hasStatusLabel: boolean;
  mapRuntimeWired: boolean;
  visualRuntimeWired: boolean;
  battleDirectorWired: boolean;
}

@ccclass('V03SceneBootstrap')
export class V03SceneBootstrap extends Component {
  public readonly stats: V03SceneBootstrapStats = {
    nodes: 0,
    components: 0,
    usesOrthographicCamera: false,
    hasStatusLabel: false,
    mapRuntimeWired: false,
    visualRuntimeWired: false,
    battleDirectorWired: false
  };

  protected onLoad(): void {
    this.buildRuntimeScene();
  }

  public buildRuntimeScene(): V03SceneBootstrapStats {
    const cameraNode = this.ensurePath('CameraRig/MainCamera');
    this.ensurePath('CameraRig/FollowTarget');
    const world = this.ensurePath('World');
    const groundTiles = this.ensurePath('World/GroundTiles');
    this.ensurePath('World/RoadMarks');
    const props = this.ensurePath('World/Props');
    const spawnPins = this.ensurePath('World/SpawnPins');
    this.ensurePath('World/RewardPins');
    const actors = this.ensurePath('Actors');
    this.ensurePath('Actors/Player');
    this.ensurePath('Actors/Zombies');
    this.ensurePath('Actors/Projectiles');
    this.ensurePath('Actors/Pickups');
    const visualActors = this.ensurePath('Actors/VisualActors');
    const fx = this.ensurePath('FX');
    this.ensurePath('FX/SkillBeams');
    this.ensurePath('FX/SkillBursts');
    this.ensurePath('FX/HitFlashes');
    this.ensurePath('FX/CardLayers');
    const visualFx = this.ensurePath('FX/VisualFX');
    const ui = this.ensurePath('UI');
    const topHud = this.ensurePath('UI/TopHud');
    this.ensurePath('UI/MiniMap');
    this.ensurePath('UI/MoveStick');
    this.ensurePath('UI/SkillButtons');
    this.ensurePath('UI/ClassPanel');

    const camera = this.ensureComponent(cameraNode, Camera);
    camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = 10;
    camera.node.setPosition(new Vec3(6, 10, 7));
    camera.node.lookAt(new Vec3(0, 0, 0));
    this.stats.usesOrthographicCamera = true;

    const statusLabelNode = this.ensureChild(topHud, 'StatusLabel');
    const statusLabel = this.ensureComponent(statusLabelNode, Label);
    statusLabel.string = 'V03 loading';
    this.stats.hasStatusLabel = true;

    const mapRuntime = this.ensureComponent(world, V03MapRuntime);
    mapRuntime.groundRoot = groundTiles;
    mapRuntime.propRoot = props;
    mapRuntime.pinRoot = spawnPins;
    this.stats.mapRuntimeWired = true;

    const visualRuntime = this.ensureComponent(actors, V03VisualRuntime);
    visualRuntime.actorRoot = visualActors;
    visualRuntime.fxRoot = visualFx;
    this.stats.visualRuntimeWired = true;

    const director = this.ensureComponent(this.node, V03BattleDirector);
    director.statusLabel = statusLabel;
    director.mapRuntime = mapRuntime;
    director.visualRuntime = visualRuntime;
    this.stats.battleDirectorWired = true;

    // Keep empty roots alive for Creator scene inspection and future prefab replacement.
    [fx, ui].forEach((root) => {
      root.active = true;
    });

    return { ...this.stats };
  }

  private ensurePath(path: string): Node {
    return path.split('/').reduce((parent, name) => this.ensureChild(parent, name), this.node);
  }

  private ensureChild(parent: Node, name: string): Node {
    const existing = parent.getChildByName(name);
    if (existing) {
      return existing;
    }
    const child = new Node(name);
    parent.addChild(child);
    this.stats.nodes += 1;
    return child;
  }

  private ensureComponent<T extends Component>(node: Node, componentType: new () => T): T {
    const existing = node.getComponent(componentType);
    if (existing) {
      return existing;
    }
    this.stats.components += 1;
    return node.addComponent(componentType);
  }
}
