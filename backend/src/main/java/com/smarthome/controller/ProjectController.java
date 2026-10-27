package com.smarthome.controller;

import com.smarthome.dto.ProjectDto;
import com.smarthome.dto.SceneDto;
import com.smarthome.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
  private final ProjectService service;

  public ProjectController(ProjectService service) {
    this.service = service;
  }

  public record NameRequest(
      @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 100)
          String name) {}

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProjectDto create(@Valid @RequestBody NameRequest request) {
    return service.create(request.name());
  }

  @PutMapping("/{id}")
  public ProjectDto rename(@PathVariable UUID id, @Valid @RequestBody NameRequest request) {
    return service.rename(id, request.name());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }

  @GetMapping
  public List<ProjectDto> list() {
    return service.list();
  }

  @GetMapping("/{id}/scene")
  public ResponseEntity<SceneDto> load(@PathVariable UUID id) {
    return ResponseEntity.ok().body(service.loadScene(id));
  }

  @PutMapping("/{id}/scene")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void save(@PathVariable UUID id, @Valid @RequestBody SceneDto scene) {
    service.saveScene(id, scene);
  }
}
