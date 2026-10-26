package com.smarthome.controller;

import com.smarthome.service.ProjectService;
import com.smarthome.dto.ProjectDto;
import com.smarthome.dto.SceneDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
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
