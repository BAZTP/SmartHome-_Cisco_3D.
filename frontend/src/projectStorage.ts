import { validateDesign, type Design } from "./design";
import { validateModels, type ModelLibrary } from "./models";
import { validateNetwork, type Network } from "./network";
import type { View } from "./store";
export type SceneSnapshot = {
  version: 1;
  design?: Design;
  models?: ModelLibrary;
  network?: Network;
  view: View;
  walls: boolean;
  selected: string | null;
};
export const browserEdition =
  import.meta.env.VITE_APP_MODE === "pages" ||
  import.meta.env.VITE_STATIC_DEMO === "true";
export const demoProjectId = "00000000-0000-0000-0000-000000000001";
export type Project = { id: string; name: string };
let activeProjectId: string =
  import.meta.hot?.data.activeProjectId ?? demoProjectId;
// Fast Refresh preserves component state; preserve its project target as well.
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.activeProjectId = activeProjectId;
  });
export const getActiveProjectId = () => activeProjectId;
export const selectProject = (id: string) => {
  activeProjectId = id;
};
const sceneUrl = (id: string) =>
  `/api/projects/${encodeURIComponent(id)}/scene`;
const validName = (value: string) => {
  const name = value.trim();
  if (!name || name.length > 100)
    throw Error("El nombre debe tener entre 1 y 100 caracteres");
  return name;
};
export function validateScene(value: unknown): SceneSnapshot {
  if (!value || typeof value !== "object")
    throw Error("Archivo de proyecto inválido");
  const s = value as Record<string, unknown>;
  if (
    s.version !== 1 ||
    typeof s.view !== "string" ||
    !["Isométrica", "Superior", "Interior"].includes(s.view) ||
    typeof s.walls !== "boolean" ||
    !(
      s.selected === null ||
      (typeof s.selected === "string" && s.selected.length <= 100)
    )
  )
    throw Error("Formato de escena incompatible");
  return {
    version: 1,
    ...(s.design
      ? { design: validateDesign(s.design, s.network as Network | undefined) }
      : {}),
    ...(s.models
      ? {
          models: validateModels(
            s.models,
            (s.network as Network)?.devices?.map((d) => d.id) ?? [],
          ),
        }
      : {}),
    ...(s.network ? { network: validateNetwork(s.network) } : {}),
    view: s.view as View,
    walls: s.walls,
    selected: s.selected as string | null,
  };
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("smarthome-cisco-3d", 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects"))
        db.createObjectStore("projects");
      if (!db.objectStoreNames.contains("metadata"))
        db.createObjectStore("metadata", { keyPath: "id" }).put({
          id: demoProjectId,
          name: "Casa de demostración",
        });
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(Error("No se pudo abrir el almacenamiento del navegador"));
    request.onblocked = () => {
      blocked = true;
      reject(Error("Cierra otras pestañas de SmartHome e inténtalo otra vez"));
    };
  });
}
const requested = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
async function browserOperation<T>(
  write: boolean,
  action: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(
      ["metadata", "projects"],
      write ? "readwrite" : "readonly",
    );
    const finished = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(Error("Operación de almacenamiento cancelada"));
      tx.onerror = () =>
        reject(Error("No se pudo guardar o cargar el proyecto"));
    });
    // Register rejection handling before requests can fail.
    void finished.catch(() => {});
    try {
      const value = await action(tx);
      await finished;
      return value;
    } catch (error) {
      try {
        tx.abort();
      } catch {}
      await finished.catch(() => {});
      throw error;
    }
  } finally {
    db.close();
  }
}
async function requireProject(
  tx: IDBTransaction,
  id: string,
): Promise<Project> {
  const p = await requested<Project | undefined>(
    tx.objectStore("metadata").get(id),
  );
  if (!p) throw Error("Proyecto no encontrado");
  return p;
}
export async function listProjects(): Promise<Project[]> {
  if (browserEdition)
    return browserOperation(false, async (tx) =>
      (await requested<Project[]>(tx.objectStore("metadata").getAll())).sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    );
  const response = await fetch("/api/projects");
  if (!response.ok) throw Error("No se pudieron consultar los proyectos");
  return response.json();
}
export async function createProject(value: string): Promise<Project> {
  const name = validName(value);
  if (browserEdition)
    return browserOperation(true, async (tx) => {
      const p = { id: crypto.randomUUID(), name };
      await requested(tx.objectStore("metadata").add(p));
      return p;
    });
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw Error("No se pudo crear el proyecto");
  return response.json();
}
export async function renameProject(
  id: string,
  value: string,
): Promise<Project> {
  const name = validName(value);
  if (browserEdition)
    return browserOperation(true, async (tx) => {
      await requireProject(tx, id);
      const p = { id, name };
      await requested(tx.objectStore("metadata").put(p));
      return p;
    });
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw Error("No se pudo renombrar el proyecto");
  return response.json();
}
export async function deleteProject(id: string) {
  if (id === demoProjectId)
    throw Error("La casa de demostración no se elimina");
  if (browserEdition)
    return browserOperation(true, async (tx) => {
      await requireProject(tx, id);
      await requested(tx.objectStore("projects").delete(id));
      await requested(tx.objectStore("metadata").delete(id));
    });
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw Error("No se pudo eliminar el proyecto");
}
export async function saveScene(
  scene: SceneSnapshot,
  id = getActiveProjectId(),
) {
  const value = validateScene(scene);
  if (browserEdition)
    return browserOperation(true, async (tx) => {
      await requireProject(tx, id);
      await requested(tx.objectStore("projects").put(value, id));
    });
  const response = await fetch(sceneUrl(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw Error("No se pudo guardar en PostgreSQL");
}
export async function loadScene(
  id = getActiveProjectId(),
): Promise<SceneSnapshot | null> {
  if (browserEdition)
    return browserOperation(false, async (tx) => {
      await requireProject(tx, id);
      const value = await requested(tx.objectStore("projects").get(id));
      return value ? validateScene(value) : null;
    });
  const response = await fetch(sceneUrl(id));
  if (!response.ok) throw Error("No se pudo cargar desde PostgreSQL");
  const text = await response.text();
  if (!text) return null;
  const value = JSON.parse(text);
  return value === null ? null : validateScene(value);
}
