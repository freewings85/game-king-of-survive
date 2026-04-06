package com.kingofsurvive.engine;

import com.kingofsurvive.engine.data.ClassData;
import com.kingofsurvive.engine.data.DataLoader;
import com.kingofsurvive.engine.data.MapData;
import com.kingofsurvive.engine.data.SkillData;
import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.ProjectileEntity;
import com.kingofsurvive.engine.net.GameEvent;
import com.kingofsurvive.engine.net.GameStateSnapshot;
import com.kingofsurvive.engine.net.PlayerInput;
import com.kingofsurvive.engine.system.*;

import java.util.*;

public class GameSimulation {
    private static final double DT = 1.0 / 30; // 30Hz

    private String matchId;
    private String gameMode; // "solo", "team"
    private List<PlayerEntity> players;
    private List<EnemyEntity> enemies;
    private List<ProjectileEntity> projectiles;
    private MapData mapData;
    private double gameTime;
    private long tickCount;
    private String state; // "playing", "victory_countdown", "finished"

    // Subsystems
    private MovementSystem movementSystem;
    private CombatSystem combatSystem;
    private SpawnSystem spawnSystem;
    private BotAISystem botAISystem;
    private EnemyAISystem enemyAISystem;
    private ProjectileSystem projectileSystem;
    private SkillSystem skillSystem;
    private StormSystem stormSystem;
    private VictorySystem victorySystem;
    private XPLevelSystem xpLevelSystem;

    private DataLoader dataLoader;

    // Per-player last acked input seq
    private Map<String, Long> lastAckedInputs;

    // Pending skill choices for human players (playerId -> list of choices)
    private Map<String, List<String>> pendingSkillChoices;

    public GameSimulation(String matchId, String gameMode, MapData mapData,
                          DataLoader dataLoader) {
        this.matchId = matchId;
        this.gameMode = gameMode;
        this.mapData = mapData;
        this.dataLoader = dataLoader;
        this.players = new ArrayList<>();
        this.enemies = new ArrayList<>();
        this.projectiles = new ArrayList<>();
        this.gameTime = 0;
        this.tickCount = 0;
        this.state = "playing";
        this.lastAckedInputs = new HashMap<>();
        this.pendingSkillChoices = new HashMap<>();

        // Initialize subsystems
        double worldW = mapData.getWidth();
        double worldH = mapData.getHeight();
        this.movementSystem = new MovementSystem(worldW, worldH);
        this.combatSystem = new CombatSystem();
        this.spawnSystem = new SpawnSystem(dataLoader.getMonsters());
        this.botAISystem = new BotAISystem();
        this.enemyAISystem = new EnemyAISystem();
        this.projectileSystem = new ProjectileSystem();
        this.skillSystem = new SkillSystem(dataLoader.getSkills());
        this.stormSystem = new StormSystem(worldW, worldH);
        this.victorySystem = new VictorySystem();
        this.xpLevelSystem = new XPLevelSystem(skillSystem);
        this.xpLevelSystem.setDataLoader(dataLoader);
    }

    /**
     * Add a player to the simulation. Call before the game starts.
     */
    public void addPlayer(String playerId, String nickname, String characterType,
                          int factionId, boolean isBot, DataLoader dataLoader) {
        addPlayer(playerId, nickname, characterType, "default", factionId, isBot, dataLoader);
    }

