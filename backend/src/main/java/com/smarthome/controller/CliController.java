package com.smarthome.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;
import com.smarthome.dto.NetworkDto;
import com.smarthome.service.NetworkSimulator;
import jakarta.validation.*;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/cli")
public class CliController {
  public record Context(
      @NotNull @Pattern(regexp = "EXEC|PRIVILEGIADO|CONFIG|INTERFACE") String mode,
      @Min(0) @Max(7) int port) {}

  public record Request(
      @NotNull @Valid NetworkDto network,
      @NotBlank @Size(max = 100) String source,
      @NotNull @Valid Context context,
      @NotNull @Size(max = 512) String command,
      UUID projectId) {
    public Request(NetworkDto network, String source, Context context, String command) {
      this(network, source, context, command, null);
    }
  }

  public record Response(
      NetworkDto network,
      Context context,
      String output,
      boolean save,
      SimulationController.Result trace) {}

  private final ObjectMapper mapper;
  private final Validator validator;
  private final NetworkSimulator simulator;
  private final com.smarthome.service.DhcpService dhcp;
  private final com.smarthome.service.EventService events;

  public CliController(
      ObjectMapper m,
      Validator v,
      NetworkSimulator s,
      com.smarthome.service.DhcpService dhcp,
      com.smarthome.service.EventService events) {
    mapper = m;
    validator = v;
    simulator = s;
    this.dhcp = dhcp;
    this.events = events;
  }

  private int prefix(String s) {
    if (s.matches("\\d+")) {
      int p = Integer.parseInt(s);
      if (p >= 1 && p <= 30) return p;
    }
    long value = 0;
    for (String part : s.split("\\.")) {
      int n = Integer.parseInt(part);
      if (n < 0 || n > 255) throw new IllegalArgumentException();
      value = value * 256 + n;
    }
    String bits = String.format("%32s", Long.toBinaryString(value)).replace(' ', '0');
    if (!bits.matches("1+0+")) throw new IllegalArgumentException();
    int p = bits.indexOf('0');
    if (p > 30) throw new IllegalArgumentException();
    return p;
  }

