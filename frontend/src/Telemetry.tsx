import Topology from "./Topology";
import { browserEdition } from "./projectStorage";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useNetwork, ping } from "./network";
import { configuration } from "./advanced";
export default function Telemetry() {
  const [live, L] = useState("Conectando"),
    [remote, RM] = useState<
      { time: string; ok: boolean; message: string; bytes: number }[]
    >([]);
  useEffect(() => {
    if (browserEdition) return;
    let ws: WebSocket | undefined,
      timer: ReturnType<typeof setTimeout>,
      closed = false;
    const connect = () => {
      ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/events`,
      );
      ws.onopen = () => L("WebSocket conectado");
      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          RM((v) => [...v.slice(-99), event]);
        } catch {
          L("Evento inválido");
        }
      };
      ws.onclose = () => {
        L("Reconectando WebSocket");
        if (!closed) timer = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, []);
  const n = useNetwork(),
    d = n.devices.find((v) => v.id === n.selected);
  useEffect(() => {
    if (!n.playing) return;
    const timer = setInterval(() => {
      const s = useNetwork.getState();
      if (s.step >= s.trace.length - 1) useNetwork.setState({ playing: false });
      else useNetwork.setState({ step: s.step + 1 });
    }, 800);
    return () => clearInterval(timer);
  }, [n.playing]);
  const connectivity = () => {
    if (!d) return false;
    const router = n.devices.find((v) => v.kind.startsWith("Router"));
    return !!router && ping(n, d.id, router.ip).ok;
  };
  function exportEvents() {
    const rows = [
      ["fecha", "resultado", "bytes_virtuales", "mensaje"],
      ...n.events.map((e) => [
        e.time,
        e.ok ? "éxito" : "fallo",
        String(e.bytes),
        e.message,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "simulacion-eventos.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <details className="advanced" id="monitoring" open>
      <summary>Topología, paquetes y monitoreo virtual</summary>
      <button onClick={exportEvents}>Exportar eventos CSV</button>
      <p>{browserEdition ? "Eventos calculados en el navegador" : live}</p>
      <p>
        {n.devices.filter((d) => d.on).length} activos ·{" "}
        {
          n.devices
            .flatMap((d) => configuration(d).interfaces)
            .filter((p) => !p.enabled).length
        }{" "}
        interfaces desactivadas · {n.events.reduce((s, e) => s + e.bytes, 0)}{" "}
        bytes virtuales
      </p>
      <Topology />
      <button
        disabled={!n.trace.length}
        onClick={() => useNetwork.setState({ playing: !n.playing })}
      >
        {n.playing ? "Pausar paquete" : "Reproducir paquete"}
      </button>
      <button
        disabled={!n.trace.length}
        onClick={() =>
          useNetwork.setState({
            playing: false,
            step: Math.min(n.trace.length - 1, n.step + 1),
          })
        }
      >
        Siguiente salto
      </button>
      <button onClick={() => useNetwork.setState({ step: 0, playing: false })}>
        Reiniciar recorrido
      </button>
      <p>
        Salto {n.trace.length ? n.step + 1 : 0}/{n.trace.length}:{" "}
        {n.devices.find((v) => v.id === n.trace[n.step])?.name ??
          "Ejecuta ping para obtener un recorrido"}
      </p>
      <div style={{ height: 140 }}>
        <ResponsiveContainer>
          <LineChart
            data={(browserEdition ? n.events : remote).map((e, i) => ({
              evento: i + 1,
              subida: e.bytes / 2,
              bajada: e.bytes / 2,
            }))}
          >
            <XAxis dataKey="evento" />
            <YAxis />
            <Tooltip />
            <Line dataKey="subida" stroke="#41dcab" isAnimationActive={false} />
            <Line dataKey="bajada" stroke="#55b7ff" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul>
        {n.events.slice(-5).map((e, i) => (
          <li key={i}>
            {e.ok ? "✓" : "⚠"} {e.message}
          </li>
        ))}
      </ul>
      {d?.kind === "Cámara IP" && (
        <>
          <button
            onClick={() => {
              if (connectivity()) {
                useNetwork.setState({ cameraId: d.id });
              } else
                n.record({
                  ok: false,
                  message: "Cámara sin conectividad",
                  path: [],
                });
            }}
          >
            Vista de cámara virtual
          </button>
          <button
            onClick={() =>
              n.record({
                ok: connectivity(),
                message: connectivity()
                  ? "Movimiento virtual generado en " + d.name
                  : "Cámara sin conectividad",
                path: [],
              })
            }
          >
            Simular movimiento
          </button>
        </>
      )}
      {n.cameraId && (
        <button onClick={() => useNetwork.setState({ cameraId: null })}>
          Salir de cámara
        </button>
      )}
      {d?.kind === "Bombilla IoT" && (
        <button
          onClick={() => {
            if (connectivity())
              n.update(d.id, {
                config: { ...configuration(d), light: !configuration(d).light },
              });
            else
              n.record({
                ok: false,
                message: "Bombilla sin conectividad",
                path: [],
              });
          }}
        >
          Alternar bombilla virtual
        </button>
      )}
    </details>
  );
}
