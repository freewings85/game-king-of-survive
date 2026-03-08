package com.kingofsurvive.model;

public class DailyReward {

    private int day;
    private String rewardType;
    private int rewardValue;
    private String description;

    public DailyReward() {
    }

    public DailyReward(int day, String rewardType, int rewardValue, String description) {
        this.day = day;
        this.rewardType = rewardType;
        this.rewardValue = rewardValue;
        this.description = description;
    }

    public int getDay() {
        return day;
    }

    public void setDay(int day) {
        this.day = day;
    }

    public String getRewardType() {
        return rewardType;
    }

    public void setRewardType(String rewardType) {
        this.rewardType = rewardType;
    }

    public int getRewardValue() {
        return rewardValue;
    }

    public void setRewardValue(int rewardValue) {
        this.rewardValue = rewardValue;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
