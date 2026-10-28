import {
  configuration,
  validateConfig,
  simulate,
  type Config,
  type Trace,
} from "./advanced.ts";
import { create } from "zustand";
export type Device = {
  config?: Config;
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
export type Link = {
  kind?: "Ethernet" | "Wi-Fi" | "Fibra";
  id: string;
  a: string;
  b: string;
  ap: number;
  bp: number;
};
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
  "Switch Catalyst 9300",
  "Impresora",
  "Teléfono IP",
  "Smart TV",
  "Sensor IoT",
  "Internet",
];
export const ports = (d: Device) =>
  d.kind.startsWith("Switch")
    ? 8
    : d.kind.startsWith("Router") || d.kind === "Access Point"
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
    if (d.config) validateConfig(d.config, d);
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
    if (l.kind && !["Ethernet", "Wi-Fi", "Fibra"].includes(l.kind))
      throw Error("Medio inválido");
    if (
      l.kind === "Wi-Fi" &&
      a.kind !== "Access Point" &&
      b.kind !== "Access Point"
    )
      throw Error("Wi-Fi requiere un access point");
    if (
      l.kind === "Fibra" &&
      [a, b].some(
        (d) =>
          ![
            "Router ISR 4321",
            "Switch 2960",
            "Switch Catalyst 9300",
            "Firewall ASA",
            "Servidor",
            "Internet",
          ].includes(d.kind),
      )
    )
      throw Error("Interfaz de fibra incompatible");
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
  return simulate(n, source, target);
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
export const demo = (): Network => {
  const n: Network = {
    devices: [
      device("Router", kinds[0], 8, "192.168.1.1", -0.9),
      device("Switch", kinds[1], 8, "192.168.1.2", 0.9),
      device("PC", kinds[3], 0, "192.168.1.101"),
      device("Laptop", kinds[4], 5, "192.168.1.102"),
      device("ASA", kinds[2], 8, "192.168.254.1", 0),
      device("Internet", "Internet", 7, "203.0.113.1", 0),
    ],
    links: [
      { id: "rs", a: "Router", b: "Switch", ap: 0, bp: 0 },
      { id: "sp", a: "Switch", b: "PC", ap: 1, bp: 0 },
      { id: "sl", a: "Switch", b: "Laptop", ap: 2, bp: 0 },
      { id: "ra", a: "Router", b: "ASA", ap: 1, bp: 0 },
      { id: "ai", a: "ASA", b: "Internet", ap: 1, bp: 0 },
    ],
  };
  const [router, , , , asa, internet] = n.devices;
  router.config = configuration(router);
  router.config.interfaces[1].ip = "192.168.254.2";
  router.config.routes = [
    { network: "0.0.0.0", prefix: 0, gateway: "192.168.254.1" },
  ];
  asa.z = -1;
  asa.config = configuration(asa);
  asa.config.interfaces[1].ip = "203.0.113.2";
  asa.config.routes = [
    { network: "192.168.1.0", prefix: 24, gateway: "192.168.254.2" },
  ];
  internet.config = configuration(internet);
  internet.config.gateway = "203.0.113.2";
  return n;
};
export const useNetwork = create<
  Network & {
    selected: string | null;
    trace: string[];
    events: { time: string; ok: boolean; message: string; bytes: number }[];
    step: number;
    playing: boolean;
    cameraId: string | null;
    dragging: boolean;
    record: (r: Trace) => void;
    setNetwork: (n: Network) => void;
    select: (id: string) => void;
    update: (id: string, p: Partial<Device>) => void;
    add: (kind: string, room: number) => void;
    remove: (id: string) => void;
    connect: (
      a: string,
      b: string,
      ap: number,
      bp: number,
      kind?: Link["kind"],
    ) => void;
    disconnect: (id: string) => void;
  }
>((set, get) => ({
  ...demo(),
  selected: "PC",
  trace: [],
  events: [],
  step: 0,
  playing: false,
  cameraId: null,
  dragging: false,
  record: (r) =>
    set((s) => ({
      trace: r.path,
      step: 0,
      playing: false,
      events: [
        ...s.events.slice(-99),
        {
          time: new Date().toISOString(),
          ok: r.ok,
          message: r.message,
          bytes: r.probes?.length
            ? r.probes.filter((p) => p.delayMs !== null).length * 64
            : r.ok
              ? 64
              : 0,
        },
      ],
    })),
  setNetwork: (n) =>
    set({
      ...validateNetwork(n),
      selected: null,
      trace: [],
      cameraId: null,
      playing: false,
      step: 0,
      dragging: false,
      events: [],
    }),
  select: (selected) => set({ selected }),
  update: (id, p) =>
    set((s) => ({
      cameraId: s.cameraId === id && p.on === false ? null : s.cameraId,
      devices: s.devices.map((d) => {
        if (d.id !== id) return d;
        const result = { ...d, ...p };
        if (result.config && (p.ip !== undefined || p.prefix !== undefined)) {
          result.config = structuredClone(result.config);
          result.config.interfaces[0].ip = result.ip;
          result.config.interfaces[0].prefix = result.prefix;
        }
        return result;
      }),
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
      cameraId: s.cameraId === id ? null : s.cameraId,
      devices: s.devices.filter((d) => d.id !== id),
      links: s.links.filter((l) => l.a !== id && l.b !== id),
      selected: null,
      trace: [],
    })),
  connect: (a, b, ap, bp, kind = "Ethernet") => {
    const s = get();
    const n = validateNetwork({
      devices: s.devices,
      links: [...s.links, { id: crypto.randomUUID(), a, b, ap, bp, kind }],
    });
    set({ ...n, trace: [] });
  },
  disconnect: (id) =>
    set((s) => ({ links: s.links.filter((l) => l.id !== id), trace: [] })),
}));
