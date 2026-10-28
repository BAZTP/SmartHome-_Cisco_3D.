import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: process.env.CI ? 120000 : 60000, // Software WebGL initialization on the cloud runner can exceed five seconds.
  testDir: "./tests",
  outputDir: "test-results/local",
  testIgnore: [
    "**/pages.spec.ts",
    "**/projects-migration.spec.ts",
    "**/network.test.ts",
    "**/advanced.test.ts",
    "**/runtime.test.ts",
    "**/models.test.ts",
    "**/traceroute.test.ts",
    "**/design.test.ts",
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_BUNDLED_CHROMIUM
        ? undefined
        : "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
});
