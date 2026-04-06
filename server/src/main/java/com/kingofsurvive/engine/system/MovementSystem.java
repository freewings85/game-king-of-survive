package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.ProjectileEntity;
import com.kingofsurvive.engine.entity.Vec2;

import java.util.List;

public class MovementSystem {
    private double worldWidth;
    private double worldHeight;

    public MovementSystem(double worldWidth, double worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
    }

    public void update(List<PlayerEntity> players, List<EnemyEntity> enemies,
                       List<ProjectileEntity> projectiles, double dt) {
        // Update player positions from input
        for (PlayerEntity p : players) {
            if (!p.isAlive()) continue;

            // Update dodge timers
            if (p.getDodgeTimer() > 0) {
                p.setDodgeTimer(p.getDodgeTimer() - dt);
            }
            if (p.getDodgeCooldown() > 0) {
                p.setDodgeCooldown(p.getDodgeCooldown() - dt);
            }

            double mx = p.getMoveInputX();
            double my = p.getMoveInputY();
            double len = Math.sqrt(mx * mx + my * my);
            if (len > 0.01) {
                double nx = mx / len;
                double ny = my / len;
                double speed = p.getSpeed();

                // Dodge: 3x speed burst during dash
                if (p.isDodging()) {
                    speed *= 3.0;
                }

                p.getPosition().x += nx * speed * dt;
                p.getPosition().y += ny * speed * dt;
            }

            // Clamp to world bounds
            p.getPosition().clamp(0, 0, worldWidth, worldHeight);

            // Update survival time
            p.setSurvivalTime(p.getSurvivalTime() + dt);
        }

        // Update enemy positions
        for (EnemyEntity e : enemies) {
            if (!e.isAlive()) continue;

            Vec2 target = e.getMoveTarget();
            if (target != null) {
                double dx = target.x - e.getX();
                double dy = target.y - e.getY();
                double dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 2) {
                    double effectiveSpeed = e.getEffectiveSpeed();
                    e.getPosition().x += (dx / dist) * effectiveSpeed * dt;
                    e.getPosition().y += (dy / dist) * effectiveSpeed * dt;
                }
            }

            // Clamp to world bounds
            e.getPosition().clamp(0, 0, worldWidth, worldHeight);

            // Update spawn fade
            if (e.getSpawnFade() < 1.0) {
                e.setSpawnFade(Math.min(1.0, e.getSpawnFade() + dt * 3));
            }
        }

        // Update projectile positions
        for (ProjectileEntity proj : projectiles) {
            if (!proj.isAlive()) continue;
            proj.update(dt);

            // Kill projectiles that leave the world
            if (proj.getX() < -50 || proj.getX() > worldWidth + 50
                    || proj.getY() < -50 || proj.getY() > worldHeight + 50) {
                proj.setAlive(false);
            }
        }
    }
}
