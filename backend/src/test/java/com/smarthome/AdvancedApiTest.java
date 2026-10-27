package com.smarthome;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.controller.*;
import com.smarthome.dto.NetworkDto;
import com.smarthome.service.NetworkSimulator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AdvancedApiTest {
  @Autowired TestRestTemplate http;
  @Autowired ObjectMapper mapper;
  @Autowired NetworkSimulator simulator;

  record Case(String name, NetworkDto network, String source, String target, boolean ok) {}

  private Case[] cases() throws Exception {
    return mapper.readValue(getClass().getResourceAsStream("/network-cases.json"), Case[].class);
  }

  @Test
  void sharedNetworkCases() throws Exception {
    for (var c : cases()) {
      var r =
          http.postForEntity(
              "/api/simulation/ping",
              new SimulationController.Request(c.network(), c.source(), c.target()),
              SimulationController.Result.class);
      assertThat(r.getStatusCode().value()).as(c.name()).isEqualTo(200);
      assertThat(r.getBody().ok()).as(c.name()).isEqualTo(c.ok());
    }
  }

  @Test
  void cliInterfaceAndPersistence() throws Exception {
    var network = cases()[0].network();
    var context = new CliController.Context("EXEC", 0);
    var probe =
        http.postForEntity(
            "/api/cli",
            new CliController.Request(network, "PC", context, "ping 192.168.1.102"),
            CliController.Response.class);
    assertThat(probe.getStatusCode().value()).isEqualTo(200);
    assertThat(probe.getBody().trace().path()).containsExactly("PC", "Switch", "Laptop");
    for (String command :
        new String[] {
          "enable", "configure terminal", "interface eth1", "shutdown", "end", "write memory"
        }) {
      var r =
          http.postForEntity(
              "/api/cli",
              new CliController.Request(network, "Switch", context, command),
              CliController.Response.class);
      assertThat(r.getStatusCode().value()).as(command).isEqualTo(200);
      network = r.getBody().network();
      context = r.getBody().context();
      if (command.equals("write memory")) assertThat(r.getBody().save()).isTrue();
    }
    assertThat(
            simulator.ping(new SimulationController.Request(network, "PC", "192.168.1.102")).ok())
        .isFalse();
    String url = "/api/projects/00000000-0000-0000-0000-000000000001/scene";
    var scene = new com.smarthome.dto.SceneDto(1, "Superior", true, "Sala", network);
    http.put(url, scene);
    assertThat(http.getForObject(url, com.smarthome.dto.SceneDto.class)).isEqualTo(scene);
    assertThat(
            http.postForEntity(
                    "/api/cli",
                    new CliController.Request(network, "Switch", context, "rm -rf /"),
                    String.class)
                .getStatusCode()
                .value())
        .isEqualTo(400);
  }

  @Test
  void dhcpAndMetrics() throws Exception {
    var n = cases()[0].network();
    var d = n.devices().get(1);
    var c = simulator.config(d);
    var config =
        new NetworkDto.Config(
            c.interfaces(),
            c.gateway(),
            c.routes(),
            c.firewall(),
            new NetworkDto.Pool("192.168.1.101", "192.168.1.110", "192.168.1.1", 24),
            false,
            false);
    var server =
        new NetworkDto.Device(
            d.id(),
            d.name(),
            d.kind(),
            d.room(),
            d.x(),
            d.z(),
            d.rotation(),
            d.ip(),
            d.prefix(),
            d.on(),
            config);
    var network =
        new NetworkDto(
            n.devices().stream().map(v -> v.id().equals(server.id()) ? server : v).toList(),
            n.links());
    var lease =
        http.postForEntity(
            "/api/simulation/dhcp",
            new DhcpController.Request(network, "PC"),
            NetworkDto.Device.class);
    assertThat(lease.getStatusCode().value()).isEqualTo(200);
    assertThat(lease.getBody().ip()).isEqualTo("192.168.1.103");
    assertThat(http.getForEntity("/api/simulation/metrics", String.class).getStatusCode().value())
        .isEqualTo(200);
  }
}
