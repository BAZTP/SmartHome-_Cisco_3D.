import { browserEdition } from "./projectStorage";
import { useEffect, useState } from "react";
import {
  configuration,
  validateConfig,
  dhcpLease,
  type Config,
} from "./advanced";
import { useNetwork } from "./network";
export default function AdvancedPanel() {
  const n = useNetwork(),
    d = n.devices.find((v) => v.id === n.selected);
  const [port, P] = useState(0);
  const [json, J] = useState(""),
    [error, E] = useState("");
  useEffect(() => {
    J(d ? JSON.stringify(configuration(d), null, 2) : "");
  }, [d]);
  useEffect(() => {
    E("");
    P(0);
  }, [d?.id]);
  const c = d ? configuration(d) : null,
    index = Math.min(port, (c?.interfaces.length ?? 1) - 1),
    iface = c?.interfaces[index];
  function changePort(p: Partial<NonNullable<typeof iface>>) {
    if (!d || !c) return;
    const copy = structuredClone(c);
    copy.interfaces[index] = { ...copy.interfaces[index], ...p };
    try {
      validateConfig(copy, d);
      n.update(d.id, {
        config: copy,
        ...(index === 0 && p.ip ? { ip: p.ip } : {}),
        ...(index === 0 && p.prefix ? { prefix: p.prefix } : {}),
      });
      E("Interfaz actualizada");
    } catch (e) {
      E(String(e));
    }
  }
  return (
    <details className="advanced">
      <summary>Interfaces, VLAN, gateway, rutas, DHCP y firewall</summary>
      {d && (
        <>
          <p>
            Configura cada interfaz de forma independiente. Firewall: primera
            regla coincidente; “*” representa cualquier IP. Los puertos trunk
            transportan las VLAN sin traducirlas.
          </p>
          {iface && c && (
            <div className="interface-form">
              <label>
                Interfaz
                <select
                  aria-label="Interfaz de configuración"
                  value={index}
                  onChange={(e) => P(Number(e.target.value))}
                >
                  {c.interfaces.map((_, i) => (
                    <option key={i} value={i}>
                      eth{i}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={iface.enabled}
                  onChange={(e) => changePort({ enabled: e.target.checked })}
                />{" "}
                Interfaz activa
              </label>
              <label>
                Modo
                <select
                  value={iface.mode}
                  onChange={(e) =>
                    changePort({ mode: e.target.value as "access" | "trunk" })
                  }
                >
                  <option>access</option>
                  <option>trunk</option>
                </select>
              </label>
              <label>
                VLAN
                <input
                  aria-label="VLAN de interfaz"
                  type="number"
                  min="1"
                  max="4094"
                  value={iface.vlan}
                  onChange={(e) => changePort({ vlan: Number(e.target.value) })}
                />
              </label>
              <label>
                Descripción
                <input
                  value={iface.description}
                  maxLength={100}
                  onChange={(e) => changePort({ description: e.target.value })}
                />
              </label>
              <label>
                IP de interfaz
                <input
                  key={d.id + index + iface.ip}
                  defaultValue={iface.ip}
                  onBlur={(e) => changePort({ ip: e.target.value })}
                />
              </label>
            </div>
          )}
          {c &&
            (d.kind.startsWith("Router") || d.kind.startsWith("Firewall")) && (
              <label>
                <input
                  type="checkbox"
                  aria-label="NAT/PAT de salida"
                  checked={c.nat}
                  onChange={(e) =>
                    n.update(d.id, { config: { ...c, nat: e.target.checked } })
                  }
                />{" "}
                NAT/PAT de salida (simulado)
              </label>
            )}
          <textarea
            aria-label="Configuración de red"
            rows={14}
            value={json}
            onChange={(e) => J(e.target.value)}
          />
          <button
            onClick={() => {
              try {
                const c = JSON.parse(json) as Config;
                validateConfig(c, d);
                n.update(d.id, {
                  config: c,
                  ip: c.interfaces[0].ip || d.ip,
                  prefix: c.interfaces[0].prefix,
                });
                E("Configuración aplicada");
              } catch (e) {
                E(String(e));
              }
            }}
          >
            Aplicar configuración
          </button>
          <button
            onClick={async () => {
              try {
                let lease;
                if (browserEdition) lease = dhcpLease(n, d.id);
                else {
                  const response = await fetch("/api/simulation/dhcp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      network: { devices: n.devices, links: n.links },
                      source: d.id,
                    }),
                  });
                  if (!response.ok)
                    throw Error("Sin servidor DHCP alcanzable o pool agotado");
                  lease = await response.json();
                }
                n.update(d.id, lease);
                E("Dirección DHCP asignada");
              } catch (e) {
                E(String(e));
              }
            }}
          >
            Solicitar DHCP
          </button>
          <p role="alert">{error}</p>
        </>
      )}
    </details>
  );
}
