import { useEffect, useState } from "react";
import {
  Box3,
  Vector3,
  LoadingManager,
  Mesh,
  Material,
  Texture,
  Group,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Html } from "@react-three/drei";
import { validateModel, type ModelAsset } from "./models";
export function disposeModel(root: Group) {
  const textures = new Set<Texture>(),
    materials = new Set<Material>();
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof Texture) textures.add(value);
      }
    }
  });
  for (const texture of textures) {
    const source = texture.source.data;
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
      source.close();
    texture.dispose();
  }
  for (const material of materials) material.dispose();
}
export async function loadModel(asset: ModelAsset): Promise<Group> {
  const bytes = validateModel(asset),
    manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.startsWith("data:") && !url.startsWith("blob:"))
      throw Error("Recurso externo bloqueado");
    return url;
  });
  const loader = new GLTFLoader(manager);
  const gltf = await loader.parseAsync(
    asset.format === "glb" ? bytes.buffer : new TextDecoder().decode(bytes),
    "",
  );
  const root = gltf.scene;
  let vertices = 0;
  root.traverse((object) => {
    if (object instanceof Mesh) {
      vertices += object.geometry.attributes.position?.count ?? 0;
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  if (vertices === 0 || vertices > 200000) {
    disposeModel(root);
    throw Error("Modelo sin mallas o demasiado complejo");
  }
  const bounds = new Box3().setFromObject(root),
    size = bounds.getSize(new Vector3()),
    scale = 1 / Math.max(size.x, size.y, size.z),
    center = bounds.getCenter(new Vector3());
  if (!Number.isFinite(scale) || scale <= 0) {
    disposeModel(root);
    throw Error("Dimensiones del modelo inválidas");
  }
  root.position.sub(center);
  const group = new Group();
  group.add(root);
  group.scale.setScalar(scale);
  return group;
}
export default function ImportedModel({ asset }: { asset: ModelAsset }) {
  const [root, R] = useState<Group | null>(null),
    [error, E] = useState("");
  useEffect(() => {
    let disposed = false,
      model: Group | undefined;
    R(null);
    E("");
    void loadModel(asset)
      .then((value) => {
        if (disposed) disposeModel(value);
        else {
          model = value;
          R(value);
        }
      })
      .catch((e) => {
        if (!disposed) E(String(e));
      });
    return () => {
      disposed = true;
      if (model) disposeModel(model);
    };
  }, [asset]);
  if (root) return <primitive object={root} dispose={null} />;
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.6, 0.3, 0.4]} />
        <meshStandardMaterial color={error ? "#bb4159" : "#277c8e"} />
      </mesh>
      <Html center position={[0, 0.3, 0]}>
        <span className="device-tag">
          {error ? "Modelo no disponible" : "Cargando modelo…"}
        </span>
      </Html>
    </group>
  );
}
