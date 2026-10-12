import { expect, type Locator, type Page } from "@playwright/test";

/** Physical pickup, cancellation and delayed authority through the copied pile. */
export async function proveCardPile(page: Page, touch: boolean) {
  const source = page.getByTestId("source");
  const table = page.getByTestId("table");
  const deck = page.getByTestId("deck");
  const authority = page.getByTestId("authority");
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const pointer = async (
    type: "down" | "move" | "up",
    at: { x: number; y: number },
  ) => {
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", {
        type:
          type === "down"
            ? "touchStart"
            : type === "move"
              ? "touchMove"
              : "touchEnd",
        touchPoints: type === "up" ? [] : [at],
      });
    } else if (type === "down") {
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
    } else if (type === "move") await page.mouse.move(at.x, at.y, { steps: 8 });
    else {
      await page.mouse.up();
      await page.mouse.move(1, 1);
    }
  };
  async function pickup(card: Locator) {
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
    await card.click({ trial: true });
    const box = (await card.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await pointer("down", from);
    await pointer("move", { x: from.x, y: from.y - 30 });
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(1);
  }
  async function drop(destination: Locator) {
    const box = (await destination.boundingBox())!;
    const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await pointer("move", to);
    await pointer("up", to);
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
  }
  await expect(source.locator(".db-pile-count")).toHaveText("3");
  const before = (await authority.textContent())!;
  const state = JSON.parse(before) as { zones: [string, string[]][] };
  const [first, next] = state.zones.find(([id]) => id === "source")![1];
  const card = (id: string) => `button[data-card=${JSON.stringify(id)}]`;
  await pickup(source.locator(card(first)));
  await expect(source.locator(".db-pile-count")).toHaveText("2");
  await expect(source.locator(".db-card-pile-underneath")).toContainText(next);
  // The pointer owner remains mounted, even though its face has lifted.
  await expect(source.locator(card(first))).toHaveCount(1);
  await expect(authority).toHaveText(before);
  // Release outside all authored drop targets: the component restores itself.
  await pointer("move", { x: 4, y: 4 });
  await pointer("up", { x: 4, y: 4 });
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
  await expect(source.locator(".db-pile-count")).toHaveText("3");
  await expect(source.locator(".db-card-pile-underneath")).toHaveCount(0);
  await expect(authority).toHaveText(before);

  await pickup(source.locator(card(first)));
  await drop(table);
  await expect(table.locator(card(first))).toBeDisabled();
  await expect(table.locator(".db-pile-count")).toHaveText("2");
  await expect(source.locator(card(next))).toBeVisible();
  await expect(authority).toHaveText(before);
  await page.getByRole("button", { name: "Reject move" }).click();
  await expect(source.locator(card(first))).toBeEnabled();
  await expect(source.locator(".db-pile-count")).toHaveText("3");
  await expect(authority).toHaveText(before);

  await pickup(source.locator(card(first)));
  await drop(table);
  await page.getByRole("button", { name: "Confirm move" }).click();
  await expect(table.locator(card(first))).toBeEnabled();
  await expect(authority).not.toHaveText(before);
  const accepted = (await authority.textContent())!;
  await pickup(table.locator(card(first)));
  await drop(deck);
  await expect(deck.locator(card(first))).toBeDisabled();
  await expect(deck.locator(".db-pile-count")).toHaveText("2");
  await expect(
    deck.locator(card(first)).getByRole("img", { name: "Face-down card" }),
  ).toBeVisible();
  await expect(deck.locator(card(first))).not.toContainText("Moving card");
  await expect(authority).toHaveText(accepted);
  await page.getByRole("button", { name: "Reject move" }).click();
  await expect(table.locator(card(first))).toBeEnabled();
  await expect(deck.locator(".db-pile-count")).toHaveText("1");

  // An aggregate count also subtracts a pending outgoing card, then restores it.
  await pickup(deck.locator("button[data-card]"));
  await drop(table);
  await expect(deck.locator(".db-pile")).toHaveAttribute("data-empty", "true");
  await expect(deck.locator(".db-pile-count")).toHaveCount(0);
  await expect(authority).toHaveText(accepted);
  await page.getByRole("button", { name: "Reject move" }).click();
  await expect(deck.locator(".db-pile-count")).toHaveText("1");
  await expect(deck.locator("button[data-card]")).toBeEnabled();

  // Move the top destination card away, then cancel lifting its last card.
  await pickup(table.locator(card(first)));
  await drop(source);
  await page.getByRole("button", { name: "Confirm move" }).click();
  await expect(source.locator(card(first))).toBeEnabled();
  await expect(table.locator(".db-pile-count")).toHaveText("1");
  const last = table.locator("button[data-card]");
  await pickup(last);
  await expect(table.locator(".db-pile")).toHaveAttribute("data-empty", "true");
  await expect(table.locator(".db-pile-count")).toHaveCount(0);
  await expect(last).toHaveCount(1);
  await pointer("move", { x: 4, y: 4 });
  await pointer("up", { x: 4, y: 4 });
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
  await expect(table.locator(".db-pile-count")).toHaveText("1");
  await expect(last).toBeEnabled();
  // Wait for return animation, then compare geometry in one layout snapshot.
  for (const pile of [source, table, deck]) {
    await expect
      .poll(() =>
        pile.evaluate((element) => {
          const control = element
            .querySelector("button[data-card]")!
            .getBoundingClientRect();
          const slot = element
            .querySelector(".db-pile-stack")!
            .getBoundingClientRect();
          return Math.max(
            Math.abs(control.x - slot.x),
            Math.abs(control.y - slot.y),
            Math.abs(control.width - slot.width),
          );
        }),
      )
      .toBeLessThan(1);
  }
  // The badge must paint above the authored control at every viewport.
  for (const pile of [source, table, deck]) {
    const badge = pile.locator(".db-pile-count");
    await expect(badge).toBeVisible();
    expect(
      await badge.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        );
      }),
    ).toBe(true);
  }
  await cdp?.detach();
}
