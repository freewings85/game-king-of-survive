package com.kingofsurvive.engine.system;

import com.kingofsurvive.engine.entity.PlayerEntity;
import com.kingofsurvive.engine.entity.Vec2;
import com.kingofsurvive.engine.net.GameEvent;

import java.util.ArrayList;
import java.util.List;

public class StormSystem {
    private boolean active;
    private double centerX;
    private double centerY;
    private double radius;
    private double maxRadius;
    private double shrinkSpeed = 50; // px/s — balanced shrink speed
    private double baseDamagePerSecond = 6;
    private double stormActiveTime = 0; // seconds since storm activated
    private double activationDelay = 6; // seconds after trigger condition (fewer players alive)
    private double delayTimer;
    private boolean triggered;
    private double lastDeathTime = -10; // game time of last storm death (for stagger cooldown)

    private double worldWidth;
    private double worldHeight;

    private List<GameEvent> pendingEvents = new ArrayList<>();

    public StormSystem(double worldWidth, double worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.centerX = worldWidth / 2;
        this.centerY = worldHeight / 2;
        this.maxRadius = Math.max(worldWidth, worldHeight) / 2;
        this.radius = maxRadius;
        this.active = false;
        this.triggered = false;
        this.delayTimer = 0;
    }

    public List<GameEvent> getPendingEvents() {
        List<GameEvent> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    public void update(List<PlayerEntity> players, double gameTime, double dt) {
        // Count alive players
        int aliveCount = 0;
        for (PlayerEntity p : players) {
            if (p.isAlive()) aliveCount++;
        }

        // Trigger conditions (any one):
        // 1. Few players left: 4 or fewer alive after 60s
        // 2. Forced: always start shrinking at 120s to keep games under 180s
        if (!triggered) {
            if ((aliveCount <= 4 && gameTime > 60) || gameTime > 120) {
                triggered = true;
                delayTimer = (gameTime > 120) ? 2 : activationDelay;
            }
        }

        // Countdown to activation
        if (triggered && !active) {
            delayTimer -= dt;
            if (delayTimer <= 0) {
                active = true;
                pendingEvents.add(GameEvent.stormStart(centerX, centerY, radius));
            }
        }

        // Shrink storm
        if (active) {
            stormActiveTime += dt;
            radius = Math.max(50, radius - shrinkSpeed * dt);

            // Storm damage scales: base 6 + 2.5 per 10s active, capped at 22 DPS
            // Lower cap + slower ramp = more staggered deaths
            double damagePerSecond = Math.min(22, baseDamagePerSecond + (stormActiveTime / 10.0) * 2.5);

            // Damage players outside the circle, but never kill the last one
            // Distance-based scaling: deeper in storm = more damage (prevents mass wipes)
            for (PlayerEntity player : players) {
                if (!player.isAlive()) continue;

                // Recount alive each iteration — a previous player may have just died
                int currentAlive = 0;
                for (PlayerEntity p : players) {
                    if (p.isAlive()) currentAlive++;
                }
                // Skip storm damage for the last surviving player (they win)
                if (currentAlive <= 1) break;

                double dist = Math.sqrt(
                        Math.pow(player.getX() - centerX, 2)
                                + Math.pow(player.getY() - centerY, 2)
                );
                if (dist > radius) {
                    // Scale damage by how deep into the storm (0.5x at edge, up to 1.5x deep)
                    double depthRatio = Math.min(2.0, (dist - radius) / Math.max(radius, 50));
                    double depthMultiplier = 0.5 + depthRatio;
                    // Per-player variance based on player hash to stagger deaths
                    double playerHash = (player.getPlayerId().hashCode() & 0x7FFFFFFF) / (double) Integer.MAX_VALUE;
                    double variance = 0.55 + playerHash * 0.9; // range [0.55, 1.45]
                    // Death cooldown: reduce damage by 40% for 0.8s after any storm death
                    double cooldownMult = (gameTime - lastDeathTime < 0.8) ? 0.6 : 1.0;
                    double prevHp = player.getHp();
                    player.takeEnvironmentalDamage(damagePerSecond * depthMultiplier * variance * cooldownMult * dt);
                    if (prevHp > 0 && player.getHp() <= 0) {
                        lastDeathTime = gameTime;
                    }
                }
            }
        }
    }

    public boolean isActive() { return active; }
    public double getCenterX() { return centerX; }
    public double getCenterY() { return centerY; }
    public double getRadius() { return radius; }
}
