package com.kingofsurvive.service;

import com.kingofsurvive.model.DailyReward;
import com.kingofsurvive.model.Player;
import com.kingofsurvive.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@Service
public class PlayerService {

    private static final List<String> CRAFTABLE_SKINS = Arrays.asList(
            "warrior_red", "warrior_blue", "ninja_shadow", "knight_gold", "mage_purple",
            "flame_red", "ice_blue", "forest_green", "royal_gold", "shadow_purple",
            "cherry_blossom", "starlight", "ocean_wave", "neon_cyber", "autumn_leaf"
    );

    private final Random random = new Random();

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private DailyRewardService dailyRewardService;

    @Autowired
    private SkinService skinService;

    public Player createPlayer(String nickname) {
        Player player = new Player();
        player.setId(UUID.randomUUID().toString());
        player.setNickname(nickname);
        player.setLevel(1);
        player.setExp(0);
        player.setRank("BRONZE");
        player.setRankPoints(0);
        player.setEquippedSkinId("default");
        player.setOwnedSkins(new HashSet<String>(Arrays.asList("default")));
        player.setSkinFragments(0);
        player.setDailyLoginStreak(0);
        player.setGold(0);
        player.setTotalKills(0);
        player.setTotalGames(0);
        player.setTotalWins(0);
        return playerRepository.save(player);
    }

    public Player getPlayer(String id) {
        Player player = playerRepository.findById(id);
        if (player == null) {
            throw new RuntimeException("Player not found: " + id);
        }
        return player;
    }

    public Player addExp(String playerId, long exp) {
        Player player = getPlayer(playerId);
        player.setExp(player.getExp() + exp);
        long requiredExp = 100L * player.getLevel();
        while (player.getExp() >= requiredExp) {
            player.setExp(player.getExp() - requiredExp);
            player.setLevel(player.getLevel() + 1);
            requiredExp = 100L * player.getLevel();
        }
        return playerRepository.save(player);
    }

    public Player updateRank(String playerId, int pointsDelta) {
        Player player = getPlayer(playerId);
        int newPoints = player.getRankPoints() + pointsDelta;
        if (newPoints < 0) {
            newPoints = 0;
        }
        player.setRankPoints(newPoints);
        player.setRank(calculateRank(newPoints));
        return playerRepository.save(player);
    }

    private String calculateRank(int points) {
        if (points >= 5000) {
            return "MASTER";
        } else if (points >= 3500) {
            return "DIAMOND";
        } else if (points >= 2000) {
            return "PLATINUM";
        } else if (points >= 1000) {
            return "GOLD";
        } else if (points >= 500) {
            return "SILVER";
        } else {
            return "BRONZE";
        }
    }

    public Player equipSkin(String playerId, String skinId) {
        Player player = getPlayer(playerId);
        if (!skinService.skinExists(skinId)) {
            throw new RuntimeException("Unknown skin: " + skinId);
        }
        // All skins are available to all players (no unlock requirement)
        player.getOwnedSkins().add(skinId);
        player.setEquippedSkinId(skinId);
        return playerRepository.save(player);
    }

    public Player addSkinFragments(String playerId, int count) {
        Player player = getPlayer(playerId);
        player.setSkinFragments(player.getSkinFragments() + count);
        while (player.getSkinFragments() >= 10) {
            player.setSkinFragments(player.getSkinFragments() - 10);
            String newSkin = CRAFTABLE_SKINS.get(random.nextInt(CRAFTABLE_SKINS.size()));
            player.getOwnedSkins().add(newSkin);
        }
        return playerRepository.save(player);
    }

    public DailyReward claimDailyReward(String playerId) {
        Player player = getPlayer(playerId);
        String today = new SimpleDateFormat("yyyy-MM-dd").format(new Date());

        if (today.equals(player.getLastLoginDate())) {
            throw new RuntimeException("Daily reward already claimed today");
        }

        String yesterday = new SimpleDateFormat("yyyy-MM-dd").format(
                new Date(System.currentTimeMillis() - 86400000L));

        if (yesterday.equals(player.getLastLoginDate())) {
            player.setDailyLoginStreak(player.getDailyLoginStreak() + 1);
        } else {
            player.setDailyLoginStreak(1);
        }

        player.setLastLoginDate(today);

        int dayInCycle = ((player.getDailyLoginStreak() - 1) % 7) + 1;
        DailyReward reward = dailyRewardService.getRewardForDay(dayInCycle);

        applyReward(player, reward);
        playerRepository.save(player);

        return reward;
    }

    // RPG Attribute System (US-012)

