import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { demo } from "../src/network.ts";
import { runtime, hardwareAddress, type Action } from "../src/runtime.ts";
test("ARP, MAC y PAT: casos compartidos con Java", () => {
  const { network, operations } = JSON.parse(
    fs.readFileSync(
      new URL(
        "../../backend/src/test/resources/runtime-cases.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const [i, op] of operations.entries()) {
    const r = runtime(network, "fixture", op);
    assert.equal(r.result?.ok ?? null, op.ok, "paso " + i);
    assert.equal(r.tables.pat.length, op.pat, "paso " + i);
    if (i === 0) {
      assert.equal(
        r.tables.arp.find((e) => e.device === "PC")?.ip,
        "192.168.1.102",
      );
      assert.equal(
        r.tables.mac.find((e) => e.mac === hardwareAddress("PC", 0))?.port,
        1,
      );
      assert.equal(
        r.tables.mac.find((e) => e.mac === hardwareAddress("Laptop", 0))?.port,
        2,
      );
    }
    if (i === 2)
      assert.deepEqual(
        r.tables.pat.map((p) => p.outsidePort),
        [40000, 40001],
      );
    if (i === 8) {
      assert.equal(r.tables.arp.length, 0);
      assert.equal(r.tables.mac.length, 0);
    }
  }
  assert.equal(
    runtime(network, "other", { action: "inspect" }).tables.arp.length,
    0,
  );
});
test("cambios de topología invalidan tablas y los puertos inválidos se rechazan", () => {
  const n = demo();
  runtime(n, "change", {
    action: "probe",
    source: "PC",
    target: "192.168.1.102",
  });
  n.links = n.links.filter((l) => l.id !== "sl");
  const result = runtime(n, "change", {
    action: "probe",
    source: "PC",
    target: "192.168.1.102",
  });
  assert.equal(result.result?.ok, false);
  assert.equal(result.tables.mac.length, 0);
  assert.throws(() =>
    runtime(n, "change", {
      action: "flow",
      source: "PC",
      target: "192.168.1.102",
      protocol: "TCP",
      sourcePort: 70000,
      targetPort: 80,
    }),
  );
});
test("PAT inverso conserva la IP remota y aplica firewall en cada frontera", () => {
  const cases = JSON.parse(
    fs.readFileSync(
      new URL(
        "../../backend/src/test/resources/pat-return-cases.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const [i, c] of cases.entries()) {
    const scope = "inverse-" + i;
    const forward = runtime(c.network, scope, {
      action: "flow",
      source: "PC",
      target: "203.0.113.1",
      protocol: "UDP",
      sourcePort: 5000,
      targetPort: 53,
    });
    assert.equal(forward.result?.ok, true);
    const reply = runtime(c.network, scope, {
      action: "return",
      sessionId: "flow-1",
      source: "203.0.113.1",
      target: "203.0.113.2",
      protocol: "UDP",
      sourcePort: 53,
      targetPort: 40000,
    });
    assert.equal(reply.result?.ok, c.ok);
    if (c.ok)
      assert.deepEqual(reply.result?.path, [
        "Internet",
        "ASA",
        "Router",
        "Switch",
        "PC",
      ]);
    else assert.match(reply.result?.message ?? "", /firewall/);
  }
});
