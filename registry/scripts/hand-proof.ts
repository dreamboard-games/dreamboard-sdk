import { expect, type Locator, type Page } from "@playwright/test";
import { z } from "zod";

type Point = { x: number; y: number };
const zonesSchema = z.array(z.tuple([z.string(), z.array(z.string())]));

/** Browser proof of the fanned hand, its action menu, previews and moves. */
export async function proveHand(page: Page, touch: boolean) {
  const hand = page.getByRole("region", { name: "Your hand" });
  const cards = hand.locator(".db-hand-card");
  const actions = page.locator('[data-action="card-action"]');
  const zones = async () =>
    Object.fromEntries(
      zonesSchema.parse(
        JSON.parse((await page.getByTestId("table-cards").textContent())!),
      ),
    );
  const suit = (name: string) =>
    cards.and(page.locator(`[data-value^="${name}-"]`));
  const center = async (locator: Locator): Promise<Point> => {
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  // A fanned card shows at least its left quarter; press it there.
  const grip = async (locator: Locator): Promise<Point> => {
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width * 0.2, y: box.y + box.height / 2 };
  };
  const activate = async (locator: Locator) => {
    const at = await grip(locator);
    if (touch) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
  };
  const dismiss = async () => {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };

  await expect(cards).toHaveCount(9);
  // The fan tilts outward, overlaps its cards and fits the hand.
  const angles = await hand.locator(".db-hand-slot").evaluateAll((slots) =>
    slots.map((slot) => {
      const { a, b } = new DOMMatrix(getComputedStyle(slot).transform);
      return (Math.atan2(b, a) * 180) / Math.PI;
    }),
  );
  expect(angles[0]).toBeLessThan(-1);
  expect(angles.at(-1)).toBeGreaterThan(1);
  const [first, second] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  expect(second!.x - first!.x).toBeLessThan(first!.width);
  expect(
    await hand.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);

  // A dimmed card shakes and says why; it has no actions.
  const diamond = suit("diamonds").first();
  await expect(diamond).toHaveAttribute("aria-disabled", "true");
  await activate(diamond);
  await expect(diamond).toHaveAttribute("data-shake", "a");
  await expect(page.getByRole("status")).toHaveText(
    "You can't play this card now.",
  );
  await expect(actions).toHaveCount(0);
  await dismiss();

  // A card with two actions offers both, the first primary.
  const spade = suit("spades").first();
  const spadeId = (await spade.getAttribute("data-value"))!;
  await activate(spade);
  await expect(actions).toHaveText(["Play", "Discard"]);
  await expect(spade).toHaveAttribute("aria-pressed", "false");
  await actions.filter({ hasText: "Discard" }).click();
  await expect.poll(async () => (await zones()).discard).toEqual([spadeId]);
  await expect(cards).toHaveCount(8);

  // Inspecting enlarges the card without moving the hand.
  const heart = suit("hearts").first();
  const at = await grip(heart);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...at, id: 1 }],
    });
    await expect(page.locator('[data-card-preview="hold"]')).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
    await expect(page.locator('[data-card-preview="hold"]')).toHaveCount(0);
  } else {
    await page.mouse.move(at.x, at.y);
    await expect(page.locator('[data-card-preview="hover"]')).toBeVisible();
    await page.mouse.move(4, 4);
    await expect(page.locator('[data-card-preview="hover"]')).toHaveCount(0);
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // A keyboard player opens the menu and plays from it.
  const heartId = (await heart.getAttribute("data-value"))!;
  await heart.focus();
  await page.keyboard.press("Enter");
  await expect(actions).toHaveText(["Play"]);
  await expect(actions.first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await zones()).table).toEqual([heartId]);

  // A drawn card starts at the deck: record where it first mounts.
  const deck = await center(page.locator('[data-zone="deck"]'));
  const arrival = hand.evaluate(
    (element) =>
      new Promise<Point>((resolve) => {
        const observer = new MutationObserver((records) => {
          const card = records
            .flatMap((record) => [...record.addedNodes])
            .filter((node) => node instanceof Element)
            .map((node) => node.querySelector(".db-hand-card"))
            .find((card) => card !== null);
          if (!card) return;
          observer.disconnect();
          const box = card.getBoundingClientRect();
          resolve({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
        });
        observer.observe(element, { childList: true, subtree: true });
      }),
  );
  await page.getByRole("button", { name: "Draw" }).click();
  const start = await arrival;
  expect(Math.hypot(start.x - deck.x, start.y - deck.y)).toBeLessThan(
    Math.hypot(at.x - deck.x, at.y - deck.y) / 2,
  );
  await expect(cards).toHaveCount(8);

  // Dragging a card onto an area runs that area's interaction.
  const club = suit("clubs").first();
  const clubId = (await club.getAttribute("data-value"))!;
  const from = await grip(club);
  const discard = await center(page.getByRole("region", { name: "Discard" }));
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    const send = (
      type: "touchStart" | "touchMove" | "touchEnd",
      point?: Point,
    ) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: point ? [{ ...point, id: 1 }] : [],
      });
    await send("touchStart", from);
    for (let step = 1; step <= 8; step++)
      await send("touchMove", {
        x: from.x + ((discard.x - from.x) * step) / 8,
        y: from.y + ((discard.y - from.y) * step) / 8,
      });
    await send("touchEnd");
    await cdp.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(discard.x, discard.y, { steps: 8 });
    await page.mouse.up();
  }
  await expect
    .poll(async () => (await zones()).discard)
    .toEqual([spadeId, clubId]);
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
}
