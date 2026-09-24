import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  outputDir: "build/browser",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5187", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm dev --port 5187 --strictPort",
    url: "http://127.0.0.1:5187",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
      },
    },
    {
      name: "touch",
      use: {
        ...devices["Pixel 7"],
        channel: process.env.CI ? undefined : "chrome",
      },
    },
  ],
});
