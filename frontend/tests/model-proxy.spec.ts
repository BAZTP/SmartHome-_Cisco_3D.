import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("guarda y recupera un modelo de más de 1 MiB a través del proxy local", async ({
  request,
}) => {
  const created = await request.post("/api/projects", {
    data: { name: "Large model proxy test" },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const project = "/api/projects/" + id;
  try {
    const gltf = JSON.parse(
      fs.readFileSync(
        new URL("./fixtures/triangle.gltf", import.meta.url),
        "utf8",
      ),
    );
    gltf.extras = { payload: "x".repeat(900000) };
    const asset = {
      name: "large.gltf",
      format: "gltf",
      data: Buffer.from(JSON.stringify(gltf)).toString("base64"),
    };
    const scene = {
      version: 1,
      view: "Superior",
      walls: true,
      selected: "Sala",
      network: {
        devices: [
          {
            id: "pc",
            name: "PC",
            kind: "PC",
            room: 0,
            x: 0,
            z: 0,
            rotation: 0,
            ip: "192.168.1.101",
            prefix: 24,
            on: true,
          },
        ],
        links: [],
      },
      models: { assets: { asset }, devices: { pc: "asset" } },
    };
    expect(Buffer.byteLength(JSON.stringify(scene))).toBeGreaterThan(
      1024 * 1024,
    );
    const saved = await request.put(project + "/scene", { data: scene });
    expect(saved.status(), await saved.text()).toBe(204);
    const loaded = await request.get(project + "/scene");
    expect(loaded.ok()).toBeTruthy();
    expect((await loaded.json()).models).toEqual(scene.models);
  } finally {
    expect((await request.delete(project)).ok()).toBeTruthy();
  }
});
