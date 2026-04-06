package com.kingofsurvive.engine.data;

import java.util.Map;

public class MonsterData {
    private String type;
    private String name;
    private double baseHP;
    private double baseATK;
    private double baseSpeed;
    private double baseXP;
    private double radius;
    private String color;
    private Map<String, Double> levelScaling; // hp, atk, speed, xp
    private Map<String, Object> special; // optional special properties

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getBaseHP() { return baseHP; }
    public void setBaseHP(double baseHP) { this.baseHP = baseHP; }
    public double getBaseATK() { return baseATK; }
    public void setBaseATK(double baseATK) { this.baseATK = baseATK; }
    public double getBaseSpeed() { return baseSpeed; }
    public void setBaseSpeed(double baseSpeed) { this.baseSpeed = baseSpeed; }
    public double getBaseXP() { return baseXP; }
    public void setBaseXP(double baseXP) { this.baseXP = baseXP; }
    public double getRadius() { return radius; }
    public void setRadius(double radius) { this.radius = radius; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public Map<String, Double> getLevelScaling() { return levelScaling; }
    public void setLevelScaling(Map<String, Double> levelScaling) { this.levelScaling = levelScaling; }
    public Map<String, Object> getSpecial() { return special; }
    public void setSpecial(Map<String, Object> special) { this.special = special; }

    public double getScaledHP(int wave) {
        double scale = 1.0 + wave * levelScaling.getOrDefault("hp", 0.15);
        return baseHP * scale;
    }

    public double getScaledATK(int wave) {
        double scale = 1.0 + wave * levelScaling.getOrDefault("atk", 0.1);
        return baseATK * scale;
    }

    public double getScaledSpeed(int wave) {
        double scale = 1.0 + wave * levelScaling.getOrDefault("speed", 0.02);
        return baseSpeed * scale;
    }

    public double getScaledXP(int wave) {
        double scale = 1.0 + wave * levelScaling.getOrDefault("xp", 0.05);
        return baseXP * scale;
    }
}
