import { test, expect } from "@playwright/test";
import { demo } from "../src/network";
const scene = (network: ReturnType<typeof demo>) => ({
  version: 1,
  view: "Isométrica",
  walls: true,
  selected: "Sala",
  network,
});
async function importNetwork(page: any, n: ReturnType<typeof demo>) {
  await page.getByLabel("Importar proyecto").setInputFiles({
    name: "test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(scene(n))),
  });
  await expect(
    page.getByText("Proyecto importado; pulsa Guardar para conservarlo", {
      exact: true,
    }),
  ).toBeVisible();
}
test("interfaces, CLI Java, persistencia y WebSocket", async ({ page }) => {
  const frames: { bytes: number }[] = [];
  page.on("websocket", (ws) =>
    ws.on("framereceived", (event) => {
      try {
        frames.push(JSON.parse(String(event.payload)));
      } catch {}
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("WebSocket conectado", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await importNetwork(page, demo());
  await page.getByLabel("Dispositivo de red").selectOption("Switch");
  for (const command of [
    "enable",
    "configure terminal",
    "interface eth1",
    "shutdown",
    "end",
    "write memory",
  ]) {
    await page.getByLabel("Comando CLI").fill(command);
    await page
      .getByRole("button", { name: "Enviar comando", exact: true })
      .click();
    await expect(page.getByLabel("Comando CLI")).toHaveValue("");
  }
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Configuración guardada",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Interfaz o dispositivo apagado",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Cargar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Proyecto cargado",
  );
  await page.getByLabel("Dispositivo de red").selectOption("Switch");
  await page
    .getByText("Interfaces, VLAN, gateway, rutas, DHCP y firewall", {
      exact: true,
    })
    .click();
  await page.getByLabel("Interfaz de configuración").selectOption("1");
  await expect(
    page.getByLabel("Interfaz activa", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Interfaz activa", { exact: true }).check();
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Respuesta ICMP",
  );
  await expect.poll(() => frames.some((f) => f.bytes === 64)).toBe(true);
  await page.getByLabel("Comando CLI").fill("ping 192.168.1.102");
  await page
    .getByRole("button", { name: "Enviar comando", exact: true })
    .click();
  await expect(page.getByLabel("Comando CLI")).toHaveValue("");
  await page
    .getByRole("button", { name: "Siguiente salto", exact: true })
    .click();
  await expect(page.getByText(/Salto 2\/3/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar eventos CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("simulacion-eventos.csv");
});
test("cámara renderizada, movimiento virtual y bombilla conectada", async ({
  page,
}) => {
  const n = demo();
  for (const [id, kind, port] of [
    ["Camera", "Cámara IP", 3],
    ["Bulb", "Bombilla IoT", 4],
  ] as const) {
    n.devices.push({
      ...n.devices[2],
      id,
      name: id,
      kind,
      room: 2,
      ip: id === "Camera" ? "192.168.1.120" : "192.168.1.121",
    });
    n.links.push({ id, a: "Switch", ap: port, b: id, bp: 0 });
  }
  await page.goto("/");
  await importNetwork(page, n);
  await page.getByLabel("Dispositivo de red").selectOption("Camera");
  const before = await page.locator("canvas").screenshot();
  await page
    .getByRole("button", { name: "Vista de cámara virtual", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salir de cámara", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  const after = await page.locator("canvas").screenshot();
  expect(after.equals(before)).toBe(false);
  await page
    .getByRole("button", { name: "Simular movimiento", exact: true })
    .click();
  await expect(page.getByText(/Movimiento virtual generado/)).toBeVisible();
  await page
    .getByRole("button", { name: "Apagar dispositivo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salir de cámara", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Dispositivo de red").selectOption("Bulb");
  await page
    .getByRole("button", { name: "Alternar bombilla virtual", exact: true })
    .click();
  await page
    .getByText("Interfaces, VLAN, gateway, rutas, DHCP y firewall", {
      exact: true,
    })
    .click();
  expect(
    JSON.parse(await page.getByLabel("Configuración de red").inputValue())
      .light,
  ).toBe(true);
  await page
    .getByRole("button", { name: "Desconectar Bulb", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Alternar bombilla virtual", exact: true })
    .click();
  await expect(page.getByText(/Bombilla sin conectividad/)).toBeVisible();
});
test("arrastre 3D mueve el equipo y no pierde su selección", async ({
  page,
}) => {
  const n = demo();
  n.devices.find((d) => d.id === "PC")!.room = 7;
  n.devices.find((d) => d.id === "PC")!.z = -1;
  await page.goto("/");
  await importNetwork(page, n);
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await expect(
    page.getByRole("combobox", { name: "Habitación", exact: true }),
  ).toHaveValue("7");
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator("canvas").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const tag = page.locator(".device-tag").filter({ hasText: /^PC$/ });
  await expect(tag).toBeVisible();
  const rect = await tag.boundingBox();
  if (!rect) throw Error("Etiqueta ausente");
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 45, y - 15, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByLabel("Posición X", { exact: true })).not.toHaveValue(
    "0",
  );
  await expect(page.getByLabel("Dispositivo de red")).toHaveValue("PC");
});
