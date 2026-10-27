package com.smarthome;

import static org.assertj.core.api.Assertions.assertThat;

import com.smarthome.controller.ProjectController.NameRequest;
import com.smarthome.dto.ProjectDto;
import com.smarthome.dto.SceneDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MultipleProjectsTest {
  @Autowired TestRestTemplate http;

  @Test
  void independentScenesRenameAndDeletion() {
    var a = http.postForEntity("/api/projects", new NameRequest(" Casa A "), ProjectDto.class);
    var b = http.postForEntity("/api/projects", new NameRequest("Casa B"), ProjectDto.class);
    assertThat(a.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(a.getBody().name()).isEqualTo("Casa A");
    var aid = a.getBody().id();
    var bid = b.getBody().id();
    try {
      var scene = new SceneDto(1, "Superior", false, "Oficina");
      http.put("/api/projects/" + aid + "/scene", scene);
      assertThat(http.getForObject("/api/projects/" + aid + "/scene", SceneDto.class))
          .isEqualTo(scene);
      assertThat(http.getForObject("/api/projects/" + bid + "/scene", SceneDto.class)).isNull();
      var rename =
          http.exchange(
              "/api/projects/" + aid,
              HttpMethod.PUT,
              new HttpEntity<>(new NameRequest("Oficina nueva")),
              ProjectDto.class);
      assertThat(rename.getBody().name()).isEqualTo("Oficina nueva");
      assertThat(http.getForObject("/api/projects/" + aid + "/scene", SceneDto.class))
          .isEqualTo(scene);
    } finally {
      http.delete("/api/projects/" + aid);
      http.delete("/api/projects/" + bid);
    }
    assertThat(http.getForEntity("/api/projects/" + aid + "/scene", String.class).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void eventsAreScopedToProject() {
    var a = http.postForObject("/api/projects", new NameRequest("Eventos A"), ProjectDto.class);
    var b = http.postForObject("/api/projects", new NameRequest("Eventos B"), ProjectDto.class);
    try {
      var pc =
          new com.smarthome.dto.NetworkDto.Device(
              "pc", "PC", "PC", 0, 0, 0, 0, "192.168.1.101", 24, true);
      var network = new com.smarthome.dto.NetworkDto(java.util.List.of(pc), java.util.List.of());
      var response =
          http.postForEntity(
              "/api/simulation/ping",
              new com.smarthome.controller.SimulationController.Request(
                  network, "pc", pc.ip(), a.id()),
              String.class);
      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
      assertThat(
              http.getForObject(
                      "/api/simulation/metrics?projectId=" + a.id(),
                      com.fasterxml.jackson.databind.JsonNode.class)
                  .get("events")
                  .asInt())
          .isEqualTo(1);
      assertThat(
              http.getForObject(
                      "/api/simulation/metrics?projectId=" + b.id(),
                      com.fasterxml.jackson.databind.JsonNode.class)
                  .get("events")
                  .asInt())
          .isZero();
      var events =
          http.getForObject(
              "/api/simulation/events?projectId=" + a.id(),
              com.fasterxml.jackson.databind.JsonNode.class);
      assertThat(events.size()).isEqualTo(1);
      assertThat(events.get(0).get("projectId").asText()).isEqualTo(a.id().toString());
    } finally {
      http.delete("/api/projects/" + a.id());
      http.delete("/api/projects/" + b.id());
    }
    assertThat(
            http.getForEntity("/api/simulation/events?projectId=" + a.id(), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void validatesNamesAndProtectsDemo() {
    assertThat(
            http.postForEntity("/api/projects", new NameRequest("   "), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(
            http.postForEntity("/api/projects", new NameRequest("a".repeat(101)), String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(
            http.exchange(
                    "/api/projects/00000000-0000-0000-0000-000000000001",
                    HttpMethod.DELETE,
                    HttpEntity.EMPTY,
                    String.class)
                .getStatusCode())
        .isEqualTo(HttpStatus.CONFLICT);
  }
}
