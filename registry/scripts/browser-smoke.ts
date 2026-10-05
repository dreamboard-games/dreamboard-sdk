import { z } from "zod";
import { proveCardDrag } from "./card-drag-proof.ts";
import {
  proveDraw,
  proveDrawTouchActivation,
  proveHostDraw,
  proveReducedCardMotion,
} from "./draw-proof.ts";
import { proveCardControl } from "./card-control-proof.ts";
import { proveHand } from "./hand-proof.ts";
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
  for (const { name, width, height, touch } of [
    { name: "phone", width: 390, height: 844, touch: true },
    { name: "landscape", width: 844, height: 390, touch: true },
    { name: "desktop", width: 1280, height: 800, touch: false },
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
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
          "number-steppers": "play",
          "many-value-editors": "play",
          "player-board-targets": "play",
          "generic-board-spaces": "play",
          "card-drag-drop": "play",
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
          expected,
        );
        await expect(page.getByRole("alert")).toHaveCount(0);
        for (const control of await page
          .locator(
            '[data-slot="button"], [data-slot="input"], [data-slot="native-select"]',
          )
          .all()) {
          if (await control.isVisible()) {
            expect(
              (await control.boundingBox())!.height,
            ).toBeGreaterThanOrEqual(44);
          }
        }
      }
      if (story.id === "registry-primitives--controls") {
        const primary = page.getByRole("button", { name: "Primary action" });
        await expect(primary).toHaveCSS("height", "44px");
        await expect(primary).toHaveCSS("background-color", "rgb(35, 87, 106)");
        await expect(
          page.getByRole("button", { name: "Unavailable" }),
        ).toBeDisabled();
        await page.evaluate(() =>
          document.documentElement.classList.add("dark"),
        );
        await expect(primary).toHaveCSS(
          "background-color",
          "rgb(171, 213, 225)",
        );
        await page.evaluate(() =>
          document.documentElement.classList.remove("dark"),
        );
        await primary.focus();
        await expect(primary).toBeFocused();
        await page.getByRole("spinbutton", { name: "Quantity" }).fill("3");
        await expect(
          page.getByRole("spinbutton", { name: "Quantity" }),
        ).toHaveValue("3");
        await expect(page.getByRole("combobox", { name: "Seat" })).toHaveCSS(
          "height",
          "44px",
        );
      }
      if (story.id.endsWith("--image-cards")) {
        // A back with the game's art draws the image, not the plain pattern.
        const back = page.getByTestId("back-art");
        await expect(back).toHaveAccessibleName("Face-down card");
        await expect(back.locator("img")).toBeVisible();
        await expect(back).not.toHaveClass(/db-card-back/);
      }
      if (story.id.endsWith("--seats")) {
        const ada = page.getByRole("region", { name: "Ada Lovelace (you)" });
        await expect(ada).toHaveAttribute("data-active", "true");
        await expect(ada).toContainText("your turn");
        await expect(ada.locator(".db-seat-avatar")).toHaveText("AL");
        await expect(
          page.getByRole("region", { name: "Lin", exact: true }),
        ).toContainText("7 cards");
        await expect(page.locator("[data-player=sam]")).toContainText("1 card");
      }
      if (story.id.endsWith("--piles")) {
        const draw = page.getByRole("figure", { name: "Draw pile 18 cards" });
        await expect(draw.locator(".db-pile-edge")).toHaveCount(3);
        await expect(draw.locator(".db-pile-count")).toHaveText("18");
        const empty = page.getByRole("figure", { name: "Tricks empty" });
        await expect(empty).toHaveAttribute("data-empty", "true");
        await expect(empty.locator(".db-pile-count")).toHaveCount(0);
      }
      if (story.id.endsWith("--move-notice")) {
        const moves = page.getByRole("region", { name: "Moves" });
        const notices = moves.locator(".db-move-notice");
        await expect(notices).toHaveText(["Lin played the 7 of clubs"]);
        await expect(notices.first()).toHaveAttribute("data-seat", "2");
        await expect
          .poll(async () => {
            const box = (await notices.first().boundingBox())!;
            return Math.abs(box.x + box.width / 2 - width / 2);
          })
          .toBeLessThan(1);
        await page.getByRole("button", { name: "Sam draws" }).click();
        await expect(notices).toHaveCount(2);
        // Notices leave by themselves.
        await expect(notices).toHaveCount(0, { timeout: 6000 });
      }
      if (story.id.endsWith("--game-results")) {
        await expect(
          page.getByRole("heading", { name: "Ada and Lin tie" }),
        ).toBeVisible();
        await expect(
          page.getByRole("table", { name: "Final standings" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Play again" }),
        ).toBeVisible();
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
        await expect(card).toHaveCSS("--tw-shadow", "0 0 #0000");
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
      if (
        story.id.endsWith("player-board-targets") ||
        story.id.endsWith("generic-board-spaces")
      ) {
        const boardControl = story.id.endsWith("generic-board-spaces")
          ? "section button"
          : "svg";
        const own = page.locator(
          `${boardControl}[data-board="mat:player-1"][data-action="select"], ${boardControl} [data-board="mat:player-1"][data-action="select"]`,
        );
        const opponent = page.locator(
          `${boardControl}[data-board="mat:player-2"][data-action="select"], ${boardControl} [data-board="mat:player-2"][data-action="select"]`,
        );
        await own.focus();
        await page.keyboard.press("Enter");
        await expect(own).toHaveAttribute("aria-pressed", "true");
        await expect(opponent).toHaveAttribute("aria-pressed", "false");
        await opponent.click();
        await expect(opponent).toHaveAttribute("aria-pressed", "true");
        await page
          .locator('[data-action="submit"][data-interaction="play.choose"]')
          .click();
        await expect(page.getByTestId("scenario-view")).toContainText(
          '"selected":[{"boardId":"mat","playerId":"player-1","spaceId":"slot"},{"boardId":"mat","playerId":"player-2","spaceId":"slot"}]',
        );
      }
      // Gesture proofs run on a portrait phone and a desktop.
      if (story.id.endsWith("host-hands") && name !== "landscape")
        await proveHostDraw(page, touch);
      if (story.id.endsWith("card-drag-drop") && name !== "landscape")
        await proveCardDrag(page, touch);
      if (story.id.endsWith("fanned-hand") && name !== "landscape") {
        await proveCardControl(page, touch);
        await page.reload();
        await proveHand(page, touch);
        await page.reload();
        await proveDraw(page, touch, false);
        if (!touch) await proveReducedCardMotion(page);
      }
      if (story.id.endsWith("pending-draw") && name !== "landscape")
        await proveDraw(page, touch, true);
      if (story.id.endsWith("empty-hand") && name !== "landscape") {
        if (touch) await proveDrawTouchActivation(page);
        await proveDraw(page, touch, true, 0);
      }
      if (story.id.endsWith("hearts-passing")) {
        await expect(
          page.getByRole("heading", { name: "passing", exact: true }),
        ).toBeVisible();
        const card = page.locator(".db-hand button:not(:disabled)").first();
        await expect(card.locator("..")).not.toHaveAttribute(
          "aria-disabled",
          "true",
        );
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
      if (story.id.endsWith("number-steppers")) {
        const count = page.getByRole("spinbutton", {
          name: "Count",
          exact: true,
        });
        const increaseCount = page.getByRole("button", {
          name: "Increase Count",
        });
        const decreaseCount = page.getByRole("button", {
          name: "Decrease Count",
        });
        const fraction = page.getByRole("spinbutton", {
          name: "Fraction",
          exact: true,
        });
        const increaseFraction = page.getByRole("button", {
          name: "Increase Fraction",
        });
        const submit = page.locator('[data-action="submit"]');
        await expect(decreaseCount).toBeDisabled();
        for (const value of ["0", "2", "4", "4"]) {
          await increaseCount.click();
          await expect(count).toHaveValue(value);
        }
        for (const value of ["0.25", "0.5", "0.75", "0.75"]) {
          await increaseFraction.click();
          await expect(fraction).toHaveValue(value);
        }
        await fraction.fill("0.6");
        await expect(submit).toBeDisabled();
        await increaseFraction.click();
        await expect(fraction).toHaveValue("0.75");
        await page.getByRole("button", { name: "Decrease Fraction" }).click();
        await expect(fraction).toHaveValue("0.5");
        await count.fill("3");
        await expect(submit).toBeDisabled();
        await decreaseCount.click();
        await expect(count).toHaveValue("2");
        await expect(submit).toBeEnabled();
        await submit.click();
        await expect(page.getByTestId("scenario-view")).toContainText(
          '"total":2.5',
        );
      }
      if (story.id.endsWith("many-value-editors")) {
        await page
          .getByRole("button", { name: "Add value", exact: true })
          .click();
        await page.getByLabel("Counts 1", { exact: true }).fill("2");
        await page
          .getByRole("button", { name: "Add value", exact: true })
          .click();
        await page.getByLabel("Counts 2", { exact: true }).fill("4");
        await page.getByLabel("Counts 1", { exact: true }).fill("");
        await expect(page.getByTestId("scenario-drafts")).toHaveText(
          JSON.stringify({ "play.batch": { counts: [4] } }),
        );
        await expect(page.getByLabel("Counts 2", { exact: true })).toHaveCount(
          0,
        );
        await expect(page.getByLabel("Counts 1", { exact: true })).toHaveValue(
          "4",
        );
        await page.getByLabel("Counts 1", { exact: true }).fill("2");
        await page
          .getByRole("button", { name: "Add allocation", exact: true })
          .click();
        await page.locator('[data-resource="wood"]').fill("3");
        await expect(page.getByTestId("scenario-drafts")).toHaveText(
          JSON.stringify({
            "play.batch": { counts: [2], bags: [{ wood: 3 }] },
          }),
        );
        await page.locator('[data-action="submit"]').click();
        await expect
          .poll(
            async () =>
              z
                .object({ total: z.number() })
                .parse(
                  JSON.parse(
                    (await page.getByTestId("scenario-view").textContent()) ??
                      "{}",
                  ),
                ).total,
          )
          .toBe(5);
      }
      if (story.id.endsWith("resource-partial-draft")) {
        const wood = page.locator('[data-resource="wood"]');
        const stone = page.locator('[data-resource="stone"]');
        const submit = page.locator(
          '[data-action="submit"][data-interaction="play.pay"]',
        );
        await expect(wood).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Decrease Wood" }),
        ).toBeDisabled();
        await page.getByRole("button", { name: "Increase Wood" }).click();
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
        if (touch) await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
        await expect(page.getByRole("heading", { level: 2 })).not.toHaveText(
          before!,
        );
      }
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      );
      if (!fits) throw new Error(`Horizontal overflow: ${story.id} at ${name}`);
      await page.screenshot({
        path: `${root}/build/screenshots/${story.id}-${name}.png`,
        fullPage: true,
      });
    }
    await page.close();
  }
  expect(errors).toEqual([]);
  console.log(
    `Rendered ${stories.length} stories on a phone, a landscape phone and a desktop; gesture, keyboard and overflow checks passed.`,
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