    public void addPlayer(String playerId, String nickname, String characterType,
                          String skinId, int factionId, boolean isBot, DataLoader dataLoader) {
        // Determine spawn position
        List<MapData.SpawnPoint> spawnPoints = mapData.getSpawnPoints();
        int idx = players.size() % (spawnPoints != null && !spawnPoints.isEmpty() ? spawnPoints.size() : 1);
        double x, y;
        if (spawnPoints != null && !spawnPoints.isEmpty()) {
            MapData.SpawnPoint sp = spawnPoints.get(idx);
            x = sp.getX() + (Math.random() - 0.5) * 100;
            y = sp.getY() + (Math.random() - 0.5) * 100;
        } else {
            double centerX = mapData.getWidth() / 2.0;
            double centerY = mapData.getHeight() / 2.0;
            double angle = (2 * Math.PI * players.size()) / 8;
            double spawnRadius = Math.min(mapData.getWidth(), mapData.getHeight()) * 0.15;
            x = centerX + Math.cos(angle) * spawnRadius;
            y = centerY + Math.sin(angle) * spawnRadius;
        }

        PlayerEntity player = new PlayerEntity(playerId, nickname, characterType,
                factionId, isBot, x, y);
        player.setSkinId(skinId != null ? skinId : "default");

        // Init from class data
        ClassData classData = dataLoader.getClassData(characterType);
        if (classData != null) {
            Map<String, Integer> attrs = classData.getInitialAttributes();
            player.initFromClassData(
                    classData.getBaseHP(), classData.getBaseATK(), classData.getBaseSpeed(),
                    attrs.getOrDefault("INT", 5),
                    attrs.getOrDefault("STR", 5),
                    attrs.getOrDefault("AGI", 5),
                    attrs.getOrDefault("STA", 5)
            );

            // Apply class passive
            if (classData.getPassive() != null && classData.getPassive().getEffect() != null) {
                Map<String, Double> passive = classData.getPassive().getEffect();
                if (passive.containsKey("thornsDamage")) {
                    player.setThornsDmg(passive.get("thornsDamage"));
                    player.setBaseThornsDmg(passive.get("thornsDamage"));
                }
                if (passive.containsKey("dodgeChance")) {
                    player.setPassiveDodge(passive.get("dodgeChance"));
                }
                if (passive.containsKey("rangeBonus")) {
                    player.setRangeBonus(passive.get("rangeBonus"));
                }
                if (passive.containsKey("critBonus")) {
                    player.setCritChance(player.getCritChance() + passive.get("critBonus"));
                }
                if (passive.containsKey("damageReduction")) {
                    player.setDamageReduction(passive.get("damageReduction"));
                }
            }

            // Initialize default attack from class's default skill
            String defaultSkillId = classData.getDefaultSkill();
            if (defaultSkillId != null) {
                SkillData defaultSkill = dataLoader.getSkill(defaultSkillId);
                if (defaultSkill != null && defaultSkill.getAttackPattern() != null) {
                    SkillData.AttackPattern ap = defaultSkill.getAttackPattern();
                    player.setDefaultRange(ap.getRange());
                    player.setDefaultAngle(ap.getAngle());
                    player.setDefaultProjSpeed(ap.getProjectileSpeed());
                    if (ap.getProjectileType() != null) {
                        player.setDefaultProjType(ap.getProjectileType());
                    }
                    if (ap.getVisual() != null) {
                        player.setDefaultVisual(ap.getVisual());
                    }
                    if (defaultSkill.getCooldown() > 0) {
                        player.setAttackCooldown(defaultSkill.getCooldown());
                    }
                }
            }
            // For bots: auto-select 5 random skills from class pool
            if (isBot && classData.getAvailableSkills() != null) {
                List<String> pool = new ArrayList<>(classData.getAvailableSkills());
                Collections.shuffle(pool);
                List<String> build = new ArrayList<>();
                for (int i = 0; i < Math.min(5, pool.size()); i++) build.add(pool.get(i));
                player.setSelectedBuild(build);
            }
        } else {
            // Fallback defaults
            player.initFromClassData(150, 20, 200, 5, 5, 5, 5);
        }

        // Initialize XP curve from data
        xpLevelSystem.initPlayerXpCurve(player);

        players.add(player);
    }

    /**
     * Start the game (spawn initial enemies).
     */
    public void start() {
        spawnSystem.spawnInitial(enemies, players, mapData);
    }

