import type { Device, Network } from "./network";
export type Port = {
  enabled: boolean;
  description: string;
  mode: "access" | "trunk";
  vlan: number;
  ip: string;
  prefix: number;
};
export type Route = { network: string; prefix: number; gateway: string };
export type Rule = {
  action: "permit" | "deny";
  source: string;
  destination: string;
};
export type Config = {
  interfaces: Port[];
  gateway: string;
  routes: Route[];
  firewall: Rule[];
  dhcp: { start: string; end: string; gateway: string; prefix: number } | null;
  nat: boolean;
  light: boolean;
};
export const count = (d: Device) =>
  d.kind.startsWith("Switch")
    ? 8
    : d.kind.startsWith("Router") || d.kind === "Access Point"
      ? 4
      : d.kind.startsWith("Firewall")
        ? 2
        : 1;
export const ip = (s: string) => {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return null;
  const a = s.split(".").map(Number);
  return a.some((x) => x > 255)
    ? null
    : a.reduce((x, y) => (x * 256 + y) >>> 0, 0);
};
const mask = (p: number) => (0xffffffff << (32 - p)) >>> 0;
const same = (a: string, b: string, p: number) =>
  (ip(a)! & mask(p)) === (ip(b)! & mask(p));
export function configuration(d: Device): Config {
  return (
    d.config ?? {
      interfaces: Array.from({ length: count(d) }, (_, i) => ({
        enabled: true,
        description: "",
        mode: "access",
        vlan: 1,
        ip: i === 0 ? d.ip : "",
        prefix: d.prefix,
      })),
      gateway: d.kind === "PC" || d.kind === "Laptop" ? "192.168.1.1" : "",
      routes: [],
      firewall: [],
      dhcp: null,
      nat: false,
      light: false,
    }
  );
}
export function validateConfig(c: Config, d: Device) {
  const validIp = (s: string) =>
    typeof s === "string" && (s === "" || ip(s) !== null);
  const prefix = (p: number) => Number.isInteger(p) && p >= 1 && p <= 30;
  if (
    !c ||
    !Array.isArray(c.interfaces) ||
    c.interfaces.length !== count(d) ||
    !validIp(c.gateway) ||
    !Array.isArray(c.routes) ||
    c.routes.length > 64 ||
    !Array.isArray(c.firewall) ||
    c.firewall.length > 64 ||
    typeof c.nat !== "boolean" ||
    typeof c.light !== "boolean"
  )
    throw Error("Configuración inválida");
  for (const p of c.interfaces)
    if (
      !p ||
      typeof p.enabled !== "boolean" ||
      typeof p.description !== "string" ||
      p.description.length > 100 ||
      !["access", "trunk"].includes(p.mode) ||
      !Number.isInteger(p.vlan) ||
      p.vlan < 1 ||
      p.vlan > 4094 ||
      !validIp(p.ip) ||
      !prefix(p.prefix)
    )
      throw Error("Interfaz inválida");
  for (const r of c.routes)
    if (
      ip(r.network) === null ||
      ip(r.gateway) === null ||
      !Number.isInteger(r.prefix) ||
      r.prefix < 0 ||
      r.prefix > 30
    )
      throw Error("Ruta inválida");
  for (const r of c.firewall)
    if (
      !["permit", "deny"].includes(r.action) ||
      (r.source !== "*" && ip(r.source) === null) ||
      (r.destination !== "*" && ip(r.destination) === null)
    )
      throw Error("Regla inválida");
  if (
    c.dhcp &&
    (ip(c.dhcp.start) === null ||
      ip(c.dhcp.end) === null ||
      ip(c.dhcp.gateway) === null ||
      ip(c.dhcp.start)! > ip(c.dhcp.end)! ||
      ip(c.dhcp.end)! - ip(c.dhcp.start)! > 200 ||
      !prefix(c.dhcp.prefix) ||
      !same(c.dhcp.start, c.dhcp.end, c.dhcp.prefix) ||
      !same(c.dhcp.start, c.dhcp.gateway, c.dhcp.prefix))
  )
    throw Error("Pool DHCP inválido");
}
export type Hop = {
  from: string;
  to: string;
  out: number;
  incoming: number;
  vlan: number;
};
export type Probe = {
  ttl: number;
  device: string | null;
  address: string | null;
  status: string;
  delayMs: number | null;
  cause: string;
};
export type Trace = {
  expired?: string | null;
  probes?: Probe[];
  hops?: Hop[];
  ok: boolean;
  message: string;
  path: string[];
  details?: string[];
};
const roomPositions = [
  [-4.2, -3.8],
  [0, -3.8],
  [4.2, -3.8],
  [-4.2, 0],
  [4.2, 0],
  [4.2, 3.8],
  [-4.2, 3.8],
  [0, 3.8],
  [0, 0],
];
export const wifiDistance = (a: Device, b: Device) =>
  Math.hypot(
    roomPositions[a.room][0] + a.x - roomPositions[b.room][0] - b.x,
    roomPositions[a.room][1] + a.z - roomPositions[b.room][1] - b.z,
  );
