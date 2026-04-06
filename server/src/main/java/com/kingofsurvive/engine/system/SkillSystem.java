package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.data.SkillData;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.net.GameEvent;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class SkillSystem {
    private Map<String, SkillData> skillDefs;
    private List<GameEvent> pendingEvents = new ArrayList<>();

    public SkillSystem(Map<String, SkillData> skillDefs) {
        this.skillDefs = skillDefs;
    }

    public List<GameEvent> getPendingEvents() {
        List<GameEvent> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    /**
     * Generate skill choices for level-up.
     * Filters by player's selectedBuild instead of all skills.
     */
    public List<String> generateSkillChoices(PlayerEntity player) {
        List<String> available = new ArrayList<>();
        List<String> build = player.getSelectedBuild();

        for (String skillId : build) {
            SkillData skill = skillDefs.get(skillId);
            if (skill == null) continue;
            if ("default_attack".equals(skill.getType())) continue;
            int curLevel = player.getSkillLevel(skillId);
            if (curLevel < skill.getMaxLevel()) {
                available.add(skillId);
            }
        }

        Collections.shuffle(available);

        // Pick 3 unique
        List<String> result = new ArrayList<>();
        for (String s : available) {
            if (!result.contains(s)) result.add(s);
            if (result.size() >= 3) break;
        }
        return result;
    }

    /**
     * Apply a skill to a player (on level-up selection or bot auto-assign).
     */
    public void applySkill(PlayerEntity player, String skillId) {
        player.addSkill(skillId);
        int level = player.getSkillLevel(skillId);
        SkillData def = skillDefs.get(skillId);
        if (def == null) return;

        Map<String, Double> levelData = def.getLevelData(level);
        if (levelData == null) {
            // Fallback to old levelScaling if no per-level data
            Map<String, Double> scaling = def.getLevelScaling();
            if (scaling == null) return;
            applySkillLegacy(player, skillId, level, scaling);
            return;
        }

        // Apply skill effects using per-level data
        switch (skillId) {
            case "attack_up": {
                double bonus = levelData.getOrDefault("attackBonus", 0.0);
                player.setAttackDamage(player.getBaseAttackDamage()
                        * (1 + player.getAttrSTR() * 0.01)
                        * (1 + player.getAttrINT() * 0.018)
                        * (1 + bonus));
                break;
            }

            case "attack_speed": {
                double cdr = levelData.getOrDefault("cooldownReduction", 0.0);
                player.setAttackCooldown(Math.max(0.2, 0.8 * (1 - cdr) * (1 - player.getCooldownReduction())));
                break;
            }

            case "pierce": {
                int count = levelData.getOrDefault("pierceCount", 1.0).intValue();
                double dmgBonus = levelData.getOrDefault("damageBonus", 0.0);
                player.setPierce(true);
                double base = player.getBaseAttackDamage();
                double STR = player.getAttrSTR();
                double INT = player.getAttrINT();
                player.setAttackDamage(base * (1 + STR * 0.01) * (1 + INT * 0.018) * (1 + dmgBonus));
                break;
            }

            case "scatter": {
                int count = levelData.getOrDefault("projectileCount", 1.0).intValue();
                player.setProjectileCount(1 + count);
                break;
            }

            case "move_speed": {
                double bonus = levelData.getOrDefault("speedBonus", 0.0);
                player.setSpeed(player.getBaseSpeed()
                        * (1 + player.getAttrAGI() * 0.005)
                        * (1 + bonus));
                break;
            }

            case "hp_regen": {
                double regen = levelData.getOrDefault("hpRegen", 3.0);
                player.setHpRegen(player.getAttrSTA() * 0.1 + regen);
                break;
            }

            case "shield": {
                int hits = levelData.getOrDefault("shieldHits", 1.0).intValue();
                double cooldown = levelData.getOrDefault("shieldCooldown", 6.0);
                player.setShieldActive(true);
                player.setShieldHits(hits);
                player.setShieldRechargeTime(cooldown);
                player.setShieldCooldown(cooldown);
                break;
            }

            case "chain_lightning": {
                int chains = levelData.getOrDefault("chainCount", 2.0).intValue();
                player.setChainCount(chains);
                break;
            }

            case "fire_trail": {
                double dmg = levelData.getOrDefault("damage", 4.0);
                player.setFireTrailDmg(dmg);
                break;
            }

            case "frost_aura": {
                double slow = levelData.getOrDefault("slowAmount", 0.2);
                player.setSlowAura(slow);
                break;
            }

            case "crit": {
                double chance = levelData.getOrDefault("critChance", 0.05);
                player.setCritChance(0.05 + player.getAttrAGI() * 0.001 + chance);
                break;
            }

            case "lifesteal": {
                double rate = levelData.getOrDefault("lifestealRate", 0.05);
                player.setLifestealRate(rate);
                break;
            }

            case "xp_magnet": {
                double range = levelData.getOrDefault("magnetRange", 50.0);
                player.setMagnetRange(80 + range);
                break;
            }

            case "explosive": {
                double dmg = levelData.getOrDefault("damage", 6.0);
                player.setExplosiveDmg(dmg);
                break;
            }

            case "max_hp": {
                double bonus = levelData.getOrDefault("maxHP", 20.0);
                double oldBonus = player.getMaxHpBonus();
                double diff = bonus - oldBonus;
                player.setMaxHpBonus(bonus);
                player.setMaxHp(player.getMaxHp() + diff);
                if (diff > 0) player.heal(diff);
                break;
            }

            case "orbit": {
                int count = levelData.getOrDefault("orbitCount", 1.0).intValue();
                player.setOrbitCount(count);
                break;
            }

            case "thorns_aura": {
                double dmg = levelData.getOrDefault("thornsDamage", 15.0);
                player.setThornsDmg(player.getBaseThornsDmg() + dmg + player.getAttrSTR() * 0.5);
                break;
            }

            case "time_warp": {
                double slow = levelData.getOrDefault("slowAmount", 0.15);
                player.setTimeWarp(slow);
                break;
            }
        }
    }

    /**
     * Legacy fallback: apply skill using old levelScaling (backward compatibility).
     */
    private void applySkillLegacy(PlayerEntity player, String skillId, int level, Map<String, Double> scaling) {
        switch (skillId) {
            case "attack_up":
                player.setAttackDamage(player.getBaseAttackDamage()
                        * (1 + player.getAttrSTR() * 0.01)
                        * (1 + player.getAttrINT() * 0.018)
                        * (1 + level * scaling.getOrDefault("effect", 0.25)));
                break;

            case "attack_speed": {
                double speedMult = Math.pow(1 - scaling.getOrDefault("effect", 0.15), level);
                double cdWithINT = (1 - player.getCooldownReduction());
                player.setAttackCooldown(Math.max(0.2, 0.8 * speedMult * cdWithINT));
                break;
            }

            case "pierce": {
                player.setPierce(true);
                double pierceDmgBonus = scaling.getOrDefault("damageBonus", 0.1);
                player.setAttackDamage(player.getBaseAttackDamage()
                        * (1 + player.getAttrSTR() * 0.01)
                        * (1 + player.getAttrINT() * 0.018)
                        * (1 + level * pierceDmgBonus));
                break;
            }

            case "scatter":
                player.setProjectileCount(1 + level * scaling.getOrDefault("projectileCount", 1.0).intValue());
                break;

            case "move_speed":
                player.setSpeed(player.getBaseSpeed()
                        * (1 + player.getAttrAGI() * 0.005)
                        * (1 + level * scaling.getOrDefault("effect", 0.1)));
                break;

            case "hp_regen":
                player.setHpRegen(player.getAttrSTA() * 0.1
                        + level * scaling.getOrDefault("hpRegen", 3.0));
                break;

            case "shield": {
                double rechargeTime = 6.0 - level * 0.8;
                player.setShieldActive(true);
                int shieldHits = level >= 4 ? 3 : (level >= 2 ? 2 : 1);
                player.setShieldHits(shieldHits);
                player.setShieldRechargeTime(rechargeTime);
                player.setShieldCooldown(rechargeTime);
                break;
            }

            case "chain_lightning":
                player.setChainCount(level * scaling.getOrDefault("chainCount", 1.0).intValue());
                break;

            case "fire_trail":
                player.setFireTrailDmg(level * scaling.getOrDefault("damage", 4.0));
                break;

            case "frost_aura":
                player.setSlowAura(level * scaling.getOrDefault("slowAmount", 0.2));
                break;

            case "crit":
                player.setCritChance(0.05 + player.getAttrAGI() * 0.001
                        + level * scaling.getOrDefault("critChance", 0.05));
                break;

            case "lifesteal":
                player.setLifestealRate(level * scaling.getOrDefault("lifestealRate", 0.05));
                break;

            case "xp_magnet":
                player.setMagnetRange(80 + level * scaling.getOrDefault("magnetRange", 50.0));
                break;

            case "explosive":
                player.setExplosiveDmg(level * scaling.getOrDefault("damage", 6.0));
                break;

            case "max_hp": {
                double newBonus = level * scaling.getOrDefault("maxHP", 20.0);
                double oldBonus = player.getMaxHpBonus();
                double diff = newBonus - oldBonus;
                player.setMaxHpBonus(newBonus);
                player.setMaxHp(player.getMaxHp() + diff);
                if (diff > 0) player.heal(diff);
                break;
            }

            case "orbit":
                player.setOrbitCount(level * scaling.getOrDefault("orbitCount", 1.0).intValue());
                break;

            case "thorns_aura":
                player.setThornsDmg(player.getBaseThornsDmg() + level * scaling.getOrDefault("damage", 15.0)
                        + player.getAttrSTR() * 0.5);
                break;

            case "time_warp":
                player.setTimeWarp(level * scaling.getOrDefault("slowAmount", 0.15));
                break;
        }
    }

    /**
     * Bot auto-selects a skill on level-up.
     * Simple priority: mix damage and defense based on HP situation.
     */
    public void botAutoSelectSkill(PlayerEntity bot) {
        List<String> choices = generateSkillChoices(bot);
        if (choices.isEmpty()) return;

        // Simple priority: mix damage and defense
        boolean wantDefensive = (bot.getHp() < bot.getMaxHp() * 0.7 && Math.random() < 0.6)
                || Math.random() < 0.35;

        if (wantDefensive) {
            List<String> defSkills = Arrays.asList("hp_regen", "lifesteal", "shield", "max_hp", "move_speed", "thorns_aura", "frost_aura");
            for (String d : defSkills) {
                if (choices.contains(d)) {
                    applySkill(bot, d);
                    return;
                }
            }
        }

        // Fallback: pick first available
        applySkill(bot, choices.get(0));
    }
}
