package com.kingofsurvive.service;

import com.kingofsurvive.model.GamePlayerState;
import com.kingofsurvive.model.GameSession;
import com.kingofsurvive.model.Room;
import com.kingofsurvive.model.RoomPlayer;
import com.kingofsurvive.model.ScoreResult;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {

    private final ConcurrentHashMap<String, GameSession> sessions = new ConcurrentHashMap<String, GameSession>();

    public GameSession startSession(Room room) {
        GameSession session = new GameSession();
        session.setRoomId(room.getId());
        session.setMode(room.getMode());
        session.setWave(1);
        session.setGameTime(0);
        session.setState("playing");
        session.setStartedAt(System.currentTimeMillis());

        List<GamePlayerState> playerStates = new ArrayList<GamePlayerState>();
        for (RoomPlayer rp : room.getPlayers()) {
            GamePlayerState state = new GamePlayerState();
            state.setPlayerId(rp.getPlayerId());
            state.setHp(100.0);
            state.setMaxHp(100.0);
            state.setX(0);
            state.setY(0);
            state.setKills(0);
            state.setLevel(1);
            state.setAlive(true);
            state.setFactionId(rp.getFactionId());
            playerStates.add(state);
        }
        session.setPlayers(playerStates);

        sessions.put(room.getId(), session);
        return session;
    }

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
