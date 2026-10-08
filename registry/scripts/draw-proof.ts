import { expect, type JSHandle, type Page } from "@playwright/test";
import { z } from "zod";

type Point = { x: number; y: number };
const sampleSchema = z.object({
  x: z.number(),
  y: z.number(),
  clipped: z.boolean(),
  turn: z.number(),
});

async function readSample<T>(watch: JSHandle<{ sample: T | null }>) {
  await expect
    .poll(() => watch.evaluate((value) => value.sample))
    .not.toBeNull();
  const sample = await watch.evaluate((value) => value.sample);
  await watch.dispose();
  return sample!;
}

/** Replacing or unmounting a cosmetic flight must release its confirmed arrivals. */
export async function proveDrawLifecycle(page: Page, touch: boolean) {
  const cards = page
    .getByRole("region", { name: "Your hand" })
    .locator(".db-hand-card");
  const pile = page.getByRole("button", { name: "Deck actions" });
  const overlay = page.locator("[data-draw-overlay]");
  const draw = async () => {
    await pile.focus();
    await pile.press("Enter");
    await page.locator('[data-action="draw"]').press("Enter");
  };
  const visible = async (count: number) => {
    await expect(cards).toHaveCount(count);
    for (const card of await cards.all()) await expect(card).toBeVisible();
    await expect(page.locator("[data-card-arrival]")).toHaveCount(0);
  };
  await expect(cards).toHaveCount(9);
  for (let index = 0; index < 4; index++) {
    await draw();
    await expect(cards).toHaveCount(10 + index);
  }
  await visible(13);

  await page.reload();
  await expect(cards).toHaveCount(9);
  const box = (await pile.boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...from, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: from.x + 30, y: from.y + 30, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y + 30);
    await page.mouse.up();
  }
  await expect(overlay).toHaveAttribute("data-draw-overlay", "return");
  await draw();
  await expect(cards).toHaveCount(10);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  // Completing the old return may clear only its own ghost, not the new flight.
  await expect(overlay).toHaveAttribute("data-draw-overlay", "pending");
  await visible(10);

  await page.reload();
  await expect(cards).toHaveCount(9);
  await draw();
  await expect(cards).toHaveCount(10);
  await expect(overlay).toHaveAttribute("data-draw-overlay", "pending");
  await expect(cards.last()).not.toBeVisible();
  await page.getByRole("button", { name: "Hide deck" }).click();
  await expect(pile).toHaveCount(0);
  await expect(overlay).toHaveCount(0);
  await visible(10);
}

/** A physical touch tap does not depend on a browser compatibility click. */
export async function proveDrawTouchActivation(page: Page) {
  const pile = page.getByRole("button", { name: "Deck actions" });
  const menu = page.locator('[data-action="draw"]');
  await expect(pile).toHaveAttribute("aria-expanded", "false");
  // Simulate the missing compatibility click seen in CI while keeping the tap physical.
  const blockedClick = await pile.evaluateHandle((element) => {
    const block = (event: Event) => event.stopImmediatePropagation();
    element.addEventListener("click", block, { capture: true, once: true });
    return { stop: () => element.removeEventListener("click", block, true) };
  });
  try {
    await pile.tap();
    await expect(menu).toBeFocused();
  } finally {
    await blockedClick.evaluate((listener) => listener.stop());
    await blockedClick.dispose();
  }
  await page.keyboard.press("Escape");
  await expect(pile).toHaveAttribute("aria-expanded", "false");
  await pile.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
}

