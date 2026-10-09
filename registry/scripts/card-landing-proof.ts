import { expect, type Locator, type Page } from "@playwright/test";

/** Delayed real-reducer proof: the presentation lands while authority stays put. */
export async function proveCardLandings(page: Page, touch: boolean) {
  const hand = page.getByTestId("hand");
  const table = page.getByTestId("table");
  const deck = page.getByTestId("deck");
  const authority = page.getByTestId("authority");
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const pointer = async (
    type: "down" | "move" | "up",
    at: { x: number; y: number },
  ) => {
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
  async function carry(card: Locator, destination: Locator, end = false) {
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
    if (!touch) await card.hover();
    // Playwright's actionability check waits for the animated pose to settle.
    await card.click({ trial: true });
    const a = (await card.boundingBox())!;
    const b = (await destination.boundingBox())!;
    const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const to = {
      x: end ? b.x + b.width - 4 : b.x + b.width / 2,
      y: b.y + b.height / 2,
    };
    await pointer("down", from);
    await pointer("move", { x: from.x, y: from.y - 30 });
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(1);
    await pointer("move", to);
    await pointer("up", to);
  }
  await expect(hand.locator("button[data-card]")).toHaveCount(3);
  const id = (await hand
    .locator("button[data-card]")
    .first()
    .getAttribute("data-card"))!;
  const selector = `button[data-card=${JSON.stringify(id)}]`;
  const before = (await authority.textContent())!;
  await carry(hand.locator(selector), table);
  await expect(table.locator(selector)).toBeVisible();
  await expect(table.locator(selector)).toBeDisabled();
  await expect(authority).toHaveText(before);
  await expect(hand.locator(selector)).toHaveCount(0);
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
  await page.getByRole("button", { name: "Reject move" }).click();
  await expect(hand.locator(selector)).toBeVisible();
  await expect(table.locator(selector)).toHaveCount(0);
  await expect(page.locator("[data-card-arrival]")).toHaveCount(0);
  await expect(authority).toHaveText(before);
  await carry(hand.locator(selector), table);
  await expect(table.locator(selector)).toBeDisabled();
  await page.getByRole("button", { name: "Confirm move" }).click();
  await expect(table.locator(selector)).toBeEnabled();
  await expect(authority).not.toHaveText(before);
  await expect(page.locator("[data-card-arrival]")).toHaveCount(0);

  // A return to the hand uses its live fan slot while the source frame remains authoritative.
  const played = (await authority.textContent())!;
  await carry(table.locator(selector), hand.locator(".db-hand"), true);
  await expect(hand.locator(selector)).toBeVisible();
  await expect(hand.locator(selector)).toBeDisabled();
  await expect(hand.locator(selector)).toContainText("Moving card");
  await expect(authority).toHaveText(played);
  await page.getByRole("button", { name: "Confirm move" }).click();
  await expect(hand.locator(selector)).toBeEnabled();
  await expect(page.locator("[data-card-arrival]")).toHaveCount(0);

  // The same known card is concealed as soon as it lands in the hidden pile.
  const returned = (await authority.textContent())!;
  await carry(hand.locator(selector), deck);
  await expect(deck.locator(selector)).toBeVisible();
  await expect(deck.locator(selector)).toBeDisabled();
  await expect(
    deck.locator(selector).getByRole("img", { name: "Face-down card" }),
  ).toBeVisible();
  await expect(deck.locator(selector)).not.toContainText("Moving card");
  await expect(authority).toHaveText(returned);
  if (!touch) {
    await deck.locator(selector).hover();
    await page.keyboard.down("Alt");
    await expect(deck.locator(selector)).not.toHaveAttribute(
      "data-inspecting",
      "hover",
    );
    await expect(page.locator("[data-card-preview]")).toHaveCount(0);
    await page.keyboard.up("Alt");
  }
  await page.getByRole("button", { name: "Reject move" }).click();
  await expect(hand.locator(selector)).toBeVisible();
  await expect(deck.locator(selector)).toHaveCount(0);
  await expect(authority).toHaveText(returned);

  if (!touch) {
    await hand.locator(selector).hover();
    await page.keyboard.down("Alt");
    await expect(page.locator('[data-card-preview="hover"]')).toBeVisible();
    await page.keyboard.up("Alt");
    await expect(page.locator("[data-card-preview]")).toHaveCount(0);
  }

  // A pending in-hand reorder shows the actual card, rather than a held empty gap.
  await carry(hand.locator(selector), hand.locator(".db-hand"), true);
  await expect(hand.locator(selector)).toBeVisible();
  await expect(hand.locator(selector)).toBeDisabled();
  await expect(hand.locator(".db-hand-insertion")).toHaveCount(0);
  await expect(authority).toHaveText(returned);
  await page.getByRole("button", { name: "Reject move" }).click();
  await expect(hand.locator(selector)).toBeEnabled();
  await expect(authority).toHaveText(returned);
  await cdp?.detach();
}
