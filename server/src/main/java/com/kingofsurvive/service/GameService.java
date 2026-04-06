package com.kingofsurvive.service;

import com.kingofsurvive.engine.GameLoop;
import com.kingofsurvive.engine.GameSimulation;
import com.kingofsurvive.engine.data.DataLoader;
import com.kingofsurvive.engine.data.MapData;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.model.GamePlayerState;
import com.kingofsurvive.model.GameSession;
import com.kingofsurvive.model.Room;
import com.kingofsurvive.model.RoomPlayer;
import com.kingofsurvive.model.ScoreResult;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class GameService {
    private static final Logger LOG = Logger.getLogger(GameService.class.getName());
    private static final String DATA_DIR = "../data";

    private final ConcurrentHashMap<String, GameSession> sessions =
            new ConcurrentHashMap<String, GameSession>();

    private GameLoop gameLoop;
    private DataLoader dataLoader;

    @PostConstruct
    public void init() {
        // Load game data
        dataLoader = new DataLoader(DATA_DIR);
        try {
            dataLoader.loadAll();
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "Failed to load game data from " + DATA_DIR, e);
        }

        // Initialize game loop
        gameLoop = new GameLoop();
        gameLoop.setGameEndHandler(this::onGameEnd);
    }

    public GameLoop getGameLoop() {
        return gameLoop;
    }

    public DataLoader getDataLoader() {
        return dataLoader;
    }

    public void reloadData() throws IOException {
        dataLoader.loadAll();
    }

    /**
     * Start a new authoritative game session with the game engine.
     */
    public GameSession startSession(Room room) {
        String matchId = room.getId();
        String mode = room.getMode() != null ? room.getMode() : "solo";

        // Determine map
        String mapId = room.getMapId() != null ? room.getMapId() : "green_plains";
        MapData mapData = dataLoader.getMap(mapId);
        if (mapData == null) {
            // Fallback to first available map
            if (!dataLoader.getMaps().isEmpty()) {
                mapData = dataLoader.getMaps().values().iterator().next();
            } else {
                LOG.warning("No map data available, creating default");
                mapData = createDefaultMap();
            }
        }

        // Create simulation
        GameSimulation sim = new GameSimulation(matchId, mode, mapData, dataLoader);

        // Add human players
        List<String> humanPlayerIds = new ArrayList<String>();
        for (RoomPlayer rp : room.getPlayers()) {
            String charType = rp.getCharacterType() != null ? rp.getCharacterType() : "warrior";
            int factionId = "team".equals(mode) ? rp.getFactionId() : rp.hashCode(); // unique faction in solo
            String skinId = rp.getSkinId() != null ? rp.getSkinId() : "default";
            sim.addPlayer(rp.getPlayerId(), rp.getNickname(), charType, skinId, factionId, false, dataLoader);
            humanPlayerIds.add(rp.getPlayerId());
        }

        // Fill remaining slots with bots (up to 8 players total)
        String[] botNames = {"Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf"};
        String[] botClasses = {"warrior", "mage", "scout"};
        int totalPlayers = 8;
        for (int i = room.getPlayers().size(); i < totalPlayers; i++) {
            String botId = "bot_" + UUID.randomUUID().toString().substring(0, 8);
            String botName = botNames[i % botNames.length];
            String botClass = botClasses[i % botClasses.length];
            int botFaction;
            if ("team".equals(mode)) {
                botFaction = i % 2; // Alternate teams
            } else {
                botFaction = 100 + i; // Unique faction for solo
            }
            sim.addPlayer(botId, botName, botClass, botFaction, true, dataLoader);
        }

        // Create legacy GameSession for API compatibility
        GameSession session = new GameSession();
        session.setRoomId(matchId);
        session.setMode(mode);
        session.setWave(1);
        session.setGameTime(0);
        session.setState("playing");
        session.setStartedAt(System.currentTimeMillis());

        List<GamePlayerState> playerStates = new ArrayList<GamePlayerState>();
        for (PlayerEntity pe : sim.getPlayers()) {
            GamePlayerState state = new GamePlayerState();
            state.setPlayerId(pe.getPlayerId());
            state.setHp(pe.getHp());
            state.setMaxHp(pe.getMaxHp());
            state.setX(pe.getX());
            state.setY(pe.getY());
            state.setKills(0);
            state.setLevel(1);
            state.setAlive(true);
            state.setFactionId(pe.getFactionId());
            playerStates.add(state);
        }
        session.setPlayers(playerStates);
        sessions.put(matchId, session);

        // Start the game loop
        gameLoop.startGame(matchId, sim);

        LOG.info("Game session started: " + matchId + " with " + sim.getPlayers().size()
                + " players (" + humanPlayerIds.size() + " human)");

        return session;
    }

    private void onGameEnd(String matchId, GameSimulation sim) {
        LOG.info("Game ended: " + matchId + " after " + String.format("%.1f", sim.getGameTime()) + "s");

        // Update session state
        GameSession session = sessions.get(matchId);
        if (session != null) {
            session.setState("finished");
            session.setGameTime(sim.getGameTime());

            // Update player states from final simulation state
            for (PlayerEntity pe : sim.getPlayers()) {
                for (GamePlayerState ps : session.getPlayers()) {
                    if (ps.getPlayerId().equals(pe.getPlayerId())) {
                        ps.setHp(pe.getHp());
                        ps.setMaxHp(pe.getMaxHp());
                        ps.setX(pe.getX());
                        ps.setY(pe.getY());
                        ps.setKills(pe.getKills());
                        ps.setLevel(pe.getLevel());
                        ps.setAlive(pe.isAlive());
                        break;
                    }
                }
            }
        }
    }

    private MapData createDefaultMap() {
        MapData map = new MapData();
        map.setId("default");
        map.setName("Default");
        map.setWidth(1200);
        map.setHeight(1200);
        map.setShape("rect");
        return map;
    }

    // Legacy methods (still functional for backwards compat)

    public GameSession getSession(String roomId) {
        GameSession session = sessions.get(roomId);
        if (session == null) {
            throw new RuntimeException("Game session not found: " + roomId);
        }
        return session;
    }

    public GameSession updatePlayerState(String roomId, String playerId, GamePlayerState newState) {
        GameSession session = getSession(roomId);

        for (int i = 0; i < session.getPlayers().size(); i++) {
            GamePlayerState ps = session.getPlayers().get(i);
            if (ps.getPlayerId().equals(playerId)) {
                newState.setPlayerId(playerId);
                session.getPlayers().set(i, newState);
                break;
            }
        }

        sessions.put(roomId, session);
        return session;
    }

    public GameSession eliminatePlayer(String roomId, String playerId) {
        GameSession session = getSession(roomId);

        for (GamePlayerState ps : session.getPlayers()) {
            if (ps.getPlayerId().equals(playerId)) {
                ps.setAlive(false);
                ps.setHp(0);
                break;
            }
        }

        sessions.put(roomId, session);
        return session;
    }

    public List<ScoreResult> calculateScores(String roomId) {
        GameSession session = getSession(roomId);
        session.setState("finished");

        double totalGameTime = (System.currentTimeMillis() - session.getStartedAt()) / 1000.0;
        List<ScoreResult> results = new ArrayList<ScoreResult>();

        for (GamePlayerState ps : session.getPlayers()) {
            ScoreResult result = new ScoreResult();
            result.setPlayerId(ps.getPlayerId());
            result.setKills(ps.getKills());
            result.setLevel(ps.getLevel());
            result.setBossKilled(false);

            double survivalTime = ps.isAlive() ? totalGameTime : totalGameTime * 0.5;
            result.setSurvivalTime(survivalTime);

            Map<String, Integer> breakdown = new HashMap<String, Integer>();
            int survivalScore = (int) (survivalTime * 2);
            int killScore = ps.getKills() * 10;
            int levelScore = ps.getLevel() * 5;
            int bossScore = result.isBossKilled() ? 100 : 0;

            breakdown.put("survival", survivalScore);
            breakdown.put("kills", killScore);
            breakdown.put("level", levelScore);
            breakdown.put("boss", bossScore);

            int totalScore = survivalScore + killScore + levelScore + bossScore;
            result.setScoreBreakdown(breakdown);
            result.setTotalScore(totalScore);

            int rankDelta = totalScore / 10;
            if (!ps.isAlive()) {
                rankDelta = rankDelta / 2;
            }
            result.setRankPointsDelta(rankDelta);

            results.add(result);
        }

        sessions.put(roomId, session);
        return results;
    }
}
