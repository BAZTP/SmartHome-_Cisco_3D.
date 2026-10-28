import { useState } from "react";
import { useNetwork } from "./network";
import { useModels, type ModelAsset } from "./models";
import { loadModel, disposeModel } from "./ImportedModel";
import { getActiveProjectId } from "./projectStorage";
export default function ModelPanel() {
  const n = useNetwork(),
    d = n.devices.find((d) => d.id === n.selected),
    models = useModels(),
    [message, M] = useState(""),
    [busy, B] = useState(false);
  const asset = d ? models.assets[models.devices[d.id]] : undefined;
  return (
    <details className="advanced">
      <summary>Modelos GLB / GLTF</summary>
      <p>
        Importa un modelo glTF 2.0 autocontenido (máximo 2 MiB). Se ajusta a una
        unidad de la escena y se guarda con el proyecto. Exporta las texturas
        dentro del archivo; no se descargan recursos externos. Máximo 8 modelos
        y 20 equipos personalizados.
      </p>
      <label>
        Modelo del equipo seleccionado
        <input
          aria-label="Importar modelo 3D"
          type="file"
          accept=".glb,.gltf"
          disabled={!d || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !d) return;
            const id = d.id,
              project = getActiveProjectId();
            B(true);
            try {
              if (file.size > 2 * 1024 * 1024)
                throw Error("El modelo supera 2 MiB");
              const format = file.name.toLowerCase().endsWith(".glb")
                ? "glb"
                : file.name.toLowerCase().endsWith(".gltf")
                  ? "gltf"
                  : null;
              if (!format) throw Error("Formato no soportado");
              const bytes = new Uint8Array(await file.arrayBuffer());
              let binary = "";
              for (let i = 0; i < bytes.length; i += 8192)
                binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
              const asset: ModelAsset = {
                name: file.name.slice(0, 100),
                format,
                data: btoa(binary),
              };
              const object = await loadModel(asset);
              disposeModel(object);
              if (
                project !== getActiveProjectId() ||
                !useNetwork.getState().devices.some((d) => d.id === id)
              )
                return;
              models.assign(id, asset);
              M("Modelo importado; guarda el proyecto para conservarlo");
            } catch (error) {
              M(String(error));
            } finally {
              B(false);
            }
          }}
        />
      </label>
      <p aria-label="Modelo asignado">
        {asset?.name ?? "Representación original"}
      </p>
      <button
        disabled={!d || !asset || busy}
        onClick={() => {
          models.remove(d!.id);
          M("Representación original restaurada");
        }}
      >
        Quitar modelo personalizado
      </button>
      <p aria-live="polite" aria-label="Estado del modelo">
        {busy ? "Cargando modelo…" : message}
      </p>
    </details>
  );
}