/** Real reducer draws through menus and pile gestures, including delayed receipts. */
export async function proveDraw(
  page: Page,
  touch: boolean,
  manual: boolean,
  initialCount = 9,
) {
  const cards = page.locator(".db-hand-card");
  const pile = page.getByRole("button", { name: "Deck actions" });
  const hand = page.getByRole("region", { name: "Your hand" });
  const arrival = page.locator("[data-card-arrival]");
  const overlay = page.locator("[data-draw-overlay]");
  const menu = page.locator('[data-action="draw"]');
  await expect(cards).toHaveCount(initialCount);
  const center = async (selector: typeof pile): Promise<Point> => {
    const box = (await selector.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const activate = async () => {
    await expect(pile).toHaveAttribute("aria-expanded", "false");
    const watch = await pile.evaluateHandle((element) => {
      const events: unknown[] = [];
      const record = (event: Event) =>
        events.push({
          type: event.type,
          at: performance.now(),
          detail: event instanceof MouseEvent ? event.detail : null,
          target:
            event.target instanceof Element
              ? event.target.outerHTML.slice(0, 160)
              : null,
        });
      const observer = new MutationObserver(() =>
        events.push({
          type: "expanded",
          at: performance.now(),
          value: element.getAttribute("aria-expanded"),
        }),
      );
      observer.observe(element, {
        attributes: true,
        attributeFilter: ["aria-expanded"],
      });
      const types = [
        "pointerdown",
        "pointerup",
        "pointercancel",
        "click",
        "focusin",
      ];
      for (const type of types) document.addEventListener(type, record, true);
      return {
        events,
        stop() {
          observer.disconnect();
          for (const type of types)
            document.removeEventListener(type, record, true);
        },
      };
    });
    try {
      if (touch) await pile.tap();
      else {
        await pile.focus();
        await page.keyboard.press("Enter");
      }
      await expect(menu).toBeFocused();
    } catch (error) {
      console.error("Draw menu activation", {
        touch,
        manual,
        initialCount,
        events: await watch.evaluate((value) => value.events),
        pile: await pile.evaluate((element) => element.outerHTML),
      });
      throw error;
    } finally {
      await watch.evaluate((value) => value.stop());
      await watch.dispose();
    }
    await expect(page.locator(".db-card-action-arrow")).toBeVisible();
    expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  };
  await activate();
  await expect(cards).toHaveCount(initialCount);
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
  const remaining = page
    .locator(".db-pile", { has: pile })
    .locator(".db-pile-count");
  const deckCount = Number(await remaining.textContent());
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
    .toBeGreaterThan(1.15);
  await expect(overlay.locator(".db-card")).not.toHaveCSS("box-shadow", "none");
  // The pile keeps showing the card beneath the one lifted from it.
  await expect(pile).toBeVisible();
  await expect(pile).toHaveCSS("opacity", "1");
  await expect(remaining).toHaveText(String(deckCount - 1));
  const released = await center(overlay);
  const returning = await page.evaluateHandle((released) => {
    const watch = { sample: null as number | null };
    const observer = new MutationObserver(() => {
      const element = document.querySelector('[data-draw-overlay="return"]');
      if (!element) return;
      observer.disconnect();
      const box = element.getBoundingClientRect();
      watch.sample = Math.hypot(
        box.x + box.width / 2 - released.x,
        box.y + box.height / 2 - released.y,
      );
    });
    observer.observe(document.body, { attributes: true, subtree: true });
    return watch;
  }, released);
  await end();
  expect(await readSample(returning)).toBeLessThan(2);
  await expect(overlay).toHaveCount(0);
  await expect(remaining).toHaveText(String(deckCount));
  await expect(menu).toHaveCount(0);
  await expect(cards).toHaveCount(initialCount);

  // Capture the actual portal's first frame, rather than a clipped card's rectangle.
  const watchArrival = () =>
    page.evaluateHandle(() => {
      const watch = {
        sample: null as {
          x: number;
          y: number;
          clipped: boolean;
          turn: number;
        } | null,
      };
      const observer = new MutationObserver(() => {
        const element = document.querySelector<HTMLElement>(
          "[data-card-arrival]",
        );
        if (!element) return;
        observer.disconnect();
        const box = element.getBoundingClientRect();
        const flip = element.querySelector<HTMLElement>(".db-card-flip")!;
        watch.sample = {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          clipped: element.closest(".db-hand") !== null,
          turn: new DOMMatrix(getComputedStyle(flip).transform).m11,
        };
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return watch;
    });

  await activate();
  const menuArrival = await watchArrival();
  let menuOrigin = from;
  await menu.click();
  if (manual) {
    await expect(overlay).toHaveAttribute("data-draw-overlay", "pending");
    await expect(overlay.locator(".db-card-back")).toHaveCount(1);
    await expect(cards).toHaveCount(initialCount);
    await expect(arrival).toHaveCount(0);
    await expect
      .poll(async () => {
        const to = await center(hand.locator(".db-draw-insertion"));
        const at = await center(overlay);
        return Math.hypot(at.x - to.x, at.y - to.y);
      })
      .toBeLessThan(2);
    menuOrigin = await center(overlay);
    await page.getByRole("button", { name: "Confirm draw" }).click();
  }
  const menuStart = sampleSchema.parse(await readSample(menuArrival));
  expect(menuStart.clipped).toBe(false);
  expect(menuStart.turn).toBeCloseTo(-1, 1);
  if (manual)
    expect(
      Math.hypot(menuStart.x - menuOrigin.x, menuStart.y - menuOrigin.y),
    ).toBeLessThan(2);
  await expect
    .poll(() => arrival.getAttribute("data-card-arrival"), { intervals: [16] })
    .toBe("flip");
  await expect(arrival).toHaveCount(0);
  await expect(overlay).toHaveCount(0);
  await expect(cards).toHaveCount(initialCount + 1);

  // Preview and pending flight leave the deck and the hand's outer height unchanged.
  const pileBefore = (await pile.boundingBox())!;
  const handBefore = (await hand.boundingBox())!;
  // A downward touch drag opens a hand slot and starts the arrival at release.
  await start();
  await move({ x: from.x, y: from.y + 20 });
  await expect(hand).toHaveAttribute("data-draw-target", "true");
  const to = await center(hand);
  await move(to);
  await expect(hand).toHaveAttribute("data-draw-over", "true");
  await expect(hand.locator(".db-draw-insertion")).toHaveCount(1);
  expect((await pile.boundingBox())!.y).toBeCloseTo(pileBefore.y, 0);
  expect((await hand.boundingBox())!.height).toBeCloseTo(handBefore.height, 0);
  const landing = await center(hand.locator(".db-draw-insertion"));
  let dragOrigin = await center(overlay);
  const dragArrival = await watchArrival();
  await end();
  if (manual) {
    await expect(overlay).toHaveAttribute("data-draw-overlay", "pending");
    await expect(cards).toHaveCount(initialCount + 1);
    await expect(arrival).toHaveCount(0);
    await expect
      .poll(async () => {
        const at = await center(overlay);
        return Math.hypot(at.x - landing.x, at.y - landing.y);
      })
      .toBeLessThan(2);
    expect((await pile.boundingBox())!.y).toBeCloseTo(pileBefore.y, 0);
    dragOrigin = await center(overlay);
    await page.getByRole("button", { name: "Confirm draw" }).click();
  }
  const dragStart = sampleSchema.parse(await readSample(dragArrival));
  if (manual)
    expect(
      Math.hypot(dragStart.x - dragOrigin.x, dragStart.y - dragOrigin.y),
    ).toBeLessThan(2);
  await expect(arrival).toHaveCount(0);
  await expect(cards).toHaveCount(initialCount + 2);
  await expect(overlay).toHaveCount(0);
  await expect(pile).toHaveCSS("opacity", "1");
  // The revealed card is already in the previewed slot; there is no second centering.
  const settled = await center(cards.last());
  expect(Math.hypot(settled.x - landing.x, settled.y - landing.y)).toBeLessThan(
    2,
  );
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
    await expect(cards).toHaveCount(initialCount + 2);
    await expect(arrival).toHaveCount(0);
  }
  await cdp?.detach();

  // Turn rules disable both paths; visual pickup cannot bypass the reducer.
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(pile).toHaveAttribute("data-draw-available", "false");
  // The menu opener stays enabled to explain the unavailable draw.
  await expect(pile).toBeEnabled();
  // Unavailable touch draws still explain their restriction without requiring a
  // browser compatibility click, just like available menu activation.
  const blockedClick = touch
    ? await pile.evaluateHandle((element) => {
        const block = (event: Event) => event.stopImmediatePropagation();
        element.addEventListener("click", block, { capture: true, once: true });
        return {
          stop: () => element.removeEventListener("click", block, true),
        };
      })
    : null;
  try {
    if (touch) await pile.tap();
    else await pile.click();
    await expect(pile).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeDisabled();
  } finally {
    await blockedClick?.evaluate((listener) => listener.stop());
    await blockedClick?.dispose();
  }
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

/** Two public hosts of one zone keep pickup and drop targets separate. */
export async function proveHostDraw(page: Page, touch: boolean) {
  const own = page.locator(
    '.db-hand[data-zone="hand"][data-zone-host="player-1"]',
  );
  const other = page.locator(
    '.db-hand[data-zone="hand"][data-zone-host="player-2"]',
  );
  const pile = page.getByRole("button", { name: "Deck actions" });
  await expect(own.locator(".db-hand-card")).toHaveCount(1);
  await expect(other.locator(".db-hand-card")).toHaveCount(1);
  const from = await pile.boundingBox();
  const to = await own.boundingBox();
  if (!from || !to) throw new Error("Host draw controls are not mounted.");
  const origin = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const target = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  try {
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...origin, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...target, id: 1 }],
      });
    } else {
      await page.mouse.move(origin.x, origin.y);
      await page.mouse.down();
      await page.mouse.move(target.x, target.y, { steps: 8 });
    }
    await expect(own).toHaveAttribute("data-draw-over", "true");
    await expect(own.locator(".db-draw-insertion")).toHaveCount(1);
    await expect(other).not.toHaveAttribute("data-draw-target", "true");
    await expect(other.locator(".db-draw-insertion")).toHaveCount(0);
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    else await page.mouse.up();
    await expect(own.locator(".db-hand-card")).toHaveCount(2);
    await expect(other.locator(".db-hand-card")).toHaveCount(1);
    await expect(page.locator("[data-draw-overlay]")).toHaveCount(0);
  } finally {
    await cdp?.detach();
  }
}

