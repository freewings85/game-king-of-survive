package com.kingofsurvive.service;

import com.kingofsurvive.model.DailyReward;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class DailyRewardService {

    private final List<DailyReward> rewardSchedule;

    public DailyRewardService() {
        List<DailyReward> schedule = new ArrayList<DailyReward>();
        schedule.add(new DailyReward(1, "gold", 100, "Day 1: 100 Gold"));
        schedule.add(new DailyReward(2, "exp_boost", 200, "Day 2: Experience Boost"));
        schedule.add(new DailyReward(3, "skin_fragment", 2, "Day 3: 2 Skin Fragments"));
        schedule.add(new DailyReward(4, "gold", 200, "Day 4: 200 Gold"));
        schedule.add(new DailyReward(5, "skin_fragment", 3, "Day 5: 3 Skin Fragments"));
        schedule.add(new DailyReward(6, "gold", 300, "Day 6: 300 Gold"));
        schedule.add(new DailyReward(7, "skin", 1, "Day 7: Complete Skin"));
        this.rewardSchedule = Collections.unmodifiableList(schedule);
    }

    public List<DailyReward> getRewardSchedule() {
        return rewardSchedule;
    }

    public DailyReward getRewardForDay(int day) {
        if (day < 1 || day > 7) {
            throw new RuntimeException("Invalid day: " + day + ". Must be 1-7.");
        }
        return rewardSchedule.get(day - 1);
    }
}
