package com.kingofsurvive.engine.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MapData {
    private String id;
    private String name;
    private int width;
    private int height;
    private String shape;
    private String requiredRank;
    private String color;
    private List<MapZone> zones;
    private List<SpawnPoint> spawnPoints;
    private List<Object> obstacles; // from map editor, currently unused

    // Spawn settings (from map editor)
    private int initialDensity = 12;
    private double spawnMinDist = 180;
    private double spawnMaxDist = 320;
    private double trickleInterval = 1.2;
    private double trickleMin = 0.6;
    private int waveBaseCount = 8;
    private double waveIntervalEarly = 18;
    private double waveIntervalMid = 16;
    private double waveIntervalLate = 12;

    // Data-driven spawn configuration (LoL-style)
    private int bossEvery = 5;
    private double eliteAffixChance = 0.2;
    private Map<String, Double> trickleComposition; // type -> probability
    private List<WaveComposition> waveComposition; // wave thresholds
    private AmbushConfig ambush;
    private List<SpawnCamp> spawnCamps;
    private TrickleConfig trickle;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WaveComposition {
        private int minWave;
        private Map<String, Double> types; // type -> probability

        public int getMinWave() { return minWave; }
        public void setMinWave(int minWave) { this.minWave = minWave; }
        public Map<String, Double> getTypes() { return types; }
        public void setTypes(Map<String, Double> types) { this.types = types; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AmbushConfig {
        private boolean enabled = true;
        private double interval = 20;
        private double chance = 0.25;
        private String monsterType = "fast";
        private int monsterCount = 3;
        private double spawnMinDist = 80;
        private double spawnMaxDist = 150;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public double getInterval() { return interval; }
        public void setInterval(double interval) { this.interval = interval; }
        public double getChance() { return chance; }
        public void setChance(double chance) { this.chance = chance; }
        public String getMonsterType() { return monsterType; }
        public void setMonsterType(String monsterType) { this.monsterType = monsterType; }
        public int getMonsterCount() { return monsterCount; }
        public void setMonsterCount(int monsterCount) { this.monsterCount = monsterCount; }
        public double getSpawnMinDist() { return spawnMinDist; }
        public void setSpawnMinDist(double spawnMinDist) { this.spawnMinDist = spawnMinDist; }
        public double getSpawnMaxDist() { return spawnMaxDist; }
        public void setSpawnMaxDist(double spawnMaxDist) { this.spawnMaxDist = spawnMaxDist; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SpawnCamp {
        private String id;
        private String name;
        private double x;
        private double y;
        private double radius = 60;
        private List<CampMonster> monsters;
        private double firstSpawnTime = 5;
        private double respawnCooldown = 15;
        private int maxRespawns = -1; // -1 = infinite

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public double getX() { return x; }
        public void setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
        public double getRadius() { return radius; }
        public void setRadius(double radius) { this.radius = radius; }
        public List<CampMonster> getMonsters() { return monsters; }
        public void setMonsters(List<CampMonster> monsters) { this.monsters = monsters; }
        public double getFirstSpawnTime() { return firstSpawnTime; }
        public void setFirstSpawnTime(double firstSpawnTime) { this.firstSpawnTime = firstSpawnTime; }
        public double getRespawnCooldown() { return respawnCooldown; }
        public void setRespawnCooldown(double respawnCooldown) { this.respawnCooldown = respawnCooldown; }
        public int getMaxRespawns() { return maxRespawns; }
        public void setMaxRespawns(int maxRespawns) { this.maxRespawns = maxRespawns; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CampMonster {
        private String type;
        private int count = 1;

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TrickleConfig {
        private double earlyBoostDuration = 20;
        private double earlyBoostInterval = 0.4;
        private int earlyBoostCount = 2;
        private Map<String, Double> composition; // type -> probability

        public double getEarlyBoostDuration() { return earlyBoostDuration; }
        public void setEarlyBoostDuration(double d) { this.earlyBoostDuration = d; }
        public double getEarlyBoostInterval() { return earlyBoostInterval; }
        public void setEarlyBoostInterval(double i) { this.earlyBoostInterval = i; }
        public int getEarlyBoostCount() { return earlyBoostCount; }
        public void setEarlyBoostCount(int c) { this.earlyBoostCount = c; }
        public Map<String, Double> getComposition() { return composition; }
        public void setComposition(Map<String, Double> composition) { this.composition = composition; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MapZone {
        private String id;
        private String name;
        private String type; // "spawn", "outer", "middle", "inner", "boss_lair", "resource"
        private String shape; // "circle" or "rect"
        private Map<String, Double> center; // for circle: { x, y }
        private double radius; // for circle
        private Map<String, Double> bounds; // for rect: { x, y, width, height }
        private List<Integer> monsterLevelRange; // [min, max]
        private List<Integer> monsterLevel; // legacy alias
        private double spawnRate;
        private List<String> allowedMonsters; // ["normal", "fast", "tank", ...]
        private List<String> loot; // for resource zones: ["gold_chest", "xp_fountain"]
        // Boss zone config
        private String bossType;
        private double bossSpawnTime;
        private double bossRespawnCooldown;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getShape() { return shape; }
        public void setShape(String shape) { this.shape = shape; }
        public Map<String, Double> getCenter() { return center; }
        public void setCenter(Map<String, Double> center) { this.center = center; }
        public double getRadius() { return radius; }
        public void setRadius(double radius) { this.radius = radius; }
        public Map<String, Double> getBounds() { return bounds; }
        public void setBounds(Map<String, Double> bounds) { this.bounds = bounds; }
        public List<Integer> getMonsterLevelRange() {
            return monsterLevelRange != null ? monsterLevelRange : monsterLevel;
        }
        public void setMonsterLevelRange(List<Integer> monsterLevelRange) { this.monsterLevelRange = monsterLevelRange; }
        public List<Integer> getMonsterLevel() { return monsterLevel; }
        public void setMonsterLevel(List<Integer> monsterLevel) { this.monsterLevel = monsterLevel; }
        public double getSpawnRate() { return spawnRate; }
        public void setSpawnRate(double spawnRate) { this.spawnRate = spawnRate; }
        public List<String> getAllowedMonsters() { return allowedMonsters; }
        public void setAllowedMonsters(List<String> allowedMonsters) { this.allowedMonsters = allowedMonsters; }
        public List<String> getLoot() { return loot; }
        public void setLoot(List<String> loot) { this.loot = loot; }
        public String getBossType() { return bossType; }
        public void setBossType(String bossType) { this.bossType = bossType; }
        public double getBossSpawnTime() { return bossSpawnTime; }
        public void setBossSpawnTime(double bossSpawnTime) { this.bossSpawnTime = bossSpawnTime; }
        public double getBossRespawnCooldown() { return bossRespawnCooldown; }
        public void setBossRespawnCooldown(double bossRespawnCooldown) { this.bossRespawnCooldown = bossRespawnCooldown; }

        /** Check if a point (x,y) is inside this zone */
        public boolean contains(double x, double y) {
            if ("circle".equals(shape) && center != null) {
                double dx = x - center.getOrDefault("x", 0.0);
                double dy = y - center.getOrDefault("y", 0.0);
                return dx * dx + dy * dy <= radius * radius;
            } else if (bounds != null) {
                double bx = bounds.getOrDefault("x", 0.0);
                double by = bounds.getOrDefault("y", 0.0);
                double bw = bounds.getOrDefault("width", 0.0);
                double bh = bounds.getOrDefault("height", 0.0);
                return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
            }
            return false;
        }

        /** Get a random position inside this zone */
        public double[] randomPosition() {
            if ("circle".equals(shape) && center != null) {
                double angle = Math.random() * Math.PI * 2;
                double dist = Math.random() * radius;
                return new double[]{
                    center.getOrDefault("x", 0.0) + Math.cos(angle) * dist,
                    center.getOrDefault("y", 0.0) + Math.sin(angle) * dist
                };
            } else if (bounds != null) {
                return new double[]{
                    bounds.getOrDefault("x", 0.0) + Math.random() * bounds.getOrDefault("width", 100.0),
                    bounds.getOrDefault("y", 0.0) + Math.random() * bounds.getOrDefault("height", 100.0)
                };
            }
            return new double[]{0, 0};
        }
    }

    public static class SpawnPoint {
        private double x;
        private double y;

        public double getX() { return x; }
        public void setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getWidth() { return width; }
    public void setWidth(int width) { this.width = width; }
    public int getHeight() { return height; }
    public void setHeight(int height) { this.height = height; }
    public String getShape() { return shape; }
    public void setShape(String shape) { this.shape = shape; }
    public String getRequiredRank() { return requiredRank; }
    public void setRequiredRank(String requiredRank) { this.requiredRank = requiredRank; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public List<MapZone> getZones() { return zones; }
    public void setZones(List<MapZone> zones) { this.zones = zones; }
    public List<SpawnPoint> getSpawnPoints() { return spawnPoints; }
    public void setSpawnPoints(List<SpawnPoint> spawnPoints) { this.spawnPoints = spawnPoints; }
    public List<Object> getObstacles() { return obstacles; }
    public void setObstacles(List<Object> obstacles) { this.obstacles = obstacles; }

    public int getInitialDensity() { return initialDensity; }
    public void setInitialDensity(int initialDensity) { this.initialDensity = initialDensity; }
    public double getSpawnMinDist() { return spawnMinDist; }
    public void setSpawnMinDist(double spawnMinDist) { this.spawnMinDist = spawnMinDist; }
    public double getSpawnMaxDist() { return spawnMaxDist; }
    public void setSpawnMaxDist(double spawnMaxDist) { this.spawnMaxDist = spawnMaxDist; }
    public double getTrickleInterval() { return trickleInterval; }
    public void setTrickleInterval(double trickleInterval) { this.trickleInterval = trickleInterval; }
    public double getTrickleMin() { return trickleMin; }
    public void setTrickleMin(double trickleMin) { this.trickleMin = trickleMin; }
    public int getWaveBaseCount() { return waveBaseCount; }
    public void setWaveBaseCount(int waveBaseCount) { this.waveBaseCount = waveBaseCount; }
    public double getWaveIntervalEarly() { return waveIntervalEarly; }
    public void setWaveIntervalEarly(double waveIntervalEarly) { this.waveIntervalEarly = waveIntervalEarly; }
    public double getWaveIntervalMid() { return waveIntervalMid; }
    public void setWaveIntervalMid(double waveIntervalMid) { this.waveIntervalMid = waveIntervalMid; }
    public double getWaveIntervalLate() { return waveIntervalLate; }
    public void setWaveIntervalLate(double waveIntervalLate) { this.waveIntervalLate = waveIntervalLate; }

    public double getWaveInterval(int wave) {
        if (wave <= 3) return waveIntervalEarly;
        if (wave <= 6) return waveIntervalMid;
        return waveIntervalLate;
    }

    public int getBossEvery() { return bossEvery; }
    public void setBossEvery(int bossEvery) { this.bossEvery = bossEvery; }
    public double getEliteAffixChance() { return eliteAffixChance; }
    public void setEliteAffixChance(double eliteAffixChance) { this.eliteAffixChance = eliteAffixChance; }
    public Map<String, Double> getTrickleComposition() { return trickleComposition; }
    public void setTrickleComposition(Map<String, Double> trickleComposition) { this.trickleComposition = trickleComposition; }
    public List<WaveComposition> getWaveComposition() { return waveComposition; }
    public void setWaveComposition(List<WaveComposition> waveComposition) { this.waveComposition = waveComposition; }
    public AmbushConfig getAmbush() { return ambush; }
    public void setAmbush(AmbushConfig ambush) { this.ambush = ambush; }
    public List<SpawnCamp> getSpawnCamps() { return spawnCamps; }
    public void setSpawnCamps(List<SpawnCamp> spawnCamps) { this.spawnCamps = spawnCamps; }
    public TrickleConfig getTrickle() { return trickle; }
    public void setTrickle(TrickleConfig trickle) { this.trickle = trickle; }
}
