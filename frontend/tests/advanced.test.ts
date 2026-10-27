import { test } from "node:test";
import assert from "node:assert/strict";
import { demo, ping, validateNetwork } from "../src/network.ts";
import { configuration, dhcpLease } from "../src/advanced.ts";
import { execute, type Context } from "../src/cli.ts";
test("interfaces, VLAN y firewall cambian la conectividad", () => {
  const n = demo();
  for (const d of n.devices) d.config = configuration(d);
  const sw = n.devices[1];
  sw.config!.interfaces[1].enabled = false;
  assert.equal(ping(n, "PC", "192.168.1.102").ok, false);
  sw.config!.interfaces[1].enabled = true;
  sw.config!.interfaces[1].vlan = 20;
  assert.equal(ping(n, "PC", "192.168.1.102").ok, false);
  sw.config!.interfaces[1].vlan = 1;
  sw.config!.firewall = [
    { source: "192.168.1.101", destination: "192.168.1.102", action: "deny" },
  ];
  assert.match(ping(n, "PC", "192.168.1.102").message, /firewall/);
  sw.config!.firewall = [];
  assert.equal(ping(n, "PC", "192.168.1.102").ok, true);
});
test("enrutamiento directo requiere gateway y ruta de retorno", () => {
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
  assert.equal(ping(n, "PC", laptop.ip).ok, true);
  laptop.config.gateway = "";
  assert.match(ping(n, "PC", laptop.ip).message, /retorno/);
});
test("DHCP evita IP ocupadas y exige servidor alcanzable", () => {
  const n = demo();
  n.devices[1].config = configuration(n.devices[1]);
  n.devices[1].config!.dhcp = {
    start: "192.168.1.101",
    end: "192.168.1.110",
    prefix: 24,
    gateway: "192.168.1.1",
  };
  assert.equal(dhcpLease(n, "PC").ip, "192.168.1.103");
  n.links = n.links.filter((l) => l.id !== "sp");
  assert.throws(() => dhcpLease(n, "PC"));
});
test("CLI modos, máscara, shutdown de interfaz, persistencia y errores", () => {
  let n = demo(),
    context: Context = { mode: "EXEC", port: 0 };
  const command = (text: string) => {
    const r = execute(n, "Switch", context, text);
    n = r.network;
    context = r.context;
    return r;
  };
  assert.throws(() => command("shutdown"));
  command("enable");
  command("configure terminal");
  command("interface eth1");
  command("shutdown");
  assert.equal(ping(n, "PC", "192.168.1.102").ok, false);
  command("no shutdown");
  command("description cable PC");
  command("exit");
  command("hostname Core");
  command("end");
  assert.equal(command("write memory").save, true);
  assert.equal(n.devices[1].name, "Core");
  assert.equal(command("ping 192.168.1.102").trace?.ok,true);
  assert.deepEqual(validateNetwork(JSON.parse(JSON.stringify(n))), n);
  assert.throws(() => command("rm -rf /"));
});
test("casos compartidos con el motor Java", async () => {
  const fs = await import("node:fs");
  const cases = JSON.parse(
    fs.readFileSync(
      new URL(
        "../../backend/src/test/resources/network-cases.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const c of cases)
    assert.equal(ping(c.network, c.source, c.target).ok, c.ok, c.name);
});

test("valida compatibilidad de medios", () => {
  const n = demo();
  n.links[1].kind = "Fibra";
  assert.throws(() => validateNetwork(n));
  n.links[1].kind = "Wi-Fi";
  assert.throws(() => validateNetwork(n));
});
