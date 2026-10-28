package com.smarthome.service;

import com.smarthome.controller.SimulationController.*;
import com.smarthome.dto.NetworkDto;
import com.smarthome.dto.NetworkDto.Device;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RuntimeService {
  public record Action(
      String action,
      String source,
      String target,
      String protocol,
      Integer sourcePort,
      Integer targetPort,
      String sessionId,
      Integer seconds) {}

  public record Arp(String device, String ip, String mac, int port, int expires) {}

  public record Mac(String device, String mac, int port, int vlan, int expires) {}

  public record Pat(
      String id,
      String flow,
      String device,
      String protocol,
      String insideIp,
      int insidePort,
      String outsideIp,
      int outsidePort,
      String remoteIp,
      int remotePort,
      int expires) {
    Pat until(int time) {
      return new Pat(
          id,
          flow,
          device,
          protocol,
          insideIp,
          insidePort,
          outsideIp,
          outsidePort,
          remoteIp,
          remotePort,
          time);
    }
  }

  public record Tables(int time, List<Arp> arp, List<Mac> mac, List<Pat> pat) {}

  public record Response(Result result, Tables tables) {}

  private static class Flow {
    String id, source, target, protocol;
    int sourcePort, targetPort, expires;

    Flow(String id, Action a, int expires) {
      this.id = id;
      source = a.source();
      target = a.target();
      protocol = a.protocol();
      sourcePort = a.sourcePort();
      targetPort = a.targetPort();
      this.expires = expires;
    }
  }

  private static class Session {
    NetworkDto network;
    int time, serial;
    List<Arp> arp = new ArrayList<>();
    List<Mac> mac = new ArrayList<>();
    List<Pat> pat = new ArrayList<>();
    List<Flow> flows = new ArrayList<>();

    Session(NetworkDto n) {
      network = n;
    }
  }

  private final Map<UUID, Session> sessions = new LinkedHashMap<>();
  private final NetworkSimulator simulator;

  public RuntimeService(NetworkSimulator simulator) {
    this.simulator = simulator;
  }

  public static final UUID DEMO = UUID.fromString("00000000-0000-0000-0000-000000000001");

  public static String hardwareAddress(String id, int port) {
    int hash = 0x811c9dc5;
    for (int i = 0; i < id.length(); i++) hash = (hash ^ id.charAt(i)) * 0x01000193;
    return String.format(
        "02:%02x:%02x:%02x:%02x:%02x",
        (hash >>> 24) & 255, (hash >>> 16) & 255, (hash >>> 8) & 255, hash & 255, port);
  }

  private boolean bridge(Device d) {
    return d.kind().startsWith("Switch") || d.kind().equals("Access Point");
  }

  private Device device(NetworkDto n, String id) {
    return n.devices().stream().filter(d -> d.id().equals(id)).findFirst().orElseThrow();
  }

  private Device address(NetworkDto n, String ip) {
    return n.devices().stream()
        .filter(
            d ->
                d.ip().equals(ip)
                    || simulator.config(d).interfaces().stream().anyMatch(p -> p.ip().equals(ip)))
        .findFirst()
        .orElseThrow();
  }

  private Session session(NetworkDto n, UUID id) {
    var normalized =
        new NetworkDto(
            n.devices().stream()
                .map(
                    d ->
                        new Device(
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
                            simulator.config(d)))
                .toList(),
            n.links());
    UUID key = id == null ? DEMO : id;
    var s = sessions.get(key);
    if (s == null || !s.network.equals(normalized)) {
      s = new Session(normalized);
      sessions.put(key, s);
    }
    if (sessions.size() > 32) sessions.remove(sessions.keySet().iterator().next());
    return s;
  }

  private Result fail(String message) {
    return new Result(false, message, List.of());
  }

  private void learn(NetworkDto n, Session s, List<Hop> hops) {
    for (int start = 0; start < hops.size(); ) {
      var first = hops.get(start);
      String sender = first.from(), sourceMac = hardwareAddress(sender, first.out());
      int end = start;
      while (end < hops.size()) {
        var h = hops.get(end);
        var receiver = device(n, h.to());
        if (!bridge(receiver)) break;
        var entry = new Mac(receiver.id(), sourceMac, h.incoming(), h.vlan(), s.time + 300);
        s.mac.removeIf(
            e ->
                e.device().equals(entry.device())
                    && e.mac().equals(entry.mac())
                    && e.vlan() == entry.vlan());
        s.mac.add(entry);
        end++;
      }
      if (end >= hops.size()) end = hops.size() - 1;
      var last = hops.get(end);
      var receiver = device(n, last.to());
      String ip = simulator.config(receiver).interfaces().get(last.incoming()).ip();
      if (ip.isEmpty()) ip = receiver.ip();
      var entry =
          new Arp(
              sender,
              ip,
              hardwareAddress(receiver.id(), last.incoming()),
              first.out(),
              s.time + 300);
      s.arp.removeIf(
          e ->
              e.device().equals(entry.device())
                  && e.ip().equals(entry.ip())
                  && e.port() == entry.port());
      s.arp.add(entry);
      start = end + 1;
    }
    if (s.arp.size() > 1024)
      s.arp = new ArrayList<>(s.arp.subList(s.arp.size() - 1024, s.arp.size()));
    if (s.mac.size() > 2048)
      s.mac = new ArrayList<>(s.mac.subList(s.mac.size() - 2048, s.mac.size()));
  }

  public synchronized Response perform(NetworkDto n, UUID scope, Action a) {
    var s = session(n, scope);
    Result result = null;
    switch (a.action()) {
      case "inspect" -> {}
      case "clear" -> {
        s.arp.clear();
        s.mac.clear();
        s.pat.clear();
        s.flows.clear();
      }
      case "advance" -> {
        if (a.seconds() == null || a.seconds() < 1 || a.seconds() > 3600)
          throw new IllegalArgumentException("Avance permitido: 1–3600 segundos virtuales");
        s.time += a.seconds();
        s.arp.removeIf(e -> e.expires() <= s.time);
        s.mac.removeIf(e -> e.expires() <= s.time);
        s.pat.removeIf(e -> e.expires() <= s.time);
        s.flows.removeIf(e -> e.expires <= s.time);
      }
      case "probe", "flow" -> {
        if (a.source() == null || a.target() == null)
          throw new IllegalArgumentException("Selecciona origen y destino");
        if (a.action().equals("flow")
            && (!Set.of("TCP", "UDP").contains(a.protocol() == null ? "" : a.protocol())
                || a.sourcePort() == null
                || a.targetPort() == null
                || a.sourcePort() < 1
                || a.sourcePort() > 65535
                || a.targetPort() < 1
                || a.targetPort() > 65535))
          throw new IllegalArgumentException("Protocolo o puerto inválido");
        result =
            a.action().equals("flow")
                ? simulator.direction(new Request(n, a.source(), a.target()), null, true)
                : simulator.ping(new Request(n, a.source(), a.target()));
        if (result.ok()) {
          learn(n, s, result.hops());
          var source = device(n, a.source());
          var target = address(n, a.target());
          var back = simulator.ping(new Request(n, target.id(), source.ip()));
          if (back.ok()) learn(n, s, back.hops());
          if (a.action().equals("flow")) {
            Flow flow =
                s.flows.stream()
                    .filter(
                        f ->
                            f.source.equals(source.id())
                                && f.target.equals(a.target())
                                && f.protocol.equals(a.protocol())
                                && f.sourcePort == a.sourcePort()
                                && f.targetPort == a.targetPort())
                    .findFirst()
                    .orElse(null);
            int expires = s.time + (a.protocol().equals("TCP") ? 300 : 60);
            if (flow != null) {
              flow.expires = expires;
              String id = flow.id;
              s.pat.replaceAll(p -> p.flow().equals(id) ? p.until(expires) : p);
            } else if (s.flows.size() >= 128) result = fail("Límite de 128 sesiones activas");
            else {
              flow = new Flow("flow-" + (++s.serial), a, expires);
              String insideIp = source.ip();
              int insidePort = a.sourcePort();
              var entries = new ArrayList<Pat>();
              for (var h : result.hops()) {
                var d = device(n, h.from());
                var c = simulator.config(d);
                if (!c.nat() || !(d.kind().startsWith("Router") || d.kind().startsWith("Firewall")))
                  continue;
                String outsideIp = c.interfaces().get(h.out()).ip();
                int outsidePort = 40000;
                while (true) {
                  final int port = outsidePort;
                  boolean used =
                      java.util.stream.Stream.concat(s.pat.stream(), entries.stream())
                          .anyMatch(
                              p ->
                                  p.device().equals(d.id())
                                      && p.protocol().equals(a.protocol())
                                      && p.outsideIp().equals(outsideIp)
                                      && p.outsidePort() == port);
                  if (!used) break;
                  outsidePort++;
                }
                entries.add(
                    new Pat(
                        flow.id + "-" + entries.size(),
                        flow.id,
                        d.id(),
                        a.protocol(),
                        insideIp,
                        insidePort,
                        outsideIp,
                        outsidePort,
                        a.target(),
                        a.targetPort(),
                        expires));
                insideIp = outsideIp;
                insidePort = outsidePort;
              }
              s.flows.add(flow);
              s.pat.addAll(entries);
            }
            if (result.ok())
              result =
                  new Result(
                      true,
                      "Flujo " + a.protocol() + " virtual entregado · " + flow.id,
                      result.path(),
                      result.hops());
          }
        }
      }
      case "return" -> {
        var flow =
            s.flows.stream().filter(f -> f.id.equals(a.sessionId())).findFirst().orElse(null);
        var chain = s.pat.stream().filter(p -> p.flow().equals(a.sessionId())).toList();
        var outer = chain.isEmpty() ? null : chain.getLast();
        if (flow == null || outer == null) result = fail("Sin traducción PAT vigente");
        else if (!Objects.equals(a.protocol(), flow.protocol)
            || !Objects.equals(a.source(), outer.remoteIp())
            || !Objects.equals(a.sourcePort(), outer.remotePort())
            || !Objects.equals(a.target(), outer.outsideIp())
            || !Objects.equals(a.targetPort(), outer.outsidePort()))
          result = fail("Respuesta rechazada: la tupla no coincide con la sesión");
        else {
          var origin = device(n, flow.source);
          var remote = address(n, flow.target);
          result =
              simulator.direction(
                  new Request(n, remote.id(), outer.outsideIp()), flow.target, false);
          for (var translation : chain.reversed()) {
            if (!result.ok()) break;
            var segment =
                simulator.direction(
                    new Request(n, translation.device(), translation.insideIp()),
                    flow.target,
                    false);
            if (!segment.ok()) {
              result = segment;
              break;
            }
            var path = new ArrayList<>(result.path());
            path.addAll(segment.path().subList(1, segment.path().size()));
            var hops = new ArrayList<>(result.hops());
            hops.addAll(segment.hops());
            result = new Result(true, segment.message(), path, hops);
          }
          if (result.ok()) {
            learn(n, s, result.hops());
            result =
                new Result(
                    true,
                    "Respuesta PAT entregada a " + origin.ip() + ":" + flow.sourcePort,
                    result.path(),
                    result.hops());
          }
        }
      }
      default -> throw new IllegalArgumentException("Acción de simulación inválida");
    }
    return new Response(
        result, new Tables(s.time, List.copyOf(s.arp), List.copyOf(s.mac), List.copyOf(s.pat)));
  }
}
