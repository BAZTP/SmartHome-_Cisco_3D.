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

  @org.springframework.transaction.annotation.Transactional
  public void record(UUID projectId, String source, String target, Result result) {
    UUID project = project(projectId);
    int bytes =
        result.probes().isEmpty()
            ? (result.ok() ? 64 : 0)
            : (int) result.probes().stream().filter(p -> p.delayMs() != null).count() * 64;
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
      db.update(
          "INSERT INTO packet_trace(event_id,result) VALUES (?,?::jsonb)",
          id,
          mapper.writeValueAsString(result));
      String message =
          mapper.writeValueAsString(
              new Entry(
                  id,
                  project,
                  java.time.Instant.now().toString(),
                  result.ok(),
                  result.message(),
                  bytes));
      if (org.springframework.transaction.support.TransactionSynchronizationManager
          .isSynchronizationActive())
        org.springframework.transaction.support.TransactionSynchronizationManager
            .registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                  @Override
                  public void afterCommit() {
                    socket.publish(message);
                  }
                });
      else socket.publish(message);
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

  public record TraceEntry(
      long id,
      String time,
      String source,
      String target,
      com.fasterxml.jackson.databind.JsonNode result) {}

  public List<TraceEntry> traces(UUID id) {
    return db.query(
        "SELECT e.id,e.occurred_at,e.source,e.target,t.result::text AS trace_json FROM"
            + " simulation_event e JOIN packet_trace t ON t.event_id=e.id WHERE e.project_id=?"
            + " ORDER BY e.id DESC LIMIT 100",
        (rs, index) -> {
          try {
            return new TraceEntry(
                rs.getLong("id"),
                rs.getTimestamp("occurred_at").toInstant().toString(),
                rs.getString("source"),
                rs.getString("target"),
                mapper.readTree(rs.getString("trace_json")));
          } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Traza inválida", e);
          }
        },
        project(id));
  }
}
