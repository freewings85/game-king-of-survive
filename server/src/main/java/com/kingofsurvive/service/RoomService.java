package com.kingofsurvive.service;

import com.kingofsurvive.model.GameSession;
import com.kingofsurvive.model.Player;
import com.kingofsurvive.model.Room;
import com.kingofsurvive.model.RoomPlayer;
import com.kingofsurvive.repository.PlayerRepository;
import com.kingofsurvive.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private GameService gameService;

    public Room createRoom(String hostId, String mode) {
        Player host = playerRepository.findById(hostId);
        if (host == null) {
            throw new RuntimeException("Host player not found: " + hostId);
        }

        Room room = new Room();
        room.setId(UUID.randomUUID().toString());
        room.setHostId(hostId);
        room.setMode(mode);
        room.setState("waiting");
        room.setCreatedAt(System.currentTimeMillis());

        RoomPlayer roomPlayer = new RoomPlayer();
        roomPlayer.setPlayerId(hostId);
        roomPlayer.setNickname(host.getNickname());
        roomPlayer.setReady(false);
        room.getPlayers().add(roomPlayer);

        return roomRepository.save(room);
    }

    public Room joinRoom(String roomId, String playerId) {
        Room room = getRoom(roomId);
        Player player = playerRepository.findById(playerId);
        if (player == null) {
            throw new RuntimeException("Player not found: " + playerId);
        }

        if (!"waiting".equals(room.getState())) {
            throw new RuntimeException("Room is not in waiting state");
        }

        if (room.getPlayers().size() >= room.getMaxPlayers()) {
            throw new RuntimeException("Room is full");
        }

        for (RoomPlayer rp : room.getPlayers()) {
            if (rp.getPlayerId().equals(playerId)) {
                throw new RuntimeException("Player already in room");
            }
        }

        RoomPlayer roomPlayer = new RoomPlayer();
        roomPlayer.setPlayerId(playerId);
        roomPlayer.setNickname(player.getNickname());
        roomPlayer.setReady(false);
        room.getPlayers().add(roomPlayer);

        return roomRepository.save(room);
    }

    public Room leaveRoom(String roomId, String playerId) {
        Room room = getRoom(roomId);

        boolean removed = false;
        for (int i = 0; i < room.getPlayers().size(); i++) {
            if (room.getPlayers().get(i).getPlayerId().equals(playerId)) {
                room.getPlayers().remove(i);
                removed = true;
                break;
            }
        }

        if (!removed) {
            throw new RuntimeException("Player not in room");
        }

        if (room.getPlayers().isEmpty()) {
            roomRepository.deleteById(roomId);
            return null;
        }

        if (playerId.equals(room.getHostId())) {
            room.setHostId(room.getPlayers().get(0).getPlayerId());
        }

        return roomRepository.save(room);
    }

    public Room setReady(String roomId, String playerId, boolean ready) {
        Room room = getRoom(roomId);

        boolean found = false;
        for (RoomPlayer rp : room.getPlayers()) {
            if (rp.getPlayerId().equals(playerId)) {
                rp.setReady(ready);
                found = true;
                break;
            }
        }

        if (!found) {
            throw new RuntimeException("Player not in room");
        }

        return roomRepository.save(room);
    }

    public Room selectMap(String roomId, String mapId) {
        Room room = getRoom(roomId);
        room.setMapId(mapId);
        return roomRepository.save(room);
    }

    public GameSession startGame(String roomId) {
        Room room = getRoom(roomId);

        if (!"waiting".equals(room.getState())) {
            throw new RuntimeException("Room is not in waiting state");
        }

        for (RoomPlayer rp : room.getPlayers()) {
            if (!rp.isReady()) {
                throw new RuntimeException("Not all players are ready");
            }
        }

        room.setState("playing");
        roomRepository.save(room);

        return gameService.startSession(room);
    }

    public List<Room> getAvailableRooms() {
        return roomRepository.findAvailable();
    }

    private Room getRoom(String roomId) {
        Room room = roomRepository.findById(roomId);
        if (room == null) {
            throw new RuntimeException("Room not found: " + roomId);
        }
        return room;
    }
}
