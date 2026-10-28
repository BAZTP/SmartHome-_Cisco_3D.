package com.smarthome.service;

import com.smarthome.repository.ProjectRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class InventoryBackfill implements ApplicationRunner {
  private final ProjectRepository projects;
  private final ProjectService service;

  public InventoryBackfill(ProjectRepository projects, ProjectService service) {
    this.projects = projects;
    this.service = service;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    // Read only IDs first: preloading entities here could cache a stale scene before locking.
    for (var id : projects.inventoryProjectIds()) {
      if (projects.lockById(id).isEmpty()) continue;
      var scene = service.loadScene(id);
      if (scene != null) service.saveScene(id, scene);
    }
  }
}
