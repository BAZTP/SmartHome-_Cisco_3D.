import type { Network } from "./network";
import { simulate, configuration, type Trace, type Probe } from "./advanced.ts";
export function traceroute(
  n: Network,
  source: string,
  target: string,
  maxTtl = 30,
): Trace {
  if (!Number.isInteger(maxTtl) || maxTtl < 1 || maxTtl > 30)
    throw Error("TTL máximo: 1–30");
  const probes: Probe[] = [];
  let last: Trace = { ok: false, message: "Sin sondas", path: [] };
  for (let ttl = 1; ttl <= maxTtl; ttl++) {
    last = simulate(n, source, target, { oneWay: true, ttl });
    const responder = last.expired ?? (last.ok ? last.path.at(-1) : undefined);
    if (!responder) {
      probes.push({
        ttl,
        device: null,
        address: null,
        status: "unreachable",
        delayMs: null,
        cause: last.message,
      });
      break;
    }
    const d = n.devices.find((d) => d.id === responder)!;
    const origin = n.devices.find((d) => d.id === source)!;
    const incoming = last.hops?.at(-1)?.incoming ?? 0;
    const address = last.expired
      ? configuration(d).interfaces[incoming].ip
      : target;
    const reply = simulate(n, responder, origin.ip, {
      oneWay: true,
      wireSource: address,
      translate: false,
    });
    probes.push({
      ttl,
      device: reply.ok ? responder : null,
      address: reply.ok ? address : null,
      status: reply.ok ? (last.ok ? "reached" : "time-exceeded") : "timeout",
      delayMs: reply.ok
        ? (last.hops?.length ?? 0) + (reply.hops?.length ?? 0) + 1
        : null,
      cause: reply.ok
        ? last.ok
          ? "Destino alcanzado"
          : "ICMP Time Exceeded"
        : "Sin retorno: " + reply.message,
    });
    if (last.ok) {
      last = {
        ...last,
        ok: reply.ok,
        message: reply.ok
          ? "Destino alcanzado"
          : "Sin retorno: " + reply.message,
      };
      break;
    }
  }
  const ok = probes.at(-1)?.status === "reached";
  return {
    ...last,
    ok,
    probes,
    message: ok
      ? "Traceroute ICMP virtual completado"
      : last.expired
        ? "Límite TTL alcanzado"
        : last.message,
  };
}
export function formatTrace(trace: Trace): string {
  return (
    trace.message +
    (trace.probes?.length
      ? "\nTTL · Respuesta · Tiempo virtual\n" +
        trace.probes
          .map(
            (p) =>
              `${p.ttl}  ${p.address ?? "*"}  ${p.delayMs === null ? "*" : p.delayMs + " ms virtuales"}  ${p.cause}`,
          )
          .join("\n")
      : "")
  );
}
