package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.ProjectileEntity;
import com.kingofsurvive.engine.entity.Vec2;
import com.kingofsurvive.engine.net.GameEvent;

import java.util.ArrayList;
import java.util.List;

public class ProjectileSystem {

    private List<GameEvent> pendingEvents = new ArrayList<>();

    public List<GameEvent> getPendingEvents() {
        List<GameEvent> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    /**
     * Create player attack projectiles based on their attack timer and skills.
     * Auto-aims at nearest enemy within range; falls back to facing angle.
     */
    public void createPlayerProjectiles(PlayerEntity player,
                                         List<ProjectileEntity> projectiles,
                                         List<EnemyEntity> enemies,
                                         List<PlayerEntity> allPlayers,
                                         double gameTime) {
        if (!player.isAlive() || player.isBot()) return;
        if (player.getAttackTimer() > 0) return;

        // Reset attack timer
        player.setAttackTimer(player.getAttackCooldown());

        // Auto-aim: find nearest hostile target within range
        double autoAimRange = player.getDefaultRange() * (1 + player.getRangeBonus());
        double aimAngle = player.getFacingAngle(); // fallback

        // First, try nearest hostile enemy
        double nearestDist = autoAimRange;
        for (EnemyEntity e : enemies) {
            if (!e.isAlive()) continue;
            double dist = player.getPosition().distanceTo(e.getPosition());
            if (dist < nearestDist) {
                nearestDist = dist;
                double dx = e.getX() - player.getX();
                double dy = e.getY() - player.getY();
                aimAngle = Math.atan2(dy, dx);
            }
        }

        // If no enemy nearby and PvP is active, try nearest enemy player
        if (nearestDist >= autoAimRange && gameTime >= 20) {
            for (PlayerEntity p : allPlayers) {
                if (!p.isAlive() || p == player) continue;
                if (p.getFactionId() == player.getFactionId()) continue;
                double dist = player.getPosition().distanceTo(p.getPosition());
                if (dist < nearestDist) {
                    nearestDist = dist;
                    double dx = p.getX() - player.getX();
                    double dy = p.getY() - player.getY();
                    aimAngle = Math.atan2(dy, dx);
                }
            }
        }

        double projSpeed = player.getDefaultProjSpeed();
        double damage = player.getAttackDamage();
        if (player.isFuryActive()) {
            damage *= 1.5;
        }

        int count = player.getProjectileCount();
        double spreadAngle = count > 1 ? player.getDefaultAngle() : 0;

        for (int i = 0; i < count; i++) {
            double angle = aimAngle;
            if (count > 1) {
                angle += (i - (count - 1) / 2.0) * spreadAngle / (count - 1);
            }

            double vx = Math.cos(angle) * projSpeed;
            double vy = Math.sin(angle) * projSpeed;

            // Melee: short lifetime = range/speed; Ranged: 2s with range bonus
            double projLifetime;
            if ("melee_arc".equals(player.getDefaultProjType())) {
                projLifetime = player.getDefaultRange() / projSpeed;
            } else {
                projLifetime = 2.0 * (1 + player.getRangeBonus());
            }
            ProjectileEntity proj = new ProjectileEntity(
                    player.getPlayerId(), player.getFactionId(),
                    player.getX(), player.getY(),
                    vx, vy, damage, projSpeed, projLifetime
            );
            proj.setVisualType(player.getDefaultVisual());

            // Apply skill modifiers
            if (player.isPierce()) {
                proj.setPierce(true);
                proj.setMaxPierceCount(player.getSkillLevel("pierce"));
            }
            if (player.getChainCount() > 0) {
                proj.setChain(true);
                proj.setChainCount(player.getChainCount());
            }
            if (player.getExplosiveDmg() > 0) {
                proj.setExplosive(true);
                proj.setExplosiveDmg(player.getExplosiveDmg());
            }

            // Crit
            if (Math.random() < player.getCritChance()) {
                proj.setCrit(true);
                proj.setCritMultiplier(player.getCritDamage());
            }

            // Color based on enhancements
            if (proj.isExplosive()) proj.setColor("#f80");
            else if (proj.isChain()) proj.setColor("#aaf");
            else if (player.isFuryActive()) proj.setColor("#f44");

            projectiles.add(proj);
        }
    }

    /**
     * Create orbit projectiles that rotate around the player.
     */
    public void updateOrbitProjectiles(PlayerEntity player,
                                        List<ProjectileEntity> projectiles,
                                        double gameTime) {
        if (!player.isAlive() || player.getOrbitCount() <= 0) return;

        // Clean up dead orbit projectiles and re-create if needed
        // Orbit projectiles are handled as continuously spawning in a circle
        // For simplicity, orbit damage is handled in CombatSystem as an aura
    }

    /**
     * Create fire trail behind moving player.
     */
    public void updateFireTrail(PlayerEntity player, List<EnemyEntity> enemies,
                                 double dt) {
        if (!player.isAlive() || player.getFireTrailDmg() <= 0) return;

        // Fire trail damages nearby enemies
        for (EnemyEntity enemy : enemies) {
            if (!enemy.isAlive()) continue;
            double dist = player.getPosition().distanceTo(enemy.getPosition());
            if (dist < 40) {
                double fireDmg = player.getFireTrailDmg() * dt;
                enemy.takeDamage(fireDmg);
                pendingEvents.add(GameEvent.damage(enemy.getId(), fireDmg, false, player.getPlayerId()));
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

    /**
     * Create enemy ranged attack projectiles.
     */
    public void createEnemyProjectiles(List<EnemyEntity> enemies,
                                        List<PlayerEntity> players,
                                        List<ProjectileEntity> projectiles,
                                        double dt) {
        for (EnemyEntity enemy : enemies) {
            if (!enemy.isAlive() || !enemy.isRangedAttack()) continue;

            enemy.setRangedTimer(enemy.getRangedTimer() + dt);
            if (enemy.getRangedTimer() < enemy.getRangedCooldown()) continue;

            // Find nearest player
            PlayerEntity nearest = null;
            double nearestDist = enemy.getAttackRange();
            for (PlayerEntity p : players) {
                if (!p.isAlive()) continue;
                double dist = enemy.getPosition().distanceTo(p.getPosition());
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = p;
                }
            }

            if (nearest != null) {
                enemy.setRangedTimer(0);
                double dx = nearest.getX() - enemy.getX();
                double dy = nearest.getY() - enemy.getY();
                double dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1) continue;

                double speed = 200;
                ProjectileEntity proj = new ProjectileEntity(
                        enemy.getId(), -1,
                        enemy.getX(), enemy.getY(),
                        (dx / dist) * speed, (dy / dist) * speed,
                        enemy.getDamage(), speed, 3.0
                );
                proj.setEnemyProjectile(true);
                proj.setColor("#f44");
                projectiles.add(proj);
            }
        }
    }
}
