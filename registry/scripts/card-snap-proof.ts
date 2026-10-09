import { expect, type Locator, type Page } from "@playwright/test";

type Point = { x: number; y: number };

/** Physical proof that piles catch a dragged card and zones hold it at their edge. */
export async function proveCardSnapping(page: Page, touch: boolean) {
  const hand = page.locator(
    'section[aria-label="Your hand"] button[data-card]',
  );
  const discard = page.getByTestId("discard");
  const deck = page.getByTestId("deck");
  const table = page.getByTestId("table");
  const authority = page.getByTestId("authority");
  const overlay = page.locator("[data-drag-overlay]");
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const pointer = async (type: "down" | "move" | "up", at: Point) => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type:
          type === "down"
            ? "touchStart"
            : type === "move"
              ? "touchMove"
              : "touchEnd",
        touchPoints: type === "up" ? [] : [at],
      });
    else if (type === "down") {
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
    } else if (type === "move") await page.mouse.move(at.x, at.y, { steps: 8 });
    else {
      await page.mouse.up();
      await page.mouse.move(1, 1);
    }
  };
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  const center = ({
    x,
    y,
    width,
    height,
  }: Awaited<ReturnType<typeof box>>) => ({
    x: x + width / 2,
    y: y + height / 2,
  });
  const zones = async () =>
    JSON.parse((await authority.textContent())!) as Record<string, string[]>;
  async function lift(card: Locator) {
    await expect(overlay).toHaveCount(0);
    if (!touch) await card.hover();
    await card.click({ trial: true });
    const from = center(await box(card));
    await pointer("down", from);
    await pointer("move", { x: from.x, y: from.y - 30 });
    await expect(overlay).toHaveCount(1);
  }
  /** The drawn face settles within a few pixels of `slot`, at its width. */
  async function settlesOn(slot: Locator) {
    const target = await box(slot);
    await expect
      .poll(async () => {
        const face = await box(overlay.locator(".db-card"));
        return (
          Math.abs(center(face).x - center(target).x) < 12 &&
          Math.abs(center(face).y - center(target).y) < 16 &&
          Math.abs(face.width - target.width) < 6
        );
      })
      .toBe(true);
  }

  // A card over the pile's label is drawn on its stack, at the stack's size, and lands there.
  const first = hand.first();
  const id = (await first.getAttribute("data-card"))!;
  await lift(first);
  const stack = discard.locator(".db-pile-stack");
  const label = await box(discard.locator("figcaption"));
  await pointer("move", { x: label.x + label.width - 2, y: center(label).y });
  await expect(discard).toHaveAttribute("data-drop-over", "true");
  await settlesOn(stack);
  await pointer("up", { x: label.x + label.width - 2, y: center(label).y });
  await expect.poll(async () => (await zones()).discard).toEqual([id]);

  // Over the hidden deck the card shows its back and the badge counts it in.
  await lift(hand.first());
  const deckStack = await box(deck.locator(".db-pile-stack"));
  await pointer("move", center(deckStack));
  await expect(deck).toHaveAttribute("data-drop-over", "true");
  await expect(
    overlay.getByRole("img", { name: "Face-down card" }),
  ).toBeVisible();
  expect(
    await deck
      .locator(".db-pile-count")
      .evaluate((badge) => getComputedStyle(badge, "::after").content),
  ).toBe('" +" counter(incoming)');
  // Released over nothing, it returns and nothing moves.
  const before = await zones();
  await pointer("move", { x: 4, y: center(deckStack).y });
  await expect(deck).not.toHaveAttribute("data-drop-over", "true");
  await pointer("up", { x: 4, y: center(deckStack).y });
  await expect(overlay).toHaveCount(0);
  expect(await zones()).toEqual(before);

  // Over the table a gap at its end sizes the card; pulled out, it is held
  // inside the table's edge until clear.
  const area = await box(table);
  const middle = center(area);
  const card = hand.first();
  const moving = (await card.getAttribute("data-card"))!;
  const resting = (await zones()).table;
  await lift(card);
  await pointer("move", middle);
  await expect(table).toHaveAttribute("data-drop-over", "true");
  const gap = table.getByTestId("gap");
  await expect(gap).toBeVisible();
  // It stays under the pointer, a little raised at the gap's size; the
  // hovered area itself grows slightly.
  const width = (await box(gap)).width * 1.08;
  await expect
    .poll(async () => (await box(overlay.locator(".db-card"))).width)
    .toBeCloseTo(width, -1);
  await pointer("move", { x: middle.x, y: area.y - 12 });
  await expect(table).toHaveAttribute("data-drop-over", "true");
  await pointer("move", { x: middle.x, y: area.y - 160 });
  await expect(table).not.toHaveAttribute("data-drop-over", "true");
  await expect(gap).toHaveCount(0);
  await pointer("move", middle);
  await expect(gap).toBeVisible();
  await pointer("up", middle);
  await expect
    .poll(async () => (await zones()).table)
    .toEqual([...resting, moving]);
}