  @PostMapping
  public Response command(@Valid @RequestBody Request req) {
    try {
      var d =
          req.network().devices().stream()
              .filter(v -> v.id().equals(req.source()))
              .findFirst()
              .orElseThrow();
      ObjectNode root = mapper.valueToTree(req.network());
      ObjectNode device = null;
      for (var node : root.withArray("devices"))
        if (node.path("id").asText().equals(d.id())) device = (ObjectNode) node;
      if (device == null) throw new IllegalArgumentException();
      ObjectNode config = mapper.valueToTree(simulator.config(d));
      device.set("config", config);
      String mode = req.context().mode(), text = req.command().trim(), output = "OK";
      int port = req.context().port();
      boolean save = false;
      SimulationController.Result trace = null;
      String[] parts = text.split("\\s+");
      ArrayNode interfaces = config.withArray("interfaces");
      ObjectNode iface =
          port >= 0 && port < interfaces.size() ? (ObjectNode) interfaces.get(port) : null;
      if (text.equals("?"))
        output =
            "enable; disable; configure terminal; end; exit; hostname; interface ethN; description;"
                + " ip address; shutdown; no shutdown; show interfaces; show ip interface brief;"
                + " show running-config; show ip route; show vlan brief; vlan; switchport mode"
                + " access|trunk; switchport access vlan; ip route; ping; traceroute; write memory";
      else if (text.equals("enable") && mode.equals("EXEC")) mode = "PRIVILEGIADO";
      else if (text.equals("disable")) mode = "EXEC";
      else if (text.equals("configure terminal") && mode.equals("PRIVILEGIADO")) mode = "CONFIG";
      else if (text.equals("end")) mode = "PRIVILEGIADO";
      else if (text.equals("exit"))
        mode =
            mode.equals("INTERFACE") ? "CONFIG" : mode.equals("CONFIG") ? "PRIVILEGIADO" : "EXEC";
      else if (text.equals("show running-config")) output = config.toPrettyString();
      else if (text.equals("show interfaces")
          || text.equals("show ip interface brief")
          || text.equals("show vlan brief")) {
        var lines = new ArrayList<String>();
        for (int i = 0; i < interfaces.size(); i++) {
          var p = interfaces.get(i);
          lines.add(
              "eth"
                  + i
                  + " "
                  + p.path("ip").asText()
                  + "/"
                  + p.path("prefix").asInt()
                  + " "
                  + (p.path("enabled").asBoolean() && d.on() ? "up" : "down")
                  + " VLAN "
                  + p.path("vlan").asInt()
                  + " "
                  + p.path("mode").asText());
        }
        output = String.join("\n", lines);
      } else if (text.equals("show ip route")) output = config.path("routes").toPrettyString();
      else if ((parts[0].equals("ping") || parts[0].equals("traceroute")) && parts.length == 2) {
        var r = simulator.ping(new SimulationController.Request(req.network(), d.id(), parts[1]));
        trace = r;
        events.record(req.projectId(), d.id(), parts[1], r);
        output = r.message() + "\n" + String.join(" → ", r.path());
      } else if (text.equals("write memory") && mode.equals("PRIVILEGIADO")) {
        save = true;
        output = "Configuración preparada para guardar";
      } else if (mode.equals("CONFIG") && text.equals("ip dhcp")) {
        var assigned = dhcp.lease(req.network(), req.source());
        device.setAll((ObjectNode) mapper.valueToTree(assigned));
      } else if (mode.equals("CONFIG") && parts[0].equals("hostname") && parts.length == 2)
        device.put("name", parts[1]);
      else if (mode.equals("CONFIG") && parts[0].equals("interface") && parts.length == 2) {
        port = Integer.parseInt(parts[1].replaceFirst("^eth", ""));
        if (port < 0 || port >= interfaces.size()) throw new IllegalArgumentException();
        mode = "INTERFACE";
      } else if (mode.equals("INTERFACE") && text.startsWith("description "))
        iface.put("description", text.substring(12));
      else if (mode.equals("INTERFACE") && (text.equals("shutdown") || text.equals("no shutdown")))
        iface.put("enabled", text.equals("no shutdown"));
      else if (mode.equals("INTERFACE") && text.matches("switchport mode (access|trunk)"))
        iface.put("mode", parts[2]);
      else if (mode.equals("INTERFACE") && text.matches("switchport access vlan \\d+"))
        iface.put("vlan", Integer.parseInt(parts[3]));
      else if (mode.equals("INTERFACE")
          && parts.length == 4
          && parts[0].equals("ip")
          && parts[1].equals("address")) {
        iface.put("ip", parts[2]);
        iface.put("prefix", prefix(parts[3]));
        if (port == 0) {
          device.put("ip", parts[2]);
          device.put("prefix", prefix(parts[3]));
        }
      } else if (mode.equals("CONFIG")
          && parts.length == 5
          && parts[0].equals("ip")
          && parts[1].equals("route")) {
        var route = config.withArray("routes").addObject();
        route.put("network", parts[2]);
        route.put("prefix", parts[3].equals("0.0.0.0") ? 0 : prefix(parts[3]));
        route.put("gateway", parts[4]);
      } else if (mode.equals("CONFIG") && text.matches("vlan \\d+")) {
        int vlan = Integer.parseInt(parts[1]);
        if (vlan < 1 || vlan > 4094) throw new IllegalArgumentException();
        output = "VLAN " + vlan + " disponible para asignar a puertos";
      } else throw new IllegalArgumentException();
      var network = mapper.treeToValue(root, NetworkDto.class);
      if (!validator.validate(network).isEmpty()) throw new IllegalArgumentException();
      return new Response(network, new Context(mode, port), output, save, trace);
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Sintaxis, modo o configuración inválidos. Usa ?");
    }
  }
}
