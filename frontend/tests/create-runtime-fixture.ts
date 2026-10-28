import fs from "node:fs";
import { demo } from "../src/network.ts";
import { configuration } from "../src/advanced.ts";
const network = demo();
const asa = network.devices.find((d) => d.id === "ASA")!;
asa.config = configuration(asa);
asa.config.nat = true;
const operations = [
  { action: "probe", source: "PC", target: "192.168.1.102", ok: true, pat: 0 },
  {
    action: "flow",
    source: "PC",
    target: "203.0.113.1",
    protocol: "UDP",
    sourcePort: 5000,
    targetPort: 53,
    ok: true,
    pat: 1,
  },
  {
    action: "flow",
    source: "Laptop",
    target: "203.0.113.1",
    protocol: "UDP",
    sourcePort: 5000,
    targetPort: 53,
    ok: true,
    pat: 2,
  },
  {
    action: "flow",
    source: "PC",
    target: "203.0.113.1",
    protocol: "UDP",
    sourcePort: 5000,
    targetPort: 53,
    ok: true,
    pat: 2,
  },
  {
    action: "return",
    sessionId: "flow-1",
    source: "203.0.113.1",
    target: "203.0.113.2",
    protocol: "UDP",
    sourcePort: 53,
    targetPort: 40000,
    ok: true,
    pat: 2,
  },
  {
    action: "return",
    sessionId: "flow-1",
    source: "203.0.113.1",
    target: "203.0.113.2",
    protocol: "UDP",
    sourcePort: 53,
    targetPort: 40001,
    ok: false,
    pat: 2,
  },
  { action: "advance", seconds: 60, ok: null, pat: 0 },
  {
    action: "return",
    sessionId: "flow-1",
    source: "203.0.113.1",
    target: "203.0.113.2",
    protocol: "UDP",
    sourcePort: 53,
    targetPort: 40000,
    ok: false,
    pat: 0,
  },
  { action: "advance", seconds: 240, ok: null, pat: 0 },
  {
    action: "flow",
    source: "PC",
    target: "203.0.113.1",
    protocol: "TCP",
    sourcePort: 5000,
    targetPort: 443,
    ok: true,
    pat: 1,
  },
  { action: "advance", seconds: 299, ok: null, pat: 1 },
  { action: "advance", seconds: 1, ok: null, pat: 0 },
];
fs.writeFileSync(
  new URL(
    "../../backend/src/test/resources/runtime-cases.json",
    import.meta.url,
  ),
  JSON.stringify({ network, operations }, null, 2),
);
// Firewall rules must see addresses before/after inverse PAT at the proper boundary.
const returns = [
  { device: "Internet", source: "*", destination: "192.168.1.101", ok: true },
  { device: "PC", source: "203.0.113.1", destination: "*", ok: false },
].map(({ device, source, destination, ok }) => {
  const n = structuredClone(network);
  const d = n.devices.find((v) => v.id === device)!;
  d.config = configuration(d);
  d.config.firewall = [{ source, destination, action: "deny" }];
  return { network: n, ok };
});
fs.writeFileSync(
  new URL(
    "../../backend/src/test/resources/pat-return-cases.json",
    import.meta.url,
  ),
  JSON.stringify(returns, null, 2),
);
