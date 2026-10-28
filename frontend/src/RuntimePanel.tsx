import { useEffect, useState } from "react";
import { useNetwork } from "./network";
import { browserEdition, getActiveProjectId } from "./projectStorage";
import { runtime, hardwareAddress, type Action, type Runtime } from "./runtime";
import type { Trace } from "./advanced";
export default function RuntimePanel() {
  const n = useNetwork(),
    selected = n.devices.find((d) => d.id === n.selected);
  const [tables, T] = useState<Runtime>({ time: 0, arp: [], mac: [], pat: [] }),
    [message, M] = useState(""),
    [busy, B] = useState(false),
    [target, S] = useState("203.0.113.1"),
    [protocol, P] = useState<"TCP" | "UDP">("TCP"),
    [sourcePort, SP] = useState(12345),
    [targetPort, TP] = useState(443),
    [session, SS] = useState(""),
    [replyPort, RP] = useState(40000);
  async function act(action: Action) {
    const projectId = getActiveProjectId();
    B(true);
    try {
      const network = { devices: n.devices, links: n.links };
      let response: { result: Trace | null; tables: Runtime };
      if (browserEdition) response = runtime(network, projectId, action);
      else {
        const r = await fetch("/api/simulation/runtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ network, projectId, ...action }),
        });
        if (!r.ok) throw Error("No se pudo ejecutar la operación de red");
        response = await r.json();
      }
      if (projectId !== getActiveProjectId()) return;
      T(response.tables);
      M(response.result?.message ?? "Tablas actualizadas");
      if (response.result) n.record(response.result);
    } catch (error) {
      M(String(error));
    } finally {
      B(false);
    }
  }
  // Clear obsolete display immediately when the topology changes; the engine also invalidates its cache.
  useEffect(() => {
    T({ time: 0, arp: [], mac: [], pat: [] });
    SS("");
  }, [n.devices, n.links]);
  const entries = tables.pat.filter((p) => p.device === selected?.id),
    arp = tables.arp.filter((p) => p.device === selected?.id),
    mac = tables.mac.filter((p) => p.device === selected?.id);
  const flows = [...new Map(tables.pat.map((p) => [p.flow, p])).values()];
  return (
    <details className="advanced">
      <summary>ARP, tabla MAC y sesiones PAT</summary>
      <p>
        Aprendizaje tras tráfico válido. MAC local simulada eth0:{" "}
        {selected ? hardwareAddress(selected.id, 0) : "Selecciona un equipo"}.
        Reloj: {tables.time} s virtuales.
      </p>
      <button disabled={busy} onClick={() => void act({ action: "inspect" })}>
        Consultar tablas
      </button>
      <button disabled={busy} onClick={() => void act({ action: "clear" })}>
        Vaciar tablas y sesiones
      </button>
      <button
        disabled={busy}
        onClick={() => void act({ action: "advance", seconds: 60 })}
      >
        Avanzar 60 segundos
      </button>
      <div className="interface-form">
        <label>
          Protocolo
          <select
            aria-label="Protocolo de flujo"
            value={protocol}
            onChange={(e) => P(e.target.value as "TCP" | "UDP")}
          >
            <option>TCP</option>
            <option>UDP</option>
          </select>
        </label>
        <label>
          Destino del flujo
          <input
            aria-label="Destino del flujo"
            value={target}
            onChange={(e) => S(e.target.value)}
          />
        </label>
        <label>
          Puerto de origen
          <input
            aria-label="Puerto del flujo origen"
            type="number"
            min={1}
            max={65535}
            value={sourcePort}
            onChange={(e) => SP(Number(e.target.value))}
          />
        </label>
        <label>
          Puerto de destino
          <input
            aria-label="Puerto del flujo destino"
            type="number"
            min={1}
            max={65535}
            value={targetPort}
            onChange={(e) => TP(Number(e.target.value))}
          />
        </label>
      </div>
      <button
        disabled={busy || !selected}
        onClick={() =>
          void act({
            action: "flow",
            source: selected!.id,
            target,
            protocol,
            sourcePort,
            targetPort,
          })
        }
      >
        Enviar flujo virtual
      </button>
      <label>
        Sesión de respuesta
        <select
          aria-label="Sesión PAT"
          value={session}
          onChange={(e) => {
            SS(e.target.value);
            RP(
              flows.find((p) => p.flow === e.target.value)?.outsidePort ??
                40000,
            );
          }}
        >
          <option value="">Seleccionar</option>
          {flows.map((p) => (
            <option key={p.flow} value={p.flow}>
              {p.flow} · {p.protocol} · {p.outsideIp}:{p.outsidePort}
            </option>
          ))}
        </select>
      </label>
      <label>
        Puerto público de respuesta
        <input
          aria-label="Puerto público de respuesta"
          type="number"
          value={replyPort}
          onChange={(e) => RP(Number(e.target.value))}
        />
      </label>
      <button
        disabled={busy || !flows.some((p) => p.flow === session)}
        onClick={() => {
          const p = flows.find((p) => p.flow === session);
          if (p)
            void act({
              action: "return",
              sessionId: session,
              protocol: p.protocol as "TCP" | "UDP",
              source: p.remoteIp,
              sourcePort: p.remotePort,
              target: p.outsideIp,
              targetPort: replyPort,
            });
        }}
      >
        Enviar respuesta virtual
      </button>
      <p aria-live="polite" aria-label="Resultado de tablas">
        {message}
      </p>
      <h4>ARP · equipo seleccionado</h4>
      <pre aria-label="Tabla ARP">
        {arp.length
          ? arp
              .map(
                (e) =>
                  `${e.ip} → ${e.mac} · eth${e.port} · caduca ${e.expires}s`,
              )
              .join("\n")
          : "Sin entradas ARP"}
      </pre>
      <h4>MAC · equipo seleccionado</h4>
      <pre aria-label="Tabla MAC">
        {mac.length
          ? mac
              .map(
                (e) =>
                  `VLAN ${e.vlan} · ${e.mac} → eth${e.port} · caduca ${e.expires}s`,
              )
              .join("\n")
          : "Sin entradas MAC"}
      </pre>
      <h4>PAT · equipo seleccionado</h4>
      <pre aria-label="Tabla PAT">
        {entries.length
          ? entries
              .map(
                (e) =>
                  `${e.flow} ${e.protocol} ${e.insideIp}:${e.insidePort} → ${e.outsideIp}:${e.outsidePort} → ${e.remoteIp}:${e.remotePort} · caduca ${e.expires}s`,
              )
              .join("\n")
          : "Sin traducciones PAT"}
      </pre>
      <p>
        Activa nat en la configuración de un router o firewall para traducir los
        flujos. UDP caduca a los 60 s y TCP a los 300 s de tiempo virtual. Es
        una simulación de flujos; no abre sockets físicos.
      </p>
    </details>
  );
}
