package com.smarthome.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.domain.NetworkProject;
import com.smarthome.dto.ProjectDto;
import com.smarthome.dto.SceneDto;
import com.smarthome.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {
    private final ProjectRepository repository;
    private final ObjectMapper mapper;

    public ProjectService(ProjectRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    private NetworkProject project(UUID id) {
        return repository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
    }

    @Transactional(readOnly = true)
    public List<ProjectDto> list() {
        return repository.findAll().stream()
            .map(p -> new ProjectDto(p.getId(), p.getName())).toList();
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
