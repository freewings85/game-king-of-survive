package com.kingofsurvive.engine.data;

import java.util.List;
import java.util.Map;

public class EvolutionData {
    private String id;
    private String name;
    private List<String> evolveFrom; // two skill IDs required
    private String description;
    private Map<String, Double> bonusEffect;
    private String icon;
    private String color;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<String> getEvolveFrom() { return evolveFrom; }
    public void setEvolveFrom(List<String> evolveFrom) { this.evolveFrom = evolveFrom; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Map<String, Double> getBonusEffect() { return bonusEffect; }
    public void setBonusEffect(Map<String, Double> bonusEffect) { this.bonusEffect = bonusEffect; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
