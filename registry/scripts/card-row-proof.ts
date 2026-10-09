import { expect, type Page } from "@playwright/test";

/** Mouse/touch positions, cancellation, cross-zone insertion and an empty row. */
export async function proveCardRow(page: Page, touch: boolean) {
  const row = page.getByTestId("table");
  const cards = row.locator("button[data-card]");
  const ghost = row.locator(".db-card-row-insertion");
  const order = async (zone = "table") =>
    (
      JSON.parse((await page.getByTestId("row-authority").textContent())!) as [
        string,
        string[],
      ][]
    ).find(([id]) => id === zone)![1];
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const carry = async (
    card: import("@playwright/test").Locator,
    to: { x: number; y: number },
  ) => {
    const box = (await card.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...from, id: 1 }],
      });
    else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
    }
    // A finger lifts vertically before carrying a card across the scrollable row.
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: from.x, y: from.y - 40, id: 1 }],
      });
    }
    for (let step = 1; step <= 10; step++) {
      const point = {
        x: from.x + ((to.x - from.x) * step) / 10,
        y: from.y + ((to.y - from.y) * step) / 10,
      };
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ ...point, id: 1 }],
        });
      else await page.mouse.move(point.x, point.y);
    }
  };
  const release = async (cancel = false) => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: cancel ? "touchCancel" : "touchEnd",
        touchPoints: [],
      });
    else {
      if (cancel) await page.keyboard.press("Escape");
      await page.mouse.up();
      await page.mouse.move(1, 1);
    }
  };
  await expect(cards).toHaveCount(3);
  const before = await order();
  const end = (await cards.last().boundingBox())!;
  await carry(cards.first(), { x: end.x + end.width / 2, y: end.y + 20 });
  await expect(ghost).toBeVisible();
  expect(Math.abs((await ghost.boundingBox())!.x - end.x)).toBeLessThan(2);
  await release();
  const moved = [before[1], before[2], before[0]];
  await expect.poll(() => order()).toEqual(moved);
  await expect(ghost).toHaveCount(0);
  await expect(page.locator(".db-drag-overlay")).toHaveCount(0);
  const first = (await cards.first().boundingBox())!;
  await carry(cards.last(), { x: first.x + first.width / 2, y: first.y + 20 });
  await expect(ghost).toBeVisible();
  await release(true);
  await expect(ghost).toHaveCount(0);
  expect(await order()).toEqual(moved);
  await expect(page.locator(".db-drag-overlay")).toHaveCount(0);
  const incoming = page.getByTestId("supply").locator("button[data-card]");
  const incomingId = await incoming.getAttribute("data-card");
  const middle = (await row.locator(".db-card-row-card").nth(1).boundingBox())!;
  await carry(incoming, { x: middle.x - 5, y: middle.y + 20 });
  await expect(ghost).toBeVisible();
  await release();
  await expect
    .poll(() => order())
    .toEqual([moved[0], incomingId, moved[1], moved[2]]);
  await expect(page.locator(".db-drag-overlay")).toHaveCount(0);
  const empty = page.getByTestId("empty");
  await empty.scrollIntoViewIfNeeded();
  const target = (await empty.boundingBox())!;
  await carry(cards.first(), {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  });
  await expect(empty.locator(".db-card-row-insertion")).toBeVisible();
  await release();
  await expect.poll(() => order("empty")).toEqual([moved[0]]);
  await expect(page.locator(".db-drag-overlay")).toHaveCount(0);
  // A constrained route without a position input reaches the surrounding area.
  await page.getByRole("button", { name: "Toggle whole-zone moves" }).click();
  const supply = page.getByTestId("supply");
  await supply.scrollIntoViewIfNeeded();
  const supplyBox = (await supply.boundingBox())!;
  const lastId = await cards.last().getAttribute("data-card");
  await carry(cards.last(), {
    x: supplyBox.x + supplyBox.width / 2,
    y: supplyBox.y + supplyBox.height / 2,
  });
  await expect(supply.locator(".db-card-row-insertion")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "supply drop area" }),
  ).toHaveAttribute("data-drop-over", "true");
  await release();
  await expect.poll(() => order("supply")).toEqual([lastId]);
  await expect(page.locator(".db-drag-overlay")).toHaveCount(0);
  await cdp?.detach();
}