export function simulate(
  n: Network,
  source: string,
  target: string,
  options: {
    oneWay?: boolean;
    translate?: boolean;
    wireSource?: string;
    ttl?: number;
  } = {},
): Trace {
  const a = n.devices.find((d) => d.id === source),
    b = n.devices.find(
      (d) =>
        d.ip === target ||
        configuration(d).interfaces.some((p) => p.ip === target),
    );
  const fail = (message: string): Trace => ({ ok: false, message, path: [] });
  if (!a || !a.on) return fail("Origen apagado o inexistente");
  if (!b) return fail("IP de destino desconocida");
  if (!b.on) return fail("Destino apagado");
  if (
    n.devices.filter(
      (d) =>
        d.ip === target ||
        configuration(d).interfaces.some((p) => p.ip === target),
    ).length > 1 ||
    n.devices.filter(
      (d) =>
        d.ip === a.ip || configuration(d).interfaces.some((p) => p.ip === a.ip),
    ).length > 1
  )
    return fail("Dirección IP duplicada");
  const search = (
    start: Device,
    end: Device,
    srcIp: string,
    dstIp: string,
  ): Trace => {
    const queue: {
      id: string;
      path: string[];
      vlan: number;
      incoming: number;
      nextHop: string;
      wireSource: string;
      details: string[];
      hops: Hop[];
      ttl: number;
    }[] = [
      {
        id: start.id,
        path: [start.id],
        vlan: configuration(start).interfaces[0].vlan,
        incoming: -1,
        wireSource: srcIp,
        nextHop: same(start.ip, dstIp, start.prefix)
          ? dstIp
          : configuration(start).gateway,
        details: [],
        hops: [],
        ttl: options.ttl ?? 64,
      },
    ];
    const seen = new Set<string>();
    let reason = same(start.ip, dstIp, start.prefix)
      ? "Sin enlace operativo hasta el destino"
      : "Subred incompatible: no existe un recorrido enrutado";
    while (queue.length) {
      const state = queue.shift()!;
      const key = `${state.id}:${state.vlan}:${state.incoming}:${state.nextHop}`;
      if (seen.has(key) || state.path.length > 32) continue;
      seen.add(key);
      const d = n.devices.find((v) => v.id === state.id)!,
        c = configuration(d);
      if (!d.on) continue;
      const rule = c.firewall.find(
        (r) =>
          (r.source === "*" || r.source === state.wireSource) &&
          (r.destination === "*" || r.destination === dstIp),
      );
      if (rule?.action === "deny") {
        reason = "Bloqueado por firewall " + d.name;
        continue;
      }
      if (d.id === end.id)
        return {
          ok: true,
          message: "Respuesta ICMP virtual · 32 bytes · recorrido verificado",
          path: state.path,
          details: state.details,
          hops: state.hops,
        };
      const router =
        d.kind.startsWith("Router") || d.kind.startsWith("Firewall");
      const bridge = d.kind.startsWith("Switch") || d.kind === "Access Point";
      if (d.id !== start.id && !router && !bridge) continue;
      let nextHop = state.nextHop;
      let routed = false;
      if (router) {
        if (
          state.incoming >= 0 &&
          (!c.interfaces[state.incoming].enabled ||
            c.interfaces[state.incoming].ip !== nextHop)
        ) {
          continue;
        }
        if (d.id !== start.id && state.ttl <= 1)
          return {
            ok: false,
            message: "TTL agotado en " + d.name,
            path: state.path,
            hops: state.hops,
            expired: d.id,
          };
        const direct = c.interfaces.some(
          (p) => p.enabled && p.ip && same(p.ip, dstIp, p.prefix),
        );
        const route = [...c.routes]
          .sort((x, y) => y.prefix - x.prefix)
          .find((r) => r.prefix === 0 || same(r.network, dstIp, r.prefix));
        if (!direct && !route) {
          reason = "Sin ruta hacia " + dstIp;
          continue;
        }
        nextHop = direct ? dstIp : route!.gateway;
        routed = true;
      }
      if (!nextHop) {
        reason = "Subred incompatible: gateway no configurado";
        continue;
      }
      for (const link of n.links) {
        const out = link.a === d.id ? link.ap : link.b === d.id ? link.bp : -1;
        if (out < 0 || out === state.incoming) continue;
        const dest = n.devices.find(
            (v) => v.id === (link.a === d.id ? link.b : link.a),
          )!,
          inPort = link.a === d.id ? link.bp : link.ap,
          p = c.interfaces[out],
          q = configuration(dest).interfaces[inPort];
        if (link.kind === "Wi-Fi" && wifiDistance(d, dest) > 8) {
          reason = "Fuera del alcance Wi-Fi virtual";
          continue;
        }
        if (!p.enabled || !q.enabled || !dest.on) {
          reason = "Interfaz o dispositivo apagado";
          continue;
        }
        let vlan = routed ? p.vlan : state.vlan;
        if (bridge && p.mode === "access" && p.vlan !== vlan) {
          reason = "VLAN incompatible";
          continue;
        }
        if (p.mode !== q.mode) {
          reason = "Modo access/trunk incompatible";
          continue;
        }
        // Access links carry untagged frames; the receiving bridge assigns its port VLAN.
        if (
          q.mode === "access" &&
          (dest.kind.startsWith("Switch") || dest.kind === "Access Point")
        )
          vlan = q.vlan;
        if (routed && (!p.ip || !same(p.ip, nextHop, p.prefix))) continue;
        if (dest.id === end.id && nextHop !== dstIp) continue;
        queue.push({
          id: dest.id,
          ttl: state.ttl - (router && d.id !== start.id ? 1 : 0),
          path: [...state.path, dest.id],
          vlan,
          incoming: inPort,
          hops: [
            ...state.hops,
            { from: d.id, to: dest.id, out, incoming: inPort, vlan },
          ],
          nextHop,
          wireSource:
            routed && c.nat && options.translate !== false
              ? p.ip
              : state.wireSource,
          details: [
            ...state.details,
            `${d.name} eth${out} → ${dest.name} eth${inPort} · VLAN ${vlan}`,
            ...(routed && c.nat && options.translate !== false
              ? [`NAT/PAT educativo: ${srcIp} → ${p.ip} (ICMP)`]
              : []),
          ],
        });
      }
    }
    return fail(reason);
  };
  const forward = search(a, b, options.wireSource ?? a.ip, target);
  if (!forward.ok || options.oneWay) return forward;
  const back = search(b, a, target, a.ip);
  if (!back.ok) return fail("Sin retorno: " + back.message);
  return forward;
}
export function dhcpLease(n: Network, id: string) {
  const d = n.devices.find((v) => v.id === id);
  if (!d) throw Error("Dispositivo inexistente");
  for (const server of n.devices) {
    const pool = configuration(server).dhcp;
    if (!pool || !server.on) continue;
    for (
      let candidate = ip(pool.start)!;
      candidate <= ip(pool.end)!;
      candidate++
    ) {
      const address = [24, 16, 8, 0]
        .map((b) => (candidate >>> b) & 255)
        .join(".");
      if (
        n.devices.some(
          (v) =>
            v.ip === address ||
            configuration(v).interfaces.some((p) => p.ip === address),
        )
      )
        continue;
      const copy = structuredClone({devices: n.devices, links: n.links}),
        client = copy.devices.find((v) => v.id === id)!;
      client.ip = address;
      client.prefix = pool.prefix;
      client.config = configuration(client);
      client.config.gateway = pool.gateway;
      client.config.interfaces[0].ip = address;
      client.config.interfaces[0].prefix = pool.prefix;
      if (simulate(copy, id, server.ip).ok) return client;
      break;
    }
  }
  throw Error("Sin servidor DHCP alcanzable o pool agotado");
}