    /**
     * Main game tick. Called 30 times per second.
     */
    public GameStateSnapshot tick(Map<String, PlayerInput> inputs) {
        if ("finished".equals(state)) {
            return createSnapshot();
        }

        tickCount++;
        gameTime += DT;

        // 1. Apply human player inputs
        applyPlayerInputs(inputs);

        // 1.5 Auto-convert AFK human players to bots (no input for 3 seconds)
        for (PlayerEntity p : players) {
            if (!p.isBot() && p.isAlive() && gameTime > 3.0 && p.getLastInputTime() < 0) {
                p.convertToBot();
            }
        }

        // 2. Bot AI decisions (movement + attacks)
        botAISystem.update(players, enemies, projectiles, gameTime, DT,
                stormSystem.isActive(), stormSystem.getCenterX(),
                stormSystem.getCenterY(), stormSystem.getRadius());

        // 2.5 Bot ultimate usage: bots use ult when ready and enemies nearby
        for (PlayerEntity bot : players) {
            if (!bot.isBot() || !bot.isAlive() || !bot.isUltimateReady()) continue;
            // Use ult when 3+ enemies within 200px (maximizes value)
            int nearbyEnemies = 0;
            for (EnemyEntity e : enemies) {
                if (!e.isAlive()) continue;
                double dist = bot.getPosition().distanceTo(e.getPosition());
                if (dist < 200) nearbyEnemies++;
            }
            if (nearbyEnemies >= 3) {
                activateUltimate(bot);
            }
        }

        // 3. Enemy monster AI (target selection)
        enemyAISystem.update(enemies, players, DT);

        // 4. Movement (players, enemies, projectiles)
        movementSystem.update(players, enemies, projectiles, DT);

        // 5. Player auto-attack (projectile creation)
        for (PlayerEntity p : players) {
            if (!p.isBot()) {
                projectileSystem.createPlayerProjectiles(p, projectiles, enemies, players, gameTime);
            }
        }

        // 6. Enemy ranged attacks
        projectileSystem.createEnemyProjectiles(enemies, players, projectiles, DT);

        // 7. Fire trail damage
        for (PlayerEntity p : players) {
            projectileSystem.updateFireTrail(p, enemies, DT);
        }

        // 8. Combat resolution (projectile hits, melee, PvP)
        combatSystem.update(players, enemies, projectiles, gameTime, DT);

        // 9. Spawn system (trickle + waves) — pass storm state for smart spawning
        spawnSystem.setStormState(stormSystem.isActive(),
                stormSystem.getCenterX(), stormSystem.getCenterY(), stormSystem.getRadius());
        spawnSystem.update(enemies, players, mapData, gameTime, DT);

        // 10. XP and level-up
        xpLevelSystem.update(players, DT);

        // 11. Storm zone
        stormSystem.update(players, gameTime, DT);

        // 12. Victory check
        victorySystem.update(players, gameTime, DT);
        if (victorySystem.isGameFinished()) {
            state = "finished";
        } else if (victorySystem.isVictoryTriggered()) {
            state = "victory_countdown";
        }

        // 13. Cleanup dead entities
        enemies.removeIf(e -> !e.isAlive());
        projectiles.removeIf(p -> !p.isAlive());

        return createSnapshot();
    }

    private void applyPlayerInputs(Map<String, PlayerInput> inputs) {
        for (Map.Entry<String, PlayerInput> entry : inputs.entrySet()) {
            String playerId = entry.getKey();
            PlayerInput input = entry.getValue();

            PlayerEntity player = findPlayer(playerId);
            if (player == null || !player.isAlive()) continue;

            // Track acked input
            lastAckedInputs.put(playerId, input.getSeq());
            player.setLastInputTime(gameTime);

            // Apply movement
            player.setMoveInputX(input.getMoveX());
            player.setMoveInputY(input.getMoveY());

            // Apply target position (for aim)
            player.setTargetX(input.getTargetX());
            player.setTargetY(input.getTargetY());

            // Compute facing angle from mouse target
            double aimDx = input.getTargetX() - player.getX();
            double aimDy = input.getTargetY() - player.getY();
            if (aimDx * aimDx + aimDy * aimDy > 1) {
                player.setFacingAngle(Math.atan2(aimDy, aimDx));
            }

            // Build selection (pre-game skill build)
            if (input.getBuildSelection() != null) {
                List<String> build = input.getBuildSelection();
                ClassData cd = dataLoader.getClasses().get(player.getCharacterType());
                List<String> validBuild = new ArrayList<>();
                if (cd != null && cd.getAvailableSkills() != null) {
                    for (String sid : build) {
                        if (cd.getAvailableSkills().contains(sid) && validBuild.size() < 5) {
                            validBuild.add(sid);
                        }
                    }
                }
                player.setSelectedBuild(validBuild);

                // Apply custom attributes from client
                if (input.getCustomAttributes() != null) {
                    Map<String, Integer> attrs = input.getCustomAttributes();
                    if (attrs.containsKey("INT")) player.setAttrINT(attrs.get("INT"));
                    if (attrs.containsKey("STR")) player.setAttrSTR(attrs.get("STR"));
                    if (attrs.containsKey("AGI")) player.setAttrAGI(attrs.get("AGI"));
                    if (attrs.containsKey("STA")) player.setAttrSTA(attrs.get("STA"));
                    player.recalcDerivedStats();
                }
            }

            // Skill choice (level-up selection)
            if (input.getSkillChoice() != null) {
                xpLevelSystem.handleSkillChoice(player, input.getSkillChoice());
                pendingSkillChoices.remove(playerId);
            }

            // Dodge activation (3s cooldown, 0.15s duration, 3x speed)
            if (input.isDodge() && player.getDodgeCooldown() <= 0 && !player.isDodging()) {
                player.setDodgeTimer(0.15);
                player.setDodgeCooldown(3.0);
            }

            // Ultimate activation
            if (input.isUseUltimate() && player.isUltimateReady()) {
                activateUltimate(player);
            }
        }
    }

