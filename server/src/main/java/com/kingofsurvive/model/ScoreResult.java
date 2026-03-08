package com.kingofsurvive.model;

import java.util.HashMap;
import java.util.Map;

public class ScoreResult {

    private String playerId;
    private double survivalTime;
    private int kills;
    private int level;
    private boolean bossKilled;
    private Map<String, Integer> scoreBreakdown = new HashMap<String, Integer>();
    private int totalScore;
    private int rankPointsDelta;

    public ScoreResult() {
    }

    public String getPlayerId() {
        return playerId;
    }

    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }

    public double getSurvivalTime() {
        return survivalTime;
    }

    public void setSurvivalTime(double survivalTime) {
        this.survivalTime = survivalTime;
    }

    public int getKills() {
        return kills;
    }

    public void setKills(int kills) {
        this.kills = kills;
    }

    public int getLevel() {
        return level;
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public boolean isBossKilled() {
        return bossKilled;
    }

    public void setBossKilled(boolean bossKilled) {
        this.bossKilled = bossKilled;
    }

    public Map<String, Integer> getScoreBreakdown() {
        return scoreBreakdown;
    }

    public void setScoreBreakdown(Map<String, Integer> scoreBreakdown) {
        this.scoreBreakdown = scoreBreakdown;
    }

    public int getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(int totalScore) {
        this.totalScore = totalScore;
    }

    public int getRankPointsDelta() {
        return rankPointsDelta;
    }

    public void setRankPointsDelta(int rankPointsDelta) {
        this.rankPointsDelta = rankPointsDelta;
    }
}
