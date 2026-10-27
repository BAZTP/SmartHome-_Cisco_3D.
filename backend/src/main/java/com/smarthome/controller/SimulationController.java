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

  public record Result(boolean ok, String message, List<String> path) {}

  private final com.smarthome.service.NetworkSimulator simulator;
  private final com.smarthome.service.EventService events;

  public SimulationController(
      com.smarthome.service.NetworkSimulator simulator, com.smarthome.service.EventService events) {
    this.simulator = simulator;
    this.events = events;
  }

  @PostMapping("/ping")
  public Result ping(@Valid @RequestBody Request request) {
    var result = simulator.ping(request);
    events.record(request.projectId(), request.source(), request.target(), result);
    return result;
  }

  @PostMapping("/traceroute")
  public Result trace(@Valid @RequestBody Request request) {
    return ping(request);
  }

  @GetMapping("/events")
  public List<com.smarthome.service.EventService.Entry> events(
      @RequestParam(required = false) UUID projectId) {
    return events.list(projectId);
  }

  @GetMapping("/metrics")
  public Map<String, Object> metrics(@RequestParam(required = false) UUID projectId) {
    return events.metrics(projectId);
  }
}
