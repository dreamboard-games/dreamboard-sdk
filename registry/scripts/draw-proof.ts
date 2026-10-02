import { expect, type Page } from "@playwright/test";
import { z } from "zod";

type Point = { x: number; y: number };
const sampleSchema = z.object({
  x: z.number(),
  y: z.number(),
  clipped: z.boolean(),
  turn: z.number(),
});

/** Real reducer draws through menus and pile gestures, including delayed receipts. */
export async function proveDraw(page: Page, touch: boolean, manual: boolean) {
  const cards = page.locator(".db-hand-card");
  const pile = page.getByRole("button", { name: "Deck actions" });
  const hand = page.getByRole("region", { name: "Your hand" });
  const arrival = page.locator("[data-card-arrival]");
  const overlay = page.locator("[data-draw-overlay]");
  const menu = page.locator('[data-action="draw"]');
  await expect(cards).toHaveCount(9);
  const center = async (selector: typeof pile): Promise<Point> => {
    const box = (await selector.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const activate = async () => {
    if (touch) await pile.tap();
    else {
      await pile.focus();
      await page.keyboard.press("Enter");
    }
    await expect(menu).toBeFocused();
    await expect(page.locator(".db-card-action-arrow")).toBeVisible();
    expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  };
  await activate();
  await expect(cards).toHaveCount(9);
  if (touch) await pile.tap();
  else await pile.click();
  await expect(menu).toHaveCount(0);
  await activate();
  if (touch) await page.touchscreen.tap(1, 1);
  else await page.mouse.click(1, 1);
  await expect(menu).toHaveCount(0);
  await activate();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(pile).toBeFocused();

  const from = await center(pile);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const start = async () => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...from, id: 1 }],
      });
    else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
    }
  };
  const move = async (to: Point) => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...to, id: 1 }],
      });
    else await page.mouse.move(to.x, to.y);
  };
  const end = async () => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    else await page.mouse.up();
  };

  // Cancellation submits nothing, animates home, and never opens the menu.
  await start();
  await move({ x: from.x + 20, y: from.y + 20 });
  await expect(overlay).toHaveAttribute("data-draw-overlay", "drag");
  await expect
    .poll(async () =>
      overlay.evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).a,
      ),
    )
    .toBeGreaterThan(1.04);
  await expect(overlay.locator(".db-card")).toHaveCSS("box-shadow", /.+/);
  await end();
  await expect(overlay).toHaveCount(0);
  await expect(menu).toHaveCount(0);
  await expect(cards).toHaveCount(9);

  // Capture the actual portal's first frame, rather than a clipped card's rectangle.
  const watchArrival = async () =>
    page.evaluate(
      () =>
        new Promise<unknown>((resolve) => {
          const observer = new MutationObserver(() => {
            const element = document.querySelector<HTMLElement>(
              "[data-card-arrival]",
            );
            if (!element) return;
            observer.disconnect();
            const box = element.getBoundingClientRect();
            const flip = element.querySelector<HTMLElement>(".db-card-flip")!;
            resolve({
              x: box.x + box.width / 2,
              y: box.y + box.height / 2,
              clipped: element.closest(".db-hand") !== null,
              turn: new DOMMatrix(getComputedStyle(flip).transform).m11,
            });
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }),
    );

  await activate();
  const menuArrival = watchArrival();
  await menu.click();
  if (manual) {
    await expect(overlay).toHaveAttribute("data-draw-overlay", "pending");
    await expect(overlay.locator(".db-card-back")).toHaveCount(1);
    await expect(cards).toHaveCount(9);
    await expect(arrival).toHaveCount(0);
    await page.getByRole("button", { name: "Confirm draw" }).click();
  }
  const menuStart = sampleSchema.parse(await menuArrival);
  expect(menuStart.clipped).toBe(false);
  expect(menuStart.turn).toBeCloseTo(-1, 1);
  expect(Math.hypot(menuStart.x - from.x, menuStart.y - from.y)).toBeLessThan(
    20,
  );
  await expect(arrival).toHaveAttribute("data-card-arrival", "flip");
  await expect(arrival).toHaveCount(0);
  await expect(overlay).toHaveCount(0);
  await expect(cards).toHaveCount(10);

  // A downward touch drag opens a hand slot and starts the arrival at release.
  await start();
  await move({ x: from.x, y: from.y + 20 });
  await expect(hand).toHaveAttribute("data-draw-target", "true");
  const to = await center(hand);
  await move(to);
  await expect(hand).toHaveAttribute("data-draw-over", "true");
  await expect(hand.locator(".db-draw-insertion")).toHaveCount(1);
  const dragArrival = watchArrival();
  await end();
  if (manual) {
    await expect(overlay).toHaveAttribute("data-draw-overlay", "pending");
    await expect(cards).toHaveCount(10);
    await expect(arrival).toHaveCount(0);
    await page.getByRole("button", { name: "Confirm draw" }).click();
  }
  const dragStart = sampleSchema.parse(await dragArrival);
  expect(Math.hypot(dragStart.x - to.x, dragStart.y - to.y)).toBeLessThan(20);
  await expect(arrival).toHaveCount(0);
  await expect(cards).toHaveCount(11);
  await expect(menu).toHaveCount(0);
  await expect(hand.locator(".db-draw-insertion")).toHaveCount(0);

  if (manual) {
    await activate();
    await menu.click();
    await expect(overlay).toHaveAttribute("data-draw-overlay", "pending");
    await page.getByRole("button", { name: "Reject draw" }).click();
    await expect(
      page.getByText("The draw was rejected.", { exact: true }),
    ).toBeVisible();
    await expect(overlay).toHaveCount(0);
    await expect(cards).toHaveCount(11);
    await expect(arrival).toHaveCount(0);
  }
  await cdp?.detach();

  // Turn rules disable both paths; visual pickup cannot bypass the reducer.
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(pile).toHaveAttribute("aria-disabled", "true");
  const unavailable = await center(pile);
  if (touch) await page.touchscreen.tap(unavailable.x, unavailable.y);
  else await page.mouse.click(unavailable.x, unavailable.y);
  await expect(menu).toBeDisabled();
  await page.keyboard.press("Escape");
}

/** Reduced motion applies to the destination on the table as well as the hand. */
export async function proveReducedCardMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator(".db-hand-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Deck actions" }).click();
  await page.locator('[data-action="draw"]').click();
  await expect(page.locator(".db-hand-card")).toHaveCount(10);
  await expect(page.locator("[data-card-arrival]")).toHaveCount(0);
  const heart = page.locator('.db-hand-card[data-value^="hearts-"]').first();
  await heart.focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-action="card-action"]').click();
  const card = page
    .getByRole("region", { name: "Table", exact: true })
    .locator(".db-card");
  await expect(card).toHaveCount(1);
  // Read several animation frames: a late spring would otherwise pass a settled check.
  const transforms = await card.evaluate(
    (element) =>
      new Promise<string[]>((resolve) => {
        const values: string[] = [];
        function frame() {
          values.push(getComputedStyle(element).transform);
          if (values.length < 8) requestAnimationFrame(frame);
          else resolve(values);
        }
        requestAnimationFrame(frame);
      }),
  );
  expect(
    transforms.every(
      (value) => value === "none" || value === "matrix(1, 0, 0, 1, 0, 0)",
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
}
