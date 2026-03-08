package com.kingofsurvive.model;

import java.util.ArrayList;
import java.util.List;

public class GameSession {

    private String roomId;
    private String mode;
    private List<GamePlayerState> players = new ArrayList<GamePlayerState>();
    private int wave;
    private double gameTime;
    private String state = "playing";
    private long startedAt;

    public GameSession() {
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public List<GamePlayerState> getPlayers() {
        return players;
    }

    public void setPlayers(List<GamePlayerState> players) {
        this.players = players;
    }

    public int getWave() {
        return wave;
    }

    public void setWave(int wave) {
        this.wave = wave;
    }

    public double getGameTime() {
        return gameTime;
    }

    public void setGameTime(double gameTime) {
        this.gameTime = gameTime;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public long getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(long startedAt) {
        this.startedAt = startedAt;
    }
}
