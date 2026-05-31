/**
 * Playwright config for deterministic SDK visual baselines.
 *
 * Run order:
 *
 *   pnpm --filter @dreamboard/ui-sdk run storybook:build
 *   pnpm --filter @dreamboard/ui-sdk exec playwright test \
 *     --config .storybook/visual-runner.config.ts
 *
 * Baselines live alongside each test under `__screenshots__/`. CI fails when a
 * baseline drifts. Approve a regression by re-running with
 * `PLAYWRIGHT_UPDATE_SNAPSHOTS=1`.
 */

import { defineConfig, devices } from "playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STORYBOOK_PORT = Number(process.env.STORYBOOK_PORT ?? 6006);
const STORYBOOK_URL =
  process.env.STORYBOOK_URL ?? `http://127.0.0.1:${STORYBOOK_PORT}`;

// `defineConfig` resolves `testDir` relative to the config file, but we want
// `pnpm storybook:test:visual` to work from anywhere. Pin the dir to the
// package-relative `visual/` folder using the config file's own location.
const configDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(configDir, "..");

export default defineConfig({
  testDir: path.join(packageDir, "visual"),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      animations: "disabled",
    },
  },
  use: {
    baseURL: STORYBOOK_URL,
    trace: "retain-on-failure",
    colorScheme: "light",
    deviceScaleFactor: 1,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "phonePortrait",
      use: {
        ...devices["iPhone 13"],
        isMobile: true,
        hasTouch: true,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "tabletPortrait",
      use: {
        ...devices["iPad (gen 7)"],
        viewport: { width: 820, height: 1180 },
      },
    },
  ],
  webServer: process.env.STORYBOOK_URL
    ? undefined
    : {
        command: "npx http-server storybook-static -p 6006 -s",
        cwd: packageDir,
        port: STORYBOOK_PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
