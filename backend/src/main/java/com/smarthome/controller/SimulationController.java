package com.smarthome.controller;

import com.smarthome.dto.NetworkDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulation")
public class SimulationController {
  public record Request(
      @NotNull @Valid NetworkDto network,
      @NotBlank @Size(max = 100) String source,
      @NotBlank @Size(max = 15) String target,
      UUID projectId) {
    public Request(NetworkDto network, String source, String target) {
      this(network, source, target, null);
    }
  }

  public record Hop(String from, String to, int out, int incoming, int vlan) {}

  public record Probe(
      int ttl, String device, String address, String status, Integer delayMs, String cause) {}

  public record Result(
      boolean ok,
      String message,
      List<String> path,
      List<Hop> hops,
      String expired,
      List<Probe> probes) {
    public Result(boolean ok, String message, List<String> path, List<Hop> hops) {
      this(ok, message, path, hops, null, List.of());
    }

    public Result(boolean ok, String message, List<String> path) {
      this(ok, message, path, List.of());
    }
  }

  private final com.smarthome.service.NetworkSimulator simulator;
  private final com.smarthome.service.RuntimeService runtime;
  private final com.smarthome.service.EventService events;

  public SimulationController(
      com.smarthome.service.RuntimeService runtime,
      com.smarthome.service.EventService events,
      com.smarthome.service.NetworkSimulator simulator) {
    this.simulator = simulator;
    this.runtime = runtime;
    this.events = events;
  }

  @PostMapping("/ping")
  public Result ping(@Valid @RequestBody Request request) {
    var result =
        runtime
            .perform(
                request.network(),
                request.projectId(),
                new com.smarthome.service.RuntimeService.Action(
                    "probe", request.source(), request.target(), null, null, null, null, null))
            .result();
    events.record(request.projectId(), request.source(), request.target(), result);
    return result;
  }

  @PostMapping("/traceroute")
  public Result trace(
      @Valid @RequestBody Request request,
      @RequestParam(defaultValue = "30") @Min(1) @Max(30) int maxTtl) {
    var result = simulator.traceroute(request, maxTtl);
    events.record(request.projectId(), request.source(), request.target(), result);
    return result;
  }

  @GetMapping("/events")
  public List<com.smarthome.service.EventService.Entry> events(
      @RequestParam(required = false) UUID projectId) {
    return events.list(projectId);
  }

  @GetMapping("/traces")
  public List<com.smarthome.service.EventService.TraceEntry> traces(
      @RequestParam(required = false) UUID projectId) {
    return events.traces(projectId);
  }

  @GetMapping("/metrics")
  public Map<String, Object> metrics(@RequestParam(required = false) UUID projectId) {
    return events.metrics(projectId);
  }
}
