import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { traceroute, formatTrace } from "../src/traceroute.ts";
import { execute } from "../src/cli.ts";
import { demo } from "../src/network.ts";
test("sondas TTL compartidas con Java: LAN, WAN, límite, desconexión y timeout", () => {
  const cases = JSON.parse(
    fs.readFileSync(
      new URL(
        "../../backend/src/test/resources/traceroute-cases.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const c of cases) {
    const r = traceroute(c.network, "PC", c.target, c.max);
    assert.equal(r.ok, c.ok, c.name);
    assert.deepEqual(
      r.probes?.map((p) => p.device),
      c.devices,
      c.name,
    );
    assert.deepEqual(
      r.probes?.map((p) => p.status),
      c.statuses,
      c.name,
    );
    assert.deepEqual(
      r.probes?.map((p) => p.ttl),
      c.devices.map((_: unknown, i: number) => i + 1),
    );
    assert.match(formatTrace(r), /TTL/);
  }
});
test("CLI muestra sondas y valida límite TTL", () => {
  const r = execute(
    demo(),
    "PC",
    { mode: "EXEC", port: 0 },
    "traceroute 203.0.113.1",
  );
  assert.match(r.output, /ICMP Time Exceeded/);
  assert.match(r.output, /3  203.0.113.1/);
  assert.throws(() => traceroute(demo(), "PC", "203.0.113.1", 0));
});
