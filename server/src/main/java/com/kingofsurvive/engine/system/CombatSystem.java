package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.ProjectileEntity;
import com.kingofsurvive.engine.entity.Vec2;
import com.kingofsurvive.engine.net.GameEvent;

import java.util.ArrayList;
import java.util.List;

public class CombatSystem {
    private double armorConstant = 100;
    private double randomMin = 0.9;
    private double randomMax = 1.1;

    private List<GameEvent> pendingEvents = new ArrayList<>();

    public List<GameEvent> getPendingEvents() {
        List<GameEvent> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    public void update(List<PlayerEntity> players, List<EnemyEntity> enemies,
                       List<ProjectileEntity> projectiles, double gameTime, double dt) {
        // Player projectiles vs enemies
        resolveProjectileVsEnemies(players, enemies, projectiles);

        // Player projectiles vs enemy players (PvP)
        resolveProjectileVsPlayers(players, projectiles, gameTime);

        // Green enemy pickup (touch = absorb XP)
        resolveGreenEnemyPickup(players, enemies);

        // Enemy projectiles vs players (only bullets cause damage now)
        resolveEnemyProjectilesVsPlayers(players, projectiles, gameTime);

        // Enemy melee contact damage (enemies touching players deal DPS)
        resolveEnemyMeleeDamage(players, enemies, dt);

        // Thorns damage
        resolveThornsDamage(players, enemies, dt);

        // Orbit damage aura
        resolveOrbitDamage(players, enemies, dt);

        // Pull radius (gravity_well evolution)
        resolvePullRadius(players, enemies, dt);

        // HP regen
        resolveHPRegen(players, dt);

        // Timer updates
        updateTimers(players, dt);
        updateEnemyTimers(enemies, dt);
    }

    private void resolveProjectileVsEnemies(List<PlayerEntity> players,
                                             List<EnemyEntity> enemies,
                                             List<ProjectileEntity> projectiles) {
        for (ProjectileEntity proj : projectiles) {
            if (!proj.isAlive() || proj.isEnemyProjectile()) continue;

            for (EnemyEntity enemy : enemies) {
                if (!enemy.isAlive()) continue;
                if (!proj.isAlive()) break;

                double dist = proj.getPosition().distanceTo(enemy.getPosition());
                if (dist < proj.getRadius() + enemy.getRadius()) {
                    // Hit!
                    double damage = proj.getDamage();

                    // Crit
                    boolean crit = proj.isCrit();
                    if (crit) {
                        damage *= proj.getCritMultiplier();
                    }

                    // Random variance
                    damage *= randomMin + Math.random() * (randomMax - randomMin);

                    // Apply damage
                    enemy.takeDamage(damage);
                    pendingEvents.add(GameEvent.damage(enemy.getId(), damage, crit, proj.getOwnerId()));

                    // Knockback
                    double kbDist = 5;
                    Vec2 dir = enemy.getPosition().sub(proj.getPosition()).normalized();
                    enemy.getPosition().x += dir.x * kbDist;
                    enemy.getPosition().y += dir.y * kbDist;

                    // Chain lightning
                    if (proj.isChain() && proj.getChainBounces() < proj.getChainCount()) {
                        applyChainLightning(proj, enemy, enemies);
                    }

                    // Explosive
                    if (proj.isExplosive()) {
                        applyExplosion(proj, enemy, enemies);
                    }

                    // Lifesteal on hit (% of damage dealt)
                    PlayerEntity owner = findPlayer(players, proj.getOwnerId());
                    if (owner != null && owner.getLifestealRate() > 0) {
                        owner.heal(damage * owner.getLifestealRate());
                    }

                    // Check kill
                    if (!enemy.isAlive()) {
                        if (owner != null) {
                            owner.addKill();
                            owner.addXP(enemy.getXpReward());

                            pendingEvents.add(GameEvent.kill(owner.getPlayerId(),
                                    enemy.getId(), enemy.getXpReward(),
                                    enemy.getX(), enemy.getY()));
                        }
                    }

                    // Pierce or destroy projectile
                    if (proj.isPierce()) {
                        proj.setPierceCount(proj.getPierceCount() + 1);
                        if (proj.getPierceCount() >= proj.getMaxPierceCount() + 1) {
                            proj.setAlive(false);
                        }
                    } else {
                        proj.setAlive(false);
                    }
                }
            }
        }
    }

    private void resolveProjectileVsPlayers(List<PlayerEntity> players,
                                             List<ProjectileEntity> projectiles,
                                             double gameTime) {
        // PvP immunity for first 60 seconds (farming phase, aligns with storm start)
        if (gameTime < 60) return;

        for (ProjectileEntity proj : projectiles) {
            if (!proj.isAlive() || proj.isEnemyProjectile()) continue;

            for (PlayerEntity target : players) {
                if (!target.isAlive()) continue;
                if (target.getPlayerId().equals(proj.getOwnerId())) continue;
                if (target.getFactionId() == proj.getOwnerFactionId()) continue;

                double dist = proj.getPosition().distanceTo(target.getPosition());
                if (dist < proj.getRadius() + target.getRadius()) {
                    double damage = proj.getDamage();
                    if (proj.isCrit()) damage *= proj.getCritMultiplier();
                    damage *= randomMin + Math.random() * (randomMax - randomMin);

                    // Gradual PvP damage ramp: 75% at 60-80s, full after 80s
                    if (gameTime < 80) {
                        damage *= 0.75;
                    }

                    target.takeDamage(damage);
                    pendingEvents.add(GameEvent.damage(target.getPlayerId(), damage, proj.isCrit(), proj.getOwnerId()));

                    if (!target.isAlive()) {
                        PlayerEntity killer = findPlayer(players, proj.getOwnerId());
                        if (killer != null) {
                            killer.addKill();
                            pendingEvents.add(GameEvent.playerKill(
                                    killer.getPlayerId(), target.getPlayerId()));
                        }
                    }

                    // Pierce or destroy projectile (same as PvE)
                    if (proj.isPierce()) {
                        proj.setPierceCount(proj.getPierceCount() + 1);
                        if (proj.getPierceCount() >= proj.getMaxPierceCount() + 1) {
                            proj.setAlive(false);
                            break;
                        }
                    } else {
                        proj.setAlive(false);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Green (non-hostile) enemies: player touches them → absorb XP, enemy disappears.
     */
    private void resolveGreenEnemyPickup(List<PlayerEntity> players,
                                          List<EnemyEntity> enemies) {
        for (PlayerEntity player : players) {
            if (!player.isAlive()) continue;

            for (EnemyEntity enemy : enemies) {
                if (!enemy.isAlive() || enemy.isHostile()) continue;

                double dist = enemy.getPosition().distanceTo(player.getPosition());
                if (dist < enemy.getRadius() + player.getRadius() + 10) {
                    // Absorb XP
                    double xp = enemy.getXpReward();
                    player.addXP(xp);
                    enemy.setAlive(false);
                    pendingEvents.add(GameEvent.kill(player.getPlayerId(),
                            enemy.getId(), xp, enemy.getX(), enemy.getY()));
                }
            }
        }
    }

    private void resolveEnemyProjectilesVsPlayers(List<PlayerEntity> players,
                                                    List<ProjectileEntity> projectiles,
                                                    double gameTime) {
        for (ProjectileEntity proj : projectiles) {
            if (!proj.isAlive() || !proj.isEnemyProjectile()) continue;

            for (PlayerEntity player : players) {
                if (!player.isAlive()) continue;

                double dist = proj.getPosition().distanceTo(player.getPosition());
                if (dist < proj.getRadius() + player.getRadius()) {
                    double damage = proj.getDamage();
                    player.takeDamage(damage);
                    pendingEvents.add(GameEvent.damage(player.getPlayerId(), damage, false, proj.getOwnerId()));
                    proj.setAlive(false);
                    break;
                }
            }
        }
    }

    private void resolveThornsDamage(List<PlayerEntity> players, List<EnemyEntity> enemies, double dt) {
        for (PlayerEntity player : players) {
            if (!player.isAlive() || player.getThornsDmg() <= 0) continue;

            for (EnemyEntity enemy : enemies) {
                if (!enemy.isAlive()) continue;
                double dist = player.getPosition().distanceTo(enemy.getPosition());
                if (dist < player.getRadius() + enemy.getRadius() + 40) {
                    // Thorns damage per second, scaled by dt
                    double thornsDmg = player.getThornsDmg() * dt;
                    enemy.takeDamage(thornsDmg);
                    pendingEvents.add(GameEvent.damage(enemy.getId(), thornsDmg, false, player.getPlayerId()));
                    if (!enemy.isAlive()) {
                        player.addKill();
                        player.addXP(enemy.getXpReward());
                        pendingEvents.add(GameEvent.kill(player.getPlayerId(),
                                enemy.getId(), enemy.getXpReward(),
                                enemy.getX(), enemy.getY()));
                    }
                }
            }
        }
    }

    private void resolveOrbitDamage(List<PlayerEntity> players, List<EnemyEntity> enemies, double dt) {
        for (PlayerEntity player : players) {
            if (!player.isAlive() || player.getOrbitCount() <= 0) continue;
            double orbitRadius = 60;
            double orbitDmg = player.getOrbitCount() * 8.0 * player.getOrbitDmgMultiplier();
            for (EnemyEntity enemy : enemies) {
                if (!enemy.isAlive()) continue;
                double dist = player.getPosition().distanceTo(enemy.getPosition());
                if (dist < orbitRadius + enemy.getRadius()) {
                    double orbitHit = orbitDmg * dt;
                    enemy.takeDamage(orbitHit);
                    pendingEvents.add(GameEvent.damage(enemy.getId(), orbitHit, false, player.getPlayerId()));
                    if (!enemy.isAlive()) {
                        player.addKill();
                        player.addXP(enemy.getXpReward());
                        pendingEvents.add(GameEvent.kill(player.getPlayerId(),
                                enemy.getId(), enemy.getXpReward(),
                                enemy.getX(), enemy.getY()));
                    }
                }
            }
        }
    }

    private void resolvePullRadius(List<PlayerEntity> players, List<EnemyEntity> enemies, double dt) {
        for (PlayerEntity player : players) {
            if (!player.isAlive() || player.getPullRadius() <= 0) continue;
            double pullStr = 80 * dt; // pull speed
            for (EnemyEntity enemy : enemies) {
                if (!enemy.isAlive()) continue;
                double dist = player.getPosition().distanceTo(enemy.getPosition());
                if (dist < player.getPullRadius() && dist > 5) {
                    Vec2 dir = player.getPosition().sub(enemy.getPosition()).normalized();
                    enemy.getPosition().x += dir.x * pullStr;
                    enemy.getPosition().y += dir.y * pullStr;
                }
            }
        }
    }

    private void resolveHPRegen(List<PlayerEntity> players, double dt) {
        for (PlayerEntity player : players) {
            if (!player.isAlive()) continue;
            // Base passive regen: 2 HP/s for all players
            player.heal(2.0 * dt);
            // Attribute-based regen (STA)
            if (player.getHpRegen() > 0) {
                player.heal(player.getHpRegen() * dt);
            }
            // Emergency heal when HP < 30% — 3 HP/s
            if (player.getHp() < player.getMaxHp() * 0.3) {
                player.heal(3.0 * dt);
            }
        }
    }

    private void updateTimers(List<PlayerEntity> players, double dt) {
        for (PlayerEntity p : players) {
            // Newbie shield countdown
            if (p.getNewbieShieldTimer() > 0) {
                p.setNewbieShieldTimer(p.getNewbieShieldTimer() - dt);
            }

            // Invincibility
            if (p.getInvincibleTimer() > 0) {
                p.setInvincibleTimer(p.getInvincibleTimer() - dt);
            }

            // Melee i-frame countdown
            if (p.getMeleeIFrameTimer() > 0) {
                p.setMeleeIFrameTimer(p.getMeleeIFrameTimer() - dt);
            }

            // Shield cooldown
            if (p.getShieldCooldown() > 0) {
                p.setShieldCooldown(p.getShieldCooldown() - dt);
                if (p.getShieldCooldown() <= 0 && p.getSkillLevel("shield") > 0) {
                    p.setShieldActive(true);
                    int sLv = p.getSkillLevel("shield");
                    p.setShieldHits(sLv >= 4 ? 3 : (sLv >= 2 ? 2 : 1));
                }
            }

            // Attack timer
            if (p.getAttackTimer() > 0) {
                p.setAttackTimer(p.getAttackTimer() - dt);
            }

            // Kill streak decay
            if (p.getKillStreakTimer() > 0) {
                p.setKillStreakTimer(p.getKillStreakTimer() - dt);
                if (p.getKillStreakTimer() <= 0) {
                    p.setKillStreak(0);
                }
            }

            // Fury check
            p.setFuryActive(p.getHp() > 0 && p.getHp() < p.getMaxHp() * 0.25);
        }
    }

    private void updateEnemyTimers(List<EnemyEntity> enemies, double dt) {
        for (EnemyEntity e : enemies) {
            if (!e.isAlive()) continue;
            if (e.getHitFlashTimer() > 0) {
                e.setHitFlashTimer(e.getHitFlashTimer() - dt);
            }

            // Boss ability timer
            if ("boss".equals(e.getType()) || "miniBoss".equals(e.getType())) {
                e.setBossAbilityTimer(e.getBossAbilityTimer() + dt);
            }

            // Teleport affix
            if ("teleport".equals(e.getAffix())) {
                e.setAffixTimer(e.getAffixTimer() + dt);
                if (e.getAffixTimer() >= 4.0) {
                    // Teleport to random position near current
                    double angle = Math.random() * Math.PI * 2;
                    double dist = 100 + Math.random() * 100;
                    e.getPosition().x += Math.cos(angle) * dist;
                    e.getPosition().y += Math.sin(angle) * dist;
                    e.setAffixTimer(0);
                }
            }

            // Treasure goblin escape timer
            if (e.isFleeFromPlayer()) {
                e.setEscapeTimer(e.getEscapeTimer() - dt);
                if (e.getEscapeTimer() <= 0) {
                    e.setAlive(false);
                }
            }
        }
    }

    private void applyChainLightning(ProjectileEntity proj, EnemyEntity hitEnemy,
                                      List<EnemyEntity> enemies) {
        EnemyEntity current = hitEnemy;
        int bounces = proj.getChainBounces();
        double chainDamage = proj.getDamage() * 0.7;

        for (int i = bounces; i < proj.getChainCount(); i++) {
            EnemyEntity nearest = null;
            double nearestDist = proj.getChainRange();
            for (EnemyEntity e : enemies) {
                if (!e.isAlive() || e == current) continue;
                double d = current.getPosition().distanceTo(e.getPosition());
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = e;
                }
            }
            if (nearest == null) break;

            // Emit chain arc visual event with source/target world coordinates
            pendingEvents.add(GameEvent.chainArc(
                    current.getX(), current.getY(),
                    nearest.getX(), nearest.getY()));

            nearest.takeDamage(chainDamage);
            pendingEvents.add(GameEvent.damage(nearest.getId(), chainDamage, false, proj.getOwnerId()));
            current = nearest;
            chainDamage *= 0.7;
        }

        proj.setChainBounces(proj.getChainCount());
    }

    private void applyExplosion(ProjectileEntity proj, EnemyEntity hitEnemy,
                                 List<EnemyEntity> enemies) {
        double explosiveRadius = proj.getExplosiveRadius();
        double explosiveDmg = proj.getExplosiveDmg();

        for (EnemyEntity e : enemies) {
            if (!e.isAlive() || e == hitEnemy) continue;
            double d = hitEnemy.getPosition().distanceTo(e.getPosition());
            if (d < explosiveRadius) {
                double falloff = 1 - (d / explosiveRadius);
                double splashDmg = explosiveDmg * falloff;
                e.takeDamage(splashDmg);
                pendingEvents.add(GameEvent.damage(e.getId(), splashDmg, false, proj.getOwnerId()));
            }
        }
    }

    /**
     * Enemies that overlap with a player deal continuous melee damage (DPS).
     * Hostile enemies deal full damage; passive (green) enemies deal 40% damage.
     * This prevents the "stand still and win" exploit.
     */
    private void resolveEnemyMeleeDamage(List<PlayerEntity> players,
                                          List<EnemyEntity> enemies, double dt) {
        for (PlayerEntity player : players) {
            if (!player.isAlive()) continue;

            double totalMeleeDps = 0;
            for (EnemyEntity enemy : enemies) {
                if (!enemy.isAlive()) continue;
                double dist = player.getPosition().distanceTo(enemy.getPosition());
                double touchDist = player.getRadius() + enemy.getRadius() + 2;
                if (dist < touchDist) {
                    double dps = enemy.getDamage();
                    if (!enemy.isHostile()) {
                        dps *= 0.4;
                    }
                    totalMeleeDps += dps;
                }
            }

            if (totalMeleeDps > 0) {
                player.takeDamage(totalMeleeDps * dt);
            }
        }
    }

    private PlayerEntity findPlayer(List<PlayerEntity> players, String playerId) {
        for (PlayerEntity p : players) {
            if (p.getPlayerId().equals(playerId)) return p;
        }
        return null;
    }
}
