import { test, expect } from "@playwright/test";
test("escena 3D, selección, cámaras y paneles", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(
    "API y PostgreSQL conectados",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .evaluate((c: HTMLCanvasElement) => Boolean(c.getContext("webgl2"))),
    )
    .toBeTruthy();
  await page.locator(".left").getByRole("button", { name: "Oficina" }).click();
  await expect(page.getByRole("heading", { name: "Oficina" })).toBeVisible();
  await page
    .getByRole("button", { name: "Seleccionar Cocina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Cocina", exact: true }),
  ).toBeVisible();
  for (const view of ["Superior", "Interior", "Isométrica"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(page.locator("dd").first()).toHaveText(view);
  }
  await page.getByRole("button", { name: "Ocultar paredes" }).click();
  await expect(page.locator("dd").nth(1)).toHaveText("Ocultas");
  await page.getByRole("button", { name: "Mostrar paredes" }).click();
  const canvas = page.locator("canvas");
  const rect = await canvas.boundingBox();
  if (!rect) throw Error("canvas missing");
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width / 2 + 80,
    rect.y + rect.height / 2 + 30,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.mouse.wheel(0, 100);
  await page.getByRole("button", { name: "Alternar panel izquierdo" }).click();
  await expect(page.locator(".left")).toHaveCount(0);
  await page.getByRole("button", { name: "Alternar panel izquierdo" }).click();
  await expect(page.locator(".left")).toBeVisible();
  await page.screenshot({ path: "/tmp/smarthome-desktop.png" });
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("muestra fallo de API y permite recuperar la conexión", async ({
  page,
}) => {
  await page.route("**/api/projects", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Backend sin conexión");
  await page.unroute("**/api/projects");
  await page.getByRole("button", { name: "Comprobar backend" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "API y PostgreSQL conectados",
  );
});

test("edición local guarda y recupera la escena en PostgreSQL", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(
    "API y PostgreSQL conectados",
  );
  await page.locator(".left").getByRole("button", { name: "Oficina" }).click();
  await page.getByRole("button", { name: "Superior", exact: true }).click();
  await page.getByRole("button", { name: "Guardar proyecto" }).click();
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Guardado en PostgreSQL",
  );
  await page.reload();
  await page.getByRole("button", { name: "Cargar proyecto" }).click();
  await expect(page.getByLabel("Estado del proyecto")).toHaveText(
    "Proyecto cargado",
  );
  await expect(page.locator("dd").first()).toHaveText("Superior");
  await expect(page.getByRole("heading", { name: "Oficina" })).toBeVisible();
});
