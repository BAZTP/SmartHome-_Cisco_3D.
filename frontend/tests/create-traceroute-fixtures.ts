import fs from "node:fs";
import { demo } from "../src/network.ts";
import { configuration } from "../src/advanced.ts";
const base = demo();
const broken = demo();
broken.links = broken.links.filter((l) => l.id !== "ra");
const noReply = demo();
const pc = noReply.devices.find((d) => d.id === "PC")!;
pc.config = configuration(pc);
pc.config.firewall = [
  { action: "deny", source: "192.168.254.1", destination: "*" },
];
const cases = [
  {
    name: "LAN no cuenta switches",
    network: base,
    target: "192.168.1.102",
    max: 30,
    ok: true,
    devices: ["Laptop"],
    statuses: ["reached"],
  },
  {
    name: "WAN reduce TTL en cada router",
    network: base,
    target: "203.0.113.1",
    max: 30,
    ok: true,
    devices: ["Router", "ASA", "Internet"],
    statuses: ["time-exceeded", "time-exceeded", "reached"],
  },
  {
    name: "límite TTL",
    network: base,
    target: "203.0.113.1",
    max: 2,
    ok: false,
    devices: ["Router", "ASA"],
    statuses: ["time-exceeded", "time-exceeded"],
  },
  {
    name: "cable WAN desconectado",
    network: broken,
    target: "203.0.113.1",
    max: 30,
    ok: false,
    devices: ["Router", null],
    statuses: ["time-exceeded", "unreachable"],
  },
  {
    name: "ICMP intermedio bloqueado pero destino responde",
    network: noReply,
    target: "203.0.113.1",
    max: 30,
    ok: true,
    devices: ["Router", null, "Internet"],
    statuses: ["time-exceeded", "timeout", "reached"],
  },
];
fs.writeFileSync(
  new URL(
    "../../backend/src/test/resources/traceroute-cases.json",
    import.meta.url,
  ),
  JSON.stringify(cases, null, 2),
);
