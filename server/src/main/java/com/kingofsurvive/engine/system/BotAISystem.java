package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.ProjectileEntity;
import com.kingofsurvive.engine.entity.Vec2;

import java.util.List;

public class BotAISystem {

    public void update(List<PlayerEntity> players, List<EnemyEntity> enemies,
                       List<ProjectileEntity> projectiles,
                       double gameTime, double dt,
                       boolean stormActive, double stormCenterX, double stormCenterY, double stormRadius) {
        for (PlayerEntity bot : players) {
            if (!bot.isBot() || !bot.isAlive()) continue;

            // Storm awareness: if outside or near edge of safe zone, prioritize moving toward center
            boolean outsideStorm = false;
            if (stormActive) {
                double stormDist = Math.sqrt(
                        Math.pow(bot.getX() - stormCenterX, 2) + Math.pow(bot.getY() - stormCenterY, 2));
                if (stormDist > stormRadius - 30) {
                    outsideStorm = true;
                    double sdx = stormCenterX - bot.getX();
                    double sdy = stormCenterY - bot.getY();
                    if (stormDist > 1) {
                        bot.setMoveInputX((sdx / stormDist) * 0.9);
                        bot.setMoveInputY((sdy / stormDist) * 0.9);
                    }
                }
            }

            // Find target (for attacking, and for movement if not fleeing storm)
            Vec2 targetPos = findTarget(bot, players, enemies, gameTime);

            // Threat-aware steering: consider ALL nearby enemies, not just nearest
            if (!outsideStorm) {
                double hpRatio = bot.getHp() / bot.getMaxHp();
                // Threat detection range scales with HP: full HP=120px, low HP=280px
                double threatRange = 120 + (1.0 - hpRatio) * 160;
                // Flee weight: 0 at full HP, ramps up as HP drops below 70%
                double fleeWeight = hpRatio < 0.7 ? (0.7 - hpRatio) / 0.7 : 0;

                // Sum repulsion vectors from all nearby enemies
                double repX = 0, repY = 0;
                int threatCount = 0;
                for (EnemyEntity e : enemies) {
                    if (!e.isAlive()) continue;
                    double edx = bot.getX() - e.getX();
                    double edy = bot.getY() - e.getY();
                    double eDist = Math.sqrt(edx * edx + edy * edy);
                    if (eDist < threatRange && eDist > 1) {
                        // Closer enemies push harder (inverse distance weighting)
                        double weight = (threatRange - eDist) / threatRange;
                        repX += (edx / eDist) * weight;
                        repY += (edy / eDist) * weight;
                        threatCount++;
                    }
                }

                // Normalize repulsion vector
                double repLen = Math.sqrt(repX * repX + repY * repY);
                if (repLen > 1) { repX /= repLen; repY /= repLen; }

                // Boost flee weight when surrounded (3+ enemies nearby)
                if (threatCount >= 3) fleeWeight = Math.max(fleeWeight, 0.5);
                if (threatCount >= 5) fleeWeight = Math.max(fleeWeight, 0.8);
                // Critical HP: always flee
                if (hpRatio < 0.25) fleeWeight = Math.max(fleeWeight, 0.9);

                if (targetPos != null) {
                    double dx = targetPos.x - bot.getX();
                    double dy = targetPos.y - bot.getY();
                    double dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 2) {
                        double chaseMultiplier = 0.6;
                        boolean chasingPlayer = isTargetPlayer(targetPos, players, bot);
                        if (chasingPlayer) chaseMultiplier = 0.85;

                        // Blend chase direction with flee direction
                        double chaseX = (dx / dist) * chaseMultiplier;
                        double chaseY = (dy / dist) * chaseMultiplier;

                        double blendX = chaseX * (1.0 - fleeWeight) + repX * 0.9 * fleeWeight;
                        double blendY = chaseY * (1.0 - fleeWeight) + repY * 0.9 * fleeWeight;

                        bot.setMoveInputX(blendX);
                        bot.setMoveInputY(blendY);
                    } else if (fleeWeight > 0.3 && repLen > 0.1) {
                        // At target but threatened: flee
                        bot.setMoveInputX(repX * 0.9);
                        bot.setMoveInputY(repY * 0.9);
                    }
                } else if (fleeWeight > 0.3 && repLen > 0.1) {
                    // No target, but threatened: flee
                    bot.setMoveInputX(repX * 0.9);
                    bot.setMoveInputY(repY * 0.9);
                } else {
                    // Wander randomly
                    if (Math.random() < 0.02) {
                        double angle = Math.random() * Math.PI * 2;
                        bot.setMoveInputX(Math.cos(angle) * 0.5);
                        bot.setMoveInputY(Math.sin(angle) * 0.5);
                    }
                }
            }

            // Auto-attack toward target if in range (even when fleeing storm)
            if (targetPos != null) {
                double dx = targetPos.x - bot.getX();
                double dy = targetPos.y - bot.getY();
                double dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1) dist = 1; // prevent division by zero

                // Update bot facing angle toward target
                bot.setFacingAngle(Math.atan2(dy, dx));

                double attackRange = bot.getDefaultRange() * (1 + bot.getRangeBonus());
                if (dist < attackRange && bot.getAttackTimer() <= 0) {
                    bot.setAttackTimer(bot.getAttackCooldown());
                    double projSpeed = bot.getDefaultProjSpeed();
                    double damage = bot.getAttackDamage();
                    if (bot.isFuryActive()) {
                        damage *= 1.5;
                    }

                    int count = bot.getProjectileCount();
                    double spreadAngle = count > 1 ? bot.getDefaultAngle() : 0;

                    for (int pi = 0; pi < count; pi++) {
                        double angle = Math.atan2(dy / dist, dx / dist);
                        if (count > 1) {
                            angle += (pi - (count - 1) / 2.0) * spreadAngle / (count - 1);
                        }
                        double vx = Math.cos(angle) * projSpeed;
                        double vy = Math.sin(angle) * projSpeed;
                        double projLifetime;
                        if ("melee_arc".equals(bot.getDefaultProjType())) {
                            projLifetime = bot.getDefaultRange() / projSpeed;
                        } else {
                            projLifetime = 2.0 * (1 + bot.getRangeBonus());
                        }

                        ProjectileEntity proj = new ProjectileEntity(
                                bot.getPlayerId(), bot.getFactionId(),
                                bot.getX(), bot.getY(),
                                vx, vy, damage, projSpeed, projLifetime
                        );
                        proj.setVisualType(bot.getDefaultVisual());

                        // Apply skill modifiers
                        if (bot.isPierce()) {
                            proj.setPierce(true);
                            proj.setMaxPierceCount(bot.getSkillLevel("pierce"));
                        }
                        if (bot.getChainCount() > 0) {
                            proj.setChain(true);
                            proj.setChainCount(bot.getChainCount());
                        }
                        if (bot.getExplosiveDmg() > 0) {
                            proj.setExplosive(true);
                            proj.setExplosiveDmg(bot.getExplosiveDmg());
                        }

                        // Crit with player's critDamage
                        if (Math.random() < bot.getCritChance()) {
                            proj.setCrit(true);
                            proj.setCritMultiplier(bot.getCritDamage());
                        }

                        // Color based on enhancements
                        if (proj.isExplosive()) proj.setColor("#f80");
                        else if (proj.isChain()) proj.setColor("#aaf");
                        else if (bot.isFuryActive()) proj.setColor("#f44");

                        projectiles.add(proj);
                    }
                }
            }

