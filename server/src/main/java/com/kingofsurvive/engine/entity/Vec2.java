package com.kingofsurvive.engine.entity;

public class Vec2 {
    public double x;
    public double y;

    public Vec2() {
        this(0, 0);
    }

    public Vec2(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public Vec2 copy() {
        return new Vec2(x, y);
    }

    public double distanceTo(Vec2 other) {
        double dx = x - other.x;
        double dy = y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public double distanceSqTo(Vec2 other) {
        double dx = x - other.x;
        double dy = y - other.y;
        return dx * dx + dy * dy;
    }

    public double length() {
        return Math.sqrt(x * x + y * y);
    }

    public Vec2 normalize() {
        double len = length();
        if (len > 0) {
            x /= len;
            y /= len;
        }
        return this;
    }

    public Vec2 normalized() {
        double len = length();
        if (len > 0) {
            return new Vec2(x / len, y / len);
        }
        return new Vec2(0, 0);
    }

    public Vec2 add(Vec2 other) {
        return new Vec2(x + other.x, y + other.y);
    }

    public Vec2 sub(Vec2 other) {
        return new Vec2(x - other.x, y - other.y);
    }

    public Vec2 mul(double scalar) {
        return new Vec2(x * scalar, y * scalar);
    }

    public void set(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public void set(Vec2 other) {
        this.x = other.x;
        this.y = other.y;
    }

    public void clamp(double minX, double minY, double maxX, double maxY) {
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
    }
}
