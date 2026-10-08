import { expect, test, type Locator, type Page } from "@playwright/test";
import { gameDriver } from "../helpers/browser-game";

const suitOrder = [
  "clubs-3",
  "clubs-6",
  "diamonds-6",
  "diamonds-9",
  "diamonds-10",
  "diamonds-K",
  "spades-10",
  "spades-A",
  "hearts-3",
  "hearts-4",
  "hearts-5",
  "hearts-7",
  "hearts-10",
];
const rankOrder = [
  "clubs-3",
  "hearts-3",
  "hearts-4",
  "hearts-5",
  "clubs-6",
  "diamonds-6",
  "hearts-7",
  "diamonds-9",
  "diamonds-10",
  "spades-10",
  "hearts-10",
  "diamonds-K",
  "spades-A",
];
const order = (page: Page) =>
  page
    .locator(".db-hand-card")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-value")),
    );
const frame = (page: Page) =>
  page
    .locator("details")
    .filter({
      has: page.locator("summary", { hasText: "Inspect selected-seat view" }),
    })
    .locator("pre")
    .textContent();
async function choose(control: Locator, touch: boolean) {
  if (touch) await control.tap();
  else await control.click();
}

for (const reduced of [false, true]) {
  test(`authored Suit and Rank controls preserve frame, selection and focused cards${reduced ? " with reduced motion" : ""}`, async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.goto("/?scenario=complete&at=opening&as=player-1");
    const driver = gameDriver(page);
    const suit = page.getByRole("radio", { name: "Suit", exact: true });
    const rank = page.getByRole("radio", { name: "Rank", exact: true });
    await expect(suit).toBeChecked();
    await expect.poll(() => order(page)).toEqual(suitOrder);
    const selected = [driver.card("clubs-6"), driver.card("hearts-7")];
    for (const card of selected) {
      await card.focus();
      await card.press("Enter");
      await expect(card).toHaveAttribute("aria-pressed", "true");
    }
    const before = await frame(page);
    const original = await selected[0].elementHandle();
    await choose(rank, isMobile);
    await expect(rank).toBeChecked();
    await expect.poll(() => order(page)).toEqual(rankOrder);
    for (const card of selected)
      await expect(card).toHaveAttribute("aria-pressed", "true");
    expect(
      await selected[0].evaluate((card, before) => card === before, original),
    ).toBe(true);
    expect(await frame(page)).toBe(before);

    // The game authors its own toggle; the shortcut uses the focused hand card.
    await selected[0].focus();
    await selected[0].press("s");
    await expect(suit).toBeChecked();
    await expect.poll(() => order(page)).toEqual(suitOrder);
    await expect(selected[0]).toBeFocused();
    await expect(selected[0]).toHaveAttribute("aria-pressed", "true");
    await suit.focus();
    await suit.press("s");
    await expect(rank).toBeChecked();
    await expect(suit).toBeFocused();
    await rank.focus();
    await rank.press("ArrowLeft");
    await expect(suit).toBeChecked();
    await expect(suit).toBeFocused();
    await expect.poll(() => order(page)).toEqual(suitOrder);

    // Editing a seat selector and unrelated controls do not target the hand.
    const seat = page.getByRole("combobox", { name: "Selected seat" });
    await seat.focus();
    await seat.press("s");
    await expect(suit).toBeChecked();
    await page
      .getByRole("button", { name: "Save checkpoint", exact: true })
      .focus();
    await page.keyboard.press("s");
    await expect(suit).toBeChecked();
    expect(await frame(page)).toBe(before);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await original?.dispose();
  });
}

test("waiting hands remain sortable and seat or source replacement restores the default", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=complete&at=sealed-pass&as=player-1");
  const driver = gameDriver(page);
  const suit = page.getByRole("radio", { name: "Suit", exact: true });
  const rank = page.getByRole("radio", { name: "Rank", exact: true });
  await expect(page.getByRole("status")).toContainText("sealed");
  const before = await frame(page);
  const dealt = await order(page);
  await choose(rank, isMobile);
  await expect(rank).toBeChecked();
  await expect.poll(() => order(page)).not.toEqual(dealt);
  expect(await frame(page)).toBe(before);
  await driver.selectSeat("player-2");
  await expect(suit).toBeChecked();
  await driver.selectSeat("player-1");
  await expect(suit).toBeChecked();
  await expect.poll(() => order(page)).toEqual(dealt);
  await choose(rank, isMobile);
  await page.reload();
  await expect(suit).toBeChecked();
  await expect.poll(() => order(page)).toEqual(dealt);

  await page.goto("/?scenario=complete&at=first-trick&as=player-1");
  await expect(page.getByRole("status")).toContainText("Waiting for");
  await expect(rank).toBeEnabled();
  const waiting = await frame(page);
  await choose(rank, isMobile);
  await expect(rank).toBeChecked();
  expect(await frame(page)).toBe(waiting);
});
