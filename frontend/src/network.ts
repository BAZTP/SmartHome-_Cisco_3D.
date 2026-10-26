import { create } from "zustand";
export type Device = {
  id: string;
  name: string;
  kind: string;
  room: number;
  x: number;
  z: number;
  rotation: number;
  ip: string;
  prefix: number;
  on: boolean;
};
export type Link = { id: string; a: string; b: string; ap: number; bp: number };
export type Network = { devices: Device[]; links: Link[] };
export const kinds = [
  "Router ISR 4321",
  "Switch 2960",
  "Firewall ASA",
  "PC",
  "Laptop",
  "Access Point",
  "Servidor",
  "Cámara IP",
  "Bombilla IoT",
];
export const ports = (d: Device) =>
  d.kind.startsWith("Switch")
    ? 8
    : d.kind.startsWith("Router")
      ? 4
      : d.kind.startsWith("Firewall")
        ? 2
        : 1;
export function ipv4(ip: string) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const a = ip.split(".").map(Number);
  return a.some((n) => n > 255)
    ? null
    : a.reduce((v, n) => (v * 256 + n) >>> 0, 0);
}
export function validateNetwork(value: unknown): Network {
  const n = value as Network;
  if (
    !n ||
    !Array.isArray(n.devices) ||
    !Array.isArray(n.links) ||
    n.devices.length > 100 ||
    n.links.length > 400
  )
    throw Error("Topología inválida");
  const ids = new Set<string>();
  for (const d of n.devices) {
    if (
      typeof d.id !== "string" ||
      ids.has(d.id) ||
      !d.id ||
      d.id.length > 100 ||
      typeof d.name !== "string" ||
      !d.name.trim() ||
      d.name.length > 60 ||
      !kinds.includes(d.kind) ||
      !Number.isInteger(d.room) ||
      d.room < 0 ||
      d.room > 8 ||
      ![d.x, d.z, d.rotation].every(Number.isFinite) ||
      Math.abs(d.x) > 1.8 ||
      Math.abs(d.z) > 1.5 ||
      ipv4(d.ip) === null ||
      !Number.isInteger(d.prefix) ||
      d.prefix < 1 ||
      d.prefix > 30 ||
      typeof d.on !== "boolean"
    )
      throw Error("Dispositivo inválido");
    ids.add(d.id);
  }
  const used = new Set<string>(),
    linkIds = new Set<string>();
  for (const l of n.links) {
    const a = n.devices.find((d) => d.id === l.a),
      b = n.devices.find((d) => d.id === l.b);
    if (
      typeof l.id !== "string" ||
      linkIds.has(l.id) ||
      !a ||
      !b ||
      a === b ||
      !Number.isInteger(l.ap) ||
      !Number.isInteger(l.bp) ||
      l.ap < 0 ||
      l.bp < 0 ||
      l.ap >= ports(a) ||
      l.bp >= ports(b) ||
      used.has(`${l.a}:${l.ap}`) ||
      used.has(`${l.b}:${l.bp}`)
    )
      throw Error("Enlace o puerto inválido");
    used.add(`${l.a}:${l.ap}`);
    used.add(`${l.b}:${l.bp}`);
    linkIds.add(l.id);
  }
  return structuredClone(n);
}
export function ping(
  n: Network,
  source: string,
  target: string,
): { ok: boolean; message: string; path: string[] } {
  const a = n.devices.find((d) => d.id === source),
    b = n.devices.find((d) => d.ip === target);
  const fail = (message: string) => ({ ok: false, message, path: [] });
  if (!a || !a.on) return fail("Origen apagado o inexistente");
  if (!b) return fail("IP de destino desconocida");
  if (!b.on) return fail("Destino apagado");
  if (
    n.devices.filter((d) => d.ip === target).length !== 1 ||
    n.devices.filter((d) => d.ip === a.ip).length !== 1
  )
    return fail("Dirección IP duplicada");
  const ai = ipv4(a.ip)!,
    bi = ipv4(b.ip)!;
  const mask = (p: number) => (0xffffffff << (32 - p)) >>> 0;
  if (
    (ai & mask(a.prefix)) >>> 0 !== (bi & mask(a.prefix)) >>> 0 ||
    (ai & mask(b.prefix)) >>> 0 !== (bi & mask(b.prefix)) >>> 0
  )
    return fail(
      "Subred incompatible; enrutamiento entre subredes aún no disponible",
    );
  const queue = [[a.id]],
    seen = new Set<string>();
  while (queue.length) {
    const path = queue.shift()!,
      id = path[path.length - 1];
    if (id === b.id)
      return {
        ok: true,
        message: "Respuesta ICMP virtual · 32 bytes · recorrido verificado",
        path,
      };
    if (seen.has(id)) continue;
    seen.add(id);
    const d = n.devices.find((d) => d.id === id)!;
    if (
      !d.on ||
      (id !== a.id &&
        !d.kind.startsWith("Switch") &&
        !d.kind.startsWith("Access"))
    )
      continue;
    for (const l of n.links) {
      const next = l.a === id ? l.b : l.b === id ? l.a : null;
      if (next && n.devices.find((d) => d.id === next)?.on && !seen.has(next))
        queue.push([...path, next]);
    }
  }
  return fail("Sin enlace operativo hasta el destino");
}
const device = (
  id: string,
  kind: string,
  room: number,
  ip: string,
  x = 0,
): Device => ({
  id,
  kind,
  name: id,
  room,
  ip,
  x,
  z: 1,
  rotation: 0,
  prefix: 24,
  on: true,
});
export const demo = (): Network => ({
  devices: [
    device("Router", kinds[0], 8, "192.168.1.1", -0.9),
    device("Switch", kinds[1], 8, "192.168.1.2", 0.9),
    device("PC", kinds[3], 0, "192.168.1.101"),
    device("Laptop", kinds[4], 5, "192.168.1.102"),
  ],
  links: [
    { id: "rs", a: "Router", b: "Switch", ap: 0, bp: 0 },
    { id: "sp", a: "Switch", b: "PC", ap: 1, bp: 0 },
    { id: "sl", a: "Switch", b: "Laptop", ap: 2, bp: 0 },
  ],
});
export const useNetwork = create<
  Network & {
    selected: string | null;
    trace: string[];
    setNetwork: (n: Network) => void;
    select: (id: string) => void;
    update: (id: string, p: Partial<Device>) => void;
    add: (kind: string, room: number) => void;
    remove: (id: string) => void;
    connect: (a: string, b: string, ap: number, bp: number) => void;
    disconnect: (id: string) => void;
  }
