package com.kingofsurvive.model;

import java.util.ArrayList;
import java.util.List;

public class Room {

    private String id;
    private String hostId;
    private String mode;
    private String mapId;
    private List<RoomPlayer> players = new ArrayList<RoomPlayer>();
    private int maxPlayers = 8;
    private String state = "waiting";
    private long createdAt;

    public Room() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getMapId() {
        return mapId;
    }

    public void setMapId(String mapId) {
        this.mapId = mapId;
    }

    public List<RoomPlayer> getPlayers() {
        return players;
    }

    public void setPlayers(List<RoomPlayer> players) {
        this.players = players;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(long createdAt) {
        this.createdAt = createdAt;
    }
}
