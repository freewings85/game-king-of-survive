import { _decorator, Component, Label } from 'cc';
import { V03_CLASSES, V03_SKILLS, V03_TUNING, type V03ClassId, type V03SkillId } from './V03Config';

const { ccclass, property } = _decorator;

@ccclass('V03BattleDirector')
export class V03BattleDirector extends Component {
  @property(Label)
  public statusLabel: Label | null = null;

  private classId: V03ClassId = 'ranger';
  private skillId: V03SkillId = 'fan';
  private elapsed = 0;
  private fireTimer = 0;
  private level = 1;
  private xp = 0;
  private hp = V03_TUNING.playerHp;
  private alive = 32;

  start(): void {
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
    this.renderStatus();
  }

  public selectSkill(skillId: V03SkillId): void {
    this.skillId = skillId;
    this.renderStatus();
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
    this.statusLabel.string = [
      `V03 ${classDef.name} / ${skillDef.name}`,
      `HP ${Math.round(this.hp)}  LV ${this.level}  XP ${this.xp}`,
      `ALIVE ${this.alive}  T ${Math.floor(this.elapsed)}s`
    ].join('\n');
  }
}
