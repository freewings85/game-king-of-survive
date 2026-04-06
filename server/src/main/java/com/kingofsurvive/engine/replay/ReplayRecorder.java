package com.kingofsurvive.engine.replay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kingofsurvive.engine.net.GameStateSnapshot;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPOutputStream;

public class ReplayRecorder {
    private static final Logger LOG = Logger.getLogger(ReplayRecorder.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String REPLAY_DIR = "replays";

    private String matchId;
    private List<GameStateSnapshot> snapshots;
    private long startTime;

    public ReplayRecorder(String matchId) {
        this.matchId = matchId;
        this.snapshots = new ArrayList<>();
        this.startTime = System.currentTimeMillis();
    }

    public void record(GameStateSnapshot snapshot) {
        snapshots.add(snapshot);
    }

    public void finalize(String matchId) {
        try {
            saveToDisk();
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to save replay for " + matchId, e);
        }
    }

    public void saveToDisk() throws IOException {
        File dir = new File(REPLAY_DIR);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        long endTime = System.currentTimeMillis();

        // Save as JSONL (one JSON object per line) for easy reading
        // Line 1: metadata header
        // Lines 2+: one snapshot per line
        File rawFile = new File(dir, matchId + ".replay.jsonl");
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(rawFile))) {
            // Header line with metadata
            Map<String, Object> header = new HashMap<>();
            header.put("type", "header");
            header.put("matchId", matchId);
            header.put("startTime", startTime);
            header.put("endTime", endTime);
            header.put("totalTicks", snapshots.size());
            header.put("durationSeconds", snapshots.size() / 30.0);
            writer.write(MAPPER.writeValueAsString(header));
            writer.newLine();

            // One snapshot per line
            for (GameStateSnapshot snap : snapshots) {
                writer.write(MAPPER.writeValueAsString(snap));
                writer.newLine();
            }
        }

        // Save gzipped version too
        File gzFile = new File(dir, matchId + ".replay.gz");
        try (BufferedWriter writer = new BufferedWriter(
                new OutputStreamWriter(new GZIPOutputStream(new FileOutputStream(gzFile))))) {
            Map<String, Object> header = new HashMap<>();
            header.put("type", "header");
            header.put("matchId", matchId);
            header.put("startTime", startTime);
            header.put("endTime", endTime);
            header.put("totalTicks", snapshots.size());
            writer.write(MAPPER.writeValueAsString(header));
            writer.newLine();
            for (GameStateSnapshot snap : snapshots) {
                writer.write(MAPPER.writeValueAsString(snap));
                writer.newLine();
            }
        }

        LOG.info("Replay saved: " + rawFile.getAbsolutePath()
                + " (" + snapshots.size() + " frames, JSONL format, "
                + gzFile.length() / 1024 + "KB compressed)");
    }

    public List<GameStateSnapshot> getSnapshots() {
        return snapshots;
    }

    public String getMatchId() {
        return matchId;
    }
}
