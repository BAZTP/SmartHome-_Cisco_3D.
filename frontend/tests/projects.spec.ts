import { test, expect } from "@playwright/test";
const demoId = "00000000-0000-0000-0000-000000000001";
test("proyectos independientes, CLI guarda el activo, renombrado y eliminación", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByText("Mis proyectos", { exact: true }).click();
  await expect(page.getByLabel("Proyecto activo")).toHaveValue(demoId);
  await page
    .getByLabel("Nombre del proyecto")
    .fill("Laboratorio independiente");
  await page
    .getByRole("button", { name: "Nuevo proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto creado",
  );
  const id = await page.getByLabel("Proyecto activo").inputValue();
  expect(id).not.toBe(demoId);
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await page.getByLabel("Nombre del dispositivo").fill("Equipo exclusivo");
  for (const command of ["enable", "write memory"]) {
    await page.getByLabel("Comando CLI").fill(command);
    await page
      .getByRole("button", { name: "Enviar comando", exact: true })
      .click();
    await expect(page.getByLabel("Comando CLI")).toHaveValue("");
  }
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Configuración guardada",
  );
  // Reload before switching to ensure the CLI really saved this project.
  await page.reload();
  await page.getByText("Mis proyectos", { exact: true }).click();
  await page.getByLabel("Proyecto activo").selectOption(id);
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto abierto; cambios anteriores guardados",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await expect(page.getByLabel("Nombre del dispositivo")).toHaveValue(
    "Equipo exclusivo",
  );
  await page.getByLabel("Nombre del proyecto").fill("Laboratorio renombrado");
  await page
    .getByRole("button", { name: "Renombrar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto renombrado",
  );
  await page.getByLabel("Proyecto activo").selectOption(demoId);
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto abierto; cambios anteriores guardados",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await expect(page.getByLabel("Nombre del dispositivo")).not.toHaveValue(
    "Equipo exclusivo",
  );
  await page.getByLabel("Proyecto activo").selectOption(id);
  await expect(page.getByLabel("Nombre del proyecto")).toHaveValue(
    "Laboratorio renombrado",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Eliminar proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto eliminado",
  );
  await expect(
    page.getByLabel("Proyecto activo").locator(`option[value="${id}"]`),
  ).toHaveCount(0);
});
