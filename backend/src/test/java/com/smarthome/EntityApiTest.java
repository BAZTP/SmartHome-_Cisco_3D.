package com.smarthome;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.smarthome.controller.ProjectController.NameRequest;
import com.smarthome.dto.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class EntityApiTest {
  @Autowired TestRestTemplate http;
  @Autowired ObjectMapper mapper;
  @Autowired com.smarthome.service.InventoryBackfill backfill;

  private ResponseEntity<JsonNode> put(String path, Object value) {
    return http.exchange(path, HttpMethod.PUT, new HttpEntity<>(value), JsonNode.class);
  }

  private JsonNode get(String path) {
    return http.getForObject(path, JsonNode.class);
  }

  @Test
  void entityCrudProjectionAndAtomicValidation() throws Exception {
    var project =
        http.postForObject("/api/projects", new NameRequest("CRUD test"), ProjectDto.class);
    String base = "/api/projects/" + project.id();
    try {
      assertThat(get(base + "/rooms").size()).isEqualTo(9);
      var network =
          mapper.readTree(getClass().getResourceAsStream("/runtime-cases.json")).get("network");
      for (var d : network.get("devices"))
        assertThat(http.postForEntity(base + "/devices", d, JsonNode.class).getStatusCode())
            .isEqualTo(HttpStatus.CREATED);
      assertThat(
              http.postForEntity(base + "/devices", network.get("devices").get(0), JsonNode.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.CONFLICT);
      for (var l : network.get("links"))
        assertThat(http.postForEntity(base + "/links", l, JsonNode.class).getStatusCode())
            .isEqualTo(HttpStatus.CREATED);
      var trace =
          http.postForEntity(
              "/api/simulation/traceroute",
              Map.of(
                  "network",
                  network,
                  "source",
                  "PC",
                  "target",
                  "203.0.113.1",
                  "projectId",
                  project.id()),
              JsonNode.class);
      assertThat(trace.getStatusCode()).isEqualTo(HttpStatus.OK);
      assertThat(trace.getBody().get("probes").size()).isEqualTo(3);
      assertThat(
              get("/api/simulation/traces?projectId=" + project.id())
                  .get(0)
                  .get("result")
                  .get("probes"))
          .isEqualTo(trace.getBody().get("probes"));
      var inventory = get(base + "/inventory");
      assertThat(inventory.get("network_device").size()).isEqualTo(6);
      assertThat(inventory.get("network_link").size()).isEqualTo(5);
      assertThat(inventory.get("static_route").size()).isEqualTo(2);
      assertThat(inventory.get("network_subnet").size()).isEqualTo(3);
      var before = get(base + "/scene");
      var invalid = ((ObjectNode) network.get("links").get(0)).deepCopy().put("id", "occupied");
      assertThat(http.postForEntity(base + "/links", invalid, JsonNode.class).getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
      assertThat(get(base + "/scene")).isEqualTo(before);
      assertThat(get(base + "/inventory")).isEqualTo(inventory);
      assertThat(
              http.exchange(base + "/rooms/0", HttpMethod.DELETE, null, String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
      assertThat(get(base + "/rooms").size()).isEqualTo(9);
      var pc = (ObjectNode) get(base + "/devices/PC");
      pc.put("name", "Workstation");
      pc.put("x", 1.1);
      pc.put("z", -.8);
      assertThat(put(base + "/devices/PC", pc).getStatusCode()).isEqualTo(HttpStatus.OK);
      assertThat(get(base + "/devices/PC").get("x").asDouble()).isEqualTo(1.1);
      var port = ((ObjectNode) get(base + "/devices/PC/interfaces").get(0)).put("enabled", false);
      assertThat(put(base + "/devices/PC/interfaces/0", port).getStatusCode())
          .isEqualTo(HttpStatus.OK);
      assertThat(get(base + "/devices/PC/interfaces").get(0).get("enabled").asBoolean()).isFalse();
      assertThat(put(base + "/devices/PC/interfaces/99", port).getStatusCode())
          .isEqualTo(HttpStatus.NOT_FOUND);
      http.delete(base + "/devices/PC");
      assertThat(get(base + "/links").size()).isEqualTo(4);
      assertThat(get(base + "/inventory").get("network_device").size()).isEqualTo(5);
      assertThat(
              http.exchange(base + "/rooms/0", HttpMethod.DELETE, null, String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.NO_CONTENT);
      assertThat(
              http.postForEntity(base + "/rooms", new DesignDto.Room(0, "Estudio"), JsonNode.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.CREATED);
      assertThat(put(base + "/rooms/0", new DesignDto.Room(0, "Sala renovada")).getStatusCode())
          .isEqualTo(HttpStatus.OK);
      assertThat(get(base + "/rooms/0").get("name").asText()).isEqualTo("Sala renovada");
      assertThat(get(base + "/topology").get("devices").size()).isEqualTo(5);
    } finally {
      http.delete(base);
    }
    assertThat(http.getForEntity(base + "/devices", String.class).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void designRoundTripAndReferentialValidation() {
    var project =
        http.postForObject("/api/projects", new NameRequest("Design test"), ProjectDto.class);
    String base = "/api/projects/" + project.id();
    try {
      var d = new NetworkDto.Device("pc", "PC", "PC", 0, 0, 0, 0, "192.168.1.101", 24, true);
      var design =
          new DesignDto(
              List.of(new DesignDto.Room(0, "Estudio")),
              Map.of("pc", new DesignDto.Point(220.0, 120.0)),
              new DesignDto.Camera(List.of(3.0, 7.0, 12.0), List.of(0.0, 0.0, 0.0)),
              false,
              "balanced");
      var scene =
          new SceneDto(
              1,
              "Isométrica",
              true,
              "Estudio",
              new NetworkDto(List.of(d), List.of()),
              null,
              design);
      assertThat(put(base + "/scene", scene).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
      assertThat(http.getForObject(base + "/scene", SceneDto.class)).isEqualTo(scene);
      var json = (ObjectNode) mapper.valueToTree(scene);
      ((ObjectNode) json.get("design").get("rooms").get(0)).put("id", 1);
      assertThat(put(base + "/scene", json).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
      assertThat(http.getForObject(base + "/scene", SceneDto.class)).isEqualTo(scene);
    } finally {
      http.delete(base);
    }
  }

  @Test
  void simultaneousEntityEditsAndBackfillKeepBothChanges() throws Exception {
    var project =
        http.postForObject("/api/projects", new NameRequest("Concurrent edits"), ProjectDto.class);
    String base = "/api/projects/" + project.id();
    try {
      var a = new NetworkDto.Device("a", "A", "PC", 0, 0, 0, 0, "192.168.1.101", 24, true);
      var b = new NetworkDto.Device("b", "B", "Laptop", 1, 0, 0, 0, "192.168.1.102", 24, true);
      http.postForEntity(base + "/devices", a, JsonNode.class);
      http.postForEntity(base + "/devices", b, JsonNode.class);
      var first = (ObjectNode) mapper.valueToTree(a);
      first.put("name", "Changed A");
      var second = (ObjectNode) mapper.valueToTree(b);
      second.put("name", "Changed B");
      var edits =
          java.util.List.of(
              java.util.concurrent.CompletableFuture.supplyAsync(
                  () -> put(base + "/devices/a", first)),
              java.util.concurrent.CompletableFuture.supplyAsync(
                  () -> put(base + "/devices/b", second)));
      backfill.run(new org.springframework.boot.DefaultApplicationArguments(new String[0]));
      for (var edit : edits)
        assertThat(edit.get(20, java.util.concurrent.TimeUnit.SECONDS).getStatusCode())
            .isEqualTo(HttpStatus.OK);
      assertThat(get(base + "/devices/a").get("name").asText()).isEqualTo("Changed A");
      assertThat(get(base + "/devices/b").get("name").asText()).isEqualTo("Changed B");
    } finally {
      http.delete(base);
    }
  }
}
