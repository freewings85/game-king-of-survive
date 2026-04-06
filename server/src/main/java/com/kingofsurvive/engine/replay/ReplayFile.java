package com.kingofsurvive.engine.replay;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.kingofsurvive.engine.net.GameStateSnapshot;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ReplayFile {
    private String matchId;
    private long startTime;
    private long endTime;
    private int totalTicks;
    private List<GameStateSnapshot> snapshots;

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }
    public long getStartTime() { return startTime; }
    public void setStartTime(long startTime) { this.startTime = startTime; }
    public long getEndTime() { return endTime; }
    public void setEndTime(long endTime) { this.endTime = endTime; }
    public int getTotalTicks() { return totalTicks; }
    public void setTotalTicks(int totalTicks) { this.totalTicks = totalTicks; }
    public List<GameStateSnapshot> getSnapshots() { return snapshots; }
    public void setSnapshots(List<GameStateSnapshot> snapshots) { this.snapshots = snapshots; }

    public double getDurationSeconds() {
        return totalTicks / 30.0;
    }
}
