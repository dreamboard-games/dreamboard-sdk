import { expect, type Page } from "@playwright/test";
import { cardSurface } from "./card-surface.ts";

/** Physical touch proof of placement, stable slots, cancellation and Browse. */
export async function proveCardBrowsing(
  page: Page,
  story: string,
  screenshot: string,
) {
  const zone = page.getByTestId("browsing-zone");
  const cards = zone.locator("[data-card]");
  const crowded = story.includes("crowded");
  await expect(cards).toHaveCount(crowded ? 24 : 8);
  const browse = zone.getByRole("button", {
    name: `Browse ${crowded ? 24 : 8} cards`,
    exact: true,
  });

  const viewport = page.viewportSize()!;
  if (!crowded) {
    const first = cards.nth(1);
    const last = cards.nth(6);
    const start = await cardSurface(first);
    const finish = await cardSurface(last);
    const before = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
    const cdp = await page.context().newCDPSession(page);
    const send = (
      type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel",
      at?: { x: number; y: number },
    ) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: at ? [{ ...at, id: 1 }] : [],
      });
    await send("touchStart", start);
    await send("touchMove", { x: start.x + 12, y: start.y });
    const preview = page.locator("[data-touch-preview]");
    await expect(preview).toHaveCount(1);
    let initialPlacement: string | null = null;
    if (viewport.height > 600) {
      await expect(preview).toBeVisible();
      initialPlacement = await preview.getAttribute("data-placement");
      expect(initialPlacement).toBe(story.endsWith("top") ? "bottom" : "top");
    }
    const at = { x: finish.x, y: start.y };
    for (let step = 1; step <= 16; step++)
      await send("touchMove", {
        x: start.x + ((at.x - start.x) * step) / 16,
        y: at.y,
      });
    await expect(last).toHaveAttribute("data-hovered", "true");
    await expect(preview).toHaveAttribute(
      "data-touch-preview",
      (await last.getAttribute("data-card"))!,
    );
    if (viewport.height > 600) {
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAttribute(
        "data-placement",
        initialPlacement!,
      );
    }
    if (await preview.isVisible()) {
      await expect
        .poll(
          async () => {
            const box = (await preview.boundingBox())!;
            return (
              box.x + box.width <= at.x - 40 + 1 ||
              box.x >= at.x + 40 - 1 ||
              box.y + box.height <= at.y - 32 + 1 ||
              box.y >= at.y + 80 - 1
            );
          },
          {
            message:
              "Preview clears the final touch point after positioning settles",
          },
        )
        .toBe(true);
      const box = (await preview.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(180);
      expect(box.x).toBeGreaterThanOrEqual(15);
      expect(box.y).toBeGreaterThanOrEqual(15);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 15);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
      const clear =
        box.x + box.width <= at.x - 40 + 1 ||
        box.x >= at.x + 40 - 1 ||
        box.y + box.height <= at.y - 32 + 1 ||
        box.y >= at.y + 80 - 1;
      expect(
        clear,
        "The entire preview clears the finger exclusion rectangle",
      ).toBe(true);
    }
    const after = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
    for (let i = 0; i < before.length; i++)
      for (const key of ["x", "y", "width", "height"] as const)
        expect(
          Math.abs(after[i][key] - before[i][key]),
          `Resting card ${i} ${key}`,
        ).toBeLessThan(1);
    // This marker records the actual CDP touch point in the screenshot only.
    await page.evaluate(({ x, y }) => {
      const marker = document.createElement("div");
      marker.id = "proof-finger";
      marker.style.cssText = `position:fixed;left:${x - 10}px;top:${y - 10}px;width:20px;height:20px;border:2px solid white;border-radius:50%;background:#ec8063aa;z-index:100;pointer-events:none`;
      document.body.append(marker);
    }, at);
    await page.screenshot({ path: screenshot });
    await page.locator("#proof-finger").evaluate((element) => element.remove());
    await send("touchCancel");
    await expect(preview).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await cdp.detach();
  }
  if (!(await browse.isVisible())) return;
  await browse.tap();
  const sheet = page.getByRole("dialog", {
    name: `Expedition · ${crowded ? 24 : 8}`,
  });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("[data-card]")).toHaveCount(crowded ? 24 : 8);
  await expect(sheet).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const ids = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-card")),
  );
  expect(
    await sheet
      .locator("[data-card]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-card")),
      ),
  ).toEqual(ids);
  if (crowded) await page.screenshot({ path: screenshot });
  await sheet.getByRole("button", { name: "Done", exact: true }).tap();
  await expect(sheet).toHaveCount(0);
  await expect(browse).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    viewport.width,
  );
}

/** A short viewport must not produce a tiny preview or open a sheet mid-swipe. */
export async function proveLimitedCardPreview(page: Page, screenshot: string) {
  const original = page.viewportSize()!;
  await page.setViewportSize({ width: 320, height: 320 });
  const zone = page.getByTestId("browsing-zone");
  const card = zone.locator("[data-card]").nth(2);
  const start = await cardSurface(card);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...start, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: start.x + 12, y: start.y, id: 1 }],
  });
  const preview = page.locator("[data-touch-preview]");
  await expect(preview).toHaveCount(1);
  await expect(preview).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    zone.getByRole("button", { name: "Browse 8 cards" }),
  ).toBeVisible();
  await page.screenshot({ path: screenshot });
  // Available space can change during the same gesture (browser chrome/rotation).
  await page.setViewportSize(original);
  await expect(preview).toBeVisible();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await cdp.detach();
  await expect(preview).toHaveCount(0);
}

/** Container width, rather than a device breakpoint, owns Browse visibility. */
export async function proveResponsiveBrowsing(page: Page) {
  const zone = page.getByTestId("browsing-zone");
  const browse = zone.getByRole("button", { name: "Browse 8 cards" });
  await expect(zone.locator("[data-card]")).toHaveCount(8);
  await zone.evaluate((element) => {
    element.style.right = "auto";
    element.style.width = "1000px";
    element.style.setProperty("--card-w", "80px");
    element.style.setProperty("--card-w-hand", "80px");
  });
  await expect(browse).toHaveCount(0);
  await zone.evaluate((element) => {
    element.style.width = "320px";
  });
  await expect(browse).toBeVisible();
  await browse.click();
  const sheet = page.getByRole("dialog", { name: "Expedition · 8" });
  await expect(sheet).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(sheet).toHaveCSS("color", "rgb(25, 43, 53)");
  await page
    .locator("html")
    .evaluate((element) => element.classList.add("dark"));
  await expect(sheet).toHaveCSS("background-color", "rgb(23, 44, 53)");
  await expect(sheet).toHaveCSS("color", "rgb(237, 244, 247)");
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  await expect(browse).toBeFocused();
  await page
    .locator("html")
    .evaluate((element) => element.classList.remove("dark"));
  await zone.evaluate((element) => {
    element.style.width = "1000px";
  });
  await expect(browse).toHaveCount(0);
}
