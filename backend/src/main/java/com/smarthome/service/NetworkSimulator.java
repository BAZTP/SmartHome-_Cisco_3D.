package com.smarthome.service;

import com.smarthome.controller.SimulationController.Hop;
import com.smarthome.controller.SimulationController.Request;
import com.smarthome.controller.SimulationController.Result;
import com.smarthome.dto.NetworkDto.*;
import java.util.*;

@org.springframework.stereotype.Service
public class NetworkSimulator {
  private static final double[][] ROOM_POSITIONS = {
    {-4.2, -3.8},
    {0, -3.8},
    {4.2, -3.8},
    {-4.2, 0},
    {4.2, 0},
    {4.2, 3.8},
    {-4.2, 3.8},
    {0, 3.8},
    {0, 0}
  };

  private double wifiDistance(Device a, Device b) {
    return Math.hypot(
        ROOM_POSITIONS[a.room()][0] + a.x() - ROOM_POSITIONS[b.room()][0] - b.x(),
        ROOM_POSITIONS[a.room()][1] + a.z() - ROOM_POSITIONS[b.room()][1] - b.z());
  }

  private Result fail(String m) {
    return new Result(false, m, List.of());
  }

  private long ip(String s) {
    long n = 0;
    for (String p : s.split("\\.")) {
      int v = Integer.parseInt(p);
      if (v < 0 || v > 255) throw new IllegalArgumentException("IPv4 invalide");
      n = n * 256 + v;
    }
    return n;
  }

  private boolean same(String a, String b, int prefix) {
    long mask = (0xffffffffL << (32 - prefix)) & 0xffffffffL;
    return (ip(a) & mask) == (ip(b) & mask);
  }

  public Config config(Device d) {
    if (d.config() != null) return d.config();
    int count =
        d.kind().startsWith("Switch")
            ? 8
            : (d.kind().startsWith("Router") || d.kind().equals("Access Point"))
                ? 4
                : d.kind().startsWith("Firewall") ? 2 : 1;
    var ps = new ArrayList<Port>();
    for (int i = 0; i < count; i++)
      ps.add(new Port(true, "", "access", 1, i == 0 ? d.ip() : "", d.prefix()));
    return new Config(
        ps,
        d.kind().equals("PC") || d.kind().equals("Laptop") ? "192.168.1.1" : "",
        List.of(),
        List.of(),
        null,
        false,
        false);
  }

  private record State(
      String id,
      List<String> path,
      int vlan,
      int incoming,
      String nextHop,
      String wireSource,
      List<Hop> hops,
      int ttl) {}

  public Result ping(Request r) {
    try {
      return run(r, null, false, true, 64);
    } catch (IllegalArgumentException | NullPointerException e) {
      return fail("Configuración de red inválida");
    }
  }

  public Result direction(Request r, String sourceAddress, boolean translate) {
    try {
      return run(r, sourceAddress, true, translate, 64);
    } catch (IllegalArgumentException | NullPointerException e) {
      return fail("Configuración de red inválida");
    }
  }

  private Result run(Request r, String sourceAddress, boolean oneWay, boolean translate, int ttl) {
    var n = r.network();
    var a = n.devices().stream().filter(d -> d.id().equals(r.source())).findFirst().orElse(null);
    var b =
        n.devices().stream()
            .filter(
                d ->
                    d.ip().equals(r.target())
                        || config(d).interfaces().stream().anyMatch(p -> p.ip().equals(r.target())))
            .findFirst()
            .orElse(null);
    if (a == null || !a.on()) return fail("Origen apagado o inexistente");
    if (b == null) return fail("IP de destino desconocida");
    if (!b.on()) return fail("Destino apagado");
    if (n.devices().stream()
                .filter(
                    d ->
                        d.ip().equals(a.ip())
                            || config(d).interfaces().stream().anyMatch(p -> p.ip().equals(a.ip())))
                .count()
            > 1
        || n.devices().stream()
                .filter(
                    d ->
                        d.ip().equals(r.target())
                            || config(d).interfaces().stream()
                                .anyMatch(p -> p.ip().equals(r.target())))
                .count()
            > 1) return fail("Dirección IP duplicada");
    var forward =
        search(r, a, b, sourceAddress == null ? a.ip() : sourceAddress, r.target(), translate, ttl);
    if (!forward.ok() || oneWay) return forward;
    var back = search(r, b, a, r.target(), a.ip(), translate, 64);
    return back.ok() ? forward : fail("Sin retorno: " + back.message());
  }

