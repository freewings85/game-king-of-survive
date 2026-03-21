package com.kingofsurvive.controller;

import com.kingofsurvive.model.DailyReward;
import com.kingofsurvive.model.Player;
import com.kingofsurvive.service.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    @Autowired
    private PlayerService playerService;

    @PostMapping
    public ResponseEntity<Player> createPlayer(@RequestBody Map<String, String> request) {
        String nickname = request.get("nickname");
        if (nickname == null || nickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Player player = playerService.createPlayer(nickname);
        return ResponseEntity.ok(player);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Player> getPlayer(@PathVariable String id) {
        try {
            Player player = playerService.getPlayer(id);
            return ResponseEntity.ok(player);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/equip-skin")
    public ResponseEntity<Player> equipSkin(@PathVariable String id, @RequestBody Map<String, String> request) {
        try {
            String skinId = request.get("skinId");
            if (skinId == null) {
                return ResponseEntity.badRequest().build();
            }
            Player player = playerService.equipSkin(id, skinId);
            return ResponseEntity.ok(player);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/claim-daily-reward")
    public ResponseEntity<DailyReward> claimDailyReward(@PathVariable String id) {
        try {
            DailyReward reward = playerService.claimDailyReward(id);
            return ResponseEntity.ok(reward);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // RPG Attribute System endpoints (US-012)

    @PostMapping("/{id}/allocate-attributes")
    public ResponseEntity<Player> allocateAttributes(@PathVariable String id, @RequestBody Map<String, Integer> attributes) {
        try {
            Player player = playerService.allocatePoints(id, attributes);
            return ResponseEntity.ok(player);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}/attributes")
    public ResponseEntity<Map<String, Object>> getAttributes(@PathVariable String id) {
        try {
            Map<String, Object> attributes = playerService.getPlayerAttributes(id);
            return ResponseEntity.ok(attributes);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/game-result")
    public ResponseEntity<Player> submitGameResult(@PathVariable String id, @RequestBody Map<String, Object> result) {
        try {
            Player player = playerService.applyGameResult(id, result);
            return ResponseEntity.ok(player);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/add-experience")
    public ResponseEntity<Player> addExperience(@PathVariable String id, @RequestBody Map<String, Long> request) {
        try {
            long experience = request.containsKey("experience") ? request.get("experience") : 0L;
            Player player = playerService.addExperience(id, experience);
            return ResponseEntity.ok(player);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
