import { useState } from "react";
import { useNetwork, type Device } from "./network";
import {
  configuration,
  validateConfig,
  type Config,
  type Rule,
} from "./advanced";
export default function ServicesEditor({ device }: { device: Device }) {
  const c = configuration(device),
    update = useNetwork((s) => s.update);
  const [gateway, G] = useState(c.gateway),
    [network, N] = useState("0.0.0.0"),
    [prefix, P] = useState(0),
    [next, H] = useState("192.168.1.1"),
    [source, S] = useState("*"),
    [destination, D] = useState("*"),
    [action, A] = useState<Rule["action"]>("deny"),
    [start, START] = useState(c.dhcp?.start ?? "192.168.1.150"),
    [end, END] = useState(c.dhcp?.end ?? "192.168.1.180"),
    [poolGateway, PG] = useState(c.dhcp?.gateway ?? "192.168.1.1"),
    [poolPrefix, PP] = useState(c.dhcp?.prefix ?? 24),
    [message, M] = useState("");
  function apply(patch: Partial<Config>) {
    try {
      const next = { ...c, ...patch };
      validateConfig(next, device);
      update(device.id, { config: next });
      M("Servicios de red actualizados");
    } catch (e) {
      M(String(e));
    }
  }
  return (
    <div className="services-editor">
      <details>
        <summary>Gateway y rutas estáticas</summary>
        <div className="interface-form">
          <label>
            Gateway predeterminado
            <input
              aria-label="Gateway predeterminado"
              value={gateway}
              onChange={(e) => G(e.target.value)}
            />
          </label>
          <button onClick={() => apply({ gateway })}>Aplicar gateway</button>
        </div>
        <table aria-label="Rutas estáticas">
          <thead>
            <tr>
              <th>Red</th>
              <th>Siguiente salto</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {c.routes.map((r, i) => (
              <tr key={i}>
                <td>
                  {r.network}/{r.prefix}
                </td>
                <td>{r.gateway}</td>
                <td>
                  <button
                    aria-label={"Eliminar ruta " + (i + 1)}
                    onClick={() =>
                      apply({ routes: c.routes.filter((_, j) => j !== i) })
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="interface-form">
          <label>
            Red de ruta
            <input
              aria-label="Red de ruta"
              value={network}
              onChange={(e) => N(e.target.value)}
            />
          </label>
          <label>
            Prefijo de ruta
            <input
              aria-label="Prefijo de ruta"
              type="number"
              min={0}
              max={30}
              value={prefix}
              onChange={(e) => P(Number(e.target.value))}
            />
          </label>
          <label>
            Siguiente salto
            <input
              aria-label="Siguiente salto de ruta"
              value={next}
              onChange={(e) => H(e.target.value)}
            />
          </label>
          <button
            onClick={() =>
              apply({
                routes: [...c.routes, { network, prefix, gateway: next }],
              })
            }
          >
            Agregar ruta
          </button>
        </div>
      </details>
      <details>
        <summary>Reglas de firewall</summary>
        <p>
          Se evalúan de arriba abajo. La primera coincidencia decide. Sin
          coincidencia, se permite.
        </p>
        <table aria-label="Reglas de firewall">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Acción</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Editar</th>
            </tr>
          </thead>
          <tbody>
            {c.firewall.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{r.action}</td>
                <td>{r.source}</td>
                <td>{r.destination}</td>
                <td>
                  <button
                    aria-label={"Subir regla " + (i + 1)}
                    disabled={!i}
                    onClick={() => {
                      const rules = [...c.firewall];
                      [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]];
                      apply({ firewall: rules });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={"Eliminar regla " + (i + 1)}
                    onClick={() =>
                      apply({ firewall: c.firewall.filter((_, j) => i !== j) })
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="interface-form">
          <label>
            Acción
            <select
              aria-label="Acción de firewall"
              value={action}
              onChange={(e) => A(e.target.value as Rule["action"])}
            >
              <option value="deny">Bloquear</option>
              <option value="permit">Permitir</option>
            </select>
          </label>
          <label>
            Origen de regla
            <input
              aria-label="Origen de regla"
              value={source}
              onChange={(e) => S(e.target.value)}
            />
          </label>
          <label>
            Destino de regla
            <input
              aria-label="Destino de regla"
              value={destination}
              onChange={(e) => D(e.target.value)}
            />
          </label>
          <button
            onClick={() =>
              apply({
                firewall: [...c.firewall, { action, source, destination }],
              })
            }
          >
            Agregar regla
          </button>
        </div>
      </details>
      <details>
        <summary>Servidor DHCP</summary>
        <p>
          {c.dhcp
            ? `Pool activo: ${c.dhcp.start}–${c.dhcp.end}/${c.dhcp.prefix}`
            : "Servidor DHCP desactivado"}
        </p>
        <div className="interface-form">
          <label>
            Inicio del pool
            <input
              aria-label="Inicio DHCP"
              value={start}
              onChange={(e) => START(e.target.value)}
            />
          </label>
          <label>
            Fin del pool
            <input
              aria-label="Fin DHCP"
              value={end}
              onChange={(e) => END(e.target.value)}
            />
          </label>
          <label>
            Gateway DHCP
            <input
              aria-label="Gateway DHCP"
              value={poolGateway}
              onChange={(e) => PG(e.target.value)}
            />
          </label>
          <label>
            Prefijo DHCP
            <input
              aria-label="Prefijo DHCP"
              type="number"
              min={1}
              max={30}
              value={poolPrefix}
              onChange={(e) => PP(Number(e.target.value))}
            />
          </label>
          <button
            onClick={() =>
              apply({
                dhcp: { start, end, gateway: poolGateway, prefix: poolPrefix },
              })
            }
          >
            Activar pool DHCP
          </button>
          <button disabled={!c.dhcp} onClick={() => apply({ dhcp: null })}>
            Desactivar pool DHCP
          </button>
        </div>
      </details>
      <p aria-label="Estado de servicios" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
