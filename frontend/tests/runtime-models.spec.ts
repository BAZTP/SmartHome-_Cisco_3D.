import { test, expect } from "@playwright/test";
import { demo } from "../src/network";
import { configuration } from "../src/advanced";
import fs from "node:fs";
const network = () => {
  const n = demo();
  const asa = n.devices.find((d) => d.id === "ASA")!;
  asa.config = configuration(asa);
  asa.config.nat = false;
  return n;
};
async function fresh(page: any) {
  await page.goto("./");
  await page.getByLabel("Importar proyecto").setInputFiles({
    name: "network.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        view: "Isométrica",
        walls: true,
        selected: "Sala",
        network: network(),
      }),
    ),
  });
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Proyecto importado; pulsa Guardar para conservarlo",
  );
}
test("ARP/MAC, CLI y sesiones PAT con respuesta y caducidad", async ({
  page,
}) => {
  await fresh(page);
  await page.getByLabel("Dispositivo de red").selectOption("ASA");
  await page
    .getByText("Interfaces, VLAN, gateway, rutas, DHCP y firewall", {
      exact: true,
    })
    .click();
  await page.getByLabel("NAT/PAT de salida", { exact: true }).check();
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Respuesta ICMP",
  );
  await page.getByLabel("Comando CLI").fill("show arp");
  await page
    .getByRole("button", { name: "Enviar comando", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "192.168.1.102",
  );
  await page.getByLabel("Dispositivo de red").selectOption("Switch");
  await page.getByLabel("Comando CLI").fill("show mac address-table");
  await page
    .getByRole("button", { name: "Enviar comando", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    /"vlan"\s*:\s*1/,
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByText("ARP, tabla MAC y sesiones PAT", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Vaciar tablas y sesiones", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de tablas")).toHaveText(
    "Tablas actualizadas",
  );
  await page.getByLabel("Protocolo de flujo").selectOption("UDP");
  await page
    .getByRole("button", { name: "Enviar flujo virtual", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de tablas")).toContainText(
    "Flujo UDP virtual entregado",
  );
  await page.getByLabel("Dispositivo de red").selectOption("ASA");
  await page
    .getByRole("button", { name: "Consultar tablas", exact: true })
    .click();
  await expect(page.getByLabel("Tabla PAT")).toContainText("203.0.113.2:40000");
  await page.getByLabel("Sesión PAT").selectOption({ index: 1 });
  await page.getByLabel("Puerto público de respuesta").fill("40001");
  await page
    .getByRole("button", { name: "Enviar respuesta virtual", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de tablas")).toContainText(
    "Respuesta rechazada",
  );
  await page.getByLabel("Puerto público de respuesta").fill("40000");
  await page
    .getByRole("button", { name: "Enviar respuesta virtual", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de tablas")).toContainText(
    "Respuesta PAT entregada",
  );
  await page
    .getByRole("button", { name: "Avanzar 60 segundos", exact: true })
    .click();
  await expect(page.getByLabel("Tabla PAT")).toHaveText("Sin traducciones PAT");
});
test("importa GLTF y GLB, conserva el modelo al guardar y rechaza recursos externos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await fresh(page);
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page.getByText("Modelos GLB / GLTF", { exact: true }).click();
  for (const format of ["gltf", "glb"]) {
    await page.getByLabel("Importar modelo 3D").setInputFiles({
      name: "triangle." + format,
      mimeType: "application/octet-stream",
      buffer: fs.readFileSync(
        new URL("./fixtures/triangle." + format, import.meta.url),
      ),
    });
    await expect(page.getByLabel("Estado del modelo")).toHaveText(
      "Modelo importado; guarda el proyecto para conservarlo",
    );
    await expect(page.getByLabel("Modelo asignado")).toHaveText(
      "triangle." + format,
    );
  }
  await page
    .getByRole("button", { name: "Guardar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado del proyecto")).toContainText(
    "Guardado",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Cargar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Proyecto cargado",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page.getByText("Modelos GLB / GLTF", { exact: true }).click();
  await expect(page.getByLabel("Modelo asignado")).toHaveText("triangle.glb");
  const json = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/triangle.gltf", import.meta.url),
      "utf8",
    ),
  );
  json.buffers[0].uri = "https://example.invalid/asset.bin";
  await page.getByLabel("Importar modelo 3D").setInputFiles({
    name: "external.gltf",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(json)),
  });
  await expect(page.getByLabel("Estado del modelo")).toContainText(
    "URLs externas",
  );
  await expect(page.getByLabel("Modelo asignado")).toHaveText("triangle.glb");
  expect(errors).toEqual([]);
});
