package com.smarthome.service;

import com.smarthome.dto.NetworkDto;
import com.smarthome.repository.ProjectRepository;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SimulationSessionService {
  public record State(boolean running, String source, String target, int ticks) {}

  public record Step(State state, com.smarthome.controller.SimulationController.Result result) {}

  private final Map<UUID, State> sessions = new LinkedHashMap<>();
  private final RuntimeService runtime;
  private final EventService events;
  private final ProjectRepository projects;

  public SimulationSessionService(
      RuntimeService runtime, EventService events, ProjectRepository projects) {
    this.runtime = runtime;
    this.events = events;
    this.projects = projects;
  }

  private void exists(UUID id) {
    if (!projects.existsById(id))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado");
  }

  public synchronized State state(UUID id) {
    exists(id);
    return sessions.getOrDefault(id, new State(false, "", "", 0));
  }

  public synchronized State start(UUID id, NetworkDto network, String source, String target) {
    exists(id);
    if (network.devices().stream().noneMatch(d -> d.id().equals(source)))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Origen inexistente");
    if (!sessions.containsKey(id) && sessions.size() >= 64)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Límite de sesiones; pausa una simulación");
    var state = new State(true, source, target, 0);
    sessions.put(id, state);
    return state;
  }

  public synchronized State pause(UUID id) {
    var old = state(id);
    sessions.remove(id);
    return new State(false, old.source(), old.target(), old.ticks());
  }

  public synchronized Step step(UUID id, NetworkDto network) {
    var s = state(id);
    if (!s.running()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Simulación pausada");
    runtime.perform(
        network, id, new RuntimeService.Action("advance", null, null, null, null, null, null, 1));
    var result =
        runtime
            .perform(
                network,
                id,
                new RuntimeService.Action(
                    "probe", s.source(), s.target(), null, null, null, null, null))
            .result();
    events.record(id, s.source(), s.target(), result);
    var next = new State(s.ticks() + 1 < 300, s.source(), s.target(), s.ticks() + 1);
    if (next.running()) sessions.put(id, next);
    else sessions.remove(id);
    return new Step(next, result);
  }
}
