package com.kingofsurvive.engine.net;

import java.util.List;
import java.util.Map;

public class PlayerInput {
    private String playerId;
    private long seq;
    private double moveX;
    private double moveY;
    private String skillId;  // null if no skill activation
    private double targetX;
    private double targetY;
    private long timestamp;
    private boolean useUltimate;
    private boolean dodge;
    private String skillChoice; // for level-up skill selection
    private List<String> buildSelection; // for pre-game build selection
    private Map<String, Integer> customAttributes; // client attribute allocation

    public PlayerInput() {}

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }
    public long getSeq() { return seq; }
    public void setSeq(long seq) { this.seq = seq; }
    public double getMoveX() { return moveX; }
    public void setMoveX(double moveX) { this.moveX = moveX; }
    public double getMoveY() { return moveY; }
    public void setMoveY(double moveY) { this.moveY = moveY; }
    public String getSkillId() { return skillId; }
    public void setSkillId(String skillId) { this.skillId = skillId; }
    public double getTargetX() { return targetX; }
    public void setTargetX(double targetX) { this.targetX = targetX; }
    public double getTargetY() { return targetY; }
    public void setTargetY(double targetY) { this.targetY = targetY; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    public boolean isUseUltimate() { return useUltimate; }
    public void setUseUltimate(boolean useUltimate) { this.useUltimate = useUltimate; }
    public boolean isDodge() { return dodge; }
    public void setDodge(boolean dodge) { this.dodge = dodge; }
    public String getSkillChoice() { return skillChoice; }
    public void setSkillChoice(String skillChoice) { this.skillChoice = skillChoice; }
    public List<String> getBuildSelection() { return buildSelection; }
    public void setBuildSelection(List<String> buildSelection) { this.buildSelection = buildSelection; }
    public Map<String, Integer> getCustomAttributes() { return customAttributes; }
    public void setCustomAttributes(Map<String, Integer> customAttributes) { this.customAttributes = customAttributes; }
}
