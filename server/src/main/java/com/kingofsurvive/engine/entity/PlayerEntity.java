package com.kingofsurvive.engine.entity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PlayerEntity extends BaseEntity {
    // Identity
    private String playerId;
    private String nickname;
    private String characterType; // "warrior", "mage", "scout"
    private int factionId;
    private boolean isBot;

    // Core stats
    private double classBaseHP; // from characters.json, not hardcoded
    private double hp;
    private double maxHp;
    private double maxHpBonus; // bonus from max_hp skill (tracked to prevent stacking bug)
    private double armorBonus; // flat armor from evolutions (e.g. iron_fortress)
    private double damageReduction; // % damage reduction from evolutions (e.g. titan)
    private int level;
    private double xp;
    private double xpToNext;
    private int kills;
    private double speed;
    private double baseSpeed;

    // Attributes (INT/STR/AGI/STA)
    private int attrINT;
    private int attrSTR;
    private int attrAGI;
    private int attrSTA;

    // Derived combat stats
    private double attackDamage;
    private double baseAttackDamage;
    private double attackCooldown;
    private double attackTimer;
    private double critChance;
    private double critDamage;
    private double armor;
    private double resistance;
    private double evasion;
    private double hpRegen;
    private double lifestealRate;
    private double cooldownReduction; // from INT, reduces all cooldowns
    private double shieldRechargeTime; // stored recharge time for shield reset

    // Skills
    private List<String> ownedSkills;
    private Map<String, Integer> skillLevels; // skillId -> level (1-5)
    private List<String> evolvedSkills;
    private List<String> selectedBuild = new ArrayList<>();

    // Projectile modifiers (from skills)
    private int projectileCount;
    private boolean pierce;
    private int chainCount;
    private double explosiveDmg;
    private int orbitCount;
    private double thornsDmg;
    private double magnetRange;
    private double slowAura;
    private double timeWarp;
    private double fireTrailDmg;

    // Default attack pattern (from class's default skill)
    private double defaultRange = 400;       // auto-aim range in px
    private double defaultAngle = 0.39;      // PI/8, spread arc in radians
    private double defaultProjSpeed = 300;   // projectile speed (0 = melee)
    private String defaultProjType = "projectile"; // "melee_arc" or "projectile"
    private String defaultVisual = "bullet"; // rendering hint

    // Class passive bonuses
    private double passiveDodge; // from class passive (e.g. scout 15%)
    private double rangeBonus; // from class passive (e.g. mage 50%)
    private double baseThornsDmg; // from class passive (e.g. warrior 10)
    private double pullRadius; // from gravity_well evolution
    private double orbitDmgMultiplier = 1.0; // from death_spiral evolution

    // Status
    private boolean shieldActive;
    private int shieldHits; // number of hits shield can absorb (default 1, increases with level)
    private double shieldTimer;
    private double shieldCooldown;
    private double invincibleTimer;
    private double dodgeTimer;
    private double dodgeCooldown;
    private double meleeIFrameTimer; // invulnerability to enemy melee after being hit
    private double newbieShieldTimer;
    private double reviveTimer;
    private boolean furyActive; // HP < 25%

    // Movement input (from client or AI)
    private double moveInputX;
    private double moveInputY;
    private double targetX;
    private double targetY;
    private double facingAngle; // radians, 0 = right, PI/2 = down

    // Ultimate
    private double ultimateCharge;
    private double ultimateMaxCharge;
    private boolean ultimateReady;

    // Timing
    private double survivalTime;
    private double lastBotLevelUpTime;
    private double lastInputTime; // tracks when this player last sent input (-1 = never)

    // Kill streak
    private int killStreak;
    private double killStreakTimer;
    private double killMultiplier;
    private double leaderXpPenalty = 1.0;

    public PlayerEntity(String playerId, String nickname, String characterType,
                        int factionId, boolean isBot, double x, double y) {
        super(x, y, 12);
        this.playerId = playerId;
        this.id = playerId;
        this.nickname = nickname;
        this.characterType = characterType;
        this.factionId = factionId;
        this.isBot = isBot;

        this.level = 1;
        this.xp = 0;
        this.kills = 0;

        this.ownedSkills = new ArrayList<>();
        this.skillLevels = new HashMap<>();
        this.evolvedSkills = new ArrayList<>();

        this.projectileCount = 1;
        this.pierce = false;
        this.chainCount = 0;
        this.explosiveDmg = 0;
        this.orbitCount = 0;
        this.thornsDmg = 0;
        this.magnetRange = 80;
        this.slowAura = 0;
        this.timeWarp = 0;
        this.fireTrailDmg = 0;

        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldCooldown = 0;
        this.invincibleTimer = 0;
        this.newbieShieldTimer = 8.0;
        this.reviveTimer = 0;
        this.furyActive = false;

        this.ultimateCharge = 0;
        this.ultimateMaxCharge = 100;
        this.ultimateReady = false;

        this.survivalTime = 0;
        this.lastBotLevelUpTime = 0;
        this.lastInputTime = -1; // never received input

        this.killStreak = 0;
        this.killStreakTimer = 0;
        this.killMultiplier = 1.0;

        this.lifestealRate = 0;
        this.critChance = 0.05;
        this.critDamage = 1.5;
    }

    public void initFromClassData(double baseHP, double baseATK, double baseSpd,
                                   int intVal, int strVal, int agiVal, int staVal) {
        this.classBaseHP = baseHP;
        this.maxHpBonus = 0;
        this.maxHp = baseHP + strVal * 3;
        this.hp = this.maxHp;
        this.baseAttackDamage = baseATK;
        this.attackDamage = baseATK * (1 + strVal * 0.01);
        this.baseSpeed = baseSpd;
        this.speed = baseSpd * (1 + agiVal * 0.005);
        this.attackCooldown = 0.8;
        this.attackTimer = 0;

        this.attrINT = intVal;
        this.attrSTR = strVal;
        this.attrAGI = agiVal;
        this.attrSTA = staVal;

        recalcDerivedStats();
    }

    public void recalcDerivedStats() {
        this.maxHp = classBaseHP + attrSTA * 3 + maxHpBonus;
        // INT scales attack damage (skill power) and STR scales physical attack
        this.attackDamage = baseAttackDamage * (1 + attrSTR * 0.01) * (1 + attrINT * 0.015);
        this.speed = baseSpeed * (1 + attrAGI * 0.005);
        this.critChance = 0.05 + attrAGI * 0.001;
        this.critDamage = 1.5 + attrSTR * 0.005;
        this.armor = attrSTR * 0.5 + armorBonus;
        this.resistance = Math.min(0.5, attrSTA * 0.004);
        this.evasion = Math.min(0.3, attrAGI * 0.0015);
        this.hpRegen = attrSTA * 0.1;
        // INT reduces cooldown (cap 40%)
        this.cooldownReduction = Math.min(0.4, attrINT * 0.003);
    }

    public double getMaxHpBonus() { return maxHpBonus; }
    public void setMaxHpBonus(double maxHpBonus) { this.maxHpBonus = maxHpBonus; }

    public void takeDamage(double amount) {
        if (invincibleTimer > 0) return;
        // Combine evasion (from AGI) and passive dodge (from class), multiplicative
        double totalDodge = 1 - (1 - evasion) * (1 - passiveDodge);
        if (totalDodge > 0 && Math.random() < totalDodge) return;

        double reduced = amount;
        if (newbieShieldTimer > 0) {
            reduced *= 0.5;
        }
        if (shieldActive) {
            shieldHits--;
            if (shieldHits <= 0) {
                shieldActive = false;
                // Reset shield cooldown so it recharges from full duration
                if (shieldRechargeTime > 0) {
                    shieldCooldown = shieldRechargeTime;
                }
            }
            return;
        }

        // Armor reduction
        reduced = reduced * (1 - armor / (armor + 100));

        // Resistance (magic defense from STA)
        reduced *= (1 - resistance);

        // Flat damage reduction from evolutions (e.g. titan)
        if (damageReduction > 0) {
            reduced *= (1 - damageReduction);
        }

        hp = Math.max(0, hp - reduced);
        if (hp <= 0) {
            alive = false;
        }

        furyActive = hp > 0 && hp < maxHp * 0.25;
    }

    /**
     * Environmental damage (storm) bypasses dodge, shield, and armor.
     * Only damageReduction (from class passive/evolutions) applies.
     */
    public void takeEnvironmentalDamage(double amount) {
        if (invincibleTimer > 0) return;
        double reduced = amount;
        if (damageReduction > 0) {
            reduced *= (1 - damageReduction);
        }
        hp = Math.max(0, hp - reduced);
        if (hp <= 0) {
            alive = false;
        }
        furyActive = hp > 0 && hp < maxHp * 0.25;
    }

    public void heal(double amount) {
        hp = Math.min(maxHp, hp + amount);
    }

    public void addKill() {
        kills++;
        killStreak++;
        killStreakTimer = 2.0;

        if (killStreak >= 10) killMultiplier = 1.8;
        else if (killStreak >= 5) killMultiplier = 1.5;
        else if (killStreak >= 3) killMultiplier = 1.2;
        else killMultiplier = 1.0;

        ultimateCharge = Math.min(ultimateMaxCharge, ultimateCharge + 5);
        if (ultimateCharge >= ultimateMaxCharge) {
            ultimateReady = true;
        }
    }

    public void addXP(double amount) {
        // Leaders (above avg level) don't benefit from kill streak XP bonus
        double effectiveKillMult = leaderXpPenalty < 1.0 ? 1.0 : killMultiplier;
        xp += amount * effectiveKillMult * leaderXpPenalty;
    }

    public void setLeaderXpPenalty(double penalty) { this.leaderXpPenalty = penalty; }
    public double getLeaderXpPenalty() { return leaderXpPenalty; }

    public double getXPToNextLevel() {
        // Use data-driven xpToNext if set by XPLevelSystem
        if (xpToNext > 0) return xpToNext;
        // Fallback formula
        return 15 + level * 8 + Math.pow(level, 1.8) * 3;
    }

    public void setXpToNext(double xpToNext) {
        this.xpToNext = xpToNext;
    }

    public boolean canLevelUp() {
        return xp >= getXPToNextLevel();
    }

    public void levelUp() {
        xp -= getXPToNextLevel();
        level++;
        // Attribute growth per level applied by SkillSystem
    }

    public int getSkillLevel(String skillId) {
        Integer lv = skillLevels.get(skillId);
        return lv != null ? lv : 0;
    }

    public void addSkill(String skillId) {
        if (!ownedSkills.contains(skillId)) {
            ownedSkills.add(skillId);
            skillLevels.put(skillId, 1);
        } else {
            int cur = skillLevels.get(skillId);
            skillLevels.put(skillId, cur + 1);
        }
    }

    public void addEvolution(String evoId) {
        if (!evolvedSkills.contains(evoId)) {
            evolvedSkills.add(evoId);
        }
    }

    // Getters and setters
    public String getPlayerId() { return playerId; }
    public String getNickname() { return nickname; }
    public String getCharacterType() { return characterType; }
    public int getFactionId() { return factionId; }
    public boolean isBot() { return isBot; }
    public void convertToBot() { this.isBot = true; }
    public double getLastInputTime() { return lastInputTime; }
    public void setLastInputTime(double t) { this.lastInputTime = t; }

    public double getHp() { return hp; }
    public void setHp(double hp) { this.hp = hp; }
    public double getMaxHp() { return maxHp; }
    public void setMaxHp(double maxHp) { this.maxHp = maxHp; }
    public int getLevel() { return level; }
    public void setLevel(int level) { this.level = level; }
    public double getXp() { return xp; }
    public void setXp(double xp) { this.xp = xp; }
    public int getKills() { return kills; }
    public double getSpeed() { return speed; }
    public void setSpeed(double speed) { this.speed = speed; }
    public double getBaseSpeed() { return baseSpeed; }

    public double getAttackDamage() { return attackDamage; }
    public void setAttackDamage(double attackDamage) { this.attackDamage = attackDamage; }
    public double getBaseAttackDamage() { return baseAttackDamage; }
    public double getAttackCooldown() { return attackCooldown; }
    public void setAttackCooldown(double attackCooldown) { this.attackCooldown = attackCooldown; }
    public double getAttackTimer() { return attackTimer; }
    public void setAttackTimer(double attackTimer) { this.attackTimer = attackTimer; }
    public double getCritChance() { return critChance; }
    public void setCritChance(double critChance) { this.critChance = critChance; }
    public double getCritDamage() { return critDamage; }
    public double getArmor() { return armor; }
    public double getResistance() { return resistance; }
    public double getEvasion() { return evasion; }
    public double getHpRegen() { return hpRegen; }
    public void setHpRegen(double hpRegen) { this.hpRegen = hpRegen; }

    public int getAttrINT() { return attrINT; }
    public int getAttrSTR() { return attrSTR; }
    public int getAttrAGI() { return attrAGI; }
    public int getAttrSTA() { return attrSTA; }
    public void setAttrINT(int v) { this.attrINT = v; }
    public void setAttrSTR(int v) { this.attrSTR = v; }
    public void setAttrAGI(int v) { this.attrAGI = v; }
    public void setAttrSTA(int v) { this.attrSTA = v; }

    public List<String> getOwnedSkills() { return ownedSkills; }
    public Map<String, Integer> getSkillLevels() { return skillLevels; }
    public List<String> getEvolvedSkills() { return evolvedSkills; }
    public List<String> getSelectedBuild() { return selectedBuild; }
    public void setSelectedBuild(List<String> selectedBuild) { this.selectedBuild = selectedBuild; }

    public int getProjectileCount() { return projectileCount; }
    public void setProjectileCount(int projectileCount) { this.projectileCount = projectileCount; }
    public boolean isPierce() { return pierce; }
    public void setPierce(boolean pierce) { this.pierce = pierce; }
    public int getChainCount() { return chainCount; }
    public void setChainCount(int chainCount) { this.chainCount = chainCount; }
    public double getExplosiveDmg() { return explosiveDmg; }
    public void setExplosiveDmg(double explosiveDmg) { this.explosiveDmg = explosiveDmg; }
    public int getOrbitCount() { return orbitCount; }
    public void setOrbitCount(int orbitCount) { this.orbitCount = orbitCount; }
    public double getThornsDmg() { return thornsDmg; }
    public void setThornsDmg(double thornsDmg) { this.thornsDmg = thornsDmg; }
    public double getMagnetRange() { return magnetRange; }
    public void setMagnetRange(double magnetRange) { this.magnetRange = magnetRange; }
    public double getSlowAura() { return slowAura; }
    public void setSlowAura(double slowAura) { this.slowAura = slowAura; }
    public double getTimeWarp() { return timeWarp; }
    public void setTimeWarp(double timeWarp) { this.timeWarp = timeWarp; }
    public double getFireTrailDmg() { return fireTrailDmg; }
    public void setFireTrailDmg(double fireTrailDmg) { this.fireTrailDmg = fireTrailDmg; }
    public double getLifestealRate() { return lifestealRate; }
    public void setLifestealRate(double lifestealRate) { this.lifestealRate = lifestealRate; }

    public boolean isShieldActive() { return shieldActive; }
    public void setShieldActive(boolean shieldActive) { this.shieldActive = shieldActive; }
    public int getShieldHits() { return shieldHits; }
    public void setShieldHits(int shieldHits) { this.shieldHits = shieldHits; }
    public double getShieldTimer() { return shieldTimer; }
    public void setShieldTimer(double shieldTimer) { this.shieldTimer = shieldTimer; }
    public double getShieldCooldown() { return shieldCooldown; }
    public void setShieldCooldown(double shieldCooldown) { this.shieldCooldown = shieldCooldown; }
    public double getInvincibleTimer() { return invincibleTimer; }
    public void setInvincibleTimer(double invincibleTimer) { this.invincibleTimer = invincibleTimer; }
    public double getMeleeIFrameTimer() { return meleeIFrameTimer; }
    public void setMeleeIFrameTimer(double meleeIFrameTimer) { this.meleeIFrameTimer = meleeIFrameTimer; }
    public double getNewbieShieldTimer() { return newbieShieldTimer; }
    public void setNewbieShieldTimer(double newbieShieldTimer) { this.newbieShieldTimer = newbieShieldTimer; }

    public boolean isFuryActive() { return furyActive; }
    public void setFuryActive(boolean furyActive) { this.furyActive = furyActive; }

    public double getMoveInputX() { return moveInputX; }
    public void setMoveInputX(double moveInputX) { this.moveInputX = moveInputX; }
    public double getMoveInputY() { return moveInputY; }
    public void setMoveInputY(double moveInputY) { this.moveInputY = moveInputY; }
    public double getTargetX() { return targetX; }
    public void setTargetX(double targetX) { this.targetX = targetX; }
    public double getTargetY() { return targetY; }
    public void setTargetY(double targetY) { this.targetY = targetY; }

    public double getFacingAngle() { return facingAngle; }
    public void setFacingAngle(double facingAngle) { this.facingAngle = facingAngle; }

    public double getUltimateCharge() { return ultimateCharge; }
    public void setUltimateCharge(double ultimateCharge) { this.ultimateCharge = ultimateCharge; }
    public boolean isUltimateReady() { return ultimateReady; }
    public void setUltimateReady(boolean ultimateReady) { this.ultimateReady = ultimateReady; }

    public double getDodgeTimer() { return dodgeTimer; }
    public void setDodgeTimer(double dodgeTimer) { this.dodgeTimer = dodgeTimer; }
    public double getDodgeCooldown() { return dodgeCooldown; }
    public void setDodgeCooldown(double dodgeCooldown) { this.dodgeCooldown = dodgeCooldown; }
    public boolean isDodging() { return dodgeTimer > 0; }

    public double getSurvivalTime() { return survivalTime; }
    public void setSurvivalTime(double survivalTime) { this.survivalTime = survivalTime; }
    public double getLastBotLevelUpTime() { return lastBotLevelUpTime; }
    public void setLastBotLevelUpTime(double lastBotLevelUpTime) { this.lastBotLevelUpTime = lastBotLevelUpTime; }

    public int getKillStreak() { return killStreak; }
    public void setKillStreak(int killStreak) { this.killStreak = killStreak; }
    public double getKillStreakTimer() { return killStreakTimer; }
    public void setKillStreakTimer(double killStreakTimer) { this.killStreakTimer = killStreakTimer; }
    public double getKillMultiplier() { return killMultiplier; }

    public double getArmorBonus() { return armorBonus; }
    public void setArmorBonus(double armorBonus) { this.armorBonus = armorBonus; }
    public double getDamageReduction() { return damageReduction; }
    public void setDamageReduction(double damageReduction) { this.damageReduction = damageReduction; }

    public double getDefaultRange() { return defaultRange; }
    public void setDefaultRange(double defaultRange) { this.defaultRange = defaultRange; }
    public double getDefaultAngle() { return defaultAngle; }
    public void setDefaultAngle(double defaultAngle) { this.defaultAngle = defaultAngle; }
    public double getDefaultProjSpeed() { return defaultProjSpeed; }
    public void setDefaultProjSpeed(double defaultProjSpeed) { this.defaultProjSpeed = defaultProjSpeed; }
    public String getDefaultProjType() { return defaultProjType; }
    public void setDefaultProjType(String defaultProjType) { this.defaultProjType = defaultProjType; }
    public String getDefaultVisual() { return defaultVisual; }
    public void setDefaultVisual(String defaultVisual) { this.defaultVisual = defaultVisual; }

    public double getPassiveDodge() { return passiveDodge; }
    public void setPassiveDodge(double passiveDodge) { this.passiveDodge = passiveDodge; }
    public double getRangeBonus() { return rangeBonus; }
    public void setRangeBonus(double rangeBonus) { this.rangeBonus = rangeBonus; }

    public double getCooldownReduction() { return cooldownReduction; }
    public double getShieldRechargeTime() { return shieldRechargeTime; }
    public void setShieldRechargeTime(double shieldRechargeTime) { this.shieldRechargeTime = shieldRechargeTime; }

    public double getBaseThornsDmg() { return baseThornsDmg; }
    public void setBaseThornsDmg(double baseThornsDmg) { this.baseThornsDmg = baseThornsDmg; }
    public double getPullRadius() { return pullRadius; }
    public void setPullRadius(double pullRadius) { this.pullRadius = pullRadius; }
    public double getOrbitDmgMultiplier() { return orbitDmgMultiplier; }
    public void setOrbitDmgMultiplier(double orbitDmgMultiplier) { this.orbitDmgMultiplier = orbitDmgMultiplier; }
}
