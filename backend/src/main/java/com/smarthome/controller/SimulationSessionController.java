package com.smarthome.controller;

import com.smarthome.dto.NetworkDto;
import com.smarthome.service.SimulationSessionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{project}/simulation")
public class SimulationSessionController {
  public record Start(
      @NotNull @Valid NetworkDto network,
      @NotBlank @Size(max = 100) String source,
      @NotBlank @Pattern(regexp = "[0-9]{1,3}(\\.[0-9]{1,3}){3}") String target) {}

  public record Tick(@NotNull @Valid NetworkDto network) {}

  private final SimulationSessionService service;

  public SimulationSessionController(SimulationSessionService service) {
    this.service = service;
  }

  @GetMapping
  public SimulationSessionService.State state(@PathVariable UUID project) {
    return service.state(project);
  }

  @PostMapping("/start")
  public SimulationSessionService.State start(
      @PathVariable UUID project, @Valid @RequestBody Start r) {
    return service.start(project, r.network(), r.source(), r.target());
  }

  @PostMapping("/pause")
  public SimulationSessionService.State pause(@PathVariable UUID project) {
    return service.pause(project);
  }

  @PostMapping("/step")
  public SimulationSessionService.Step step(
      @PathVariable UUID project, @Valid @RequestBody Tick r) {
    return service.step(project, r.network());
  }
}
