package com.kingofsurvive.engine.replay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kingofsurvive.engine.net.GameStateSnapshot;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/replays")
public class ReplayController {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String REPLAY_DIR = "replays";

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listReplays() {
        File dir = new File(REPLAY_DIR);
        List<Map<String, Object>> results = new ArrayList<>();

        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles((d, name) -> name.endsWith(".replay.jsonl"));
            if (files != null) {
                Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
                for (File f : files) {
                    try {
                        Map<String, Object> header = readJsonlHeader(f);
                        if (header != null) {
                            header.put("fileSize", f.length());
                            results.add(header);
                        }
                    } catch (IOException e) {
                        // Skip corrupt files
                    }
                }
            }
        }

        return ResponseEntity.ok(results);
    }

    @GetMapping("/{matchId}")
    public ResponseEntity<ReplayFile> getReplay(@PathVariable String matchId) {
        File file = new File(REPLAY_DIR, matchId + ".replay.jsonl");
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        try {
            ReplayFile replay = readJsonlReplay(file);
            return ResponseEntity.ok(replay);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{matchId}/summary")
    public ResponseEntity<Map<String, Object>> getReplaySummary(@PathVariable String matchId) {
        File file = new File(REPLAY_DIR, matchId + ".replay.jsonl");
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        try {
            ReplayFile replay = readJsonlReplay(file);
            Map<String, Object> summary = new HashMap<>();
            summary.put("matchId", replay.getMatchId());
            summary.put("startTime", replay.getStartTime());
            summary.put("endTime", replay.getEndTime());
            summary.put("duration", replay.getDurationSeconds());
            summary.put("totalTicks", replay.getTotalTicks());

            // Extract player info from last snapshot
            if (replay.getSnapshots() != null && !replay.getSnapshots().isEmpty()) {
                GameStateSnapshot lastSnapshot = replay.getSnapshots().get(replay.getSnapshots().size() - 1);
                summary.put("finalState", lastSnapshot.getState());
                summary.put("players", lastSnapshot.getPlayers());
            }

            return ResponseEntity.ok(summary);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Read just the header (first line) from a JSONL replay file.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> readJsonlHeader(File file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String headerLine = reader.readLine();
            if (headerLine != null && !headerLine.isEmpty()) {
                return MAPPER.readValue(headerLine, Map.class);
            }
        }
        return null;
    }

    /**
     * Read a full JSONL replay file: line 1 = header, lines 2+ = snapshots.
     */
    private ReplayFile readJsonlReplay(File file) throws IOException {
        ReplayFile replay = new ReplayFile();
        List<GameStateSnapshot> snapshots = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (line.isEmpty()) continue;
                if (firstLine) {
                    // Parse header
                    @SuppressWarnings("unchecked")
                    Map<String, Object> header = MAPPER.readValue(line, Map.class);
                    replay.setMatchId((String) header.get("matchId"));
                    replay.setStartTime(((Number) header.get("startTime")).longValue());
                    if (header.containsKey("endTime")) {
                        replay.setEndTime(((Number) header.get("endTime")).longValue());
                    }
                    if (header.containsKey("totalTicks")) {
                        replay.setTotalTicks(((Number) header.get("totalTicks")).intValue());
                    }
                    firstLine = false;
                } else {
                    // Parse snapshot
                    GameStateSnapshot snap = MAPPER.readValue(line, GameStateSnapshot.class);
                    snapshots.add(snap);
                }
            }
        }

        replay.setSnapshots(snapshots);
        if (replay.getTotalTicks() == 0) {
            replay.setTotalTicks(snapshots.size());
        }
        return replay;
    }
}
