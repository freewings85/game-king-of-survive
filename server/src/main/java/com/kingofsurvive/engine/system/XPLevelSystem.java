package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.data.ClassData;
import com.kingofsurvive.engine.data.DataLoader;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.net.GameEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class XPLevelSystem {
    private SkillSystem skillSystem;
    private DataLoader dataLoader;
    private List<GameEvent> pendingEvents = new ArrayList<>();

    public XPLevelSystem(SkillSystem skillSystem) {
        this.skillSystem = skillSystem;
    }

    public void setDataLoader(DataLoader dataLoader) {
        this.dataLoader = dataLoader;
    }

    public List<GameEvent> getPendingEvents() {
        List<GameEvent> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    /**
     * Initialize a player's xpToNext from data-driven curve.
     * Call this when adding a player to the game.
     */
    public void initPlayerXpCurve(PlayerEntity player) {
        if (dataLoader != null) {
            player.setXpToNext(dataLoader.getXpForLevel(player.getLevel()));
        }
    }

    public void update(List<PlayerEntity> players, double dt) {
        // Calculate level stats for catch-up and leader penalty
        int maxLevel = 0;
        int aliveCount = 0;
        double totalLevel = 0;
        for (PlayerEntity p : players) {
            if (p.isAlive()) {
                maxLevel = Math.max(maxLevel, p.getLevel());
                totalLevel += p.getLevel();
                aliveCount++;
            }
        }
        double avgLevel = aliveCount > 0 ? totalLevel / aliveCount : 1;

        for (PlayerEntity player : players) {
            if (!player.isAlive()) continue;

            // Ensure xpToNext is set from data-driven curve
            if (player.getXPToNextLevel() <= 0 && dataLoader != null) {
                player.setXpToNext(dataLoader.getXpForLevel(player.getLevel()));
            }

            // Catch-up XP: players below max level get passive XP bonus
            // Quadratic scaling: gap^1.5 to strongly pull lagging players
            int levelGap = maxLevel - player.getLevel();
            if (levelGap >= 1) {
                // e.g. gap=3→15.6 XP/s, gap=5→33.5 XP/s, gap=8→67.9 XP/s
                double catchupXP = Math.pow(levelGap, 1.5) * 3.0 * dt;
                player.addXP(catchupXP);
            }

            // Leader XP penalty: players above average get diminished kill XP
            // This slows snowball by reducing the leader's farming efficiency
            double leaderGap = player.getLevel() - avgLevel;
            if (leaderGap >= 3) {
                // 3+ above avg: 70% XP, 6+: 50% XP, 9+: 35% XP
                double penalty = Math.max(0.35, 1.0 - leaderGap * 0.1);
                player.setLeaderXpPenalty(penalty);
            } else {
                player.setLeaderXpPenalty(1.0);
            }

            // Check level up
            while (player.canLevelUp()) {
                player.levelUp();
                // Update xpToNext for the new level from data-driven curve
                if (dataLoader != null) {
                    player.setXpToNext(dataLoader.getXpForLevel(player.getLevel()));
                }

                // Distribute attribute points based on class growth coefficients
                applyAttributeGrowth(player);

                if (player.isBot()) {
                    // Bot auto-selects skill
                    List<String> botChoices = skillSystem.generateSkillChoices(player);
                    skillSystem.botAutoSelectSkill(player);
                    pendingEvents.add(GameEvent.levelUp(
                            player.getPlayerId(), player.getLevel(), botChoices));
                } else {
                    // Human player: notify client to select skill via MOBA-style UI
                    // Do NOT auto-select — let the player choose via pendingSkillPoints
                    List<String> choices = skillSystem.generateSkillChoices(player);
                    pendingEvents.add(GameEvent.levelUp(
                            player.getPlayerId(), player.getLevel(), choices));
                }
            }
        }
    }

    /**
     * Distribute 3 attribute points per level using class growth coefficients.
     * Higher coefficient = more points allocated to that attribute.
     */
    private void applyAttributeGrowth(PlayerEntity player) {
        if (dataLoader == null) return;
        ClassData classData = dataLoader.getClassData(player.getCharacterType());
        if (classData == null || classData.getGrowthCoefficients() == null) return;

        Map<String, Double> growth = classData.getGrowthCoefficients();
        double totalWeight = 0;
        for (Double v : growth.values()) totalWeight += v;
        if (totalWeight <= 0) return;

        // 3 attribute points per level, distributed by growth weight
        int pointsToDistribute = 3;
        double intWeight = growth.getOrDefault("INT", 0.5) / totalWeight;
        double strWeight = growth.getOrDefault("STR", 0.5) / totalWeight;
        double agiWeight = growth.getOrDefault("AGI", 0.5) / totalWeight;
        // STA gets remaining

        // Use weighted random distribution
        for (int i = 0; i < pointsToDistribute; i++) {
            double roll = Math.random();
            if (roll < intWeight) {
                player.setAttrINT(player.getAttrINT() + 1);
            } else if (roll < intWeight + strWeight) {
                player.setAttrSTR(player.getAttrSTR() + 1);
            } else if (roll < intWeight + strWeight + agiWeight) {
                player.setAttrAGI(player.getAttrAGI() + 1);
            } else {
                player.setAttrSTA(player.getAttrSTA() + 1);
            }
        }

        player.recalcDerivedStats();
    }

    /**
     * Called when a human player selects a skill after level-up.
     */
    public void handleSkillChoice(PlayerEntity player, String skillId) {
        skillSystem.applySkill(player, skillId);
    }
}