    private void activateUltimate(PlayerEntity player) {
        player.setUltimateReady(false);
        player.setUltimateCharge(0);
        player.setInvincibleTimer(3.0);

        // Ultimate: burst of projectiles in all directions
        int burstCount = 16;
        for (int i = 0; i < burstCount; i++) {
            double angle = (2 * Math.PI * i) / burstCount;
            double speed = 350;
            ProjectileEntity proj = new ProjectileEntity(
                    player.getPlayerId(), player.getFactionId(),
                    player.getX(), player.getY(),
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    player.getAttackDamage() * 2, speed, 2.5
            );
            proj.setPierce(true);
            proj.setMaxPierceCount(10);
            proj.setCritMultiplier(player.getCritDamage());
            proj.setColor("#ffd700");
            projectiles.add(proj);
        }
    }

    private GameStateSnapshot createSnapshot() {
        GameStateSnapshot snapshot = new GameStateSnapshot();
        snapshot.setTick(tickCount);
        snapshot.setGameTime(gameTime);
        snapshot.setWave(spawnSystem.getCurrentWave());
        snapshot.setState(state);

        // Storm
        snapshot.setStormActive(stormSystem.isActive());
        snapshot.setStormCenterX(stormSystem.getCenterX());
        snapshot.setStormCenterY(stormSystem.getCenterY());
        snapshot.setStormRadius(stormSystem.getRadius());

        // Entities
        snapshot.captureFrom(players, enemies, projectiles);

        // Acked inputs
        for (Map.Entry<String, Long> entry : lastAckedInputs.entrySet()) {
            snapshot.setLastAckedInput(entry.getKey(), entry.getValue());
        }

        // Collect events from all systems
        for (GameEvent event : combatSystem.getPendingEvents()) {
            snapshot.addEvent(event);
        }
        for (GameEvent event : spawnSystem.getPendingEvents()) {
            snapshot.addEvent(event);
        }
        for (GameEvent event : skillSystem.getPendingEvents()) {
            snapshot.addEvent(event);
        }
        for (GameEvent event : stormSystem.getPendingEvents()) {
            snapshot.addEvent(event);
        }
        for (GameEvent event : victorySystem.getPendingEvents()) {
            snapshot.addEvent(event);
        }
        for (GameEvent event : xpLevelSystem.getPendingEvents()) {
            snapshot.addEvent(event);
        }
        for (GameEvent event : projectileSystem.getPendingEvents()) {
            snapshot.addEvent(event);
        }

        return snapshot;
    }

    private PlayerEntity findPlayer(String playerId) {
        for (PlayerEntity p : players) {
            if (p.getPlayerId().equals(playerId)) return p;
        }
        return null;
    }

    // Accessors
    public String getMatchId() { return matchId; }
    public String getState() { return state; }
    public boolean isFinished() { return "finished".equals(state); }
    public List<PlayerEntity> getPlayers() { return players; }
    public double getGameTime() { return gameTime; }
    public long getTickCount() { return tickCount; }
}
