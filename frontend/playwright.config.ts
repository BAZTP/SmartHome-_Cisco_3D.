import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 60000, // Software WebGL initialization on the cloud runner can exceed five seconds.
  testDir: "./tests",
  testIgnore: ["**/pages.spec.ts", "**/network.test.ts"],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
});