  private Result search(
      Request req, Device start, Device end, String src, String dst, boolean translate, int ttl) {
    var n = req.network();
    var queue = new ArrayDeque<State>();
    queue.add(
        new State(
            start.id(),
            List.of(start.id()),
            config(start).interfaces().getFirst().vlan(),
            -1,
            same(start.ip(), dst, start.prefix()) ? dst : config(start).gateway(),
            src,
            List.of(),
            ttl));
    var seen = new HashSet<String>();
    String reason =
        same(start.ip(), dst, start.prefix())
            ? "Sin enlace operativo hasta el destino"
            : "Subred incompatible: no existe un recorrido enrutado";
    while (!queue.isEmpty()) {
      var state = queue.remove();
      String key = state.id() + ":" + state.vlan() + ":" + state.incoming() + ":" + state.nextHop();
      if (!seen.add(key) || state.path().size() > 32) continue;
      var d = n.devices().stream().filter(v -> v.id().equals(state.id())).findFirst().orElseThrow();
      var c = config(d);
      if (!d.on()) continue;
      var rule =
          c.firewall().stream()
              .filter(
                  x ->
                      (x.source().equals("*") || x.source().equals(state.wireSource()))
                          && (x.destination().equals("*") || x.destination().equals(dst)))
              .findFirst()
              .orElse(null);
      if (rule != null && rule.action().equals("deny")) {
        reason = "Bloqueado por firewall " + d.name();
        continue;
      }
      if (d.id().equals(end.id()))
        return new Result(
            true,
            "Respuesta ICMP virtual · 32 bytes · recorrido verificado",
            state.path(),
            state.hops());
      boolean router = d.kind().startsWith("Router") || d.kind().startsWith("Firewall"),
          bridge = d.kind().startsWith("Switch") || d.kind().equals("Access Point");
      if (!d.id().equals(start.id()) && !router && !bridge) continue;
      String next = state.nextHop();
      boolean routed = false;
      if (router) {
        String expected = next;
        if (state.incoming() >= 0
            && (!c.interfaces().get(state.incoming()).enabled()
                || !c.interfaces().get(state.incoming()).ip().equals(expected))) {
          continue;
        }
        if (!d.id().equals(start.id()) && state.ttl() <= 1)
          return new Result(
              false, "TTL agotado en " + d.name(), state.path(), state.hops(), d.id(), List.of());
        boolean direct =
            c.interfaces().stream()
                .anyMatch(p -> p.enabled() && !p.ip().isEmpty() && same(p.ip(), dst, p.prefix()));
        var route =
            c.routes().stream()
                .filter(x -> x.prefix() == 0 || same(x.network(), dst, x.prefix()))
                .max(Comparator.comparingInt(Route::prefix))
                .orElse(null);
        if (!direct && route == null) {
          reason = "Sin ruta hacia " + dst;
          continue;
        }
        next = direct ? dst : route.gateway();
        routed = true;
      }
      if (next.isEmpty()) {
        reason = "Subred incompatible: gateway no configurado";
        continue;
      }
      for (var l : n.links()) {
        int out = l.a().equals(d.id()) ? l.ap() : l.b().equals(d.id()) ? l.bp() : -1;
        if (out < 0 || out == state.incoming()) continue;
        String other = l.a().equals(d.id()) ? l.b() : l.a();
        var dest = n.devices().stream().filter(v -> v.id().equals(other)).findFirst().orElseThrow();
        int in = l.a().equals(d.id()) ? l.bp() : l.ap();
        var p = c.interfaces().get(out);
        var q = config(dest).interfaces().get(in);
        if ("Wi-Fi".equals(l.kind()) && wifiDistance(d, dest) > 8) {
          reason = "Fuera del alcance Wi-Fi virtual";
          continue;
        }
        if (!p.enabled() || !q.enabled() || !dest.on()) {
          reason = "Interfaz o dispositivo apagado";
          continue;
        }
        int vlan = routed ? p.vlan() : state.vlan();
        if (bridge && p.mode().equals("access") && p.vlan() != vlan) {
          reason = "VLAN incompatible";
          continue;
        }
        if (!p.mode().equals(q.mode())) {
          reason = "Modo access/trunk incompatible";
          continue;
        }
        if (q.mode().equals("access")
            && (dest.kind().startsWith("Switch") || dest.kind().equals("Access Point")))
          vlan = q.vlan();
        if (routed && (p.ip().isEmpty() || !same(p.ip(), next, p.prefix()))) continue;
        if (dest.id().equals(end.id()) && !next.equals(dst)) continue;
        var path = new ArrayList<>(state.path());
        path.add(dest.id());
        var hops = new ArrayList<>(state.hops());
        hops.add(new Hop(d.id(), dest.id(), out, in, vlan));
        queue.add(
            new State(
                dest.id(),
                path,
                vlan,
                in,
                next,
                routed && c.nat() && translate ? p.ip() : state.wireSource(),
                hops,
                state.ttl() - (router && !d.id().equals(start.id()) ? 1 : 0)));
      }
    }
    return fail(reason);
  }

