package com.smarthome.controller;

import com.smarthome.dto.NetworkDto;
import com.smarthome.repository.ProjectRepository;
import com.smarthome.service.RuntimeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/simulation/runtime")
public class RuntimeController {
  public record Request(
      @NotNull @Valid NetworkDto network,
      UUID projectId,
      @NotNull @Pattern(regexp = "inspect|probe|flow|return|advance|clear") String action,
      @Size(max = 100) String source,
      @Size(max = 100) String target,
      @Pattern(regexp = "TCP|UDP") String protocol,
      @Min(1) @Max(65535) Integer sourcePort,
      @Min(1) @Max(65535) Integer targetPort,
      @Size(max = 100) String sessionId,
      @Min(1) @Max(3600) Integer seconds) {}

  private final RuntimeService runtime;
  private final com.smarthome.service.EventService events;
  private final ProjectRepository projects;

  public RuntimeController(
      RuntimeService runtime,
      ProjectRepository projects,
      com.smarthome.service.EventService events) {
    this.runtime = runtime;
    this.projects = projects;
    this.events = events;
  }

  @PostMapping
  public RuntimeService.Response action(@Valid @RequestBody Request r) {
    UUID project = r.projectId() == null ? RuntimeService.DEMO : r.projectId();
    if (!projects.existsById(project))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado");
    try {
      var response =
          runtime.perform(
              r.network(),
              project,
              new RuntimeService.Action(
                  r.action(),
                  r.source(),
                  r.target(),
                  r.protocol(),
                  r.sourcePort(),
                  r.targetPort(),
                  r.sessionId(),
                  r.seconds()));
      if (response.result() != null)
        events.record(
            project,
            r.source() == null ? "" : r.source(),
            r.target() == null ? "" : r.target(),
            response.result());
      return response;
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
    }
  }
}
