import fs from "node:fs";
const positions = new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0]);
const bytes = Buffer.from(positions.buffer);
const doc = {
  asset: { version: "2.0", generator: "SmartHome test fixture" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
  materials: [
    {
      pbrMetallicRoughness: {
        baseColorFactor: [0.1, 0.8, 0.9, 1],
        metallicFactor: 0,
        roughnessFactor: 0.8,
      },
      doubleSided: true,
    },
  ],
  buffers: [
    {
      byteLength: bytes.length,
      uri: "data:application/octet-stream;base64," + bytes.toString("base64"),
    },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: bytes.length, target: 34962 },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 3,
      type: "VEC3",
      min: [-0.5, 0, 0],
      max: [0.5, 1, 0],
    },
  ],
};
fs.writeFileSync(
  new URL("./fixtures/triangle.gltf", import.meta.url),
  JSON.stringify(doc),
);
const glbDoc = { ...doc, buffers: [{ byteLength: bytes.length }] };
let json = Buffer.from(JSON.stringify(glbDoc));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const bin = Buffer.concat([bytes, Buffer.alloc((4 - (bytes.length % 4)) % 4)]);
const glb = Buffer.alloc(12 + 8 + json.length + 8 + bin.length);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(json.length, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
json.copy(glb, 20);
glb.writeUInt32LE(bin.length, 20 + json.length);
glb.writeUInt32LE(0x004e4942, 24 + json.length);
bin.copy(glb, 28 + json.length);
fs.writeFileSync(new URL("./fixtures/triangle.glb", import.meta.url), glb);
const assets = {
  gltf: {
    name: "triangle.gltf",
    format: "gltf",
    data: Buffer.from(JSON.stringify(doc)).toString("base64"),
  },
  glb: { name: "triangle.glb", format: "glb", data: glb.toString("base64") },
};
fs.writeFileSync(
  new URL(
    "../../backend/src/test/resources/model-assets.json",
    import.meta.url,
  ),
  JSON.stringify(assets, null, 2),
);
