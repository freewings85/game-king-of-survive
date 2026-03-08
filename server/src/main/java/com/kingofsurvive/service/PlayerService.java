package com.kingofsurvive.service;

import com.kingofsurvive.model.DailyReward;
import com.kingofsurvive.model.Player;
import com.kingofsurvive.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
public class PlayerService {

    private static final List<String> CRAFTABLE_SKINS = Arrays.asList(
            "warrior_red", "warrior_blue", "ninja_shadow", "knight_gold", "mage_purple"
    );

    private final Random random = new Random();

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private DailyRewardService dailyRewardService;

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
        if (!player.getOwnedSkins().contains(skinId)) {
            throw new RuntimeException("Player does not own skin: " + skinId);
        }
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
