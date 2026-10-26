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
    "Demo estática · Sin backend ni persistencia",
  );
  await expect(
    page.getByRole("button", { name: "Demo GitHub Pages" }),
  ).toBeDisabled();
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .evaluate((c: HTMLCanvasElement) => Boolean(c.getContext("webgl2"))),
    )
    .toBeTruthy();
  await page.getByRole("button", { name: "Oficina" }).click();
  await expect(page.getByRole("heading", { name: "Oficina" })).toBeVisible();
  await page.getByRole("button", { name: "Superior", exact: true }).click();
  await expect(page.locator("dd").first()).toHaveText("Superior");
  await page.getByRole("button", { name: "Ocultar paredes" }).click();
  await expect(page.locator("dd").nth(1)).toHaveText("Ocultas");
  await page.goto("./#/");
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});
