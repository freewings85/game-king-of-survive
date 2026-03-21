package com.kingofsurvive.engine.entity;

public class ProjectileEntity extends BaseEntity {
    private String ownerId;
    private int ownerFactionId;
    private double damage;
    private double speed;
    private Vec2 velocity;
    private double lifetime;
    private double maxLifetime;

    // Modifiers
    private boolean pierce;
    private int pierceCount; // how many enemies already pierced
    private int maxPierceCount;
    private boolean explosive;
    private double explosiveDmg;
    private double explosiveRadius;
    private boolean chain;
    private int chainCount;
    private int chainBounces;
    private double chainRange;

    // Visual
    private String color;
    private String visualType = "bullet"; // "bullet", "slash", "fireball", "arrow"
    private boolean isEnemyProjectile;

    // Crit
    private boolean isCrit;
    private double critMultiplier;

    public ProjectileEntity(String ownerId, int ownerFactionId, double x, double y,
                            double vx, double vy, double damage, double speed, double lifetime) {
        super(x, y, 4);
        this.ownerId = ownerId;
        this.ownerFactionId = ownerFactionId;
        this.damage = damage;
        this.speed = speed;
        this.velocity = new Vec2(vx, vy);
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.color = "#ff0";
        this.isEnemyProjectile = false;
        this.maxPierceCount = 0;
        this.explosiveRadius = 60;
        this.chainRange = 150;
        this.critMultiplier = 2.5;
    }

    public void update(double dt) {
        position.x += velocity.x * dt;
        position.y += velocity.y * dt;
        lifetime -= dt;
        if (lifetime <= 0) {
            alive = false;
        }
    }

    // Getters and setters
    public String getOwnerId() { return ownerId; }
    public int getOwnerFactionId() { return ownerFactionId; }
    public double getDamage() { return damage; }
    public void setDamage(double damage) { this.damage = damage; }
    public double getSpeed() { return speed; }
    public Vec2 getVelocity() { return velocity; }
    public double getLifetime() { return lifetime; }

    public boolean isPierce() { return pierce; }
    public void setPierce(boolean pierce) { this.pierce = pierce; }
    public int getPierceCount() { return pierceCount; }
    public void setPierceCount(int pierceCount) { this.pierceCount = pierceCount; }
    public int getMaxPierceCount() { return maxPierceCount; }
    public void setMaxPierceCount(int maxPierceCount) { this.maxPierceCount = maxPierceCount; }

    public boolean isExplosive() { return explosive; }
    public void setExplosive(boolean explosive) { this.explosive = explosive; }
    public double getExplosiveDmg() { return explosiveDmg; }
    public void setExplosiveDmg(double explosiveDmg) { this.explosiveDmg = explosiveDmg; }
    public double getExplosiveRadius() { return explosiveRadius; }

    public boolean isChain() { return chain; }
    public void setChain(boolean chain) { this.chain = chain; }
    public int getChainCount() { return chainCount; }
    public void setChainCount(int chainCount) { this.chainCount = chainCount; }
    public int getChainBounces() { return chainBounces; }
    public void setChainBounces(int chainBounces) { this.chainBounces = chainBounces; }
    public double getChainRange() { return chainRange; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public boolean isEnemyProjectile() { return isEnemyProjectile; }
    public void setEnemyProjectile(boolean enemyProjectile) { isEnemyProjectile = enemyProjectile; }

    public String getVisualType() { return visualType; }
    public void setVisualType(String visualType) { this.visualType = visualType; }

    public boolean isCrit() { return isCrit; }
    public void setCrit(boolean crit) { isCrit = crit; }
    public double getCritMultiplier() { return critMultiplier; }
    public void setCritMultiplier(double critMultiplier) { this.critMultiplier = critMultiplier; }
}
