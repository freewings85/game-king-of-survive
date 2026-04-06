package com.kingofsurvive.engine.net;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.ProjectileEntity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class GameStateSnapshot {
    private long tick;
    private double gameTime;
    private int wave;
    private String state; // "playing", "victory_countdown", "finished"

    // Storm
    private double stormRadius;
    private double stormCenterX;
    private double stormCenterY;
    private boolean stormActive;

    // Entity snapshots (lightweight data for client rendering)
    private List<PlayerSnapshot> players;
    private List<EnemySnapshot> enemies;
    private List<ProjectileSnapshot> projectiles;

    // Events that happened this tick
    private List<GameEvent> events;

    // Per-player acked input seq
    private Map<String, Long> lastAckedInputs;

    public GameStateSnapshot() {
        this.players = new ArrayList<>();
        this.enemies = new ArrayList<>();
        this.projectiles = new ArrayList<>();
        this.events = new ArrayList<>();
        this.lastAckedInputs = new HashMap<>();
    }

    // Build from game state
    public void captureFrom(List<PlayerEntity> playerEntities,
                            List<EnemyEntity> enemyEntities,
                            List<ProjectileEntity> projectileEntities) {
        players.clear();
        for (PlayerEntity p : playerEntities) {
            players.add(PlayerSnapshot.from(p));
        }

        enemies.clear();
        for (EnemyEntity e : enemyEntities) {
            if (e.isAlive()) {
                enemies.add(EnemySnapshot.from(e));
            }
        }

        projectiles.clear();
        for (ProjectileEntity proj : projectileEntities) {
            if (proj.isAlive()) {
                projectiles.add(ProjectileSnapshot.from(proj));
            }
        }
    }

    // Lightweight snapshot classes
    public static class PlayerSnapshot {
        public String id;
        public String nickname;
        public String characterType;
        public String skinId;
        public double x;
        public double y;
        public double hp;
        public double maxHp;
        public int level;
        public int kills;
        public boolean alive;
        public int factionId;
        public List<String> skills;
        public Map<String, Integer> skillLevels;
        public boolean shieldActive;
        public boolean furyActive;
        public double ultimateCharge;
        public boolean isBot;
        public int killStreak;
        public double speed;
        public double facingAngle;
        public double xp;
        public double xpToNextLevel;
        public int chainCount;
        public double slowAura;
        public double fireTrailDmg;

        public static PlayerSnapshot from(PlayerEntity p) {
            PlayerSnapshot s = new PlayerSnapshot();
            s.id = p.getPlayerId();
            s.nickname = p.getNickname();
            s.characterType = p.getCharacterType();
            s.skinId = p.getSkinId();
            s.x = p.getX();
            s.y = p.getY();
            s.hp = p.getHp();
            s.maxHp = p.getMaxHp();
            s.level = p.getLevel();
            s.kills = p.getKills();
            s.alive = p.isAlive();
            s.factionId = p.getFactionId();
            s.shieldActive = p.isShieldActive();
            s.furyActive = p.isFuryActive();
            s.ultimateCharge = p.getUltimateCharge();
            s.isBot = p.isBot();
            s.killStreak = p.getKillStreak();
            s.speed = p.getSpeed();
            s.facingAngle = p.getFacingAngle();
            s.xp = p.getXp();
            s.xpToNextLevel = p.getXPToNextLevel();

            s.chainCount = p.getChainCount();
            s.slowAura = p.getSlowAura();
            s.fireTrailDmg = p.getFireTrailDmg();

            s.skills = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : p.getSkillLevels().entrySet()) {
                s.skills.add(entry.getKey() + ":" + entry.getValue());
            }
            s.skillLevels = new HashMap<>(p.getSkillLevels());
            return s;
        }
    }

    public static class EnemySnapshot {
        public String id;
        public String type;
        public double x;
        public double y;
        public double hp;
        public double maxHp;
        public String affix;
        public double spawnFade;
        public double radius;
        public boolean hostile;

        public static EnemySnapshot from(EnemyEntity e) {
            EnemySnapshot s = new EnemySnapshot();
            s.id = e.getId();
            s.type = e.getType();
            s.x = e.getX();
            s.y = e.getY();
            s.hp = e.getHp();
            s.maxHp = e.getMaxHp();
            s.affix = e.getAffix();
            s.spawnFade = e.getSpawnFade();
            s.radius = e.getRadius();
            s.hostile = e.isHostile();
            return s;
        }
    }

    public static class ProjectileSnapshot {
        public String id;
        public double x;
        public double y;
        public double vx;
        public double vy;
        public String ownerId;
        public String color;
        public String visual;
        public boolean isEnemyProjectile;

        public static ProjectileSnapshot from(ProjectileEntity p) {
            ProjectileSnapshot s = new ProjectileSnapshot();
            s.id = p.getId();
            s.x = p.getX();
            s.y = p.getY();
            s.vx = p.getVelocity().x;
            s.vy = p.getVelocity().y;
            s.ownerId = p.getOwnerId();
            s.color = p.getColor();
            s.visual = p.getVisualType();
            s.isEnemyProjectile = p.isEnemyProjectile();
            return s;
        }
    }

    // Getters and setters
    public long getTick() { return tick; }
    public void setTick(long tick) { this.tick = tick; }
    public double getGameTime() { return gameTime; }
    public void setGameTime(double gameTime) { this.gameTime = gameTime; }
    public int getWave() { return wave; }
    public void setWave(int wave) { this.wave = wave; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public double getStormRadius() { return stormRadius; }
    public void setStormRadius(double stormRadius) { this.stormRadius = stormRadius; }
    public double getStormCenterX() { return stormCenterX; }
    public void setStormCenterX(double stormCenterX) { this.stormCenterX = stormCenterX; }
    public double getStormCenterY() { return stormCenterY; }
    public void setStormCenterY(double stormCenterY) { this.stormCenterY = stormCenterY; }
    public boolean isStormActive() { return stormActive; }
    public void setStormActive(boolean stormActive) { this.stormActive = stormActive; }

    public List<PlayerSnapshot> getPlayers() { return players; }
    public void setPlayers(List<PlayerSnapshot> players) { this.players = players; }
    public List<EnemySnapshot> getEnemies() { return enemies; }
    public void setEnemies(List<EnemySnapshot> enemies) { this.enemies = enemies; }
    public List<ProjectileSnapshot> getProjectiles() { return projectiles; }
    public void setProjectiles(List<ProjectileSnapshot> projectiles) { this.projectiles = projectiles; }

    public List<GameEvent> getEvents() { return events; }
    public void setEvents(List<GameEvent> events) { this.events = events; }
    public void addEvent(GameEvent event) { events.add(event); }

    public Map<String, Long> getLastAckedInputs() { return lastAckedInputs; }
    public void setLastAckedInputs(Map<String, Long> lastAckedInputs) { this.lastAckedInputs = lastAckedInputs; }
    public void setLastAckedInput(String playerId, long seq) { lastAckedInputs.put(playerId, seq); }
}
