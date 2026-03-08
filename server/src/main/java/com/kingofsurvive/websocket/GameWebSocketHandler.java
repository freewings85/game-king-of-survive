package com.kingofsurvive.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class GameWebSocketHandler extends TextWebSocketHandler {

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

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Player registration happens via the first message
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode json = objectMapper.readTree(message.getPayload());
        String type = json.has("type") ? json.get("type").asText() : "";

        switch (type) {
            case "register":
                handleRegister(session, json);
                break;
            case "move":
            case "attack":
            case "skill":
            case "die":
                handleGameAction(session, json);
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
    }

    private void handleGameAction(WebSocketSession session, JsonNode json) throws IOException {
        String playerId = sessionPlayerMap.get(session.getId());
        String roomId = sessionRoomMap.get(session.getId());

        if (playerId == null || roomId == null) {
            session.sendMessage(new TextMessage("{\"error\":\"Not registered\"}"));
            return;
        }

        // Broadcast to all players in the room
        Set<String> players = roomPlayers.get(roomId);
        if (players != null) {
            String payload = message(json, playerId);
            TextMessage broadcastMessage = new TextMessage(payload);
            for (String pid : players) {
                WebSocketSession targetSession = playerSessions.get(pid);
                if (targetSession != null && targetSession.isOpen()) {
                    try {
                        targetSession.sendMessage(broadcastMessage);
                    } catch (IOException e) {
                        // Ignore send failures to individual sessions
                    }
                }
            }
        }
    }

    private String message(JsonNode originalJson, String senderId) {
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
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        session.close(CloseStatus.SERVER_ERROR);
    }
}
