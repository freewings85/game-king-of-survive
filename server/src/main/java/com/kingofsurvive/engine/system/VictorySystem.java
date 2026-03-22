package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.net.GameEvent;

import java.util.ArrayList;
import java.util.List;

public class VictorySystem {
    private boolean victoryTriggered;
    private double victoryTimer;
    private static final double VICTORY_COUNTDOWN = 5.0;
    private static final double MAX_GAME_TIME = 180.0; // 3-minute matches with storm as pacing mechanism

    private String winnerId;
    private int winnerFaction;
    private boolean gameFinished;

    private List<GameEvent> pendingEvents = new ArrayList<>();

    public VictorySystem() {
        this.victoryTriggered = false;
        this.victoryTimer = 0;
        this.gameFinished = false;
    }

    public List<GameEvent> getPendingEvents() {
        List<GameEvent> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    public void update(List<PlayerEntity> players, double gameTime, double dt) {
        if (gameFinished) return;

        // Victory countdown
        if (victoryTriggered) {
            victoryTimer -= dt;
            if (victoryTimer <= 0) {
                gameFinished = true;
                pendingEvents.add(GameEvent.victory(winnerId, winnerFaction));
                pendingEvents.add(GameEvent.gameOver("victory"));
            }
            return;
        }

        // Check: only one faction alive
        int aliveFactions = 0;
        PlayerEntity lastAlive = null;
        int lastFaction = -1;

        for (PlayerEntity p : players) {
            if (p.isAlive()) {
                if (p.getFactionId() != lastFaction) {
                    aliveFactions++;
                    lastFaction = p.getFactionId();
                }
                lastAlive = p;
            }
        }

        // Solo mode: only one player alive
        // Team mode: only one faction alive
        if (aliveFactions <= 1 && lastAlive != null) {
            victoryTriggered = true;
            victoryTimer = VICTORY_COUNTDOWN;
            winnerId = lastAlive.getPlayerId();
            winnerFaction = lastAlive.getFactionId();
            // Make winner invincible during countdown
            lastAlive.setInvincibleTimer(VICTORY_COUNTDOWN + 1);
        }

        // All players dead → pick highest-level player as "last standing" winner
        // This handles simultaneous deaths (e.g., storm kills last 2+ players in same tick)
        if (aliveFactions == 0) {
            PlayerEntity best = null;
            for (PlayerEntity p : players) {
                if (best == null || p.getLevel() > best.getLevel()
                        || (p.getLevel() == best.getLevel() && p.getKills() > best.getKills())) {
                    best = p;
                }
            }
            if (best != null) {
                victoryTriggered = true;
                victoryTimer = 0; // immediate
                winnerId = best.getPlayerId();
                winnerFaction = best.getFactionId();
                gameFinished = true;
                pendingEvents.add(GameEvent.victory(winnerId, winnerFaction));
                pendingEvents.add(GameEvent.gameOver("last_standing"));
            } else {
                gameFinished = true;
                pendingEvents.add(GameEvent.gameOver("all_dead"));
            }
        }

        // Hard time limit — pick highest-level alive player as winner
        if (!gameFinished && !victoryTriggered && gameTime >= MAX_GAME_TIME) {
            PlayerEntity best = null;
            for (PlayerEntity p : players) {
                if (p.isAlive()) {
                    if (best == null || p.getLevel() > best.getLevel()
                            || (p.getLevel() == best.getLevel() && p.getKills() > best.getKills())) {
                        best = p;
                    }
                }
            }
            if (best != null) {
                victoryTriggered = true;
                victoryTimer = 3.0; // shorter countdown for timeout
                winnerId = best.getPlayerId();
                winnerFaction = best.getFactionId();
                best.setInvincibleTimer(4.0);

            } else {
                gameFinished = true;
                pendingEvents.add(GameEvent.gameOver("timeout"));
            }
        }
    }

    public boolean isGameFinished() { return gameFinished; }
    public boolean isVictoryTriggered() { return victoryTriggered; }
    public String getWinnerId() { return winnerId; }
    public int getWinnerFaction() { return winnerFaction; }
}
