/**
 * Playwright config for deterministic SDK visual baselines.
 *
 * Run order:
 *
 *   pnpm --filter @dreamboard-games/sdk run storybook:build
 *   pnpm --filter @dreamboard-games/sdk exec playwright test \
 *     --config .storybook/visual-runner.config.ts
 *
 * Baselines live alongside each test under `__screenshots__/`. CI fails when a
 * baseline drifts. Approve a regression by re-running with
 * `PLAYWRIGHT_UPDATE_SNAPSHOTS=1`.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

import {
  deterministicBrowserUse,
  deterministicViewportProjects,
} from "../test-support/deterministic-browser.js";

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
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFileName}/{projectName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.025,
      animations: "disabled",
    },
  },
  use: {
    baseURL: STORYBOOK_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...deterministicBrowserUse,
  },
  projects: deterministicViewportProjects.map((project) => ({
    name: project.name,
    use: {
      ...(project.name === "desktop"
        ? devices["Desktop Chrome"]
        : project.name === "phonePortrait"
          ? devices["iPhone 13"]
          : devices["iPad (gen 7)"]),
      viewport: project.viewport,
      hasTouch: "hasTouch" in project ? project.hasTouch : undefined,
      isMobile: "isMobile" in project ? project.isMobile : undefined,
    },
  })),
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
