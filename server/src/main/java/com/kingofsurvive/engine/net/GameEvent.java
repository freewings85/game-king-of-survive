package com.kingofsurvive.engine.net;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class GameEvent {
    private String type;
    private Map<String, Object> data;

    public GameEvent() {
        this.data = new HashMap<>();
    }

    public GameEvent(String type) {
        this.type = type;
        this.data = new HashMap<>();
    }

    public GameEvent put(String key, Object value) {
        data.put(key, value);
        return this;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }

    // Factory methods for common events
    public static GameEvent kill(String killerId, String victimId, double xp) {
        return new GameEvent("kill")
                .put("killerId", killerId)
                .put("victimId", victimId)
                .put("xp", xp);
    }

    public static GameEvent kill(String killerId, String victimId, double xp, double x, double y) {
        return new GameEvent("kill")
                .put("killerId", killerId)
                .put("victimId", victimId)
                .put("xp", xp)
                .put("x", x)
                .put("y", y);
    }

    public static GameEvent playerKill(String killerId, String victimId) {
        return new GameEvent("player_kill")
                .put("killerId", killerId)
                .put("victimId", victimId);
    }

    public static GameEvent damage(String targetId, double amount, boolean crit) {
        return new GameEvent("damage")
                .put("targetId", targetId)
                .put("amount", amount)
                .put("crit", crit);
    }

    public static GameEvent damage(String targetId, double amount, boolean crit, String sourceId) {
        return new GameEvent("damage")
                .put("targetId", targetId)
                .put("amount", amount)
                .put("crit", crit)
                .put("sourceId", sourceId);
    }

    public static GameEvent waveStart(int wave) {
        return new GameEvent("wave_start")
                .put("wave", wave);
    }

    public static GameEvent levelUp(String playerId, int newLevel, List<String> skillChoices) {
        return new GameEvent("level_up")
                .put("playerId", playerId)
                .put("newLevel", newLevel)
                .put("skillChoices", skillChoices);
    }

    public static GameEvent evolution(String playerId, String evolutionId) {
        return new GameEvent("evolution")
                .put("playerId", playerId)
                .put("evolutionId", evolutionId);
    }

    public static GameEvent victory(String winnerId, int winnerFaction) {
        return new GameEvent("victory")
                .put("winnerId", winnerId)
                .put("winnerFaction", winnerFaction);
    }

    public static GameEvent stormStart(double centerX, double centerY, double radius) {
        return new GameEvent("storm_start")
                .put("centerX", centerX)
                .put("centerY", centerY)
                .put("radius", radius);
    }

    public static GameEvent gameOver(String reason) {
        return new GameEvent("game_over")
                .put("reason", reason);
    }

    public static GameEvent chainArc(double x1, double y1, double x2, double y2) {
        return new GameEvent("chain_arc")
                .put("x1", x1)
                .put("y1", y1)
                .put("x2", x2)
                .put("y2", y2);
    }
}
