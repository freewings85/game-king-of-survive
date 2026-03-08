package com.kingofsurvive.controller;

import com.kingofsurvive.model.Player;
import com.kingofsurvive.model.ScoreResult;
import com.kingofsurvive.service.GameService;
import com.kingofsurvive.service.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scores")
public class ScoreController {

    @Autowired
    private GameService gameService;

    @Autowired
    private PlayerService playerService;

    @PostMapping("/calculate")
    public ResponseEntity<List<ScoreResult>> calculateScores(@RequestBody Map<String, String> request) {
        try {
            String roomId = request.get("roomId");
            if (roomId == null) {
                return ResponseEntity.badRequest().build();
            }
            List<ScoreResult> scores = gameService.calculateScores(roomId);
            return ResponseEntity.ok(scores);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/rank/{playerId}")
    public ResponseEntity<Map<String, Object>> getPlayerRankInfo(@PathVariable String playerId) {
        try {
            Player player = playerService.getPlayer(playerId);
            Map<String, Object> rankInfo = new HashMap<String, Object>();
            rankInfo.put("playerId", player.getId());
            rankInfo.put("nickname", player.getNickname());
            rankInfo.put("rank", player.getRank());
            rankInfo.put("rankPoints", player.getRankPoints());
            rankInfo.put("totalKills", player.getTotalKills());
            rankInfo.put("totalGames", player.getTotalGames());
            rankInfo.put("totalWins", player.getTotalWins());
            return ResponseEntity.ok(rankInfo);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
