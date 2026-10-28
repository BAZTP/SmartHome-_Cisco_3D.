import { useEffect, useRef, useState } from "react";
import { useNetwork, ipv4 } from "./network";
import { browserEdition, getActiveProjectId } from "./projectStorage";
import { runtime } from "./runtime";
export default function SimulationControls() {
  const n = useNetwork(),
    [running, R] = useState(false),
    [target, T] = useState("192.168.1.102"),
    [message, M] = useState("Pausada"),
    [count, C] = useState(0),
    [busy, B] = useState(false);
  const session = useRef<{ source: string; target: string } | null>(null),
    cancelled = useRef(false),
    inFlight = useRef(false);
  const projectId = getActiveProjectId(),
    path = `/api/projects/${projectId}/simulation`;
  async function request(action: string, body?: unknown) {
    const r = await fetch(path + "/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok)
      throw Error("No se pudo " + action + " la simulación (" + r.status + ")");
    return r.json();
  }
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      if (session.current && !browserEdition)
        void request("pause").catch(() => {});
    };
  }, []);
  async function toggle() {
    B(true);
    try {
      if (running) {
        if (!browserEdition) await request("pause");
        session.current = null;
        R(false);
        M("Pausada");
      } else {
        if (!n.selected || ipv4(target) === null)
          throw Error("Selecciona origen e IPv4 de destino válidos");
        if (!browserEdition)
          await request("start", {
            network: { devices: n.devices, links: n.links },
            source: n.selected,
            target,
          });
        if (cancelled.current) return;
        session.current = { source: n.selected, target };
        C(0);
        R(true);
        M("En ejecución · un ping por segundo virtual");
      }
    } catch (e) {
      M(String(e));
    } finally {
      B(false);
    }
  }
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      if (inFlight.current || !session.current) return;
      inFlight.current = true;
      try {
        const state = useNetwork.getState(),
          network = { devices: state.devices, links: state.links };
        let result;
        if (browserEdition) {
          runtime(network, projectId, { action: "advance", seconds: 1 });
          result = runtime(network, projectId, {
            action: "probe",
            ...session.current,
          }).result!;
        } else {
          const r = await request("step", { network });
          result = r.result;
          if (!r.state.running) {
            R(false);
            session.current = null;
          }
        }
        if (cancelled.current) return;
        state.record(result);
        C((c) => c + 1);
        M(result.message);
      } catch (e) {
        if (!cancelled.current) {
          R(false);
          M(String(e));
        }
      } finally {
        inFlight.current = false;
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [running, projectId]);
  useEffect(() => {
    if (count >= 300 && running) void toggle();
  }, [count]);
  return (
    <div className="simulation-controls">
      <span>
        Origen:{" "}
        {n.devices.find((d) => d.id === (session.current?.source ?? n.selected))
          ?.name ?? "Selecciona un equipo"}
      </span>
      <label>
        Destino de simulación
        <input
          aria-label="Destino de simulación continua"
          value={target}
          disabled={running}
          onChange={(e) => T(e.target.value)}
        />
      </label>
      <button disabled={busy} onClick={() => void toggle()}>
        {running ? "Pausar simulación" : "Ejecutar simulación"}
      </button>
      <span aria-live="polite" aria-label="Estado de simulación continua">
        {message} · {count} ciclos
      </span>
    </div>
  );
}
