import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateModel, validateModels } from "../src/models.ts";
const assets = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../backend/src/test/resources/model-assets.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
test("GLB y GLTF autocontenidos se conservan y asignan a equipos existentes", () => {
  for (const asset of Object.values(assets) as any[])
    assert.ok(validateModel(asset).length);
  const library = { assets, devices: { PC: "glb", Laptop: "gltf" } };
  assert.deepEqual(validateModels(library, ["PC", "Laptop"]), library);
  assert.throws(() => validateModels(library, ["PC"]));
});
test("rechaza recursos externos, GLB truncado y jerarquías cíclicas", () => {
  const doc = JSON.parse(atob(assets.gltf.data));
  doc.buffers[0].uri = "https://example.invalid/model.bin";
  assert.throws(
    () => validateModel({ ...assets.gltf, data: btoa(JSON.stringify(doc)) }),
    /externas/,
  );
  assert.throws(() =>
    validateModel({ ...assets.glb, data: assets.glb.data.slice(0, 24) }),
  );
  doc.buffers[0].uri = "data:application/octet-stream;base64,AAAA";
  doc.nodes[0].children = [0];
  assert.throws(
    () => validateModel({ ...assets.gltf, data: btoa(JSON.stringify(doc)) }),
    /Jerarquía/,
  );
});
