import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultDesign, validateDesign } from "../src/design.ts";
import { demo } from "../src/network.ts";
test("diseño conserva habitaciones, posiciones lógicas y cámara", () => {
  const n = demo(),
    d = defaultDesign();
  d.rooms[0].name = "Estudio";
  d.topology.PC = { x: 120, y: 230 };
  d.camera = { position: [3, 7, 12], target: [0, 0, 0] };
  d.connections = false;
  d.quality = "balanced";
  assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(d)), n), d);
  const restored = validateDesign(d, n);
  restored.rooms[0].name = "Otro";
  assert.equal(d.rooms[0].name, "Estudio");
});
test("rechaza borrar habitaciones ocupadas, posiciones inválidas y cámaras sin dirección", () => {
  const n = demo();
  const missing = defaultDesign();
  missing.rooms = missing.rooms.filter((r) => r.id !== 0);
  assert.throws(() => validateDesign(missing, n), /dispositivos/);
  const duplicate = defaultDesign();
  duplicate.rooms[1].id = 0;
  assert.throws(() => validateDesign(duplicate, n));
  const duplicateName = defaultDesign();
  duplicateName.rooms[1].name = "Sala";
  assert.throws(() => validateDesign(duplicateName, n));
  const dangling = defaultDesign();
  dangling.topology.unknown = { x: 1, y: 2 };
  assert.throws(() => validateDesign(dangling, n));
  const bad = defaultDesign();
  bad.camera = { position: [0, 0, 0], target: [0, 0, 0] };
  assert.throws(() => validateDesign(bad, n));
  const empty = defaultDesign();
  empty.rooms = empty.rooms.filter((r) => r.id !== 1);
  assert.doesNotThrow(() => validateDesign(empty, n));
});
