import type { Network } from "./network";
import { configuration, simulate, type Trace, type Hop } from "./advanced.ts";
export type Arp = {
  device: string;
  ip: string;
  mac: string;
  port: number;
  expires: number;
};
export type Mac = {
  device: string;
  mac: string;
  port: number;
  vlan: number;
  expires: number;
};
export type Pat = {
  id: string;
  flow: string;
  device: string;
  protocol: string;
  insideIp: string;
  insidePort: number;
  outsideIp: string;
  outsidePort: number;
  remoteIp: string;
  remotePort: number;
  expires: number;
};
export type Runtime = { time: number; arp: Arp[]; mac: Mac[]; pat: Pat[] };
export type Action = {
  action: "inspect" | "probe" | "flow" | "return" | "advance" | "clear";
  source?: string;
  target?: string;
  protocol?: "TCP" | "UDP";
  sourcePort?: number;
  targetPort?: number;
  sessionId?: string;
  seconds?: number;
};
type Flow = {
  id: string;
  source: string;
  target: string;
  protocol: string;
  sourcePort: number;
  targetPort: number;
  expires: number;
};
type Session = Runtime & { key: string; serial: number; flows: Flow[] };
export const hardwareAddress = (id: string, port: number) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++)
    hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
  return [
    2,
    (hash >>> 24) & 255,
    (hash >>> 16) & 255,
    (hash >>> 8) & 255,
    hash & 255,
    port,
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join(":");
};
const bridge = (kind: string) =>
  kind.startsWith("Switch") || kind === "Access Point";
const key = (n: Network) =>
  JSON.stringify({
    devices: n.devices.map((d) => ({ ...d, config: configuration(d) })),
    links: n.links,
  });
