package com.kingofsurvive.service;

import com.kingofsurvive.model.LeaderboardEntry;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LeaderboardService {

    private final ConcurrentHashMap<String, LeaderboardEntry> leaderboard = new ConcurrentHashMap<String, LeaderboardEntry>();
    private final ConcurrentHashMap<String, LeaderboardEntry> seasonLeaderboard = new ConcurrentHashMap<String, LeaderboardEntry>();
    private String currentSeasonId;
    private long seasonStartTime;

    public LeaderboardService() {
        this.currentSeasonId = computeSeasonId();
        this.seasonStartTime = System.currentTimeMillis();
    }

    private String computeSeasonId() {
        Calendar cal = Calendar.getInstance();
        int year = cal.get(Calendar.YEAR);
        int week = cal.get(Calendar.WEEK_OF_YEAR);
        return year + "-W" + String.format("%02d", week);
    }

    public void updatePlayer(String playerName, int kills, double survivalTime) {
        // Update all-time leaderboard
        LeaderboardEntry entry = leaderboard.get(playerName);
        if (entry == null) {
            entry = new LeaderboardEntry();
            entry.setPlayerName(playerName);
            entry.setTotalKills(0);
            entry.setTotalGames(0);
            entry.setBestSurvivalTime(0);
        }

        entry.setTotalKills(entry.getTotalKills() + kills);
        entry.setTotalGames(entry.getTotalGames() + 1);
        if (survivalTime > entry.getBestSurvivalTime()) {
            entry.setBestSurvivalTime(survivalTime);
        }
        leaderboard.put(playerName, entry);

        // Check for season reset
        String newSeasonId = computeSeasonId();
        if (!newSeasonId.equals(currentSeasonId)) {
            seasonLeaderboard.clear();
            currentSeasonId = newSeasonId;
            seasonStartTime = System.currentTimeMillis();
        }

        // Update season leaderboard
        LeaderboardEntry seasonEntry = seasonLeaderboard.get(playerName);
        if (seasonEntry == null) {
            seasonEntry = new LeaderboardEntry();
            seasonEntry.setPlayerName(playerName);
            seasonEntry.setTotalKills(0);
            seasonEntry.setTotalGames(0);
            seasonEntry.setBestSurvivalTime(0);
        }
        seasonEntry.setTotalKills(seasonEntry.getTotalKills() + kills);
        seasonEntry.setTotalGames(seasonEntry.getTotalGames() + 1);
        if (survivalTime > seasonEntry.getBestSurvivalTime()) {
            seasonEntry.setBestSurvivalTime(survivalTime);
        }
        seasonLeaderboard.put(playerName, seasonEntry);
    }

    public List<LeaderboardEntry> getTopPlayers(int limit) {
        return rankEntries(leaderboard, limit);
    }

    public List<LeaderboardEntry> getSeasonTopPlayers(int limit) {
        // Auto-reset if season changed
        String newSeasonId = computeSeasonId();
        if (!newSeasonId.equals(currentSeasonId)) {
            seasonLeaderboard.clear();
            currentSeasonId = newSeasonId;
            seasonStartTime = System.currentTimeMillis();
        }
        return rankEntries(seasonLeaderboard, limit);
    }

    public Map<String, Object> getSeasonInfo() {
        Map<String, Object> info = new HashMap<String, Object>();
        info.put("seasonId", currentSeasonId);
        info.put("startTime", seasonStartTime);
        info.put("playerCount", seasonLeaderboard.size());
        return info;
    }

    private List<LeaderboardEntry> rankEntries(ConcurrentHashMap<String, LeaderboardEntry> board, int limit) {
        List<LeaderboardEntry> entries = new ArrayList<LeaderboardEntry>(board.values());

        Collections.sort(entries, new Comparator<LeaderboardEntry>() {
            @Override
            public int compare(LeaderboardEntry a, LeaderboardEntry b) {
                return Integer.compare(b.getTotalKills(), a.getTotalKills());
            }
        });

        int end = Math.min(limit, entries.size());
        List<LeaderboardEntry> topPlayers = new ArrayList<LeaderboardEntry>(entries.subList(0, end));

        for (int i = 0; i < topPlayers.size(); i++) {
            topPlayers.get(i).setRank(i + 1);
        }

        return topPlayers;
    }
}
