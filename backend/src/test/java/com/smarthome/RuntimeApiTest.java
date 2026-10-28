package com.smarthome;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RuntimeApiTest {
  @Autowired ObjectMapper mapper;
  @Autowired TestRestTemplate http;

  @Test
  void apiSessionAndValidation() throws Exception {
    var network =
        mapper.readTree(getClass().getResourceAsStream("/runtime-cases.json")).get("network");
    ObjectNode request = mapper.createObjectNode();
    request.set("network", network);
    request.put("action", "clear");
    assertThat(http.postForEntity("/api/simulation/runtime", request, String.class).getStatusCode())
        .isEqualTo(HttpStatus.OK);
    request.put("action", "flow");
    request.put("source", "PC");
    request.put("target", "203.0.113.1");
    request.put("protocol", "TCP");
    request.put("sourcePort", 12345);
    request.put("targetPort", 443);
    var response =
        http.postForEntity(
            "/api/simulation/runtime", request, com.fasterxml.jackson.databind.JsonNode.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody().path("result").path("ok").asBoolean()).isTrue();
    assertThat(response.getBody().path("tables").path("pat").get(0).path("outsidePort").asInt())
        .isEqualTo(40000);
    request.put("sourcePort", 70000);
    assertThat(http.postForEntity("/api/simulation/runtime", request, String.class).getStatusCode())
        .isEqualTo(HttpStatus.BAD_REQUEST);
    request.put("sourcePort", 12345);
    request.put("projectId", "00000000-0000-0000-0000-000000000099");
    assertThat(http.postForEntity("/api/simulation/runtime", request, String.class).getStatusCode())
        .isEqualTo(HttpStatus.NOT_FOUND);
  }
}