const sessions = new Map<string, Session>();
function session(n: Network, scope: string) {
  const signature = key(n);
  let s = sessions.get(scope);
  if (!s || s.key !== signature) {
    s = {
      key: signature,
      time: 0,
      serial: 0,
      flows: [],
      arp: [],
      mac: [],
      pat: [],
    };
    sessions.set(scope, s);
  }
  if (sessions.size > 32) sessions.delete(sessions.keys().next().value!);
  return s;
}
const fail = (message: string): Trace => ({
  ok: false,
  message,
  path: [],
  hops: [],
});
function learn(n: Network, s: Session, hops: Hop[]) {
  for (let start = 0; start < hops.length;) {
    const first = hops[start],
      sender = n.devices.find((d) => d.id === first.from)!,
      sourceMac = hardwareAddress(sender.id, first.out);
    let end = start;
    while (end < hops.length) {
      const h = hops[end],
        receiver = n.devices.find((d) => d.id === h.to)!;
      if (!bridge(receiver.kind)) break;
      const entry = {
        device: receiver.id,
        mac: sourceMac,
        port: h.incoming,
        vlan: h.vlan,
        expires: s.time + 300,
      };
      s.mac = s.mac.filter(
        (e) =>
          !(
            e.device === entry.device &&
            e.mac === entry.mac &&
            e.vlan === entry.vlan
          ),
      );
      s.mac.push(entry);
      end++;
    }
    if (end >= hops.length) end = hops.length - 1;
    const last = hops[end],
      receiver = n.devices.find((d) => d.id === last.to)!,
      address =
        configuration(receiver).interfaces[last.incoming].ip || receiver.ip;
    const entry = {
      device: sender.id,
      ip: address,
      mac: hardwareAddress(receiver.id, last.incoming),
      port: first.out,
      expires: s.time + 300,
    };
    s.arp = s.arp.filter(
      (e) =>
        !(
          e.device === entry.device &&
          e.ip === entry.ip &&
          e.port === entry.port
        ),
    );
    s.arp.push(entry);
    start = end + 1;
  }
  s.arp = s.arp.slice(-1024);
  s.mac = s.mac.slice(-2048);
}
export function runtime(
  n: Network,
  scope: string,
  a: Action,
): { result: Trace | null; tables: Runtime } {
  const s = session(n, scope);
  let result: Trace | null = null;
  if (a.action === "clear") {
    s.arp = [];
    s.mac = [];
    s.pat = [];
    s.flows = [];
  } else if (a.action === "advance") {
    if (!Number.isInteger(a.seconds) || a.seconds! < 1 || a.seconds! > 3600)
      throw Error("Avance permitido: 1–3600 segundos virtuales");
    s.time += a.seconds!;
    s.arp = s.arp.filter((e) => e.expires > s.time);
    s.mac = s.mac.filter((e) => e.expires > s.time);
    s.pat = s.pat.filter((e) => e.expires > s.time);
    s.flows = s.flows.filter((e) => e.expires > s.time);
  } else if (a.action === "probe" || a.action === "flow") {
    if (
      a.action === "flow" &&
      (!["TCP", "UDP"].includes(a.protocol ?? "") ||
        ![a.sourcePort, a.targetPort].every(
          (p) => Number.isInteger(p) && p! >= 1 && p! <= 65535,
        ))
    )
      throw Error("Protocolo o puerto inválido");
    result = simulate(n, a.source ?? "", a.target ?? "", {
      oneWay: a.action === "flow",
    });
    if (result.ok) {
      learn(n, s, result.hops ?? []);
      const source = n.devices.find((d) => d.id === a.source)!,
        target = n.devices.find(
          (d) =>
            d.ip === a.target ||
            configuration(d).interfaces.some((p) => p.ip === a.target),
        )!;
      const back = simulate(n, target.id, source.ip);
      if (back.ok) learn(n, s, back.hops ?? []);
      if (a.action === "flow") {
        let flow = s.flows.find(
          (f) =>
            f.source === source.id &&
            f.target === a.target &&
            f.protocol === a.protocol &&
            f.sourcePort === a.sourcePort &&
            f.targetPort === a.targetPort,
        );
        if (flow) {
          flow.expires = s.time + (a.protocol === "TCP" ? 300 : 60);
          s.pat
            .filter((p) => p.flow === flow!.id)
            .forEach((p) => (p.expires = flow!.expires));
        } else if (s.flows.length >= 128)
          result = fail("Límite de 128 sesiones activas");
        else {
          flow = {
            id: "flow-" + ++s.serial,
            source: source.id,
            target: a.target!,
            protocol: a.protocol!,
            sourcePort: a.sourcePort!,
            targetPort: a.targetPort!,
            expires: s.time + (a.protocol === "TCP" ? 300 : 60),
          };
          let insideIp = source.ip,
            insidePort = a.sourcePort!;
          const entries: Pat[] = [];
          for (const h of result.hops ?? []) {
            const d = n.devices.find((d) => d.id === h.from)!;
            if (
              !configuration(d).nat ||
              !(d.kind.startsWith("Router") || d.kind.startsWith("Firewall"))
            )
              continue;
            const outsideIp = configuration(d).interfaces[h.out].ip;
            let outsidePort = 40000;
            while (
              [...s.pat, ...entries].some(
                (p) =>
                  p.device === d.id &&
                  p.protocol === a.protocol &&
                  p.outsideIp === outsideIp &&
                  p.outsidePort === outsidePort,
              )
            )
              outsidePort++;
            entries.push({
              id: flow.id + "-" + entries.length,
              flow: flow.id,
              device: d.id,
              protocol: a.protocol!,
              insideIp,
              insidePort,
              outsideIp,
              outsidePort,
              remoteIp: a.target!,
              remotePort: a.targetPort!,
              expires: flow.expires,
            });
            insideIp = outsideIp;
            insidePort = outsidePort;
          }
          s.flows.push(flow);
          s.pat.push(...entries);
        }
        if (result.ok)
          result = {
            ...result,
            message: "Flujo " + a.protocol + " virtual entregado · " + flow!.id,
          };
      }
    }
  } else if (a.action === "return") {
    const flow = s.flows.find((f) => f.id === a.sessionId),
      chain = s.pat.filter((p) => p.flow === a.sessionId),
      outer = chain.at(-1);
    if (!flow || !outer) result = fail("Sin traducción PAT vigente");
    else if (
      a.protocol !== flow.protocol ||
      a.source !== outer.remoteIp ||
      a.sourcePort !== outer.remotePort ||
      a.target !== outer.outsideIp ||
      a.targetPort !== outer.outsidePort
    )
      result = fail("Respuesta rechazada: la tupla no coincide con la sesión");
    else {
      const origin = n.devices.find((d) => d.id === flow.source)!,
        remote = n.devices.find(
          (d) =>
            d.ip === flow.target ||
            configuration(d).interfaces.some((p) => p.ip === flow.target),
        )!;
      result = simulate(n, remote.id, outer.outsideIp, {
        oneWay: true,
        translate: false,
        wireSource: flow.target,
      });
      for (const translation of [...chain].reverse()) {
        if (!result.ok) break;
        const segment = simulate(n, translation.device, translation.insideIp, {
          oneWay: true,
          translate: false,
          wireSource: flow.target,
        });
        if (!segment.ok) {
          result = segment;
          break;
        }
        result = {
          ...segment,
          path: [...result.path, ...segment.path.slice(1)],
          hops: [...(result.hops ?? []), ...(segment.hops ?? [])],
        };
      }
      if (result.ok) {
        learn(n, s, result.hops ?? []);
        result = {
          ...result,
          message: `Respuesta PAT entregada a ${origin.ip}:${flow.sourcePort}`,
        };
      }
    }
  } else if (a.action !== "inspect")
    throw Error("Acción de simulación inválida");
  return {
    result,
    tables: structuredClone({
      time: s.time,
      arp: s.arp,
      mac: s.mac,
      pat: s.pat,
    }),
  };
}
