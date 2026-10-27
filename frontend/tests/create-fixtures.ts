import fs from "node:fs";
import { demo, type Network } from "../src/network.ts";
import { configuration } from "../src/advanced.ts";
const cases: {
  name: string;
  network: Network;
  source: string;
  target: string;
  ok: boolean;
}[] = [];
function add(
  name: string,
  network: Network,
  ok: boolean,
  target = "192.168.1.102",
) {
  cases.push({ name, network, source: "PC", target, ok });
}
add("LAN", demo(), true);
add(
  "Internet virtual con ruta estática y retorno",
  demo(),
  true,
  "203.0.113.1",
);
let n = demo();
n.links = n.links.filter((l) => l.id !== "sl");
add("Cable desconectado", n, false);
n = demo();
n.devices[1].config = configuration(n.devices[1]);
n.devices[1].config.interfaces[1].enabled = false;
add("Interfaz down", n, false);
n = demo();
n.devices[1].config = configuration(n.devices[1]);
n.devices[1].config.interfaces[1].vlan = 20;
add("Aislamiento VLAN", n, false);
n = demo();
n.devices[1].config = configuration(n.devices[1]);
n.devices[1].config.firewall = [
  { source: "*", destination: "192.168.1.102", action: "deny" },
];
add("Firewall", n, false);
function routed() {
  const n = demo();
  n.devices = n.devices.filter((d) => d.id !== "Switch");
  n.links = [
    { id: "a", a: "PC", ap: 0, b: "Router", bp: 0 },
    { id: "b", a: "Router", ap: 1, b: "Laptop", bp: 0 },
  ];
  const router = n.devices[0],
    laptop = n.devices[2];
  router.config = configuration(router);
  router.config.interfaces[1].ip = "192.168.2.1";
  laptop.ip = "192.168.2.102";
  laptop.config = configuration(laptop);
  laptop.config.gateway = "192.168.2.1";
  return n;
}
n = routed();
add("Dos subredes", n, true, "192.168.2.102");
n = routed();
n.devices[2].config!.gateway = "";
add("Sin retorno", n, false, "192.168.2.102");
n = routed();
n.devices[2].config!.firewall = [
  { source: "192.168.1.101", destination: "*", action: "deny" },
];
add("Origen privado bloqueado", structuredClone(n), false, "192.168.2.102");
n.devices[0].config!.nat = true;
add("Traducción de origen", n, true, "192.168.2.102");
n = demo();
n.devices[1].config = configuration(n.devices[1]);
n.devices[1].config.interfaces[1].vlan = 20;
n.devices[1].config.interfaces[2].vlan = 20;
add("Dos puertos access VLAN20 con hosts sin etiquetas", n, true);
n = demo();
const ap = {
  ...n.devices[1],
  id: "AP",
  name: "AP",
  kind: "Access Point",
  room: 0,
};
n.devices.push(ap);
n.links = n.links.filter((l) => l.id !== "sl");
n.links.push(
  { id: "sap", a: "Switch", ap: 3, b: "AP", bp: 0 },
  { id: "wireless", a: "AP", ap: 1, b: "Laptop", bp: 0, kind: "Wi-Fi" },
);
n.devices[3].room = 0;
add("Wi-Fi alcanzable", structuredClone(n), true);
n.devices[3].room = 5;
add("Wi-Fi fuera de alcance", n, false);
n = demo();
n.links[0].kind = "Fibra";
add("Backbone fibra", n, true);
n = demo();
const sw2 = {
  ...n.devices[1],
  id: "Switch2",
  name: "Switch2",
  ip: "192.168.1.3",
};
n.devices.push(sw2);
n.devices[1].config = configuration(n.devices[1]);
sw2.config = configuration(sw2);
n.devices[1].config.interfaces[1].vlan = 20;
n.devices[1].config.interfaces[2].mode = "trunk";
sw2.config.interfaces[0].mode = "trunk";
sw2.config.interfaces[1].vlan = 20;
n.links = n.links.filter((l) => l.id !== "sl");
n.links.push(
  { id: "trunk", a: "Switch", ap: 2, b: "Switch2", bp: 0 },
  { id: "swl", a: "Switch2", ap: 1, b: "Laptop", bp: 0 },
);
add("Trunk transporta VLAN20", structuredClone(n), true);
sw2.config.interfaces[0].mode = "access";
add("Trunk mal configurado", n, false);
fs.writeFileSync(
  new URL(
    "../../backend/src/test/resources/network-cases.json",
    import.meta.url,
  ),
  JSON.stringify(cases, null, 2),
);
