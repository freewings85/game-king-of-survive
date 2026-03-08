package com.kingofsurvive.service;

import com.kingofsurvive.model.SkinInfo;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SkinService {

    private final Map<String, SkinInfo> skinRegistry;
    private final List<SkinInfo> allSkins;

    public SkinService() {
        Map<String, SkinInfo> registry = new LinkedHashMap<String, SkinInfo>();

        // Default skin
        registry.put("default", new SkinInfo("default", "Default", "Standard player skin"));

        // Original skins
        registry.put("warrior_red", new SkinInfo("warrior_red", "Warrior Red", "Bold red warrior armor"));
        registry.put("warrior_blue", new SkinInfo("warrior_blue", "Warrior Blue", "Cool blue warrior armor"));
        registry.put("ninja_shadow", new SkinInfo("ninja_shadow", "Ninja Shadow", "Stealthy dark ninja outfit"));
        registry.put("knight_gold", new SkinInfo("knight_gold", "Knight Gold", "Gleaming golden knight armor"));
        registry.put("mage_purple", new SkinInfo("mage_purple", "Mage Purple", "Mystical purple mage robes"));

        // Themed skins
        registry.put("flame_red", new SkinInfo("flame_red", "Flame Red", "Fiery red flame effects"));
        registry.put("ice_blue", new SkinInfo("ice_blue", "Ice Blue", "Frosty ice crystal aura"));
        registry.put("forest_green", new SkinInfo("forest_green", "Forest Green", "Natural forest camouflage"));
        registry.put("royal_gold", new SkinInfo("royal_gold", "Royal Gold", "Luxurious royal gold trim"));
        registry.put("shadow_purple", new SkinInfo("shadow_purple", "Shadow Purple", "Dark shadowy purple haze"));

        // New skins
        registry.put("cherry_blossom", new SkinInfo("cherry_blossom", "Cherry Blossom", "Cute cherry blossom petals swirling around the player"));
        registry.put("starlight", new SkinInfo("starlight", "Starlight", "Sparkly celestial glow with twinkling star particles"));
        registry.put("ocean_wave", new SkinInfo("ocean_wave", "Ocean Wave", "Cool blue wave pattern with flowing water effects"));
        registry.put("neon_cyber", new SkinInfo("neon_cyber", "Neon Cyber", "Vibrant cyberpunk neon glow with electric trails"));
        registry.put("autumn_leaf", new SkinInfo("autumn_leaf", "Autumn Leaf", "Warm autumn colors with falling maple leaf particles"));

        this.skinRegistry = Collections.unmodifiableMap(registry);
        this.allSkins = Collections.unmodifiableList(new ArrayList<SkinInfo>(registry.values()));
    }

    public List<SkinInfo> getAllSkins() {
        return allSkins;
    }

    public SkinInfo getSkin(String skinId) {
        return skinRegistry.get(skinId);
    }

    public boolean skinExists(String skinId) {
        return skinRegistry.containsKey(skinId);
    }

    public List<String> getAllSkinIds() {
        return Collections.unmodifiableList(new ArrayList<String>(skinRegistry.keySet()));
    }
}
