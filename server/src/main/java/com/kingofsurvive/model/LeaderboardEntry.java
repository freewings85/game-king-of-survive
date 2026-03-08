package com.kingofsurvive.model;

public class LeaderboardEntry {

    private String playerName;
    private int totalKills;
    private int totalGames;
    private double bestSurvivalTime;
    private int rank;

    public LeaderboardEntry() {
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public int getTotalKills() {
        return totalKills;
    }

    public void setTotalKills(int totalKills) {
        this.totalKills = totalKills;
    }

    public int getTotalGames() {
        return totalGames;
    }

    public void setTotalGames(int totalGames) {
        this.totalGames = totalGames;
    }

    public double getBestSurvivalTime() {
        return bestSurvivalTime;
    }

    public void setBestSurvivalTime(double bestSurvivalTime) {
        this.bestSurvivalTime = bestSurvivalTime;
    }

    public int getRank() {
        return rank;
    }

    public void setRank(int rank) {
        this.rank = rank;
    }
}
