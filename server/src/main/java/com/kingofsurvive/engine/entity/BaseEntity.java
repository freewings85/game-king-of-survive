package com.kingofsurvive.engine.entity;

import java.util.concurrent.atomic.AtomicLong;

public abstract class BaseEntity {
    private static final AtomicLong ID_GEN = new AtomicLong(1);

    protected String id;
    protected Vec2 position;
    protected double radius;
    protected boolean alive;

    public BaseEntity(double x, double y, double radius) {
        this.id = "e" + ID_GEN.getAndIncrement();
        this.position = new Vec2(x, y);
        this.radius = radius;
        this.alive = true;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Vec2 getPosition() { return position; }
    public double getX() { return position.x; }
    public double getY() { return position.y; }
    public void setPosition(double x, double y) { position.set(x, y); }

    public double getRadius() { return radius; }
    public void setRadius(double radius) { this.radius = radius; }

    public boolean isAlive() { return alive; }
    public void setAlive(boolean alive) { this.alive = alive; }

    public boolean collidesWith(BaseEntity other) {
        double dist = position.distanceTo(other.position);
        return dist < (radius + other.radius);
    }

    public double distanceTo(BaseEntity other) {
        return position.distanceTo(other.position);
    }
}
