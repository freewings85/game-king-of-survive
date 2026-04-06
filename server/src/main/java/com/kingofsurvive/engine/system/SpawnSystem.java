package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.data.MapData;
import com.kingofsurvive.engine.data.MonsterData;
import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.Vec2;
import com.kingofsurvive.engine.net.GameEvent;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SpawnSystem {
    private static final int MAX_ENEMIES = 35;

    private Map<String, MonsterData> monsterDefs;
    private double trickleTimer;
    private double waveTimer;
    private int currentWave;
    private double ambushTimer;
    private double lastGameTime;

    // Spawn camp runtime state
    private Map<String, CampState> campStates = new HashMap<>();

    private List<GameEvent> pendingEvents = new ArrayList<>();

    public SpawnSystem(Map<String, MonsterData> monsterDefs) {
        this.monsterDefs = monsterDefs;
        this.trickleTimer = 0;
        this.waveTimer = 0;
        this.currentWave = 0;
        this.ambushTimer = 0;
    }

    public List<GameEvent> getPendingEvents() {
        List<GameEvent> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    public int getCurrentWave() {
        return currentWave;
    }

    public void spawnInitial(List<EnemyEntity> enemies, List<PlayerEntity> players,
                             MapData map) {
        currentWave = 1;
        int initialCount = map.getInitialDensity();

        // Spawn initial enemies around players
        for (int i = 0; i < initialCount; i++) {
            PlayerEntity nearPlayer = players.get((int) (Math.random() * players.size()));
            Vec2 pos = randomPositionAround(nearPlayer.getPosition(),
                    map.getSpawnMinDist(), map.getSpawnMaxDist(), map.getWidth(), map.getHeight());
            enemies.add(createEnemy("normal", pos.x, pos.y, 1));
        }

        // Wave 1 bonus - 3 extras for immediate action
        for (int i = 0; i < 3; i++) {
            Vec2 bonusPos = randomEdgePosition(map.getWidth(), map.getHeight());
            enemies.add(createEnemy("normal", bonusPos.x, bonusPos.y, 1));
        }

        // Initialize spawn camp states
        if (map.getSpawnCamps() != null) {
            for (MapData.SpawnCamp camp : map.getSpawnCamps()) {
                campStates.put(camp.getId(), new CampState());
            }
        }
    }

    // Storm state for spawning inside safe zone
    private boolean stormActive;
    private double stormCenterX;
    private double stormCenterY;
    private double stormRadius;

    public void setStormState(boolean active, double centerX, double centerY, double radius) {
        this.stormActive = active;
        this.stormCenterX = centerX;
        this.stormCenterY = centerY;
        this.stormRadius = radius;
    }

    public void update(List<EnemyEntity> enemies, List<PlayerEntity> players,
                       MapData map, double gameTime, double dt) {
        this.lastGameTime = gameTime;

        // --- Trickle spawning ---
        updateTrickle(enemies, players, map, gameTime, dt);

        // --- Wave progression ---
        updateWaves(enemies, map, dt);

        // --- Ambush spawning (data-driven) ---
        updateAmbush(enemies, players, map, gameTime, dt);

        // --- Spawn camps (LoL-style) ---
        updateCamps(enemies, map, gameTime, dt);

        // Remove excess enemies
        if (enemies.size() > MAX_ENEMIES) {
            enemies.removeIf(e -> !e.isAlive());
        }
    }

    private void updateTrickle(List<EnemyEntity> enemies, List<PlayerEntity> players,
                                MapData map, double gameTime, double dt) {
        trickleTimer += dt;

        // Use trickle config if available
        MapData.TrickleConfig trickleConf = map.getTrickle();
        double earlyBoostDuration = trickleConf != null ? trickleConf.getEarlyBoostDuration() : 20;
        double earlyBoostInterval = trickleConf != null ? trickleConf.getEarlyBoostInterval() : 0.4;
        int earlyBoostCount = trickleConf != null ? trickleConf.getEarlyBoostCount() : 2;

        double trickleInterval = gameTime < earlyBoostDuration
                ? earlyBoostInterval
                : Math.max(map.getTrickleMin(), map.getTrickleInterval() - currentWave * 0.15);

        // Minimum enemy floor
        int alivePlayerCount = 0;
        for (PlayerEntity p : players) { if (p.isAlive()) alivePlayerCount++; }
        int minEnemyFloor = Math.max(5, alivePlayerCount * 2);
        boolean emergencySpawn = enemies.size() < minEnemyFloor && gameTime > 5;

        if ((trickleTimer >= trickleInterval || emergencySpawn) && enemies.size() < MAX_ENEMIES) {
            trickleTimer = 0;
            int trickleCount = gameTime < earlyBoostDuration ? earlyBoostCount
                    : (gameTime < 30 ? 2 : (gameTime < 50 ? 3 : 1));
            if (emergencySpawn) trickleCount = Math.max(trickleCount, 4);
            for (int i = 0; i < trickleCount && enemies.size() < MAX_ENEMIES; i++) {
                // Zone-aware spawning: pick a zone weighted by spawnRate
                MapData.MapZone zone = selectSpawnZone(map);
                Vec2 pos;
                String type;
                if (zone != null) {
                    double[] zp = zone.randomPosition();
                    pos = new Vec2(
                        Math.max(0, Math.min(map.getWidth(), zp[0])),
                        Math.max(0, Math.min(map.getHeight(), zp[1]))
                    );
                    type = selectZoneMonsterType(zone, map, currentWave);
                } else if (stormActive && stormRadius > 50) {
                    double angle = Math.random() * Math.PI * 2;
                    double dist = stormRadius * (0.6 + Math.random() * 0.35);
                    pos = new Vec2(
                        Math.max(0, Math.min(map.getWidth(), stormCenterX + Math.cos(angle) * dist)),
                        Math.max(0, Math.min(map.getHeight(), stormCenterY + Math.sin(angle) * dist))
                    );
                    type = selectTrickleType(map, currentWave);
                } else {
                    pos = randomEdgePosition(map.getWidth(), map.getHeight());
                    type = selectTrickleType(map, currentWave);
                }
                enemies.add(createEnemy(type, pos.x, pos.y, currentWave));
            }
        }
    }

    /**
     * Select a zone for spawning, weighted by spawnRate.
     * Excludes boss_lair zones (they have special trigger-based spawning).
     */
    private MapData.MapZone selectSpawnZone(MapData map) {
        if (map.getZones() == null || map.getZones().isEmpty()) return null;
        List<MapData.MapZone> candidates = new ArrayList<>();
        double totalWeight = 0;
        for (MapData.MapZone z : map.getZones()) {
            if ("boss_lair".equals(z.getType())) continue; // Boss zones don't trickle spawn
            if (z.getSpawnRate() <= 0) continue;
            candidates.add(z);
            totalWeight += z.getSpawnRate();
        }
        if (candidates.isEmpty() || totalWeight <= 0) return null;
        double r = Math.random() * totalWeight;
        double cum = 0;
        for (MapData.MapZone z : candidates) {
            cum += z.getSpawnRate();
            if (r <= cum) return z;
        }
        return candidates.get(candidates.size() - 1);
    }

    /**
     * Select a monster type appropriate for the zone's allowedMonsters list.
     */
    private String selectZoneMonsterType(MapData.MapZone zone, MapData map, int wave) {
        List<String> allowed = zone.getAllowedMonsters();
        if (allowed == null || allowed.isEmpty()) {
            return selectTrickleType(map, wave);
        }
        // Simple uniform random from allowed types
        return allowed.get((int) (Math.random() * allowed.size()));
    }

    private void updateWaves(List<EnemyEntity> enemies, MapData map, double dt) {
        waveTimer += dt;
        double waveInterval = map.getWaveInterval(currentWave);
        if (waveTimer >= waveInterval) {
            waveTimer = 0;
            currentWave++;
            spawnWave(enemies, map);
            pendingEvents.add(GameEvent.waveStart(currentWave));
        }
    }

    private void updateAmbush(List<EnemyEntity> enemies, List<PlayerEntity> players,
                               MapData map, double gameTime, double dt) {
        MapData.AmbushConfig ambushConf = map.getAmbush();
        double interval = ambushConf != null ? ambushConf.getInterval() : 20;
        double chance = ambushConf != null ? ambushConf.getChance() : 0.25;
        boolean enabled = ambushConf == null || ambushConf.isEnabled();
        String monsterType = ambushConf != null ? ambushConf.getMonsterType() : "fast";
        int count = ambushConf != null ? ambushConf.getMonsterCount() : 3;
        double minDist = ambushConf != null ? ambushConf.getSpawnMinDist() : 80;
        double maxDist = ambushConf != null ? ambushConf.getSpawnMaxDist() : 150;

        ambushTimer += dt;
        if (enabled && ambushTimer >= interval) {
            ambushTimer = 0;
            if (Math.random() < chance && !players.isEmpty()) {
                PlayerEntity target = players.get((int) (Math.random() * players.size()));
                if (target.isAlive()) {
                    for (int i = 0; i < count; i++) {
                        Vec2 pos = randomPositionAround(target.getPosition(),
                                minDist, maxDist, map.getWidth(), map.getHeight());
                        enemies.add(createEnemy(monsterType, pos.x, pos.y, currentWave));
                    }
                }
            }
        }
    }

    private void updateCamps(List<EnemyEntity> enemies, MapData map, double gameTime, double dt) {
        if (map.getSpawnCamps() == null) return;

        for (MapData.SpawnCamp camp : map.getSpawnCamps()) {
            CampState state = campStates.get(camp.getId());
            if (state == null) {
                state = new CampState();
                campStates.put(camp.getId(), state);
            }

            // Not yet time for first spawn
            if (gameTime < camp.getFirstSpawnTime()) continue;

            // Check if we've hit max respawns
            if (camp.getMaxRespawns() > 0 && state.respawnCount >= camp.getMaxRespawns()) continue;

            // If camp has active monsters, check if they're all dead
            if (state.spawned && !state.allDead) {
                boolean anyAlive = false;
                for (EnemyEntity e : state.monsters) {
                    if (e.isAlive()) { anyAlive = true; break; }
                }
                if (!anyAlive) {
                    state.allDead = true;
                    state.deathTime = gameTime;
                }
                continue;
            }

            // If not spawned yet, or respawn cooldown elapsed
            boolean shouldSpawn = false;
            if (!state.spawned) {
                shouldSpawn = true;
            } else if (state.allDead && camp.getRespawnCooldown() > 0) {
                shouldSpawn = (gameTime - state.deathTime) >= camp.getRespawnCooldown();
            }

            if (shouldSpawn && enemies.size() < MAX_ENEMIES && camp.getMonsters() != null) {
                state.monsters.clear();
                for (MapData.CampMonster cm : camp.getMonsters()) {
                    for (int i = 0; i < cm.getCount(); i++) {
                        double angle = Math.random() * Math.PI * 2;
                        double dist = Math.random() * camp.getRadius();
                        double ex = Math.max(0, Math.min(map.getWidth(), camp.getX() + Math.cos(angle) * dist));
                        double ey = Math.max(0, Math.min(map.getHeight(), camp.getY() + Math.sin(angle) * dist));
                        EnemyEntity enemy = createEnemy(cm.getType(), ex, ey, currentWave);
                        enemies.add(enemy);
                        state.monsters.add(enemy);
                    }
                }
                state.spawned = true;
                state.allDead = false;
                state.respawnCount++;
            }
        }
    }

    private void spawnWave(List<EnemyEntity> enemies, MapData map) {
        int count = Math.min(map.getWaveBaseCount() + (currentWave - 1) * 2,
                MAX_ENEMIES - enemies.size());
        if (count <= 0) return;

        double eliteChance = map.getEliteAffixChance();

        for (int i = 0; i < count; i++) {
            // Zone-aware wave spawning
            MapData.MapZone zone = selectSpawnZone(map);
            Vec2 pos;
            String type;
            if (zone != null) {
                double[] zp = zone.randomPosition();
                pos = new Vec2(
                    Math.max(0, Math.min(map.getWidth(), zp[0])),
                    Math.max(0, Math.min(map.getHeight(), zp[1]))
                );
                type = selectZoneMonsterType(zone, map, currentWave);
            } else {
                pos = randomEdgePosition(map.getWidth(), map.getHeight());
                type = selectWaveType(map, currentWave, i, count);
            }
            EnemyEntity enemy = createEnemy(type, pos.x, pos.y, currentWave);

            // Elite affix
            if (!"boss".equals(type) && !"miniBoss".equals(type) && Math.random() < eliteChance) {
                applyEliteAffix(enemy);
            }

            enemies.add(enemy);
        }

        // Boss wave
        int bossEvery = map.getBossEvery();
        if (bossEvery > 0 && currentWave % bossEvery == 0) {
            Vec2 pos = randomEdgePosition(map.getWidth(), map.getHeight());
            enemies.add(createEnemy("boss", pos.x, pos.y, currentWave));
        }
    }

    /**
     * Select wave monster type using map data composition if available,
     * falling back to hardcoded logic.
     */
    private String selectWaveType(MapData map, int wave, int index, int total) {
        // Try data-driven composition
        if (map.getWaveComposition() != null && !map.getWaveComposition().isEmpty()) {
            // Find the highest minWave that's <= current wave
            MapData.WaveComposition comp = null;
            for (MapData.WaveComposition wc : map.getWaveComposition()) {
                if (wc.getMinWave() <= wave) {
                    comp = wc;
                }
            }
            if (comp != null && comp.getTypes() != null) {
                return weightedRandomSelect(comp.getTypes());
            }
        }

        // Fallback: original hardcoded logic
        double ratio = (double) index / total;
        if (wave >= 8 && ratio > 0.9) return "miniBoss";
        if (wave >= 5 && ratio > 0.8) return "tank";
        if (wave >= 3 && ratio > 0.6) return "fast";
        if (wave >= 4 && ratio > 0.7) return "ranged";
        if (wave >= 2 && ratio > 0.5) return "swarm";
        return "normal";
    }

    /**
     * Select trickle monster type using map data if available.
     */
    private String selectTrickleType(MapData map, int wave) {
        // Try map-level trickle composition
        Map<String, Double> composition = null;
        if (map.getTrickle() != null && map.getTrickle().getComposition() != null) {
            composition = map.getTrickle().getComposition();
        } else if (map.getTrickleComposition() != null) {
            composition = map.getTrickleComposition();
        }

        if (composition != null && !composition.isEmpty()) {
            return weightedRandomSelect(composition);
        }

        // Fallback: original hardcoded logic
        double r = Math.random();
        if (wave >= 4 && r < 0.1) return "ranged";
        if (wave >= 3 && r < 0.2) return "tank";
        if (wave >= 1 && r < 0.35) return "fast";
        if (r < 0.25) return "swarm";
        return "normal";
    }

    /**
     * Weighted random selection from a probability map.
     */
    private String weightedRandomSelect(Map<String, Double> weights) {
        double total = 0;
        for (double w : weights.values()) total += w;
        double r = Math.random() * total;
        double cumulative = 0;
        for (Map.Entry<String, Double> entry : weights.entrySet()) {
            cumulative += entry.getValue();
            if (r <= cumulative) return entry.getKey();
        }
        // Fallback to first key
        return weights.keySet().iterator().next();
    }

    private EnemyEntity createEnemy(String type, double x, double y, int wave) {
        MonsterData def = monsterDefs.get(type);
        if (def == null) {
            def = monsterDefs.get("normal");
        }

        double hp = def.getScaledHP(wave);
        double damage = def.getScaledATK(wave);
        double speed = def.getScaledSpeed(wave);
        double xpReward = def.getScaledXP(wave);
        double radius = def.getRadius();

        // Time-based scaling
        if (lastGameTime > 30) {
            double timeMultiplier = Math.min(1.4, Math.pow(1.25, (lastGameTime - 30) / 30.0));
            hp *= timeMultiplier;
            damage *= Math.min(timeMultiplier, 1.3);
            xpReward *= Math.pow(timeMultiplier, 0.2);
        }

        EnemyEntity enemy = new EnemyEntity(type, x, y, hp, damage, speed, xpReward, radius, wave);

        // Hostile flag: red-name enemies chase + shoot + melee, green-name give XP on touch
        // Green (passive): treasure only (rare reward mobs)
        // Red (hostile): normal, swarm, fast, tank, ranged, miniBoss, boss
        boolean hostile = true;
        switch (type) {
            case "treasure":
                hostile = false;
                break;
            default:
                hostile = true;
                break;
        }
        enemy.setHostile(hostile);

        // Ranged attack: only specific types shoot projectiles
        // normal/swarm are melee-only (they deal contact damage via CombatSystem)
        switch (type) {
            case "fast":
                enemy.setRangedAttack(true);
                enemy.setAttackRange(180);
                enemy.setRangedCooldown(1.8);
                break;
            case "tank":
                enemy.setRangedAttack(true);
                enemy.setAttackRange(150);
                enemy.setRangedCooldown(2.5);
                break;
            case "ranged":
                enemy.setRangedAttack(true);
                enemy.setAttackRange(300);
                enemy.setRangedCooldown(1.5);
                break;
            case "miniBoss":
                enemy.setRangedAttack(true);
                enemy.setAttackRange(250);
                enemy.setRangedCooldown(1.2);
                break;
            case "boss":
                enemy.setRangedAttack(true);
                enemy.setAttackRange(350);
                enemy.setRangedCooldown(0.8);
                break;
            default:
                break;
        }

        // Special properties (legacy — fleeFromPlayer for treasure)
        if (def.getSpecial() != null) {
            if (def.getSpecial().containsKey("fleeFromPlayer")) {
                enemy.setFleeFromPlayer(true);
                Object timer = def.getSpecial().get("escapeTimer");
                enemy.setEscapeTimer(timer instanceof Number ? ((Number) timer).doubleValue() : 8);
            }
        }

        return enemy;
    }

    private void applyEliteAffix(EnemyEntity enemy) {
        String[] affixes = {"burning", "frozen", "teleport", "splitting", "shielded"};
        String affix = affixes[(int) (Math.random() * affixes.length)];
        enemy.setAffix(affix);

        switch (affix) {
            case "burning":
                enemy.setHp(enemy.getHp() * 1.5);
                break;
            case "frozen":
                enemy.setSpeed(enemy.getSpeed() * 0.7);
                enemy.setDamage(enemy.getDamage() * 1.3);
                break;
            case "shielded":
                enemy.setHp(enemy.getHp() + 50);
                break;
        }
    }

    private Vec2 randomEdgePosition(double worldW, double worldH) {
        int side = (int) (Math.random() * 4);
        switch (side) {
            case 0: return new Vec2(Math.random() * worldW, -20);
            case 1: return new Vec2(Math.random() * worldW, worldH + 20);
            case 2: return new Vec2(-20, Math.random() * worldH);
            default: return new Vec2(worldW + 20, Math.random() * worldH);
        }
    }

    private Vec2 randomPositionAround(Vec2 center, double minDist, double maxDist,
                                       double worldW, double worldH) {
        double angle = Math.random() * Math.PI * 2;
        double dist = minDist + Math.random() * (maxDist - minDist);
        double x = Math.max(0, Math.min(worldW, center.x + Math.cos(angle) * dist));
        double y = Math.max(0, Math.min(worldH, center.y + Math.sin(angle) * dist));
        return new Vec2(x, y);
    }

    /**
     * Runtime state for a spawn camp.
     */
    private static class CampState {
        boolean spawned = false;
        boolean allDead = false;
        double deathTime = 0;
        int respawnCount = 0;
        List<EnemyEntity> monsters = new ArrayList<>();
    }
}
