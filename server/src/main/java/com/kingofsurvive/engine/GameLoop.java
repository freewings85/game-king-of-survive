package com.kingofsurvive.engine;

import com.kingofsurvive.engine.net.GameStateSnapshot;
import com.kingofsurvive.engine.net.PlayerInput;
import com.kingofsurvive.engine.replay.ReplayRecorder;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.*;
import java.util.function.BiConsumer;
import java.util.logging.Level;
import java.util.logging.Logger;

public class GameLoop {
    private static final Logger LOG = Logger.getLogger(GameLoop.class.getName());
    private static final long TICK_INTERVAL_MS = 33; // 30Hz

    private final ScheduledExecutorService scheduler;
    private final Map<String, GameSimulation> activeGames;
    private final Map<String, ConcurrentLinkedQueue<PlayerInput>> inputQueues;
    private final Map<String, ScheduledFuture<?>> gameTasks;
    private final Map<String, ReplayRecorder> replayRecorders;

    // Callback to broadcast snapshots to clients
    private BiConsumer<String, GameStateSnapshot> broadcastHandler;

    // Callback when a game ends
    private BiConsumer<String, GameSimulation> gameEndHandler;

    public GameLoop() {
        this.scheduler = Executors.newScheduledThreadPool(
                Runtime.getRuntime().availableProcessors());
        this.activeGames = new ConcurrentHashMap<>();
        this.inputQueues = new ConcurrentHashMap<>();
        this.gameTasks = new ConcurrentHashMap<>();
        this.replayRecorders = new ConcurrentHashMap<>();
    }

    public void setBroadcastHandler(BiConsumer<String, GameStateSnapshot> handler) {
        this.broadcastHandler = handler;
    }

    public void setGameEndHandler(BiConsumer<String, GameSimulation> handler) {
        this.gameEndHandler = handler;
    }

    /**
     * Start a new game simulation on the game loop.
     */
    public void startGame(String matchId, GameSimulation sim) {
        activeGames.put(matchId, sim);
        inputQueues.put(matchId, new ConcurrentLinkedQueue<>());
        replayRecorders.put(matchId, new ReplayRecorder(matchId));

        sim.start();

        ScheduledFuture<?> task = scheduler.scheduleAtFixedRate(() -> {
            try {
                gameTick(matchId);
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "Error in game tick for " + matchId, e);
            }
        }, 0, TICK_INTERVAL_MS, TimeUnit.MILLISECONDS);

        gameTasks.put(matchId, task);
        LOG.info("Game started: " + matchId);
    }

    /**
     * Submit player input to be processed on the next tick.
     */
    public void submitInput(String matchId, PlayerInput input) {
        ConcurrentLinkedQueue<PlayerInput> queue = inputQueues.get(matchId);
        if (queue != null) {
            queue.add(input);
        }
    }

    private void gameTick(String matchId) {
        GameSimulation sim = activeGames.get(matchId);
        if (sim == null) return;

        // Drain all inputs for this tick
        Map<String, PlayerInput> frameInputs = drainInputs(matchId);

        // Run simulation tick
        GameStateSnapshot snapshot = sim.tick(frameInputs);

        // Record for replay
        ReplayRecorder recorder = replayRecorders.get(matchId);
        if (recorder != null) {
            recorder.record(snapshot);
        }

        // Broadcast to clients
        if (broadcastHandler != null) {
            broadcastHandler.accept(matchId, snapshot);
        }

        // Check if game is over
        if (sim.isFinished()) {
            endGame(matchId);
        }
    }

    private Map<String, PlayerInput> drainInputs(String matchId) {
        Map<String, PlayerInput> result = new HashMap<>();
        ConcurrentLinkedQueue<PlayerInput> queue = inputQueues.get(matchId);
        if (queue == null) return result;

        PlayerInput input;
        while ((input = queue.poll()) != null) {
            PlayerInput existing = result.get(input.getPlayerId());
            if (existing == null) {
                result.put(input.getPlayerId(), input);
            } else {
                existing.setMoveX(input.getMoveX());
                existing.setMoveY(input.getMoveY());
                existing.setSeq(input.getSeq());
                if (input.getSkillChoice() != null) {
                    existing.setSkillChoice(input.getSkillChoice());
                }
            }
        }
        return result;
    }

    private void endGame(String matchId) {
        // Stop the tick loop
        ScheduledFuture<?> task = gameTasks.remove(matchId);
        if (task != null) {
            task.cancel(false);
        }

        // Finalize replay
        ReplayRecorder recorder = replayRecorders.remove(matchId);
        if (recorder != null) {
            recorder.finalize(matchId);
        }

        // Notify handler
        GameSimulation sim = activeGames.remove(matchId);
        inputQueues.remove(matchId);

        if (gameEndHandler != null && sim != null) {
            gameEndHandler.accept(matchId, sim);
        }

        LOG.info("Game ended: " + matchId);
    }

    /**
     * Get the replay recorder for a game (for saving replays).
     */
    public ReplayRecorder getReplayRecorder(String matchId) {
        return replayRecorders.get(matchId);
    }

    /**
     * Check if a game is active.
     */
    public boolean isGameActive(String matchId) {
        return activeGames.containsKey(matchId);
    }

    /**
     * Shutdown the game loop scheduler.
     */
    public void shutdown() {
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
        }
    }
}
