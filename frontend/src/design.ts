import { create } from "zustand";
import type { Network } from "./network";
export const roomNames = [
  "Sala",
  "Comedor",
  "Cocina",
  "Dormitorio principal",
  "Dormitorio secundario",
  "Oficina",
  "Garaje",
  "Jardín",
  "Telecomunicaciones",
];
export type Room = { id: number; name: string };
export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};
export type Design = {
  rooms: Room[];
  topology: Record<string, { x: number; y: number }>;
  camera: CameraPose | null;
  connections: boolean;
  quality: "balanced" | "high";
};
export const defaultDesign = (): Design => ({
  rooms: roomNames.map((name, id) => ({ id, name })),
  topology: {},
  camera: null,
  connections: true,
  quality: "high",
});
export function validateDesign(value: unknown, network?: Network): Design {
  const d = value as Design;
  if (
    !d ||
    !Array.isArray(d.rooms) ||
    d.rooms.length < 1 ||
    d.rooms.length > 9 ||
    !d.topology ||
    Array.isArray(d.topology) ||
    typeof d.topology !== "object" ||
    typeof d.connections !== "boolean" ||
    !["balanced", "high"].includes(d.quality)
  )
    throw Error("Diseño inválido");
  const ids = new Set<number>(),
    names = new Set<string>();
  for (const r of d.rooms) {
    if (
      !r ||
      !Number.isInteger(r.id) ||
      r.id < 0 ||
      r.id > 8 ||
      ids.has(r.id) ||
      typeof r.name !== "string" ||
      !r.name.trim() ||
      r.name.length > 60 ||
      names.has(r.name.trim())
    )
      throw Error("Habitación inválida");
    ids.add(r.id);
    names.add(r.name.trim());
  }
  if (network?.devices.some((v) => !ids.has(v.room)))
    throw Error("La habitación contiene dispositivos");
  for (const [id, p] of Object.entries(d.topology)) {
    if (
      !network?.devices.some((v) => v.id === id) ||
      !p ||
      ![p.x, p.y].every((v) => Number.isFinite(v) && Math.abs(v) <= 10000)
    )
      throw Error("Posición lógica inválida");
  }
  if (d.camera != null) {
    for (const p of [d.camera.position, d.camera.target])
      if (
        !Array.isArray(p) ||
        p.length !== 3 ||
        !p.every((v) => Number.isFinite(v) && Math.abs(v) <= 100)
      )
        throw Error("Cámara inválida");
    if (
      Math.hypot(...d.camera.position.map((v, i) => v - d.camera!.target[i])) <
      0.1
    )
      throw Error("Cámara sin dirección");
  }
  return structuredClone(d);
}
export const useDesign = create<
  Design & {
    restore: (d: Design) => void;
    focus: string | null;
    focusRevision: number;
    cameraRevision: number;
    focusDevice: (id: string) => void;
  }
>((set) => ({
  ...defaultDesign(),
  focus: null,
  focusRevision: 0,
  cameraRevision: 0,
  restore: (d) =>
    set((s) => ({ ...d, focus: null, cameraRevision: s.cameraRevision + 1 })),
  focusDevice: (id) =>
    set((s) => ({ focus: id, focusRevision: s.focusRevision + 1 })),
}));
export function designSnapshot(network: Network): Design {
  const { rooms, topology, camera, connections, quality } =
    useDesign.getState();
  return {
    rooms,
    camera,
    connections,
    quality,
    topology: Object.fromEntries(
      Object.entries(topology).filter(([id]) =>
        network.devices.some((d) => d.id === id),
      ),
    ),
  };
}