>((set, get) => ({
  ...demo(),
  selected: "PC",
  trace: [],
  setNetwork: (n) => set({ ...validateNetwork(n), selected: null, trace: [] }),
  select: (selected) => set({ selected }),
  update: (id, p) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, ...p } : d)),
      trace: [],
    })),
  add: (kind, room) => {
    const s = get();
    if (s.devices.length >= 100) throw Error("Limite: 100 dispositivos");
    const id = crypto.randomUUID();
    const occupied = new Set(s.devices.map((d) => d.ip));
    let host = 10;
    while (occupied.has(`192.168.1.${host}`)) host++;
    set({
      devices: [...s.devices, device(id, kind, room, `192.168.1.${host}`)],
      selected: id,
      trace: [],
    });
  },
  remove: (id) =>
    set((s) => ({
      devices: s.devices.filter((d) => d.id !== id),
      links: s.links.filter((l) => l.a !== id && l.b !== id),
      selected: null,
      trace: [],
    })),
  connect: (a, b, ap, bp) => {
    const s = get();
    const n = validateNetwork({
      devices: s.devices,
      links: [...s.links, { id: crypto.randomUUID(), a, b, ap, bp }],
    });
    set({ ...n, trace: [] });
  },
  disconnect: (id) =>
    set((s) => ({ links: s.links.filter((l) => l.id !== id), trace: [] })),
}));