            // Bot HP regen
            if (bot.getHp() < bot.getMaxHp()) {
                bot.heal(1.0 * dt);
            }
        }
    }

    private Vec2 findTarget(PlayerEntity bot, List<PlayerEntity> players,
                             List<EnemyEntity> enemies, double gameTime) {
        Vec2 nearest = null;
        double nearestDist = Double.MAX_VALUE;

        // Target nearest enemy monster
        for (EnemyEntity e : enemies) {
            if (!e.isAlive()) continue;
            double dist = bot.getPosition().distanceTo(e.getPosition());
            if (dist < nearestDist && dist < 500) {
                nearestDist = dist;
                nearest = e.getPosition().copy();
            }
        }

        // After PvP immunity (60s), gradually become PvP-aggressive
        // When ≤3 alive: always hunt other players (100%)
        // Otherwise: 20% at 60-90s, 40% at 90-120s, 60% at 120-150s, 80% after 150s
        int aliveCount = 0;
        for (PlayerEntity p : players) {
            if (p.isAlive()) aliveCount++;
        }
        if (gameTime >= 60) {
            double pvpChance;
            if (aliveCount <= 3) pvpChance = 1.0;
            else if (gameTime >= 150) pvpChance = 0.80;
            else if (gameTime >= 120) pvpChance = 0.60;
            else if (gameTime >= 90) pvpChance = 0.40;
            else pvpChance = 0.20;
            boolean wantPvP = Math.random() < pvpChance;
            if (wantPvP) {
                double pvpDetectRange = aliveCount <= 3 ? 2000 : 800; // endgame: full map awareness
                for (PlayerEntity p : players) {
                    if (!p.isAlive() || p == bot) continue;
                    if (p.getFactionId() == bot.getFactionId()) continue;

                    double dist = bot.getPosition().distanceTo(p.getPosition());
                    if (dist < pvpDetectRange && dist < nearestDist) {
                        nearestDist = dist;
                        nearest = p.getPosition().copy();
                    }
                }
            }
        }

        return nearest;
    }

    private boolean isTargetPlayer(Vec2 targetPos, List<PlayerEntity> players,
                                    PlayerEntity self) {
        for (PlayerEntity p : players) {
            if (p == self || !p.isAlive()) continue;
            if (p.getPosition().distanceTo(targetPos) < 1) return true;
        }
        return false;
    }

    private EnemyEntity findNearestEnemy(PlayerEntity bot, List<EnemyEntity> enemies) {
        EnemyEntity nearest = null;
        double nearestDist = Double.MAX_VALUE;
        for (EnemyEntity e : enemies) {
            if (!e.isAlive()) continue;
            double dist = bot.getPosition().distanceTo(e.getPosition());
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        }
        return nearest;
    }
}
