package com.smarthome.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;
import com.smarthome.dto.*;
import com.smarthome.repository.ProjectRepository;
import jakarta.validation.Validator;
import java.util.*;
import java.util.function.Consumer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NetworkEntityService {
  private final ProjectService projects;
  private final ProjectRepository repository;
  private final ObjectMapper mapper;
  private final Validator validator;
  private final NetworkSimulator simulator;

  public NetworkEntityService(
      ProjectService projects,
      ProjectRepository repository,
      ObjectMapper mapper,
      Validator validator,
      NetworkSimulator simulator) {
    this.projects = projects;
    this.repository = repository;
    this.mapper = mapper;
    this.validator = validator;
    this.simulator = simulator;
  }

  public SceneDto scene(UUID id) {
    var s = projects.loadScene(id);
    if (s == null)
      return new SceneDto(
          1,
          "Isométrica",
          true,
          "Sala",
          new NetworkDto(List.of(), List.of()),
          null,
          DesignDto.defaults());
    return new SceneDto(
        s.version(),
        s.view(),
        s.walls(),
        s.selected(),
        s.network() == null ? new NetworkDto(List.of(), List.of()) : s.network(),
        s.models(),
        s.design() == null ? DesignDto.defaults() : s.design());
  }

  private ResponseStatusException error(HttpStatus status, String text) {
    return new ResponseStatusException(status, text);
  }

  private ObjectNode found(ArrayNode rows, String id) {
    for (var row : rows) if (row.path("id").asText().equals(id)) return (ObjectNode) row;
    throw error(HttpStatus.NOT_FOUND, "Entidad no encontrada");
  }

  private ArrayNode rows(ObjectNode s, String collection) {
    return (ArrayNode)
        (collection.equals("rooms")
            ? s.path("design").get("rooms")
            : s.path("network").get(collection));
  }

  private void remove(ArrayNode rows, String id) {
    for (int i = rows.size() - 1; i >= 0; i--)
      if (rows.get(i).path("id").asText().equals(id)) rows.remove(i);
  }

  private SceneDto mutate(UUID id, Consumer<ObjectNode> edit) {
    repository
        .lockById(id)
        .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
    ObjectNode json = mapper.valueToTree(scene(id));
    edit.accept(json);
    try {
      var scene = mapper.treeToValue(json, SceneDto.class);
      var failures = validator.validate(scene);
      if (!failures.isEmpty())
        throw error(HttpStatus.BAD_REQUEST, failures.iterator().next().getMessage());
      projects.saveScene(id, scene);
      return scene;
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      throw error(HttpStatus.BAD_REQUEST, "Configuración inválida");
    }
  }

  @Transactional
  public Object save(UUID id, String collection, String key, Object value, boolean create) {
    final Object[] result = new Object[1];
    mutate(
        id,
        s -> {
          var rows = rows(s, collection);
          ObjectNode json = mapper.valueToTree(value);
          String valueId = json.path("id").asText();
          if (!valueId.equals(key))
            throw error(HttpStatus.BAD_REQUEST, "El identificador no coincide con la URL");
          if (create) {
            for (var row : rows)
              if (row.path("id").asText().equals(key))
                throw error(HttpStatus.CONFLICT, "Identificador existente");
          } else found(rows, key);
          remove(rows, key);
          rows.add(json);
          result[0] = value;
        });
    return result[0];
  }

  @Transactional
  public void delete(UUID id, String collection, String key) {
    mutate(
        id,
        s -> {
          var rows = rows(s, collection);
          found(rows, key);
          remove(rows, key);
          if (collection.equals("devices")) {
            var links = rows(s, "links");
            for (int i = links.size() - 1; i >= 0; i--)
              if (links.get(i).path("a").asText().equals(key)
                  || links.get(i).path("b").asText().equals(key)) links.remove(i);
            ((ObjectNode) s.path("design").path("topology")).remove(key);
            if (s.path("models").isObject()) {
              var models = (ObjectNode) s.get("models");
              ((ObjectNode) models.path("devices")).remove(key);
              var used = new HashSet<String>();
              models.path("devices").forEach(v -> used.add(v.asText()));
              var assets = (ObjectNode) models.path("assets");
              var orphan = new ArrayList<String>();
              assets
                  .fieldNames()
                  .forEachRemaining(
                      k -> {
                        if (!used.contains(k)) orphan.add(k);
                      });
              assets.remove(orphan);
            }
          }
        });
  }

  public Object list(UUID id, String collection) {
    var s = scene(id);
    return switch (collection) {
      case "rooms" -> s.design().rooms();
      case "devices" -> s.network().devices();
      case "links" -> s.network().links();
      default -> throw new IllegalArgumentException();
    };
  }

  public Object get(UUID id, String collection, String key) {
    ObjectNode s = mapper.valueToTree(scene(id));
    return found(rows(s, collection), key);
  }

  public NetworkDto.Device device(UUID id, String key) {
    return scene(id).network().devices().stream()
        .filter(d -> d.id().equals(key))
        .findFirst()
        .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Dispositivo no encontrado"));
  }

  public NetworkDto.Config config(UUID id, String key) {
    return simulator.config(device(id, key));
  }

  @Transactional
  public NetworkDto.Config configure(UUID id, String key, NetworkDto.Config config) {
    mutate(
        id,
        s -> {
          var d = found(rows(s, "devices"), key);
          d.set("config", mapper.valueToTree(config));
          if (!config.interfaces().isEmpty()) {
            d.put("ip", config.interfaces().getFirst().ip());
            d.put("prefix", config.interfaces().getFirst().prefix());
          }
        });
    return config;
  }

  @Transactional
  public NetworkDto.Port port(UUID id, String key, int index, NetworkDto.Port port) {
    repository
        .lockById(id)
        .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
    var c = config(id, key);
    var ports = new ArrayList<>(c.interfaces());
    if (index < 0 || index >= ports.size())
      throw error(HttpStatus.NOT_FOUND, "Interfaz no encontrada");
    ports.set(index, port);
    configure(
        id,
        key,
        new NetworkDto.Config(
            ports, c.gateway(), c.routes(), c.firewall(), c.dhcp(), c.nat(), c.light()));
    return port;
  }
}