  public Result traceroute(Request req, int maxTtl) {
    if (maxTtl < 1 || maxTtl > 30) throw new IllegalArgumentException("TTL máximo: 1–30");
    var probes = new ArrayList<com.smarthome.controller.SimulationController.Probe>();
    Result last = fail("Sin sondas");
    for (int ttl = 1; ttl <= maxTtl; ttl++) {
      last = run(req, null, true, true, ttl);
      String responder =
          last.expired() != null ? last.expired() : last.ok() ? last.path().getLast() : null;
      if (responder == null) {
        probes.add(
            new com.smarthome.controller.SimulationController.Probe(
                ttl, null, null, "unreachable", null, last.message()));
        break;
      }
      var d =
          req.network().devices().stream()
              .filter(v -> v.id().equals(responder))
              .findFirst()
              .orElseThrow();
      var origin =
          req.network().devices().stream()
              .filter(v -> v.id().equals(req.source()))
              .findFirst()
              .orElseThrow();
      int incoming = last.hops().isEmpty() ? 0 : last.hops().getLast().incoming();
      String address =
          last.expired() != null ? config(d).interfaces().get(incoming).ip() : req.target();
      var reply = direction(new Request(req.network(), responder, origin.ip()), address, false);
      probes.add(
          new com.smarthome.controller.SimulationController.Probe(
              ttl,
              reply.ok() ? responder : null,
              reply.ok() ? address : null,
              reply.ok() ? last.ok() ? "reached" : "time-exceeded" : "timeout",
              reply.ok() ? last.hops().size() + reply.hops().size() + 1 : null,
              reply.ok()
                  ? last.ok() ? "Destino alcanzado" : "ICMP Time Exceeded"
                  : "Sin retorno: " + reply.message()));
      if (last.ok()) {
        last =
            new Result(
                reply.ok(),
                reply.ok() ? "Destino alcanzado" : "Sin retorno: " + reply.message(),
                last.path(),
                last.hops());
        break;
      }
    }
    boolean ok = probes.getLast().status().equals("reached");
    return new Result(
        ok,
        ok
            ? "Traceroute ICMP virtual completado"
            : last.expired() != null ? "Límite TTL alcanzado" : last.message(),
        last.path(),
        last.hops(),
        last.expired(),
        probes);
  }

  public String formatTrace(Result r) {
    return r.message()
        + (r.probes().isEmpty()
            ? ""
            : "\nTTL · Respuesta · Tiempo virtual\n"
                + r.probes().stream()
                    .map(
                        p ->
                            p.ttl()
                                + "  "
                                + (p.address() == null ? "*" : p.address())
                                + "  "
                                + (p.delayMs() == null ? "*" : p.delayMs() + " ms virtuales")
                                + "  "
                                + p.cause())
                    .collect(java.util.stream.Collectors.joining("\n")));
  }
}
