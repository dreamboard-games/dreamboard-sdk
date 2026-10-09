import { expect, type Page } from "@playwright/test";

/** Real reducer proof: a marquee plus group drop produces one move, not one per card. */
export async function proveCardSelection(page: Page) {
  const area = page.getByTestId("selection-area");
  const cards = area.locator("[data-test-card]");
  await expect(cards).toHaveCount(3);
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  await page.mouse.move(first.x - 12, first.y - 12);
  await page.mouse.down();
  await page.mouse.move(
    second.x + second.width + 4,
    second.y + second.height + 4,
    { steps: 8 },
  );
  await expect(page.getByTestId("marquee")).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId("group-selection")).toHaveText("2");
  await expect(cards.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(cards.nth(2)).toHaveAttribute("aria-pressed", "false");
  // Escape cancels another marquee without overwriting the selection.
  await page.mouse.move(first.x - 12, first.y - 12);
  await page.mouse.down();
  await page.mouse.move(first.x + 20, first.y + 20, { steps: 4 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByTestId("group-selection")).toHaveText("2");
  const destination = (await page.getByTestId("group-drop").boundingBox())!;
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x + 30, destination.y + 30, { steps: 10 });
  await expect(page.getByTestId("group-overlay")).toHaveText("2 cards");
  await expect(page.getByTestId("group-drop")).toHaveAttribute(
    "data-drop-over",
    "true",
  );
  await page.mouse.up();
  await expect(cards).toHaveCount(1);
  await expect(page.getByTestId("group-moves")).toHaveText("1");
  await expect(page.getByTestId("group-drop")).toHaveText("Discard: 2");
  await expect(page.getByTestId("group-selection")).toHaveText("0");
  await expect(page.getByTestId("group-overlay")).toHaveCount(0);

  // An unselected card uses the same many-card Move without opening a draft.
  const remaining = (await cards.first().boundingBox())!;
  await page.mouse.move(
    remaining.x + remaining.width / 2,
    remaining.y + remaining.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(destination.x + 30, destination.y + 30, { steps: 10 });
  await expect(page.getByTestId("group-overlay")).toHaveText("1 cards");
  await expect(page.getByTestId("group-drop")).toHaveAttribute(
    "data-drop-over",
    "true",
  );
  await page.mouse.up();
  await expect(cards).toHaveCount(0);
  await expect(page.getByTestId("group-moves")).toHaveText("2");
  await expect(page.getByTestId("group-drop")).toHaveText("Discard: 3");
  await expect(page.getByTestId("group-overlay")).toHaveCount(0);
}