    public Player allocatePoints(String playerId, Map<String, Integer> attributes) {
        Player player = getPlayer(playerId);
        int totalAvailable = (player.getAccountLevel() - 1) * 3 + 20; // initial 20 + 3 per level
        int currentTotal = player.getIntelligence() + player.getStrength() + player.getAgility() + player.getStamina();
        int requestedTotal = 0;
        for (Integer v : attributes.values()) {
            requestedTotal += v;
        }
        if (currentTotal + requestedTotal > totalAvailable) {
            throw new RuntimeException("Not enough attribute points");
        }
        if (attributes.containsKey("intelligence")) {
            player.setIntelligence(player.getIntelligence() + attributes.get("intelligence"));
        }
        if (attributes.containsKey("strength")) {
            player.setStrength(player.getStrength() + attributes.get("strength"));
        }
        if (attributes.containsKey("agility")) {
            player.setAgility(player.getAgility() + attributes.get("agility"));
        }
        if (attributes.containsKey("stamina")) {
            player.setStamina(player.getStamina() + attributes.get("stamina"));
        }
        return playerRepository.save(player);
    }

    public Map<String, Object> getPlayerAttributes(String playerId) {
        Player player = getPlayer(playerId);
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("intelligence", player.getIntelligence());
        result.put("strength", player.getStrength());
        result.put("agility", player.getAgility());
        result.put("stamina", player.getStamina());
        result.put("accountLevel", player.getAccountLevel());
        result.put("accountExp", player.getAccountExp());

        // Calculate derived stats
        Map<String, Object> derivedStats = calculateDerivedStats(player);
        result.put("derivedStats", derivedStats);

        int totalAvailable = (player.getAccountLevel() - 1) * 3 + 20;
        int currentTotal = player.getIntelligence() + player.getStrength() + player.getAgility() + player.getStamina();
        result.put("attributePointsRemaining", totalAvailable - currentTotal);

        return result;
    }

    private Map<String, Object> calculateDerivedStats(Player player) {
        Map<String, Object> stats = new HashMap<String, Object>();
        int INT = player.getIntelligence();
        int STR = player.getStrength();
        int AGI = player.getAgility();
        int STA = player.getStamina();

        stats.put("maxHP", 100 + STR * 3);
        stats.put("physicalAttack", 10.0 * (1 + STR * 0.01));
        stats.put("skillPower", 10.0 * (1 + INT * 0.008));
        stats.put("moveSpeed", 150.0 * (1 + AGI * 0.005));
        stats.put("armor", STR * 0.5);
        stats.put("evasion", Math.min(0.3, AGI * 0.0015));
        stats.put("hpRegen", STA * 0.1);

        return stats;
    }

    public Player addExperience(String playerId, long experience) {
        Player player = getPlayer(playerId);
        player.setAccountExp(player.getAccountExp() + experience);
        // Level up logic
        long needed = 100L * player.getAccountLevel();
        while (player.getAccountExp() >= needed) {
            player.setAccountExp(player.getAccountExp() - needed);
            player.setAccountLevel(player.getAccountLevel() + 1);
            needed = 100L * player.getAccountLevel();
        }
        return playerRepository.save(player);
    }

    public Player applyGameResult(String playerId, Map<String, Object> result) {
        Player player = getPlayer(playerId);
        int goldEarned = 0;
        if (result.get("goldEarned") instanceof Number) {
            goldEarned = ((Number) result.get("goldEarned")).intValue();
        }
        if (goldEarned > 0) {
            player.setGold(player.getGold() + goldEarned);
        }
        // Update total stats
        if (result.get("kills") instanceof Number) {
            player.setTotalKills(player.getTotalKills() + ((Number) result.get("kills")).intValue());
        }
        player.setTotalGames(player.getTotalGames() + 1);
        if (result.get("victory") instanceof Boolean && (Boolean) result.get("victory")) {
            player.setTotalWins(player.getTotalWins() + 1);
        }
        return playerRepository.save(player);
    }

    private void applyReward(Player player, DailyReward reward) {
        switch (reward.getRewardType()) {
            case "gold":
                player.setGold(player.getGold() + reward.getRewardValue());
                break;
            case "skin_fragment":
                addSkinFragments(player.getId(), reward.getRewardValue());
                break;
            case "skin":
                String skinToAdd = CRAFTABLE_SKINS.get(random.nextInt(CRAFTABLE_SKINS.size()));
                player.getOwnedSkins().add(skinToAdd);
                break;
            case "exp_boost":
                // exp_boost is applied as bonus exp
                addExp(player.getId(), reward.getRewardValue());
                break;
            default:
                break;
        }
    }
}
