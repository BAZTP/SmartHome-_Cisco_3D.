import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({
  ...config,
  testIgnore: [],
  testMatch: [
    "**/pages.spec.ts",
    "**/projects.spec.ts",
    "**/projects-migration.spec.ts",
    "**/runtime-models.spec.ts",
  ],
  outputDir: "test-results/pages",
  use: {
    ...config.use,
    baseURL: "http://127.0.0.1:4173/SmartHome-_Cisco_3D./",
  },
});
