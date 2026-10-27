package com.smarthome.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.config.EventSocket;
import com.smarthome.controller.SimulationController.Result;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class EventService {
  private final JdbcTemplate db;
  private final EventSocket socket;
  private final ObjectMapper mapper;

  public EventService(JdbcTemplate db, EventSocket socket, ObjectMapper mapper) {
    this.db = db;
    this.socket = socket;
    this.mapper = mapper;
  }

  public void record(String source, String target, Result r) {
    int bytes = r.ok() ? 64 : 0;
    db.update(
        "INSERT INTO simulation_event(source,target,success,bytes,message) VALUES (?,?,?,?,?)",
        source,
        target,
        r.ok(),
        bytes,
        r.message());
    try {
      socket.publish(
          mapper.writeValueAsString(
              Map.of(
                  "time",
                  java.time.Instant.now().toString(),
                  "ok",
                  r.ok(),
                  "message",
                  r.message(),
                  "bytes",
                  bytes)));
    } catch (Exception e) {
      throw new IllegalStateException("No se pudo serializar evento", e);
    }
  }

  public List<Map<String, Object>> list() {
    return db.queryForList("SELECT * FROM simulation_event ORDER BY id DESC LIMIT 100");
  }

  public Map<String, Object> metrics() {
    return db.queryForMap(
        "SELECT COUNT(*) AS events,COALESCE(SUM(bytes),0) AS virtual_bytes,COUNT(*) FILTER (WHERE"
            + " NOT success) AS failures FROM simulation_event");
  }
}
