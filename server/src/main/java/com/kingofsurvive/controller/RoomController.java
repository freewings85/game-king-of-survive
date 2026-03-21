package com.kingofsurvive.controller;

import com.kingofsurvive.model.GameSession;
import com.kingofsurvive.model.Room;
import com.kingofsurvive.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Map<String, String> request) {
        try {
            String hostId = request.get("hostId");
            String mode = request.get("mode");
            if (hostId == null || mode == null) {
                return ResponseEntity.badRequest().build();
            }
            String characterType = request.get("characterType");
            Room room = roomService.createRoom(hostId, mode, characterType);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Room>> getAvailableRooms() {
        List<Room> rooms = roomService.getAvailableRooms();
        return ResponseEntity.ok(rooms);
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<Room> joinRoom(@PathVariable String id, @RequestBody Map<String, String> request) {
        try {
            String playerId = request.get("playerId");
            if (playerId == null) {
                return ResponseEntity.badRequest().build();
            }
            String characterType = request.get("characterType");
            Room room = roomService.joinRoom(id, playerId, characterType);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<Room> leaveRoom(@PathVariable String id, @RequestBody Map<String, String> request) {
        try {
            String playerId = request.get("playerId");
            if (playerId == null) {
                return ResponseEntity.badRequest().build();
            }
            Room room = roomService.leaveRoom(id, playerId);
            if (room == null) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/ready")
    public ResponseEntity<Room> setReady(@PathVariable String id, @RequestBody Map<String, Object> request) {
        try {
            String playerId = (String) request.get("playerId");
            Boolean ready = (Boolean) request.get("ready");
            if (playerId == null || ready == null) {
                return ResponseEntity.badRequest().build();
            }
            Room room = roomService.setReady(id, playerId, ready);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/map")
    public ResponseEntity<Room> selectMap(@PathVariable String id, @RequestBody Map<String, String> request) {
        try {
            String mapId = request.get("mapId");
            if (mapId == null) {
                return ResponseEntity.badRequest().build();
            }
            Room room = roomService.selectMap(id, mapId);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<GameSession> startGame(@PathVariable String id) {
        try {
            GameSession session = roomService.startGame(id);
            return ResponseEntity.ok(session);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
