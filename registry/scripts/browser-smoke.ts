import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const root = fileURLToPath(new URL("..", import.meta.url));
const server = spawn(
  process.execPath,
  [
    `${root}/node_modules/vite/bin/vite.js`,
    "preview",
    "--outDir",
    "build/storybook",
    "--host",
    "127.0.0.1",
    "--port",
    "6008",
    "--strictPort",
  ],
  { cwd: root, stdio: "pipe" },
);
const base = "http://127.0.0.1:6008";
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(`${base}/index.json`)).ok) break;
    } catch {
      /* Wait for local preview startup. */
    }
    if (attempt >= 100) throw new Error("Storybook preview failed to start");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch(process.env.CI ? {} : { channel: "chrome" });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const index = (await (await fetch(`${base}/index.json`)).json()) as {
    entries: Record<string, { id: string; type: string }>;
  };
  const stories = Object.values(index.entries).filter(
    (entry) => entry.type === "story",
  );
  await mkdir(`${root}/build/screenshots`, { recursive: true });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    for (const story of stories) {
      await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story`);
      await expect(page.locator("#storybook-root > *").first()).toBeVisible();
      await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
      if (story.id.endsWith("composed-selection")) {
        const button = page.getByRole("button", {
          name: "Select ace of hearts",
        });
        await button.focus();
        await page.keyboard.press("Space");
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await page.keyboard.press("Enter");
        await expect(button).toHaveAttribute("aria-pressed", "false");
      }
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      );
      if (!fits)
        throw new Error(`Horizontal overflow: ${story.id} at ${width}px`);
      await page.screenshot({
        path: `${root}/build/screenshots/${story.id}-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
  console.log(
    `Rendered ${stories.length} stories at desktop/mobile widths; keyboard composition and overflow checks passed.`,
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
