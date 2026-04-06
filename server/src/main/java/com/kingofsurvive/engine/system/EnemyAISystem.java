package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.entity.EnemyEntity;
import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.Vec2;

import java.util.List;

/**
 * Handles enemy monster AI: target selection and movement toward players.
 */
public class EnemyAISystem {

    public void update(List<EnemyEntity> enemies, List<PlayerEntity> players, double dt) {
        for (EnemyEntity enemy : enemies) {
            if (!enemy.isAlive()) continue;

            // Treasure goblin flees from nearest player
            if (enemy.isFleeFromPlayer()) {
                updateFleeAI(enemy, players);
                continue;
            }

            // All enemies chase the nearest player (passive ones chase more slowly)
            PlayerEntity nearest = null;
            double nearestDist = Double.MAX_VALUE;

            for (PlayerEntity p : players) {
                if (!p.isAlive()) continue;
                double dist = enemy.getPosition().distanceTo(p.getPosition());
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = p;
                }
            }

            if (nearest != null) {
                enemy.setMoveTarget(nearest.getPosition().copy());

                // Apply slow aura from nearby players
                enemy.resetSlowFactor();
                for (PlayerEntity p : players) {
                    if (!p.isAlive()) continue;
                    double dist = enemy.getPosition().distanceTo(p.getPosition());

                    // Frost aura slow
                    if (p.getSlowAura() > 0 && dist < 120) {
                        enemy.applySlowFactor(1 - p.getSlowAura());
                    }

                    // Time warp slow
                    if (p.getTimeWarp() > 0 && dist < 150) {
                        enemy.applySlowFactor(1 - p.getTimeWarp());
                    }
                }

                // Non-hostile (green) enemies move slower toward player
                if (!enemy.isHostile()) {
                    enemy.applySlowFactor(0.6);
                }
            }
        }
    }

    private void updateWanderAI(EnemyEntity enemy, double dt) {
        // Pick a new random wander target when current one is reached or not set
        if (enemy.getMoveTarget() == null ||
            enemy.getPosition().distanceTo(enemy.getMoveTarget()) < 10) {
            double angle = Math.random() * Math.PI * 2;
            double dist = 80 + Math.random() * 120;
            Vec2 target = new Vec2(
                    enemy.getX() + Math.cos(angle) * dist,
                    enemy.getY() + Math.sin(angle) * dist
            );
            enemy.setMoveTarget(target);
        }
    }

    private void updateFleeAI(EnemyEntity goblin, List<PlayerEntity> players) {
        PlayerEntity nearest = null;
        double nearestDist = Double.MAX_VALUE;

        for (PlayerEntity p : players) {
            if (!p.isAlive()) continue;
            double dist = goblin.getPosition().distanceTo(p.getPosition());
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = p;
            }
        }

        if (nearest != null) {
            // Flee away from nearest player
            double dx = goblin.getX() - nearest.getX();
            double dy = goblin.getY() - nearest.getY();
            double dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.1) {
                Vec2 fleeTarget = new Vec2(
                        goblin.getX() + (dx / dist) * 200,
                        goblin.getY() + (dy / dist) * 200
                );
                goblin.setMoveTarget(fleeTarget);
            }
        }
    }
}
