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
      "hidden",
    );
  }
  await activate(dealt);
  await expect.poll(order).toEqual(before);

  // Cover ordinary origins, staged pile flights, and an already flipping face.
  for (const phase of ["ordinary", "pending", "flip"] as const) {
    await activate(dealt);
    const source = await order();
    if (phase === "ordinary") {
      await page
        .getByRole("button", { name: "Draw card", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Deck actions", exact: true })
        .click();
      await page.locator('[data-action="draw"]').click();
    }
    await expect(cards).toHaveCount(source.length + 1);
    const incoming = (await order()).find((id) => !source.includes(id))!;
    const target = hand.locator(`[data-card=${JSON.stringify(incoming)}]`);
    if (phase === "pending")
      await expect(page.locator('[data-draw-overlay="pending"]')).toBeVisible();
    else
      await expect
        .poll(
          () =>
            page
              .locator(
                `[data-card-arrival="${phase === "ordinary" ? "flight" : "flip"}"]`,
              )
              .isVisible(),
          { intervals: [16], message: `An arrival reaches ${phase}` },
        )
        .toBe(true);
    const watch = await target.evaluateHandle((target) => {
      let previous = { x: 0, y: 0 };
      let previousKind: "draw" | "arrival" | null = null;
      let handoff: number | null = null;
      const observer = new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes) {
            if (
              !(node instanceof Element) ||
              !node.matches("[data-card-arrival]")
            )
              continue;
            if (previousKind !== "draw") continue;
            const box = node.getBoundingClientRect();
            handoff = Math.hypot(
              previous.x - box.x - box.width / 2,
              previous.y - box.y - box.height / 2,
            );
          }
      });
      observer.observe(document.body, { childList: true });
      return {
        result: new Promise<{ gap: number; handoff: number | null }>(
          (resolve, reject) => {
            const timeout = setTimeout(() => {
              observer.disconnect();
              reject(
                new Error(
                  `Arrival did not reveal: phase=${document.querySelector("[data-card-arrival]")?.getAttribute("data-card-arrival")}, visibility=${getComputedStyle(target).visibility}`,
                ),
              );
            }, 5000);
            function sample() {
              if (getComputedStyle(target).visibility !== "hidden") {
                clearTimeout(timeout);
                observer.disconnect();
                const box = target.getBoundingClientRect();
                resolve({
                  gap: Math.hypot(
                    previous.x - box.x - box.width / 2,
                    previous.y - box.y - box.height / 2,
                  ),
                  handoff,
                });
                return;
              }
              const arrival = document.querySelector("[data-card-arrival]");
              const painted =
                arrival ??
                document.querySelector('[data-draw-overlay="pending"]');
              if (painted) {
                const box = painted.getBoundingClientRect();
                const next = {
                  x: box.x + box.width / 2,
                  y: box.y + box.height / 2,
                };
                const kind = arrival ? "arrival" : "draw";
                previous = next;
                previousKind = kind;
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          },
        ),
      };
    });
    await activate(reverse);
    const neighbor = hand.locator(
      `[data-card=${JSON.stringify(source.at(-1))}]`,
    );
    if (phase === "ordinary") {
      await page.keyboard.press("Tab");
      await neighbor.focus();
      await expect(neighbor).toHaveAttribute("data-hovered", "true");
    }
    await expect.poll(order).toEqual([...source, incoming].reverse());
    const reveal = await watch.evaluate((watch) => watch.result);
    if (phase === "pending") {
      expect(
        reveal.handoff,
        "The draw-to-arrival handoff was captured",
      ).not.toBeNull();
      expect(
        reveal.handoff,
        "The pile flight continues from its painted destination",
      ).toBeLessThan(3);
    }
    expect(
      reveal.gap,
      `${phase}: arriving face reveals at its newly sorted slot`,
    ).toBeLessThan(3);
    await expect(target).toHaveCSS("visibility", "visible");
    await watch.dispose();
    if (phase === "ordinary") await neighbor.blur();
  }
  await original?.dispose();
}
