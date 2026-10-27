package com.smarthome.service;

import com.smarthome.controller.SimulationController;
import com.smarthome.dto.NetworkDto;
import com.smarthome.dto.NetworkDto.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DhcpService {
  private final NetworkSimulator simulator;

  public DhcpService(NetworkSimulator simulator) {
    this.simulator = simulator;
  }

  private long ip(String s) {
    long n = 0;
    for (String p : s.split("\\.")) n = n * 256 + Integer.parseInt(p);
    return n;
  }

  private String address(long n) {
    return ((n >> 24) & 255) + "." + ((n >> 16) & 255) + "." + ((n >> 8) & 255) + "." + (n & 255);
  }

  public Device lease(NetworkDto n, String id) {
    var client =
        n.devices().stream()
            .filter(d -> d.id().equals(id))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    for (var server : n.devices()) {
      var pool = simulator.config(server).dhcp();
      if (pool == null || !server.on()) continue;
      for (long number = ip(pool.start()); number <= ip(pool.end()); number++) {
        String address = address(number);
        if (n.devices().stream()
            .anyMatch(
                d ->
                    d.ip().equals(address)
                        || simulator.config(d).interfaces().stream()
                            .anyMatch(p -> p.ip().equals(address)))) continue;
        var original = simulator.config(client);
        var interfaces = new ArrayList<>(original.interfaces());
        var p = interfaces.getFirst();
        interfaces.set(
            0, new Port(p.enabled(), p.description(), p.mode(), p.vlan(), address, pool.prefix()));
        var config =
            new Config(
                interfaces,
                pool.gateway(),
                original.routes(),
                original.firewall(),
                original.dhcp(),
                original.nat(),
                original.light());
        var candidate =
            new Device(
                client.id(),
                client.name(),
                client.kind(),
                client.room(),
                client.x(),
                client.z(),
                client.rotation(),
                address,
                pool.prefix(),
                client.on(),
                config);
        var devices = n.devices().stream().map(d -> d.id().equals(id) ? candidate : d).toList();
        if (simulator
            .ping(
                new SimulationController.Request(
                    new NetworkDto(devices, n.links()), id, server.ip()))
            .ok()) return candidate;
        break;
      }
    }
    throw new ResponseStatusException(
        HttpStatus.CONFLICT, "Sin servidor DHCP alcanzable o pool agotado");
  }
}
