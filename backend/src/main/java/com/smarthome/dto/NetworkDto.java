package com.smarthome.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record NetworkDto(
    @NotNull @Size(max = 100) List<@Valid Device> devices,
    @NotNull @Size(max = 400) List<@Valid Link> links) {
  public record Device(
      @NotBlank @Size(max = 100) String id,
      @NotBlank @Size(max = 60) String name,
      @NotNull
          @Pattern(
              regexp =
                  "Router ISR 4321|Switch 2960|Firewall ASA|PC|Laptop|Access Point|Servidor|Cámara"
                      + " IP|Bombilla IoT|Switch Catalyst 9300|Impresora|Teléfono IP|Smart"
                      + " TV|Sensor IoT|Internet")
          String kind,
      @Min(0) @Max(8) int room,
      @DecimalMin("-1.8") @DecimalMax("1.8") double x,
      @DecimalMin("-1.5") @DecimalMax("1.5") double z,
      double rotation,
      @NotNull
          @Pattern(
              regexp =
                  "(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])(?:\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])){3}")
          String ip,
      @Min(1) @Max(30) int prefix,
      boolean on,
      @Valid Config config) {
    public Device(
        String id,
        String name,
        String kind,
        int room,
        double x,
        double z,
        double rotation,
        String ip,
        int prefix,
        boolean on) {
      this(id, name, kind, room, x, z, rotation, ip, prefix, on, null);
    }
  }

  public record Port(
      boolean enabled,
      @NotNull @Size(max = 100) String description,
      @Pattern(regexp = "access|trunk") String mode,
      @Min(1) @Max(4094) int vlan,
      @NotNull String ip,
      @Min(1) @Max(30) int prefix) {}

  public record Route(
      @NotNull String network, @Min(0) @Max(30) int prefix, @NotNull String gateway) {}

  public record Rule(
      @Pattern(regexp = "permit|deny") String action,
      @NotNull String source,
      @NotNull String destination) {}

  public record Pool(
      @NotNull String start,
      @NotNull String end,
      @NotNull String gateway,
      @Min(1) @Max(30) int prefix) {}

  public record Config(
      @NotNull @Size(max = 8) List<@Valid Port> interfaces,
      @NotNull String gateway,
      @NotNull @Size(max = 64) List<@Valid Route> routes,
      @NotNull @Size(max = 64) List<@Valid Rule> firewall,
      @Valid Pool dhcp,
      boolean nat,
      boolean light) {}

  public record Link(
      @NotBlank @Size(max = 100) String id,
      @NotBlank String a,
      @NotBlank String b,
      @Min(0) @Max(7) int ap,
      @Min(0) @Max(7) int bp,
      @Pattern(regexp = "Ethernet|Wi-Fi|Fibra") String kind) {
    public Link(String id, String a, String b, int ap, int bp) {
      this(id, a, b, ap, bp, null);
    }
  }

  @com.fasterxml.jackson.annotation.JsonIgnore
  @AssertTrue(message = "Enlaces o dispositivos inválidos")
  public boolean isTopologyValid() {
    if (devices == null || links == null) return false;
    var ids = new java.util.HashMap<String, Device>();
    var used = new java.util.HashSet<String>();
    var lids = new java.util.HashSet<String>();
    for (var d : devices) {
      if (d == null
          || d.kind() == null
          || ids.put(d.id(), d) != null
          || !Double.isFinite(d.rotation())
          || d.config() != null
              && (d.config().interfaces() == null
                  || d.config().interfaces().size() != ports(d)
                  || !validConfig(d.config()))) return false;
    }
    for (var l : links) {
      if (l == null) return false;
      var a = ids.get(l.a());
      var b = ids.get(l.b());
      if (a == null
          || b == null
          || a == b
          || !lids.add(l.id())
          || l.ap() >= ports(a)
          || l.bp() >= ports(b)
          || !used.add(l.a() + ":" + l.ap())
          || !used.add(l.b() + ":" + l.bp())) return false;
      if ("Wi-Fi".equals(l.kind())
          && !a.kind().equals("Access Point")
          && !b.kind().equals("Access Point")) return false;
      if ("Fibra".equals(l.kind())
          && java.util.stream.Stream.of(a, b)
              .anyMatch(
                  d ->
                      !java.util.Set.of(
                              "Router ISR 4321",
                              "Switch 2960",
                              "Switch Catalyst 9300",
                              "Firewall ASA",
                              "Servidor",
                              "Internet")
                          .contains(d.kind()))) return false;
    }
    return true;
  }

  private int ports(Device d) {
    return d.kind() != null && d.kind().startsWith("Switch")
        ? 8
        : ("Router ISR 4321".equals(d.kind()) || "Access Point".equals(d.kind()))
            ? 4
            : "Firewall ASA".equals(d.kind()) ? 2 : 1;
  }

  private static boolean validIp(String s, boolean empty) {
    if (s == null) return false;
    if (empty && s.isEmpty()) return true;
    if (!s.matches("\\d{1,3}(\\.\\d{1,3}){3}")) return false;
    for (String part : s.split("\\.")) if (Integer.parseInt(part) > 255) return false;
    return true;
  }

  private boolean validConfig(Config c) {
    if (c.routes() == null || c.firewall() == null || !validIp(c.gateway(), true)) return false;
    for (var p : c.interfaces())
      if (p == null || !validIp(p.ip(), true) || p.mode() == null) return false;
    for (var r : c.routes())
      if (r == null || !validIp(r.network(), false) || !validIp(r.gateway(), false)) return false;
    for (var r : c.firewall())
      if (r == null
          || r.action() == null
          || !("*".equals(r.source()) || validIp(r.source(), false))
          || !("*".equals(r.destination()) || validIp(r.destination(), false))) return false;
    if (c.dhcp() != null) {
      var p = c.dhcp();
      if (!validIp(p.start(), false) || !validIp(p.end(), false) || !validIp(p.gateway(), false))
        return false;
      long start = number(p.start()), end = number(p.end());
      if (start > end || end - start > 200) return false;
      long mask = (0xffffffffL << (32 - p.prefix())) & 0xffffffffL;
      if ((start & mask) != (end & mask) || (start & mask) != (number(p.gateway()) & mask))
        return false;
    }
    return true;
  }

  private long number(String ip) {
    long n = 0;
    for (String p : ip.split("\\.")) n = n * 256 + Integer.parseInt(p);
    return n;
  }
}
