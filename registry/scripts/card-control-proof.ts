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
  await expect(table.locator('[data-value="hidden:table:0"]')).toBeVisible();
}
