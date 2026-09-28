import { expect, type Page } from "@playwright/test";

/** Physical browser proof against a real localSource and authored reducer. */
export async function proveCardDrag(page: Page, touch: boolean) {
  const handle = page.locator("[data-drag-card]:not([data-dnd-placeholder] *)");
  const destination = page.locator(
    'svg [data-board="mat:player-2"][data-action="select"][aria-label="0,0"]',
  );
  const drafts = page.getByTestId("scenario-drafts");
  const active = page.getByTestId("scenario-drag");
  const center = async (locator: typeof handle) => {
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const reset = async () => {
    await page.reload();
    await expect(handle).toBeVisible();
    await expect(drafts).toHaveText("{}");
  };
  await expect(handle).toBeVisible();
  const cardId = (await handle.getAttribute("data-drag-card"))!;
  // Exercise transformed SVG geometry, not only the initial layout.
  const svg = page.locator("svg").last();
  const at = await center(destination);
  await page.mouse.move(at.x, at.y);
  await page.mouse.wheel(0, -100);
  await expect(svg.locator(":scope > g")).not.toHaveAttribute(
    "transform",
    "translate(0 0) scale(1)",
  );
  const destinationPoint = await center(destination);
  const start = await center(handle);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const move = async (point: { x: number; y: number }) => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...point, id: 1 }],
      });
    else await page.mouse.move(point.x, point.y, { steps: 6 });
  };
  if (cdp)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1 }],
    });
  else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
  }
  await move({ x: start.x + 12, y: start.y });
  await expect(active).not.toHaveText("null");
  await expect(destination).toHaveAttribute("data-drop-target", "true");
  const polygon = (await destination.locator("polygon").boundingBox())!;
  await move({ x: polygon.x + 1, y: polygon.y + 1 });
  await expect(destination).not.toHaveAttribute("data-drop-over", "true");
  await expect(drafts).toHaveText("{}");
  await move(destinationPoint);
  await expect(destination).toHaveAttribute("data-drop-over", "true");
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else await page.mouse.up();
  await expect(active).toHaveText("null");
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
  await expect(page.getByTestId("scenario-view")).toContainText(
    '"placed":{"boardId":"mat","playerId":"player-2","spaceId":"0,0"}',
  );

  // Dnd-kit's keyboard sensor starts at the source center and moves in 10px steps.
  await reset();
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(active).not.toHaveText("null");
  await expect(handle.locator("..")).toHaveAttribute("data-dragging", "true");
  await page.keyboard.press("Escape");
  await expect(active).toHaveText("null");
  await expect(drafts).toHaveText("{}");
  await expect(page.locator("[data-dnd-placeholder]")).toHaveCount(0);
  await handle.focus();
  const sourceCenter = await center(handle.locator(".."));
  const targetCenter = await center(destination);
  await page.keyboard.press("Space");
  await expect(active).not.toHaveText("null");
  await expect(handle.locator("..")).toHaveAttribute("data-dragging", "true");
  for (const [delta, positive, negative] of [
    [targetCenter.x - sourceCenter.x, "ArrowRight", "ArrowLeft"],
    [targetCenter.y - sourceCenter.y, "ArrowDown", "ArrowUp"],
  ] as const) {
    for (let step = 0; step < Math.round(Math.abs(delta) / 10); step++)
      await page.keyboard.press(delta > 0 ? positive : negative, { delay: 25 });
  }
  await expect(destination).toHaveAttribute("data-drop-over", "true");
  await page.keyboard.press("Space");
  await expect(active).toHaveText("null");
  await expect(drafts).toContainText('"playerId":"player-2"');

  // A new authoritative frame cancels both the semantic and browser operation.
  await reset();
  const origin = await center(handle);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + 20, origin.y);
  await expect(active).not.toHaveText("null");
  await page
    .locator('[data-action="submit"][data-interaction="play.refresh"]')
    .focus();
  await page.keyboard.press("Enter");
  await expect(active).toHaveText("null");
  await page.mouse.up();
  await expect(drafts).toHaveText("{}");
}
