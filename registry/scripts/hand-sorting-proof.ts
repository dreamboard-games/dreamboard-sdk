import { expect, type Page } from "@playwright/test";

/** Reordering consumes the feature order while retaining each card's mounted face. */
export async function proveHandSorting(
  page: Page,
  touch: boolean,
  tucked: boolean,
) {
  const hand = page.getByRole("region", { name: "Your hand" });
  const cards = hand.locator(".db-hand-card");
  const dealt = page.getByRole("button", { name: "Dealt order", exact: true });
  const reverse = page.getByRole("button", {
    name: "Reverse order",
    exact: true,
  });
  const order = () =>
    cards.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-value")),
    );
  await expect(cards).toHaveCount(9);
  const before = await order();
  const snapshot = await page.getByTestId("table-cards").textContent();
  const card = hand.locator(`[data-card=${JSON.stringify(before[2])}]`);
  const original = await card.elementHandle();
  const activate = async (control: typeof reverse) =>
    touch ? control.tap() : control.click();
  await activate(reverse);
  await expect(reverse).toHaveAttribute("aria-pressed", "true");
  await expect.poll(order).toEqual([...before].reverse());
  expect(
    await card.evaluate((element, initial) => element === initial, original),
  ).toBe(true);
  expect(await page.getByTestId("table-cards").textContent()).toBe(snapshot);
  await expect
    .poll(() =>
      cards.evaluateAll((elements) =>
        elements.every(
          (element, index) =>
            index === 0 ||
            element.closest(".db-hand-slot")!.getBoundingClientRect().x >
              elements[index - 1]
                .closest(".db-hand-slot")!
                .getBoundingClientRect().x,
        ),
      ),
    )
    .toBe(true);
  if (tucked) {
    const bounds = (await hand.boundingBox())!;
    expect(
      await cards
        .last()
        .evaluate(
          (element, bottom) => element.getBoundingClientRect().bottom > bottom,
          bounds.y + bounds.height,
        ),
    ).toBe(true);
    await expect(hand.locator(".db-hand-scroll")).toHaveCSS(
      "overflow-y",
      "clip",
    );
  }
  await activate(dealt);
  await expect.poll(order).toEqual(before);

  // Reverse a new card while its face-down flight is already visible. Its final
  // painted pose must match the newly sorted slot before revealing the control.
  await page.getByRole("button", { name: "Deck actions", exact: true }).click();
  await page.locator('[data-action="draw"]').click();
  await expect(cards).toHaveCount(10);
  const incoming = (await order()).find((id) => !before.includes(id))!;
  const target = hand.locator(`[data-card=${JSON.stringify(incoming)}]`);
  const arrival = page.locator("[data-card-arrival]");
  await expect(arrival).toBeVisible();
  const watch = await target.evaluateHandle((target) => {
    let previous = { x: 0, y: 0 };
    return {
      result: new Promise<{ gap: number }>((resolve) => {
        function sample() {
          const arrival = document.querySelector("[data-card-arrival]");
          if (arrival) {
            const box = arrival.getBoundingClientRect();
            previous = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            requestAnimationFrame(sample);
          } else {
            const box = target.getBoundingClientRect();
            resolve({
              gap: Math.hypot(
                previous.x - box.x - box.width / 2,
                previous.y - box.y - box.height / 2,
              ),
            });
          }
        }
        requestAnimationFrame(sample);
      }),
    };
  });
  await activate(reverse);
  await expect.poll(order).toEqual([...before, incoming].reverse());
  const reveal = await watch.evaluate((watch) => watch.result);
  expect(
    reveal.gap,
    "An arriving face reveals at its newly sorted slot",
  ).toBeLessThan(3);
  await expect(target).toHaveCSS("visibility", "visible");
  await watch.dispose();
  await original?.dispose();
}
