package com.smarthome;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.dto.NetworkDto;
import com.smarthome.service.RuntimeService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class RuntimeTest {
  @Autowired ObjectMapper mapper;
  @Autowired RuntimeService runtime;

  @Test
  void sharedStatefulCases() throws Exception {
    var fixture = mapper.readTree(getClass().getResourceAsStream("/runtime-cases.json"));
    var n = mapper.treeToValue(fixture.get("network"), NetworkDto.class);
    var scope = UUID.randomUUID();
    int index = 0;
    for (var op : fixture.get("operations")) {
      var a =
          new RuntimeService.Action(
              op.path("action").asText(),
              op.has("source") ? op.get("source").asText() : null,
              op.has("target") ? op.get("target").asText() : null,
              op.has("protocol") ? op.get("protocol").asText() : null,
              op.has("sourcePort") ? op.get("sourcePort").asInt() : null,
              op.has("targetPort") ? op.get("targetPort").asInt() : null,
              op.has("sessionId") ? op.get("sessionId").asText() : null,
              op.has("seconds") ? op.get("seconds").asInt() : null);
      var r = runtime.perform(n, scope, a);
      assertThat(r.result() == null ? null : r.result().ok())
          .as("paso " + index)
          .isEqualTo(op.get("ok").isNull() ? null : op.get("ok").asBoolean());
      assertThat(r.tables().pat()).hasSize(op.get("pat").asInt());
      if (index == 0) {
        assertThat(r.tables().arp())
            .anyMatch(e -> e.device().equals("PC") && e.ip().equals("192.168.1.102"));
        assertThat(r.tables().mac())
            .anyMatch(
                e -> e.mac().equals(RuntimeService.hardwareAddress("PC", 0)) && e.port() == 1);
      }
      if (index == 2)
        assertThat(r.tables().pat())
            .extracting(RuntimeService.Pat::outsidePort)
            .containsExactly(40000, 40001);
      if (index == 8) {
        assertThat(r.tables().arp()).isEmpty();
        assertThat(r.tables().mac()).isEmpty();
      }
      index++;
    }
    assertThat(
            runtime
                .perform(
                    n,
                    UUID.randomUUID(),
                    new RuntimeService.Action("inspect", null, null, null, null, null, null, null))
                .tables()
                .pat())
        .isEmpty();
  }

  @Test
  void inversePatRespectsAddressBoundariesAndRemoteFirewallRules() throws Exception {
    var cases = mapper.readTree(getClass().getResourceAsStream("/pat-return-cases.json"));
    for (var c : cases) {
      var network = mapper.treeToValue(c.get("network"), NetworkDto.class);
      var scope = UUID.randomUUID();
      var forward =
          runtime.perform(
              network,
              scope,
              new RuntimeService.Action("flow", "PC", "203.0.113.1", "UDP", 5000, 53, null, null));
      assertThat(forward.result().ok()).isTrue();
      var reply =
          runtime.perform(
              network,
              scope,
              new RuntimeService.Action(
                  "return", "203.0.113.1", "203.0.113.2", "UDP", 53, 40000, "flow-1", null));
      assertThat(reply.result().ok()).isEqualTo(c.get("ok").asBoolean());
      if (reply.result().ok())
        assertThat(reply.result().path())
            .containsExactly("Internet", "ASA", "Router", "Switch", "PC");
      else assertThat(reply.result().message()).contains("firewall");
    }
  }
}
