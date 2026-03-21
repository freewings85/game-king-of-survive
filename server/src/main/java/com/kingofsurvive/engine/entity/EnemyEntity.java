package com.kingofsurvive.engine.entity;

public class EnemyEntity extends BaseEntity {
    private String type; // "normal", "fast", "tank", "ranged", "swarm", "miniBoss", "boss", "treasure"
    private double hp;
    private double maxHp;
    private double damage;
    private double speed;
    private double baseSpeed;
    private double xpReward;
    private int wave;

    // Elite affixes
    private String affix; // null, "burning", "frozen", "teleport", "splitting", "shielded"
    private double affixTimer;

    // Status effects
    private double slowFactor; // 1.0 = normal, < 1.0 = slowed
    private double burnDamage;
    private double burnTimer;
    private double freezeTimer;
    private double hitFlashTimer;

    // Boss-specific
    private int bossPhase;
    private double bossAbilityTimer;
    private double bossAbilityCooldown;

    // Ranged enemy
    private boolean rangedAttack;
    private double attackRange;
    private double rangedCooldown;
    private double rangedTimer;

    // Treasure goblin
    private boolean fleeFromPlayer;
    private double escapeTimer;

    // Hostile flag: true = red name (shoots bullets, gives XP on kill)
    //               false = green name (passive, gives XP on touch)
    private boolean hostile = true;

    // Spawn fade
    private double spawnFade;

    // Movement target
    private Vec2 moveTarget;

    public EnemyEntity(String type, double x, double y, double hp, double damage,
                       double speed, double xpReward, double radius, int wave) {
        super(x, y, radius);
        this.type = type;
        this.hp = hp;
        this.maxHp = hp;
        this.damage = damage;
        this.speed = speed;
        this.baseSpeed = speed;
        this.xpReward = xpReward;
        this.wave = wave;

        this.slowFactor = 1.0;
        this.spawnFade = 0;
        this.bossPhase = 1;
        this.bossAbilityTimer = 0;
        this.bossAbilityCooldown = 3.0;
    }

    public void takeDamage(double amount) {
        hp = Math.max(0, hp - amount);
        hitFlashTimer = 0.1;
        if (hp <= 0) {
            alive = false;
        }
    }

    public void applySlowFactor(double slow) {
        slowFactor = Math.min(slowFactor, slow);
    }

    public void resetSlowFactor() {
        slowFactor = 1.0;
    }

    public double getEffectiveSpeed() {
        return speed * slowFactor;
    }

    // Getters and setters
    public String getType() { return type; }
    public double getHp() { return hp; }
    public void setHp(double hp) { this.hp = hp; }
    public double getMaxHp() { return maxHp; }
    public double getDamage() { return damage; }
    public void setDamage(double damage) { this.damage = damage; }
    public double getSpeed() { return speed; }
    public void setSpeed(double speed) { this.speed = speed; }
    public double getBaseSpeed() { return baseSpeed; }
    public double getXpReward() { return xpReward; }
    public int getWave() { return wave; }

    public String getAffix() { return affix; }
    public void setAffix(String affix) { this.affix = affix; }
    public double getAffixTimer() { return affixTimer; }
    public void setAffixTimer(double affixTimer) { this.affixTimer = affixTimer; }

    public double getSlowFactor() { return slowFactor; }
    public double getBurnDamage() { return burnDamage; }
    public void setBurnDamage(double burnDamage) { this.burnDamage = burnDamage; }
    public double getBurnTimer() { return burnTimer; }
    public void setBurnTimer(double burnTimer) { this.burnTimer = burnTimer; }
    public double getFreezeTimer() { return freezeTimer; }
    public void setFreezeTimer(double freezeTimer) { this.freezeTimer = freezeTimer; }
    public double getHitFlashTimer() { return hitFlashTimer; }
    public void setHitFlashTimer(double hitFlashTimer) { this.hitFlashTimer = hitFlashTimer; }

    public int getBossPhase() { return bossPhase; }
    public void setBossPhase(int bossPhase) { this.bossPhase = bossPhase; }
    public double getBossAbilityTimer() { return bossAbilityTimer; }
    public void setBossAbilityTimer(double bossAbilityTimer) { this.bossAbilityTimer = bossAbilityTimer; }
    public double getBossAbilityCooldown() { return bossAbilityCooldown; }

    public boolean isRangedAttack() { return rangedAttack; }
    public void setRangedAttack(boolean rangedAttack) { this.rangedAttack = rangedAttack; }
    public double getAttackRange() { return attackRange; }
    public void setAttackRange(double attackRange) { this.attackRange = attackRange; }
    public double getRangedCooldown() { return rangedCooldown; }
    public void setRangedCooldown(double rangedCooldown) { this.rangedCooldown = rangedCooldown; }
    public double getRangedTimer() { return rangedTimer; }
    public void setRangedTimer(double rangedTimer) { this.rangedTimer = rangedTimer; }

    public boolean isFleeFromPlayer() { return fleeFromPlayer; }
    public void setFleeFromPlayer(boolean fleeFromPlayer) { this.fleeFromPlayer = fleeFromPlayer; }
    public double getEscapeTimer() { return escapeTimer; }
    public void setEscapeTimer(double escapeTimer) { this.escapeTimer = escapeTimer; }

    public double getSpawnFade() { return spawnFade; }
    public void setSpawnFade(double spawnFade) { this.spawnFade = spawnFade; }

    public boolean isHostile() { return hostile; }
    public void setHostile(boolean hostile) { this.hostile = hostile; }

    public Vec2 getMoveTarget() { return moveTarget; }
    public void setMoveTarget(Vec2 moveTarget) { this.moveTarget = moveTarget; }
}
