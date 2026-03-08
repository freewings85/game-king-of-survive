package com.kingofsurvive.repository;

import com.kingofsurvive.model.Room;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class RoomRepository {

    private final ConcurrentHashMap<String, Room> rooms = new ConcurrentHashMap<String, Room>();

    public Room save(Room room) {
        rooms.put(room.getId(), room);
        return room;
    }

    public Room findById(String id) {
        return rooms.get(id);
    }

    public List<Room> findAll() {
        return new ArrayList<Room>(rooms.values());
    }

    public List<Room> findAvailable() {
        List<Room> available = new ArrayList<Room>();
        for (Room room : rooms.values()) {
            if ("waiting".equals(room.getState()) && room.getPlayers().size() < room.getMaxPlayers()) {
                available.add(room);
            }
        }
        return available;
    }

    public void deleteById(String id) {
        rooms.remove(id);
    }
}
