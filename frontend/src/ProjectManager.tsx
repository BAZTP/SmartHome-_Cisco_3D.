import { useEffect, useState, useRef } from "react";
import { demo } from "./network";
import {
  listProjects,
  createProject,
  renameProject,
  deleteProject,
  saveScene,
  loadScene,
  selectProject,
  getActiveProjectId,
  demoProjectId,
  type Project,
  type SceneSnapshot,
} from "./projectStorage";
const emptyScene = (): SceneSnapshot => ({
  version: 1,
  view: "Isométrica",
  walls: true,
  selected: "Sala",
  network: demo(),
});
export default function ProjectManager({
  snapshot,
  restore,
  busy,
  setBusy,
  onOpened,
}: {
  snapshot: () => SceneSnapshot;
  restore: (scene: SceneSnapshot) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onOpened: (project: Project) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]),
    [id, setId] = useState(getActiveProjectId()),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  const baseline = useRef<string | null>(null);
  if (baseline.current === null) baseline.current = JSON.stringify(snapshot());
  const saveChanges = async () => {
    const current = snapshot();
    if (JSON.stringify(current) !== baseline.current)
      await saveScene(current, id);
  };
  const refresh = async () => {
    const rows = await listProjects();
    setProjects(rows);
    return rows;
  };
  useEffect(() => {
    void refresh().catch((e) => setMessage(String(e)));
  }, []);
  const open = (project: Project, scene: SceneSnapshot) => {
    selectProject(project.id);
    setId(project.id);
    setName(project.name);
    restore(scene);
    baseline.current = JSON.stringify({
      ...scene,
      network: scene.network ?? demo(),
    });
    onOpened(project);
  };
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const change = (nextId: string) =>
    perform(async () => {
      const project = projects.find((p) => p.id === nextId);
      if (!project || nextId === id) return;
      await saveChanges();
      const scene = await loadScene(nextId);
      open(project, scene ?? emptyScene());
      setMessage("Proyecto abierto; cambios anteriores guardados");
    });
  return (
    <details className="project-manager">
      <summary>Mis proyectos</summary>
      <div className="project-manager-fields">
        <label>
          Proyecto activo
          <select
            aria-label="Proyecto activo"
            disabled={busy || !projects.length}
            value={id}
            onChange={(e) => void change(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre
          <input
            aria-label="Nombre del proyecto"
            value={name}
            maxLength={100}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la nueva casa"
          />
        </label>
        <button
          disabled={busy || !name.trim()}
          onClick={() =>
            void perform(async () => {
              await saveChanges();
              const project = await createProject(name);
              const scene = emptyScene();
              await saveScene(scene, project.id);
              await refresh();
              open(project, scene);
              setMessage("Proyecto creado");
            })
          }
        >
          Nuevo proyecto
        </button>
        <button
          disabled={busy || !name.trim()}
          onClick={() =>
            void perform(async () => {
              const project = await renameProject(id, name);
              await refresh();
              setName(project.name);
              onOpened(project);
              setMessage("Proyecto renombrado");
            })
          }
        >
          Renombrar proyecto
        </button>
        <button
          disabled={busy || id === demoProjectId}
          onClick={() => {
            if (
              !confirm(
                "Eliminar este proyecto y su escena guardada. Esta acción no se puede deshacer.",
              )
            )
              return;
            void perform(async () => {
              const scene = await loadScene(demoProjectId);
              await deleteProject(id);
              const rows = await refresh();
              open(
                rows.find((p) => p.id === demoProjectId)!,
                scene ?? emptyScene(),
              );
              setMessage("Proyecto eliminado");
            });
          }}
        >
          Eliminar proyecto
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              await refresh();
              setMessage("Lista actualizada");
            })
          }
        >
          Actualizar proyectos
        </button>
      </div>
      <p>
        Al cambiar o crear un proyecto, se guarda el actual. Exporta JSON para
        compartirlo o conservar una copia.
      </p>
      <p aria-live="polite" aria-label="Estado de proyectos">
        {message}
      </p>
    </details>
  );
}
