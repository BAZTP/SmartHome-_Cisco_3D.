import { test, expect } from "@playwright/test";
import { demo } from "../src/network";
test("monitoreo recibe solo el proyecto activo y recupera su historial", async ({
  page,
}) => {
  const frames: { projectId: string }[] = [];
  page.on("websocket", (ws) =>
    ws.on("framereceived", (event) =>
      frames.push(JSON.parse(String(event.payload))),
    ),
  );
  await page.goto("./");
  await page.getByText("Mis proyectos", { exact: true }).click();
  await page.getByLabel("Nombre del proyecto").fill("Historial separado");
  await page
    .getByRole("button", { name: "Nuevo proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto creado",
  );
  const id = await page.getByLabel("Proyecto activo").inputValue();
  await expect(
    page.getByText("WebSocket conectado", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Historial del proyecto")).toContainText(
    "0 eventos",
  );
  const response = await page.request.post("/api/simulation/ping", {
    data: {
      network: demo(),
      source: "PC",
      target: "192.168.1.102",
      projectId: "00000000-0000-0000-0000-000000000001",
    },
  });
  expect(response.ok()).toBe(true);
  await expect
    .poll(() =>
      frames.some(
        (e) => e.projectId === "00000000-0000-0000-0000-000000000001",
      ),
    )
    .toBe(true);
  await expect(page.getByLabel("Historial del proyecto")).toContainText(
    "0 eventos",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Historial del proyecto")).toContainText(
    "1 eventos del proyecto · 64 bytes",
  );
  await page.reload();
  await page.getByText("Mis proyectos", { exact: true }).click();
  await page.getByLabel("Proyecto activo").selectOption(id);
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto abierto; cambios anteriores guardados",
  );
  await expect(page.getByLabel("Historial del proyecto")).toContainText(
    "1 eventos del proyecto · 64 bytes",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Eliminar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto eliminado",
  );
});
