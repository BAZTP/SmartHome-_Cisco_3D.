import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { demo } from "../src/network";
import { defaultDesign } from "../src/design";
test("TTL, edición gráfica, habitaciones y cámara persisten", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  const design = defaultDesign();
  design.quality = "balanced";
  await page.getByLabel("Importar proyecto").setInputFiles({
    name: "design.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        view: "Isométrica",
        walls: true,
        selected: "Sala",
        network: demo(),
        design,
      }),
    ),
  });
  await expect(page.getByLabel("Estado del proyecto")).toContainText(
    "Proyecto importado",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page.getByLabel("Destino ping").fill("203.0.113.1");
  await page
    .getByRole("button", { name: "Traceroute virtual", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "ICMP Time Exceeded",
  );
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "3  203.0.113.1",
  );
  await page.getByText("Editar habitaciones", { exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar habitación", exact: true })
    .click();
  await expect(page.getByLabel("Estado de habitación")).toContainText(
    "contiene dispositivos",
  );
  await page.getByLabel("Espacio de habitación").selectOption("1");
  await page
    .getByRole("button", { name: "Eliminar habitación", exact: true })
    .click();
  await expect(page.getByLabel("Estado de habitación")).toContainText(
    "Habitación eliminada",
  );
  await page.getByLabel("Nombre de habitación").fill("Comedor familiar");
  await page
    .getByRole("button", { name: "Crear habitación", exact: true })
    .click();
  await expect(page.getByLabel("Estado de habitación")).toContainText(
    "Habitación actualizada",
  );
  await page
    .getByRole("button", { name: "Desconectar sl", exact: true })
    .click();
  await page.getByText("Abrir editor de topología", { exact: true }).click();
  const editor = page.getByLabel("Editor de topología", { exact: true });
  await editor.scrollIntoViewIfNeeded();
  const source = editor.locator(
    '.react-flow__node[data-id="Switch"] .react-flow__handle.source[data-handleid="2"]',
  );
  const target = editor.locator(
    '.react-flow__node[data-id="Laptop"] .react-flow__handle.target[data-handleid="0"]',
  );
  await expect(source).toBeVisible();
  const a = await source.boundingBox(),
    b = await target.boundingBox();
  if (!a || !b) throw Error("Puertos no visibles");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByLabel("Estado de topología")).toHaveText(
    "Enlace creado desde la topología",
  );
  const pc = editor.locator('.react-flow__node[data-id="PC"] strong');
  const box = await pc.boundingBox();
  if (!box) throw Error("Nodo no visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 95,
    box.y + box.height / 2 + 25,
    { steps: 12 },
  );
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Enfocar equipo en casa", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ocultar conexiones", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado del proyecto")).toContainText(
    "Guardado",
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar JSON", exact: true })
    .click();
  const path = await (await download).path();
  const saved = JSON.parse(fs.readFileSync(path!, "utf8"));
  expect(saved.design.topology.PC).toBeDefined();
  expect(saved.design.camera).not.toBeNull();
  expect(saved.network.links).toHaveLength(5);
  await page.reload();
  await page
    .getByRole("button", { name: "Cargar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Proyecto cargado",
  );
  await expect(
    page.locator(".left").getByRole("button", { name: /^Comedor familiar/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mostrar conexiones", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Calidad gráfica")).toHaveValue("balanced");
  const again = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar JSON", exact: true })
    .click();
  const restored = JSON.parse(
    fs.readFileSync((await (await again).path())!, "utf8"),
  );
  expect(restored.design).toEqual(saved.design);
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Respuesta ICMP",
  );
  expect(errors).toEqual([]);
});
test("iniciar y pausar tráfico virtual respeta una desconexión", async ({
  page,
}) => {
  await page.goto("./");
  const design = defaultDesign();
  design.quality = "balanced";
  await page.getByLabel("Importar proyecto").setInputFiles({
    name: "sim.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        view: "Superior",
        walls: false,
        selected: "Sala",
        network: demo(),
        design,
      }),
    ),
  });
  await expect(page.getByLabel("Estado del proyecto")).toContainText(
    "Proyecto importado",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByRole("button", { name: "Ejecutar simulación", exact: true })
    .click();
  await expect(page.getByLabel("Estado de simulación continua")).toContainText(
    "Respuesta ICMP",
    { timeout: 15000 },
  );
  await page
    .getByRole("button", { name: "Desconectar sl", exact: true })
    .click();
  await expect(page.getByLabel("Estado de simulación continua")).toContainText(
    "Sin enlace",
    { timeout: 15000 },
  );
  await page
    .getByRole("button", { name: "Pausar simulación", exact: true })
    .click();
  await expect(page.getByLabel("Estado de simulación continua")).toContainText(
    "Pausada",
  );
  const paused = await page
    .getByLabel("Estado de simulación continua")
    .textContent();
  await page.waitForTimeout(1500);
  await expect(page.getByLabel("Estado de simulación continua")).toHaveText(
    paused!,
  );
});
test("formularios de rutas, firewall y DHCP modifican el motor", async ({
  page,
}) => {
  await page.goto("./");
  const design = defaultDesign();
  design.quality = "balanced";
  await page
    .getByLabel("Importar proyecto")
    .setInputFiles({
      name: "services.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          view: "Superior",
          walls: false,
          selected: "Sala",
          network: demo(),
          design,
        }),
      ),
    });
  await expect(page.getByLabel("Estado del proyecto")).toContainText(
    "Proyecto importado",
  );
  await page.getByLabel("Dispositivo de red").selectOption("Router");
  await page
    .getByText("Interfaces, VLAN, gateway, rutas, DHCP y firewall", {
      exact: true,
    })
    .click();
  await page.getByText("Gateway y rutas estáticas", { exact: true }).click();
  await page.getByLabel("Red de ruta", { exact: true }).fill("10.20.0.0");
  await page.getByLabel("Prefijo de ruta", { exact: true }).fill("24");
  await page
    .getByLabel("Siguiente salto de ruta", { exact: true })
    .fill("192.168.254.1");
  await page.getByRole("button", { name: "Agregar ruta", exact: true }).click();
  await expect(
    page.getByLabel("Rutas estáticas", { exact: true }),
  ).toContainText("10.20.0.0/24");
  await page
    .getByRole("button", { name: "Eliminar ruta 2", exact: true })
    .click();
  await expect(
    page.getByLabel("Rutas estáticas", { exact: true }),
  ).not.toContainText("10.20.0.0/24");
  await page.getByText("Servidor DHCP", { exact: true }).click();
  await page
    .getByRole("button", { name: "Activar pool DHCP", exact: true })
    .click();
  await expect(page.getByLabel("Estado de servicios")).toHaveText(
    "Servicios de red actualizados",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByRole("button", { name: "Solicitar DHCP", exact: true })
    .click();
  await expect(page.getByLabel("IPv4", { exact: true })).toHaveValue(
    "192.168.1.150",
  );
  await page.getByText("Reglas de firewall", { exact: true }).click();
  await page
    .getByLabel("Destino de regla", { exact: true })
    .fill("192.168.1.102");
  await page
    .getByRole("button", { name: "Agregar regla", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Bloqueado por firewall",
  );
  await page
    .getByRole("button", { name: "Eliminar regla 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Respuesta ICMP",
  );
});
