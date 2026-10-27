package com.smarthome.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.domain.NetworkProject;
import com.smarthome.dto.ProjectDto;
import com.smarthome.dto.SceneDto;
import com.smarthome.repository.ProjectRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {
  private final ProjectRepository repository;
  private final ObjectMapper mapper;

  public ProjectService(ProjectRepository repository, ObjectMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
  }

  private NetworkProject project(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
  }

  @Transactional
  public ProjectDto create(String name) {
    var entity = repository.save(new NetworkProject(UUID.randomUUID(), name.strip()));
    return new ProjectDto(entity.getId(), entity.getName());
  }

  @Transactional
  public ProjectDto rename(UUID id, String name) {
    var entity = project(id);
    entity.setName(name.strip());
    return new ProjectDto(id, entity.getName());
  }

  @Transactional
  public void delete(UUID id) {
    if (id.equals(UUID.fromString("00000000-0000-0000-0000-000000000001")))
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "La casa de demostración no se elimina");
    repository.delete(project(id));
  }

  @Transactional(readOnly = true)
  public List<ProjectDto> list() {
    return repository
        .findAll(
            org.springframework.data.domain.Sort.by("name")
                .ascending()
                .and(org.springframework.data.domain.Sort.by("id")))
        .stream()
        .map(p -> new ProjectDto(p.getId(), p.getName()))
        .toList();
  }

  @Transactional(readOnly = true)
  public SceneDto loadScene(UUID id) {
    String state = project(id).getSceneState();
    if (state == null) return null;
    try {
      return mapper.readValue(state, SceneDto.class);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Escena almacenada inválida", e);
    }
  }

  @Transactional
  public void saveScene(UUID id, SceneDto scene) {
    NetworkProject entity = project(id);
    try {
      entity.setSceneState(mapper.writeValueAsString(scene));
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("No se pudo serializar la escena", e);
    }
  }
}
