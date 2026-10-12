import { expect, type Page } from "@playwright/test";

/** A single physical press leaves the modal and commits (or cancels) on the table. */
export async function proveBrowserDrag(
  page: Page,
  touch: boolean,
  hand = false,
) {
  const source = hand ? page.locator(".db-hand") : page.getByTestId("table");
  const authority = page.getByTestId(hand ? "table-cards" : "row-authority");
  const state = async () =>
    JSON.parse((await authority.textContent())!) as [string, string[]][];
  if (!hand) {
    await expect(source.locator("[data-card]")).toHaveCount(3);
    await source.evaluate((element) => {
      element.style.width = "180px";
      element.style.flex = "none";
    });
  }
  const browse = hand
    ? source.locator(".db-card-browse")
    : source.locator("..").locator(".db-card-browse");
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const move = async (x: number, y: number) => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y, id: 1 }],
      });
    else await page.mouse.move(x, y);
  };
  for (const cancel of [true, false]) {
    const before = await state();
    await browse.click();
    const sheet = page.locator(".db-hand-sheet");
    await expect(sheet).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    if (hand && cdp) {
      // The gutter scrolls the collection; pressing a card starts its gesture.
      const content = sheet.locator(".db-hand-sheet-cards");
      const bounds = (await content.boundingBox())!;
      const x = bounds.x + 1;
      const y = bounds.y + bounds.height - 20;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let step = 1; step <= 8; step++) await move(x, y - step * 15);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect
        .poll(() => content.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await expect(sheet).toBeVisible();
      await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
    }
    const card = sheet
      .locator(hand ? '[data-card^="spades-"]' : "[data-card]")
      .first();
    await card.scrollIntoViewIfNeeded();
    const id = (await card.getAttribute("data-card"))!;
    const box = (await card.boundingBox())!;
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...start, id: 1 }],
      });
    else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
    }
    await move(start.x, start.y - 40);
    await expect(sheet).toHaveCount(0);
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(1);
    const target = hand
      ? page.locator('[data-zone="discard"]').first()
      : page.getByTestId("empty");
    const to = (await target.boundingBox())!;
    for (let step = 1; step <= 10; step++)
      await move(
        start.x + ((to.x + to.width / 2 - start.x) * step) / 10,
        start.y - 40 + ((to.y + to.height / 2 - start.y + 40) * step) / 10,
      );
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
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
    if (cancel) expect(await state()).toEqual(before);
    else
      await expect
        .poll(state)
        .toContainEqual([hand ? "discard" : "empty", [id]]);
  }
  await cdp?.detach();
}
