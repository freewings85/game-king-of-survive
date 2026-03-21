package com.kingofsurvive.model;

import java.util.HashSet;
import java.util.Set;

public class Player {

    private String id;
    private String nickname;
    private int level = 1;
    private long exp;
    private String rank = "BRONZE";
    private int rankPoints;
    private String equippedSkinId = "default";
    private Set<String> ownedSkins = new HashSet<String>();
    private int skinFragments;
    private int dailyLoginStreak;
    private String lastLoginDate;
    private int gold;
    private int totalKills;
    private int totalGames;
    private int totalWins;

    // RPG Attribute System (US-012)
    private int intelligence = 5;
    private int strength = 5;
    private int agility = 5;
    private int stamina = 5;
    private int accountLevel = 1;
    private long accountExp = 0;

    public Player() {
        this.ownedSkins.add("default");
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public int getLevel() {
        return level;
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public long getExp() {
        return exp;
    }

    public void setExp(long exp) {
        this.exp = exp;
    }

    public String getRank() {
        return rank;
    }

    public void setRank(String rank) {
        this.rank = rank;
    }

    public int getRankPoints() {
        return rankPoints;
    }

    public void setRankPoints(int rankPoints) {
        this.rankPoints = rankPoints;
    }

    public String getEquippedSkinId() {
        return equippedSkinId;
    }

    public void setEquippedSkinId(String equippedSkinId) {
        this.equippedSkinId = equippedSkinId;
    }

    public Set<String> getOwnedSkins() {
        return ownedSkins;
    }

    public void setOwnedSkins(Set<String> ownedSkins) {
        this.ownedSkins = ownedSkins;
    }

    public int getSkinFragments() {
        return skinFragments;
    }

    public void setSkinFragments(int skinFragments) {
        this.skinFragments = skinFragments;
    }

    public int getDailyLoginStreak() {
        return dailyLoginStreak;
    }

    public void setDailyLoginStreak(int dailyLoginStreak) {
        this.dailyLoginStreak = dailyLoginStreak;
    }

    public String getLastLoginDate() {
        return lastLoginDate;
    }

    public void setLastLoginDate(String lastLoginDate) {
        this.lastLoginDate = lastLoginDate;
    }

    public int getGold() {
        return gold;
    }

    public void setGold(int gold) {
        this.gold = gold;
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

    public int getTotalWins() {
        return totalWins;
    }

    public void setTotalWins(int totalWins) {
        this.totalWins = totalWins;
    }

    // RPG Attribute getters/setters (US-012)
    public int getIntelligence() {
        return intelligence;
    }

    public void setIntelligence(int intelligence) {
        this.intelligence = intelligence;
    }

    public int getStrength() {
        return strength;
    }

    public void setStrength(int strength) {
        this.strength = strength;
    }

    public int getAgility() {
        return agility;
    }

    public void setAgility(int agility) {
        this.agility = agility;
    }

    public int getStamina() {
        return stamina;
    }

    public void setStamina(int stamina) {
        this.stamina = stamina;
    }

    public int getAccountLevel() {
        return accountLevel;
    }

    public void setAccountLevel(int accountLevel) {
        this.accountLevel = accountLevel;
    }

    public long getAccountExp() {
        return accountExp;
    }

    public void setAccountExp(long accountExp) {
        this.accountExp = accountExp;
    }
}
