import NetworkEditor from "./NetworkEditor";
import { useNetwork, demo } from "./network";
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
  Monitor,
  Shield,
  Radio,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { layout } from "./Architecture";
import House, { rooms } from "./House";
import { useScene, type View } from "./store";
import SceneBoundary from "./SceneBoundary";
import {
  browserEdition,
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
    view,
    walls,
    selected,
    network: { devices: network.devices, links: network.links },
  });
  const restore = (scene: SceneSnapshot) => {
    network.setNetwork(scene.network ?? demo());
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
      if (file.size > 262144) throw Error("El archivo supera 256 KB");
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
      P(data[0].name);
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
          <span className="active">Diseño</span>
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
          <button onClick={exportProject}>Exportar JSON</button>
          <label className="import-button">
            Importar JSON
            <input
              aria-label="Importar proyecto"
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
      <main>
        {left && (
          <aside className="left">
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
            <div className="paneltitle catalog">CATÁLOGO · LABORATORIO</div>
            {[
              [Server, "Infraestructura"],
              [Monitor, "Dispositivos finales"],
              [Shield, "Seguridad"],
              [Radio, "IoT"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Server;
              return (
                <div className="future" key={String(label)}>
                  <I size={17} />
                  {String(label)}
                  <small>Panel inferior</small>
                </div>
              );
            })}
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
              <strong>Construyendo la base</strong>
              <p>
                Se guardan habitaciones seleccionadas, vista, dispositivos,
                posiciones y enlaces. Usa el laboratorio inferior para editar la
                LAN.
              </p>
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
      <NetworkEditor />
      <footer>
        <span>
          <span className="dot" /> Motor gráfico activo
        </span>
        <span aria-live="polite" aria-label="Estado del proyecto">
          {operation || "LAN IPv4 virtual · Sin conexión a la red física"}
        </span>
        <span>v0.1.0 / FASE 1</span>
      </footer>
    </div>
  );
}

export default App;
