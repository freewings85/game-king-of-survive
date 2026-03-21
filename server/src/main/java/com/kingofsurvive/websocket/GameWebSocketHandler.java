package com.kingofsurvive.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kingofsurvive.engine.GameLoop;
import com.kingofsurvive.engine.net.GameStateSnapshot;
import com.kingofsurvive.engine.net.PlayerInput;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

public class GameWebSocketHandler extends TextWebSocketHandler {
    private static final Logger LOG = Logger.getLogger(GameWebSocketHandler.class.getName());

    private final ObjectMapper objectMapper = new ObjectMapper();

    // playerId -> WebSocketSession
    private final ConcurrentHashMap<String, WebSocketSession> playerSessions =
            new ConcurrentHashMap<String, WebSocketSession>();

    // roomId -> Set<playerId>
    private final ConcurrentHashMap<String, Set<String>> roomPlayers =
            new ConcurrentHashMap<String, Set<String>>();

    // sessionId -> playerId
    private final ConcurrentHashMap<String, String> sessionPlayerMap =
            new ConcurrentHashMap<String, String>();

    // sessionId -> roomId
    private final ConcurrentHashMap<String, String> sessionRoomMap =
            new ConcurrentHashMap<String, String>();

    // Reference to the game loop (set by Spring config)
    private GameLoop gameLoop;

