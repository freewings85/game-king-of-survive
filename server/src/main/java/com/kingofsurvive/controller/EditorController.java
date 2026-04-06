package com.kingofsurvive.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.kingofsurvive.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/editor")
public class EditorController {
    private static final Logger LOG = Logger.getLogger(EditorController.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);
    private static final Pattern SAFE_ID = Pattern.compile("^[a-z0-9_]+$");

    @Autowired
    private GameService gameService;

    private String getDataDir() {
        return gameService.getDataLoader().getDataDir();
    }

    // --- Skills ---

    @GetMapping("/skills")
    public ResponseEntity<?> getSkills() {
        try {
            File file = new File(getDataDir(), "skills.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read skills.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read skills.json"));
        }
    }

    @PutMapping("/skills")
    public ResponseEntity<?> saveSkills(@RequestBody JsonNode body) {
        return saveJsonFile("skills.json", body);
    }

    // --- Monsters ---

    @GetMapping("/monsters")
    public ResponseEntity<?> getMonsters() {
        try {
            File file = new File(getDataDir(), "monsters.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read monsters.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read monsters.json"));
        }
    }

    @PutMapping("/monsters")
    public ResponseEntity<?> saveMonsters(@RequestBody JsonNode body) {
        return saveJsonFile("monsters.json", body);
    }

    // --- Evolutions ---

    @GetMapping("/evolutions")
    public ResponseEntity<?> getEvolutions() {
        try {
            File file = new File(getDataDir(), "evolution.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read evolution.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read evolution.json"));
        }
    }

    @PutMapping("/evolutions")
    public ResponseEntity<?> saveEvolutions(@RequestBody JsonNode body) {
        return saveJsonFile("evolution.json", body);
    }

    // --- Characters ---

    @GetMapping("/characters")
    public ResponseEntity<?> getCharacters() {
        try {
            File file = new File(getDataDir(), "characters.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read characters.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read characters.json"));
        }
    }

    @PutMapping("/characters")
    public ResponseEntity<?> saveCharacters(@RequestBody JsonNode body) {
        return saveJsonFile("characters.json", body);
    }

    // --- Maps ---

    @GetMapping("/maps")
    public ResponseEntity<?> listMaps() {
        try {
            File mapsDir = new File(getDataDir(), "maps");
            if (!mapsDir.exists() || !mapsDir.isDirectory()) {
                return ResponseEntity.ok(new ArrayList<>());
            }
            File[] files = mapsDir.listFiles((dir, name) -> name.endsWith(".json"));
            if (files == null) {
                return ResponseEntity.ok(new ArrayList<>());
            }
            List<Map<String, Object>> summaries = new ArrayList<>();
            for (File f : files) {
                try {
                    JsonNode node = MAPPER.readTree(f);
                    Map<String, Object> summary = new HashMap<>();
                    summary.put("id", node.has("id") ? node.get("id").asText() : f.getName().replace(".json", ""));
                    summary.put("name", node.has("name") ? node.get("name").asText() : "");
                    summary.put("width", node.has("width") ? node.get("width").asInt() : 0);
                    summary.put("height", node.has("height") ? node.get("height").asInt() : 0);
                    summaries.add(summary);
                } catch (IOException ex) {
                    LOG.warning("Failed to parse map file: " + f.getName());
                }
            }
            return ResponseEntity.ok(summaries);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to list maps", e);
            return ResponseEntity.status(500).body(errorMap("Failed to list maps"));
        }
    }

    @GetMapping("/maps/{mapId}")
    public ResponseEntity<?> getMap(@PathVariable String mapId) {
        if (!SAFE_ID.matcher(mapId).matches()) {
            return ResponseEntity.badRequest().body(errorMap("Invalid map ID"));
        }
        try {
            File file = new File(getDataDir(), "maps/" + mapId + ".json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read map: " + mapId, e);
            return ResponseEntity.status(500).body(errorMap("Failed to read map"));
        }
    }

    @PutMapping("/maps/{mapId}")
    public ResponseEntity<?> saveMap(@PathVariable String mapId, @RequestBody JsonNode body) {
        if (!SAFE_ID.matcher(mapId).matches()) {
            return ResponseEntity.badRequest().body(errorMap("Invalid map ID"));
        }
        try {
            File file = new File(getDataDir(), "maps/" + mapId + ".json");
            MAPPER.writeValue(file, body);
            gameService.reloadData();
            Map<String, String> result = new HashMap<>();
            result.put("status", "saved");
            result.put("file", mapId + ".json");
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to save map: " + mapId, e);
            return ResponseEntity.status(500).body(errorMap("Failed to save map"));
        }
    }

    @PostMapping("/maps")
    public ResponseEntity<?> createMap(@RequestBody JsonNode body) {
        if (!body.has("id")) {
            return ResponseEntity.badRequest().body(errorMap("Missing 'id' field"));
        }
        String mapId = body.get("id").asText();
        if (!SAFE_ID.matcher(mapId).matches()) {
            return ResponseEntity.badRequest().body(errorMap("Invalid map ID"));
        }
        File file = new File(getDataDir(), "maps/" + mapId + ".json");
        if (file.exists()) {
            return ResponseEntity.badRequest().body(errorMap("Map already exists: " + mapId));
        }
        try {
            MAPPER.writeValue(file, body);
            gameService.reloadData();
            Map<String, String> result = new HashMap<>();
            result.put("status", "created");
            result.put("id", mapId);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to create map: " + mapId, e);
            return ResponseEntity.status(500).body(errorMap("Failed to create map"));
        }
    }

    @DeleteMapping("/maps/{mapId}")
    public ResponseEntity<?> deleteMap(@PathVariable String mapId) {
        if (!SAFE_ID.matcher(mapId).matches()) {
            return ResponseEntity.badRequest().body(errorMap("Invalid map ID"));
        }
        File file = new File(getDataDir(), "maps/" + mapId + ".json");
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        if (file.delete()) {
            try {
                gameService.reloadData();
            } catch (IOException e) {
                LOG.warning("Reload failed after deleting map: " + mapId);
            }
            Map<String, String> result = new HashMap<>();
            result.put("status", "deleted");
            result.put("id", mapId);
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(500).body(errorMap("Failed to delete map file"));
        }
    }

    // --- XP Curve ---

    @GetMapping("/xp-curve")
    public ResponseEntity<?> getXpCurve() {
        try {
            File file = new File(getDataDir(), "xp_curve.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read xp_curve.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read xp_curve.json"));
        }
    }

    @PutMapping("/xp-curve")
    public ResponseEntity<?> saveXpCurve(@RequestBody JsonNode body) {
        return saveJsonFile("xp_curve.json", body);
    }

    // --- Skins ---

    @GetMapping("/skins")
    public ResponseEntity<?> getSkins() {
        try {
            File file = new File(getDataDir(), "skins.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read skins.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read skins.json"));
        }
    }

    @PutMapping("/skins")
    public ResponseEntity<?> saveSkins(@RequestBody JsonNode body) {
        return saveJsonFile("skins.json", body);
    }

    // --- Part Variants ---

    @GetMapping("/part_variants")
    public ResponseEntity<?> getPartVariants() {
        try {
            File file = new File(getDataDir(), "part_variants.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read part_variants.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read part_variants.json"));
        }
    }

    @PutMapping("/part_variants")
    public ResponseEntity<?> savePartVariants(@RequestBody JsonNode body) {
        return saveJsonFile("part_variants.json", body);
    }

    // --- Formulas ---

    @GetMapping("/formulas")
    public ResponseEntity<?> getFormulas() {
        try {
            File file = new File(getDataDir(), "formulas.json");
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            JsonNode node = MAPPER.readTree(file);
            return ResponseEntity.ok(node);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to read formulas.json", e);
            return ResponseEntity.status(500).body(errorMap("Failed to read formulas.json"));
        }
    }

    @PutMapping("/formulas")
    public ResponseEntity<?> saveFormulas(@RequestBody JsonNode body) {
        return saveJsonFile("formulas.json", body);
    }

    // --- Hot-reload ---

    @PostMapping("/reload")
    public ResponseEntity<?> reload() {
        try {
            gameService.reloadData();
            Map<String, String> result = new HashMap<>();
            result.put("status", "reloaded");
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to reload data", e);
            return ResponseEntity.status(500).body(errorMap("Failed to reload: " + e.getMessage()));
        }
    }

    // --- Helper ---

    private ResponseEntity<?> saveJsonFile(String filename, JsonNode body) {
        try {
            File file = new File(getDataDir(), filename);
            MAPPER.writeValue(file, body);
            gameService.reloadData();
            Map<String, String> result = new HashMap<>();
            result.put("status", "saved");
            result.put("file", filename);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Failed to save " + filename, e);
            return ResponseEntity.status(500).body(errorMap("Failed to save " + filename));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> m = new HashMap<>();
        m.put("error", message);
        return m;
    }
}
