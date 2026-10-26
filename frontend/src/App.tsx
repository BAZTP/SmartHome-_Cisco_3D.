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
import House, { rooms } from "./House";
import { useScene, type View } from "./store";
import SceneBoundary from "./SceneBoundary";
const staticDemo = import.meta.env.VITE_STATIC_DEMO === "true";
function App() {
  const { view, setView, walls, toggleWalls, selected, select } = useScene();
  const [left, L] = useState(true),
    [right, R] = useState(true);
  const [status, S] = useState("Conectando…");
  const [project, P] = useState("Casa de demostración");
  async function connect() {
    if (staticDemo) {
      S("Demo estática · Sin backend ni persistencia");
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
          <span>Fase 1 · Base funcional</span>
        </nav>
        <div className="phase">ENTORNO EDUCATIVO</div>
      </header>
      <div className="projectbar">
        <div>
          <span className="dot" /> WORKSPACE <ChevronRight size={14} />{" "}
          <strong>{project}</strong>
        </div>
        <span>Geometría local · Sin recursos externos</span>
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
            <div className="paneltitle catalog">CATÁLOGO · FASE 2</div>
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
                  <small>Próximamente</small>
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
              <dd>0 · Fase 2</dd>
            </dl>
            <div className="notice">
              <strong>Construyendo la base</strong>
              <p>
                La edición de dispositivos, el cableado y la simulación se
                incorporarán en las siguientes fases.
              </p>
            </div>
            <button
              className="retry"
              disabled={staticDemo}
              onClick={() => void connect()}
            >
              {staticDemo ? "Demo GitHub Pages" : "Comprobar backend"}
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
      <footer>
        <span>
          <span className="dot" /> Motor gráfico activo
        </span>
        <span>Simulación de red pendiente · Fase 4</span>
        <span>v0.1.0 / FASE 1</span>
      </footer>
    </div>
  );
}

export default App;
