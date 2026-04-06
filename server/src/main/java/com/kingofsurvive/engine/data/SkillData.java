package com.kingofsurvive.engine.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.HashMap;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SkillData {
    private Map<String, Map<String, Object>> levels;
    private String id;
    private String name;
    private String type; // "buff", "passive", "projectile", "aoe", "summon", "default_attack"
    private String damageType; // "none", "physical", "magic"
    private double baseDamage;
    private String scalingAttribute;
    private double scalingRatio;
    private double cooldown;
    private int maxLevel;
    private String icon;
    private String color;
    private String description;
    private Map<String, Double> levelScaling;
    private AttackPattern attackPattern;

    public static class AttackPattern {
        private double range;        // attack distance in px
        private double angle;        // arc width in radians
        private double projectileSpeed; // 0 = melee (instant), >0 = ranged
        private String projectileType;  // "melee_arc", "projectile"
        private String visual;          // rendering hint: "slash", "fireball", "arrow"

        public double getRange() { return range; }
        public void setRange(double range) { this.range = range; }
        public double getAngle() { return angle; }
        public void setAngle(double angle) { this.angle = angle; }
        public double getProjectileSpeed() { return projectileSpeed; }
        public void setProjectileSpeed(double projectileSpeed) { this.projectileSpeed = projectileSpeed; }
        public String getProjectileType() { return projectileType; }
        public void setProjectileType(String projectileType) { this.projectileType = projectileType; }
        public String getVisual() { return visual; }
        public void setVisual(String visual) { this.visual = visual; }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDamageType() { return damageType; }
    public void setDamageType(String damageType) { this.damageType = damageType; }
    public double getBaseDamage() { return baseDamage; }
    public void setBaseDamage(double baseDamage) { this.baseDamage = baseDamage; }
    public String getScalingAttribute() { return scalingAttribute; }
    public void setScalingAttribute(String scalingAttribute) { this.scalingAttribute = scalingAttribute; }
    public double getScalingRatio() { return scalingRatio; }
    public void setScalingRatio(double scalingRatio) { this.scalingRatio = scalingRatio; }
    public double getCooldown() { return cooldown; }
    public void setCooldown(double cooldown) { this.cooldown = cooldown; }
    public int getMaxLevel() { return maxLevel; }
    public void setMaxLevel(int maxLevel) { this.maxLevel = maxLevel; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Map<String, Double> getLevelScaling() { return levelScaling; }
    public void setLevelScaling(Map<String, Double> levelScaling) { this.levelScaling = levelScaling; }
    public AttackPattern getAttackPattern() { return attackPattern; }
    public void setAttackPattern(AttackPattern attackPattern) { this.attackPattern = attackPattern; }
    public Map<String, Map<String, Object>> getLevels() { return levels; }
    public void setLevels(Map<String, Map<String, Object>> levels) { this.levels = levels; }

    public Map<String, Double> getLevelData(int level) {
        if (levels == null) return null;
        Map<String, Object> raw = levels.get(String.valueOf(level));
        if (raw == null) return null;
        Map<String, Double> result = new HashMap<>();
        for (Map.Entry<String, Object> e : raw.entrySet()) {
            if (e.getValue() instanceof Number) {
                result.put(e.getKey(), ((Number) e.getValue()).doubleValue());
            }
        }
        return result;
    }
}
