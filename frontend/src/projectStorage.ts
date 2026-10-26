import { validateNetwork, type Network } from "./network";
import type { View } from "./store";
export type SceneSnapshot = {
  version: 1;
  network?: Network;
  view: View;
  walls: boolean;
  selected: string | null;
};
export const browserEdition =
  import.meta.env.VITE_APP_MODE === "pages" ||
  import.meta.env.VITE_STATIC_DEMO === "true";
const projectId = "00000000-0000-0000-0000-000000000001";
const sceneUrl = `/api/projects/${projectId}/scene`;
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
    ...(s.network ? { network: validateNetwork(s.network) } : {}),
    view: s.view as View,
    walls: s.walls,
    selected: s.selected as string | null,
  };
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("smarthome-cisco-3d", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(Error("No se pudo abrir el almacenamiento del navegador"));
    request.onblocked = () =>
      reject(Error("Cierra otras pestañas de SmartHome e inténtalo otra vez"));
  });
}
async function browserScene(
  value?: SceneSnapshot,
): Promise<SceneSnapshot | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("projects", value ? "readwrite" : "readonly");
      const store = tx.objectStore("projects");
      const request = value
        ? store.put(value, projectId)
        : store.get(projectId);
      tx.oncomplete = () => {
        try {
          resolve(
            value ?? (request.result ? validateScene(request.result) : null),
          );
        } catch (e) {
          reject(e);
        }
      };
      tx.onerror = () =>
        reject(Error("No se pudo guardar o cargar el proyecto"));
      tx.onabort = () => reject(Error("Operación de almacenamiento cancelada"));
    });
  } finally {
    db.close();
  }
}
export async function saveScene(scene: SceneSnapshot) {
  if (browserEdition) {
    await browserScene(scene);
    return;
  }
  const response = await fetch(sceneUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scene),
  });
  if (!response.ok) throw Error("No se pudo guardar en PostgreSQL");
}
export async function loadScene(): Promise<SceneSnapshot | null> {
  if (browserEdition) return browserScene();
  const response = await fetch(sceneUrl);
  if (!response.ok) throw Error("No se pudo cargar desde PostgreSQL");
  const text = await response.text();
  if (!text) return null;
  const value = JSON.parse(text);
  return value === null ? null : validateScene(value);
}
