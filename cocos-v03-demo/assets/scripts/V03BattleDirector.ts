import { _decorator, Component, Label } from 'cc';
import { V03ArtSpriteRuntime, type V03ArtSpriteRuntimeStats } from './V03ArtSpriteRuntime';
import { V03_CLASSES, V03_SKILLS, V03_TUNING, type V03ClassId, type V03SkillId } from './V03Config';
import { loadV03ArtAssetManifest, loadV03BridgeData, type V03ArtAssetManifest, type V03BridgeData } from './V03ResourceBridge';
import { V03MapRuntime, type V03MapRuntimeStats } from './V03MapRuntime';
import { V03VisualRuntime, type V03VisualRuntimeStats } from './V03VisualRuntime';

const { ccclass, property } = _decorator;

@ccclass('V03BattleDirector')
export class V03BattleDirector extends Component {
  @property(Label)
  public statusLabel: Label | null = null;

  @property(V03MapRuntime)
  public mapRuntime: V03MapRuntime | null = null;

  @property(V03VisualRuntime)
  public visualRuntime: V03VisualRuntime | null = null;

  @property(V03ArtSpriteRuntime)
  public artSpriteRuntime: V03ArtSpriteRuntime | null = null;

  private classId: V03ClassId = 'ranger';
  private skillId: V03SkillId = 'fan';
  private elapsed = 0;
  private fireTimer = 0;
  private level = 1;
  private xp = 0;
  private hp = V03_TUNING.playerHp;
  private alive = 32;
  private bridgeData: V03BridgeData | null = null;
  private artManifest: V03ArtAssetManifest | null = null;
  private mapStats: V03MapRuntimeStats | null = null;
  private visualStats: V03VisualRuntimeStats | null = null;
  private artSpriteStats: V03ArtSpriteRuntimeStats | null = null;

  async start(): Promise<void> {
    const [bridgeData, artManifest] = await Promise.all([
      loadV03BridgeData(),
      loadV03ArtAssetManifest()
    ]);
    this.bridgeData = bridgeData;
    this.artManifest = artManifest;
    if (this.mapRuntime) {
      this.mapStats = this.mapRuntime.buildFromMap(this.bridgeData.map);
    }
    if (this.visualRuntime) {
      this.visualStats = this.visualRuntime.buildVisualContract(this.classId, this.skillId);
    }
    if (this.artSpriteRuntime) {
      this.artSpriteStats = await this.artSpriteRuntime.buildFromManifest(this.artManifest, this.bridgeData.map);
    }
    this.hp = this.bridgeData.runtime.tuning.player.hp;
    this.alive = Math.max(18, this.bridgeData.map.zombieEntries.length * 8);
    this.renderStatus();
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.fireTimer -= dt;

    if (this.fireTimer <= 0) {
      this.fireTimer = this.classId === 'ranger'
        ? V03_TUNING.rangerFireCooldown
        : V03_TUNING.defaultFireCooldown;
      this.simulateAutoFire();
    }

    this.renderStatus();
  }

  public selectClass(classId: V03ClassId): void {
    this.classId = classId;
    this.refreshVisualContract();
    this.renderStatus();
  }

  public selectSkill(skillId: V03SkillId): void {
    this.skillId = skillId;
    this.refreshVisualContract();
    this.renderStatus();
  }

  private refreshVisualContract(): void {
    if (this.visualRuntime) {
      this.visualStats = this.visualRuntime.buildVisualContract(this.classId, this.skillId);
    }
  }

  private simulateAutoFire(): void {
    const skill = V03_SKILLS[this.skillId];
    this.xp += Math.max(1, Math.round(skill.damage / 10));

    const needed = 10 + this.level * 6;
    if (this.xp >= needed) {
      this.xp -= needed;
      this.level += 1;
    }

    if (this.elapsed > 8 && this.alive > 1) {
      this.alive -= 1;
    }
  }

  private renderStatus(): void {
    if (!this.statusLabel) {
      return;
    }

    const classDef = V03_CLASSES[this.classId];
    const skillDef = V03_SKILLS[this.skillId];
    const mapName = this.bridgeData ? `${this.bridgeData.map.cols}x${this.bridgeData.map.rows}` : 'loading map';
    const mapStats = this.mapStats
      ? `T${this.mapStats.tiles} P${this.mapStats.props} Z${this.mapStats.zombieEntries} R${this.mapStats.rewardPoints}`
      : 'runtime pending';
    const visualStats = this.visualStats
      ? `G${this.visualStats.heroGear} V${this.visualStats.zombieVariants} D${this.visualStats.unitDecals} PG${this.visualStats.propGroundLayers} PW${this.visualStats.propWearDecals} PS${this.visualStats.propShapeBlocks} PB${this.visualStats.propBreakShapes} GL${this.visualStats.globalLightLayers} OR${this.visualStats.objectRimLayers} MB${this.visualStats.materialBlendLayers} FX${this.visualStats.fxLayers}`
      : 'visual pending';
    const artStats = this.artManifest
      ? `ART ${this.artManifest.assets.length} P${this.artManifest.counts.portraits} U${this.artManifest.counts.units} Z${this.artManifest.counts.zombies} S${this.artManifest.counts.skills} PR${this.artManifest.counts.props}`
      : 'art pending';
    const spriteStats = this.artSpriteStats
      ? `SPRITES ${this.artSpriteStats.spriteNodes} M${this.artSpriteStats.mapBoundSprites} D${this.artSpriteStats.depthSortedSprites} X${this.artSpriteStats.scaledSprites} UI${this.artSpriteStats.portraits} U${this.artSpriteStats.units} Z${this.artSpriteStats.zombies} S${this.artSpriteStats.skills} P${this.artSpriteStats.props}`
      : 'sprites pending';
    this.statusLabel.string = [
      `V03 ${classDef.name} / ${skillDef.name}`,
      `HP ${Math.round(this.hp)}  LV ${this.level}  XP ${this.xp}`,
      `ALIVE ${this.alive}  T ${Math.floor(this.elapsed)}s`,
      `MAP ${mapName} ${mapStats}`,
      `VISUAL ${visualStats}`,
      artStats,
      spriteStats
    ].join('\n');
  }
}
