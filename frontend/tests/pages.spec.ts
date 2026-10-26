import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:4173/SmartHome-_Cisco_3D./" });
test("Pages funciona en la subruta del repositorio sin API", async ({
  page,
}) => {
  const errors: string[] = [];
  const apiRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/api/")) apiRequests.push(r.url());
  });
  await page.goto("./");
  await expect(page.getByRole("status")).toHaveText(
    "Versión Pages · Almacenamiento en este navegador",
  );
  await expect(
    page.getByRole("button", { name: "GitHub Pages · Sin servidor" }),
  ).toBeDisabled();
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(
      () =>
        page
          .locator("canvas")
          .evaluate((c: HTMLCanvasElement) => Boolean(c.getContext("webgl2"))),
      { timeout: 15000 },
    )
    .toBeTruthy();
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Respuesta ICMP",
  );
  await page
    .getByRole("button", { name: "Desconectar sl", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ejecutar ping", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "Sin enlace",
  );
  await page.getByLabel("Comando CLI").fill("show interfaces");
  await page
    .getByRole("button", { name: "Enviar comando", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de simulación")).toContainText(
    "192.168.1.101",
  );
  await page.locator(".left").getByRole("button", { name: "Oficina" }).click();
  await expect(page.getByRole("heading", { name: "Oficina" })).toBeVisible();
  await page.getByRole("button", { name: "Superior", exact: true }).click();
  await expect(page.locator("dd").first()).toHaveText("Superior");
  await page.getByRole("button", { name: "Ocultar paredes" }).click();
  await expect(page.locator("dd").nth(1)).toHaveText("Ocultas");
  await page.getByRole("button", { name: "Guardar proyecto" }).click();
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Guardado en este navegador",
  );
  await page.getByRole("button", { name: "Isométrica", exact: true }).click();
  await page.getByRole("button", { name: "Cargar proyecto" }).click();
  await expect(page.locator("dd").first()).toHaveText("Superior");
  await page.goto("./#/");
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Cargar proyecto" }).click();
  await expect(page.locator("dd").first()).toHaveText("Superior");
  await expect(page.getByRole("heading", { name: "Oficina" })).toBeVisible();
  await expect(page.locator("dd").nth(1)).toHaveText("Ocultas");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  expect((await download).suggestedFilename()).toBe("smarthome-project.json");
  await page.getByLabel("Importar proyecto").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Archivo de proyecto inválido o incompatible",
  );
  await page.getByLabel("Importar proyecto").setInputFiles({
    name: "project.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        view: "Interior",
        walls: true,
        selected: "Sala",
      }),
    ),
  });
  await expect(page.locator("dd").first()).toHaveText("Interior");
  await expect(page.getByRole("heading", { name: "Sala" })).toBeVisible();
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});
