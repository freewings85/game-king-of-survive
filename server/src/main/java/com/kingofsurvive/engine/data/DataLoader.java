package com.kingofsurvive.engine.data;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

public class DataLoader {
    private static final Logger LOG = Logger.getLogger(DataLoader.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String dataDir;
    private Map<String, SkillData> skills;
    private Map<String, ClassData> classes;
    private Map<String, MonsterData> monsters;
    private Map<String, MapData> maps;
    private List<EvolutionData> evolutions;
    private List<Integer> xpCurve;
    private JsonNode skinsRaw; // raw JSON for skins (served to client as-is)

    public DataLoader(String dataDir) {
        this.dataDir = dataDir;
        this.skills = new HashMap<>();
        this.classes = new HashMap<>();
        this.monsters = new HashMap<>();
        this.maps = new HashMap<>();
        this.evolutions = new ArrayList<>();
        this.xpCurve = new ArrayList<>();
    }

    public synchronized void loadAll() throws IOException {
        skills = new HashMap<>();
        classes = new HashMap<>();
        monsters = new HashMap<>();
        maps = new HashMap<>();
        evolutions = new ArrayList<>();
        xpCurve = new ArrayList<>();
        loadSkills();
        loadClasses();
        loadMonsters();
        loadEvolutions();
        loadMaps();
        loadXpCurve();
        loadSkins();
        LOG.info("Loaded " + skills.size() + " skills, " + classes.size() + " classes, "
                + monsters.size() + " monster types, " + evolutions.size() + " evolutions, "
                + maps.size() + " maps, " + xpCurve.size() + " XP curve levels");
    }

    public String getDataDir() { return dataDir; }

    private void loadSkills() throws IOException {
        File file = new File(dataDir, "skills.json");
        if (!file.exists()) {
            LOG.warning("skills.json not found at " + file.getAbsolutePath());
            return;
        }
        JsonNode root = MAPPER.readTree(file);
        JsonNode skillsNode = root.get("skills");
        if (skillsNode != null && skillsNode.isArray()) {
            for (JsonNode node : skillsNode) {
                SkillData skill = MAPPER.treeToValue(node, SkillData.class);
                skills.put(skill.getId(), skill);
            }
        }
    }

    private void loadClasses() throws IOException {
        File file = new File(dataDir, "characters.json");
        if (!file.exists()) {
            LOG.warning("characters.json not found at " + file.getAbsolutePath());
            return;
        }
        JsonNode root = MAPPER.readTree(file);
        Iterator<String> fieldNames = root.fieldNames();
        while (fieldNames.hasNext()) {
            String classId = fieldNames.next();
            ClassData classData = MAPPER.treeToValue(root.get(classId), ClassData.class);
            classData.setId(classId);
            classes.put(classId, classData);
        }
    }

    private void loadMonsters() throws IOException {
        File file = new File(dataDir, "monsters.json");
        if (!file.exists()) {
            LOG.warning("monsters.json not found at " + file.getAbsolutePath());
            return;
        }
        JsonNode root = MAPPER.readTree(file);
        Iterator<String> fieldNames = root.fieldNames();
        while (fieldNames.hasNext()) {
            String typeId = fieldNames.next();
            if ("levelDiffCorrection".equals(typeId)) continue;
            MonsterData monster = MAPPER.treeToValue(root.get(typeId), MonsterData.class);
            monster.setType(typeId);
            monsters.put(typeId, monster);
        }
    }

    private void loadEvolutions() throws IOException {
        File file = new File(dataDir, "evolution.json");
        if (!file.exists()) {
            LOG.warning("evolution.json not found at " + file.getAbsolutePath());
            return;
        }
        JsonNode root = MAPPER.readTree(file);
        JsonNode evosNode = root.get("evolutions");
        if (evosNode != null && evosNode.isArray()) {
            for (JsonNode node : evosNode) {
                EvolutionData evo = MAPPER.treeToValue(node, EvolutionData.class);
                evolutions.add(evo);
            }
        }
    }

    private void loadMaps() throws IOException {
        File mapsDir = new File(dataDir, "maps");
        if (!mapsDir.exists() || !mapsDir.isDirectory()) {
            LOG.warning("maps directory not found at " + mapsDir.getAbsolutePath());
            return;
        }
        File[] mapFiles = mapsDir.listFiles((dir, name) -> name.endsWith(".json"));
        if (mapFiles == null) return;
        for (File mapFile : mapFiles) {
            MapData mapData = MAPPER.readValue(mapFile, MapData.class);
            maps.put(mapData.getId(), mapData);
        }
    }

    private void loadXpCurve() throws IOException {
        File file = new File(dataDir, "xp_curve.json");
        if (!file.exists()) {
            LOG.warning("xp_curve.json not found at " + file.getAbsolutePath() + ", using defaults");
            return;
        }
        JsonNode root = MAPPER.readTree(file);
        JsonNode arr = root.get("xpPerLevel");
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) {
                xpCurve.add(n.asInt());
            }
        }
    }

    private void loadSkins() throws IOException {
        File file = new File(dataDir, "skins.json");
        if (!file.exists()) {
            LOG.warning("skins.json not found at " + file.getAbsolutePath());
            skinsRaw = MAPPER.createObjectNode();
            return;
        }
        skinsRaw = MAPPER.readTree(file);
        int count = 0;
        if (skinsRaw.isObject()) {
            count = skinsRaw.size();
        }
        LOG.info("Loaded " + count + " skins");
    }

    // Accessors
    public JsonNode getSkinsRaw() { return skinsRaw; }
    public List<Integer> getXpCurve() { return xpCurve; }

    /**
     * Get XP required to level up from the given level.
     * Uses data-driven xp_curve.json. Falls back to formula if no data loaded.
     */
    public int getXpForLevel(int level) {
        if (xpCurve != null && !xpCurve.isEmpty()) {
            int idx = level - 1; // level 1 → index 0
            if (idx < 0) idx = 0;
            if (idx >= xpCurve.size()) return xpCurve.get(xpCurve.size() - 1);
            return xpCurve.get(idx);
        }
        // Fallback formula
        return (int)(15 + level * 8 + Math.pow(level, 1.8) * 3);
    }

    public Map<String, SkillData> getSkills() { return skills; }
    public SkillData getSkill(String id) { return skills.get(id); }

    public Map<String, ClassData> getClasses() { return classes; }
    public ClassData getClassData(String id) { return classes.get(id); }

    public Map<String, MonsterData> getMonsters() { return monsters; }
    public MonsterData getMonster(String type) { return monsters.get(type); }

    public Map<String, MapData> getMaps() { return maps; }
    public MapData getMap(String id) { return maps.get(id); }

    public List<EvolutionData> getEvolutions() { return evolutions; }
}
