import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:4181", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } },
    },
    {
      name: "touch",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: "pnpm dev --port 4181",
    url: "http://127.0.0.1:4181",
    reuseExistingServer: !process.env.CI,
  },
});
