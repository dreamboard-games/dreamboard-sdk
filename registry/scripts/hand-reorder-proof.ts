import { expect, type Page } from "@playwright/test";

type Point = { x: number; y: number };

/** Dragging a hand card along its hand opens a gap where it lands; dropping there moves it. */
export async function proveHandReorder(page: Page, touch: boolean) {
  const hand = page.getByRole("region", { name: "Your hand" });
  const cards = hand.locator(".db-hand-card");
  const gap = hand.locator(".db-hand-insertion");
  const zone = async () =>
    (
      JSON.parse((await page.getByTestId("table-cards").textContent())!) as [
        string,
        string[],
      ][]
    ).find(([id]) => id === "hand")![1];
  const centre = (id: string) =>
    hand.locator(`[data-card=${JSON.stringify(id)}]`).evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
  const near = async (
    message: string,
    point: () => Promise<Point>,
    to: Point,
  ) =>
    expect
      .poll(
        async () => {
          const at = await point();
          return Math.hypot(at.x - to.x, at.y - to.y);
        },
        { message },
      )
      .toBeLessThan(2);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const press = async (at: Point) => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...at, id: 1 }],
      });
    else {
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
    }
  };
  const move = async (from: Point, to: Point, steps = 8) => {
    for (let step = 1; step <= steps; step++) {
      const at = {
        x: from.x + ((to.x - from.x) * step) / steps,
        y: from.y + ((to.y - from.y) * step) / steps,
      };
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ ...at, id: 1 }],
        });
      else await page.mouse.move(at.x, at.y);
    }
  };
  const release = async () => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    else {
      await page.mouse.up();
      // A resting mouse raises the card under it; measure the hand at rest.
      await page.mouse.move(1, 1);
    }
  };
  /** Lifts a card (a finger turns upward) and carries it to `to`. */
  const carry = async (id: string, to: Point) => {
    // Fanned cards overlap; a card is its own on the strip the next leaves.
    const order = await zone();
    const index = order.indexOf(id);
    const at = await centre(id);
    const width = await hand
      .locator(`[data-card=${JSON.stringify(id)}]`)
      .evaluate((element) => (element as HTMLElement).offsetWidth);
    const next = order[index + 1];
    const step = next ? (await centre(next)).x - at.x : width;
    const from = { x: at.x - width / 2 + Math.min(step, width) / 2, y: at.y };
    const lifted = { x: from.x, y: from.y - 40 };
    await press(from);
    await move(from, lifted, 4);
    await move(lifted, to);
  };

  await expect(cards).toHaveCount(9);
  const before = await zone();
  const rest = await Promise.all(before.map(centre));
  const along = rest[4].y - 40;

  // Over the fifth card's slot, the first card opens a gap there and the
  // cards between close up behind it.
  await carry(before[0], { x: rest[4].x, y: along });
  await expect(hand).toHaveAttribute("data-drop-over", "true");
  await expect(gap).toHaveCount(1);
  await near(
    "The gap opens at the fifth slot",
    async () => {
      const box = (await gap.boundingBox())!;
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    },
    rest[4],
  );
  await near(
    "The fifth card closes up behind the gap",
    () => centre(before[4]),
    rest[3],
  );
  await release();
  const moved = [...before.slice(1, 5), before[0], ...before.slice(5)];
  await expect
    .poll(zone, { message: "The drop moves the card" })
    .toEqual(moved);
  await expect(gap).toHaveCount(0);
  await near("The card lands in the gap", () => centre(before[0]), rest[4]);
  await near("Its neighbour stays put", () => centre(before[4]), rest[3]);

  // Escape, or a cancelled touch, leaves the hand as it was.
  await carry(moved[0], { x: rest[6].x, y: along });
  await expect(gap).toHaveCount(1);
  if (cdp)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
  else {
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.mouse.move(1, 1);
  }
  await expect(gap).toHaveCount(0);
  await near("Cancelling restores the hand", () => centre(moved[6]), rest[6]);
  expect(await zone()).toEqual(moved);

  // Released away from the hand, the card goes home.
  await carry(moved[0], { x: rest[6].x, y: 8 });
  await expect(gap).toHaveCount(0);
  await release();
  await near(
    "An outside release returns home",
    () => centre(moved[0]),
    rest[0],
  );
  expect(await zone()).toEqual(moved);
  await cdp?.detach();
}