/**
 * A tucked hand keeps its edge and height as cards arrive, so nothing laid
 * out around it moves, and a lone card reads.
 */
export async function proveSteadyTuckedHand(page: Page) {
  const pile = page.getByRole("button", { name: "Deck actions" });
  const hand = page.getByRole("region", { name: "Your hand" });
  const cards = hand.locator(".db-hand-card");
  await expect(cards).toHaveCount(0);
  const handBox = (await hand.boundingBox())!;
  for (let count = 1; count <= 8; count++) {
    await pile.focus();
    await pile.press("Enter");
    await page.locator('[data-action="draw"]').press("Enter");
    await expect(cards).toHaveCount(count);
    await expect(page.locator("[data-card-arrival]")).toHaveCount(0);
    const box = (await hand.boundingBox())!;
    expect(box.y).toBeCloseTo(handBox.y, 0);
    expect(box.height).toBeCloseTo(handBox.height, 0);
    if (count === 1) {
      // The lone card shows all but the tucked share of itself.
      const shown = await cards.first().evaluate((element) => {
        const clip = element.closest(".db-hand-clip")!.getBoundingClientRect();
        const card = element.getBoundingClientRect();
        return (clip.bottom - card.top) / card.height;
      });
      expect(shown).toBeGreaterThan(0.8);
    }
  }
}