    public void setGameLoop(GameLoop gameLoop) {
        this.gameLoop = gameLoop;

        // Set up broadcast handler: when server ticks, send snapshots to all clients
        gameLoop.setBroadcastHandler(this::broadcastSnapshot);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        LOG.info("WebSocket connected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode json = objectMapper.readTree(message.getPayload());
        String type = json.has("type") ? json.get("type").asText() : "";

        switch (type) {
            case "register":
                handleRegister(session, json);
                break;
            case "input":
                handleInput(session, json);
                break;
            case "build_selection":
                handleBuildSelection(session, json);
                break;
            case "skill_choice":
                handleSkillChoice(session, json);
                break;
            // Legacy message types (still supported for backwards compat during migration)
            case "move":
            case "attack":
            case "skill":
            case "die":
                handleLegacyGameAction(session, json);
                break;
            default:
                session.sendMessage(new TextMessage("{\"error\":\"Unknown message type\"}"));
                break;
        }
    }

    private void handleRegister(WebSocketSession session, JsonNode json) throws IOException {
        String playerId = json.get("playerId").asText();
        String roomId = json.get("roomId").asText();

        playerSessions.put(playerId, session);
        sessionPlayerMap.put(session.getId(), playerId);
        sessionRoomMap.put(session.getId(), roomId);

        roomPlayers.putIfAbsent(roomId, Collections.synchronizedSet(new HashSet<String>()));
        roomPlayers.get(roomId).add(playerId);

        String response = objectMapper.writeValueAsString(
                createResponse("registered", playerId, roomId, null));
        session.sendMessage(new TextMessage(response));

        LOG.info("Player registered: " + playerId + " in room " + roomId);
    }

    /**
     * Handle authoritative input from client.
     * Client sends movement direction + target position each frame.
     * Server processes on next tick.
     */
    private void handleInput(WebSocketSession session, JsonNode json) {
        String playerId = sessionPlayerMap.get(session.getId());
        String roomId = sessionRoomMap.get(session.getId());

        if (playerId == null || roomId == null || gameLoop == null) return;

        PlayerInput input = new PlayerInput();
        input.setPlayerId(playerId);
        input.setSeq(json.has("seq") ? json.get("seq").asLong() : 0);
        input.setMoveX(json.has("moveX") ? json.get("moveX").asDouble() : 0);
        input.setMoveY(json.has("moveY") ? json.get("moveY").asDouble() : 0);
        input.setTargetX(json.has("targetX") ? json.get("targetX").asDouble() : 0);
        input.setTargetY(json.has("targetY") ? json.get("targetY").asDouble() : 0);
        input.setSkillId(json.has("skillId") && !json.get("skillId").isNull()
                ? json.get("skillId").asText() : null);
        input.setUseUltimate(json.has("useUltimate") && json.get("useUltimate").asBoolean());
        input.setDodge(json.has("dodge") && json.get("dodge").asBoolean());
        input.setTimestamp(json.has("timestamp") ? json.get("timestamp").asLong()
                : System.currentTimeMillis());

        gameLoop.submitInput(roomId, input);
    }

    /**
     * Handle skill choice from client (level-up skill selection).
     */
    private void handleSkillChoice(WebSocketSession session, JsonNode json) {
        String playerId = sessionPlayerMap.get(session.getId());
        String roomId = sessionRoomMap.get(session.getId());

        if (playerId == null || roomId == null || gameLoop == null) return;

        PlayerInput input = new PlayerInput();
        input.setPlayerId(playerId);
        input.setSeq(0);
        input.setSkillChoice(json.has("skillId") ? json.get("skillId").asText() : null);

        gameLoop.submitInput(roomId, input);
    }

    /**
     * Handle build selection from client (pre-game skill build).
     */
    private void handleBuildSelection(WebSocketSession session, JsonNode json) {
        String playerId = sessionPlayerMap.get(session.getId());
        String roomId = sessionRoomMap.get(session.getId());

        if (playerId == null || roomId == null || gameLoop == null) return;

        List<String> skills = new ArrayList<>();
        JsonNode skillsNode = json.get("skills");
        if (skillsNode != null && skillsNode.isArray()) {
            for (JsonNode node : skillsNode) {
                skills.add(node.asText());
            }
        }

        // Parse optional custom attributes
        Map<String, Integer> attrs = null;
        JsonNode attrsNode = json.get("attributes");
        if (attrsNode != null && attrsNode.isObject()) {
            attrs = new java.util.HashMap<>();
            java.util.Iterator<Map.Entry<String, JsonNode>> it = attrsNode.fields();
            while (it.hasNext()) {
                Map.Entry<String, JsonNode> entry = it.next();
                attrs.put(entry.getKey(), entry.getValue().asInt());
            }
        }

        PlayerInput input = new PlayerInput();
        input.setPlayerId(playerId);
        input.setSeq(0);
        input.setBuildSelection(skills);
        input.setCustomAttributes(attrs);

        gameLoop.submitInput(roomId, input);
    }

    /**
     * Broadcast a game state snapshot to all players in a room.
     */
    private void broadcastSnapshot(String matchId, GameStateSnapshot snapshot) {
        Set<String> players = roomPlayers.get(matchId);
        if (players == null) return;

        try {
            String payload = objectMapper.writeValueAsString(snapshot);
            TextMessage message = new TextMessage(payload);

            for (String playerId : players) {
                WebSocketSession session = playerSessions.get(playerId);
                if (session != null && session.isOpen()) {
                    try {
                        synchronized (session) {
                            session.sendMessage(message);
                        }
                    } catch (IOException e) {
                        LOG.log(Level.FINE, "Failed to send to " + playerId, e);
                    }
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to serialize snapshot", e);
        }
    }

    /**
     * Legacy: broadcast raw messages (backwards compat during migration).
     */
    private void handleLegacyGameAction(WebSocketSession session, JsonNode json) throws IOException {
        String playerId = sessionPlayerMap.get(session.getId());
        String roomId = sessionRoomMap.get(session.getId());

        if (playerId == null || roomId == null) {
            session.sendMessage(new TextMessage("{\"error\":\"Not registered\"}"));
            return;
        }

        Set<String> players = roomPlayers.get(roomId);
        if (players != null) {
            String payload = legacyMessage(json, playerId);
            TextMessage broadcastMessage = new TextMessage(payload);
            for (String pid : players) {
                WebSocketSession targetSession = playerSessions.get(pid);
                if (targetSession != null && targetSession.isOpen()) {
                    try {
                        targetSession.sendMessage(broadcastMessage);
                    } catch (IOException e) {
                        // Ignore
                    }
                }
            }
        }
    }

    private String legacyMessage(JsonNode originalJson, String senderId) {
        try {
            Map<String, Object> msg = new ConcurrentHashMap<String, Object>();
            msg.put("senderId", senderId);
            msg.put("type", originalJson.get("type").asText());
            if (originalJson.has("data")) {
                msg.put("data", objectMapper.treeToValue(originalJson.get("data"), Object.class));
            }
            msg.put("timestamp", System.currentTimeMillis());
            return objectMapper.writeValueAsString(msg);
        } catch (Exception e) {
            return "{\"error\":\"Failed to serialize message\"}";
        }
    }

    private Map<String, Object> createResponse(String type, String playerId, String roomId, Object data) {
        Map<String, Object> response = new ConcurrentHashMap<String, Object>();
        response.put("type", type);
        response.put("playerId", playerId);
        response.put("roomId", roomId);
        if (data != null) {
            response.put("data", data);
        }
        return response;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String playerId = sessionPlayerMap.remove(session.getId());
        String roomId = sessionRoomMap.remove(session.getId());

        if (playerId != null) {
            playerSessions.remove(playerId);
        }

        if (roomId != null && playerId != null) {
            Set<String> players = roomPlayers.get(roomId);
            if (players != null) {
                players.remove(playerId);
                if (players.isEmpty()) {
                    roomPlayers.remove(roomId);
                }
            }
        }

        LOG.info("WebSocket disconnected: " + (playerId != null ? playerId : session.getId()));
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        LOG.log(Level.WARNING, "WebSocket transport error", exception);
        session.close(CloseStatus.SERVER_ERROR);
    }
}
