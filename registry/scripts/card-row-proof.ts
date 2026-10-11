import { expect, type Locator, type Page } from "@playwright/test";

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
  const carry = async (card: Locator, to: { x: number; y: number }) => {
    await expect(card.locator("..")).toHaveCSS("transform", "none");
    await card.click({ trial: true });
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
  // A narrow row overlaps its cards to fit rather than scrolling.
  const card = (await cards.first().boundingBox())!.width;
  const padding = await row.evaluate(
    (element) => parseFloat(getComputedStyle(element).paddingLeft) * 2,
  );
  await row.evaluate(
    (element, width) => {
      element.style.flex = "none";
      element.style.width = `${width}px`;
    },
    card * 2 + padding,
  );
  await expect
    .poll(() => row.evaluate((element) => element.scrollWidth))
    .toBeLessThanOrEqual(await row.evaluate((element) => element.clientWidth));
  const [left, right] = [
    (await cards.nth(0).boundingBox())!,
    (await cards.nth(1).boundingBox())!,
  ];
  expect(right.x).toBeLessThan(left.x + left.width);
  await row.evaluate((element) => {
    element.style.flex = "";
    element.style.width = "";
  });
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
  const proveIncoming = async (
    destination: Locator,
    source: Locator,
    indices: number[],
    commitLast: boolean,
  ) => {
    const existing = destination.locator("button[data-card]");
    const count = await existing.count();
    await expect(existing.first().locator("..")).toHaveCSS("transform", "none");
    const width = (await existing.first().boundingBox())!.width;
    // Allow one full card plus overlapping slots above the minimum pitch.
    await destination.evaluate(
      (element, { width, count }) => {
        const style = getComputedStyle(element);
        const slot = element.querySelector(".db-card-row-card")!;
        const pitch =
          parseFloat(getComputedStyle(slot).minWidth) +
          parseFloat(style.columnGap) +
          4;
        element.style.flex = "none";
        element.style.width = `${width + count * pitch + parseFloat(style.paddingLeft) * 2}px`;
      },
      { width, count },
    );
    for (const [attempt, index] of indices.entries()) {
      const bounds = (await destination.boundingBox())!;
      const padding = await destination.evaluate((element) =>
        parseFloat(getComputedStyle(element).paddingLeft),
      );
      const step = (bounds.width - padding * 2 - width) / count;
      const left = bounds.x + padding;
      await carry(source, {
        x: left + index * step + width / 2,
        y: bounds.y + bounds.height / 2,
      });
      const opening = destination.locator(".db-card-row-insertion");
      await expect(opening).toBeVisible();
      await expect
        .poll(() =>
          destination.evaluate(
            (element, { left, index, step, width }) => {
              const opening = element.querySelector(".db-card-row-insertion");
              if (!opening) return Infinity;
              const preview = opening.getBoundingClientRect();
              const errors = [
                Math.abs(preview.width - width),
                Math.abs(preview.x - left - index * step),
              ];
              element
                .querySelectorAll("button[data-card]")
                .forEach((card, cardIndex) => {
                  const slotIndex =
                    cardIndex < index ? cardIndex : cardIndex + 1;
                  const box = card.getBoundingClientRect();
                  errors.push(
                    Math.abs(box.x - left - slotIndex * step),
                    Math.abs(box.y - preview.y),
                  );
                });
              return Math.max(...errors);
            },
            { left, index, step, width },
          ),
        )
        .toBeLessThan(2);
      await expect
        .poll(() => destination.evaluate((element) => element.scrollWidth))
        .toBeLessThanOrEqual(
          await destination.evaluate((element) => element.clientWidth),
        );
      await release(!commitLast || attempt < indices.length - 1);
      await expect(opening).toHaveCount(0);
      await expect(page.locator(".db-drag-overlay")).toHaveCount(0);
    }
    await destination.evaluate((element) => {
      element.style.flex = "";
      element.style.width = "";
    });
  };
  await proveIncoming(row, incoming, [0, 3, 1], true);
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
  await proveIncoming(empty, cards.last(), [0, 1], false);
  expect(await order("empty")).toEqual([moved[0]]);
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
