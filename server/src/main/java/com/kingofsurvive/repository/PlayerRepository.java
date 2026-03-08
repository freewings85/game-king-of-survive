package com.kingofsurvive.repository;

import com.kingofsurvive.model.Player;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class PlayerRepository {

    private final ConcurrentHashMap<String, Player> players = new ConcurrentHashMap<String, Player>();

    public Player save(Player player) {
        players.put(player.getId(), player);
        return player;
    }

    public Player findById(String id) {
        return players.get(id);
    }

    public List<Player> findAll() {
        return new ArrayList<Player>(players.values());
    }

    public boolean existsById(String id) {
        return players.containsKey(id);
    }

    public void deleteById(String id) {
        players.remove(id);
    }
}
