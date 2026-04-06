package com.kingofsurvive.engine.data;

import java.util.List;
import java.util.Map;

public class ClassData {
    private String id;
    private String name;
    private String icon;
    private double baseHP;
    private double baseATK;
    private double baseSpeed;
    private Map<String, Integer> initialAttributes; // INT, STR, AGI, STA
    private Map<String, Double> growthCoefficients;
    private PassiveEffect passive;
    private String color;
    private String defaultSkill; // skill ID for the class's basic attack

    public static class PassiveEffect {
        private String name;
        private String description;
        private Map<String, Double> effect;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Map<String, Double> getEffect() { return effect; }
        public void setEffect(Map<String, Double> effect) { this.effect = effect; }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public double getBaseHP() { return baseHP; }
    public void setBaseHP(double baseHP) { this.baseHP = baseHP; }
    public double getBaseATK() { return baseATK; }
    public void setBaseATK(double baseATK) { this.baseATK = baseATK; }
    public double getBaseSpeed() { return baseSpeed; }
    public void setBaseSpeed(double baseSpeed) { this.baseSpeed = baseSpeed; }
    public Map<String, Integer> getInitialAttributes() { return initialAttributes; }
    public void setInitialAttributes(Map<String, Integer> initialAttributes) { this.initialAttributes = initialAttributes; }
    public Map<String, Double> getGrowthCoefficients() { return growthCoefficients; }
    public void setGrowthCoefficients(Map<String, Double> growthCoefficients) { this.growthCoefficients = growthCoefficients; }
    public PassiveEffect getPassive() { return passive; }
    public void setPassive(PassiveEffect passive) { this.passive = passive; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getDefaultSkill() { return defaultSkill; }
    public void setDefaultSkill(String defaultSkill) { this.defaultSkill = defaultSkill; }

    private List<String> availableSkills;
    public List<String> getAvailableSkills() { return availableSkills; }
    public void setAvailableSkills(List<String> availableSkills) { this.availableSkills = availableSkills; }

    private List<String> skins;
    public List<String> getSkins() { return skins; }
    public void setSkins(List<String> skins) { this.skins = skins; }
}
