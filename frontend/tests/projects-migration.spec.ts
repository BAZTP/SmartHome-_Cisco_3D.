import { test, expect } from "@playwright/test";
import { demo } from "../src/network";
test("Pages migra la escena v1 sin perder datos ni sobrescribirla al abrir otro proyecto", async ({
  page,
}) => {
  const network = demo();
  network.devices[2].name = "PC anterior";
  network.devices[2].x = 1.2;
  await page.route("**/*?seed=1", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Migration fixture</title>",
    }),
  );
  await page.goto("./?seed=1");
  await page.evaluate(
    ({ network }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("smarthome-cisco-3d", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("projects");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").put(
            {
              version: 1,
              view: "Superior",
              walls: false,
              selected: "Oficina",
              network,
            },
            "00000000-0000-0000-0000-000000000001",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { network },
  );
  await page.unroute("**/*?seed=1");
  await page.goto("./");
  await page.getByText("Mis proyectos", { exact: true }).click();
  await expect(page.getByLabel("Proyecto activo")).toBeEnabled();
  // Creating another project from an untouched initial view must preserve the older saved scene.
  await page.getByLabel("Nombre del proyecto").fill("Nueva sin sobrescribir");
  await page
    .getByRole("button", { name: "Nuevo proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto creado",
  );
  await page
    .getByLabel("Proyecto activo")
    .selectOption("00000000-0000-0000-0000-000000000001");
  await expect(page.getByLabel("Estado de proyectos")).toHaveText(
    "Proyecto abierto; cambios anteriores guardados",
  );
  await page.getByLabel("Dispositivo de red").selectOption("PC");
  await expect(page.getByLabel("Nombre del dispositivo")).toHaveValue(
    "PC anterior",
  );
  await expect(page.getByLabel("Posición X", { exact: true })).toHaveValue(
    "1.2",
  );
  await expect(page.locator("dd").first()).toHaveText("Superior");
});
