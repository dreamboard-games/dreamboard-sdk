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
  const errors: string[] = [];
  const index = (await (await fetch(`${base}/index.json`)).json()) as {
    entries: Record<string, { id: string; type: string }>;
  };
  const stories = Object.values(index.entries).filter(
    (entry) => entry.type === "story",
  );
  await mkdir(`${root}/build/screenshots`, { recursive: true });
  for (const width of [390, 1280]) {
    const page = await browser.newPage({
      viewport: { width, height: 850 },
      hasTouch: width === 390,
      isMobile: width === 390,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    for (const story of stories) {
      await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story`);
      await expect(page.locator("#storybook-root > *").first()).toBeVisible();
      await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
      if (story.id.startsWith("actual-scenarios--")) {
        await expect(page.getByTestId("scenario-view")).toBeAttached();
        const phases: Record<string, string> = {
          "hearts-passing": "passing",
          "hearts-opening": "passing",
          "hearts-sealed-pass": "passing",
          "hearts-first-trick": "playing",
          "hearts-mid-hand": "playing",
          "hearts-developed": "playing",
          "hearts-game-over": "gameOver",
          "hex-bandits-checkpoint": "moveBandits",
          "hex-setup-targets": "setupCamp",
          "hex-opening": "setupCamp",
          "resource-partial-draft": "play",
          "hex-discard": "discardBarrier",
          "hex-production": "main",
          "hex-growing-network": "main",
          "hex-developed": "main",
          "hex-game-over": "gameOver",
          "hex-depot": "main",
          "hex-trade": "pendingTrade",
        };
        const expected = phases[story.id.replace("actual-scenarios--", "")];
        expect(expected).toBeDefined();
        await expect(page.getByRole("heading", { level: 2 })).toHaveText(
          expected!,
        );
        await expect(page.getByRole("alert")).toHaveCount(0);
      }
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
      if (story.id.endsWith("consumer-composition")) {
        const card = page.getByTestId("utility-card");
        await expect(card).toHaveCSS("width", "180px");
        await expect(card).toHaveCSS("border-radius", "0px");
        await expect(card).toHaveCSS("box-shadow", "none");
        for (const kind of ["hex", "square"]) {
          const overlay = page.getByTestId(`${kind}-overlay`);
          await expect(overlay).toHaveCSS("fill", "rgb(255, 165, 0)");
          await expect(overlay).toHaveCSS("stroke", "rgb(128, 0, 128)");
          await expect(overlay).toHaveCSS("stroke-width", "7px");
          const label = page.getByTestId(`${kind}-label`);
          await expect(label).toHaveCSS("fill", "rgb(255, 0, 0)");
          await expect(label).toHaveCSS("font-family", "monospace");
          await expect(label).toHaveCSS("font-size", "18px");
          await expect(label).toHaveCSS("pointer-events", "all");
        }
      }
      if (story.id.endsWith("hearts-passing")) {
        await expect(
          page.getByRole("heading", { name: "passing", exact: true }),
        ).toBeVisible();
        const card = page.locator(".db-hand button:not(:disabled)").first();
        await card.focus();
        await page.keyboard.press("Space");
        await expect(card).toHaveAttribute("aria-pressed", "true");
      }
      if (story.id.endsWith("hex-bandits-checkpoint")) {
        const svg = page.getByRole("group", { name: "Board", exact: true });
        await expect(svg).toBeVisible();
        const bounds = (await svg.boundingBox())!;
        const cursor = {
          x: bounds.x + bounds.width * 0.53,
          y: bounds.y + bounds.height * 0.43,
        };
        const local = await svg.evaluate((element, cursor) => {
          const svg = element as SVGSVGElement;
          const point = svg.createSVGPoint();
          point.x = cursor.x;
          point.y = cursor.y;
          const local = point.matrixTransform(
            svg.querySelector("g")!.getScreenCTM()!.inverse(),
          );
          return { x: local.x, y: local.y };
        }, cursor);
        const group = svg.locator(":scope > g");
        const before = await group.getAttribute("transform");
        const scroll = await page.evaluate(() => scrollY);
        await page.mouse.move(cursor.x, cursor.y);
        await page.mouse.wheel(0, -100);
        await expect(group).not.toHaveAttribute("transform", before!);
        const screen = () =>
          svg.evaluate((element, local) => {
            const svg = element as SVGSVGElement;
            const point = svg.createSVGPoint();
            point.x = local.x;
            point.y = local.y;
            const screen = point.matrixTransform(
              svg.querySelector("g")!.getScreenCTM()!,
            );
            return { x: screen.x, y: screen.y };
          }, local);
        const anchored = await screen();
        expect(Math.abs(anchored.x - cursor.x)).toBeLessThan(1);
        expect(Math.abs(anchored.y - cursor.y)).toBeLessThan(1);
        expect(await page.evaluate(() => scrollY)).toBe(scroll);
        await page.mouse.move(bounds.x + 2, bounds.y + 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + 42, bounds.y + 27, { steps: 3 });
        await page.mouse.up();
        const moved = await screen();
        expect(Math.abs(moved.x - anchored.x - 40)).toBeLessThan(1);
        expect(Math.abs(moved.y - anchored.y - 25)).toBeLessThan(1);
      }
      if (story.id.endsWith("resource-partial-draft")) {
        const wood = page.locator('[data-resource="wood"]');
        const stone = page.locator('[data-resource="stone"]');
        const submit = page.locator(
          '[data-action="submit"][data-interaction="play.pay"]',
        );
        await expect(wood).toBeVisible();
        await wood.fill("1");
        await expect(wood).toHaveValue("1");
        await expect(stone).toHaveValue("0");
        await expect(submit).toBeDisabled();
        await stone.fill("2");
        await expect(submit).toBeEnabled();
        await submit.click();
        await expect(submit).toBeEnabled();
        await expect(page.getByTestId("scenario-view")).toContainText(
          '"total":0',
        );
        await expect(stone).toHaveValue("2");
        await stone.fill("1");
        await submit.click();
        await expect(page.getByTestId("scenario-view")).toContainText(
          '"total":2',
        );
      }
      if (story.id.endsWith("hex-setup-targets")) {
        const hit = page.locator('[data-hit-area="vertex"]').first();
        await expect(hit).toBeVisible();
        const box = (await hit.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(23.9);
        expect(box.height).toBeGreaterThanOrEqual(23.9);
        const before = await page
          .getByRole("heading", { level: 2 })
          .textContent();
        const x = box.x + box.width / 2 + Math.min(10, box.width / 2 - 1);
        const y = box.y + box.height / 2;
        if (width === 390) await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
        await expect(page.getByRole("heading", { level: 2 })).not.toHaveText(
          before!,
        );
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
    await page.close();
  }
  expect(errors).toEqual([]);
  console.log(
    `Rendered ${stories.length} stories at desktop/mobile widths; keyboard composition and overflow checks passed.`,
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
