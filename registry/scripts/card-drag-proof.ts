import { expect, type Locator, type Page } from "@playwright/test";

type Point = { x: number; y: number };

/** Physical browser proof against a real localSource and authored reducer. */
export async function proveCardDrag(page: Page, touch: boolean) {
  const card = page.locator(
    'section[aria-label="Hand"] button[data-action="select"][data-value]',
  );
  const destination = page.locator(
    'svg [data-board="mat:player-2"][data-action="select"][aria-label="0,0"]',
  );
  const discard = page.locator('[aria-label="Drop for play.discard"]');
  const drafts = page.getByTestId("scenario-drafts");
  const active = page.getByTestId("scenario-drag");
  const view = page.getByTestId("scenario-view");
  const center = async (locator: Locator): Promise<Point> => {
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const reset = async () => {
    await page.reload();
    await expect(card).toBeVisible();
    await expect(drafts).toHaveText("{}");
  };
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const pointer = {
    async down(point: Point) {
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ ...point, id: 1 }],
        });
      else {
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
      }
    },
    async move(point: Point) {
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ ...point, id: 1 }],
        });
      else await page.mouse.move(point.x, point.y, { steps: 6 });
    },
    async up() {
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      else await page.mouse.up();
    },
  };
  /** A finger lifts a card upward; sideways is browsing. */
  const lift = async (start: Point) => {
    await pointer.down(start);
    await pointer.move({ x: start.x, y: start.y - 16 });
    await expect(active).not.toHaveText("null");
  };

  await expect(card).toBeVisible();
  const cardId = (await card.getAttribute("data-value"))!;

  // Drop on a board space, through transformed SVG geometry.
  const svg = page.locator("svg").last();
  const zoomAt = await center(destination);
  await page.mouse.move(zoomAt.x, zoomAt.y);
  await page.mouse.wheel(0, -100);
  await expect(svg.locator(":scope > g")).not.toHaveAttribute(
    "transform",
    "translate(0 0) scale(1)",
  );
  await lift(await center(card));
  await expect(card).toHaveAttribute("data-dragging", "true");
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(1);
  await expect(destination).toHaveAttribute("data-drop-target", "true");
  await expect(discard).toHaveAttribute("data-drop-target", "true");
  const polygon = (await destination.locator("polygon").boundingBox())!;
  await pointer.move({ x: polygon.x + 1, y: polygon.y + 1 });
  await expect(destination).not.toHaveAttribute("data-drop-over", "true");
  await pointer.move(await center(destination));
  await expect(destination).toHaveAttribute("data-drop-over", "true");
  await pointer.up();
  await expect(active).toHaveText("null");
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
  await expect
    .poll(async (): Promise<unknown> =>
      JSON.parse((await drafts.textContent())!),
    )
    .toEqual({
      "play.place": {
        card: cardId,
        space: { boardId: "mat", playerId: "player-2", spaceId: "0,0" },
      },
    });
  await page
    .locator('[data-action="submit"][data-interaction="play.place"]')
    .click();
  await expect(view).toContainText(
    '"placed":{"boardId":"mat","playerId":"player-2","spaceId":"0,0"}',
  );

  // Drop on an area that runs a card-only interaction.
  await reset();
  await lift(await center(card));
  await pointer.move(await center(discard));
  await expect(discard).toHaveAttribute("data-drop-over", "true");
  await pointer.up();
  await expect(view).toContainText(`"discarded":"${cardId}"`);
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);

  // Releasing over empty space changes nothing.
  await reset();
  const origin = await center(card);
  await lift(origin);
  await pointer.move({ x: 4, y: origin.y - 40 });
  await pointer.up();
  await expect(active).toHaveText("null");
  await expect(drafts).toHaveText("{}");

  if (touch) {
    // Below the browser's scroll threshold, browsing can still emit a click.
    for (const distance of [9, 12]) {
      await pointer.down(origin);
      await pointer.move({ x: origin.x + distance, y: origin.y });
      await expect(active).toHaveText("null");
      await pointer.up();
      await expect(drafts).toHaveText("{}");
    }
    // A sideways finger browses instead of dragging.
    await pointer.down(origin);
    await pointer.move({ x: origin.x + 40, y: origin.y });
    await expect(active).toHaveText("null");
    await expect(card).not.toHaveAttribute("data-dragging", "true");
    await pointer.up();
    // Holding still inspects; the click that follows does not select.
    await pointer.down(origin);
    await expect(card).toHaveAttribute("data-inspecting", "hold");
    await pointer.up();
    await expect(card).not.toHaveAttribute("data-inspecting", "hold");
    await expect(drafts).toHaveText("{}");
  } else {
    // A resting mouse inspects until it leaves. Hovering waits for the
    // released card to glide back; a card arriving under a still pointer is not entered.
    await card.hover();
    await expect(card).toHaveAttribute("data-inspecting", "hover");
    await page.mouse.move(4, 4);
    await expect(card).not.toHaveAttribute("data-inspecting", "hover");
  }

  // Keyboard players choose the card and the destination without dragging.
  await reset();
  await page
    .locator(
      `button[data-interaction="play.place"][data-input="card"][data-value="${cardId}"]`,
    )
    .press("Enter");
  await destination.press("Enter");
  await expect(drafts).toContainText('"playerId":"player-2"');

  // A new authoritative frame cancels the drag in progress.
  await reset();
  await lift(await center(card));
  await page
    .locator('[data-action="submit"][data-interaction="play.refresh"]')
    .focus();
  await page.keyboard.press("Enter");
  await expect(active).toHaveText("null");
  await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
  // Keep the cancelled press down beyond the former click-suppression timeout.
  await page.waitForTimeout(1500);
  await pointer.up();
  await expect(drafts).toHaveText("{}");
  await cdp?.detach();
}
