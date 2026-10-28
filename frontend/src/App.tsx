import { useModels, emptyModels, modelSnapshot } from "./models";
import ProjectManager from "./ProjectManager";
import Topology from "./Topology";
import NetworkEditor from "./NetworkEditor";
import { useNetwork, demo, kinds } from "./network";
import { useEffect, useState } from "react";
import {
  Network,
  Box,
  Layers,
  Eye,
  EyeOff,
  Rotate3D,
  ChevronRight,
  Server,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { layout } from "./Architecture";
import House, { rooms } from "./House";
import { useScene, type View } from "./store";
import SceneBoundary from "./SceneBoundary";
import {
  browserEdition,
  getActiveProjectId,
  saveScene,
  loadScene,
  validateScene,
  type SceneSnapshot,
} from "./projectStorage";
const staticDemo = browserEdition;
function App() {
  const network = useNetwork();
  const { view, setView, walls, toggleWalls, selected, select } = useScene();
  const [left, L] = useState(true),
    [right, R] = useState(true);
  const [operation, setOperation] = useState("");
  const [busy, setBusy] = useState(false);
  const snapshot = (): SceneSnapshot => ({
    version: 1,
    models: modelSnapshot(network.devices.map((d) => d.id)),
    view,
    walls,
    selected,
    network: { devices: network.devices, links: network.links },
  });
  const restore = (scene: SceneSnapshot) => {
    network.setNetwork(scene.network ?? demo());
    useModels.getState().restore(scene.models ?? emptyModels());
    useScene.setState({
      view: scene.view,
      walls: scene.walls,
      selected: scene.selected,
    });
  };
  async function save() {
    setBusy(true);
    try {
      await saveScene(snapshot());
      setOperation(
        staticDemo ? "Guardado en este navegador" : "Guardado en PostgreSQL",
      );
    } catch (e) {
      setOperation(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    setBusy(true);
    try {
      const scene = await loadScene();
      if (scene) {
        restore(scene);
        setOperation("Proyecto cargado");
      } else setOperation("No hay una escena guardada");
    } catch (e) {
      setOperation(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setBusy(false);
    }
  }
  function exportProject() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot(), null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "smarthome-project.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw Error("El archivo supera 10 MiB");
      restore(validateScene(JSON.parse(await file.text())));
      setOperation("Proyecto importado; pulsa Guardar para conservarlo");
    } catch {
      setOperation("Archivo de proyecto inválido o incompatible");
    }
  }
  const [status, S] = useState("Conectando…");
  const [project, P] = useState("Casa de demostración");
  async function connect() {
    if (staticDemo) {
      S("Versión Pages · Almacenamiento en este navegador");
      return;
    }
    S("Conectando…");
    try {
      const r = await fetch("/api/projects");
      if (!r.ok) throw Error("HTTP " + r.status);
      const data = await r.json();
      if (!data[0]?.name) throw Error("Sin proyecto inicial");
      P(
        data.find((p: { id: string }) => p.id === getActiveProjectId())?.name ??
          "Casa de demostración",
      );
      S("API y PostgreSQL conectados");
    } catch {
      S("Backend sin conexión");
    }
  }
  useEffect(() => {
    void connect();
  }, []);
  return (
    <div className="app">
      <header>
        <div className="brand">
          <Network color="#35d5e7" />
          <div>
            SmartHome <b>CISCO 3D</b>
            <small>INTERACTIVE NETWORK SIMULATOR</small>
          </div>
        </div>
        <nav>
          <button
            className="active"
            onClick={() => document.getElementById("design")?.scrollIntoView()}
          >
            Diseño
          </button>
          <button
            onClick={() =>
              document.getElementById("laboratory")?.scrollIntoView()
            }
          >
            Simulación / CLI
          </button>
          <button
            onClick={() =>
              document.getElementById("monitoring")?.scrollIntoView()
            }
          >
            Monitoreo
          </button>
          <span>
            {staticDemo
              ? "Versión navegador"
              : "Versión local · Java + PostgreSQL"}
          </span>
        </nav>
        <div className="phase">ENTORNO EDUCATIVO</div>
      </header>
      <div className="projectbar">
        <div>
          <span className="dot" /> WORKSPACE <ChevronRight size={14} />{" "}
          <strong>{project}</strong>
        </div>
        <div className="project-actions">
          <button disabled={busy} onClick={() => void save()}>
            Guardar proyecto
          </button>
          <button disabled={busy} onClick={() => void load()}>
            Cargar proyecto
          </button>
          <button disabled={busy} onClick={exportProject}>
            Exportar JSON
          </button>
          <label className="import-button">
            Importar JSON
            <input
              aria-label="Importar proyecto"
              disabled={busy}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void importProject(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <ProjectManager
        snapshot={snapshot}
        restore={restore}
        busy={busy}
        setBusy={setBusy}
        onOpened={(p) => P(p.name)}
      />
      <main id="design" inert={busy}>
        {left && (
          <aside className="left">
            <div className="paneltitle catalog">CATÁLOGO · LABORATORIO</div>
            {kinds.map((kind) => (
              <button
                key={kind}
                className="catalog-device"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/x-smarthome-device",
                    kind,
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => {
                  try {
                    network.add(
                      kind,
                      Math.max(0, rooms.indexOf(selected ?? "Sala")),
                    );
                  } catch (e) {
                    setOperation(String(e));
                  }
                }}
                title="Agregar o arrastrar hacia la casa"
              >
                <Server size={16} />
                {kind}
              </button>
            ))}
            <div className="paneltitle">
              EXPLORADOR DE CASA <Layers size={15} />
            </div>
            <p className="muted">
              Selecciona una habitación para inspeccionarla.
            </p>
            {rooms.map((r, i) => (
              <button
                className={"room " + (selected === r ? "chosen" : "")}
                key={r}
                onClick={() => select(r)}
              >
                <Box size={16} />
                <span>{r}</span>
                <small>{String(i + 1).padStart(2, "0")}</small>
              </button>
            ))}
          </aside>
        )}
        <section className="viewport">
          <div className="sceneheading">
            <span>
              <span className="dot" /> ESCENA 3D EN VIVO
            </span>
            <small>01 / CASA MODERNA</small>
          </div>
          <SceneBoundary>
            <House />
          </SceneBoundary>
          <div className="toolbar">
            <button
              aria-label="Alternar panel izquierdo"
              onClick={() => L(!left)}
            >
              <PanelLeftClose size={17} />
            </button>
            {(["Isométrica", "Superior", "Interior"] as View[]).map((v) => (
              <button
                className={view === v ? "selected" : ""}
                key={v}
                onClick={() => setView(v)}
              >
                {v === "Isométrica" && <Rotate3D size={16} />} {v}
              </button>
            ))}
            <button onClick={toggleWalls}>
              {walls ? <EyeOff size={16} /> : <Eye size={16} />}{" "}
              {walls ? "Ocultar paredes" : "Mostrar paredes"}
            </button>
            <button
              aria-label="Alternar panel derecho"
              onClick={() => R(!right)}
            >
              <PanelRightClose size={17} />
            </button>
          </div>
          <div className="scenefooter">
            <span>
              ARRASTRAR · Orbitar &nbsp; / &nbsp; RUEDA · Zoom &nbsp; / &nbsp;
              CLIC DERECHO · Desplazar
            </span>
            <span>WEBGL · 3D</span>
          </div>
        </section>
        {right && (
          <aside className="right">
            <div className="paneltitle">TOPOLOGÍA DE RED</div>
            <Topology compact />
            <div className="house-map">
              <div className="paneltitle">PLANO DE LA CASA</div>
              <p className="muted">Selecciona una zona para inspeccionarla</p>
              <svg
                viewBox="0 0 220 185"
                role="img"
                aria-label="Plano interactivo de habitaciones"
              >
                {rooms.map((name, i) => {
                  const [x, z] = layout[i];
                  return (
                    <g
                      key={name}
                      role="button"
                      tabIndex={0}
                      aria-label={"Seleccionar " + name}
                      onClick={() => select(name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          select(name);
                        }
                      }}
                    >
                      <rect
                        x={78 + x * 16}
                        y={64 + z * 14}
                        width="60"
                        height="47"
                        rx="3"
                        fill={selected === name ? "#12536a" : "#102737"}
                        stroke={selected === name ? "#3ad8e5" : "#285066"}
                      />
                      <text
                        x={108 + x * 16}
                        y={90 + z * 14}
                        textAnchor="middle"
                        fill="#bad5df"
                        fontSize="7"
                      >
                        {
                          [
                            "Sala",
                            "Comedor",
                            "Cocina",
                            "Dorm. principal",
                            "Dorm. 2",
                            "Oficina",
                            "Garaje",
                            "Jardín",
                            "Sala técnica",
                          ][i]
                        }
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="paneltitle">
              INSPECTOR <Box size={16} />
            </div>
            <div className="inspectoricon">
              <Box size={34} />
            </div>
            <h2>{selected ?? "Explora tu espacio"}</h2>
            <p className="muted">
              {selected
                ? "Habitación seleccionada en el modelo tridimensional."
                : "Selecciona una habitación en la escena o en el explorador."}
            </p>
            <dl>
              <dt>Vista de cámara</dt>
              <dd>{view}</dd>
              <dt>Paredes</dt>
              <dd>{walls ? "Visibles" : "Ocultas"}</dd>
              <dt>Habitaciones</dt>
              <dd>9</dd>
              <dt>Dispositivos de red</dt>
              <dd>{network.devices.length}</dd>
            </dl>
            <div className="notice">
              <strong>Estado de dispositivos</strong>
              <p>
                Selecciona un equipo para editar sus interfaces y conexiones.
              </p>
            </div>
            <div className="device-status-list">
              {network.devices.map((d) => (
                <button
                  key={d.id}
                  className={network.selected === d.id ? "chosen" : ""}
                  onClick={() => network.select(d.id)}
                >
                  <span style={{ color: d.on ? "#3bdca6" : "#fa647c" }}>●</span>{" "}
                  {d.name.length > 20 ? d.kind : d.name}
                  <small>{d.ip}</small>
                </button>
              ))}
            </div>
            <button
              className="retry"
              disabled={staticDemo}
              onClick={() => void connect()}
            >
              {staticDemo ? "GitHub Pages · Sin servidor" : "Comprobar backend"}
            </button>
            <p
              role="status"
              className={status.includes("conectados") ? "ok" : "muted"}
            >
              {status}
            </p>
          </aside>
        )}
      </main>
      <div inert={busy}>
        <NetworkEditor key={getActiveProjectId()} />
      </div>
      <footer>
        <span>
          <span className="dot" /> Motor gráfico activo
        </span>
        <span aria-live="polite" aria-label="Estado del proyecto">
          {operation || "LAN IPv4 virtual · Sin conexión a la red física"}
        </span>
        <span>v0.2.0 / LABORATORIO</span>
      </footer>
    </div>
  );
}

export default App;
