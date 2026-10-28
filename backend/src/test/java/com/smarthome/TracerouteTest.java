package com.smarthome;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.controller.SimulationController.*;
import com.smarthome.dto.NetworkDto;
import com.smarthome.service.NetworkSimulator;
import org.junit.jupiter.api.Test;

class TracerouteTest {
  @Test
  void sharedTtlProbes() throws Exception {
    var mapper = new ObjectMapper();
    var simulator = new NetworkSimulator();
    var cases = mapper.readTree(getClass().getResourceAsStream("/traceroute-cases.json"));
    for (var c : cases) {
      var r =
          simulator.traceroute(
              new Request(
                  mapper.treeToValue(c.get("network"), NetworkDto.class),
                  "PC",
                  c.get("target").asText()),
              c.get("max").asInt());
      assertThat(r.ok()).as(c.get("name").asText()).isEqualTo(c.get("ok").asBoolean());
      assertThat(mapper.valueToTree(r.probes().stream().map(Probe::device).toList()).toString())
          .isEqualTo(c.get("devices").toString());
      assertThat(mapper.valueToTree(r.probes().stream().map(Probe::status).toList()).toString())
          .isEqualTo(c.get("statuses").toString());
      assertThat(simulator.formatTrace(r)).contains("TTL");
    }
  }
}
