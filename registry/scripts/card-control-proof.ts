import { expect, type Page } from "@playwright/test";

/** Standalone controls can inspect and choose actions even when their card has drag routes. */
export async function proveCardControl(page: Page, touch: boolean) {
  const hand = page.getByRole("region", { name: "Your hand" });
  const heart = hand.locator('[data-value^="hearts-"]').first();
  await heart.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const table = page.getByRole("region", { name: "Table", exact: true });
  const card = table.locator("button[data-value]");
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS("touch-action", "manipulation");
  await expect(page.getByTestId("table-can-drag")).toHaveText("true");
  const before = await page.getByTestId("table-cards").textContent();
  const box = (await card.boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...from, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: from.x + 40, y: from.y + 40, id: 1 }],
    });
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 40, { steps: 4 });
  }
  await expect(card).not.toHaveAttribute("data-dragging", "true");
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
  if (cdp)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  else await page.mouse.up();
  await expect(page.getByTestId("table-cards")).toHaveText(before!);
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...from, id: 1 }],
    });
    await expect(page.locator('[data-card-preview="hold"]')).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
    await expect(page.locator('[data-card-preview="hold"]')).toHaveCount(0);
  } else {
    await page.mouse.move(from.x, from.y);
    await expect(page.locator('[data-card-preview="hover"]')).toBeVisible();
    await page.mouse.move(1, 1);
    await expect(page.locator('[data-card-preview="hover"]')).toHaveCount(0);
  }
  if (touch) {
    // A bounded table scrolls from the card itself, not just the gaps around it.
    const previousStyle = await table.getAttribute("style");
    await table.evaluate((element) =>
      Object.assign((element as HTMLElement).style, {
        height: "56px",
        minHeight: "0",
        overflowY: "auto",
        display: "block",
      }),
    );
    const clipped = (await card.boundingBox())!;
    const start = { x: clipped.x + clipped.width / 2, y: clipped.y + 8 };
    const scrolling = await page.context().newCDPSession(page);
    await scrolling.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1 }],
    });
    for (let step = 1; step <= 6; step++)
      await scrolling.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: start.x, y: start.y - step * 12, id: 1 }],
      });
    await scrolling.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => table.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await scrolling.detach();
    await table.evaluate((element, style) => {
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
      element.scrollTop = 0;
    }, previousStyle);
  }
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Flip", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await card.press("Enter");
  await page.getByRole("button", { name: "Flip", exact: true }).click();
  const hidden = table.locator('button[data-value^="card-ref:"]');
  await expect(hidden).toBeVisible();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await hidden.click();
  await expect(page.getByRole("dialog").getByRole("status")).toBeVisible();
  await expect(page.locator('[data-action="card-action"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(hidden).toBeFocused();
}
