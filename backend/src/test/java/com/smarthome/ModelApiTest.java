package com.smarthome;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.controller.ProjectController.NameRequest;
import com.smarthome.dto.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ModelApiTest {
  @Autowired ObjectMapper mapper;
  @Autowired TestRestTemplate http;

  @Test
  void modelPersistenceAndValidation() throws Exception {
    var fixture = mapper.readTree(getClass().getResourceAsStream("/model-assets.json"));
    var pc = new NetworkDto.Device("pc", "PC", "PC", 0, 0, 0, 0, "192.168.1.101", 24, true);
    var n = new NetworkDto(List.of(pc), List.of());
    var project =
        http.postForObject("/api/projects", new NameRequest("Model test"), ProjectDto.class);
    String path = "/api/projects/" + project.id() + "/scene";
    try {
      for (String format : List.of("gltf", "glb")) {
        var asset = mapper.treeToValue(fixture.get(format), ModelLibrary.Asset.class);
        var library = new ModelLibrary(Map.of("asset", asset), Map.of("pc", "asset"));
        var scene = new SceneDto(1, "Superior", true, "Sala", n, library);
        assertThat(
                http.exchange(path, HttpMethod.PUT, new HttpEntity<>(scene), String.class)
                    .getStatusCode())
            .isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(http.getForObject(path, SceneDto.class)).isEqualTo(scene);
      }
      String json =
          new String(
              Base64.getDecoder().decode(fixture.get("gltf").get("data").asText()),
              StandardCharsets.UTF_8);
      var doc = mapper.readTree(json);
      ((com.fasterxml.jackson.databind.node.ObjectNode) doc.get("buffers").get(0))
          .put("uri", "https://example.invalid/model.bin");
      var invalid =
          new ModelLibrary.Asset(
              "bad.gltf",
              "gltf",
              Base64.getEncoder().encodeToString(mapper.writeValueAsBytes(doc)));
      assertThat(
              http.exchange(
                      path,
                      HttpMethod.PUT,
                      new HttpEntity<>(
                          new SceneDto(
                              1,
                              "Superior",
                              true,
                              "Sala",
                              n,
                              new ModelLibrary(Map.of("asset", invalid), Map.of("pc", "asset")))),
                      String.class)
                  .getStatusCode())
          .isEqualTo(HttpStatus.BAD_REQUEST);
    } finally {
      http.delete("/api/projects/" + project.id());
    }
  }
}
