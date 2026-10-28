import { create } from "zustand";
export type ModelAsset = { name: string; format: "glb" | "gltf"; data: string };
export type ModelLibrary = {
  assets: Record<string, ModelAsset>;
  devices: Record<string, string>;
};
export const emptyModels = (): ModelLibrary => ({ assets: {}, devices: {} });
const MAX_FILE = 2 * 1024 * 1024;
export function modelBytes(asset: ModelAsset) {
  if (
    !asset ||
    typeof asset.name !== "string" ||
    !asset.name.trim() ||
    asset.name.length > 100 ||
    !["glb", "gltf"].includes(asset.format) ||
    typeof asset.data !== "string" ||
    asset.data.length > Math.ceil(MAX_FILE / 3) * 4 ||
    asset.data.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.data)
  )
    throw Error("Modelo inválido; máximo 2 MiB por archivo");
  const bytes = Uint8Array.from(atob(asset.data), (c) => c.charCodeAt(0));
  if (!bytes.length || bytes.length > MAX_FILE)
    throw Error("Tamaño de modelo inválido");
  return bytes;
}
export function validateModel(asset: ModelAsset) {
  const bytes = modelBytes(asset);
  let json: string;
  if (asset.format === "glb") {
    const view = new DataView(bytes.buffer);
    if (
      bytes.length < 20 ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== bytes.length ||
      view.getUint32(16, true) !== 0x4e4f534a
    )
      throw Error("Cabecera GLB inválida");
    const length = view.getUint32(12, true);
    if (length > bytes.length - 20) throw Error("GLB truncado");
    json = new TextDecoder().decode(bytes.subarray(20, 20 + length));
  } else json = new TextDecoder().decode(bytes);
  const doc = JSON.parse(json);
  if (
    doc.asset?.version !== "2.0" ||
    !Array.isArray(doc.meshes) ||
    !doc.meshes.length ||
    doc.meshes.length > 256 ||
    !Array.isArray(doc.nodes) ||
    doc.nodes.length > 512
  )
    throw Error("Se requiere un modelo glTF 2.0 con mallas");
  const allowed = ["KHR_materials_unlit", "KHR_materials_emissive_strength"];
  if (
    [...(doc.extensionsUsed ?? []), ...(doc.extensionsRequired ?? [])].some(
      (e: string) => !allowed.includes(e),
    )
  )
    throw Error("Extensión GLTF no soportada; exporta sin compresión");
  if (
    (doc.accessors ?? []).reduce(
      (sum: number, a: { count: number }) =>
        sum + (Number.isInteger(a.count) && a.count >= 0 ? a.count : Infinity),
      0,
    ) > 200000
  )
    throw Error("Modelo demasiado complejo");
  const walk = (v: unknown) => {
    if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) {
        if (
          k === "uri" &&
          (typeof x !== "string" ||
            !/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg));base64,[A-Za-z0-9+/]+=*$/.test(
              x,
            ))
        )
          throw Error(
            "El modelo debe contener todos sus recursos; no se admiten URLs externas",
          );
        walk(x);
      }
  };
  walk(doc);
  const colors = new Array(doc.nodes.length).fill(0);
  const visit = (i: number) => {
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i >= doc.nodes.length ||
      colors[i] === 1
    )
      throw Error("Jerarquía GLTF inválida");
    if (colors[i] === 2) return;
    colors[i] = 1;
    for (const child of doc.nodes[i].children ?? []) visit(child);
    colors[i] = 2;
  };
  doc.nodes.forEach((_: unknown, i: number) => visit(i));
  return bytes;
}
export function validateModels(
  value: unknown,
  deviceIds: string[],
): ModelLibrary {
  if (value === undefined || value === null) return emptyModels();
  const library = value as ModelLibrary;
  if (
    !library.assets ||
    !library.devices ||
    Array.isArray(library.assets) ||
    Array.isArray(library.devices) ||
    typeof library.assets !== "object" ||
    typeof library.devices !== "object" ||
    Object.keys(library.assets).length > 8 ||
    Object.keys(library.devices).length > 20
  )
    throw Error("Biblioteca de modelos inválida");
  let total = 0;
  for (const [id, asset] of Object.entries(library.assets)) {
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
      throw Error("Identificador de modelo inválido");
    validateModel(asset);
    total += asset.data.length;
  }
  if (total > 8 * 1024 * 1024) throw Error("Biblioteca superior a 8 MiB");
  for (const [device, asset] of Object.entries(library.devices))
    if (
      !deviceIds.includes(device) ||
      typeof asset !== "string" ||
      !Object.hasOwn(library.assets, asset)
    )
      throw Error("Asignación de modelo inválida");
  return structuredClone(library);
}
export const useModels = create<
  ModelLibrary & {
    restore: (models: ModelLibrary) => void;
    assign: (id: string, asset: ModelAsset) => void;
    remove: (id: string) => void;
  }
>((set) => ({
  ...emptyModels(),
  restore: (models) => set(models),
  assign: (id, asset) =>
    set((state) => {
      const assets = { ...state.assets },
        devices = { ...state.devices };
      const key = crypto.randomUUID();
      assets[key] = asset;
      devices[id] = key;
      for (const existing of Object.keys(assets))
        if (!Object.values(devices).includes(existing)) delete assets[existing];
      const library = validateModels({ assets, devices }, Object.keys(devices));
      return library;
    }),
  remove: (id) =>
    set((state) => {
      const devices = { ...state.devices };
      delete devices[id];
      return {
        devices,
        assets: Object.fromEntries(
          Object.entries(state.assets).filter(([key]) =>
            Object.values(devices).includes(key),
          ),
        ),
      };
    }),
}));
export function modelSnapshot(deviceIds: string[]): ModelLibrary {
  const { assets, devices } = useModels.getState();
  const selected = Object.fromEntries(
    Object.entries(devices).filter(([id]) => deviceIds.includes(id)),
  );
  return {
    devices: selected,
    assets: Object.fromEntries(
      Object.entries(assets).filter(([id]) =>
        Object.values(selected).includes(id),
      ),
    ),
  };
}
