package com.smarthome.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.config.EventSocket;
import com.smarthome.controller.SimulationController.Result;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EventService {
  public record Entry(
      long id, UUID projectId, String time, boolean ok, String message, int bytes) {}

  private static final UUID DEMO = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private final JdbcTemplate db;
  private final EventSocket socket;
  private final ObjectMapper mapper;

  public EventService(JdbcTemplate db, EventSocket socket, ObjectMapper mapper) {
    this.db = db;
    this.socket = socket;
    this.mapper = mapper;
  }

  private UUID project(UUID id) {
    var key = id == null ? DEMO : id;
    if (!Boolean.TRUE.equals(
        db.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM network_project WHERE id=?)", Boolean.class, key)))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado");
    return key;
  }

  public void record(UUID projectId, String source, String target, Result result) {
    UUID project = project(projectId);
    int bytes = result.ok() ? 64 : 0;
    Long id =
        db.queryForObject(
            "INSERT INTO simulation_event(project_id,source,target,success,bytes,message) VALUES"
                + " (?,?,?,?,?,?) RETURNING id",
            Long.class,
            project,
            source,
            target,
            result.ok(),
            bytes,
            result.message());
    try {
      socket.publish(
          mapper.writeValueAsString(
              new Entry(
                  id,
                  project,
                  java.time.Instant.now().toString(),
                  result.ok(),
                  result.message(),
                  bytes)));
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw new IllegalStateException("No se pudo serializar evento", e);
    }
  }

  public List<Entry> list(UUID id) {
    return db.query(
        "SELECT * FROM simulation_event WHERE project_id=? ORDER BY id DESC LIMIT 100",
        (rs, index) ->
            new Entry(
                rs.getLong("id"),
                rs.getObject("project_id", UUID.class),
                rs.getTimestamp("occurred_at").toInstant().toString(),
                rs.getBoolean("success"),
                rs.getString("message"),
                rs.getInt("bytes")),
        project(id));
  }

  public Map<String, Object> metrics(UUID id) {
    return db.queryForMap(
        "SELECT COUNT(*) AS events,COALESCE(SUM(bytes),0) AS virtual_bytes,COUNT(*) FILTER (WHERE"
            + " NOT success) AS failures FROM simulation_event WHERE project_id=?",
        project(id));
  }
}
