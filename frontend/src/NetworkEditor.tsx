import { browserEdition } from "./projectStorage";
import { useState, useEffect } from "react";
import { kinds, ports, ipv4, ping, useNetwork } from "./network";
const names = [
  "Sala",
  "Comedor",
  "Cocina",
  "Dormitorio principal",
  "Dormitorio secundario",
  "Oficina",
  "Garaje",
  "Jardín",
  "Telecomunicaciones",
];
export default function NetworkEditor() {
  const n = useNetwork();
  const d = n.devices.find((d) => d.id === n.selected);
  const [kind, K] = useState(kinds[3]),
    [dest, D] = useState(""),
    [ap, A] = useState(0),
    [bp, B] = useState(0),
    [target, T] = useState("192.168.1.102"),
    [output, O] = useState(""),
    [cmd, C] = useState(""),
    [mode, M] = useState("EXEC");
  useEffect(() => M("EXEC"), [n.selected]);
  async function simulate(ip: string) {
    if (!d) throw Error("Selecciona un dispositivo");
    if (browserEdition) return ping(n, d.id, ip);
    const r = await fetch("/api/simulation/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: { devices: n.devices, links: n.links },
        source: d.id,
        target: ip,
      }),
    });
    if (!r.ok) throw Error("Error del motor Java");
    return (await r.json()) as ReturnType<typeof ping>;
  }
  async function run() {
    try {
      const result = await simulate(target);
      useNetwork.setState({ trace: result.path });
      O(
        result.message +
          "\n" +
          result.path
            .map((id) => n.devices.find((d) => d.id === id)?.name)
            .join(" → "),
      );
    } catch (e) {
      O(String(e));
    }
  }
  async function cli() {
    if (!d) return;
    const text = cmd.trim();
    C("");
    let result = "Comando no soportado. Ayuda: ?";
    if (text === "?")
      result =
        "enable · disable · configure terminal · end · exit · hostname NOMBRE · shutdown · no shutdown · show interfaces · show running-config · ping IP";
    else if (text === "enable") {
      M("PRIVILEGIADO");
      result = "Modo privilegiado";
    } else if (text === "disable" || text === "end" || text === "exit") {
      M("EXEC");
      result = "Modo EXEC";
    } else if (text === "configure terminal" && mode === "PRIVILEGIADO") {
      M("CONFIG");
      result = "Configuración del dispositivo";
    } else if (text === "show interfaces" || text === "show running-config")
      result = `${d.name}\nIP ${d.ip}/${d.prefix}\nEstado ${d.on ? "up" : "down"}\nPuertos Ethernet: ${ports(d)}`;
    else if (
      text.startsWith("hostname ") &&
      mode === "CONFIG" &&
      text.slice(9).trim().length <= 60
    ) {
      n.update(d.id, { name: text.slice(9).trim() || d.name });
      result = "Hostname actualizado";
    } else if (
      mode === "CONFIG" &&
      ["shutdown", "no shutdown"].includes(text)
    ) {
      n.update(d.id, { on: text === "no shutdown" });
      result = "Estado actualizado (dispositivo completo)";
    } else if (text.startsWith("ping ")) {
      const r = await simulate(text.slice(5));
      useNetwork.setState({ trace: r.path });
      result = r.message;
    }
    O(`${d.name} (${mode})> ${text}\n${result}`);
  }
  return (
    <section className="network-editor">
      <h3>Laboratorio de red · LAN educativa</h3>
      <div className="network-columns">
        <div>
          <label>
            Catálogo
            <select value={kind} onChange={(e) => K(e.target.value)}>
              {kinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              try {
                n.add(kind, 0);
              } catch (e) {
                O(String(e));
              }
            }}
          >
            Agregar dispositivo
          </button>
          <label>
            Dispositivo
            <select
              aria-label="Dispositivo de red"
              value={d?.id ?? ""}
              onChange={(e) => {
                n.select(e.target.value);
                M("EXEC");
              }}
            >
              <option value="" disabled>
                Seleccionar
              </option>
              {n.devices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name.length > 25 ? v.kind : v.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            {n.devices.length} dispositivos · {n.links.length} enlaces Ethernet
          </p>
        </div>
        {d && (
          <>
            <div>
              <label>
                Nombre
                <input
                  aria-label="Nombre del dispositivo"
                  value={d.name}
                  maxLength={60}
                  onChange={(e) =>
                    n.update(d.id, { name: e.target.value || d.kind })
                  }
                />
              </label>
              <label>
                Habitación
                <select
                  value={d.room}
                  onChange={(e) =>
                    n.update(d.id, { room: Number(e.target.value) })
                  }
                >
                  {names.map((r, i) => (
                    <option key={r} value={i}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Posición X
                <input
                  type="range"
                  min="-1.8"
                  max="1.8"
                  step=".1"
                  value={d.x}
                  onChange={(e) =>
                    n.update(d.id, { x: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Posición Z
                <input
                  type="range"
                  min="-1.5"
                  max="1.5"
                  step=".1"
                  value={d.z}
                  onChange={(e) =>
                    n.update(d.id, { z: Number(e.target.value) })
                  }
                />
              </label>
              <button
                onClick={() =>
                  n.update(d.id, { rotation: d.rotation + Math.PI / 2 })
                }
              >
                Rotar 90°
              </button>
              <button onClick={() => n.remove(d.id)}>
                Eliminar dispositivo
              </button>
            </div>
            <div>
              <label>
                IPv4
                <input
                  key={d.id + d.ip}
                  defaultValue={d.ip}
                  onBlur={(e) => {
                    if (ipv4(e.target.value) !== null)
                      n.update(d.id, { ip: e.target.value });
                    else {
                      O("IPv4 inválida");
                      e.target.value = d.ip;
                    }
                  }}
                />
              </label>
              <label>
                Prefijo de subred
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={d.prefix}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    if (Number.isInteger(p) && p >= 1 && p <= 30)
                      n.update(d.id, { prefix: p });
                  }}
                />
              </label>
              <button onClick={() => n.update(d.id, { on: !d.on })}>
                {d.on ? "Apagar" : "Encender"} dispositivo
              </button>
              <label>
                Destino de conexión
                <select value={dest} onChange={(e) => D(e.target.value)}>
                  <option value="">Seleccionar</option>
                  {n.devices
                    .filter((v) => v.id !== d.id)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Puerto origen (0–{ports(d) - 1})
                <input
                  type="number"
                  min="0"
                  value={ap}
                  onChange={(e) => A(Number(e.target.value))}
                />
              </label>
              <label>
                Puerto destino
                <input
                  type="number"
                  min="0"
                  value={bp}
                  onChange={(e) => B(Number(e.target.value))}
                />
              </label>
              <button
                onClick={() => {
                  try {
                    n.connect(d.id, dest, ap, bp);
                    O("Enlace creado");
                  } catch (e) {
                    O(String(e));
                  }
                }}
              >
                Conectar Ethernet
              </button>
            </div>
            <div>
              <label>
                IP de destino
                <input
                  aria-label="Destino ping"
                  value={target}
                  onChange={(e) => T(e.target.value)}
                />
              </label>
              <button onClick={run}>Ejecutar ping</button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void cli().catch((e) => O(String(e)));
                }}
              >
                <label>
                  Consola · {mode}
                  <input
                    aria-label="Comando CLI"
                    value={cmd}
                    onChange={(e) => C(e.target.value)}
                    placeholder="? para ayuda"
                  />
                </label>
                <button>Enviar comando</button>
              </form>
              <pre aria-label="Resultado de simulación">
                {output ||
                  "El ping comprueba enlaces, energía y subred. No mide una red física."}
              </pre>
            </div>
          </>
        )}
      </div>
      <div className="link-list">
        {n.links.map((l) => (
          <button
            key={l.id}
            onClick={() => n.disconnect(l.id)}
            aria-label={"Desconectar " + l.id}
          >
            {n.devices.find((d) => d.id === l.a)?.name} [{l.ap}] ↔{" "}
            {n.devices.find((d) => d.id === l.b)?.name} [{l.bp}] ×
          </button>
        ))}
      </div>
      <p>
        Alcance actual: una LAN IPv4, Ethernet y switches. VLAN, DHCP,
        enrutamiento, NAT y firewall aún no se simulan.
      </p>
    </section>
  );
}
